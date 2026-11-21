# 02 · Public website and terminal migration

## Target state

One public application shell owns every learning, research and tools screen. Port terminal functionality into that shell, including advanced charts. Remove the current standalone terminal renderer after parity. Keep `/ict-futures/` as a lightweight compatibility page and preserve nested Academy and market URLs. Public tool pages can be opened without an account. A sign-in protects synced journals, attachments and personal records.

## Terminal-to-public parity matrix

| Legacy entry under `/ict-futures/` | Public destination | Behavior that must migrate before removal |
|---|---|---|
| Base URL, `#top`, `#dashboard` | `/` for dashboard; `/futures-intelligence/` for desk | Quick navigation, data status, ET/IST reference and useful market context |
| `#daily-brief` | `/futures-intelligence/#daily-brief` | Contract and horizon selection, provenance, stale/empty states and brief content |
| `#markets`, `#market-profile` | `/markets/` and existing `/ict-futures/markets/{id}.html` | Family/tier filters, exact market routes, session notes, research links, model fit and contract selection |
| `#charts` | Proposed `/charts/` in the public shell | Contract, interval and comparison controls, explicit TradingView load, direct chart fallback, no claim of live computed SMT |
| `#learning`, `#academy` | `/ict-lab/learn/`, `/academy/` | Terminal featured official uploads, learning paths, source notes, search, progress and all existing Academy lesson/tutorial links |
| `#playbook` | `/ict-lab/playbooks/`, `/entry-models/` | Concept quick reference, terminal model variants and established market/model link targets |
| `#sessions`, `#calendar` | `/sessions/#windows`, `/sessions/#calendar`, Practice 12 | Session windows, heat map conventions, date-aware ET/IST, publisher calendar and private manual reminders |
| `#news`, `#social`, `#positioning`, `#sources` | `/news/`, `/sources/`, `/research/positioning/` | Market filters, snapshot times, public social discovery with attribution, COT context and provider links |
| `#risk` | `/risk/`, Practice 15 | Shared fixed-point calculation, provenance and conditional risk status, symbol context |
| `#journal` | Practice 16, `/account/` | Public local practice, legacy checklist/import/export, sign-in for owner-scoped records, review metrics |
| Existing Lab `?view=&id=&q=` | Five public views under `/ict-lab/`; example `/ict-lab/learn/c01/` | Preserve recognized stable C/P IDs, practice IDs, query search state and safe unknown-item fallback |

Proposed fragments and paths in this table require implementation. Establish any more real fragment/link destinations in the baseline crawl, including mobile and terminal global-search results. The source terminal accepts an allowlisted `?market=` preset. Preserve it where destination behavior supports it and provide a market landing page for a recognized preset with no specific hash.

## Compatibility contract

- The old base page renders links for visitors with JavaScript disabled. A small client dispatcher reads fragments and recognized market parameters, maps them to same-origin public destinations and uses history replacement for direct legacy bookmarks. A server redirect without a fragment-aware destination has insufficient context. Decode and validate once. Unknown values and any off-origin data go to a safe public index with visible links.
- Do not blanket-redirect the path prefix. Existing `/ict-futures/academy/*.html`, `/ict-futures/academy/tutorials/`, `/ict-futures/markets/*.html` and any still-referenced assets/data are separate dependencies. Link one canonical page per duplicate concept and keep bookmarked Academy details readable.
- Avoid duplicate nav and render bundles. After parity, the base compatibility document ships only the shared shell or minimal links, route map and dispatcher. No terminal-only dashboard, Academy, journal or chart code initializes there.
- Port existing session/market state before removing old controls. Keep local journal, reminders, checklist, theme and Academy progress readable. Provide idempotent preview/import, reconcile duplicate records and keep private account state intact. Never auto-upload a browser journal.
- Include Back/Forward tests for real public navigation and redirected bookmarks. A failed or unsupported move presents a public index instead of leaving a browser history loop. Preserve the previous Vercel deployment until compatibility tests and cache-eviction checks pass.

## Cutover order

1. Inventory actual hrefs, fragments, query values, owners, data keys and visible behavior. Take screenshots and route traces.
2. Add public content and tool routes in parallel with catalog normalization. Share chart, calendar, risk, replay and account logic. Verify public feature parity and URL compatibility.
3. Change links and search targets on the main site. Turn the old base page into the compatibility dispatcher. Exclude it from primary navigation and search results.
4. Delete the standalone renderer and scoped service-worker registration only as part of the reviewed migration. Keep legacy route fixtures and tested cache transition. Remove unused CSS/data only after checking dependent public routes.
5. Verify the deployed deep links on an anonymous mobile and desktop browser. If critical parity fails, restore the previous Vercel deployment while preserving migrated and legacy records.
