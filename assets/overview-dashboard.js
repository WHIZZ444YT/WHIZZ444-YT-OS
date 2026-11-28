(() => {
  "use strict";

  const cfg = window.FINANCE_OS_CONFIG || {};
  const API = String(cfg.apiBase || window.FINANCE_OS_API_BASE || "").replace(/\/$/, "");
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
  const safeUrl = value => {
    try {
      const url = new URL(String(value || ""), window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  };
  const stateText = value => ({
    fresh:"FRESH SNAPSHOT",partial:"PARTIAL",stale:"STALE SNAPSHOT",
    cached:"CACHED SNAPSHOT",unavailable:"UNAVAILABLE",
    "not-yet-fetched":"NOT YET FETCHED","not-configured":"NOT CONFIGURED",
    "available-on-demand":"AVAILABLE ON REQUEST",unknown:"UNKNOWN"
  })[String(value || "unknown").toLowerCase()] || String(value || "unknown").replaceAll("-", " ").toUpperCase();
  const stateTone = value => {
    const state = String(value || "unknown").toLowerCase();
    return ["fresh","partial"].includes(state) ? "good" :
      ["stale","cached","not-yet-fetched","not-configured","available-on-demand"].includes(state) ? "warn" :
      state === "unknown" || state === "checking" ? "neutral" : "bad";
  };
  const setChip = (id, state, label) => {
    const node = $(id);
    if (!node) return;
    node.className = "os-state-chip " + stateTone(state);
    node.textContent = label || stateText(state);
  };
  const setText = (id, value) => { const node = $(id); if (node) node.textContent = String(value ?? ""); };
  const stamp = value => {
    if (!value) return "timestamp not supplied";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) :
      new Intl.DateTimeFormat("en-IN", {dateStyle:"medium",timeStyle:"short"}).format(date);
  };
  const timeoutSignal = () => typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(16000) : undefined;
  async function api(path, options = {}) {
    if (!API) throw new Error("Public Worker URL is not configured in this deployment.");
    const response = await fetch(API + path, {
      method:options.method || "GET",
      headers:Object.assign({Accept:"application/json"}, options.headers || {}),
      ...(options.body !== undefined ? {body:options.body} : {}),
      signal:timeoutSignal(),
      cache:"no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || ("HTTP " + response.status));
    return data;
  }

  let markets = [];
  let selectedMarket = "";
  let latestArticles = [];
  let userChangedTimezone = false;

  function populateMarkets() {
    const select = $("overviewContract");
    if (!select) return;
    select.innerHTML = markets.map(m =>
      '<option value="' + esc(m.id) + '">' + esc(m.label) + "</option>"
    ).join("");
    if (!markets.length) {
      select.innerHTML = '<option value="">Futures registry unavailable</option>';
      setText("overviewContractName", "Futures registry unavailable");
      setText("overviewContractMeta", "Open Futures Markets to inspect the retained catalogue.");
      return;
    }
    selectedMarket = markets.some(m => m.id === "nq") ? "nq" : markets[0].id;
    select.value = selectedMarket;
    renderSelectedMarket();
  }

  function selected() { return markets.find(m => m.id === selectedMarket) || null; }
  function renderSelectedMarket() {
    const market = selected();
    if (!market) return;
    setText("overviewContractName", market.label);
    setText("overviewContractMeta", [market.exchange, market.tier, "reference metadata only"].filter(Boolean).join(" · "));
    setText("overviewContractRole", market.role || "No additional profile summary is supplied.");
    const specs = $("overviewContractSpecs");
    if (specs) specs.href = "/contract-specs/#" + encodeURIComponent(market.id);
  }

  async function loadMarketRegistry() {
    try {
      const response = await fetch("/ict-futures/data/market-universe.json", {cache:"force-cache",signal:timeoutSignal()});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      markets = Array.isArray(payload.markets) ? payload.markets : [];
      populateMarkets();
    } catch (error) {
      markets = [];
      populateMarkets();
      setText("overviewQuoteDetail", "The local futures registry could not be loaded: " + error.message);
    }
  }

  function displayArticle(article) {
    const href = safeUrl(article.url || article.link);
    if (!href) return "";
    const date = article.seendate || article.publishedAt || article.published_at || "Publisher time not supplied";
    const source = article.domain || article.source || "Source not supplied";
    return '<a class="os-news-item" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' +
      "<b>" + esc(article.title || "Untitled source item") + "</b>" +
      "<span>" + esc(source) + " · " + esc(date) + "</span></a>";
  }

  function marketNews(articles) {
    const market = selected();
    if (!market) return [];
    const tags = [market.id, market.label, ...(market.news || [])]
      .filter(Boolean).map(x => String(x).toLowerCase());
    const matched = articles.filter(article => {
      const explicit = Array.isArray(article.markets) && article.markets.some(x =>
        String(x).toLowerCase() === market.id.toLowerCase());
      if (explicit) return true;
      const text = [article.title,article.topic,article.domain].join(" ").toLowerCase();
      return tags.some(tag => tag.length > 2 && text.includes(tag));
    });
    return matched;
  }

  async function loadNews(force = false) {
    setChip("overviewNewsBadge", "checking", force ? "REFRESHING" : "CHECKING");
    const list = $("overviewNewsList");
    if (list) list.innerHTML = '<div class="os-loading-state">Requesting the futures news snapshot…</div>';
    try {
      const data = await api("/api/v1/news" + (force ? "?refresh=1" : ""));
      latestArticles = Array.isArray(data.articles) ? data.articles : [];
      const matches = marketNews(latestArticles).slice(0, 5);
      const state = data.status || "unknown";
      if (list) {
        if (state === "unavailable" && !latestArticles.length) {
          list.innerHTML = '<div class="os-error-state">Futures news is unavailable: ' +
            esc(data.lastError || data.error || "No usable GDELT snapshot was returned.") + '</div>';
        } else if (state === "not-yet-fetched" && !latestArticles.length) {
          list.innerHTML = '<div class="os-empty-state">No futures news snapshot has been collected yet.</div>';
        } else if (!latestArticles.length) {
          list.innerHTML = '<div class="os-empty-state">The current futures news snapshot contains no articles. Check its freshness state above or open the full news research page.</div>';
        } else {
          list.innerHTML = matches.map(displayArticle).filter(Boolean).join("") ||
            '<div class="os-empty-state">The snapshot contains ' + latestArticles.length +
            ' articles, but none matched this contract. Try another contract or open the full news research page.</div>';
        }
      }
      setChip("overviewNewsBadge", state);
      setText("overviewNewsState", stateText(state));
      setText("overviewNewsStateDetail", "Retrieved: " + stamp(data.lastCheckedAt || data.retrievedAt) +
        " · articles in snapshot: " + latestArticles.length +
        (data.lastError ? " · " + data.lastError : ""));
      setText("overviewNewsAttribution", "GDELT discovery index · " +
        (data.provider || "provider not supplied") + " · retrieved " +
        stamp(data.lastCheckedAt || data.retrievedAt) +
        " · discovery only, not a complete or licensed newswire.");
    } catch (error) {
      latestArticles = [];
      if (list) list.innerHTML = '<div class="os-error-state">Futures news is unavailable: ' + esc(error.message) + '</div>';
      setChip("overviewNewsBadge", "unavailable");
      setText("overviewNewsState", "UNAVAILABLE");
      setText("overviewNewsStateDetail", error.message);
      setText("overviewNewsAttribution", "No usable snapshot returned. This error is isolated to the news widget.");
    }
  }

  async function loadCot() {
    const market = selected();
    if (!market) return;
    setChip("overviewCotBadge", "checking", "CHECKING");
    setChip("overviewCotState", "checking", "CHECKING");
    try {
      const term = String(market.label || market.id).split("·")[0]
        .replace(/E-mini|Micro/ig, "").trim();
      const path = window.FinanceResearchPreview.cotPath(market.id) || "/api/v1/cot?report=tff&q=" + encodeURIComponent(term);
      const data = await api(path);
      if (selected()?.id !== market.id) return;
      const rows = Array.isArray(data.normalizedRows) ? data.normalizedRows :
        (Array.isArray(data.rows) ? data.rows : []);
      const reportDate = data.dataAsOf || data.reportDate || data.report_date || "Not supplied";
      const state = data.status || "unknown";
      const summary = $("overviewCotSummary");
      if (summary) summary.innerHTML = [
        ["Report date", reportDate],
        ["Report type", [data.report_family || data.report, data.report_variant].filter(Boolean).join(" · ") || "Futures-only"],
        ["Rows returned", rows.length]
      ].map(([label,value]) => '<div><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>').join("");
      setChip("overviewCotBadge", state);
      setChip("overviewCotState", state);
      setText("overviewCotStateDetail", "Weekly CFTC report · retrieved " + stamp(data.lastCheckedAt || data.retrievedAt));
      setText("overviewCotAttribution", "Source: " + (data.provider || "CFTC Public Reporting Environment") +
        " · report date: " + reportDate + " · weekly cadence; not intraday positioning or exchange volume.");
    } catch (error) {
      if (selected()?.id !== market.id) return;
      setChip("overviewCotBadge", "unavailable");
      setChip("overviewCotState", "unavailable");
      setText("overviewCotStateDetail", error.message);
      setText("overviewCotAttribution", "No CFTC snapshot returned. This error is isolated to the positioning widget.");
      const summary = $("overviewCotSummary");
      if (summary) summary.innerHTML = '<div><span>Report date</span><b>—</b></div><div><span>Report type</span><b>TFF</b></div><div><span>Rows returned</span><b>—</b></div>';
    }
  }

  async function loadFunding() {
    try { setText("overviewFunding", window.FinanceResearchPreview.fundingText(await api("/api/v1/macro/funding"))); }
    catch { setText("overviewFunding", "Funding snapshot unavailable. See Macro for source details."); }
  }

  async function loadReleases() {
    const list = $("overviewEvents");
    if (!API || !list) {
      setText("overviewCalendarState", "Gateway unavailable. Open the economic calendar for publisher links.");
      return;
    }
    const results = await window.loadPublisherSchedules(API, ["BLS","EIA","FOMC","CFTC","BEA"]);
    const usable = results.filter(result => result.status === "fulfilled" &&
      ["fresh","stale","partial","cached","empty"].includes(result.value.data.status));
    const today = new Intl.DateTimeFormat("sv-SE", {timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const events = new Map();
    for (const {value:{id,data}} of usable) {
      for (const event of data.events || []) {
        if (event.scheduled_date >= today && event.event_id) events.set(event.event_id, {event,id,status:data.status});
      }
    }
    const ordered = [...events.values()].sort((a,b) =>
      ((a.event.scheduled_date || "") + (a.event.scheduled_at_utc || "")).localeCompare((b.event.scheduled_date || "") + (b.event.scheduled_at_utc || ""))).slice(0,5);
    list.replaceChildren(...ordered.map(({event,id,status}) => {
      const row = document.createElement("li");
      row.textContent = [event.title || event.name || event.event_name, event.scheduled_at_utc || event.scheduled_date + " (date only)",
        id, status].filter(Boolean).join(" · ");
      return row;
    }));
    setText("overviewCalendarState", !usable.length ? "Publisher schedules unavailable."
      : (ordered.length ? "" : "No upcoming events in available snapshots. ")
        + usable.length + "/" + results.length + " publisher snapshots available.");
  }

  const timezoneKey = "fios.overview.timeZone.v1";
  function initTimezone() {
    const select = $("overviewTimezone");
    if (!select) return;
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    let saved = "";
    try { saved = localStorage.getItem(timezoneKey) || ""; } catch (_) {}
    const options = [...new Set([browserZone,"America/New_York","Asia/Kolkata","UTC"])];
    select.innerHTML = options.map(zone =>
      '<option value="' + esc(zone) + '">' + esc(zone) + (zone === browserZone ? " · browser" : "") + "</option>"
    ).join("");
    select.value = options.includes(saved) ? saved : browserZone;
    $("overviewLocalZoneLabel").textContent = select.value.toUpperCase();
    select.addEventListener("change", () => {
      userChangedTimezone = true;
      try { localStorage.setItem(timezoneKey, select.value); } catch (_) {}
      $("overviewLocalZoneLabel").textContent = select.value.toUpperCase();
      renderClock();
    });
  }

  function renderClock() {
    const select = $("overviewTimezone");
    const zone = select?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const now = new Date();
    const et = new Intl.DateTimeFormat("en-US", {
      timeZone:"America/New_York",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
    });
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone:zone,hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"
    });
    setText("overviewClockET", et.format(now));
    setText("overviewDateET", new Intl.DateTimeFormat("en-US", {
      timeZone:"America/New_York",weekday:"short",month:"short",day:"2-digit",year:"numeric"
    }).format(now));
    setText("overviewClockLocal", local.format(now));
    setText("overviewDateLocal", new Intl.DateTimeFormat("en-US", {
      timeZone:zone,weekday:"short",month:"short",day:"2-digit",year:"numeric"
    }).format(now));
    setText("overviewLocalZoneLabel", zone.toUpperCase());
  }

  const sessionKey = "finance-os-supabase-session-v1";
  function bindEvents() {
    $("overviewContract")?.addEventListener("change", event => {
      selectedMarket = event.target.value;
      renderSelectedMarket();
      loadNews(false);
      loadCot();
    });
    $("overviewNewsRefresh")?.addEventListener("click", () => loadNews(true));
  }

  function showStudyProgress() {
    try {
      const records = JSON.parse(localStorage.getItem("ictfos.academy.progress.v2") || "{}");
      if (!records || typeof records !== "object" || Array.isArray(records)) return;
      if (Object.keys(records).length) {
        setText("overviewStudyState", "Academy progress is available on this device.");
        setText("overviewStudyLink", "Resume in Academy");
      }
    } catch (_) { /* The public learning links remain available. */ }
  }

  async function init() {
    showStudyProgress();
    initTimezone();
    renderClock();
    window.setInterval(renderClock, 1000);
    bindEvents();
    await loadMarketRegistry();
    await Promise.allSettled([loadNews(false), loadCot(), loadFunding(), loadReleases()]);
    setText("overviewUpdated", "Last snapshot checks: " + new Intl.DateTimeFormat("en-IN", {
      dateStyle:"medium",timeStyle:"short"
    }).format(new Date()));
  }

  init();
})();