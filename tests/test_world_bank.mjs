import test from "node:test";
import assert from "node:assert/strict";
import {approvedWorldBankSeries,fetchWorldBank} from "../cloudflare/src/world-bank.mjs";

const id="NY.GDP.MKTP.KD.ZG";
test("World Bank filters unapproved indicators and bounds pages, countries and annual periods",async()=>{
 const env={WORLD_BANK_APPROVED_INDICATORS:id+",UNREVIEWED"};
 assert.deepEqual(approvedWorldBankSeries({}),[]);
 assert.deepEqual(approvedWorldBankSeries(env),[id]);
 const row=(date,countryiso3code,value)=>({date,countryiso3code,value,indicator:{id}});
 const calls=[];
 const result=await fetchWorldBank(env,async input=>{
  const url=new URL(input);
  const page=Number(url.searchParams.get("page"));
  calls.push(page);
  assert.equal(url.hostname,"api.worldbank.org");
  assert.equal(url.searchParams.get("source"),"2");
  return Response.json([{page,pages:3},page===1?
   [row("2025","IND",6),row("2025","USA",null),row("2000","IND",1),row("2025","GBR",4)]:
   [row("2024","DEU",0)]]);
 },new Date("2026-11-26T00:00:00Z"));
 assert.deepEqual(calls,[1,2]);
 assert.equal(result.status,"partial");
 assert.deepEqual(result.records.map(r=>[r.series_id,r.observation_date,r.value]),[
  [id+":IND","2025-01-01",6],[id+":USA","2025-01-01",null],[id+":DEU","2024-01-01",0]
 ]);
 assert.ok(!result.records.some(r=>r.country_code==="JPN"));
});
