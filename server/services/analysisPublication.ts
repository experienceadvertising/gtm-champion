import { jobPool } from './analysisJobs';
import type { analyzeCompanyFast, analyzeCompanyChannels, collectCompanyWebsiteSignals } from './openai';
export async function publishAnalysis(companyId: number, token: string, payload: {
  core: Awaited<ReturnType<typeof analyzeCompanyFast>>;
  screenshotData: string | null;
  visualInsights: string;
  pageSpeedData: Awaited<ReturnType<typeof collectCompanyWebsiteSignals>>['pageSpeedData'];
  siteProfile: import('@shared/schema').SiteProfile | null;
  complete: Awaited<ReturnType<typeof analyzeCompanyChannels>>;
}) {
  const {core,screenshotData,visualInsights,pageSpeedData,siteProfile,complete}=payload;
  const client = await jobPool.connect();
  try {
    await client.query('BEGIN');
    const lease = await client.query(`SELECT 1 FROM analysis_jobs WHERE company_id=$1 AND token=$2 AND status='running' AND lease_until>now() FOR UPDATE`,[companyId,token]);
    if (!lease.rowCount) throw new Error('Analysis lease expired');
    // Keep all old results until the new report is complete, then publish atomically.
    const old = await client.query('SELECT category,title,status FROM recommendations WHERE company_id=$1',[companyId]);
    const statuses = new Map(old.rows.map(row => [row.category+'|'+row.title,row.status]));
    await client.query(`UPDATE companies SET name=$2,summary=$3,gtm_motion=$4,icp_score=$5,screenshot_url=$6,visual_analysis=$7,page_speed_data=$8,site_profile=$9,last_scraped=now() WHERE id=$1`,
      [companyId,core.companyName,core.summary,core.gtmMotion,core.icpScore,screenshotData,visualInsights || null,pageSpeedData ? JSON.stringify(pageSpeedData) : null,siteProfile ? JSON.stringify(siteProfile) : null]);
    for (const table of ['recommendations','weekly_ideas','channel_insights']) await client.query(`DELETE FROM ${table} WHERE company_id=$1`,[companyId]);
    for (const rec of core.recommendations) await client.query(`INSERT INTO recommendations(company_id,category,title,description,impact,effort,status,gtm_funnel) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [companyId,rec.category || 'General',rec.title || 'Recommendation',rec.description || '',rec.impact || 'Medium',rec.effort || 'Medium',statuses.get((rec.category || 'General')+'|'+rec.title) || 'New','both']);
    for (const idea of core.weeklyIdeas || []) await client.query(`INSERT INTO weekly_ideas(company_id,title,description,type) VALUES($1,$2,$3,$4)`,[companyId,idea.title,idea.description,idea.type || 'Blog Post']);
    for (const insight of complete) await client.query(`INSERT INTO channel_insights(company_id,channel_id,priority,why_it_matters,company_fit_summary,hero_stat,top_kpis,strategic_pillars,quick_wins,resources,generation_status,strategy_meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [companyId,insight.channelId,insight.priority,insight.whyItMatters,insight.companyFitSummary,JSON.stringify(insight.heroStat),JSON.stringify(insight.topKpis),JSON.stringify(insight.strategicPillars),JSON.stringify(insight.quickWins),JSON.stringify(insight.resources),insight.generationStatus || 'generated',JSON.stringify(insight.strategyMeta)]);
    await client.query(`UPDATE analysis_jobs SET status='completed',lease_until=NULL,updated_at=now() WHERE company_id=$1 AND token=$2`,[companyId,token]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
