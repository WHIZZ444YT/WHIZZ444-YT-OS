import { calculateFuturesPosition, formatMicros, parseMoneyMicros } from "./futures-risk-engine.mjs";

(async()=>{
 const sel=document.getElementById('contract'),out=document.getElementById('riskResult');
 if(!sel||!out)return;
 const $=id=>document.getElementById(id);
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let contracts=[];
 try{
  const response=await fetch('/ict-futures/data/market-universe.json',{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();contracts=Array.isArray(data.markets)?data.markets:[];
  if(!contracts.length)throw new Error('No contract profiles found');
 }catch(error){out.textContent='Contract data unavailable. Check the ICT Futures market catalogue and retry.';return;}
 for(const market of contracts){
  const option=document.createElement('option');option.value=market.id;option.textContent=market.label+' · '+(market.exchange||'Exchange');sel.appendChild(option);
 }
 const preset = new URLSearchParams(location.search).get('market');
 if (contracts.some(market => market.id === preset)) sel.value = preset;
 const contractLabel=sel.closest('label');
 const modeLabel=document.createElement('label');modeLabel.textContent='Contract size (standard / micro)';
 const mode=document.createElement('select');mode.id='contractMode';
 const standard=document.createElement('option');standard.value='standard';standard.textContent='Standard';
 const micro=document.createElement('option');micro.value='micro';micro.textContent='Micro';
 mode.append(standard,micro);modeLabel.appendChild(mode);
 if(contractLabel?.parentNode)contractLabel.insertAdjacentElement('afterend',modeLabel);else sel.insertAdjacentElement('afterend',modeLabel);
 const selected=()=>contracts.find(x=>x.id===sel.value);
 function syncMode(){
  const market=selected(),hasMicro=Boolean(market?.microSpec&&Number(market.microSpec.tickValue)>0&&Number(market.microSpec.tickSize)>0);
  micro.disabled=!hasMicro;if(!hasMicro)mode.value='standard';modeLabel.hidden=!hasMicro;
 }
 function renderError(message){out.innerHTML='<p class="risk-error"><b>Check the inputs:</b> '+escapeHtml(message)+'</p>';}
 function calculate(){
  const market=selected();if(!market){out.textContent='Select a futures contract.';return;}
  const spec=mode.value==='micro'?market.microSpec:market;
  const exactContract=$('exactContract').value.trim(),expiry=$('expiryDate').value;
  if(!exactContract||!/^\d{4}-\d{2}-\d{2}$/.test(expiry)){renderError('Enter the exact listed contract code and source-supplied expiry date.');return;}
  const costSource=$('costSource').value.trim(),costAsOf=$('costAsOf').value;
  if(!costSource||!/^\d{4}-\d{2}-\d{2}$/.test(costAsOf)){renderError('Enter the source and date for commission, spread and slippage assumptions.');return;}
  const tickValue=String(spec?.tickValue??''),tickSize=String(spec?.tickSize??'');
  const state=String(spec?.specStatus||market.specStatus||'unverified').toLowerCase();
  const verified=state==='verified'&&Boolean(spec?.specVerifiedAt||market.specVerifiedAt)&&Boolean(spec?.specEffectiveFrom||market.specEffectiveFrom);
  try{
   const result=calculateFuturesPosition({
    balance:$('balance').value,riskPercent:$('riskPct').value,tickValue,
    stopTicks:$('stopTicks').value,targetTicks:$('targetTicks').value,
    commissionPerContract:$('commission').value,spreadTicks:$('spreadTicks').value,
    slippageTicks:$('slippageTicks').value,maxContracts:$('maxContracts').value,
    dailyLossRemaining:$('dailyLossRemaining').value,drawdownRemaining:$('drawdownRemaining').value
   });
   const sourceUrl=String(spec?.specEvidence?.sourceUrl||market.specEvidence?.sourceUrl||market.specsUrl||'');
   const sourceLink=/^https:\/\/(www\.)?(cmegroup\.com|ice\.com)\//i.test(sourceUrl)
    ?' · <a href="'+escapeHtml(sourceUrl)+'" target="_blank" rel="noopener noreferrer">official exchange source</a>':'';
   const expiryText=new Date(expiry+'T00:00:00Z').toISOString().slice(0,10);
   const checkedAt=String(spec?.specEvidence?.checkedAt||market.specEvidence?.checkedAt||spec?.specVerifiedAt||market.specVerifiedAt||'not recorded');
   const resultStatus=verified?'CONDITIONAL · SPEC RECORD MARKED VERIFIED':state==='partial'?'CONDITIONAL ESTIMATE · PARTIAL CORE-SPEC REVIEW · NOT TRADE-READY':'CONDITIONAL ESTIMATE · SPEC UNVERIFIED';
   const remainingBy=result.quantity===result.maxContracts?'Maximum contract cap':(result.constrainedByDailyLoss?'Daily loss allowance':(result.constrainedByDrawdown?'Maximum drawdown remaining':'Per-trade risk percentage'));
   const warning=result.quantity===0
    ?'<p><b>Zero contracts:</b> One contract exceeds the effective risk allowance or the selected allowance is exhausted. Reduce the stop distance or select a smaller supported contract; do not raise limits solely to force a position.</p>'
    :'<p>Quantity is rounded down to whole contracts and capped at the entered maximum. It uses '+escapeHtml(remainingBy)+' as the binding budget limit.</p>';
   out.innerHTML='<div class="result-grid">'+
    '<div><span class="muted">Contracts</span><b>'+result.quantity+'</b></div>'+
    '<div><span class="muted">Requested per-trade budget</span><b>'+formatMicros(result.riskBudgetMicros)+'</b></div>'+
    '<div><span class="muted">Effective remaining allowance</span><b>'+formatMicros(result.effectiveBudgetMicros)+'</b></div>'+
    '<div><span class="muted">Gross stop risk / contract</span><b>'+formatMicros(result.grossStopRiskPerContractMicros)+'</b></div>'+
    '<div><span class="muted">Round-turn commission &amp; fees / contract</span><b>'+formatMicros(result.commissionPerContractMicros)+'</b></div>'+
    '<div><span class="muted">Estimated spread cost / contract</span><b>'+formatMicros(result.spreadCostPerContractMicros)+'</b></div>'+
    '<div><span class="muted">Estimated slippage cost / contract</span><b>'+formatMicros(result.slippageCostPerContractMicros)+'</b></div>'+
    '<div><span class="muted">All-in stop risk / contract</span><b>'+formatMicros(result.allInRiskPerContractMicros)+'</b></div>'+
    '<div><span class="muted">Total modeled stop risk</span><b>'+formatMicros(result.totalRiskMicros)+'</b></div>'+
    '<div><span class="muted">Effective allowance used</span><b>'+(result.riskUtilizationPct===null?'—':result.riskUtilizationPct.toFixed(2)+'%')+'</b></div>'+
    '<div><span class="muted">Gross target before costs</span><b>'+formatMicros(result.grossTargetMicros)+'</b></div>'+
    '<div><span class="muted">Estimated net target</span><b>'+formatMicros(result.estimatedNetTargetMicros)+'</b></div>'+
    '<div><span class="muted">Net reward / risk</span><b>'+result.netRewardRisk.toFixed(2)+'R</b></div>'+
    '<div><span class="muted">Tick size / tick value</span><b>'+escapeHtml(tickSize)+' / '+formatMicros(parseMoneyMicros(tickValue))+'</b></div></div>'+
    '<p class="fine-print"><b>'+resultStatus+'</b> · '+escapeHtml(exactContract)+' · expiry '+escapeHtml(expiryText)+' · '+escapeHtml(mode.value==='micro'?'micro':'standard')+' profile · reference set '+escapeHtml(spec?.specVersionId||market.specVersionId||'version-not-recorded')+' · core facts checked '+escapeHtml(checkedAt)+' · effective '+escapeHtml(spec?.specEffectiveFrom||market.specEffectiveFrom||'not established')+sourceLink+'. Cost source: '+escapeHtml(costSource)+' · as of '+escapeHtml(costAsOf)+'. The expiry and contract code are user-entered and are not reconciled against an exchange calendar.</p>'+warning+
    '<p class="fine-print">USD arithmetic uses integer micro-dollar amounts and whole ticks. FX conversion, margin, liquidation, correlated exposure, session limits and event risk are not included.</p>';
  }catch(error){renderError(error.message);}
 }
 sel.addEventListener('change',()=>{syncMode();calculate();});
 mode.addEventListener('change',calculate);
 document.getElementById('calculateRisk')?.addEventListener('click',calculate);
 syncMode();
})();
