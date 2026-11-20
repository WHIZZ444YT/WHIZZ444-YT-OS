# Finance Intelligence OS

A futures-only research and education workspace for exchange-listed futures and ICT Futures. It includes a 15-family futures catalogue, the 82-lesson ICT Futures Academy (preserving all 76 original concept IDs), nine guided tutorials and ten prerequisite-based learning tracks, futures news and official macro adapters, CFTC positioning, deterministic backtesting, risk tools and a Supabase-backed private workspace.

**Tracked app version:** `v1.1.0` · **Production source branch:** `main` · **Release record date:** 10 November 2026. See the current platform check below for observed deployment status; the tagged GitHub release remains a separate release-management step.

## Product scope and preserved baselines

- The active homepage and primary navigation are Futures Intelligence OS, focused on listed futures markets and ICT Futures education.
- The active futures universe is `ict-futures/data/market-universe.json` with 15 families, including listed currency futures and CME Bitcoin/MBT futures.
- ICT Futures retains all 76 original concept IDs and nine tutorial routes, with six added futures-foundation lessons (82 lessons total) and ten structured learning tracks.
- The active `resources.json` is a reviewed futures-only allowlist. The former 585-entry general catalogue, 73-record generic instrument universe, previous homepage and unfiltered source lists are preserved unchanged under `legacy/global-research/`.
- Supabase schema, Auth, RLS and existing private user data are not altered by the scope cleanup. Existing local-first import paths remain available.

## Active routes

- `/` — Futures Command Center homepage.
- `/futures-intelligence/` — Futures Desk with contract context, news, macro observations and CFTC positioning.
- `/markets/` — exactly 15 futures family profiles; no generic cross-asset catalogue.
- `/ict-futures/` — ICT Futures terminal, sessions, calendar, charts, risk and journal tools; reused by the `/sessions/` compatibility entry.
- `/ict-futures/markets/{id}.html` — 15 individual family pages.
- `/academy/` and `/ict-futures/academy/{concept-id}.html` — searchable 82-lesson Academy; all 76 original concept IDs/routes are retained, plus six futures-foundation lessons. `/academy/search-index.json` exposes the filterable lesson metadata.
- `/ict-futures/academy/tutorials/` — nine guided tutorials.
- `/entry-models/` — eight educational model concepts, without unsupported performance rankings.
- `/news/` — futures-focused GDELT discovery snapshots.
- `/macro/` — BLS, BEA, EIA, FRED, Treasury and ECB observations with provider-specific freshness and credentials.
- `/research/positioning/` — CFTC Legacy, TFF and Disaggregated weekly positioning, with futures-only and futures-and-options-combined variants kept separate.
- `/volume-open-interest/` — CFTC weekly open interest plus a rights-gated display path for approved listed-contract observations; exchange data remains unavailable until an authorized provider, entitlement and ingestion feed are configured.
- `/strategy-lab/` — deterministic signal-driven futures backtesting.
- `/risk/` — futures risk calculator with conditional sizing, all-in cost inputs and versioned prop-firm verification registry. Imported tick values remain unverified and no firm program is numerically verified.
- `/tools/` — compatibility redirect to `/risk/`.
- `/account/` — authenticated private journal/watchlists/notes/alerts/progress.
- `/contract-specs/` — 15-family reference view; imported tick references are marked unverified, and expiry/first-notice fields are not supplied.
- `/sessions/` — compatibility route to the existing timezone-aware session/calendar tools in `/ict-futures/#sessions`.
- `/sources/` — compatibility entry to the reviewed futures exchange, regulator, macro, news and ICT education source directory.
- `/data-health/`, `/status/`, `/docs/` — provider health, system status and operator documentation.

## Retired public routes

- `/research/` redirects to `/sources/`.
- `/prediction-markets/` redirects to the Futures Command Center.
- `/legacy/` redirects to documentation; archived source files remain repository-only and are not copied to `dist/`.
- Polymarket/Kalshi Worker endpoints remain dormant compatibility code for this Part. No active frontend, navigation, search or Data Health check calls them.

## Product navigation

