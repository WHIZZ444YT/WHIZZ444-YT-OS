"""Publish the reviewed Academy source-gap register without promoting candidates."""
from html import escape
import re
from urllib.parse import urlsplit

ROW = re.compile(r"^\| `([a-z0-9-]+)` \| ([^|]+) \| ([^|]+) \|$", re.MULTILINE)
LINK = re.compile(r"\[([^\]]+)\]\((https://[^)]+)\)")
WATCH_ID = re.compile(r"v=([A-Za-z0-9_-]{11})$")


def verification(video):
    evidence = []
    if video.get("publishedTitle") and video.get("linkCheckedAt"):
        evidence.append("metadata-observed")
    for field, label in (("publisherConfirmedAt", "publisher-confirmed"), ("watchTestedAt", "watch-tested"),
                         ("chapterTestedAt", "chapter-tested"), ("embedTestedAt", "embed-tested")):
        if video.get(field):
            evidence.append(label)
    return " / ".join(evidence) or "unconfirmed"


def gap_register(root, crosswalk, catalog, link):
    path = root / "docs/futures-market-improvements/12-ict-video-gap-register-and-public-ux.md"
    rows = ROW.findall(path.read_text(encoding="utf-8"))
    slugs = {slug for slug, _, _ in rows}
    if len(rows) != 31 or len(slugs) != len(rows) or slugs - crosswalk.academy.keys():
        raise ValueError("ICT gap register requires 31 distinct existing Academy slugs")
    if not set(crosswalk.coverage["missingIds"]).issubset(slugs):
        raise ValueError("An Academy video gap is missing from the source register")

    cards = []
    for slug, category, action in rows:
        segments, end = [], 0
        for match in LINK.finditer(action):
            label, target = match.groups()
            parsed = urlsplit(target)
            if not parsed.hostname or parsed.username or parsed.password or parsed.port:
                raise ValueError(f"Invalid source URL for {slug}")
            segments.extend((escape(action[end:match.start()]), link(label, target, True)))
            if parsed.hostname == "www.youtube.com":
                identifier = WATCH_ID.fullmatch(parsed.query)
                if parsed.path != "/watch" or not identifier:
                    raise ValueError(f"Invalid direct video for {slug}")
                video = catalog["videos"].get(identifier[1], {})
                segments.append(f' <small>{escape(verification(video))}</small>')
            end = match.end()
        segments.append(escape(action[end:]))
        title = crosswalk.academy[slug]["name"]
        status = "Mapped in the Academy" if slug in crosswalk.covered else "Exact coverage open"
        cards.append(f'<article class="ict-card" id="gap-{slug}"><h3>{link(title, "/ict-futures/academy/" + slug + ".html")}</h3>'
                     f'<p>{escape(category)}. {status}.</p><p>{"".join(segments)}</p></article>')
    return (f'<section class="ict-group" id="academy-video-gaps"><h2>Academy video evidence</h2>'
            f'<p>{len(crosswalk.covered)} of {len(crosswalk.academy)} Academy lessons have recorded mappings. '
            f'{len(crosswalk.coverage["missingIds"])} still need exact coverage. '
            'Candidates and related sources can support the written lessons while coverage is reviewed.</p>'
            '<div class="ict-grid">' + "".join(cards) + '</div></section>')
