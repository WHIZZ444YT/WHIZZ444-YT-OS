# 02 · Home and Search

Routes: / and /search/. Owners: [home markup](../../../index.html), [dashboard data and auth summary](../../../assets/overview-dashboard.js), [public search](../../../assets/public-search.js), [search builder](../../../scripts/build_public_futures.py).

| Priority | Current evidence | Required improvement |
|---|---|---|
| P1 | Home shows a market selector, a quote placeholder and a feed row that restate lack of licensed quotes. The selector is a reference family, while the heading says Market watchlist. | Keep the family selector and clear contract context. Rename the feature Market snapshot or add an actual saved watchlist only inside Account. Show one compact quote-availability message beside the affected field. |
| P1 | Home and Desk both offer a market starting point and provider context. Home also requests an authenticated summary when a session is available. | Keep Home as task launcher and brief public snapshot. Put investigation in Desk and private summaries behind the signed-in workspace. Preserve the Account session and do not remove an auth path until other callers are accounted for. |
| P2 | Home has topbar Search plus a search form and several learning shortcuts. Multiple entries serve different devices, but can look equally prominent. | Retain one full search entry and a compact responsive shortcut. Give Start learning and Open Futures Desk priority. Put resume or recent links in one grouped strip, with an empty state when no local progress exists. |
| P1 | Global search and Lab search have different scopes. | Label scopes and result destinations. Group global results into Markets, Lessons, Tools and Sources. Include genuine distinct Academy and Lab results, with one preferred result where the crosswalk confirms equivalence. |

## Build and verify

1. Map homepage sections by single user intent. Keep hero, two actions, market snapshot and next actions. Move diagnostics to Data Health. Link to source details instead of repeating the whole widget.
2. Reuse the existing query route and crosswalk. Retain the query on reload and Back. Add clear search, no results, one result and result-count states. Private records must stay out of the public index.
3. Test aliases NQ, FVG, IFVG, MSS and COT, keyboard submit, stale provider fallback, readable empty state and unsigned landing. Compare first-screen screenshots on phone and desktop. Require one H1 and named form controls.
