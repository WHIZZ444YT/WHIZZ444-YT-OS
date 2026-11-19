import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { default: worker } = await import('../cloudflare/src/index.js');

function makeEnv(values = {}) {
  const store = new Map(Object.entries(values));
  return {
    ALLOWED_ORIGINS: 'https://app.example',
    SNAPSHOTS: {
      async get(key, type) { const value = store.get(key); if (value === undefined) return null; return type === 'json' && typeof value === 'string' ? JSON.parse(value) : value; },
      async put(key, value) { store.set(key, value); },
      async delete(key) { store.delete(key); },
      async list({ prefix = '' } = {}) { return { keys: [...store.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })) }; }
    }, ...values.__env
  };
}

function context() { return { waitUntil() {} }; }

test('news route applies validated filters and exposes the versioned discovery contract', async () => {
  const snapshot = {
    status: 'fresh', lastCheckedAt: '2026-11-19T12:00:00.000Z', generatedAt: '2026-11-19T12:00:00.000Z',
    queryCount: 1, successfulQueries: 1, notes: ['GDELT is a discovery index.'],
    articles: [
      { title: 'US CPI release', publisher: 'bls.gov', instrument_tags: ['nq'], topic_tags: ['macro'], provider_seen_at: '20261119T115000Z', published_at: null, retrieved_at: '2026-11-19T12:00:00.000Z', verification_status: 'unverified' },
      { title: 'EIA crude stocks', publisher: 'eia.gov', instrument_tags: ['cl'], topic_tags: ['energy'], provider_seen_at: '20261119T114000Z' }
    ]
  };
  const env = makeEnv({ 'snapshot:gdelt:news:v1': JSON.stringify(snapshot) });
  const response = await worker.fetch(new Request('https://edge.example/api/v1/news?instrument=NQ&topic=macro&limit=5', { headers: { Origin: 'https://app.example' } }), env, context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
  const payload = await response.json();
  assert.equal(payload.data_type, 'news_discovery');
  assert.equal(payload.status, 'fresh');
  assert.equal(payload.articles.length, 1);
  assert.equal(payload.articles[0].title, 'US CPI release');
  assert.equal(payload.data_as_of, null);
  assert.equal(payload.cache_age_seconds >= 0, true);
});

test('news route rejects unsupported instruments with a stable JSON error', async () => {
  const env = makeEnv();
  const response = await worker.fetch(new Request('https://edge.example/api/v1/news?instrument=SPY'), env, context());
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.status, 'invalid-query');
  assert.equal(payload.error.code, 'unsupported_instrument');
});

test('source registry exposes attribution and market-data status remains disabled', async () => {
  const env = makeEnv();
  const sources = await worker.fetch(new Request('https://edge.example/api/v1/news/sources'), env, context());
  const sourcePayload = await sources.json();
  assert.equal(sourcePayload.data_type, 'news_source_registry');
  assert.equal(sourcePayload.sources[0].terms_status.includes('GDELT citation required'), true);
  assert.equal(sourcePayload.sources[0].enabled, true);

  const market = await worker.fetch(new Request('https://edge.example/api/v1/market-data/status'), env, context());
  const marketPayload = await market.json();
  assert.equal(marketPayload.status, 'not-configured');
  assert.equal(marketPayload.data_type, 'exchange_market_data_status');
  assert.equal(marketPayload.source_provider, null);
});

test('provider registry reads the current bounded COT cache namespace', async () => {
  const retrievedAt = new Date().toISOString();
  const env = makeEnv({
    'cot:tff:futures-only:v6:all': JSON.stringify({ status: 'fresh', dataAsOf: '2026-11-10', retrievedAt })
  });
  const response = await worker.fetch(new Request('https://edge.example/api/v1/providers'), env, context());
  assert.equal(response.status, 200);
  const payload = await response.json();
  const cftc = payload.providers.find(provider => provider.id === 'cftc-pre');
  assert.equal(cftc.state.status, 'fresh');
  assert.equal(cftc.state.dataAsOf, '2026-11-10');
  assert.equal(cftc.state.retrievedAt, retrievedAt);
});

