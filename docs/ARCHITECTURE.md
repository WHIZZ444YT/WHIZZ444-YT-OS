# Architecture

## Runtime topology

```text
Browser
  ├─ Futures Command Center homepage and shared 13-area app shell
  │    ├── Grouped desktop sidebar / compact top bar / responsive mobile drawer
  │    ├── Dark-first CSS tokens / optional light preference / independent widget states
  │    └── Overview widgets: contract reference, gateway health, news, weekly COT, clocks, private summary
  ├─ Static modules: 15 Futures Families / Futures Desk / Futures News / Macro / COT / Volume & OI / Contract Specs / Risk
  ├─ Sessions & Calendar page: official BLS, EIA, CFTC and Federal Reserve schedule snapshots + IANA-aware ICT reference windows
  └─ ICT Futures terminal: 15 futures families + 76 preserved ICT concepts + 9 guided tutorials + integrated session/calendar tools
       │
       ├── Vercel static hosting (Git-linked from main)
       ├── Cloudflare Worker API gateway
       │      ├── GDELT futures-focused discovery → KV snapshot (scheduled every 30 minutes)
       │      ├── US BLS Public Data API v1 → KV (historical macro series)
       │      ├── Official BLS ICS schedule → bounded KV snapshot / GET /api/v1/events
       │      ├── Official EIA WPSR schedule → bounded KV snapshot / GET /api/v1/events/eia
       │      ├── Official CFTC COT release schedule → bounded KV snapshot / GET /api/v1/events/cftc
       │      ├── Official Federal Reserve FOMC meeting dates → bounded KV snapshot / GET /api/v1/events/fomc
       │      ├── CFTC Public Reporting Environment → KV (TFF / Disaggregated weekly COT)
       │      ├── New York Fed Markets API (SOFR / EFFR / OBFR / repo reference rates)
       │      ├── Legacy prediction-market handlers remain dormant and are excluded from active futures navigation
       │      ├── Builder Content API allow-listed proxy (not configured)
       │      └── provider health / freshness metadata
       └── Supabase Postgres/Auth (public normalized data model + private per-user workspace)
```

## User-interface architecture

The Python builder owns the shared shell for generated pages and applies the same sidebar wrapper to the two standalone Futures Desk and ICT terminal apps. The root overview remains a maintained static HTML page and loads its own small dashboard controller. The Sessions & Calendar route is a generated page with a dedicated controller and responsive stylesheet; it does not redirect to the ICT terminal. The shell is browser-native HTML/CSS/JavaScript; it does not add a framework or component-library dependency.

The 13 primary areas are Overview, Futures Markets, ICT Academy, Entry Models, Sessions & Calendar, Futures News, Volume & Open Interest, COT & Positioning, Contract Specs & Expiry, Strategy Lab, Risk & Prop Firms, Journal & Watchlists, and Data Health & Sources. Existing routes /markets/, /macro/, /tools/, and /sources/ remain compatible supporting routes or redirects.

Overview widgets request data independently. A failed news or COT request must not blank the session clock or other page modules. The overview shows ET and a selectable browser/profile timezone; the current ICT terminal keeps its own DST-aware ET/IST session clock. No session high/low or range is shown unless an intraday source is connected.

The imported 15-family contract registry currently lacks expiry/first-notice fields and its tick references remain unverified. The contract-specs page marks the source values accordingly and shows missing lifecycle fields as unavailable. The Sessions & Calendar route combines separate, source-attributed BLS, EIA, CFTC and FOMC schedule snapshots; it is partial coverage, not a complete global calendar. The risk page uses conditional fixed-point position sizing and a versioned registry with no verified prop-firm program records. Real-time CME/ICE quotes, depth, delayed quotes, full release schedules and prop-firm pricing are not implied by shell state.

## Runtime and provider responsibilities

- **Vercel** serves the static application, generated routes, and published sitemap.
- **Cloudflare Worker** is the single public-data gateway. It owns upstream calls, per-provider timeouts, bounded transient retries, provider circuit state, cache and freshness labels. The GDELT scheduled refresh uses the existing 30-minute Cron trigger. A manual `/api/v1/news?refresh=1` request queues a Worker-side refresh under a five-minute cooldown/lock; the API immediately returns the prior snapshot with refresh state, so the browser does not make upstream GDELT calls. BLS, EIA, CFTC and Federal Reserve schedule feeds refresh on request with separate KV snapshots and stale fallback. The former event-market handlers are retained as dormant compatibility code; the active frontend no longer requests them.
- **Supabase** stores the normalized data model and user-owned journal/watchlists/progress. All 22 public tables currently have RLS enabled. The Worker currently has no Supabase service-role/secret key configured, so its optional server-side ingestion writes remain disabled; do not put privileged keys in browser code.
- **Builder.io** remains optional editorial CMS. Its public Content API key and Admin PAT are not configured, so existing static lessons and JSON remain the fallback.
- **GitHub Actions** runs build, unit, validation and internal-link checks on pushes and pull requests.

