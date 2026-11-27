(() => {
 const cfg=window.FINANCE_OS_CONFIG||{};
 const API=String(cfg.apiBase||window.FINANCE_OS_API_BASE||"").replace(/\/$/,"");
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const num=v=>{if(v===null||v===undefined||(typeof v==="string"&&v.trim()===""))return null;const n=Number(v);return Number.isFinite(n)?n:null;};
 const fmt=v=>num(v)===null?"—":Number(v).toLocaleString("en-US",{maximumFractionDigits:2});
 const money=v=>num(v)===null?"—":"$"+Number(v).toLocaleString("en-US",{maximumFractionDigits:0});
 const state={markets:[],selected:new URLSearchParams(location.search).get("market")||"nq",tier:"ALL",cot:"tff",news:[],allNews:[],macro:null,providers:{news:"checking",macro:"checking",nyfed:"checking",cot:"checking"}};
 async function api(path){if(!API)throw new Error("API gateway is not configured");const res=await fetch(API+path,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(18000)});if(!res.ok)throw new Error(path+" returned "+res.status);return res.json();}
 function clock(){const d=new Date();$("fiClock").textContent=new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone:"Asia/Kolkata"}).format(d)+" IST";$("fiDate").textContent=new Intl.DateTimeFormat("en-US",{weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(d); }
 function setOverall(){const statuses=Object.values(state.providers);const checked=statuses.filter(x=>x!=="checking").length;const responding=statuses.filter(x=>["fresh","partial","stale","cached"].includes(x)).length;const fresh=statuses.filter(x=>x==="fresh").length;const total=statuses.length;const label=checked===0?"Checking feeds":checked<total?checked+"/"+total+" checked · "+responding+" responding":responding+"/"+total+" feeds responding"+(fresh<total?" · "+(total-fresh)+" not fresh":"");$("fiOverallStatus").textContent=label;$("fiOverallStatus").className=responding===total&&fresh===total?"":"state-neutral";$("fiLastChecked").textContent=new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});}
 function setProvider(name,status){state.providers[name]=String(status||"unknown").toLowerCase();setOverall();}
 const marketContextNode = $("publicMarketContext");
 const marketContexts = marketContextNode ? JSON.parse(marketContextNode.textContent).families : {};
 function loadMarkets(){return fetch("/ict-futures/data/market-universe.json").then(r=>{if(!r.ok)throw Error("market universe unavailable");return r.json();}).then(d=>{state.markets=d.markets||[];$("fiCountContracts").textContent=state.markets.length;renderMarkets();selectMarket(state.selected);}).catch(()=>{$("fiContractGrid").innerHTML='<div class="fi-empty">Could not load contract filters. Use the Markets page for direct profile links.</div>';});}
 function renderMarkets(){const q=($("fiContractSearch").value||"").toLowerCase();const visible=state.markets.filter(m=>(state.tier==="ALL"||m.tier===state.tier)&&[m.id,m.label,m.exchange,m.role,...(m.drivers||[])].join(" ").toLowerCase().includes(q));$("fiContractGrid").innerHTML=visible.map(m=>{const code=(m.label.match(/·\s*([^·]+)/)||[])[1]||m.id.toUpperCase();return '<button class="fi-contract-card '+(m.id===state.selected?"selected":"")+'" data-market="'+esc(m.id)+'" aria-pressed="'+String(m.id===state.selected)+'"><div class="fi-contract-top"><b class="fi-contract-code">'+esc(code.split("/")[0].trim())+'</b><span class="fi-tier '+String(m.tier||"").toLowerCase()+'">'+esc(m.tier||"")+'</span></div><span class="fi-contract-name">'+esc(m.label)+'</span><p class="fi-contract-role">'+esc(m.role||"Futures research profile")+'</p><span class="fi-contract-foot"><span>'+esc(m.exchange||"Exchange")+'</span><span>Inspect →</span></span></button>';}).join("")||'<div class="fi-empty">No matching contract families.</div>';}
 function selectMarket(id){const m=state.markets.find(x=>x.id===id)||state.markets.find(x=>x.id==="nq")||state.markets[0];if(!m)return;state.selected=m.id;renderMarkets();$("fiSelectedTitle").textContent=m.label;$("fiSelectedRole").textContent=m.role||"";const context=$("fiSelectedContext");if(context)context.textContent=marketContexts[m.id]?.summary||"Market context unavailable.";$("fiSelectedSpecs").href=m.specsUrl||"https://www.cmegroup.com/";$("fiSpecLine").textContent=m.unit||"See official contract specification";$("fiMicroLine").textContent=m.micro||"Micro contract not specified";$("fiDrivers").innerHTML=(m.drivers||[]).map(x=>'<span class="fi-chip">'+esc(x)+'</span>').join("");$("fiRelated").innerHTML=(m.related||[]).map(x=>'<span class="fi-chip">'+esc(x)+'</span>').join("");$("fiProfile").textContent=m.profile||"No profile notes available.";$("fiTerminalLink").href="/ict-futures/markets/"+m.id+".html";renderNews();loadCot();}
 function renderNews(){let rows=state.allNews;if(state.selected){const picked=rows.filter(a=>(a.markets||[]).includes(state.selected));if(picked.length)rows=picked;else{const m=state.markets.find(x=>x.id===state.selected);const terms=[m?.id,m?.label?.split("·")[0],...(m?.news||[])].filter(Boolean).map(x=>String(x).toLowerCase());rows=rows.filter(a=>terms.some(t=>(a.title+" "+(a.topic||"")).toLowerCase().includes(t)));}}rows=rows.slice(0,22);$("fiNewsList").innerHTML=rows.map(a=>'<a class="fi-news-item" href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer"><div class="fi-news-title">'+esc(a.title)+'</div><div class="fi-news-meta"><span>'+esc(a.domain||"Source")+'</span><span>'+esc(a.topic||"Futures")+'</span><span>'+esc(a.seendate||"Indexed time unavailable")+'</span></div></a>').join("")||'<div class="fi-empty">No direct headlines matched this contract in the current snapshot. Broaden the market selection or check publisher sources.</div>';$("fiNewsCount").textContent=rows.length+" items"; }
 async function loadNews(force=false){$("fiNewsList").innerHTML='<div class="fi-loading">Checking GDELT discovery…</div>';try{const d=await api("/api/v1/news"+(force?"?refresh=1":""));state.allNews=d.articles||[];const status=d.status||"unavailable";const refreshStatus=d.refresh?.status||"not-requested";const displayStatus=force&&refreshStatus==="queued"?"REFRESH QUEUED":force&&refreshStatus==="cooldown"?"RECENTLY CHECKED":force&&refreshStatus==="in-progress"?"REFRESH IN PROGRESS":status.toUpperCase();$("fiNewsStatus").textContent=displayStatus;$("fiNewsStatus").className="fi-status-pill "+(status==="fresh"?"fresh":status==="stale"?"stale":"");$("fiNewsStatus").title="Retrieved "+(d.lastCheckedAt||"timestamp not available")+" · refresh "+refreshStatus;renderNews();setProvider("news",status);if(force&&refreshStatus==="queued")setTimeout(()=>loadNews(false),6000);}catch(e){$("fiNewsStatus").textContent="UNAVAILABLE";$("fiNewsList").innerHTML='<div class="fi-empty fi-error">News API unavailable. Use the official publisher links and retry later.</div>';setProvider("news","unavailable");}}
 async function loadMacro(){try{const d=await api("/api/v1/macro");state.macro=d;$("fiMacroGrid").innerHTML=(d.series||[]).map(s=>{const o=(s.observations||[]).slice(0,1)[0];return '<div class="fi-macro-card"><span>'+esc(s.label)+'</span><strong>'+esc(o?fmt(o.value):"—")+'</strong><small>'+esc(o?o.periodName+" "+o.year:"No observations")+' · '+esc(s.unit||"")+'</small></div>';}).join("")||'<div class="fi-empty">No macro observations returned.</div>';setProvider("macro",d.status||"unknown");}catch(e){$("fiMacroGrid").innerHTML='<div class="fi-empty fi-error">BLS API unavailable. See official data at bls.gov.</div>';setProvider("macro","unavailable");}}
 async function loadFunding(){try{const d=await api("/api/v1/macro/funding");const rows=d.rates||[];const labels={SOFR:"Secured Overnight Financing Rate",EFFR:"Effective Federal Funds Rate",OBFR:"Overnight Bank Funding Rate",TGCR:"Tri-Party General Collateral Rate",BGCR:"Broad General Collateral Rate",SOFRAI:"SOFR averages / index"};$("fiRatesGrid").innerHTML=rows.map(r=>{const value=r.percentRate!==null&&r.percentRate!==undefined?r.percentRate:(r.average30day!==null&&r.average30day!==undefined?r.average30day:null);const title=labels[r.type]||r.type;return '<div class="fi-rate-card"><span>'+esc(r.type)+' · '+esc(title)+'</span><strong>'+(value===null?"—":fmt(value)+"%")+'</strong><small>'+esc(r.effectiveDate||d.dataAsOf||"date unavailable")+(r.volumeInBillions!==null&&r.volumeInBillions!==undefined?" · $"+fmt(r.volumeInBillions)+"bn volume":"")+'</small></div>';}).join("")||'<div class="fi-empty">No reference rates returned.</div>';setProvider("nyfed",d.status||"unknown");}catch(e){$("fiRatesGrid").innerHTML='<div class="fi-empty fi-error">New York Fed feed unavailable. Official source remains accessible from the links above.</div>';setProvider("nyfed","unavailable");}}
 let latestCotRequest = 0;
 async function loadCot() {
  const request = ++latestCotRequest;
  const rowsBody = $("fiCotRows");
  const status = $("fiCotStatus");
  const asOf = $("fiCotAsOf");
  rowsBody.innerHTML = '<tr><td colspan="7">Loading CFTC report…</td></tr>';
  status.textContent = "LOADING";
  status.className = "fi-status-pill";
  asOf.textContent = "Report date —";
  try {
   const market = state.markets.find(item => item.id === state.selected);
   const query = market ? market.label.split("·")[0].replace(/E-mini|Micro/ig, "").trim() : state.selected;
   const data = await api("/api/v1/cot?report=" + state.cot + (query ? "&q=" + encodeURIComponent(query) : ""));
   if (request !== latestCotRequest) return;
   $("fiCotProvider").textContent = data.provider || "CFTC";
   asOf.textContent = "Latest report date " + (data.position_date || data.dataAsOf || "not supplied");
   status.textContent = (data.status || "unknown").toUpperCase();
   status.classList.toggle("fresh", data.status === "fresh");
   status.classList.toggle("stale", data.status === "stale");
   const rows = Array.isArray(data.normalizedRows) ? data.normalizedRows.slice(0, 30) : [];
   rowsBody.innerHTML = rows.map(row => {
    const label = [row.marketName || row.contractName, row.contractMarketCode].filter(Boolean).join(" · ");
    return '<tr><td>' + esc(label || "Market not supplied") + '</td><td>' +
      esc(row.positionDate || row.reportDate || "Date not supplied") + '</td><td>' +
      esc(row.traderCategory || "Category unavailable") + '</td><td>' +
      fmt(row.long) + '</td><td>' + fmt(row.short) + '</td><td>' + fmt(row.net) + '</td><td>' +
      fmt(row.openInterest) + '</td></tr>';
   }).join("") || '<tr><td colspan="7">No normalized trader-category rows matched this contract/report. Verify the report dataset and source fields.</td></tr>';
   setProvider("cot", data.status || "unknown");
  } catch {
   if (request !== latestCotRequest) return;
   status.textContent = "UNAVAILABLE";
   rowsBody.innerHTML = '<tr><td colspan="7">CFTC public data temporarily unavailable. Check the official source below.</td></tr>';
   setProvider("cot", "unavailable");
  }
 }
  $("fiContractSearch").addEventListener("input",renderMarkets);$("fiContractGrid").addEventListener("click",e=>{const b=e.target.closest("[data-market]");if(b)selectMarket(b.dataset.market);});$("fiTierFilters").addEventListener("click",e=>{const b=e.target.closest("[data-tier]");if(!b)return;state.tier=b.dataset.tier;$("fiTierFilters").querySelectorAll("[data-tier]").forEach(button=>{
    const active=button===b;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });renderMarkets();});$("fiRefreshNews").addEventListener("click",()=>loadNews(true));document.querySelectorAll("[data-cot]").forEach(b=>b.addEventListener("click",()=>{state.cot=b.dataset.cot;document.querySelectorAll("[data-cot]").forEach(x=>x.classList.toggle("active",x===b));loadCot();}));
 clock();setInterval(clock,1000);loadMarkets();loadNews();loadMacro();loadFunding();
})();