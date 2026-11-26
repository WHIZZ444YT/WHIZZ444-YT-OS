function retryAfterMilliseconds(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export async function fetchJsonWithRetry(url, provider, options = {}) {
  const timeoutMs = options.timeoutMs ?? 18000;
  const retries = options.retries ?? 1;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': options.userAgent || 'FinanceIntelligenceOS/2.0 public research' },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error'
      });
    } catch {
      lastError = new Error(`${provider} network request failed`);
      if (attempt >= retries) throw lastError;
      const delay = Math.min(maxDelayMs, 250 * (2 ** attempt) + Math.floor(random() * 250));
      await sleep(delay);
      continue;
    }
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); }
    catch {
      if (![401, 403, 429].includes(response.status)) throw new Error(`${provider} returned non-JSON HTTP ${response.status}`);
    }
    if (response.ok) return body;
    const transient = response.status === 408 || response.status === 429 || response.status >= 500;
    const retryAfter = retryAfterMilliseconds(response.headers.get('Retry-After'), now());
    lastError = new Error(`${provider} request failed: HTTP ${response.status}`);
    lastError.upstreamStatus = response.status;
    if (transient && retryAfter !== null) lastError.retryAfterMs = retryAfter;
    if (!transient || attempt >= retries || (retryAfter !== null && retryAfter > maxDelayMs)) throw lastError;
    const backoff = 250 * (2 ** attempt) + Math.floor(random() * 250);
    await sleep(retryAfter ?? Math.min(maxDelayMs, backoff));
  }
  throw lastError || new Error(`${provider} request failed.`);
}

export function nextProviderCircuitState(previous = {}, outcome, now = Date.now(), threshold = 3, openForMs = 10 * 60 * 1000) {
  if (outcome === 'success') return { consecutiveFailures: 0, circuitOpenUntil: null };
  const consecutiveFailures = Math.max(0, Number(previous.consecutiveFailures) || 0) + 1;
  const priorUntil = Date.parse(previous.circuitOpenUntil || '');
  const circuitOpenUntil = consecutiveFailures >= threshold
    ? new Date(Math.max(now + openForMs, Number.isFinite(priorUntil) ? priorUntil : 0)).toISOString()
    : null;
  return { consecutiveFailures, circuitOpenUntil };
}

export function providerCircuitIsOpen(state = {}, now = Date.now()) {
  const until = Date.parse(state.circuitOpenUntil || '');
  return Number.isFinite(until) && until > now;
}
