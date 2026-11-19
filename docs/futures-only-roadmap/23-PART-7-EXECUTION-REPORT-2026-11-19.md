# Part 7 — Strategy Lab Execution Repor

**Review date:** 19 November 2026
**Branch:** `codex/charter-alignment-2026-11-19
**Status:** Partial. The local engine, input contract, run manifest, statistics, UI labels, rule-card catalogue and tests were upgraded. No ICT detector, verified historical dataset, live exchange/calendar path, production database change or deployment is claimed.

## Implemented locally

- Versioned the deterministic Strategy Lab engine as `p7.0.0` and its run manifest as schema version 2.
- Required a constant exact contract code and source-supplied `YYYY-MM-DD` expiry in the CSV. The form's contract must equal the CSV code. Multiple contracts or expiries and back-adjusted continuous series are rejected.
- Required source/provider, dataset ID, download date, and source/date for commission and slippage assumptions. Optional volume requires declared units. These values, the exact expiry and input hash are included in the reproducible run manifest.
- Refused unknown CSV columns, including unreviewed future-derived columns, invalid timestamps/OHLC and OHLC prices not aligned to the entered tick size. Fixed timeframe is required; gaps longer than 1.5× that interval are counted and the first 100 intervals are retained for review. Session closures and missing bars remain indistinguishable without a verified product calendar.
- Preserved next-bar entry, single-position sizing, per-side commission/fixed adverse slippage, stop-gap adverse fill, stop-first same-bar ambiguity, time/end-of-data exit, independent chronological splits and fingerprint behavior.
- Added a 95% Wilson interval for win rate, average win/loss ratio, longest consecutive win/loss streak and trades per 1,000 bars. The UI includes these fields in split summaries.
- Changed model selection to ten explicit research tags, each labelled external signal only. Added [per-model rule cards](22-PART-7-MODEL-RULE-CARDS.md) with unresolved decisions and required causal tests. No speculative rule detector was created from educational descriptions.
- Documented absent automated news/session filters, exchange expiry reconciliation, separate spread, market impact, margin, queue/partial fills, event/session grouping, MAE/MFE, benchmarks, sensitivity/multiple-testing analysis and OOS sealing.
- Updated README, architecture, implementation and roadmap documentation. The builder regenerated `dist/`; generated output was not hand-edited.

## Acceptance status

| Requirement | Status |
|---|---|
| Every automated model has a written machine-testable specification | No models are automated. Ten candidate cards name the missing choices and test cases; execution remains blocked until each card is completed and reviewed. |
| Causal, non-repainting detectors | Not implemented. Signals are user-supplied and assumed to be known at source-bar close; external code is not audited for look-ahead. |
| Exact contract/expiry/tick/cost metadata | Required and recorded as user input. The engine checks single-contract consistency and tick-grid alignment, but does not reconcile expiry, tick size/value or fees against current exchange/broker sources. |
| Conservative OHLC fills and costs | Existing stop-first, gap-through, next-open and commission/slippage behavior is retained. Separate bid/ask spread, fill queue, partial fills, volatility/session slippage and market impact are not modeled. |
| Gaps, session and roll boundaries | One exact expiry per run; mixed expiries and continuous series are refused. Gaps are diagnosed but not session-classified; no event/session/maintenance/expiry-close calendar is configured. |
| Reproducible IS/validation/OOS | Chronological, independently reset segments and fingerprints are retained. OOS is not technically sealed and can be inspected by the user. |
| Metrics, manifest and ledger | Existing cost/P&L/drawdown metrics and full CSV ledger remain. Wilson win-rate interval, average win/loss ratio, streaks and trade frequency were added. Monthly/session/event breakdowns, MAE/MFE, baselines and sensitivity analysis remain absent. |
| Determinism and edge-case tests | Covered by unit fixtures for repeat fingerprints, next-bar execution, stop-first collision, gap-through, exact-expiry consistency, tick-grid enforcement, unknown columns, gap diagnostics and chronological splits. |
| Existing history and RLS | Existing owner-scoped tables/migration and browser JWT flow were preserved. No live Supabase RLS query or production history compatibility test was run. |
| Visual/manual route evidence | No post-change browser screenshot is claimed; the local preview was blocked by this environment during the Part 6 visual check. Static build, HTML structure and internal links passed. |

## Changed canonical source paths

- `assets/strategy-backtest-engine.mjs
- `assets/strategy-lab.js
- `scripts/build_site.py
- `scripts/validate.py
- `tests/test_strategy_backtest.mjs
- `tests/test_build.py
- `README.md
- `docs/ARCHITECTURE.md
- `docs/IMPLEMENTATION.md
- `docs/futures-only-roadmap/README.md
- `docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md
- `docs/futures-only-roadmap/23-PART-7-EXECUTION-REPORT-2026-11-19.md

`dist/` was regenerated by the canonical site builder.

## Verification

| Check | Observed result |
|---|---|
| `python scripts/build_site.py` | Passed: 50 source records, 15 futures families, 82 Academy lessons; local output remains `noindex`. |
| `python -m unittest discover -s tests` | Passed: 51 tests. |
| `node --test tests/test_strategy_backtest.mjs` | Passed: 16 tests. |
| `python scripts/validate.py` | Passed: 147/147 checks. |
| `python scripts/audit_internal_links.py` | Passed: 130 HTML files, 1,359 internal links, zero issues. |
| `git diff --check` | Passed; Git reported line-ending normalization notices only. |

No production database migration, secret configuration, push, PR, deployment, licensed data request or external message was made in Part 7.
