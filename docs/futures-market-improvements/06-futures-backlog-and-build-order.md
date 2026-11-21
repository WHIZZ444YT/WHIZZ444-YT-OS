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
| E · Terminal extraction | Cut over full content to public pages and leave contextual quick references, advanced charts and preserved anchors | B, C, D parity | Anchor/query regression and no lost capability/data |
| F · Production acceptance | Run quality, link and media checks, preview review, sign-off, Vercel promotion and independent Worker/account verification where applicable | E | [Release evidence](07-acceptance-and-release-plan.md) plus rollback candidate |

B and C can proceed in parallel after A. Chart fixture authoring, media checking and schema review can proceed independently once IDs are fixed. D can develop against the agreed data contract while content is completed. Keep B–E in reviewable changes. Add no duplicated teaching catalog, second journal, competing backtest engine, unexplained social signals, broker execution, unsupported data feed or automatic claims of trade performance.
