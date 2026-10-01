import type { ChannelInsightEvidence } from '@shared/schema';
export function groundEvidence(items: ChannelInsightEvidence[], content: string, websiteUrl: string): ChannelInsightEvidence[] {
  return items.map(item => {
    const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
    const verified = item.sourceType === 'website' && quote.length>=20 && content.includes(quote);
    return {...item, verified, quote: verified ? quote : undefined,
      url: verified ? websiteUrl : undefined,
      sourceType: verified ? 'website' : item.sourceType === 'best-practice' ? 'best-practice' : 'assumption',
      source: verified ? 'Retrieved website text' : 'AI planning suggestion, source not independently verified',
      confidence: verified ? Math.min(85,item.confidence) : Math.min(40,item.confidence)};
  });
}
