(() => {
 const cfg=window.FINANCE_OS_CONFIG||{};
 const API=String(cfg.apiBase||window.FINANCE_OS_API_BASE||"").replace(/\/$/,"");
 const $=id=>document.getElementById(id);
 const number=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;};
 const fmt=v=>v===null?"—":Number(v).toLocaleString("en-US",{maximumFractionDigits:0});
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const contracts=[
  {id:"nq",name:"Nasdaq-100 E-mini / Micro",report:"tff",query:"NASDAQ",exchange:"CME"},
  {id:"es",name:"S&P 500 E-mini / Micro",report:"tff",query:"S&P 500",exchange:"CME"},
  {id:"gc",name:"Gold / Micro Gold",report:"disaggregated",query:"GOLD",exchange:"COMEX"},
  {id:"cl",name:"WTI Crude Oil",report:"disaggregated",query:"CRUDE OIL",exchange:"NYMEX"},
  {id:"6e",name:"Euro FX",report:"tff",query:"EURO FX",exchange:"CME"},
  {id:"6b",name:"British Pound",report:"tff",query:"BRITISH POUND",exchange:"CME"},
  {id:"ym",name:"E-mini Dow",report:"tff",query:"DJIA STOCKS",exchange:"CBOT"},
  {id:"rty",name:"E-mini Russell 2000",report:"tff",query:"RUSSELL 2000",exchange:"CME"},
  {id:"dx",name:"US Dollar Index",report:"tff",query:"U.S. DOLLAR INDEX",exchange:"ICE"},
  {id:"zn",name:"10-Year Treasury Note",report:"tff",query:"UST 10Y NOTE",exchange:"CBOT"},
  {id:"6j",name:"Japanese Yen",report:"tff",query:"JAPANESE YEN",exchange:"CME"},
  {id:"6a",name:"Australian Dollar",report:"tff",query:"AUSTRALIAN DOLLAR",exchange:"CME"},
  {id:"6c",name:"Canadian Dollar",report:"tff",query:"CANADIAN DOLLAR",exchange:"CME"},
  {id:"si",name:"Silver",report:"disaggregated",query:"SILVER",exchange:"COMEX"},
  {id:"btc",name:"CME Bitcoin",report:"tff",query:"BITCOIN",exchange:"CME"}
 ];
 const roots={nq:"NQ",es:"ES",gc:"GC",cl:"CL","6e":"6E","6b":"6B",ym:"YM",rty:"RTY",dx:"DX",zn:"ZN","6j":"6J","6a":"6A","6c":"6C",si:"SI",btc:"BTC"};
 let observations=[],selectedContract=contracts[0],selectedName="",selectedCode="",history=[],exchangeRequest=0,cotRequest=0,expiryTimer;
 function message(text,kind="neutral"){$("voiState").textContent=text;$("voiState").className="data-message "+kind;}
 function api(path){if(!API)throw new Error("Finance OS API gateway is not configured.");return fetch(API+path,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(18000),cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("CFTC gateway returned HTTP "+r.status);return r.json();});}
 function marketSelect(){const s=$("voiMarket");s.innerHTML=contracts.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' · '+c.exchange+'</option>').join("");}
 function contractRows(){
  const key=$("voiInstrument"), markets=[...new Map(observations.map(row=>[row.contractMarketCode||row.marketName,row]).filter(([id])=>id)).values()];
  key.innerHTML=markets.map(row=>{const id=row.contractMarketCode||row.marketName,label=[row.marketName,row.contractMarketCode?"CFTC "+row.contractMarketCode:"source code unavailable",row.exchangeMarketName].filter(Boolean).join(" · ");return '<option value="'+esc(id)+'">'+esc(label)+'</option>';}).join("");
  const first=markets[0];selectedName=first?.marketName||"";selectedCode=first?.contractMarketCode||"";
  $("voiMarketName").textContent=selectedName+(selectedCode?" · CFTC "+selectedCode:"")||"No matching CFTC market label";
 }
 function toRows(){
  const name=selectedName;
  const seen=new Set();
  return observations.filter(r=>selectedCode?r.contractMarketCode===selectedCode:r.marketName===name).map(r=>({date:r.reportDate,oi:number(r.openInterest)})).filter(r=>r.date&&r.oi!==null).filter(r=>{if(seen.has(r.date))return false;seen.add(r.date);return true;}).sort((a,b)=>a.date.localeCompare(b.date));
 }
 const defaultSource="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm";
 function clearMetrics(dateMessage, coverage="—"){
  $("voiLatest").textContent="—";
  $("voiAsOf").textContent=dateMessage;
  $("voiChange").textContent="—";
  $("voiChange").className="metric-value";
  $("voiRange").textContent=coverage;
 }
 function renderChart(){
  history=toRows().slice(-26);
  const chart=$("voiChart");
  if(!history.length){
   clearMetrics("No report date available","0 weekly observations");
   chart.innerHTML='<div class="empty-state">No historical open-interest observations were returned for this specific CFTC market label. Try another report type or contract.</div>';
   $("voiTable").innerHTML='<tr><td colspan="4">No weekly open-interest observations for this selection.</td></tr>';
   return;
  }
  const max=Math.max(...history.map(x=>x.oi)),min=Math.min(...history.map(x=>x.oi)),range=Math.max(1,max-min);
  chart.innerHTML=history.map((x,i)=>{
   const height=Math.max(6,((x.oi-min)/range)*88+12);
   return '<div class="oi-bar-col" title="'+esc(x.date)+' · '+fmt(x.oi)+' contracts"><span>'+fmt(x.oi)+'</span><i style="height:'+height+'%"></i><small>'+esc(x.date.slice(5))+'</small></div>';
  }).join("");
  const latest=history.at(-1),previous=history.at(-2),delta=previous?latest.oi-previous.oi:null;
  $("voiLatest").textContent=fmt(latest.oi);
  $("voiAsOf").textContent="Report date "+latest.date;
  $("voiChange").textContent=delta===null?"—":(delta>0?"+":"")+fmt(delta);
  $("voiChange").className=delta===null?"metric-value":delta>0?"metric-value positive":delta<0?"metric-value negative":"metric-value";
  $("voiRange").textContent=history.length+" weekly observations";
  $("voiTable").innerHTML=history.slice().reverse().map((x,i,arr)=>{
   const prior=arr[i+1],change=prior?x.oi-prior.oi:null;
   return '<tr><td>'+esc(x.date)+'</td><td>'+fmt(x.oi)+'</td><td>'+(change===null?"—":(change>0?"+":"")+fmt(change))+'</td><td>'+esc(selectedName)+'</td></tr>';
  }).join("");
 }
 async function load(){
  const requestId=++cotRequest;
  observations=[];
  history=[];
  clearMetrics("Waiting for report date");
  $("voiSource").href=defaultSource;
  $("voiRetrieved").textContent="Retrieval pending";
  $("voiCount").textContent="— rows";
  $("voiStatus").textContent="LOADING";
  $("voiStatus").className="status-pill warn";
  $("voiInstrument").innerHTML='<option>Loading contract rows…</option>';
  $("voiInstrument").disabled=true;
  $("voiTable").innerHTML='<tr><td colspan="4">Loading CFTC observations…</td></tr>';
  selectedContract=contracts.find(x=>x.id===$("voiMarket").value)||contracts[0];
  loadAuthorizedExchangeObservations(selectedContract);
  const variant=$("voiVariant").value;
  $("voiReport").textContent=(selectedContract.report==="tff"?"CFTC TFF":"CFTC Disaggregated")+" · "+(variant==="combined"?"Futures and Options Combined":"Futures Only");
  $("voiMarketName").textContent="Loading CFTC market rows…";
  $("voiChart").innerHTML='<div class="loading-state">Loading weekly open-interest history…</div>';
  message("Requesting the latest public CFTC report for "+selectedContract.name+"…");
  try{
   const d=await api("/api/v1/volume-open-interest?report="+selectedContract.report+"&variant="+variant+"&q="+encodeURIComponent(selectedContract.query));
   if(requestId!==cotRequest)return;
   observations=Array.isArray(d.observations)?d.observations:[];
   $("voiSource").href=d.source_url||defaultSource;
   contractRows();
   $("voiInstrument").disabled=!observations.length;
   $("voiStatus").textContent=(d.status||"unknown").toUpperCase();
   $("voiStatus").className="status-pill "+(d.status==="fresh"?"good":d.status==="stale"?"warn":"bad");
   $("voiRetrieved").textContent="Retrieved "+(d.retrievedAt||"timestamp unavailable")+" · data as of "+(d.dataAsOf||"unknown");
   $("voiCount").textContent=observations.length+" weekly observations";
   if(!observations.length){message("The CFTC query returned no weekly open-interest observations. No values have been substituted. Check the official dataset and selected market label.","warn");}
   else {message("CFTC weekly open interest loaded. Exchange volume is shown separately when approved rows are available.","good");}
   renderChart();
  }catch(e){
   if(requestId!==cotRequest)return;
   $("voiTable").innerHTML='<tr><td colspan="4">No CFTC observations loaded.</td></tr>';
   $("voiCount").textContent="— rows";
   observations=[];$("voiInstrument").innerHTML='<option>No data</option>';$("voiStatus").textContent="UNAVAILABLE";$("voiStatus").className="status-pill bad";
   $("voiChart").innerHTML='<div class="empty-state">CFTC data could not be retrieved. Use the official report link to inspect the dataset.</div>';
   clearMetrics("No report date available");
   $("voiRetrieved").textContent="Retrieval unavailable";
   $("voiMarketName").textContent="CFTC market label unavailable";
   message(e.message,"bad");
  }
 }
 async function loadAuthorizedExchangeObservations(contract){
  const state=$("exchangeObservationState"),body=$("exchangeObservationRows");
  if(!state||!body)return;
  const requestId=++exchangeRequest;
  clearTimeout(expiryTimer);
  const volumeStatus=$("exchangeVolumeAvailability"),volumeNote=$("exchangeVolumeNote");
  if(volumeStatus)volumeStatus.textContent="Not connected";
  if(volumeNote)volumeNote.textContent="No approved exchange-volume observations are configured";
  const root=roots[contract?.id];
  if(!root){state.textContent="No canonical listed-contract root is mapped for this selection.";state.className="data-message warn";return;}
  if(!API){state.textContent="Approved exchange observations are unavailable because the data gateway is not configured.";state.className="data-message warn";body.innerHTML='<tr><td colspan="7">No public-display-approved exchange data is available.</td></tr>';return;}
  state.textContent="Checking public-display-approved observations for "+root+"…";state.className="data-message";
  body.innerHTML='<tr><td colspan="7">Loading approved observations…</td></tr>';
  try{
   const month=$("exchangeObservationMonth").value.trim();
   const results=await Promise.allSettled(["daily_volume","open_interest"].map(async type=>{
    const params=new URLSearchParams({root,type,limit:"100"});
    if(month)params.set("contractMonth",month);
    const response=await fetch(API+"/api/v1/futures-observations?"+params,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(18000),cache:"no-store"});
    if(!response.ok)throw new Error("Exchange data request failed.");
    const data=await response.json();
    return (Array.isArray(data.observations)?data.observations:[]).filter(row=>row.observation_type===type);
   }));
   if(requestId!==exchangeRequest)return;
   const available=results.flatMap(result=>result.status==="fulfilled"?result.value:[]);
   const revisions=new Map();
   for(const row of available){
    if(row.public_display_valid_until&&!(Date.parse(row.public_display_valid_until)>Date.now()))continue;
    const key=JSON.stringify([row.provider_id,row.venue,row.exchange_instrument_id,row.contract_month,row.observation_type,row.interval_code,row.observed_at,row.delay_class]);
    // The gateway orders equal observations by data-as-of and retrieval, newest version first.
    if(!revisions.has(key))revisions.set(key,row);
   }
   const rows=[...revisions.values()].sort((a,b)=>String(b.observed_at||"").localeCompare(String(a.observed_at||""))).slice(0,50);
   const partial=results.some(result=>result.status==="rejected");
   const volumeAvailable=rows.some(row=>row.observation_type==="daily_volume");
   if(volumeStatus)volumeStatus.textContent=volumeAvailable?"Approved history":"Not connected";
   if(volumeNote)volumeNote.textContent=volumeAvailable?"Public-display-approved daily volume is available; intraday bars are not shown in this table.":"No approved exchange-volume observations are configured.";
   if(!rows.length){state.textContent=partial?"Some or all exchange data could not be loaded. Use the official exchange links.":"No approved exchange observations match "+root+(month?" "+month:"")+".";state.className="data-message warn";body.innerHTML='<tr><td colspan="7">No approved exchange rows for this futures root.</td></tr>';return;}
   state.textContent=rows.length+" approved exchange observations returned for "+root+". Check each provider delay class and data-as-of value."+(partial?" Some metrics could not be loaded.":"");state.className="data-message good";
   body.innerHTML=rows.map(row=>{
    const value=row.observation_type==="daily_volume"?number(row.volume):number(row.open_interest);
    const unit=row.observation_type==="daily_volume"?(row.volume_unit||"unit unavailable"):"contracts";
    let source="Source unavailable";
    try{const url=new URL(String(row.source_url||""));if(url.protocol==="https:")source='<a href="'+esc(url.href)+'" target="_blank" rel="noopener noreferrer">Open source ↗</a>';}catch{}
    return '<tr><td>'+esc([row.exchange_instrument_id,row.contract_month,row.venue].filter(Boolean).join(" · ")||"—")+'</td><td>'+esc(row.observation_type==="daily_volume"?"Daily volume":"Open interest")+'</td><td>'+esc(row.interval_code||"—")+'</td><td>'+esc(row.data_as_of||"—")+'</td><td>'+fmt(value)+(value===null?"":" "+esc(unit))+'</td><td>'+esc(row.delay_class||"unknown")+'</td><td>'+esc(row.provider_id||"Provider unavailable")+' · '+source+'</td></tr>';
   }).join("");
   const oldestApproval=Math.min(...rows.map(row=>row.public_display_valid_until?Date.parse(row.public_display_valid_until):Infinity));
   function hideExpiredRows(){
    if(requestId!==exchangeRequest)return;
    const remaining=oldestApproval-Date.now();
    if(remaining>0){
     expiryTimer=setTimeout(hideExpiredRows,Math.min(remaining,2147483647));
     return;
    }
    state.textContent="A display approval expired. Refresh to check current approved observations.";
    state.className="data-message warn";
    body.innerHTML='<tr><td colspan="7">Approval expired.</td></tr>';
    volumeStatus.textContent="Recheck required";
    volumeNote.textContent="Refresh to check approved exchange volume.";
   }
   if(Number.isFinite(oldestApproval))hideExpiredRows();
  }catch(error){if(requestId!==exchangeRequest)return;state.textContent="Approved exchange data could not be reached. "+String(error?.message||"Check the data gateway.");state.className="data-message warn";body.innerHTML='<tr><td colspan="7">No approved exchange observations were loaded.</td></tr>';}
 }
 const exchangeFilters=$("exchangeObservationFilters");
 exchangeFilters.hidden=false;
 exchangeFilters.addEventListener("submit",event=>{event.preventDefault();loadAuthorizedExchangeObservations(selectedContract);});
 marketSelect();
 $("voiMarket").addEventListener("change",load);
 $("voiVariant").addEventListener("change",load);
 $("voiInstrument").addEventListener("change",()=>{const selected=$("voiInstrument").selectedOptions[0];selectedCode=/^[A-Za-z0-9]{3,12}$/.test(selected?.value||"")?selected.value:"";selectedName=selected?.textContent||"";$("voiMarketName").textContent=selectedName;renderChart();});
 $("voiRefresh").addEventListener("click",load);
 load();
})();
