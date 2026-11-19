# Data Provider Register and Licensing Matrix

**Purpose:** Central source-of-truth checklist for candidate APIs, official data and market-data vendors. This is a shortlist and implementation policy, not evidence that any source is configured, licensed, fresh, free or available to every visitor.

**Last reviewed:** 19 November 2026. API behavior, access, plans, terms, prices and licensing change; verify official documentation and account entitlements at implementation and each release.

## 1. Terms and source classes

- **Public API** means an endpoint is documented or publicly accessible. It does not mean open-source, unlimited, real-time, free of charge, or licensed for redistribution.
- **Official public data** means the regulator/exchange publishes the data. Terms, reuse rights, publication cadence and revisions still apply.
- **Vendor market data** is governed by the vendor contract plus exchange rights, entitlement, subscriber classification, display/non-display use and reporting.
- **Hosted widget** is provider-controlled presentation; it is not a raw application-owned quote feed or guaranteed backtest dataset.
- **Discovery source** helps find coverage but is not a complete/licensed newswire.
- **Local authoring tool** runs in the connected Codex/plugin environment. It is not a deployed website data provider.
- **Not configured** is the default until a real deployed call path, secret, successful response, freshness proof and licence are verified.

Every registry record must capture source, product/series, endpoint/API version, instrument scope, authentication, event time, publication time, retrieval time, frequency/delay, revision/vintage behavior, cache/freshness rule, terms, attribution, permitted audience, configured state, last verified evidence and owner.

## 2. Official economic, government and positioning sources

