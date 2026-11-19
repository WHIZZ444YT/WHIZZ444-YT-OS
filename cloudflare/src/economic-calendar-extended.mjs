import { resolveCalendarWallTime } from "./economic-calendar.mjs";

export const CFTC_COT_SCHEDULE_URL = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm";
export const FOMC_CALENDAR_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
const MAX_SCHEDULE_BYTES = 1024 * 1024;
const EASTERN = "America/New_York";
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

function safeCodePoint(value) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
    ? String.fromCodePoint(value) : "\uFFFD";
}

function textLines(input) {
  return String(input || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<(?:br\b[^>]*|\/?(?:p|div|li|h[1-6]|tr|td|th|section|article|ul|ol)\b[^>]*)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => safeCodePoint(parseInt(code, 16)))
    .split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

function easternParts(epochMs) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(epochMs));
  return Object.fromEntries(parts.filter(item => item.type !== "literal").map(item => [item.type, Number(item.value)]));
}

function dateKey(parts) {
  return String(parts.year).padStart(4, "0") + "-" + String(parts.month).padStart(2, "0") + "-" + String(parts.day).padStart(2, "0");
}

function dateOrdinal(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function clampHorizon(now, days, maximum) {
  return now + Math.max(1, Math.min(maximum, Number(days) || 90)) * 86400000;
}

function clampCount(value, fallback, maximum) {
  return Math.max(0, Math.min(maximum, Number(value) || fallback));
}

function findRevision(text, lastModified) {
  return text.match(/Last Update:\s*([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})/i)?.[1] || lastModified || null;
}

export function parseCftcCotSchedule(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 90, maxEvents = 40, lastModified = null } = {}) {
  const text = textLines(input);
  if (!/Commitments of Traders reports are released/i.test(text) || !/Eastern time/i.test(text) || !/Release Schedule/i.test(text)) {
    throw new Error("CFTC release schedule page did not contain its expected publisher schedule text");
  }
  const sections = [...text.matchAll(/(?:^|\n)(20\d{2})\s+Release Schedule\s*\n/gi)];
  if (!sections.length) throw new Error("CFTC release schedule did not include a year table");
  const nowDate = easternParts(now);
  const nowDay = dateOrdinal(dateKey(nowDate));
  const until = clampHorizon(now, horizonDays, 180);
  const events = [];
  for (let index = 0; index < sections.length; index++) {
    const heading = sections[index];
    const year = Number(heading[1]);
    const start = heading.index + heading[0].length;
    const end = sections[index + 1]?.index ?? text.length;
    const rows = text.slice(start, end).split("\n");
    let month = null;
    for (const rawRow of rows) {
      let row = rawRow;
      const monthMatch = /^\s*(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s*\|\s*|\s+|$)(.*)$/i.exec(row);
      if (monthMatch) {
        month = MONTHS[monthMatch[1].toLowerCase()];
        row = monthMatch[2];
      }
      if (!month) continue;
      const dayTokens = row.split(/[|\s]+/).filter(Boolean);
      for (const token of dayTokens) {
        const dayMatch = /^(\d{1,2})(\*)?$/.exec(token);
        if (!dayMatch) continue;
        const day = Number(dayMatch[1]);
        if (!validDate(year, month, day)) continue;
        const date = { year, month, day };
        const scheduledDate = dateKey(date);
        const release = resolveCalendarWallTime(date, "15:30:00", EASTERN);
        const ordinal = dateOrdinal(scheduledDate);
        if (ordinal < nowDay || !release.epochMs || release.epochMs < now || release.epochMs > until) continue;
        events.push({
          event_id: "cftc:cot:" + scheduledDate,
          event_type: "CFTC_COT_PUBLICATION",
          title: "Commitments of Traders (COT) publication",
          country: "US",
          publisher: "Commodity Futures Trading Commission",
          publisher_id: "CFTC",
          source_url: CFTC_COT_SCHEDULE_URL,
          scheduled_at_utc: new Date(release.epochMs).toISOString(),
          scheduled_date: scheduledDate,
          scheduled_timezone: EASTERN,
          timezone_basis: "publisher-schedule-eastern-time",
          schedule_time_resolution: "exact",
          published_at_utc: null,
          actual_release_at_utc: null,
          retrieved_at_utc: retrievedAt,
          previous_value: null,
          forecast_value: null,
          actual_value: null,
          unit: null,
          period_label: "Publisher-listed COT release date; report coverage varies by series.",
          affected_instruments: [],
          relevance_basis: "official futures-positioning publication; instrument availability is determined by the CFTC report",
          importance: null,
          schedule_status: "scheduled",
          data_class: "official-release-schedule",
          source_revision: lastModified,
          date_only: false,
          schedule_local_time: "15:30:00",
          schedule_note: dayMatch[2]
            ? "The publisher marks this date as delayed for a federal holiday."
            : "The CFTC lists this release date and states reports are released at 3:30 p.m. Eastern; verify any later cadence change at the issuer."
        });
      }
    }
  }
  const unique = [...new Map(events.map(event => [event.event_id, event])).values()];
  unique.sort((a, b) => a.scheduled_at_utc.localeCompare(b.scheduled_at_utc));
  return unique.slice(0, clampCount(maxEvents, 40, 80));
}

