import type { Store, IncrementResponse } from "express-rate-limit";
import { db } from "../../db/index";
import { sql } from "drizzle-orm";

let tableCreated = false;

async function ensureTable() {
  if (tableCreated) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limit_store (
        key VARCHAR(255) NOT NULL,
        prefix VARCHAR(50) NOT NULL,
        hits INTEGER NOT NULL DEFAULT 1,
        expires_at TIMESTAMP NOT NULL,
        PRIMARY KEY (key, prefix)
      )
    `);
    tableCreated = true;
  } catch (err) {
    console.error("Failed to create rate_limit_store table:", err);
  }
}

async function cleanup(prefix: string) {
  try {
    await db.execute(sql`
      DELETE FROM rate_limit_store WHERE prefix = ${prefix} AND expires_at < NOW()
    `);
  } catch {
  }
}

export function pgRateLimitStore(prefix: string, windowMs: number): Store {
  const init = async () => {
    await ensureTable();
  };

  init().catch(err => console.error("Rate limit store init failed:", err));

  setInterval(() => cleanup(prefix), windowMs);

  return {
    async increment(key: string): Promise<IncrementResponse> {
      await ensureTable();
      const expiresAt = new Date(Date.now() + windowMs);

      await db.execute(sql`
        INSERT INTO rate_limit_store (key, prefix, hits, expires_at)
        VALUES (${key}, ${prefix}, 1, ${expiresAt})
        ON CONFLICT (key, prefix)
        DO UPDATE SET 
          hits = CASE 
            WHEN rate_limit_store.expires_at < NOW() THEN 1 
            ELSE rate_limit_store.hits + 1 
          END,
          expires_at = CASE 
            WHEN rate_limit_store.expires_at < NOW() THEN ${expiresAt}
            ELSE rate_limit_store.expires_at 
          END
      `);

      const selectResult = await db.execute(sql`
        SELECT hits, expires_at FROM rate_limit_store
        WHERE key = ${key} AND prefix = ${prefix}
      `);

      const row = selectResult.rows?.[0] as { hits: number; expires_at: Date } | undefined;
      return {
        totalHits: row?.hits ?? 1,
        resetTime: row ? new Date(row.expires_at) : new Date(Date.now() + windowMs),
      };
    },

    async decrement(key: string): Promise<void> {
      await db.execute(sql`
        UPDATE rate_limit_store 
        SET hits = GREATEST(hits - 1, 0) 
        WHERE key = ${key} AND prefix = ${prefix}
      `);
    },

    async resetKey(key: string): Promise<void> {
      await db.execute(sql`
        DELETE FROM rate_limit_store WHERE key = ${key} AND prefix = ${prefix}
      `);
    },

    async resetAll(): Promise<void> {
      await db.execute(sql`
        DELETE FROM rate_limit_store WHERE prefix = ${prefix}
      `);
    },
  };
}
