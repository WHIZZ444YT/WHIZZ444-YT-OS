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
  console.log('Public UI passed at six widths in both themes, including keyboard drawer and homepage search.');
} finally {
  await browser.close();
}

