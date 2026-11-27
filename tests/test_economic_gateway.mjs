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
  assert.equal((await (await send("/api/v1/economic/fred", env)).json()).status, "reference-only");
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
  const post = (body, token=secret) => send("/api/v1/ingest", env, {method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body});
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
    method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:JSON.stringify({provider:"eia"})
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
  assert.equal(fetchMock.mock.callCount(),6);
});

test("partial persistence replays a current snapshot without refetching or duplicating observations", async t => {
  const at = new Date().toISOString();
  const snapshots = snapshotStore(Object.fromEntries(
    ["bea","eia","fred","us_treasury","ecb","treasury-yield"].map(id=>["economic:"+id+":v1",{retrievedAt:at,status:"fresh"}])
  ));
  const observations = new Map();
  const updates = [];
  let fail = true;
  let providerCalls = 0;
  const dates = Array.from({length:1001},(_,index)=>new Date(Date.UTC(2000,0,1+index*7)).toISOString().slice(0,10));
  t.mock.method(globalThis,"fetch",async (input,options) => {
    const url = new URL(input);
    if(url.hostname==="api.eia.gov"){
      providerCalls++;
      if(!url.pathname.endsWith("PET.WCESTUS1.W"))return new Response(null,{status:404});
      return Response.json({response:{data:dates.map(period=>({period,value:"42",unit:"barrels"}))}});
    }
    if(url.hostname!=="storage.example")return new Response(null,{status:503});
    if(url.pathname.endsWith("/ingestion_runs")){
      if(options.method==="POST")return Response.json([{id:"fixture-run"}]);
      updates.push(JSON.parse(options.body));
      return new Response(null,{status:204});
    }
    if(url.pathname.endsWith("/economic_observations")){
      const batch=JSON.parse(options.body);
      assert.equal(url.searchParams.get("on_conflict"),"provider,dataset_id,series_id,frequency,observation_date");
      if(fail&&batch.length===1)return new Response("database diagnostic",{status:503});
      for(const row of batch)observations.set(row.observation_date,row);
    }
    return new Response(null,{status:204});
  });
  const env={SNAPSHOTS:snapshots,INGEST_TOKEN:secret,EIA_API_KEY:"fixture-key",SUPABASE_URL:"https://storage.example",SUPABASE_SECRET_KEY:secret};
  const first=await send("/api/v1/ingest",env,{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:'{"provider":"eia"}'});
  const firstRun=(await first.json()).results[0].persistence;
  assert.equal(firstRun.status,"failed");
  assert.equal(firstRun.rowsUpserted,1000);
  assert.equal(updates.at(-1).status,"partial");
  fail=false;
  let completion;
  await worker.scheduled({scheduledTime:Date.now()},env,{waitUntil(promise){completion=promise;}});
  await completion;
  assert.equal(providerCalls,3);
  assert.equal(observations.size,1001);
  assert.equal(new Set([...observations.values()].map(row=>row.retrieved_at)).size,1);
  assert.equal(updates.at(-1).status,"partial");
  const response=await send("/api/v1/economic/eia",env);
  const reader=await response.json();
  assert.equal(reader.persistence.status,"partial");
  assert.equal(reader.persistence.runId,undefined);
  assert.equal(reader.records[0].raw_payload,undefined);
});

test("BEA selects only metadata-verified GDP and PCE and preserves missing index levels", async t => {
  const calls = [];
  t.mock.method(globalThis,"fetch",async input=>{
    const url=new URL(input);
    const table=url.searchParams.get("TableName");
    calls.push(table);
    const row=table==="T10101"
      ? {LineNumber:"1",SeriesCode:"A191RL",LineDescription:"Gross domestic product",CL_UNIT:"Percent",TimePeriod:"2026Q3",DataValue:"2.5"}
      : {LineNumber:"1",SeriesCode:"DPCERG",LineDescription:"Personal consumption expenditures (PCE)",CL_UNIT:"Index",TimePeriod:"2026M09",DataValue:"(NA)"};
    return Response.json({BEAAPI:{Results:{Data:[row,{...row,LineNumber:"999"}]}}});
  });
  const env={SNAPSHOTS:snapshotStore(),INGEST_TOKEN:secret,BEA_API_KEY:"fixture-key"};
  await send("/api/v1/ingest",env,{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:'{"provider":"bea"}'});
  const {records}=await (await send("/api/v1/economic/bea",env)).json();
  assert.deepEqual(calls.sort(),["T10101","T20804"]);
  assert.equal(records.length,2);
  assert.ok(records.some(row=>row.value===2.5&&row.unit.includes("annualized QoQ")));
  assert.ok(records.some(row=>row.value===null&&row.unit.includes("Index level")));
});

