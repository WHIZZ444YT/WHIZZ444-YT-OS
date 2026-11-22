import './session-time.js';
import {formatMicros} from './futures-risk-engine.mjs';
import {runExperiment, tradesToCsv} from './strategy-backtest-engine.mjs';
import {PRACTICE_KEY, FIXTURE_DATE, FIXTURE_START, closedBarTime, readAttempt, appendDecision, labRisk, journalRestorePlan, upgradeJournalBackup} from './ict-practice-state.mjs';

/* ICT Lab practice. All sample prices are deterministic teaching examples. */
(() => {
  'use strict';
  const root=document.querySelector('[data-ict-practice]');
  const inversion=document.querySelector('[data-ifvg-practice]');
  if(!root&&!inversion) return;
  const playbooks=[...document.querySelectorAll('[data-journal-playbooks] option')].map(option=>option.value);
  const reference=document.querySelector('#ict-practice-reference');
  const {contracts={},sessionIds=[]}=reference?JSON.parse(reference.textContent):{};
  const raw=[[4,6,2,5],[5,7,3,6],[6,7,1,3],[3,4,0,2],[2,7,1,6],[6,10,5,9],[9,12,8,11],[11,12,7,8],[8,10,6,9],[9,14,8,13],[13,15,12,14],[14,15,9,10]];
  const sample=symbol=>raw.map(row=>row.map(n=>(symbol==='ES'?5000:20000)+n));
  const samples=['NQ','ES'];
  const key=PRACTICE_KEY;
  const recordKeys=group=>Object.keys(localStorage).filter(k=>k.startsWith(key+group+'.')).sort();
  const history=group=>recordKeys(group).map(k=>JSON.parse(localStorage.getItem(k)));
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
  function chart(box,symbol,bars,purpose='REPLAY',marks=[],positions=[]){
    const fig=add(box,'figure'),cap=add(fig,'figcaption',symbol+' · EDU-'+symbol+'-'+purpose+'-01 v1 · '+FIXTURE_DATE+' · starts 09:30 ET · 5 min · NY AM · America/New_York · synthetic Lab OHLC · closed candles');
    const low=Math.min(...bars.map(b=>b[2]))-1, high=Math.max(...bars.map(b=>b[1]))+1;
    const y=p=>Math.round(95-90*(p-low)/(high-low));
    const graphic=add(fig,'div');
    const markers=positions.filter(([bar,price])=>bar>=1&&bar<=bars.length&&price>=low&&price<=high)
      .map(([bar,price,n])=>'<text x="'+(12+(bar-1)*26)+'" y="'+Math.max(10,y(price)-4)+'" fill="currentColor" font-size="10">'+n+'</text>').join('');
    graphic.innerHTML='<svg viewBox="0 0 320 105" role="img" aria-label="Visible five-minute candlesticks; numeric values are in the table" style="width:100%;max-height:220px">'+bars.map(([o,h,l,c],i)=>{const x=12+i*26,color=c>=o?'#46b598':'#dd876d';return '<line x1="'+x+'" x2="'+x+'" y1="'+y(h)+'" y2="'+y(l)+'" stroke="'+color+'"/><rect x="'+(x-5)+'" y="'+Math.min(y(o),y(c))+'" width="10" height="'+Math.max(1,Math.abs(y(o)-y(c)))+'" fill="'+color+'"/>';}).join('')+markers+'</svg>';
    if(marks.length){
      const list=add(fig,'ol');
      for(const mark of marks)add(list,'li',mark);
    }
    const d=add(fig,'details');add(d,'summary','Read candle values');const table=add(d,'table');const header=add(table,'tr');['Bar','Open','High','Low','Close','Close time (UTC)'].forEach(x=>add(header,'th',x));bars.forEach((b,i)=>{const row=add(table,'tr');[i+1,...b,closedBarTime(i+1).slice(11,16)].forEach(x=>add(row,'td',x));});return cap;
  }
  function choose(box,label,options,render){const wrap=add(box,'label',label+' '),sel=add(wrap,'select');options.forEach(v=>add(sel,'option',v));const host=add(box,'section');const go=()=>{host.replaceChildren();render(host,sel.value);};sel.onchange=go;go();}
  function annotation(box){
    choose(box,'Instrument',samples,(host,symbol)=>{
      const offset=symbol==='ES'?5000:20000;
      const bars=[[5,7,3,6],[6,7,1,3],[3,4,2,3],[3,4,0,2],[2,8,2,7],[7,10,5,9]]
        .map(row=>row.map(price=>price+offset));
      const preview=add(host,'section');
      const coords=v=>[[2,+v.level,1],[+v.swing,bars[+v.swing-1]?.[2],2],[+v.sweep,bars[+v.sweep-1]?.[2],3],
        [+v.displacement,bars[+v.displacement-1]?.[3],4],[4,+v.floor,5],[6,+v.ceiling,6]]
        .filter(([,price])=>Number.isFinite(price)&&price>0);
      chart(preview,symbol,bars,'ANNOTATION');
      add(host,'p','Use only these six closed bars. Mark the three-bar swing low, the sweep, the displacement candle and the confirmed bullish gap.');
      const reference=add(host,'section');
      form(host,'Check annotations',f=>{
        field(f,'level','Liquidity low','number','',{step:'.25'});
        for(const [name,label] of [['swing','Swing bar'],['sweep','Sweep bar'],['displacement','Displacement bar']]){
          field(f,name,label,'number','',{min:'1',max:'6'});
        }
        field(f,'floor','FVG lower boundary','number','',{step:'.25'});
        field(f,'ceiling','FVG upper boundary','number','',{step:'.25'});
        const marks=['level','swing','sweep','displacement','floor','ceiling'];
        const controls=marks.map(name=>f.elements.namedItem(name));
        const undo=add(f,'button','Undo last mark');undo.type='button';undo.disabled=true;
        const snapshots=[controls.map(control=>control.value)];
        const redraw=values=>{
          preview.replaceChildren();
          chart(preview,symbol,bars,'ANNOTATION',[],coords(Object.fromEntries(marks.map((name,i)=>[name,values[i]]))));
          undo.disabled=snapshots.length<2;
        };
        f.addEventListener('change',()=>{
          snapshots.push(controls.map(control=>control.value));
          redraw(snapshots.at(-1));
        });
        undo.onclick=()=>{
          snapshots.pop();
          const previous=snapshots.at(-1);
          controls.forEach((control,i)=>{control.value=previous[i];});
          redraw(previous);
        };
        add(f,'button','Reset marks').type='reset';
        f.addEventListener('reset',()=>{snapshots.splice(1);redraw(snapshots[0]);reference.replaceChildren();});
      },v=>{
        const answers={level:bars[1][2],swing:2,sweep:4,displacement:5,floor:bars[3][1],ceiling:bars[5][2]};
        const score=Object.entries(answers).filter(([name,answer])=>Number(v[name])===answer).length;
        save('annotation',{symbol,score,...v});
        reference.replaceChildren();
        add(reference,'h3','Reference chart and marking guide');
        chart(reference,symbol,bars,'ANNOTATION',[
          'Bar 2 forms the swing low at '+answers.level+' once bar 3 closes with a higher low.',
          'Bar 4 trades below that low and closes back above it.',
          'Bar 5 expands upward and closes above bar 4’s high.',
          'At bar 6 close, bar 4 high '+answers.floor+' and bar 6 low '+answers.ceiling+' define the gap.',
        ],coords(answers));
        const results=add(reference,'ul');
        for(const [name,answer] of Object.entries(answers))add(results,'li',name+': '+(Number(v[name])===answer?'correct':'expected '+answer));
        return score+'/6 marks match.';
      });
    });
  }
  function inversionPractice(box){
    const decisionBar=5;
    const closes=box.dataset.ifvgPractice.split(',').map(Number);
    const bars=closes.map((close,i)=>{
      const open=closes[i-1]??close;
      return [open,Math.max(open,close)+.25,Math.min(open,close)-.25,close];
    });
    chart(box,'NQ',bars.slice(0,decisionBar),'IFVG');
    const review=add(box,'section');
    form(box,'Save decision and reveal chart',f=>{
      field(f,'decision','Decision before the retest',['','Eligible','Wait','Invalid']);
      field(f,'invalidation','Short invalidation price','number','',{step:'.25'});
    },(v,controls)=>{
      const correct=v.decision==='Wait'&&Number(v.invalidation)===20012;
      save('ifvg',{fixture:'EDU-NQ-IFVG-01',decisionBar,correct,...v});
      controls.hidden=true;
      review.replaceChildren();
      add(review,'h3','After saving your decision');
      chart(review,'NQ',bars,'IFVG',[
        'The first eligible return from below is bar 6. Bar 5 had not yet reached the lower gap boundary.',
        'The short idea invalidates at 20012 or higher. This review grades the rule at bar 5 independently of what followed.',
      ]);
      return correct?'Rule followed at bar 5.':'The rule required Wait before the retest and 20012 as the invalidation level.';
    });
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
    const schedule=add(box,'section');
    const planForm=form(box,'Save plan',f=>{
      field(f,'symbol','Contract',samples);
      field(f,'date','Trading date','date',today());
      field(f,'session','Session (New York reference)',sessionIds);
      field(f,'time','Session time in New York','time','09:30');
      field(f,'disambiguation','If clock time repeats',['reject','earlier','later']);
      field(f,'levels','Key prices');
      field(f,'objective','Liquidity objective');
      field(f,'bias','Working bias',['Bullish','Bearish','Neutral']);
      field(f,'news','Issuer release or wait condition','text','',{required:false});
      field(f,'newsFilter','Check publisher calendar for',['Selected contract','All releases']);
      field(f,'invalid','What invalidates the bias?');
      field(f,'skip','What would make you skip?');
    },v=>{
      const clocks=localTimes(v.date,v.time,v.disambiguation);
      save('plan',{...v,clocks});return 'Plan saved on this device. '+clocks;
    });
    const calendar=add(planForm,'button','Check publisher schedules');
    calendar.type='button';
    const coverage=add(schedule,'p');coverage.setAttribute('role','status');
    const releases=add(schedule,'ul');
    calendar.onclick=async()=>{
      const fields=new FormData(planForm);
      const date=fields.get('date'),symbol=fields.get('symbol'),filter=fields.get('newsFilter');
      if(!date){coverage.textContent='Select the planning date first.';return;}
      const base=String(globalThis.FINANCE_OS_CONFIG?.apiBase||'').replace(/\/$/,'');
      releases.replaceChildren();
      if(!base||!globalThis.loadPublisherSchedules){coverage.textContent='Issuer gateway unavailable. Check the public calendar and exchange holiday schedule.';return;}
      calendar.disabled=true;
      coverage.textContent='Checking publisher snapshots for '+date+'…';
      try{
        const results=await globalThis.loadPublisherSchedules(base);
        const feeds=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
        const events=new Map();
        for(const {data} of feeds){
          for(const event of data.events||[]){
            if(event.scheduled_date!==date)continue;
            const markets=event.affected_instruments||[];
            if(filter==='Selected contract'&&markets.length&&!markets.some(m=>m.toUpperCase()===symbol))continue;
            events.set(event.event_id,event);
          }
        }
        for(const event of events.values()){
          const time=event.scheduled_at_utc?new Intl.DateTimeFormat('en-GB',{timeZone:newYork,timeStyle:'short'}).format(new Date(event.scheduled_at_utc))+' ET':'date only';
          add(releases,'li',[event.title||event.event_name,event.publisher_id,time].filter(Boolean).join(' · '));
        }
        const labels=feeds.map(({id,data})=>id+' '+(data.status||'unknown')+' ('+(data.retrieved_at||'retrieval unavailable')+')');
        coverage.textContent=(events.size?events.size+' matching releases. ':'No matching releases in the received snapshots. ')+
          (feeds.length<results.length?'Some issuer feeds were unavailable. ':'')+
          labels.join(' · ')+'. Check exchange holidays separately.';
      }catch{coverage.textContent='Schedule check failed. Use the official issuer calendars.';}
      finally{calendar.disabled=false;}
    };
    saved(box,'plan',v=>[v.date,v.symbol,v.clocks,v.bias,v.levels,v.objective,'Invalidation: '+v.invalid,'Skip: '+v.skip].filter(Boolean).join(' · '));
  }
  function saved(box,group,describe,showEvidence){const d=add(box,'details');add(d,'summary','Review saved records');d.ontoggle=()=>{if(!d.open)return;d.querySelector('ul')?.remove();const list=add(d,'ul');try{const rows=history(group);rows.reverse().forEach(r=>{
    const row=add(list,'li',describe(r));if(showEvidence)showEvidence(row,r);
  });if(!rows.length)add(list,'li','No records yet.');}catch{add(list,'li','Device storage could not be read.');}};}
  function replay(box){
    choose(box,'Replay instrument',samples,(host,symbol)=>{
      const bars=sample(symbol),k=key+'replay-'+symbol;
      const dataset='EDU-'+symbol+'-REPLAY-01';
      const withLock=task=>{
        if(!globalThis.navigator?.locks?.request)throw Error('This browser cannot safely lock a replay attempt.');
        return navigator.locks.request(k,task);
      };
      function draw(focus=false){
        const prior=localStorage.getItem(k);
        const state=readAttempt(prior,dataset,()=>crypto.randomUUID());
        const {decisions,cursor:n}=state;
        host.replaceChildren();
        const heading=add(host,'h2',n===bars.length?'Replay complete':'Replay through bar '+n);
        heading.tabIndex=-1;
        add(host,'p','Attempt '+state.id+' · revision '+state.revision);
        chart(host,symbol,bars.slice(0,n));
        const pivots=[];
        for(let j=1;j<n-1;j++){
          if(bars[j][1]>Math.max(bars[j-1][1],bars[j+1][1]))pivots.push({kind:'high',bar:j+1,price:bars[j][1],knownAt:closedBarTime(j+2)});
          if(bars[j][2]<Math.min(bars[j-1][2],bars[j+1][2]))pivots.push({kind:'low',bar:j+1,price:bars[j][2],knownAt:closedBarTime(j+2)});
        }
        add(host,'p','Confirmed three-bar pivots: '+(pivots.map(p=>p.kind+' '+p.price+' on bar '+p.bar).join(', ')||'none')+'. A pivot needs one closed candle on each side.');
        if(n===bars.length){
          decisions.forEach(x=>add(host,'p','Bar '+x.bar+' · '+x.action+' · '+x.reason));
          add(host,'button','Start another attempt').onclick=async()=>{
            const status=add(host,'p');status.setAttribute('role','status');
            try{
              await withLock(()=>{
                if(localStorage.getItem(k)!==prior)throw Error('This attempt changed in another tab.');
                localStorage.setItem(key+'replayArchive.'+state.id,JSON.stringify({symbol,dataset,...state}));
                localStorage.removeItem(k);
              });
              draw(true);
            }
            catch{status.textContent='The attempt could not be archived. Your replay remains available.';}
          };
        } else {
          form(host,'Save decision and reveal next bar',f=>{
            field(f,'action','Decision',['Wait','Skip','Enter long','Enter short']);
            field(f,'reason','Evidence at the current candle');
          },async v=>{
            await withLock(()=>appendDecision(localStorage,k,prior,state,dataset,v.action,v.reason,pivots,bars.length));
            draw(true);
          });
        }
        if(focus)heading.focus();
      }
      draw();
    });
  }
  const sampleDate=FIXTURE_DATE;
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
      field(f,'symbol','Synthetic dataset',samples);
      field(f,'rule','Signal rule version',['Closing-price breakout v1']);
      field(f,'fees','Commission per side, USD','number','1',{min:0,step:'.01'});
      field(f,'slip','Slippage per side, ticks','number','1',{min:0,max:100,step:'1'});
      field(f,'stop','Stop distance, ticks','number','4',{min:1,step:'1'});
      field(f,'target','Target, R multiple','number','2',{min:.25,step:'.25'});
      field(f,'maxBars','Maximum bars per position','number','2',{min:1,step:'1'});
    },async v=>{
      const market=v.symbol+'M26',name='EDU-'+v.symbol+'-BACKTEST-01';
      const bars=sample(v.symbol);
      const input=Array.from({length:36},(_,i)=>bars[i%bars.length].map(price=>price+16*Math.floor(i/bars.length)));
      const csv=['timestamp,open,high,low,close,signal,contract,expiry',...input.map((row,i)=>[
        new Date(FIXTURE_START+(i-6)*300000).toISOString(),...row,
        i>0&&row[3]>input[i-1][1]?'LONG':'FLAT',market,'2026-06-18'
      ].join(','))].join('\n');
      const spec=contracts[v.symbol];
      const result=await runExperiment(csv,{startingCapital:10000,riskPercent:1,tickSize:spec.tickSize,tickValue:spec.tickValue,
        commissionPerSide:v.fees,slippageTicks:v.slip,stopTicks:v.stop,targetRR:v.target,maxBarsInTrade:v.maxBars,maxContracts:1,
        trainPercent:50,validationPercent:20,modelId:'custom',strategyName:'Synthetic closing breakout v1',
        marketSymbol:market,timeframe:'5m',timezone:newYork,signalSourceNotes:'Generated after each synthetic candle closes',
        dataSource:'Synthetic Lab fixture, no market data',datasetId:name,downloadDate:sampleDate,
        costSource:'User inputs',costAsOf:today()},name+'.csv');
      const label=metrics=>metrics.trades+' closed trades · win rate '+(metrics.winRatePct===null?'unavailable':metrics.winRatePct.toFixed(1)+'%')+
        ' · expectancy '+(metrics.averageR??'-')+' R · drawdown $'+
        (metrics.maxDrawdownUsd??'-')+(metrics.winRate95PctInterval?' · 95% win-rate interval '+metrics.winRate95PctInterval.join('–')+'%':' · interval unavailable');
      const record={symbol:v.symbol,contract:market,version:'close-breakout-v1',sample:name,
        sampleStart:sampleDate,sampleEnd:sampleDate,session:'New York AM',commissionPerSide:v.fees,slippagePerSideTicks:v.slip,
        fillAssumption:'Next bar open after a closed signal, with modeled costs',result:label(result.fullSample.metrics),
        fingerprint:result.manifest.runFingerprint,datasetHash:result.manifest.dataset.sha256,
        execution:result.manifest.method,assumptions:result.manifest.config,
        splits:result.splits.map(s=>({key:s.key,startIndex:s.startIndex,endIndexExclusive:s.endIndexExclusive,metrics:s.metrics}))};
      save('tests',record);
      results.replaceChildren();
      add(results,'h2','Evaluation periods');
      result.splits.forEach(s=>add(results,'p',s.key+': '+label(s.metrics)));
      add(results,'p','Tiny educational sample. Closed-trade counts are insufficient to infer a market edge.');
      add(results,'button','Download manifest').onclick=()=>download(name+'.json','application/json',JSON.stringify({...result.manifest,labRecord:record},null,2));
      add(results,'button','Download trade ledger').onclick=()=>download(name+'-trades.csv','text/csv',tradesToCsv(result.splits.flatMap(s=>s.trades)));
      return 'Completed. Results and export links are above.';
    });
    saved(box,'tests',v=>[v.symbol,v.split,v.version,v.result].filter(Boolean).join(' · '));
    link(box,'Open the full Strategy Lab','/strategy-lab/');
  }
  function risk(box){
    const evidence=add(box,'p');
    const riskForm=form(box,'Calculate size',f=>{
      field(f,'symbol','Contract',Object.keys(contracts));
      field(f,'side','Direction',['Long','Short']);
      field(f,'entry','Entry price','number','20000',{step:'.25'});
      field(f,'stop','Stop price','number','19990',{step:'.25'});
      field(f,'budget','Maximum risk in USD','number','200',{min:0,step:'.01'});
      field(f,'remaining','Remaining loss limit in USD','number','',{min:0,step:'.01',required:false});
      field(f,'fees','Round-turn fees per contract in USD','number','0',{min:0,step:'.01'});
      field(f,'spread','Round-trip spread in ticks','number','0',{min:0,step:'1'});
      field(f,'slip','Round-trip slippage in ticks','number','0',{min:0,step:'1'});
      field(f,'max','Maximum contracts','number','10',{min:1,max:10000,step:'1'});
    },v=>{
      const out=labRisk(v,contracts[v.symbol]);
      return out.quantity+' whole contracts · '+formatMicros(out.allInRiskPerContractMicros)+
        ' estimated risk per contract · '+formatMicros(out.totalRiskMicros)+' total estimated risk · '+formatMicros(out.effectiveBudgetMicros)+' effective budget.';
    });
    const updateReference=()=>{
      const spec=contracts[riskForm.elements.namedItem('symbol').value];
      evidence.textContent='Conditional reference · tick size '+spec.tickSize+' · tick value $'+spec.tickValue+
        ' · registry '+spec.status+' · source checked '+(spec.checkedAt||'unconfirmed')+
        ' · effective date '+(spec.effectiveFrom||'pending')+' · ';
      link(evidence,'Exchange specification',spec.source);
      for(const name of ['entry','stop'])riskForm.elements.namedItem(name).step=spec.tickSize;
    };
    riskForm.elements.namedItem('symbol').onchange=updateReference;
    updateReference();
    link(box,'Open the full Risk Lab','/risk/');
  }
  function readChart(file){
    if(!file?.size)return null;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>512*1024){
      throw Error('Choose a PNG, JPEG or WebP image no larger than 512 KB.');
    }
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(Error('Could not read the chart image.'));
      reader.readAsDataURL(file);
    });
  }
  function journal(box){
    add(box,'p','Optional before and after chart images stay on this device. Use PNG, JPEG or WebP up to 512 KB each.');
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
      for(const [name,label] of [['before','Before chart'],['after','After chart']]){
        field(f,name,label,'file','',{required:false,accept:'image/png,image/jpeg,image/webp'});
      }
      action.onchange=()=>{
        const skipped=action.value==='No trade';
        for(const control of [primary,outcome]){
          control.disabled=skipped;control.required=!skipped;
        }
      };
    },async v=>{
      if(v.action==='Trade'&&(!playbooks.includes(v.primary)||!['Win','Loss','Scratch'].includes(v.outcome))){
        throw Error('A trade requires one playbook and a trade outcome.');
      }
      const {before,after,...record}=v;
      const [beforeChart,afterChart]=await Promise.all([readChart(before),readChart(after)]);
      try{
        save('journal',{...record,primary:v.action==='Trade'?v.primary:null,outcome:v.action==='Trade'?v.outcome:null,
          tags:v.tags.split(',').map(x=>x.trim()).filter(Boolean),charts:{before:beforeChart,after:afterChart}});
      }catch(error){
        if(error.name==='QuotaExceededError')throw Error('Device storage is full. Export your journal before clearing old data.');
        throw error;
      }
      return 'Journal entry saved on this device.';
    });
    saved(box,'journal',v=>[v.date,v.symbol,v.primary,(v.tags||[]).join(', '),v.action,v.quality,v.adherence,v.outcome,
      v.plan,v.actual,v.emotion,v.review].filter(Boolean).join(' · '),(row,record)=>{
        for(const [phase,label] of [['before','Before chart'],['after','After chart']]){
          const data=record.charts?.[phase];
          if(!/^data:image\/(png|jpeg|webp);base64,/.test(data||''))continue;
          const details=add(row,'details');
          add(details,'summary',label);
          const image=add(details,'img');
          image.src=data;
          image.alt=label;
          image.loading='lazy';
        }
      });
    legacyJournal(box);
    add(box,'button','Export this device’s journal').onclick=()=>{
      const status=add(box,'p');status.setAttribute('role','status');
      try{
        const prefix=key+'journal.';
        const entries=recordKeys('journal').map(k=>({origin:k.slice(prefix.length),record:JSON.parse(localStorage.getItem(k))}));
        download('ict-journal.json','application/json',JSON.stringify({schemaVersion:2,entries,
          legacyTrades:readLegacy('ictfos.journal.v1',[]),legacyChecklist:readLegacy('ictfos.checks.v1',{}),
          legacyReminders:readLegacy('ictfos.personalEvents.v1',[])},null,2));
        status.textContent='Journal export prepared.';
      }catch{status.textContent='Local storage could not be read.';}
    };
    restoreJournal(box);
    add(box,'p','Use the signed-in workspace for private chart attachments and intentional legacy import.');
    link(box,'Open private account workspace','/account/');
  }

  function restoreJournal(box){
    const restore=add(box,'details');
    add(restore,'summary','Preview and restore a Lab journal backup');
    add(restore,'p','Restore adds Lab journal entries on this device. Terminal records in the backup are available for review.');
    const chooser=add(restore,'label','Backup JSON ');
    const file=add(chooser,'input');file.type='file';file.accept='application/json,.json';
    const status=add(restore,'p');status.setAttribute('role','status');
    const report=add(restore,'ul');
    const apply=add(restore,'button','Restore eligible entries');apply.type='button';apply.disabled=true;
    let backup=null;
    let selection=0;
    const show=plan=>{
      report.replaceChildren();
      for(const item of plan)add(report,'li',(item.origin||'Unidentified record')+' · '+item.state);
      apply.disabled=!plan.some(item=>item.state==='Ready');
      status.textContent=plan.length+' record(s) checked.';
    };
    file.onchange=async()=>{
      const selected=++selection;
      apply.disabled=true;
      backup=null;
      report.replaceChildren();
      try{
        const input=file.files[0];
        if(!input||input.size>8*1024*1024)throw Error('Choose a Lab journal JSON file up to 8 MB.');
        const parsed=await upgradeJournalBackup(JSON.parse(await input.text()),playbooks);
        const plan=journalRestorePlan(parsed,localStorage,playbooks);
        if(selected!==selection)return;
        backup=parsed;
        show(plan);
      }catch(error){if(selected===selection)status.textContent=error.message;}
    };
    apply.onclick=async()=>{
      let count=0;
      if(!globalThis.navigator?.locks?.request){status.textContent='This browser cannot safely lock restore operations.';return;}
      const selectedBackup=backup;
      apply.disabled=true;
      file.disabled=true;
      try{
        await navigator.locks.request(key+'journal-restore',()=>{
          for(const item of journalRestorePlan(selectedBackup,localStorage,playbooks)){
            if(item.state==='Ready'&&localStorage.getItem(item.key)===null){
              localStorage.setItem(item.key,JSON.stringify(item.record));
              count++;
            }
          }
        });
        show(journalRestorePlan(selectedBackup,localStorage,playbooks));
        status.textContent='Restored '+count+' record(s) on this device.';
      }catch{
        apply.disabled=false;
        status.textContent='Restored '+count+' record(s) before storage failed. Preview again or retry to resume.';
      }finally{file.disabled=false;}
    };
  }

  if(inversion) inversionPractice(inversion);
  if(!root) return;
  root.replaceChildren();
  try{[annotation,planner,replay,backtest,risk,journal][Number(root.dataset.ictPractice)-11](root);}
  catch(e){add(root,'p','This practice could not load. '+e.message);}
})();
