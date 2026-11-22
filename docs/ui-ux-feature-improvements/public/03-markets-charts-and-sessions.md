# 03 · Markets, Charts and Sessions

Routes: /futures-intelligence/, /markets/, /contract-specs/, /charts/, /sessions/ and preserved /ict-futures/markets/*.html. Owners: [public builder](../../../scripts/build_site.py), [Desk template](../../../futures-intelligence/index.html), [public futures builder](../../../scripts/build_public_futures.py), [chart controls](../../../assets/public-charts.js), [session client](../../../assets/sessions-page.js).

| Priority | Current evidence | Required improvement |
|---|---|---|
| P1 | Desk, Markets, family pages and Contract Specs all expose parts of the same contract registry. | Give Desk context, Markets discovery, the family page the profile and Contract Specs the lifecycle table. Share one market identity and data-state row. Keep direct links to the appropriate owner. |
| P1 | Charts starts with a rendered control tray and direct TradingView links. Embedded content only loads on intent. Changing selection or loading a comparison can change the page substantially. | Retain the static tray. Group Market, Comparison and Interval in one labeled row on desktop and one stack on mobile. Reserve player space after intent and show provider failure within the chart area. Keep stable direct links and URL state. |
| P1 | Sessions combines a publisher calendar, timezone controls and New York teaching windows. They have distinct meanings and sources. | Put next scheduled events and chosen timezone first. Label ICT reference windows as education and exchange hours separately. Show date-only items without invented times and preserve original source timestamps. |
| P2 | The generated sitemap excludes Sessions, even though the builder emits a first-class page. | Verify the actual canonical response and update the sitemap policy/test if Sessions is intended for indexing. Keep bookmark fragments and private exclusions intact. |

## Build and verify

- Start with one versioned market context contract: family, symbol, listed expiry or continuous series, exchange, source, timestamp and known delay. Render the same wording across views without collapsing listed contracts into continuous charts.
- Add direct links from a preview to the relevant contract and session. Treat closures, rollover dates, quotes and licensed history as unavailable until evidence and entitlements exist.
- Test comparison add/remove, provider embed blocked, no-JS direct chart, Back/Forward, NQ vs ES, approved/unapproved lifecycle data and timezone changes across DST. Recheck narrow table scrolling and Charts CLS against the integrated baseline.