test('COT route selects the exact combined dataset and separates report, position and retrieval dates', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async input => {
    requestedUrl = String(input);
    return new Response(JSON.stringify([{
      report_date_as_yyyy_mm_dd: '2026-11-10T00:00:00.000',
      cftc_contract_market_code: '123456',
      cftc_market_code: '123',
      contract_market_name: 'NASDAQ E-MINI',
      market_and_exchange_names: 'NASDAQ E-MINI - CHICAGO MERCANTILE EXCHANGE',
      open_interest_all: '1000',
      dealer_positions_long_all: '110',
      dealer_positions_short_all: '90',
      asset_mgr_positions_long: '120',
      asset_mgr_positions_short: '100',
      lev_money_positions_long: '250',
      lev_money_positions_short: '150',
      lev_money_positions_spread: '10',
      other_rept_positions_long: '80',
      other_rept_positions_short: '70',
      nonrept_positions_long_all: '20',
      nonrept_positions_short_all: '25'
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const env = makeEnv({ 'cot:tff:combined:v5:nasdaq': JSON.stringify({
      status: 'fresh', retrievedAt: new Date().toISOString(), report: 'tff', variant: 'combined',
      rows: [], normalizedRows: [], sourceUrl: 'https://source.example/obsolete-normalized-only-cache'
    }) });
    const response = await worker.fetch(new Request('https://edge.example/api/v1/cot?report=tff&variant=combined&q=NASDAQ'), env, context());
    assert.equal(response.status, 200);
    const sourceUrl = new URL(requestedUrl);
    assert.match(sourceUrl.pathname, /yw9f-hn96\.json/);
    assert.equal(sourceUrl.searchParams.get('$limit'), '156');
    assert.ok(sourceUrl.searchParams.get('$select').includes('lev_money_positions_long'));
    assert.match(sourceUrl.searchParams.get('$where'), /NASDAQ/);
    const payload = await response.json();
    assert.equal(payload.data_type, 'cftc_cot_positions');
    assert.equal(payload.report_family, 'tff');
    assert.equal(payload.report_variant, 'combined');
    assert.equal(payload.position_date, '2026-11-10');
    assert.equal(payload.published_at, null);
    assert.ok(payload.retrieved_at);
    assert.ok(payload.normalizedRows.some(row => row.traderCategory === 'Leveraged Funds' && row.net === 100));
    assert.equal(payload.rows.length, 1);
    assert.equal(payload.rows[0].contract_market_name, 'NASDAQ E-MINI');
    assert.equal(payload.rows[0].report_date_as_yyyy_mm_dd, '2026-11-10T00:00:00.000');
    assert.equal(payload.rows[0].lev_money_positions_long, '250');
    assert.ok(payload.normalizedRows.length > payload.rows.length);
    assert.equal(Object.hasOwn(payload.normalizedRows[0], 'sourceNativeFields'), false);
    assert.equal(payload.persistence.status, 'not-configured');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unfiltered COT requests return a bounded latest-market snapshot for older frontends', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async input => {
    requestedUrl = String(input);
    return new Response(JSON.stringify([{
      report_date_as_yyyy_mm_dd: '2026-11-10T00:00:00.000',
      cftc_contract_market_code: '123456', contract_market_name: 'NASDAQ', open_interest_all: '1000',
      lev_money_positions_long: '250', lev_money_positions_short: '150'
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const env = makeEnv();
    const response = await worker.fetch(new Request('https://edge.example/api/v1/cot?report=tff'), env, context());
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(new URL(requestedUrl).searchParams.get('$limit'), '156');
    assert.equal(new URL(requestedUrl).searchParams.get('$where'), null);
    assert.equal(payload.filtered, false);
    assert.equal(payload.query_scope, 'latest-provider-observations');
    assert.ok(payload.normalizedRows.length > 0);
    assert.equal(payload.rows[0].contract_market_name, 'NASDAQ');
    assert.equal(payload.rows[0].lev_money_positions_long, '250');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Legacy COT projection excludes unsupported commercial spreading and returns bounded raw rows', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async input => {
    requestedUrls.push(String(input));
    return new Response(JSON.stringify([{
      report_date_as_yyyy_mm_dd: '2026-11-10T00:00:00.000',
      cftc_contract_market_code: '123456',
      contract_market_name: 'NASDAQ E-MINI',
      open_interest_all: '1000',
      comm_positions_long_all: '500',
      comm_positions_short_all: '300',
      noncomm_positions_long_all: '250',
      noncomm_positions_short_all: '450',
      noncomm_postions_spread_all: '15'
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    for (const variant of ['futures-only', 'combined']) {
      const response = await worker.fetch(new Request(`https://edge.example/api/v1/cot?report=legacy&variant=${variant}`), makeEnv(), context());
      assert.equal(response.status, 200);
      const sourceUrl = new URL(requestedUrls.at(-1));
      assert.match(sourceUrl.pathname, variant === 'combined' ? /jun7-fc8e\.json/ : /6dca-aqww\.json/);
      const selected = sourceUrl.searchParams.get('$select');
      assert.ok(selected.includes('comm_positions_long_all'));
      assert.ok(!selected.includes('comm_positions_spread_all'));
      const payload = await response.json();
      assert.equal(payload.rows[0].contract_market_name, 'NASDAQ E-MINI');
      const commercial = payload.normalizedRows.find(row => row.traderCategory === 'Commercial');
      assert.equal(commercial.spread, null);
      assert.equal(commercial.sourceFieldMapping.spread, null);
      assert.equal(commercial.missingReason.spread, 'not provided by the CFTC Legacy schema');
      assert.equal(Object.hasOwn(commercial, 'sourceNativeFields'), false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('COT route rejects unknown report variants and unsafe market filters before provider access', async () => {
  const env = makeEnv();
  const variant = await worker.fetch(new Request('https://edge.example/api/v1/cot?variant=live'), env, context());
  assert.equal(variant.status, 400);
  assert.equal((await variant.json()).error.code, 'unsupported_variant');
  const market = await worker.fetch(new Request('https://edge.example/api/v1/cot?q=ES%27%20OR%201%3D1'), env, context());
  assert.equal(market.status, 400);
  assert.equal((await market.json()).error.code, 'invalid_market_query');
});

test('COT persistence uses server-side Supabase credentials and a variant-aware idempotency key', async () => {
  const originalFetch = globalThis.fetch;
  let upsertUrl = '', upsertHeaders = null, upsertRows = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.includes('publicreporting.cftc.gov/resource/')) {
      return new Response(JSON.stringify([{
        report_date_as_yyyy_mm_dd: '2026-11-10T00:00:00.000',
        cftc_contract_market_code: '123456',
        cftc_market_code: '123',
        contract_market_name: 'NASDAQ E-MINI',
        market_and_exchange_names: 'NASDAQ E-MINI - CHICAGO MERCANTILE EXCHANGE',
        open_interest_all: '1000',
        lev_money_positions_long: '250',
        lev_money_positions_short: '150',
        lev_money_positions_spread: '10'
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    upsertUrl = url;upsertHeaders = init.headers;upsertRows = JSON.parse(init.body);
    return new Response(null, { status: 201 });
  };
  try {
    const env = makeEnv();env.SUPABASE_URL='https://db.example';env.SUPABASE_SECRET_KEY='sb_secret_test_only';
    const response = await worker.fetch(new Request('https://edge.example/api/v1/cot?report=tff&variant=combined&contract_market_code=123456'), env, context());
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.persistence.status, 'fresh');
    assert.equal(payload.persistence.persistedRows, 1);
    assert.match(upsertUrl, /cot_report_observations\?on_conflict=report_family,report_variant,contract_market_code,report_date,trader_category/);
    assert.equal(upsertHeaders.apikey, 'sb_secret_test_only');
    assert.equal(upsertRows[0].report_variant, 'combined');
    assert.equal(upsertRows[0].report_date, '2026-11-10');
    assert.equal(upsertRows[0].published_at, null);
    assert.equal(upsertRows[0].source_fields.cftc_contract_market_code, '123456');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
