import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

export const EXPECTED_WORKER_VERSION = '2.2.0';
export const EXPECTED_WORKER_NAME = 'finance-intelligence-os-edge';
export const DEFAULT_FRONTEND_ORIGIN = 'https://finance-intelligence-os-whizz444yt-7353.vercel.app';

const CALENDAR_ROUTES = [
  '/api/v1/events',
  '/api/v1/events/eia',
  '/api/v1/events/cftc',
  '/api/v1/events/fomc',
  '/api/v1/events/ecb',
  '/api/v1/events/boe',
  '/api/v1/events/boc',
  '/api/v1/events/rba',
  '/api/v1/events/bea',
];
const CALENDAR_STATUSES = new Set(['fresh', 'stale', 'unavailable', 'not-configured']);
const REQUIRED_CALENDAR_PROVIDERS = new Set([
  'bls-calendar',
  'eia-wpsr-schedule',
  'cftc-cot-schedule',
  'fomc-calendar',
  'ecb-council-calendar',
  'boe-mpc-calendar',
  'boc-rate-calendar',
  'rba-monetary-policy-calendar',
  'bea-release-calendar',
]);

function normalizedBaseUrl(value) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw new Error('Pass a valid HTTPS Worker base URL.');
  }
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((!localHttp && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Pass a base URL only (HTTPS; HTTP is allowed for localhost).');
  }
  return url.origin;
}

async function requestJson(fetchImpl, baseUrl, path, init = {}) {
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      redirect: 'error',
      headers: { Accept: 'application/json', ...(init.headers || {}) },
      signal: init.signal || AbortSignal.timeout(15000),
    });
  } catch (error) {
    return { response: null, body: null, error: `${error?.name || 'NetworkError'}: Worker endpoint could not be reached.` };
  }

  if ([204, 205, 304].includes(response.status)) return { response, body: null, error: null };
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { response, body: null, error: `Expected JSON, received ${contentType || 'an unknown content type'}.` };
  }
  try {
    return { response, body: await response.json(), error: null };
  } catch {
    return { response, body: null, error: 'Response body was not valid JSON.' };
  }
}

function addResult(results, failures, degraded, { name, ok, note, isDegraded = false }) {
  results.push({ name, ok, degraded: isDegraded, note });
  if (!ok) failures.push(`${name}: ${note}`);
  else if (isDegraded) degraded.push(`${name}: ${note}`);
}

