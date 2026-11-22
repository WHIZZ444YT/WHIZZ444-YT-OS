(() => {
 const grid=document.getElementById('newsGrid'),state=document.getElementById('newsState'),btn=document.getElementById('refreshNews');
 if(!grid)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const valid=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
 const base=String(window.FINANCE_OS_CONFIG?.apiBase||window.FINANCE_OS_API_BASE||'').replace(/\/$/,'');
 const byId=id=>document.getElementById(id);
 const contract=byId('newsInstrument'), preset=new URLSearchParams(location.search).get('market');
 if(contract && [...contract.options].some(option=>option.value===preset)) contract.value=preset;
 const knownPublishers=new Map();
 let pollHandle=null;
 function timeLabel(value){
  if(!value)return 'not supplied';
  const raw=String(value),match=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(raw);
  const iso=match?`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`:raw;
  const date=new Date(iso);return Number.isFinite(date.getTime())?date.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):raw;
 }
 function fillPublishers(items){
  const select=byId('newsPublisher');if(!select)return;
  for(const item of items){const name=item.publisher||item.domain;if(name)knownPublishers.set(name.toLowerCase(),name);}
  const selected=select.value;
  select.innerHTML='<option value="">All publishers in snapshot</option>'+[...knownPublishers.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([key,label])=>'<option value="'+esc(key)+'">'+esc(label)+'</option>').join('');
  select.value=selected;
 }
 function render(data,statusSuffix=''){
  const items=Array.isArray(data.articles)?data.articles:[];fillPublishers(items);
  grid.innerHTML=items.length?items.map(a=>{
   const topic=(a.topic_tags||[]).join(' · ')||'Unclassified';
   const contracts=(a.instrument_tags||a.markets||[]).map(x=>x.toUpperCase()).join(', ')||'No contract tag';
   const seen=a.provider_seen_at||a.seendate;
   return '<article class="news-card"><div class="news-meta">'+esc(a.publisher||a.domain||'Publisher unavailable')+' · '+esc(topic)+'</div><h3><a href="'+esc(valid(a.canonical_url||a.url))+'" target="_blank" rel="noopener noreferrer">'+esc(a.title)+'</a></h3><p>Contracts: '+esc(contracts)+' · Keyword relevance: '+esc(a.relevance_score??'not scored')+' (heuristic)</p><p>Publisher time: '+esc(timeLabel(a.published_at))+' · GDELT seen: '+esc(timeLabel(seen))+'</p><p>Fetched: '+esc(timeLabel(a.retrieved_at))+' · Verification: '+esc(a.verification_status||'unverified')+'</p></article>';
  }).join(''):'<p class="muted">No headlines match this filter in the current discovery snapshot. This does not mean there were no market events.</p>';
  const cache=data.cache_age_seconds===null||data.cache_age_seconds===undefined?'unknown':Math.floor(data.cache_age_seconds/60)+' min';
  state.textContent='Returned '+items.length+' of '+(data.articleCount??items.length)+' record(s) · '+(data.status||'unknown')+' · fetched '+timeLabel(data.retrieved_at||data.lastCheckedAt)+' · cache age '+cache+(statusSuffix?' · '+statusSuffix:'')+' · sorted by GDELT seen time; publisher publication time is not supplied consistently.';
 }
 function queryParams(force=false){
  const params=new URLSearchParams();
  const instrument=byId('newsInstrument')?.value,topic=byId('newsTopic')?.value||'all',publisher=byId('newsPublisher')?.value,hours=Number(byId('newsTime')?.value||72);
  if(instrument)params.set('instrument',instrument);
  if(topic&&topic!=='all')params.set('topic',topic);
  if(publisher)params.set('publisher',publisher);
  if(hours<72)params.set('since',new Date(Date.now()-hours*3600000).toISOString());
  params.set('limit','100');params.set('sort','provider_seen_desc');
  if(force)params.set('refresh','1');
  return params;
 }
 async function loadSnapshot(force=false){
  if(!base)throw new Error('API gateway is not configured.');
  const response=await fetch(base+'/api/v1/news?'+queryParams(force),{headers:{Accept:'application/json'},cache:'no-store'});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error?.message||'News gateway HTTP '+response.status);
  return payload;
 }
 async function loadSources(){
  const label=byId('newsSourceStatus');if(!label)return;
  if(!base){label.textContent='GDELT source registry unavailable: API gateway is not configured.';return;}
  try{
   const response=await fetch(base+'/api/v1/news/sources',{headers:{Accept:'application/json'},cache:'no-store'}),payload=await response.json();
   const source=payload.sources?.[0];
   label.textContent=source?`${source.publisher} · ${source.state} · last checked ${timeLabel(source.last_checked)} · rights: ${source.terms_status} · ${source.known_limitations.join(' ')}`:'No configured news collector source.';
  }catch{label.textContent='News source registry could not be reached. The displayed snapshot may be stale.';}
 }
 async function loadAndRender(){try{render(await loadSnapshot());}catch(error){grid.innerHTML='<p class="muted">News API unavailable.</p>';state.textContent=error.message;}}
 for(const id of ['newsInstrument','newsTopic','newsPublisher','newsTime'])byId(id)?.addEventListener('change',loadAndRender);
 btn?.addEventListener('click',async()=>{
  if(btn.disabled)return;
  btn.disabled=true;btn.textContent='Queuing refresh…';state.textContent='Requesting a controlled GDELT refresh; the saved snapshot remains visible.';
  try{
   const d=await loadSnapshot(true);render(d,'refresh '+(d.refresh?.status||'unknown'));
   btn.textContent=d.refresh?.status==='cooldown'?'Recently checked':'Refresh queued';
   if(d.refresh?.status==='queued'||d.refresh?.status==='in-progress'){
    let attempts=0;pollHandle=setInterval(async()=>{
     attempts++;try{const next=await loadSnapshot(false);render(next);if(attempts>=8||next.lastCheckedAt!==d.lastCheckedAt){clearInterval(pollHandle);btn.disabled=false;btn.textContent='Refresh snapshot';loadSources();}}
     catch{if(attempts>=8){clearInterval(pollHandle);btn.disabled=false;btn.textContent='Refresh snapshot';}}
    },5000);
   }else{btn.disabled=false;btn.textContent='Refresh snapshot';loadSources();}
  }catch(error){state.textContent=error.message;btn.disabled=false;btn.textContent='Retry refresh';}
 });
 if(btn)btn.textContent='Refresh snapshot';
 loadAndRender();loadSources();
})();
