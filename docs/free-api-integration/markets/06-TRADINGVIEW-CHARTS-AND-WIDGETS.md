# 06 · TradingView charts and widgets

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Support approved display widgets with source links and responsive behavior. Retain chart market/comparison/interval query state and consent-like Load previews action. Load one chart per selected slot, clean it up on selection/theme changes, and label continuous series and delay. Use vendor-generated snippets only after per-widget preview checks.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`scripts/build_public_futures.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_public_futures.py)
- [`assets/public-charts.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/public-charts.js)
- [`vercel.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/vercel.json)
- [`ict-futures/data/market-universe.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/ict-futures/data/market-universe.json)

The gap to close is defined by this acceptance condition: Test no-JS direct link, blocked frame, light/dark, 320px, unsupported DX and unchecked coverage. Keep credit intact.

## Website behavior and placement

**Routes** — /charts/; /; /markets/; /futures-intelligence/

```text
1. Market and interval
2. Load previews
3. primary/comparison chart
4. direct chart and contract links
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — No Worker API. Provider-generated hosted widget and direct HTTPS chart links. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — On explicit load, resolve the selected family and display a provider-hosted widget. Keep the direct provider link visible.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — None. Widget data remains with provider.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Widget and link plan

| Widget | Placement and decision |
|---|---|
| Advanced Chart | /charts/ primary and optional comparison; use supported embed settings and existing market rows. |
| Ticker Tape | Home after heading; pilot NQ, ES, GC, CL only after exact coverage checks. |
| Symbol Overview / Mini Chart | Optional on Markets profile or Desk, choose one per placement after confirming venue support. |
| Market Overview / Market Data | Optional Markets research panel; favor one grouped panel, named exchange labels and direct market links. |
| Symbol Info | Optional Markets profile; exchange specs link remains authoritative for tick, expiry and delivery. |
| Technical Analysis | Reference only or omit by default. Keep third-party ratings out of ICT decision surfaces. |
| Economic Calendar | Optional supplemental hosted display on Sessions; existing issuer calendar remains canonical. |
| Top Stories | Optional link/embed only when supported; canonical news feed remains /news/. |
| Forex Cross Rates / Heatmap | Optional global macro context, labeled FX, never represented as currency futures. |
| Futures screener | Reference-only unless exact widget and venue coverage exist in the current catalog. |
| Equity-market context | Optional external reference or display widget, clearly labeled equity context and kept separate from exchange-listed futures. |

Use official widget catalog and generated embed modes (iframe or vendor script/web component as documented per widget). Inspect frame-src/script-src/connect-src domains in preview and narrow CSP after report-only tests. Use a stable aspect ratio for small cards and a responsive chart with keyboard-accessible controls, descriptive titles and reserved minimum height. Respect theme setting, show unsupported/delay-unconfirmed states, and keep provider links available before mount and after timeout. Exact widget symbols are candidates from Doc 07 until checked. [Widget catalog](https://www.tradingview.com/widget-docs/) · [Data coverage](https://www.tradingview.com/data-coverage/) · [Widget data FAQ](https://www.tradingview.com/widget-docs/faq/data/).

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md)

**Existing files** — scripts/build_public_futures.py, assets/public-charts.js, vercel.json, ict-futures/data/market-universe.json.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Retain chart market/comparison/interval query state and consent-like Load previews action. Load one chart per selected slot, clean it up on selection/theme changes, and label continuous series and delay. Use vendor-generated snippets only after per-widget preview checks.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test no-JS direct link, blocked frame, light/dark, 320px, unsupported DX and unchecked coverage. Keep credit intact.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 06 (TradingView charts and widgets) on the existing repository stack and reuse the named source owners. Prioritize support approved display widgets with source links and responsive behavior. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