The primary app shell has 13 futures-only areas: Overview, Futures Markets, ICT Academy, Entry Models, Sessions & Calendar, Futures News, Volume & Open Interest, COT & Positioning, Contract Specs & Expiry, Strategy Lab, Risk & Prop Firms, Journal & Watchlists, and Data Health & Sources. Desktop uses a collapsible sidebar and compact top bar; mobile uses a drawer. Dark is the default theme and the light theme preference is stored locally in the browser. Legacy routes remain available as supporting entries or redirects.

## Part 1 — Futures Command Center UI and information architecture

- Shared static shell: 13-area grouped sidebar, compact top bar, desktop collapse, mobile drawer, keyboard Escape close and visible focus.
- Dark-first visual tokens, reusable data-state chips, empty/loading/error treatment, responsive tables and reduced-motion support. Light/dark theme preference is local to the browser; no database setting is required.
- The overview isolates each widget: contract metadata, gateway and provider status, futures news, weekly COT, ET plus selectable browser/profile timezone clock, quick study links and authenticated private summary.
- Prices and order-book depth are explicitly not connected. The economic release calendar is not consolidated/connected. Session high/low is not displayed without an underlying intraday feed.
- /sessions/ reuses the existing ICT terminal section rather than maintaining a second session clock/calendar.
- /contract-specs/ displays 15 imported family references with UNVERIFIED IMPORTED REFERENCE labels. Expiry/first-notice/roll dates are NOT SUPPLIED by the current registry.
- /risk/ uses a tick-safe fixed-point calculator with standard/micro profiles, round-turn fees, spread/slippage estimates, user-entered remaining daily/max loss caps and a maximum-contract cap. The contract registry remains unverified, so results are prominently conditional. No margin, currency conversion, correlated exposure or automatic account-rule interpretation is claimed. /tools/ redirects to /risk/.
- The Futures Desk and ICT terminal retain their existing page-specific tools inside the shared shell. No React/framework migration was introduced.

## v1.1.0 — Premium interface and release engineering

- A coordinated visual refresh improves the homepage and generated module pages with clearer typography, spacing, responsive layouts, focus states, restrained motion and more consistent components.
- The PWA manifest, package metadata, homepage release label and Service Worker cache namespace are aligned to version 1.1.0.
- A tag-triggered release workflow verifies that a `vX.Y.Z` tag matches `package.json`, runs the build and quality gates, then publishes GitHub release notes.
- Vercel production deployments are publicly accessible while Preview deployments retain SSO protection.
- See [release notes](docs/RELEASE-NOTES-v1.1.0.md) and the [release checklist](docs/RELEASE-CHECKLIST.md).

## Part 2 — ICT Futures Academy

- The canonical source remains `ict-futures/data/ict-academy.json`; existing 76 lesson IDs/routes are preserved and six futures-foundation lessons extend the library to 82.
- Ten prerequisite-based tracks cover listed-futures mechanics, market structure, liquidity, imbalances, PD Arrays, time/narrative, entry models, cross-market SMT, contract roll/risk, and replay/journaling/evaluation.
- The nine existing tutorials remain reachable and are assigned to the replay/journaling track. Search facets include aliases, instrument family, timeframe, session, bias direction and evidence label.
- Lesson pages separate source evidence from performance evidence, use clearly marked hypothetical examples, and avoid fake historical candles or unverified live specifications. `TESTED` is reserved for a reproducible test artifact.
- Lesson progress uses the existing `lesson_progress` table and local storage keys. On content-version updates, previous completion and exercise records are kept in `legacyCompletion`; learners must complete the current version without erasing the prior record.
- The PDF is a secondary synthesis and discloses gaps in its original source review. Current expiry, tick, margin, session and feed values must be rechecked against primary sources.

## Build and local preview

