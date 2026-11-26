import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchScheduled, eligibleEconomicJob, runProviderJobs } from '../cloudflare/src/provider-schedule.mjs';

test('duplicate deliveries are suppressed within an isolate even if KV reads lag', async () => {
  const now = Date.parse('2026-11-26T10:00:00Z');
  let writes = 0;
  let attempts = 0;
  const kv = { async get() { return null; }, async put() { writes++; } };
  const options = { sleep: async () => {}, random: () => 0 };
  const run = () => dispatchScheduled(kv, now, async () => { attempts++; }, options);
  await Promise.all([run(), run()]);
  await run();
  assert.equal(writes, 1);
  assert.equal(attempts, 1);
  await dispatchScheduled({ ...kv, async get() { return 'started'; } },
    now + 1800000, async () => { attempts++; }, options);
  assert.equal(attempts, 1);
});

test('worker runs at most two provider jobs at once', async () => {
  let active = 0;
  let peak = 0;
  let finished = 0;
  await runProviderJobs(Array.from({ length: 5 }, (_, index) => ({ id: String(index), async run() {
    peak = Math.max(peak, ++active);
    await Promise.resolve();
    active--;
    finished++;
  } })));
  assert.equal(peak, 2);
  assert.equal(finished, 5);
});

test('due decisions respect freshness, failed attempt budgets and Retry-After', () => {
  const now = Date.parse('2026-11-26T10:00:00Z');
  const iso = offset => new Date(now + offset).toISOString();
  assert.equal(eligibleEconomicJob({ retrievedAt: iso(-1000) }, null, 3600, now), false);
  assert.equal(eligibleEconomicJob(null, { lastAttemptAt: iso(-1000) }, 3600, now), false);
  assert.equal(eligibleEconomicJob(null, { retryAt: iso(1000) }, 3600, now), false);
  assert.equal(eligibleEconomicJob(null, { circuitOpenUntil: iso(1000) }, 3600, now), false);
  assert.equal(eligibleEconomicJob({ retrievedAt: iso(-3600000) }, null, 3600, now), true);
});
