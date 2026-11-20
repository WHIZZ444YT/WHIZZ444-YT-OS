# Part 3 — Contract lifecycle registry update

**Review date:** 20 November 2026

**Status:** Registry and UI improved; all 15 family lifecycle records remain partial.
**Branch:** `codex/futures-roadmap-next-2026-11-20`

## Work completed

- Updated the generated Contract Specs & Expiry page with accessible family search, exchange filtering and a live result count.
- Kept the dated, exchange-sourced core unit/tick values distinct from contract-month lifecycle data.
- Added direct official product-specification links and exchange-maintained expiry links: CME expiration, trading-hours and holiday calendars for CME Group families; ICE DX expiry details for DX.
- Added an explicit per-family lifecycle evidence checklist for active contract month, last trade, notice/delivery or settlement, product hours/holiday overrides, rule revision, and roll/continuous-series policy.
- Added a five-step verification workflow. The interface reports `0 / 15 complete`; it does not invent current expiry dates, infer a roll day, scrape exchange pages, or claim live expiry feeds.
- Kept risk outputs conditional and the exact lifecycle `PARTIAL` status unchanged.

## Source boundary

CME Group's expiration calendar and product pages are official lookup surfaces for product dates and holiday hours. ICE's DX product page and expiry details provide the separate official source for the ICE family. These links are references for a human reviewer; this update does not ingest or redistribute their page data. The central CME calendar is not evidence that each contract row in the application has been individually checked.

## Remaining contract acceptance work

For each of the 15 families, an authorized reviewer still needs to select relevant listed month(s), reconcile product-specific last trade/notice/delivery/final-settlement fields and cutoff times, confirm hours/breaks/holiday exceptions and effective rule revisions, and document an appropriate roll/continuous-series policy with permitted data. Evidence must be stored with source, as-of date and review scope before a record can be marked complete. Exact dates vary by contract month and product; generic third-Friday assumptions are not accepted.

This UI pass does not finish the full contract-specification requirement and does not unblock trade-ready sizing or backtesting.

## Verification

- `python scripts/build_site.py` — passed; generated 50 resources, 15 futures families and 82 Academy pages.
- `python scripts/validate.py` — passed, 172/172 checks.
- `python -m unittest discover -s tests -v` — passed, 55 tests.
- `node --test tests/*.mjs` — passed, 97 tests, including behavior checks for searching by micro symbol and filtering the ICE family.
- `python scripts/audit_internal_links.py` — passed; 130 HTML files and 1,384 links checked, 0 issues.
- `git diff --check` — passed; Git reported only existing working-copy line-ending notices for generated assets.
- Visual/mobile/assistive-technology QA — still open.

No Worker deployment, merge, or production release is part of this update.