```bash
python3 scripts/build_site.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Without `SITE_URL`, the static build is intentionally `noindex` and `robots.txt` disallows crawling. Set `SITE_URL` to the final HTTPS production origin before building an indexable deployment.

Quality gates:

```bash
python3 -m unittest discover -s tests -v
python3 scripts/validate.py
python3 scripts/audit_internal_links.py
```

## Current source and live provider snapshot — checked 19 November 2026

The active source repository is [`WHIZZ444YT/WHIZZ444-YT-OS`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS). At the start of the 19 November audit, `main` was at `ca8c86d`; its latest GitHub Actions quality run succeeded. Local Windows verification after the UTF-8 portability repair is recorded in [`docs/futures-only-roadmap/15-PART-0-EXECUTION-REPORT-2026-11-19.md`](docs/futures-only-roadmap/15-PART-0-EXECUTION-REPORT-2026-11-19.md).

Read-only production checks on 19 November returned HTTP 200 for the Vercel homepage, Futures Markets, Academy, Strategy Lab and retired prediction-market redirect. The current Vercel project reports its latest production deployment as `READY`; the deployment-to-source commit linkage was not established in this check.

The pre-branch provider snapshot is historical: GDELT timed out, BLS was rate-limited, CFTC reported data as of 10 November, Treasury and ECB had older snapshots, and BEA/EIA/FRED/Supabase/Builder credentials were not configured. Later that day, both additive Supabase migrations were applied and verified, and Cloudflare Worker 2.0.0 was deployed. Its health route confirms KV is configured while database writes, CMS and the ingestion token remain unconfigured. The first live COT request exceeded the Worker CPU limit; a bounded query fix was deployed at 13:26:40 UTC and was verified through the live site's no-search snapshot, which displayed a fresh CFTC TFF futures-only response (position date 10 November 2026, 780 normalized category rows from the bounded source set). The Worker has a 30-minute Cron and query-string redaction is enabled. The frontend and documentation changes are in [PR #19](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/19); its Vercel Preview is ready, while the production frontend still needs review, merge and a successful Vercel deployment. See the [current implementation and site audit](docs/futures-only-roadmap/26-PRODUCTION-IMPLEMENTATION-AND-SITE-AUDIT-2026-11-19.md). This timestamped snapshot is evidence at the check time, not a promise of ongoing availability or licensed market data.

### Latest implementation checkpoint — 20 November 2026

PR #24 is merged and its Sessions fix is in production. PR #25 is open; its branch now contains 51/82 lesson video mappings and 4/8 Entry Model mappings, leaving 31 lessons and four models without verified exact-item links. The MMSM example is about XAUUSD, not an exchange-listed futures contract. Full interactive accessibility review remains open. Cloudflare Worker 2.2.0 is deployed; its last recorded live smoke found six fresh calendar sources and three unavailable sources (BLS, BOE and RBA), while licensed exchange market data is not configured. See the [current implementation status and remaining acceptance work](docs/futures-only-roadmap/27-IMPLEMENTATION-STATUS-AND-REMAINING-WORK-2026-11-20.md). This is a partial milestone, not completion of the Futures-Only roadmap.

PR #24's latest Worker change adds sanitized, low-detail failure codes for calendar refreshes, but the deployed 2.2.0 Worker does not contain it. Cloudflare Observability recorded BEA and ECB route responses at HTTP 200 and BOE at HTTP 502 on 20 November 2026 at 14:23 UTC; the current Worker discarded the upstream cause. See the [diagnostic report](docs/futures-only-roadmap/36-PART-4-WORKER-SCHEDULE-DIAGNOSTICS-2026-11-20.md).

### Earlier infrastructure snapshot (10 November 2026; historical)

The following table records the earlier Finance Intelligence OS infrastructure review. It predates the current repository snapshot and must not be used as current Git, deployment, database or credential evidence.

| Platform | Verified state | Remaining setup |
|---|---|---|
| GitHub | Historical source was `whizz444yt-ux/Finance-Intelligence-OS` on `main`. | Use the current `WHIZZ444YT/WHIZZ444-YT-OS` repository documented above. |
| Vercel | `finance-intelligence-os` project; latest verified production deployment was `READY`; Preview SSO protection was enabled. | Recheck project-to-repository linkage and current domains before a release. |
| Supabase | Earlier review found 22 public tables with RLS enabled in the prior project. | Current Worker reports its database integration as not configured; independently verify the intended Supabase project and its RLS state before enabling writes. |
| Cloudflare | Earlier review found `finance-intelligence-os-edge` deployed with KV and a 30-minute Cron. | Use the live health/provider snapshot above; the current Worker reports database and ingestion-token configuration absent. |
| Builder.io | Allow-listed content proxy code remains available. | A Builder Space public API key and read-only Admin PAT have not been configured. |

### Deployed Cloudflare API

`https://finance-intelligence-os-edge.finance-intelligence-os.workers.dev`

