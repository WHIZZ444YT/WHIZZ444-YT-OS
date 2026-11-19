# Part 2 — ICT Academy Execution Repor

**Review date:** 19 November 2026
**Branch:** `codex/charter-alignment-2026-11-19
**Status:** Partial. The content and progress model remain intact; the required verified-video gate is not met.

## Preserved baseline

- 82 lesson IDs and pages, including all 76 preserved IDs.
- 10 prerequisite tracks and nine guided tutorials.
- Structured lesson objectives, walkthroughs, hypothetical examples, identification rules, practice, multi-question checks, source notes, content versions and progress sync.
- No lesson was labelled `TESTED` without a reproducible artifact.

## Video coverage finding

The existing data includes individual YouTube candidate links for 11 lessons (18 records), and 71 lessons have no individual candidate link. The prior records do not meet the roadmap's normalized verification contract: current source data lacks the required per-mapping verified channel ID/name, lesson-specific concept ID, verification reviewer/date, current link check and fallback status. Search/channel/playlist links remain discovery aids and are not counted.

The generated `dist/ict-futures/academy/video-coverage.json` therefore reports:

- Academy coverage: **0/82 (0%) verified**, status `PARTIAL`.
- Entry Model coverage: **0/8 verified**.
- Missing lesson mappings: all 82 IDs; 11 have unverified candidate links and 71 have none.

No video mapping was promoted without evidence. The builder now labels each uncovered lesson `VIDEO NEEDED`, distinguishes candidate links from verified links, and publishes the coverage register. The Academy dashboard displays the coverage state. Exact video review for all lesson/model IDs remains the blocking Part 2 acceptance item.

## Changed source paths

- `scripts/build_academy.py` — strict video-record eligibility and coverage report generation; truthful lesson status.
- `scripts/build_site.py` — Academy coverage summary and per-card state; load Academy styles.
- `assets/academy-learning.css` — coverage status styling.
- `tests/test_build.py` — regression coverage for the explicit incomplete gate.
- `scripts/validate.py` — structural assertions for lesson and model coverage state.

The canonical Academy concepts and historic candidate records were preserved. Generated `dist/` files came from the builder.

## Verification

| Check | Result |
|---|---|
| `python scripts/build_site.py` | Passed: 15 futures families, 82 Academy lessons, 44 reviewed resources. |
| `python -m unittest discover -s tests` | Passed: 42/42. |
| `python scripts/validate.py` | Passed: 127/127. |
| `python scripts/audit_internal_links.py` | Passed: 130 HTML files, 1,358 internal links, zero issues. |

## Acceptance

- [x] Existing lesson IDs, routes, tracks, tutorials and user-progress versioning preserved.
- [x] All lessons explicitly show `VIDEO NEEDED` unless a video meets the strict registry requirements.
- [x] Coverage report measures Academy and Entry Model mappings separately.
- [x] Search/portal links cannot silently count as exact video coverage.
- [ ] 100% exact verified video coverage — **not met; Part 2 remains partial**.
- [ ] Manual post-change browser screenshots — local preview was unavailable; see the Part 1 report.
