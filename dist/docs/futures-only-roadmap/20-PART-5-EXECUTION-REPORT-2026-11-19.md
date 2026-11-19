# Part 5 — Futures News and Data Gateway Execution Report

**Review date:** 19 November 2026
**Branch:** `codex/charter-alignment-2026-11-19`
**Status:** Partial. Local news contracts, filters, provider health and licensed-market-data status are implemented. Production verification, source-rights review for underlying publishers, and verified provider persistence remain outstanding.

## Implemented

- Added a `/api/v1/news/sources` registry for the active GDELT DOC discovery feed. It reports source class, cadence, parser version, attribution, last check, publisher-rights caveat and known coverage limits.
- Added validated `/api/v1/news` filters for the 15 configured futures families, event-topic categories, exact publisher hostnames, ISO `since`/`until` bounds, a limit capped at 100 and provider-seen-time sorting. Unknown filters, duplicate inputs, unsupported instruments/topics/sorts and malformed time ranges return a stable JSON error.
- Normalized GDELT rows with publisher host, canonical URL, provider-seen time, retrieval time, explicit `published_at` / `event_at` nulls, topic and instrument tags, heuristic relevance score/method, unverified status and duplicate cluster ID. Publisher time and GDELT index time are never conflated.
- Expanded contract tagging to include all configured families, including Australian dollar, Canadian dollar and CME Bitcoin futures.
- Added response metadata for data class, collection frequency, delay class, source, retrieval time, cache age, status, attribution/display class and limitations. The user interface shows source freshness, contract/topic/publisher/time filters and separate publisher, GDELT-seen and fetched times. GDELT citation/link attribution is visible on the page.
- Added `/api/v1/market-data/status` and a Data Health card. It returns `not-configured`; no price, quote, order-book or bars route is enabled without a licensed upstream and public-display entitlement.
- Added bounded transient retry behavior, exponential backoff with jitter, capped `Retry-After` handling and a per-economic-provider KV circuit breaker. Authentication errors and invalid JSON are not retried. Unit coverage includes 429, 5xx, network failure, malformed JSON, and circuit open/reset cases.
- Kept the provider boundary explicit: GDELT is a discovery index, not a full newswire; CFTC is weekly positioning, not intraday volume; economic series remain historical observations; exchange market data remain disabled.

## Remaining acceptance gaps

- New Worker routes are only verified against local Worker code and mocked KV. They have not been deployed or called in the configured production Worker environment.
- No current provider secret configuration or production response was rechecked in this Part. Supabase persistence is still not proven with a real ingestion run and resulting rows.
- Publisher-specific reuse rights for indexed article headlines are separate from GDELT's attribution terms and have not been individually reviewed. Current public items remain title/link metadata only and are labelled unverified.
- Retry/circuit hardening is implemented for the shared economic-provider JSON adapter path; it does not retrofit every legacy BLS, CFTC, GDELT and NY Fed request path.
- No licensed CME/ICE vendor, entitlement, redistribution permission or market-data route is configured. Current exchange market-data UI stays `NOT CONFIGURED`.
- GDELT is the only active news collector in the Worker source registry. RSS/agency-specific ingestion, stronger canonical/syndication clustering and a verified source/publisher archive remain unimplemented.

## Changed source paths

- `cloudflare/src/index.js`
- `cloudflare/src/news-contracts.mjs`
- `cloudflare/src/provider-http.mjs`
- `cloudflare/src/economic-providers.js`
- `assets/news-page.js`
- `assets/data-health.js`
- `scripts/build_site.py`
- `scripts/validate.py`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION.md`
- `tests/test_news_contracts.mjs`
- `tests/test_provider_http.mjs`
- `tests/test_worker_news_routes.mjs`
- `tests/test_build.py`

Generated `dist/` assets came from the site builder and were not edited by hand.

## Verification

| Check | Result |
|---|---|
| `python scripts/build_site.py` | Passed; 44 resources, 15 futures families, 82 Academy lessons. |
| `python -m unittest discover -s tests` | Passed: 49 tests, including news contract, mocked Worker route, retry and circuit-breaker cases. |
| `python scripts/validate.py` | Passed: 139/139 checks. |
| `python scripts/audit_internal_links.py` | Passed on the current built output: 130 HTML files, 1,358 internal links, zero issues. |
| `git diff --check` | Passed; Git emitted line-ending normalization notices only. |

These checks establish local implementation consistency. They do not establish deployed route behavior, current provider freshness, publisher-specific rights, live Supabase writes or market-data licensing.
