# Part 1 — Premium UI and Information Architecture

**Goal:** Maintain and close any verified gaps in the Futures Command Center and its information architecture without changing the existing static architecture unnecessarily.

> **Current-source review (19 November 2026):** The inspected `main` source already defines 13 futures-only navigation areas in `scripts/build_site.py`, and `scripts/validate.py` contains structural assertions for that navigation and compatibility routes. The repository README describes the shared responsive shell and current route map. Use this Part as a gap-based review rubric: inspect the live source and built pages first, retain passing work, and implement only demonstrated gaps. These source and documentation checks do not by themselves prove the build, browser behavior, accessibility or deployment was verified.

## 1. Product experience

Design language: premium institutional research terminal, dark-first, clean typography, restrained color, high information density without clutter. Avoid neon overload, decorative gradients behind every card, oversized empty hero blocks, noisy animations, fake live tickers, fake green/red prices and excessive nested cards.

Required experience:
- Desktop: collapsible left sidebar, compact top bar, central workspace and optional right-side watchlist/context panel.
- Tablet: collapsible navigation and two-column responsive grids.
- Mobile: compact top bar, drawer navigation, stacked content and usable chart/table overflow.
- Light/dark theme if existing preference system supports it; dark is default.
- Keyboard navigation, visible focus, semantic headings, labels, accessible contrast and reduced-motion support.
- Consistent empty/loading/error/stale/unconfigured states.

## 2. Primary information architecture

Use these 13 futures-only areas:

1. Overview.
2. Futures Markets.
3. ICT Academy.
4. Entry Models.
5. Sessions & Calendar.
6. Futures News.
7. Volume & Open Interest.
8. COT & Positioning.
9. Contract Specs & Expiry.
10. Strategy Lab.
11. Risk & Prop Firms.
12. Journal & Watchlists.
13. Data Health & Sources.

The exact page routes can remain compatible with current routes where possible. Suggested route map:

| Area | Preferred route | Existing route compatibility |
|---|---|---|
| Overview | `/` | Replace Global Research homepage output. |
| Futures Markets | `/futures-intelligence/` | Preserve `/markets/` as catalogue/redirect if appropriate. |
| ICT Academy | `/academy/` | Preserve `/ict-futures/academy/` lesson URLs. |
| Entry Models | `/entry-models/` | Retain existing route. |
| Sessions & Calendar | `/sessions/` | Reuse current ICT session tools; add calendar if necessary. |
| Futures News | `/news/` | Futures-only classification. |
| Volume & OI | `/volume-open-interest/` | Preserve current route; label weekly COT-derived OI correctly. |
| COT & Positioning | `/research/positioning/` | Preserve current route. |
| Contract Specs & Expiry | `/contract-specs/` | New view backed by verified contract registry. |
| Strategy Lab | `/strategy-lab/` | Preserve current deterministic backtester. |
| Risk & Prop Firms | `/risk/` | Migrate from `/tools/` without breaking links. |
| Journal & Watchlists | `/account/` | Preserve Supabase workspace and Auth. |
| Data Health & Sources | `/data-health/` | Preserve source registry and provider health. |

If a matching existing route exists under a different source path, prefer it and document a redirect rather than duplicate its page.

## 3. Overview dashboard widgets

- Market watchlist for selected contract/expiry (no fabricated prices).
- Market-data feed status and clear delay/freshness class.
- Session clock with ET and the user's chosen timezone.
- Session high/low and range status only when underlying data is available.
- Upcoming economic releases with timezone and provider/source.
- Futures news headlines filtered by contract/topic.
- COT summary with report date and weekly frequency.
- Quick access to ICT concepts and entry models.
- User's watchlists, journal summary and alert history when authenticated.
- Data Health summary with unavailable providers visible.

Every widget links to its full module. User can hide/reorder personal widgets only after the basic page works and saves settings predictably.

## 4. UI components and contracts

