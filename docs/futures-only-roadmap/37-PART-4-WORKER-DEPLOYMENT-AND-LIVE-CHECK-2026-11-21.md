# Part 4 — Worker deployment and live route check

**Review date:** 21 November 2026

**Status:** Worker diagnostic bundle deployed to production and route-smoke checked; publisher coverage and licensed market-data acceptance remain partial.

**Later same-day update:** This report is the v22 release checkpoint. Candidate v23 was subsequently staged at 0% traffic to test official-calendar parser recovery; v22 remains at 100%. See [report 38](38-PART-4-CALENDAR-SOURCE-RECOVERY-STAGED-2026-11-21.md) for the later smoke results and shared-KV caveat. The earlier BLS/BoE/RBA status table below is retained as a timestamped v22 observation, not the latest candidate result.

## Release evidence

The bundle was prepared from the merged Worker source containing PR #24's sanitized publisher-failure diagnostics. Wrangler 4.164.0 is pinned in the repository so the release configuration can be dry-run reproducibly. `npm run worker:dry-run` passed with the configured `SNAPSHOTS` KV namespace, `ALLOWED_ORIGINS`, `SUPABASE_URL`, and the existing 30-minute Cron; Wrangler reported 207.06 KiB uncompressed and 48.43 KiB gzip. The configuration keeps Worker Preview URLs disabled and retains the existing observability and query-string redaction settings.

The rollout first created a Cloudflare deployment with the new version at 0% and the previous version at 100%. A live route smoke then targeted the candidate through the Workers version-override header. After the smoke found no failed route checks, the candidate was promoted to 100% production traffic. Preview URLs were not enabled as part of this release.

| Item | Verified value |
|---|---|
| Worker source version | `2.2.0` |
| Production version UUID | `9d25d09f-d340-44a7-b41e-e6ad60762d12` |
| Zero-traffic staged deployment | `517fefb6-0913-4e0a-9e9c-97cf68bceda7` |
| Production deployment | `437cf288-8b86-4faa-a2cd-11038a261a57` |
| Production traffic after promotion | New version 100% |
| Workers.dev Preview URLs | Still disabled |

Cloudflare's post-write deployment record showed the new version serving 100% after promotion. The post-deployment smoke was run without a version override against the production Workers.dev hostname.

## Post-deployment route smoke

The smoke returned valid route envelopes for all nine registered calendar publishers, passed `/health` and CORS preflight checks, and reported Worker `2.2.0` with KV configured. Six publisher schedules were fresh: EIA, CFTC, FOMC, ECB, Bank of Canada and BEA. This result is a **degraded route/data check**, not a clean provider-acceptance pass:

| Route or service | Observed state | Diagnostic |
|---|---|---|
| `/api/v1/market-data/status` | Not configured | Licensed market-data provider and entitlement are still absent. |
| BLS events | Unavailable | `upstream_fetch_failed` |
| BoE events | Unavailable | `publisher_policy_changed` |
| RBA events | Unavailable | `publisher_schedule_format_changed` |

The diagnostics are stable allowlisted codes; raw upstream error text, URLs, headers and credentials are not exposed in public responses or logs. The smoke showed no failed route-envelope or CORS checks, but its degraded outcome still requires operator review. The unavailable providers must remain visibly unavailable until their source/policy or network conditions are fixed and verified.

## Remaining acceptance work

- Recheck BLS, BoE and RBA through the official sources after the candidate change is reviewed/deployed; current candidate smoke reports BLS HTTP 403 and fresh BoE/RBA snapshots. See report 38 for details.
- Obtain and configure approved licensed market-data access before enabling any real-time/intraday display, storage or redistribution.
- Complete the wider calendar scope: exchange product hours, breaks, holidays, early closes, justified global releases and schedule revision history.
- Run the public production route smoke after future Worker changes; keep the smoke outcome and deployment version together in the release record.
- Complete full-site visual, mobile, keyboard and screen-reader review separately; this Worker deployment does not include a Vercel frontend release.

This deployment closes the Worker deployment and route-response-check item for this release. It does not complete calendar source coverage, licensed data, Academy videos, contract lifecycle research, backtest evidence, prop-firm verification, Auth/RLS or overall roadmap acceptance.
