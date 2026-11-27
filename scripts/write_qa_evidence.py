"""Write CI step outcomes and release prerequisites without exporting logs or environment values."""
import argparse
import json
import os
from pathlib import Path

QUALITY = {
    "runtime": "python3 --version; node --version",
    "build": "python3 scripts/build_site.py",
    "python_tests": "python3 -m unittest discover -s tests -v",
    "node_tests": "node --test tests/*.mjs",
    "version": "quality workflow inline release version check",
    "structure": "python3 scripts/validate.py",
    "links": "python3 scripts/audit_internal_links.py",
    "clean": "python3 scripts/check_clean_artifact.py",
    "watch_urls": "python3 scripts/check_ict_watch_urls.py",
    "worker_bundle": "npm ci --no-audit --no-fund; npm run worker:dry-run",
    "browser": "node scripts/check_public_ui.mjs <playwright-prefix> <screenshots>",
    "parity": "python3 scripts/check_release_parity.py <standard-manifest> dist/route-manifest.json",
}
DATABASE = {"database": "psql -h localhost -U postgres -d postgres -f tests/database_contracts.sql"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", choices=("quality", "database"))
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    steps = json.loads(os.environ.get("QA_STEP_RESULTS", "{}"))
    commands = QUALITY if args.profile == "quality" else DATABASE
    results = []
    for identifier, command in commands.items():
        outcome = steps.get(identifier, {}).get("outcome", "not-run")
        if outcome not in ("success", "failure", "skipped", "cancelled", "not-run"):
            outcome = "unknown"
        results.append({"id": identifier, "command": command, "outcome": outcome})
    data = {
        "schemaVersion": 1,
        "profile": args.profile,
        "commit": os.environ.get("GITHUB_SHA"),
        "runId": os.environ.get("GITHUB_RUN_ID"),
        "runAttempt": os.environ.get("GITHUB_RUN_ATTEMPT"),
        "terminalCutover": os.environ.get("ICT_TERMINAL_CUTOVER") if args.profile == "quality" else None,
        "checks": results,
        "prerequisitesOutsideCI": [
            {"id": "worker-deployment-and-read-only-smoke", "status": "unverified"},
            {"id": "production-migration-state", "status": "unverified"},
            {"id": "dataset-rights-and-provider-credentials", "status": "unverified"},
            {"id": "deployed-browser-preview", "status": "unverified"},
        ],
    }
    args.output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
