import test from "node:test";
import assert from "node:assert/strict";
import {parseTreasuryYields,fetchTreasuryYields} from "../cloudflare/src/treasury-yields.mjs";

const row=(date,fields)=>"<m:properties><d:NEW_DATE>"+date+"T00:00:00</d:NEW_DATE>"+Object.entries(fields).map(([k,v])=>"<d:"+k+">"+v+"</d:"+k+">").join("")+"</m:properties>";
const feed=(...rows)=>"<feed>"+rows.map(r=>"<entry><content>"+r+"</content></entry>").join("")+"</feed>";

test("nominal spreads use same-date values and retain revisions and business-day gaps",()=>{
 const records=parseTreasuryYields(feed(
  row("2026-11-20",{BC_2YEAR:4,BC_10YEAR:3}),
  row("2026-11-23",{BC_10YEAR:3,BC_5YEAR:2,BC_30YEAR:4}),
  row("2026-11-20",{BC_2YEAR:4,BC_10YEAR:3.8})
 ),"nominal");
 const spread=(date,id)=>records.find(record=>record.observation_date===date&&record.series_id==="nominal:"+id)?.value;
 assert.equal(spread("2026-11-20","10Y-2Y"),-20);
 assert.equal(spread("2026-11-23","10Y-2Y"),null);
 assert.equal(spread("2026-11-23","30Y-5Y"),200);
 assert.equal(spread("2026-11-21","10Y-2Y"),undefined);
});

test("real curves exclude nominal fields and preserve published zero",()=>{
 const records=parseTreasuryYields(feed(row("2026-11-20",{TC_5YEAR:0,TC_30YEAR:1,BC_10YEAR:4})),"real");
 assert.equal(records.find(r=>r.series_id==="real:30Y-5Y").value,100);
 assert.equal(records.find(r=>r.series_id==="real:10Y").value,null);
 assert.ok(!records.some(r=>r.series_id==="real:10Y-2Y"));
 assert.throws(()=>parseTreasuryYields("<!DOCTYPE feed><feed/>","real"),/Unsupported/);
});

test("independent fixed-host curve requests preserve a usable partial snapshot",async()=>{
 const urls=[];
 const result=await fetchTreasuryYields(async(input,init)=>{
  const target=new URL(input);
  urls.push(target.searchParams.get("data"));
  assert.equal(target.hostname,"home.treasury.gov");
  assert.equal(target.searchParams.get("field_tdr_date_value"),"2026");
  assert.equal(init.redirect,"error");
  return urls.at(-1).includes("_real_")?new Response("unavailable",{status:503}):
   new Response(feed(row("2026-11-20",{BC_2YEAR:4,BC_10YEAR:3.8})));
 },new Date("2026-11-26T12:00:00Z"));
 assert.equal(result.status,"partial");
 assert.equal(result.requestCount,2);
 assert.ok(result.records.every(row=>row.series_id.startsWith("nominal:")));
});