The previously deployed routes include `/health`, `/api/v1/providers`, `/api/v1/news`, `/api/v1/macro`, `/api/v1/cot`, `/api/v1/macro/funding` (New York Fed SOFR/EFFR/overnight rates), and `/api/v1/cms/{model}`. Local feature-branch source extends COT to `report=legacy|tff|disaggregated` and `variant=futures-only|combined`, and extends Volume & Open Interest with CFTC weekly OI selection; these changes are not production-deployed. Legacy `/api/v1/prediction/polymarket` and `/api/v1/prediction/kalshi` handlers remain dormant for compatibility only; they are not linked to or consumed by the active product. News refresh remains scheduled every 30 minutes; BLS, CFTC and NY Fed snapshots are fetched on demand and cached. A 30-minute Cron checks configured economic providers against their freshness intervals. This is not an exchange real-time price or order-book feed.

## Historical ingestion and Supabase persistence

- Economic provider observations are normalized into `economic_observations` with provider, dataset, series, frequency, observation date, unit, source URL, retrieved time, data-as-of time and raw provider attributes. Unique keys make historical upserts idempotent.
- `ingestion_runs` stores request count, rows received/upserted, timing, skipped/missing-credential events and failure details. It is private: RLS is enabled with an explicit deny policy for anon/authenticated roles and only the server-side service role may write/read run diagnostics.
- `GET /api/v1/economic/history` provides bounded historical reads from the persisted observation table, with optional series/date filters; the ingestion-run ledger remains private.
- `economic_observations` is browser-readable under a SELECT-only RLS policy. Browser roles cannot insert, update or delete; all ingestion writes run through the Worker.
- `POST /api/v1/ingest` accepts a provider or `all` and requires `Authorization: Bearer <INGEST_TOKEN>`. Never use a query-string token.
- `POST /api/v1/ingest/futures-market-data` accepts up to 500 normalized listed-contract bar, daily-volume or published-OI observations. It uses the same bearer secret, writes a private ingestion-run record and cannot create or change display-rights approval.
- `GET /api/v1/futures-observations?root=NQ&contractMonth=202612&type=daily_volume` returns only observations covered by an active, unexpired provider/venue/market/delay entitlement with a rights reference. The additive schema migration must be applied before these routes can persist or read rows; no exchange provider or license is configured by this code change.
- BLS runs on API v1 without a key (25 queries/day); set the optional `BLS_API_KEY` Worker secret to use registered API v2 (500 queries/day). Its daily rate-limit response is cached until UTC midnight, and the Macro page's refresh button can retry after the key is configured.
- BEA, EIA and FRED require `BEA_API_KEY`, `EIA_API_KEY` and `FRED_API_KEY` Worker secrets respectively. Treasury Fiscal Data and ECB SDMX use public endpoints. Supabase writes additionally require `SUPABASE_URL` and the preferred `SUPABASE_SECRET_KEY` Worker secret (`sb_secret_...`); legacy `SUPABASE_SERVICE_ROLE_KEY` JWTs remain supported for backward compatibility.
- When a credential is absent or persistence is unavailable, provider and persistence statuses remain separate. Missing observations are never written as zero, and provider API keys are stripped from stored source URLs.

## Data and safety boundaries

