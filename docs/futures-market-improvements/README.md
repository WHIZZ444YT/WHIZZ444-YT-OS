# Futures Market Improvements and Public ICT Lab

Documentation package | 21 November 2026 | Finance Intelligence OS

**Decision.** Make the main website the front door for the entire futures learning and research experience. A visitor can read a full lesson, compare models, open a podcast chapter and start a practice lab without opening the ICT Futures Terminal. Advanced chart interaction moves into the public application shell. After parity checks, retire the separate terminal renderer and keep its URL as a compatibility entry point. Personal records continue through the account and local workspace flows.

| Document | What it answers |
|---|---|
| [01 · Current-state audit](01-current-state-audit.md) | What exists in GitHub, what Vercel reports, what remains unverified |
| [02 · Public website and terminal migration](02-public-site-and-terminal-migration.md) | What moves outside, what the terminal retains, and which links must survive |
| [03 · ICT curriculum and video catalog](03-ict-curriculum-and-video-catalog.md) | Every supplied concept, model, lab, mentor, episode and clip with explanations and exact source links |
| [04 · Academy and Entry Model crosswalk](04-academy-and-entry-model-crosswalk.md) | What to reuse, what to combine, what stays distinct, and which videos have stronger coverage |
| [05 · Lesson and practice specifications](05-lesson-and-practice-specifications.md) | Content templates, chart evidence, six lab contracts and data/privacy requirements |
| [06 · Futures backlog and build order](06-futures-backlog-and-build-order.md) | Previous open items, implementation sequence, owners and dependency gates |
| [07 · Acceptance and release plan](07-acceptance-and-release-plan.md) | Test matrix, video verification, deploy, migration safety and rollback |
| [08 · Public UI and repository presentation](08-public-ui-and-repository-presentation.md) | Theme palette, responsive screen specifications and GitHub presentation |
| [09 · Repository review and prioritized findings](09-repository-review-and-findings.md) | Code evidence, release risks, older-roadmap decisions and implementation tickets |
| [10 · ICT editorial import and learning paths](10-ict-editorial-import-and-learning-paths.md) | Terminal tutorial imports, lesson placement, discovery and optional editorial additions |
| [11 · Official ICT scope and mentor resources](11-official-ict-scope-and-mentor-resources.md) | Exact counts, 13 numbered Charter sources, ten channel picks and additional entry variants |
| [12 · ICT video coverage and public resource UX](12-ict-video-gap-register-and-public-ux.md) | Evidence and action for all 31 open Academy slugs, public mentor filters and final media acceptance |

**Baseline.** [GitHub main at 2caa352](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/2caa35210b71cf8ce0dc0ea7494344613c33c298) and the [matching Vercel production deployment](https://vercel.com/whizz444yt-7353/finance-intelligence-os/Ex2bhsBHLo8ULT9y96wEnwx7wbeo).

This package is the implementation brief for a later build. Read 02 and 08 together for the final public-site structure. Use 09 to triage implementation and 10 to reconcile media. Subsequent decisions supersede earlier terminal-retention proposals. Acceptance statuses describe current evidence or work to schedule. The catalog defines the Lab scope. The [existing Futures-Only Roadmap](../futures-only-roadmap/README.md) remains the detailed record of Parts 0–9.

## Integrated release status

The implementation was built in PRs [28-39](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pulls?q=sort%3Acreated-desc+futures).
The integration branch preserves the complete source stack and runs the same
standard and terminal-cutover build checks against main.

| Documents | Implementation evidence |
|---|---|
| 01-02 | Public routes, a second build mode for the terminal dispatcher, and stable bookmark targets. |
| 03-05 | 56 concepts, 10 playbooks, six labs, Academy crosswalk, fixtures, and replay and journal checks. |
| 06-07 | Route parity, lifecycle gate, scoped-worker retirement, offline cache restrictions, and release validation. |
| 08-09 | Shared palette and navigation, responsive Chromium evidence, curated help and reproducible artifacts. |
| 10-12 | Four learning paths, original sources, 13 Charter lectures, ten mentors, 11 podcast records, and the 31-entry Academy gap register. |
 
CI archives desktop and phone screenshots and mobile lab LCP/CLS measurements
for Home, Learn, C34 and Charts. These measurements use controlled throttling
with third-party requests blocked. Field INP and actual browser zoom QA require
separate evidence.

Production promotion and terminal retirement still require preview and release
sign-off. The remaining checks include live playback and chapter placement,
two-account privacy and installed-worker cutover tests, the live Worker rollout,
and a confirmed inventory of any consumer of the tracked static snapshot.
Exchange data remains subject to provider approvals.
