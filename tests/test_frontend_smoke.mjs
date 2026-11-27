import test from 'node:test';
import assert from 'node:assert/strict';
import { runFrontendSmoke } from '../scripts/smoke_frontend.mjs';

const sha = 'a'.repeat(40);
const routes = Object.fromEntries([
  '/', '/charts/', '/macro/', '/research/reports/', '/data-health/',
  '/data-health/integrations/', '/strategy-lab/', '/account/'
].map(path => [path, {}]));

test('frontend evidence checks deployed SHA, shell and enforcing chart policy', async () => {
  for (const [sourceCommit, policy, expected] of [[sha, true, true], ['b'.repeat(40), true, false], [sha, false, false]]) {
    const report = await runFrontendSmoke({
      baseUrl:'https://preview.example', expectedSha:sha,
      fetchImpl:async (url, options) => {
        assert.equal(options.redirect, 'error');
        if (url.pathname === '/route-manifest.json') return Response.json({sourceCommit, routes});
        return new Response('<aside id="appSidebar"></aside><meta name="robots" content="noindex,nofollow">', {
          headers:{'content-type':'text/html', ...(policy && {'content-security-policy': "frame-src 'self'"})}
        });
      }
    });
    assert.equal(report.ok, expected);
    assert.equal(report.observedSha, sourceCommit);
  }
});
