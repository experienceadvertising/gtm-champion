const CANONICAL_APP_URL = "https://gtmchampion.com";

function normalizeOrigin(value: string): string | null {
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getPublicAppUrl(): string {
  // Production links must stay on this app, even when copied environment settings drift.
  if (process.env.NODE_ENV === "production") return CANONICAL_APP_URL;
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) {
    const origin = normalizeOrigin(configured);
    if (origin) return origin;
  }

  const replitDomain = process.env.REPLIT_DOMAINS
    ?.split(",")
    .map(domain => domain.trim())
    .find(Boolean);
  if (replitDomain) {
    const origin = normalizeOrigin(replitDomain);
    if (origin) return origin;
  }

  return CANONICAL_APP_URL;
}
