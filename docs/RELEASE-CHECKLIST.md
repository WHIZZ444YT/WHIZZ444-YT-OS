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
- [ ] Verify Speed Insights after real visitor traffic is collected.

## Cloudflare
- [ ] Confirm Worker source version, KV namespace and 30-minute Cron are deployed.
- [ ] Configure server-side secrets in Cloudflare only; never commit them.
- [ ] Test /health, /api/v1/providers, news, macro and COT endpoints.
- [ ] Verify ingestion logs, provider freshness and Supabase upserts after one real run.

## Supabase
- [ ] Confirm all repository migrations are applied to the active project.
- [ ] Confirm RLS and security advisors remain clean.
- [ ] Test a real user signup, confirmation, login, logout and cross-device session refresh.
- [ ] Test owner-scoped journal, watchlist, notes, alert and lesson-progress reads/writes.
- [ ] Apply and verify `20261119190000_complete_private_workspace_records` before serving the updated account UI.
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
