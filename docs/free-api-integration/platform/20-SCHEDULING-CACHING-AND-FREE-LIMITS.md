# 20 · Scheduling, caching and free limits

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Fit the existing schedule and platform quotas. Use UTC 30-minute cron to dispatch only due datasets, with jitter, bounded concurrency and per-provider budgets. Keep request path snapshot-first with retry-after and preserve an allowed last-good record. Alert using internal diagnostics, without introducing paid services.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`cloudflare/wrangler.toml`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/wrangler.toml)
- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)
- [`cloudflare/src/provider-http.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/provider-http.mjs)

The gap to close is defined by this acceptance condition: Test duplicate invocations, KV eventual consistency, 429 retry-after, stale aging and rights expiry on read.

## Website behavior and placement

**Routes** — /data-health/

```text
1. Provider freshness
2. last success
3. next eligible retry
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the [canonical provider and rights register](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream applies the relevant provider decisions at the platform layer.

**Site API** — Current cron and existing routes. No public scheduler endpoint. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use existing KV SNAPSHOTS and ingest-run diagnostics, no new store.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Budget and cadence

Current config has one trigger every 30 minutes, or 48 UTC dispatches per day. Cloudflare documents 100,000 KV reads/day and 1,000 writes/day on Free, with one write/second to a single key. Establish an internal ceiling of 500 writes/day and measure invocation/subrequest limits separately. Start with GDELT no more than every 30 minutes when healthy, official feed metadata every 1–6 hours according to publisher, schedules every 6–24 hours, daily yields once after publication, and weekly/monthly/quarterly observations at release windows with a low-frequency reconciliation job. No budget should depend on cached reads being perfectly consistent across regions. Lower traffic caps after measuring real writes and current quota. Never serve any last-good row past permission or validity cutoff even when a retained KV copy exists.

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [KV limits](https://developers.cloudflare.com/kv/platform/limits/) · [Cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) · [Supabase pricing](https://supabase.com/pricing) · [Vercel Hobby terms](https://vercel.com/docs/plans/hobby). If intended site use exceeds the eligible plan's terms or limits, reduce feature cadence/scope or require an owner hosting decision.

## Future file changes and implementation sequence

**Dependencies** — [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) · [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [18 · Data health and source directory](../platform/18-DATA-HEALTH-AND-SOURCE-DIRECTORY.md)

**Existing files** — cloudflare/wrangler.toml, cloudflare/src/index.js, cloudflare/src/provider-http.mjs.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Use UTC 30-minute cron to dispatch only due datasets, with jitter, bounded concurrency and per-provider budgets. Keep request path snapshot-first with retry-after and preserve an allowed last-good record. Alert using internal diagnostics, without introducing paid services.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test duplicate invocations, KV eventual consistency, 429 retry-after, stale aging and rights expiry on read.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 20 (Scheduling, caching and free limits) on the existing repository stack and reuse the named source owners. Prioritize fit the existing schedule and platform quotas. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
