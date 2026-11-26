(() => {
  const labels = {
    loading: 'Loading', ready: 'Available', stale: 'Stale snapshot',
    partial: 'Partial coverage', unavailable: 'Unavailable', denied: 'Access denied',
    limited: 'Rate limited'
  };
  function timestamp(value) {
    if (!value) return 'not supplied';
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw + ' (date only)';
    const iso = raw.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
    const parsed = new Date(iso);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString().replace('T', ' ').replace(/\.000Z$/, ' UTC') : 'not supplied';
  }
  function render(node, state, detail) {
    if (!node) return;
    node.dataset.providerState = state;
    node.textContent = labels[state] + (detail ? ' · ' + detail : '');
  }
  function failed(status) {
    return status === 401 || status === 403 ? 'denied' : status === 429 ? 'limited' : 'unavailable';
  }
  function healthState(state, options = {}) {
    const aliases = {
      ready: 'fresh', ok: 'fresh', 'rate-limited': 'limited', 'access-denied': 'denied',
      unauthorized: 'denied', forbidden: 'denied', 'provider-error': 'unavailable',
      'no-data': 'empty', 'needs-worker-secret': 'not-configured', 'needs-public-space-key': 'not-configured'
    };
    const known = new Set(['fresh', 'partial', 'stale', 'empty', 'unavailable', 'denied', 'limited',
      'not-configured', 'not-yet-fetched', 'available-on-demand', 'official-source-link',
      'reference-only', 'hosted-display-only', 'excluded', 'configured', 'blocked']);
    const raw = typeof state?.status === 'string' ? state.status : '';
    const status = Object.hasOwn(aliases, raw) ? aliases[raw] : known.has(raw) ? raw
      : known.has(options.decision) ? options.decision : 'unknown';
    const successAt = state?.lastSuccessAt ?? (['fresh', 'partial'].includes(status)
      ? state?.retrievedAt ?? state?.retrieved_at ?? null : null);
    const attemptAt = state?.lastAttemptAt ?? state?.lastCheckedAt ?? null;
    const asOf = state?.dataAsOf ?? state?.data_as_of ?? null;
    const suppliedSuccess = options.ttlSeconds > 0 ? Date.parse(successAt) : NaN;
    const expired = Number.isFinite(suppliedSuccess)
      && (options.now ?? Date.now()) - suppliedSuccess >= options.ttlSeconds * 1000;
    const empty = ['eventCount', 'articleCount'].some(key => state?.[key] === 0);
    const freshness = ['fresh', 'partial', 'stale'].includes(status)
      ? empty ? 'empty' : expired ? 'stale' : status
      : status === 'empty' ? 'empty' : 'unknown';
    const configuration = status === 'not-configured' || options.credentialConfigured === false
      ? 'Not configured'
      : status === 'configured' || options.credentialConfigured === true ? 'Configured'
      : status === 'available-on-demand' ? 'Available on request' : 'Not reported';
    const authorization = options.decision === 'entitlement-missing' ? 'Public display entitlement missing'
      : ['reference-only', 'official-source-link'].includes(status) ? 'Official link only'
      : options.decision === 'hosted-display-only' ? 'Provider-hosted display only'
      : status === 'excluded' ? 'Excluded'
      : options.decision === 'review-required' ? 'Review required for reuse' : 'Not reported';
    const outcome = attemptAt
      ? state?.lastError ? 'Request failed' : ({
        fresh: 'Succeeded', partial: 'Partial coverage', empty: 'No observations',
        stale: 'Stale snapshot', denied: 'Access denied', limited: 'Rate limited',
        unavailable: 'Unavailable', blocked: 'Blocked', 'not-configured': 'Not configured'
      }[status] || 'Not reported')
      : 'Not reported';
    return {status: ['fresh', 'partial', 'stale'].includes(status) ? freshness : status, configuration, authorization, freshness, attemptAt, outcome, successAt, asOf};
  }
  window.FinanceProviderPresentation = { timestamp, render, failed, healthState };
})();
