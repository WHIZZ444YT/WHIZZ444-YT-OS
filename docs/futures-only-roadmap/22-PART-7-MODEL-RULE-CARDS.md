# Part 7 — ICT futures model rule-card status

**Reviewed:** 19 November 2026
**Catalogue version:** `ict-model-catalogue-0.1.0
**Executable detector version:** None. All entries below are research labels for externally supplied signals.

The model names below are preserved as concepts from the Academy and roadmap. No source set supplied a complete, authoritative, machine-testable detector definition for every listed candidate. Therefore, these cards record the decisions that must be fixed and tested before code can claim to detect any model. The Strategy Lab does not turn a selected label into a signal.

## Shared rule-card contrac

Every future executable card must version all of these fields before implementation:

- Evidence label, source citations, alternate names, model version and explicit variant.
- Required exact contract/expiry, instrument pair where applicable, OHLCV and data provenance.
- Bias, setup and entry timeframes; IANA timezone; session windows and DST behavior.
- Liquidity reference/lookback; sweep threshold and close-back rule; equal-high/low tolerance.
- Swing algorithm and confirmation delay; MSS/BOS body-close requirement.
- Displacement formula; FVG/IFVG/OB/Breaker wick/body construction and mitigation rule.
- OTE anchor selection and band; SMT pair, expiry matching and timestamp synchronization.
- Signal creation/confirmation/source-bar timestamps; entry order, trigger and fill assumption.
- Stop, target, time exit, invalidation, news filter, no-trade conditions and ambiguity policy.
- Warm-up/null behavior, synthetic fixtures, edge-case tests, causal validation and versioned outputs.

The currently selected OHLC engine accepts only user-supplied LONG/SHORT/FLAT events known at source-bar close. It cannot audit the signal-generation source for look-ahead. No ICT detector is enabled.

## Candidate cards

### `liquidity-sweep-mss

- **Names:** Liquidity Sweep + Market Structure Shift (MSS).
- **Status:** Catalogue only; no machine-testable specification or detector version.
- **Decisions required:** Define the qualifying liquidity pools and lookback; wick-through and close-back thresholds; equal-high/low tolerance; confirmed swing algorithm and latency; MSS break rule; displacement/FVG requirement; session, entry, invalidation, stop and target variants.
- **Causal tests required:** Ensure a swing is unavailable until confirmation bars close; prove the sweep and MSS timestamps cannot use later bars; cover wick-only, close-through, equal-level and gap cases.

### `silver-bulle

- **Names:** Silver Bullet.
- **Status:** Catalogue only; the model name does not select or enforce a time window.
- **Decisions required:** Select exact session window(s), IANA timezone and DST policy; define bias, eligible liquidity raid, FVG construction/mitigation, entry trigger, daily trade cap, invalidation and no-trade/news behavior.
- **Causal tests required:** Boundary bars immediately before/inside/after each configured window, DST transitions, missing bars, unconfirmed FVGs and next-bar execution.

### `ict-2022-model

- **Names:** ICT 2022 Model.
- **Status:** Catalogue only; no canonical machine-testable detector.
- **Decisions required:** Define daily/bias context, eligible liquidity reference and raid, structure-shift confirmation, displacement/FVG entry, session constraints, stop/target and alternate variants.
- **Causal tests required:** Verify each context timestamp precedes the setup; cover no-raid, late-raid, ambiguous displacement, stop/target collision and session boundary cases.

### `judas-mss

- **Names:** Judas Swing + MSS.
- **Status:** Catalogue only; no machine-testable specification or detector version.
- **Decisions required:** Define the reference range and its source session, raid direction/threshold, timezone-aware Judas window, reversal versus continuation rule, MSS swing/close condition, displacement, entry and invalidation.
- **Causal tests required:** Test range availability before the window, both raid directions, close-through versus rejection, DST/session boundaries and delayed swing confirmation.

### `amd-po3

- **Names:** Power of Three (PO3) / Accumulation-Manipulation-Distribution (AMD).
- **Status:** Catalogue only; phases are not inferred from chart appearance.
- **Decisions required:** Define accumulation range/window and minimum duration, range-width rule, manipulation threshold and direction, distribution trigger, timezone, session end, invalidation and exit.
- **Causal tests required:** Ensure phase labels are assigned only when observable; cover overlapping phases, false breaks, range gaps, DST and session cutoff.

### `unicorn

- **Names:** Unicorn.
- **Status:** Catalogue only; overlap/confluence conditions are not coded.
- **Decisions required:** Define the required structure shift and FVG/Breaker or order-block zones, wick/body boundaries, overlap tolerance, creation/mitigation and invalidation, entry order and target variant.
- **Causal tests required:** Cover partial/non-overlap, zone invalidation, retest timing, same-bar ambiguity and immutable zone timestamps.

### `fvg-continuation

- **Names:** FVG Continuation.
- **Status:** Catalogue only; no machine-testable specification or detector version.
- **Decisions required:** Define three-candle FVG boundaries, minimum size, wick/body basis, trend/bias filter, allowed age, mitigation, continuation trigger, entry, stop and target.
- **Causal tests required:** Test exact boundary touches, one-tick gap, partial fill, full fill, overlapping gaps, warm-up and confirmation time.

### `ifvg

- **Names:** Inversion Fair Value Gap (IFVG).
- **Status:** Catalogue only; the inversion event and retest rule are unspecified.
- **Decisions required:** Select source FVG rule, invalidation close (wick or body), inversion timestamp, retest tolerance, direction, entry/stop/target, zone expiry and session/no-trade rules.
- **Causal tests required:** Cover touch without close-through, close-through, next-bar availability, retest sequence, gap-over and expired-zone behavior.

### `fvg-ote

- **Names:** FVG + Optimal Trade Entry (OTE).
- **Status:** Catalogue only; anchor selection and confluence requirements are unspecified.
- **Decisions required:** Define impulse start/end algorithm, retracement band and inclusivity, FVG construction/mitigation, direction/bias, order type, stop/target and when the setup expires.
- **Causal tests required:** Ensure anchors are confirmed before use; test exact band edges, multiple candidate swings, retracement before FVG creation and no-overlap cases.

### `smt-assisted

- **Names:** SMT-assisted setup / Smart Money Technique divergence.
- **Status:** Catalogue only; no pair, mapping or synchronized comparison is configured.
- **Decisions required:** Select the futures pair and inverse/direct mapping; require exact same-expiry contracts or an explicit mapping; define timestamp tolerance, session alignment, swing/liquidity points, divergence threshold and which primary setup is confirmed.
- **Causal tests required:** Reject mismatched expiries and stale/missing bars; test asynchronous timestamps, DST alignment, inverse mapping, both divergence directions and paired-data gaps.

## Release gate

Do not expose an entry as automatically detected until its card is complete, its versioned rules are approved for the intended research use, synthetic causal/non-repainting tests pass, exact-expiry inputs and costs are available, and untouched out-of-sample results can be reproduced. A catalogue label, educational description, or user-supplied signal is not a detector or evidence of performance.
