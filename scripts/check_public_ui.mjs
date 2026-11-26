import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const [dependencies, output] = process.argv.slice(2);
const { chromium } = createRequire(join(dependencies, 'package.json'))('playwright');
const site = 'http://127.0.0.1:8798';
const cases = [
  ['home', '/'], ['learn', '/ict-lab/learn/'],
  ['c34', '/ict-lab/learn/c34/'], ['charts', '/charts/'],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  // Use the checked-in public data and avoid requesting third-party widgets.
  await page.route('**/*', route => route.request().url().startsWith(site + '/')
    ? route.continue() : route.abort());
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 360, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      for (const [name, path] of cases) {
        const response = await page.goto(site + path);
        assert.equal(response.status(), 200, path);
        await page.evaluate(value => localStorage.setItem('fios.theme.preference.v1', value), theme);
        await page.reload();
        await page.waitForFunction(value => document.body.classList.contains('os-' + value), theme);
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        assert.ok(dimensions.content <= dimensions.viewport + 1,
          [name, width, theme, JSON.stringify(dimensions)].join(' '));
        if ([390, 1440].includes(width)) {
          await page.screenshot({ path: join(output, name + '-' + width + '-' + theme + '.png') });
        }
      }
    }
  }

  const desk = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await desk.route("**/assets/runtime-config.js", route => route.fulfill({
    contentType: "application/javascript",
    body: 'window.FINANCE_OS_CONFIG = {apiBase: location.origin};'
  }));
  await desk.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/macro/funding")) return route.fulfill({json:{
      status:"fresh",rates:[{type:"SOFR",percentRate:4.5,effectiveDate:"2026-11-25"}]
    }});
    if (path.endsWith("/cot")) return route.fulfill({status:503,json:{error:"COT unavailable"}});
    if (path.endsWith("/news")) return route.fulfill({json:{
      status:"stale",articles:[{title:"Fixture headline",markets:["gc"],url:"https://publisher.example/article"}]
    }});
    return route.fulfill({json:{status:"fresh",events:[]}});
  });
  await desk.goto(site + "/futures-intelligence/?market=gc&horizon=30#daily-brief");
  const brief = desk.locator("#daily-brief");
  await brief.getByRole("button",{name:"Load snapshots"}).click();
  await brief.getByText(/SOFR 4.5%/).waitFor();
  await brief.getByText(/Positioning snapshot unavailable/).waitFor();
  await brief.getByRole("link",{name:/Fixture headline/}).waitFor();
  await brief.locator('select[name="horizon"]').selectOption("1");
  await desk.reload();
  assert.equal(await brief.locator('select[name="market"]').inputValue(),"gc");
  assert.equal(await brief.locator('select[name="horizon"]').inputValue(),"1");
  assert.equal(await brief.getByRole("link",{name:"Charts",exact:true}).getAttribute("href"),"/charts/?market=gc");
  // Export after loading provider data so an accidental inclusion fails even with a populated brief.
  await brief.getByRole("button",{name:"Load snapshots"}).click();
  await brief.getByRole("link",{name:/Fixture headline/}).waitFor();
  const download = desk.waitForEvent("download");
  await brief.getByRole("button",{name:"Export local research plan"}).click();
  const payload = JSON.parse(await readFile(await (await download).path(),"utf8"));
  assert.deepEqual(Object.keys(payload).sort(),["end","generatedAt","horizonDays","market","schemaVersion","start"]);
  assert.equal(payload.market,"gc");
  assert.equal(payload.horizonDays,1);
  await desk.close();

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(site + '/');
  const sourcesRail = page.getByRole('complementary', { name: 'Data sources' });
  const railWidth = (await sourcesRail.boundingBox()).width;
  assert.ok(Math.abs((await sourcesRail.locator('section').boundingBox()).width - railWidth) <= 1);
  const sourceLibrary = sourcesRail.getByRole('link', { name: /Browse reviewed futures sources/ });
  await sourceLibrary.click();
  assert.equal(new URL(page.url()).pathname, '/sources/');

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(site + '/');
  const sidebarMarket = page.getByRole('navigation', { name: 'Futures product areas' })
    .getByRole('link', { name: 'Markets', exact: true });
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  assert.equal(await sidebarMarket.locator('.os-nav-label').isVisible(), false);
  await page.getByRole('button', { name: 'Expand navigation' }).click();
  assert.equal(await sidebarMarket.locator('.os-nav-label').isVisible(), true);

  await page.goto(site + '/academy/crosswalk/');
  assert.equal(await page.locator('#appSidebar [aria-current]').getAttribute('aria-current'), 'location');
  assert.equal(await page.locator('#appSidebar [aria-current]').getAttribute('href'), '/academy/');

  await page.goto(site + '/charts/?market=nq&comparison=nq&interval=15');
  const charts = page.locator('#public-chart-controls');
  const market = charts.locator('select[name="market"]');
  const comparison = charts.locator('select[name="comparison"]');
  const comparisonChart = page.locator('[data-chart-slot]').nth(1);
  assert.equal(await comparison.inputValue(), '');
  assert.equal(await comparison.locator('option[value="nq"]').evaluate(option => option.disabled), true);
  assert.equal(await comparisonChart.isVisible(), false);
  await comparison.selectOption('es');
  assert.equal(await comparisonChart.isVisible(), true);
  await market.selectOption('es');
  assert.equal(await comparison.inputValue(), '');
  assert.equal(await comparisonChart.isVisible(), false);
  await page.goBack();
  assert.equal(await comparison.inputValue(), 'es');
  assert.equal(await comparisonChart.isVisible(), true);

  const widgetPage = await browser.newPage({ viewport: { width: 320, height: 844 } });
  const requests = [];
  const vendor = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  await widgetPage.route(vendor, route => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body:
      '(() => { const widget = document.currentScript.parentElement.querySelector(".tradingview-widget-container__widget");' +
      'const frame = document.createElement("iframe"); frame.src = "about:blank"; widget.append(frame); })();'
    });
  });
  await widgetPage.goto(site + '/charts/?market=nq&comparison=es&interval=60');
  const previewButton = widgetPage.getByRole('button', {name:'Load previews'});
  await previewButton.waitFor();
  assert.equal(requests.length,0);
  await previewButton.click();
  const frames = widgetPage.locator('[data-chart-mount] iframe');
  await frames.nth(1).waitFor();
  assert.equal(await frames.count(),2);
  assert.match(await frames.first().getAttribute('title'),/TradingView/);
  assert.equal(await widgetPage.locator('.tradingview-widget-copyright a').count(),2);
  const config = () => widgetPage.locator('[data-chart-mount] script').first().evaluate(node => JSON.parse(node.textContent));
  assert.equal((await config()).interval,'60');
  const themeButton = widgetPage.locator('#osThemeToggle');
  const themeBefore = (await config()).theme;
  await themeButton.click();
  await widgetPage.waitForFunction(prior => {
    const script = document.querySelector('[data-chart-mount] script');
    return script && JSON.parse(script.textContent).theme !== prior;
  },themeBefore);
  assert.ok(await widgetPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await widgetPage.locator('#public-chart-controls [name=market]').selectOption('dx');
  assert.equal(await widgetPage.locator('[data-chart-mount] script').count(),0);
  await widgetPage.locator('#public-chart-controls [name=comparison]').selectOption('');
  await previewButton.click();
  await widgetPage.getByText(/Hosted coverage has not been verified/).waitFor();
  assert.equal(await widgetPage.locator('[data-chart-mount] script').count(),0);
  assert.match(await widgetPage.getByRole('link',{name:'Open chart on TradingView'}).getAttribute('href'),/ICEUS%3ADX1/);
  await widgetPage.close();

  await page.goto(site + '/charts/?market=gc');
  await page.getByRole('button',{name:'Load previews'}).click();
  await page.getByText('Preview unavailable. Open the direct TradingView link.').waitFor();
  assert.equal(await page.getByRole('link',{name:'Open chart on TradingView'}).isVisible(),true);

  const noScripts = await browser.newPage({ javaScriptEnabled:false });
  await noScripts.goto(site + '/charts/');
  assert.match(await noScripts.getByRole('link',{name:'Open chart on TradingView'}).getAttribute('href'),/CME_MINI%3ANQ1/);
  await noScripts.close();

  const calendarPage = await browser.newPage({ viewport: {width:390,height:844}, timezoneId:"UTC" });
  await calendarPage.route("**/assets/runtime-config.js", route => route.fulfill({
    contentType:"application/javascript",body:"window.FINANCE_OS_CONFIG={apiBase:location.origin};"
  }));
  await calendarPage.route("**/api/v1/events**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/bea")) return route.fulfill({status:503,json:{status:"unavailable"}});
    const rows = path.endsWith("/fomc") ? [{
      event_id:"date",title:"Fixture committee meeting",scheduled_date:"2099-11-02",scheduled_end_date:"2099-11-03",
      date_only:true,scheduled_timezone:"America/New_York",schedule_status:"tentative"
    }] : path === "/api/v1/events" ? [{
      event_id:"timed",title:"Fixture payroll release",scheduled_at_utc:"2099-11-06T13:30:00Z",
      scheduled_date:"2099-11-06",scheduled_timezone:"America/New_York",schedule_status:"scheduled"
    }] : [];
    return route.fulfill({json:{status:"fresh",events:rows}});
  });
  await calendarPage.goto(site + "/sessions/#calendar");
  await calendarPage.locator("#sessionsRange").selectOption("all");
  await calendarPage.getByText("Fixture payroll release").waitFor();
  assert.match(await calendarPage.locator("#sessionsFeedState").innerText(),/PARTIAL/);
  await calendarPage.locator("#sessionsPublisher").selectOption("FOMC");
  const meeting = calendarPage.locator(".sessions-event-card");
  assert.equal(await meeting.count(),1);
  assert.match(await meeting.innerText(),/date only/i);
  assert.match(await meeting.innerText(),/Tentative/);
  assert.doesNotMatch(await meeting.innerText(),/Asia\/Kolkata:/);
  await calendarPage.locator("#sessionsPublisher").selectOption("BLS");
  assert.match(await meeting.innerText(),/Asia\/Kolkata:/);
  assert.match(await meeting.innerText(),/America\/New_York:/);
  assert.equal(await calendarPage.locator("#windows").count(),1);
  await calendarPage.close();

  const newsPage = await browser.newPage({ viewport:{width:390,height:844} });
  await newsPage.route("**/assets/runtime-config.js", route => route.fulfill({
    contentType:"application/javascript",body:"window.FINANCE_OS_CONFIG={apiBase:location.origin};"
  }));
  await newsPage.route("**/api/v1/news**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/official")) return route.fulfill({json:{status:"stale",releases:[{
      title:"<markup> Fixture policy release",url:"https://www.federalreserve.gov/newsevents/pressreleases/monetary20990101a.htm",published_at:null
    }]}});
    return route.fulfill({status:503,json:{error:{message:"Fixture discovery unavailable"}}});
  });
  await newsPage.goto(site + "/news/");
  const official = newsPage.locator("#official-releases");
  await official.getByRole("link",{name:"<markup> Fixture policy release"}).waitFor();
  assert.equal(await official.locator("markup").count(),0);
  assert.match(await official.innerText(),/Publication time unavailable/);
  await newsPage.getByText(/Fixture discovery unavailable/).waitFor();
  await newsPage.close();

  const energy = await browser.newPage({ viewport:{width:390,height:844} });
  await energy.route("**/assets/runtime-config.js", route => route.fulfill({
    contentType:"application/javascript",body:"window.FINANCE_OS_CONFIG={apiBase:location.origin};"
  }));
  await energy.route("**/api/v1/economic/eia", route => route.fulfill({json:{status:"not-configured",records:[]}}));
  await energy.route("**/api/v1/events/eia", route => route.fulfill({json:{status:"fresh",events:[{
    scheduled_at_utc:"2099-12-24T16:00:00Z",timezone_basis:"publisher-holiday-exception",schedule_status:"scheduled"
  }]}}));
  await energy.goto(site + "/macro/energy/");
  await energy.getByText(/EIA API key is not configured/).waitFor();
  await energy.getByText(/Publisher holiday exception/).waitFor();
  assert.equal(await energy.locator("#energySeries article").count(),3);
  assert.match(await energy.locator("#energySeries").innerText(),/Billion cubic feet/);
  assert.ok(await energy.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  await energy.close();

  const staticEnergy = await browser.newPage({javaScriptEnabled:false});
  await staticEnergy.goto(site + "/macro/energy/");
  assert.equal(await staticEnergy.getByRole("link",{name:"OPEC Monthly Oil Market Report"}).isVisible(),true);
  assert.equal(await staticEnergy.getByRole("link",{name:"EIA Weekly Petroleum Status Report"}).isVisible(),true);
  await staticEnergy.close();

  const globalMacro = await browser.newPage({ viewport:{width:390,height:844} });
  await globalMacro.route("**/assets/runtime-config.js", route => route.fulfill({
    contentType:"application/javascript",body:"window.FINANCE_OS_CONFIG={apiBase:location.origin};"
  }));
  await globalMacro.route("**/api/v1/economic/world-bank", route => route.fulfill({json:{status:"fresh",records:[
    {series_id:"NY.GDP.MKTP.KD.ZG:IND",series_name:"Real GDP growth",observation_date:"2025-01-01",value:6,unit:"Annual percent"},
    {series_id:"NY.GDP.MKTP.KD.ZG:USA",series_name:"Real GDP growth",observation_date:"2024-01-01",value:2,unit:"Annual percent"}
  ]}}));
  await globalMacro.route("**/api/v1/economic/ecb", route => route.fulfill({json:{status:"fresh",records:[
    {series_id:"EXR:D.USD.EUR.SP00.A:0:0",observation_date:"2026-11-25",value:1.1234}
  ]}}));
  await globalMacro.goto(site + "/macro/global/");
  await globalMacro.getByText("India · 6 Annual percent").waitFor();
  assert.match(await globalMacro.locator("#globalWdi").innerText(),/United States · Unavailable/);
  await globalMacro.locator("#globalYear").selectOption("2024");
  await globalMacro.getByText("United States · 2 Annual percent").waitFor();
  assert.match(await globalMacro.locator("#globalWdi").innerText(),/India · Unavailable/);
  await globalMacro.getByText(/1\.1234 USD per EUR/).waitFor();
  assert.equal(await globalMacro.getByRole("link",{name:"6E Futures Charts"}).getAttribute("href"),"/charts/?market=6e");
  assert.ok(await globalMacro.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  await globalMacro.close();

  await page.goto(site + '/ict-lab/learn/c17/');
  const worked = page.locator('[data-ifvg-worked]');
  const saveDecision = page.getByRole('button', { name: 'Save decision and reveal chart' });
  assert.equal(await worked.isVisible(), false);
  await page.locator('[data-ifvg-practice] select[name="decision"]').selectOption('Wait');
  await page.getByLabel('Short invalidation price').fill('20012');
  await page.evaluate(() => {
    window.originalStorageSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Fixture storage error'); };
  });
  await saveDecision.click();
  assert.equal(await worked.isVisible(), false);
  await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; });
  await saveDecision.click();
  await page.getByRole('heading', { name: 'After saving your decision' }).waitFor();
  assert.equal(await worked.isVisible(), true);

  for (const [width, path] of [[320, '/ict-futures/'], [851, '/status/'], [1120, '/ict-futures/']]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(site + path);
    assert.ok(await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), path + ' at ' + width);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(site + '/');
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.closest('#appSidebar')?.id), 'appSidebar');
  assert.equal(await page.locator('.os-main-column').evaluate(node => node.inert), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.closest('[role="dialog"]')?.id), 'appSidebar');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebarToggle');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('.os-main-column').evaluate(node => node.inert), false);
  await toggle.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Close navigation', exact: true }).click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  await page.goto(site + '/');
  await page.keyboard.press('Tab');
  await page.getByRole('link', { name: 'Skip to content' }).press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'content');
  await page.getByRole('searchbox', { name: 'Search markets, lessons and tools' }).fill('FVG');
  await page.getByRole('search', { name: 'Global search' }).getByRole('button', { name: 'Search' }).click();
  assert.equal(new URL(page.url()).searchParams.get('q'), 'FVG');
  await page.waitForURL(url => url.pathname === '/search/');
  for (const value of ['NQ', 'FVG', 'IFVG', 'MSS', 'COT']) {
    const query = page.getByRole('searchbox', { name: 'Search the site' });
    await query.fill(value);
    await query.press('Enter');
    assert.ok(await page.locator('[data-results] a').count(), value);
  }
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.has('q'), false);
  await page.goBack();
  assert.equal(await page.getByRole('searchbox', { name: 'Search the site' }).inputValue(), 'COT');
  await page.goto(site + '/search/');
  const directory = page.getByRole('navigation', { name: 'Browse public pages' });
  const directoryLinks = await directory.getByRole('link').evaluateAll(links => links.map(link => link.href));
  assert.equal(new Set(directoryLinks).size, directoryLinks.length);
  assert.equal(await directory.getByRole('link', { name: 'Futures Desk', exact: true }).getAttribute('href'), '/futures-intelligence/');
  assert.equal(await directory.getByRole('link', { name: 'Markets', exact: true }).getAttribute('href'), '/markets/');

  await page.goto(site + '/academy/');
  assert.ok(await page.locator('main a[href="/academy/learn/c17/"]').first().isVisible());
  assert.equal(await page.locator('main .academy-progress-summary, main .academy-tutorial-card').count(), 0);
  assert.equal(await page.locator('main a[href^="/ict-futures/academy/"]').count(), 0);
  for (const section of ['playbooks', 'practice', 'podcasts', 'mentors', 'videos']) {
    const path = '/academy/' + section + '/';
    const entry = page.getByRole('navigation', { name: 'ICT Academy sections' }).locator('a[href="' + path + '"]');
    assert.equal(await entry.count(), 1);
    await entry.click();
    assert.equal(new URL(page.url()).pathname, path);
    await page.locator('main .page-hero h1').waitFor({state:'visible', timeout:10000});
    assert.equal(await page.getByRole('navigation', { name: 'ICT Academy sections' })
      .locator('[aria-current="page"]').getAttribute('href'), path);
    await page.goBack();
  }
  await page.goto(site + '/academy/learn/');
  await page.locator('main a[href="/academy/learn/c17/"]').first().click();
  await page.getByRole('button', { name: 'Save decision and reveal chart' }).waitFor();
  assert.equal(await page.locator('[data-ifvg-worked]').isVisible(), false);
  assert.equal(await page.getByRole('navigation', { name: 'ICT Academy sections' })
    .locator('[aria-current="location"]').getAttribute('href'), '/academy/learn/');

  await page.goto(site + '/ict-lab/');
  const labViews = ['learn', 'playbooks', 'practice', 'podcasts', 'mentors'];
  for (const view of labViews) {
    const destination = '/ict-lab/' + view + '/';
    const entry = page.locator('main a[href="' + destination + '"]');
    assert.equal(await entry.count(), 1);
    await entry.click();
    assert.equal(new URL(page.url()).pathname, destination);
    assert.equal(await page.getByRole('navigation', { name: 'ICT Lab sections' })
      .locator('[aria-current="page"]').getAttribute('href'), destination);
    await page.goBack();
  }

  await page.goto(site + '/ict-lab/?view=learn&id=C34&q=weekly+open');
  await page.waitForURL(url => url.pathname === '/ict-lab/learn/c34/');
  assert.equal(new URL(page.url()).searchParams.get('q'), 'weekly open');

  await page.goto(site + '/ict-lab/learn/');
  const firstPath = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'First ICT workflow' }) });
  await firstPath.getByRole('link', { name: 'Liquidity', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(site + '/ict-lab/learn/c01/');
  assert.equal(await page.getByRole('link', { name: 'Practice next' }).count(), 1);
  await page.goBack();
  await page.getByRole('link', { name: 'Browse the complete resource index' }).click();
  await page.waitForURL(site + '/academy/videos/');
  assert.ok(await page.getByRole('heading', { name: 'Predecessor tutorial placements' }).isVisible());
  await page.goBack();
  const labSearch = page.locator('[data-ict-search]');
  const labQuery = labSearch.getByRole('searchbox');
  for (const alias of ['FVG', 'IFVG', 'MSS', 'BSL', 'CBDR']) {
    await labQuery.fill(alias);
    await labQuery.press('Enter');
    assert.equal(new URL(page.url()).searchParams.get('q'), alias);
    assert.match(await page.locator('[data-ict-search-status]').innerText(), /matching items/);
  }
  await page.goBack();
  assert.equal(await labQuery.inputValue(), 'BSL');
  await page.goForward();
  assert.equal(await labQuery.inputValue(), 'CBDR');

  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  for (const path of ['/ict-lab/learn/c34/', '/ict-lab/playbooks/p10/', '/ict-lab/practice/16/']) {
    const response = await staticPage.goto(site + path);
    assert.equal(response.status(), 200, path);
    assert.ok(await staticPage.getByRole('heading', { level: 1 }).isVisible(), path);
    assert.ok(await staticPage.locator('[data-ict-view] p').count(), path);
  }
  await page.goto(site + '/ict-lab/learn/');
  const category = page.getByLabel('Learning resources');
  await category.selectOption('extension');
  assert.ok(await page.getByRole('heading', { name: 'Academy extensions' }).isVisible());
  await category.selectOption('original');
  assert.ok(await page.getByRole('heading', { name: 'Original ICT lectures' }).isVisible());
  await page.goBack();
  assert.equal(await category.inputValue(), 'extension');
  await page.goForward();
  assert.equal(await category.inputValue(), 'original');
  await page.goto(site + '/ict-lab/playbooks/?format=academy');
  assert.ok(await page.getByRole('heading', { name: 'Academy model variants' }).isVisible());
  assert.equal(await page.locator('#charter-lectures').isVisible(), false);
  await page.goto(site + '/ict-lab/video-evidence/#academy-video-gaps');
  assert.equal(await page.locator('#academy-video-gaps article').count(), 31);
  await page.goto(site + '/ict-lab/mentors/m06/');
  const channel = page.getByRole('link', { name: 'Visit YouTube channel' });
  await channel.focus();
  assert.equal(await channel.getAttribute('href'), 'https://www.youtube.com/@Zeussy');
  assert.ok(await page.getByRole('heading', { name: 'Best for this topic' }).isVisible());
  await page.goto(site + '/ict-lab/playbooks/#charter-lectures');
  assert.equal(await page.locator('#charter-lectures article').count(), 13);
  const perf = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  await perf.route('**/*', route => route.request().url().startsWith(site + '/')
    ? route.continue() : route.abort());
  const cdp = await perf.context().newCDPSession(perf);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750,
  });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await perf.addInitScript(() => {
    window.labVitals = { lcpMs: null, cls: 0, firstShift: null, lastShift: null, sessionShift: 0 };
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      if (entries.length) window.labVitals.lcpMs = entries.at(-1).startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      const vitals = window.labVitals;
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        if (vitals.lastShift === null || entry.startTime - vitals.lastShift >= 1000 ||
            entry.startTime - vitals.firstShift >= 5000) {
          vitals.firstShift = entry.startTime;
          vitals.sessionShift = 0;
        }
        vitals.lastShift = entry.startTime;
        vitals.sessionShift += entry.value;
        vitals.cls = Math.max(vitals.cls, vitals.sessionShift);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const labResults = [];
  for (const [name, path] of cases) {
    await perf.goto(site + path, { waitUntil: 'load' });
    await perf.waitForFunction(() => window.labVitals.lcpMs !== null);
    await perf.waitForLoadState('networkidle');
    const { lcpMs, cls } = await perf.evaluate(() => window.labVitals);
    labResults.push({ name, path, lcpMs: Math.round(lcpMs), cls, lcpTargetMet: lcpMs <= 2500, clsTargetMet: cls <= 0.1 });
  }
  await writeFile(join(output, 'mobile-performance.json'), JSON.stringify({
    setup: 'Chromium local static build, 390px, 4x CPU slowdown, 150ms latency, 1.6Mbps down, third-party requests blocked',
    fieldInp: null, results: labResults,
  }, null, 2) + '\n');
  console.log('Mobile lab metrics:', JSON.stringify(labResults));
  await perf.close();
  await page.goto(site + '/academy/videos/#watch-library');
  const resourceClass = page.getByLabel('Source class');
  const evidenceStatus = page.getByLabel('Evidence status');
  await resourceClass.selectOption('original');
  await evidenceStatus.selectOption('metadata-observed');
  const visibleResources = page.locator('[data-ict-item]:visible');
  assert.ok(await visibleResources.count());
  assert.equal(await page.locator('[data-ict-item]:visible:not([data-category="original"])').count(), 0);
  await page.reload();
  assert.equal(await resourceClass.inputValue(), 'original');
  assert.equal(await evidenceStatus.inputValue(), 'metadata-observed');
  await page.goBack();
  assert.equal(await evidenceStatus.inputValue(), '');
  await staticPage.goto(site + '/academy/videos/');
  assert.ok(await staticPage.getByRole('navigation', { name: 'Resource sections' }).isVisible());
  assert.ok(await staticPage.locator('[data-ict-item]').count() >= 127);
  await page.goto(site + '/ict-lab/resources/?q=opening#watch-library');
  await page.waitForURL(site + '/academy/videos/?q=opening#watch-library');
  await page.goto(site + '/ict-lab/practice/');
  assert.match(await page.locator('[data-ict-practice-progress]').innerText(), /this browser/);
  for (const path of ['/ict-lab/learn/c17/', '/ict-lab/learn/c45/', '/ict-lab/playbooks/p01/']) {
    await page.goto(site + path);
    assert.ok(await page.getByRole('navigation', { name: 'Breadcrumb' }).isVisible());
    assert.equal(await page.getByRole('link', { name: 'Practice next', exact: true }).count(), 1);
  }
  const research = await browser.newPage();
  let newsResponseStatus = 200;
  await research.route('**/api/v1/news?*', route => route.fulfill({
    status: newsResponseStatus,
    headers: { 'access-control-allow-origin': '*' },
    json: newsResponseStatus === 200 ? {
      status: 'fresh', retrieved_at: '2026-11-22T08:00:00Z',
      articles: [{ title: 'Fixture news', canonical_url: 'https://example.com/news' }],
    } : { error: { message: 'Fixture provider unavailable' } },
  }));
  await research.goto(site + '/news/');
  await research.getByRole('link', { name: 'Fixture news' }).waitFor();
  for (const [code, state] of [[403, 'denied'], [429, 'limited'], [503, 'unavailable']]) {
    newsResponseStatus = code;
    await research.locator('#newsInstrument').dispatchEvent('change');
    await research.locator('#newsState[data-provider-state="' + state + '"]').waitFor();
    assert.ok(await research.getByRole('link', { name: 'Fixture news' }).isVisible());
    assert.match(await research.locator('#newsState').innerText(), /last successful snapshot/);
  }
  const context = await (await research.request.get(site + '/data/market-context.json')).json();
  assert.equal(context.schemaVersion, 1);
  assert.equal(context.families.nq.series, 'continuous');
  assert.equal(context.families.nq.delaySeconds, null);
  for (const route of ['/futures-intelligence/', '/markets/', '/contract-specs/']) {
    await research.goto(site + route);
    await research.getByText(context.families.nq.summary, { exact: true }).first().waitFor();
  }
  await research.close();
  const contextForAccount = await browser.newContext({ serviceWorkers: 'block' });
  const workspace = await contextForAccount.newPage();
  await workspace.route('**/assets/runtime-config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.FINANCE_OS_CONFIG = { supabaseUrl: '${site}/__workspace-fixture', supabaseAnonKey: 'public-fixture' };`,
  }));
  await workspace.goto(site + '/account/');
  await workspace.getByRole('heading', { name: 'Sign in to your private workspace' }).waitFor();
  await contextForAccount.route(url => url.pathname.startsWith('/__workspace-fixture/'), route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    return route.fulfill({ headers, json: pathname.endsWith('/auth/v1/user')
      ? { id: 'ef3cedd4-3377-4539-af29-2d39a716c759', email: 'fixture@example.invalid' } : [] });
  });
  const sessionKey = 'finance-os-supabase-session-v1';
  await workspace.evaluate(key => localStorage.setItem(key, JSON.stringify({
    access_token: 'workspace-fixture', refresh_token: 'workspace-fixture',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  })), sessionKey);
  await workspace.reload();
  await workspace.waitForFunction(() => document.querySelector('#tab-overview h3') || document.querySelector('#accountMessage.error'));
  assert.equal(await workspace.locator('#accountMessage.error').count(), 0,
    await workspace.locator('#accountMessage').first().textContent());
  await workspace.getByRole('heading', { name: 'Performance overview' }).waitFor();
  await workspace.getByRole('button', { name: 'Trade journal', exact: true }).click();
  await workspace.locator('#tradeMarket').fill('NQH27');
  await workspace.getByRole('button', { name: 'Sync now' }).click();
  assert.match(await workspace.locator('#syncStatus').innerText(), /Save or cancel your edits/);
  assert.equal(await workspace.locator('#tradeMarket').inputValue(), 'NQH27');
  const secondTab = await contextForAccount.newPage();
  await secondTab.goto(site + '/');
  await secondTab.evaluate(key => localStorage.removeItem(key), sessionKey);
  await workspace.getByText('Signed out in another tab.').waitFor();
  assert.equal(await workspace.locator('#tradeMarket').count(), 0);
  await contextForAccount.close();

  await page.goto(site + '/strategy-lab/');
  const advanced = page.getByText('Advanced settings and chronological holdout', { exact: true });
  await advanced.click();
  assert.ok(await page.getByLabel('In-sample allocation (%)').isVisible());
  await page.goto(site + '/risk/');
  assert.equal(await page.locator('#riskResult').getAttribute('aria-live'), 'polite');
  await staticPage.close();
  console.log('Public UI passed at six widths in both themes, including keyboard drawer and homepage search.');
} finally {
  await browser.close();
}
