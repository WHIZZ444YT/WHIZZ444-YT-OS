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
  window.FinanceProviderPresentation = { timestamp, render, failed };
})();
