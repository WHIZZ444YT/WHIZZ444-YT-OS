# Part 6 — Volume, Open Interest and COT Execution Repor

**Review date:** 19 November 2026
**Branch:** `codex/charter-alignment-2026-11-19
**Status:** Partial. Local COT family/variant handling, source attribution, category normalization, weekly history, export and optional Supabase persistence are implemented. Live source smoke checks, production migration/write verification, verified futures-root crosswalks and licensed exchange volume/OI remain outstanding.

## Implemented

- Added versioned CFTC contracts for Legacy, TFF and Disaggregated with separate Futures Only and Futures and Options Combined dataset IDs. Official PRE confirms each family/variant and the distinct classifications. Exact source dataset links are now listed in both source directories.
- Added strict query validation for report family, variant, source-market text and exact `contract_market_code`. Unsupported/duplicate query parameters and unsafe market expressions return stable 400 errors. Queries use only the allow-listed official dataset IDs.
- Normalized report-specific category fields while retaining the source-native record and exact field mapping. Rows carry family, variant, source market code/name, report/position date, null publication timestamp with an explicit reason, retrieval timestamp, unit, OI, long/short/spreading, net and percentages only where inputs are complete.
- Added weekly changes computed only within the same report family, variant, CFTC contract-market code and trader category. Missing values remain null and are never treated as zero.
- Rebuilt the COT page with family/variant/market/category filters, weekly net-position chart, normalized table and filtered CSV export. The chart identifies the exact returned CFTC market code, category, report family, variant, weekly unit, source and date range.
- Extended Volume & Open Interest selection to keep weekly CFTC open interest distinct from exchange trading volume and let users choose Futures Only versus Combined data. Returned market names/codes are explicit; they are not presented as expiry-level exchange OI.
- Added an additive `cot_report_observations` migration with report-variant-aware idempotency, market/date indexes, generated net, raw source fields, RLS and browser read-only access. The Worker upserts in bounded batches only when server-side Supabase URL and secret are configured, and surfaces the persistence state.
- CFTC PRE does not return a per-row publication timestamp. The UI keeps `published_at` null, shows the provider retrieval time separately and links the official release schedule rather than inferring a publication date. CFTC generally publishes Friday at 3:30 p.m. Eastern using the preceding Tuesday's positions; holiday delays can shift the schedule.

## Official source verification

The official CFTC report catalogue, PRE FAQ, release schedule and six dataset pages were checked on 19 November 2026. CFTC identifies Legacy, Disaggregated and TFF as separate report families; Futures Only and Futures and Options Combined are distinct data sets. The current dataset pages showed data updated 16 November 2026. The CFTC schedule states the usual Friday 3:30 p.m. Eastern release and holiday delays.
Sources: [CFTC COT reports](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm), [CFTC PRE FAQ](https://publicreporting.cftc.gov/stories/s/Public-Reporting-FAQ/inwp-fmhz/), [CFTC release schedule](https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm), [Legacy Futures Only](https://publicreporting.cftc.gov/Commitments-of-Traders/Legacy-Futures-Only/6dca-aqww), [Legacy Combined](https://publicreporting.cftc.gov/Commitments-of-Traders/Legacy-Combined/jun7-fc8e), [Disaggregated Futures Only](https://publicreporting.cftc.gov/Commitments-of-Traders/Disaggregated-Futures-Only/72hh-3qpy), [Disaggregated Combined](https://publicreporting.cftc.gov/Commitments-of-Traders/Disaggregated-Combined/kh3c-gbw2), [TFF Futures Only](https://publicreporting.cftc.gov/Commitments-of-Traders/TFF-Futures-Only/gpe5-46if), [TFF Combined](https://publicreporting.cftc.gov/Commitments-of-Traders/TFF-Combined/yw9f-hn96).

## Acceptance status

| Requirement | Status |
|---|---|
| Legacy, TFF, Disaggregated and Futures Only/Combined separated | Implemented locally and covered by dataset-ID and route tests. |
| Report-specific categories and native source fields retained | Implemented locally; category field names and null behavior covered by tests. |
| Position, publication and retrieval time separated | Implemented; the CFTC endpoint does not provide per-row publication timestamps, so the product records `null`. |
| Release timing and holiday distinction | Official release schedule linked; app does not fabricate a historical actual publication time. |
| Daily/intraday exchange volume and OI | Not configured; weekly CFTC OI is the only connected measure. No exchange feed or market-data entitlement was verified. |
| Exact listed-futures-root to CFTC code crosswalk | Partial. The page searches source market names and exposes exact returned source codes; the 15-family root crosswalk has not been independently reviewed and versioned. COT is not expiry-specific. |
| Derived net, weekly change and percent-of-OI | Implemented/tested. COT percentile/index and matched-market comparison are not implemented. |
| Chart source, unit, frequency, dates and legend | Implemented for the selected CFTC market/category history. |
| Idempotency, indexes, RLS and export | Migration and CSV export implemented; tests cover variant-aware upsert shape and schema checks. Production migration and real Supabase writes are unverified. |

## Remaining gaps and evidence limits

- Local networking restrictions prevented a direct request from this build environment to CFTC PRE. Official dataset definitions and IDs were checked via CFTC pages, but no live route response, current row freshness or production Worker behavior was asserted in this Part.
- Supabase credentials are absent in the verified production snapshot. The migration was not applied and no live database write or RLS query was run.
- No licensed/authorized CME/ICE daily or intraday volume/OI feed is configured. This module continues to show an unavailable state for exchange volume.
- COT's CFTC contract-market code is not a listed contract expiry. A current reviewed crosswalk from all 15 site families to exact CFTC source market code(s), effective dates and exchanges still needs source-by-source review.
- COT percentile/index, timestamp-matched cross-market comparisons and explicit correction/version history remain deferred; no inferred COT trade signal was added.
- The local browser preview could not connect to the generated build in this environment, so no post-change screenshot/manual visual sign-off is claimed.
- No deployment, production database change, push or external message was made.

## Changed source paths

- `cloudflare/src/cot-contracts.mjs
- `cloudflare/src/index.js
- `assets/cot-page.js
- `assets/volume-open-interest.js
- `assets/site-shell.css
- `scripts/build_site.py
- `scripts/validate.py
- `tests/test_cot_contracts.mjs
- `tests/test_worker_news_routes.mjs
- `tests/test_build.py
- `supabase/migrations/20261119173000_add_cot_report_observations.sql
- `resources.json
- `ict-futures/data/source-directory.json
- `README.md
- `docs/ARCHITECTURE.md
- `docs/IMPLEMENTATION.md
- `docs/futures-only-roadmap/README.md

Generated `dist/` files come from the site builder and are not edited by hand.

## Verification

| Check | Result |
|---|---|
| `python scripts/build_site.py` | Passed; 50 sources, 15 futures families and 82 Academy lessons. |
| `python -m unittest discover -s tests` | Passed: 51 tests. |
| `python scripts/validate.py` | Passed: 144/144 checks. |
| `python scripts/audit_internal_links.py` | Passed: 130 HTML files, 1,358 internal links, zero issues. |
| COT Node unit tests | Passed: 6 tests. |
| Mock Worker route tests | Passed: 6 tests, including combined dataset selection and variant-aware persistence. |
| `git diff --check` | Passed; Git emitted CRLF/LF normalization notices only. |
