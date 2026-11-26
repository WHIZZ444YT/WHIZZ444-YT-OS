import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/src/index.js";

const base = "https://edge.example";
const context = { waitUntil() {} };
const secret = "fixture-token";

function snapshotStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    async get(key) { return values.get(key); },
    async put(key, payload) { values.set(key, JSON.parse(payload)); }
  };
}

function send(path, env, init) {
  return worker.fetch(new Request(base + path, init), env, context);
}

test("economic reads serve fresh and bounded stale snapshots without upstream calls or writes", async t => {
  const network = t.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected fetch"); });
  const key = "economic:ecb:v1";
  const row = { schemaVersion:1, status:"fresh", records:[{ value:1 }], sourceUrl:"https://data.ecb.europa.eu/" };
  const prior = new Date(Date.now() - 7 * 3600000).toISOString();
  const store = snapshotStore({ [key]: { ...row, retrievedAt:prior, lastError:"private diagnostic" } });
  const write = t.mock.method(store, "put");
  const env = { SNAPSHOTS:store };
  const stale = await send("/api/v1/economic/ecb?refresh=1", env);
  assert.equal(stale.status, 200);
  assert.equal(stale.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await stale.json(), { ...row, retrievedAt:prior, status:"stale" });

  await store.put(key, JSON.stringify({ ...row, retrievedAt:new Date().toISOString() }));
  assert.equal((await (await send("/api/v1/economic/ecb", env)).json()).status, "fresh");
  await store.put(key, JSON.stringify({ ...row, retrievedAt:new Date(Date.now() - 13 * 3600000).toISOString() }));
  const old = await send("/api/v1/economic/ecb", env);
  assert.equal(old.status, 503);
  assert.deepEqual((await old.json()).records, []);
  assert.equal((await send("/api/v1/economic/ecb", {})).status, 503);
  assert.equal((await (await send("/api/v1/economic/fred", env)).json()).status, "not-configured");
  assert.equal(network.mock.callCount(), 0);
  assert.equal(write.mock.callCount(), 2);
});

test("invalid provider, date and pagination are rejected ahead of upstream work", async t => {
  const network = t.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected fetch"); });
  const env = { SUPABASE_URL:"https://storage.example", SUPABASE_SECRET_KEY:secret };
  for (const filter of [
    "provider=unknown", "provider=ecb&start_date=2026-02-30", "provider=ecb&limit=5001",
    "provider=ecb&limit=1.5", "provider=ecb&offset=-1"
  ]) {
    assert.equal((await send("/api/v1/economic/history?" + filter, env)).status, 400, filter);
  }
  assert.equal((await send("/api/v1/economic/unrecognized/ecb?url=https://provider.example", env)).status, 404);
  assert.equal(network.mock.callCount(), 0);
});

test("CORS echoes exact configured origins only and preserves Vary", async () => {
  const env = { ALLOWED_ORIGINS:"*, https://app.example" };
  for (const origin of ["https://app.example", "https://app.example.other", "null", "*"]) {
    const result = await send("/api/v1/health", env, { method:"OPTIONS", headers:{ Origin:origin } });
    assert.equal(result.status, 204);
    assert.equal(result.headers.get("Vary"), "Origin");
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), origin==="https://app.example"?origin:null);
  }
});

test("authorized economic refresh honors upstream backoff and publishes safe diagnostics", async t => {
  const network = t.mock.method(globalThis, "fetch", async (input, init) => {
    assert.equal(new URL(input).origin, "https://data-api.ecb.europa.eu");
    assert.equal(init.redirect, "error");
    return new Response("upstream diagnostic text", {status:429,headers:{"Retry-After":"60"}});
  });
  const env = { INGEST_TOKEN:secret, SNAPSHOTS:snapshotStore() };
  const post = (body, token=secret) => send("/api/v1/ingest", env, {method:"POST",headers:{Authorization:"Bearer "+token},body});
  assert.equal((await post('{"provider":"ecb"}',"incorrect")).status, 401);
  assert.equal((await post('null')).status, 400);
  assert.equal((await post(" ".repeat(4097))).status, 413);
  assert.equal(network.mock.callCount(), 0);

  const input = '{"provider":"ecb","url":"https://provider.example"}';
  const first = await (await post(input)).json();
  assert.equal(first.results[0].status, "unavailable");
  assert.doesNotMatch(JSON.stringify(first), /upstream diagnostic text/);
  const state = await env.SNAPSHOTS.get("economic-provider:ecb");
  assert.ok(Date.parse(state.retryAt) > Date.now());
  assert.equal((await (await post(input)).json()).results[0].status, "unavailable");
  assert.equal(network.mock.callCount(), 1);
});

