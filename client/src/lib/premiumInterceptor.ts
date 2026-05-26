export interface PremiumRequiredEventDetail {
  reason?: string;
  message?: string;
  upgradeUrl?: string;
}

export const PREMIUM_REQUIRED_EVENT = "premium-required";

/**
 * Install a global fetch wrapper that listens for 403 responses with
 * `code: "PREMIUM_REQUIRED"` and dispatches a custom event so the
 * UpgradeModal can open without each call site handling it.
 *
 * Only inspects responses to same-origin /api/* requests to avoid
 * accidentally consuming third-party JSON bodies.
 */
export function installPremiumInterceptor() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __premiumInterceptorInstalled?: boolean };
  if (w.__premiumInterceptorInstalled) return;
  w.__premiumInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status !== 403) return response;
    let url: string;
    try {
      url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    } catch {
      return response;
    }
    if (!url || (!url.startsWith("/api/") && !url.includes("/api/"))) return response;
    try {
      const cloned = response.clone();
      const body = await cloned.json().catch(() => null);
      if (body && body.code === "PREMIUM_REQUIRED") {
        const detail: PremiumRequiredEventDetail = {
          reason: body.reason,
          message: body.error,
          upgradeUrl: body.upgradeUrl,
        };
        window.dispatchEvent(new CustomEvent(PREMIUM_REQUIRED_EVENT, { detail }));
      }
    } catch {
      // ignore parsing errors
    }
    return response;
  };
}