- Supabase browser configuration uses only the public publishable key; no service-role key is in this repository.
- RLS is enabled on project public tables; user-owned rows are scoped to `auth.uid()`. Historical economic and COT observations are read-only to browser roles; the ingestion-run ledger is private and server-role only. The new futures-observation table is read-only to browsers and a restricted RLS predicate checks the separate entitlement register without exposing it.
- Fifteen imported contract specification rows are explicitly `unverified`; they must be reconciled with exchange documents before being treated as current.
- CFTC COT is a weekly trader-category report. Local branch code distinguishes Legacy, TFF and Disaggregated families and futures-only versus futures-and-options-combined variants; position date, retrieval time and unknown per-row publication timestamp remain separate. The Volume & OI module uses CFTC weekly open interest only and does not label it as daily exchange volume. CFTC COT is not contract-expiry-specific open interest.
- Builder CMS content is editorial content, not a source for market prices or issuer release facts.
- Real-time CME/ICE quotes, DOM/depth, licensed intraday history and redistribution rights are outside the free integration baseline.
- The new Futures Desk is a research interface; it deliberately does not label delayed/snapshot public data as live exchange quotes.

See `docs/BUILD-REPORT.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md`, `docs/ENVIRONMENT.md` and `SECURITY.md`.

## P3 — ICT Academy learning program

- The Academy retains all 76 original concept IDs and seven original learning tracks. Every lesson now includes learning objectives, prerequisites, a guided walkthrough, hypothetical worked example, chart-replay assignment, completion checklist, review criteria and a three-option knowledge check.
- Nine guided tutorials cover market structure, liquidity mapping, sweep-versus-acceptance, FVG/imbalance measurement, dealing ranges/PD arrays, timezone/session planning, cross-market SMT, entry-model replay and supplemental-source audits.
- Standalone lessons are generated at the existing `/ict-futures/academy/{concept-id}.html` routes. Tutorial workbooks live at `/ict-futures/academy/tutorials/`.
- Progress saves locally and syncs to the signed-in user's Supabase `lesson_progress` row using the authenticated session and its user-owned RLS policy. Migration `20261108144106_add_lesson_progress_data` adds `progress_data` JSONB for exercise checklist state and `lesson_version` for curriculum versioning. No privileged client key is used in the browser.
- Direct original ICT video links are used only where the catalogue already marks the exact upload as verified. Other YouTube links remain labelled topic-discovery links; supplemental/community terminology remains source-cautioned.
- CME and CFTC material is linked for general futures mechanics and risk education, not represented as ICT certification or evidence of strategy performance.


## Strategy Lab — Part 4 baseline extended in Part 7

- The /strategy-lab/ route contains a deterministic futures backtester for user-supplied LONG, SHORT or FLAT signals. Signals are assumed known at source-bar close and enter at next-bar open. ICT labels are research tags only; no named model detector is implemented. The ten candidate rule cards state what remains to define before any detector can be built: [Part 7 model rule cards](docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md).
- Required CSV columns: timestamp, open, high, low, close, signal, exact contract code and source-supplied expiry date. Timestamps require an explicit UTC offset or Z; rows must be strictly increasing; one exact contract/expiry is accepted per run. Unknown columns are refused to reduce accidental use of future-derived fields. Optional stop_ticks and volume are validated; supplied volume requires units.
- Run configuration records the data source/provider, dataset ID and download date, plus the source/date for commission and slippage assumptions. OHLC prices must align to the user-supplied exact-contract tick size; misaligned data is refused. The manifest contains the exact expiry, provenance, gap summary, engine version, full parameters and input hash.
- Entry is next-bar open after a source-bar-close signal. One position at a time; fixed stop and reward/risk target; whole-contract risk sizing; max position cap; commission/slippage; stop-gap adverse fills; conservative stop-first same-bar ambiguity; limit targets without queue/partial-fill improvement; time and end-of-data exits.
- Results report gross/net P&L, net expectancy, average net R, net profit factor, win rate with 95% Wilson interval, average win/loss, trade frequency per 1,000 bars, longest win/loss streak, commissions, estimated slippage, bar-close drawdown and full trade ledger. Timestamp gaps over 1.5× the declared interval are listed for review; valid session closures are not distinguished without a verified product calendar.
- Chronological in-sample / validation / out-of-sample splits are computed independently, with capital reset per split. Keep the OOS segment untouched until the signal rule and parameters are frozen. Run fingerprints use the dataset SHA-256, engine version, full configuration and split policy.
- Download a JSON manifest and CSV trade ledger. The raw uploaded CSV stays in the browser. Local history stores summary/fingerprint; signed-in users can sync manifests/metrics and trade rows to private RLS-protected Supabase tables.
- Migration 20261108151112_add_strategy_backtest_runs_and_trades creates strategy_backtests and strategy_backtest_trades; both use user ownership policies and no browser service-role credential.
- Only one exact listed expiry is supported. Roll-adjusted continuous data, automatic session/news exclusion, exchange expiry rules, margin, separate spread, queue/partial fills, market impact and broker execution are not modeled. Tick size/value, cost inputs, source, and licensing must be verified for the dataset.