test("history hides upstream diagnostics while preserving bounded successful pagination", async t => {
  let available = false;
  const network = t.mock.method(globalThis,"fetch",async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin,"https://storage.example");
    assert.equal(url.searchParams.get("limit"),"10");
    assert.equal(url.searchParams.get("offset"),"5");
    assert.equal(options.redirect,"error");
    if (available) return Response.json([{ provider:"ecb", value:1 }]);
    return new Response("private upstream details",{status:503});
  });
  const env = { SUPABASE_URL:"https://storage.example", SUPABASE_SECRET_KEY:secret };
  const result = await send("/api/v1/economic/history?provider=ecb&limit=10&offset=5",env);
  assert.equal(result.status,502);
  assert.doesNotMatch(await result.text(),/private upstream details/);
  available = true;
  const recovered = await send("/api/v1/economic/history?provider=ecb&limit=10&offset=5",env);
  const body = await recovered.json();
  assert.equal(recovered.status,200);
  assert.deepEqual([body.limit,body.offset,body.count],[10,5,1]);
  assert.equal(network.mock.callCount(),2);
});

test("registered provider setup distinguishes missing, rejected and working keys", async t => {
  const storage = snapshotStore({
    "economic-provider:eia": { status:"fresh",lastSuccessAt:"2026-11-01T00:00:00Z" }
  });
  const env = { SNAPSHOTS:storage, INGEST_TOKEN:secret };
  const eiaKey = "synthetic-eia-key";
  let acceptsKey = false;
  const fetchMock = t.mock.method(globalThis, "fetch", async input => {
    const upstream = new URL(input);
    assert.equal(upstream.hostname,"api.eia.gov");
    assert.equal(upstream.searchParams.get("api_key"),eiaKey);
    return acceptsKey
      ? Response.json({response:{data:[{period:"2026-11-01",value:"42",unit:"thousand barrels"}]}})
      : new Response(eiaKey,{status:401});
  });
  const status = async () => (await send("/api/v1/economic/providers",env)).json();
  const eia = data => data.providers.find(provider => provider.id==="eia");
  const ingest = () => send("/api/v1/ingest",env,{
    method:"POST",headers:{Authorization:"Bearer "+secret},body:JSON.stringify({provider:"eia"})
  });
  let catalog = await status();
  assert.equal(eia(catalog).state.status,"not-configured");
  assert.equal(eia(catalog).credentialConfigured,false);
  assert.equal(catalog.optionalCredentials.BLS_API_KEY,false);
  assert.equal(catalog.providers.find(provider=>provider.id==="ecb").credentialConfigured,true);
  assert.equal(fetchMock.mock.callCount(),0);
  env.EIA_API_KEY = eiaKey;
  assert.doesNotMatch(await (await ingest()).text(),/synthetic-eia-key/);
  catalog = await status();
  assert.equal(eia(catalog).state.credentialStatus,"rejected");
  assert.doesNotMatch(JSON.stringify(catalog),/synthetic-eia-key/);
  acceptsKey = true;
  assert.equal((await (await ingest()).json()).results[0].status,"fresh");
  catalog = await status();
  assert.equal(eia(catalog).state.status,"fresh");
  assert.equal(eia(catalog).state.credentialStatus,undefined);
  assert.doesNotMatch(await (await send("/api/v1/economic/eia",env)).text(),/synthetic-eia-key/);
  assert.equal(fetchMock.mock.callCount(),2);
});
