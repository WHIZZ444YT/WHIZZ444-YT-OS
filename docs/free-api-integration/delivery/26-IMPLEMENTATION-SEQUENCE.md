# 26 · Implementation sequence

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md) · [Final acceptance](27-FINAL-ACCEPTANCE-CHECKLIST.md)

## Baseline and next step

Docs 00–25 have merged implementation evidence on [main at `8c3d272a5f48`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/8c3d272a5f48ca568e90b9764866477367cc7353). This records repository prerequisites. Dataset authorization, provider configuration and production activation require their own evidence.

The next repository workstream is [Doc 27 · Final acceptance](27-FINAL-ACCEPTANCE-CHECKLIST.md) once this sequence is merged. Docs 24 and 25 supply its QA and rollout procedures. The owner records live acceptance after checking the intended environment against Doc 25.

## Dependency order

| Stage | Execute in this order | Exit evidence |
|---|---|---|
| Foundation | 00 → 01 → 02 → 03 → 04 | Pinned audit, source decisions, API contracts, credential isolation and data contracts |
| Anonymous sources | 09 → 10 → 11 baseline → 12 → 15 | Publisher fixtures, timestamps, provenance and missing/stale outcomes |
| Chart context and market catalog | 06 → 07 → 05 baseline | Direct chart links, hosted context, contract scope and Desk fallback |
| Registered and research sources | 11 approved adapters → 13 → 14 → 17 → 08 → finish 05 | Per-dataset configuration, reference fallback, and entitlement-gated observations |
| Platform | 18 → 19 → 20 → 21 → 22 | Status and setup, scheduler budgets, backtest provenance and navigation parity |
| Delivery | 23 → 24 → 25 → 26 → 27 | Security gates, QA artifacts, pinned rollout evidence and acceptance |

Doc 16 can run after 01, 04 and 17 if the owner wants Agriculture. The default build keeps `PUBLIC_AGRICULTURE_REFERENCE` unset and serves the rest of the research routes. Docs 22, 24–27 can proceed with that default. USDA ingestion, BEA/EIA credentials, FRED series approval, the optional ticker and licensed exchange observations are independent activation decisions. Use each workstream’s static links or disabled state when permission or configuration is missing.

## Merged repository evidence

