(() => {
 const byId=id=>document.getElementById(id);
 const grid=byId("globalWdi");
 if(!grid)return;
 const api=String(window.FINANCE_OS_CONFIG?.apiBase||"").replace(/\/$/,"");
 const country=byId("globalCountry"), year=byId("globalYear");
 const formatter=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
 let records=[];
 function append(parent,tag,text){
  const element=document.createElement(tag);
  element.textContent=text;
  parent.append(element);
  return element;
 }
 async function load(provider){
  if(!api)throw new Error("Gateway unavailable");
  const response=await fetch(api+"/api/v1/economic/"+provider,{signal:AbortSignal.timeout(12000),cache:"no-store"});
  if(!response.ok)throw new Error("Snapshot unavailable");
  return response.json();
 }
 function render(){
  grid.replaceChildren();
  const rows=records.filter(row=>row.observation_date.slice(0,4)===year.value);
  const metrics=new Map(records.map(row=>[row.series_id.split(":")[0],row.series_name]));
  const selected=[...country.options].filter(option=>option.value!=="all"&&(country.value==="all"||option.value===country.value));
  for(const [id,label] of metrics){
   const card=append(grid,"article","");
   card.className="economic-provider-card";
   append(card,"h3",label);
   for(const option of selected){
    const observation=rows.find(row=>row.series_id===id+":"+option.value);
    const value=Number.isFinite(observation?.value)
      ? formatter.format(observation.value)+" "+observation.unit : "Unavailable";
    append(card,"p",option.textContent+" · "+value);
   }
   append(card,"a","World Bank indicator and source attribution").href="https://data.worldbank.org/indicator/"+encodeURIComponent(id);
  }
 }
 country.addEventListener("change",render);
 year.addEventListener("change",render);
 load("world-bank").then(data=>{
  records=Array.isArray(data.records)?data.records:[];
  const years=[...new Set(records.map(row=>row.observation_date.slice(0,4)))].sort().reverse();
  if(years.length){
   year.replaceChildren();
   for(const value of years)append(year,"option",value);
   year.value=years.find(value=>records.some(row=>row.observation_date.startsWith(value)&&Number.isFinite(row.value)))||years[0];
   year.disabled=false;
   render();
  }
  byId("globalWdiState").textContent=data.status==="reference-only"
   ?"World Bank indicators are reference-only until reuse approval is configured."
   :years.length?"World Bank WDI · "+data.status+" snapshot · retrieved "+(data.retrievedAt||"unavailable")+". Compare matching years."
    :"No World Bank observations available. Use the official source below.";
 }).catch(()=>{byId("globalWdiState").textContent="World Bank snapshot unavailable. Use the official source below.";});
 load("ecb").then(data=>{
  const row=(data.records||[]).filter(row=>row.series_id.startsWith("EXR:D.USD.EUR.SP00.A:"))
   .sort((a,b)=>b.observation_date.localeCompare(a.observation_date))[0];
  byId("globalEcb").textContent=Number.isFinite(row?.value)
   ?new Intl.NumberFormat(undefined,{maximumFractionDigits:4}).format(row.value)+" USD per EUR · observation "+row.observation_date+" · "+data.status
   :"ECB reference rate unavailable for the latest supplied period.";
 }).catch(()=>{byId("globalEcb").textContent="ECB reference snapshot unavailable. Use the official series link.";});
})();