Create reusable components or equivalent source functions:
- `AppShell`, `SidebarNavigation`, `TopBar`, `ContractSelector`.
- `DataStatusBadge`, `LastUpdated`, `SourceAttribution`.
- `MetricCard`, `DataTable`, `EmptyState`, `ErrorState`, `Skeleton`.
- `SessionClock`, `EventTimeline`, `NewsList`, `WatchlistTable`.
- `ChartPanel` wrapper whose source and delay status are always visible.

Do not introduce a component library until the existing implementation has been audited. Prefer a small, consistent design-token layer in the current CSS architecture. Keep CSS scoped and avoid global selectors that break legacy pages still served.

## 5. Design tokens

Define semantic CSS custom properties: background/surface/surface-elevated, border/subtle-border, text/secondary/muted, positive/negative/neutral/warning, focus ring, spacing scale, radius scale, typography scale, table row height and z-index layers. Colors must encode meaning consistently; never encode stale/unavailable as success.

Use tabular numerals for prices, tick values, event times and P&L. Use a compact numeric format but expose full values on hover/details where rounding could mislead.

## 6. State, loading and failure behavior

Each widget has its own data state. One failed endpoint must not blank the entire page. Show:
- Loading: skeleton with module title.
- Fresh: source and data-as-of.
- Delayed: delay label with provider's known delay.
- Historical/weekly: clear frequency label.
- Cached/stale: age and last successful fetch.
- Partial: which source failed.
- Not configured: exact credential/provider requirement, never a fake zero.
- Unavailable: safe retry behavior and last-known snapshot separately.

No automatic repeated fetch loop. Respect Worker cache TTL, backoff and provider rate limits.

## 7. Implementation paths

Primary files to inspect/update:
- `scripts/build_site.py` (shared shell, navigation and route builders).
- `assets/site-shell.css` and related existing styles.
- Page-specific JS/CSS in `assets/` and `data/`.
- `index.html` only if confirmed to be the source rather than generated output.
- `manifest.webmanifest`, `icon.svg`, `sw.js`.
- `scripts/validate.py`, `scripts/audit_internal_links.py`, `tests/test_build.py`.
- README and architecture docs.

Never hand-edit `dist/`. Avoid a wholesale framework migration. Ensure all routes receive the shared shell and their page-specific script is loaded once.

## 8. Performance, responsive and accessibility requirements

- Avoid loading all 76 lessons or all historical observations on the homepage.
- Paginate/filter long contract, resource and news lists.
- Lazy-load charts and below-the-fold modules.
- Cache static content with immutable/versioned asset strategy where safe.
- Do not put large OHLC data into the initial HTML.
- Keep layout stable while widgets load.
- Respect reduced-motion, focus order and screen-reader labels.
- Tables scroll horizontally on narrow screens or reflow to labelled cards without hiding essential columns.

## 9. Codex plugin actions and website UX boundary

Keep the 13-area product navigation focused on the deployed website. Do not add a generic Plugins area or show a connected/healthy badge merely because a tool exists in the authoring environment. If a plugin action is exposed in the website, place it in the relevant module (market data, Strategy Lab or Risk), show whether it is local-only, configured, stale or unavailable, and state which dataset or provider it uses.

- The Futures Market Data Hub is not a CME/ICE feed. Binance USDⓈ-M perpetual candles are outside the product's listed-futures scope. FRED is economic data; Twelve Data coverage, delay, paid-plan entitlement and redistribution rights must be verified per series. Do not upload a local CSV from the plugin implicitly.
- ICT Liquidity Lab reports calendar-day levels and a prior-N-bar wick-through/close-back proxy; show the timezone and calendar-day convention, and do not label it a complete ICT signal.
- ICT Backtest Lab is a separate local CSV proxy runner, not the website's deterministic Strategy Lab. Never mix its results, data files, or history with hosted user records without an explicit, tested integration.
- Futures Risk Manager uses supplied tick size/value and cost assumptions. It does not verify contract specs, calculate margin or fetch prop-firm rules; any website sizing output must retain its own source and verification state.
- A website integration needs an explicit server-side call path, safe authentication, provenance/licence metadata, independent loading/error states, and tests. If no such path exists, render a truthful not-connected or not-configured state and keep the local action in Codex.

