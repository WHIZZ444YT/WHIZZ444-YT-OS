# 07 · Strategy, Risk and Account

Routes: /strategy-lab/, /risk/, /account/ and public practice 14–16. Owners: [strategy client](../../../assets/strategy-lab.js), [engine](../../../assets/strategy-backtest-engine.mjs), [risk calculator](../../../assets/risk-calculator.js), [account client](../../../assets/account.js), [database migrations](../../../supabase/migrations).

| Priority | Current evidence | Required improvement |
|---|---|---|
| P1 | Strategy Lab includes file preview, run configuration, advanced parameters, split views, warnings, history and downloads. Practice 14 introduces similar concepts. | Keep guided practice as learning. Keep imported datasets, advanced settings and full diagnostics on Strategy Lab. Group workflow into input, run, results and history. Open advanced settings on demand. |
| P1 | Risk and Practice 15 both present position sizing. | Keep one fixed-point engine and one full Risk workflow. Expose calculator inputs, cost assumptions and invalidation clearly. Keep learning examples in Practice. Label unverified rules and data. |
| P0 | Account has separate sign-in, local legacy import, cloud history, backup and private attachment paths. Homepage code also knows the session. | Clarify session ownership and sync status. Keep signed-out screens readable and useful. Keep journal/watchlist/private attachment data behind Account and scope it to the signed-in owner. |
| P1 | Account re-renders large views. Focus and dirty-form survival after mutation need measurement. | Split view rendering by user journey. Preserve input while saving, announce failures near the action, restore focus after tab/row updates and prevent double submit. Keep destructive actions explicit. |

## Build and verify

1. Keep calculation engines and data contracts stable while restructuring UI. Test same inputs produce same results and manifests. Preserve import/export schemas and rollback readers.
2. Test unsigned, signed-in empty, stale session, offline, rejected file, zero quantity, OOS-only and retry states. In staging, use two dedicated accounts to verify owner isolation, sign-out, cross-tab state and attachment rejection. Use synthetic records only.
3. Release only after the two-account check signs off and no private names, notes or values appear in public caches, logs or search.
