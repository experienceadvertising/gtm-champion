import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import http from "node:http";
import { PassThrough } from "node:stream";
import test, { mock } from "node:test";
import { collectCompanyWebsiteSignals } from "../server/services/openai";
import { UnsafePublicUrlError } from "../server/services/publicHttp";

const publicUrl = "http://8.8.8.8/";

function mockHttpResponse(statusCode: number, body = "", location?: string) {
  return mock.method(http, "request", (_options: unknown, callback: (response: PassThrough) => void) => {
    const request = new EventEmitter() as EventEmitter & {
      end: () => void;
      setTimeout: () => void;
    };
    request.setTimeout = () => {};
    request.end = () => {
      queueMicrotask(() => {
        const response = new PassThrough() as PassThrough & {
          statusCode: number;
          headers: Record<string, string>;
        };
        response.statusCode = statusCode;
        response.headers = location ? { location } : {};
        callback(response);
        response.end(body);
      });
    };
    return request as ReturnType<typeof http.request>;
  });
}

test("a public URL redirecting to an internal address never reaches third-party services", async () => {
  const direct = mockHttpResponse(302, "", "http://169.254.169.254/latest/meta-data/");
  const external = mock.method(globalThis, "fetch", async () => {
    throw new Error("An unsafe URL was sent to a third party");
  });
  try {
    await assert.rejects(collectCompanyWebsiteSignals(publicUrl), UnsafePublicUrlError);
    assert.equal(direct.mock.callCount(), 1);
    assert.equal(external.mock.callCount(), 0);
  } finally {
    direct.mock.restore();
    external.mock.restore();
  }
});

test("a directly private URL never starts a fetch or third-party request", async () => {
  const direct = mockHttpResponse(200);
  const external = mock.method(globalThis, "fetch", async () => {
    throw new Error("An unsafe URL was sent to a third party");
  });
  try {
    await assert.rejects(collectCompanyWebsiteSignals("http://127.0.0.1/"), UnsafePublicUrlError);
    assert.equal(direct.mock.callCount(), 0);
    assert.equal(external.mock.callCount(), 0);
  } finally {
    direct.mock.restore();
    external.mock.restore();
  }
});

test("an unsafe redirect from a discovered company subpage stops analysis before third-party requests", async () => {
  let requests = 0;
  const direct = mock.method(http, "request", (_options: unknown, callback: (response: PassThrough) => void) => {
    const request = new EventEmitter() as EventEmitter & {
      end: () => void;
      setTimeout: () => void;
    };
    request.setTimeout = () => {};
    request.end = () => {
      queueMicrotask(() => {
        const response = new PassThrough() as PassThrough & {
          statusCode: number;
          headers: Record<string, string>;
        };
        requests++;
        response.statusCode = requests === 1 ? 200 : 302;
        response.headers = requests === 1 ? {} : { location: "http://127.0.0.1/private" };
        callback(response);
        response.end(requests === 1
          ? `<html><title>Public company</title><a href="/pricing">Pricing</a><h2>Features</h2><p>${"Public product information. ".repeat(20)}</p></html>`
          : "");
      });
    };
    return request as ReturnType<typeof http.request>;
  });
  const external = mock.method(globalThis, "fetch", async () => {
    throw new Error("An unsafe URL was sent to a third party");
  });
  try {
    await assert.rejects(collectCompanyWebsiteSignals(publicUrl), UnsafePublicUrlError);
    assert.equal(requests, 2);
    assert.equal(external.mock.callCount(), 0);
  } finally {
    direct.mock.restore();
    external.mock.restore();
  }
});

test("a public site that fails to load still uses Jina and proceeds to public-site services", async () => {
  const direct = mockHttpResponse(503);
  const external = mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const target = String(url);
    if (target.startsWith("https://r.jina.ai/")) {
      return new Response("Public website content ".repeat(20), { status: 200 });
    }
    if (target.startsWith("https://shot.screenshotapi.net/")) {
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.startsWith("https://www.googleapis.com/pagespeedonline/")) {
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`Unexpected request: ${target}`);
  });
  try {
    const result = await collectCompanyWebsiteSignals(publicUrl);
    assert.match(result.scrapedSite?.combinedContent || "", /Public website content/);
    assert.equal(direct.mock.callCount(), 1);
    assert.equal(external.mock.calls.filter(call => String(call.arguments[0]).startsWith("https://r.jina.ai/")).length, 1);
    assert.ok(external.mock.callCount() > 1);
  } finally {
    direct.mock.restore();
    external.mock.restore();
  }
});

test("a JS-rendered public site retains the Jina fallback", async () => {
  const direct = mockHttpResponse(200, '<html><title>App</title><div id="root"></div></html>');
  const external = mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    if (String(url).startsWith("https://r.jina.ai/")) {
      return new Response("Rendered public website content ".repeat(20), { status: 200 });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  });
  try {
    const result = await collectCompanyWebsiteSignals(publicUrl);
    assert.match(result.scrapedSite?.combinedContent || "", /Rendered public website content/);
    assert.equal(external.mock.calls.filter(call => String(call.arguments[0]).startsWith("https://r.jina.ai/")).length, 1);
  } finally {
    direct.mock.restore();
    external.mock.restore();
  }
});