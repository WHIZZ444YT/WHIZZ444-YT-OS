# 22 · UI, UX and navigation

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Fit new destinations into existing shell and mobile navigation. Group new Energy/Global under Macro, Reports under Research, Setup under Data Health. Keep Agriculture optional. Generate search, sitemap, canonical and route manifest only for enabled public routes. Preserve bookmarks, Academy and account routes.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — The shared sidebar and search directory list Energy and Global under Macro, Reports under Research and Integration Setup under Data Health. Agriculture uses the same build flag for navigation, search, page generation and sitemap. The route manifest follows generated output. On mobile without JavaScript, Browse public pages opens the static search directory.

- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)
- [`scripts/build_route_manifest.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_route_manifest.py)
- [`assets/site-shell.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/site-shell.js)
- [`assets/site-shell.css`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/site-shell.css)

The gap to close is defined by this acceptance condition: Test mobile 320/390px, 768px and desktop, focus order, reduced motion, theme, keyboard, browser back/deep links and no JS.

## Website behavior and placement

**Routes** — All listed public routes

```text
1. Desktop groups or mobile drawer
2. route title and filters
3. content
4. source
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `tradingview` · TradingView | Hosted market widgets | [Official documentation](https://www.tradingview.com/widget-docs/faq/data/) · [Endpoint or reference](https://www.tradingview.com/widget/) | Hosted embed; no site API key | Conditional display via provider-generated embed only; exclude extraction, caching, export and analytics reuse | Test exact widget/symbol/venue/timeframe in preview. Label continuous and delay state. Direct links remain available. |

**Site API** — No new API. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — None. Route shell only.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [05 · Overview and Futures Desk](../markets/05-OVERVIEW-AND-FUTURES-DESK.md) · [06 · TradingView charts and widgets](../markets/06-TRADINGVIEW-CHARTS-AND-WIDGETS.md) · [07 · Markets and contract intelligence](../markets/07-MARKETS-AND-CONTRACT-INTELLIGENCE.md) · [08 · Volume, OI and market data](../markets/08-VOLUME-OI-AND-MARKET-DATA.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md) · [10 · Futures news and RSS](../research/10-FUTURES-NEWS-AND-RSS.md) · [11 · US macro intelligence](../research/11-US-MACRO-INTELLIGENCE.md) · [12 · Treasury and Fed intelligence](../research/12-TREASURY-AND-FED-INTELLIGENCE.md) · [13 · Energy intelligence](../research/13-ENERGY-INTELLIGENCE.md) · [14 · Global macro and liquidity](../research/14-GLOBAL-MACRO-AND-LIQUIDITY.md) · [15 · CFTC COT and positioning](../research/15-CFTC-COT-AND-POSITIONING.md) · [16 · Agriculture intelligence](../research/16-AGRICULTURE-INTELLIGENCE.md) · [17 · Reports and publications](../research/17-REPORTS-AND-PUBLICATIONS.md) · [18 · Data health and source directory](../platform/18-DATA-HEALTH-AND-SOURCE-DIRECTORY.md) · [19 · Integration setup and admin](../platform/19-INTEGRATION-SETUP-AND-ADMIN.md) · [21 · Historical data and Strategy Lab](../platform/21-HISTORICAL-DATA-AND-STRATEGY-LAB.md)

**Existing files** — scripts/build_site.py, scripts/build_route_manifest.py, assets/site-shell.js, assets/site-shell.css.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Group new Energy/Global under Macro, Reports under Research, Setup under Data Health. Keep Agriculture optional. Generate search, sitemap, canonical and route manifest only for enabled public routes. Preserve bookmarks, Academy and account routes.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test mobile 320/390px, 768px and desktop, focus order, reduced motion, theme, keyboard, browser back/deep links and no JS.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 22 (UI, UX and navigation) on the existing repository stack and reuse the named source owners. Prioritize fit new destinations into existing shell and mobile navigation. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
