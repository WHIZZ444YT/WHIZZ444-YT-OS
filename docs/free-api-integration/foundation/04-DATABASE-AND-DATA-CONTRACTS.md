# 04 · Database and data contracts

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Reuse normalized records and enforce provenance and RLS. Map dataset IDs to existing economic_observations, cot_report_observations and futures_market_observations; use ingestion_runs for internal accountability. Upsert deterministic identities, preserve revisions and enforce downstream rights per row. Add migrations only for gaps after schema review.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing tables and identities retained. Economic revision and retry controls are included in this implementation. Production migration is a separate rollout step.

- [`supabase/migrations/`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/e791f37da39209f3ac6c50ebf2f960101f618efb/supabase/migrations)
- [`supabase/seed-source-registry.sql`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/supabase/seed-source-registry.sql)
- [`cloudflare/src/economic-providers.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-providers.js)
- [`cloudflare/src/futures-observations.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/futures-observations.mjs)

The gap to close is defined by this acceptance condition: Test same import twice, partial batch retry, revoked entitlement and cross-account isolation.

## Website behavior and placement

**Routes** — /data-health/; research consumers

```text
1. Dataset
2. coverage
3. last valid observation
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — See the existing Worker gateway map in Doc 02. This foundation workstream adds no public URL unless explicitly specified. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Exercise this workstream using existing local and preview tools. No new automated upstream connection is required.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Audit and reuse the existing store and role model. Any persistence requires Doc 04 and explicit dataset-level approval.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Storage model

| Data | Existing destination | Required handling |
|---|---|---|
| Catalog / health | source_registry, provider_status and Worker KV state | Stable IDs and public capability projection, distinguish attempt from success. |
| Macro | economic_observations | Source series, observation period, value/unit, vintage and publication; keep original normalized identifiers. |
| Calendar / news | economic_events, news_items or rights-approved ephemeral snapshots | Use source UID plus occurrence/revision and canonical link identity. Separate private user_events. |
| COT | cot_report_observations and earlier cot_positions | Prefer report-family contract and verify compatibility with the earlier table. |
| Exchange | futures_market_observations and futures_market_data_entitlements | Existing normalized records; entitlements separate from ingest payload and checked as of request time. |
| Ingest history | ingestion_runs | Service-only, bounded diagnostic fields and counts. |
| Workspace | profiles, journal_trades, watchlists, watchlist_items, lesson_progress, user_events, alert_rules, alert_events, research_notes, user_preferences, strategy_backtests, strategy_backtest_trades | Retain user ownership and RLS. No cross-tenant joins or public status reporting. |

Contract example (illustrative field values, not a live reading): provider=bea, dataset_id=NIPA:T10101, series_id from BEA metadata, observation_date=2026-07-01, frequency=quarterly, value=null, unit=percent, published_at=null, vintage_start=null. Missing numeric data remains null. Add separate safe lineage fields only where consumers need them. Compare SQL unique indexes before choosing UPSERT keys, scope auth checks ahead of storage and export, keep legacy views compatible, redact raw payloads and enforce retention by dataset.

## Implementation record

- Economic latest rows continue to merge by provider, dataset, series, frequency and observation date. The additive migration archives the previous normalized values on a substantive change and ignores an older retrieval attempting to replace a newer row. Identical replays do not create revisions. Earlier overwritten revisions cannot be reconstructed.
- The revision archive is service-only and uses the existing observation ID as lineage. Deleting an observation deletes its revisions. Public direct SQL readers must select named normalized columns. Raw payloads and persistence diagnostics stay out of public economic snapshots. Historical gateway pagination keeps the established response shape.
- A partial Supabase batch records counts and a sanitized failure reason. The scheduled job can replay a still-current KV snapshot with the same conflict keys, without fetching the external dataset again. Existing COT and licensed futures identities stay intact. Licensed futures visibility continues to require a current entitlement, and workspace RLS still scopes rows to their owners.
- Apply the additive migration to the intended database before relying on revision capture. Run the disposable PostgreSQL and Worker checks first. This branch neither applies the production migration nor changes approval for any provider. Roll back application code independently. Preserve the archive if a subsequent corrective migration is needed.

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) · [03 · API keys and authentication](../foundation/03-API-KEYS-AND-AUTHENTICATION.md)

**Existing files** — supabase/migrations/, supabase/seed-source-registry.sql, cloudflare/src/economic-providers.js, cloudflare/src/futures-observations.mjs.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Map dataset IDs to existing economic_observations, cot_report_observations and futures_market_observations; use ingestion_runs for internal accountability. Upsert deterministic identities, preserve revisions and enforce downstream rights per row. Add migrations only for gaps after schema review.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test same import twice, partial batch retry, revoked entitlement and cross-account isolation.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 04 (Database and data contracts) on the existing repository stack and reuse the named source owners. Prioritize reuse normalized records and enforce provenance and RLS. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
