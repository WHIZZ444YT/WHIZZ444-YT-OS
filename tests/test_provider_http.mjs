import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonWithRetry, nextProviderCircuitState, providerCircuitIsOpen } from '../cloudflare/src/provider-http.mjs';

test('transient server errors retry with bounded exponential delay', async () => {
  let calls = 0, waited = 0;
  const result = await fetchJsonWithRetry('https://provider.example/data', 'Example', {
    retries: 1, random: () => 0, sleep: async ms => { waited += ms; },
    fetchImpl: async () => ++calls === 1 ? new Response('{"error":"busy"}', { status: 503 }) : new Response('{"ok":true}')
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  assert.equal(waited, 250);
});

test('429 honors Retry-After when within the configured wait budget', async () => {
  let calls = 0, waited = 0;
  const result = await fetchJsonWithRetry('https://provider.example/data', 'Example', {
    retries: 1, maxDelayMs: 1800, now: () => 0, sleep: async ms => { waited = ms; },
    fetchImpl: async () => ++calls === 1
      ? new Response('{"error":"slow down"}', { status: 429, headers: { 'Retry-After': '0.75' } })
      : new Response('{"ok":true}')
  });
  assert.equal(result.ok, true);
  assert.equal(waited, 750);
});

test('429 is not retried early when Retry-After exceeds the Worker wait budget', async () => {
  let calls = 0;
  await assert.rejects(fetchJsonWithRetry('https://provider.example/data', 'Example', {
    retries: 2, maxDelayMs: 1000,
    fetchImpl: async () => { calls++; return new Response('{"error":"slow down"}', { status: 429, headers: { 'Retry-After': '30' } }); }
  }), error => error.retryAfterMs === 30000);
  assert.equal(calls, 1);
});

test('client errors and malformed JSON are not retried', async () => {
  let calls = 0;
  await assert.rejects(fetchJsonWithRetry('https://provider.example/data', 'Example', {
    retries: 2, fetchImpl: async () => { calls++; return new Response('{"error":"bad key"}', { status: 401 }); }
  }), /request failed/);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(fetchJsonWithRetry('https://provider.example/data', 'Example', {
    retries: 2, fetchImpl: async () => { calls++; return new Response('not-json', { status: 502 }); }
  }), /non-JSON/);
  assert.equal(calls, 1);
});

test('temporary network failures retry once and pass a bounded timeout signal', async () => {
  let calls = 0;
  const result = await fetchJsonWithRetry('https://provider.example/data', 'Example', {
    retries: 1, random: () => 0, sleep: async () => {},
    fetchImpl: async (_url, options) => { calls++; assert.ok(options.signal); if (calls === 1) throw new Error('network reset'); return new Response('{"ok":true}'); }
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('provider circuit opens after repeated failures and resets after success', () => {
  const first = nextProviderCircuitState({}, 'failure', 1000);
  const second = nextProviderCircuitState(first, 'failure', 2000);
  const third = nextProviderCircuitState(second, 'failure', 3000);
  assert.equal(third.consecutiveFailures, 3);
  assert.equal(third.circuitOpenUntil, new Date(603000).toISOString());
  assert.equal(providerCircuitIsOpen(third, 602999), true);
  assert.equal(providerCircuitIsOpen(third, 603000), false);
  assert.deepEqual(nextProviderCircuitState(third, 'success', 700000), { consecutiveFailures: 0, circuitOpenUntil: null });
});

test('provider JSON reader caps streamed bodies', async () => {
  await assert.rejects(fetchJsonWithRetry('https://provider.example/data', 'Example', {
    maxResponseBytes: 4,
    fetchImpl: async (_url, options) => {
      assert.equal(options.redirect, 'error');
      return new Response('{"value":"oversized"}');
    }
  }), /exceeds the size limit/);
});
