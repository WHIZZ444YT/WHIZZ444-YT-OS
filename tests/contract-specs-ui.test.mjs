import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../dist/contract-specs/index.html', import.meta.url), 'utf8');
const markets = JSON.parse(fs.readFileSync(new URL('../ict-futures/data/market-universe.json', import.meta.url), 'utf8')).markets;
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const filterScript = inlineScripts.find((script) => script.includes('contractSpecSearch'));

function mountFilter() {
  const controls = {
    contractSpecSearch: { value: '', handlers: {}, addEventListener(name, callback) { this.handlers[name] = callback; } },
    contractSpecExchange: { value: 'all', handlers: {}, addEventListener(name, callback) { this.handlers[name] = callback; } },
    contractSpecCount: { textContent: '15 of 15 families' },
  };
  const cards = markets.map((market) => ({
    dataset: {
      search: `${market.id} ${market.label} ${market.exchange} ${market.microSpec?.symbol || ''}`.toLowerCase(),
      exchange: market.exchange,
    },
    hidden: false,
  }));
  const document = {
    getElementById(id) { return controls[id]; },
    querySelectorAll() { return cards; },
  };
  assert.ok(filterScript, 'generated page contains its filter controller');
  vm.runInNewContext(filterScript, { document });
  return { controls, cards };
}

test('contract family search filters labels and micro symbols with an accessible count', () => {
  const { controls, cards } = mountFilter();
  controls.contractSpecSearch.value = 'm2k';
  controls.contractSpecSearch.handlers.input();
  assert.deepEqual(cards.filter((card) => !card.hidden).map((card) => card.dataset.search.split(' ')[0]), ['rty']);
  assert.equal(controls.contractSpecCount.textContent, '1 of 15 families');
});

test('contract family exchange filter returns the ICE family and updates the count', () => {
  const { controls, cards } = mountFilter();
  controls.contractSpecExchange.value = 'ICE US';
  controls.contractSpecExchange.handlers.change();
  assert.deepEqual(cards.filter((card) => !card.hidden).map((card) => card.dataset.search.split(' ')[0]), ['dx']);
  assert.equal(controls.contractSpecCount.textContent, '1 of 15 families');
});
