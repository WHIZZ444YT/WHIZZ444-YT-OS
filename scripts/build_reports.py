"""Validate and render the link-only reports section of the source catalog."""
from html import escape
from urllib.parse import urlsplit


PUBLISHER_HOSTS = {
    "Federal Reserve Board": "www.federalreserve.gov",
    "European Central Bank": "www.ecb.europa.eu",
    "Bureau of Labor Statistics": "www.bls.gov",
    "Bureau of Economic Analysis": "www.bea.gov",
    "Energy Information Administration": "www.eia.gov",
    "OPEC": "www.opec.org",
    "Commodity Futures Trading Commission": "www.cftc.gov",
    "U.S. Department of the Treasury": "home.treasury.gov",
    "U.S. Department of Agriculture": "esmis.nal.usda.gov",
    "International Monetary Fund": "www.imf.org",
    "U.S. Securities and Exchange Commission": "www.sec.gov",
    "Cboe Global Markets": "www.cboe.com",
}


def reports_markup(reports):
    if not isinstance(reports, list) or not reports:
        raise ValueError("The official reports catalog must contain entries.")

    seen_ids = set()
    seen_urls = set()
    topics = set()
    publishers = set()
    cards = []
    for report in reports:
        identifier, publisher, topic, title, url = (
            report.get(field) for field in ("id", "publisher", "topic", "title", "url")
        )
        if any(not isinstance(value, str) or not value.strip()
               for value in (identifier, publisher, topic, title, url)):
            raise ValueError("Official reports require an ID, publisher, topic, title and URL.")
        destination = urlsplit(url)
        if (destination.scheme != "https" or publisher not in PUBLISHER_HOSTS
                or destination.netloc != PUBLISHER_HOSTS[publisher]
                or any(character.isspace() for character in url) or "\\" in url):
            raise ValueError(f"Report {identifier} requires an official publisher HTTPS URL.")
        if identifier in seen_ids or url in seen_urls:
            raise ValueError(f"Duplicate official report: {identifier}")
        seen_ids.add(identifier)
        seen_urls.add(url)
        topics.add(topic)
        publishers.add(publisher)
        cards.append(
            f'<article class="directory-card" data-report-topic="{escape(topic)}" '
            f'data-report-publisher="{escape(publisher)}">'
            f'<p class="card-eyebrow">{escape(topic)}</p><h3>{escape(title)}</h3>'
            f'<p>{escape(publisher)}</p><p>Release dates on publisher site</p>'
            f'<a href="{escape(url)}">Open official source</a></article>'
        )
    topic_options = "".join(f'<option>{escape(topic)}</option>' for topic in sorted(topics))
    publisher_options = "".join(f'<option>{escape(publisher)}</option>' for publisher in sorted(publishers))
    return (
        '<section class="content-section" aria-labelledby="official-reports">'
        '<h2 id="official-reports">Publisher directory</h2>'
        '<p><span class="data-pill">OFFICIAL LINK</span> '
        'Use publisher release dates and revisions. Related context covers issuer filings and the VIX index.</p>'
        '<div id="reportFilters" hidden><div class="filter-row">'
        f'<label>Topic <select class="search-input" id="reportTopic"><option value="">All topics</option>{topic_options}</select></label>'
        f'<label>Publisher <select class="search-input" id="reportPublisher"><option value="">All publishers</option>{publisher_options}</select></label>'
        '</div><p id="reportResult" role="status"></p></div>'
        f'<div class="directory-grid">{"".join(cards)}</div>'
        '<p><a href="/data-health/#provider-registry">Data Health and provider status</a></p></section>'
    )
