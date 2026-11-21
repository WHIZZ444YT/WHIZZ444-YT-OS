# Part 4 — Worker schedule failure diagnostics

**Review date:** 20 November 2026  
**Status at review:** The diagnostics change had merged in PR #24; this report captured the pre-deployment state on 20 November. The Worker was subsequently deployed and checked on 21 November; see [Part 4 Worker deployment and live route check](37-PART-4-WORKER-DEPLOYMENT-AND-LIVE-CHECK-2026-11-21.md) for the superseding release evidence.

## Live evidence

Cloudflare Worker Observability recorded these public route results on 20 November 2026 at 14:23 UTC:

| Route | HTTP | Worker execution | Meaning |
|---|---:|---|---|
| `/api/v1/events/bea` | 200 | Completed | Route returned a response; inspect its feed status separately. |
| `/api/v1/events/boe` | 502 | Completed | The official-source refresh failed and the public fallback response was returned. |
| `/api/v1/events/ecb` | 200 | Completed | Route returned a response; inspect its feed status separately. |

The existing Worker catch discarded the upstream exception, so its logs did not show whether the Bank of England failure was an HTTP rejection, timeout, changed page format or changed release-time policy. This route observation alone does not establish the root cause.

The official Bank of England schedule page currently lists confirmed 2026 and 2027 announcement dates. Its monetary-policy page states the usual release time is 12 noon on announcement day. The official RBA page publishes Monetary Policy Board date ranges for 2026 and 2027 without a decision time. These pages support the calendar's source and time semantics, but do not prove that Cloudflare can fetch them or authorize reproducing their schedules in public data. See [BoE confirmed MPC dates](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates), [BoE monetary-policy announcement timing](https://www.bankofengland.co.uk/monetary-policy), and [RBA Board meeting schedules](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html).

## Change merged in PR #24

- Adds an allowlisted error classifier for publisher-calendar refresh failures: upstream HTTP status, timeout, content type, response size, publisher-policy mismatch, publisher format change or generic fetch failure.
- Writes only the publisher ID and error code to Worker logs. Raw upstream errors, URLs, headers and credentials are not logged.
- Adds the same stable `error_code` to unavailable route envelopes and `last_error_code` to stale snapshots. Existing generic user-facing fallback text remains intact.
- Adds focused tests for the error categories and checks that raw error messages are not exposed.

The diagnostic change does not alter calendar dates, release times, sources or the rights position. It cannot fix an upstream failure until it is included in a reviewed deployment and the new code is observed.

## Acceptance still needed

1. PR #24 is merged. Deploy its Worker source through the separate Cloudflare release path, preserving the verified bindings and 30-minute Cron.
2. Call all nine publisher routes and check route status, envelope status, source freshness and Worker logs.
3. Use the new error code to fix or document each failed source; keep unavailable/stale states visible where the publisher or network is unavailable.
4. Confirm the public data rights for any copied schedule content before adding it to public snapshots.

## Cloudflare release check — 20 November 2026

The read-only Cloudflare deployment record shows deployment `cd4efda0-199e-4ec1-a967-2e790511db9d` serving version `29ffa7c0-675a-4340-84f3-685cc32a5b51` at 100% traffic. Its deployed script identifies as Worker 2.2.0 and does not contain the merged publisher-failure classifier or error-code fields. The current Worker settings retain the `SNAPSHOTS` KV binding, `ALLOWED_ORIGINS`, `SUPABASE_URL` and the `*/30 * * * *` Cron; the secrets endpoint returned no configured secrets.

A fresh direct route smoke from the current workspace could not connect to the `workers.dev` host because outbound route access is restricted. It did not establish a current live-route pass, and no Worker deployment was made without a way to perform the post-deployment route checks. The last successful smoke observation recorded above remains degraded: BLS, BOE and RBA were unavailable and licensed market data was not configured.

This is a diagnostic milestone only. It does not complete the global calendar, Worker release, licensed-market-data, or overall Futures-Only roadmap.