## P5 — Cloud personal workspace

- The /account/ page is now a private cloud workspace with trade journal CRUD, multiple named watchlists, research-note CRUD, alert rules and event history, account preferences, analytics, JSON backup export and cross-device refresh/sync.
- Auth sessions are persisted in browser local storage using the shared finance-os-supabase-session-v1 key and mirrored to session storage for the existing Academy and Strategy Lab clients. Expiring Supabase tokens are refreshed with the rotating refresh token; failed 401 requests get one refresh/retry.
- Cloud journal CRUD uses journal_trades. Analytics use user-entered net P&L and R-multiples; no broker statement or contract conversion is inferred. Net P&L is derived from gross P&L only when fees are also entered; blank fees remain unknown.
- Watchlists use watchlists and watchlist_items. Profiles store display name/timezone; user_preferences store theme/preferences. New research_notes store scenario/evidence/invalidation notes. alert_rules stores threshold rules; alert_events stores user-triggered event history.
- The explicit import action reads the older Global Research watchlist and scenario-note keys plus the ICT Futures browser trade journal. Research-note, watchlist-item and legacy-trade imports use stable identifiers/upsert constraints for retry safety. Local originals are not deleted.
- Migration 20261108161355_add_cloud_workspace_notes_and_alert_events adds owner-protected research_notes and alert_events. Migration 20261108162550_add_idempotent_legacy_trade_import adds journal_trades.legacy_id and a per-user unique constraint for retry-safe legacy trade import. All checked-in migration filenames now match the active project's remote migration history.
- Alerts sync rules and event history across devices. In this release, price rules are evaluated against a user-entered observed value; an optional browser notification can show while the site is open. Automated quote polling, unattended email/SMS and scheduled delivery are not connected because no verified licensed futures quote feed and background delivery service is configured.
- Analytics include closed-trade count, net realised P&L, win rate, net profit factor, average recorded R, a daily realised P&L chart and counts for watchlists, notes and alerts. These are manual-journal metrics, not broker-linked portfolio analytics.
- Cloud tables use owner-scoped RLS. Browser requests use the authenticated JWT and publishable key only; no service-role secret is sent to the page.
- Migration `20261108163000_add_workspace_composite_fk_indexes` adds covering indexes for alert-event and backtest-trade composite foreign keys.

## P9 — Private workspace hardening

- Trade and research forms now store exact exchange contract/expiry and the requested futures context, risk and review fields. Watchlists visibly distinguish user-entered expiry dates from missing or expired dates.
- The journal accepts private PNG/JPEG/WebP chart files in the owner-UUID folder of the existing private Storage bucket. Its RLS path rules were inspected live; the bucket currently has no stored objects.
- JSON backup v2 paginates every private table, includes lesson progress, reminders, backtest rows, local legacy data and base64 attachment files. It reports the 50 MB attachment-export limit and that concurrent updates can make a multi-table export non-transactional.
- Lesson progress keeps offline changes pending and retries when the device reconnects or the page regains focus; the shared session refresh flow also runs on the Academy.
- Alerts explicitly store user-entered source, manual-only cadence, exact contract/expiry, timezone, optional active window and optional expiry. A pending event ID makes threshold event retries idempotent; no background market feed or delivery service is claimed.
- A server-side account deletion function validates the signed-in user, checks the configured app origin, removes their private attachment files, and then deletes the Auth user (which cascades owned rows). The account page requires password reauthentication and a typed confirmation. The function source is in the repository but is not deployed to Supabase; the production UI remains disabled through `accountDeletionEnabled: false` until disposable-user verification passes.
- The 19 November read-only inspection found RLS enabled on private workspace tables with owner-scoped policies and no Supabase security-advisor lints. The two additive schema migrations were applied and verified later that day. Neither policy inspection nor advisor output substitutes for two-user isolation, Auth, attachment or deletion workflow tests; dedicated disposable accounts are still unavailable.
- See the [current production implementation and site audit](docs/futures-only-roadmap/26-PRODUCTION-IMPLEMENTATION-AND-SITE-AUDIT-2026-11-19.md). The older [Part 9 execution report](docs/futures-only-roadmap/25-PART-9-EXECUTION-REPORT-2026-11-19.md) is a historical checkpoint.

