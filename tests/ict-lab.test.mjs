import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext, Script } from 'node:vm';

const published = path => readFileSync(new URL('../dist/' + path, import.meta.url), 'utf8');
const lab = path => published('ict-lab/' + path);
const sectionNames = ['Learn', 'Playbooks', 'Practice', 'Podcasts', 'Mentors'];

test('the generated Lab has a keyboard skip link and static education links', () => {
  const html = lab('index.html');
  for (const name of sectionNames) {
    const view = name.toLowerCase();
    assert.ok(html.includes(`href="?view=${view}" data-view="${view}">${name}</a>`), name);
  }
  assert.match(html, /href="#lesson"/);
  assert.match(html, /id="lesson" tabindex="-1"/);
  assert.match(html, /id="lab-search" hidden/);
  assert.match(html, /href="\/academy\/">ICT Academy lessons/);
  assert.match(html, /href="\/entry-models\/">Entry Models/);
  for (const file of readdirSync(new URL('../dist/ict-lab/', import.meta.url))) {
    if (/\.(html|js|css)$/.test(file)) assert.ok(!lab(file).includes('\uFFFD'), file);
    if (file.endsWith('.js')) assert.doesNotThrow(() => new Script(lab(file), { filename: file }));
  }
});

test('the Lab still dispatches the original view, id and q parameters', () => {
  const cases = [
    ['', 'Learn', '', ''],
    ['?view=learn&id=C34&q=weekly+open', 'Learn', 'C34', 'weekly open'],
    ['?view=playbooks&id=P10', 'Playbooks', 'P10', ''],
    ['?view=practice&id=16', 'Practice', '16', ''],
    ['?view=podcasts&id=8OX-mcSHWhg', 'Podcasts', '8OX-mcSHWhg', ''],
    ['?view=mentors&id=M10', 'Mentors', 'M10', ''],
    ['?view=unknown', 'Learn', '', ''],
  ];
  for (const [search, expected, id, query] of cases) {
    const marked = [];
    const links = sectionNames.map(name => ({
      dataset: { view: name.toLowerCase() },
      textContent: name,
      setAttribute: (...args) => marked.push([name, ...args]),
    }));
    const lesson = {};
    const input = { '#section': {}, '#search': {}, '#lab-search': { hidden: true }, '#lesson': lesson };
    const rendered = [];
    const window = Object.fromEntries(sectionNames.map(name => [
      'render' + name, (...args) => rendered.push([name, ...args]),
    ]));
    runInNewContext(lab('app.js'), {
      window, URLSearchParams, location: { search },
      document: { querySelectorAll: () => links, querySelector: key => input[key] },
    });
    assert.deepEqual(rendered, [[expected, lesson, id, query]]);
    assert.deepEqual(marked, [[expected, 'aria-current', 'page']]);
    assert.equal(input['#section'].value, expected.toLowerCase());
    assert.equal(input['#search'].value, query);
    assert.equal(input['#lab-search'].hidden, false);
  }
});

test('the published terminal anchors and legacy Academy lesson URLs remain available', () => {
  const terminal = published('ict-futures/index.html');
  for (const anchor of [
    'dashboard', 'daily-brief', 'markets', 'market-profile', 'charts', 'learning',
    'academy', 'sessions', 'playbook', 'calendar', 'news', 'social', 'positioning',
    'risk', 'journal', 'sources',
  ]) assert.ok(terminal.includes(`id="${anchor}"`), anchor);
  assert.match(terminal, /URLSearchParams\(location.search\).get\('market'\)/);
  const academy = JSON.parse(published('ict-futures/data/ict-academy.json'));
  assert.equal(academy.concepts.length, 82);
  for (const { id } of academy.concepts) {
    assert.match(published(`ict-futures/academy/${id}.html`), /<h1[ >]/i);
  }
});

test('a skipped session saves null trade fields and keeps old journal entries readable', () => {
  const createElement = tag => ({
    tag, style: {}, children: [], listeners: {},
    append(...nodes) {
      if (this.tag === 'select' && this.children.length === 0) this.value = nodes[0].textContent;
      this.children.push(...nodes);
    },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    replaceChildren() { this.children = []; },
    setAttribute() {},
    querySelector(name) { return this.children.find(child => child.tag === name); },
  });
  const findAll = (node, tag) => typeof node === 'string' ? [] :
    [...(node.tag === tag ? [node] : []), ...node.children.flatMap(child => findAll(child, tag))];
  const legacyKey = 'ict-lab.practice.v1.journal.1.legacy';
  const legacy = JSON.stringify({ action: 'No trade', primary: 'P01 2022 Mentorship', outcome: 'No trade',
    tags: ['C34'], review: 'Legacy review note' });
  const localStorage = {
    [legacyKey]: legacy,
    getItem(key) { return this[key] ?? null; },
    setItem(key, value) { this[key] = value; },
  };
  const window = {};
  runInNewContext(lab('practice.js'), {
    window, document: { createElement }, localStorage, crypto: { randomUUID: () => 'test-record' },
    FormData: function (form) {
      return [...findAll(form, 'select'), ...findAll(form, 'input')]
        .filter(field => !field.disabled).map(field => [field.name, field.value ?? '']);
    },
  });
  const root = createElement('section');
  window.renderPractice(root, '16');
  const [form] = findAll(root, 'form');
  const [action, primary, outcome] = ['action', 'primary', 'outcome'].map(key =>
    findAll(form, 'select').find(field => field.name === key));
  assert.equal(primary.required, true);
  assert.equal(outcome.required, true);
  primary.value = 'P01 2022 Mentorship';
  outcome.value = 'Win';
  action.value = 'No trade';
  action.listeners.change();
  assert.ok(primary.disabled && outcome.disabled);
  assert.ok(!primary.required && !outcome.required);
  form.onsubmit({ preventDefault() {} });
  const savedKey = Object.keys(localStorage).find(key => key.endsWith('.test-record'));
  const entry = JSON.parse(localStorage[savedKey]);
  assert.equal(entry.action, 'No trade');
  assert.equal(entry.primary, null);
  assert.equal(entry.outcome, null);
  assert.equal(localStorage[legacyKey], legacy);

  const [history] = findAll(root, 'details');
  history.open = true;
  history.ontoggle();
  assert.ok(findAll(history, 'li').some(row => row.textContent.includes('Legacy review note')));
  action.value = 'Trade';
  action.listeners.change();
  assert.ok(!primary.disabled && !outcome.disabled);
  assert.ok(primary.required && outcome.required);
});
