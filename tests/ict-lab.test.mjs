import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext, Script } from 'node:vm';

const published = path => readFileSync(new URL('../dist/' + path, import.meta.url), 'utf8');
const json = path => JSON.parse(published(path));
const payload = (html, id) => JSON.parse(html.match(new RegExp('<script[^>]+id="' + id + '"[^>]*>(.*?)</script>'))[1]);
const lab = 'ict-lab/';
const origin = 'https://finance.test';
const base = process.env.ICT_TERMINAL_CUTOVER === '1' ? 'ict-futures/' : 'ict-futures/bookmarks/';
const labHome = published(lab + 'index.html');
const bookmark = published(base + 'index.html');
const details = payload(labHome, 'ict-legacy-details');
const terminal = payload(bookmark, 'ict-terminal-routes');
const candidateScript = asset => published('assets/' + asset);

function route(code, path, query = '', hash = '', data = {}) {
  const visited = [];
  runInNewContext(candidateScript(code), {
    URL, URLSearchParams,
    location: { origin, pathname: path, hash, search: query, replace: value => visited.push(value) },
    document: {
      getElementById: () => ({ textContent: JSON.stringify(data) }),
      querySelector: () => ({ querySelector: () => null }),
    },
  });
  return visited;
}

test('the sitemap lists canonical Academy URLs and preserves legacy pages', () => {
  const site = (process.env.SITE_URL || '').replace(/\/+$/, '');
  const locations = [...published('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(locations).size, locations.length);
  assert.ok(locations.every(location => !new URL(location).pathname.startsWith('/ict-lab/')));
  const sitemap = new Set(locations);
  const pairs = [
    ['/ict-lab/', '/academy/'],
    ['/ict-lab/learn/', '/academy/'],
    ['/academy/learn/', '/academy/'],
  ];
  for (const view of Object.keys(details)) {
    if (view !== 'learn') pairs.push(['/ict-lab/' + view + '/', '/academy/' + view + '/']);
    for (const legacyPath of Object.values(details[view])) {
      pairs.push([legacyPath, legacyPath.replace('/ict-lab/', '/academy/')]);
    }
  }
  for (const [alias, canonical] of pairs) {
    assert.ok(!sitemap.has(site + alias), alias);
    for (const path of [alias, canonical]) {
      const html = published(path.slice(1) + 'index.html');
      const links = [...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(match => match[1]);
      assert.deepEqual(links, site ? [site + canonical] : [], path);
      if (!site) assert.match(html, /<meta name="robots" content="noindex,follow">/, path);
    }
    if (site) assert.ok(sitemap.has(site + canonical), canonical);
  }
  if (!site) assert.equal(sitemap.size, 0);
  assert.match(published('ict-lab/practice/16/index.html'), /id="local-journal"/);
  assert.match(published('ict-lab/learn/index.html'), /<form[^>]+action="\/ict-lab\/learn\/"/);
});

test('global search indexes every public Academy media page once', () => {
  const search = published('search/index.html').split('id="public-search"')[1];
  const rows = JSON.parse(search.match(/<script type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const expected = new Map([
    ['/academy/videos/', 'Academy videos'],
    ['/academy/podcasts/', 'Academy podcasts'],
    ['/academy/mentors/', 'Academy mentors'],
  ]);
  for (const [view, category] of [['podcasts', 'Academy podcast'], ['mentors', 'Academy mentor']]) {
    for (const path of Object.values(details[view])) {
      expected.set(path.replace('/ict-lab/', '/academy/'), category);
    }
  }
  for (const id of readdirSync(new URL('../dist/academy/videos/', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name)) {
    expected.set('/academy/videos/' + id + '/', 'Academy video');
  }
  const mediaRows = rows.filter(row => /^\/academy\/(videos|podcasts|mentors)\//.test(row.path));
  assert.equal(mediaRows.length, expected.size);
  assert.deepEqual(new Map(mediaRows.map(row => [row.path, row.category])), expected);
  for (const path of expected.keys()) {
    assert.match(published(path.slice(1) + 'index.html'), /<h1>[^<]+<\/h1>/, path);
  }
});

test('legacy navigation resolves from Vercel clean trailing-slash URLs', () => {
  const pages = {
    '/ict-futures/academy/amd-po3/': '/ict-futures/academy/amd-po3.html',
    '/ict-futures/academy/tutorials/': '/ict-futures/academy/tutorials/index.html',
    '/ict-futures/markets/nq/': '/ict-futures/markets/nq.html',
  };
  const links = Object.fromEntries(Object.entries(pages).map(([route, file]) => {
    const markup = published(file.slice(1));
    return [route, [...markup.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1])];
  }));
  const lesson = links['/ict-futures/academy/amd-po3/'];
  assert.ok(lesson.includes('/ict-futures/academy/judas-swing.html'));
  assert.ok(lesson.includes('/ict-futures/academy/asian-range.html'));
  assert.ok(lesson.includes('#study-section-4'));
  assert.ok(links['/ict-futures/academy/tutorials/'].includes(
    '/ict-futures/academy/tutorials/supplemental-source-audit.html'
  ));
  const profile = links['/ict-futures/markets/nq/'];
  assert.ok(profile.includes('/ict-futures/academy/silver-bullet.html'));
  assert.ok(profile.includes('/ict-futures/'));
  assert.ok(profile.includes('/futures-intelligence/?market=nq#fiSelectedMarket'));
  for (const [route, hrefs] of Object.entries(links)) {
    for (const href of hrefs) {
      assert.match(href, /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i, route + ' ' + href);
      if (href.startsWith('/ict-futures/')) {
        const target = new URL(href, origin + route);
        const file = target.pathname.slice(1);
        assert.ok(published(file.endsWith('/') ? file + 'index.html' : file));
      }
    }
  }
});

test('the five Lab views and all 93 detail pages contain public HTML without scripts', () => {
  assert.match(labHome, /data-os-shell/);
  assert.match(labHome, /56 concepts across 10 modules/);
  assert.match(labHome, /9 full episodes and 2 clips/);
  const counts = { learn: 56, playbooks: 10, practice: 6, podcasts: 11, mentors: 10 };
  for (const [view, count] of Object.entries(counts)) {
    const html = published(lab + view + '/index.html');
    assert.match(html, /id="content"/);
    assert.equal(Object.keys(details[view]).length, count);
    for (const path of Object.values(details[view])) {
      assert.ok(html.includes('href="' + path + '"'), path);
      const detail = published(path.slice(1) + 'index.html');
      assert.match(detail, /<h1>[^<]+<\/h1>/);
      assert.match(detail, /https:\/\/www\.youtube\.com\/watch\?v=/);
      assert.ok(!detail.includes('\uFFFD'), path);
    }
  }
  assert.match(published(lab + 'learn/c34/index.html'), /<caption>EDU-OPEN-01/);
  const inversion = published(lab + 'learn/c17/index.html');
  assert.match(inversion, /data-ifvg-practice=/);
  assert.match(inversion, /UIGZtoGGPH4&amp;t=1306s/);
  assert.match(inversion, /C16 · Fair value gap/);
  assert.match(inversion, /C09 · Displacement/);
  assert.match(inversion, /Look-alike · synthetic NQ/);
  assert.match(inversion, /Worked inversion · separate synthetic NQ example/);
  assert.doesNotMatch(inversion, /sample 7, price 20006/);
  assert.match(inversion, /Playback: unchecked/);
  assert.match(published(lab + 'learn/c54/index.html'), /Forex source · Futures adaptation/);
  assert.match(published(lab + 'learn/c55/index.html'), /Watch-page check: 2026-11-22/);
  assert.match(published(lab + 'learn/c56/index.html'), /18:00 IST.*19:00 IST/);
  assert.match(published(lab + 'mentors/m08/index.html'), /nY1NaXsFDQM/);
  assert.match(published(lab + 'podcasts/w42kzZb9oYY/index.html'), /1:25:36/);
  assert.match(published(lab + 'practice/16/index.html'), /data-journal-playbooks/);
  const search = published('search/index.html');
  assert.ok(search.includes('"path": "/academy/learn/c34/"'));
  assert.ok(search.includes('"path": "/ict-futures/markets/nq.html"'));
  assert.ok(!search.includes('"path": "/ict-futures/"'));
  assert.equal(readdirSync(new URL('../dist/ict-lab/', import.meta.url)).some(file => file.endsWith('.js')), false);
  for (const file of ['public-charts.js', 'ict-public.js', 'ict-terminal-compat.js', 'futures-brief.js', 'futures-social.js', 'legacy-reminders.js', 'publisher-schedules.js', 'market-profiles.js', 'public-search.js']) {
    assert.doesNotThrow(() => new Script(candidateScript(file), { filename: file }));
  }
});

test('original Lab view, id and search parameters resolve with history replacement', () => {
  const cases = [
    ['?view=learn&id=C34&q=weekly+open', '/ict-lab/learn/c34/?q=weekly+open'],
    ['?view=playbooks&id=p10', '/ict-lab/playbooks/p10/'],
    ['?view=practice&id=16', '/ict-lab/practice/16/'],
    ['?view=podcasts&id=8OX-mcSHWhg', '/ict-lab/podcasts/8OX-mcSHWhg/'],
    ['?view=mentors&id=M10', '/ict-lab/mentors/m10/'],
    ['?q=opening', '/ict-lab/learn/?q=opening'],
    ['?view=learn&id=bad&next=https://example.org&q=range', '/ict-lab/learn/?q=range'],
    ['?view=__proto__', null],
    ['', null],
  ];
  for (const [query, expected] of cases) {
    assert.deepEqual(route('ict-public.js', '/ict-lab/', query, '', details), expected ? [origin + expected] : []);
  }
});

test('the release manifest records stable routes, bookmarks and source revisions', () => {
  const manifest=json('route-manifest.json');
  assert.equal(manifest.bookmarkDispatcher,'/'+base);
  assert.equal(manifest.terminalFragments.checklist,'/ict-lab/practice/16/#local-journal');
  assert.equal(manifest.labQuery.details.learn.C17,'/ict-lab/learn/c17/');
  assert.ok(manifest.routes['/ict-lab/practice/16/'].anchors.includes('local-journal'));
  assert.equal(manifest.routes['/account/'].indexable,false);
  assert.match(manifest.sourceSha256['ict-lab/catalog.json'],/^[a-f0-9]{64}$/);
});

test('the crosswalk distinguishes shared concepts, separate variants and exact Academy video gaps', () => {
  const page = published('academy/crosswalk/index.html');
  assert.match(page, /51 of 82 Academy lessons.*4 of 8 Entry Models/);
  assert.match(page, /31 Academy video gaps/);
  assert.equal([...page.matchAll(/<tr><th scope="row"><a href="\/ict-lab\/learn\/c\d\d\//g)].length, 56);
  const bsl = published('ict-futures/academy/bsl.html');
  assert.match(bsl, /Continue in ICT Lab/);
  assert.match(bsl, /href="\/ict-lab\/learn\/c01\/"/);
  const labBsl = published('ict-lab/learn/c01/index.html');
  assert.match(labBsl, /A label for potential buy stops and breakout orders/);
  assert.match(labBsl, /From the Academy lesson/);
  assert.match(labBsl, /href="\/ict-futures\/academy\/bsl.html"/);
  assert.match(published('ict-lab/learn/c04/index.html'), /linked Academy convention additionally requires a close back inside/);
  assert.match(published('ict-lab/learn/c27/index.html'), /02:00–05:00 ET/);
  assert.match(published('ict-lab/learn/c28/index.html'), /08:30–11:00 ET/);

  const gaps = published('ict-lab/learn/c35/index.html');
  assert.match(gaps, /watch\?v=-M-RAtxB-bE/);
  assert.match(gaps, /watch\?v=Sh-bDHWNpsk/);
  assert.equal([...gaps.matchAll(/watch\?v=WKKnlIIkBTk/g)].length, 1);
  assert.match(gaps, /NWOG \(supplied above\)/);
  const buy = published('ict-lab/playbooks/p08/index.html');
  assert.match(buy, /1vsIPazjfGQ/);
  const sell = published('ict-lab/playbooks/p09/index.html');
  assert.match(sell, /0R61Y6Pn74Q/);
  assert.match(sell, /Lab-authored synthetic NQ/);
  assert.match(sell, /XAUUSD/);
  const modelIndex = published('entry-models/index.html');
  assert.match(modelIndex, /FVG Continuation · Distinct variant/);
  assert.match(modelIndex, /Judas \+ MSS · Overlapping setup/);
  assert.match(modelIndex, /href="\/ict-futures\/academy\/ifvg-reversal-model.html"/);
  assert.match(published('ict-futures/academy/ifvg-reversal-model.html'), /Continue in ICT Lab[\s\S]+\/ict-lab\/playbooks\/p07\//);
  const search = published('search/index.html');
  assert.match(search, /"path": "\/academy\/learn\/c01\/"[^}]*"keywords": "C01 BSL bsl /);
  assert.ok(!search.includes('"path": "/ict-futures/academy/bsl.html"'));
  assert.ok(!search.includes('"path": "/ict-lab/learn/c01/"'));
});

test('terminal bookmarks preserve real public fragments and allowlisted market context', () => {
  const legacy = ['top', 'dashboard', 'daily-brief', 'markets', 'market-profile', 'charts', 'learning', 'academy', 'sessions',
    'playbook', 'calendar', 'news', 'social', 'positioning', 'risk', 'journal', 'checklist', 'sources'];
  const oldHtml = published('ict-futures/index.html');
  if (process.env.ICT_TERMINAL_CUTOVER === '1') {
    assert.ok(!oldHtml.includes('DATA_BUNDLE'));
    assert.match(published('ict-futures/sw.js'), /registration\.unregister\(\)/);
  } else {
    for (const anchor of legacy) assert.ok(oldHtml.includes('id="' + anchor + '"'), anchor);
  }
  for (const anchor of legacy) {
    const path = terminal.routes[anchor];
    assert.ok(path);
    const target = new URL(path, origin);
    const page = published(target.pathname.slice(1) + 'index.html');
    if (target.hash) assert.ok(page.includes('id="' + target.hash.slice(1) + '"'), path);
  }
  const cases = [
    ['', '', '/futures-intelligence/'], ['#top', '', '/'],
    ['#daily%2Dbrief', '?market=gc', '/futures-intelligence/?market=gc#daily-brief'],
    ['#charts', '?market=es', '/charts/?market=es'],
    ['#calendar', '?market=6e', '/sessions/?market=6e#calendar'],
    ['#social', '', '/sources/#social-discovery'], ['#market-profile', '?market=6e', '/ict-futures/markets/6e.html'],
    ['#checklist', '', '/ict-lab/practice/16/#local-journal'],
    ['', '?market=nq', '/ict-futures/markets/nq.html'],
    ['#charts', '?market=https://example.org', null],
    ['#%E0%A4%A', '', null], ['#%252Fcharts', '', null], ['#__proto__', '', null], ['#//example.com', '', null],
  ];
  for (const [fragment, query, expected] of cases) {
    assert.deepEqual(route('ict-terminal-compat.js', '/' + base, query, fragment, terminal), expected ? [origin + expected] : []);
  }
  assert.match(bookmark, /href="\/charts\/">Charts<\/a>/);
  assert.ok(!bookmark.includes('serviceWorker.register'));
  const { concepts } = json('ict-futures/data/ict-academy.json');
  assert.equal(concepts.length, 82);
  for (const { id } of concepts) assert.match(published('ict-futures/academy/' + id + '.html'), /<h1[ >]/i);
  const tutorials = readdirSync(new URL('../dist/ict-futures/academy/tutorials/', import.meta.url));
  assert.equal(tutorials.filter(name => /\.html$/.test(name)).length, 10);
  for (const id of terminal.markets) assert.match(published('ict-futures/markets/' + id + '.html'), /<h1[ >]/i);
});

test('the scoped worker retires only terminal cache keys', async () => {
  const code = readFileSync(new URL('../scripts/retire_terminal_worker.js', import.meta.url), 'utf8');
  const listeners = {}, actions = [];
  const cacheKeys = ['ict-futures-shell-v3.0.0', 'fios-shell-v1.1.0', 'another-app'];
  runInNewContext(code, {
    caches: { keys: async () => cacheKeys, delete: async key => actions.push(key) },
    self: {
      addEventListener: (name, handler) => { listeners[name] = handler; },
      skipWaiting: async () => actions.push('skipWaiting'),
      clients: { claim: async () => actions.push('claim') },
      registration: { unregister: async () => actions.push('unregister') },
    },
  });
  for (const type of ['install', 'activate']) await new Promise(resolve => listeners[type]({ waitUntil: resolve }));
  assert.deepEqual(actions, ['skipWaiting', cacheKeys[0], 'claim', 'unregister']);
  assert.equal(listeners.fetch, undefined);
});

test('chart controls restore Back and Forward selections without automatically loading TradingView', () => {
  const chart = published('charts/index.html');
  assert.ok(!chart.includes('<iframe'));
  assert.match(chart, /Open chart on TradingView/);
  const state = { index: 0, urls: [origin + '/charts/?market=es&comparison=nq'] };
  const field = (name, entries) => {
    const options = entries.map(([value, symbol, preview = symbol ? 'pilot' : '']) => ({ value, dataset: { symbol, preview }, textContent: value }));
    return { name, options, get selectedOptions() { return options.filter(option => option.value === this.value); } };
  };
  const previewButton = { disabled: false };
  const form = {
    querySelector: selector => selector === 'button[type="submit"]' ? previewButton : null,
    elements: {
      market: field('market', [['nq', 'CME_MINI:NQ1!'], ['es', 'CME_MINI:ES1!'], ['6e', 'CME:6E1!', '']]),
      comparison: field('comparison', [['', ''], ['nq', 'CME_MINI:NQ1!'], ['es', 'CME_MINI:ES1!']]),
      interval: field('interval', [['15'], ['60']]),
    },
    listeners: {},
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
  const status = {};
  const slots = Array.from({length: 2}, () => {
    const nodes = {
      h2: {}, a: {},
      '[data-chart-mount]': { frames: [], replaceChildren() { this.frames = []; }, append(frame) { this.frames.push(frame); } },
    };
    return { querySelector: name => nodes[name] };
  });
  const emit = {};
  const target = {
    get href() { return state.urls[state.index]; },
    get search() { return new URL(this.href).search; },
  };
  runInNewContext(candidateScript('public-charts.js'), {
    URL, URLSearchParams, location: target,
    window: { FinanceTradingViewWidgets: {
      theme: () => "dark",
      onThemeChange() {},
      mount(node, kind, config) {
        node.append({kind,config});
        return () => node.replaceChildren();
      }
    } },
    history: { pushState(_, _title, next) { state.urls.splice(++state.index, Infinity, next.href); } },
    FormData: function (form) { return Object.values(form.elements).map(option => [option.name, option.value]); },
    addEventListener: (event, callback) => { emit[event] = callback; },
    document: {
      querySelector: selector => selector === '#public-chart-controls' ? form : status,
      querySelectorAll: () => slots,
      createElement: () => ({}),
      body: { classList: { contains: () => false } },
    },
  });
  const frames = () => slots.flatMap(slot => slot.querySelector('[data-chart-mount]').frames);
  assert.equal(form.elements.market.value, 'es');
  assert.equal(frames().length, 0);
  form.elements.interval.value = '60';
  form.listeners.change();
  form.listeners.submit({ preventDefault() {} });
  assert.equal(frames().length, 2);
  assert.equal(frames()[0].config.interval, '60');
  state.index--;
  emit.popstate();
  assert.equal(form.elements.interval.value, '15');
  assert.equal(frames().length, 0);
  state.index++;
  emit.popstate();
  assert.equal(form.elements.interval.value, '60');
  assert.equal(frames().length, 0);

  form.elements.market.value = '6e';
  form.elements.comparison.value = '';
  form.listeners.change();
  assert.equal(previewButton.disabled, true);
  assert.match(status.textContent, /No hosted preview/);
  assert.match(slots[0].querySelector('a').href, /CME%3A6E1%21/);

  form.elements.comparison.value = 'nq';
  form.listeners.change();
  assert.equal(previewButton.disabled, false);
  state.index--;
  emit.popstate();
  assert.equal(previewButton.disabled, true);
  assert.equal(frames().length, 0);
});

test('Practice preserves journal evidence, before-retest decisions, and backtest results', async t => {
  function node(tag) {
    return {
      tag, style: {}, children: [],
      append(...rows) {
        if (tag === 'select' && this.children.length === 0) this.value = rows[0].textContent;
        this.children.push(...rows);
      },
      replaceChildren() { this.children = []; },
      setAttribute() {},
      querySelector(name) { return this.children.find(row => row.tag === name); },
    };
  }
  const findAll = (host, tag) => typeof host === 'string' ? [] :
    [...(host.tag === tag ? [host] : []), ...host.children.flatMap(child => findAll(child, tag))];
  const root = { ...node('section'), dataset: { ictPractice: '16' } };
  let current = root, inversion = null;
  const savedKey = 'ict-lab.practice.v1.journal.1.legacy';
  const legacy = JSON.stringify({ action: 'No trade', primary: 'P01 2022 Mentorship', outcome: 'No trade',
    tags: ['C34'], review: 'Legacy review note' });
  const storage = {
    [savedKey]: legacy,
    'ictfos.journal.v1': '[{"notes":"Original terminal entry"}]',
    getItem(key) { return this[key] ?? null; },
    setItem(key, value) { this[key] = value; },
  };
  const mocks = {
    document: {
      querySelector: selector => selector === '[data-ict-practice]' ? current : selector === '[data-ifvg-practice]' ? inversion
        : selector === '#ict-practice-reference' ? {textContent: JSON.stringify(payload(published('ict-lab/practice/14/index.html'), 'ict-practice-reference'))}
        : null,
      querySelectorAll: () => [{ value: 'P01 2022 Mentorship' }],
      createElement: node,
    },
    localStorage: storage,
    FileReader: class {
      readAsDataURL(file) { this.result = 'data:' + file.type + ';base64,AA=='; this.onload(); }
    },
    FormData: function (form) {
      return [...findAll(form, 'select'), ...findAll(form, 'input')].filter(field => !field.disabled)
        .map(field => [field.name, field.value ?? '']);
    },
  };
  for (const [key, value] of Object.entries(mocks)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  await import('../dist/assets/ict-practice.mjs');
  const [form] = findAll(root, 'form');
  form.querySelector = () => node('button');
  const [action, primary, outcome] = ['action', 'primary', 'outcome'].map(key => findAll(form, 'select').find(field => field.name === key));
  assert.ok(primary.required && outcome.required);
  primary.value = 'P01 2022 Mentorship';
  outcome.value = 'Win';
  action.value = 'No trade';
  action.onchange();
  findAll(form, 'input').find(field => field.name === 'before').value = { size: 1, type: 'image/png' };
  assert.ok(primary.disabled && outcome.disabled);
  await form.onsubmit({ preventDefault() {} });
  const entry = JSON.parse(storage[Object.keys(storage).find(key => key.startsWith('ict-lab.practice.v1.journal.') && key !== savedKey)]);
  assert.equal(entry.primary, null);
  assert.equal(entry.outcome, null);
  assert.equal(entry.charts.before, 'data:image/png;base64,AA==');
  assert.equal(storage[savedKey], legacy);
  for (const history of findAll(root, 'details')) { history.open = true; history.ontoggle?.(); }
  const rows = findAll(root, 'li').map(row => row.textContent || '');
  assert.ok(rows.some(value => value.includes('Legacy review note')));
  assert.ok(rows.some(value => value.includes('Original terminal entry')));
  action.value = 'Trade';
  action.onchange();
  assert.ok(!primary.disabled && !outcome.disabled && primary.required && outcome.required);

  current = null;
  inversion = { ...node('section'), dataset: { ifvgPractice: '20014,20011,20013,20005,20008,20011,20006' } };
  await import('../dist/assets/ict-practice.mjs?ifvg');
  const [decision] = findAll(inversion, 'form');
  decision.querySelector = () => node('button');
  findAll(decision, 'select')[0].value = 'Wait';
  findAll(decision, 'input')[0].value = '20012';
  assert.equal(findAll(inversion, 'tr').length, 6);
  await decision.onsubmit({ preventDefault() {} });
  const attempt = JSON.parse(storage[Object.keys(storage).find(key => key.startsWith('ict-lab.practice.v1.ifvg.'))]);
  assert.equal(attempt.decisionBar, 5);
  assert.equal(attempt.correct, true);
  assert.equal(decision.hidden, true);
  assert.equal(findAll(inversion, 'tr').length, 14);

  inversion = null;
  current = { ...node('section'), dataset: { ictPractice: '14' } };
  await import('../dist/assets/ict-practice.mjs?backtest');
  const [backtest] = findAll(current, 'form');
  backtest.querySelector = () => node('button');
  await backtest.onsubmit({ preventDefault() {} });
  const resultKey = Object.keys(storage).find(key => key.startsWith('ict-lab.practice.v1.tests.'));
  assert.ok(resultKey, findAll(current, 'p').map(row => row.textContent).join(' '));
  const result = JSON.parse(storage[resultKey]);
  assert.equal(result.session, 'New York AM');
  assert.match(result.result, /win rate.*expectancy.*drawdown/);
  assert.match(result.datasetHash, /^[a-f0-9]{64}$/);
  assert.equal(result.execution.entry, 'next-bar-open');
  assert.deepEqual(result.splits.map(split => split.key), ['in-sample', 'validation', 'out-of-sample']);
});

test('lesson and playbook contracts are visible without running scripts', () => {
  assert.match(published('ict-lab/learn/index.html'), /Prerequisites · [\s\S]*Related Practice 11/);
  const c34 = published('ict-lab/learn/c34/index.html');
  for (const period of ['DAY','WEEK','MONTH']) assert.match(c34, new RegExp('EDU-OPEN-01-' + period));
  assert.match(c34, /Friday to Monday/);
  assert.match(c34, /August 1 is Saturday/);
  assert.match(published('ict-lab/learn/c56/index.html'), /00:01[\s\S]*08:31/);
  assert.match(published('ict-lab/learn/c55/index.html'), /MIDNIGHT-RANGE v1/);
  for (let n = 1; n <= 10; n++) {
    const id = String(n).padStart(2, '0');
    const page = published('ict-lab/playbooks/p' + id + '/index.html');
    assert.match(page, new RegExp('Lab Rule · P' + id + ' v1'));
    for (const label of ['Eligible state','Long','Short','No trade','Expiration']) assert.ok(page.includes(label), id + ' ' + label);
  }
  const risk = payload(published('ict-lab/practice/15/index.html'), 'ict-practice-reference');
  assert.deepEqual(Object.keys(risk.contracts).sort(), ['ES','MES','MNQ','NQ']);
  assert.ok(Object.values(risk.contracts).every(spec => spec.source.startsWith('https://www.cmegroup.com/') && spec.status === 'partial'));
});

test('editorial paths, practice destinations and predecessor placements are published', () => {
  const learn = published(lab + 'learn/index.html');
  for (const path of ['First ICT workflow', 'Active NQ/ES learner', 'Contract foundations', 'Practice review']) {
    assert.ok(learn.includes(path), path);
  }
  const resources = published('academy/videos/index.html');
  for (const id of ['c14', 'c08', 'c16', 'c09', 'p01', 'c21', 'liquidity-sweep-mss-model']) {
    assert.ok(resources.includes('id="placement-' + id + '"'), id);
  }
  assert.match(resources, /Official ICT playlists/);
  assert.match(resources, /Playback and chapter fit are pending editorial review/);
  assert.match(published(lab + 'learn/c54/index.html'), /EDU-C54-01/);
  assert.match(published(lab + 'learn/c34/index.html'), /Practice next/);
  assert.match(published(lab + 'playbooks/p01/index.html'), /Practice next/);
});

test('official ICT series, Charter lectures and mentor channel profiles remain distinct', () => {
  const sources = published('academy/videos/index.html');
  for (const title of ['2016 Core Mentorship', '2022 Mentorship', '2023 time macros', '2024 mentorship',
    '2025 opening range', '2026 tape-reading']) assert.ok(sources.includes(title), title);
  const playbooks = published(lab + 'playbooks/index.html');
  assert.match(playbooks, /id="charter-lectures"/);
  assert.equal([...playbooks.matchAll(/<h3>Charter Model \d+ /g)].length, 13);
  for (let id = 1; id <= 10; id++) {
    const mentor = published(lab + 'mentors/m' + String(id).padStart(2, '0') + '/index.html');
    assert.match(mentor, /Visit YouTube channel/);
    assert.match(mentor, /Best for this topic/);
    assert.doesNotMatch(mentor, /<summary>Popular<\/summary>/);
  }
  assert.match(published(lab + 'mentors/m06/index.html'), /BYIzvNBH59c/);
  assert.match(published(lab + 'learn/c45/index.html'), /TTrades Fractal Model/);
});

test('archived evidence keeps all 31 Academy gaps distinct from verified mappings', () => {
  const resources = published('ict-lab/video-evidence/index.html');
  const main = resources.match(/<main\b[^>]*>[\s\S]*?<\/main>/)[0];
  const headings = [...main.matchAll(/<h([1-6])\b/g)].map(match => match[1]);
  assert.deepEqual(headings, ['1', '2', ...Array(31).fill('3')]);
  assert.match(main, /<h1>Archived Academy video evidence<\/h1>/);
  assert.match(main, /id="academy-video-gaps"><h2>Academy video evidence<\/h2>/);
  assert.equal([...resources.matchAll(/id="gap-[a-z0-9-]+"/g)].length, 31);
  assert.match(resources, /51 of 82 Academy lessons have recorded mappings/);
  assert.match(resources, /id="gap-cbdr"[\s\S]*?Exact coverage open/);
  assert.match(resources, /id="gap-flout"[\s\S]*?Exact coverage open/);
  const learn = published(lab + 'learn/index.html');
  assert.match(learn, /<option value="extension">Academy extensions/);
  assert.match(learn, /<option value="original">Original ICT sources/);
  assert.match(published(lab + 'playbooks/index.html'), /<option value="academy">Academy model variants/);
  assert.match(published(lab + 'mentors/m06/index.html'), /Matching lessons/);
});

test('Academy video library covers every Lab video and preserves supplied watch variants', () => {
  const catalog = JSON.parse(readFileSync(new URL('../ict-lab/catalog.json', import.meta.url), 'utf8'));
  const library = published('academy/videos/index.html');
  const watchSection = library.split('id="watch-library"')[1].split('id="terminal-featured"')[0];
  const rendered = new Set([...watchSection.matchAll(/data-search="([^"]+)"/g)].map(match => match[1]));
  assert.deepEqual(rendered, new Set(Object.keys(catalog.videos)));
  for (const ref of catalog.library) {
    const video = published('academy/videos/' + ref.id + '/index.html');
    assert.ok(video.includes(ref.url.replaceAll('&', '&amp;')), ref.url);
    assert.match(video, /Watch on YouTube/);
  }
  assert.match(published('academy/index.html'), /href="\/academy\/videos\/"/);
  assert.match(published(lab + 'resources/index.html'), /location.search \+ location.hash/);
});