## API routes

| Route | Provider | Meaning / freshness |
|---|---|---|
| `/api/v1/news?instrument=NQ&topic=macro&publisher=...&since=...&until=...&limit=...` | GDELT DOC | Cached news-discovery snapshot with validated contract/topic/publisher/time filters. Returns frequency, delay class, provider/source, retrieval age, display-rights limitation and article verification status. GDELT requires attribution and a project link; underlying publisher content rights remain separate. GDELT seen time is not publisher time; sort uses provider-seen time where publication timestamps are absent. |
| `/api/v1/news/sources` | News source registry | Lists the active discovery source, source terms review state, cadence, parser version, latest check and known limitations. |
| `/api/v1/market-data/status` | Gateway market-data entitlement state | Reports exchange-data status, delay/frequency, source and licensing limitation. Returns `not-configured`; no CME/ICE bars route is enabled. |
| `/api/v1/volume-open-interest?report=tff&variant=futures-only&q=...` | CFTC PRE | Contract-filtered weekly reported open-interest history. `report` supports Legacy, TFF or Disaggregated; `variant` keeps futures-only and futures-and-options-combined datasets separate. Exact CFTC contract-market codes are accepted. Exchange trading volume remains not connected. |
| `/api/v1/macro` | US BLS v1 | Historical CPI, core CPI, unemployment, payroll and PPI observations. Not live market data. |
| `/api/v1/cot?report=tff&variant=futures-only[&q=...]` | CFTC PRE | Weekly report-family/category rows. `report` accepts `legacy`, `tff`, or `disaggregated`; `variant` accepts `futures-only` or `combined`. A market query returns a bounded filtered set; an empty query returns a bounded latest-provider snapshot. For rolling deployment compatibility, `rows` retains at most 156 source-native CFTC rows for the independently deployed frontend; `normalizedRows` contains normalized categories and excludes nested raw rows. One source row can expand to multiple category rows. Server-side persistence uses its own normalized/raw mapping. |
| `/api/v1/macro/funding` | New York Fed Markets API | Latest published SOFR, EFFR and supported overnight reference rates; daily business-day observations. |
| `/api/v1/economic/providers` | Worker provider registry | Credential configuration, cadence, last attempt/success, persistence state and freshness per provider. |
| `/api/v1/economic/bea` | BEA NIPA | Quarterly NIPA Table T10101; requires `BEA_API_KEY`. |
| `/api/v1/economic/eia` | EIA API v2 series ID route | Weekly US crude-oil ending stocks `PET.WCESTUS1.W`; requires `EIA_API_KEY`. |
| `/api/v1/economic/fred` | FRED observations API | DFF, DGS10, CPIAUCSL, UNRATE and PCEPI histories; requires `FRED_API_KEY` and paginated series queries. |
| `/api/v1/economic/us_treasury` | Treasury Fiscal Data | Monthly average interest rates on marketable Treasury securities; public API, historical series pages with explicit provider cadence. |
| `/api/v1/economic/ecb` | ECB SDMX 2.1 | Daily USD/EUR reference series `D.USD.EUR.SP00.A`; public endpoint. |
| `POST /api/v1/ingest` | Worker ingestion orchestrator | Protected by `INGEST_TOKEN`; starts provider ingestion and records persistence outcomes.
| `/api/v1/prediction/polymarket` | Polymarket Gamma | Dormant compatibility handler only; not linked to or called by the active frontend. |
| `/api/v1/prediction/kalshi` | Kalshi public Trade API v2 | Dormant compatibility handler only; not linked to or called by the active frontend. |
| `/api/v1/providers` | Gateway registry | Provider configuration and last-known state. |
| `/api/v1/health` | Gateway | Worker health and secret/configuration presence flags, never secret values. |

