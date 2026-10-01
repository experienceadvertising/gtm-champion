import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
export const jobPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
export async function ensureAnalysisJobs() {
  await jobPool.query(`CREATE TABLE IF NOT EXISTS analysis_jobs (
    company_id integer PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'queued', token uuid, lease_until timestamptz,
    attempts integer NOT NULL DEFAULT 0, error text, updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await jobPool.query(`CREATE INDEX IF NOT EXISTS analysis_jobs_pending_idx ON analysis_jobs(updated_at) WHERE status IN ('queued','running')`);
  await jobPool.query(`INSERT INTO analysis_jobs(company_id) SELECT id FROM companies WHERE name IS NULL AND summary='Analyzing your website...' ON CONFLICT DO NOTHING`);
}
export async function enqueueReanalysis(companyId: number, premium: boolean, cutoff: Date) {
  const client = await jobPool.connect();
  try {
    await client.query('BEGIN');
    const company = (await client.query('SELECT last_reanalyzed_at FROM companies WHERE id=$1 FOR UPDATE',[companyId])).rows[0];
    const job = (await client.query('SELECT status FROM analysis_jobs WHERE company_id=$1',[companyId])).rows[0];
    if (['queued','running'].includes(job?.status)) throw new Error('An analysis is already running for this company.');
    if (!premium && job?.status !== 'failed' && company?.last_reanalyzed_at && new Date(company.last_reanalyzed_at)>cutoff) throw new Error('The weekly re-analysis has already been used.');
    await client.query(`INSERT INTO analysis_jobs(company_id) VALUES($1) ON CONFLICT(company_id) DO UPDATE SET status='queued',token=NULL,lease_until=NULL,attempts=0,error=NULL,updated_at=now()`,[companyId]);
    await client.query('UPDATE companies SET last_reanalyzed_at=now() WHERE id=$1',[companyId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK');throw error; }
  finally {client.release();}
}
export async function enqueueAnalysis(companyId: number) {
  const result = await jobPool.query(`INSERT INTO analysis_jobs(company_id) VALUES($1)
    ON CONFLICT(company_id) DO UPDATE SET status='queued',token=NULL,lease_until=NULL,attempts=0,error=NULL,updated_at=now()
    WHERE analysis_jobs.status NOT IN ('queued','running') RETURNING company_id`, [companyId]);
  if (!result.rowCount) throw new Error('An analysis is already running for this company.');
}
export async function analysisJobState(companyId: number) {
  return (await jobPool.query('SELECT status,error,updated_at FROM analysis_jobs WHERE company_id=$1',[companyId])).rows[0] || null;
}
export async function assertAnalysisLease(companyId: number, token: string) {
  const result = await jobPool.query(`SELECT 1 FROM analysis_jobs WHERE company_id=$1 AND token=$2 AND status='running' AND lease_until>now()`,[companyId,token]);
  if (!result.rowCount) throw new Error('Analysis lease expired');
}
export async function claimAnalysisJob() {
  const claim = await jobPool.query(`UPDATE analysis_jobs SET status='running',token=$1,lease_until=now()+interval '2 minutes',attempts=attempts+1,updated_at=now()
        WHERE company_id=(SELECT company_id FROM analysis_jobs WHERE status='queued' OR (status='running' AND lease_until<now() AND attempts<2)
          ORDER BY updated_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING company_id,token`,[randomUUID()]);
  return claim.rows[0] as {company_id:number;token:string} | undefined;
}
export function startAnalysisWorker() {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    let job: {company_id:number;token:string} | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    try {
      // Each process handles one job. Expired leases can be claimed by another worker.
      await jobPool.query(`UPDATE analysis_jobs SET status='failed',error='Analysis interrupted twice. Please retry.',updated_at=now()
        WHERE status='running' AND lease_until<now() AND attempts>=2`);
      job = await claimAnalysisJob();
      if (!job) return;
      const owned = job;
      const started = Date.now();
      heartbeat = setInterval(() => {
        if (Date.now()-started>15*60*1000) { if (heartbeat) clearInterval(heartbeat); return; }
        jobPool.query(`UPDATE analysis_jobs SET lease_until=now()+interval '2 minutes',updated_at=now() WHERE company_id=$1 AND token=$2 AND status='running'`,[owned.company_id,owned.token]).catch(() => console.error('Analysis heartbeat unavailable'));
      },30000);
      const { storage } = await import('../storage');
      const companyRow = (await jobPool.query('SELECT user_id FROM companies WHERE id=$1',[owned.company_id])).rows[0];
      const company = companyRow ? await storage.getCompanyByUserId(companyRow.user_id) : undefined;
      if (!company) throw new Error('Company unavailable');
      const user = await storage.getUser(company.userId);
      if (!user) throw new Error('User unavailable');
      const { executeCompanyAnalysis } = await import('../routes/company');
      await executeCompanyAnalysis(owned.company_id, company.url, user.fullName, user.email, owned.token);
      await jobPool.query(`UPDATE analysis_jobs SET status='completed',lease_until=NULL,updated_at=now() WHERE company_id=$1 AND token=$2`,[owned.company_id,owned.token]);
    } catch {
      console.error('Analysis job failed; previous results retained');
      if (job) await jobPool.query(`UPDATE analysis_jobs SET status='failed',error='The audit could not finish. Your previous report is unchanged. Please retry.',lease_until=NULL,updated_at=now() WHERE company_id=$1 AND token=$2`,[job.company_id,job.token]).catch(() => {});
    } finally { if (heartbeat) clearInterval(heartbeat); busy=false; }
  };
  const timer = setInterval(() => void tick(),5000); timer.unref(); void tick();
  return () => clearInterval(timer);
}
