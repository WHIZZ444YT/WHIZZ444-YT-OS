# 06 · Futures backlog and build order

The [prior roadmap](../futures-only-roadmap/README.md) and its [remaining-work report](../futures-only-roadmap/27-IMPLEMENTATION-STATUS-AND-REMAINING-WORK-2026-11-20.md) are the basis for this backlog. Use current deployment and data evidence against each release gate.

| Prior scope | Open work carried forward | Acceptance dependency |
|---|---|---|
| Parts 0–1 · Baseline and shell | Public/terminal route inventory, duplicated navigation, UTF-8, contrast, mobile spacing, keyboard flow and production URL parity | Main+preview route manifest and full-site UI review |
| Part 2 · Academy | Reconcile 82 legacy pages with the 56 Lab IDs, 10 tracks, nine existing tutorials and current source gaps. Review exact links including four Entry Models without verified mappings | Editorial/video verification and stable route crosswalk |
| Part 3 · Contracts | Finish the 15-family lifecycle inventory, expiry/first-notice and roll rules, contract-month validation and rights-gated publication | Owner-approved public-display entitlement, exact expiry records and tests for approved/unconfigured fixtures. Recheck lifecycle importer changes on the latest code |
| Part 4 · Calendar | Expand official exchange holiday/product hours and global economic schedules; distinguish date-only, missing and denied releases; verify time display on selected dates | Issuer evidence, source freshness checks and modeled ET/CME hours. Recheck separate Cloudflare production traffic and candidate |
| Part 5 · Gateway and news | Verify credentials and quotas, timeouts/backoff and ingestion on authorized data. Track source time, retrieval time and stale fallback | Provider entitlements and server-only credentials, plus dated live smoke results |
| Part 6 · Volume/OI/COT | Complete approved exchange observations and persistence. Retain weekly CFTC aggregation and distinct dataset variants | Rights approval, verified contract crosswalk, ingestion/db-write configuration and null/coverage semantics |
| Part 7 · Strategy | Encode versioned, testable rules and produce reproducible cost-aware ICT examples with out-of-sample splits | Causal rule fixtures, exact contract and licensed or clearly synthetic dataset |
| Part 8 · Risk | Verify tick references and effective dates. Source the exact prop-firm plan, drawdown conditions and lifecycle | Exchange documentation and current dated official program terms |
| Part 9 · Private workspace | Complete disposable-user Auth/RLS, attachments, offline merge, export, restore and account deletion QA | Two isolated test accounts and controlled test storage. Keep current deletion gate until its full test matrix passes |
| Release and operations | Test Vercel navigation, Worker candidate/production states, provider degradation, retention and rollback separately | Green quality gates, recorded deployment IDs, matching source commit and smoke output |

## Implementation packages

| Package | Change set | Depends on | Exit evidence |
|---|---|---|---|
| A · Route baseline | Snapshot routes, hash/query variants, sources, data keys, Vercel commit and current screenshots; lock source catalog revision | Approved docs | Route manifest and baseline evidence |
| B · Public shell and navigation | Add static Lab home and five views in shared shell. Make education, research and tools accessible in the public header or drawer | A | Direct links, fallback and keyboard/mobile smoke |
| C · Content and crosswalk | Normalize curriculum, map legacy lessons/Entry Models, add missing examples and rules, deduplicate media and assign source roles | A | ID and link gates, catalog diff, educator review |
| D · Practice | Implement six guided public modules with shared replay evidence, sizing/strategy logic, local persistence and optional private sync | A plus B routing, C rule IDs | Six scenario sheets and failure-path tests |
| E · Terminal extraction | Cut over full content to public pages and publish advanced charts in the public shell and replace the old terminal renderer with a compatibility dispatcher | B, C, D parity | Public parity, legacy deep links and renderer retirement |
| F · Production acceptance | Run quality, link and media checks, preview review, sign-off, Vercel promotion and independent Worker/account verification where applicable | E | [Release evidence](07-acceptance-and-release-plan.md) plus rollback candidate |

Fix the [lifecycle release gate](09-repository-review-and-findings.md) in a separate track before enabling approved contract data. B and C can proceed in parallel after A. Chart fixture authoring, media checking and schema review can proceed independently once IDs are fixed. D can develop against the agreed data contract while content is completed. Keep B–E in reviewable changes. Add no duplicated teaching catalog, second journal, competing backtest engine, unexplained social signals, broker execution, unsupported data feed or automatic claims of trade performance.

## Checkpoint and release dependencies

| Package | Build evidence | Open release evidence |
|---|---|---|
| A | `/route-manifest.json` records generated routes and anchors, Lab query targets, the terminal map, browser key names and SHA-256 source revisions. Vercel builds record their commit when supplied. | Compare the deployed manifests and record desktop and mobile screenshots. |
| B | The shared shell publishes the five Lab sections and public charts. | Keyboard navigation, contrast and mobile review on the candidate deployment. |
| C | The catalog and crosswalk preserve stable IDs and Academy routes. C17 uses a separate worked example so its practice retest stays hidden until the decision is saved. | Editorial sign-off, playback, precise chapters and embed checks. |
| D | Six public labs use the existing risk and strategy logic. Replay and local restore failure paths have automated checks. | Two-account private workspace, attachments and restore QA. |
| E | Both the default build and the opt-in cutover build can be rehearsed. The sitemap omits the private workspace and terminal index. | Public parity, real browser bookmark and cache transition checks, and rollback evidence. |
| F | Build and link checks can run on the candidate commit. | Production sign-off and promotion, independent Worker/provider smoke, and rollback evidence. |

The lifecycle track validates actual calendar months both at import and before publishing. It accepts the configured authorized state only after all 15 families, published fields, coverage and HTML/JSON agree. Tests import a synthetic 15-family snapshot in an isolated copy. Live contract dates still require current owner approval and verified exchange records. Re-import older authorized snapshots to record the approval expiry, and rebuild before expiry to withdraw public rows as needed.

The 22 November 2026 control-plane check recorded Vercel production at commit `18f2488` (deployment `dpl_CY8JTtSurdJBfQBSve4BktioApPS`). Cloudflare reported Worker version 22 at 100% traffic and candidate version 23 at 0% (deployment `31ded4a8-ee34-4d73-84f8-ed59523d381c`). A fresh public endpoint smoke result remains open. Provider entitlements, verified exchange hours, approved volume/OI ingestion and exact prop-firm terms retain their separate evidence gates.
