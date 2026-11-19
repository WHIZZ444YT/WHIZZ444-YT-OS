# Implementation and service setup

## Local run

The current build uses static HTML/JSON, browser-native JavaScript and a Python standard-library route builder. It intentionally avoids external npm packages in the initial build so it can be inspected and tested in a restricted environment.

```bash
python3 scripts/build_site.py
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Build without `SITE_URL` sets the output to `noindex`. Set `SITE_URL=https://your-production-host` for production metadata and sitemap generation.

## Application shell and route responsibilities

The active interface is a static futures terminal. Use the current builder and assets rather than migrating frameworks:

- scripts/build_site.py owns the 13-area navigation, shared generated-page shell, sessions, contract-specs, risk, and compatibility redirects.
- assets/site-shell.css defines the dark-first semantic tokens, responsive sidebar/top bar/drawer, data-state chips, contract cards and dashboard widget styles.
- assets/site-shell.js controls desktop collapse, mobile drawer, keyboard dismissal and local light/dark theme preference.
- assets/overview-dashboard.js fetches the public Worker status/news/COT endpoints independently and loads private summary counts only from the authenticated Supabase browser session under existing RLS.
- ict-futures/index.html keeps its existing session/calendar, learning, chart, risk and journal behavior. Its current New York-time session clock remains the canonical session tool. The sessions route redirects there rather than duplicating that logic.
- The contract-specs route reads the 15-family imported registry. Imported tick values are labelled unverified; expiry/first-notice/roll fields are labelled not supplied.
- The risk route reuses the existing risk calculator. Prop-firm rulebooks/fees/payout terms remain not configured; the tools route redirects to the canonical route.

Do not use provider health as a proxy for quote freshness. Each widget presents its own state. The consolidated release calendar, exchange quotes/DOM and automated prop-firm data are not configured in this Part. The service-worker cache namespace is bumped when the app shell changes; API/news/session/user data must not be cached as static shell assets.

## Cloudflare

1. Create a KV namespace named `finance-os-snapshots`.
2. Put its ID in `cloudflare/wrangler.toml`.
3. Set `ALLOWED_ORIGINS` to the exact Vercel production and preview origins (comma separated; never `*` for credentialed private routes).
4. Deploy `cloudflare/src/index.js` with Wrangler; configure the `SNAPSHOTS` binding and Cron trigger from `wrangler.toml`.
5. Set optional Builder/Supabase secrets with `wrangler secret put`; never commit secret values.
6. Verify `/health`, `/api/v1/providers`, `/api/v1/news`, `/api/v1/news/sources`, `/api/v1/market-data/status`, `/api/v1/cot?report=tff`, `/api/v1/cot?report=disaggregated`, `/api/v1/macro` and `/api/v1/cms/ict-lesson`. Legacy prediction-market routes are not part of active product verification. CFTC PRE is cached for six hours and BLS v1 for six hours; the request paths intentionally return provider-labelled snapshots rather than claiming streaming market data.

The Worker is published as `https://finance-intelligence-os-edge.finance-intelligence-os.workers.dev` with a 30-minute Cron trigger. The Worker Cron performs GDELT snapshot discovery every 30 minutes. GDELT discovery is not a complete news service or a trading signal.

Public endpoints currently deployed in the Worker:
- `GET /health` and `/api/v1/health` — edge health/config state.
- `GET /api/v1/providers` — provider status.
- `GET /api/v1/news` — GDELT KV snapshot; accepts a supported futures-family `instrument`, normalized `topic`, exact publisher hostname, ISO `since`/`until` bounds, `limit` up to 100 and provider-seen-time sorting. Publisher publication times may be absent.
- `GET /api/v1/news/sources` — active news collector registry and rights-review status.
- `GET /api/v1/market-data/status` — licensed CME/ICE provider and public-display-entitlement status. No bars route exists until configured and approved.
- `GET /api/v1/macro` — BLS public v1 monthly series (CPI-U, core CPI, unemployment, payroll employment and PPI); six-hour cache.
- `GET /api/v1/cot?report=tff|disaggregated|legacy&variant=futures-only|combined` — CFTC PRE report family and variant, with up to 156 source-native rows in `rows` plus category-normalized records in `normalizedRows`. A source row may create several category records. Optional `q` searches source market names; `contract_market_code` selects an exact CFTC market code. Position date, missing per-row publication timestamp, retrieval time and persistence status are separate. Six-hour KV cache, versioned independently from the response contract.
- `GET /api/v1/volume-open-interest?report=...&variant=...&q=...` — weekly CFTC-reported open interest for a selected source market; exchange trading volume remains unavailable until a verified authorized provider is configured.
- `GET /api/v1/cms/{model}` — Builder public Content API proxy when the key is configured.
- `/api/v1/prediction/{polymarket|kalshi}` — legacy dormant compatibility handlers only; the active site does not link to or call these routes.