export function parseFomcCalendar(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 730, maxEvents = 40, lastModified = null } = {}) {
  const text = textLines(input);
  if (!/Meeting calendars, statements, and minutes/i.test(text) || !/FOMC Meetings/i.test(text)) {
    throw new Error("Federal Reserve calendar page did not contain its expected meeting schedule text");
  }
  const sections = [...text.matchAll(/(?:^|\n)(20\d{2})\s+FOMC Meetings\s*\n/gi)];
  if (!sections.length) throw new Error("Federal Reserve calendar did not include year sections");
  const nowParts = easternParts(now);
  const todayOrdinal = dateOrdinal(dateKey(nowParts));
  const until = clampHorizon(now, horizonDays, 730);
  const events = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const heading = sections[sectionIndex];
    const year = Number(heading[1]);
    const start = heading.index + heading[0].length;
    const end = sections[sectionIndex + 1]?.index ?? text.length;
    const section = text.slice(start, end);
    const monthRows = [...section.matchAll(/(?:^|\n)(January|February|March|April|May|June|July|August|September|October|November|December)\s*\n/gi)];
    for (let index = 0; index < monthRows.length; index++) {
      const row = monthRows[index];
      const month = MONTHS[row[1].toLowerCase()];
      const rowStart = row.index + row[0].length;
      const rowEnd = monthRows[index + 1]?.index ?? section.length;
      const meeting = /^\s*(\d{1,2})\s*[-–]\s*(\d{1,2})(\*)?\s*$/m.exec(section.slice(rowStart, rowEnd));
      if (!meeting) continue;
      const firstDay = Number(meeting[1]);
      const lastDay = Number(meeting[2]);
      if (!validDate(year, month, firstDay) || !validDate(year, month, lastDay)) continue;
      const scheduledDate = dateKey({ year, month, day: firstDay });
      const ordinal = dateOrdinal(scheduledDate);
      const midday = ordinal + 12 * 3600000;
      if (ordinal < todayOrdinal || midday < now || midday > until) continue;
      const range = meeting[1] + "-" + meeting[2];
      const projectionNote = meeting[3] ? " The publisher marks this meeting as associated with a Summary of Economic Projections." : "";
      events.push({
        event_id: "fomc:meeting:" + scheduledDate,
        event_type: "FOMC_MEETING",
        title: "Federal Open Market Committee meeting (" + range + ")",
        country: "US",
        publisher: "Board of Governors of the Federal Reserve System",
        publisher_id: "FED",
        source_url: FOMC_CALENDAR_URL,
        scheduled_at_utc: null,
        scheduled_date: scheduledDate,
        scheduled_end_date: dateKey({ year, month, day: lastDay }),
        scheduled_timezone: null,
        timezone_basis: "publisher-calendar-date",
        schedule_time_resolution: "date-only",
        published_at_utc: null,
        actual_release_at_utc: null,
        retrieved_at_utc: retrievedAt,
        previous_value: null,
        forecast_value: null,
        actual_value: null,
        unit: null,
        period_label: "Scheduled meeting dates: " + scheduledDate + " to " + dateKey({ year, month, day: lastDay }),
        affected_instruments: ["ZN", "DX", "NQ", "ES", "GC", "6E"],
        relevance_basis: "editorial rates-related futures context; not a market-impact forecast",
        importance: null,
        schedule_status: "scheduled",
        data_class: "official-meeting-calendar-date",
        source_revision: lastModified,
        date_only: true,
        schedule_note: "The Federal Reserve publishes this meeting date range without a release time in the calendar." + projectionNote + " Verify the issuer for schedule revisions."
      });
    }
  }
  const unique = [...new Map(events.map(event => [event.event_id, event])).values()];
  unique.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  return unique.slice(0, clampCount(maxEvents, 40, 80));
}

