import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync(new URL('../assets/provider-presentation.js', import.meta.url), 'utf8'), { window });
const { healthState } = window.FinanceProviderPresentation;

test('provider health keeps snapshot freshness and attempt outcome independent', () => {
  const lastSuccessAt = '2026-11-24T00:00:00Z';
  const lastAttemptAt = '2026-11-26T00:00:00Z';
  const expired = healthState({ status: 'fresh', lastSuccessAt, lastAttemptAt }, {
    ttlSeconds: 3600, now: Date.parse(lastAttemptAt)
  });
  assert.equal(expired.status, 'stale');
  assert.equal(expired.outcome, 'Succeeded');
  const stale = healthState({ status: 'stale', lastAttemptAt, lastSuccessAt, lastError: 'internal detail' });
  assert.equal(stale.successAt, lastSuccessAt);
  assert.equal(stale.outcome, 'Request failed');
  assert.equal(stale.freshness, 'stale');
  assert.equal(healthState({ status: 'fresh', eventCount: 0 }).freshness, 'empty');
  assert.equal(healthState({ status: 'fresh', eventCount: 1 }).freshness, 'fresh');
});
test('public access, blocked status and configuration do not imply a successful snapshot', () => {
  const onDemand = healthState({ status: 'available-on-demand' });
  assert.equal(onDemand.successAt, null);
  assert.equal(onDemand.freshness, 'unknown');
  assert.equal(onDemand.attemptAt, null);
  const blocked = healthState({ status: 'not-configured' }, { decision: 'entitlement-missing' });
  assert.equal(blocked.authorization, 'Public display entitlement missing');
  assert.equal(blocked.configuration, 'Not configured');
  assert.equal(healthState({ status: 'rate-limited' }).status, 'limited');
  assert.equal(healthState({ status: 'blocked' }).status, 'blocked');
  assert.equal(healthState({ status: 'unauthorized' }).status, 'denied');
  assert.equal(healthState({ status: 'unexpected payload' }).status, 'unknown');
});