The UI should display provider, source URL, publisher/event timestamp, retrieval timestamp, data-as-of time and freshness status separately wherever the provider supports them. For GDELT, publisher and event timestamps may be absent; the product shows this absence and labels GDELT's own `seendate` as provider-seen time. COT position date, publication timestamp and retrieval timestamp are also separate; CFTC PRE does not supply a per-row publication timestamp, so `published_at` stays null while the official release schedule is linked. The new `cot_report_observations` table uses report family + variant + source market code + report date + category for idempotent upserts, retains raw source fields and is browser-read-only under RLS. Worker persistence is optional and remains `not-configured` until server-side Supabase credentials and the additive migration are applied. The Data Health page runs each active futures-relevant gateway endpoint independently and distinguishes an available-on-demand route from a fresh upstream snapshot. The Entry Models page is descriptive and does not rank models without reproducible results; Strategy Lab publishes no backtest statistics until timestamped historical inputs, costs and validation methodology are available. The Futures Desk tracks each research feed independently; one successful provider must not label the whole dashboard healthy. COT is delayed aggregate positioning, not exchange daily volume, expiry-level positions, or an intraday signal.

## Historical persistence and schedules

The economic provider adapters live in `cloudflare/src/economic-providers.js`. They normalize provider-specific observations and preserve units, source URLs, retrieval timestamps, frequency and raw provider attributes. `economic_observations` uses a unique key `(provider, dataset_id, series_id, frequency, observation_date)` so scheduled refreshes can safely upsert without duplicating history. `ingestion_runs` records each run and is deliberately inaccessible to browser roles; a second migration adds an explicit `USING (false)` / `WITH CHECK (false)` policy for anon/authenticated roles in addition to revoking their privileges. `economic_observations` is public read-only; all writes use `SUPABASE_SERVICE_ROLE_KEY` in the Cloudflare Worker only.

The Worker Cron remains every 30 minutes, but provider TTL/cadence checks control actual upstream requests. The five selected FRED series use one request per series with the documented 100,000-observation cap; EIA requests up to 5,000 weekly observations; Treasury history is paginated in bounded 1,000-row pages; ECB requests the latest 1,000 observations. BEA/EIA/FRED credentials are Worker secrets; Treasury Fiscal Data and ECB SDMX do not require registered API keys. `POST /api/v1/ingest` is protected by the `INGEST_TOKEN` bearer header. If credentials or database secrets are absent, provider fetch status and persistence status are reported independently; no secret value is included in logs or source URLs.

## Security and access boundaries

- Browser runtime configuration may include only public Supabase publishable/anon values and the Worker URL. Supabase service-role keys, Builder PATs, ingestion tokens and other privileged credentials must remain Worker secrets.
- Worker CORS must be restricted to explicit deployed site origins; do not use wildcard CORS with credentialed or private data.
- Legacy event-market handlers remain dormant and unlinked. No active event-market UI, page route, provider health check or client API call remains.
- Public data is not necessarily licensed for redistribution or commercial use. Upstream terms and market-data exchange licenses still apply.
- Contract reference values in the retained 15-profile dataset must be verified against the relevant current exchange specification. Contract expiry, first notice, last trade and broker margin must not be inferred from a continuous chart.

## Data contract

Normalized records should retain `provider`, `source_url`, `published_at`, `event_at`, `retrieved_at`, `data_as_of`, `freshness_status`, `license_note` and a stable provider ID where supported. Publisher time, event time, retrieval time and data-as-of time are not interchangeable.

## Degradation

If a provider is rate-limited, blocked, unavailable or not configured, the UI shows an unavailable/not-configured state or a clearly identified last-known snapshot. It must not synthesize values, describe a search destination as an API, or imply that an indicative event-market probability is a futures price.


## P3 ICT Academy curriculum

The ICT Academy dataset retains the existing 76 concept IDs, categories, levels and seven learning tracks. Each concept now carries a structured learning object: objectives, prerequisites, guided steps, a labelled hypothetical example, chart-replay exercise, deliverable/review criteria, three-choice knowledge check and source references. The content preserves evidence/provenance labels and does not upgrade community terminology into canonical ICT rules.

Nine guided tutorials provide multi-concept workbooks for structure, liquidity, sweep versus acceptance, imbalances, dealing ranges, timezone-aware sessions, cross-market comparisons, entry-model replay and supplemental source auditing.

The static build's `scripts/build_academy.py` creates the enhanced standalone lesson pages at existing `/ict-futures/academy/{id}.html` URLs and nine tutorial pages plus an index under `/ict-futures/academy/tutorials/`. The root `/academy/` route provides a searchable 76-lesson catalogue, seven track entry points and tutorial cards.

