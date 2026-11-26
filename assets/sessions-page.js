(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.FINANCE_OS_CONFIG || {};
  const apiBase = String(cfg.apiBase || window.FINANCE_OS_API_BASE || "").replace(/\/$/, "");
  let pageData = {};
  let events = [];
  let snapshot = null;
  try { pageData = JSON.parse($("sessionsPageData")?.textContent || "{}"); } catch { pageData = {}; }
  const deviceZone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"; } catch { return "Asia/Kolkata"; } })();
  const eastern = "America/New_York";
  const india = "Asia/Kolkata";
  const validZone = value => {
    try { new Intl.DateTimeFormat("en", {timeZone:value}); return value; } catch { return null; }
  };
  const zone = () => $("sessionsTimezone").value === "browser" ? deviceZone : $("sessionsTimezone").value;
  const todayIn = timeZone => {
    const fields = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const p = Object.fromEntries(fields.filter(x => x.type !== "literal").map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const dateOrdinal = date => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  };
  const plusDays = (date, n) => new Date(dateOrdinal(date) + n * 86400000).toISOString().slice(0, 10);
  const dateLabel = (date, timeZone = "UTC") => {
    const at = dateOrdinal(date);
    return Number.isFinite(at) ? new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: "medium" }).format(new Date(at + 12 * 3600000)) : "Date unavailable";
  };
  const timeLabel = (instant, timeZone = zone()) => new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: "medium", timeStyle: "short" }).format(instant);
  const clockLabel = (instant, timeZone = zone()) => new Intl.DateTimeFormat(undefined, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
  const escapeIcs = value => String(value || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const addClass = (root, className, value) => { const node = document.createElement(root); node.className = className; if (value !== undefined) node.textContent = value; return node; };
  const instrumentLabel = id => pageData.markets?.find(m => String(m.id).toLowerCase() === String(id).toLowerCase())?.label || String(id).toUpperCase();

  function updateClock() {
    try {
      const now = new Date();
      $("sessionsClock").textContent = new Intl.DateTimeFormat(undefined, { timeZone: zone(), dateStyle: "medium", timeStyle: "medium" }).format(now);
      $("sessionsTimezoneLabel").textContent = `Displayed in ${zone()} · each event retains its publisher timezone`;
      const ny = new Intl.DateTimeFormat(undefined, { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }).format(now);
      $("sessionsWindowNow").textContent = `Current New York time: ${ny} · all session references use IANA timezone rules.`;
    } catch {
      $("sessionsClock").textContent = "Timezone unavailable";
      $("sessionsTimezoneLabel").textContent = "Choose a supported IANA timezone.";
    }
  }

  function setFeedState(status, message, tone = "") {
    const state = $("sessionsFeedState");
    state.textContent = status;
    state.dataset.tone = tone;
    $("sessionsFeedMeta").textContent = message;
  }

  function visibleEvents() {
    const now = Date.now();
    const range = $("sessionsRange").value;
    const selected = $("sessionsFamily").value;
    const publisher = $("sessionsPublisher").value;
    const visible = events.filter(event => {
      if (event.schedule_status === "cancelled") return false;
      if (publisher !== "all" && event.publisher_id !== publisher) return false;
      const at = Date.parse(event.scheduled_at_utc || "");
      const dateOnly = Boolean(event.date_only || !Number.isFinite(at));
      let age = 0;
      if (dateOnly) {
        const todaySource = dateOrdinal(todayIn(event.scheduled_timezone || "America/New_York"));
        const date = dateOrdinal(event.scheduled_date);
        const lastDate = dateOrdinal(event.scheduled_end_date);
        const inclusiveEnd = Number.isFinite(lastDate) ? lastDate : date;
        if (!Number.isFinite(date) || (range !== "all" && inclusiveEnd < todaySource)) return false;
        age = Math.max(0, (date - todaySource) / 86400000);
      } else {
        if (range !== "all" && at < now) return false;
        age = at - now;
      }
      if (range === "1" && (dateOnly ? age > 1 : age > 86400000)) return false;
      if (range !== "all" && range !== "1" && age > Number(range) * (dateOnly ? 1 : 86400000)) return false;
      const instruments = (event.affected_instruments || []).map(value => String(value).toLowerCase());
      if (selected === "unmapped" && instruments.length) return false;
      if (selected !== "all" && selected !== "unmapped" && !instruments.includes(selected.toLowerCase())) return false;
      return true;
    });
    visible.sort((a, b) => (Date.parse(a.scheduled_at_utc || "") || dateOrdinal(a.scheduled_date)) - (Date.parse(b.scheduled_at_utc || "") || dateOrdinal(b.scheduled_date)));
    return visible;
  }

  function renderEvents() {
    const list = $("sessionsEventList");
    const visible = visibleEvents();
    $("sessionsResultCount").textContent = `${visible.length} of ${events.filter(e => e.schedule_status !== "cancelled").length} scheduled`;
    $("sessionsExport").disabled = !visible.some(e => e.date_only || Number.isFinite(Date.parse(e.scheduled_at_utc || "")));
    list.replaceChildren();
    if (!snapshot || !visible.length) {
      const empty = addClass("div", "sessions-empty");
      empty.textContent = snapshot ? "No matching future publisher events in this range. This does not mean other market catalysts are absent." : "The official calendar is not available yet. Use the issuer links below to verify important dates.";
      list.append(empty);
      return;
    }
    for (const event of visible) {
      const card = addClass("article", "sessions-event-card");
      const scheduled = Date.parse(event.scheduled_at_utc || "");
      const time = addClass("div", "sessions-event-time");
      if (!event.date_only && Number.isFinite(scheduled)) {
        time.textContent = timeLabel(new Date(scheduled), zone());
        const sourceZone = validZone(event.scheduled_timezone || "");
        const bases = new Set([eastern, india, sourceZone].filter(Boolean));
        bases.delete(zone());
        for (const basis of bases) {
          time.append(addClass("small", "", `${basis}: ${timeLabel(new Date(scheduled), basis)}`));
        }
      } else if (event.date_only) {
        const start = dateLabel(event.scheduled_date);
        const end = event.scheduled_end_date && event.scheduled_end_date !== event.scheduled_date
          ? ` – ${dateLabel(event.scheduled_end_date)}` : "";
        time.textContent = `${start}${end} · date only`;
        const sourceZone = event.scheduled_timezone ? ` Publisher calendar timezone: ${event.scheduled_timezone}.` : "";
        time.append(addClass("small", "", `The publisher did not provide a release time.${sourceZone}`));
      } else {
        time.textContent = `${event.scheduled_date || "Scheduled date unavailable"} · ${event.scheduled_timezone || "local time"}`;
        time.append(addClass("small", "", "The local schedule time could not be resolved safely. Verify the issuer calendar."));
      }
      const detail = addClass("div", "sessions-event-detail");
      detail.append(addClass("span", "", (event.schedule_status === "tentative" ? "Tentative" : "Scheduled") + " · no forecast or actual value supplied"));
      if (event.period_label) detail.append(addClass("small", "sessions-event-note", event.period_label));
      if (event.schedule_note) detail.append(addClass("small", "sessions-event-note", event.schedule_note));
      if (event.source_sequence > 0) detail.append(addClass("small", "sessions-event-note", `Publisher sequence: ${event.source_sequence}`));
      if (event.source_revision) detail.append(addClass("small", "sessions-event-note", `Source revision metadata: ${event.source_revision}`));
      const source = document.createElement("a"); source.href = /^https:\/\//i.test(event.source_url || "") ? event.source_url : "https://www.bls.gov/schedule/"; source.target = "_blank"; source.rel = "noopener noreferrer"; source.textContent = `${event.publisher_id || "Publisher"} source ↗`; detail.append(document.createElement("br"), source);
      const title = addClass("h3", "sessions-event-title", event.title || "Untitled publisher event");
      const tags = addClass("div", "sessions-event-tags");
      if (event.event_type) tags.append(addClass("span", "sessions-tag", String(event.event_type).replace(/[_-]/g, " ")));
      const publisher = String(event.publisher_id || "").toUpperCase();
      tags.append(addClass("span", "sessions-tag official", publisher ? `OFFICIAL ${publisher} SCHEDULE` : "OFFICIAL PUBLISHER SCHEDULE"));
      tags.append(addClass("span", "sessions-tag", event.schedule_time_resolution === "date-only" ? "DATE ONLY" : event.timezone_basis === "source-calendar-policy" ? "TIME FROM PUBLISHER POLICY" : "TIMEZONE-SPECIFIC"));
      for (const market of event.affected_instruments || []) tags.append(addClass("span", "sessions-tag", instrumentLabel(market)));
      title.append(tags);
      card.append(time, title, detail);
      list.append(card);
    }
  }

  function formatWindow(date, time, disambiguation) {
    const result = window.ICTSessionTime.resolveWallTime(date, time, "America/New_York", disambiguation);
    if (!result.epochMs) return { result, local: "Time unresolved", ny: `${date} ${time} ET` };
    const instant = new Date(result.epochMs);
    return { result, local: clockLabel(instant, zone()), ny: `${clockLabel(instant, "America/New_York")} ET`, instant };
  }

  function renderWindows() {
    if (!window.ICTSessionTime) return;
    const dateInput = $("sessionsWindowDate");
    if (!dateInput.value) dateInput.value = todayIn("America/New_York");
    const date = dateInput.value;
    const isCurrentDate = date === todayIn("America/New_York");
    const now = Date.now();
    const root = $("sessionsWindowList"); root.replaceChildren();
    const rows = pageData.windows || [];
    for (const item of rows) {
      const startTime = item.start_local || item.start;
      const endTime = item.end_local || item.end;
      const wraps = endTime <= startTime;
      const startDate = wraps ? window.ICTSessionTime.addDays(date, -1) : date;
      const endDate = date;
      const start = formatWindow(startDate, startTime, "earlier");
      const end = formatWindow(endDate, endTime, "later");
      const active = isCurrentDate && start.instant && end.instant && now >= start.instant.getTime() && now < end.instant.getTime();
      const state = !isCurrentDate ? "Reference date" : active ? "Active reference window" : start.instant && now < start.instant.getTime() ? "Upcoming reference window" : "Reference window passed";
      const card = addClass("article", "sessions-window-card");
      const text = document.createElement("div");
      text.append(addClass("h3", "", item.display_name || item.name));
      text.append(addClass("p", "", item.notes || item.purpose || "ICT practitioner reference; review contract fit."));
      const times = addClass("div", "sessions-window-time", `${start.local} – ${end.local}`);
      times.append(addClass("small", "", `${start.ny} → ${end.ny}`));
      const footer = addClass("div", "sessions-window-state");
      footer.append(addClass("span", "", item.evidence_label || item.evidence || "ICT PRACTITIONER CONVENTION"));
      const badge = addClass("b", "", state); badge.dataset.state = active ? "active" : "reference"; footer.append(badge);
      card.append(text, times, footer); root.append(card);
    }
    const points = $("sessionsReferencePoints"); points.replaceChildren();
    for (const item of pageData.referencePoints || []) {
      const resolved = formatWindow(date, item.start_local || item.start, "earlier");
      const point = addClass("span", "sessions-reference-point");
      point.append(addClass("b", "", item.display_name || item.name), document.createTextNode(` · ${resolved.local} (${resolved.ny}) · market reference only`)); points.append(point);
    }
    for (const item of pageData.exchangeReferences || []) {
      const point = addClass("span", "sessions-reference-point");
      point.append(addClass("b", "", `${item.display_name || item.name}: UNVERIFIED`), document.createTextNode(` · ${item.start_local || item.start}–${item.end_local || item.end} ET reference · not an active exchange schedule`)); points.append(point);
    }
  }

  async function loadCalendar() {
    const button = $("sessionsRefresh"); button.disabled = true; button.textContent = "Refreshing…";
    $("sessionsLiveState").textContent = "Contacting the configured Worker for official publisher schedules.";
    if (!apiBase) {
      snapshot = null; events = [];
      setFeedState("NOT CONFIGURED", "Set the public Worker URL in the deployment configuration.", "warn");
      $("sessionsLiveState").textContent = "Calendar API gateway is not configured.";
      $("sessionsRetrievedAt").textContent = "Retrieval time: unavailable";
      renderEvents(); button.disabled = false; button.textContent = "Refresh official schedule"; return;
    }
    try {
      const settled = await window.loadPublisherSchedules(apiBase);
      const ready = settled.filter(result => result.status === "fulfilled" &&
        ["fresh","partial","cached","stale","empty"].includes(result.value.data.status) && Array.isArray(result.value.data.events))
        .map(result => result.value);
      const failedCount = settled.length - ready.length;
      if (!ready.length) throw new Error("Publisher schedules are temporarily unavailable. Refresh to retry or use the official issuer links below.");
      const merged = new Map();
      for (const feed of ready) for (const event of Array.isArray(feed.data.events) ? feed.data.events : []) if (event?.event_id) merged.set(`${feed.id}:${event.event_id}`, {...event,publisher_id:feed.id});
      events = [...merged.values()].sort((a, b) => (Date.parse(a.scheduled_at_utc || "") || dateOrdinal(a.scheduled_date)) - (Date.parse(b.scheduled_at_utc || "") || dateOrdinal(b.scheduled_date)));
      const staleFeeds = ready.filter(feed => feed.data.status === "stale");
      const partialFeeds = ready.some(feed => feed.data.status === "partial");
      const partialCoverage = ready.length < settled.length || partialFeeds;
      const incomplete = partialCoverage || staleFeeds.length > 0;
      snapshot = { status: incomplete ? (partialCoverage ? "partial" : "stale") : "fresh", events, event_count: events.length, sources: ready.map(feed => ({ id: feed.id, status: feed.data.status, retrieved_at: feed.data.retrieved_at })) };
      const providerSummary = ready.map(feed => `${feed.id} ${String(feed.data.status || "unknown").toUpperCase()} · ${feed.data.event_count ?? feed.data.events?.length ?? 0} events`).join(" · ");
      setFeedState(incomplete ? (partialCoverage ? "PARTIAL SOURCE COVERAGE" : "STALE PUBLISHER SNAPSHOT") : "OFFICIAL SCHEDULE SNAPSHOTS AVAILABLE", `${providerSummary} · these sources do not form a complete global macro calendar.`, incomplete ? "warn" : "");
      const retrievals = ready.map(feed => {
        const retrieved = feed.data.retrieved_at ? new Date(feed.data.retrieved_at) : null;
        const label = retrieved && !Number.isNaN(retrieved.getTime()) ? timeLabel(retrieved, zone()) : "not supplied";
        const sourceZone = feed.data.source_timezone || (feed.id === "FOMC" ? "date only" : "not supplied");
        return `${feed.id}: ${label} · source time basis ${sourceZone}`;
      });
      $("sessionsRetrievedAt").textContent = `Publisher retrievals: ${retrievals.join(" · ")}`;
      $("sessionsLiveState").textContent = incomplete ? `${failedCount ? `${failedCount} of ${settled.length} publisher feeds could not be loaded.` : partialFeeds ? "At least one publisher snapshot reports partial coverage." : "At least one publisher snapshot is stale."} Verify every event at its issuer before relying on the schedule.` : "Official BLS, EIA, CFTC, Federal Reserve, ECB, Bank of England, Bank of Canada, RBA and BEA schedules are included. ECB, FOMC and RBA entries are date-only; BEA dates include publisher-supplied UTC times. Verify issuer revisions. Forecasts and actual values are not supplied.";
      $("sessionsLiveState").dataset.tone = incomplete ? "warn" : "";
    } catch (error) {
      snapshot = null; events = [];
      setFeedState("UNAVAILABLE", "No calendar snapshot was received. Use the official issuer schedule to verify dates.", "error");
      $("sessionsLiveState").textContent = error.message || "Official calendar request failed.";
      $("sessionsLiveState").dataset.tone = "error";
      $("sessionsRetrievedAt").textContent = "Retrieval time: unavailable";
    } finally {
      renderEvents(); button.disabled = false; button.textContent = "Refresh official schedule";
    }
  }

  function exportVisible() {
    const exportable = visibleEvents().filter(event => event.date_only
      ? /^\d{4}-\d{2}-\d{2}$/.test(event.scheduled_date || "")
      : Number.isFinite(Date.parse(event.scheduled_at_utc || "")));
    if (!exportable.length) return;
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Futures Intelligence OS//Publisher Schedules//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    for (const event of exportable) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${escapeIcs(event.event_id || `${event.scheduled_at_utc}:${event.title}`)}`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
      if (event.date_only) {
        const lastDate = /^\d{4}-\d{2}-\d{2}$/.test(event.scheduled_end_date || "") ? event.scheduled_end_date : event.scheduled_date;
        lines.push(`DTSTART;VALUE=DATE:${event.scheduled_date.replace(/-/g, "")}`);
        lines.push(`DTEND;VALUE=DATE:${plusDays(lastDate, 1).replace(/-/g, "")}`);
      } else {
        lines.push(`DTSTART:${new Date(event.scheduled_at_utc).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
      }
      lines.push(`SUMMARY:${escapeIcs(event.title)}`);
      lines.push(`URL:${event.source_url || "https://www.bls.gov/schedule/"}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "futures-intelligence-publisher-schedules.ics"; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  $("sessionsTimezone").value = "browser";
  $("sessionsTimezone").addEventListener("change", () => { updateClock(); renderEvents(); renderWindows(); });
  $("sessionsRange").addEventListener("change", renderEvents);
  $("sessionsPublisher").addEventListener("change", renderEvents);
  const family = $("sessionsFamily");
  const preset = new URLSearchParams(location.search).get("market");
  if ([...family.options].some(option => option.value === preset)) family.value = preset;
  family.addEventListener("change", renderEvents);
  $("sessionsWindowDate").addEventListener("change", renderWindows);
  $("sessionsRefresh").addEventListener("click", loadCalendar);
  $("sessionsExport").addEventListener("click", exportVisible);
  updateClock(); renderWindows(); loadCalendar();
  setInterval(() => { updateClock(); renderWindows(); }, 30000);
})();