export async function runWorkerSmoke({ baseUrl, frontendOrigin = DEFAULT_FRONTEND_ORIGIN, fetchImpl = fetch, versionId, statusOnly = false } = {}) {
  const base = normalizedBaseUrl(baseUrl);
  if (versionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(versionId)) {
    throw new Error('Pass a valid Worker version UUID for a version override.');
  }
  const versionHeaders = versionId
    ? { 'Cloudflare-Workers-Version-Overrides': `${EXPECTED_WORKER_NAME}="${versionId}"` }
    : {};
  const results = [];
  const failures = [];
  const degraded = [];

  const health = await requestJson(fetchImpl, base, '/health', { headers: versionHeaders });
  const healthOk = Boolean(
    health.response?.status === 200
    && health.body?.ok === true
    && health.body?.service === 'finance-intelligence-os-edge'
    && health.body?.version === EXPECTED_WORKER_VERSION
    && health.body?.storageConfigured === true
  );
  addResult(results, failures, degraded, {
    name: '/health',
    ok: healthOk,
    note: health.error || (healthOk
      ? `version ${health.body.version}; KV configured`
      : `expected HTTP 200, Worker ${EXPECTED_WORKER_VERSION}, and configured KV (received HTTP ${health.response?.status ?? 'no response'}, version ${health.body?.version ?? 'missing'}, KV ${health.body?.storageConfigured === true ? 'configured' : 'missing'})`),
  });

  for (const [name, origin, expectedOrigin] of [
    ['CORS allow-listed frontend', frontendOrigin, frontendOrigin],
    ['CORS rejects unknown origin', 'https://untrusted.invalid', null],
  ]) {
    const preflight = await requestJson(fetchImpl, base, '/health', {
      method: 'OPTIONS',
      headers: {
        ...versionHeaders,
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
      },
    });
    const actualOrigin = preflight.response?.headers.get('access-control-allow-origin') || null;
    const ok = preflight.response?.status === 204 && actualOrigin === expectedOrigin;
    addResult(results, failures, degraded, {
      name,
      ok,
      note: preflight.error || (ok
        ? expectedOrigin ? `HTTP 204; origin ${actualOrigin} allowed` : 'HTTP 204; no allow-origin header returned'
        : `expected HTTP 204 and allow-origin ${expectedOrigin ?? '(none)'}, received HTTP ${preflight.response?.status ?? 'no response'} and ${actualOrigin ?? '(none)'}`),
    });
  }

  const providers = await requestJson(fetchImpl, base, '/api/v1/providers', { headers: versionHeaders });
  const providerIds = new Set(Array.isArray(providers.body?.providers) ? providers.body.providers.map((provider) => provider?.id) : []);
  const missingProviders = [...REQUIRED_CALENDAR_PROVIDERS].filter((provider) => !providerIds.has(provider));
  const providersOk = providers.response?.status === 200 && missingProviders.length === 0;
  addResult(results, failures, degraded, {
    name: '/api/v1/providers',
    ok: providersOk,
    note: providers.error || (providersOk ? 'All nine calendar publishers are registered.' : `HTTP ${providers.response?.status ?? 'no response'}; missing ${missingProviders.join(', ') || 'provider registry'}.`),
  });

  const marketData = await requestJson(fetchImpl, base, '/api/v1/market-data/status', { headers: versionHeaders });
  const marketDataOk = marketData.response?.status === 200
    && marketData.body?.data_type === 'exchange_market_data_status'
    && typeof marketData.body?.status === 'string'
    && Array.isArray(marketData.body?.limitations);
  addResult(results, failures, degraded, {
    name: '/api/v1/market-data/status',
    ok: marketDataOk,
    isDegraded: !statusOnly && marketDataOk && marketData.body.status === 'not-configured',
    note: marketData.error || (marketDataOk
      ? `market-data state ${marketData.body.status}; source ${marketData.body.source_provider || 'not configured'}`
      : `expected a source-labelled market-data status; received HTTP ${marketData.response?.status ?? 'no response'}`),
  });

  if (statusOnly) {
    const setup = await requestJson(fetchImpl, base, '/api/v1/providers?view=setup', {headers:versionHeaders});
    const rows = setup.body?.providers;
    const ids = new Set(['bls', 'bea', 'eia', 'fred']);
    const states = new Set(['configured', 'anonymous', 'missing', 'rejected', 'reference-only']);
    const safeSetup = setup.response?.status === 200
      && setup.response.headers.get('Cache-Control') === 'no-store'
      && setup.body?.schemaVersion === 1
      && Object.keys(setup.body).length === 2
      && Array.isArray(rows) && rows.length === ids.size
      && rows.every(row => row && Object.keys(row).length === 2 && ids.delete(row.id) && states.has(row.status));
    addResult(results, failures, degraded, {
      name: '/api/v1/providers?view=setup', ok: Boolean(safeSetup),
      note: safeSetup ? 'Allowed setup projection and no-store verified.' : 'Expected sanitized setup projection was unavailable.'
    });
  }

  for (const path of statusOnly ? [] : CALENDAR_ROUTES) {
    const result = await requestJson(fetchImpl, base, path, { headers: versionHeaders });
    const body = result.body;
    const eventCountMatches = Number.isInteger(body?.event_count)
      && Array.isArray(body?.events)
      && body.event_count === body.events.length;
    const sourceIsHttps = typeof body?.source_url === 'string' && body.source_url.startsWith('https://');
    const freshOrStale = ['fresh', 'stale'].includes(body?.status);
    const unavailable = body?.status === 'unavailable';
    const unconfigured = body?.status === 'not-configured';
    const httpMatchesState = freshOrStale ? result.response?.status === 200
      : unavailable ? [200, 502].includes(result.response?.status)
        : unconfigured ? result.response?.status === 503 : false;
    const ok = Boolean(
      CALENDAR_STATUSES.has(body?.status)
      && body?.data_type === 'official_economic_release_schedule'
      && eventCountMatches
      && sourceIsHttps
      && httpMatchesState
      && (!unavailable || (body.event_count === 0 && Boolean(body.error)))
      && (!unconfigured || (body.event_count === 0 && Boolean(body.error)))
    );
    const isDegraded = ok && (body.status === 'stale' || unavailable || unconfigured);
    const errorCode = body?.status === 'unavailable' ? body?.error_code
      : body?.status === 'stale' ? body?.last_error_code : null;
    addResult(results, failures, degraded, {
      name: path,
      ok,
      isDegraded,
      note: result.error || (ok
        ? `${body.status}; ${body.event_count} dated events; retrieved ${body.retrieved_at || 'not available'}${errorCode ? `; diagnostic ${errorCode}` : ''}`
        : `invalid schedule response (HTTP ${result.response?.status ?? 'no response'}, status ${body?.status ?? 'missing'}, event count ${body?.event_count ?? 'missing'})`),
    });
  }

  return { ok: failures.length === 0, degraded: degraded.length > 0, results, failures, degradedReasons: degraded, observedServiceVersion: healthOk ? health.body.version : null, versionId: versionId || null };
}

async function main() {
  const baseUrl = process.argv[2] || process.env.FINANCE_OS_WORKER_URL;
  const versionId = process.argv[3] || process.env.FINANCE_OS_WORKER_VERSION_ID;
  if (!baseUrl) {
    console.error('Usage: npm run smoke:worker -- https://<worker>.<subdomain>.workers.dev [version-id]');
    console.error('Or set FINANCE_OS_WORKER_URL. No API key is required for public health and calendar reads.');
    process.exitCode = 2;
    return;
  }
  let report;
  try {
    report = await runWorkerSmoke({
      baseUrl, versionId, statusOnly: process.env.FINANCE_OS_STATUS_ONLY === '1',
      frontendOrigin: process.env.FINANCE_OS_FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN
    });
    if (process.env.FINANCE_OS_WORKER_REPORT) {
      await writeFile(process.env.FINANCE_OS_WORKER_REPORT, JSON.stringify({
        schemaVersion: 1, ok: report.ok, degraded: report.degraded,
        origin: normalizedBaseUrl(baseUrl), observedServiceVersion: report.observedServiceVersion,
        requestedVersionOverride: report.versionId,
        results: report.results.map(({name,ok,degraded}) => ({name,ok,degraded}))
      }, null, 2) + '\n');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (report.versionId) console.log(`Version override — ${report.versionId}`);
  for (const result of report.results) {
    const state = result.ok ? result.degraded ? 'DEGRADED' : 'PASS' : 'FAIL';
    console.log(`${state} ${result.name} — ${result.note}`);
  }
  if (!report.ok) process.exitCode = 1;
  else if (report.degraded) process.exitCode = 2;
  console.log(report.ok
    ? report.degraded ? 'Routes responded, but one or more sources require operator review.' : 'Worker live smoke checks passed.'
    : 'Worker live smoke checks failed.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
