# 09 · Economic calendar

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Combine issuer schedules without losing precision or personal reminders. Reuse events endpoints; cards show publisher, ET/local/IST, release type, revision and market relevance. Preserve BLS ICS all-day and local timestamps, EIA holiday overrides, and tentative date-only meetings. Store forecast, actual and release date as independent nullable fields. Preserve #windows and personal events.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`cloudflare/src/economic-calendar.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-calendar.mjs)
- [`cloudflare/src/economic-calendar-extended.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-calendar-extended.mjs)
- [`assets/publisher-schedules.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/publisher-schedules.js)
- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)

The gap to close is defined by this acceptance condition: Test DST across March/November, ICS date-only, canceled/rescheduled events, EIA exception and unchanged personal data.

## Website behavior and placement

**Routes** — /sessions/#calendar

```text
1. Time zone
2. source filters
3. grouped releases
4. issuer link
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `cftc` · CFTC | TFF futures-only gpe5-46if; Disaggregated futures-only 72hh-3qpy; combined yw9f-hn96 / kh3c-gbw2; Legacy 6dca-aqww / jun7-fc8e | [Official documentation](https://publicreporting.cftc.gov/stories/s/COT-Help/p2fg-u73y/) · [Endpoint or reference](https://publicreporting.cftc.gov/resource/gpe5-46if.json?$limit=5) | Anonymous GET; optional proposed CFTC_APP_TOKEN in X-App-Token | Baseline candidate for attributed normalized reports; review Socrata and agency conditions before persistence/export | SODA $select/$where/$order/$limit/$offset with stable ordering and bounded date ranges. Publication schedule is publisher-controlled. Sample fields report_date_as_yyyy_mm_dd, cftc_contract_market_code, open_interest_all. |
| `bls` · BLS | CPI CUSR0000SA0, core CUSR0000SA0L1E, PPI WPSFD4, payroll CES0000000001, wages CES0500000003, unemployment LNS14000000, JOLTS JTS000000000000000JOL | [Official documentation](https://www.bls.gov/developers/api_faqs.htm) · [Endpoint or reference](https://api.bls.gov/publicAPI/v1/timeseries/data/) | Anonymous POST v1; optional existing BLS_API_KEY for v2, registrationkey in POST body | Baseline candidate for attributed observations; cite access date, verify reuse terms before persistence/export | Body seriesid/startyear/endyear; batch up to repo limit, split years; parse status plus Results.series[].data. 25 vs 500 daily queries per official FAQ; confirm deployment account. Mostly monthly with revisions. |
| `ecb` · ECB | EXR D.USD.EUR.SP00.A; monetary aggregates/rates conditional | [Official documentation](https://data.ecb.europa.eu/help/api/overview) · [Endpoint or reference](https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A) | Anonymous GET SDMX CSV or JSON | Baseline for approved ECB-owned series; confirm third-party exclusions and attribution | startPeriod/endPeriod, format=csvdata; TIME_PERIOD/OBS_VALUE. Daily reference only; annual/quarterly/monthly datasets have independent frequencies. |
| `world-bank` · World Bank | GDP NY.GDP.MKTP.CD; growth NY.GDP.MKTP.KD.ZG, CPI FP.CPI.TOTL.ZG, trade NE.TRD.GNFS.ZS, optional debt GC.DOD.TOTL.GD.ZS | [Official documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) · [Endpoint or reference](https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json) | Anonymous GET v2 | Conditional dataset-level reuse review including third-party exceptions; attribute World Bank and original source | date, page, per_page, country/indicator allowlists. Response [paging, observations] with date/value and null gaps. Generally annual with revisions. |
| `bis` · BIS | Global liquidity indicators WS_GLI; verify current agency/version metadata | [Official documentation](https://stats.bis.org/api-doc/v2/) · [Endpoint or reference](https://stats.bis.org/api/v2/dataflow) | Anonymous public SDMX discovery; production query conditional | Reference-first until BIS legal and dataset terms approve display/cache/export | Resolve flow key via metadata then bound periods; parse dimensions, units, counterparty and currency; GLI quarterly, publication lag observed per release. |
| `imf` · IMF | IFS/WEO and global indicators candidate only | [Official documentation](https://data.imf.org/en/Resource-Pages/IMF-API) · [Endpoint or reference](https://data.imf.org/) | Reference-only pending exact SDMX flow, access and rights | No ingestion/cache/export approval in baseline | Use official SDMX 2.1/3.0 discovery when authorized; do not copy obsolete endpoints or infer registration. Record forecast vintage separately from observations. |
| `bea` · BEA | NIPA T10101 real GDP growth; PCE price series candidate T20804 with metadata-verified lines | [Official documentation](https://apps.bea.gov/API/docs/) · [Endpoint or reference](https://apps.bea.gov/api/data/) | Registered GET with existing BEA_API_KEY (UserID) | Conditional pending owner registration and dataset review | method=GetData, datasetname=NIPA, TableName, Frequency, Year, ResultFormat; BEAAPI.Results.Data[].TimePeriod/DataValue/UNIT_MULT. Track release vintages; bounded table/year calls. |
| `eia` · EIA | PET.WCESTUS1.W crude stocks excluding SPR; production PET.WCRFPUS2.W and Lower 48 storage via documented metadata to confirm | [Official documentation](https://www.eia.gov/opendata/documentation.php) · [Endpoint or reference](https://api.eia.gov/v2/seriesid/PET.WCESTUS1.W) | Registered GET v2 with existing EIA_API_KEY | Conditional pending owner registration and dataset review; provider terms govern reuse | length/offset/sort bounded; response.data[].period/value/unit; totals can be strings. Weekly with schedule exceptions; bulk alternatives separate from API-key setup. |
| `fred` · FRED | Selected macro series; ALFRED vintage-aware candidate | [Official documentation](https://fred.stlouisfed.org/docs/api/terms_of_use.html) · [Endpoint or reference](https://api.stlouisfed.org/fred/series/observations) | Registered GET with existing FRED_API_KEY | Reference-first pending per-series upstream ownership, archive/redistribution and API terms review | series_id, observation_start/end, realtime_start/end, limit/offset and file_type=json; observations[].date/value/realtime_start. Null on dot values. Verify actual series IDs and revision cadence. |
| `fed-board` · Federal Reserve Board | FOMC meeting calendar, policy statements, official RSS, H.4.1 | [Official documentation](https://www.federalreserve.gov/feeds/feeds.htm) · [Endpoint or reference](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Anonymous publisher schedule; approved RSS/Atom metadata | Baseline schedule/reference candidate; RSS extract limited to approved fields | Meeting ranges date-only unless official time supplied; RSS dedup by canonical URL/GUID; original releases remain authoritative. |
| `boe` · Bank of England | MPC schedule and decisions | [Official documentation](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) · [Endpoint or reference](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) | Anonymous supported schedule | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Europe/London; refresh daily when approved. |
| `boc` · Bank of Canada | Policy interest rate schedule | [Official documentation](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) · [Endpoint or reference](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) | Anonymous source | Conditional on reuse terms; reference fallback | Validate schedule year and source time America/Toronto; refresh daily. |
| `rba` · Reserve Bank of Australia | Board meeting calendar | [Official documentation](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) · [Endpoint or reference](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) | Anonymous source | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Australia/Sydney; refresh daily. |
| `opec` · OPEC | Monthly Oil Market Report and official releases | [Official documentation](https://www.opec.org/) · [Endpoint or reference](https://www.opec.org/) | Reference link | Reference only until precise report permalink and reuse permissions verified | Curate latest official publication landing page; avoid mirrored PDFs and unauthorized parsing. |

**Site API** — GET /events and issuer-specific suffixes listed below. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Keep public economic_events separate from user_events. KV where schedule retention is permitted.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Calendar endpoint and fallback matrix

| Existing suffix | Official source | Precision / placement |
|---|---|---|
| events | [BLS ICS](https://www.bls.gov/schedule/news_release/bls.ics) | ICS timestamp or date-only, US releases. |
| events/eia | [EIA WPSR schedule](https://www.eia.gov/petroleum/supply/weekly/schedule.php) | ET publisher schedule and exceptions, energy. |
| events/cftc | [COT release schedule](https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm) | Read issuer dates and published time, positioning. |
| events/fomc | [Fed FOMC](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Meetings/date ranges, no inferred statement time. |
| events/ecb | [ECB Council](https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html) | Date-only unless issuer time documented. |
| events/boe | [BoE MPC](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) | UK policy calendar. |
| events/boc | [BoC key rate](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) | Canada policy calendar. |
| events/rba | [RBA board calendar](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) | Australia policy calendar. |
| events/bea | [BEA release schedule](https://www.bea.gov/news/schedule) and [JSON](https://apps.bea.gov/API/signup/release_dates.json) | Growth/PCE schedule, independent of API key. |

Derive display with IANA identifiers, preserve source timezone and show date-only events as dates. Normalize stable publisher ID, release category, scheduled local date/time, timezone, precision, actual release timestamp if supplied, retrievedAt and revision/cancellation. Missing or incompatible parser falls back to linked issuer page. Personal events and ICT session/killzone calculations preserve their existing data model.

## Future file changes and implementation sequence

**Dependencies** — [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) · [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md)

**Existing files** — cloudflare/src/economic-calendar.mjs, cloudflare/src/economic-calendar-extended.mjs, assets/publisher-schedules.js, scripts/build_site.py.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Reuse events endpoints; cards show publisher, ET/local/IST, release type, revision and market relevance. Preserve BLS ICS all-day and local timestamps, EIA holiday overrides, and tentative date-only meetings. Store forecast, actual and release date as independent nullable fields. Preserve #windows and personal events.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test DST across March/November, ICS date-only, canceled/rescheduled events, EIA exception and unchanged personal data.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 09 (Economic calendar) on the existing repository stack and reuse the named source owners. Prioritize combine issuer schedules without losing precision or personal reminders. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
