export function isSlackWebhook(value: string) {
  try { const url=new URL(value);return url.protocol==='https:' && url.hostname==='hooks.slack.com' && !url.port && !url.username && !url.password && /^\/services\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname) && !url.search && !url.hash; }
  catch {return false;}
}
