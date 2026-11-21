(() => {
  'use strict';
  // Each entry points to a canonical video. Chapter offsets are seconds from the start.
  const mentors = [
    ['TTrades','TTrades_edu','Study the sequence from daily bias to breaker selection and lower-timeframe execution.',[['g3oDYq4P9ZE','ICT daily bias'],['75S4vwD4P1U','Breaker blocks'],['9AL41xON3hA','Fractal Model']]],
    ['The Inner Circle Trader','InnerCircleTrader','Use the original mentorship to trace displacement, shifts, the Silver Bullet and the Market Maker Models back to their source.',[['Bkt8B3kLATQ','2022 Mentorship Episode 6'],['tRq1hyGGtl4','Silver Bullet'],['iKsIbUblSWM','Market Maker Models']]],
    ['JadeCap','JadeCap','Follow a futures trader’s progression from liquidity selection to a complete playbook.',[['zqzf874CJA0','Liquidity in 22 minutes'],['OIS41B24HGM','ICT strategy course'],['qYdj6ncWNxc','Futures execution breakdown']]],
    ['AM','amtrades','Compare daily profiles and record the evidence needed to confirm or abandon a directional bias.',[['4XOHXoputX0','Daily profiles'],['bWAKrdIbyoQ','Mechanical bias confirmation'],['QmGJFxfSHxM','Day selection with TTrades']]],
    ['DodgysDD','DodgysDD','Compare the published strategy with a trader’s decisions during an individual recap.',[['8EkwGnZz-Lk','ICT strategy walkthrough'],['pDuYfau3qmI','Trade recap']]],
    ['Zeussy','','Study the relationship between session timing and price. The linked lesson opens the original uploader.',[['9OiCH9vhCIA','Markets Move Based on Their Schedule']]],
    ['Justin Werlein','JustinWerlein','Start with liquidity, then examine accumulation, manipulation and distribution across a session.',[['6SGzWB8X7dI','What is liquidity?'],['0rZ8Vfq-xgk','Power of Three']]],
    ['Ali Khan','ali_khan_ict','Choose a setup and write its entry requirements before studying examples.',[['0s8pp5YaRHk','Step-by-step ICT setup'],['MPR0twSaRp4','Beginner guide to ICT']]],
    ['Kimmel Trading','kimmeltrading','Select the concepts that a single playbook requires and practice recognizing them.',[['Bi6D75jHnZM','Step-by-step ICT lesson'],['oRDC-JMMJns','Choosing ICT concepts']]],
    ['flux trades','fluxtrades','Compare entry triggers across the phases of the market maker buy and sell models.',[['ShlccbF9jUA','How to trade MMXM'],['QMNL9SMYUR4','Entries for each phase']]]
  ];
  const chart = 'Chart Fanatics', words = 'Words of Rizdom';
  const podcasts = [
    ['8OX-mcSHWhg',chart,'JadeCap','Full episode','Liquidity and futures execution','Follow how the guest turns key levels into a futures playbook.', ['C04','C05','C45'],[]],
    ['UIGZtoGGPH4',chart,'Dhesi Trades','Full episode','Reversal confirmation and iFVG','Compare daily sweeps with the lower-timeframe trigger and reversal examples.', ['C17','C45','P07'],[[364,'One-minute entry'],[1306,'Reversal breakdown'],[1989,'New York entry']]],
    ['PZDWQgtqt2I',chart,'Tanja Trades','Full episode','ICT futures strategy','Write down the entry requirements as the guest demonstrates them on a chart.', ['C08','C16','P01'],[]],
    ['IB-fyWI5j8w',chart,'Omor / NBB Trader','Full episode','ICT entries for prop trading','Compare the guest’s setup selection and execution with another futures playbook.', ['C25','C45'],[]],
    ['-kGVL93XfyE',chart,'Candace Lau','Full episode','ICT scalping and risk','Follow the transition from a higher-timeframe bias to entry and risk management.', ['C37','C45'],[[536,'Liquidity and daily bias'],[1305,'Entry model'],[2832,'Trade management']]],
    ['dQuHz6Vadow',chart,'Guest unconfirmed','Clip','ICT entry selection','Review the entry discussion alongside the lower-timeframe confirmation exercise.', ['C45'],[]],
    ['w42kzZb9oYY',words,'JadeCap','Full episode','Risk and emotional control','Study how this trader describes risk discipline and composure following a loss.', ['C40'],[[1090,'Risk management'],[5136,'Emotional control'],[5522,'Handling losses']]],
    ['9j1jttkm4s8',words,'NBB Trader, JadeCap, Ali Khan and Kimmel Trading','Full episode','ICT roundtable','Compare four perspectives on technical concepts, study habits and execution discipline.', ['C25','C40'],[[948,'Studying ICT'],[1752,'Technical concepts'],[4861,'Discipline']]],
    ['rxPPBj29kFg',words,'Omor / NBB Trader','Full episode','ICT strategy and execution, part II','Compare the interview with the guest’s Chart Fanatics walkthrough.', ['C25','C45'],[]],
    ['LF1VTFohH0U',words,'ICT trader interview','Full episode','Learning and execution mistakes','Use the guest discussion to review execution habits. Treat the headline percentage as a guest claim.', ['C40','C45'],[]],
    ['nY1NaXsFDQM','Words of Rizdom Clips','Ali Khan','Clip','Episode 69 excerpt','Study the guest perspective alongside his step-by-step setup lesson.', ['C25','C45'],[]]
  ];
  const el = (tag, value) => { const node = document.createElement(tag); if(value) node.textContent=value; return node; };
  function link(label, url, external=false) {
    const a=el('a',label); a.href=url;
    if(external){ a.target='_blank'; a.rel='noopener noreferrer'; }
    return a;
  }
  function watch(id, seconds) {
    return 'https://www.youtube.com/watch?v='+id+(seconds ? '&t='+seconds+'s' : '');
  }
  function render(root, view, selected, query, rows, build) {
    root.replaceChildren();
    const heading=el('h2',view==='mentors'?'Mentor directory':'ICT podcasts');
    root.append(heading);
    const grid=el('div'); grid.className='lab-grid';
    const matches=rows.filter(row=>(!selected || row.id===selected) && (!query || row.search.toLowerCase().includes(String(query).trim().toLowerCase())));
    for (const row of matches) {
      const card=el('article'); card.className='lab-card';
      const title=el('h3'); title.append(link(row.title,'?view='+view+'&id='+encodeURIComponent(row.id))); card.append(title);
      build(card,row.data);
      grid.append(card);
    }
    if(!matches.length) grid.append(el('p','No matching resources.'));
    root.append(grid);
  }
  function listLinks(card, links) {
    const ul=el('ul'); for(const a of links){const li=el('li');li.append(a);ul.append(li);}card.append(ul);
  }
  window.renderMentors=(root,id,query)=>render(root,'mentors',id,query,mentors.map((m,i)=>({id:'M'+String(i+1).padStart(2,'0'),title:m[0],search:m.flat(2).join(' '),data:m})),(card,[name,handle,description,videos])=>{
    card.append(el('p',description));
    listLinks(card,videos.map(([v,label])=>link('Watch '+label,watch(v),true)));
    if(handle)card.append(link('Open '+name+' on YouTube','https://www.youtube.com/@'+handle,true));
  });
  window.renderPodcasts=(root,id,query)=>render(root,'podcasts',id,query,podcasts.map(p=>({id:p[0],title:p[4],search:p.flat(2).join(' '),data:p})),(card,[v,host,guest,type,title,description,related,chapters])=>{
    card.append(el('p',type+' · '+host+' · '+guest),el('p',description),link('Watch '+title,watch(v),true));
    if(chapters.length)listLinks(card,chapters.map(([t,label])=>link(new Date(t*1000).toISOString().slice(11,19).replace(/^00:/,'')+' — '+label,watch(v,t),true)));
    card.append(el('h4','Related lessons'));
    listLinks(card,related.map(k=>link(k,'?view='+(k.startsWith('P')?'playbooks':'learn')+'&id='+k)));
  });
  window.ictMediaCounts={mentors:mentors.length,episodes:podcasts.filter(p=>p[3]==='Full episode').length,clips:podcasts.filter(p=>p[3]==='Clip').length};
})();