| Source | Appropriate use | Access and implementation rules |
|---|---|---|
| [CFTC Public Reporting Environment — COT help](https://publicreporting.cftc.gov/stories/s/COT-Help/p2fg-u73y/) and [reporting FAQ](https://publicreporting.cftc.gov/stories/s/Public-Reporting-FAQ/inwp-fmhz/) | Weekly futures positioning (COT/TFF/Disaggregated as applicable). | Record report family, futures-only/combined, positions-as-of date and publication date. Weekly positioning is not intraday volume/OI. Preserve revisions and export/API provenance. |
| [BLS Public Data API FAQ](https://www.bls.gov/developers/api_faqs.htm) | CPI, PPI, employment, payrolls and unemployment releases. | Official FAQ distinguishes registered v2 and unregistered v1 limits, series/request limits, history windows and throttling; recheck the FAQ and key status rather than copying quota assumptions into UI. Store release and retrieval timestamps separately. |
| [BEA API documentation](https://apps.bea.gov/API/docs/) | GDP, PCE and national accounts. | Requires a registered/activated UserID. Preserve table, frequency, release/vintage and revisions. Do not describe macro series as live prices. |
| [EIA Open Data documentation](https://www.eia.gov/opendata/documentation.php) and [FAQ](https://www.eia.gov/opendata/faqs.php) | Petroleum, natural gas and energy statistics. | API key is available by registration; bulk downloads are another access path. EIA publication/update timing is dataset-specific and not a second-by-second inventory feed. Show actual data-as-of/release status; do not hard-code an unpublished universal throttle. |
| [FRED API key](https://fred.stlouisfed.org/docs/api/api_key.html), [errors/rate limits](https://fred.stlouisfed.org/docs/api/fred/errors.html), [terms](https://fred.stlouisfed.org/docs/api/terms_of_use.html) and [v2 release observations](https://fred.stlouisfed.org/docs/api/fred/v2/release_observations.html) | Historical macro series and release-aware observations. | Key required; error guide describes HTTP 429 handling (currently 120 requests/minute). Use ALFRED/vintage-aware data for as-known historical analysis. The observation date is not necessarily release/publication time; review reuse terms for each underlying series. |
| [US Treasury daily interest-rate XML](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed) | Daily published Treasury yield curves/rates. | Use as an official daily feed with date and series labels, not intraday market quotes. |
| [New York Fed Markets API](https://markets.newyorkfed.org/static/docs/markets-api.html) | SOFR/EFFR and other official reference/market operations data. | Preserve published timestamp, date, definitions and API terms. Reference rates are published values, not live futures quotes. |
| [ECB Data Portal](https://data.ecb.europa.eu/) / [Federal Reserve](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Official reference data and monetary-policy calendars. | Use official release/schedule links, revision history and correct timezone. A daily FX reference is not a live 6E quote. Calendar dates can change. |

Do not assume a government source's public API grants the right to bundle, resell or cache every underlying dataset indefinitely. Follow the specific source terms and attribution requirements.

## 3. News and education discovery

| Source | Product role | Guardrails |
|---|---|---|
| [GDELT data/API](https://www.gdeltproject.org/data.html) | Broad news discovery, event/entity search and link discovery. | Not a complete Reuters/Bloomberg-style licensed wire. Show publisher, article time and source link; deduplicate and preserve the original publisher's terms. |
| Publisher/exchange/regulator RSS or pages | Curated official announcements, notices and source links. | Follow each site's terms and robots/API guidance. Do not scrape behind login/paywall or imply exhaustive coverage. |
| X, Reddit, YouTube, Discord, Telegram | User-selected community/education discovery links. | Authorized API or curated outbound links only. No promise of full feed or endorsement. |
| [Official ICT website](https://theinnercircletrader.com/) and [ICT YouTube study channel](https://www.youtube.com/innercircletrader) | Original ICT teaching reference, attributed to Michael J. Huddleston by the official site. | Verify the exact video uploader/title and lesson relevance. A channel link is not a lesson-level tutorial mapping. |
| [TTrades Trading Education Center](https://ttrades.com/trading-education-center/) | Independent supplemental futures/ICT education. | Not official ICT and no implied affiliation. Verify each exact video and label it supplemental. Example specific video to recheck at use time: [Market Structure Shift - ICT Concepts](https://www.youtube.com/watch?v=_94CPMjWi9E). |
| [YouTube Data API overview](https://developers.google.com/youtube/data/getting-started?hl=en), [search.list](https://developers.google.com/youtube/v3/docs/search/list), [playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems), [API terms](https://developers.google.com/youtube/terms/api-services-terms-of-service) | Optional curated-channel video metadata/discovery. | A static reviewed video registry does not require dynamic search. If API search is added, monitor current quota/terms and use the official API; do not scrape YouTube. Never download/cache/re-host audio/video. Embed only with the compliant player, controls and direct-link fallback. |

The Academy acceptance gate lives in [Part 2](03-PART-2-COMPLETE-ICT-ACADEMY.md): each active concept ID and each Entry Model ID requires an exact, directly relevant, verified video; channel pages and search results do not count.

## 4. Exchange and vendor futures data

### 4.1 CME Group

CME reference/contract metadata, delayed/public website information, licensed real-time quotes/trades/depth and historical redistribution are distinct products. Do not treat a product page or a visible public webpage as a free API/feed.

The CME [market data API overview](https://www.cmegroup.com/market-data/market-data-api.html) and [real-time futures/options API](https://www.cmegroup.com/market-data/real-time-futures-and-options-data-api.html) describe API delivery subject to entitlement, connectivity, exchange licensing and fees. CME's [F&O Website Information API for website distributors](https://dataservices.cmegroup.com/pages/fo-api-websites) is a potential route that needs current confirmation, approval, commercial terms and technical onboarding; it is not configured by this roadmap.

The CME [June 2026 market-data agreement update (DS-45)](https://www.cmegroup.com/market-data/files/market-data-license-agreement-updates-june-2026.pdf) describes public website information packages effective **1 January 2027**. Depending on the specific package and agreement, permitted information/timing is restricted (including hourly last-trade snapshots and prior-trading-date settlement/volume/OI availability). Confirm the exact dataset, capture/display timing, audience, fees, caching and reporting rights with CME before publishing. The update also restricts AI/ML/LLM use under those terms unless the applicable written agreement expressly permits it. Do not send CME data to ChatGPT, Codex, another model, or a local analysis plugin based on an assumption of permission. See CME's [information policies](https://www.cmegroup.com/market-data/license-data/information-policies.html) and [market-data disclaimer](https://www.cmegroup.com/trading/market-data-explanation-disclaimer.html); do not scrape or text-mine CME pages absent written authorization.

### 4.2 ICE

ICE public website display requires current ICE approval and applicable license/redistribution arrangements. Verify exchange, product, audience, delayed/real-time class, use, reporting and attribution with ICE or an authorized distributor. Start with [ICE proprietary data](https://status.ice.com/fixed-income-data-services/data-and-analytics/proprietary-data) and the relevant [ICE Futures Europe market-data policy](https://www.ice.com/publicdocs/futures/ICE_Futures_Europe_Market_Data_Policy.pdf). Publicly visible ICE pages do not establish a site-wide redistribution right.

### 4.3 Vendor, widget and direct feed

- **Databento:** candidate vendor for supported historical/live schemas and venues. Recheck current datasets, entitlements, fees and external distribution terms from [pricing](https://databento.com/pricing/), [documentation](https://databento.com/docs/) and [live data docs](https://databento.com/docs/portal/live-data) at procurement. Do not carry old price numbers into this register or assume an individual plan permits public redistribution.
- **TradingView widgets:** optional hosted UI, not an application-owned OHLC API or guaranteed live quote. Check exact symbol/venue coverage, delay and current [widget documentation](https://www.tradingview.com/widget-docs/getting-started/) and [FAQ](https://www.tradingview.com/widget-docs/faq/general/).
- A vendor's historical data package does not automatically authorize public display, non-display model use, downloadable files, derived data or indefinite retention.

Before release, document exchange/vendor agreement, professional classification, data delay, display/non-display use, user/device counts, attribution, derived-data rules, cache/history retention, reporting and audit obligations, and termination behavior. If any item is unresolved, disable the feed or link to the licensed provider; never synthesize live tape.

## 5. Infrastructure and deployment

Infrastructure quotas, free tiers, allowed commercial use and prices change. No plan number in this roadmap is a permanent capacity or uptime promise. At release, review current official terms, actual account/team billing, enabled features, regional restrictions, backups, retention, service limits and alerting.

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [KV limits/pricing](https://developers.cloudflare.com/kv/platform/limits/), [Cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) and [secrets](https://developers.cloudflare.com/workers/configuration/secrets/): verify current account features and UTC schedule behavior. Provision credentials as secrets.
- [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [pricing](https://supabase.com/pricing) and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): verify actual compute, backup, egress, storage and project-pause limits. Use tenant-isolated normalized records; not an unlimited high-frequency tick store.
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [terms](https://vercel.com/legal/terms) and [fair use](https://vercel.com/docs/limits/fair-use-guidelines): verify whether the selected account/plan permits the intended public, commercial and team use before release; do not assume plan eligibility.
- Do not add a VPS for static hosting or simple caching without a demonstrated need. For persistent workers or longer backtests, compare current cost, security, uptime, backup and operations burden.

## 6. Credential and client-exposure map

Server-side only (when the corresponding provider is actually enabled):
- BLS_API_KEY, BEA_API_KEY, EIA_API_KEY, FRED_API_KEY
- INGEST_TOKEN
- SUPABASE_SECRET_KEY or the currently supported server-only key, if required
- Optional vendor credentials and private CMS key, only when the implementation needs them

Public browser configuration may contain only intentionally public values such as the Supabase URL/publishable anon key and public Worker base URL. Never ship secret keys, exchange credentials or vendor tokens in source, HTML, generated client bundles, URLs or logs. Store them in the platform's protected environment and rotate any exposed secret.

## 7. Provider acceptance record

For every deployed provider record:
- Provider/source ID, exact dataset/series/instruments and endpoint/API version.
- Auth type and secret owner; never the secret value.
- Access/price/quota information with official terms link and checked_at date (or NOT VERIFIED).
- Event/publication/retrieval timestamps, frequency, delay, history, timezone and revision policy.
- License class, user audience, display/non-display/redistribution, retention, attribution and AI/ML permissions.
- Configured state (NOT CONFIGURED, PARTIAL, HEALTHY, STALE, UNAVAILABLE) from observed calls; never inferred from code.
- Last successful request, data-as-of, freshness threshold and error evidence.
- Source owner, review date, next review date, CI/smoke-test reference.

Public API availability alone cannot set a provider to HEALTHY. Do not describe an API as "free" without spelling out free scope, key requirement, quota, license and billing exposure.

## 8. Codex plugin versus website integration

The connected Futures Market Data Hub, ICT Liquidity Lab, ICT Backtest Lab, Futures Risk Manager and Trading Journal tools are local authoring capabilities. They are not the site's Cloudflare Worker, Vercel API or Supabase service. Specifically:

- Market Data Hub: Binance USDⓈ-M perpetual candles are out of listed-futures scope; FRED is macro observations; Twelve Data coverage, delay and rights depend on the selected series/plan; local CSV inspection does not upload/sync the file.
- ICT Liquidity Lab: calendar-day levels and a prior-N-bar wick-through/close-back proxy, not session-aware full ICT detection.
- ICT Backtest Lab: narrow local CSV proxy, not the website Strategy Lab or a proven performance result.
- Futures Risk Manager: conditional on user-supplied tick values/costs; no contract lookup, margin or prop-firm rules.
- Trading Journal: local trade records and summaries; separate from hosted user data and not an automatic sync/backup.

A website integration requires an explicit server-side adapter, auth/consent, input/output schema, license review, data-state UI, privacy controls, tests and failure handling. Local-only responses must never be called website live data or used to claim site health.

## 9. Maintenance policy

Recheck provider-specific primary documentation before implementation and at release; record changed assumptions with dates. Prefer official exchange/regulator/developer documentation over blogs or search snippets. Keep dynamic price, quota and plan figures out of static user-facing docs unless there is a clear owner and an automated or scheduled review. Never claim a service is configured, licensed, real-time or production-healthy without direct evidence.
