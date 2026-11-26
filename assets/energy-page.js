(() => {
 const series = document.getElementById("energySeries");
 if (!series) return;
 const api=String(window.FINANCE_OS_CONFIG?.apiBase||"").replace(/\/$/,"");
 const state=document.getElementById("energyState");
 const schedule=document.getElementById("energySchedule");
 const rows = [
  ["PET.WCESTUS1.W","Crude stocks excluding SPR","Thousand barrels","https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=WCESTUS1"],
  ["PET.WCRFPUS2.W","Crude production","Thousand barrels per day","https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=WCRFPUS2"],
  ["NG.NW2_EPG0_SWO_R48_BCF.W","Lower 48 working gas storage","Billion cubic feet","https://www.eia.gov/dnav/ng/hist/nw2_epg0_swo_r48_bcfw.htm"]
 ];
 const append=(parent,tag,text)=>{
  const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;
 };
 const format=value=>Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:3}):"Unavailable";
 const formatET=ms=>new Intl.DateTimeFormat("en-US",{
  timeZone:"America/New_York",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"
 }).format(ms);
 async function request(path){
  if(!api)throw new Error("Gateway unavailable");
  const response=await fetch(api+path,{signal:AbortSignal.timeout(12000),cache:"no-store"});
  const payload=await response.json();
  if(!response.ok&&payload.status!=="not-configured")throw new Error("Snapshot unavailable");
  return payload;
 }
 function observations(data){
  series.replaceChildren();
  for(const [id,label,unit,source] of rows){
   const card=document.createElement("article");
   card.className="economic-provider-card";
   append(card,"h3",label);
   const history=(data?.records||[]).filter(record=>record.series_id===id)
    .sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)));
   const latest=history[0];
   append(card,"p",format(latest?.value)+" · "+unit);
   append(card,"p","Observation week ending: "+(latest?.observation_date||"Unavailable"));
   const prior=latest&&history.find(row=>Date.parse(latest.observation_date)-Date.parse(row.observation_date)===604800000);
   const change=Number.isFinite(latest?.value)&&Number.isFinite(prior?.value)?latest.value-prior.value:null;
   append(card,"p","Weekly change: "+format(change)+(change===null?"":" "+unit));
   append(card,"p","Publication timestamp: "+(latest?.published_at||"Unavailable"));
   if(history.length){
    const details=append(card,"details","");
    append(details,"summary","Recent observations");
    const list=append(details,"ul","");
    for(const row of history.slice(0,8))append(list,"li",row.observation_date+" · "+format(row.value));
   }
   append(card,"a","Official EIA series").href=source;
   series.append(card);
  }
  state.textContent=data?.status==="not-configured"?"EIA API key is not configured. Official reports remain available.":
   data?"EIA snapshot: "+data.status+" · Retrieved "+(data.retrievedAt||"Unavailable"):"EIA observations unavailable. Use the official series links.";
 }
 observations(null);
 request("/api/v1/economic/eia").then(observations).catch(()=>observations(null));
 request("/api/v1/events/eia").then(data=>{
  const event=(data.events||[]).filter(row=>row.schedule_status!=="cancelled"&&Date.parse(row.scheduled_at_utc)>Date.now())
   .sort((a,b)=>Date.parse(a.scheduled_at_utc)-Date.parse(b.scheduled_at_utc))[0];
  schedule.textContent=event?formatET(Date.parse(event.scheduled_at_utc))+
   (event.timezone_basis==="publisher-holiday-exception"?" · Publisher holiday exception":"")+
   " · "+data.status+" schedule. Confirm with EIA.":"No upcoming snapshot slot. Check EIA’s official schedule.";
 }).catch(()=>{schedule.textContent="The schedule snapshot is unavailable. Check the official EIA link.";});
})();
