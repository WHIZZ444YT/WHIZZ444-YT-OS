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
  await staticPage.close();
  console.log('Public UI passed at six widths in both themes, including keyboard drawer and homepage search.');
} finally {
  await browser.close();
}
