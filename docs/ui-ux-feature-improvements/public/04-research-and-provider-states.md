# 04 · Research and provider states

Routes: /news/, /macro/, /research/positioning/, /volume-open-interest/, /sources/, /data-health/, /status/ and /docs/. Owners: [route builder](../../../scripts/build_site.py), [news client](../../../assets/news-page.js), [health client](../../../assets/data-health.js), [COT client](../../../assets/cot-page.js), [macro client](../../../assets/macro-page.js), [Worker source](../../../cloudflare/src).

| Priority | Current evidence | Required improvement |
|---|---|---|
| P1 | The homepage, Desk, research pages and Data Health surface overlapping provider states. State and timestamp formats are implemented in multiple clients. | Share presentation of source, observation time, retrieval time, release time and delay. Keep distinct provider contracts and place detailed diagnostics on Data Health only. |
| P1 | Weekly CFTC data and exchange contract data have different entitlements and reporting periods. | Give each series its own units, scope, publication cadence and source badge. An absent licensed feed should show unavailable with an explanation. Avoid placeholder zero values and automatic claims of freshness. |
| P1 | News can degrade to snapshot or a provider error. | Show last successful retrieval, publisher, selected filters and a scoped retry. Deduplicate display articles through existing canonical URL behavior where evidence supports it. Keep provider failure isolated from other sections. |
| P2 | Sources, Status and Help are secondary destinations with partly overlapping purpose. | Sources owns publisher links. Data Health owns live diagnostics. Help owns task guides. Status owns dated release evidence. Keep one link per intent in the footer and contextual links where needed. |

## Build and verify

Create a shared state renderer with loading, ready, stale, partial, unavailable and denied. Use the same visual scale in both themes. Check unknown time, retry success, rate limit, cached success, date-only release and provider 403 fixtures. Preserve upstream source URLs and rights gates. Verify news ordering, COT variant selection, OI evidence and no data leakage in public search.
