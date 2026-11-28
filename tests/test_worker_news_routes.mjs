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
    status: 'fresh', lastCheckedAt: new Date().toISOString(), generatedAt: new Date().toISOString(),
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

test('official BLS events route attributes a cached publisher snapshot and avoids repeat upstream requests', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async input => {
    calls++;
    assert.equal(String(input), 'https://www.bls.gov/schedule/news_release/bls.ics');
    return new Response('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:test\r\nDTSTART;TZID=America/New_York:20261204T083000\r\nSUMMARY:Employment Situation\r\nEND:VEVENT\r\nEND:VCALENDAR', { headers: { 'content-type': 'text/calendar' } });
  };
  try {
    const env = makeEnv();
    const response = await worker.fetch(new Request('https://edge.example/api/v1/events', { headers: { Origin: 'https://app.example' } }), env, context());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
    const payload = await response.json();
    assert.equal(payload.data_type, 'official_economic_release_schedule');
    assert.equal(payload.status, 'fresh');
    assert.equal(payload.event_count, 1);
    assert.equal(payload.events[0].scheduled_at_utc, '2026-12-04T13:30:00.000Z');
    assert.equal(payload.events[0].actual_release_at_utc, null);
    assert.equal(payload.source_url, 'https://www.bls.gov/schedule/news_release/bls.ics');
    await worker.fetch(new Request('https://edge.example/api/v1/events'), env, context());
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('official BLS events route serves a clearly stale snapshot when refresh fails', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('upstream unavailable'); };
  try {
    const cached = { schema_version: 1, data_type: 'official_economic_release_schedule', status: 'fresh', retrieved_at: new Date(Date.now() - 3600000).toISOString(), event_count: 1, events: [{ event_id: 'bls:cached', title: 'Cached BLS item' }] };
    const env = makeEnv({ 'schedule:bls:ics:v1': JSON.stringify(cached) });
    const response = await worker.fetch(new Request('https://edge.example/api/v1/events'), env, context());
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, 'stale');
    assert.match(payload.last_error, /last successful/);
    assert.equal(payload.events[0].event_id, 'bls:cached');
    assert.ok(payload.retry_at);
    const backedOff = await worker.fetch(new Request('https://edge.example/api/v1/events'), env, context());
    assert.equal((await backedOff.json()).status, 'stale');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('calendar upstream failures without a cached snapshot are reported unavailable and rate-limited by KV backoff', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('provider unavailable'); };
  try {
    const env = makeEnv();
    const first = await worker.fetch(new Request('https://edge.example/api/v1/events'), env, context());
    assert.equal(first.status, 502);
    const failure = await first.json();
    assert.equal(failure.status, 'unavailable');
    assert.ok(failure.retry_at);
    const second = await worker.fetch(new Request('https://edge.example/api/v1/events'), env, context());
    assert.equal(second.status, 502);
    assert.equal(calls, 1);
    assert.ok(Number(second.headers.get('Retry-After')) > 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('official EIA events route serves source-labelled petroleum release times and caches the page parse', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async input => {
    calls++;
    assert.equal(String(input), 'https://www.eia.gov/petroleum/supply/weekly/schedule.php');
    return new Response('<html><h1>Weekly Petroleum Status Report Schedule</h1><p>The standard release time and day of the week will be at 10:30 a.m. eastern time on Wednesday with the following exceptions. All times are eastern.</p><table><tr><th>Data week ending</th><th>Alternate date</th><th>Release day</th><th>Release time</th><th>Holiday</th></tr><tr><td>January 16, 2026</td><td>January 22, 2026</td><td>Thursday</td><td>12:00 p.m.</td><td>Martin Luther King Jr. Day</td></tr></table></html>', { headers: { 'content-type': 'text/html', 'last-modified': 'Wed, 18 Nov 2026 12:00:00 GMT' } });
  };
  try {
    const env = makeEnv();
    const response = await worker.fetch(new Request('https://edge.example/api/v1/events/eia', { headers: { Origin: 'https://app.example' } }), env, context());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
    const payload = await response.json();
    assert.equal(payload.data_type, 'official_economic_release_schedule');
    assert.equal(payload.status, 'fresh');
    assert.equal(payload.publisher, 'U.S. Energy Information Administration');
    assert.equal(payload.source_url, 'https://www.eia.gov/petroleum/supply/weekly/schedule.php');
    assert.ok(payload.events.length > 0);
    assert.ok(payload.events.every(event => event.affected_instruments.includes('CL') && event.forecast_value === null));
    await worker.fetch(new Request('https://edge.example/api/v1/events/eia'), env, context());
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('provider registry exposes publisher calendar freshness separately from data providers', async () => {
  const retrievedAt = new Date().toISOString();
  const env = makeEnv({
    'schedule:bls:ics:v1': JSON.stringify({ status: 'fresh', event_count: 12, retrieved_at: retrievedAt }),
    'schedule:eia:wpsr:v1': JSON.stringify({ status: 'fresh', event_count: 8, retrieved_at: retrievedAt }),
    'schedule:cftc:cot:v1': JSON.stringify({ status: 'fresh', event_count: 4, retrieved_at: retrievedAt }),
    'schedule:fed:fomc:v1': JSON.stringify({ status: 'fresh', event_count: 2, retrieved_at: retrievedAt }),
    'schedule:ecb:council:v1': JSON.stringify({ status: 'fresh', event_count: 3, retrieved_at: retrievedAt }),
    'schedule:boe:mpc:v1': JSON.stringify({ status: 'fresh', event_count: 8, retrieved_at: retrievedAt }),
    'schedule:boc:policy-rate:v1': JSON.stringify({ status: 'fresh', event_count: 8, retrieved_at: retrievedAt }),
    'schedule:rba:monetary-policy-board:v1': JSON.stringify({ status: 'fresh', event_count: 8, retrieved_at: retrievedAt }),
    'schedule:bea:release-dates:v1': JSON.stringify({ status: 'fresh', event_count: 15, retrieved_at: retrievedAt, source_revision: '2026-10-22T12:48:27.656675' })
  });
  const response = await worker.fetch(new Request('https://edge.example/api/v1/providers'), env, context());
  const providers = (await response.json()).providers;
  const calendar = providers.find(provider => provider.id === 'bls-calendar');
  const eiaSchedule = providers.find(provider => provider.id === 'eia-wpsr-schedule');
  const cftcSchedule = providers.find(provider => provider.id === 'cftc-cot-schedule');
  const fomcCalendar = providers.find(provider => provider.id === 'fomc-calendar');
  const ecbCalendar = providers.find(provider => provider.id === 'ecb-council-calendar');
  const boeCalendar = providers.find(provider => provider.id === 'boe-mpc-calendar');
  const bocCalendar = providers.find(provider => provider.id === 'boc-rate-calendar');
  const rbaCalendar = providers.find(provider => provider.id === 'rba-monetary-policy-calendar');
  const beaCalendar = providers.find(provider => provider.id === 'bea-release-calendar');
  assert.equal(calendar.state.status, 'fresh');
  assert.equal(calendar.state.eventCount, 12);
  assert.equal(calendar.state.retrievedAt, retrievedAt);
  assert.match(calendar.notes, /not a complete macro calendar/);
  assert.equal(eiaSchedule.state.eventCount, 8);
  assert.match(eiaSchedule.notes, /holiday exceptions/);
  assert.equal(cftcSchedule.state.eventCount, 4);
  assert.match(cftcSchedule.notes, /semiweekly cadence change/);
  assert.equal(fomcCalendar.state.eventCount, 2);
  assert.match(fomcCalendar.notes, /no release time/);
  assert.equal(ecbCalendar.state.eventCount, 3);
  assert.match(ecbCalendar.notes, /no release time/);
  assert.equal(boeCalendar.state.eventCount, 8);
  assert.equal(bocCalendar.state.eventCount, 8);
  assert.equal(rbaCalendar.state.eventCount, 8);
  assert.match(rbaCalendar.notes, /no decision release time/);
  assert.equal(beaCalendar.state.eventCount, 15);
  assert.equal(beaCalendar.state.sourceRevision, '2026-10-22T12:48:27.656675');
  assert.match(beaCalendar.notes, /machine-readable publisher feed/);

  const unconfigured = makeEnv({ __env: { SNAPSHOTS: null } });
  const unavailableResponse = await worker.fetch(new Request('https://edge.example/api/v1/providers'), unconfigured, context());
  const unavailableProviders = (await unavailableResponse.json()).providers;
  for (const id of ['bls-calendar', 'eia-wpsr-schedule', 'cftc-cot-schedule', 'fomc-calendar', 'ecb-council-calendar', 'boe-mpc-calendar', 'boc-rate-calendar', 'rba-monetary-policy-calendar', 'bea-release-calendar']) {
    assert.equal(unavailableProviders.find(provider => provider.id === id).state.status, 'not-configured');
  }
});

test('official CFTC and Federal Reserve schedule routes fetch and cache separate publisher snapshots', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-19T12:00:00.000Z') });
  const originalFetch = globalThis.fetch;
  const urls = [];
  const cftc = '<html><h1>Release Schedule</h1><p>The Commitments of Traders reports are released at 3:30 p.m. Eastern time. The following is a tentative schedule of releases through 2026.</p><h2>2026 Release Schedule</h2><table><tr><th>Month</th><th>Dates</th></tr><tr><td>November</td><td>20</td><td>30*</td></tr><tr><td>December</td><td>04</td><td>11</td></tr></table><p>*Delayed release date due to a federal holiday.</p></html>';
  const fomc = '<html><h1>Federal Open Market Committee</h1><p>Meeting calendars, statements, and minutes.</p><h3>2026 FOMC Meetings</h3><h4>December</h4><p>8-9*</p><h3>2027 FOMC Meetings</h3><h4>January</h4><p>26-27</p><p>Last Update: November 18, 2026</p></html>';
  globalThis.fetch = async input => {
    const url = String(input); urls.push(url);
    if (url === 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm') return new Response(cftc, { headers: { 'content-type': 'text/html' } });
    if (url === 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm') return new Response(fomc, { headers: { 'content-type': 'text/html' } });
    throw new Error('unexpected publisher endpoint');
  };
  try {
    const env = makeEnv();
    const cftcResponse = await worker.fetch(new Request('https://edge.example/api/v1/events/cftc', { headers: { Origin: 'https://app.example' } }), env, context());
    assert.equal(cftcResponse.status, 200);
    assert.equal(cftcResponse.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
    const cftcPayload = await cftcResponse.json();
    assert.equal(cftcPayload.publisher_id, 'CFTC');
    assert.equal(cftcPayload.event_count, 4);
    assert.equal(cftcPayload.events[0].event_type, 'CFTC_COT_PUBLICATION');
    await worker.fetch(new Request('https://edge.example/api/v1/events/cftc'), env, context());
    assert.equal(urls.filter(url => url.includes('cftc.gov')).length, 1);

    const fomcResponse = await worker.fetch(new Request('https://edge.example/api/v1/events/fomc'), env, context());
    assert.equal(fomcResponse.status, 200);
    const fomcPayload = await fomcResponse.json();
    assert.equal(fomcPayload.publisher_id, 'FED');
    assert.equal(fomcPayload.events[0].date_only, true);
    assert.equal(fomcPayload.events[0].scheduled_at_utc, null);
    await worker.fetch(new Request('https://edge.example/api/v1/events/fomc'), env, context());
    assert.equal(urls.filter(url => url.includes('federalreserve.gov')).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    t.mock.timers.reset();
  }
});

test('central-bank calendar routes are independently source-labelled, cached, and policy-gated', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  const sources = new Map([
    ['https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html', '<html><h1>Schedules for the meetings of the Governing Council and General Council of the ECB and related press conferences</h1><p>16/12/2026</p><p>Governing Council of the ECB: monetary policy meeting in Frankfurt (Day 1)</p></html>'],
    ['https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates', '<html><h1>Monetary Policy Committee dates for 2026 and 2027</h1><h2>2026 confirmed dates</h2><p>Thursday 17 December | December MPC Summary and minutes</p><p>This page was last updated 21 September 2026</p></html>'],
    ['https://www.bankofengland.co.uk/monetary-policy', "<html><p>We publish the MPC's decision with the minutes of the meetings at 12 noon on the day of the announcement, which is usually a Thursday.</p></html>"],
    ['https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/', '<html><h1>Policy interest rate</h1><h2>Schedule for 2026</h2><p>December 9 Interest rate announcement</p></html>'],
    ['https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/blackout-guidelines/', '<html><p>The key policy rate decision is published on a Wednesday at 9:45 Eastern Time.</p></html>'],
    ['https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', '<html><h1>Board Meeting Schedules</h1><p>The meeting schedules for the Monetary Policy Board and Payments System Board are below.</p><h2>Board meeting schedules 2026</h2><table><tr><td>December</td><td>7&ndash;8 December</td><td></td></tr></table></html>']
  ]);
  globalThis.fetch = async input => {
    const url = String(input); requested.push(url);
    if (!sources.has(url)) throw new Error(`unexpected upstream ${url}`);
    return new Response(sources.get(url), { headers: { 'content-type': 'text/html', 'last-modified': 'Wed, 18 Nov 2026 12:00:00 GMT' } });
  };
  try {
    const env = makeEnv();
    const expected = [
      ['/api/v1/events/ecb', 'ECB', true], ['/api/v1/events/boe', 'BOE', false],
      ['/api/v1/events/boc', 'BOC', false], ['/api/v1/events/rba', 'RBA', true]
    ];
    for (const [path, publisherId, dateOnly] of expected) {
      const response = await worker.fetch(new Request(`https://edge.example${path}`), env, context());
      assert.equal(response.status, 200, path);
      const payload = await response.json();
      assert.equal(payload.publisher_id, publisherId);
      assert.ok(payload.events.length, `${path} returned no future meetings: ${payload.error || payload.last_error || payload.status}`);
      assert.equal(payload.event_count, payload.events.length);
      assert.equal(payload.events[0].date_only, dateOnly);
      assert.equal(payload.events[0].source_url.startsWith('https://'), true);
      await worker.fetch(new Request(`https://edge.example${path}`), env, context());
    }
    assert.equal(requested.length, 6);
    const unconfigured = await worker.fetch(new Request('https://edge.example/api/v1/events/ecb'), makeEnv({ __env: { SNAPSHOTS: null } }), context());
    assert.equal(unconfigured.status, 503);
    assert.equal((await unconfigured.json()).status, 'not-configured');
  } finally { globalThis.fetch = originalFetch; }
});

test('BEA calendar route fetches and caches the official JSON release schedule', async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async input => {
    requested.push(String(input));
    if (String(input) !== 'https://apps.bea.gov/API/signup/release_dates.json') throw new Error('unexpected BEA source');
    return new Response(JSON.stringify({
      'Gross Domestic Product': { release_dates: ['2027-01-28T13:30:00+00:00'] },
      file_last_updated: '2026-10-22T12:48:27.656675'
    }), { headers: { 'content-type': 'application/json' } });
  };
  try {
    const env = makeEnv();
    const response = await worker.fetch(new Request('https://edge.example/api/v1/events/bea', { headers: { Origin: 'https://app.example' } }), env, context());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
    const payload = await response.json();
    assert.equal(payload.publisher_id, 'BEA');
    assert.equal(payload.source_feed_url, 'https://apps.bea.gov/API/signup/release_dates.json');
    assert.equal(payload.source_revision, '2026-10-22T12:48:27.656675');
    assert.equal(payload.event_count, 1);
    assert.equal(payload.events[0].scheduled_at_utc, '2027-01-28T13:30:00.000Z');
    await worker.fetch(new Request('https://edge.example/api/v1/events/bea'), env, context());
    assert.equal(requested.length, 1);

    const unconfigured = await worker.fetch(new Request('https://edge.example/api/v1/events/bea'), makeEnv({ __env: { SNAPSHOTS: null } }), context());
    assert.equal(unconfigured.status, 503);
    assert.equal((await unconfigured.json()).status, 'not-configured');
  } finally { globalThis.fetch = originalFetch; }
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

test('manual discovery refresh observes persisted Retry-After', async () => {
  const retryAt = new Date(Date.now() + 3600000).toISOString();
  const key = 'snapshot:gdelt:news:v1';
  const env = makeEnv({ [key]: { status: 'stale', retryAt, articles: [] } });
  const response = await worker.fetch(new Request('https://edge.example/api/v1/news?refresh=1'), env, {
    waitUntil() { assert.fail('A paused provider must not queue work'); }
  });
  const payload = await response.json();
  assert.equal(payload.refresh.status, 'cooldown');
  assert.equal(payload.refresh.retryAt, retryAt);
  assert.ok(Number(response.headers.get('Retry-After')) > 0);
});

test('discovery cache ages from last success rather than the last failed check', async () => {
  const key = 'snapshot:gdelt:news:v1';
  for (const [hours, expected] of [[2, 'stale'], [73, 'unavailable']]) {
    const env = makeEnv({ [key]: {
      status: 'fresh', lastCheckedAt: new Date().toISOString(),
      generatedAt: new Date(Date.now() - hours * 3600000).toISOString(), articles: []
    } });
    const response = await worker.fetch(new Request('https://edge.example/api/v1/news'), env, {});
    assert.equal((await response.json()).status, expected);
  }
});

test('open interest returns structured 502 without a snapshot for either CFTC filter', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => { throw new Error('CFTC offline'); });
  for (const [filter, query, code] of [
    ['q=NASDAQ', 'NASDAQ', null],
    ['contract_market_code=123456', null, '123456'],
  ]) {
    const request = new Request('https://edge.example/api/v1/volume-open-interest?report=tff&variant=combined&' + filter, {
      headers: { Origin: 'https://app.example' }
    });
    const response = await worker.fetch(request, makeEnv(), context());
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
    const payload = await response.json();
    assert.equal(payload.data_type, 'cftc_weekly_open_interest');
    assert.equal(payload.status, 'unavailable');
    assert.equal(payload.report_family, 'tff');
    assert.equal(payload.report_variant, 'combined');
    assert.equal(payload.query, query);
    assert.equal(payload.contractMarketCode, code);
    assert.deepEqual(payload.observations, []);
    assert.equal(payload.error, 'CFTC open-interest request failed');
  }
  assert.equal(upstream.mock.callCount(), 2);
});

test('open interest preserves stale observations when the CFTC refresh fails', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => { throw new Error('CFTC offline'); });
  const observations = [{ reportDate: '2026-11-17', openInterest: 1000, contractMarketCode: '123456' }];
  const snapshot = {
    status: 'fresh', report: 'tff', variant: 'futures-only', contractMarketCode: '123456',
    retrievedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(), observations
  };
  const env = makeEnv({ 'voi:tff:futures-only:v2:123456': JSON.stringify(snapshot) });
  const request = new Request('https://edge.example/api/v1/volume-open-interest?contract_market_code=123456');
  const response = await worker.fetch(request, env, context());
  assert.equal(upstream.mock.callCount(), 1);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, 'stale');
  assert.deepEqual(payload.observations, observations);
  assert.match(payload.lastError, /showing last successful open-interest snapshot/);
});
