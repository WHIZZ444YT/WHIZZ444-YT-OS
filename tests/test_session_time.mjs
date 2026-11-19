import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const time = require('../assets/session-time.js');

test('spring DST gap is reported instead of silently assigned an offset', () => {
  const value = time.resolveWallTime('2026-03-08', '02:30', 'America/New_York');
  assert.equal(value.status, 'nonexistent');
  assert.equal(value.epochMs, null);
});

test('fall DST fold exposes both instants and requires a disambiguation choice', () => {
  const rejected = time.resolveWallTime('2026-11-01', '01:30', 'America/New_York');
  const earlier = time.resolveWallTime('2026-11-01', '01:30', 'America/New_York', 'earlier');
  const later = time.resolveWallTime('2026-11-01', '01:30', 'America/New_York', 'later');
  assert.equal(rejected.status, 'ambiguous');
  assert.equal(rejected.epochMs, null);
  assert.equal(earlier.epochMs, Date.parse('2026-11-01T05:30:00Z'));
  assert.equal(later.epochMs, Date.parse('2026-11-01T06:30:00Z'));
  assert.equal(later.epochMs - earlier.epochMs, 60 * 60 * 1000);
});

test('New York and London DST transition weeks convert independently', () => {
  const beforeLondonShift = time.resolveWallTime('2026-03-16', '08:30', 'America/New_York');
  const afterLondonShift = time.resolveWallTime('2026-03-30', '08:30', 'America/New_York');
  assert.equal(new Date(beforeLondonShift.epochMs).toISOString(), '2026-03-16T12:30:00.000Z');
  assert.equal(time.formatInZone(beforeLondonShift.epochMs, 'Europe/London', 'en-GB'), '12:30');
  assert.equal(time.formatInZone(afterLondonShift.epochMs, 'Europe/London', 'en-GB'), '13:30');
  assert.equal(time.formatInZone(afterLondonShift.epochMs, 'Asia/Kolkata', 'en-IN'), '18:00');
});

test('date addition rolls across month and year boundaries without local machine timezone', () => {
  assert.equal(time.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(time.addDays('2026-03-08', -1), '2026-03-07');
});

test('invalid IANA zones and wall-clock values are rejected', () => {
  assert.throws(() => time.resolveWallTime('2026-02-30', '08:30', 'America/New_York'), RangeError);
  assert.throws(() => time.resolveWallTime('2026-03-01', '24:00', 'America/New_York'), RangeError);
  assert.throws(() => time.resolveWallTime('2026-03-01', '08:30', 'Not/A_Zone'), RangeError);
});
