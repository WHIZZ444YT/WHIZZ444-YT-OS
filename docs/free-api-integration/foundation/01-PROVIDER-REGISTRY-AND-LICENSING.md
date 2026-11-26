# 01 · Provider registry and licensing

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Align the existing source directory, Worker states and database catalog. Map aliases to stable IDs. Record independent fetch/display/cache/persist/export grants, attribution, review date, provider/venue/product/audience scope, approver, expiration and written evidence. Project public capabilities from server decisions. Separate publisher schedule metadata from datasets.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Public capability registry and licensed-observation read checks implemented in this workstream. Production deployment and source-by-source reuse approvals remain pending.

- [`ict-futures/data/source-directory.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/ict-futures/data/source-directory.json)
- [`supabase/seed-source-registry.sql`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/supabase/seed-source-registry.sql)
- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)
- [`docs/futures-only-roadmap/12-DATA-PROVIDER-REGISTER-AND-LICENSING.md`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/futures-only-roadmap/12-DATA-PROVIDER-REGISTER-AND-LICENSING.md)

The gap to close is defined by this acceptance condition: Test withdrawn and expired grants with a populated cache. Every source has an owner and fallback.

## Website behavior and placement

**Routes** — /sources/; /data-health/

```text
1. Source list
2. capability badges
3. documentation and terms
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `cftc` · CFTC | TFF futures-only gpe5-46if; Disaggregated futures-only 72hh-3qpy; combined yw9f-hn96 / kh3c-gbw2; Legacy 6dca-aqww / jun7-fc8e | [Official documentation](https://publicreporting.cftc.gov/stories/s/COT-Help/p2fg-u73y/) · [Endpoint or reference](https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=5) | Anonymous GET; optional proposed CFTC_APP_TOKEN in X-App-Token | Baseline candidate for attributed normalized reports; review Socrata and agency conditions before persistence/export | SODA $select/$where/$order/$limit/$offset with stable ordering and bounded date ranges. Publication schedule is publisher-controlled. Sample fields report_date_as_yyyy_mm_dd, cftc_contract_market_code, open_interest_all. |
| `bls` · BLS | CPI CUSR0000SA0, core CUSR0000SA0L1E, PPI WPSFD4, payroll CES0000000001, wages CES0500000003, unemployment LNS14000000, JOLTS JTS000000000000000JOL | [Official documentation](https://www.bls.gov/developers/api_faqs.htm) · [Endpoint or reference](https://api.bls.gov/publicAPI/v1/timeseries/data/) | Anonymous POST v1; optional existing BLS_API_KEY for v2, registrationkey in POST body | Baseline candidate for attributed observations; cite access date, verify reuse terms before persistence/export | Body seriesid/startyear/endyear; batch up to repo limit, split years; parse status plus Results.series[].data. 25 vs 500 daily queries per official FAQ; confirm deployment account. Mostly monthly with revisions. |
| `treasury` · Treasury Fiscal Data | Monthly average interest rates; optional debt to penny | [Official documentation](https://fiscaldata.treasury.gov/api-documentation/) · [Endpoint or reference](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates) | Anonymous GET | Baseline candidate for attributed observations; dataset notices govern storage/export | fields, filter, sort, page[number], page[size]; data[].record_date and avg_interest_rate_amt. Debt candidate v2/accounting/od/debt_to_penny. Monthly averages and daily debt have different cadence. |
| `treasury-yield` · US Treasury yields | Daily nominal and real par curves | [Official documentation](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed) · [Endpoint or reference](https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=2026) | Anonymous GET Atom XML | Baseline candidate for attributed observations after bounded parser and reuse review | Allowlist daily_treasury_yield_curve and daily_treasury_real_yield_curve; follow documented year parameters per series. Nominal fields NEW_DATE and BC_2YEAR/5YEAR/10YEAR/30YEAR, verify real schema separately. Business-day observations. |
| `nyfed` · New York Fed | SOFR, EFFR, OBFR, TGCR, BGCR; operations and dealer statistics conditional | [Official documentation](https://markets.newyorkfed.org/static/docs/markets-api.html) · [Endpoint or reference](https://markets.newyorkfed.org/api/rates/all/latest.json) | Anonymous GET | Baseline funding display candidate under NY Fed terms; further operations endpoints conditional | Bounded last-N/history per series; repo and reverse-repo operations and primary dealer statistics require separate definitions and contract review. Example refRates[].effectiveDate/percentRate. Publication depends on series. |
| `ecb` · ECB | EXR D.USD.EUR.SP00.A; monetary aggregates/rates conditional | [Official documentation](https://data.ecb.europa.eu/help/api/overview) · [Endpoint or reference](https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A) | Anonymous GET SDMX CSV or JSON | Baseline for approved ECB-owned series; confirm third-party exclusions and attribution | startPeriod/endPeriod, format=csvdata; TIME_PERIOD/OBS_VALUE. Daily reference only; annual/quarterly/monthly datasets have independent frequencies. |
| `world-bank` · World Bank | GDP NY.GDP.MKTP.CD; growth NY.GDP.MKTP.KD.ZG, CPI FP.CPI.TOTL.ZG, trade NE.TRD.GNFS.ZS, optional debt GC.DOD.TOTL.GD.ZS | [Official documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) · [Endpoint or reference](https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json) | Anonymous GET v2 | Conditional dataset-level reuse review including third-party exceptions; attribute World Bank and original source | date, page, per_page, country/indicator allowlists. Response [paging, observations] with date/value and null gaps. Generally annual with revisions. |
| `bis` · BIS | Global liquidity indicators WS_GLI; verify current agency/version metadata | [Official documentation](https://stats.bis.org/api-doc/v2/) · [Endpoint or reference](https://stats.bis.org/api/v2/dataflow) | Anonymous public SDMX discovery; production query conditional | Reference-first until BIS legal and dataset terms approve display/cache/export | Resolve flow key via metadata then bound periods; parse dimensions, units, counterparty and currency; GLI quarterly, publication lag observed per release. |
| `imf` · IMF | IFS/WEO and global indicators candidate only | [Official documentation](https://data.imf.org/en/Resource-Pages/IMF-API) · [Endpoint or reference](https://data.imf.org/) | Reference-only pending exact SDMX flow, access and rights | No ingestion/cache/export approval in baseline | Use official SDMX 2.1/3.0 discovery when authorized; do not copy obsolete endpoints or infer registration. Record forecast vintage separately from observations. |
| `gdelt` · GDELT | DOC 2.0 ArticleList headline discovery | [Official documentation](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) · [Endpoint or reference](https://api.gdeltproject.org/api/v2/doc/doc) | Anonymous GET | Conditional metadata-only discovery; publisher links; article text/images/export rights require separate approval | query, mode=artlist, format=json, maxrecords, timespan; articles[].title/url/domain/seendate. Seen time is crawl time. 429/backoff; no SLA assumed. |
| `sec` · SEC EDGAR | Filings/submissions context, issuer watchlist CIK only | [Official documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) · [Endpoint or reference](https://data.sec.gov/submissions/CIK0000320193.json) | Anonymous GET with compliant contact User-Agent | Reference-first; optional metadata only after fair-access, filing rights and use review | filings.recent.form/accessionNumber/filingDate; SEC fair access cap 10 requests/sec overall, use far less; filings have issuer-specific timing. |
| `bea` · BEA | NIPA T10101 real GDP growth; PCE price series candidate T20804 with metadata-verified lines | [Official documentation](https://apps.bea.gov/API/docs/) · [Endpoint or reference](https://apps.bea.gov/api/data/) | Registered GET with existing BEA_API_KEY (UserID) | Conditional pending owner registration and dataset review | method=GetData, datasetname=NIPA, TableName, Frequency, Year, ResultFormat; BEAAPI.Results.Data[].TimePeriod/DataValue/UNIT_MULT. Track release vintages; bounded table/year calls. |
| `eia` · EIA | PET.WCESTUS1.W crude stocks excluding SPR; production PET.WCRFPUS2.W and Lower 48 storage via documented metadata to confirm | [Official documentation](https://www.eia.gov/opendata/documentation.php) · [Endpoint or reference](https://api.eia.gov/v2/seriesid/PET.WCESTUS1.W) | Registered GET v2 with existing EIA_API_KEY | Conditional pending owner registration and dataset review; provider terms govern reuse | length/offset/sort bounded; response.data[].period/value/unit; totals can be strings. Weekly with schedule exceptions; bulk alternatives separate from API-key setup. |
| `fred` · FRED | Selected macro series; ALFRED vintage-aware candidate | [Official documentation](https://fred.stlouisfed.org/docs/api/terms_of_use.html) · [Endpoint or reference](https://api.stlouisfed.org/fred/series/observations) | Registered GET with existing FRED_API_KEY | Reference-first pending per-series upstream ownership, archive/redistribution and API terms review | series_id, observation_start/end, realtime_start/end, limit/offset and file_type=json; observations[].date/value/realtime_start. Null on dot values. Verify actual series IDs and revision cadence. |
| `usda-nass` · USDA NASS | Quick Stats crop production and stocks | [Official documentation](https://quickstats.nass.usda.gov/api) · [Endpoint or reference](https://quickstats.nass.usda.gov/api/api_GET/) | Conditional registered GET with proposed USDA_NASS_API_KEY | Optional scope and per-dataset terms approval | Use get_counts before api_GET; segment by commodity/year/statistic and geographic level; data[].Value, unit_desc, reference_period_desc. Verify suppression codes and row cap in official docs. |
| `usda-fas` · USDA FAS | Production, Supply and Distribution (PSD); WASDE remains separate publication | [Official documentation](https://apps.fas.usda.gov/opendata/) · [Endpoint or reference](https://apps.fas.usda.gov/opendata/) | Conditional API key from api.data.gov, proposed USDA_FAS_API_KEY; verify current gateway/header | Optional scope and dataset rights review; WASDE reference link | Verify current OpenAPI operation and commodity/market-year keys first. No guessed production base URL. Track marketing year and revision coverage. |
| `tradingview` · TradingView | Hosted market widgets | [Official documentation](https://www.tradingview.com/widget-docs/faq/data/) · [Endpoint or reference](https://www.tradingview.com/widget/) | Hosted embed; no site API key | Conditional display via provider-generated embed only; exclude extraction, caching, export and analytics reuse | Test exact widget/symbol/venue/timeframe in preview. Label continuous and delay state. Direct links remain available. |
| `cme` · CME Group | Contract specs, holidays, Daily Bulletin, Volume & OI, licensed prices/history | [Official documentation](https://www.cmegroup.com/market-data/license-data.html) · [Endpoint or reference](https://www.cmegroup.com/market-data/daily-bulletin.html) | Reference links; vendor contract for data feed | Reference-only baseline; licensed data excluded until explicit written approval | Link to exchange product pages from active registry. Review 2027 distribution agreement and Bulletin revision. No automated scraping or reuse of Bulletin data assumed. |
| `ice` · ICE | DX specs, expiry, market reports and market data | [Official documentation](https://www.ice.com/market-data) · [Endpoint or reference](https://www.ice.com/products/194/us-dollar-index-futures) | Reference links; approval for data feed | Reference-only baseline; no redistribution rights inferred | Use official ICE US product and expiry pages. Do not confuse DX with a cash USD index proxy. |
| `cboe` · Cboe | VIX historical context | [Official documentation](https://www.cboe.com/tradable_products/vix/vix_historical_data/) · [Endpoint or reference](https://www.cboe.com/tradable_products/vix/vix_historical_data/) | Reference link | Reference-only; raw CSV storage, display/export require rights review | Label as index context. Never substitute for active futures market data. |
| `databento` · Databento | Live/historical futures, venue/schema-specific | [Official documentation](https://databento.com/futures) · [Endpoint or reference](https://databento.com/docs/) | Licensed vendor; no credential requested in baseline | Excluded from free baseline; credits and individual access do not grant website display | If procured later, separate vendor adapter using documented schema and approved delay/venue/audience. |
| `fed-board` · Federal Reserve Board | FOMC meeting calendar, policy statements, official RSS, H.4.1 | [Official documentation](https://www.federalreserve.gov/feeds/feeds.htm) · [Endpoint or reference](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Anonymous publisher schedule; approved RSS/Atom metadata | Baseline schedule/reference candidate; RSS extract limited to approved fields | Meeting ranges date-only unless official time supplied; RSS dedup by canonical URL/GUID; original releases remain authoritative. |
| `boe` · Bank of England | MPC schedule and decisions | [Official documentation](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) · [Endpoint or reference](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) | Anonymous supported schedule | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Europe/London; refresh daily when approved. |
| `boc` · Bank of Canada | Policy interest rate schedule | [Official documentation](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) · [Endpoint or reference](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) | Anonymous source | Conditional on reuse terms; reference fallback | Validate schedule year and source time America/Toronto; refresh daily. |
| `rba` · Reserve Bank of Australia | Board meeting calendar | [Official documentation](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) · [Endpoint or reference](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) | Anonymous source | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Australia/Sydney; refresh daily. |
| `opec` · OPEC | Monthly Oil Market Report and official releases | [Official documentation](https://www.opec.org/) · [Endpoint or reference](https://www.opec.org/) | Reference link | Reference only until precise report permalink and reuse permissions verified | Curate latest official publication landing page; avoid mirrored PDFs and unauthorized parsing. |

**Site API** — See the existing Worker gateway map in Doc 02. This foundation workstream adds no public URL unless explicitly specified. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Audit and reuse the existing store and role model. Any persistence requires Doc 04 and explicit dataset-level approval.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Decision rules

| Mode | Website behavior |
|---|---|
| Anonymous or registered public API | Server-side access to allowlisted datasets. Review access, display, persistence, cache and export independently. |
| CSV, JSON, XML/SDMX, ICS, RSS/Atom | Prefer official machine-readable feeds. Enforce bounds, attribution, publisher dates, and independent rights. Manual imports require provenance and explicit authorization. |
| Hosted iframe/script widget | Browser display per widget terms. No gateway ingestion, historical reuse, export or numeric fallback. |
| Public WebSocket | No proposed baseline socket. Public reachability alone grants no publisher or exchange rights. |
| Official reference | Click-through to the original publisher. No automated extraction or public mirroring. |
| Licensed API | Excluded from zero-cost baseline. Approval, entitlement, expiry and coverage must be evidenced before use. |
| MCP | Development/research aid only. Production operates independently of ChatGPT. |

The register above indexes 26 sources or source interfaces, counting Treasury's two interfaces separately. A documented endpoint is evidence of its intended contract. Successful responses, coverage and public display rights must be recorded independently at activation. Use redacted test fixtures with the listed fields. Confirm quotas in the current official documentation or account console. Where no quota is established here, enforce the project budget in Doc 20 and mark the upstream quota unverified.

## Implementation record

Built against `main` at `bfea6245998e25fa4a7e3e3f7c48bcfdb46fc268` after Doc 00 merged. The Worker catalogue is the canonical source of capability IDs and decisions. The original curated link directory and its Supabase seed retain their existing link IDs and URLs. Seed descriptions and the existence of a database row convey no data rights. No new table or migration is required for this capability projection.

- `GET /api/v1/providers` retains its `providers` health array and adds `registry.sources` and `registry.interfaces` with schema version 1. `gdelt-doc`, `cftc-pre`, `bls-v1`, `nyfed-markets` and Treasury IDs resolve to stable catalogue identities. Schedule interface IDs map to the same publisher while remaining `publisher-schedule` records. CMS, platform and retired compatibility statuses remain in the existing health array.
- Data Health shows capability decisions independently of snapshot freshness, and Sources links directly to the registry. Both provide publisher fallback links. No configuration or rights claims are inferred from a credential or a cached status.
- The operation fields `fetch`, `display`, `cache`, `persist` and `export` are independent. Null means the catalogue records no affirmative grant. TradingView is marked provider-hosted display only and grants no application fetch, cache or export. Databento remains excluded, exchange pages remain reference links, and FRED remains reference-first pending series-specific review. No additional upstream requests or provider credentials were introduced.
- The existing protected entitlement table remains the source for licensed futures display decisions. The query explicitly selects its display status and checks the provider/venue/root/delay match. Expiry is checked before querying observations and again before rendering the response. Responses are no-store so a previously released payload cannot be reused by a compliant cache after expiry or withdrawal. Existing private evidence fields are not exposed by the capability catalogue.
- Owners record the exact scope, relevant operation grants, evidence/reference, approver, review date, effective dates and expiry in reviewed records before enabling a new dataset. Use the existing entitlement table for licensed-observation display; broader approved dataset storage changes belong to Doc 04. For withdrawal, deactivate the entitlement, then verify that the public route produces an empty result even with database observations still present.

## Future file changes and implementation sequence

**Dependencies** — [00 · Repository audit](../foundation/00-REPOSITORY-AUDIT.md)

**Existing files** — ict-futures/data/source-directory.json, supabase/seed-source-registry.sql, cloudflare/src/index.js, docs/futures-only-roadmap/12-DATA-PROVIDER-REGISTER-AND-LICENSING.md.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Map aliases to stable IDs. Record independent fetch/display/cache/persist/export grants, attribution, review date, provider/venue/product/audience scope, approver, expiration and written evidence. Project public capabilities from server decisions. Separate publisher schedule metadata from datasets.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover active, expired and withdrawn display entitlements with observations still present, registry ID uniqueness, schedule identity and hosted-widget operation limits.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 01 (Provider registry and licensing) on the existing repository stack and reuse the named source owners. Prioritize align the existing source directory, Worker states and database catalog. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
