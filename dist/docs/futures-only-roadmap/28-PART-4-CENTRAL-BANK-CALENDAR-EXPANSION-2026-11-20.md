# Part 4 — Central-Bank Calendar Expansion

**Review date:** 20 November 2026
**Status:** Implemented in the open PR branch; deployment and live Worker checks remain pending.
**Repository:** [WHIZZ444YT/WHIZZ444-YT-OS](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS)
**Pull request:** [#22](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/22)

This is a scoped Part 4 update. It adds four official central-bank schedule adapters to the existing BLS, EIA, CFTC and Federal Reserve feeds. It does not complete the full economic calendar, exchange session calendar, or the Futures-Only roadmap.

## What changed

- Added a bounded, no-key publisher adapter for ECB Governing Council monetary-policy meeting dates. Non-monetary and General Council entries are excluded. Meeting days remain date-only because the calendar does not provide an exact decision time.
- Added a Bank of England MPC adapter. It reads confirmed announcement dates and checks the separate official monetary-policy page before including the publisher's 12 noon policy time. `Europe/London` resolves seasonal clock changes.
- Added a Bank of Canada policy-rate adapter. It reads the rate-date schedule and checks the separate official blackout-guidelines page before including 9:45 Eastern Time. `America/Toronto` resolves seasonal clock changes.
- Added an RBA Monetary Policy Board adapter that keeps the publisher's meeting start and end dates. It does not infer a rate-decision time.
- Added four Worker routes and separate KV snapshots: `/api/v1/events/ecb`, `/api/v1/events/boe`, `/api/v1/events/boc`, and `/api/v1/events/rba`.
- Registered all four providers in `/api/v1/providers` and extended the post-deployment Worker smoke command to validate eight calendar providers/routes.
- Updated the Sessions page to request all eight schedules, identify each source timezone, display source-local times, preserve date-only values and filter those values against the publisher's local date. Direct links to all four official calendars are included.
- Parsers reject unexpected page structures and do not return an empty `fresh` snapshot when no schedule rows were recognized. Existing response size limits, source attribution, retrieval time, source revision and stale/unavailable handling remain in place.

## Official sources

- ECB [Governing Council and General Council schedule](https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html)
- Bank of England [confirmed MPC dates](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) and [monetary-policy announcement time](https://www.bankofengland.co.uk/monetary-policy)
- Bank of Canada [policy-rate dates](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) and [blackout guidelines with announcement time](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/blackout-guidelines/)
- Reserve Bank of Australia [Monetary Policy Board meeting dates](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html)

The Bank of England date page and time-policy page are read together. The Bank of Canada schedule and time-policy page are also read together. A time is not published by these adapters if its corresponding official policy statement is absent or changes. ECB and RBA schedules remain date-only.

## Verification

- `python scripts/build_site.py` — passed; 50 resources, 15 futures families and 82 Academy lessons generated.
- `python -m unittest discover -s tests -v` — passed, 55 tests.
- `node --test tests/*.mjs` — passed, 95 tests, including schedule parser, route caching and Worker smoke contracts.
- `python scripts/validate.py` — passed, 172/172 checks.
- `python scripts/audit_internal_links.py` — passed; 130 HTML files, 1,384 internal links and 0 issues.
- `git diff --check` — passed; Git reported only the checkout's LF-to-CRLF notices.
- Node prints an existing non-failing ESM module-type advisory for `cloudflare/src/index.js`.

The tests use controlled source-page fixtures. They verify parser shape, date-only semantics, UK/Canada DST offsets, provider envelopes, route caching and safe configuration states. They are not a live production Worker check or browser-based visual/accessibility review.

## Acceptance status

| Item | Status | Evidence or remaining work |
|---|---|---|
| Four additional publisher adapters | Implemented and tested | Parsers and fetchers cover ECB, BoE, Bank of Canada and RBA official source shapes. |
| Four Worker API routes | Implemented and tested locally | Route tests verify attribution, source URLs, caching and unconfigured storage response. |
| Eight calendar publishers in smoke checks | Implemented and tested locally | Smoke contract includes all eight schedule routes and provider IDs. |
| Calendar UI source display | Implemented in branch | Source-local timezone, date-only labels, publisher links and local-date filtering are covered by build/structural checks. Interactive browser review remains open. |
| Deployment and live route checks | Pending | Worker deployment is separate. Run the repository's manual live smoke workflow after reviewed Worker deployment using a network path that can reach the Worker. |
| Global and exchange calendar completeness | Pending | Add only justified official releases plus product-specific exchange hours, breaks, holidays and early closes. Current eight providers do not make a complete U.S. or global calendar. |
| Durable schedule revision history | Pending | Current KV snapshots expose retrieval and source revision metadata but replace the cached snapshot; historical revisions are not retained as an audit trail. |
| Whole-site visual/mobile/accessibility review | Pending | Perform desktop/mobile browser review, keyboard and focus review, screen-reader checks and loading/stale/unavailable/error-state review. |

## Other roadmap work still open

- Verify one exact video for each of 82 lessons and 8 Entry Models.
- Complete current official lifecycle specifications for all 15 futures families.
- Obtain market-data license, vendor entitlements and credentials before enabling quote/bar/depth display; no real-time or redistribution rights are implied by public endpoints.
- Connect and verify authorized volume/open-interest ingestion and persistence. The repository schema change still requires review and controlled application to the intended database.
- Produce reproducible ICT out-of-sample backtest evidence using permitted data, realistic rolls, fills and costs.
- Verify prop-firm terms against current official rulebooks.
- Complete disposable-user Auth/RLS, attachment, export/restore and deletion QA. Account deletion remains disabled until the deletion and cleanup checks pass.
- Review and deploy the Worker separately; verify the new routes against the deployed service. A local route test does not establish production behavior.

## Release boundary

PR #22 remains open and unmerged. This work does not deploy the Worker or production frontend. Treat the new routes as branch code until review, merge and separate Worker deployment are confirmed. Do not call the roadmap complete until the remaining acceptance evidence and external prerequisites are closed.
