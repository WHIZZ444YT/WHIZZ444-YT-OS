# Finance Intelligence OS free-data integration blueprint

This is the build handoff for [WHIZZ444YT/WHIZZ444-YT-OS](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS), sourced from [main at e791f37da392](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/e791f37da39209f3ac6c50ebf2f960101f618efb). Start with [the master roadmap](MASTER-IMPLEMENTATION-ROADMAP.md), then use each document's coding-agent prompt after its prerequisites pass. Docs 00–04 are the first implementation handoff. Scope is documentation and future implementation requirements.

| Document | Priority | Dependencies |
|---|---|---|
| [00 · Repository audit](foundation/00-REPOSITORY-AUDIT.md) | Foundation | — |
| [01 · Provider registry and licensing](foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) | Foundation | 00 |
| [02 · Data architecture and API gateway](foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) | Foundation | 01 |
| [03 · API keys and authentication](foundation/03-API-KEYS-AND-AUTHENTICATION.md) | Foundation | 01,02 |
| [04 · Database and data contracts](foundation/04-DATABASE-AND-DATA-CONTRACTS.md) | Foundation | 01,02,03 |
| [05 · Overview and Futures Desk](markets/05-OVERVIEW-AND-FUTURES-DESK.md) | Sequenced | 02,06,09,10,12,15 |
| [06 · TradingView charts and widgets](markets/06-TRADINGVIEW-CHARTS-AND-WIDGETS.md) | Sequenced | 01,02 |
| [07 · Markets and contract intelligence](markets/07-MARKETS-AND-CONTRACT-INTELLIGENCE.md) | Sequenced | 01,06 |
| [08 · Volume, OI and market data](markets/08-VOLUME-OI-AND-MARKET-DATA.md) | Sequenced | 04,07,15 |
| [09 · Economic calendar](research/09-ECONOMIC-CALENDAR.md) | Sequenced | 02,04 |
| [10 · Futures news and RSS](research/10-FUTURES-NEWS-AND-RSS.md) | Sequenced | 01,02,09 |
| [11 · US macro intelligence](research/11-US-MACRO-INTELLIGENCE.md) | Sequenced | 04,09 |
| [12 · Treasury and Fed intelligence](research/12-TREASURY-AND-FED-INTELLIGENCE.md) | Sequenced | 04,09 |
| [13 · Energy intelligence](research/13-ENERGY-INTELLIGENCE.md) | Sequenced | 04,09 |
| [14 · Global macro and liquidity](research/14-GLOBAL-MACRO-AND-LIQUIDITY.md) | Sequenced | 04,12 |
| [15 · CFTC COT and positioning](research/15-CFTC-COT-AND-POSITIONING.md) | Sequenced | 04,09 |
| [16 · Agriculture intelligence](research/16-AGRICULTURE-INTELLIGENCE.md) | Optional | 01,04,17 |
| [17 · Reports and publications](research/17-REPORTS-AND-PUBLICATIONS.md) | Sequenced | 01,09,10 |
| [18 · Data health and source directory](platform/18-DATA-HEALTH-AND-SOURCE-DIRECTORY.md) | Sequenced | 01,02,04 |
| [19 · Integration setup and admin](platform/19-INTEGRATION-SETUP-AND-ADMIN.md) | Sequenced | 03,18 |
| [20 · Scheduling, caching and free limits](platform/20-SCHEDULING-CACHING-AND-FREE-LIMITS.md) | Sequenced | 02,04,18 |
| [21 · Historical data and Strategy Lab](platform/21-HISTORICAL-DATA-AND-STRATEGY-LAB.md) | Sequenced | 04,08 |
| [22 · UI, UX and navigation](platform/22-UI-UX-AND-NAVIGATION.md) | Sequenced | 05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,21 |
| [23 · Security and data compliance](delivery/23-SECURITY-AND-DATA-COMPLIANCE.md) | Sequenced | 01,02,03,04,20 |
| [24 · Testing and quality assurance](delivery/24-TESTING-AND-QUALITY-ASSURANCE.md) | Sequenced | 22,23 |
| [25 · Deployment and live verification](delivery/25-DEPLOYMENT-AND-LIVE-VERIFICATION.md) | Sequenced | 24 |
| [26 · Implementation sequence](delivery/26-IMPLEMENTATION-SEQUENCE.md) | Sequenced | 00,25 |
| [27 · Final acceptance checklist](delivery/27-FINAL-ACCEPTANCE-CHECKLIST.md) | Sequenced | 24,25,26 |

[Existing provider register and licensing roadmap](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/futures-only-roadmap/12-DATA-PROVIDER-REGISTER-AND-LICENSING.md) remains the policy baseline. Verify source rights and live coverage separately at activation.
