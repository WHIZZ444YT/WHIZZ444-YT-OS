import assert from "node:assert/strict";
import test from "node:test";

const { default: worker } = await import("../cloudflare/src/index.js");
const ctx = { waitUntil() {} };
const validRow = {
  venue: "CME", instrumentRoot: "NQ", contractMonth: "202612", exchangeInstrumentId: "NQZ6",
  observationType: "daily_volume", interval: "1d", observedAt: "2026-11-20T00:00:00Z",
  dataAsOf: "2026-11-20T23:59:00Z", sourceRecordId: "NQZ6-volume-20261120",
  sourceUrl: "https://data.example/records/volume", delayClass: "end-of-day",
  volume: 125000, volumeUnit: "contracts"
};

function configuredEnv() {
  return { INGEST_TOKEN: "test-ingest-token", SUPABASE_URL: "https://db.example", SUPABASE_SECRET_KEY: "sb_secret_test" };
}

test("futures observation ingestion requires a configured token and rejects unauthorized callers", async () => {
  const noToken = await worker.fetch(new Request("https://edge.example/api/v1/ingest/futures-market-data", { method: "POST", body: "{}" }), {}, ctx);
  assert.equal(noToken.status, 503);
  const unauthorized = await worker.fetch(new Request("https://edge.example/api/v1/ingest/futures-market-data", { method: "POST", headers: { Authorization: "Bearer wrong" }, body: "{}" }), configuredEnv(), ctx);
  assert.equal(unauthorized.status, 401);
});

test("futures observation ingestion persists normalized provider rows without changing entitlement approval", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    if (url.pathname.endsWith("/ingestion_runs") && options.method === "POST") return new Response(JSON.stringify([{ id: "audit-run-1" }]), { status: 201, headers: { "content-type": "application/json" } });
    if (url.pathname.endsWith("/futures_market_observations") && options.method === "POST") return new Response(null, { status: 201 });
    if (url.pathname.endsWith("/ingestion_runs") && options.method === "PATCH") return new Response(null, { status: 204 });
    throw new Error(`Unexpected Supabase request ${options.method} ${url}`);
  };
  try {
    const payload = { providerId: "vendor-x", observations: [{ ...validRow, redistributionStatus: "public-display-approved", publicDisplayApprovedBy: "attacker" }] };
    const response = await worker.fetch(new Request("https://edge.example/api/v1/ingest/futures-market-data", {
      method: "POST", headers: { Authorization: "Bearer test-ingest-token", "Content-Type": "application/json" }, body: JSON.stringify(payload)
    }), configuredEnv(), ctx);
    assert.equal(response.status, 202);
    const result = await response.json();
    assert.equal(result.ingestionCanApproveDisplay, false);
    assert.equal(result.publicDisplayControl, "provider-entitlement-registry");
    assert.equal(result.persistedObservations, 1);
    const stored = calls.find(call => call.url.pathname.endsWith("/futures_market_observations"));
    assert.equal(stored.body[0].quality_status, "provider-reported");
    assert.equal("redistribution_status" in stored.body[0], false);
    assert.equal("public_display_approved_by" in stored.body[0], false);
    assert.equal(stored.body[0].volume, 125000);
    assert.equal(calls.some(call => call.url.pathname.endsWith("/ingestion_runs") && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("futures observation ingestion rejects malformed data before it reaches Supabase", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("must not write"); };
  try {
    const response = await worker.fetch(new Request("https://edge.example/api/v1/ingest/futures-market-data", {
      method: "POST", headers: { Authorization: "Bearer test-ingest-token", "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: "vendor-x", observations: [{ ...validRow, contractMonth: "202613" }] })
    }), configuredEnv(), ctx);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).status, "invalid-payload");
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("futures observation ingestion enforces the request size cap while reading the body", async () => {
  const response = await worker.fetch(new Request("https://edge.example/api/v1/ingest/futures-market-data", {
    method: "POST", headers: { Authorization: "Bearer test-ingest-token", "Content-Type": "application/json" }, body: " ".repeat(1024 * 1024 + 1)
  }), configuredEnv(), ctx);
  assert.equal(response.status, 413);
});

test("public observation query returns only rights-approved rows and uses bounded filters", async () => {
  const originalFetch = globalThis.fetch;
  const requestUrls=[];
  globalThis.fetch = async input => {
    const requestUrl = new URL(String(input));requestUrls.push(requestUrl);
    if(requestUrl.pathname.endsWith("/futures_market_data_entitlements"))return new Response(JSON.stringify([{
      provider_id:"vendor-x",venue:"CME",instrument_root:"NQ",delay_class:"end-of-day",public_display_status:"public-display-approved",
      rights_reference:"license-review-2026-11",reviewed_at:"2026-11-20T18:00:00.000Z",reviewed_by:"project-owner",valid_until:null,is_active:true
    }]),{status:200,headers:{"content-type":"application/json"}});
    return new Response(JSON.stringify([
      {provider_id:"vendor-x",venue:"CME",instrument_root:"NQ",delay_class:"end-of-day",quality_status:"provider-reported",observation_type:"daily_volume"},
      {provider_id:"vendor-x",venue:"CME",instrument_root:"NQ",delay_class:"unknown",quality_status:"provider-reported",observation_type:"daily_volume"},
      {provider_id:"vendor-x",venue:"CME",instrument_root:"NQ",delay_class:"end-of-day",quality_status:"rejected",observation_type:"daily_volume"}
    ]), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://edge.example/api/v1/futures-observations?root=NQ&contractMonth=202612&type=daily_volume&from=2026-11-01&to=2026-11-30&limit=25"), configuredEnv(), ctx);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, "available");
    assert.equal(payload.observations.length, 1);
    assert.equal(payload.observations[0].public_display_approved_at,"2026-11-20T18:00:00.000Z");
    assert.equal(requestUrls[0].searchParams.get("public_display_status"),"eq.public-display-approved");
    assert.equal(requestUrls[0].searchParams.get("instrument_root"),"eq.NQ");
    assert.equal(requestUrls[1].searchParams.get("quality_status"),"neq.rejected");
    assert.equal(requestUrls[1].searchParams.get("instrument_root"),"eq.NQ");
    assert.equal(requestUrls[1].searchParams.get("contract_month"),"eq.202612");
    assert.equal(requestUrls[1].searchParams.get("and"),"(observed_at.gte.2026-11-01T00:00:00.000Z,observed_at.lte.2026-11-30T23:59:59.999Z)");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public observation query keeps configured-but-empty data distinct from missing configuration", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await worker.fetch(new Request("https://edge.example/api/v1/futures-observations?root=ES"), configuredEnv(), ctx);
    assert.equal((await response.json()).status, "no-approved-data");
  } finally {
    globalThis.fetch = originalFetch;
  }
  const missing = await worker.fetch(new Request("https://edge.example/api/v1/futures-observations?root=ES"), {}, ctx);
  assert.equal(missing.status, 503);
});

test("expired provider entitlement prevents the observation query and produces an empty result", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify([{
      provider_id:"vendor-x",venue:"CME",instrument_root:"ES",delay_class:"end-of-day",public_display_status:"public-display-approved",
      rights_reference:"review-ref",reviewed_at:"2026-10-01T00:00:00Z",reviewed_by:"owner",valid_until:"2026-11-01T00:00:00Z",is_active:true
    }]), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request("https://edge.example/api/v1/futures-observations?root=ES"), configuredEnv(), ctx);
    const payload = await response.json();
    assert.equal(payload.status, "no-approved-data");
    assert.equal(payload.observations.length, 0);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
