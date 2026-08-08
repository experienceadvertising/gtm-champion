import dns from "node:dns/promises";
import http, { type IncomingHttpHeaders } from "node:http";
import https from "node:https";
import net from "node:net";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 4;

export interface PublicHttpResponse {
  status: number;
  ok: boolean;
  headers: IncomingHttpHeaders;
  body: Buffer;
  finalUrl: string;
}

export interface PublicHttpOptions {
  headers?: Record<string, string>;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function parseIpv6(address: string): number[] | null {
  let normalized = address;
  const ipv4Match = normalized.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match) {
    const octets = ipv4Match[1].split(".").map(Number);
    if (octets.length !== 4 || octets.some(octet => octet < 0 || octet > 255)) return null;
    normalized = normalized.slice(0, -ipv4Match[1].length)
      + ((octets[0] << 8) | octets[1]).toString(16)
      + ":"
      + ((octets[2] << 8) | octets[3]).toString(16);
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return groups.map(group => parseInt(group, 16));
}

function isInIpv6Cidr(value: number[], base: number[], prefix: number): boolean {
  const completeGroups = Math.floor(prefix / 16);
  const remainingBits = prefix % 16;
  for (let index = 0; index < completeGroups; index++) {
    if (value[index] !== base[index]) return false;
  }
  if (!remainingBits) return true;
  const mask = (0xffff << (16 - remainingBits)) & 0xffff;
  return (value[completeGroups] & mask) === (base[completeGroups] & mask);
}

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const family = net.isIP(normalized);
  if (family === 4) return isPrivateIpv4(normalized);
  if (family !== 6) return true;
  const value = parseIpv6(normalized);
  if (value === null) return true;
  const cidr = (base: string, prefix: number) => {
    const baseValue = parseIpv6(base);
    return baseValue !== null && isInIpv6Cidr(value, baseValue, prefix);
  };
  if (cidr("::ffff:0:0", 96)) {
    const mapped = `${value[6] >> 8}.${value[6] & 0xff}.${value[7] >> 8}.${value[7] & 0xff}`;
    return isPrivateIpv4(mapped);
  }
  return value.every(group => group === 0)
    || (value.slice(0, 7).every(group => group === 0) && value[7] === 1)
    || cidr("64:ff9b:1::", 48)
    || cidr("100::", 64)
    || cidr("2001:db8::", 32)
    || cidr("fc00::", 7)
    || cidr("fe80::", 10)
    || cidr("ff00::", 8);
}

async function resolvePublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(literal)) {
    if (isPrivateNetworkAddress(literal)) throw new Error("Private or special-use network addresses are not allowed");
    return { address: literal, family: net.isIP(literal) as 4 | 6 };
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("Hostname did not resolve");
  if (addresses.some(result => isPrivateNetworkAddress(result.address))) {
    throw new Error("Hostname resolves to a private or special-use network address");
  }
  const selected = addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

export async function assertPublicHttpUrl(urlString: string): Promise<void> {
  const url = new URL(urlString);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) throw new Error("URL credentials are not allowed");
  await resolvePublicAddress(url.hostname);
}

async function requestOnce(url: URL, options: PublicHttpOptions): Promise<PublicHttpResponse> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) throw new Error("URL credentials are not allowed");

  const resolved = await resolvePublicAddress(url.hostname);
  const client = url.protocol === "https:" ? https : http;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  return new Promise((resolve, reject) => {
    const request = client.request({
      protocol: url.protocol,
      hostname: resolved.address,
      family: resolved.family,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      servername: url.protocol === "https:" && !net.isIP(url.hostname.replace(/^\[|\]$/g, "")) ? url.hostname : undefined,
      headers: {
        ...options.headers,
        Host: url.host,
      },
    }, response => {
      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > maxBytes) {
          request.destroy(new Error("Remote response exceeded the size limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        const status = response.statusCode ?? 0;
        resolve({
          status,
          ok: status >= 200 && status < 300,
          headers: response.headers,
          body: Buffer.concat(chunks),
          finalUrl: url.href,
        });
      });
    });

    request.setTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, () => {
      request.destroy(new Error("Remote request timed out"));
    });
    request.on("error", reject);
    request.end();
  });
}

export async function fetchPublicHttp(urlString: string, options: PublicHttpOptions = {}): Promise<PublicHttpResponse> {
  let current = new URL(urlString);
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const response = await requestOnce(current, options);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.location;
    if (!location) return response;
    if (redirectCount === maxRedirects) throw new Error("Remote request exceeded the redirect limit");
    current = new URL(location, current);
  }

  throw new Error("Remote request failed");
}
