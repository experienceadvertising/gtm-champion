# GTM Champion Marketing Operating System Plan

## Product direction

GTM Champion should help founders and marketers decide what to do, execute the work, measure the signal, and receive useful proactive follow-up. The product should feel less like a one-time AI report and more like a practical digital marketing operating system for growth, advertising, and brand visibility.

## Problem

Founders and lean marketing teams often have fragmented tools, too many possible channels, and little time to turn strategy into action. A generic plan is not enough: they need a prioritized operating rhythm that connects tasks, campaign signals, brand visibility, and the next decision.

## Goals

- Reduce time from completed analysis to first in-progress marketing action.
- Give every user a clear 30-day sprint tied to one or more measurable signals.
- Make evidence, assumptions, risk, and measurement visible before a user spends budget.
- Make Pro valuable because it helps users operate continuously, not because it hides the original strategy.
- Create an extensible foundation for agency workflows and approved data integrations.

## Non-goals for this first release

- Do not make changes to live ad accounts, analytics accounts, email platforms, or social accounts without explicit user authorization.
- Do not promise campaign results or represent modeled scores as observed performance.
- Do not add multi-company collaboration, team permissions, or white-label portals until workspace and permission models are designed.
- Do not replace the existing channel strategy and agent systems. Extend them with a clearer operating loop.

## P0: implemented in this branch

### 30-day execution sprint

- The dashboard selects up to three highest-value unfinished recommendations, prioritizing in-progress work, high-impact work, and top strategy channels.
- Each task shows when to use it in the sprint, the first KPI to watch, and the available evidence count for its channel.
- A user can start the next task directly from the sprint. This reuses the existing recommendation status and GTM Agent workflow.
- A user can open the relevant channel to inspect evidence, assumptions, risks, cadence, and budget guidance before acting.

### Pro positioning

- Free is positioned around diagnosis, direction, and the first execution sprint.
- Pro is positioned around a proactive operating system: coaching, history, unlimited refreshes, scenario planning, and client-ready deliverables.
- The upgrade modal uses the same operating-system promise as pricing.

### Measurement

- Starting a sprint task and opening the supporting channel emit no-op-safe analytics events.
- Existing activation, channel view, paywall, checkout, and analysis-completion events remain the core funnel trail.

## P1: next product release

### Operating scorecard

- Let a user define a baseline for traffic, leads, pipeline, conversion rate, and media budget.
- Show a weekly scorecard by channel with a simple status: no signal, learning, improving, or needs attention.
- Require users to label data as manually entered, connected, or estimated.

### Weekly review

- Every week, summarize completed work, stalled work, the next experiment, and one decision required from the user.
- Pro users can receive this by dashboard, email, push, or Slack based on explicit preferences.
- Keep the review focused on a small number of decisions, not a long report.

### Proof and methodology

- Add a public methodology page explaining inputs, evidence types, planning estimates, and limitations.
- Add sample strategies and anonymized execution examples before publishing outcome claims.

## P2: agency and integration expansion

### Agency workspace

- Multiple companies, client switching, branded reports, shared execution sprints, and permissioned collaborators.
- Portfolio view for active sprints, at-risk accounts, campaign pacing, and upcoming client reviews.

### Approved data connections

- Read-only connections first: Google Ads, GA4, Search Console, Meta Ads, LinkedIn Ads, HubSpot, and email platforms.
- Display source, sync time, account scope, and data freshness for every connected metric.
- Never change budgets, campaigns, tracking, or audiences without a separate explicit confirmation flow.

### Brand visibility monitor

- Track search presence, branded search, organic social publishing cadence, content gaps, review signals, and AI-search visibility.
- Recommend concrete actions and explain the evidence behind each recommendation.

## Success metrics

### Leading indicators

- At least 50% of completed analyses start one sprint task within seven days.
- At least 30% of active users return to the sprint within seven days.
- At least 25% of sprint starters mark one task completed within 30 days.
- Measure execution-sprint starts, channel evidence views, status changes, and weekly-review opens in GA4.

### Business indicators

- Increase the share of activated users who encounter a meaningful Pro value moment.
- Improve free-to-Pro conversion after users have started or completed a sprint action.
- Build consented, anonymized evidence for future case studies and product proof.

## Open decisions

- Decide which baseline metrics are mandatory for a scorecard and which can be optional.
- Define the first read-only integration based on the customer segment: GA4 for founders, Google Ads for paid media teams, or Search Console for organic-led teams.
- Validate the Pro price and packaging against customer interviews before adding an agency tier.
