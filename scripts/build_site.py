#!/usr/bin/env python3
"""Build Finance Intelligence OS static routes from preserved source datasets."""
from __future__ import annotations
import json, os, shutil, re
from pathlib import Path
from html import escape
from datetime import date, datetime, timezone
from import_authorized_contract_lifecycle import validate_snapshot
from build_academy import academy_video_coverage, build_academy, verified_lesson_videos
from build_ict_lab import build_ict_lab
from build_route_manifest import route_manifest
from ict_crosswalk import IctCrosswalk, PUBLIC_MODELS
from public_market_context import build_market_context, market_context_text
from build_public_futures import bookmarks_page, chart_page, daily_brief, personal_reminders, search_page, session_heatmap, social_discovery

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
SITE_URL = os.getenv('SITE_URL', '').rstrip('/')
TERMINAL_CUTOVER = os.getenv('ICT_TERMINAL_CUTOVER') == '1'
PUBLIC_DOCS = {
    'docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md',
}

NAV_ITEMS = [
    ('Overview', '/'),
    ('Search', '/search/'),
    ('Markets', '/markets/'),
    ('Charts', '/charts/'),
    ('Macro', '/macro/'),
    ('Journal practice', '/ict-lab/practice/16/'),
    ('Futures Markets', '/futures-intelligence/'),
    ('ICT Academy', '/academy/'),
    ('Entry Models', '/entry-models/'),
    ('Sessions & Calendar', '/sessions/'),
    ('Futures News', '/news/'),
    ('Volume & Open Interest', '/volume-open-interest/'),
    ('COT & Positioning', '/research/positioning/'),
    ('Contract Specs & Expiry', '/contract-specs/'),
    ('Strategy Lab', '/strategy-lab/'),
    ('Risk & Prop Firms', '/risk/'),
    ('Journal & Watchlists', '/account/'),
    ('Data Health & Sources', '/data-health/'),
]

NAV_GROUPS = [
    ('WORKSPACE', ['Overview', 'Search']),
    ('LEARN', ['ICT Academy', 'Entry Models']),
    ('MARKETS', ['Futures Markets', 'Markets', 'Charts', 'Contract Specs & Expiry']),
    ('RESEARCH', ['Futures News', 'Macro', 'COT & Positioning', 'Volume & Open Interest', 'Data Health & Sources']),
    ('TOOLS', ['Sessions & Calendar', 'Strategy Lab', 'Risk & Prop Firms', 'Journal practice']),
    ('ACCOUNT', ['Journal & Watchlists']),
]

NAV_DISPLAY = {'Futures Markets': 'Futures Desk', 'Journal & Watchlists': 'Account'}

AREA_ALIASES = {
    '/tools/': '/risk/',
    '/sources/': '/data-health/',
}

AREA_LABELS = {
    '/markets/': 'Futures Markets',
    '/macro/': 'Sessions & Calendar',
    '/tools/': 'Risk & Prop Firms',
    '/sources/': 'Data Health & Sources',
    '/research/positioning/': 'COT & Positioning',
    '/status/': 'Platform Status',
    '/docs/': 'Documentation',
}

def current_area(path):
    if path.startswith('/academy/') or (path.startswith('/ict-lab/') and path != '/ict-lab/practice/16/'):
        return 'ICT Academy'
    if path == '/charts/':
        return 'Futures Charts'
    active = AREA_ALIASES.get(path, path)
    for label, href in NAV_ITEMS:
        if href == active:
            return label
    return AREA_LABELS.get(path, 'Futures Research')

def nav_markup(current='/'):
    active = AREA_ALIASES.get(current, current)
    if current.startswith(('/academy/', '/ict-futures/academy/')) or (
        current.startswith('/ict-lab/') and current != '/ict-lab/practice/16/'
    ):
        active = '/academy/'
    links = {label: href for label, href in NAV_ITEMS}
    groups = []
    for group, labels in NAV_GROUPS:
        items = []
        for label in labels:
            href = links[label]
            is_active = active == href
            visible_label = NAV_DISPLAY.get(label, label)
            symbol = {
                'Search':'SE','Markets':'MK','Charts':'CH','Macro':'MA','Journal practice':'JP',
                'Overview':'OV','Futures Markets':'FD','ICT Academy':'AC','Entry Models':'EM',
                'Sessions & Calendar':'SC','Futures News':'NW','Volume & Open Interest':'OI',
                'COT & Positioning':'CT','Contract Specs & Expiry':'SP','Strategy Lab':'SL',
                'Risk & Prop Firms':'RK','Journal & Watchlists':'JW','Data Health & Sources':'DH'
            }[label]
            current_state = 'page' if current == href else 'location'
            current_attr = f' aria-current="{current_state}"' if is_active else ''
            items.append(
                f'<a class="os-nav-link{" is-active" if is_active else ""}" href="{href}"{current_attr} aria-label="{escape(visible_label)}" title="{escape(visible_label)}">'
                f'<span class="os-nav-symbol" aria-hidden="true">{symbol}</span>'
                f'<span class="os-nav-label">{escape(visible_label)}</span></a>'
            )
        groups.append(f'<div class="os-nav-group"><span class="os-nav-group-label">{group}</span>{"".join(items)}</div>')
    return (
        '<aside class="os-sidebar" id="appSidebar" aria-label="Primary navigation">'
        '<button class="os-drawer-close secondary-button" type="button">Close navigation</button>'
        '<a class="os-sidebar-brand" href="/" aria-label="Futures Intelligence OS overview">'
        '<span class="brand-mark">FI</span><span class="os-brand-copy"><b>FUTURES INTELLIGENCE OS</b><small>RESEARCH WORKSPACE</small></span></a>'
        f'<nav class="os-sidebar-nav" aria-label="Futures product areas">{"".join(groups)}</nav>'
        '<div class="os-sidebar-foot"><span class="os-foot-dot"></span><span class="os-foot-copy">RESEARCH MODE · NO BROKER EXECUTION</span></div>'
        '</aside>'
    )


def load(path, default=None):
    try: return json.loads(path.read_text(encoding='utf-8'))
    except Exception: return default

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')

def json_script(value):
    return json.dumps(value, ensure_ascii=False).replace('</', '<\\/')


def futures_terminal_bundle():
    markets_data=load(ROOT/'ict-futures/data/market-universe.json',{})
    academy_data=load(ROOT/'ict-futures/data/ict-academy.json',{})
    playbook=load(ROOT/'ict-futures/data/ict-playbook.json',{})
    source_data=load(ROOT/'ict-futures/data/source-directory.json',{})
    snapshot=load(ROOT/'data/news-snapshot.json',{})
    source_registry={x.get('id'):x for x in academy_data.get('curriculum',{}).get('resourceRegistry',[]) if x.get('id')}
    featured={}
    concepts=[]
    for concept in academy_data.get('concepts',[]):
        curriculum=concept.get('curriculum') or {}
        learning=concept.get('learning') or {}
        refs=learning.get('references') or {}
        verified=verified_lesson_videos(concept)
        verified_ids=[]
        for video in verified:
            video_id=video.get('resourceId') or video.get('id') or video.get('videoId')
            if not video_id: continue
            verified_ids.append(video_id)
            featured.setdefault(video.get('url'),{
                'id':video_id,'title':video.get('title'),'url':video.get('url'),
                'publisher':video.get('channelName'),'verifiedOfficial':video.get('sourceClass')=='official_ict',
                'conceptIds':video.get('conceptIds',[]),'sourceNote':video.get('sourceNote','')
            })
        references=[]
        for source_id in curriculum.get('sourceRefs',[]):
            item=source_registry.get(source_id,{})
            url=str(item.get('url') or '')
            if url.startswith('https://'):
                references.append({'name':item.get('name') or item.get('title') or source_id,'url':url})
        concepts.append({
            'id':concept.get('id'),'name':concept.get('name'),'category':concept.get('category'),
            'level':concept.get('level'),'definition':concept.get('definition'),
            'howToUse':concept.get('howToUse') or curriculum.get('identificationRules',[]),
            'useCase':concept.get('useCase'),'commonMistakes':concept.get('commonMistakes'),
            'evidence':concept.get('evidence') or curriculum.get('sourceEvidenceLabel'),
            'sourceNote':concept.get('sourceNote') or learning.get('sourceCaution'),
            'related':concept.get('related',[]),'referenceLinks':references,
            'verifiedVideoIds':verified_ids,
            'videoSearch':curriculum.get('topicDiscoveryUrl') or refs.get('topicDiscovery'),
            'officialChannel':refs.get('officialChannel') or academy_data.get('officialChannel'),
            'officialPlaylists':refs.get('officialPlaylists') or academy_data.get('officialPlaylists'),
        })
    return {
        'generatedAt':markets_data.get('generatedAt'),
        'markets':markets_data.get('markets',[]),
        'academy':{
            'conceptCount':len(concepts),'concepts':concepts,'tracks':academy_data.get('tracks',[]),
            'featuredVideos':list(featured.values()),
            'officialChannel':academy_data.get('officialChannel'),
            'officialPlaylists':academy_data.get('officialPlaylists'),
        },
        'playbook':playbook,
        'checklist':load(ROOT/'ict-lab/checklist.json',[]),
        'snapshot':snapshot,
        'sources':source_data.get('sources',[]),
    }


def shell(title, description, body, canonical_path='/', extra_head='', right_panel=''):
    canonical = '<meta name="robots" content="noindex,nofollow">' if canonical_path == '/account/' else (f'<link rel="canonical" href="{escape(SITE_URL + canonical_path)}">' if SITE_URL else '<meta name="robots" content="noindex,follow">')
    og_url = escape(SITE_URL + canonical_path) if SITE_URL else ''
    speed_insights = '<script>window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };</script><script defer src="/_vercel/speed-insights/script.js"></script>'
    area = escape(current_area(canonical_path))
    right_class = ' has-context-panel' if right_panel else ''
    content = f'<div class="os-content-grid{right_class}"><div class="os-page-body">{body}</div>{right_panel}</div>'
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title><meta name="description" content="{escape(description)}">{canonical}
<meta property="og:type" content="website"><meta property="og:title" content="{escape(title)}"><meta property="og:description" content="{escape(description)}"><meta property="og:image" content="{escape((SITE_URL + '/assets/social-card.png') if SITE_URL else '/assets/social-card.png')}"><meta property="og:url" content="{og_url}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="/assets/social-card.png">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/site-shell.css"><script defer src="/assets/runtime-config.js"></script>{speed_insights}{extra_head}</head>
<body class="os-dark"><a class="skip" href="#content">Skip to content</a>
<div class="os-app-shell" data-os-shell>
{nav_markup(canonical_path)}<div class="os-sidebar-scrim" id="sidebarScrim" hidden></div>
<div class="os-main-column"><header class="os-topbar">
<div class="os-topbar-start"><button class="os-sidebar-toggle" id="sidebarToggle" type="button" aria-expanded="true" aria-controls="appSidebar" aria-label="Collapse navigation"><span aria-hidden="true">☰</span></button><div class="os-topbar-heading"><span>FUTURES INTELLIGENCE OS</span><b>{area}</b></div></div>
<div class="os-topbar-actions"><a class="os-global-search" href="/search/">Search</a><span class="os-mode-chip"><i></i> RESEARCH ONLY</span><button class="os-theme-toggle" id="osThemeToggle" type="button" aria-pressed="false" aria-label="Switch to light theme" title="Switch theme">☼</button><a class="os-workspace-link" href="/account/">Private workspace <span aria-hidden="true">↗</span></a></div>
</header><main id="content" tabindex="-1" class="os-content">{content}</main>
<footer class="os-footer"><div><b>Futures Intelligence OS</b><span>Exchange-listed futures research · ICT Futures education</span></div><div class="os-footer-links"><a href="/data-health/">Data Health &amp; Sources</a><a href="/status/">Platform status</a><a href="/docs/">Documentation</a><a href="/charts/">Futures Charts</a></div><small>Public-source frequency, freshness, contract verification and licensing boundaries apply. No broker execution is connected.</small></footer>
</div></div><script src="/assets/site-shell.js" defer></script></body></html>'''

def page_intro(kicker, title, desc, stats=''):
    return f'<section class="page-hero"><p class="kicker">{escape(kicker)}</p><h1>{escape(title)}</h1><p>{escape(desc)}</p>{stats}</section>'


def card(title, desc, href, eyebrow='Explore', tag=''):
    tag_html = f"<span class='card-tag'>{escape(tag)}</span>" if tag else ''
    return f'<a class="module-card" href="{escape(href)}"><span class="card-eyebrow">{escape(eyebrow)}</span><h3>{escape(title)}</h3><p>{escape(desc)}</p><span class="card-cta">Open module →</span>{tag_html}</a>'

def redirect_page(title, target):
    absolute = SITE_URL + target if SITE_URL else target
    safe = escape(absolute, quote=True)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>{escape(title)}</title><link rel="canonical" href="{safe}"><meta http-equiv="refresh" content="0;url={safe}"></head><body><p>{escape(title)}. <a href="{safe}">Continue</a>.</p><script>location.replace({json_script(absolute)});</script></body></html>'''


def contract_value(value, checked_at=None):
    if value is None or value == '':
        return '<span class="os-unverified-value">Not in source registry</span>'
    if isinstance(value, (int, float)):
        rendered = f'{value:.8g}'
    else:
        rendered = str(value)
    marker=(f'<span class="os-sourced-value">SOURCED · CHECKED {escape(str(checked_at))}</span>'
            if checked_at else '<span class="os-unverified-value">UNVERIFIED IMPORTED REFERENCE</span>')
    return f'<strong>{escape(rendered)}</strong>{marker}'


