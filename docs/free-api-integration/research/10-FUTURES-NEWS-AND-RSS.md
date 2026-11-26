# 10 · Futures news and RSS

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Combine official announcement links with GDELT discovery. Allowlist Fed, ECB and verified agency feeds by exact host/path and approved fields. Normalize canonical URL, publisher, title and publication timestamp, store GDELT seen time separately, cap result size, dedup same article without collapsing multiple publishers. Preserve filters.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`assets/news-page.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/news-page.js)
- [`cloudflare/src/news-contracts.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/news-contracts.mjs)
- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)

The gap to close is defined by this acceptance condition: Test RSS malformed XML, oversized payload, duplicate redirects, GDELT outage, no publisher time and HTML escaping.

## Website behavior and placement

**Routes** — /news/; /futures-intelligence/#daily-brief

```text
1. Market/topic/publisher
2. Official releases and Discovery
3. original articles
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `gdelt` · GDELT | DOC 2.0 ArticleList headline discovery | [Official documentation](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) · [Endpoint or reference](https://api.gdeltproject.org/api/v2/doc/doc) | Anonymous GET | Conditional metadata-only discovery; publisher links; article text/images/export rights require separate approval | query, mode=artlist, format=json, maxrecords, timespan; articles[].title/url/domain/seendate. Seen time is crawl time. 429/backoff; no SLA assumed. |
| `sec` · SEC EDGAR | Filings/submissions context, issuer watchlist CIK only | [Official documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) · [Endpoint or reference](https://data.sec.gov/submissions/CIK0000320193.json) | Anonymous GET with compliant contact User-Agent | Reference-first; optional metadata only after fair-access, filing rights and use review | filings.recent.form/accessionNumber/filingDate; SEC fair access cap 10 requests/sec overall, use far less; filings have issuer-specific timing. |
| `cboe` · Cboe | VIX historical context | [Official documentation](https://www.cboe.com/tradable_products/vix/vix_historical_data/) · [Endpoint or reference](https://www.cboe.com/tradable_products/vix/vix_historical_data/) | Reference link | Reference-only; raw CSV storage, display/export require rights review | Label as index context. Never substitute for active futures market data. |
| `fed-board` · Federal Reserve Board | FOMC meeting calendar, policy statements, official RSS, H.4.1 | [Official documentation](https://www.federalreserve.gov/feeds/feeds.htm) · [Endpoint or reference](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Anonymous publisher schedule; approved RSS/Atom metadata | Baseline schedule/reference candidate; RSS extract limited to approved fields | Meeting ranges date-only unless official time supplied; RSS dedup by canonical URL/GUID; original releases remain authoritative. |
| `boe` · Bank of England | MPC schedule and decisions | [Official documentation](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) · [Endpoint or reference](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) | Anonymous supported schedule | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Europe/London; refresh daily when approved. |
| `boc` · Bank of Canada | Policy interest rate schedule | [Official documentation](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) · [Endpoint or reference](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) | Anonymous source | Conditional on reuse terms; reference fallback | Validate schedule year and source time America/Toronto; refresh daily. |
| `rba` · Reserve Bank of Australia | Board meeting calendar | [Official documentation](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) · [Endpoint or reference](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) | Anonymous source | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Australia/Sydney; refresh daily. |

**Site API** — GET /news and /news/sources; add official release source selection only if needed. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use KV approved headline metadata by default. Reuse news_items only once storage is permitted.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Sources to add

| Source | Connection | Placement and fallback |
|---|---|---|
| [Federal Reserve RSS directory](https://www.federalreserve.gov/feeds/feeds.htm) | Allowlist exact chosen monetary-policy feed after fixture/terms check | Official releases, original statement as fallback. |
| [ECB RSS](https://www.ecb.europa.eu/rss/html/index.en.html) | Selected English policy/press feeds | Official releases with publisher timestamps. |
| [BLS feeds](https://www.bls.gov/feed/) | Select indicator release feed through official directory | US inflation/jobs links. |
| [BEA news](https://www.bea.gov/news), [CFTC press room](https://www.cftc.gov/PressRoom/index.htm), [EIA](https://www.eia.gov/), [OPEC](https://www.opec.org/) | Reference first; verify stable RSS and terms before polling. | Reports and filtered issuer cards. |
| [GDELT DOC](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) | Existing Worker discovery | Preserve seen timestamp and label news discovery. |

Raw content, paywalled articles, publisher thumbnails and republication are outside this scope. Dedup normalized original URL and known tracking parameters while preserving genuinely distinct publisher articles. Use text-only rendering and sanitize external URLs. Never show source ingestion time as article publication.

## Implementation record

- News separates official releases from GDELT discovery. The Desk links to both. The official endpoint exposes a bounded Federal Reserve monetary-policy RSS snapshot, title, canonical publisher link and nullable publication time. Scheduled refresh is independent of GDELT. The adapter uses the official fixed feed URL, rejects redirects and unsupported declarations, and does not fetch article bodies.
- Board-origin release metadata is attributed under the [Federal Reserve disclaimer](https://www.federalreserve.gov/disclaimer.htm). ECB, BLS, BEA, CFTC, EIA and OPEC are linked while their feed-specific scope is reviewed. Cache refresh targets four hours and last-good display expires at 24 hours.
- Existing discovery filters stay in place. GDELT deduplication ignores known tracking parameters and preserves publisher hostname and case-sensitive article paths. Discovery timestamps remain distinct from publication times. Supabase discovery writes require explicit `NEWS_DISCOVERY_PERSISTENCE_APPROVED=true` after rights review. No export is introduced.

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md)

**Existing files** — assets/news-page.js, cloudflare/src/news-contracts.mjs, cloudflare/src/index.js.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Allowlist Fed, ECB and verified agency feeds by exact host/path and approved fields. Normalize canonical URL, publisher, title and publication timestamp, store GDELT seen time separately, cap result size, dedup same article without collapsing multiple publishers. Preserve filters.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test RSS malformed XML, oversized payload, duplicate redirects, GDELT outage, no publisher time and HTML escaping.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 10 (Futures news and RSS) on the existing repository stack and reuse the named source owners. Prioritize combine official announcement links with GDELT discovery. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
