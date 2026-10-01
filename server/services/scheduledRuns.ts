import { jobPool } from './analysisJobs';
export async function ensureScheduledRuns() {
  await jobPool.query(`CREATE TABLE IF NOT EXISTS scheduled_runs (job_key text PRIMARY KEY, claimed_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'claimed')`);
}
export async function runScheduledOnce(key: string, work: () => Promise<void>) {
  const claim = await jobPool.query('INSERT INTO scheduled_runs(job_key) VALUES($1) ON CONFLICT DO NOTHING RETURNING job_key',[key]);
  if (!claim.rowCount) return;
  try { await work(); await jobPool.query("UPDATE scheduled_runs SET status='completed' WHERE job_key=$1",[key]); }
  catch (error) {
    // Delivery may have happened. Do not resend a whole batch blindly.
    await jobPool.query("UPDATE scheduled_runs SET status='needs_review' WHERE job_key=$1",[key]);
    throw error;
  }
}