Lesson progress uses local storage for immediate, offline progress and attempts cloud sync only when a Supabase session is present. It sends the learner's authenticated JWT and publishable key to the existing `public.lesson_progress` Data API table; RLS checks `auth.uid() = user_id`. It uses the unique `(user_id, lesson_slug)` key for an upsert. Migration `20261108144106_add_lesson_progress_data` adds `progress_data` JSONB for practice checklist state and `lesson_version` for curriculum versioning. The browser uses only a publishable key and the learner JWT; no service-role key is exposed. Lesson completion requires the practice checklist and correct knowledge-check response; tutorial completion requires its review checklist. A synced score is a learning check, not a trading-skill metric.

Verified original ICT uploads are only embedded where the source catalogue explicitly marks them as verified. Official channel/playlist and topic-search links are distinguished. CME Institute/CFTC links provide general exchange/regulatory education and are not presented as sources for ICT setup definitions or profitability.


## P7 Strategy Lab — futures-specific research controls

The Part 4 deterministic signal engine is extended for Part 7. Its CSV now requires timestamped OHLC, LONG/SHORT/FLAT signal, exact contract code, and source-supplied expiry date. It rejects multiple contract/expiry rows, timestamps without explicit UTC offsets, unsupported columns, invalid OHLC and prices not aligned to the user-supplied tick size. Timeframes use fixed intervals; observed gaps above 1.5× the interval are counted and included in the manifest, but no unverified session calendar is used to classify them. Uploads remain limited to 250,000 bars and 50 MB.

Every run records provider/source, dataset ID, download date, volume units when volume is present, and source/date for the commission/slippage assumptions. The exact contract in the form must match CSV rows. The engine supports one expiry only and refuses back-adjusted continuous series until roll-aware handling is designed and tested. These metadata are user declarations and are not exchange/provider verified by the site.

Execution retains next-bar entry after a source-bar-close signal, one position, whole-contract risk sizing, max contract cap, commissions per side, fixed adverse slippage, worse-open stop-gap fills, no target price improvement, conservative stop-first same-bar ambiguity, time/end-of-data exits and bar-close mark-to-market drawdown. Tick-misaligned OHLC is rejected. The UI states that a separate spread model, exchange session/expiry/news calendars, margin, queue/partial fills, liquidity and market impact are unavailable; users must account for spread conservatively in slippage or avoid treating results as execution evidence.

Metrics include gross/net P&L, net expectancy and average R, net profit factor, win rate with Wilson 95% interval, average win/loss, trades per 1,000 bars, longest win/loss streak, commissions, estimated slippage and drawdown size/percent/duration. The engine creates independent chronological IS/validation/OOS segments and includes the full ledger. OOS is not technically sealed; it is only meaningful if rules were frozen before inspection. Full-sample metrics remain descriptive.

The schema-versioned run manifest contains the source CSV SHA-256, canonical fingerprint, engine version, exact expiry, user-declared dataset/cost provenance, gap diagnostics, parameters, splits and execution policy. The source CSV is not uploaded. The authenticated browser stores manifests, metrics and completed trades in `strategy_backtests` and `strategy_backtest_trades`, both owner-scoped by RLS; no service-role key is in browser assets. Local-only runs remain available when signed out or cloud sync fails.

The ten named ICT candidates are catalogue labels only, not executable detectors. [Part 7 rule cards](futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md) list per-model decisions and causal tests still required. Supplied signal columns are assumed causal but are not audited for look-ahead. No automated news filter, model detection, event/session breakdown, MAE/MFE, benchmark, sensitivity study, or multi-test correction is provided. No historical dataset or profitability result is fabricated. Exact exchange tick values, expiry dates, fees, data rights and provider records remain the user's input assumptions unless independently verified.

## P8 Futures risk and prop-firm registry

The `/risk/` route loads standard/micro tick profiles from the canonical 15-family registry. Current profile values are unverified; outputs are labelled conditional and identify the selected reference version, source URL, verification date and effective date where present. User-entered exact contract code/expiry, account balance, risk percentage, maximum contracts, round-turn fees, spread/slippage estimates and optional daily-loss/drawdown remaining amounts are used only in an in-browser calculation; those private values are not persisted or sent to Supabase.

`assets/futures-risk-engine.mjs` calculates in integer micro-USD and floors contracts to a whole number. The all-in per-contract stop estimate includes tick-value stop risk, commission/fees, spread and slippage. Optional daily-loss and maximum-drawdown remaining amounts cap the per-trade risk budget. The calculator does not infer account reset timezone, realized/equity basis, margin, FX conversion, liquidation or correlated exposure, and is not a broker order workflow.

