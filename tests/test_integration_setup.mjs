import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import worker from '../cloudflare/src/index.js';

const url = 'https://edge.example/api/v1/providers?view=setup';

test('setup status projects only fixed IDs and states', async () => {
  const env = {
    EIA_API_KEY: 'private-fixture-key',
    FRED_API_KEY: 'private-fred-key',
    SNAPSHOTS: {
      async get(key) {
        assert.equal(key, 'economic-provider:eia');
        return { status: 'unavailable', credentialStatus: 'rejected', lastError: 'private provider response' };
      }
    }
  };
  const response = await worker.fetch(new Request(url), env, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {
    schemaVersion: 1,
    providers: [
      { id: 'bls', status: 'anonymous' }, { id: 'bea', status: 'missing' },
      { id: 'eia', status: 'rejected' }, { id: 'fred', status: 'reference-only' }
    ]
  });
});

test('setup status is read-only and uses a fixed fallback for private failures', async () => {
  const env = { BEA_API_KEY: 'private-key', SNAPSHOTS: { async get() { throw Error('private failure'); } } };
  const response = await worker.fetch(new Request(url), env, {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
  const mutation = await worker.fetch(new Request(url, { method: 'POST' }), env, {});
  assert.equal(mutation.status, 405);
});

test('browser shows only fixed messages and skips requests without a gateway', async () => {
  const script = readFileSync(new URL('../assets/integration-setup.js', import.meta.url), 'utf8');
  for (const apiBase of ['', 'https://edge.example']) {
    const cell = {};
    const row = { dataset: { setupProvider: 'eia' }, querySelector: () => cell };
    let calls = 0;
    const message = vm.runInNewContext(script, {
      window: { FINANCE_OS_CONFIG: { apiBase } },
      document: { querySelectorAll: () => [row] },
      AbortSignal,
      fetch: async (target, options) => {
        calls++;
        assert.equal(target, url);
        assert.equal(options.method, undefined);
        return { ok: true, json: async () => ({ providers: [{ id: 'eia', status: 'private raw message' }] }) };
      }
    });
    await message;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, apiBase ? 1 : 0);
    assert.equal(cell.textContent, apiBase
      ? 'Gateway credential status unavailable.'
      : 'API gateway is not configured for this environment.');
  }
});
