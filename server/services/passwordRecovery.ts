import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import { jobPool } from './analysisJobs';
export function createRecoveryToken() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: recoveryTokenHash(token) };
}
export function recoveryTokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function validRecoveryInput(token: unknown, password: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) && typeof password === 'string'
    && password.length >= 8 && Buffer.byteLength(password,'utf8') <= 72;
}
export async function ensurePasswordRecovery() {
  await jobPool.query(`CREATE TABLE IF NOT EXISTS password_recovery (
    user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, requested_at timestamptz NOT NULL DEFAULT now()
  )`);
}
export async function issueRecoveryToken(userId: string) {
  const {token,hash} = createRecoveryToken();
  const result = await jobPool.query(`INSERT INTO password_recovery(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')
    ON CONFLICT(user_id) DO UPDATE SET token_hash=$2,expires_at=now()+interval '15 minutes',requested_at=now()
    WHERE password_recovery.requested_at<now()-interval '1 minute' RETURNING user_id`,[userId,hash]);
  return result.rowCount ? token : null;
}
export async function redeemRecoveryToken(token: string, password: string) {
  const passwordHash = await bcrypt.hash(password,12);
  const client = await jobPool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`DELETE FROM password_recovery WHERE token_hash=$1 AND expires_at>now() RETURNING user_id`,[recoveryTokenHash(token)]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return false; }
    const userId = result.rows[0].user_id;
    await client.query('UPDATE users SET password=$2 WHERE id=$1',[userId,passwordHash]);
    await client.query(`DELETE FROM session WHERE sess->>'userId'=$1`,[userId]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
