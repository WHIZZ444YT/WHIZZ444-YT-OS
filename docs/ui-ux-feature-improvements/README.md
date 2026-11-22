# Finance Intelligence OS improvement plan

Audit date: 22 November 2026. Scope covers the public research and learning experience, the private workspace entry, the release surface and the code that generates them. This pull request contains planning documents only. Start with the evidence inventory, then implement one workstream at a time. The integrated build is already on main and production. This plan uses that release as its baseline.

| Order | Workstream | Outcome |
|---|---|---|
| 00 | [Baseline and inventory](00-audit-baseline.md) | Evidence, route families and ranked work |
| 01 | [Shell, CSS and accessibility](foundation/01-shell-css-and-accessibility.md) | Stable shared shell, semantic color system and readable hierarchy |
| 02 | [Home and Search](public/02-home-and-search.md) | A clear start path and useful search without repeated status panels |
| 03 | [Markets, Charts and Sessions](public/03-markets-charts-and-sessions.md) | One owner for each market task, consistent controls and useful fallbacks |
| 04 | [News, macro and data health](public/04-research-and-provider-states.md) | Consistent provenance, actionable states and fewer duplicate panels |
| 05 | [Learn, Academy and Playbooks](learning/05-learning-and-models.md) | Clear learning intent with stable lesson and model routes |
| 06 | [Practice, media and mentors](learning/06-practice-and-media.md) | Easier practice and finding the right source without losing evidence |
| 07 | [Strategy, Risk and Account](workspace/07-tools-and-account.md) | Guided workflows and explicit local/cloud boundaries |
| 08 | [Consolidation and retirement](delivery/08-consolidation-and-migration.md) | A reviewed keep/merge/remove register with compatibility rules |
| 09 | [Execution, QA and release](delivery/09-execution-and-acceptance.md) | Build order, route-level checks and release gates |

| Priority | Rule |
|---|---|
| P0 | Release gate that protects records, access or accurate data attribution |
| P1 | Blocks a core journey, reading, keyboard access or a reliable build |
| P2 | Improves discoverability, polish or maintainability after the core workflow works |

Each guide names the current surface, change, file owner and verification. Future feature PRs should reference the relevant guide and attach route-level evidence. Recheck observed findings against their target branch before implementation.
