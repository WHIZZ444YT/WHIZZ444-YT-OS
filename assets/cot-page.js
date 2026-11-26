(() => {
 const $=id=>document.getElementById(id),table=$("cotRows");
 if(!table)return;
 const searchMode=$("cotSearchMode"),reportSelect=$("cotReport"),variantSelect=$("cotVariant"),search=$("cotSearch"),refresh=$("cotRefresh"),searchButton=$("cotApplySearch"),marketSelect=$("cotMarket"),categorySelect=$("cotCategory"),exportButton=$("cotExport"),chart=$("cotChart");
 const state=$("cotState"),meta=$("cotMeta"),count=$("cotCount");
 let rows=[],payload=null,requestNumber=0;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const number=v=>v===null||v===undefined||v===""||!Number.isFinite(Number(v))?"—":Number(v).toLocaleString(undefined,{maximumFractionDigits:0});
 const percent=v=>v===null||v===undefined||!Number.isFinite(Number(v))?"—":`${Number(v).toFixed(2)}%`;
 function setState(text,kind="neutral"){state.textContent=text;state.className="muted cot-state "+kind;}
 function syncSearchControls(){const ready=search.value.trim().length>=3,busy=refresh.dataset.busy==="true";refresh.disabled=busy||!ready;searchButton.disabled=busy||!ready;}
 function marketKey(row){return row.contractMarketCode||"";}
 function filteredRows(){
  const market=marketSelect.value,category=categorySelect.value;
  return rows.filter(row=>(!market||marketKey(row)===market)&&(!category||row.traderCategory===category));
 }
 function refreshOptions(){
  const currentMarket=marketSelect.value,currentCategory=categorySelect.value;
  const markets=[...new Map(rows.map(row=>[marketKey(row),row]).filter(([key])=>key)).values()];
  marketSelect.innerHTML='<option value="">All returned markets</option>'+markets.map(row=>`<option value="${esc(marketKey(row))}">${esc(row.marketName||"Unnamed market")}${row.contractMarketCode?` · CFTC ${esc(row.contractMarketCode)}`:""}</option>`).join("");
  if(markets.some(row=>marketKey(row)===currentMarket))marketSelect.value=currentMarket;
  const categories=[...new Set(rows.map(row=>row.traderCategory).filter(Boolean))];
  categorySelect.innerHTML='<option value="">All categories</option>'+categories.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join("");
  if(categories.includes(currentCategory))categorySelect.value=currentCategory;
 }
 function csvCell(value){return '"'+String(value??"").replace(/"/g,'""')+'"';}
 function exportCsv(){
  const selected=filteredRows();
  const fields=["provider","reportFamily","reportVariant","marketName","contractMarketCode","cftcMarketCode","reportDate","publishedAt","publicationTimestampStatus","retrievedAt","traderCategory","openInterest","long","short","spread","net","longChange","shortChange","netChange","netPercentOfOpenInterest","unit","sourceUrl"];
  const csv=[fields.map(csvCell).join(","),...selected.map(row=>fields.map(field=>csvCell(row[field])).join(","))].join("\r\n");
  const blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=`cftc-${payload?.report_family||"cot"}-${payload?.report_variant||"futures-only"}-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);
 }
 function renderChart(){
  const market=marketSelect.value,category=categorySelect.value;
  if(!market||!category){chart.innerHTML='<span class="empty-state">Choose one CFTC market and trader category to display its net-position history.</span>';chart.setAttribute("aria-label","COT net-position history. Choose a market and category.");return;}
  const series=rows.filter(row=>marketKey(row)===market&&row.traderCategory===category&&Number.isFinite(row.net)&&row.reportDate).sort((a,b)=>String(a.reportDate).localeCompare(String(b.reportDate))).slice(-52);
  if(!series.length){chart.innerHTML='<span class="empty-state">No complete long and short observations are available for this selection.</span>';chart.setAttribute("aria-label","No complete net-position observations for this selection.");return;}
  const values=series.map(row=>Number(row.net)),maxAbs=Math.max(1,...values.map(Math.abs)),w=920,h=220,pad=20,base=h/2,step=(w-pad*2)/series.length,barWidth=Math.max(2,step*.62);
  const bars=series.map((row,i)=>{const value=Number(row.net),barHeight=Math.max(1,Math.abs(value)/maxAbs*(base-pad));const x=pad+i*step+(step-barWidth)/2,y=value>=0?base-barHeight:base;const color=value>=0?"#23866d":"#b85e53";return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${color}"><title>${esc(row.reportDate)} · ${esc(row.marketName)} · ${esc(category)} · net ${number(value)} contracts</title></rect>`;}).join("");
  const first=series[0],last=series.at(-1),marketRow=series.at(-1),marketLabel=`${marketRow.marketName||"CFTC market"}${marketRow.contractMarketCode?` · CFTC ${marketRow.contractMarketCode}`:""}`,reportLabel=payload?.report_name||payload?.report_family||"CFTC COT";
  const label=`${marketLabel}; ${reportLabel}; ${category}; ${series.length} reported observations from ${first.reportDate} to ${last.reportDate}; latest net ${number(last.net)} contracts`;
  chart.innerHTML=`<div class="cot-chart-head"><b>${esc(marketLabel)}</b><span>${esc(reportLabel)} · ${esc(category)} · net contracts</span></div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><line x1="${pad}" y1="${base}" x2="${w-pad}" y2="${base}" stroke="#9aabba" stroke-width="1"/>${bars}</svg><div class="cot-chart-foot"><span>${esc(first.reportDate)} → ${esc(last.reportDate)} · CFTC PRE</span><b>Position date ${esc(last.reportDate)} · Latest net ${number(last.net)} contracts</b><span>Green: positive · Red: negative</span></div>`;
  chart.setAttribute("aria-label",label);
 }
 function render(){
  const selected=filteredRows();
  count.textContent=`${selected.length.toLocaleString()} of ${rows.length.toLocaleString()} normalized category rows`;
  table.innerHTML=selected.slice(0,500).map(row=>`<tr><td>${esc(row.marketName||"—")}${row.contractMarketCode?`<small class="cot-code">CFTC ${esc(row.contractMarketCode)}</small>`:""}</td><td>${esc(row.positionDate||"—")}</td><td>${esc(row.traderCategory||"—")}</td><td>${number(row.openInterest)}</td><td>${number(row.long)}</td><td>${number(row.short)}</td><td>${number(row.spread)}</td><td>${number(row.net)}</td><td>${number(row.netChange)}${row.priorReportDate?`<small class="cot-code">vs ${esc(row.priorReportDate)}</small>`:""}</td><td>${percent(row.netPercentOfOpenInterest)}</td><td>${row.netPercentile?`${percent(row.netPercentile.value)}<small class="cot-code">n=${number(row.netPercentile.count)} · ${esc(row.netPercentile.from)} → ${esc(row.netPercentile.to)}</small>`:"—"}</td></tr>`).join("")||'<tr><td colspan="11">No matching CFTC category rows. Missing positions are not substituted with zero.</td></tr>';
  if(selected.length>500)table.insertAdjacentHTML("beforeend",`<tr><td colspan="11">Showing 500 rows. Export includes all ${selected.length.toLocaleString()} filtered rows.</td></tr>`);
  exportButton.disabled=!selected.length;
  renderChart();
 }
 async function load(){
  const id=++requestNumber;
  const term=search.value.trim();
  if(term.length<3){
   delete refresh.dataset.busy;refresh.textContent="Refresh CFTC data";
   rows=[];payload=null;refreshOptions();render();
   meta.textContent="Select a market to see the report date, retrieval time and source.";
   setState("Enter at least 3 characters from a CFTC market name, or an exact contract-market code, then search.");
   syncSearchControls();
   return;
  }
  rows=[];payload=null;render();
  refresh.dataset.busy="true";syncSearchControls();refresh.textContent="Loading CFTC…";setState("Requesting the selected official CFTC dataset. No private account information is involved.");
  try{
   const api=(window.FINANCE_OS_CONFIG?.apiBase||"").replace(/\/$/,"");if(!api)throw new Error("Cloudflare API endpoint is not configured.");
   const params=new URLSearchParams({report:reportSelect.value,variant:variantSelect.value});
   if(searchMode.value==="code")params.set("contract_market_code",term.toUpperCase());else params.set("q",term);
   const response=await fetch(`${api}/api/v1/cot?${params}`,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(20000)});
   const data=await response.json();if(!response.ok)throw new Error(data.error?.message||data.error||`CFTC API returned HTTP ${response.status}`);
   if(id!==requestNumber)return;
   payload=data;rows=(Array.isArray(data.normalizedRows)?data.normalizedRows:[]).filter(row=>row.reportFamily===params.get("report")&&row.reportVariant===params.get("variant"));refreshOptions();render();
   const publication=data.published_at?new Date(data.published_at).toLocaleString():"not supplied by the CFTC dataset";
   meta.textContent=`Report: ${data.report_name||data.report_family} · Variant: ${data.report_variant||variantSelect.value} · Position date: ${data.position_date||"unknown"} · Published: ${publication} · Retrieved: ${data.retrieved_at?new Date(data.retrieved_at).toLocaleString():"unknown"} · Provider: ${data.status||"unknown"} · Database persistence: ${data.persistence?.status||"not reported"}`;
   $("cotSchedule").href=data.schedule_url||"https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm";
   $("cotDataset").href=data.source_url||"https://publicreporting.cftc.gov/stories/s/r4w3-av2u";
   setState(`${data.provider||"CFTC"} · ${data.report_name||data.report_family} · ${rows.length.toLocaleString()} normalized category rows. Position date and retrieval time are separate; per-row publication timestamp is not supplied.`,data.status==="fresh"?"good":data.status==="stale"?"warn":"bad");
  }catch(error){if(id!==requestNumber)return;rows=[];payload=null;refreshOptions();render();meta.textContent="CFTC data is unavailable. No values have been substituted.";setState(`${error.message} Use the official CFTC dataset link as fallback.`,"bad");}
  finally{if(id===requestNumber){delete refresh.dataset.busy;refresh.textContent="Refresh CFTC data";syncSearchControls();}}
 }
 [reportSelect,variantSelect,searchMode].forEach(element=>element.addEventListener("change",load));
 search.addEventListener("input",syncSearchControls);
 searchButton.addEventListener("click",load);search.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();load();}});
 refresh.addEventListener("click",load);marketSelect.addEventListener("change",render);categorySelect.addEventListener("change",render);exportButton.addEventListener("click",exportCsv);
 load();
})();
