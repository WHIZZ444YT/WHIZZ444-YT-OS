import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFuturesObservationBatch, validateFuturesObservationQuery } from "../cloudflare/src/futures-observations.mjs";

const bar = {
  venue: "CME", instrumentRoot: "NQ", contractMonth: "202612", exchangeInstrumentId: "NQZ6",
  observationType: "bar", interval: "1m", observedAt: "2026-11-20T14:30:00-05:00",
  dataAsOf: "2026-11-20T14:31:00-05:00", sourceRecordId: "NQZ6-20261120T143000-1m",
  sourceUrl: "https://data.example/records/1", delayClass: "delayed",
  open: 25000, high: 25002, low: 24999.5, close: 25001, volume: 123, volumeUnit: "contracts"
};

test("normalizes a source-labelled bar without accepting rights approval from observation input", () => {
  const result = normalizeFuturesObservationBatch({
    providerId: "vendor-x", observations: [{ ...bar, redistributionStatus: "public-display-approved", publicDisplayApprovedBy: "untrusted-input" }]
  }, new Date("2026-11-20T20:00:00Z"));
  assert.equal(result.providerId, "vendor-x");
  assert.equal(result.records[0].instrument_root, "NQ");
  assert.equal(result.records[0].observed_at, "2026-11-20T19:30:00.000Z");
  assert.equal(result.records[0].retrieved_at, "2026-11-20T20:00:00.000Z");
  assert.equal(result.records[0].quality_status, "provider-reported");
  assert.equal("redistribution_status" in result.records[0], false);
  assert.equal("public_display_approved_by" in result.records[0], false);
  assert.equal("display_rights_reference" in result.records[0], false);
});

test("normalizes daily volume and publisher open interest with distinct units", () => {
  const result = normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [
    { ...bar, observationType: "daily_volume", interval: "1d", observedAt: "2026-11-20T00:00:00Z", volume: 1000, volumeUnit: "contracts" },
    { ...bar, observationType: "open_interest", interval: "publication", observedAt: "2026-11-20T12:00:00Z", openInterest: 900000 }
  ] });
  assert.equal(result.records[0].volume, 1000);
  assert.equal(result.records[0].open_interest, null);
  assert.equal(result.records[1].volume, null);
  assert.equal(result.records[1].open_interest, 900000);
});

test("rejects invalid entitlement-independent source rows instead of guessing values", () => {
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, sourceUrl: "http://data.example/1" }] }), /HTTPS URL/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, contractMonth: "202613" }] }), /YYYYMM/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, high: 24999 }] }), /inconsistent OHLC/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, volume: -1 }] }), /greater than or equal to zero/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, observedAt: "2026-11-20T14:30:00" }] }), /explicit timezone/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, observedAt: "2026-02-31T14:30:00Z" }] }), /valid calendar timestamp/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [{ ...bar, observedAt: "2026-11-20T14:30:00+15:00" }] }), /valid calendar timestamp/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [] }), /between 1 and 500/);
  assert.throws(() => normalizeFuturesObservationBatch({ providerId: "vendor-x", observations: [bar, bar] }), /duplicates another observation/);
});

test("validates bounded query filters and rejects broad or malformed queries", () => {
  const good = validateFuturesObservationQuery(new URLSearchParams("root=6e&contractMonth=202612&type=open_interest&interval=publication&limit=100"));
  assert.equal(good.ok, true);
  assert.equal(good.query.root, "6E");
  assert.equal(good.query.limit, 100);
  assert.equal(validateFuturesObservationQuery(new URLSearchParams()).ok, false);
  assert.equal(validateFuturesObservationQuery(new URLSearchParams("root=NQ&contractMonth=202600")).ok, false);
  assert.equal(validateFuturesObservationQuery(new URLSearchParams("root=NQ&from=2026-12-02&to=2026-11-01")).ok, false);
  assert.equal(validateFuturesObservationQuery(new URLSearchParams("root=NQ&limit=501")).ok, false);
});
