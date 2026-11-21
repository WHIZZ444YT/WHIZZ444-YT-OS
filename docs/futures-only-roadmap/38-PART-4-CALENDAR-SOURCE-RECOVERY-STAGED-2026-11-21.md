# Part 4 — Calendar source recovery candidate

**Review date:** 21 November 2026

**Status:** Parser fixes are in PR #26 and deployed only as a zero-traffic Worker candidate. The active production Worker remains v22 at 100%; candidate v23 is at 0%.

## Source and parser findings

- The [BLS iCal help page](https://www.bls.gov/help/hlpiCAL.htm) identifies `https://www.bls.gov/schedule/news_release/bls.ics` as its online calendar and says updates are usually scheduled Friday afternoon Eastern Time. Direct retrieval from this Worker/environment is currently denied with HTTP 403. The adapter now preserves that specific upstream status as `upstream_http_403`; it does not retry around or bypass the publisher restriction.
- The [Bank of England MPC dates page](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) lists confirmed 2026 and 2027 publication dates. Its [monetary-policy page](https://www.bankofengland.co.uk/monetary-policy) says the decision and minutes publish at 12 noon on announcement day. The upstream HTML encodes the apostrophe as `&rsquo;`; the candidate parser now decodes this entity before applying the release-time policy check.
- The [Reserve Bank of Australia board schedule](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) lists date ranges for Monetary Policy Board meetings. The parser now decodes `&ndash;` so a range such as `7–8 December` retains its intended meaning. RBA source entries are date ranges; the adapter does not infer an announcement time from the meeting range.

These source pages support the parser policy and expected schedule semantics. They do not establish commercial redistribution rights, complete global calendar coverage, or an exchange trading-hours/holiday calendar.

## Candidate implementation and checks

PR #26 adds safe decoding for the specific named apostrophe and dash entities needed by the official schedules, and classifies BLS HTTP failures using the existing sanitized `upstream_http_NNN` diagnostic. Fixtures cover the encoded BoE apostrophe, RBA date range and BLS 403 classification.

The focused Node checks passed: `node --test tests/test_economic_calendar.mjs tests/test_worker_news_routes.mjs` — 38/38. After the documentation update, the complete local verification also passed:

- `python scripts/build_site.py` — generated 50 resources, 15 futures families and 82 Academy pages.
- `python -m unittest discover -s tests -v` — 72/72.
- `node --test tests/*.mjs` — 105/105.
- `python scripts/validate.py` — 183/183.
- `python scripts/audit_internal_links.py` — 130 HTML files, 1,385 links, no issues.
- `npm run worker:dry-run` — passed with Wrangler 4.164.0, the expected existing bindings, 207.20 KiB upload / 48.50 KiB gzip.
- `git diff --check` — passed.

Cloudflare candidate version `aa91a5b1-e5b2-4c24-816b-c9220e56360c` (v23) was staged in deployment `31ded4a8-ee34-4d73-84f8-ed59523d381c` with 0% traffic, while v22 (`9d25d09f-d340-44a7-b41e-e6ad60762d12`) stayed at 100%. A version-override smoke found valid route envelopes and CORS, BoE and RBA schedule snapshots fresh, BLS unavailable with `upstream_http_403`, and licensed market data `not-configured`. There were no route failures, but the overall provider result is degraded and requires operator review. The full suite above is a local source/build check, not a fresh production smoke or license/coverage acceptance.

**Shared-KV caveat:** Worker versions use the same `SNAPSHOTS` KV namespace. The candidate smoke refreshed provider snapshots in that shared namespace. A later request served by v22 could therefore read those refreshed snapshots even though v22 remains the only version receiving normal traffic. The fresh BoE/RBA snapshots are evidence of candidate parser behavior, not proof that v22 contains the parser change or that v23 has production traffic.

## Remaining acceptance work

- Resolve BLS access with the publisher or an approved route. Do not bypass its HTTP 403 response. Confirm retrieval and freshness through an authorized path before calling the source healthy.
- Merge/review PR #26 and separately decide whether to promote v23. Until then, v22 remains at 100% and v23 remains at 0%.
- Recheck BLS, BoE and RBA through the production source after the relevant code is merged/deployed; retain fresh/stale/unavailable behavior and source attribution.
- Expand the calendar only with justified official sources, including futures exchange hours, breaks, holidays and early closes. Track revisions and retain date-only events where publishers do not provide a time.
- Review the permitted display/redistribution rights for every source and finish site-wide visual, mobile, keyboard and screen-reader QA.

## Roadmap state

This candidate improves parsing and diagnostics; it does not complete calendar coverage or the Futures-Only roadmap. Licensed market-data access, volume/open-interest persistence, complete contract lifecycle records, Academy video coverage, reproducible ICT evidence, current prop-firm rules, disposable-user Auth/RLS/file/export/restore/deletion QA and the full-site accessibility review remain open as tracked in the [implementation status](27-IMPLEMENTATION-STATUS-AND-REMAINING-WORK-2026-11-20.md).