BLS and CFTC calls are public dataset/history access, not licensed real-time exchange prices. COT is a weekly position report; it is not an intraday indicator. CFTC PRE provides the position date but does not return a per-row publication timestamp; do not derive one from the usual Friday schedule because holiday changes apply. The additive `cot_report_observations` migration preserves report family, futures-only/combined variant, source market code, raw provider fields and category normalization. Worker upsert is disabled until the migration is applied and server-side Supabase credentials are configured.

## Strategy Lab — Part 7 local source behavior

The current feature branch upgrades the deterministic Strategy Lab engine to `p7.0.0`. Input now requires a single exact contract code and source-provided expiry date, fixed timeframe, provider/source, dataset ID and download date. Tick-misaligned OHLC and unreviewed CSV columns are refused; optional volume requires declared units. Commission/slippage assumptions require a source and as-of date. The manifest stores these declarations, exact expiry, observed timestamp gaps, data hash and execution assumptions. The engine reports a Wilson interval, average win/loss, consecutive streaks and trade frequency in addition to existing P&L and drawdown metrics.

All ten named ICT candidates remain external-signal research labels, not automatic detectors. Roll-adjusted continuous contracts, verified calendar/session or news filters, separate bid/ask spread, market impact, and expiry execution are not implemented. User-declared provider and exchange metadata are not independently verified. The local build/test report is the only evidence for this branch; it does not establish a deployed change or applied database migration.

## Futures risk and prop-firm rules — Part 8 local source behavior

The Risk page uses `assets/futures-risk-engine.mjs` for fixed-point micro-USD sizing. Gross stop risk, round-turn fees, estimated spread and slippage produce all-in per-contract risk; the requested balance/risk percentage is capped by optional daily-loss remaining, maximum-drawdown remaining and a user-set contract maximum. Contract code and expiry are required user inputs. Profile tick size/value come from the canonical registry, which currently marks every imported row unverified; outputs therefore remain explicitly conditional and show the profile version and official exchange source link.

The versioned `data/prop-firm-programs.json` defines the required exact identity/source fields and normalized drawdown-rule enums. It contains zero verified records. The `Blue Shift 25K` mention stays `UNVERIFIED` because its exact firm and current official program rulebook were not identified. No numeric fees, payout terms, drawdown rules, platform limits or eligibility are displayed. Account balances and user-entered limits remain in page memory and are not persisted or synced. There is no margin/FX conversion, correlated-exposure model, rule replay simulator or live source monitor.

## Supabase

`supabase/setup.sql` and `supabase/migrations/` contain the reviewed bootstrap SQL. The live Supabase project was provisioned in `ap-south-1`; the initial schema, Auth profile trigger and legacy unverified contract seed were applied through the connected Supabase integration. Table/RLS counts were checked afterward. The checked-in migration filenames use the exact versions/names recorded in the remote migration history. The Supabase CLI was not installed in this build environment; after installing it and linking the same project, run `supabase migration list` first and only then use `supabase db push` if the remote/local history still matches.

Do not expose the `service_role` key to the browser. User tables require an ownership condition matching `auth.uid()`. Public research records are read-only to browser roles; Worker/service-role ingestion is server-side only.

## Builder.io

See `integrations/builder/README.md`. The Space must be selected/created and its public Content API key configured as the `BUILDER_PUBLIC_API_KEY` Worker secret. The Builder model proxy is implemented but currently reports not-configured until that key and the four Content models exist. The Public API key is suitable for content reads; a Private API key/PAT must never go to browser code.

