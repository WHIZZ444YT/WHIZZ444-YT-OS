(() => {
  const feeds = [
    ['BLS', '/api/v1/events'], ['EIA', '/api/v1/events/eia'], ['CFTC', '/api/v1/events/cftc'],
    ['FOMC', '/api/v1/events/fomc'], ['ECB', '/api/v1/events/ecb'], ['BoE', '/api/v1/events/boe'],
    ['BoC', '/api/v1/events/boc'], ['RBA', '/api/v1/events/rba'], ['BEA', '/api/v1/events/bea'],
  ];
  window.loadPublisherSchedules = apiBase => Promise.allSettled(feeds.map(async ([id, path]) => {
    const response = await fetch(apiBase + path, {
      headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(16000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(id + ': ' + (data.error || 'HTTP ' + response.status));
    return { id, data };
  }));
})();
