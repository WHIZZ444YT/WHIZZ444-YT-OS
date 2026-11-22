# Finance Intelligence OS

A public research and learning workspace for exchange-listed futures. Study ICT
concepts, compare source-backed market context, and practice with reproducible
examples. The optional private workspace keeps journal and watchlist records
scoped to the signed-in user.

[Live site](https://finance-intelligence-os-alpha.vercel.app/) · [Futures improvement roadmap](docs/futures-market-improvements/README.md) · [Release checklist](docs/RELEASE-CHECKLIST.md)

[![Quality checks](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/workflows/quality.yml?query=branch%3Amain)

| Area | Routes |
|---|---|
| Learn | [ICT Lab](https://finance-intelligence-os-alpha.vercel.app/ict-lab/), [Academy](https://finance-intelligence-os-alpha.vercel.app/academy/), [Entry Models](https://finance-intelligence-os-alpha.vercel.app/entry-models/) |
| Markets | [Futures Desk](https://finance-intelligence-os-alpha.vercel.app/futures-intelligence/), [Markets](https://finance-intelligence-os-alpha.vercel.app/markets/), [Charts](https://finance-intelligence-os-alpha.vercel.app/charts/), [Contract specs](https://finance-intelligence-os-alpha.vercel.app/contract-specs/) |
| Research | [News](https://finance-intelligence-os-alpha.vercel.app/news/), [Macro](https://finance-intelligence-os-alpha.vercel.app/macro/), [COT](https://finance-intelligence-os-alpha.vercel.app/research/positioning/), [Volume and OI](https://finance-intelligence-os-alpha.vercel.app/volume-open-interest/), [Data health](https://finance-intelligence-os-alpha.vercel.app/data-health/) |
| Tools | [Sessions](https://finance-intelligence-os-alpha.vercel.app/sessions/), [Strategy Lab](https://finance-intelligence-os-alpha.vercel.app/strategy-lab/), [Risk](https://finance-intelligence-os-alpha.vercel.app/risk/), [Journal practice](https://finance-intelligence-os-alpha.vercel.app/ict-lab/practice/16/) |
| Account | [Private workspace](https://finance-intelligence-os-alpha.vercel.app/account/) |

Data availability varies by provider.
Official calendars and weekly CFTC releases carry source timing and coverage.
Exchange quotes, depth and contract lifecycle displays depend on approved data
access. Educational charts disclose sample or third-party data.

## Build and verify

Run from the repository root with Python 3 and Node.js.

```sh
python3 scripts/build_site.py
python3 -m unittest discover -s tests -v
node --test tests/*.mjs
python3 scripts/validate.py
python3 scripts/audit_internal_links.py
```

Use `python3 -m http.server 8000 --directory dist` for a local preview.
`SITE_URL` sets the canonical origin, for example `https://example.com`.
With no origin configured, the build blocks indexing. `ICT_TERMINAL_CUTOVER=1`
selects the public bookmark dispatcher. Its default is `0`.

## Source and hosting

| Path | Role |
|---|---|
| `scripts/`, `assets/`, `ict-lab/`, `ict-futures/`, `data/` | Canonical builders, browser code and catalogs |
| `dist/` | Generated public output from the Python builder, served by Vercel |
| `cloudflare/`, `supabase/` | Independently deployed edge gateway and database/auth ownership controls |
| `legacy/` | Historical source kept in Git |

See the [implementation guide](docs/IMPLEMENTATION.md), [environment reference](docs/ENVIRONMENT.md), and [changelog](CHANGELOG.md).
