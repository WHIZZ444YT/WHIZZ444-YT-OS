# 11 · US macro intelligence

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Consolidate inflation, labour, growth and PCE with release context. Keep BLS access anonymous by default and prefer v2 only when configured. Extend BEA NIPA via allowlisted metadata-verified series; distinguish levels, MoM, YoY and annualized QoQ and use the right seasonal variant. FRED remains reference until series approval.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`assets/macro-page.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/macro-page.js)
- [`assets/economic-data.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/economic-data.js)
- [`cloudflare/src/economic-providers.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-providers.js)
- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)

The gap to close is defined by this acceptance condition: Test vintage ordering, missing value propagation, percentages and adjusted/unadjusted units.

## Website behavior and placement

**Routes** — /macro/#us-economy

```text
1. Inflation
2. jobs and wages
3. GDP/PCE
4. release/revision details
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `bls` · BLS | CPI CUSR0000SA0, core CUSR0000SA0L1E, PPI WPSFD4, payroll CES0000000001, wages CES0500000003, unemployment LNS14000000, JOLTS JTS000000000000000JOL | [Official documentation](https://www.bls.gov/developers/api_faqs.htm) · [Endpoint or reference](https://api.bls.gov/publicAPI/v1/timeseries/data/) | Anonymous POST v1; optional existing BLS_API_KEY for v2, registrationkey in POST body | Baseline candidate for attributed observations; cite access date, verify reuse terms before persistence/export | Body seriesid/startyear/endyear; batch up to repo limit, split years; parse status plus Results.series[].data. 25 vs 500 daily queries per official FAQ; confirm deployment account. Mostly monthly with revisions. |
| `bea` · BEA | NIPA T10101 real GDP growth; PCE price series candidate T20804 with metadata-verified lines | [Official documentation](https://apps.bea.gov/API/docs/) · [Endpoint or reference](https://apps.bea.gov/api/data/) | Registered GET with existing BEA_API_KEY (UserID) | Conditional pending owner registration and dataset review | method=GetData, datasetname=NIPA, TableName, Frequency, Year, ResultFormat; BEAAPI.Results.Data[].TimePeriod/DataValue/UNIT_MULT. Track release vintages; bounded table/year calls. |
| `fred` · FRED | Selected macro series; ALFRED vintage-aware candidate | [Official documentation](https://fred.stlouisfed.org/docs/api/terms_of_use.html) · [Endpoint or reference](https://api.stlouisfed.org/fred/series/observations) | Registered GET with existing FRED_API_KEY | Reference-first pending per-series upstream ownership, archive/redistribution and API terms review | series_id, observation_start/end, realtime_start/end, limit/offset and file_type=json; observations[].date/value/realtime_start. Null on dot values. Verify actual series IDs and revision cadence. |

**Site API** — GET /macro, /economic/bea and /economic/history; conditional /economic/fred. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use economic_observations for approved series and ingestion_runs for private trace.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Implementation record

- `/macro/#us-economy` shows official BLS inflation, jobs, wages and openings with explicit seasonal basis. Derived price-index changes use exact one- and twelve-month comparisons and show unavailable when an observation is missing. Registered BLS remains optional.
- BEA requests fixed NIPA tables T10101 and T20804 and checks the returned line, series code, label and unit. GDP is the published annualized QoQ rate. Headline PCE is a monthly adjusted index level. One available BEA series can still display if the other request fails. Release dates remain linked separately.
- FRED is reference-only by default, including previously cached rows and the public history route. Configure a comma-separated `FRED_APPROVED_SERIES` subset only after per-series review. A migration closes direct browser reads of FRED rows. Apply it through the normal Supabase rollout to enforce the database-side boundary.
- Macro history keeps observation period, vintage and retrieval separate. Equal observation dates select the newest supplied vintage, then retrieval time. Missing values remain unavailable.

## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md)

**Existing files** — assets/macro-page.js, assets/economic-data.js, cloudflare/src/economic-providers.js, cloudflare/src/index.js.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Keep BLS access anonymous by default and prefer v2 only when configured. Extend BEA NIPA via allowlisted metadata-verified series; distinguish levels, MoM, YoY and annualized QoQ and use the right seasonal variant. FRED remains reference until series approval.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test vintage ordering, missing value propagation, percentages and adjusted/unadjusted units.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 11 (US macro intelligence) on the existing repository stack and reuse the named source owners. Prioritize consolidate inflation, labour, growth and PCE with release context. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
