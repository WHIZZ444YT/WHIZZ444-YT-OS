# 17 · Reports and publications

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Curate official research and publications in one stable directory. Use publisher-owned landing pages or current permanent releases. Include Fed/FOMC and H.4.1, ECB, BLS, BEA, EIA WPSR, CFTC COT, Treasury, OPEC MOMR, USDA WASDE, IMF reports, and optional SEC filings context. Keep reports in source catalog, filter by topic/publisher; no PDF mirrors.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Proposed route. Related source registry/adapters already exist where shown below.

- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)
- [`ict-futures/data/source-directory.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/ict-futures/data/source-directory.json)

The gap to close is defined by this acceptance condition: Validate titles and destination domains; use link-only if feed or reproducible rights evidence is missing.

## Website behavior and placement

**Routes** — /research/reports/ (new)

```text
1. Topic and publisher
2. title/date
3. Open official report
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `sec` · SEC EDGAR | Filings/submissions context, issuer watchlist CIK only | [Official documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) · [Endpoint or reference](https://data.sec.gov/submissions/CIK0000320193.json) | Anonymous GET with compliant contact User-Agent | Reference-first; optional metadata only after fair-access, filing rights and use review | filings.recent.form/accessionNumber/filingDate; SEC fair access cap 10 requests/sec overall, use far less; filings have issuer-specific timing. |
| `eia` · EIA | PET.WCESTUS1.W crude stocks excluding SPR; production PET.WCRFPUS2.W and Lower 48 storage via documented metadata to confirm | [Official documentation](https://www.eia.gov/opendata/documentation.php) · [Endpoint or reference](https://api.eia.gov/v2/seriesid/PET.WCESTUS1.W) | Registered GET v2 with existing EIA_API_KEY | Conditional pending owner registration and dataset review; provider terms govern reuse | length/offset/sort bounded; response.data[].period/value/unit; totals can be strings. Weekly with schedule exceptions; bulk alternatives separate from API-key setup. |
| `cboe` · Cboe | VIX historical context | [Official documentation](https://www.cboe.com/tradable_products/vix/vix_historical_data/) · [Endpoint or reference](https://www.cboe.com/tradable_products/vix/vix_historical_data/) | Reference link | Reference-only; raw CSV storage, display/export require rights review | Label as index context. Never substitute for active futures market data. |
| `fed-board` · Federal Reserve Board | FOMC meeting calendar, policy statements, official RSS, H.4.1 | [Official documentation](https://www.federalreserve.gov/feeds/feeds.htm) · [Endpoint or reference](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Anonymous publisher schedule; approved RSS/Atom metadata | Baseline schedule/reference candidate; RSS extract limited to approved fields | Meeting ranges date-only unless official time supplied; RSS dedup by canonical URL/GUID; original releases remain authoritative. |
| `boe` · Bank of England | MPC schedule and decisions | [Official documentation](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) · [Endpoint or reference](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) | Anonymous supported schedule | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Europe/London; refresh daily when approved. |
| `boc` · Bank of Canada | Policy interest rate schedule | [Official documentation](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) · [Endpoint or reference](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) | Anonymous source | Conditional on reuse terms; reference fallback | Validate schedule year and source time America/Toronto; refresh daily. |
| `rba` · Reserve Bank of Australia | Board meeting calendar | [Official documentation](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) · [Endpoint or reference](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) | Anonymous source | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Australia/Sydney; refresh daily. |
| `opec` · OPEC | Monthly Oil Market Report and official releases | [Official documentation](https://www.opec.org/) · [Endpoint or reference](https://www.opec.org/) | Reference link | Reference only until precise report permalink and reuse permissions verified | Curate latest official publication landing page; avoid mirrored PDFs and unauthorized parsing. |

**Site API** — No gateway call in baseline. Static publisher directory. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Build static cards from reviewed publisher URLs. Provider availability does not gate route rendering.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — None. Static catalog entries.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Initial report links

- [FOMC statements and minutes](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm), [Fed H.4.1](https://www.federalreserve.gov/releases/h41/) and [ECB press releases](https://www.ecb.europa.eu/press/pr/date/html/index.en.html).
- [BLS releases](https://www.bls.gov/bls/news-release/home.htm) and [BEA release schedule](https://www.bea.gov/news/schedule).
- [EIA Weekly Petroleum Status Report](https://www.eia.gov/petroleum/supply/weekly/), [OPEC](https://www.opec.org/) and [USDA WASDE](https://www.usda.gov/oce/commodity-markets/wasde).
- [CFTC COT](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm), [Treasury rates](https://home.treasury.gov/resource-center/data-chart-center/interest-rates) and [IMF publications](https://www.imf.org/en/Publications).
- [SEC EDGAR](https://www.sec.gov/edgar/search/) for issuer filings context and [Cboe VIX historical context](https://www.cboe.com/tradable_products/vix/vix_historical_data/). Keep both clearly outside exchange-listed futures observations.

Serve curated links from the canonical source catalog. Source date is optional for rolling publisher index pages. Link to a permanent publication directly when stable and use publisher index as fallback. Link checker should validate target and redirect domains using provider-aware budgets rather than scraping publication pages.

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md) · [10 · Futures news and RSS](../research/10-FUTURES-NEWS-AND-RSS.md)

**Existing files** — scripts/build_site.py, ict-futures/data/source-directory.json.

**Proposed additions** — A Reports page renderer backed by the existing source catalog.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Use publisher-owned landing pages or current permanent releases. Include Fed/FOMC and H.4.1, ECB, BLS, BEA, EIA WPSR, CFTC COT, Treasury, OPEC MOMR, USDA WASDE, IMF reports, and optional SEC filings context. Keep reports in source catalog, filter by topic/publisher; no PDF mirrors.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Validate titles and destination domains; use link-only if feed or reproducible rights evidence is missing.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 17 (Reports and publications) on the existing repository stack and reuse the named source owners. Prioritize curate official research and publications in one stable directory. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
