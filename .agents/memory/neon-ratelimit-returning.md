---
name: Neon HTTP driver RETURNING clause bug
description: db.execute() with drizzle-orm/neon-http returns empty rows[] for UPSERT+RETURNING; fix is to split into UPSERT then SELECT.
---

## Rule
Never rely on `RETURNING` from an UPSERT via `db.execute()` with the `drizzle-orm/neon-http` driver — `result.rows` comes back empty even though the row was written.

**Why:** The Neon HTTP driver's `execute()` wrapper does not surface `RETURNING` rows for `INSERT ... ON CONFLICT DO UPDATE` statements. The insert/update succeeds, but `result.rows` is an empty array, causing any `.rows[0].someField` access to throw `TypeError: Cannot read properties of undefined`.

**How to apply:** Split the operation into two steps:
1. `await db.execute(sql\`INSERT ... ON CONFLICT DO UPDATE SET ...\`)` — no RETURNING clause
2. `await db.execute(sql\`SELECT ... WHERE key = ${key}\`)` — then read from `selectResult.rows?.[0]`

Always guard with optional chaining and a sane fallback (`?? defaultValue`) in case the SELECT also returns empty (e.g. table not yet created on cold start).

This affected `server/routes/rateLimitStore.ts` and caused all API routes to return 500 errors on every request.
