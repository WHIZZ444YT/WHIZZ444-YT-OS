# Part 8 — Risk and Prop-Firm Intelligence Execution Report

**Review date:** 19 November 2026
**Branch:** `codex/charter-alignment-2026-11-19`
**Status:** Partial. Local all-in conditional sizing, guardrail caps, typed registry structure and explicit unverified states are built and tested. Current official contract specifications and exact prop-firm terms were not verified; no numerical firm rules are published.

## Implemented locally

- Added `assets/futures-risk-engine.mjs` (`risk-1.0.0`) using integer micro-USD and whole tick/contract arithmetic. Risk sizing floors contracts and caps them at the user's maximum.
- The calculator distinguishes exchange tick value from point value and computes gross stop risk separately from round-turn commission/fees, estimated spread and estimated slippage. Fees, spread and slippage require explicit user inputs, plus cost source and date; no guessed cost defaults are populated.
- Added optional user-entered remaining daily-loss and maximum-drawdown allowances. The smaller allowance caps the per-trade budget. The page does not infer a firm reset time, drawdown basis, trailing threshold or current account balance.
- Requires the user to enter exact contract code and expiry. It continues to use the canonical versioned standard/micro contract profile and shows its version, official exchange source, verification date and effective date when present. All currently imported profile specs remain `unverified`, so every result is labeled conditional.
- The page displays gross stop risk, fees, spread, slippage, all-in per-contract and total risk, gross/net target estimate, net R, risk usage, zero-contract explanation and the active allowance cap.
- Added versioned `data/prop-firm-programs.json` with required firm/program identity/source fields and typed drawdown rule enums. The `records` list is empty; numeric program facts are suppressed until exact official terms are verified.
- Preserved `Blue Shift 25K` only as an `UNVERIFIED` mention. A targeted public search did not identify an exact official futures firm/product rulebook for that name; no firm identity, fees, drawdown, contract limits, eligibility or payout terms were inferred.
- Private balance and remaining-limit inputs stay in page memory and are not synced. No Supabase schema change was needed.
- Updated the builder, generated risk page and registry JSON, README, architecture, implementation and roadmap status.

## Acceptance status

| Requirement | Status |
|---|---|
| Tick and point units stay distinct | UI labels tick value as dollars per exchange tick. Registry values remain unverified, so the output is conditional. |
| All-in commissions, fees, spread and slippage | Included in fixed-point risk arithmetic as user-supplied round-turn amounts/ticks; cost source/date required. Estimates are not observed fills. |
| Contract spec version controls calculator | Standard/micro profile and version are selected from the canonical registry. Exact code/expiry are entered by the user. Official specs have not been reconciled, so this gate is partial. |
| Downward whole-contract sizing and zero state | Implemented and unit-tested, including a clear zero-contract result. |
| Daily reset and balance/equity basis | Remaining daily/max loss amounts can cap sizing, but reset timezone and calculation basis are not inferred. The user must take remaining amounts from applicable official account terms/platform. |
| Trailing drawdown simulation | Not implemented; no exact verified firm plan is available to define simulator behavior. |
| Exact prop-firm identity and current official terms | The registry publishes zero verified records. The Blue Shift 25K mention remains unverified. |
| Current source and checked time for every numerical rule | No firm numeric rule is published. Contract profiles show their unverified status and source link; the current profile values are not certified. |
| Fees, payout, rule changes and eligibility | Not configured for any firm; no numerical or location-based claim is published. |
| Private account data and RLS | Inputs are browser-only and are neither stored nor synced. No RLS query was needed or performed for these values. |
| No guarantee or endorsement | Educational estimate and no-execution disclaimers remain visible; no firm ranking, guarantee or payout claim is present. |

## Changed canonical source paths

- `assets/futures-risk-engine.mjs`
- `assets/risk-calculator.js`
- `data/prop-firm-programs.json`
- `scripts/build_site.py`
- `scripts/validate.py`
- `tests/test_futures_risk_engine.mjs`
- `tests/test_build.py`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION.md`
- `docs/futures-only-roadmap/README.md`
- `docs/futures-only-roadmap/24-PART-8-EXECUTION-REPORT-2026-11-19.md`

The static build regenerates the `dist/` output, including `/risk/` and `/data/prop-firm-programs.json`.

## Verification

| Check | Observed result |
|---|---|
| `python scripts/build_site.py` | Passed: 50 source records, 15 futures families, 82 Academy lessons; local output is `noindex`. |
| `python -m unittest discover -s tests` | Passed: 53 tests. |
| `node --test tests/test_futures_risk_engine.mjs` | Passed: 5 tests. |
| `node --test tests/test_strategy_backtest.mjs` | Passed: 16 tests. |
| `python scripts/validate.py` | Passed: 151/151 checks. |
| `python scripts/audit_internal_links.py` | Passed: 130 HTML files, 1,359 internal links, zero issues. |
| `git diff --check` | Passed after removing newly introduced trailing whitespace; Git emitted line-ending normalization notices only. |

The local preview screenshot remains unavailable because the environment blocked the local browser preview during the Part 6 visual check. No production database, licensed feed, push, PR, deployment or external message was made.
