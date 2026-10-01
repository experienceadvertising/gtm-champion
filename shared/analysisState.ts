export const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000;

export function getAnalysisState(company: {
  name: string | null;
  summary: string | null;
  lastScraped: string | Date;
}, persistedChannelCount: number, now = Date.now()) {
  const started = new Date(company.lastScraped).getTime();
  const recent = Number.isFinite(started) && now - started < ANALYSIS_TIMEOUT_MS;
  const pendingCore = !company.name && company.summary === "Analyzing your website...";
  const failed = (pendingCore && !recent) || /couldn't analyze|temporarily unavailable|^AI analysis failed/i.test(company.summary || "");
  return {
    analyzing: pendingCore && !failed,
    failed,
    channelsPending: Boolean(company.name && !failed && persistedChannelCount < 13 && recent),
  };
}
