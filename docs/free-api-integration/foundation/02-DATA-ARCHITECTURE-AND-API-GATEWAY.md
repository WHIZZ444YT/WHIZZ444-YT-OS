# 02 · Data architecture and API gateway

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Preserve the Python/Vercel, Worker/KV and Supabase stack and /api/v1 compatibility. Browser sends bounded IDs to Worker, which selects a fixed upstream, normalizes, records provenance, authorizes reads and uses KV or Supabase only when allowed. GETs return snapshots where possible. Keep existing response fields and introduce additive capabilities; ingest remains bearer-protected.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)
- [`cloudflare/src/provider-http.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/provider-http.mjs)
- [`assets/runtime-config.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/runtime-config.js)

The gap to close is defined by this acceptance condition: Test invalid enum, date, limit and origin; timeout and 429 fallback; assert no supplied host reaches fetch.

## Website behavior and placement

**Routes** — /data-health/; all consumer routes

```text
1. Status
2. dataset
3. publisher reference
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

### Existing route map

All paths below use the existing `/api/v1` prefix. Preserve response schemas and current error behavior until consumers migrate.

| Method / paths | Contract and owner |
|---|---|
| GET `/health`, `/providers` | Gateway and dataset status; public fields only. Never return environment values. |
| GET `/news`, `/news/sources` | Existing market/topic discovery and source descriptors; bounded metadata snapshots and original links. |
| GET `/events`, `/events/eia`, `/events/cftc`, `/events/fomc`, `/events/ecb`, `/events/boe`, `/events/boc`, `/events/rba`, `/events/bea` | Publisher-specific snapshots; keep date precision, zone, source, retrieval and count. |
| GET `/macro`, `/macro/funding` | BLS and New York Fed snapshots; keep publisher updates and retrieval separate. |
| GET `/economic/providers`, `/economic/{provider}`, `/economic/history` | Existing dispatch and persisted history. History accepts provider, series_id, start_date, end_date, limit and offset. Gate new datasets and avoid uncached public refresh fan-out. |
| GET `/cot`, `/volume-open-interest` | CFTC report/family/variant filters; report OI namespace. Reuse present query parser and validate variant/market combinations. |
| GET `/futures-observations`, `/market-data/status` | Entitlement-gated observations and coverage. Market mapping from server registry only. |
| POST `/ingest`, `/ingest/futures-market-data` | Server-to-server bearer and existing structured request contracts; verify DB credentials, rights and idempotency. |
| GET Builder/CMS and prediction compatibility routes | Preserve compatibility. Excluded from new financial baseline. |

Future route policy: keep additive changes under economic/provider dispatch, event sources, news and provider health. Recommend public status 400 invalid filters, 405 unsupported method, 429 budget reached (Retry-After) and 503 unconfigured/unavailable if no permitted last-good data, subject to compatibility. Distinguish successful zero observations from authorization denial. Keep public CORS exact and separate from bearer/RLS decisions. Use schema limits on result size and elapsed time, avoid logging queries.

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md)

**Existing files** — cloudflare/src/index.js, cloudflare/src/provider-http.mjs, assets/runtime-config.js.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Browser sends bounded IDs to Worker, which selects a fixed upstream, normalizes, records provenance, authorizes reads and uses KV or Supabase only when allowed. GETs return snapshots where possible. Keep existing response fields and introduce additive capabilities; ingest remains bearer-protected.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test invalid enum, date, limit and origin; timeout and 429 fallback; assert no supplied host reaches fetch.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 02 (Data architecture and API gateway) on the existing repository stack and reuse the named source owners. Prioritize preserve the Python/Vercel, Worker/KV and Supabase stack and /api/v1 compatibility. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