## Vercel

Connect the production repository after GitHub repo creation. Configure the project root, static output path `dist`, and build command `python3 scripts/build_site.py`. Set `SITE_URL` for production builds. Preview deployments should remain `noindex` until reviewed. Vercel Hobby is restricted to personal/non-commercial use; commercial use needs an eligible plan or a different host.

## Production gate

No public page should claim `24/7 live` until uptime, each provider's freshness and real collection history are monitored. Site availability and market-data availability are separate SLAs.

## Part 9 — Private workspace hardening

- The account UI now requires exact exchange contract and expiry for new trades, records the browser IANA timezone for entered timestamps, and adds explicit family, target/tick, contract-size, risk, setup, plan, context, adherence and review fields. Blank fees stay null; net P&L is derived only when both gross P&L and fees are present. Existing imported rows remain unchanged until edited.
- Watchlist rows include contract expiry, optional continuous alias, preferred session, selected-source label, display label, and active/inactive/unknown status. The migration leaves existing status unknown instead of assuming old contracts remain active. Source labels do not connect a provider or grant quote entitlement. Contract edits are available, and user-entered expiry review asks users to verify first-notice/last-trade/roll dates against an exchange calendar. Research notes include optional exact contract/expiry, session, model, alternative scenario, news context, review date/conclusion, invalidation and up to 30 HTTP(S) source references. These values are user-entered and are not checked against an exchange calendar.
- `journal-attachments` remains private. The browser stores chart images under `{auth.uid()}/{trade_id}/{random_id}.{ext}`. The UI accepts PNG/JPEG/WebP files up to 5 MB, and checks the owner path on download and removal. Live Storage policies use the first folder token for owner isolation.
- Backup v2 pages every private table in stable ID order with exact-count checking. It includes `lesson_progress`, `user_events`, strategy backtests/trades, cloud profile/preferences, browser-only import sources, local Academy progress and attachment bytes. Attachment payloads are capped at 50 MB raw; the multi-table export is not a transactionally consistent snapshot.
- Lesson progress remains local-first. Failed cloud writes are marked pending and retry on reconnect, focus or next page load; the Academy refreshes expired Supabase sessions with the shared refresh token.
- Alerts remain manual-only. Rules store exact contract/expiry, user-entered price source, timezone, optional active window and optional expiry. Manual checks pause expired rules and skip checks outside the active window. Threshold events stage an idempotency UUID on the rule before insert for retry after an interrupted request.
- Journal trades, watchlist contracts/lists, research notes, profile/preferences and alert-rule updates use conditional `updated_at` filters where supported. A stale edit is rejected with a sync/review message instead of silently overwriting a newer version. Concurrent alert retries still require real two-browser integration testing.
- Account deletion reauthenticates using current email/password and requires the user to type `DELETE`, then calls a server-side function. It verifies the exact configured origin and Auth JWT, limits the request body, removes that user's private attachment files, then deletes their Auth user. Configure `APP_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as function secrets. The function is local and undeployed; `accountDeletionEnabled` in `assets/runtime-config.js` is `false`, and the UI blocks deletion until the function is deployed and verified with test accounts.
- Additive migrations `20261119125044_add_cot_report_observations.sql` and `20261119125110_complete_private_workspace_records.sql` were applied to the active production project on 19 November 2026 and then verified in remote migration history and table/RLS state. Their filenames now match the remote versions. The P9 migration makes fees nullable without rewriting existing fee values. Account deletion remains disabled until its Edge Function is configured and disposable-account tests pass.

The initial read-only live inspection on 19 November 2026 found RLS enabled on private workspace tables with owner-scoped predicates, a private `journal-attachments` bucket with first-folder owner policies, zero stored attachment objects, and no Supabase security-advisor lints. The two P9/COT additive migrations were applied and then verified in remote migration history and schema later that day. No two-user runtime RLS test or signup/session/attachment browser flow was run because dedicated test-account sessions were not configured. Policy metadata and advisor output do not replace an isolation test.
