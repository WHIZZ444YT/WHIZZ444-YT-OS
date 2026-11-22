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
  assert.match(published(lab + 'practice/16/index.html'), /data-journal-playbooks/);
  const search = published('search/index.html');
  assert.ok(search.includes('"path": "/ict-lab/learn/c34/"'));
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
    const options = entries.map(([value, symbol]) => ({ value, dataset: { symbol }, textContent: value }));
    return { name, options, get selectedOptions() { return options.filter(option => option.value === this.value); } };
  };
  const form = {
    elements: {
      market: field('market', [['nq', 'CME_MINI:NQ1!'], ['es', 'CME_MINI:ES1!']]),
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
  assert.equal(new URL(frames()[0].src).searchParams.get('interval'), '60');
  state.index--;
  emit.popstate();
  assert.equal(form.elements.interval.value, '15');
  assert.equal(frames().length, 0);
  state.index++;
  emit.popstate();
  assert.equal(form.elements.interval.value, '60');
  assert.equal(frames().length, 0);
});

test('no-trade and legacy journal entries remain readable with the public Practice module', async t => {
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
      querySelector: selector => selector === '[data-ict-practice]' ? root : null,
      querySelectorAll: () => [{ value: 'P01 2022 Mentorship' }],
      createElement: node,
    },
    localStorage: storage,
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
  assert.ok(primary.disabled && outcome.disabled);
  await form.onsubmit({ preventDefault() {} });
  const entry = JSON.parse(storage[Object.keys(storage).find(key => key.startsWith('ict-lab.practice.v1.journal.') && key !== savedKey)]);
  assert.equal(entry.primary, null);
  assert.equal(entry.outcome, null);
  assert.equal(storage[savedKey], legacy);
  for (const history of findAll(root, 'details')) { history.open = true; history.ontoggle(); }
  const rows = findAll(root, 'li').map(row => row.textContent || '');
  assert.ok(rows.some(value => value.includes('Legacy review note')));
  assert.ok(rows.some(value => value.includes('Original terminal entry')));
  action.value = 'Trade';
  action.onchange();
  assert.ok(!primary.disabled && !outcome.disabled && primary.required && outcome.required);
});
