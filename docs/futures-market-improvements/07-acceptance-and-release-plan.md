# 07 · Acceptance and release plan

## Test matrix

| Area | Required evidence |
|---|---|
| Curriculum | Exactly one record per C01–C56 and P01–P10; 10 concept modules; six ordered practice IDs 11–16; 10 approved mentors, nine full episodes and two excerpts; catalog counts match page/search counts |
| Assignment | C53 in 05, C54/C56 in 06, C55 in 07, C51/C52 in 08. Validate the one-to-many Academy crosswalk and all related links |
| Public accessibility | Direct unsigned access from home, one phone-width and one desktop breakpoint, light/dark, keyboard-only navigation, skip and focus order, focused drawer/Escape, semantic headings, screen-reader labeling and reduced motion |
| Navigation | Test direct loads and refreshes of C/P/lab pages and legacy Academy paths; all terminal hash targets after standalone renderer retirement; legacy Lab query URLs; Back/Forward after search; alias cases FVG, iFVG/IFVG, MSS, BSL, CBDR and OSOK; no-JavaScript written detail; useful unknown-ID behavior |
| External media | Validate exact watch IDs and supplied chapter seconds. Record published title, channel, language, role, duration, availability, embed test, check date and per-placement coverage for each resource. Check direct playback and requested chapter meaning. Verify desktop/mobile fallback with embed blocked/declined and a removed mock |
| Labs | 11 annotate with keyboard and compare reference; 12 verify ET/IST winter, summer and DST transitions; 13 save-first, stale retry, refresh and swing-right-bar scenarios; 14 deterministic cost/manifest and held-out split; 15 invalid stops, fees and zero quantity; 16 trade/no-trade, export/import idempotency and owner isolation |
| Evidence and privacy | Sample labels and chart metadata; forex/futures source classification; private attachments inaccessible to a second user; no account content in sitemap/search; no secret in artifact |
| Production | Snapshot deployed Git SHA and alias, crawl internal routes and capture HTTP outcomes. Open representative views in the deployed browser. Prove the old terminal entry no longer loads its old renderer and check stale service-worker clients during cutover. Check private flows via dedicated test accounts and record any independent Worker rollout evidence |

Baseline commands are defined in [Quality](../../.github/workflows/quality.yml) and [Release](../../.github/workflows/release.yml). Run the existing Python build and unit tests, Node tests, `scripts/validate.py` and `scripts/audit_internal_links.py`. Extend checks for generated Lab HTML and client-only legacy URLs. Normal internal link traversal cannot prove query-state correctness or external media playback.

## Additional cutover gates

- Attach before/after route and UI evidence. Include anonymous links to Charts, Sessions, Journal practice and Lab without a terminal or login hop.
- Run approval-state and invalid-month fixtures on import, build and full validators. Check artifact parity from a clean build and confirm deployment tracks the reviewed SHA.
- Exercise offline fallback with clean, stale and previously installed service-worker states. Keep app/account data uncached and check shared-device sign-out behavior.
- Measure the [design and accessibility targets](08-public-ui-and-repository-presentation.md) on actual components in both themes.

## Video verification protocol

1. Enumerate unique video IDs and all placements from the [catalog](03-ict-curriculum-and-video-catalog.md), Academy and terminal. Record which lesson uses which offset.
2. Check publisher metadata from an official watch page or YouTube API. Use a browser to confirm playback, exact chapter content and deployed embed behavior where permitted. `status.embeddable` is a distinct metadata field. [YouTube video fields](https://developers.google.com/youtube/data/reference/rest/v3/videos)
3. Keep the supplied watch URLs with their original offsets. Embedded start time is a separate player parameter. Confirm captions/keyboard controls and relevant direct fallbacks. [YouTube embed behavior](https://support.google.com/youtube/answer/171780?hl=en)
4. In the gap report, identify affected lesson ID, video ID, reason, whether a usable direct link remains, alternate and next owner. Treat unchecked, temporarily blocked, embed-disabled and confirmed unavailable as different states. Only record a check date alongside an actual observation.

## Release and rollback

1. Review the docs commit independently of implementation. When implementation is authorized, compare the generated route and content manifests to the baseline and attach quality output to the build PR.
2. Check the Vercel Preview using the existing GitHub workflow. Validate canonical origin, robots and sitemap settings and ensure public routes have public read access in production.
3. Merge only when route parity, media evidence and practice gates have signed-off results or explicit tracked release decisions. Match the production deployment's Git SHA to the reviewed commit and open anonymous deep links on the real alias.
4. Roll back using the previously verified Vercel deployment if public pages regress. Treat Cloudflare Worker rollout separately. Keep migrations additive and use compatible readers and exports so a frontend rollback preserves user records.
5. Archive the link report, per-device screenshots, route map, unresolved video IDs and release scope in the implementation PR.
