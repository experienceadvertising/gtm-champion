type AnalyticsValue = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: AnalyticsParams,
    ) => void;
  }
}

/**
 * Send a GA4 event when analytics is available. Analytics must never block a
 * product action, so this helper intentionally becomes a no-op otherwise.
 */
export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  try {
    window.gtag("event", eventName, params);
  } catch {
    // A blocked analytics script should not affect the product experience.
  }
}
