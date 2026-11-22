(() => {
  const root = document.querySelector('#daily-brief');
  if (!root) return;
  const form = root.querySelector('form');
  const { market, horizon } = form.elements;
  const status = root.querySelector('[role=status]');
  const context = JSON.parse(root.querySelector('[type="application/json"]').textContent);
  const apiBase = String(window.FINANCE_OS_CONFIG?.apiBase || window.FINANCE_OS_API_BASE || '').replace(/\/$/, '');
  const day = value => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
  let schedules = [], news = null, report = null;

  function item(text, url) {
    const row = document.createElement('li');
    let destination;
    try { destination = new URL(url); } catch { /* textual source note */ }
    if (destination?.protocol !== 'https:') {
      row.textContent = text;
      return row;
    }
    const link = document.createElement('a');
    link.href = destination.href;
    link.textContent = text;
    row.append(link);
    return row;
  }

  function render() {
    const id = market.value;
    const now = new Date();
    const start = day(now);
    const end = new Date(Date.parse(start) + (Number(horizon.value) - 1) * 86400000).toISOString().slice(0, 10);
    const profile = context[id];
    const headlines = (news?.articles || []).filter(row =>
      (row.instrument_tags || row.markets || []).some(tag => String(tag).toLowerCase() === id)
    ).slice(0, 8);
    const available = schedules.filter(feed => feed.status === 'fulfilled').map(feed => feed.value);
    const events = new Map();
    for (const { data } of available) {
      for (const row of data.events || []) {
        if (row.scheduled_date >= start && row.scheduled_date <= end
            && (row.affected_instruments || []).some(tag => String(tag).toLowerCase() === id)) events.set(row.event_id, row);
      }
    }
    const listed = [...events.values()].sort((a, b) =>
      (a.scheduled_at_utc || a.scheduled_date).localeCompare(b.scheduled_at_utc || b.scheduled_date));
    root.querySelector('[data-brief-context]').textContent =
      [profile.profile, 'Drivers: ' + profile.drivers.join(', '), 'Sessions: ' + profile.sessions.join(', '),
        'Models: ' + profile.models.join(', ')].join(' ');
    root.querySelector('[data-brief-news]').replaceChildren(...(headlines.length ? headlines.map(row =>
      item([row.title, row.publisher || row.domain, row.published_at || 'Publisher time unavailable'].filter(Boolean).join(' · '), row.canonical_url || row.url))
      : [item('No tagged headlines in this snapshot. Check publisher sources.')]));
    root.querySelector('[data-brief-events]').replaceChildren(...(listed.length ? listed.map(row =>
      item([row.title || row.name || row.event_name, row.scheduled_at_utc || row.scheduled_date + ' (date only)', row.publisher_id || row.publisher].filter(Boolean).join(' · '),
        row.source_url || row.source?.url))
      : [item('No matching events in the available schedules. Check official issuer calendars.')]));
    const providers = available.map(({ id, data }) => ({
      publisher: id, status: data.status || 'unknown', retrievedAt: data.retrieved_at || null,
    }));
    report = { generatedAt: now.toISOString(), market: id, horizonDays: +horizon.value, start, end,
      newsStatus: news?.status || 'unavailable', newsRetrievedAt: news?.retrieved_at || news?.lastCheckedAt || null,
      calendarPublishers: providers, headlines, events: listed, context: profile };
    status.textContent = 'News ' + report.newsStatus + ' · retrieved ' + (report.newsRetrievedAt || 'time unavailable')
      + '. Calendar feeds: ' + (providers.map(p => p.publisher + ' ' + p.status + ' · ' + (p.retrievedAt || 'retrieval time unavailable')).join('; ') || 'unavailable')
      + (schedules.some(feed => feed.status === 'rejected') ? '. Some publisher feeds are unavailable.' : '.');
  }

  const preset = new URLSearchParams(location.search).get('market');
  if (preset && Object.hasOwn(context, preset)) market.value = preset;
  form.hidden = false;
  form.addEventListener('change', render);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter || form.querySelector('[type=submit]');
    button.disabled = true;
    status.textContent = 'Checking news and publisher schedules…';
    try {
      const loadNews = async () => {
        if (apiBase) {
          try {
            const response = await fetch(apiBase + '/api/v1/news?limit=100',
              { signal: AbortSignal.timeout(16000) });
            if (response.ok) return await response.json();
          } catch { /* use the packaged snapshot */ }
        }
        const fallback = await fetch('/data/news-snapshot.json');
        return fallback.ok ? fallback.json() : null;
      };
      const [newsResult, schedulesResult] = await Promise.allSettled([
        loadNews(), apiBase ? window.loadPublisherSchedules(apiBase) : [],
      ]);
      news = newsResult.status === 'fulfilled' ? newsResult.value : null;
      schedules = schedulesResult.status === 'fulfilled' ? schedulesResult.value : [];
      render();
    } finally { button.disabled = false; }
  });
  root.querySelector('[data-export-brief]').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'futures-brief-' + report.market + '-' + report.start + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
})();