async function fetchHtml(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { Accept: "text/html", "User-Agent": "FinanceIntelligenceOS/1.3 public research" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Official schedule HTTP " + response.status);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !/text\/html/.test(contentType)) throw new Error("Official schedule returned an unexpected content type");
  let html = "";
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > MAX_SCHEDULE_BYTES) {
        await reader.cancel();
        throw new Error("Official schedule response too large");
      }
      html += decoder.decode(chunk.value, { stream: true });
    }
    html += decoder.decode();
  } else {
    html = await response.text();
    if (new TextEncoder().encode(html).byteLength > MAX_SCHEDULE_BYTES) throw new Error("Official schedule response too large");
  }
  return { html, retrievedAt: new Date().toISOString(), lastModified: response.headers.get("last-modified") || null };
}

export async function fetchCftcCotSchedule(fetchImpl = fetch) {
  const source = await fetchHtml(fetchImpl, CFTC_COT_SCHEDULE_URL);
  const events = parseCftcCotSchedule(source.html, { retrievedAt: source.retrievedAt, lastModified: source.lastModified });
  return {
    schema_version: 1,
    data_type: "official_economic_release_schedule",
    status: "fresh",
    provider: "CFTC Commitments of Traders Release Schedule",
    publisher: "Commodity Futures Trading Commission",
    publisher_id: "CFTC",
    source_url: CFTC_COT_SCHEDULE_URL,
    schedule_url: CFTC_COT_SCHEDULE_URL,
    source_timezone: EASTERN,
    timezone_basis: "CFTC states report release times are Eastern Time",
    frequency: "publisher-listed release dates; cadence may be updated by CFTC",
    retrieved_at: source.retrievedAt,
    data_as_of: null,
    source_revision: source.lastModified,
    event_count: events.length,
    events,
    coverage_notes: [
      "The dated CFTC schedule is authoritative for listed publication dates and time; report contents are series-specific.",
      "CFTC announced a planned move to twice-weekly publication by the end of 2026; confirm operational cadence from the current publisher schedule.",
      "COT is delayed positioning data, not exchange intraday volume or open interest."
    ]
  };
}

export async function fetchFomcCalendar(fetchImpl = fetch) {
  const source = await fetchHtml(fetchImpl, FOMC_CALENDAR_URL);
  const visibleText = textLines(source.html);
  const revision = findRevision(visibleText, source.lastModified);
  const events = parseFomcCalendar(source.html, { retrievedAt: source.retrievedAt, lastModified: revision });
  return {
    schema_version: 1,
    data_type: "official_economic_release_schedule",
    status: "fresh",
    provider: "Federal Reserve FOMC meeting calendar",
    publisher: "Board of Governors of the Federal Reserve System",
    publisher_id: "FED",
    source_url: FOMC_CALENDAR_URL,
    schedule_url: FOMC_CALENDAR_URL,
    source_timezone: null,
    timezone_basis: "Publisher calendar dates are displayed without a release time",
    frequency: "annual meeting schedule; updated by publisher",
    retrieved_at: source.retrievedAt,
    data_as_of: null,
    source_revision: revision,
    event_count: events.length,
    events,
    coverage_notes: [
      "This feed contains FOMC meeting dates, not statement times or a complete U.S. or global macro calendar.",
      "Federal Reserve meeting dates may be tentative or change; verify the issuer calendar before the meeting.",
      "Instrument relevance tags are editorial context, not a policy or price-impact forecast."
    ]
  };
}
