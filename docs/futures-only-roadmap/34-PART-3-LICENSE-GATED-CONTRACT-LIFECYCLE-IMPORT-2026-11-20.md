# Part 3 — Rights-gated contract lifecycle import

**Review date:** 20 November 2026  
**Status:** Import path implemented; public lifecycle data remains unconfigured.  
**Repository:** [WHIZZ444YT/WHIZZ444-YT-OS](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS)

## Why the page currently shows no contract dates

CME's [Information License Agreement](https://www.cmegroup.com/market-data/files/information-license-agreement-v5.0.pdf) restricts publication and redistribution unless expressly permitted. Its [June 2026 website-display update](https://www.cmegroup.com/market-data/files/market-data-license-agreement-updates-june-2026.pdf), scheduled to take effect on **1 January 2027**, explicitly defines F&O Website Information to include contract/instrument names, trading schedules, product codes, symbols and lifecycle dates, and restricts public display to licensed Website Display Distribution Packages and applicable fees. That update also includes explicit limits on automated access and AI/LLM use. Read together, these terms mean the project must not scrape and publish CME lifecycle dates as if public access alone granted redistribution permission. The exact entitlement applicable to a particular reference file still needs owner/legal confirmation.

ICE's [market-data policy](https://www.ice.com/fixed-income-data-services/data-and-analytics/exchange-data) describes licensed data use cases, and its [data-services page](https://www.ice.com/fixed-income-data-services/data-and-analytics/proprietary-data) says public website display of delayed ICE pricing data requires ICE approval. This does not by itself settle whether each date-only ICE expiry field is covered; the project owner must verify the applicable agreement and request approval where needed.

The precise source and product scope should be confirmed by the project owner or counsel. Until written public-display rights are confirmed for the data, fields, markets and site, the repository and generated site contain **zero contract lifecycle rows**. A local schedule prototype created during research was not committed or deployed and has been removed.

## What the implementation now does

- Keeps the Contract Specs page linked to the official CME and ICE schedules while labeling lifecycle date display as rights-gated.
- Emits a safe public status JSON with `0 / 15` families and zero rows. No sample, synthetic or unlicensed contract values appear in the generated site.
- Adds `scripts/import_authorized_contract_lifecycle.py`, an offline importer with no network calls. It requires a separate private rights manifest that attests to public website display for all 15 families and the specific lifecycle scope.
- Rejects absent or expired approval, incomplete family scope, stale/future source dates, duplicate or malformed rows, invalid dates, non-HTTPS/non-exchange source links and oversized input files. A refusal leaves the existing output untouched.
- Writes only a dated approval status into the public snapshot, never the private agreement reference. The builder independently checks the approval marker, review date and complete family coverage; without them, rows are hidden. It publishes only allowlisted fields.
- Adds tests for denied/expired approval, complete family scope, no-row default behavior, private-field filtering and preservation of the current safe snapshot when import is refused.

The importer checks data shape and a human-provided rights attestation. It cannot prove that an agreement is valid, determine whether it covers a particular display, independently verify exchange values or replace a legal review. An approved import still leaves the family marked partial until hours, holiday exceptions, rule-effective dates, cutoff times, complete settlement procedures and the roll method are independently reviewed.

## Import contract

The project owner supplies two local JSON files outside the repository:

1. A dated provider/exchange snapshot in the documented `schemaVersion: 1` structure, with one non-empty `contractMonths` list for every registry family, official source URLs, a source business date and ISO contract dates.
2. A private rights manifest with `status: "approved"`, `publicDisplayAllowed: true`, `scope: "contract-lifecycle-public-website"`, a private `licenseReference`, `reviewedAt`, `validThrough`, and the exact 15 family IDs.

Keep the manifest and any agreement files out of Git and ChatGPT. After the owner verifies the source rights and provides the authorized snapshot, run:

```text
python scripts/import_authorized_contract_lifecycle.py --snapshot <local-authorized-snapshot.json> --rights <local-private-rights-manifest.json>
python scripts/build_site.py
python -m unittest tests.test_contract_lifecycle -v
python scripts/validate.py
```

Review the generated diff before pushing. Public data should be included only if the recorded agreement explicitly permits redistribution on this website; no amount of successful tests substitutes for that authorization.

## Acceptance remaining

- Obtain and verify current written public-display rights for lifecycle fields for each of the 15 families.
- Supply a licensed/current snapshot and independently reconcile every row to its official source.
- Verify hours, breaks, holidays and early closes, cutoff times, rule revisions, settlement procedures and roll methodology.
- Review the resulting page on desktop/mobile and include this route in the full keyboard and screen-reader review.

Until those gates pass, all 15 families remain partial and risk outputs stay conditional.
