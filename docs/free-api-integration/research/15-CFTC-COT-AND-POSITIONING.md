# 15 · CFTC COT and positioning

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Normalize report-specific positioning and comparisons. Use identifiers per venue and report family, match market code before rendering. TFF dealers, asset managers, leveraged funds versus Disaggregated managed money, producer/merchant and swap dealers. Compute long minus short and changes against prior matching report; percentile = midpoint ranks among eligible values with sample/window disclosure. No interpolation of missing reports.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`cloudflare/src/cot-contracts.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/cot-contracts.mjs)
- [`assets/cot-page.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/cot-page.js)
- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)
- [`supabase/migrations/20261119125044_add_cot_report_observations.sql`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/supabase/migrations/20261119125044_add_cot_report_observations.sql)

The gap to close is defined by this acceptance condition: Test TFF/Disaggregated and combined isolation, duplicates, changed cadence, incomplete observations and tie percentiles.

## Website behavior and placement

**Routes** — /research/positioning/; /volume-open-interest/

```text
1. Market and report
2. positions/net
3. changes/percentile
4. CFTC release evidence
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `cftc` · CFTC | TFF futures-only gpe5-46if; Disaggregated futures-only 72hh-3qpy; combined yw9f-hn96 / kh3c-gbw2; Legacy 6dca-aqww / jun7-fc8e | [Official documentation](https://publicreporting.cftc.gov/stories/s/COT-Help/p2fg-u73y/) · [Endpoint or reference](https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=5) | Anonymous GET; optional proposed CFTC_APP_TOKEN in X-App-Token | Baseline candidate for attributed normalized reports; review Socrata and agency conditions before persistence/export | SODA $select/$where/$order/$limit/$offset with stable ordering and bounded date ranges. Publication schedule is publisher-controlled. Sample fields report_date_as_yyyy_mm_dd, cftc_contract_market_code, open_interest_all. |

**Site API** — GET /cot and /volume-open-interest; optional token at upstream only. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Reuse cot_report_observations; no exchange OI writes.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Implementation record

- Positioning separates market-name searches from exact CFTC market-code searches. Analytics are grouped by report family, variant, market code and trader category. Existing COT routing, CFTC OI and CSV field contracts remain compatible.
- Duplicate position dates keep the newer retrieval. Changes compare with the prior matching report, including gaps or irregular cadence. Missing current or prior positions produce no change value. Code-less rows remain descriptive and do not feed the chart or percentile.
- A percentile is `100 × (below + ties / 2) / n`, calculated from up to 52 complete observations available for that series ending on the row’s position date. The table includes its sample size and date window. Future reports are excluded.
- Publication remains distinct from position and retrieval dates. The release schedule is linked for publisher changes. `CFTC_APP_TOKEN` is optional and server-side only. No database migration or new datasets were introduced.

## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md)

**Existing files** — cloudflare/src/cot-contracts.mjs, assets/cot-page.js, cloudflare/src/index.js, supabase/migrations/20261119125044_add_cot_report_observations.sql.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Use identifiers per venue and report family, match market code before rendering. TFF dealers, asset managers, leveraged funds versus Disaggregated managed money, producer/merchant and swap dealers. Compute long minus short and changes against prior matching report; percentile = midpoint ranks among eligible values with sample/window disclosure. No interpolation of missing reports.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test TFF/Disaggregated and combined isolation, duplicates, changed cadence, incomplete observations and tie percentiles.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 15 (CFTC COT and positioning) on the existing repository stack and reuse the named source owners. Prioritize normalize report-specific positioning and comparisons. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
