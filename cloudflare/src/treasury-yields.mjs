export const treasuryYieldSource = "https://home.treasury.gov/treasury-daily-interest-rate-xml-feed";
const endpoint = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml";
const curves = {
  nominal: { feed:"daily_treasury_yield_curve", prefix:"BC", tenors:[2,5,10,30] },
  real: { feed:"daily_treasury_real_yield_curve", prefix:"TC", tenors:[5,10,30] }
};
const maxBytes = 2 * 1024 * 1024;

export function parseTreasuryYields(xml, curve) {
  const config = Object.hasOwn(curves,curve) ? curves[curve] : null;
  if (!config || /<!DOCTYPE|<!ENTITY/i.test(xml) || !/<feed[\s>]/i.test(xml) || !/<\/feed>\s*$/i.test(xml)) {
    throw new Error("Unsupported Treasury XML");
  }
  const rows = new Map();
  for (const [,properties] of xml.matchAll(/<m:properties(?:\s[^>]*)?>([\s\S]*?)<\/m:properties>/gi)) {
    const field = name => new RegExp("<d:"+name+"(?:\\s[^>]*)?>([^<]*)</d:"+name+">","i").exec(properties)?.[1].trim();
    const date = field("NEW_DATE")?.slice(0,10);
    const parsed = Date.parse(date+"T00:00:00Z");
    if (!date || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0,10)!==date) continue;
    const rates = {};
    for (const tenor of config.tenors) {
      const value = field(config.prefix+"_"+tenor+"YEAR");
      rates[tenor] = /^-?\d+(?:\.\d+)?$/.test(value||"") && Number.isFinite(Number(value)) ? Number(value) : null;
    }
    rows.set(date,rates);
  }
  if (![...rows.values()].some(rates=>Object.values(rates).some(Number.isFinite))) {
    throw new Error("Treasury curve contains no usable dated observations");
  }
  const records=[];
  for (const [date,rates] of rows) {
    const add = (id, label, value, unit) => records.push({
      provider:"treasury-yield",dataset_id:config.feed,series_id:curve+":"+id,
      series_name:label,country_code:"US",frequency:"daily",observation_date:date,
      value,unit,data_as_of:date,published_at:null,vintage_start:null,vintage_end:null,
      source_url:treasuryYieldSource,freshness_status:"fresh"
    });
    for (const tenor of config.tenors) add(tenor+"Y",tenor+"Y yield",rates[tenor],"Percent");
    for (const [high,low] of [[10,2],[30,5]]) {
      if (!config.tenors.includes(low)) continue;
      const spread = Number.isFinite(rates[high])&&Number.isFinite(rates[low])
        ? Math.round((rates[high]-rates[low])*10000)/100 : null;
      add(high+"Y-"+low+"Y",high+"Y–"+low+"Y",spread,"Basis points");
    }
  }
  return records;
}

async function readBounded(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Treasury body unavailable");
  const decoder = new TextDecoder();
  let total=0, xml="";
  for (;;) {
    const {done,value}=await reader.read();
    if (done) return xml+decoder.decode();
    total+=value.byteLength;
    if (total>maxBytes) {
      await reader.cancel();
      throw new Error("Treasury XML exceeds limit");
    }
    xml+=decoder.decode(value,{stream:true});
  }
}

export async function fetchTreasuryYields(fetchImpl=fetch, now=new Date()) {
  const entries=Object.entries(curves);
  const results=await Promise.allSettled(entries.map(async ([curve,config])=>{
    const url=new URL(endpoint);
    url.search=new URLSearchParams({data:config.feed,field_tdr_date_value:String(now.getUTCFullYear())});
    const response=await fetchImpl(url,{redirect:"error",signal:AbortSignal.timeout(12000),headers:{Accept:"application/atom+xml, application/xml, text/xml"}});
    if(!response.ok)throw new Error("Treasury curve unavailable");
    return parseTreasuryYields(await readBounded(response),curve);
  }));
  const records=results.flatMap(result=>result.status==="fulfilled"?result.value:[]);
  if(!records.length)throw new Error("Treasury curves unavailable");
  return {records,status:results.every(result=>result.status==="fulfilled")?"fresh":"partial",requestCount:entries.length};
}
