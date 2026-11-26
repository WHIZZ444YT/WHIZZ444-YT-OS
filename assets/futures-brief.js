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
  const preview = window.FinanceResearchPreview;
  let schedules = [], news = null, cot = null, report = null;
  let funding = "Funding snapshot has not been loaded.";
  let checked = false;
  let selectionVersion = 0;

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
    root.querySelector("[data-brief-chart]").href = "/charts/?market=" + encodeURIComponent(id);
    root.querySelector("[data-brief-profile]").href = "/ict-futures/markets/" + encodeURIComponent(id) + ".html";
    root.querySelector("[data-brief-funding]").textContent = funding;
    root.querySelector("[data-brief-cot]").textContent = cot || "Positioning snapshot has not been loaded.";
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
    report = { schemaVersion: 2, generatedAt: now.toISOString(), market: id, horizonDays: +horizon.value, start, end };
    if (!checked) {
      status.textContent = "Load snapshots to check this market. Research links and plan export are available now.";
      return;
    }
    const newsStatus = news?.status || "unavailable";
    const newsRetrievedAt = news?.retrieved_at || news?.lastCheckedAt || news?.retrievedAt;
    status.textContent = 'News ' + newsStatus + ' · retrieved ' + (newsRetrievedAt || 'time unavailable')
      + '. Calendar feeds: ' + (providers.map(p => p.publisher + ' ' + p.status + ' · ' + (p.retrievedAt || 'retrieval time unavailable')).join('; ') || 'unavailable')
      + (schedules.some(feed => feed.status === 'rejected') ? '. Some publisher feeds are unavailable.' : '.');
  }

  function restoreSelection() {
    const params = new URLSearchParams(location.search);
    const preset = params.get("market");
    market.value = preset && Object.hasOwn(context, preset) ? preset : market.options[0].value;
    const days = params.get("horizon");
    horizon.value = ["1", "7", "30"].includes(days) ? days : "7";
  }

  function updateSelection() {
    const url = new URL(location.href);
    url.searchParams.set("market", market.value);
    url.searchParams.set("horizon", horizon.value);
    history.replaceState(history.state, "", url);
  }

  async function request(path) {
    if (!apiBase) throw new Error("Gateway unavailable");
    const response = await fetch(apiBase + path, { signal: AbortSignal.timeout(16000) });
    if (!response.ok) throw new Error("Snapshot unavailable");
    return response.json();
  }

  async function loadNews() {
    try { return await request("/api/v1/news?limit=100"); }
    catch {
      const response = await fetch("/data/news-snapshot.json", { signal: AbortSignal.timeout(8000) });
      return response.ok ? response.json() : null;
    }
  }

  restoreSelection();
  form.hidden = false;
  form.addEventListener("change", event => {
    updateSelection();
    if (event.target === market) {
      selectionVersion++;
      cot = null;
    }
    render();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    updateSelection();
    const button = event.submitter || form.querySelector("[type=submit]");
    const version = selectionVersion;
    const path = preview.cotPath(market.value);
    button.disabled = true;
    status.textContent = "Checking available provider snapshots…";
    try {
      const [newsResult, schedulesResult, fundingResult, cotResult] = await Promise.allSettled([
        loadNews(), apiBase ? window.loadPublisherSchedules(apiBase) : [],
        request("/api/v1/macro/funding"), path ? request(path) : null,
      ]);
      news = newsResult.status === "fulfilled" ? newsResult.value : null;
      schedules = schedulesResult.status === "fulfilled" ? schedulesResult.value : [];
      funding = fundingResult.status === "fulfilled" ? preview.fundingText(fundingResult.value)
        : "Funding snapshot unavailable. See Macro for source details.";
      if (version === selectionVersion) {
        cot = !path ? "Open COT & Positioning to find the report for this market."
          : cotResult.status === "fulfilled" ? preview.cotText(cotResult.value)
          : "Positioning snapshot unavailable. See COT & Positioning.";
      }
      checked = true;
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
