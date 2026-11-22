# Release and production sign-off checklist

## Code and release
- [ ] Confirm the feature PR has been merged into main.
- [ ] Confirm GitHub Actions quality gates are green on the merge commit.
- [ ] Confirm package.json, homepage badge and Service Worker cache use the same version.
- [ ] Create the matching vX.Y.Z tag only after version consistency checks pass.
- [ ] Confirm the tag-triggered workflow publishes a GitHub Release.

## Vercel
- [ ] Confirm latest production deployment is Ready and linked to the expected main commit.
- [ ] Confirm canonical SITE_URL matches the public production alias.
- [ ] Confirm Production is publicly accessible and Preview remains protected.
- [ ] Open every primary route and check for missing assets, 404s and client-side errors.
- [ ] After frontend deployment, verify Sessions & Calendar shows per-source freshness, partial/unavailable states, timezone conversion, date-only FOMC entries and official source links; confirm the route does not claim complete global coverage.
- [ ] Verify Speed Insights after real visitor traffic is collected.

## Cloudflare
- [x] Confirm Worker 2.0.0, KV namespace and 30-minute Cron are deployed; query-string redaction is enabled (19 November 2026).
- [ ] Review and validate the current Worker branch before deployment. It reports version 2.1.0 and includes the COT compatibility fixes plus separate BLS, EIA, CFTC-schedule and FOMC-date routes; these are not in production Worker 2.0.0 yet.
- [ ] Configure server-side secrets in Cloudflare only; never commit them.
- [x] Smoke-test the existing production site's no-search COT snapshot after the bounded Worker update; the TFF futures-only UI showed a fresh response with position date 10 November 2026 (19 November 2026).
- [ ] After approved deployment, test `/health`, `/api/v1/providers`, news, macro, filtered and unfiltered COT variants, both Legacy schemas, and `/api/v1/events`, `/api/v1/events/eia`, `/api/v1/events/cftc`, `/api/v1/events/fomc` individually; verify ingestion logs, cache/stale behavior and Supabase upserts after a real configured run.

## Supabase
- [x] Confirm all repository migrations are applied to the active project; local migration filenames match remote history.
- [x] Confirm RLS and security/health advisors are clean (19 November 2026). Two-user runtime isolation remains a separate test below.
- [ ] Test a real user signup, confirmation, login, logout and cross-device session refresh.
- [ ] Test owner-scoped journal, watchlist, notes, alert and lesson-progress reads/writes.
- [x] Apply and verify `20261119125110_complete_private_workspace_records` and `20261119125044_add_cot_report_observations` on the active production project (19 November 2026).
- [ ] Deploy the `delete-account` function with exact `APP_ORIGIN` and server-only Supabase Auth secrets; verify reauthentication, attachment cleanup and account deletion with disposable test users.
- [ ] Keep `accountDeletionEnabled: false` until the deployed deletion workflow passes disposable-user verification; enable the public UI flag only as part of that verified release.
- [ ] Run two-user RLS checks for select/insert/update/delete across every private entity and test a forged foreign record ID.
- [ ] Export a test workspace with more than one page of records and private chart files; verify round-trip JSON and no cross-user objects.
- [ ] Test offline Academy progress retry, session refresh, expired watchlist/alert state and alert duplicate suppression with dedicated accounts.
- [ ] Reconcile the 15 imported contract specifications against official exchange sources.

## Market-data boundaries
- [ ] Do not describe cached public snapshots as real-time exchange data.
- [ ] Do not publish a futures strategy performance ranking without reproducible OOS evidence.
- [ ] Confirm data source licensing and redistribution rights before exposing exchange feeds.

## Public UI evidence for v1.1.0

- [ ] Record the reviewed commit and preview URL.
- [ ] Review Home, Learn, C34 and Charts at 320, 360, 390, 768, 1280 and 1440 CSS px in both themes, with a 200% zoom check.
- [ ] Record keyboard focus, drawer return, phone touch targets and reduced motion outcomes.
- [ ] Archive dated screenshots and the mobile Lighthouse report when field measurements are unavailable. Report LCP and CLS as lab observations and keep field INP pending unless field data exists.