| Workstream | Required predecessors | Merge evidence | Dependency status |
|---|---|---|---|
| [00 · Repository audit](../foundation/00-REPOSITORY-AUDIT.md) | — | [#60](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/60) · [`bfea624599`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/bfea6245998e25fa4a7e3e3f7c48bcfdb46fc268) | Repository dependencies satisfied. |
| [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) | 00 | [#61](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/61) · [`3a2bbbdc84`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/3a2bbbdc8469443edf61a3c093a037590e8e156f) | Repository dependencies satisfied. |
| [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) | 01 | [#62](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/62) · [`e0c1206b43`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/e0c1206b43addbf9b5baf94c37f8a289216bdff6) | Repository dependencies satisfied. |
| [03 · API keys and authentication](../foundation/03-API-KEYS-AND-AUTHENTICATION.md) | 01, 02 | [#63](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/63) · [`3214ff9432`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/3214ff9432741454351864268d11b1107fd445c1) | Repository dependencies satisfied. |
| [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) | 01, 02, 03 | [#64](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/64) · [`757e225083`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/757e225083e51d50f9d8d2f194d0f8d35f8cb1bb) | Repository dependencies satisfied. |
| [05 · Overview and Futures Desk](../markets/05-OVERVIEW-AND-FUTURES-DESK.md) | 02, 06, 09, 10, 12, 15 | [#65](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/65) · [`2a5c76b96d`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/2a5c76b96de17350c0c0592d9e048946f1dc0e75) | Repository dependencies satisfied. |
| [06 · TradingView charts and widgets](../markets/06-TRADINGVIEW-CHARTS-AND-WIDGETS.md) | 01, 02 | [#66](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/66) · [`8373289404`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/83732894041ad88190984bdac3366fbb1582a657) | Repository dependencies satisfied. |
| [07 · Markets and contract intelligence](../markets/07-MARKETS-AND-CONTRACT-INTELLIGENCE.md) | 01, 06 | [#67](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/67) · [`2fdc34e758`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/2fdc34e7580215cb470efd85b7df54ba082982be) | Repository dependencies satisfied. |
| [08 · Volume, OI and market data](../markets/08-VOLUME-OI-AND-MARKET-DATA.md) | 04, 07, 15 | [#68](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/68) · [`c4b823e4a6`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/c4b823e4a62c15db726598c71441c2fa3e76dc62) | Repository dependencies satisfied. |
| [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md) | 02, 04 | [#69](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/69) · [`844de838da`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/844de838daa77ace9f436b39d89d7304dc7e8b3a) | Repository dependencies satisfied. |
| [10 · Futures news and RSS](../research/10-FUTURES-NEWS-AND-RSS.md) | 01, 02, 09 | [#70](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/70) · [`dbae1c3653`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/dbae1c3653891e55cd9e3f81eb6e6358179c0ee4) | Repository dependencies satisfied. |
| [11 · US macro intelligence](../research/11-US-MACRO-INTELLIGENCE.md) | 04, 09 | [#71](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/71) · [`fb46845ada`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/fb46845adac42c6b99a0b8e7d97af383e766cf7d) | Repository dependencies satisfied. |
| [12 · Treasury and Fed intelligence](../research/12-TREASURY-AND-FED-INTELLIGENCE.md) | 04, 09 | [#72](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/72) · [`d5da4591a6`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/d5da4591a66c4c3d57bdfe244c2ff247d34c5976) | Repository dependencies satisfied. |
| [13 · Energy intelligence](../research/13-ENERGY-INTELLIGENCE.md) | 04, 09 | [#73](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/73) · [`2bef03df04`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/2bef03df04f12b7f0c9866b4f29b1201545774c4) | Repository dependencies satisfied. |
| [14 · Global macro and liquidity](../research/14-GLOBAL-MACRO-AND-LIQUIDITY.md) | 04, 12 | [#74](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/74) · [`491e71052e`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/491e71052e8869cbbe7355703d468e4317cafe51) | Repository dependencies satisfied. |
| [15 · CFTC COT and positioning](../research/15-CFTC-COT-AND-POSITIONING.md) | 04, 09 | [#75](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/75) · [`782f97dec1`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/782f97dec176ca67ead05f419499441a6664c7c5) | Repository dependencies satisfied. |
| [16 · Agriculture intelligence](../research/16-AGRICULTURE-INTELLIGENCE.md) | 01, 04, 17 | [#76](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/76) · [`093e6c4dbf`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/093e6c4dbf0d510b60d49825b40380d406d05de8) | Optional reference implementation merged. Disabled by default. |
| [17 · Reports and publications](../research/17-REPORTS-AND-PUBLICATIONS.md) | 01, 09, 10 | [#77](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/77) · [`620cb9a703`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/620cb9a703ec1d425db9608f920fb8298bcefee6) | Repository dependencies satisfied. |
| [18 · Data health and source directory](../platform/18-DATA-HEALTH-AND-SOURCE-DIRECTORY.md) | 01, 02, 04 | [#78](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/78) · [`698c740b26`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/698c740b26c0a32e9b63a566151149899f05496e) | Repository dependencies satisfied. |
| [19 · Integration setup and admin](../platform/19-INTEGRATION-SETUP-AND-ADMIN.md) | 03, 18 | [#79](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/79) · [`23f4f3a8df`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/23f4f3a8df6077bdb8fc5075ac4e186e5e82cfc8) | Repository dependencies satisfied. |
| [20 · Scheduling, caching and free limits](../platform/20-SCHEDULING-CACHING-AND-FREE-LIMITS.md) | 02, 04, 18 | [#80](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/80) · [`e3232c58c2`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/e3232c58c24614a14cca3fdf4c61f8e397033e03) | Repository dependencies satisfied. |
| [21 · Historical data and Strategy Lab](../platform/21-HISTORICAL-DATA-AND-STRATEGY-LAB.md) | 04, 08 | [#81](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/81) · [`70934fcf12`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/70934fcf126e49478de1d98a27d68454218244f6) | Repository dependencies satisfied. |
| [22 · UI, UX and navigation](../platform/22-UI-UX-AND-NAVIGATION.md) | 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 17, 18, 19, 21 | [#82](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/82) · [`9ee995fefa`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/9ee995fefa0542862b000ea829cb62a317e7ee6b) | Required dependencies satisfied. 16 is optional. |
| [23 · Security and data compliance](../delivery/23-SECURITY-AND-DATA-COMPLIANCE.md) | 01, 02, 03, 04, 20 | [#83](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/83) · [`bd22249b82`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/bd22249b82808c08469fe21183d5eed93ed40db9) | Repository dependencies satisfied. |
| [24 · Testing and quality assurance](../delivery/24-TESTING-AND-QUALITY-ASSURANCE.md) | 22, 23 | [#84](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/84) · [`16741a1b3c`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/16741a1b3c550c6954278e61dd9ce84d58df28cb) | Repository dependencies satisfied. |
| [25 · Deployment and live verification](../delivery/25-DEPLOYMENT-AND-LIVE-VERIFICATION.md) | 24 | [#85](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/85) · [`8c3d272a5f`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/8c3d272a5f48ca568e90b9764866477367cc7353) | Repository dependencies satisfied. |

Doc 26 uses [00](../foundation/00-REPOSITORY-AUDIT.md) and [25](25-DEPLOYMENT-AND-LIVE-VERIFICATION.md). Both are satisfied in the repository baseline above. Doc 27 requires [24](24-TESTING-AND-QUALITY-ASSURANCE.md), [25](25-DEPLOYMENT-AND-LIVE-VERIFICATION.md) and the merge of this handoff.

## Verification and owner decisions

- Use the [Doc 24 Quality Gates run](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45949641089) and [database contract artifacts](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45949641125) as evidence for that PR revision. Rerun gates on the candidate revision before acceptance.
- [Doc 25 Quality Gates](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45950442305), [Database Contracts](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45950442353) and [Vercel preview](https://vercel.com/whizz444yt-7353/finance-intelligence-os/6ptRWzGwWyHakg5sqnoY9xjVn5kr) cover that PR revision. The preview route manifest, eight shell routes, Charts CSP and Account noindex were checked.
- Before production activation, confirm current plan eligibility, preview isolation, exact dataset grants, any provider credentials, applied migrations, Worker version, Vercel production deployment SHA, rollback targets and live read-only smoke. Follow [Doc 25](25-DEPLOYMENT-AND-LIVE-VERIFICATION.md) for the release record.
- If a feature fails verification, keep the unaffected baseline available, disable the dataset or feature flag and repeat the relevant tests. Use recorded rollback targets when restoring a deployment. Keep licensed or expired data behind its entitlement checks.