def contract_lifecycle_table(product, snapshot_date):
    rows = sorted(product.get('contractMonths') or [], key=lambda r: (r.get('lastTradeDate') or '9999-99-99', r.get('contractSymbol') or ''))
    if not rows:
        return '<section class="os-contract-lifecycle"><h4>Listed contract dates</h4><p class="os-unverified-value">No lifecycle dates are licensed and configured for public display. Use the official source links above to check the exact contract month.</p></section>'
    shown = rows[:10]
    def value(raw):
        return escape(str(raw)) if raw else '<span class="os-date-missing">Not published in this row</span>'
    body_rows=[]
    for row in shown:
        notice=' – '.join(x for x in (row.get('firstNoticeDate'), row.get('lastNoticeDate')) if x)
        delivery=' – '.join(x for x in (row.get('firstDeliveryDate'), row.get('lastDeliveryDate')) if x)
        if row.get('finalSettlementDate'):
            delivery='Final settlement '+str(row['finalSettlementDate'])
        body_rows.append('<tr>'
            +'<th scope="row">'+escape(str(row.get('contractSymbol') or 'Unknown'))+' · '+escape(str(row.get('contractMonth') or 'month unavailable'))+'</th>'
            +'<td>'+value(row.get('lastTradeDate'))+'</td>'
            +'<td>'+value(notice)+'</td>'
            +'<td>'+value(delivery)+'</td>'
            +'<td>'+value(row.get('settlementMethod'))+'</td>'
            +'</tr>')
    source_url = str(product.get('contractMonths', [{}])[0].get('sourceUrl') or '')
    source_link = f'<a class="os-source-link" href="{escape(source_url, quote=True)}" target="_blank" rel="noopener noreferrer">Open publisher source ↗</a>' if source_url.startswith('https://') else ''
    extra = f' · showing the next {len(shown)} of {len(rows)} listed rows' if len(rows) > len(shown) else f' · {len(rows)} listed rows'
    return (
        '<section class="os-contract-lifecycle"><details><summary>Listed contract dates <span class="os-state-chip neutral">DATED SNAPSHOT</span></summary>'
        +f'<p class="os-lifecycle-snapshot-note">Snapshot date: {escape(str(snapshot_date or "not recorded"))}{extra}. Rows are ordered by last trade date. Blank fields mean the publisher supplied no value in that row; they are not interpreted as “not applicable.”</p>'
        +'<div class="os-contract-date-table-wrap" tabindex="0" role="region" aria-label="Scrollable listed contract dates">'
        +'<table class="os-contract-date-table"><thead><tr><th scope="col">Publisher symbol · month</th><th scope="col">Last trade date</th><th scope="col">First–last notice</th><th scope="col">Delivery / final settlement</th><th scope="col">Settlement method</th></tr></thead><tbody>'
        +''.join(body_rows)+'</tbody></table></div><div class="os-contract-lifecycle-source">'+source_link+'</div></details></section>'
    )


def public_contract_lifecycle_data(source, family_ids=None, *, as_of=None):
    """Apply a fail-closed rights gate and allowlist the fields sent to the public site."""
    source = source if isinstance(source, dict) else {}
    if family_ids is None:
        family_ids = {row['id'] for row in load(ROOT/'ict-futures/data/market-universe.json', {})['markets']}
    today = as_of or datetime.now(timezone.utc).date()
    rights_review_date = source.get('rightsReviewDate')
    normalized = None
    if source.get('rightsStatus') == 'approved-public-display' and len(family_ids) == 15:
        try:
            reviewed = date.fromisoformat(rights_review_date)
            expires = date.fromisoformat(source.get('rightsValidThrough'))
            if reviewed.isoformat() == rights_review_date and expires.isoformat() == source['rightsValidThrough'] and reviewed <= today <= expires:
                checked = validate_snapshot(source, family_ids, today, require_fresh=False)
                if source.get('coverage') == checked['coverage']:
                    normalized = checked
        except (TypeError, ValueError):
            pass
    if normalized is None:
        return {
            'schemaVersion': 1,
            'status': 'not-configured',
            'rightsStatus': 'not-approved',
            'generatedAt': None,
            'asOfDate': None,
            'cmeSourceBusinessDate': None,
            'sourceFiles': [],
            'coverage': {'familyCount': 15, 'familiesWithCurrentOrFutureRows': 0, 'contractMonthRows': 0},
            'limitations': [
                'No lifecycle rows are published because public display rights are not configured and reviewed.',
                'Public availability or a free endpoint does not establish permission to republish market information.',
                'Use linked exchange sources to confirm exact contract-month dates, hours, notices and settlement terms.',
            ],
            'products': [],
        }
    product_fields = ('marketId', 'label', 'exchange', 'symbols', 'specificationUrl', 'sourceFileDate', 'sourceBusinessDate')
    row_fields = (
        'contractSymbol', 'contractMonth', 'productDescription', 'exchange', 'sourceStatusCode',
        'maturityDate', 'firstTradeDate', 'lastTradeDate', 'firstNoticeDate', 'lastNoticeDate',
        'firstDeliveryDate', 'lastDeliveryDate', 'finalSettlementDate', 'settlementMethodCode',
        'settlementMethod', 'sourceBusinessDate', 'sourceFile', 'sourceUrl',
    )
    public_products = []
    for product in normalized['products']:
        row_list = product.get('contractMonths') or []
        public_products.append({
            **{field: product.get(field) for field in product_fields if field in product},
            'contractMonths': [
                {field: row.get(field) for field in row_fields if field in row}
                for row in row_list if isinstance(row, dict)
            ],
        })
    public_sources = []
    for item in source.get('sourceFiles') or []:
        if not isinstance(item, dict):
            continue
        public_sources.append({key: item[key] for key in ('exchange', 'exchangeCode', 'file', 'fileDate', 'businessDate', 'rows', 'bytes', 'sha256', 'indexUrl', 'page') if key in item})
    return {
        'schemaVersion': 1,
        'status': 'authorized-snapshot',
        'rightsStatus': 'approved-public-display',
        'rightsReviewDate': rights_review_date,
        'generatedAt': source.get('generatedAt'),
        'asOfDate': source.get('asOfDate'),
        'cmeSourceBusinessDate': source.get('cmeSourceBusinessDate'),
        'sourceFiles': public_sources,
        'settlementCodeSource': source.get('settlementCodeSource'),
        'coverage': normalized['coverage'],
        'limitations': [str(value) for value in (source.get('limitations') or []) if isinstance(value, str)],
        'products': public_products,
    }



def wrap_standalone_shell(path, current_path, kind):
    if not path.exists(): return
    html = path.read_text(encoding='utf-8', errors='replace')
    if 'data-os-shell' in html: return
    sidebar = nav_markup(current_path)
    css_link = '<link rel="stylesheet" href="/assets/site-shell.css">'
    js_link = '<script defer src="/assets/site-shell.js"></script>'
    if '</head>' in html and css_link not in html:
        html = html.replace('</head>', css_link + '</head>', 1)
    if kind == 'ict':
        html = html.replace('<body>', '<body class="dark os-ict-terminal">', 1)
        html = html.replace('<body class="dark os-ict-terminal">', '<body class="dark os-ict-terminal"><div class="os-app-shell os-ict-shell" data-os-shell>' + sidebar + '<div class="os-sidebar-scrim" id="sidebarScrim" hidden></div><div class="os-main-column">', 1)
        html = html.replace("if(localStorage.getItem('ictfos.theme')==='dark')document.body.classList.add('dark');", "if(localStorage.getItem('ictfos.theme')==='light')document.body.classList.remove('dark');else document.body.classList.add('dark');")
        html = html.replace('<div class="wrap topbar-inner">', '<div class="wrap topbar-inner"><button class="os-sidebar-toggle" id="sidebarToggle" type="button" aria-expanded="true" aria-controls="appSidebar" aria-label="Collapse navigation">☰</button>', 1)
        # Retain the terminal's own theme preference/toggle and its anchor-based secondary navigation.
        html = html.replace('</body>', '</div></div>' + js_link + '</body>', 1)
    elif kind == 'desk':
        html = html.replace('<body>', '<body class="os-dark os-futures-desk">', 1)
        html = html.replace('<body class="os-dark os-futures-desk">', '<body class="os-dark os-futures-desk"><div class="os-app-shell os-desk-shell" data-os-shell>' + sidebar + '<div class="os-sidebar-scrim" id="sidebarScrim" hidden></div><div class="os-main-column">', 1)
        html = html.replace('<div class="head-inner">', '<div class="head-inner"><button class="os-sidebar-toggle" id="sidebarToggle" type="button" aria-expanded="true" aria-controls="appSidebar" aria-label="Collapse navigation">☰</button>', 1)
        html = re.sub(r'<nav class="topnav"[^>]*>.*?</nav>', '', html, count=1, flags=re.S)
        html = re.sub(r'<nav class="mobile-nav"[^>]*>.*?</nav>', '', html, count=1, flags=re.S)
        html = html.replace('<a class="fi-ict-link"', '<button class="os-theme-toggle" id="osThemeToggle" type="button" aria-pressed="false" aria-label="Switch to light theme" title="Switch theme">☼</button><a class="fi-ict-link"', 1)
        html = re.sub(r'<button class="menu-toggle" id="menuToggle"[^>]*>.*?</button>', '', html, count=1, flags=re.S)
        html = html.replace('</body>', '</div></div>' + js_link + '</body>', 1)
    target = "top" if kind == "ict" else "content"
    html = html.replace(f'<main id="{target}"', f'<main id="{target}" tabindex="-1"', 1)
    html = html.replace('<div class="os-app-shell',
                        f'<a class="skip" href="#{target}">Skip to content</a><div class="os-app-shell', 1)
    path.write_text(html, encoding='utf-8')