test("FRED default and narrow revision approvals hide legacy cached rows", async () => {
  const env={FRED_API_KEY:"fixture-key",SNAPSHOTS:snapshotStore({
    "economic:fred:v1":{status:"fresh",retrievedAt:new Date().toISOString(),records:[
      {series_id:"DFF",value:1,observation_date:"2026-11-01"},
      {series_id:"DGS10",value:2,observation_date:"2026-11-01"}
    ]}
  })};
  assert.deepEqual((await (await send("/api/v1/economic/fred",env)).json()).records,[]);
  env.FRED_APPROVED_SERIES="DFF,UNKNOWN";
  assert.deepEqual((await (await send("/api/v1/economic/fred",env)).json()).records.map(row=>row.series_id),["DFF"]);
});

test("EIA energy series keep native units and withheld data is null", async t => {
  const ids=[];
  t.mock.method(globalThis,"fetch",async input=>{
    const url=new URL(input);
    assert.equal(url.hostname,"api.eia.gov");
    const id=url.pathname.split("/").at(-1);
    ids.push(id);
    return Response.json({response:{data:[{period:"2026-11-20",value:id.startsWith("NG.")?"W":"42"}]}});
  });
  const env={SNAPSHOTS:snapshotStore(),INGEST_TOKEN:secret,EIA_API_KEY:"fixture-key"};
  await send("/api/v1/ingest",env,{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:'{"provider":"eia"}'});
  const {records}=await (await send("/api/v1/economic/eia",env)).json();
  assert.deepEqual(ids.sort(),["NG.NW2_EPG0_SWO_R48_BCF.W","PET.WCESTUS1.W","PET.WCRFPUS2.W"]);
  assert.deepEqual(records.map(row=>[row.unit,row.value]),[
    ["Thousand barrels",42],["Thousand barrels per day",42],["Billion cubic feet",null]
  ]);
  assert.ok(records.every(row=>row.published_at===null&&!row.source_url.includes("fixture-key")));
});

test("World Bank snapshots enforce per-indicator approval on public reads", async ()=>{
  const env={SNAPSHOTS:snapshotStore({"economic:world-bank:v1":{
    status:"fresh",retrievedAt:new Date().toISOString(),records:[
      {series_id:"NY.GDP.MKTP.KD.ZG:IND",value:6,observation_date:"2025-01-01"},
      {series_id:"FP.CPI.TOTL.ZG:IND",value:3,observation_date:"2025-01-01"}
    ]
  }})};
  const path="/api/v1/economic/world-bank";
  assert.equal((await (await send(path,env)).json()).status,"reference-only");
  env.WORLD_BANK_APPROVED_INDICATORS="NY.GDP.MKTP.KD.ZG";
  const response=await send(path,env);
  assert.equal(response.headers.get("Cache-Control"),"no-store");
  assert.deepEqual((await response.json()).records.map(row=>row.series_id),["NY.GDP.MKTP.KD.ZG:IND"]);
});

test('protected ingest requires JSON and rejects unlisted browser origins without cacheable replies', async () => {
  const env = { INGEST_TOKEN: secret, ALLOWED_ORIGINS: 'https://app.example' };
  const request = (origin, contentType, body) => send('/api/v1/ingest', env, {
    method: 'POST', body, headers: { Origin: origin, 'Content-Type': contentType, Authorization: 'Bearer ' + secret }
  });
  const denied = await request('https://app.example.invalid', 'application/json', '{}');
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(denied.headers.get('Cache-Control'), 'no-store');
  const wrongType = await request('https://app.example', 'text/plain', '{}');
  assert.equal(wrongType.status, 415);
  assert.equal(wrongType.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
  assert.equal(wrongType.headers.get('Vary'), 'Origin');
  const tooLarge = await request('https://app.example', 'application/json', ' '.repeat(4097));
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.headers.get('Cache-Control'), 'no-store');
});
