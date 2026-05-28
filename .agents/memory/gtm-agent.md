---
name: GTM Agent architecture
description: How the GTM Agent coaching system works — tables, hooks, scheduler, email templates, and gating.
---

## Rule
All agent actions are gated on `isPremium && agentEnabled`. Never skip both checks.

**Why:** Agent emails go to Postmark outbound stream (not broadcast). Sending to free users would violate the Pro-tier promise and waste quota.

**How to apply:** Every function in `server/services/gtmAgent.ts` checks `user.isPremium && user.agentEnabled` at the top and returns early if false.

## Tables
- `agent_events` — append-only log of every coaching touchpoint (email or push) per user. Queried by `hasAgentEvent` to prevent duplicate nudges within a time window.
- `scheduled_nudges` — queue of future stall checks. Rows created by `fireMilestoneStart`, consumed by the daily 2 AM cron via `processStallNudges`. `sentAt` null = pending.

## Hook points
- Status update (`PATCH /api/recommendations/:id/status` in `server/routes/company.ts`) fires agent functions via `setImmediate` — non-blocking, response already sent.
- Fires `fireMilestoneStart` on first "In Progress" for a channel.
- Fires `fireCompletionCongrats` when all recs in a channel are Completed.

## Scheduler
- Daily 2 AM ET: `processStallNudges()` — processes all due `scheduled_nudges` rows.
- Monday 9 AM ET: `sendWeeklyDigestsToAllProUsers()` — runs alongside existing weekly email job.

## Dedup logic
- `hasAgentEvent(userId, eventType, channelId, windowMs)` — checks for recent events in the time window to prevent spam.
- `hasPendingNudge(userId, channelId)` — prevents duplicate scheduled nudges per channel.

## Email streams
- Milestone, stall, congrats emails use `MessageStream: "outbound"` (transactional).
- Weekly digest uses `MessageStream: "broadcast"`.