def build():
    if DIST.exists(): shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    # Copy repository files except dev-only/legacy archive material.
    for name in ['index.html','resources.json','icon.svg','manifest.webmanifest','sw.js','assets','ict-futures','futures-intelligence','SECURITY.md','LICENSE','.well-known']:
        src=ROOT/name
        if not src.exists(): continue
        dst=DIST/name
        if src.is_dir(): shutil.copytree(src,dst,dirs_exist_ok=True)
        else: shutil.copy2(src,dst)
    for name in sorted(PUBLIC_DOCS):
        target = DIST/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/name, target)
    obsolete_prediction_client = DIST/'assets/prediction-markets.js'
    if obsolete_prediction_client.exists(): obsolete_prediction_client.unlink()
    market_registry = load(ROOT/'ict-futures/data/market-universe.json',{})
    mdata = market_registry['markets']
    shutil.copyfile(ROOT/'ict-lab/practice.js', DIST/'assets/ict-practice.mjs')
    ict_terminal=DIST/'ict-futures/index.html'
    desk = DIST/'futures-intelligence/index.html'
    write(desk, desk.read_text(encoding='utf-8').replace('<!-- DAILY_BRIEF -->', daily_brief(mdata, json_script), 1))
    wrap_standalone_shell(desk, '/futures-intelligence/', 'desk')
    if TERMINAL_CUTOVER:
        write(DIST/'ict-futures/sw.js', (ROOT/'scripts/retire_terminal_worker.js').read_text(encoding='utf-8'))
    else:
        ict_html=ict_terminal.read_text(encoding='utf-8')
        placeholder='__FUTURES_DATA_BUNDLE__'
        if ict_html.count(placeholder)!=1:
            raise ValueError('ICT terminal must contain one futures data bundle placeholder')
        ict_terminal.write_text(ict_html.replace(placeholder,json_script(futures_terminal_bundle()),1),encoding='utf-8')
        wrap_standalone_shell(ict_terminal, '/academy/', 'ict')
    # Route SEO metadata and old hardcoded host cleanup in copied ICT child pages.
    for html in DIST.rglob('*.html'):
        if html == DIST/'index.html': continue
        s=html.read_text(encoding='utf-8', errors='replace')
        s=re.sub(r'<link rel="canonical" href="https://whizz444yt-ux\.github\.io/new\.w/[^\"]*">', '', s, flags=re.I)
        s=re.sub(r'https://whizz444yt-ux\.github\.io/new\.w', '', s)
        if SITE_URL:
            rel='/' + str(html.relative_to(DIST)).replace('\\','/')
            if html.name == 'index.html': rel = '/' + str(html.parent.relative_to(DIST)).replace('\\','/') .strip('.') + '/' if html.parent != DIST else '/'
            canonical=f'<link rel="canonical" href="{escape(SITE_URL+rel)}">'
            if re.search(r'<link rel="canonical"',s,re.I): s=re.sub(r'<link rel="canonical"[^>]*>',canonical,s,count=1,flags=re.I)
            else: s=s.replace('</head>',canonical+'</head>',1)
            if 'property="og:image"' not in s: s=s.replace('</head>','<meta property="og:image" content="'+escape(SITE_URL+'/assets/social-card.png')+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+escape(SITE_URL+'/assets/social-card.png')+'"></head>',1)
        else:
            s=re.sub(r'<meta name="robots" content="index,follow">','<meta name="robots" content="noindex,follow">',s,count=1,flags=re.I)
        # Repair only the generated contract-page comparison sentence; never run this through scripts.
        if html.parent.name == 'markets' and 'Comparison discipline:' in s:
            s=re.sub(r'(<p><strong>Comparison discipline:</strong>\s*)\[&#x27;(.*?)&#x27;\](\s*</p>)',r'\1\2\3',s,flags=re.I|re.S)
        if html.parent == DIST/'ict-futures/markets':
            s=s.replace(f'../index.html?market={html.stem}#market-profile',
                        f'/futures-intelligence/?market={html.stem}#fiSelectedMarket')
        html.write_text(s,encoding='utf-8')
    # The legacy child sitemap used the previous GitHub Pages domain; the root sitemap below owns all canonical URLs.
    for stale in [DIST/'ict-futures/sitemap.xml', DIST/'ict-futures/robots.txt']:
        if stale.exists(): stale.unlink()
    # The merged site has one authoritative root robots.txt and sitemap; discard the legacy ICT sub-site copies.
    for old_seo_file in [DIST/'ict-futures/robots.txt', DIST/'ict-futures/sitemap.xml']:
        if old_seo_file.exists(): old_seo_file.unlink()
    # Futures Command Center source is the maintained root index.html.
    home = (DIST/'index.html').read_text(encoding='utf-8')
    home = re.sub(r'<aside class="os-sidebar" id="appSidebar".*?</aside>',
                  lambda _: nav_markup('/'), home, count=1, flags=re.S)
    if SITE_URL:
        canonical = f'<link rel="canonical" href="{escape(SITE_URL + "/")}">'
        if 'rel="canonical"' not in home: home = home.replace('</head>', canonical + '</head>', 1)
        if 'property="og:image"' not in home: home = home.replace('</head>', '<meta property="og:image" content="' + escape(SITE_URL + '/assets/social-card.png') + '"></head>', 1)
    elif '<meta name="robots" content="noindex,follow">' not in home:
        home = home.replace('</head>', '<meta name="robots" content="noindex,follow"></head>', 1)
    (DIST/'index.html').write_text(home, encoding='utf-8')

    # Generate app routes from source datasets.
    resources = load(ROOT/'resources.json',{}).get('resources',[])
    academy_data = load(ROOT/'ict-futures/data/ict-academy.json',{})
    academy = academy_data.get('concepts',[])
    catalog = load(ROOT/'ict-lab/catalog.json')
    playbook_data=load(ROOT/'ict-futures/data/ict-playbook.json',{})
    crosswalk = IctCrosswalk(academy_data, catalog, playbook_data)
    build_academy(DIST, academy_data, SITE_URL, crosswalk)
    lab_routes = build_ict_lab(ROOT, DIST, shell, write, academy, json_script, catalog, crosswalk, mdata)
    write(DIST/'academy/crosswalk/index.html', shell(
        'Academy and Lab Crosswalk | Futures Intelligence OS',
        'Find shared definitions, distinct models and Academy media gaps.',
        page_intro('ICT curriculum', 'Academy and Lab crosswalk',
                   'Move between Lab lessons, Academy references, and model variants.') +
        '<section class="content-section">' + crosswalk.page() + '</section>', '/academy/crosswalk/'))
    write(DIST/'search/index.html', shell('Search | Futures Intelligence OS',
          'Find public futures routes, Academy lessons and ICT Lab content.',
          search_page(mdata, academy, catalog, [
              (group.title(), [(NAV_DISPLAY.get(label, label), dict(NAV_ITEMS)[label]) for label in labels])
              for group, labels in NAV_GROUPS if group not in {'WORKSPACE', 'ACCOUNT'}
          ], json_script, crosswalk), '/search/',
          '<link rel="stylesheet" href="/assets/ict-public.css"><script defer src="/assets/public-search.js"></script>'))
    write(DIST/'charts/index.html', shell('Futures Charts | Futures Intelligence OS',
          'Compare futures charts in TradingView.', chart_page(mdata), '/charts/',
          '<link rel="stylesheet" href="/assets/ict-public.css"><script defer src="/assets/public-charts.js"></script>'))
    bookmark_routes = ['/ict-futures/bookmarks/']
    if TERMINAL_CUTOVER:
        bookmark_routes.append('/ict-futures/')
    for bookmark_route in bookmark_routes:
        write(DIST/bookmark_route.lstrip('/')/'index.html',
              shell('ICT Futures bookmarks', 'Public destinations for saved terminal bookmarks.',
                    bookmarks_page(mdata, json_script), bookmark_route,
                    '<meta name="robots" content="noindex,follow"><script defer src="/assets/ict-terminal-compat.js"></script>'))
    news = load(ROOT/'data/news-snapshot.json',{})
    lifecycle_data=public_contract_lifecycle_data(load(ROOT/'data/contract-lifecycle.json',{}))
    market_context = build_market_context(market_registry, lifecycle_data)
    for context in market_context["families"].values():
        context["summary"] = market_context_text(context)
    write(DIST/'data/market-context.json', json_script(market_context))
    desk_path = DIST/'futures-intelligence/index.html'
    desk = desk_path.read_text(encoding='utf8')
    desk = desk.replace('</body>', f'<script id="publicMarketContext" type="application/json">{json_script(market_context)}</script></body>', 1)
    write(desk_path, desk)
    lifecycle_products={x.get('marketId'):x for x in lifecycle_data.get('products',[]) if x.get('marketId')}
    lifecycle_snapshot_date=lifecycle_data.get('cmeSourceBusinessDate') or lifecycle_data.get('asOfDate') or 'not recorded'
    write(DIST/'data/contract-lifecycle.json',json.dumps(lifecycle_data,ensure_ascii=False,indent=2)+'\n')

    # Contract specification and lifecycle registry. We link to exchange-maintained
    # calendars instead of scraping them or copying unverified, date-sensitive rows.
    contract_cards=[]
    cme_expiry_url='https://www.cmegroup.com/tools-information/calendars/expiration-calendar.html'
    cme_holiday_url='https://www.cmegroup.com/tools-information/holiday-calendar.html'
    cme_hours_url='https://www.cmegroup.com/trading-hours.html'
    ice_dx_expiry_url='https://www.ice.com/products/194/US-Dollar-Index-Futures/expiry'
    lifecycle_fields=[
        'Listed contract months and active expiry',
        'Last trade date and cutoff time',
        'First notice / last notice dates (where applicable)',
        'First / last delivery or final settlement dates',
        'Settlement method and delivery obligations',
        'Product hours, breaks and holiday exceptions',
        'Effective date, rule revision and source history',
        'Roll trigger and continuous-series adjustment policy',
    ]
    for m in mdata:
        evidence=m.get('specEvidence') or {}
        official=str(evidence.get('sourceUrl') or m.get('specsUrl') or '')
        checked_at=str(evidence.get('checkedAt') or 'not recorded')
        official_link=f'<a class="os-source-link" href="{escape(official, quote=True)}" target="_blank" rel="noopener noreferrer">{escape(str(evidence.get("publisher") or "Official exchange"))} specifications ↗</a>' if official.startswith(('https://','http://')) else '<span class="muted">Official specification link not supplied</span>'
        exchange=str(m.get('exchange') or '')
        expiry_url=ice_dx_expiry_url if exchange=='ICE US' else cme_expiry_url
        expiry_label='ICE DX expiry details' if exchange=='ICE US' else 'CME expiration calendar'
        calendar_links=(
            f'<a class="os-source-link" href="{escape(expiry_url, quote=True)}" target="_blank" rel="noopener noreferrer">{expiry_label} ↗</a>'
            + ('' if exchange=='ICE US' else f'<a class="os-source-link" href="{cme_holiday_url}" target="_blank" rel="noopener noreferrer">CME holiday calendar ↗</a><a class="os-source-link" href="{cme_hours_url}" target="_blank" rel="noopener noreferrer">CME trading hours ↗</a>')
        )
        specs=[
            ('Contract unit / reference basis',contract_value(m.get('unit'),checked_at)),
            ('Micro alias / reference',contract_value(m.get('micro'),checked_at) if m.get('microSpec') else '<span class="os-unverified-value">No micro profile supplied</span>'),
            ('Tick size',contract_value(m.get('tickSize'),checked_at)),
            ('Tick value',contract_value(m.get('tickValue'),checked_at)),
            ('Point value',contract_value(m.get('pointValue'),checked_at)),
            ('Quote convention','<span class="os-unverified-value">NOT VERIFIED IN THIS RECORD</span>'),
            ('Active month / last trade','<span class="os-unverified-value">NO LICENSED SNAPSHOT CONFIGURED · CHECK OFFICIAL SOURCE</span>'),
            ('Notice / delivery dates','<span class="os-unverified-value">PUBLISHER FIELDS SHOWN PER LISTED MONTH; BLANKS ARE NOT INTERPRETED</span>'),
            ('Settlement / delivery','<span class="os-unverified-value">METHOD IS SHOWN PER ROW; FULL PRODUCT PROCEDURE STILL NEEDS REVIEW</span>'),
            ('Trading hours / exceptions','<span class="os-unverified-value">OFFICIAL EXCHANGE SCHEDULE · NOT TRANSCRIBED</span>'),
            ('Roll / continuous-series method','<span class="os-unverified-value">NO APPROVED POLICY CONFIGURED</span>'),
            ('Reference set',escape(str(m.get('specVersionId') or 'version-not-recorded'))),
            ('Core facts checked',escape(checked_at)),
            ('Effective date / revision','<span class="os-unverified-value">NOT VERIFIED IN THIS RECORD</span>'),
        ]
        spec_rows=''.join(f'<div class="os-spec-field"><span>{label}</span>{value}</div>' for label,value in specs)
        pending_items=[str(x) for x in evidence.get('pendingFields', lifecycle_fields)]
        pending=escape(', '.join(pending_items or lifecycle_fields))
        pending_note=(f'<details class="os-lifecycle-details"><summary>Full lifecycle sign-off still pending</summary><p>{pending}</p><p>The dated rows below report publisher-listed dates only. They do not establish the cutoff time, effective rule revision, product hours/holiday exceptions or a continuous-series roll policy.</p></details>')
        context_label = escape(market_context["families"][m["id"]]["summary"])
        spec_rows += f'<div class="os-spec-field"><span>Market context</span><span>{context_label}</span></div>'
        month_snapshot=contract_lifecycle_table(lifecycle_products.get(str(m.get('id') or ''),{}),lifecycle_snapshot_date)
        micro=m.get('microSpec') or {}
        micro_html=''
        if micro:
            micro_evidence=micro.get('specEvidence') or {}
            micro_url=str(micro_evidence.get('sourceUrl') or '')
            micro_link=(f'<a class="os-source-link" href="{escape(micro_url, quote=True)}" target="_blank" rel="noopener noreferrer">CME micro specification ↗</a>'
                        if micro_url.startswith(('https://','http://')) else '<span class="muted">Micro specification source not supplied</span>')
            micro_fields=[
                ('Micro code',escape(str(micro.get('symbol') or 'not supplied'))),
                ('Micro contract unit',contract_value(micro.get('unit'),micro_evidence.get('checkedAt'))),
                ('Micro tick size',contract_value(micro.get('tickSize'),micro_evidence.get('checkedAt'))),
                ('Micro tick value',contract_value(micro.get('tickValue'),micro_evidence.get('checkedAt'))),
                ('Micro core facts checked',escape(str(micro_evidence.get('checkedAt') or 'not recorded'))),
            ]
            micro_rows=''.join(f'<div class="os-spec-field"><span>{label}</span>{value}</div>' for label,value in micro_fields)
            micro_html=(f'<section class="os-micro-spec"><h4>Micro contract reference <span class="os-state-chip warn">PARTIAL</span></h4>'
                        f'<div class="os-spec-grid">{micro_rows}</div>'
                        f'<div class="os-contract-spec-source">{micro_link}</div></section>')
        contract_cards.append(
            f'<article id="{escape(str(m.get("id","")))}" class="os-contract-spec-card" data-family="{escape(str(m.get("id","")), quote=True)}" data-exchange="{escape(exchange, quote=True)}" data-search="{escape((str(m.get("id",""))+" "+str(m.get("label",""))+" "+exchange+" "+str((m.get("microSpec") or {}).get("symbol", ""))).lower(), quote=True)}"><div class="os-contract-spec-head"><div><span class="os-eyebrow">{escape(exchange or "Exchange")} · {escape(str(m.get("tier","")))}</span><h3>{escape(str(m.get("label","Futures family")))}</h3></div><span class="os-state-chip warn">PARTIAL · SOURCED CORE</span></div>'
            f'<p class="os-spec-review-note">Contract unit and outright tick fields were checked against an official source on {escape(checked_at)}. A dated month-by-month schedule is supplied below; full lifecycle sign-off remains incomplete.</p>'
            f'<div class="os-spec-grid">{spec_rows}</div><div class="os-contract-spec-source">{official_link}{calendar_links}</div>{month_snapshot}{pending_note}{micro_html}</article>'
        )
    body=page_intro('Contract reference registry','Contract Specs & Expiry','Search all 15 retained futures families. Review source-linked core facts and official exchange schedules. Contract lifecycle dates remain hidden until public display rights are verified and an authorized snapshot is configured.')
    body+='<section class="content-section os-contract-warning"><h2>Contract date display is rights-gated</h2><p>No exchange contract-month dates are currently configured for public display. Public availability or a free source does not establish redistribution permission. The registry links to official CME and ICE sources so users can check the exact listed contract. A licensed snapshot may be added only after a human reviewer verifies the public display rights and source scope. Risk estimates remain conditional.</p></section>'
    exchange_options=''.join(f'<option value="{escape(x, quote=True)}">{escape(x)}</option>' for x in sorted({str(m.get("exchange") or "") for m in mdata if m.get("exchange")}))
    body+='<section class="content-section os-contract-controls" aria-label="Filter contract families"><label for="contractSpecSearch">Find a family<input id="contractSpecSearch" type="search" placeholder="Search NQ, Gold, Micro…" autocomplete="off"></label><label for="contractSpecExchange">Exchange<select id="contractSpecExchange"><option value="all">All exchanges</option>'+exchange_options+'</select></label><span id="contractSpecCount" class="sessions-result-count" role="status" aria-live="polite">15 of 15 families</span></section>'
    schedule_coverage=lifecycle_data.get('coverage') or {}
    schedule_rows=int(schedule_coverage.get('contractMonthRows') or 0)
    body+=f'<section class="content-section os-contract-coverage"><div><span class="os-eyebrow">LICENSED CONTRACT-MONTH SCHEDULE</span><strong>{int(schedule_coverage.get("familiesWithCurrentOrFutureRows") or 0)} / {int(schedule_coverage.get("familyCount") or 15)} families · {schedule_rows} rows</strong><p>{("Authorized snapshot date: "+escape(str(lifecycle_snapshot_date))+". The snapshot does not refresh automatically. ") if lifecycle_data.get("rightsStatus")=="approved-public-display" else "No schedule rows are configured for public display. The complete roadmap still requires hours, holiday exceptions, effective revisions and roll-policy review."}Full lifecycle sign-off remains 0 / 15 until all required lifecycle fields are reviewed.</p><a class="os-source-link" href="/data/contract-lifecycle.json">View lifecycle-data availability (JSON) ↗</a></div><a class="text-link" href="https://www.cmegroup.com/tools-information/calendars/expiration-calendar.html" target="_blank" rel="noopener noreferrer">CME expiry calendar ↗</a></section>'
    body+='<section class="os-contract-spec-grid">'+''.join(contract_cards)+'</section>'
    body+='<section class="content-section"><h2>How a lifecycle record becomes verified</h2><ol class="os-lifecycle-steps"><li>Confirm that the exact source, fields, market and public website display are covered by current written rights.</li><li>Import a dated source snapshot with the private rights manifest kept outside the public repository.</li><li>Review exact contract-month trade, notice, delivery and settlement fields against the permitted official source.</li><li>Reconcile product hours, breaks, holiday overrides, rule revisions and cutoff times.</li><li>Document a separate roll policy and reviewer evidence; keep the family PARTIAL until every required field is supported.</li></ol><p>The site does not scrape exchange pages. Its importer has no network access, requires an owner-approved public-display rights manifest, rejects stale or incomplete inputs and publishes only an allowlisted snapshot. This mechanical check does not independently prove the license or validate the source values. No expiry is inferred from generic weekday rules.</p><a class="text-link" href="/data-health/">Review data and source status →</a></section>'
    body+='<script>(()=>{const search=document.getElementById("contractSpecSearch"),exchange=document.getElementById("contractSpecExchange"),count=document.getElementById("contractSpecCount"),cards=[...document.querySelectorAll(".os-contract-spec-card")];function apply(){const q=(search.value||"").trim().toLowerCase(),x=exchange.value;let visible=0;for(const card of cards){const show=(!q||card.dataset.search.includes(q))&&(x==="all"||card.dataset.exchange===x);card.hidden=!show;if(show)visible++;}count.textContent=`${visible} of ${cards.length} families`; }search.addEventListener("input",apply);exchange.addEventListener("change",apply);})();</script>'
    write(DIST/'contract-specs/index.html',shell('Contract Specs & Expiry | Futures Intelligence OS','Futures contract reference registry with explicit verification status and expiry-data coverage.',body,'/contract-specs/'))

    # Session references are conventions; official publisher schedules are fetched through the edge gateway at runtime.
    session_records=playbook_data.get('sessions',[])
    session_page_data={
        'timezone':'America/New_York',
        'windows':[x for x in session_records if x.get('scheduleClass')=='ict-reference-window'],
        'referencePoints':[x for x in session_records if x.get('scheduleClass')=='market-reference-window'],
        'exchangeReferences':[x for x in session_records if x.get('scheduleClass')=='exchange-break-reference'],
        'markets':[{'id':m.get('id'),'label':m.get('label')} for m in mdata]
    }
    family_options=''.join(f'<option value="{escape(str(m.get("id","")),quote=True)}">{escape(str(m.get("label","")))}</option>' for m in mdata if m.get('id') and m.get('label'))
    session_body=page_intro('Sessions & catalysts','Session engine & economic calendar','A timezone-aware view of ICT practitioner reference windows plus official BLS, EIA, CFTC, Federal Reserve, ECB, Bank of England, Bank of Canada, RBA and BEA schedule snapshots. Publisher schedules remain separate from exchange trading hours and licensed market data.')
    session_body+='<section class="content-section sessions-controls"><div><label for="sessionsTimezone">Display timezone</label><select id="sessionsTimezone"><option value="browser">Use this device</option><option value="Asia/Kolkata">Asia/Kolkata · IST</option><option value="America/New_York">America/New_York · ET</option><option value="Europe/London">Europe/London</option><option value="UTC">UTC</option></select></div><div><label for="sessionsRange">Calendar range</label><select id="sessionsRange"><option value="30">Next 30 days</option><option value="7">Next 7 days</option><option value="1">Next 24 hours</option><option value="all">All publisher rows</option></select></div><div><label for="sessionsFamily">Contract relevance</label><select id="sessionsFamily"><option value="all">All futures families</option>'+family_options+'<option value="unmapped">Unmapped / general</option></select></div><button class="primary-button" id="sessionsRefresh" type="button">Refresh official schedule</button><button class="sessions-secondary" id="sessionsExport" type="button" disabled>Export visible events (ICS)</button></section>'
    session_body+='<section class="content-section" id="calendar"><div class="section-top"><div><p class="kicker">OFFICIAL ISSUER SCHEDULES</p><h2>Upcoming publisher releases</h2><p>Times and dates are source-attributed. ECB, FOMC and RBA entries are date-only when the publisher supplies no release time. BEA dates include publisher-supplied UTC times. No forecasts, actual values or exchange hours are inferred.</p></div><span class="sessions-result-count" id="sessionsResultCount">Loading…</span></div><p class="sessions-live-state" id="sessionsLiveState" role="status" aria-live="polite">Retrieving official publisher schedules.</p><div class="sessions-event-list" id="sessionsEventList"></div><div class="sessions-source-line"><a href="https://www.bls.gov/schedule/news_release/bls.ics" target="_blank" rel="noopener noreferrer">Open BLS iCalendar feed ↗</a><a href="https://www.bls.gov/schedule/" target="_blank" rel="noopener noreferrer">Verify BLS release schedule ↗</a><a href="https://www.eia.gov/petroleum/supply/weekly/schedule.php" target="_blank" rel="noopener noreferrer">Verify EIA WPSR schedule ↗</a><a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm" target="_blank" rel="noopener noreferrer">Verify CFTC COT schedule ↗</a><a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" target="_blank" rel="noopener noreferrer">Verify FOMC meeting dates ↗</a><a href="https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html" target="_blank" rel="noopener noreferrer">Verify ECB council dates ↗</a><a href="https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates" target="_blank" rel="noopener noreferrer">Verify Bank of England MPC dates ↗</a><a href="https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/" target="_blank" rel="noopener noreferrer">Verify Bank of Canada dates ↗</a><a href="https://www.rba.gov.au/schedules-events/board-meeting-schedules.html" target="_blank" rel="noopener noreferrer">Verify RBA board dates ↗</a><a href="https://www.bea.gov/news/schedule" target="_blank" rel="noopener noreferrer">Verify BEA release schedule ↗</a><span id="sessionsRetrievedAt">Retrieval time: not yet available</span></div></section>'
    session_body+='<section class="sessions-summary" aria-label="Current calendar status"><article><span class="sessions-kicker">PUBLISHER FEEDS</span><strong id="sessionsFeedState">Checking official schedules…</strong><small id="sessionsFeedMeta">Each issuer feed reports its own retrieval time and coverage.</small></article><article><span class="sessions-kicker">DISPLAY TIMEZONE</span><strong id="sessionsClock">—</strong><small id="sessionsTimezoneLabel">Using your browser timezone</small></article><article><span class="sessions-kicker">SOURCE COVERAGE</span><strong>BLS · EIA · CFTC · FED · ECB · BOE · BOC · RBA · BEA</strong><small>Publisher-specific snapshots; ECB, FOMC and RBA entries may be date-only. BEA times are supplied as UTC. This is not a complete macro calendar.</small></article></section>'
    session_body+='<section class="content-section" id="windows"><div class="section-top"><div><p class="kicker">ICT REFERENCE PROFILE</p><h2>New York reference windows</h2><p>Times use the IANA <code>America/New_York</code> zone, so DST is applied by the runtime timezone database.</p></div><span class="sessions-reference-badge">PRACTITIONER CONVENTION</span></div><div class="sessions-reference-toolbar"><label for="sessionsWindowDate">Reference date (New York)<input id="sessionsWindowDate" type="date"></label><span id="sessionsWindowNow" class="sessions-note">Reference windows are not exchange trading hours or signals.</span></div><div class="sessions-window-list" id="sessionsWindowList"></div><p class="sessions-footnote">Window scope is not specified in the source at an individual-window level. Verify whether a convention applies to the selected contract. Cash open and the unverified CME maintenance reference are shown separately below.</p><div class="sessions-reference-points" id="sessionsReferencePoints"></div></section>'
    session_body+='<section class="content-section sessions-exchange-note"><p class="kicker">EXCHANGE SCHEDULES</p><h2>Official product hours are not configured</h2><p>No verified CME/ICE holiday, early-close, maintenance-break or product-specific schedule feed is connected. Do not use the ICT reference windows as a substitute. Review the official exchange calendar and product specifications for the active contract.</p><div class="sessions-source-line"><a href="https://www.cmegroup.com/tools-information/holiday-calendar.html" target="_blank" rel="noopener noreferrer">CME holiday calendar ↗</a><a href="https://www.cmegroup.com/trading-hours.html" target="_blank" rel="noopener noreferrer">CME trading hours ↗</a><a href="https://www.ice.com/marketdata/reports/248" target="_blank" rel="noopener noreferrer">ICE trading hours and calendars ↗</a><a href="/data-health/">Review provider status →</a></div></section>'
    session_body+=session_heatmap(mdata) + personal_reminders(mdata)
    session_body+=f'<script type="application/json" id="sessionsPageData">{json_script(session_page_data)}</script>'
    write(DIST/'sessions/index.html',shell('Sessions & Calendar | Futures Intelligence OS','Timezone-aware ICT Futures reference windows and official BLS, EIA, CFTC, Federal Reserve, ECB, Bank of England, Bank of Canada, RBA and BEA schedules, with clear coverage and exchange-hours status.',session_body,'/sessions/','<link rel="stylesheet" href="/assets/sessions-page.css"><script defer src="/assets/session-time.js"></script><link rel="stylesheet" href="/assets/ict-public.css"><script defer src="/assets/publisher-schedules.js"></script><script defer src="/assets/legacy-reminders.js"></script><script defer src="/assets/sessions-page.js"></script>'))

    # Markets
    cards=''.join(
        f'<div data-market-profile="{escape(m["id"])}" data-tier="{escape(m["tier"])}">'
        + card(m["label"],market_context["families"][m["id"]]["summary"],f'/ict-futures/markets/{m["id"]}.html',m["exchange"],m["tier"])
        + '</div>' for m in mdata)
    market_filter='<form hidden class="ict-chart-controls"><label>Find a contract <input type="search" name="q"></label><label>Tier <select name="tier"><option value="">All</option><option>T1</option><option>T2</option><option>T3</option></select></label></form><p role="status"></p>'
    body=page_intro('Listed futures universe','Futures markets','Explore the 15 retained futures contract families. CME currency and Bitcoin futures remain in scope. Verify current exchange specifications before trading.')
    body+=f'<section class="content-section" data-market-profiles><div class="section-top"><div><span class="kicker">ICT futures universe</span><h2>Contract profiles</h2><p>15 futures families retained from the supplied 3.0 source dataset.</p></div><a class="text-link" href="/futures-intelligence/#universe">Open the Futures Desk →</a></div>{market_filter}<div class="card-grid">{cards}</div></section>'
    body+=f'<section class="content-section"><h2>Contract data quality rules</h2><p>Tick size, tick value, multiplier, expiry, first notice and session hours are reference values only until independently reconciled with the official exchange specification and date-stamped. No broker margin is inferred.</p></section>'
    write(DIST/'markets/index.html',shell('Futures Markets | Futures Intelligence OS','Explore 15 futures families across equity-index, rates, currency, metals, energy and CME Bitcoin futures.',body,'/markets/','<link rel="stylesheet" href="/assets/ict-public.css"><script defer src="/assets/market-profiles.js"></script>'))

    # Part 2 ICT Futures Academy dashboard: canonical 82-lesson curriculum and nine preserved tutorials.
    program=academy_data.get('learningProgram',{})
    tutorials=program.get('tutorials',[])
    tracks=academy_data.get('tracks',[])
    video_coverage=academy_video_coverage(academy_data)
    video_status_by_id={x['id']:x for x in video_coverage['lessons']}
    concept_by_id={c.get('id'):c for c in academy}
    track_by_id={t.get('id'):t for t in tracks}
    track_cards=[]
    for i,t in enumerate(tracks):
        ids=[lesson_id for lesson_id in t.get('sequence',[]) if lesson_id in concept_by_id]
        tutorial_ids=[tutorial_id for tutorial_id in t.get('tutorialIds',[]) if any(x.get('id')==tutorial_id for x in tutorials)]
        first=ids[0] if ids else ''
        if first:
            start_href=f"/ict-futures/academy/{first}.html"
            start_label="Start learning path →"
        elif tutorial_ids:
            start_href="/ict-futures/academy/tutorials/"
            start_label="Open guided practice →"
        else:
            start_href="/academy/"
            start_label="Open track →"
        prereq_names=[track_by_id.get(x,{}).get('name',x) for x in t.get('prerequisites',[])]
        effort=f"~{t.get('readingMinutes',0)} min reading · ~{t.get('practiceMinutes',0)} min practice (editorial estimates)"
        track_cards.append(
            f'<article class="academy-track-card"><span class="badge">TRACK {i+1:02d} · {escape(str(t.get("level","Study")))}</span>'
            f'<h3>{escape(str(t.get("name","Learning track")))}</h3><p>{escape(str(t.get("description","")))}</p>'
            f'<p><b>{len(ids)} lessons</b> · <b>{len(tutorial_ids)} tutorials</b></p>'
            f'<p class="academy-effort">{escape(effort)}</p>'
            +(f'<p class="academy-track-prereq">Prerequisites: {escape(" · ".join(prereq_names))}</p>' if prereq_names else '<p class="academy-track-prereq">Prerequisites: none</p>')
            +f'<p class="academy-track-completion">Complete when: {escape(" ".join(t.get("completionCriteria",[])[:2]))}</p>'
            f'<a href="{escape(start_href,quote=True)}">{start_label}</a></article>'
        )
    tutorial_cards=[]
    for t in tutorials:
        slug=str(t.get('id',''))
        tutorial_cards.append(
            f'<article class="academy-tutorial-card"><span class="badge">{escape(str(t.get("level","Tutorial")))} · {escape(str(t.get("duration","")))}</span>'
            f'<h3>{escape(str(t.get("title","Guided tutorial")))}</h3><p>{escape(str(t.get("objective","")))}</p>'
            f'<a href="/ict-futures/academy/tutorials/{escape(slug)}.html">Open tutorial →</a></article>'
        )
    categories=sorted({str(c.get('category','ICT')) for c in academy})
    family_ids=sorted({str(v) for c in academy for v in (c.get('curriculum',{}).get('instrumentFamilies') or [])})
    family_labels={m.get('id'):m.get('label',m.get('id')) for m in mdata}
    family_options=''.join(f'<option value="{escape(v,quote=True)}">{escape(family_labels.get(v,v))}</option>' for v in family_ids)
    timeframes=sorted({str(v) for c in academy for v in (c.get('curriculum',{}).get('timeframes') or [])})
    timeframe_options=''.join(f'<option value="{escape(v,quote=True)}">{escape(v)}</option>' for v in timeframes)
    sessions=sorted({str(v) for c in academy for v in (c.get('curriculum',{}).get('sessions') or [])})
    session_options=''.join(f'<option value="{escape(v,quote=True)}">{escape(v)}</option>' for v in sessions)
    evidence_options=[('SOURCED','Sourced'),('CONVENTION','Convention / supplemental'),('NO DATA','No audited performance data'),('HYPOTHESIS','Hypothesis'),('TESTED','Tested · linked artifact required')]
    evidence_html=''.join(f'<option value="{escape(k,quote=True)}">{escape(v)}</option>' for k,v in evidence_options)
    bias_options=['bullish','bearish']
    catalog_cards=[]
    for c in academy:
        slug=str(c.get('id',''))
        curriculum=c.get('curriculum',{})
        evidence_raw=str(c.get('evidence',''))
        source_evidence=str(curriculum.get('sourceEvidenceLabel') or ('SOURCED' if 'SOURCED' in evidence_raw.upper() else 'CONVENTION'))
        performance_evidence=str(curriculum.get('performanceEvidenceLabel') or '')
        evidence_for_search=' '.join(x for x in [source_evidence,performance_evidence,evidence_raw] if x)
        search_values=[
            c.get('name',''),c.get('category',''),c.get('definition',''),evidence_raw,
            curriculum.get('acronym',''),*curriculum.get('aliases',[]),*curriculum.get('purpose',[]),
            *curriculum.get('instrumentLabels',[]),*curriculum.get('instrumentFamilies',[]),
            *curriculum.get('timeframes',[]),*curriculum.get('sessions',[]),*curriculum.get('biasDirections',[]),
            curriculum.get('trackId',''),*curriculum.get('prerequisiteLabels',[])
        ]
        searchable=' '.join(str(v) for v in search_values if v).lower()
        data={
            'search':searchable,'category':str(c.get('category','')),'level':str(c.get('level','')),
            'instruments':'|'.join(str(x) for x in curriculum.get('instrumentFamilies',[])),
            'timeframes':'|'.join(str(x) for x in curriculum.get('timeframes',[])),
            'sessions':'|'.join(str(x) for x in curriculum.get('sessions',[])),
            'bias':'|'.join(str(x) for x in curriculum.get('biasDirections',[])),
            'evidence':'|'.join(x for x in [source_evidence,performance_evidence] if x)
        }
        attrs=f'data-lesson-id="{escape(slug,quote=True)}" ' + ' '.join(f'data-{k}="{escape(v,quote=True)}"' for k,v in data.items())
        catalog_cards.append(
            f'<article class="academy-catalog-card" data-academy-card {attrs}>'
            f'<div class="academy-card-top"><span class="badge">{escape(str(c.get("level","Study")))}</span><span class="academy-evidence-label">{escape(evidence_for_search)}</span></div>'
            f'<p class="academy-video-status" data-video-status="{escape(video_status_by_id.get(slug,{}).get("status","VIDEO NEEDED"),quote=True)}">{escape(video_status_by_id.get(slug,{}).get("status","VIDEO NEEDED"))}</p>'
            f'<h3>{escape(str(c.get("name","Lesson")))}</h3><p>{escape(str(c.get("definition","")))}</p>'
            f'<div class="academy-card-tags">{escape(" · ".join(str(x) for x in curriculum.get("instrumentLabels",[])[:3]))}</div>'
            f'<small class="muted">{escape(evidence_raw)}</small><p><a href="/ict-futures/academy/{escape(slug)}.html">Study lesson →</a></p></article>'
        )
    category_options=''.join(f'<option value="{escape(c,quote=True)}">{escape(c)}</option>' for c in categories)
    body=page_intro('Education library','ICT Futures Academy',
        'A prerequisite-based futures learning library with 82 concept lessons, 9 preserved guided tutorials and 10 study tracks. Includes futures mechanics, ICT concept chains, contract-roll context, replay practice and explicit evidence limits.',
        f'<div class="stats-row"><b>{len(academy)}</b><span>Concept lessons</span><b>{len(tutorials)}</b><span>Guided tutorials</span><b>{len(tracks)}</b><span>Learning tracks</span></div>')
    body+='<section class="content-section"><h2>Study and practice</h2><div class="card-grid">'+card('Video library', 'Search ICT lectures, podcast episodes, and mentor videos with source details.', '/academy/videos/', 'Watch')+card('Study paths', 'Work through curated ICT concepts and exercises.', '/ict-lab/learn/', 'Learn')+card('Practice labs', 'Apply the rules in replay, planning and review exercises.', '/ict-lab/practice/', 'Practice')+'</div></section>'
    body+='<p><a class="text-link" href="/ict-lab/playbooks/">Browse ICT playbooks →</a></p>'
    body+='<section class="academy-progress-summary"><strong data-academy-global-progress>0 / 82 lessons completed</strong><span id="academyProgressMeta">Previous completions are retained when lesson content is revised; current-version completion requires the updated practice and checks.</span></section>'
    body+=f'<p class="small-note" role="status"><strong>VIDEO COVERAGE: {escape(video_coverage["status"])}</strong> · {video_coverage["coveredCount"]} of {video_coverage["eligibleCount"]} lessons have exact verified video mappings ({video_coverage["coveragePercent"]}%). <a href="/ict-futures/academy/video-coverage.json">View coverage register ↗</a></p>'
    body+='<section class="content-section"><div class="section-top"><div><h2>Guided practice tutorials</h2><p>Nine preserved workbooks with chart-replay workflows, deliverables and review criteria.</p></div><a class="text-link" href="/ict-futures/academy/tutorials/">Open all tutorials →</a></div><div class="academy-course-grid">'+''.join(tutorial_cards)+'</div></section>'
    body+='<section class="content-section"><div class="section-top"><div><h2>10 prerequisite-based learning tracks</h2><p>Follow the recommended sequence. Reading and practice times are editorial estimates, not promises.</p></div></div><div class="academy-course-grid">'+''.join(track_cards)+'</div></section>'
    body+='<section class="content-section"><div class="section-top"><div><h2>82-concept lesson catalogue</h2><p>Search by concept, acronym, instrument, model, timeframe, session, bias direction or evidence label. Six new foundations lessons cover listed futures mechanics, tick math, expiry/roll, continuous mapping, margin and volume/open interest.</p></div></div>'
    body+='<div class="academy-filter academy-filter-advanced">'
    body+='<label>Search<input id="academySearch" type="search" placeholder="Concept, acronym, model or keyword"></label>'
    body+='<label>Category<select id="academyCategory"><option value="">All categories</option>'+category_options+'</select></label>'
    body+='<label>Level<select id="academyLevel"><option value="">All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>'
    body+='<label>Instrument family<select id="academyInstrument"><option value="">All futures families</option>'+family_options+'</select></label>'
    body+='<label>Timeframe<select id="academyTimeframe"><option value="">All timeframes</option>'+timeframe_options+'</select></label>'
    body+='<label>Session<select id="academySession"><option value="">All sessions</option>'+session_options+'</select></label>'
    body+='<label>Bias direction<select id="academyBias"><option value="">All directions</option>'+''.join(f'<option value="{x}">{x.title()}</option>' for x in bias_options)+'</select></label>'
    body+='<label>Evidence label<select id="academyEvidence"><option value="">All evidence labels</option>'+evidence_html+'</select></label>'
    body+='<span class="muted" id="academyCount" aria-live="polite"></span></div>'
    body+='<div class="academy-catalog-grid" id="academyCatalog">'+''.join(catalog_cards)+'</div>'
    body+='<p class="small-note academy-filter-empty" id="academyEmpty" hidden>No lessons match these filters. Clear one or more filters to see the full curriculum.</p></section>'
    academy_search_index=[]
    for c in academy:
        curr=c.get('curriculum',{})
        academy_search_index.append({
            'id':c.get('id'),'title':c.get('name'),'category':c.get('category'),'level':c.get('level'),
            'definition':c.get('definition'),'aliases':curr.get('aliases',[]),'acronym':curr.get('acronym'),
            'trackId':curr.get('trackId'),'purpose':curr.get('purpose',[]),
            'instrumentFamilies':curr.get('instrumentFamilies',[]),'timeframes':curr.get('timeframes',[]),
            'sessions':curr.get('sessions',[]),'biasDirections':curr.get('biasDirections',[]),
            'sourceEvidenceLabel':curr.get('sourceEvidenceLabel'),
            'performanceEvidenceLabel':curr.get('performanceEvidenceLabel'),
            'url':f"/ict-futures/academy/{c.get('id')}.html"
        })
    write(DIST/'academy/search-index.json',json.dumps({'version':2,'generatedAt':academy_data.get('generatedAt'),'count':len(academy_search_index),'lessons':academy_search_index},ensure_ascii=False,indent=2))
    body+='<section class="content-section"><h2>Evidence and source standards</h2><p><b>SOURCED</b> means a named source must support the exact claim. <b>CONVENTION</b> identifies community practice or editorial synthesis. <b>NO DATA</b> means independently audited public performance evidence was not located in the reviewed material. <b>HYPOTHESIS</b> is a testable interpretation. <b>TESTED</b> is reserved for a reproducible test with dataset, dates, costs, rules, sample size and out-of-sample results.</p><p>The 39-page playbook discloses limitations in its source review: some details were taken from search excerpts, and ICT original videos plus Reddit/Discord were not exhaustively reviewed. A channel/playlist or topic search is discovery, not a verified one-to-one video citation. Contract, tick, margin, session, roll and event values must be rechecked from current primary sources.</p><div class="source-notes"><a href="https://www.youtube.com/@InnerCircleTrader" target="_blank" rel="noopener noreferrer">Official ICT channel ↗</a><a href="https://www.youtube.com/@InnerCircleTrader/playlists" target="_blank" rel="noopener noreferrer">Official ICT playlists ↗</a><a href="https://www.cmegroup.com/markets.html" target="_blank" rel="noopener noreferrer">CME contract specifications ↗</a><a href="https://www.cmegroup.com/tools-information/calendars/expiration-calendar.html" target="_blank" rel="noopener noreferrer">CME expiry calendar ↗</a><a href="https://www.cmegroup.com/market-data/volume-open-interest.html" target="_blank" rel="noopener noreferrer">CME Volume &amp; Open Interest ↗</a><a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer">CFTC COT ↗</a></div></section>'
    body+='<p><a class="text-link" href="/academy/crosswalk/">Review the Lab crosswalk and Academy video coverage</a></p>'
    write(DIST/'academy/index.html',shell('ICT Futures Academy | Futures Intelligence OS','82 source-traceable lessons, 10 curriculum tracks, nine guided tutorials, futures mechanics, search and current-version progress tracking.',body,'/academy/', '<link rel="stylesheet" href="/assets/academy-learning.css"><script defer src="/assets/academy-catalog.js"></script>'))

    # Macro indicators: official BLS historical observations via the edge gateway.
    body=page_intro('Official macro data','US inflation & labour indicators','Five series from the US Bureau of Labor Statistics Public Data API v1. Values are published historical observations with their own index bases and units; they are not live market quotes or a complete economic calendar.')
    body += """<section class="content-section"><div class="section-top"><div><h2>BLS macro dashboard</h2><p>API cache refreshes on demand and expires after six hours.</p></div><button class="primary-button" id="macroRefresh">Load / update BLS snapshot</button></div><div id="macroState" class="muted">Loading provider data…</div><div id="macroSeries" class="macro-grid"></div></section><section class="content-section"><h2>Method and limitations</h2><p>Version 1 of the BLS API is public without registration, with a documented limit of 25 series per request and up to 10 years of observations. It returns historical observations and can lag the original release; release time/calendar data are separate. Do not combine different index base units or infer market direction from a single series.</p><div class="source-notes"><a href="https://www.bls.gov/developers/api_signature.htm" target="_blank" rel="noopener noreferrer">BLS API signatures ↗</a><a href="https://www.bls.gov/bls/news-release/home.htm" target="_blank" rel="noopener noreferrer">BLS release calendar ↗</a><a href="https://www.bls.gov/developers/api_faqs.htm" target="_blank" rel="noopener noreferrer">BLS API FAQ ↗</a></div></section>"""
    body+='<section class="content-section"><div class="section-top"><div><h2>Additional official macro &amp; rates providers</h2><p>BEA, EIA, FRED, US Treasury and ECB historical observations with provider-specific units, retrieval times and database persistence state.</p></div><button id="economicRefresh" class="primary-button">Refresh economic providers</button></div><p id="economicState" class="muted">Checking provider availability…</p><div id="economicProviders" class="economic-provider-grid"><div class="loading-state">Loading historical provider snapshots…</div></div></section>'
    body+='<section class="content-section"><h2>Economic release calendar</h2><p><span class="status-pill warn">PARTIAL OFFICIAL SCHEDULES</span></p><p>Separate BLS, EIA WPSR, CFTC COT and Federal Reserve FOMC schedule snapshots are available on <a href="/sessions/">Sessions &amp; Calendar</a> in the implementation branch. They do not form a complete U.S. or global event calendar; FOMC records are date-only. Consensus forecasts, actual values and actual publication timestamps are not supplied. Verify each issuer schedule before an event.</p><div class="source-notes"><a href="https://www.bls.gov/schedule/news_release/" target="_blank" rel="noopener noreferrer">BLS release schedule ↗</a><a href="https://www.bea.gov/news/schedule" target="_blank" rel="noopener noreferrer">BEA release schedule ↗</a><a href="https://www.eia.gov/petroleum/supply/weekly/schedule.php" target="_blank" rel="noopener noreferrer">EIA WPSR schedule ↗</a><a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm" target="_blank" rel="noopener noreferrer">CFTC COT schedule ↗</a><a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" target="_blank" rel="noopener noreferrer">Federal Reserve FOMC calendar ↗</a></div></section>'
    write(DIST/'macro/index.html',shell('US Macro Indicators | Futures Intelligence OS','Official BLS, BEA, EIA, FRED, Treasury and ECB historical observations with source labels, units and retrieval times.',body,'/macro/', '<script defer src="/assets/macro-page.js"></script><script defer src="/assets/economic-data.js"></script>'))

    # COT / institutional positioning.
    body=page_intro('Institutional positioning','CFTC Commitments of Traders','Compare Legacy, TFF and Disaggregated reports while keeping futures-only and futures-and-options combined datasets separate. COT reports Tuesday positions; publication schedule and retrieval time are shown separately when available.')
    body += """<section class="content-section"><div class="section-top"><div><h2>Weekly COT positioning</h2><p>Choose a report family and variant, then search a source market name or exact CFTC contract-market code.</p></div><div class="cot-actions"><button class="primary-button" id="cotRefresh" type="button" disabled>Refresh CFTC data</button><button class="secondary-button" id="cotExport" type="button" disabled>Export filtered CSV</button></div></div><div class="cot-controls"><label>Report family<select id="cotReport"><option value="tff">TFF · financial markets</option><option value="disaggregated">Disaggregated · physical commodities</option><option value="legacy">Legacy · commercial / non-commercial</option></select></label><label>Report variant<select id="cotVariant"><option value="futures-only">Futures Only</option><option value="combined">Futures and Options Combined</option></select></label><label>Market search<input class="search-input" id="cotSearch" type="search" placeholder="CFTC market name or exact code" minlength="3" maxlength="80" aria-describedby="cotSearchHint"></label><button class="secondary-button" id="cotApplySearch" type="button" disabled>Search CFTC market</button><label>Market<select id="cotMarket"><option value="">All returned markets</option></select></label><label>Trader category<select id="cotCategory"><option value="">All categories</option></select></label><span class="muted" id="cotCount"></span></div><p id="cotSearchHint" class="small-text">Enter at least 3 characters to search. Up to 156 source records are returned per search.</p><p class="muted" id="cotState">Enter a market search to load data.</p><div class="cot-meta" id="cotMeta">Position date, publication timing and retrieval time will be shown independently.</div><div id="cotChart" class="cot-chart" role="img" aria-label="Weekly COT net positioning chart"><span class="empty-state">Choose a source market and trader category to display the weekly net-position history.</span></div><p class="fine-print">Chart values are net contracts (reported long minus reported short) for one exact CFTC market code, report family, variant and category. Net position is a descriptive calculation, not a signal.</p><div class="table-wrap"><table class="cot-table"><thead><tr><th>Market / CFTC code</th><th>Position date</th><th>Trader category</th><th>Open interest</th><th>Long</th><th>Short</th><th>Spreading</th><th>Net</th><th>Weekly net change</th><th>Net % of OI</th></tr></thead><tbody id="cotRows"><tr><td colspan="10">Search for a CFTC market to view observations.</td></tr></tbody></table></div></section><section class="content-section"><h2>Definitions and release timing</h2><p>Legacy, TFF and Disaggregated classifications describe different CFTC reporting schemes. Do not combine categories between them. Futures-only and futures-and-options combined reports are separate datasets. The position date is not the publication date; the API does not supply a per-row publication timestamp, so the interface leaves that field unknown and shows retrieval time separately. CFTC generally releases reports Friday at 3:30 p.m. Eastern using the preceding Tuesday’s positions; holiday schedules may shift release.</p><p>“Net % of OI” is calculated as (long − short) ÷ reported open interest × 100 only when all required values are present. Missing values remain missing, never zero. COT reports are delayed aggregate positioning and do not identify individual traders or explain their intent.</p><div class="source-notes"><a id="cotDataset" href="https://publicreporting.cftc.gov/stories/s/r4w3-av2u" target="_blank" rel="noopener noreferrer">CFTC PRE report catalogue ↗</a><a id="cotSchedule" href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm" target="_blank" rel="noopener noreferrer">CFTC release schedule ↗</a><a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer">CFTC COT methodology and datasets ↗</a><a href="https://publicreporting.cftc.gov/stories/s/Public-Reporting-FAQ/inwp-fmhz/" target="_blank" rel="noopener noreferrer">CFTC PRE API FAQ ↗</a></div></section>"""
    body += '<section class="content-section"><p class="fine-print">Schedule watch: the current CFTC release schedule still describes the usual weekly Friday report. The CFTC announced a plan to move to semiweekly releases by the end of 2026; the implementation date and operational schedule should be rechecked before treating frequency or release times as current. <a href="https://www.cftc.gov/PressRoom/PressReleases/9316-26" target="_blank" rel="noopener noreferrer">Read the CFTC announcement ↗</a></p></section>'
    write(DIST/'research/positioning/index.html',shell('CFTC COT Positioning | Futures Intelligence OS','Fetch official CFTC Public Reporting Environment futures-only TFF and Disaggregated positioning datasets.',body,'/research/positioning/', '<script defer src="/assets/cot-page.js"></script>'))

    # Futures-only source directory. Root resources.json is the reviewed public allowlist.
    source_categories = load(ROOT/'resources.json',{}).get('categories',[])
    body=page_intro('Exchange and research references','Futures source directory','A reviewed directory of exchange, regulator, macro, futures-news and ICT education sources. Inclusion is not a licence grant or a promise of free real-time market data.',f'<div class="stats-row"><b>{len(resources)}</b><span>Futures-relevant sources</span><b>{len(source_categories)}</b><span>Categories</span></div>')
    body+='<div class="filter-row"><input id="resourceSearch" class="search-input" type="search" placeholder="Search futures exchanges, CFTC, macro or ICT sources"><select id="resourceCategory" class="search-input"><option value="">All categories</option></select><span id="resourceCount" class="muted"></span></div><div id="resourceCards" class="directory-grid"></div>'
    body+=social_discovery(mdata, load(ROOT/'ict-futures/data/social-analysis-methods.json'), json_script)
    write(DIST/'sources/index.html',shell('Futures Sources | Futures Intelligence OS','Reviewed futures exchange, regulator, macro, news and ICT education source directory.',body,'/sources/', '<link rel="stylesheet" href="/assets/ict-public.css"><script defer src="/assets/futures-social.js"></script><script defer src="/assets/research-directory.js"></script>'))
    write(DIST/'research/index.html',redirect_page('Research directory moved','/sources/'))

    # News room
    articles=news.get('articles',[]) if isinstance(news,dict) else []
    nstatus=news.get('status','not-yet-fetched') if isinstance(news,dict) else 'not-yet-fetched'
    body=page_intro('Futures news intelligence','Futures headlines & catalysts','Futures-focused source discovery across exchange releases, macro, rates, metals, energy and listed currency/Bitcoin futures. Aggregated discovery is a research lead, not verified fact or a trading signal.')
    body+=f'<section class="status-panel"><div><span class="status-label">Snapshot status</span><strong>{escape(str(nstatus).upper())}</strong></div><div><span class="status-label">Stored articles</span><strong>{len(articles)}</strong></div><p>Last check: {escape(str(news.get("lastCheckedAt") or "Not yet fetched"))}</p><p>Provider: {escape(str(news.get("provider") or "GDELT DOC API"))}</p></section>'
    market_filter=''.join(f'<option value="{escape(str(m.get("id","")),quote=True)}">{escape(str(m.get("label","")))}</option>' for m in mdata)
    topic_values=['macro','policy','rates','inflation','employment','energy','metals','currencies','treasuries','positioning','exchange','geopolitics','supply','earnings']
    topic_filter=''.join(f'<option value="{topic}">{topic.title()}</option>' for topic in topic_values)
    body+=f'<section class="content-section"><div class="section-top"><div><h2>Futures headlines</h2><p>Headline discovery only. Publisher publication time and full article text may be unavailable; use the original source.</p></div><button class="primary-button" id="refreshNews">Refresh snapshot</button></div><div class="filter-row"><select id="newsInstrument" class="search-input"><option value="">All contract families</option>{market_filter}</select><select id="newsTopic" class="search-input"><option value="all">All event types</option>{topic_filter}</select><select id="newsPublisher" class="search-input"><option value="">All publishers</option></select><select id="newsTime" class="search-input"><option value="72">GDELT seen · last 72 hours</option><option value="24">GDELT seen · last 24 hours</option><option value="6">GDELT seen · last 6 hours</option></select></div><p class="muted" id="newsSourceStatus">News source status not checked.</p><p class="small-text">Source attribution: <a href="https://www.gdeltproject.org/about.html" target="_blank" rel="noopener noreferrer">GDELT Project terms and citation ↗</a>. Publisher article rights remain separate; open each original source.</p><div class="news-grid" id="newsGrid"></div><p id="newsState" class="muted"></p></section><section class="content-section"><h2>Search external sources</h2><p>Use the ICT Futures terminal for contract-specific news and public research links. Headlines are discovery leads, not verified facts or trading signals.</p><a class="text-link" href="/futures-intelligence/#daily-brief">Open Futures Desk brief →</a></section>'
    write(DIST/'news/index.html',shell('Futures News | Futures Intelligence OS','Futures news discovery with source traceability, retrieval times and provider status.',body,'/news/', '<script defer src="/assets/provider-presentation.js"></script><script defer src="/assets/news-page.js"></script>'))

    # Volume & Open Interest: weekly futures-only CFTC OI, with exchange volume explicitly unavailable.
    voi_options = ''.join(f'<option value="{escape(m.get("id",""))}">{escape(m.get("label",""))}</option>' for m in mdata)
    body=page_intro('Market participation data','Volume & Open Interest','A contract-aware participation research area. Weekly open interest is sourced from CFTC reports where the selected market is covered. Exchange observations appear only after a provider is configured and public-display rights are reviewed.')
    body+='<section class="voi-control-panel"><div class="voi-controls"><label>Futures family<select id="voiMarket">'+voi_options+'</select></label><label>CFTC report variant<select id="voiVariant"><option value="futures-only">Futures Only</option><option value="combined">Futures and Options Combined</option></select></label><label>CFTC market label<select id="voiInstrument" disabled><option>Loading contract rows…</option></select></label><button id="voiRefresh" class="primary-button">Refresh weekly OI</button></div><div class="voi-source-row"><span id="voiStatus" class="status-pill warn">WAITING</span><span id="voiReport">CFTC report</span><a id="voiSource" href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer">Official CFTC dataset ↗</a></div><p id="voiRetrieved" class="muted">Waiting for the provider response…</p></section>'
    body+='<section class="voi-metric-grid"><article class="voi-metric"><span>Latest open interest</span><strong id="voiLatest">—</strong><small id="voiAsOf">No report date yet</small></article><article class="voi-metric"><span>Week-on-week change</span><strong id="voiChange">—</strong><small>Change in reported open-interest contracts</small></article><article class="voi-metric"><span>Historical coverage</span><strong id="voiRange">—</strong><small>Latest available rows in this CFTC dataset</small></article><article class="voi-metric unavailable"><span>Exchange daily volume</span><strong id="exchangeVolumeAvailability">Not connected</strong><small id="exchangeVolumeNote">No approved exchange-volume observations are configured</small></article></section>'
    body+='<section class="content-section"><div class="section-top"><div><h2>Authorized exchange observations</h2><p>Listed-contract volume and open interest from providers whose public-display rights have been reviewed.</p></div><span class="data-pill">RIGHTS-GATED</span></div><div id="exchangeObservationState" class="data-message" role="status" aria-live="polite">Checking approved exchange observations…</div><div class="table-wrap"><table class="cot-table"><caption>Publicly approved futures exchange volume and open-interest observations</caption><thead><tr><th>Contract month</th><th>Metric</th><th>Interval</th><th>Data as of</th><th>Value</th><th>Delay class</th><th>Source</th></tr></thead><tbody id="exchangeObservationRows"><tr><td colspan="7">No authorized observations loaded.</td></tr></tbody></table></div><p class="fine-print">Only rows with a recorded public-display approval are returned. The timestamp and delay label come from the provider record and do not by themselves establish real-time exchange entitlement.</p></section>'
    body+='<section class="content-section"><div class="section-top"><div><h2>Weekly open-interest history</h2><p id="voiMarketName">Select a market to load the CFTC series.</p></div><span class="data-pill">WEEKLY · CFTC REPORT</span></div><div id="voiState" class="data-message">Waiting for data…</div><div id="voiChart" class="oi-chart"><div class="loading-state">Loading open-interest history…</div></div><div class="fine-print">Each bar represents a reported weekly open-interest observation for one specific CFTC market label. It is not daily trading volume, open contracts on a broker, or order-book depth.</div></section>'
    body+='<section class="content-section"><div class="section-top"><div><h2>Reported weekly observations</h2><p>Newest report first. No synthetic values or interpolation are used.</p></div><span id="voiCount" class="muted">— rows</span></div><div class="table-wrap"><table class="cot-table"><thead><tr><th>Report date</th><th>Open interest</th><th>Week change</th><th>Source market label</th></tr></thead><tbody id="voiTable"><tr><td colspan="4">No data loaded.</td></tr></tbody></table></div></section>'
    body+='<section class="content-section"><h2>Coverage and licensing boundary</h2><p>CFTC COT is a weekly positioning report and can provide reported open interest for covered futures-only markets. It does not provide the exchange daily volume series required for intraday volume profiles, volume delta, or session volume. Those require a separate official exchange feed or a licensed market-data provider. The UI will not substitute prediction-market volume, spot volume or a generic chart-widget value.</p><div class="source-notes"><a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer">CFTC Commitments of Traders ↗</a><a href="https://www.cmegroup.com/market-data.html" target="_blank" rel="noopener noreferrer">CME market data ↗</a><a href="https://www.ice.com/market-data" target="_blank" rel="noopener noreferrer">ICE market data ↗</a></div></section>'
    write(DIST/'volume-open-interest/index.html',shell('Futures Volume & Open Interest | Futures Intelligence OS','Contract-aware weekly open-interest history with explicit source and daily volume availability.',body,'/volume-open-interest/', '<script defer src="/assets/volume-open-interest.js"></script>'))

    # Retire the former event-market route without exposing its UI or endpoint consumers.
    write(DIST/'prediction-markets/index.html',redirect_page('This product area has been retired','/'))

    # Entry model library. Educational records only; no performance ranking without verified backtests.
    entry_models=[c for c in academy if c.get('category')=='Entry Models']
    model_cards = []
    for model in entry_models:
        slug = model['id']
        related, role, note = PUBLIC_MODELS[slug]
        video_status = 'Mapped Academy video' if slug in crosswalk.covered else 'Exact model video needed'
        model_cards.append(
            '<article>' + card(model['name'], model['definition'], f'/ict-futures/academy/{slug}.html', role, video_status)
            + '<p>' + escape(note) + '</p><p>' + ' · '.join(crosswalk.lab_links(related.split())) + '</p></article>')
    body=page_intro('ICT playbook library','Entry Models','Eight preserved entry-model concepts from the ICT Academy source catalogue. These are educational playbooks, not a ranked signal service or evidence of a profitable edge.',f'<div class="stats-row"><b>{len(entry_models)}</b><span>Model concepts</span><b>0</b><span>Verified model performance rankings</span></div>')
    body+='<section class="content-section"><div class="section-top"><div><h2>Model catalogue</h2><p>Open each lesson for its definition, conditions, use cases, invalidation and common mistakes.</p></div><a class="text-link" href="/academy/crosswalk/">View the Academy and Lab crosswalk ↗</a></div><div class="card-grid">'+''.join(model_cards)+'</div></section>'
    body+='<p><a class="text-link" href="/ict-lab/playbooks/">Explore ICT Lab playbooks →</a></p>'
    body+='<section class="content-section"><h2>Performance evidence policy</h2><p>No model is labelled “best” until its rules are operationally defined and tested on timestamped historical data with commissions, slippage, contract rolls, survivorship controls and out-of-sample validation. The eight models have no audited win-rate, expectancy, profit-factor or drawdown ranking yet.</p></section>'
    body+='<section class="content-section"><h2>Legacy terminal model variants</h2><p>Illustrative rules from the original playbook.</p>'
    body+=crosswalk.model_cards(playbook_data['models'])
    body+='</section>'
    write(DIST/'entry-models/index.html',shell('ICT Entry Models | Futures Intelligence OS','Eight ICT entry-model concepts with educational playbook links and no unsupported performance claims.',body,'/entry-models/'))

    # P4 Strategy Lab: deterministic signal-driven futures backtesting.
    body=page_intro('Research & validation','Strategy Lab','Run a reproducible, cost-aware backtest from timestamped bars for one exact futures expiry and explicit candle-close signals. The engine does not fabricate ICT signals or publish strategy rankings.')
    body+='''
<section class="strategy-lab-wrap">
  <section class="strategy-hero">
    <div><span class="eyebrow">P7 · REPRODUCIBLE RESEARCH</span><h2>Test the rule set, not the story.</h2><p>Upload one exact-expiry futures OHLC CSV with LONG / SHORT / FLAT signals. Signals are evaluated at the source-bar close and entries occur at the next bar open. Commission, slippage, risk sizing, conservative stop handling and chronological holdout testing are explicit run inputs.</p></div>
    <aside class="strategy-state"><span class="status-pill warn">USER-SUPPLIED DATA REQUIRED</span><strong>No preloaded strategy performance</strong><span>Existing ICT model pages are descriptions, not executable rule engines. No win rate, expectancy or model ranking is invented.</span></aside>
  </section>
  <nav class="strategy-actions" aria-label="Backtest workflow">
      <a href="#strategy-input">1. Dataset and costs</a><a href="#strategy-run">2. Run</a>
      <a href="#strategyResults">3. Results</a><a href="#strategy-history">4. History</a>
      <a href="/ict-lab/practice/14/">Try the guided practice</a>
    </nav>
  <div class="strategy-grid" id="strategy-input">
    <section class="strategy-panel">
      <h3>01 · Dataset &amp; model tag</h3><p>Use one exact listed contract and expiry date per run. The uploaded file stays in this browser; only its hash, manifest and completed trade ledger can sync to your private account.</p>
      <div class="strategy-file-zone">
        <label>Historical signal CSV<br><input id="strategyCsv" type="file" accept=".csv,text/csv"></label>
        <div id="strategyFileMeta" class="strategy-file-meta">No file selected. Minimum 30 timestamped bars; maximum 250,000 bars / 50 MB.</div>
        <div id="strategyDataQuality" class="strategy-quality">Required columns: timestamp, open, high, low, close, signal, contract, expiry. Timestamps need Z or an explicit UTC offset; expiry uses YYYY-MM-DD.</div>
        <p><a class="text-link" href="/strategy-lab/backtest-input-template.csv" download>Download CSV header template →</a></p>
      </div>
      <div class="strategy-form-grid" style="margin-top:12px">
        <label>Strategy name<input id="strategyName" type="text" value="My rule-based ICT setup" maxlength="120"></label>
        <label>Research tag (does not generate signals)<select id="modelId">
          <option value="custom">User-defined signal</option><option value="liquidity-sweep-mss">Liquidity Sweep + MSS · external signal only</option><option value="silver-bullet">Silver Bullet · external signal only</option><option value="ict-2022-model">ICT 2022 Model · external signal only</option><option value="judas-mss">Judas Swing + MSS · external signal only</option><option value="amd-po3">Power of Three / AMD · external signal only</option><option value="unicorn">Unicorn · external signal only</option><option value="fvg-continuation">FVG Continuation · external signal only</option><option value="ifvg">IFVG · external signal only</option><option value="fvg-ote">FVG + OTE · external signal only</option><option value="smt-assisted">SMT-assisted setup · external signal only</option>
        </select></label>
        <label>Exact contract code (must match CSV)<input id="marketSymbol" type="text" placeholder="Use the dataset's exact listed contract code" maxlength="80" required></label>
        <label>Bar timeframe<input id="timeframe" type="text" placeholder="e.g. 1m, 5m, 1h, 1d" maxlength="30" required></label>
        <label>Timestamp / session timezone<input id="timezone" type="text" value="America/Chicago" maxlength="80"></label>
        <label>Data provider / source<input id="dataSource" type="text" placeholder="Name the provider or original dataset" maxlength="160" required></label>
        <label>Provider dataset ID<input id="datasetId" type="text" placeholder="Provider ID or stable dataset reference" maxlength="160" required></label>
        <label>Download date<input id="downloadDate" type="date" required></label>
        <label>Volume units (required only when volume is supplied)<input id="volumeUnits" type="text" placeholder="e.g. contracts, lots, provider ticks" maxlength="80"></label>
        <label class="strategy-wide">Signal-generation rule / source note<textarea id="signalSourceNotes" rows="2" placeholder="Describe the causal rule and where signals were generated. Include Pine version, signal timestamp convention and any session filters."></textarea></label>
      </div>
      <p class="strategy-help">The research tag is only a label. None of the ten listed ICT candidates has a machine-testable detector here. See the <a href="/docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md">rule-card status and decisions required</a>.</p>
    </section>
    <section class="strategy-panel">
      <h3>02 · Execution &amp; costs</h3><p>Tick size/value must match this exact contract and currency. Verify current exchange specifications and enter all per-side broker, exchange, clearing, NFA and routing fees.</p>
      <div class="strategy-form-grid">
        <label>Starting capital (USD)<input id="startingCapital" type="number" min="1" step="100" value="10000" required></label>
        <label>Risk per trade (%)<input id="riskPercent" type="number" min="0.01" max="20" step="0.01" value="1" required></label>
        <label>Maximum contracts<input id="maxContracts" type="number" min="1" step="1" value="5" required></label>
        <label>Tick size<input id="tickSize" type="number" min="0.00000001" step="any" placeholder="Verify exchange spec" required></label>
        <label>Tick value (USD / contract)<input id="tickValue" type="number" min="0.00000001" step="any" placeholder="Verify exchange spec" required></label>
        <label>Commission / contract / side (USD)<input id="commissionPerSide" type="number" min="0" step="0.01" placeholder="Enter broker + exchange fees" required></label>
        <label>Slippage (ticks / side)<input id="slippageTicks" type="number" min="0" step="1" value="1" required></label>
        <label>Execution-cost source<input id="costSource" type="text" placeholder="Broker fee schedule, fill study, or estimate" maxlength="160" required></label>
        <label>Cost source date<input id="costAsOf" type="date" required></label>
        <label>Stop distance (ticks)<input id="stopTicks" type="number" min="1" step="1" value="12" required></label>
        <label>Target reward / risk<input id="targetRR" type="number" min="0.1" step="0.1" value="2" required></label>
        <label>Maximum bars in trade<input id="maxBarsInTrade" type="number" min="1" step="1" value="60" required></label>
      </div>
      <div class="strategy-disclosure" style="margin-top:12px">Costs are applied per contract. Entry and stop/time-exit slippage are embedded in fill prices; commission is charged on both sides. A limit target is filled at its target price without queue or partial-fill simulation. Position size rounds down to whole contracts. Spread is not separately modeled; account for it conservatively in slippage or do not treat this as execution evidence.</div>
    </section>
    <section class="strategy-panel">
      <h3 id="strategy-run">03 · Run configuration</h3><details><summary>Advanced settings and chronological holdout</summary><p>The data is split by time, not randomly. Each period starts flat with independent starting capital; no position is carried across period boundaries.</p>
      <div class="strategy-form-grid">
        <label>In-sample allocation (%)<input id="trainPercent" type="number" min="50" max="80" step="1" value="60" required></label>
        <label>Validation allocation (%)<input id="validationPercent" type="number" min="10" max="30" step="1" value="20" required></label>
      </div>
      <div class="strategy-disclosure" style="margin-top:12px"><b>Out-of-sample = remainder.</b> Keep this final segment untouched until rules and parameters are frozen. The tool does not optimize settings; inspecting OOS and then changing rules turns it into another in-sample period.</div>
      </details>
      <div class="strategy-actions" style="margin-top:13px"><button id="runStrategy" class="strategy-run-button" type="button" disabled>Run reproducible backtest</button><span id="strategyRunMeta" class="strategy-help">Choose a valid CSV to enable the engine.</span></div>
      <p id="strategySyncStatus" class="strategy-sync-status" aria-live="polite">Runs stay local unless you sign in. Signed-in runs and trade ledgers sync to your user-owned Supabase tables.</p>
    </section>
    <section class="strategy-panel">
      <h3>04 · Method contract</h3>
      <ul class="strategy-help">
        <li>Signal is known only at its source candle close; entry is next-bar open.</li>
        <li>One position at a time; no pyramiding; no simultaneous reverse entry.</li>
        <li>If stop and target are both touched in one bar, stop is assumed first.</li>
        <li>Gaps through stops fill at the worse opening price plus configured slippage.</li>
        <li>Expectancy and net profit factor use P&amp;L after modeled costs.</li>
        <li>Fixed-interval timestamp gaps are reported; the engine cannot distinguish session closures from missing bars.</li>
        <li>ICT model choices are research labels; signals are externally supplied and their causality is not audited.</li>
        <li>No automatic event/news filter, exchange session/expiry calendar, separate spread, or roll handling is configured.</li>
        <li>Drawdown uses bar-close mark-to-market equity with estimated exit costs reserved.</li>
        <li>Historical roll fills, margin, liquidity, market impact and broker-specific execution are not inferred.</li>
      </ul>
    </section>
  </div>
  <section id="strategyResults" tabindex="-1" class="strategy-results strategy-hidden">
    <div class="strategy-result-header"><div><p class="eyebrow">REPRODUCIBLE RUN RESULT</p><h2 id="strategyResultTitle">Strategy results</h2><p id="strategyResultFingerprint" class="strategy-code"></p></div><div class="strategy-actions"><button id="downloadManifest" type="button" class="strategy-secondary-button" disabled>Download manifest</button><button id="downloadTrades" type="button" class="strategy-secondary-button" disabled>Download trade ledger</button></div></div>
    <section class="strategy-panel"><div class="section-top"><div><h3>Out-of-sample holdout metrics</h3><p id="strategyOosNote" class="strategy-help">Final chronological segment.</p></div></div><div id="strategyOosMetrics" class="strategy-metric-grid"></div></section>
    <div id="strategySplitCards" class="strategy-split-grid"></div>
    <section class="strategy-panel"><h3>Full-sample context (descriptive only)</h3><div id="strategyOverallMetrics" class="strategy-metric-grid"></div><p class="strategy-help">Full sample includes all segments and must not replace the holdout result when judging generalisation.</p></section>
    <div class="strategy-grid">
      <section class="strategy-chart-panel"><h3>Full-sample equity curve · USD</h3><canvas id="strategyEquityChart" class="strategy-chart" role="img" aria-label="Backtest equity curve"></canvas><div class="strategy-chart-legend"><span><i style="background:#218d87"></i>Mark-to-market equity</span></div></section>
      <section class="strategy-chart-panel"><h3>Full-sample drawdown · USD</h3><canvas id="strategyDrawdownChart" class="strategy-chart" role="img" aria-label="Backtest drawdown"></canvas><div class="strategy-chart-legend"><span><i style="background:#c27e43"></i>Peak-to-current drawdown</span></div></section>
    </div>
    <section class="strategy-panel"><h3>Split comparison</h3><div id="strategySplitTable"></div></section>
    <section class="strategy-panel"><h3>Data, sample and execution warnings</h3><div id="strategyWarnings"></div></section>
  </section>
  <section id="strategy-history" class="strategy-panel"><h3>Recent runs on this device</h3><p>Local history stores fingerprints and summary metrics only. The original CSV remains with you; re-upload the identical file and match its SHA-256 to reproduce a run.</p><div id="strategyHistory" class="strategy-help">No local runs saved on this device yet.</div></section>
  <section class="strategy-panel"><h3>Evidence rules</h3><p>Win rate alone is not a decision metric. Review trade count, net expectancy, average R, net profit factor, drawdown size/duration, costs and out-of-sample stability together. Small samples, externally generated signals with look-ahead, unadjusted contract rolls, inaccurate tick values and omitted costs can invalidate results. A backtest is not a forecast or a guarantee of future performance.</p></section>
</section>
'''
    write(DIST/'strategy-lab/backtest-input-template.csv','timestamp,open,high,low,close,signal,contract,expiry,stop_ticks,volume\n')
    write(DIST/'strategy-lab/index.html',shell('Strategy Lab | Futures Intelligence OS','Reproducible futures signal backtesting with cost-aware expectancy, drawdown and chronological out-of-sample testing.',body,'/strategy-lab/', '<link rel="stylesheet" href="/assets/strategy-lab.css"><script type="module" defer src="/assets/strategy-lab.js"></script>'))

    # Independent provider and snapshot health dashboard.
    body=page_intro('Operational transparency','Sources & Data Health','Test the edge gateway and inspect each provider response independently. A successful cached API response is not necessarily a fresh upstream collection, and a configured credential is not proof of a healthy data feed.')
    body+='<section class="health-summary"><div><span class="status-pill warn">PROVIDER CHECKS</span><h2 id="healthHeadline">Connecting to the gateway…</h2><p id="healthLatency">Checks have not completed.</p></div><button id="healthRefresh" class="primary-button">Recheck providers</button></section>'
    body+='<p id="healthUpdated" class="muted">Provider states are loading.</p><section id="healthGrid" class="health-grid"><div class="loading-state">Checking independent provider endpoints…</div></section>'
    body+='<section class="content-section"><h2>How to read the status</h2><div class="health-legend"><span><i class="legend-dot good"></i> Fresh / partial response</span><span><i class="legend-dot warn"></i> Cached, not yet fetched or not configured</span><span><i class="legend-dot bad"></i> Unavailable / failed request</span></div><p>“Fresh” describes the gateway snapshot status reported by that API response. It does not mean exchange-real-time data. “Available on request” indicates a route or public provider capability, not a completed provider fetch. Supabase ingestion and Builder administration remain disabled unless the required server-side secrets are configured.</p></section>'
    body+='<section class="content-section"><h2>Source registry</h2><p>Prefer primary exchange, regulator, statistical agency and central-bank sources. Contract specification and market-data redistribution terms must be verified separately.</p><div class="source-notes"><a href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="noopener noreferrer">CFTC ↗</a><a href="https://www.bls.gov/developers/" target="_blank" rel="noopener noreferrer">BLS ↗</a><a href="https://fred.stlouisfed.org/docs/api/fred/" target="_blank" rel="noopener noreferrer">FRED ↗</a><a href="https://www.bea.gov/developers" target="_blank" rel="noopener noreferrer">BEA ↗</a><a href="https://www.eia.gov/opendata/" target="_blank" rel="noopener noreferrer">EIA ↗</a><a href="https://www.cmegroup.com/market-data.html" target="_blank" rel="noopener noreferrer">CME market data ↗</a><a href="https://www.ice.com/market-data" target="_blank" rel="noopener noreferrer">ICE market data ↗</a></div></section>'
    write(DIST/'data-health/index.html',shell('Sources & Data Health | Futures Intelligence OS','Independent gateway and provider snapshot health checks with provenance and freshness limitations.',body,'/data-health/', '<script defer src="/assets/provider-presentation.js"></script><script defer src="/assets/data-health.js"></script>'))

    # Risk & Prop Firms. Keep /tools/ as a compatibility redirect.
    risk_rules=load(ROOT/'data/prop-firm-programs.json',{})
    body=page_intro('Risk preparation','Risk & Prop Firms','Futures position sizing uses versioned contract references, integer tick and micro-dollar arithmetic, all-in estimated costs and user-entered remaining-loss caps. The current contract profiles remain unverified and no prop-firm program rules are verified.')
    body+='''<section class="content-section"><div class="section-top"><div><h2>Futures position size calculator</h2><p>Enter your contract and stop first, then verify the all-in cost and remaining loss limits. Size zero means the trade exceeds a supplied limit.</p><p><a href="/ict-lab/practice/15/">Try the guided sizing exercise</a></p><p>Use a listed contract family and micro/standard profile, then enter the exact contract code and expiry from your source. Estimates are conditional because the contract records are only partially source-reviewed; lifecycle and effective-date fields remain incomplete.</p></div><span class="data-pill">CONDITIONAL ESTIMATE · NOT EXECUTION</span></div><div class="os-data-footnote"><b>Partial contract source review:</b> core contract units and outright tick sizes/values were checked against linked official exchange pages on 20 November 2026. The records do not yet establish an active expiry, first-notice date, delivery window or effective period. Check the linked source for your exact contract and month before using the estimate. USD-only; no FX conversion, margin or liquidation estimate. Remaining-loss fields are user-entered figures from the applicable account terms and platform; the site does not infer reset timezone or balance/equity basis.</div><div class="calc-grid"><label>Contract family<select id="contract"></select></label><label>Exact contract code<input id="exactContract" type="text" maxlength="32" placeholder="Exact code from your provider" required></label><label>Contract expiry date<input id="expiryDate" type="date" required></label><label>Account balance (USD)<input id="balance" type="text" inputmode="decimal" placeholder="Enter your balance" required></label><label>Risk per trade (%)<input id="riskPct" type="text" inputmode="decimal" placeholder="Enter your limit" required></label><label>Maximum contracts<input id="maxContracts" type="number" min="1" max="10000" step="1" placeholder="Enter a cap" required></label><label>Daily loss remaining (USD, optional)<input id="dailyLossRemaining" type="text" inputmode="decimal" placeholder="Use the current official account figure"></label><label>Maximum drawdown remaining (USD, optional)<input id="drawdownRemaining" type="text" inputmode="decimal" placeholder="Use the current official account figure"></label><label>Stop distance (ticks)<input id="stopTicks" type="number" min="1" max="1000000" step="1" placeholder="Enter stop distance" required></label><label>Target distance (ticks)<input id="targetTicks" type="number" min="1" max="1000000" step="1" placeholder="Enter target distance" required></label><label>Commission + other fees / contract / round turn (USD)<input id="commission" type="text" inputmode="decimal" placeholder="Enter all round-turn fees" required></label><label>Estimated spread (ticks / round turn)<input id="spreadTicks" type="number" min="0" max="1000000" step="1" placeholder="Enter 0 only if appropriate" required></label><label>Estimated slippage (ticks / round turn)<input id="slippageTicks" type="number" min="0" max="1000000" step="1" placeholder="Enter a conservative estimate" required></label><label>Cost source<input id="costSource" type="text" maxlength="160" placeholder="Broker schedule or documented estimate" required></label><label>Cost source date<input id="costAsOf" type="date" required></label><button id="calculateRisk" class="primary-button">Calculate conditional size</button></div><div id="riskResult" class="result-panel" aria-live="polite">Enter exact contract, expiry and cost assumptions to calculate a conditional estimate. Core tick facts are source-checked; the full contract record remains partial.</div><p class="fine-print">Tick value means dollars per exchange tick, not dollars per index point. Round-turn fees should include broker, exchange, clearing, NFA and routing costs. Spread and slippage are estimates supplied by you, not observed fills.</p></section>'''
    unverified_cards=''.join('<article class="os-data-footnote"><b>'+escape(str(x.get('label') or 'Unverified mention'))+' · UNVERIFIED</b><p>'+escape(str(x.get('reason') or 'No official rules verified.'))+'</p><p>Exact firm: NOT VERIFIED · Plan/stage/platform: NOT VERIFIED · Fees, drawdown, contract limits, eligibility and payout: NOT PUBLISHED</p></article>' for x in risk_rules.get('unverifiedMentions',[]))
    body+='<section class="content-section os-prop-firm-panel"><div class="section-top"><div><h2>Prop-firm rule registry</h2><p>Schema version '+escape(str(risk_rules.get('schemaVersion','unknown')))+' · reviewed '+escape(str(risk_rules.get('reviewedAt','not recorded')))+' · verified programs '+str(len(risk_rules.get('records',[])))+'</p></div><span class="os-state-chip warn">NO VERIFIED PROGRAMS</span></div><p>'+escape(str(risk_rules.get('verificationPolicy','Official current terms required.')))+' No numeric rule, fee, eligibility, payout or comparison is shown without an exact current official source.</p>'+unverified_cards+'<p class="os-data-footnote">No login credentials are requested or stored. Private account balances and remaining-loss allowances are entered in this browser only and are not sent to Supabase.</p></section>'
    body+='<section class="content-section"><h2>Personal risk workflow</h2><div class="card-grid">'+card('Journal & watchlists','Review planned and completed trades in your private workspace.','/account/','Private workspace')+card('Pre-session checklist','Prepare a repeatable market plan and evidence checklist.','/ict-lab/practice/16/#local-journal','ICT Futures')+card('Contract verification','Check imported tick references and missing expiry fields.','/contract-specs/','Reference registry')+'</div></section>'
    write(DIST/'data/prop-firm-programs.json',json.dumps(risk_rules,ensure_ascii=False,indent=2)+'\n')
    write(DIST/'risk/index.html',shell('Risk & Prop Firms | Futures Intelligence OS','Conditional futures position sizing and versioned prop-firm rule verification status.',body,'/risk/', '<script type="module" defer src="/assets/risk-calculator.js"></script>'))
    write(DIST/'tools/index.html',redirect_page('Risk tools moved','/risk/'))

    # Supabase account sign-in and private workspace sync.
    body=page_intro('Account & sync','Your private cloud workspace','Manage your cloud trade journal, multi-list watchlists, research notes, price-alert rules, performance analytics and account preferences. Every private record is scoped to your authenticated account.')+'<div id="accountApp"><section class="content-section"><p>Loading your secure cloud workspace…</p></section></div>'
    write(DIST/'account/index.html',shell('Account & Private Workspace | Futures Intelligence OS','Cloud trade journal, watchlists, research notes, alerts, analytics and cross-device account synchronization.',body,'/account/', '<script defer src="/assets/session-time.js"></script><script defer src="/assets/account.js"></script>'))

    # Status / docs pages
    status_rows=[('GitHub','Source repository and CI','WHIZZ444YT/WHIZZ444-YT-OS. This page is a dated implementation-branch snapshot; check the live PR and required checks for review status. The static frontend requires merge and a successful main deployment.'),('Vercel','Frontend hosting','The public frontend snapshot reviewed on 19 November 2026 was deployed from main. Check the latest production deployment and linked commit before release; a Worker update can deploy independently of static-site changes.'),('Supabase','Postgres and Auth','Active healthy Mumbai project. COT and private-workspace migrations 20261119125044 and 20261119125110 are applied; security and health advisors were clean. Real signup, two-user RLS and attachment flows still need dedicated test accounts.'),('Builder.io','Editorial CMS','Allow-listed proxy code exists; the public Content API key and read-only Admin PAT are not configured. The static Academy remains available.'),('Cloudflare','Edge API and cache','Worker 2.0.0 was deployed on 19 November 2026 with KV, 30-minute Cron and query-string redaction. The bounded no-search COT route returned a fresh TFF snapshot in the live site. Database writes, CMS and ingestion token remain not configured; other provider endpoints still require a full smoke test.')]
    rows=''.join(f'<tr><td><b>{escape(a)}</b><small>{escape(b)}</small></td><td>{escape(c)}</td></tr>' for a,b,c in status_rows)
    body=page_intro('Platform operations','System status & integrations','This page deliberately reports verified account and runtime state. Configuration files in the repository are not evidence that a remote service has been provisioned or deployed.')
    body+='<p class="small-text">Platform and COT configuration were manually checked on 19 November 2026. This status page is a dated snapshot; provider availability changes independently. See <a href="/data-health/">Data Health &amp; Sources</a> for live endpoint checks and each response’s data-as-of time.</p>'
    body+=f'<section class="content-section"><div class="table-wrap" role="region" aria-label="Platform service status" tabindex="0"><table class="status-table"><thead><tr><th>Service</th><th>Verified state</th></tr></thead><tbody>{rows}</tbody></table></div></section>'
    body+='<section class="content-section"><h2>Data state definitions</h2><p><span class="data-pill">LIVE API</span> received from a provider at request time · <span class="data-pill">SNAPSHOT</span> stored response · <span class="data-pill">DELAYED</span> provider-labelled delay · <span class="data-pill">OFFICIAL LINK</span> publisher page · <span class="data-pill">SEARCH LINK</span> provider search query · <span class="data-pill">STALE</span> retained last-known data · <span class="data-pill">UNAVAILABLE</span> no usable response.</p></section>'
    write(DIST/'status/index.html',shell('System Status | Futures Intelligence OS','Verified setup status for GitHub, Vercel, Supabase, Builder.io and Cloudflare.',body,'/status/'))
    body = page_intro('Site guide', 'Help & documentation',
                      'Find learning paths, market data definitions and instructions for the public futures tools.')
    docs_cards = [
        card('Learn ICT', 'Find written lessons, practice exercises and source videos.', '/ict-lab/learn/', 'Lessons'),
        card('Practice workflows', 'Use chart exercises, review decisions and practice journaling.', '/ict-lab/practice/', 'Practice'),
        card('Data coverage', 'Review source availability, timestamps and limitations.', '/data-health/', 'Sources'),
        card('Contracts and expiry', 'Read contract references and see lifecycle data availability.', '/contract-specs/', 'Contracts'),
        card('Strategy Lab rule cards', 'Review model assumptions and evidence required before testing.',
             '/docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md', 'Reference'),
    ]
    body += '<section class="card-grid">' + ''.join(docs_cards) + '</section>'
    repo_docs = 'https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/main/docs'
    body += ('<section class="content-section"><h2>Developer documentation</h2>'
             f'<p><a href="{repo_docs}">Browse architecture, setup and release guides on GitHub</a>.</p></section>')
    write(DIST/'docs/index.html', shell('Help & Documentation | Futures Intelligence OS',
          'Public guides for learning, practice and market data.', body, '/docs/'))

    # Source archives stay in Git and are intentionally not published in dist.
    write(DIST/'legacy/index.html',redirect_page('Source archives are maintained in the repository','/docs/'))

    # Sitemap only when canonical base exists, else create relative noindex sitemap not intended for submission.
    if SITE_URL:
        urls=['/','/ict-lab/','/futures-intelligence/','/markets/','/sessions/','/academy/','/entry-models/','/news/','/volume-open-interest/','/research/positioning/','/contract-specs/','/strategy-lab/','/risk/','/account/','/data-health/','/macro/','/status/','/docs/','/sources/','/ict-futures/']
        urls += ['/charts/', '/academy/crosswalk/', *lab_routes]
        urls += [f'/ict-futures/markets/{p.name}' for p in (DIST/'ict-futures/markets').glob('*.html')]
        urls += [f'/ict-futures/academy/{p.name}' for p in (DIST/'ict-futures/academy').glob('*.html')]
        urls.append('/ict-futures/academy/tutorials/')
        urls += [f'/ict-futures/academy/tutorials/{p.name}' for p in (DIST/'ict-futures/academy/tutorials').glob('*.html') if p.name != 'index.html']
        excluded = {'/account/', '/ict-futures/'}
        xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{escape(SITE_URL+u)}</loc></url>' for u in sorted(set(urls)-excluded))+'</urlset>'
        write(DIST/'sitemap.xml',xml)
        write(DIST/'robots.txt',f'User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n')
    else:
        write(DIST/'robots.txt','User-agent: *\nDisallow: /\n')
        write(DIST/'sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
    manifest = route_manifest(ROOT, DIST, cutover=TERMINAL_CUTOVER,
                              commit=os.getenv('VERCEL_GIT_COMMIT_SHA') or os.getenv('GITHUB_SHA'))
    write(DIST/'route-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(f'Built {DIST} | resources={len(resources)} | futures={len(mdata)} | academy={len(academy)} | site_url={SITE_URL or "local/noindex"}')

if __name__ == '__main__': build()
