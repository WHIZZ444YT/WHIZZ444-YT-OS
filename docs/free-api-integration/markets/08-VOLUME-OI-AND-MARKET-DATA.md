# 08 · Volume, OI and market data

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Keep CFTC OI and licensed exchange observations separate. Render separate sections for report OI and daily exchange rows. Resolve entitled provider, venue, market, delay and valid window at read time. Ingest authorized listed contract/session metrics via existing protected route; separate latest revisions and settlement from close.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — CFTC reporting and licensed-ingest plumbing present. Provider authorization and populated exchange coverage pending evidence.

- [`assets/volume-open-interest.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/volume-open-interest.js)
- [`cloudflare/src/futures-observations.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/futures-observations.mjs)
- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)

The gap to close is defined by this acceptance condition: Reject missing or expired grants, unknown product-month and unapproved export. No daily exchange volume fabricated from COT.

## Website behavior and placement

**Routes** — /volume-open-interest/

```text
1. CFTC report OI
2. exchange data state
3. CME Bulletin / ICE links
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `cftc` · CFTC | TFF futures-only gpe5-46if; Disaggregated futures-only 72hh-3qpy; combined yw9f-hn96 / kh3c-gbw2; Legacy 6dca-aqww / jun7-fc8e | [Official documentation](https://publicreporting.cftc.gov/stories/s/COT-Help/p2fg-u73y/) · [Endpoint or reference](https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=5) | Anonymous GET; optional proposed CFTC_APP_TOKEN in X-App-Token | Baseline candidate for attributed normalized reports; review Socrata and agency conditions before persistence/export | SODA $select/$where/$order/$limit/$offset with stable ordering and bounded date ranges. Publication schedule is publisher-controlled. Sample fields report_date_as_yyyy_mm_dd, cftc_contract_market_code, open_interest_all. |
| `cme` · CME Group | Contract specs, holidays, Daily Bulletin, Volume & OI, licensed prices/history | [Official documentation](https://www.cmegroup.com/market-data/license-data.html) · [Endpoint or reference](https://www.cmegroup.com/market-data/daily-bulletin.html) | Reference links; vendor contract for data feed | Reference-only baseline; licensed data excluded until explicit written approval | Link to exchange product pages from active registry. Review 2027 distribution agreement and Bulletin revision. No automated scraping or reuse of Bulletin data assumed. |
| `ice` · ICE | DX specs, expiry, market reports and market data | [Official documentation](https://www.ice.com/market-data) · [Endpoint or reference](https://www.ice.com/products/194/us-dollar-index-futures) | Reference links; approval for data feed | Reference-only baseline; no redistribution rights inferred | Use official ICE US product and expiry pages. Do not confuse DX with a cash USD index proxy. |
| `databento` · Databento | Live/historical futures, venue/schema-specific | [Official documentation](https://databento.com/futures) · [Endpoint or reference](https://databento.com/docs/) | Licensed vendor; no credential requested in baseline | Excluded from free baseline; credits and individual access do not grant website display | If procured later, separate vendor adapter using documented schema and approved delay/venue/audience. |

**Site API** — GET /volume-open-interest, /futures-observations and /market-data/status; existing POST /ingest/futures-market-data. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Reuse futures_market_observations and futures_market_data_entitlements; COT remains in report observations.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [07 · Markets and contract intelligence](../markets/07-MARKETS-AND-CONTRACT-INTELLIGENCE.md) · [15 · CFTC COT and positioning](../research/15-CFTC-COT-AND-POSITIONING.md)

**Existing files** — assets/volume-open-interest.js, cloudflare/src/futures-observations.mjs, scripts/build_site.py.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Render separate sections for report OI and daily exchange rows. Resolve entitled provider, venue, market, delay and valid window at read time. Ingest authorized listed contract/session metrics via existing protected route; separate latest revisions and settlement from close.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Reject missing or expired grants, unknown product-month and unapproved export. No daily exchange volume fabricated from COT.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 08 (Volume, OI and market data) on the existing repository stack and reuse the named source owners. Prioritize keep CFTC OI and licensed exchange observations separate. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