`data/prop-firm-programs.json` is a versioned schema for exact firm/program/account/stage/platform records and typed loss-rule logic. Its verified `records` list is empty. The `Blue Shift 25K` text is retained only as an `UNVERIFIED` mention with no firm identity, official URL or numeric terms. The route displays no unsupported fee, drawdown, contract limit, eligibility or payout value; no simulator or like-for-like comparison is enabled without verified plan sources.

## P5 Cloud personal workspace

The /account/ route now loads a private workspace with Supabase Auth, refresh-token rotation, trade journal/watchlist/research-note/alert CRUD, analytics and cross-device synchronization. The browser uses the project publishable key and authenticated user JWT only. The session is persisted in localStorage under the shared finance-os-supabase-session-v1 key and mirrored to sessionStorage for compatibility with the ICT Academy and Strategy Lab clients. Expiring sessions are refreshed before database requests; an HTTP 401 triggers one refresh/retry.

Data model: journal_trades remains the user's trade-record source; watchlists/watchlist_items are the multi-list instrument shortcut model; profiles stores display name/timezone; user_preferences stores theme and JSON preferences. Migration 20261108161355 adds research_notes and alert_events. Migration 20261108162550 adds journal_trades.legacy_id plus a unique user/legacy identifier to make import of existing ICT browser journal entries idempotent. Migration 20261108163000 adds covering indexes on (alert_id,user_id) and (backtest_id,user_id) for alert and backtest composite foreign keys. Alert events link to an alert/user pair through a composite foreign key. Private tables use owner RLS.

The explicit Import action reads the old Global Research local watchlist and scenario-note keys and the ICT Futures ictfos.journal.v1 trade journal. It upserts stable legacy identifiers and does not delete local values. It must be run separately in each browser containing unique historical local data. Partial import failures can be retried without duplicate legacy rows.

Account analytics summarize saved closed trades using entered net P&L and R values. They are not connected to a broker or live account. Price alert rules are persisted in alert_rules and triggered event history in alert_events; the user enters a current observed price to run a manual threshold evaluation. Browser notifications require an open site and permission. No unattended market monitoring, exchange quote polling, email/SMS alerts or scheduled server delivery is claimed. Those capabilities require a verified appropriately licensed market-data source and a scheduled background service.

The account workspace can export a paginated JSON v2 backup through the authenticated user's RLS scope. It includes private rows for profiles, preferences, trades, lists, notes, alerts, lesson progress, reminders, backtests and trade rows; private attachment bytes are embedded as base64 up to a 50 MB raw-file ceiling. Browser-only legacy inputs are included separately. The export is read per table and is not a transactionally consistent snapshot if the user edits data during export. No privileged service-role key is shipped to the browser.

## P9 Private workspace changes

The additive `20261119125110_complete_private_workspace_records` migration adds explicit exchange contract and expiry fields, session/timezone, tick and target context, risk/adherence fields, plan/review notes, expanded watchlist session/source/display/status context and research-note context. It preserves old rows; incomplete legacy rows remain visibly incomplete. Fees become nullable so unknown is distinct from zero. The migration was applied and verified on the active production database on 19 November 2026. Two-user runtime isolation and Auth flows still need dedicated test accounts.

The existing `journal-attachments` bucket is private and uses `auth.uid()` as the first object-path segment. The account UI uploads, downloads and deletes owner-scoped PNG/JPEG/WebP chart images, with a per-file limit in the UI. Storage permissions were inspected live; no object data was present during inspection. Account deletion uses the server-side `supabase/functions/delete-account` function source: the browser reauthenticates via password, then sends the fresh user JWT and typed confirmation. The function verifies identity and allowed origin, limits the request body, removes objects in that user's bucket folder, then deletes the Auth user so FK cascades remove the user's private database rows. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and exact `APP_ORIGIN` only as function secrets, then deploy and verify with test accounts. The additive P9 migration is already applied to the active production database; the Edge Function is not deployed. The UI is gated off by default through `accountDeletionEnabled: false` in `assets/runtime-config.js`; enable it only after that verification.

Lesson progress remains local-first and now marks cloud failures pending, refreshes an expiring session and retries on reconnection/focus. Alert rules retain source, exact contract/expiry, timezone, manual-only cadence, optional active window/expiry and last evaluation. Threshold events stage a stable event UUID before insert so a retry after a network interruption can safely ignore a duplicate. There is still no background quote polling or scheduled external delivery.

Live schema/policy inspection on 19 November 2026 found RLS enabled and owner predicates on the private user tables, plus a private attachment bucket with owner-folder policies. Supabase security advisors returned no lints. This was read-only policy inspection, not the required two-user runtime test; signup, session refresh, attachment access and deletion were not smoke-tested against test accounts. The live database has not received the P9 migration.