## 10. Acceptance criteria

- [ ] All 13 primary areas have functioning links and unique page purpose.
- [ ] Homepage contains futures-only market/session/news/event/data-health widgets.
- [ ] Desktop, tablet and mobile layouts are usable.
- [ ] No fake live data, fake price movement or fake API success indicators.
- [ ] Shared typography, spacing, buttons, tables, chips and data-state presentation are consistent.
- [ ] Accessible focus, labels, contrast and reduced-motion behavior are verified.
- [ ] Loading/error/stale/empty/not-configured states tested for each data-backed widget.
- [ ] Existing lesson, backtest, account and journal routes still work.
- [ ] Plugin-only tools are not represented as website integrations; any actual integration has a documented server-side path, source/entitlement state, privacy boundary and test.
- [ ] Build and link audit pass; manual screenshots are included in the Part report.

## 11. Part-specific execution prompt

> Review Part 1 only. Inspect the current builder, route structure, CSS, JS and generated site before changing anything. Compare the existing implementation with all 13 areas and the UI/UX acceptance criteria. Preserve criteria already met and implement only evidence-backed gaps. Do not rewrite the site in a new framework. Reuse current futures modules and preserve all existing route compatibility. Build or refine reusable UI primitives and honest data-state rendering. Keep authoring-environment plugin tools separate from deployed website capabilities unless an explicit server-side integration is implemented and tested. Verify responsive layouts, accessibility, affected routes, build and links. Do not add unverified market prices or start content/data-provider work outside what the UI needs to render correctly.


## Standalone handoff context — use this file by itself

**Repository:** https://github.com/WHIZZ444YT/WHIZZ444-YT-OS  
**Product:** Futures Intelligence OS — futures-only markets, ICT futures education, futures news/data, positioning, backtesting, risk and trader workspace.  
**Architecture to inspect and preserve:** static HTML/JavaScript/JSON; Python build at `scripts/build_site.py`; Cloudflare Worker at `cloudflare/src/index.js` with KV; Supabase Postgres/Auth/RLS; Vercel static output `dist/`; GitHub Actions and tests. This is a baseline, not proof each service/credential is currently healthy.

**When this single Part file is the only document supplied:** treat it as the complete request to execute this Part. The user should not need to repeat the repository URL, product purpose or stack. Apply these global rules:
- Execute only the Part named in this file; do not implement another Part.
- Inspect current branch, commit, relevant source, dependencies and runtime first. Actual repo/runtime overrides stale documentation.
- Preserve futures modules, ICT lesson IDs, user data, Auth/RLS, build system and legacy backups. Do not blindly delete/rewrite.
- Futures-only includes CME/ICE listed futures, including currency futures and CME Bitcoin futures. Exclude unrelated equities, generic spot crypto, generic FX/CFD, prediction markets and other non-futures product areas only after dependency audit.
- Never invent prices, volume/OI, specs, expiry, schedules, prop rules, provider capability, licences, API limits or strategy performance.
- Separate real-time, delayed, historical, weekly, cached and unavailable data; display source, frequency and timestamps.
- Keep secrets out of Git/browser; use platform secret stores. Make DB migrations additive; preserve production data. No destructive action without approval.
- Edit canonical source/builders, not generated `dist/`. Use a focused feature branch and reviewable PR, not direct destructive pushes to main.
- Run build, unit tests, structural/security validator and internal-link audit where applicable; add tests and report commands that could not run.
- Verify changed routes/API states, mobile/accessibility, provider freshness/licensing, or RLS according to the Part.
- Complete unblocked work; missing credentials/licenses remain explicitly `NOT CONFIGURED`.
- Never claim a test, deployment or completion without observed evidence.

**Execution:** Read this file fully, inspect the repository and execute only the named Part. Return changed paths, test commands/results, branch/commit/PR, blockers and acceptance checklist. Stop after this Part.
