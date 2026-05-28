---
name: Slack OAuth www/session pitfalls
description: Two bugs that broke Slack OAuth when the app is served on both www. and apex domain
---

## The two bugs

**Bug 1 — Redirect URI mismatch:** `req.get("host")` returns `www.gtmchampion.com` in production, but Slack only had `gtmchampion.com` registered. Fix: strip `www.` before building the redirect URI.

**Bug 2 — Session cookie domain mismatch:** OAuth started on `www.gtmchampion.com` (session cookie set there). After stripping www. the callback lands on `gtmchampion.com` — browser does not send the `www.` session cookie, so `requireAuth` fails and state check fails.

## Fix applied

Replaced session-based state with an **HMAC-signed state token** (`{userId}:{ts}:{b64origin}:{sig}`):
- No session lookup needed in the callback
- Origin is encoded in the token so the post-OAuth redirect goes back to the correct host (preserving www. or non-www.)
- Callback route has no `requireAuth` — identity comes from the verified state

**Why:** Any OAuth flow where the redirect URI domain differs from the initiating domain will have cookie mismatch issues. Self-contained signed state avoids the dependency entirely.

**How to apply:** Use this pattern for any future third-party OAuth (GitHub, Google, etc.) when the app is reachable on multiple hostnames.
