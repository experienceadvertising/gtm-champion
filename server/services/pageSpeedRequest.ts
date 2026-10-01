// Bounded cache and in-flight deduplication avoid duplicate PageSpeed requests for
// screenshot and metrics. A quota error pauses this worker instead of retrying.
const cache = new Map<string,{expires:number,promise:Promise<Record<string,any> | null>}>();
let quotaUntil = 0;
export function clearPageSpeedCacheForTests() {cache.clear();quotaUntil=0;}
export async function requestPageSpeed(url: string, fetcher: typeof fetch = fetch): Promise<Record<string,any> | null> {
  const cached = cache.get(url);
  if (cached && cached.expires>Date.now()) return cached.promise;
  if (quotaUntil>Date.now()) return null;
  if (cache.size>=128) cache.delete(cache.keys().next().value!);
  const entry = {expires:Date.now()+60*60*1000,promise:Promise.resolve(null) as Promise<Record<string,any> | null>};
  entry.promise = (async () => {
    try {
      const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
      endpoint.searchParams.set('url',url);endpoint.searchParams.set('category','PERFORMANCE');endpoint.searchParams.set('strategy','DESKTOP');
      if (process.env.PAGESPEED_API_KEY) endpoint.searchParams.set('key',process.env.PAGESPEED_API_KEY);
      const response = await fetcher(endpoint.toString(),{signal:AbortSignal.timeout(30000)});
      if (!response.ok) {
        entry.expires=Date.now()+15*60*1000;
        if (response.status===429) quotaUntil=entry.expires;
        console.log(`PageSpeed unavailable (${response.status})`);
        return null;
      }
      const data = await response.json();
      return data?.lighthouseResult ? data : null;
    } catch {entry.expires=Date.now()+15*60*1000;console.error('PageSpeed request unavailable');return null;}
  })();
  cache.set(url,entry);return entry.promise;
}
