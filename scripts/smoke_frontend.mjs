import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const requiredRoutes = [
  '/', '/charts/', '/macro/', '/research/reports/', '/data-health/', '/data-health/integrations/', '/strategy-lab/', '/account/'
];

export async function runFrontendSmoke({ baseUrl, expectedSha, fetchImpl = fetch }) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.port ||
      base.pathname !== '/' || base.search || base.hash || !/^[a-f0-9]{40}$/.test(expectedSha)) {
    throw new Error('Use an HTTPS frontend origin and a full lowercase Git SHA.');
  }
  async function get(path, classify) {
    try {
      const response = await fetchImpl(new URL(path, base), {
        redirect: 'error', signal: AbortSignal.timeout(12000)
      });
      return { path, status: response.status, ok: response.status === 200 && await classify(response) === true };
    } catch {
      return { path, status: null, ok: false };
    }
  }
  let observedSha = null;
  const manifest = await get('/route-manifest.json', async response => {
    if (!response.headers.get('content-type')?.includes('application/json')) return false;
    const data = await response.json();
    observedSha = /^[a-f0-9]{40}$/.test(data?.sourceCommit) ? data.sourceCommit : null;
    return observedSha === expectedSha && requiredRoutes.every(path => Object.hasOwn(data?.routes || {}, path));
  });
  const shells = await Promise.all(requiredRoutes.map(path => get(path, async response => {
    if (!response.headers.get('content-type')?.includes('text/html')) return false;
    if (path === '/charts/' && !response.headers.get('content-security-policy')?.includes('frame-src')) return false;
    const html = await response.text();
    return html.includes('id="appSidebar"') && (path !== '/account/' || html.includes('noindex,nofollow'));
  })));
  const results = [manifest, ...shells];
  return {schemaVersion:1, origin:base.origin, expectedSha, observedSha, ok:results.every(result=>result.ok), results};
}

async function main() {
  try {
    const report = await runFrontendSmoke({baseUrl:process.argv[2],expectedSha:process.argv[3]});
    const output = JSON.stringify(report, null, 2) + '\n';
    if (process.env.FINANCE_OS_FRONTEND_REPORT) await writeFile(process.env.FINANCE_OS_FRONTEND_REPORT, output);
    console.log(output);
    if (!report.ok) process.exitCode = 1;
  } catch {
    console.error('Usage: npm run smoke:frontend -- <https-origin> <full-git-sha>');
    process.exitCode = 2;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
