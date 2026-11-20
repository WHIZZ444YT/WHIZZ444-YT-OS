import { ECONOMIC_PROVIDER_CONFIG, fetchEconomicProvider } from "./economic-providers.js";
import { filterNewsArticles, marketDataStatus, NEWS_SOURCE_REGISTRY, newsResponseEnvelope, validateNewsQuery, classifyNewsTopics, keywordRelevanceScore } from "./news-contracts.mjs";
import { nextProviderCircuitState, providerCircuitIsOpen } from "./provider-http.mjs";
import { COT_DATASETS, asFiniteNumber, cotResponseEnvelope, cotSourceColumns, normalizeCotRows, validateCotQuery } from "./cot-contracts.mjs";
import { fetchBlsCalendar, fetchEiaWpsrSchedule } from "./economic-calendar.mjs";
import { BEA_RELEASE_SCHEDULE_URL, BEA_RELEASE_DATES_URL, BOC_RATE_CALENDAR_URL, BOE_MPC_CALENDAR_URL, CFTC_COT_SCHEDULE_URL, ECB_COUNCIL_CALENDAR_URL, FOMC_CALENDAR_URL, RBA_BOARD_CALENDAR_URL, classifyPublisherScheduleFailure, fetchBeaReleaseCalendar, fetchBocRateCalendar, fetchBoeMpcCalendar, fetchCftcCotSchedule, fetchEcbCouncilCalendar, fetchFomcCalendar, fetchRbaBoardCalendar } from "./economic-calendar-extended.mjs";
import { normalizeFuturesObservationBatch, validateFuturesObservationQuery } from "./futures-observations.mjs";

