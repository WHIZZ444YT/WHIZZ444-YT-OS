# 00 · Repository audit

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Pin HEAD and identify generator ownership, canonical routes, data rights gates and verification gaps. Rebuild in a disposable checkout; compare clean standard/cutover manifests, source/compiled artifact differences, and current remote deployment evidence. Compare issue #55–58 against public search and links; none is a confirmed provider outage.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Doc 00 execution record

Audited on 26 November 2026 (IST). Default branch `main` was pinned to [`70405ba8569807e098b3af45924dac912fbc4bb5`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/70405ba8569807e098b3af45924dac912fbc4bb5), the merge of the 30-document blueprint. The [recursive tree](https://api.github.com/repos/WHIZZ444YT/WHIZZ444-YT-OS/git/trees/70405ba8569807e098b3af45924dac912fbc4bb5?recursive=1) returned 684 entries with no truncation. The prior pinned evidence below records the blueprint's source baseline and is retained for comparison.

| Check | Result and evidence |
|---|---|
| Standard and cutover builds | Both passed in the [quality run for the pinned SHA](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45767032231). |
| Python, Node and structural tests | Both matrix jobs passed Python, Node, release version and structural checks. Standard logs reported 76 Python tests and 123 Node tests. |
| Links and reproducibility | Both modes passed link/anchor audits, clean artifact reproducibility and exact ICT watch-URL checks. Standard reported 14,985 checked links across 461 HTML files with zero issues. |
| Responsive browser | Standard mode failed [Chromium's horizontal overflow assertion](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/70405ba8569807e098b3af45924dac912fbc4bb5/scripts/check_public_ui.mjs#L98) for `/status/` at 851 px. This is a separate release follow-up from the open Academy issues. |
| Standard/cutover parity | CI skipped the explicit parity comparison after the browser failure. Both builds passed independently. Git and archive download could not resolve GitHub locally, so a disposable local checkout and parity rerun remain outstanding. |
| Vercel | Deployment metadata for the exact SHA reports **READY**, environment **production**. [Deployment URL](https://finance-intelligence-fbt2yxele-whizz444yt-7353.vercel.app/). The [live route manifest](https://finance-intelligence-os-whizz444yt-7353.vercel.app/route-manifest.json) returned 200, reported the same SHA and standard mode, and listed 461 routes. Status, Data Health, Search and both C17 paths returned 200. Browser behavior and upstream data availability require separate checks. |
| Worker and Supabase | Worker and migration contracts are present in source. Production Worker provider freshness, actual credentials, applied migrations and RLS behavior remain unverified. |

### Current source inventory and boundaries

- **Runtime ownership** — [Python shell and page generator](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/70405ba8569807e098b3af45924dac912fbc4bb5/scripts/build_site.py), [public futures pages](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/70405ba8569807e098b3af45924dac912fbc4bb5/scripts/build_public_futures.py), [route manifest](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/70405ba8569807e098b3af45924dac912fbc4bb5/scripts/build_route_manifest.py), [edge dispatcher](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/70405ba8569807e098b3af45924dac912fbc4bb5/cloudflare/src/index.js), [migration source](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/70405ba8569807e098b3af45924dac912fbc4bb5/supabase/migrations). The audit adds no runtime endpoint, page, key, migration or provider.
- **Compiled artifact drift** — The tracked `dist/` blobs differ from their source copies for `assets/academy-learning.css`, `assets/account.js`, `assets/data-health.js`, `assets/futures-intelligence.js`, `assets/news-page.js`, `assets/overview-dashboard.js`, `assets/risk-calculator.js`, `assets/sessions-page.js`, `assets/site-shell.css`, `assets/site-shell.js`. Clean generated artifacts are the baseline for route and UI checks.
- **Active families (15)** — `NQ` (CME, `CME_MINI:NQ1!`), `ES` (CME, `CME_MINI:ES1!`), `GC` (COMEX, `COMEX:GC1!`), `6E` (CME, `CME:6E1!`), `6B` (CME, `CME:6B1!`), `YM` (CBOT, `CBOT_MINI:YM1!`), `RTY` (CME, `CME_MINI:RTY1!`), `DX` (ICE US, `ICEUS:DX1!`), `ZN` (CBOT, `CBOT:ZN1!`), `CL` (NYMEX, `NYMEX:CL1!`), `6J` (CME, `CME:6J1!`), `6A` (CME, `CME:6A1!`), `6C` (CME, `CME:6C1!`), `SI` (COMEX, `COMEX:SI1!`), `BTC` (CME, `CME:BTC1!`). Chart IDs are continuous-series mappings from the [active registry](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/70405ba8569807e098b3af45924dac912fbc4bb5/ict-futures/data/market-universe.json). Listed contract dates, exchange permissions and widget coverage require separate evidence.
- **Worker route inventory** — `/api/v1/builder/models`, `/api/v1/cms/`, `/api/v1/cot`, `/api/v1/economic/`, `/api/v1/economic/history`, `/api/v1/economic/providers`, `/api/v1/events`, `/api/v1/events/bea`, `/api/v1/events/boc`, `/api/v1/events/boe`, `/api/v1/events/cftc`, `/api/v1/events/ecb`, `/api/v1/events/eia`, `/api/v1/events/fomc`, `/api/v1/events/rba`, `/api/v1/futures-observations`, `/api/v1/health`, `/api/v1/ingest`, `/api/v1/ingest/futures-market-data`, `/api/v1/macro`, `/api/v1/macro/funding`, `/api/v1/market-data/status`, `/api/v1/news`, `/api/v1/news/sources`, `/api/v1/prediction/`, `/api/v1/prediction/kalshi`, `/api/v1/prediction/polymarket`, `/api/v1/providers`, `/api/v1/volume-open-interest`. Trailing-slash entries represent dispatch prefixes. The worker also has the legacy `/health` alias and handles preflight. The two ingestion routes are protected POSTs. Existing routes are evidence of code capability only.
- **Migrations** — 15 checked-in migrations cover the initial registry and workspace, profile setup and access restrictions, economic observations and ingest history, lesson progress, strategy runs/trades, workspace notes/alerts and indexes, richer COT records, and entitlement-scoped futures observations. See the [pinned migration history](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/70405ba8569807e098b3af45924dac912fbc4bb5/supabase/migrations).
- **Data rights gates** — Keep the approved lifecycle snapshot separate from futures observations. The observation read path requires an active entitlement scoped to provider, venue, family and delay. Confirm display, caching, persistence and export independently in Doc 01.

### Open issue triage at the audited SHA

| Issue | Scope and disposition |
|---|---|
| [#55](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/issues/55) | The production search HTML embeds the legacy C17 target. Preserve the compatibility target while coordinating canonical routes with existing Academy work. |
| [#56](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/issues/56) | The production search HTML lacked the reported sample video ID. The issue tracks video, podcast and mentor records. Existing Academy/search workstream owns the follow-up. |
| [#57](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/issues/57) | Both production C17 pages returned 200 and declared their respective URLs canonical. Track as SEO/route ownership, independent of provider availability. |
| [#58](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/issues/58) | Tutorial lesson-link overflow at 320 px. This is distinct from the confirmed `/status/` failure at 851 px. |

Doc 01 can use the pinned source and issue inventory to review provider terms. Production activation remains gated on the failed responsive check, explicit parity evidence, live provider checks and the applicable owner authorization.

## Repository audit evidence and gaps

**Status** — Execution evidence recorded above. The responsive gate, explicit parity and upstream production checks are outstanding.

- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)
- [`scripts/build_route_manifest.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_route_manifest.py)
- [`docs/ARCHITECTURE.md`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/ARCHITECTURE.md)

The gap to close is defined by this acceptance condition: Record current SHA, all active families, existing endpoints, migrations, and open issues. Classify presence separately from live results.

## Website behavior and placement

**Routes** — /docs/

```text
1. Audit summary
2. route map
3. gaps
4. verification evidence
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — See the existing Worker gateway map in Doc 02. This foundation workstream adds no public URL unless explicitly specified. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Exercise this workstream using existing local and preview tools. No new automated upstream connection is required.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Audit and reuse the existing store and role model. Any persistence requires Doc 04 and explicit dataset-level approval.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

## Pinned evidence

Default branch `main`, [audited commit](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/e791f37da39209f3ac6c50ebf2f960101f618efb), checked 26 November 2026 (IST). The GitHub recursive tree was complete (648 entries including directories). [Full inventory at pinned tree](https://api.github.com/repos/WHIZZ444YT/WHIZZ444-YT-OS/git/trees/e791f37da39209f3ac6c50ebf2f960101f618efb?recursive=1).

| Area | Tracked files |
|---|---:|
| `(root)` | 18 |
| `.github` | 6 |
| `assets` | 40 |
| `cloudflare` | 9 |
| `data` | 5 |
| `dist` | 231 |
| `docs` | 73 |
| `futures-intelligence` | 1 |
| `ict-futures` | 106 |
| `ict-lab` | 10 |
| `integrations` | 2 |
| `legacy` | 21 |
| `scripts` | 21 |
| `supabase` | 19 |
| `tests` | 18 |

- Checked Python generators, JS consumers, runtime configuration, Worker route dispatcher and adapters, Supabase migration source and GitHub workflow definitions. This is a source audit. Live Cloudflare, Vercel and Supabase bindings remain unverified, and the local clone attempt was blocked by DNS in the execution environment.
- Vercel builds Python-generated static `dist/` with `scripts/build_site.py`. Inspect source generators over compiled copies. The tracked dist and source differ for dashboard, news and data health assets. Compare a clean build and route manifests rather than assuming the tracked dist represents current routes.
- `scripts/build_public_futures.py` owns Charts, Desk brief and terminal bookmarks. `build_route_manifest.py` groups generated HTML routes and anchors, preserving terminal fragments and ICT Lab aliases. `sw.js` caches the public home and allowlisted shell assets only, skipping cross-origin requests and queries.
- Existing source-rendered research routes include /, /futures-intelligence/, /markets/, /charts/, /macro/, /sessions/, /news/, /research/positioning/, /volume-open-interest/, /contract-specs/, /sources/, /data-health/, /strategy-lab/ and /status/. /research/ currently forwards to /sources/. Legacy /prediction-markets/ forwards home. Existing Academy, Entry Models, private account and risk are outside implementation scope except compatibility.
- Worker `src/index.js` owns /api/v1 and schedules refreshNews plus scheduledEconomicIngestion through the 30-minute cron and SNAPSHOTS KV. `economic-providers.js` adds BEA/EIA/FRED, Treasury Fiscal Data and ECB. Calendar adapters, COT, GDELT/news policy, provider HTTP and futures entitlement contracts have separate modules. See Docs 02–04 for routes and schema.
- Quality and tagged release workflows build, validate and compare route parity. Worker live smoke is manually dispatched. Reviewed GitHub open issue search returned [#55–58](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/issues) around Academy search, canonicals and mobile UI. Account/hosting runtime verification is still required.
- Cross-check [futures-only roadmap](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/futures-only-roadmap), [market improvements](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/futures-market-improvements), [UI/UX improvements](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/ui-ux-feature-improvements) and [ICT Lab](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/ict-lab). Do not treat older notes asserting absence as overriding implemented source.

```python
NAV_GROUPS = [
    ('WORKSPACE', ['Overview', 'Search']),
    ('LEARN', ['ICT Academy', 'Entry Models']),
    ('MARKETS', ['Futures Markets', 'Markets', 'Charts', 'Contract Specs & Expiry']),
    ('RESEARCH', ['Futures News', 'Macro', 'COT & Positioning', 'Volume & Open Interest', 'Data Health & Sources']),
    ('TOOLS', ['Sessions & Calendar', 'Strategy Lab', 'Risk & Prop Firms', 'Journal practice']),
    ('ACCOUNT', ['Journal & Watchlists']),
]
```

## Future file changes and implementation sequence

**Dependencies** — None. Establish the baseline here.

**Existing files** — scripts/build_site.py, scripts/build_route_manifest.py, docs/ARCHITECTURE.md.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Rebuild in a disposable checkout; compare clean standard/cutover manifests, source/compiled artifact differences, and current remote deployment evidence. Compare issue #55–58 against public search and links; none is a confirmed provider outage.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Record current SHA, all active families, existing endpoints, migrations, and open issues. Classify presence separately from live results.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [x] Production standard route manifest and representative compatibility URLs checked.
- [ ] Explicit standard/cutover parity passed.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 00 (Repository audit) on the existing repository stack and reuse the named source owners. Prioritize pin HEAD and identify generator ownership, canonical routes, data rights gates and verification gaps. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
