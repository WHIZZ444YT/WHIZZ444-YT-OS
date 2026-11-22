/* ICT Lab practice. All sample prices are deterministic teaching examples. */
(() => {
  'use strict';
  const modules = [
    [11,'Chart Annotation','Identify a swept low and a displacement gap.','iEaMbuFZb24','Watch the top-down chart lesson','zqzf874CJA0','Study liquidity examples'],
    [12,'Session & Bias Planner','Save a conditional NQ or ES plan in New York and India time.','4XOHXoputX0','Watch the daily-profile lesson','9OiCH9vhCIA','Study time and price'],
    [13,'Blind Replay','Record a decision before revealing the next candle.','MvD7fQQ0szE','Open the replay chapter'],
    [14,'Backtest & Statistics','Compare repeatable results across development and holdout samples.','MvD7fQQ0szE','Watch the backtesting walkthrough'],
    [15,'Futures Risk','Size whole contracts from stop distance and all-in risk.','0OjlQ91TZiU','Watch the position-sizing lesson','LZZAaILYNyI','Study stop placement'],
    [16,'Journal & Psychology','Review decisions, emotions and outcomes, including skipped sessions.','wrIZ7CAuFCc','Watch the journaling lesson','w42kzZb9oYY','Open the risk-management chapter']
  ].map(([id,title,description,video,label,alternate,alternateLabel])=>({id,title,description,video,label,alternate,alternateLabel}));
  window.ictPracticeModules=modules;
  const playbooks=['2022 Mentorship','Silver Bullet','Judas Swing','Turtle Soup','Optimal Trade Entry','Unicorn','Inversion FVG','Market Maker Buy Model','Market Maker Sell Model','One Shot One Kill'].map((x,i)=>'P'+String(i+1).padStart(2,'0')+' '+x);
  const points={NQ:20,MNQ:2,ES:50,MES:5};
  const raw=[[4,6,2,5],[5,7,3,6],[6,7,1,3],[3,4,0,2],[2,7,1,6],[6,10,5,9],[9,12,8,11],[11,12,7,8],[8,10,6,9],[9,14,8,13],[13,15,12,14],[14,15,9,10]];
  const sample=symbol=>raw.map(row=>row.map(n=>(symbol==='ES'?5000:20000)+n));
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
    f.onsubmit=e=>{e.preventDefault();try{out.textContent=submit(Object.fromEntries(new FormData(f)),f)||'';}catch(err){out.textContent='Could not complete this action. '+err.message;}};
    return f;
  }
  function chart(box,symbol,bars){
    const fig=add(box,'figure'),cap=add(fig,'figcaption',symbol+' · EDU-'+symbol+'-01 · 5 min · NY AM · America/New_York · synthetic OHLC teaching sample');
    const low=Math.min(...bars.map(b=>b[2]))-1, high=Math.max(...bars.map(b=>b[1]))+1;
    const y=p=>Math.round(95-90*(p-low)/(high-low));
    const graphic=add(fig,'div');
    graphic.innerHTML='<svg viewBox="0 0 320 105" role="img" aria-label="Visible five-minute candlesticks" style="width:100%;max-height:220px">'+bars.map(([o,h,l,c],i)=>{const x=12+i*26,color=c>=o?'#46b598':'#dd876d';return '<line x1="'+x+'" x2="'+x+'" y1="'+y(h)+'" y2="'+y(l)+'" stroke="'+color+'"/><rect x="'+(x-5)+'" y="'+Math.min(y(o),y(c))+'" width="10" height="'+Math.max(1,Math.abs(y(o)-y(c)))+'" fill="'+color+'"/>';}).join('')+'</svg>';
    const d=add(fig,'details');add(d,'summary','Read candle values');const table=add(d,'table');const header=add(table,'tr');['Bar','Open','High','Low','Close'].forEach(x=>add(header,'th',x));bars.forEach((b,i)=>{const row=add(table,'tr');[i+1,...b].forEach(x=>add(row,'td',x));});return cap;
  }
  function choose(box,label,options,render){const wrap=add(box,'label',label+' '),sel=add(wrap,'select');options.forEach(v=>add(sel,'option',v));const host=add(box,'section');const go=()=>{host.replaceChildren();render(host,sel.value);};sel.onchange=go;go();}
  function annotation(box){
    choose(box,'Instrument',samples,(host,symbol)=>{const bars=sample(symbol).slice(0,6);chart(host,symbol,bars);
      add(host,'p','Mark the lowest point of bar 3, then the candle that sweeps it. Identify the bullish FVG confirmed by the close of bar 6.');
      form(host,'Check annotations',f=>{field(f,'level','Bar 3 liquidity low','number','',{step:'.25'});field(f,'sweep','Sweep candle number','number','',{min:'1',max:'6'});field(f,'floor','FVG lower boundary','number','',{step:'.25'});field(f,'ceiling','FVG upper boundary','number','',{step:'.25'});},v=>{
        const answers=[bars[2][2],4,bars[3][1],bars[5][2]];const score=[v.level,v.sweep,v.floor,v.ceiling].filter((x,i)=>+x===answers[i]).length;
        save('annotation',{symbol,score,...v});return score+'/4. Bar 4 sweeps '+answers[0]+'. Bar 4 high '+answers[2]+' and bar 6 low '+answers[3]+' bound the gap.';});});
  }
  function localTimes(date,time){
    const target=Date.parse(date+'T'+time+':00Z');
    for(const h of [4,5]){const at=new Date(target+h*3600000);const fmt=zone=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(at);
      const ny=fmt('America/New_York');if(ny===date.split('-').reverse().join('/')+', '+time)return ny+' New York · '+fmt('Asia/Kolkata')+' Kolkata';}
    throw Error('This New York wall time does not exist on the selected date.');
  }
  const today=()=>new Date().toISOString().slice(0,10);
  function planner(box){form(box,'Save plan',f=>{field(f,'symbol','Contract',samples);field(f,'date','Trading date','date',today());field(f,'time','Session time in New York','time','09:30');field(f,'levels','Key prices and liquidity objective');field(f,'bias','Working bias',['Bullish','Bearish','Neutral']);field(f,'invalid','What would invalidate the bias?');field(f,'skip','What would make you skip?');},v=>{const clocks=localTimes(v.date,v.time);save('plan',{...v,clocks});return 'Plan saved on this device. '+clocks;});saved(box,'plan',v=>v.date+' '+v.symbol+' · '+v.clocks+' · '+v.bias+' · '+v.levels+' · Invalidation: '+v.invalid+' · Skip: '+v.skip);}
  function saved(box,group,describe){const d=add(box,'details');add(d,'summary','Review saved records');d.ontoggle=()=>{if(!d.open)return;d.querySelector('ul')?.remove();const list=add(d,'ul');try{const rows=history(group);rows.reverse().forEach(r=>add(list,'li',describe(r)));if(!rows.length)add(list,'li','No records yet.');}catch{add(list,'li','Device storage could not be read.');}};}
  function replay(box){
    choose(box,'Replay instrument',samples,(host,symbol)=>{const bars=sample(symbol),k=key+'replay-'+symbol;
      function draw(){
        const decisions=JSON.parse(localStorage.getItem(k)||'[]'),n=Math.min(bars.length,4+decisions.length);
        host.replaceChildren();chart(host,symbol,bars.slice(0,n));const pivots=[];
        for(let j=1;j<n-1;j++){if(bars[j][1]>Math.max(bars[j-1][1],bars[j+1][1]))pivots.push('high on '+(j+1));if(bars[j][2]<Math.min(bars[j-1][2],bars[j+1][2]))pivots.push('low on '+(j+1));}
        add(host,'p','Confirmed three-bar pivots: '+(pivots.join(', ')||'none')+'. A pivot needs a closed candle on each side.');
        if(n===bars.length){add(host,'p','Sample complete.');decisions.forEach(x=>add(host,'p','Bar '+x.bar+' · '+x.action+' · '+x.reason));const reset=add(host,'button','Start another attempt');reset.onclick=()=>{save('replayArchive',{symbol,decisions});localStorage.removeItem(k);draw();};return;}
        form(host,'Save decision and reveal next bar',f=>{field(f,'action','Decision',['Wait','Skip','Enter long','Enter short']);field(f,'reason','Evidence at the current candle');},v=>{if(localStorage.getItem(k)!==null&&JSON.stringify(decisions)!==localStorage.getItem(k)){draw();return;}localStorage.setItem(k,JSON.stringify([...decisions,{bar:n,...v}]));draw();});}
      draw();});
  }
  function backtest(box){add(box,'p','Educational closing-price breakout. Enter long at the following open after a close above the previous high. Exit when that bar closes. Fixed initial risk is one point per trade. Costs apply per round trip.');
    form(box,'Run sample backtest',f=>{field(f,'symbol','Sample contract',samples);field(f,'split','Evaluation sample',['Development · bars 1-7','Holdout · bars 8-12']);field(f,'fees','Round-turn fees, USD','number','1',{min:0,step:'.01'});field(f,'slip','Round-trip slippage, ticks','number','1',{min:0,step:'1'});},v=>{
      const bars=sample(v.symbol),hold=v.split.startsWith('Holdout'),returns=[];let equity=0,peak=0,dd=0;
      for(let i=hold?7:2;i<(hold?bars.length:7);i++){if(bars[i-1][3]<=bars[i-2][1])continue;const net=bars[i][3]-bars[i][0]-(+v.slip*.25)-(+v.fees/points[v.symbol]);returns.push(net);equity+=net;peak=Math.max(peak,equity);dd=Math.max(dd,peak-equity);}
      const n=returns.length,wins=returns.filter(x=>x>0),losses=returns.filter(x=>x<0);const avg=a=>a.length?(a.reduce((s,x)=>s+x,0)/a.length).toFixed(2):'-';
      const result=n+' trades · win rate '+(n?(100*wins.length/n).toFixed(1)+'%':'-')+' · average win '+avg(wins)+' R · average loss '+avg(losses)+' R · expectancy '+avg(returns)+' R · max drawdown '+dd.toFixed(2)+' R.';
      save('tests',{...v,version:'close-breakout-v1',sample:'EDU-'+v.symbol+'-01',result});return result;});
    saved(box,'tests',v=>v.symbol+' · '+v.split+' · '+v.version+' · '+v.result);link(box,'Open the full Strategy Lab','/strategy-lab/');}
  function risk(box){add(box,'p','Conditional educational references. All four examples use a 0.25-point tick. Tick values: NQ $5, MNQ $0.50, ES $12.50, MES $1.25. Confirm the contract specification for your account.');
    form(box,'Calculate size',f=>{field(f,'symbol','Contract',Object.keys(points));field(f,'stop','Stop distance in points','number','10',{step:'.25',min:'.25'});field(f,'budget','Risk budget in USD','number','200',{min:0,step:'.01'});field(f,'fees','Round-turn fees per contract in USD','number','0',{min:0,step:'.01'});field(f,'slip','Round-trip slippage in ticks','number','0',{min:0,step:'1'});},v=>{
      const cents=Math.round(((+v.stop+.25*(+v.slip))*points[v.symbol]+(+v.fees))*100),qty=Math.floor(Math.round(+v.budget*100)/cents);
      return qty+' whole contracts · $'+(cents/100).toFixed(2)+' estimated risk per contract · $'+(qty*cents/100).toFixed(2)+' total estimated risk.';});link(box,'Open the full Risk Lab','/risk/');}
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
      action.addEventListener('change',()=>{
        const trade=action.value==='Trade';
        for(const control of [primary,outcome]){
          control.required=trade;
          control.disabled=!trade;
        }
      });
    },v=>{
      const trade=v.action==='Trade';
      if(trade&&(!playbooks.includes(v.primary)||!['Win','Loss','Scratch'].includes(v.outcome))){
        throw Error('Select a playbook and outcome for a trade.');
      }
      save('journal',{...v,primary:trade?v.primary:null,outcome:trade?v.outcome:null,
        tags:v.tags.split(',').map(x=>x.trim()).filter(Boolean)});
      return 'Journal entry saved on this device.';
    });
    saved(box,'journal',v=>[v.date,v.symbol,v.primary,v.tags.join(', '),v.action,v.quality,v.adherence,
      v.outcome,v.plan,v.actual,v.emotion,v.review].filter(Boolean).join(' · '));
    link(box,'Open private account workspace','/account/');
  }
  window.renderPractice=(root,id,query='')=>{
    root.replaceChildren();const m=modules.find(v=>v.id===Number(id));
    if(!m){add(root,'h2','Practice');modules.filter(v=>(v.title+' '+v.description).toLowerCase().includes(String(query||'').toLowerCase())).forEach(v=>{const card=add(root,'article');link(card,v.id+'. '+v.title,'?view=practice&id='+v.id);add(card,'p',v.description);});return;}
    link(root,'All practice modules','?view=practice');add(root,'h2',m.title);add(root,'p',m.description);
    const videos=add(root,'p');link(videos,m.label,'https://www.youtube.com/watch?v='+m.video+(m.id===13?'&t=1194s':''));if(m.alternate){videos.append(' · ');link(videos,m.alternateLabel,'https://www.youtube.com/watch?v='+m.alternate+(m.id===16?'&t=1090s':''));}
    try{[annotation,planner,replay,backtest,risk,journal][m.id-11](root);}catch(e){add(root,'p','This practice could not load. '+e.message);}
  };
})();
