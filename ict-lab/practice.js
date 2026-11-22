import './session-time.js';
import {calculateFuturesPosition, formatMicros} from './futures-risk-engine.mjs';
import {runExperiment, tradesToCsv} from './strategy-backtest-engine.mjs';

/* ICT Lab practice. All sample prices are deterministic teaching examples. */
(() => {
  'use strict';
  const root=document.querySelector('[data-ict-practice]');
  if(!root) return;
  const playbooks=[...document.querySelectorAll('[data-journal-playbooks] option')].map(option=>option.value);
  const tickValues={NQ:5,MNQ:0.5,ES:12.5,MES:1.25};
  const raw=[[4,6,2,5],[5,7,3,6],[6,7,1,3],[3,4,0,2],[2,7,1,6],[6,10,5,9],[9,12,8,11],[11,12,7,8],[8,10,6,9],[9,14,8,13],[13,15,12,14],[14,15,9,10]];
  const sample=(symbol, purpose='replay')=>raw.map(row=>row.map(n=>(symbol==='ES'?5000:20000)+n+(purpose==='annotation'?25:0)));
  const samples=['NQ','ES'];
  const key='ict-lab.practice.v1.';
  const history=group=>Object.keys(localStorage).filter(k=>k.startsWith(key+group+'.')).sort().map(k=>JSON.parse(localStorage.getItem(k)));
  function save(group,record){localStorage.setItem(key+group+'.'+Date.now()+'.'+crypto.randomUUID(),JSON.stringify(record));}
  const element=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  function add(host,tag,text){const el=element(tag,text);host.append(el);return el;}
  function link(host,label,href){const a=add(host,'a',label);a.href=href;return a;}
  function field(form,name,label,type='text',value='',opts={}){
    const wrap=add(form,'label'),caption=add(wrap,'span',label);caption.style.display='block';
    const el=add(wrap,Array.isArray(type)?'select':'input');
    if(Array.isArray(type)) type.forEach(v=>add(el,'option',v)); else el.type=type;
    el.name=name;el.required=true;if(value!=='')el.value=value;
    Object.assign(el,opts);return el;
  }
  function form(box,label,setup,submit){
    const f=add(box,'form');f.style.cssText='display:grid;gap:.8rem;max-width:46rem;margin:1rem 0';
    setup(f);add(f,'button',label).type='submit';const out=add(box,'p');out.setAttribute('role','status');
    f.onsubmit=async e=>{
      e.preventDefault();
      const button=f.querySelector('[type=submit]');
      button.disabled=true;
      try{out.textContent=await submit(Object.fromEntries(new FormData(f)),f)||'';}
      catch(err){out.textContent='Could not complete this action. '+err.message;}
      finally{button.disabled=false;}
    };
    return f;
  }
  function chart(box,symbol,bars,purpose='REPLAY'){
    const fig=add(box,'figure'),cap=add(fig,'figcaption',symbol+' · EDU-'+symbol+'-'+purpose+'-01 · 2026-06-02 · 5 min · NY AM · America/New_York · synthetic OHLC teaching sample');
    const low=Math.min(...bars.map(b=>b[2]))-1, high=Math.max(...bars.map(b=>b[1]))+1;
    const y=p=>Math.round(95-90*(p-low)/(high-low));
    const graphic=add(fig,'div');
    graphic.innerHTML='<svg viewBox="0 0 320 105" role="img" aria-label="Visible five-minute candlesticks" style="width:100%;max-height:220px">'+bars.map(([o,h,l,c],i)=>{const x=12+i*26,color=c>=o?'#46b598':'#dd876d';return '<line x1="'+x+'" x2="'+x+'" y1="'+y(h)+'" y2="'+y(l)+'" stroke="'+color+'"/><rect x="'+(x-5)+'" y="'+Math.min(y(o),y(c))+'" width="10" height="'+Math.max(1,Math.abs(y(o)-y(c)))+'" fill="'+color+'"/>';}).join('')+'</svg>';
    const d=add(fig,'details');add(d,'summary','Read candle values');const table=add(d,'table');const header=add(table,'tr');['Bar','Open','High','Low','Close'].forEach(x=>add(header,'th',x));bars.forEach((b,i)=>{const row=add(table,'tr');[i+1,...b].forEach(x=>add(row,'td',x));});return cap;
  }
  function choose(box,label,options,render){const wrap=add(box,'label',label+' '),sel=add(wrap,'select');options.forEach(v=>add(sel,'option',v));const host=add(box,'section');const go=()=>{host.replaceChildren();render(host,sel.value);};sel.onchange=go;go();}
  function annotation(box){
    choose(box,'Instrument',samples,(host,symbol)=>{const bars=sample(symbol,'annotation').slice(0,6);chart(host,symbol,bars,'ANNOTATION');
      add(host,'p','Mark the lowest point of bar 3, then the candle that sweeps it. Identify the bullish FVG confirmed by the close of bar 6.');
      form(host,'Check annotations',f=>{field(f,'level','Bar 3 liquidity low','number','',{step:'.25'});field(f,'sweep','Sweep candle number','number','',{min:'1',max:'6'});field(f,'floor','FVG lower boundary','number','',{step:'.25'});field(f,'ceiling','FVG upper boundary','number','',{step:'.25'});add(f,'button','Reset marks').type='reset';},v=>{
        const answers=[bars[2][2],4,bars[3][1],bars[5][2]];const score=[v.level,v.sweep,v.floor,v.ceiling].filter((x,i)=>+x===answers[i]).length;
        save('annotation',{symbol,score,...v});return score+'/4. Bar 4 sweeps '+answers[0]+'. Bar 4 high '+answers[2]+' and bar 6 low '+answers[3]+' bound the gap.';});});
  }
  const newYork = 'America/New_York';
  const kolkata = 'Asia/Kolkata';
  function localTimes(date,time,disambiguation){
    const resolved=globalThis.ICTSessionTime.resolveWallTime(date,time,newYork,disambiguation);
    if(resolved.status==='nonexistent') throw Error('This New York time falls in the spring-forward gap.');
    if(resolved.epochMs===null) throw Error('Select the earlier or later occurrence of this New York time.');
    const describe=zone=>new Intl.DateTimeFormat('en-GB',{
      timeZone:zone,dateStyle:'medium',timeStyle:'short',hourCycle:'h23'
    }).format(new Date(resolved.epochMs));
    return describe(newYork)+' New York · '+describe(kolkata)+' Kolkata';
  }
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:newYork,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function planner(box){
    add(box,'p','Use public issuer schedules to check releases, holidays and date-only entries before saving a plan.');
    link(box,'Review the public calendar','/sessions/#calendar');
    form(box,'Save plan',f=>{
      field(f,'symbol','Contract',samples);
      field(f,'date','Trading date','date',today());
      field(f,'session','Session',['New York AM','New York PM','Overnight']);
      field(f,'time','Session time in New York','time','09:30');
      field(f,'disambiguation','If clock time repeats',['reject','earlier','later']);
      field(f,'levels','Key prices and liquidity objective');
      field(f,'bias','Working bias',['Bullish','Bearish','Neutral']);
      field(f,'news','Issuer release or wait condition','text','',{required:false});
      field(f,'invalid','What invalidates the bias?');
      field(f,'skip','What would make you skip?');
    },v=>{
      const clocks=localTimes(v.date,v.time,v.disambiguation);
      save('plan',{...v,clocks});return 'Plan saved on this device. '+clocks;
    });
    saved(box,'plan',v=>[v.date,v.symbol,v.clocks,v.bias,v.levels,'Invalidation: '+v.invalid,'Skip: '+v.skip].join(' · '));
  }
  function saved(box,group,describe){const d=add(box,'details');add(d,'summary','Review saved records');d.ontoggle=()=>{if(!d.open)return;d.querySelector('ul')?.remove();const list=add(d,'ul');try{const rows=history(group);rows.reverse().forEach(r=>add(list,'li',describe(r)));if(!rows.length)add(list,'li','No records yet.');}catch{add(list,'li','Device storage could not be read.');}};}
  function replay(box){
    choose(box,'Replay instrument',samples,(host,symbol)=>{
      const bars=sample(symbol),k=key+'replay-'+symbol;
      function draw(focus=false){
        const prior=localStorage.getItem(k);
        const stored=JSON.parse(prior||'null');
        const state=Array.isArray(stored) ? {id:crypto.randomUUID(),decisions:stored,revision:stored.length}
          : stored||{id:crypto.randomUUID(),decisions:[],revision:0};
        const {decisions}=state,n=Math.min(bars.length,4+decisions.length);
        host.replaceChildren();
        const heading=add(host,'h2',n===bars.length?'Replay complete':'Replay through bar '+n);
        heading.tabIndex=-1;
        chart(host,symbol,bars.slice(0,n));
        const pivots=[];
        for(let j=1;j<n-1;j++){
          if(bars[j][1]>Math.max(bars[j-1][1],bars[j+1][1]))pivots.push('high on '+(j+1));
          if(bars[j][2]<Math.min(bars[j-1][2],bars[j+1][2]))pivots.push('low on '+(j+1));
        }
        add(host,'p','Confirmed three-bar pivots: '+(pivots.join(', ')||'none')+'. A pivot needs one closed candle on each side.');
        if(n===bars.length){
          decisions.forEach(x=>add(host,'p','Bar '+x.bar+' · '+x.action+' · '+x.reason));
          add(host,'button','Start another attempt').onclick=()=>{
            const status=add(host,'p');status.setAttribute('role','status');
            try{save('replayArchive',{symbol,...state});localStorage.removeItem(k);draw(true);}
            catch{status.textContent='The attempt could not be archived. Your replay remains available.';}
          };
        } else {
          form(host,'Save decision and reveal next bar',f=>{
            field(f,'action','Decision',['Wait','Skip','Enter long','Enter short']);
            field(f,'reason','Evidence at the current candle');
          },async v=>{
            function commit(){
              if(localStorage.getItem(k)!==prior) throw Error('This attempt changed in another tab. Reload to resume.');
              const decision={bar:n,barClose:new Date(Date.UTC(2026,5,2,13,30+n*5)).toISOString(),knownPivots:pivots,...v};
              localStorage.setItem(k,JSON.stringify([...decisions,decision]));
            }
            if(navigator.locks?.request) await navigator.locks.request(k,commit);
            else commit();
            draw(true);
          });
        }
        if(focus)heading.focus();
      }
      draw();
    });
  }
  const sampleDate='2026-06-02';
  function download(name, type, body){
    const url=URL.createObjectURL(new Blob([body],{type}));
    const anchor=document.createElement('a');
    anchor.href=url;anchor.download=name;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function readLegacy(key, fallback){
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  }
  function legacyJournal(box){
    const details=add(box,'details');
    add(details,'summary','Review legacy terminal journal and checklist');
    const panel=add(details,'div');
    details.ontoggle=()=>{
      if(!details.open)return;
      panel.replaceChildren();
      try{
        const trades=readLegacy('ictfos.journal.v1',[]);
        const checks=readLegacy('ictfos.checks.v1',{});
        add(panel,'h3','Preparation checklist');
        const list=add(panel,'ul');
        const status=add(panel,'p');
        status.setAttribute('role','status');
        document.querySelector('#legacy-checklist')?.content.querySelectorAll('li').forEach((item,index)=>{
          const row=add(list,'li');
          const label=add(row,'label');
          const check=add(label,'input');
          check.type='checkbox';
          check.checked=Boolean(checks[index]);
          label.append(' ',item.textContent);
          check.onchange=()=>{
            try{
              const latest=readLegacy('ictfos.checks.v1',{});
              latest[index]=check.checked;
              localStorage.setItem('ictfos.checks.v1',JSON.stringify(latest));
            }catch{check.checked=!check.checked;status.textContent='Could not save the checklist.';}
          };
        });
        add(panel,'h3','Legacy trades');
        const tradeList=add(panel,'ul');
        for(const trade of trades){
          add(tradeList,'li',[trade.date,trade.market,trade.session,trade.model,trade.direction,trade.result,trade.trigger,trade.notes]
            .filter(Boolean).join(' · '));
        }
        if(!trades.length)add(tradeList,'li','No legacy trades on this device.');
      }catch{add(panel,'p','Legacy device records could not be read.');}
    };
    if(globalThis.location?.hash==='#local-journal')details.open=true;
  }
  function backtest(box){
    add(box,'p','Synthetic closing-price breakout v1: signal at bar close above the prior high, then entry at the next open. This sample does not detect ICT setups.');
    const results=add(box,'section');
    form(box,'Run sample backtest',f=>{
      field(f,'symbol','Sample market',samples);
      field(f,'fees','Commission per side, USD','number','1',{min:0,step:'.01'});
      field(f,'slip','Slippage per side, ticks','number','1',{min:0,max:100,step:'1'});
    },async v=>{
      const market=v.symbol+'M26',name='EDU-'+v.symbol+'-BACKTEST-01';
      const bars=sample(v.symbol);
      const input=Array.from({length:36},(_,i)=>bars[i%bars.length].map(price=>price+16*Math.floor(i/bars.length)));
      const csv=['timestamp,open,high,low,close,signal,contract,expiry',...input.map((row,i)=>[
        new Date(Date.UTC(2026,5,2,13,30+i*5)).toISOString(),...row,
        i>0&&row[3]>input[i-1][1]?'LONG':'FLAT',market,'2026-06-18'
      ].join(','))].join('\n');
      const result=await runExperiment(csv,{startingCapital:10000,riskPercent:1,tickSize:.25,tickValue:tickValues[v.symbol],
        commissionPerSide:v.fees,slippageTicks:v.slip,stopTicks:4,targetRR:2,maxBarsInTrade:2,maxContracts:1,
        trainPercent:50,validationPercent:20,modelId:'custom',strategyName:'Synthetic closing breakout v1',
        marketSymbol:market,timeframe:'5m',timezone:newYork,signalSourceNotes:'Generated after each synthetic candle closes',
        dataSource:'Synthetic Lab fixture, no market data',datasetId:name,downloadDate:sampleDate,
        costSource:'User inputs',costAsOf:today()},name+'.csv');
      const label=metrics=>metrics.trades+' closed trades · expectancy '+(metrics.averageR??'—')+' R · drawdown $'+
        (metrics.maxDrawdownUsd??'—');
      save('tests',{symbol:v.symbol,version:'close-breakout-v1',sample:name,result:label(result.fullSample.metrics),fingerprint:result.manifest.runFingerprint});
      results.replaceChildren();
      add(results,'h2','Evaluation periods');
      result.splits.forEach(s=>add(results,'p',s.key+': '+label(s.metrics)));
      add(results,'p','Tiny educational sample. Closed-trade counts are insufficient to infer a market edge.');
      add(results,'button','Download manifest').onclick=()=>download(name+'.json','application/json',JSON.stringify(result.manifest,null,2));
      add(results,'button','Download trade ledger').onclick=()=>download(name+'-trades.csv','text/csv',tradesToCsv(result.splits.flatMap(s=>s.trades)));
      return 'Completed. Results and export links are above.';
    });
    saved(box,'tests',v=>[v.symbol,v.split,v.version,v.result].filter(Boolean).join(' · '));
    link(box,'Open the full Strategy Lab','/strategy-lab/');
  }
  function risk(box){
    add(box,'p','Conditional educational references. Verify the contract’s effective tick schedule and trading costs before relying on a sizing result.');
    form(box,'Calculate size',f=>{
      field(f,'symbol','Contract',Object.keys(tickValues));
      field(f,'side','Direction',['Long','Short']);
      field(f,'entry','Entry price','number','20000',{step:'.25'});
      field(f,'stop','Stop price','number','19990',{step:'.25'});
      field(f,'budget','Maximum risk in USD','number','200',{min:0,step:'.01'});
      field(f,'fees','Round-turn fees per contract in USD','number','0',{min:0,step:'.01'});
      field(f,'slip','Round-trip slippage in ticks','number','0',{min:0,step:'1'});
      field(f,'max','Maximum contracts','number','10',{min:1,max:10000,step:'1'});
    },v=>{
      const entry=Number(v.entry)*4,stop=Number(v.stop)*4;
      if(!Number.isSafeInteger(entry)||!Number.isSafeInteger(stop)) throw Error('Entry and stop must align to a 0.25-point tick.');
      const distance=(entry-stop)*(v.side==='Long'?1:-1);
      if(distance<=0) throw Error('Stop must be on the loss side of entry.');
      const out=calculateFuturesPosition({balance:Number(v.budget)>0?v.budget:'1',riskPercent:'100',
        dailyLossRemaining:v.budget,drawdownRemaining:'',tickValue:tickValues[v.symbol],stopTicks:distance,
        targetTicks:distance,spreadTicks:0,slippageTicks:v.slip,maxContracts:v.max,commissionPerContract:v.fees});
      return out.quantity+' whole contracts · '+formatMicros(out.allInRiskPerContractMicros)+
        ' estimated risk per contract · '+formatMicros(out.totalRiskMicros)+' total estimated risk.';
    });
    link(box,'Open the full Risk Lab','/risk/');
  }
  function journal(box){
    form(box,'Save journal entry',f=>{
      field(f,'date','Session date','date',today());
      field(f,'symbol','Contract',samples);
      const action=field(f,'action','Action',['Trade','No trade']);
      const primary=field(f,'primary','Primary playbook',['',...playbooks]);
      field(f,'tags','Secondary concept tags','text','',{required:false});
      field(f,'plan','Planned action');
      field(f,'actual','Actual decision');
      field(f,'quality','Decision quality',['Sound','Needs review','Poor']);
      field(f,'adherence','Rule adherence',['Followed','Partial','Violated']);
      const outcome=field(f,'outcome','Trade outcome',['','Win','Loss','Scratch']);
      field(f,'emotion','Emotional state');
      field(f,'review','Review note');
      action.onchange=()=>{
        const skipped=action.value==='No trade';
        for(const control of [primary,outcome]){
          control.disabled=skipped;control.required=!skipped;
        }
      };
    },v=>{
      if(v.action==='Trade'&&(!playbooks.includes(v.primary)||!['Win','Loss','Scratch'].includes(v.outcome))){
        throw Error('A trade requires one playbook and a trade outcome.');
      }
      save('journal',{...v,primary:v.action==='Trade'?v.primary:null,outcome:v.action==='Trade'?v.outcome:null,
        tags:v.tags.split(',').map(x=>x.trim()).filter(Boolean)});
      return 'Journal entry saved on this device.';
    });
    saved(box,'journal',v=>[v.date,v.symbol,v.primary,(v.tags||[]).join(', '),v.action,v.quality,v.adherence,v.outcome,
      v.plan,v.actual,v.emotion,v.review].filter(Boolean).join(' · '));
    legacyJournal(box);
    add(box,'button','Export this device’s journal').onclick=()=>{
      const status=add(box,'p');status.setAttribute('role','status');
      try{
        download('ict-journal.json','application/json',JSON.stringify({schemaVersion:1,entries:history('journal'),
          legacyTrades:readLegacy('ictfos.journal.v1',[]),legacyChecklist:readLegacy('ictfos.checks.v1',{})},null,2));
        status.textContent='Journal export prepared.';
      }catch{status.textContent='Local storage could not be read.';}
    };
    add(box,'p','Use the signed-in workspace for private chart attachments and intentional legacy import.');
    link(box,'Open private account workspace','/account/');
  }

  root.replaceChildren();
  try{[annotation,planner,replay,backtest,risk,journal][Number(root.dataset.ictPractice)-11](root);}
  catch(e){add(root,'p','This practice could not load. '+e.message);}
})();
