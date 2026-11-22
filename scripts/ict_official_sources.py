"""Original ICT browsing references and independent creator placements."""
from datetime import date
from urllib.parse import urlsplit


OFFICIAL_SERIES = (
    ("2016 Core Mentorship", "Begin with the official first lesson and its playlist.",
     "https://www.youtube.com/watch?ab_channel=TheInnerCircleTrader&list=PLVgHx4Z63paYzh3KwUFX0UHQUf31CAEXk&v=0LhteuLVuDU"),
    ("2022 Mentorship", "Open the introduction and mentorship playlist. Continue with P01 for the Lab exercise.",
     "https://www.youtube.com/watch?list=PLVgHx4Z63paYiFGQ56PjTF1PGePL3r69s&v=kt6V4ai60fI"),
    ("Charter Models", "Browse the creator's numbered price-action lectures.",
     "https://www.youtube.com/playlist?list=PLVgHx4Z63paasvEhegIwtiaGalrQphFg3"),
    ("2023 time macros", "Starting point for the original lecture on time macros.",
     "https://www.youtube.com/watch?v=fXVJnBVizYY"),
    ("2024 mentorship", "Selected lecture from the 2024 mentorship.",
     "https://www.youtube.com/watch?v=Onca4KgfQB4"),
    ("2025 opening range", "Selected starting point for opening-range coverage.",
     "https://www.youtube.com/watch?v=pM8oWrcIJqU"),
    ("2026 tape-reading", "Selected starting point for tape-reading coverage.",
     "https://www.youtube.com/watch?v=Hiq47zliJ_Y"),
)
CHARTER_INDEX = "https://info.quagmyre.com/xwiki/bin/view/Forex/The-Inner-Circle-Trader/ICT-Charter-Price-Action-Models/"

MENTOR_FOLLOWUPS = {
    "M06": (("BYIzvNBH59c", "ES time-cycle example", "Compare the stated timing rule with the ES chart."),
            ("2IhNk9wwAM4", "NQ PM walkthrough", "Mark the afternoon session window before reviewing the NQ example.")),
    "M09": (("k_CwnW9VnVg", "MMXM walkthrough", "Compare the phase labels with the buy and sell model lessons."),),
}
CREATOR_PLACEMENTS = {
    "C29": (("BYIzvNBH59c", "ES time-cycle example", "Compare the creator's timing convention with the session rule in this lesson."),),
    "C44": (("9AL41xON3hA", "TTrades Fractal Model", "Record the creator's higher-timeframe context and lower-timeframe trigger separately."),),
    "C45": (("9AL41xON3hA", "TTrades Fractal Model", "Compare the creator's confirmation rule with the close required by this exercise."),),
    "P08": (("QMNL9SMYUR4", "MMXM phase entries", "Identify the phase and the entry trigger independently."),
            ("k_CwnW9VnVg", "MMXM walkthrough", "Compare the buy-side phase sequence with this Lab playbook.")),
    "P09": (("QMNL9SMYUR4", "MMXM phase entries", "Identify the phase and the entry trigger independently."),
            ("k_CwnW9VnVg", "MMXM walkthrough", "Compare the sell-side phase sequence with this Lab playbook.")),
    12: MENTOR_FOLLOWUPS["M06"],
}


def creator_sources(records, catalog, existing=()):
    shown = {ref["id"] for ref in existing}
    return [{ "id": video, "label": label, "seconds": None, "url": catalog["videos"][video]["url"],
              "explanation": note + " Placement review pending."}
            for video, label, note in records if video not in shown]


def comparable_popular(sources, videos):
    """Rank distinct videos from one dated publisher snapshot cohort."""
    eligible = {}
    for ref in sources:
        video = videos[ref["id"]]
        snapshot = video.get("viewSnapshot") or {}
        count = snapshot.get("count")
        if type(count) is not int or count < 0 or snapshot.get("verified") is not True:
            continue
        if snapshot.get("sourceUrl") != video["url"]:
            continue
        try:
            day = date.fromisoformat(snapshot.get("observedAt", ""))
        except (TypeError, ValueError):
            continue
        eligible.setdefault(video["id"], (day, count, ref))
    dates = {day for day, _, _ in eligible.values()}
    if len(dates) != 1 or len(eligible) < 2:
        return []
    return [(ref, count, day.isoformat()) for day, count, ref in
            sorted(eligible.values(), key=lambda item: (-item[1], item[2]["id"]))]
