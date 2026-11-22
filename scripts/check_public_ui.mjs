import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
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
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebarToggle');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
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
  await staticPage.close();
  console.log('Public UI passed at six widths in both themes, including keyboard drawer and homepage search.');
} finally {
  await browser.close();
}
