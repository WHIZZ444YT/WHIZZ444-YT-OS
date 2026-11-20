import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkerSmoke } from '../scripts/smoke_worker.mjs';

const expectedGetPaths = [
  '/health', '/api/v1/providers', '/api/v1/market-data/status',
  '/api/v1/events', '/api/v1/events/eia', '/api/v1/events/cftc', '/api/v1/events/fomc',
];

function fakeFetch({ version = '2.1.0', storageConfigured = true, origins = true, calendarStatus = 'fresh', failPath = null, badEventCount = false } = {}) {
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ path: url.pathname, method: init.method || 'GET' });
    const headers = new Headers();
    if (init.method === 'OPTIONS') {
      const origin = new Headers(init.headers).get('origin');
      if (origins && origin === 'https://finance-intelligence-os-whizz444yt-7353.vercel.app') {
        headers.set('access-control-allow-origin', origin);
      }
      return new Response(null, { status: 204, headers });
    }
    if (url.pathname === failPath) return new Response('upstream unavailable', { status: 503 });
    let body;
    if (url.pathname === '/health') {
      body = { ok: true, service: 'finance-intelligence-os-edge', version, storageConfigured };
    } else if (url.pathname === '/api/v1/providers') {
      body = { providers: [
        { id: 'bls-calendar' }, { id: 'eia-wpsr-schedule' },
        { id: 'cftc-cot-schedule' }, { id: 'fomc-calendar' },
      ] };
    } else if (url.pathname === '/api/v1/market-data/status') {
      body = { data_type: 'exchange_market_data_status', status: 'not-configured', source_provider: null, limitations: ['No license'] };
    } else {
      body = {
        schema_version: 1,
        data_type: 'official_economic_release_schedule',
        status: calendarStatus,
        source_url: 'https://publisher.example/schedule',
        retrieved_at: calendarStatus === 'unavailable' ? null : '2026-11-20T12:00:00.000Z',
        event_count: badEventCount ? 2 : calendarStatus === 'unavailable' ? 0 : 1,
        events: calendarStatus === 'unavailable' ? [] : [{ title: 'Publisher-listed schedule item' }],
        ...(calendarStatus === 'unavailable' ? { error: 'Unavailable' } : {}),
      };
    }
    const status = body.status === 'unavailable' ? 502 : body.status === 'not-configured' ? 503 : 200;
    return Response.json(body, { status: url.pathname.startsWith('/api/v1/events') ? status : 200 });
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

test('live Worker smoke accepts current routes and explicitly reports unlicensed data as degraded', async () => {
  const fetchImpl = fakeFetch();
  const report = await runWorkerSmoke({
    baseUrl: 'https://worker.example',
    fetchImpl,
  });
  assert.equal(report.ok, true);
  assert.equal(report.degraded, true);
  assert.equal(report.results.length, 9);
  assert.ok(report.results.some((result) => result.name === '/api/v1/market-data/status' && result.degraded));
  assert.deepEqual(fetchImpl.calls.filter((call) => call.method === 'GET').map((call) => call.path), expectedGetPaths);
  assert.equal(fetchImpl.calls.filter((call) => call.method === 'OPTIONS').length, 2);
});

test('live Worker smoke accepts a safe unavailable schedule response but marks the source degraded', async () => {
  const report = await runWorkerSmoke({
    baseUrl: 'https://worker.example',
    fetchImpl: fakeFetch({ calendarStatus: 'unavailable' }),
  });
  assert.equal(report.ok, true);
  assert.equal(report.degraded, true);
  assert.ok(report.results.filter((result) => result.name.startsWith('/api/v1/events')).every((result) => result.ok && result.degraded));
});

test('live Worker smoke accepts a clearly labelled cached stale schedule and reports it as degraded', async () => {
  const report = await runWorkerSmoke({
    baseUrl: 'https://worker.example',
    fetchImpl: fakeFetch({ calendarStatus: 'stale' }),
  });
  assert.equal(report.ok, true);
  assert.equal(report.degraded, true);
  assert.ok(report.results.filter((result) => result.name.startsWith('/api/v1/events')).every((result) => result.ok && result.degraded && result.note.startsWith('stale;')));
});

test('live Worker smoke rejects an old deployed version', async () => {
  const report = await runWorkerSmoke({
    baseUrl: 'https://worker.example',
    fetchImpl: fakeFetch({ version: '2.0.0' }),
  });
  assert.equal(report.ok, false);
  assert.match(report.failures.join(' '), /2\.1\.0/);
});

test('live Worker smoke rejects missing KV instead of treating unconfigured routes as ready', async () => {
  const report = await runWorkerSmoke({
    baseUrl: 'https://worker.example',
    fetchImpl: fakeFetch({ storageConfigured: false, calendarStatus: 'not-configured' }),
  });
  assert.equal(report.ok, false);
  assert.match(report.failures.join(' '), /configured KV/);
});

test('live Worker smoke rejects mismatched event counts and unexpected CORS origins', async () => {
  const report = await runWorkerSmoke({
    baseUrl: 'https://worker.example',
    fetchImpl: fakeFetch({ badEventCount: true, origins: false }),
  });
  assert.equal(report.ok, false);
  assert.match(report.failures.join(' '), /CORS allow-listed frontend/);
  assert.match(report.failures.join(' '), /invalid schedule response/);
});

test('live Worker smoke accepts HTTP only for a local Worker development server', async () => {
  await assert.rejects(
    runWorkerSmoke({ baseUrl: 'http://worker.example', fetchImpl: fakeFetch() }),
    /valid HTTPS Worker base URL|base URL only/,
  );
  const report = await runWorkerSmoke({
    baseUrl: 'http://localhost:8787',
    fetchImpl: fakeFetch(),
  });
  assert.equal(report.ok, true);
});
