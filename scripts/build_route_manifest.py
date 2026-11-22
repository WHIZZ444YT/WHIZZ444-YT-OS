"""Release evidence for generated routes, bookmarks and public source revisions."""
from hashlib import sha256
from html.parser import HTMLParser
import json
import re
from urllib.parse import urlsplit

from build_public_futures import TERMINAL_ROUTES


class RouteHtml(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors = set()
        self.indexable = True

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.anchors.add(values["id"])
        if tag == "meta" and values.get("name", "").lower() == "robots":
            self.indexable &= "noindex" not in values.get("content", "").lower()


def route_manifest(root, dist, *, cutover, commit=None):
    pages = {}
    for file in sorted(dist.rglob("*.html")):
        parser = RouteHtml()
        parser.feed(file.read_text(encoding="utf-8"))
        parser.close()
        path = "/" + file.relative_to(dist).as_posix()
        route = path.removesuffix("index.html") if file.name == "index.html" else path
        pages[route] = {"indexable": parser.indexable, "anchors": sorted(parser.anchors)}
    legacy_lab = (dist/"ict-lab/index.html").read_text(encoding="utf-8")
    match = re.search(r'<script[^>]+id="ict-legacy-details"[^>]*>(.*?)</script>', legacy_lab, re.S)
    lab_details = json.loads(match[1])
    bookmark_routes = {**TERMINAL_ROUTES, "desk": "/futures-intelligence/"}
    for target in (*bookmark_routes.values(), *(path for view in lab_details.values() for path in view.values())):
        part = urlsplit(target)
        if part.path not in pages or part.fragment and part.fragment not in pages[part.path]["anchors"]:
            raise ValueError(f"Missing release manifest destination: {target}")
    sources = ("ict-lab/catalog.json", "ict-futures/data/ict-academy.json",
               "ict-futures/data/market-universe.json", "data/contract-lifecycle.json")
    return {
        "schemaVersion": 1,
        "sourceCommit": commit if re.fullmatch("[0-9a-f]{40}", commit or "") else None,
        "terminalCutover": cutover,
        "bookmarkDispatcher": "/ict-futures/" if cutover else "/ict-futures/bookmarks/",
        "terminalFragments": bookmark_routes,
        "labQuery": {"parameters": ["view", "id", "q"], "details": lab_details},
        "browserKeyNames": ["ict-lab.practice.v1.*", "ictfos.academy.progress.v2", "ictfos.academy.done.v1",
                            "ictfos.journal.v1", "ictfos.checks.v1", "ictfos.personalEvents.v1"],
        "sourceSha256": {name: sha256((root/name).read_bytes()).hexdigest() for name in sources},
        "routes": pages,
    }
