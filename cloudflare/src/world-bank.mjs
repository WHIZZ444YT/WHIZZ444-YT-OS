import { fetchJsonWithRetry } from "./provider-http.mjs";

export const worldBankSource = "https://data.worldbank.org/";
const countries = ["USA","IND","DEU","JPN"];
const indicators = {
  "NY.GDP.MKTP.CD": ["GDP (current US dollars)","Current USD"],
  "NY.GDP.MKTP.KD.ZG": ["Real GDP growth","Annual percent"],
  "FP.CPI.TOTL.ZG": ["Consumer price inflation","Annual percent"],
  "NE.TRD.GNFS.ZS": ["Goods and services trade","Percent of GDP"]
};

export function approvedWorldBankSeries(env) {
  const requested = new Set(String(env.WORLD_BANK_APPROVED_INDICATORS||"").split(",").map(id=>id.trim()));
  return Object.keys(indicators).filter(id=>requested.has(id));
}

export async function fetchWorldBank(env, fetchImpl=fetch, now=new Date()) {
  const ids=approvedWorldBankSeries(env);
  const end=now.getUTCFullYear(), start=end-8;
  let requestCount=0;
  const results=await Promise.allSettled(ids.map(async indicator=>{
    const url=new URL("https://api.worldbank.org/v2/country/"+countries.join(";")+"/indicator/"+indicator);
    url.search=new URLSearchParams({source:"2",format:"json",date:start+":"+end,per_page:"25"});
    const records=new Map();
    let pages=1;
    let truncated=false;
    for(let page=1;page<=pages;page++){
      url.searchParams.set("page",String(page));
      requestCount++;
      const payload=await fetchJsonWithRetry(url,"World Bank",{fetchImpl,retries:0,timeoutMs:10000});
      if(!Array.isArray(payload?.[1])||Number(payload[0]?.page)!==page||!Number.isInteger(Number(payload[0]?.pages))){
        throw new Error("Unexpected WDI page metadata");
      }
      truncated ||= Number(payload[0].pages)>2;
      pages=Math.min(2,Number(payload[0].pages));
      for(const row of payload[1]){
        const country=row.countryiso3code, year=Number(row.date);
        if(row.indicator?.id!==indicator||!countries.includes(country)||!/^\d{4}$/.test(row.date)||year<start||year>end)continue;
        const [label,unit]=indicators[indicator];
        const date=String(year)+"-01-01";
        records.set(country+":"+year,{
          provider:"world-bank",dataset_id:"WDI",series_id:indicator+":"+country,series_name:label,
          country_code:country,frequency:"annual",observation_date:date,data_as_of:date,
          value:Number.isFinite(row.value)?row.value:null,unit,published_at:null,vintage_start:null,vintage_end:null,
          source_url:"https://data.worldbank.org/indicator/"+indicator,freshness_status:"fresh"
        });
      }
    }
    if(!records.size)throw new Error("No WDI observations returned");
    return {records:[...records.values()],truncated};
  }));
  const records=results.flatMap(result=>result.status==="fulfilled"?result.value.records:[]);
  if(!records.length)throw new Error("World Bank observations unavailable");
  return {records,requestCount,status:results.every(result=>result.status==="fulfilled"&&!result.value.truncated)?"fresh":"partial"};
}