## P6 — COT and weekly open-interest research

- CFTC report selection now separates Legacy, TFF and Disaggregated families and the Futures Only / Futures and Options Combined variants using official PRE datasets.
- Position date, provider retrieval time and publication time are separate. CFTC PRE does not expose a per-row publication timestamp, so `published_at` remains null; the CFTC release schedule is linked instead of guessed.
- CFTC market-name searches expose the source-native contract-market code and exchange/market label. Users can request an exact code; the UI does not claim that a fuzzy root-symbol match is a reviewed expiry-level crosswalk.
- COT normalization uses report-specific column mappings; the public API returns compact normalized rows while the cached server-side source snapshot and optional database persistence retain the source fields. Net, weekly change and percent-of-open-interest calculations retain nulls; no missing field becomes zero. The COT page includes weekly category history, table and filtered CSV export.
- The `/volume-open-interest/` page is limited to weekly CFTC open interest. Daily/intraday exchange volume, intraday OI and expiry-level exchange OI remain unavailable until an authorized provider is configured.
- New repository groundwork adds canonical observation and entitlement tables, bearer-protected batch ingestion, a private ingestion-run audit and a public read route gated by active, reviewed provider rights. The volume page now has an accessible table for approved daily volume/OI; it remains empty until the migration, an entitled provider/feed and rights review are in place. No live or delayed CME/ICE dataset is connected by this change.
- Migration `20261120110000_add_futures_market_observations` is new and has not been applied to Supabase. Its RLS policy checks the separate entitlement registry; browser roles cannot read the registry or write either table, and ingestion cannot alter approval state.
- Additive migration `20261119125044_add_cot_report_observations` defines an indexed, idempotent, RLS read-only-to-browser table. It was applied and verified in the active production database on 19 November 2026. The Worker can persist COT rows only when server-side Supabase credentials are configured; the runtime currently reports database writes as not configured.
- See [`docs/futures-only-roadmap/21-PART-6-EXECUTION-REPORT-2026-11-19.md`](docs/futures-only-roadmap/21-PART-6-EXECUTION-REPORT-2026-11-19.md) for tested changes and remaining gaps.

## P8 — Futures risk and prop-firm rule status

- The Risk page calculates all-in stop risk from exchange tick value, stop ticks, round-turn fees, estimated spread and slippage. Fixed-point micro-dollar arithmetic and whole-contract floor sizing avoid decimal/tick-rounding drift; daily-loss and maximum-drawdown remaining amounts can cap the requested risk budget.
- Exact contract code and expiry are entered by the user. Imported tick references are still unverified, so every output is marked conditional and shows the source reference version, official exchange link, verification timestamp and effective date when available. Current profiles have no verified timestamp/effective interval.
- The versioned `data/prop-firm-programs.json` registry contains the typed drawdown-rule schema and no verified program records. `Blue Shift 25K` remains an unverified mention; the exact firm, product, official rulebook and numerical terms are not published.
- Private balance and guardrail entries stay in the browser and are not synced. Margin, FX conversion, platform-specific trailing logic, event rules, correlated exposures, a rule simulator and fee/payout comparisons are unavailable until exact source-backed terms are verified.
- See [`docs/futures-only-roadmap/24-PART-8-EXECUTION-REPORT-2026-11-19.md`](docs/futures-only-roadmap/24-PART-8-EXECUTION-REPORT-2026-11-19.md) for verification and gaps.