const NEWS_KEY = "snapshot:gdelt:news:v1";
const NEWS_REFRESH_LOCK_KEY = "lock:gdelt:manual-refresh:v1";
const PROVIDER_STATE_KEY = "provider:gdelt:state:v1";
const BLS_CALENDAR_KEY = "schedule:bls:ics:v1";
const EIA_SCHEDULE_KEY = "schedule:eia:wpsr:v1";
const CFTC_SCHEDULE_KEY = "schedule:cftc:cot:v1";
const FOMC_SCHEDULE_KEY = "schedule:fed:fomc:v1";
const ECB_SCHEDULE_KEY = "schedule:ecb:council:v1";
const BOE_SCHEDULE_KEY = "schedule:boe:mpc:v1";
const BOC_SCHEDULE_KEY = "schedule:boc:policy-rate:v1";
const RBA_SCHEDULE_KEY = "schedule:rba:monetary-policy-board:v1";
const BEA_SCHEDULE_KEY = "schedule:bea:release-dates:v1";
const ALLOWED_BUILDER_MODELS = new Set(["page", "ict-lesson", "research-article", "glossary"]);
const GDELT_QUERY = {
 label: "Finance futures, macro & commodities",
 query: '("Nasdaq futures" OR "S&P 500 futures" OR "E-mini" OR "equity index futures" OR "gold futures" OR "silver futures" OR COMEX OR "WTI futures" OR "crude oil futures" OR NYMEX OR "Treasury futures" OR "SOFR futures" OR FOMC OR inflation OR CPI OR PCE OR payrolls OR NFP OR GDP OR ISM OR earnings OR OPEC OR commodities OR metals OR energy OR CFTC OR "Commitments of Traders" OR "CME Group" OR "ICE Futures" OR "central bank" OR Bitcoin futures)'
};
const CORS_HEADERS = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Vary": "Origin" };
async function readBoundedRequestText(request,maxBytes){
 const declared=Number(request.headers.get("Content-Length")||0);
 if(Number.isFinite(declared)&&declared>maxBytes)throw new RangeError("Request body exceeds the size limit.");
 if(!request.body)return "";
 const reader=request.body.getReader(),decoder=new TextDecoder();let text="",bytes=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new RangeError("Request body exceeds the size limit.");}
   text+=decoder.decode(value,{stream:true});
  }
  return text+decoder.decode();
 }finally{try{reader.releaseLock();}catch{}}
}
function supabaseAdminKey(env){
 return env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||"";
}
function supabaseApiHeaders(env){
 const key=supabaseAdminKey(env);
 return{apikey:key,...(key.startsWith("sb_secret_")?{}:{Authorization:"Bearer "+key})};
}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);const origin=request.headers.get("Origin")||"";
  const configuredOrigins=(env.ALLOWED_ORIGINS||"https://finance-intelligence-os-whizz444yt-7353.vercel.app,https://finance-intelligence-os-alpha.vercel.app").split(",").map(x=>x.trim()).filter(Boolean);
  const allowed=configuredOrigins.includes("*")?["https://finance-intelligence-os-whizz444yt-7353.vercel.app","https://finance-intelligence-os-alpha.vercel.app"]:configuredOrigins;
  const cors=origin&&(allowed.includes("*")||allowed.includes(origin))?{...CORS_HEADERS,"Access-Control-Allow-Origin":allowed.includes("*")?"*":origin}:CORS_HEADERS;
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="GET"&&!(request.method==="POST"&&["/api/v1/ingest","/api/v1/ingest/futures-market-data"].includes(url.pathname)))return json({error:"Method not allowed"},405,cors);
  if(request.method==="POST"&&url.pathname==="/api/v1/ingest"){
   if(!env.INGEST_TOKEN)return json({status:"not-configured",error:"INGEST_TOKEN is not configured on the Worker"},503,cors);
   if(request.headers.get("Authorization")!=="Bearer "+env.INGEST_TOKEN)return json({error:"Unauthorized"},401,cors);
   let payload={};try{payload=await request.json();}catch{return json({error:"Invalid JSON body"},400,cors);}
   const requested=payload.provider==="all"?Object.keys(ECONOMIC_PROVIDER_CONFIG):[String(payload.provider||"")];
   if(!requested.length||requested.some(p=>!Object.prototype.hasOwnProperty.call(ECONOMIC_PROVIDER_CONFIG,p)))return json({error:"provider must be one of "+Object.keys(ECONOMIC_PROVIDER_CONFIG).join(", ")+" or all"},400,cors);
   const results=await Promise.all(requested.map(async provider=>({provider,...await ingestEconomicProvider(provider,env,true)})));
   return json({status:results.every(x=>x.status==="fresh")?"fresh":results.some(x=>["fresh","partial"].includes(x.status))?"partial":"unavailable",results},200,cors);
  }
  if(request.method==="POST"&&url.pathname==="/api/v1/ingest/futures-market-data"){
   if(!env.INGEST_TOKEN)return json({status:"not-configured",error:"INGEST_TOKEN is not configured on the Worker"},503,cors);
   if(request.headers.get("Authorization")!=="Bearer "+env.INGEST_TOKEN)return json({error:"Unauthorized"},401,cors);
   let raw;try{raw=await readBoundedRequestText(request,1024*1024);}catch(error){if(error instanceof RangeError)return json({error:"Request body exceeds the 1 MiB limit."},413,cors);throw error;}
   let payload;try{payload=JSON.parse(raw);}catch{return json({error:"Invalid JSON body"},400,cors);}
   let batch;try{batch=normalizeFuturesObservationBatch(payload);}catch(error){return json({status:"invalid-payload",error:String(error.message||error)},400,cors);}
   if(!env.SUPABASE_URL||!supabaseAdminKey(env))return json({status:"not-configured",error:"Supabase server-side persistence is not configured."},503,cors);
   const startedAt=new Date().toISOString();
   let runId=null,persistedObservations=0;
   try{
    const run=await supabaseRequest(env,"ingestion_runs","POST","",{
     provider:"futures-market-data:"+batch.providerId,dataset_id:"futures_market_observations",status:"running",
     started_at:startedAt,request_count:1,rows_received:batch.records.length,rows_upserted:0,
     details:{publicDisplayControl:"provider/venue/root/delay entitlement registry",ingestionCanApproveDisplay:false}
    },"return=representation");
    runId=Array.isArray(run)?run[0]?.id:null;
    if(!runId)throw new Error("Ingestion audit record was not created.");
    await supabaseRequest(env,"futures_market_observations","POST",
     "on_conflict=provider_id,exchange_instrument_id,contract_month,observation_type,interval_code,observed_at,source_record_id",
     batch.records,"resolution=merge-duplicates,return=minimal");
    persistedObservations=batch.records.length;
    await supabaseRequest(env,"ingestion_runs","PATCH","id=eq."+encodeURIComponent(runId),{
     status:"success",completed_at:new Date().toISOString(),rows_received:batch.records.length,
     rows_upserted:batch.records.length,details:{publicDisplayControl:"provider/venue/root/delay entitlement registry",ingestionCanApproveDisplay:false}
    },"return=minimal");
   }catch(error){
    if(runId)try{await supabaseRequest(env,"ingestion_runs","PATCH","id=eq."+encodeURIComponent(runId),{
     status:"failed",completed_at:new Date().toISOString(),error_code:"futures_market_observation_ingestion_failed",
     error_message:String(error.message||error).slice(0,300),details:{rowsReceived:batch.records.length}
    },"return=minimal");}catch{}
    return json({status:persistedObservations?"audit-incomplete":"persistence-failed",providerId:batch.providerId,persistedObservations,error:persistedObservations?"Observations were stored, but the ingestion audit could not be finalized.":"Market observations could not be durably stored; check the private ingestion ledger."},502,cors);
   }
   return json({status:"persisted",providerId:batch.providerId,persistedObservations:batch.records.length,publicDisplayControl:"provider-entitlement-registry",ingestionCanApproveDisplay:false,ingestionRunId:runId},202,{...cors,"Cache-Control":"no-store"});
  }
  if(url.pathname==="/health"||url.pathname==="/api/v1/health")return json({ok:true,service:"finance-intelligence-os-edge",version:"2.2.0",time:new Date().toISOString(),storageConfigured:Boolean(env.SNAPSHOTS),cmsConfigured:Boolean(env.BUILDER_PUBLIC_API_KEY),databaseConfigured:Boolean(env.SUPABASE_URL&&supabaseAdminKey(env)),economicProviders:Object.keys(ECONOMIC_PROVIDER_CONFIG).length,ingestionTokenConfigured:Boolean(env.INGEST_TOKEN)},200,cors);
  if(url.pathname==="/api/v1/providers"){
   const state=env.SNAPSHOTS?await env.SNAPSHOTS.get(PROVIDER_STATE_KEY,"json"):null;
   const macroState=env.SNAPSHOTS?await env.SNAPSHOTS.get("macro:bls:v1","json"):null;
   const blsCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(BLS_CALENDAR_KEY,"json"):null;
   const eiaScheduleState=env.SNAPSHOTS?await env.SNAPSHOTS.get(EIA_SCHEDULE_KEY,"json"):null;
   const cftcScheduleState=env.SNAPSHOTS?await env.SNAPSHOTS.get(CFTC_SCHEDULE_KEY,"json"):null;
   const fomcCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(FOMC_SCHEDULE_KEY,"json"):null;
   const ecbCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(ECB_SCHEDULE_KEY,"json"):null;
   const boeCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(BOE_SCHEDULE_KEY,"json"):null;
   const bocCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(BOC_SCHEDULE_KEY,"json"):null;
   const rbaCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(RBA_SCHEDULE_KEY,"json"):null;
   const beaCalendarState=env.SNAPSHOTS?await env.SNAPSHOTS.get(BEA_SCHEDULE_KEY,"json"):null;
   const cotKeys=env.SNAPSHOTS?await env.SNAPSHOTS.list({prefix:"cot:tff:futures-only:v6:",limit:1}):{keys:[]};
   const cotState=env.SNAPSHOTS&&cotKeys.keys?.length?await env.SNAPSHOTS.get(cotKeys.keys[0].name,"json"):null;
   return json({providers:[
    {id:"gdelt-doc",label:"GDELT DOC API",access:"public-api",state:state||{status:"not-yet-fetched",lastCheckedAt:null},notes:"Discovery coverage is not comprehensive and not a licensed newswire."},
    {id:"bls-v1",label:env.BLS_API_KEY?"US BLS Public Data API v2":"US BLS Public Data API v1",access:env.BLS_API_KEY?"registered-api-key":"public-api-no-registration",state:macroState?{status:macroState.status,dataAsOf:macroState.dataAsOf,retrievedAt:macroState.retrievedAt,lastError:macroState.lastError||macroState.error||null,retryAt:macroState.retryAt||null}:{status:"available-on-demand"},notes:env.BLS_API_KEY?"Registered API v2 (up to 500 daily queries).":"Unregistered API v1 is limited to 25 daily queries; add BLS_API_KEY as a Cloudflare Worker secret to use registered API v2."},
    {id:"bls-calendar",label:"BLS Online Calendar (official ICS)",access:"official-scheduled-feed-no-key",state:blsCalendarState?{status:blsCalendarState.status,eventCount:blsCalendarState.event_count,retrievedAt:blsCalendarState.retrieved_at,lastError:blsCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Most scheduled releases from the BLS national office; updated by BLS as needed. This is not a complete macro calendar."},
    {id:"cftc-cot-schedule",label:"CFTC COT Release Schedule",access:"official-publisher-schedule-no-key",state:cftcScheduleState?{status:cftcScheduleState.status,eventCount:cftcScheduleState.event_count,retrievedAt:cftcScheduleState.retrieved_at,lastError:cftcScheduleState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Publisher-listed COT dates and Eastern release time. CFTC announced a planned semiweekly cadence change; verify the operational schedule."},
    {id:"fomc-calendar",label:"Federal Reserve FOMC Meeting Calendar",access:"official-publisher-schedule-no-key",state:fomcCalendarState?{status:fomcCalendarState.status,eventCount:fomcCalendarState.event_count,retrievedAt:fomcCalendarState.retrieved_at,lastError:fomcCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Publisher meeting dates only; no release time and not a complete macro calendar."},
    {id:"ecb-council-calendar",label:"European Central Bank Governing Council Calendar",access:"official-publisher-schedule-no-key",state:ecbCalendarState?{status:ecbCalendarState.status,eventCount:ecbCalendarState.event_count,retrievedAt:ecbCalendarState.retrieved_at,lastError:ecbCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Official monetary-policy meeting dates only; no release time is inferred."},
    {id:"boe-mpc-calendar",label:"Bank of England MPC Announcement Calendar",access:"official-publisher-schedule-no-key",state:boeCalendarState?{status:boeCalendarState.status,eventCount:boeCalendarState.event_count,retrievedAt:boeCalendarState.retrieved_at,lastError:boeCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Confirmed announcement dates; time is included only while the separate official 12 noon policy page confirms it."},
    {id:"boc-rate-calendar",label:"Bank of Canada Policy Rate Calendar",access:"official-publisher-schedule-no-key",state:bocCalendarState?{status:bocCalendarState.status,eventCount:bocCalendarState.event_count,retrievedAt:bocCalendarState.retrieved_at,lastError:bocCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Fixed rate-announcement dates; time is included only while the separate official 9:45 Eastern policy page confirms it."},
    {id:"rba-monetary-policy-calendar",label:"Reserve Bank of Australia Board Meeting Schedule",access:"official-publisher-schedule-no-key",state:rbaCalendarState?{status:rbaCalendarState.status,eventCount:rbaCalendarState.event_count,retrievedAt:rbaCalendarState.retrieved_at,lastError:rbaCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Monetary Policy Board meeting date ranges only; no decision release time is inferred."},
    {id:"bea-release-calendar",label:"BEA Official Release Calendar (JSON)",access:"official-publisher-feed-no-key",state:beaCalendarState?{status:beaCalendarState.status,eventCount:beaCalendarState.event_count,retrievedAt:beaCalendarState.retrieved_at,sourceRevision:beaCalendarState.source_revision,lastError:beaCalendarState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Upcoming BEA release categories from the machine-readable publisher feed; dates and UTC times only, not forecasts/actuals or a complete macro calendar."},
    {id:"cftc-pre",label:"CFTC Public Reporting Environment",access:"public-api",state:cotState?{status:cotState.status,dataAsOf:cotState.dataAsOf,retrievedAt:cotState.retrievedAt}:{status:"available-on-demand"}},
    {id:"nyfed-markets",label:"Federal Reserve Bank of New York Markets Data API",access:"public-api-no-key",state:env.SNAPSHOTS?{status:"available-on-demand"}:{status:"not-configured"},notes:"SOFR, EFFR, OBFR and related published reference rates; not live futures prices."},
    {id:"builder-content",label:"Builder.io Content API",access:"public-content-api",state:{status:env.BUILDER_PUBLIC_API_KEY?"configured":"needs-public-space-key"}},
    {id:"builder-admin",label:"Builder.io Admin API",access:"read-only-personal-access-token",state:{status:env.BUILDER_PAT?"configured":"needs-worker-secret"},notes:"Read-only user-scoped PAT; secret stays server-side."},{id:"polymarket",label:"Polymarket Gamma & public CLOB",access:"public-read-api-no-key",state:{status:"available-on-demand"},notes:"Read-only event metadata and indicative outcome prices; no order placement or wallet access."},
    {id:"kalshi",label:"Kalshi public market data",access:"public-read-api-no-key",state:{status:"available-on-demand"},notes:"Read-only markets, bid/ask and volume metadata; no trading endpoints."},
    {id:"cme-rss",label:"CME Group RSS",access:"official-rss-link",state:{status:"official-source-link"},notes:"Use subject to CME RSS terms and attribution requirements."},
    {id:"licensed-futures-market-data",label:"Licensed CME / ICE futures market data",access:"licensed-vendor-or-exchange-entitlement-required",state:{status:"not-configured"},notes:"No approved vendor, exchange entitlement or public-display permission is configured. Price, quote, depth and bars routes remain disabled."},
    {id:"bea",label:"Bureau of Economic Analysis",access:"registered-api-key",state:await getEconomicProviderState(env,"bea"),notes:"BEA NIPA quarterly national-accounts data; BEA_API_KEY required."},
    {id:"eia",label:"US Energy Information Administration",access:"registered-api-key",state:await getEconomicProviderState(env,"eia"),notes:"Weekly US crude-oil stocks series PET.WCESTUS1.W; EIA_API_KEY required."},
    {id:"eia-wpsr-schedule",label:"EIA Weekly Petroleum Status Report Schedule",access:"official-publisher-schedule-no-key",state:eiaScheduleState?{status:eiaScheduleState.status,eventCount:eiaScheduleState.event_count,retrievedAt:eiaScheduleState.retrieved_at,lastError:eiaScheduleState.last_error||null}:{status:env.SNAPSHOTS?"available-on-demand":"not-configured"},notes:"Weekly release rule and publisher-listed holiday exceptions; verify the EIA schedule before release."},
    {id:"fred",label:"Federal Reserve Economic Data",access:"registered-api-key",state:await getEconomicProviderState(env,"fred"),notes:"Daily and monthly macro histories; FRED_API_KEY required."},
    {id:"us-treasury",label:"US Treasury Fiscal Data",access:"public-api-no-key",state:await getEconomicProviderState(env,"us_treasury"),notes:"Monthly average interest rates on marketable Treasury securities; not the daily par yield curve."},
    {id:"ecb",label:"European Central Bank Data Portal",access:"public-sdmx-api-no-key",state:await getEconomicProviderState(env,"ecb"),notes:"Daily USD/EUR reference exchange-rate series; not a live FX quote."},
    {id:"supabase",label:"Supabase Postgres",access:"server-side-only",state:{status:env.SUPABASE_URL&&supabaseAdminKey(env)?"configured":"not-configured"},notes:"Server-side ingestion writes only; browser roles cannot write economic observations or ingestion logs."}
   ]},200,cors);
  }

  if(url.pathname==="/api/v1/builder/models"){
   if(!env.BUILDER_PAT)return json({status:"not-configured",credential:"Add BUILDER_PAT as a Cloudflare Worker secret",scope:"read"},200,cors);
   const spaceKey=String(url.searchParams.get("spaceKey")||"").trim();
   if(!spaceKey||spaceKey.length>128)return json({error:"A valid Builder Space API key is required as the spaceKey query parameter."},400,cors);
   const adminUrl=new URL("https://cdn.builder.io/api/v2/admin");
   adminUrl.searchParams.set("apiKey",spaceKey);
   try{
    const response=await fetch(adminUrl,{method:"POST",headers:{"Authorization":"Bearer "+env.BUILDER_PAT,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({query:"query { models { id name kind fields } }"}),signal:AbortSignal.timeout(12000)});
    const data=await response.json();
    if(!response.ok||data.errors)return json({status:"provider-error",provider:"Builder.io Admin API",httpStatus:response.status,error:data.errors||"Builder Admin API request failed"},502,cors);
    const models=Array.isArray(data.data?.models)?data.data.models:[];
    return json({status:"connected",provider:"Builder.io Admin API",access:"read-only",modelCount:models.length,models,retrievedAt:new Date().toISOString()},200,{...cors,"Cache-Control":"private, max-age=60"});
   }catch{return json({status:"unavailable",provider:"Builder.io Admin API",error:"Builder Admin API request could not be completed"},502,cors);}
  }

  if(url.pathname==="/api/v1/news/sources"){
   const state=env.SNAPSHOTS?await env.SNAPSHOTS.get(PROVIDER_STATE_KEY,"json"):null;
   const sources=NEWS_SOURCE_REGISTRY.map(source=>({...source,enabled:source.enabled&&Boolean(env.SNAPSHOTS),last_checked:state?.lastCheckedAt||null,state:env.SNAPSHOTS?(state?.status||"not-yet-fetched"):"not-configured"}));
   return json({schema_version:1,data_type:"news_source_registry",retrieved_at:new Date().toISOString(),status:env.SNAPSHOTS?(state?.status||"not-yet-fetched"):"not-configured",sources},200,{...cors,"Cache-Control":"public, max-age=60, s-maxage=120"});
  }

  if(url.pathname==="/api/v1/events"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"U.S. Bureau of Labor Statistics Online Calendar",source_url:"https://www.bls.gov/schedule/news_release/bls.ics",schedule_url:"https://www.bls.gov/schedule/",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,BLS_CALENDAR_KEY,fetchBlsCalendar,{provider:"U.S. Bureau of Labor Statistics Online Calendar",publisher:"U.S. Bureau of Labor Statistics",source_url:"https://www.bls.gov/schedule/news_release/bls.ics",schedule_url:"https://www.bls.gov/schedule/",source_timezone:"America/New_York",error:"The official BLS calendar could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/eia"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"U.S. Energy Information Administration WPSR Schedule",source_url:"https://www.eia.gov/petroleum/supply/weekly/schedule.php",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,EIA_SCHEDULE_KEY,fetchEiaWpsrSchedule,{provider:"U.S. Energy Information Administration WPSR Schedule",publisher:"U.S. Energy Information Administration",source_url:"https://www.eia.gov/petroleum/supply/weekly/schedule.php",schedule_url:"https://www.eia.gov/petroleum/supply/weekly/schedule.php",source_timezone:"America/New_York",error:"The official EIA schedule could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/cftc"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"CFTC Commitments of Traders Release Schedule",source_url:CFTC_COT_SCHEDULE_URL,events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,CFTC_SCHEDULE_KEY,fetchCftcCotSchedule,{provider:"CFTC Commitments of Traders Release Schedule",publisher:"Commodity Futures Trading Commission",source_url:CFTC_COT_SCHEDULE_URL,schedule_url:CFTC_COT_SCHEDULE_URL,source_timezone:"America/New_York",error:"The official CFTC schedule could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/fomc"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"Federal Reserve FOMC meeting calendar",source_url:FOMC_CALENDAR_URL,events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,FOMC_SCHEDULE_KEY,fetchFomcCalendar,{provider:"Federal Reserve FOMC meeting calendar",publisher:"Board of Governors of the Federal Reserve System",source_url:FOMC_CALENDAR_URL,schedule_url:FOMC_CALENDAR_URL,source_timezone:null,error:"The official Federal Reserve calendar could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/ecb"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"ECB Governing Council monetary policy meeting calendar",publisher:"European Central Bank",publisher_id:"ECB",source_url:ECB_COUNCIL_CALENDAR_URL,schedule_url:ECB_COUNCIL_CALENDAR_URL,source_timezone:"Europe/Berlin",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,ECB_SCHEDULE_KEY,fetchEcbCouncilCalendar,{provider:"ECB Governing Council monetary policy meeting calendar",publisher:"European Central Bank",publisher_id:"ECB",source_url:ECB_COUNCIL_CALENDAR_URL,schedule_url:ECB_COUNCIL_CALENDAR_URL,source_timezone:"Europe/Berlin",error:"The official ECB calendar could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/boe"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"Bank of England Monetary Policy Committee announcement calendar",publisher:"Bank of England",publisher_id:"BOE",source_url:BOE_MPC_CALENDAR_URL,schedule_url:BOE_MPC_CALENDAR_URL,source_timezone:"Europe/London",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,BOE_SCHEDULE_KEY,fetchBoeMpcCalendar,{provider:"Bank of England Monetary Policy Committee announcement calendar",publisher:"Bank of England",publisher_id:"BOE",source_url:BOE_MPC_CALENDAR_URL,schedule_url:BOE_MPC_CALENDAR_URL,source_timezone:"Europe/London",error:"The official Bank of England calendar could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/boc"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"Bank of Canada policy interest rate announcement schedule",publisher:"Bank of Canada",publisher_id:"BOC",source_url:BOC_RATE_CALENDAR_URL,schedule_url:BOC_RATE_CALENDAR_URL,source_timezone:"America/Toronto",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,BOC_SCHEDULE_KEY,fetchBocRateCalendar,{provider:"Bank of Canada policy interest rate announcement schedule",publisher:"Bank of Canada",publisher_id:"BOC",source_url:BOC_RATE_CALENDAR_URL,schedule_url:BOC_RATE_CALENDAR_URL,source_timezone:"America/Toronto",error:"The official Bank of Canada schedule could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/rba"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"Reserve Bank of Australia Monetary Policy Board meeting calendar",publisher:"Reserve Bank of Australia",publisher_id:"RBA",source_url:RBA_BOARD_CALENDAR_URL,schedule_url:RBA_BOARD_CALENDAR_URL,source_timezone:"Australia/Sydney",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,RBA_SCHEDULE_KEY,fetchRbaBoardCalendar,{provider:"Reserve Bank of Australia Monetary Policy Board meeting calendar",publisher:"Reserve Bank of Australia",publisher_id:"RBA",source_url:RBA_BOARD_CALENDAR_URL,schedule_url:RBA_BOARD_CALENDAR_URL,source_timezone:"Australia/Sydney",error:"The official Reserve Bank of Australia calendar could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/events/bea"){
   if(!env.SNAPSHOTS)return json({schema_version:1,data_type:"official_economic_release_schedule",status:"not-configured",provider:"U.S. Bureau of Economic Analysis release calendar",publisher:"U.S. Bureau of Economic Analysis",publisher_id:"BEA",source_url:BEA_RELEASE_SCHEDULE_URL,source_feed_url:BEA_RELEASE_DATES_URL,schedule_url:BEA_RELEASE_SCHEDULE_URL,source_timezone:"UTC",events:[],event_count:0,error:"Calendar snapshot storage is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const result=await getPublisherSchedule(env,BEA_SCHEDULE_KEY,fetchBeaReleaseCalendar,{provider:"U.S. Bureau of Economic Analysis release calendar",publisher:"U.S. Bureau of Economic Analysis",publisher_id:"BEA",source_url:BEA_RELEASE_SCHEDULE_URL,source_feed_url:BEA_RELEASE_DATES_URL,schedule_url:BEA_RELEASE_SCHEDULE_URL,source_timezone:"UTC",error:"The official BEA release schedule could not be retrieved. Check the issuer schedule directly."});
   return json(result.snapshot,result.status,{...cors,"Cache-Control":result.status===200?"public, max-age=300, s-maxage=900":"no-store",...(result.retryAfter?{"Retry-After":String(result.retryAfter)}:{})});
  }

  if(url.pathname==="/api/v1/market-data/status"){
   return json(marketDataStatus(),200,{...cors,"Cache-Control":"public, max-age=60, s-maxage=120"});
  }

  if(url.pathname==="/api/v1/futures-observations"){
   const validation=validateFuturesObservationQuery(url.searchParams);
   if(!validation.ok)return json({schema_version:1,data_type:"futures_market_observations",status:"invalid-query",error:{code:validation.code,message:validation.message},observations:[]},400,cors);
   if(!env.SUPABASE_URL||!supabaseAdminKey(env))return json({schema_version:1,data_type:"futures_market_observations",status:"not-configured",observations:[],access_note:"Server-side database access is not configured."},503,{...cors,"Cache-Control":"no-store"});
   const entitlementQuery=new URLSearchParams({
    select:"provider_id,venue,instrument_root,delay_class,rights_reference,reviewed_at,reviewed_by,valid_until,is_active",
    instrument_root:"eq."+validation.query.root,public_display_status:"eq.public-display-approved",is_active:"eq.true",
    rights_reference:"not.is.null",reviewed_at:"not.is.null",reviewed_by:"not.is.null",delay_class:"neq.unknown",
    order:"reviewed_at.desc",limit:"100"
   });
   const q=new URLSearchParams({
    select:"provider_id,venue,instrument_root,contract_month,exchange_instrument_id,observation_type,interval_code,observed_at,data_as_of,retrieved_at,open,high,low,close,volume,open_interest,volume_unit,source_url,delay_class,quality_status",
    quality_status:"neq.rejected",instrument_root:"eq."+validation.query.root,order:"observed_at.desc",limit:String(validation.query.limit)
   });
   if(validation.query.contractMonth)q.set("contract_month","eq."+validation.query.contractMonth);
   if(validation.query.type)q.set("observation_type","eq."+validation.query.type);
   if(validation.query.interval)q.set("interval_code","eq."+validation.query.interval);
   const observedAtFilters=[];
   if(validation.query.from)observedAtFilters.push("observed_at.gte."+validation.query.from+"T00:00:00.000Z");
   if(validation.query.to)observedAtFilters.push("observed_at.lte."+validation.query.to+"T23:59:59.999Z");
   if(observedAtFilters.length)q.set("and","("+observedAtFilters.join(",")+")");
   try{
    const entitlementRows=await supabaseRequest(env,"futures_market_data_entitlements","GET",entitlementQuery.toString());
    const now=Date.now();
    const entitlements=(Array.isArray(entitlementRows)?entitlementRows:[]).filter(row=>row.is_active===true&&row.public_display_status==="public-display-approved"&&row.delay_class!=="unknown"&&row.rights_reference&&row.reviewed_at&&row.reviewed_by&&(!row.valid_until||Date.parse(row.valid_until)>now));
    if(!entitlements.length)return json({schema_version:1,data_type:"futures_market_observations",status:"no-approved-data",root:validation.query.root,observations:[],access_note:"No active public-display entitlement is recorded for this futures root."},200,{...cors,"Cache-Control":"public, max-age=30, s-maxage=60"});
    const providerIds=[...new Set(entitlements.map(row=>String(row.provider_id||"")))].filter(id=>/^[a-z0-9][a-z0-9._-]{1,63}$/.test(id));
    if(!providerIds.length)return json({schema_version:1,data_type:"futures_market_observations",status:"no-approved-data",root:validation.query.root,observations:[],access_note:"No usable active public-display entitlement is recorded for this futures root."},200,{...cors,"Cache-Control":"public, max-age=30, s-maxage=60"});
    q.set("provider_id","in.("+providerIds.join(",")+")");
    const observationRows=await supabaseRequest(env,"futures_market_observations","GET",q.toString());
    const entitlementByKey=new Map(entitlements.map(row=>[JSON.stringify([row.provider_id,row.venue,row.instrument_root,row.delay_class]),row]));
    const observations=(Array.isArray(observationRows)?observationRows:[]).filter(row=>entitlementByKey.has(JSON.stringify([row.provider_id,row.venue,row.instrument_root,row.delay_class]))&&row.quality_status!=="rejected").map(row=>{
     const entitlement=entitlementByKey.get(JSON.stringify([row.provider_id,row.venue,row.instrument_root,row.delay_class]));
     return{...row,public_display_approved_at:entitlement.reviewed_at};
    });
    return json({schema_version:1,data_type:"futures_market_observations",status:observations.length?"available":"no-approved-data",root:validation.query.root,query:validation.query,observations,access_note:"Only observations covered by an active provider, venue, market and delay-class entitlement are returned. Source timestamps and delay labels do not by themselves establish exchange real-time entitlement."},200,{...cors,"Cache-Control":"public, max-age=30, s-maxage=60"});
   }catch{return json({schema_version:1,data_type:"futures_market_observations",status:"unavailable",root:validation.query.root,observations:[],error:"Approved market-observation storage could not be queried."},502,{...cors,"Cache-Control":"no-store"});}
  }

  if(url.pathname==="/api/v1/news"){
   const validation=validateNewsQuery(url.searchParams);
   if(!validation.ok)return json({schema_version:1,data_type:"news_discovery",status:"invalid-query",error:{code:validation.code,message:validation.message}},400,cors);
   const query=validation.query;
   let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(NEWS_KEY,"json"):null;
   let refreshStatus="not-requested";
   if(query.refresh){
    if(!env.SNAPSHOTS)return json({...newsResponseEnvelope({status:"not-configured",lastCheckedAt:null,notes:["Cloudflare KV snapshot storage is not configured."]},[]),refresh:{status:"storage-unavailable"}},503,cors);
    const lastChecked=Date.parse(snapshot?.lastCheckedAt||"");
    const coolingDown=Number.isFinite(lastChecked)&&Date.now()-lastChecked<5*60*1000;
    const running=await env.SNAPSHOTS.get(NEWS_REFRESH_LOCK_KEY);
    if(coolingDown)refreshStatus="cooldown";
    else if(running)refreshStatus="in-progress";
    else{
     await env.SNAPSHOTS.put(NEWS_REFRESH_LOCK_KEY,new Date().toISOString(),{expirationTtl:300});
     ctx.waitUntil(refreshNews(env).finally(()=>env.SNAPSHOTS.delete(NEWS_REFRESH_LOCK_KEY)));
     refreshStatus="queued";
    }
   }
   const base=snapshot||{status:"not-yet-fetched",provider:"GDELT DOC API",lastCheckedAt:null,articles:[],notes:["No edge snapshot exists yet. The configured Cron trigger populates this KV cache after its first successful run."]};
   const filtered=filterNewsArticles(base.articles,query);
   return json({...newsResponseEnvelope({...base,refresh:{status:refreshStatus,cooldownSeconds:300}},filtered),query:{instrument:query.instrument,topic:query.topic,publisher:query.publisher,since:query.since,until:query.until,limit:query.limit,sort:query.sort,time_basis:"provider_seen_at; publisher publication time is not supplied consistently"}},200,{...cors,"Cache-Control":query.refresh?"no-store":"public, max-age=30, s-maxage=60"});
  }

  if(url.pathname==="/api/v1/volume-open-interest"){
   const validation=validateCotQuery(url.searchParams);
   if(!validation.ok)return json({schema_version:1,data_type:"cftc_weekly_open_interest",status:"invalid-query",error:{code:validation.code,message:validation.message},observations:[]},400,cors);
   const {report,variant,q,contractMarketCode}=validation.query;
   if(!q&&!contractMarketCode)return json({schema_version:1,data_type:"cftc_weekly_open_interest",status:"invalid-query",error:{code:"market_filter_required",message:"Supply a CFTC market-name search or exact contract_market_code."},observations:[]},400,cors);
   const marketKey=(contractMarketCode||q).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"market";
   const cacheKey="voi:"+report+":"+variant+":v2:"+marketKey;
   let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(cacheKey,"json"):null;
   if(!snapshot||!snapshot.retrievedAt||Date.now()-Date.parse(snapshot.retrievedAt)>6*60*60*1000){
    try{
     const cot=await fetchCot(report,variant,q,contractMarketCode,env);
     const observations=(cot.rows||[]).map(row=>({
      marketName:row.contract_market_name||row.market_and_exchange_names||row.contract_name||"Contract",
      contractMarketCode:row.cftc_contract_market_code||null,
      exchangeMarketName:row.market_and_exchange_names||null,
      reportDate:String(row.report_date_as_yyyy_mm_dd||row.report_date||"").slice(0,10)||null,
      openInterest:asFiniteNumber(row.open_interest_all??row.open_interest)
     })).filter(row=>row.reportDate&&row.openInterest!==null).sort((a,b)=>String(a.reportDate).localeCompare(String(b.reportDate)));
     snapshot={schemaVersion:1,dataType:"cftc_weekly_open_interest",status:cot.status,provider:cot.provider,report,reportName:cot.reportName,variant:cot.variant,query:q||null,contractMarketCode:contractMarketCode||null,positionDate:cot.dataAsOf,publishedAt:null,publicationTimestampStatus:cot.publicationTimestampStatus,retrievedAt:cot.retrievedAt,sourceUrl:cot.sourceUrl,scheduleUrl:cot.scheduleUrl,cadence:"weekly",metric:"open_interest",unit:"contracts",observations,volume:{status:"not-connected",metric:"exchange_traded_volume",reason:"CFTC COT does not provide the daily/intraday exchange volume series required by this module."}};
     if(env.SNAPSHOTS)await env.SNAPSHOTS.put(cacheKey,JSON.stringify(snapshot),{expirationTtl:60*60*8});
    }catch(error){
     if(!snapshot)return json({status:"unavailable",provider:"CFTC Public Reporting Environment",report,query:market,observations:[],volume:{status:"not-connected"},error:"CFTC open-interest request failed"},502,cors);
     snapshot={...snapshot,status:"stale",lastError:"CFTC refresh failed; showing last successful open-interest snapshot."};
    }
   }
   return json({...snapshot,schema_version:1,data_type:"cftc_weekly_open_interest",report_family:snapshot.report,report_variant:snapshot.variant,position_date:snapshot.positionDate,published_at:snapshot.publishedAt,publication_timestamp_status:snapshot.publicationTimestampStatus,retrieved_at:snapshot.retrievedAt,source_url:snapshot.sourceUrl,schedule_url:snapshot.scheduleUrl,frequency:snapshot.cadence},200,{...cors,"Cache-Control":"public, max-age=900, s-maxage=1800"});
  }

  if(url.pathname==="/api/v1/cot"){
   const validation=validateCotQuery(url.searchParams);
   if(!validation.ok)return json({schema_version:1,data_type:"cftc_cot_positions",status:"invalid-query",error:{code:validation.code,message:validation.message}},400,cors);
   const {report,variant,q,contractMarketCode}=validation.query;
   const marketKey=(contractMarketCode||q).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"all";
    // v6 restores the source-native `rows` response contract consumed by the
    // independently deployed static frontend. It also invalidates v5 entries,
    // which intentionally discarded those rows.
    const cacheKey="cot:"+report+":"+variant+":v6:"+marketKey;
   let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(cacheKey,"json"):null;
   if(!snapshot||!snapshot.retrievedAt||Date.now()-Date.parse(snapshot.retrievedAt)>6*60*60*1000){
     try{
      snapshot=await fetchCot(report,variant,q,contractMarketCode,env);
      snapshot={...snapshot,normalizedRows:(snapshot.normalizedRows||[]).map(({sourceNativeFields,...row})=>row)};
      if(env.SNAPSHOTS)await env.SNAPSHOTS.put(cacheKey,JSON.stringify(snapshot),{expirationTtl:60*60*8});
     }
    catch(error){if(!snapshot)return json({schema_version:1,data_type:"cftc_cot_positions",status:"unavailable",report_family:report,report_variant:variant,rows:[],normalizedRows:[],source_url:validation.dataset.sourceUrl,error:"CFTC PRE request failed"},502,cors);snapshot.status="stale";snapshot.lastError="CFTC PRE refresh failed; showing last successful cache";}
   }
   const payload=cotResponseEnvelope(snapshot,snapshot.normalizedRows||normalizeCotRows(snapshot.rows||[],{report,variant,retrievedAt:snapshot.retrievedAt,sourceUrl:snapshot.sourceUrl}));
   return json({...snapshot,...payload,rows:snapshot.rows||[],normalizedRows:payload.rows,filtered:Boolean(q||contractMarketCode),query:q||null,contract_market_code:contractMarketCode||null,query_scope:q||contractMarketCode?"filtered-market-history":"latest-provider-observations",last_error:snapshot.lastError||null},200,{...cors,"Cache-Control":"public, max-age=900, s-maxage=1800"});
  }
  if(url.pathname==="/api/v1/macro"){
   const cacheKey="macro:bls:v1";
   const forced=url.searchParams.get("refresh")==="1";
   let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(cacheKey,"json"):null;
   if(snapshot?.status==="rate-limited"&&(!forced||!env.BLS_API_KEY)){
    const retrySeconds=Math.max(60,Math.ceil((Date.parse(snapshot.retryAt||"")-Date.now())/1000)||3600);
    return json(snapshot,429,{...cors,"Cache-Control":"no-store","Retry-After":String(retrySeconds)});
   }
   if(forced&&env.SNAPSHOTS)await env.SNAPSHOTS.delete(cacheKey);
   if(forced)snapshot=null;
   if(!snapshot||!snapshot.retrievedAt||Date.now()-Date.parse(snapshot.retrievedAt)>6*60*60*1000){
    try{
     snapshot=await fetchBls(env);
     if(env.SNAPSHOTS)await env.SNAPSHOTS.put(cacheKey,JSON.stringify(snapshot),{expirationTtl:60*60*8});
    }catch(error){
     const message=String(error.message||error).slice(0,220);
     if(error.rateLimited){
      const now=Date.now(),nextMidnight=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth(),new Date(now).getUTCDate()+1);
      const retryAt=new Date(nextMidnight).toISOString();
      if(snapshot){
       snapshot={...snapshot,status:"stale",lastError:message,retryAt};
       if(env.SNAPSHOTS)await env.SNAPSHOTS.put(cacheKey,JSON.stringify(snapshot),{expirationTtl:Math.max(60,Math.ceil((nextMidnight-now)/1000))});
       return json(snapshot,200,{...cors,"Cache-Control":"public, max-age=1800, s-maxage=3600"});
      }
      snapshot={schemaVersion:1,status:"rate-limited",provider:env.BLS_API_KEY?"US Bureau of Labor Statistics Public Data API v2":"US Bureau of Labor Statistics Public Data API v1",retrievedAt:new Date().toISOString(),dataAsOf:null,series:[],error:message,retryAt,notes:[env.BLS_API_KEY?"BLS registered daily query quota has been reached; retry after UTC midnight.":"BLS anonymous daily query quota has been reached. Register a free BLS API v2 key and add it as BLS_API_KEY in Cloudflare Worker secrets."]};
      if(env.SNAPSHOTS)await env.SNAPSHOTS.put(cacheKey,JSON.stringify(snapshot),{expirationTtl:Math.max(60,Math.ceil((nextMidnight-now)/1000))});
      return json(snapshot,429,{...cors,"Cache-Control":"no-store","Retry-After":String(Math.max(60,Math.ceil((nextMidnight-now)/1000)))});
     }
     if(!snapshot)return json({status:"unavailable",provider:"US Bureau of Labor Statistics Public Data API",series:[],error:"BLS request failed: "+message},502,cors);
     snapshot={...snapshot,status:"stale",lastError:"BLS refresh failed; serving the last successful snapshot: "+message};
    }
   }
   return json(snapshot,200,{...cors,"Cache-Control":"public, max-age=1800, s-maxage=3600"});
  }

  if(url.pathname==="/api/v1/macro/funding"){
   const key="macro:nyfed:funding:v1";
   let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(key,"json"):null;
   if(!snapshot||!snapshot.retrievedAt||Date.now()-Date.parse(snapshot.retrievedAt)>60*60*1000){
    try{snapshot=await fetchNyFedFunding();if(env.SNAPSHOTS)await env.SNAPSHOTS.put(key,JSON.stringify(snapshot),{expirationTtl:60*60*4});}
    catch(error){if(!snapshot)return json({status:"unavailable",provider:"Federal Reserve Bank of New York Markets Data API",rates:[],error:"NY Fed reference-rate request failed"},502,cors);snapshot={...snapshot,status:"stale"};}
   }
   return json(snapshot,200,{...cors,"Cache-Control":"public, max-age=900, s-maxage=1800"});
  }
  if(url.pathname==="/api/v1/economic/history"){
   if(!env.SUPABASE_URL||!supabaseAdminKey(env))return json({status:"not-configured",observations:[],error:"Server-side Supabase credentials are not configured."},503,cors);
   const provider=String(url.searchParams.get("provider")||"").toLowerCase();
   if(!Object.prototype.hasOwnProperty.call(ECONOMIC_PROVIDER_CONFIG,provider))return json({error:"A supported provider is required."},400,cors);
   const seriesId=String(url.searchParams.get("series_id")||"").trim();
   if(seriesId.length>160)return json({error:"series_id is too long."},400,cors);
   const startDate=String(url.searchParams.get("start_date")||"");
   const endDate=String(url.searchParams.get("end_date")||"");
   const datePattern=/^\d{4}-\d{2}-\d{2}$/;
   const validDate=value=>{if(!datePattern.test(value))return false;const parsed=new Date(value+"T00:00:00Z");return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;};
   if((startDate&&!validDate(startDate))||(endDate&&!validDate(endDate))||(startDate&&endDate&&startDate>endDate))return json({error:"Dates must be valid YYYY-MM-DD values and start_date must not follow end_date."},400,cors);
   const parsedLimit=Number(url.searchParams.get("limit")||1000),limit=Number.isInteger(parsedLimit)?Math.min(5000,Math.max(1,parsedLimit)):1000;
   const parsedOffset=Number(url.searchParams.get("offset")||0),offset=Number.isInteger(parsedOffset)?Math.min(1000000,Math.max(0,parsedOffset)):0;
   const query=new URLSearchParams({select:"provider,dataset_id,series_id,series_name,country_code,frequency,observation_date,value,unit,data_as_of,published_at,retrieved_at,source_url,freshness_status"});
   query.set("provider","eq."+provider);
   if(seriesId)query.set("series_id","eq."+seriesId);
   if(startDate&&endDate)query.set("and","(observation_date.gte."+startDate+",observation_date.lte."+endDate+")");
   else if(startDate)query.set("observation_date","gte."+startDate);
   else if(endDate)query.set("observation_date","lte."+endDate);
   query.set("order","series_id.asc,observation_date.asc");
   query.set("limit",String(limit));query.set("offset",String(offset));
   try{
    const observations=await supabaseRequest(env,"economic_observations","GET",query.toString());
    return json({schemaVersion:1,status:"fresh",provider,seriesId:seriesId||null,count:Array.isArray(observations)?observations.length:0,limit,offset,observations:Array.isArray(observations)?observations:[],source:"Supabase economic_observations",retrievedAt:new Date().toISOString()},200,{...cors,"Cache-Control":"public, max-age=60, s-maxage=120"});
   }catch(error){
    return json({status:"unavailable",provider,observations:[],error:"Historical Supabase query failed: "+String(error.message||error).slice(0,180)},502,cors);
   }
  }
  if(url.pathname==="/api/v1/economic/providers"){
   const providers=await Promise.all(Object.entries(ECONOMIC_PROVIDER_CONFIG).map(async([id,cfg])=>({id,label:cfg.label,credential:cfg.credential||null,credentialConfigured:!cfg.credential||Boolean(env[cfg.credential]),cadence:cfg.cadence,ttlSeconds:cfg.ttlSeconds,state:await getEconomicProviderState(env,id)})));
   return json({schemaVersion:1,providers,retrievedAt:new Date().toISOString(),persistenceConfigured:Boolean(env.SUPABASE_URL&&supabaseAdminKey(env))},200,cors);
  }
  if(url.pathname.startsWith("/api/v1/economic/")){
   const provider=url.pathname.split("/").pop();
   if(!Object.prototype.hasOwnProperty.call(ECONOMIC_PROVIDER_CONFIG,provider))return json({error:"Unsupported economic provider"},404,cors);
   const result=await getEconomicData(provider,env,false);
   const status=result.status==="unavailable"?502:200;
   return json(result,status,{...cors,"Cache-Control":"public, max-age=900, s-maxage=1800"});
  }
  if(url.pathname.startsWith("/api/v1/prediction/")){
   const provider=url.pathname.split("/").pop();
   if(!["polymarket","kalshi"].includes(provider))return json({error:"Unsupported prediction-market provider"},404,cors);
   const search=String(url.searchParams.get("q")||"").trim().toLowerCase().slice(0,100);
   const cacheKey="prediction:"+provider+":v1";
   let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(cacheKey,"json"):null;
   if(!snapshot||!snapshot.retrievedAt||Date.now()-Date.parse(snapshot.retrievedAt)>5*60*1000){
    try{snapshot=provider==="polymarket"?await fetchPolymarket():await fetchKalshi();if(env.SNAPSHOTS)await env.SNAPSHOTS.put(cacheKey,JSON.stringify(snapshot),{expirationTtl:60*15});}
    catch(error){if(!snapshot)return json({status:"unavailable",provider,items:[],error:"Public market-data request failed"},502,cors);snapshot={...snapshot,status:"stale",lastError:"Provider refresh failed; showing last successful cache"};}
   }
   const items=search?snapshot.items.filter(item=>JSON.stringify(item).toLowerCase().includes(search)):snapshot.items;
   return json({...snapshot,items,filtered:Boolean(search),query:search||null,retrievedAt:snapshot.retrievedAt},200,{...cors,"Cache-Control":"public, max-age=60, s-maxage=120"});
  }

  if(url.pathname.startsWith("/api/v1/cms/")){
   const model=url.pathname.split("/").pop();
   if(!ALLOWED_BUILDER_MODELS.has(model))return json({error:"Model is not allow-listed"},404,cors);
   if(!env.BUILDER_PUBLIC_API_KEY)return json({status:"not-configured",model,results:[]},200,cors);
   const apiUrl=new URL("https://cdn.builder.io/api/v3/content/"+encodeURIComponent(model));
   apiUrl.searchParams.set("apiKey",env.BUILDER_PUBLIC_API_KEY);
   apiUrl.searchParams.set("limit",String(Math.min(50,Math.max(1,Number(url.searchParams.get("limit")||20)))));
   if(url.searchParams.get("urlPath"))apiUrl.searchParams.set("userAttributes.urlPath",url.searchParams.get("urlPath"));
   try{
    const result=await fetch(apiUrl,{headers:{"Accept":"application/json"},cf:{cacheTtl:120,cacheEverything:true}});
    const data=await result.json();
    return json({status:result.ok?"connected":"provider-error",model,results:Array.isArray(data.results)?data.results:[],error:result.ok?undefined:"Builder API returned "+result.status},result.ok?200:502,{...cors,"Cache-Control":"public, max-age=60, s-maxage=120"});
   }catch{return json({status:"unavailable",model,results:[]},502,cors);}
  }
  return json({error:"Not found",routes:["/health","/api/v1/health","/api/v1/providers","/api/v1/news?instrument=NQ&topic=macro&limit=...","/api/v1/news/sources","/api/v1/market-data/status","/api/v1/futures-observations?root=NQ&contractMonth=202612&type=daily_volume","POST /api/v1/ingest/futures-market-data","/api/v1/volume-open-interest?report=tff|disaggregated","/api/v1/cot?report=tff|disaggregated","/api/v1/macro","/api/v1/macro/funding","/api/v1/economic/providers","/api/v1/economic/{bea|eia|fred|us_treasury|ecb}","POST /api/v1/ingest","/api/v1/economic/history?provider=...&series_id=...","/api/v1/prediction/polymarket","/api/v1/prediction/kalshi","/api/v1/cms/{model}"]},404,cors);
 },
 async scheduled(controller,env,ctx){ctx.waitUntil(Promise.allSettled([refreshNews(env),scheduledEconomicIngestion(env)]));}
};

function economicCacheKey(provider){return "economic:"+provider+":v1";}
async function getEconomicProviderState(env,provider){
 if(env.SNAPSHOTS){const state=await env.SNAPSHOTS.get("economic-provider:"+provider,"json");if(state)return state;}
 const cfg=ECONOMIC_PROVIDER_CONFIG[provider];
 return{status:cfg?.credential&&!env[cfg.credential]?"not-configured":"not-yet-fetched",credentialRequired:cfg?.credential||null,lastAttemptAt:null,lastSuccessAt:null,persistenceStatus:env.SUPABASE_URL&&supabaseAdminKey(env)?"ready":"not-configured"};
}
async function getEconomicData(provider,env,force){
 const cfg=ECONOMIC_PROVIDER_CONFIG[provider],key=economicCacheKey(provider);
 let snapshot=env.SNAPSHOTS?await env.SNAPSHOTS.get(key,"json"):null;
 const retrieved=Date.parse(snapshot?.retrievedAt||"");
 const stale=!Number.isFinite(retrieved)||Date.now()-retrieved>cfg.ttlSeconds*1000;
 if(force||!snapshot||stale)return await ingestEconomicProvider(provider,env,force);
 return snapshot;
}
async function supabaseRequest(env,table,method,query,body,prefer){
 if(!env.SUPABASE_URL||!supabaseAdminKey(env))throw new Error("Supabase server credentials are not configured");
 const base=String(env.SUPABASE_URL).replace(/\/+$/,"");
 const response=await fetch(base+"/rest/v1/"+table+(query?"?"+query:""),{
  method,headers:{...supabaseApiHeaders(env),"Content-Type":"application/json","Accept":"application/json",...(prefer?{"Prefer":prefer}:{})},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)
 });
 const text=await response.text();
 if(!response.ok)throw new Error("Supabase "+table+" HTTP "+response.status+": "+text.slice(0,300));
 if(!text)return null;
 try{return JSON.parse(text);}catch{return null;}
}
async function upsertProviderStatus(env,provider,status,details,lastError=null,latencyMs=null){
 if(!env.SUPABASE_URL||!supabaseAdminKey(env))return{status:"not-configured"};
 const now=new Date().toISOString(),cfg=ECONOMIC_PROVIDER_CONFIG[provider]||{};
 const body={provider,status,last_attempt_at:now,last_success_at:["fresh","partial"].includes(status)?now:undefined,
  last_error:lastError,latency_ms:latencyMs,updated_at:now,
  details:{credentialRequired:cfg.credential||null,cadence:cfg.cadence||null,ttlSeconds:cfg.ttlSeconds||null,...(details||{}),updatedAt:now}};
 await supabaseRequest(env,"provider_status","POST","on_conflict=provider",body,"resolution=merge-duplicates,return=minimal");
 return{status:"stored"};
}
async function recordIngestionRun(env,provider,status,datasetId,requestCount,errorCode,errorMessage,details={}){
 if(!env.SUPABASE_URL||!supabaseAdminKey(env))return{status:"not-configured"};
 const completedAt=new Date().toISOString();
 try{
  await supabaseRequest(env,"ingestion_runs","POST","",{
   provider,dataset_id:datasetId||null,status,started_at:details.startedAt||completedAt,completed_at:completedAt,
   rows_received:0,rows_upserted:0,request_count:requestCount||0,error_code:errorCode||null,
   error_message:errorMessage?String(errorMessage).slice(0,500):null,details
  },"return=minimal");
  return{status:"stored"};
 }catch{return{status:"failed"};}
}
async function persistEconomicSnapshot(env,snapshot){
 if(!env.SUPABASE_URL||!supabaseAdminKey(env))return{status:"not-configured",rowsUpserted:0};
 const started=Date.now(),provider=snapshot.providerId||"unknown",records=Array.isArray(snapshot.records)?snapshot.records:[];
 let runId=null,rowsUpserted=0;
 try{
  const runRows=await supabaseRequest(env,"ingestion_runs","POST","",{
   provider,dataset_id:snapshot.datasetId,status:"running",request_count:snapshot.requestCount||1,
   details:{dataAsOf:snapshot.dataAsOf||null,sourceUrl:snapshot.sourceUrl||null}
  },"return=representation");
  runId=Array.isArray(runRows)?runRows[0]?.id:null;
  for(let i=0;i<records.length;i+=1000){
   const chunk=records.slice(i,i+1000);
   await supabaseRequest(env,"economic_observations","POST",
    "on_conflict=provider,dataset_id,series_id,frequency,observation_date",chunk,
    "resolution=merge-duplicates,return=minimal");
   rowsUpserted+=chunk.length;
  }
  const completedAt=new Date().toISOString();
  if(runId)await supabaseRequest(env,"ingestion_runs","PATCH","id=eq."+encodeURIComponent(runId),{
   status:snapshot.status==="partial"?"partial":"success",completed_at:completedAt,
   rows_received:records.length,rows_upserted:rowsUpserted,request_count:snapshot.requestCount||1,
   details:{dataAsOf:snapshot.dataAsOf||null,series:snapshot.series||[],elapsedMs:Date.now()-started}
  },"return=minimal");
  await upsertProviderStatus(env,provider,snapshot.status==="partial"?"partial":"fresh",{
   datasetId:snapshot.datasetId,dataAsOf:snapshot.dataAsOf,rows:rowsUpserted,sourceUrl:snapshot.sourceUrl,persistence:"stored"
  });
  return{status:snapshot.status==="partial"?"partial":"stored",rowsUpserted,runId};
 }catch(error){
  if(runId)try{await supabaseRequest(env,"ingestion_runs","PATCH","id=eq."+encodeURIComponent(runId),{
   status:rowsUpserted?"partial":"failed",completed_at:new Date().toISOString(),rows_received:records.length,
   rows_upserted:rowsUpserted,error_message:String(error.message||error).slice(0,500),
   details:{dataAsOf:snapshot.dataAsOf||null,elapsedMs:Date.now()-started}
  },"return=minimal");}catch{}
  try{await upsertProviderStatus(env,provider,rowsUpserted?"partial":"error",{
   datasetId:snapshot.datasetId,rowsUpserted,persistence:"failed"
  },String(error.message||error).slice(0,500),Date.now()-started);}catch{}
  return{status:"failed",rowsUpserted,runId,error:String(error.message||error).slice(0,300)};
 }
}
async function ingestEconomicProvider(provider,env,force=false){
 const cfg=ECONOMIC_PROVIDER_CONFIG[provider],started=Date.now();
  const priorState=env.SNAPSHOTS?await env.SNAPSHOTS.get("economic-provider:"+provider,"json"):null;
  if(!(cfg?.credential&&!env[cfg.credential])&&providerCircuitIsOpen(priorState,Date.now())){
   const cached=env.SNAPSHOTS?await env.SNAPSHOTS.get(economicCacheKey(provider),"json"):null;
   const lastError="Provider circuit breaker is open after repeated transient failures; retry will resume after "+priorState.circuitOpenUntil+".";
   return cached?{...cached,status:"stale",lastError,circuitOpenUntil:priorState.circuitOpenUntil}:{schemaVersion:1,provider,status:"unavailable",retrievedAt:new Date().toISOString(),dataAsOf:null,records:[],series:[],sourceUrl:null,error:lastError,circuitOpenUntil:priorState.circuitOpenUntil};
  }
 try{
  const snapshot=await fetchEconomicProvider(provider,env);
  snapshot.providerId=provider;
  if(snapshot.status==="not-configured"){
   const state={status:"not-configured",credentialRequired:snapshot.credentialRequired,lastAttemptAt:snapshot.retrievedAt,lastSuccessAt:null,
    persistenceStatus:env.SUPABASE_URL&&supabaseAdminKey(env)?"ready":"not-configured",note:snapshot.notes?.at(-1)};
   if(env.SNAPSHOTS){
    await env.SNAPSHOTS.put(economicCacheKey(provider),JSON.stringify(snapshot),{expirationTtl:Math.max(cfg.ttlSeconds,3600)});
    await env.SNAPSHOTS.put("economic-provider:"+provider,JSON.stringify(state),{expirationTtl:60*60*24*7});
   }
   await upsertProviderStatus(env,provider,"unavailable",{credentialRequired:cfg.credential,configured:false,note:state.note});
   await recordIngestionRun(env,provider,"skipped",snapshot.datasetId,0,"missing_credential",state.note,{credentialRequired:cfg.credential});
   return snapshot;
  }
  let persistence={status:"not-configured",rowsUpserted:0};
  if(env.SUPABASE_URL&&supabaseAdminKey(env))persistence=await persistEconomicSnapshot(env,snapshot);
  snapshot.persistence=persistence;
  snapshot.elapsedMs=Date.now()-started;
   const state={status:snapshot.status,lastAttemptAt:snapshot.retrievedAt,lastSuccessAt:snapshot.retrievedAt,
    dataAsOf:snapshot.dataAsOf,persistenceStatus:persistence.status,rowsStored:persistence.rowsUpserted||0,datasetId:snapshot.datasetId,...nextProviderCircuitState(priorState,"success")};
  if(env.SNAPSHOTS){
   await env.SNAPSHOTS.put(economicCacheKey(provider),JSON.stringify(snapshot),{expirationTtl:Math.max(cfg.ttlSeconds*2,3600)});
   await env.SNAPSHOTS.put("economic-provider:"+provider,JSON.stringify(state),{expirationTtl:60*60*24*7});
  }
  return snapshot;
 }catch(error){
  const previous=env.SNAPSHOTS?await env.SNAPSHOTS.get(economicCacheKey(provider),"json"):null;
  const lastError=String(error.message||error).slice(0,300);
  const circuitState=nextProviderCircuitState(priorState,"failure");
  const state={status:previous?"stale":"unavailable",lastAttemptAt:new Date().toISOString(),lastSuccessAt:previous?.retrievedAt||null,
   persistenceStatus:env.SUPABASE_URL&&supabaseAdminKey(env)?"ready":"not-configured",lastError,...circuitState};
  if(env.SNAPSHOTS)await env.SNAPSHOTS.put("economic-provider:"+provider,JSON.stringify(state),{expirationTtl:60*60*24*7});
  try{await upsertProviderStatus(env,provider,previous?"stale":"error",{datasetId:previous?.datasetId||null},lastError,Date.now()-started);}catch{}
  await recordIngestionRun(env,provider,"failed",previous?.datasetId||null,1,"provider_request_failed",lastError,{elapsedMs:Date.now()-started});
  return previous?{...previous,status:"stale",lastError}:{
   schemaVersion:1,provider,status:"unavailable",retrievedAt:new Date().toISOString(),dataAsOf:null,records:[],series:[],sourceUrl:null,
   error:"Economic data provider request failed",details:state
  };
 }
}
async function scheduledEconomicIngestion(env){
 if(!env.SNAPSHOTS)return;
 const jobs=Object.entries(ECONOMIC_PROVIDER_CONFIG);
 await Promise.allSettled(jobs.map(async([provider,cfg])=>{
  const previous=await env.SNAPSHOTS.get(economicCacheKey(provider),"json");
  const at=Date.parse(previous?.retrievedAt||"");
  if(!Number.isFinite(at)||Date.now()-at>cfg.ttlSeconds*1000)return await ingestEconomicProvider(provider,env,false);
  return{status:"fresh-cache"};
 }));
}

async function refreshNews(env){
 if(!env.SNAPSHOTS)return;
 const checkedAt=new Date().toISOString();
 const previous=await env.SNAPSHOTS.get(NEWS_KEY,"json")||{articles:[]};
 let fresh=null,error=null;
 try{fresh=await fetchGdelt(GDELT_QUERY);}catch(cause){error=cause;}
 const articles=fresh?dedupe(fresh.articles).slice(0,100):[];
 const status=fresh?"fresh":(previous.articles?.length?"stale":"unavailable");
  const next={schemaVersion:1,provider:"GDELT DOC API",status,generatedAt:fresh?checkedAt:previous.generatedAt||null,lastCheckedAt:checkedAt,queryCount:1,successfulQueries:fresh?1:0,articles:articles.length?articles:(previous.articles||[]),lastError:error?String(error.message||error).slice(0,180):null,notes:["One consolidated 72-hour query is used to respect GDELT's request-rate guidance.","GDELT is a broad news-discovery index, not a complete newswire.","GDELT output attribution: cite and link https://www.gdeltproject.org/about.html; rights to underlying publisher content remain separate.","seendate is GDELT indexing/seen time and may differ from publisher publication time.","Headlines are leads for verification, not trading signals."]};
 await env.SNAPSHOTS.put(NEWS_KEY,JSON.stringify(next),{expirationTtl:60*60*24*3});
 await env.SNAPSHOTS.put(PROVIDER_STATE_KEY,JSON.stringify({status,lastCheckedAt:checkedAt,successfulQueries:fresh?1:0,queryCount:1,articleCount:next.articles.length,lastError:next.lastError}),{expirationTtl:60*60*24*7});
 if(env.SUPABASE_URL&&supabaseAdminKey(env)&&next.articles.length){
  const rows=next.articles.map(a=>({provider:"GDELT DOC API",title:a.title,url:a.url,domain:a.domain,topic:a.topic,retrieved_at:checkedAt,data_as_of:checkedAt,freshness_status:status,payload:a}));
  const endpoint=env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/news_items?on_conflict=provider,url";
  const write=await fetch(endpoint,{method:"POST",headers:{...supabaseApiHeaders(env),"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
  if(!write.ok)console.error("Supabase news upsert failed",write.status);
 }
}

async function persistCotRows(snapshot,env){
 if(!env.SUPABASE_URL||!supabaseAdminKey(env))return{status:"not-configured",persistedRows:0,note:"Supabase COT persistence needs server-side URL and secret configuration."};
 const eligible=(snapshot.normalizedRows||[]).filter(row=>row.contractMarketCode&&row.marketName&&/^\d{4}-\d{2}-\d{2}/.test(String(row.positionDate||"")));
 if(!eligible.length)return{status:"no-data",persistedRows:0,note:"No rows with source-native CFTC market code, market name and report date were available to persist."};
 const records=eligible.map(row=>({
  provider_id:"cftc-pre",
  report_family:row.reportFamily,
  report_variant:row.reportVariant,
  contract_market_code:row.contractMarketCode,
  cftc_market_code:row.cftcMarketCode,
  commodity_code:row.commodityCode,
  market_name:row.marketName,
  market_and_exchange_names:row.marketAndExchangeNames,
  report_date:String(row.positionDate).slice(0,10),
  published_at:null,
  retrieved_at:row.retrievedAt,
  open_interest:row.openInterest,
  trader_category:row.traderCategory,
  long_contracts:row.long,
  short_contracts:row.short,
  spreading_contracts:row.spread,
  unit:row.unit,
  source_url:row.sourceUrl,
  source_field_mapping:row.sourceFieldMapping,
  source_fields:row.sourceNativeFields,
  schema_version:1,
  quality_status:row.qualityStatus
 }));
 const endpoint=env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/cot_report_observations?on_conflict=report_family,report_variant,contract_market_code,report_date,trader_category";
 let persistedRows=0;
 try{
  for(let i=0;i<records.length;i+=400){
   const response=await fetch(endpoint,{method:"POST",headers:{...supabaseApiHeaders(env),"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(records.slice(i,i+400)),signal:AbortSignal.timeout(18000)});
   if(!response.ok)return{status:persistedRows?"partial":"unavailable",persistedRows,failureStatus:response.status,error:"COT upsert failed; raw provider data was not logged."};
   persistedRows+=Math.min(400,records.length-i);
  }
  return{status:"fresh",persistedRows};
 }catch(error){return{status:persistedRows?"partial":"unavailable",persistedRows,error:String(error.message||error).slice(0,180)};}
}

async function fetchCot(report,variant="futures-only",market="",contractMarketCode="",env={}){
 const dataset=COT_DATASETS[report]?.[variant==="combined"?"combined":"futures_only"];
 if(!dataset)throw new Error("Unsupported CFTC report family or variant");
 const u=new URL("https://publicreporting.cftc.gov/resource/"+dataset.id+".json");
 u.searchParams.set("$select",cotSourceColumns(report).join(","));
 u.searchParams.set("$limit","156");
 u.searchParams.set("$order","report_date_as_yyyy_mm_dd DESC");
 if(contractMarketCode){
  u.searchParams.set("$where","cftc_contract_market_code = '"+contractMarketCode+"'");
 }else if(market){
  const term=market.toUpperCase().replace(/'/g,"''");
  u.searchParams.set("$where","upper(contract_market_name) like '%"+term+"%' OR upper(market_and_exchange_names) like '%"+term+"%'");
 }
 const response=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"FinanceIntelligenceOS/1.2 public research"},signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw new Error("CFTC PRE "+response.status);
 const rows=await response.json();if(!Array.isArray(rows))throw new Error("CFTC PRE response was not an array");
 const dates=rows.map(r=>r.report_date_as_yyyy_mm_dd||r.report_date).filter(Boolean).map(value=>String(value).slice(0,10)).sort();
 const retrievedAt=new Date().toISOString();
 const snapshot={schemaVersion:2,status:"fresh",provider:"CFTC Public Reporting Environment",report,reportName:COT_DATASETS[report].label+" · "+dataset.label,variant,reportVariant:variant,dataAsOf:dates.at(-1)||null,positionDate:dates.at(-1)||null,publishedAt:null,publicationTimestampStatus:"not-provided-per-row-by-cftc-dataset",retrievedAt,sourceUrl:dataset.sourceUrl,scheduleUrl:"https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm",frequency:"weekly",unit:"contracts",access:"public CFTC PRE API; report variant is explicit",rows,normalizedRows:normalizeCotRows(rows,{report,variant,retrievedAt,sourceUrl:dataset.sourceUrl})};
 snapshot.persistence=await persistCotRows(snapshot,env);
 return snapshot;
}
const BLS_SERIES=[
 {id:"CUUR0000SA0",label:"CPI-U · All items",unit:"Index (1982-84=100)",marketContext:"Inflation context; not a tradable price."},
 {id:"CUUR0000SA0L1E",label:"CPI-U · All items less food and energy",unit:"Index (1982-84=100)",marketContext:"Core consumer-price index."},
 {id:"LNS14000000",label:"Unemployment rate",unit:"Percent",marketContext:"US labour-market context."},
 {id:"CES0000000001",label:"Total nonfarm payroll employment",unit:"Thousands of jobs",marketContext:"US employment context; seasonally adjusted series."},
 {id:"WPUFD4",label:"PPI · Final demand",unit:"Index (Nov 2009=100)",marketContext:"Producer-price inflation context."}
];
async function fetchBls(env){
 const year=new Date().getUTCFullYear();
 const registered=Boolean(env.BLS_API_KEY);
 const body={seriesid:BLS_SERIES.map(s=>s.id),startyear:String(year-4),endyear:String(year)};
 if(registered)body.registrationkey=env.BLS_API_KEY;
 const endpoint=registered?"https://api.bls.gov/publicAPI/v2/timeseries/data/":"https://api.bls.gov/publicAPI/v1/timeseries/data/";
 let data=null,lastError=null;
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
   if(!response.ok){
    const error=new Error("BLS HTTP "+response.status);
    if(response.status===429)error.rateLimited=true;
    throw error;
   }
   data=await response.json();
   if(data.status!=="REQUEST_SUCCEEDED"){
    const message=String(data.message?.[0]||data.status).slice(0,180);
    const error=new Error("BLS request failed: "+message);
    if(/daily threshold|too many requests|query limit|requests allocated/i.test(message))error.rateLimited=true;
    throw error;
   }
   lastError=null;break;
  }catch(error){
   lastError=error;
   if(error.rateLimited)break;
   if(attempt===0)await new Promise(resolve=>setTimeout(resolve,700));
  }
 }
 if(lastError||!data)throw lastError||new Error("BLS returned no response");
 const byId=new Map((data.Results?.series||[]).map(s=>[s.seriesID,s.data||[]]));
 const series=BLS_SERIES.map(meta=>({...meta,observations:(byId.get(meta.id)||[]).filter(o=>/^M\d{2}$/.test(o.period||"")).slice(0,36).map(o=>({year:o.year,period:o.period,periodName:o.periodName,value:Number(o.value),footnotes:o.footnotes||[]}))}));
 const periods=series.flatMap(s=>s.observations.slice(0,1).map(o=>String(o.year)+"-"+o.period)).sort();
 return{schemaVersion:1,status:"fresh",provider:"US Bureau of Labor Statistics Public Data API "+(registered?"v2":"v1"),retrievedAt:new Date().toISOString(),dataAsOf:periods.at(-1)||null,access:registered?"registered API v2; up to 500 daily queries":"unregistered API v1; up to 25 daily queries",series,notes:["BLS returns published historical series, not live market prices.","Series definitions and units are distinct; do not compare different index bases.","BLS data do not replace the issuer release calendar or timestamps.",registered?"Registered API v2 is authenticated by a server-side Worker secret.":"Configure BLS_API_KEY in Cloudflare Worker secrets to use registered API v2 and its higher daily query limit."]};
}

async function fetchGdelt(spec){
 const u=new URL("https://api.gdeltproject.org/api/v2/doc/doc");
 u.searchParams.set("query",spec.query);u.searchParams.set("mode","ArtList");u.searchParams.set("format","json");u.searchParams.set("maxrecords","100");u.searchParams.set("sort","DateDesc");u.searchParams.set("timespan","72h");
  const response=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"FinanceIntelligenceOS/1.0 public research"},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error("GDELT "+response.status);
  const data=await response.json(),retrievedAt=new Date().toISOString();return{articles:(data.articles||[]).map(a=>normalizeArticle(a,spec.label,retrievedAt)).filter(Boolean)};
}
function normalizeArticle(a,topic,retrievedAt=new Date().toISOString()){
 try{const u=new URL(a.url);if(!["http:","https:"].includes(u.protocol))return null;const title=String(a.title||"").replace(/\s+/g," ").trim();if(!title)return null;const cleanTitle=title.slice(0,800),providerSeenAt=String(a.seendate||"").slice(0,40)||null,instruments=matchMarketIds(cleanTitle),topicTags=classifyNewsTopics(cleanTitle),relevance=keywordRelevanceScore(cleanTitle,instruments,topicTags),canonicalUrl=u.href;return{data_type:"news_discovery_item",title:cleanTitle,url:canonicalUrl,canonical_url:canonicalUrl,publisher:String(a.domain||u.hostname).slice(0,255),published_at:null,event_at:null,retrieved_at:retrievedAt,source_id:"gdelt-doc",provider_id:"gdelt-doc",provider_seen_at:providerSeenAt,language:String(a.language||"").slice(0,30)||null,source_country:String(a.sourceCountry||"").slice(0,80)||null,topic_tags:topicTags,instrument_tags:instruments,relevance_score:relevance.score,relevance_method:relevance.method,verification_status:"unverified",duplicate_cluster_id:"url:"+canonicalUrl.toLowerCase().replace(/\/$/,""),topic,markets:instruments,seendate:providerSeenAt,domain:String(a.domain||u.hostname).slice(0,255)};}catch{return null;}
}
function dedupe(rows){const seen=new Set();return rows.filter(a=>{const key=String(a.url||"").replace(/\/$/,"").toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>String(b.seendate).localeCompare(String(a.seendate)));}

const MARKET_KEYWORDS=[
  ["nq",["nasdaq","nq futures","nasdaq-100","technology stocks"]],
  ["es",["s&p 500","s&p futures","sp500","e-mini s&p"]],
 ["ym",["dow jones","dow futures","djia"]],
 ["rty",["russell 2000","russell futures"]],
 ["gc",["gold","bullion","comex gold"]],
 ["si",["silver","comex silver"]],
 ["cl",["crude oil","wti","brent","nymex crude"]],
 ["zn",["treasury futures","10-year yield","10 year treasury","bond yields","sofr"]],
 ["6e",["euro","eur/usd","ecb"]],
 ["6b",["british pound","sterling","gbp/usd","bank of england"]],
 ["6j",["japanese yen","boj","usd/jpy"]],
 ["dx",["us dollar","dollar index","dxy","broad dollar"]],
 ["6a",["australian dollar","australia dollar","rba","reserve bank of australia","australian cpi","australian jobs"]],
 ["6c",["canadian dollar","canada dollar","bank of canada","boc decision","canadian cpi","canadian jobs"]],
  ["btc",["bitcoin futures","cme bitcoin","bitcoin etf flows","bitcoin regulation","digital asset regulation"]]
];
function matchMarketIds(text){const value=String(text||"").toLowerCase();return MARKET_KEYWORDS.filter(([,words])=>words.some(word=>value.includes(word))).map(([id])=>id);}
function parseArray(value){if(Array.isArray(value))return value;if(typeof value==="string"){try{const v=JSON.parse(value);return Array.isArray(v)?v:[];}catch{return[];}}return[];}
async function fetchNyFedFunding(){
 const u="https://markets.newyorkfed.org/api/rates/all/latest.json";
 const response=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"FinanceIntelligenceOS/1.1 public research"},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error("NY Fed Markets API "+response.status);
 const data=await response.json();const raw=Array.isArray(data.refRates)?data.refRates:[];
 const rates=raw.filter(r=>["SOFR","EFFR","OBFR","TGCR","BGCR","SOFRAI"].includes(String(r.type||""))).map(r=>({type:String(r.type),effectiveDate:r.effectiveDate||null,percentRate:Number.isFinite(Number(r.percentRate))?Number(r.percentRate):null,average30day:Number.isFinite(Number(r.average30day))?Number(r.average30day):null,average90day:Number.isFinite(Number(r.average90day))?Number(r.average90day):null,average180day:Number.isFinite(Number(r.average180day))?Number(r.average180day):null,volumeInBillions:Number.isFinite(Number(r.volumeInBillions))?Number(r.volumeInBillions):null}));
 return{schemaVersion:1,status:rates.length?"fresh":"unavailable",provider:"Federal Reserve Bank of New York Markets Data API",retrievedAt:new Date().toISOString(),dataAsOf:rates.map(r=>r.effectiveDate).filter(Boolean).sort().at(-1)||null,access:"public reference-rate API; no API key",rates,sourceUrl:u,notes:["Official NY Fed reference rates are published on US business days and are not exchange futures quotes.","The effective date is distinct from the retrieval timestamp; reference rates may reflect the prior business day.","Use of NY Fed reference rates is subject to the NY Fed terms and rate-specific disclaimers."]};
}

async function fetchPolymarket(){
 const u=new URL("https://gamma-api.polymarket.com/events");u.searchParams.set("active","true");u.searchParams.set("closed","false");u.searchParams.set("limit","100");u.searchParams.set("order","volume_24hr");u.searchParams.set("ascending","false");
 const response=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"FinanceIntelligenceOS/1.1 public research"},signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw new Error("Polymarket Gamma "+response.status);
 const data=await response.json();if(!Array.isArray(data))throw new Error("Polymarket Gamma response was not an array");
 const items=data.map(event=>({title:String(event.title||event.question||"Untitled event"),slug:String(event.slug||""),url:event.slug?"https://polymarket.com/event/"+event.slug:"https://polymarket.com",volume:asFiniteNumber(event.volume),volume24hr:asFiniteNumber(event.volume24hr),liquidity:asFiniteNumber(event.liquidity),endDate:event.endDate||event.endDateIso||null,markets:parseArray(event.markets).slice(0,8).map(m=>({question:String(m.question||m.groupItemTitle||""),slug:String(m.slug||""),outcomes:parseArray(m.outcomes),outcomePrices:parseArray(m.outcomePrices).map(Number),volume:Number(m.volume||0),liquidity:Number(m.liquidity||0),active:m.active!==false,closed:Boolean(m.closed),clobTokenIds:parseArray(m.clobTokenIds)}))})).filter(item=>item.title);
 return{schemaVersion:1,provider:"Polymarket Gamma API",status:"fresh",retrievedAt:new Date().toISOString(),dataAsOf:null,access:"public read-only API; no key required",items,notes:["Gamma event volume/liquidity and outcomePrices are venue-reported metadata, not CME/ICE futures prices.","Outcome prices are indicative probabilities and may be stale or thinly traded.","No wallet, order-entry or execution endpoints are connected."]};
}
async function fetchKalshi(){
 const u=new URL("https://external-api.kalshi.com/trade-api/v2/markets");u.searchParams.set("status","open");u.searchParams.set("limit","100");u.searchParams.set("mve_filter","exclude");
 const response=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"FinanceIntelligenceOS/1.1 public research"},signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw new Error("Kalshi public markets "+response.status);
 const data=await response.json();if(!Array.isArray(data.markets))throw new Error("Kalshi response did not include markets");
 const items=data.markets.map(m=>({title:String(m.title||m.subtitle||m.ticker||"Untitled market"),ticker:String(m.ticker||""),eventTicker:String(m.event_ticker||""),yesBid:Number(m.yes_bid_dollars??m.yes_bid??NaN),yesAsk:Number(m.yes_ask_dollars??m.yes_ask??NaN),lastPrice:Number(m.last_price_dollars??m.last_price??NaN),volume24h:asFiniteNumber(m.volume_24h_fp??m.volume_24h),volume:asFiniteNumber(m.volume_fp??m.volume),liquidity:asFiniteNumber(m.liquidity_dollars),closeTime:m.close_time||m.expected_expiration_time||null,updatedAt:m.updated_time||null,url:"https://kalshi.com/markets"})).filter(item=>item.ticker&&item.title);
 return{schemaVersion:1,provider:"Kalshi public Trade API v2",status:"fresh",retrievedAt:new Date().toISOString(),dataAsOf:null,access:"public read-only market-data endpoint; no key required",items,notes:["YES bid/ask and volume are Kalshi event-contract data, not exchange futures prices.","Displayed market probabilities are venue-specific and may be thinly traded.","No portfolio, wallet or order-entry endpoints are connected."]};
}

async function getPublisherSchedule(env,key,loader,metadata){
 const now=Date.now();
 let snapshot=await env.SNAPSHOTS.get(key,"json");
 const retryAt=Date.parse(snapshot?.retry_at||"");
 if(Number.isFinite(retryAt)&&retryAt>now){
  const hasSnapshot=Boolean(snapshot&&Array.isArray(snapshot.events)&&Number.isFinite(Date.parse(snapshot.retrieved_at||"")));
  const cached={...snapshot,status:hasSnapshot?"stale":"unavailable"};
  return{snapshot:cached,status:hasSnapshot?200:502,retryAfter:Math.max(1,Math.ceil((retryAt-now)/1000))};
 }
 const retrievedAt=Date.parse(snapshot?.retrieved_at||"");
 if(snapshot?.status==="fresh"&&Number.isFinite(retrievedAt)&&now-retrievedAt<=30*60*1000)return{snapshot,status:200};
 try{
  snapshot=await loader();
  await env.SNAPSHOTS.put(key,JSON.stringify(snapshot),{expirationTtl:60*60*8});
  return{snapshot,status:200};
 }catch(error){
  const errorCode=classifyPublisherScheduleFailure(error);
  console.warn("publisher_schedule_refresh_failed",{publisher_id:metadata.publisher_id||null,error_code:errorCode});
  const retry_at=new Date(now+5*60*1000).toISOString();
  const hasSnapshot=Boolean(snapshot&&Array.isArray(snapshot.events)&&Number.isFinite(Date.parse(snapshot.retrieved_at||"")));
  const failure=hasSnapshot
   ?{...snapshot,status:"stale",last_error:`${metadata.provider} refresh failed; showing the last successful publisher snapshot.`,last_error_code:errorCode,retry_at}
   :{schema_version:1,data_type:"official_economic_release_schedule",status:"unavailable",...metadata,retrieved_at:null,data_as_of:null,event_count:0,events:[],error:metadata.error,error_code:errorCode,retry_at};
  await env.SNAPSHOTS.put(key,JSON.stringify(failure),{expirationTtl:60*60});
  return{snapshot:failure,status:hasSnapshot?200:502,retryAfter:300};
 }
}

function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff",...headers}});}
