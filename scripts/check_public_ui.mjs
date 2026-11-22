import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
  await page.waitForURL(site + '/ict-lab/resources/');
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
  await page.goto(site + '/ict-lab/resources/#academy-video-gaps');
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
  await page.goto(site + '/ict-lab/resources/#watch-library');
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
  await staticPage.goto(site + '/ict-lab/resources/');
  assert.ok(await staticPage.getByRole('navigation', { name: 'Resource sections' }).isVisible());
  assert.equal(await staticPage.locator('[data-ict-item]').count(), 100);
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
