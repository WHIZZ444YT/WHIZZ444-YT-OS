import json
from pathlib import Path
import sys
from urllib.parse import urlsplit


def compare(standard, cutover):
    for field in ("sourceCommit", "sourceSha256", "terminalFragments", "labQuery", "browserKeyNames"):
        if standard[field] != cutover[field]:
            raise ValueError(f"Cutover changed {field}")
    if standard["terminalCutover"] or not cutover["terminalCutover"]:
        raise ValueError("Expected standard manifest followed by cutover manifest")
    for manifest in (standard, cutover):
        if manifest["bookmarkDispatcher"] not in manifest["routes"]:
            raise ValueError("Missing bookmark dispatcher")
        for target in ("/charts/", "/sessions/", "/ict-lab/practice/16/#local-journal", "/ict-lab/"):
            location = urlsplit(target)
            route = manifest["routes"].get(location.path, {})
            if not route.get("indexable") or location.fragment and location.fragment not in route["anchors"]:
                raise ValueError(f"Missing public release destination: {target}")
        if manifest["routes"]["/account/"]["indexable"]:
            raise ValueError("Account route is indexable")
    changed = {
        route for route in standard["routes"].keys() | cutover["routes"].keys()
        if standard["routes"].get(route) != cutover["routes"].get(route)
    }
    unexpected = changed - {"/ict-futures/"}
    if unexpected:
        raise ValueError(f"Unexpected route changes: {sorted(unexpected)}")
    return {"sourceCommit": standard["sourceCommit"], "routesCompared": len(standard["routes"]),
            "changedRoutes": sorted(changed), "terminalFragments": len(standard["terminalFragments"])}


if __name__ == "__main__":
    try:
        standard, cutover = [json.loads(Path(path).read_text(encoding="utf-8")) for path in sys.argv[1:]]
        print(json.dumps(compare(standard, cutover), indent=2))
    except (OSError, KeyError, ValueError) as exc:
        sys.exit(f"Release parity failed: {exc}")


