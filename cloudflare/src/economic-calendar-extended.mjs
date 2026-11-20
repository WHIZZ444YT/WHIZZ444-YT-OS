import { resolveCalendarWallTime } from "./economic-calendar.mjs";

export const CFTC_COT_SCHEDULE_URL = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm";
export const FOMC_CALENDAR_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
export const ECB_COUNCIL_CALENDAR_URL = "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";
export const BOE_MPC_CALENDAR_URL = "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates";
export const BOE_POLICY_URL = "https://www.bankofengland.co.uk/monetary-policy";
export const BOC_RATE_CALENDAR_URL = "https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/";
export const BOC_POLICY_URL = "https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/blackout-guidelines/";
export const RBA_BOARD_CALENDAR_URL = "https://www.rba.gov.au/schedules-events/board-meeting-schedules.html";
export const BEA_RELEASE_DATES_URL = "https://apps.bea.gov/API/signup/release_dates.json";
export const BEA_RELEASE_SCHEDULE_URL = "https://www.bea.gov/news/schedule";
const MAX_SCHEDULE_BYTES = 1024 * 1024;
const EASTERN = "America/New_York";
const LONDON = "Europe/London";
const FRANKFURT = "Europe/Berlin";
const TORONTO = "America/Toronto";
const SYDNEY = "Australia/Sydney";
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

function findPageRevision(text, lastModified) {
  return text.match(/This page was last updated\s+(\d{1,2}\s+[A-Z][a-z]+\s+20\d{2})/i)?.[1] || lastModified || null;
}

function exactScheduleEvent({ id, type, title, country, publisher, publisherId, url, date, time, timezone, retrievedAt, revision, affected, relevance, note }) {
  const parts = { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
  const resolved = resolveCalendarWallTime(parts, time, timezone);
  if (resolved.status !== "exact") throw new Error(`${publisher} release time could not be resolved safely (${resolved.status}).`);
  return {
    event_id: `${id}:${date}`, event_type: type, title, country, publisher, publisher_id: publisherId,
    source_url: url, scheduled_at_utc: new Date(resolved.epochMs).toISOString(), scheduled_date: date,
    scheduled_timezone: timezone, timezone_basis: "source-calendar-policy", schedule_time_resolution: "exact",
    published_at_utc: null, actual_release_at_utc: null, retrieved_at_utc: retrievedAt,
    previous_value: null, forecast_value: null, actual_value: null, unit: null,
    period_label: null, affected_instruments: affected, relevance_basis: relevance, importance: null,
    schedule_status: "scheduled", data_class: "official-central-bank-schedule", source_revision: revision,
    date_only: false, schedule_local_time: time, schedule_note: note
  };
}

function dateOnlyScheduleEvent({ id, type, title, country, publisher, publisherId, url, date, endDate = null, timezone, retrievedAt, revision, affected, relevance, note }) {
  return {
    event_id: `${id}:${date}`, event_type: type, title, country, publisher, publisher_id: publisherId,
    source_url: url, scheduled_at_utc: null, scheduled_date: date, scheduled_end_date: endDate,
    scheduled_timezone: timezone, timezone_basis: "publisher-calendar-date", schedule_time_resolution: "date-only",
    published_at_utc: null, actual_release_at_utc: null, retrieved_at_utc: retrievedAt,
    previous_value: null, forecast_value: null, actual_value: null, unit: null,
    period_label: endDate && endDate !== date ? `Publisher-listed meeting dates: ${date} to ${endDate}` : "Publisher-listed meeting date; no release time is supplied.",
    affected_instruments: affected, relevance_basis: relevance, importance: null,
    schedule_status: "scheduled", data_class: "official-central-bank-meeting-calendar", source_revision: revision,
    date_only: true, schedule_local_time: null, schedule_note: note
  };
}

function finalizedEvents(events, maxEvents) {
  const unique = [...new Map(events.map(event => [event.event_id, event])).values()];
  unique.sort((a, b) => (a.scheduled_at_utc || a.scheduled_date).localeCompare(b.scheduled_at_utc || b.scheduled_date));
  return unique.slice(0, clampCount(maxEvents, 40, 80));
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

function centralBankEventParts({ id, type, title, country, publisher, publisherId, url, date, time, timezone, retrievedAt, revision, affected, relevance, note }) {
  return { id, type, title, country, publisher, publisherId, url, date, time, timezone, retrievedAt, revision, affected, relevance, note };
}

export function parseBoeMpcCalendar(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 730, maxEvents = 40, lastModified = null } = {}) {
  const text = textLines(input);
  if (!/Monetary Policy Committee dates for 20\d{2} and 20\d{2}/i.test(text) || !/confirmed dates/i.test(text) || !/MPC Summary and minutes/i.test(text)) {
    throw new Error("Bank of England MPC calendar did not contain its expected confirmed-date schedule");
  }
  const sections = [...text.matchAll(/(?:^|\n)(20\d{2}) confirmed dates\s*\n/gi)];
  if (!sections.length) throw new Error("Bank of England MPC calendar did not include confirmed year sections");
  const events = [];
  let recognized = 0;
  const cutoff = clampHorizon(now, horizonDays, 730);
  for (let index = 0; index < sections.length; index++) {
    const year = Number(sections[index][1]);
    const start = sections[index].index + sections[index][0].length;
    const end = sections[index + 1]?.index ?? text.length;
    for (const row of text.slice(start, end).split("\n")) {
      const match = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.exec(row);
      if (!match) continue;
      const month = MONTHS[match[2].toLowerCase()];
      const date = dateKey({ year, month, day: Number(match[1]) });
      if (!validDate(year, month, Number(match[1]))) continue;
      recognized++;
      const event = exactScheduleEvent(centralBankEventParts({
        id: "boe:mpc", type: "BOE_MPC_ANNOUNCEMENT", title: "Bank of England Monetary Policy Committee announcement",
        country: "GB", publisher: "Bank of England", publisherId: "BOE", url: BOE_MPC_CALENDAR_URL,
        date, time: "12:00:00", timezone: LONDON, retrievedAt, revision: lastModified,
        affected: ["6B", "6E", "ZN"], relevance: "editorial UK monetary-policy context for currency and rates futures; not a market-impact forecast",
        note: "The Bank lists this confirmed announcement date. The Bank's monetary-policy page states decisions are published at 12 noon on announcement day; timezone conversion follows Europe/London. Verify the issuer for revisions."
      }));
      const at = Date.parse(event.scheduled_at_utc);
      if (at >= now && at <= cutoff) events.push(event);
    }
  }
  if (!recognized) throw new Error("Bank of England MPC calendar did not contain any parseable announcement dates");
  return finalizedEvents(events, maxEvents);
}

export function parseBocRateCalendar(input, { policyInput, retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 730, maxEvents = 40, lastModified = null } = {}) {
  const text = textLines(input);
  const policyText = textLines(policyInput);
  if (!/Policy interest rate/i.test(text) || !/Schedule for 20\d{2}/i.test(text) || !/Interest rate announcement/i.test(text)) {
    throw new Error("Bank of Canada page did not contain its expected policy-rate schedule");
  }
  if (!/key policy rate decision is published on a Wednesday at 9:45 Eastern Time/i.test(policyText)) {
    throw new Error("Bank of Canada release-time policy was not confirmed by the official issuer page");
  }
  const sections = [...text.matchAll(/(?:^|\n)Schedule for (20\d{2})\s*\n/gi)];
  if (!sections.length) throw new Error("Bank of Canada policy-rate calendar did not include year sections");
  const events = [];
  let recognized = 0;
  const cutoff = clampHorizon(now, horizonDays, 730);
  for (let index = 0; index < sections.length; index++) {
    const year = Number(sections[index][1]);
    const start = sections[index].index + sections[index][0].length;
    const end = sections[index + 1]?.index ?? text.length;
    const rows = text.slice(start, end).split("\n");
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const match = /^\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\b/i.exec(row);
      if (!match || !/Interest rate announcement/i.test(rows.slice(rowIndex, rowIndex + 4).join(" "))) continue;
      const month = MONTHS[match[1].toLowerCase()];
      const day = Number(match[2]);
      if (!validDate(year, month, day)) continue;
      if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 3) {
        throw new Error("Bank of Canada announcement date conflicts with the publisher's Wednesday 9:45 Eastern-time policy");
      }
      recognized++;
      const date = dateKey({ year, month, day });
      const event = exactScheduleEvent(centralBankEventParts({
        id: "boc:policy-rate", type: "BOC_POLICY_RATE_ANNOUNCEMENT", title: "Bank of Canada policy interest rate announcement",
        country: "CA", publisher: "Bank of Canada", publisherId: "BOC", url: BOC_RATE_CALENDAR_URL,
        date, time: "09:45:00", timezone: TORONTO, retrievedAt, revision: lastModified,
        affected: ["6C", "ZN"], relevance: "editorial Canadian monetary-policy context for currency and rates futures; not a market-impact forecast",
        note: "The Bank's official blackout-guidelines page states the policy decision is published at 9:45 Eastern Time on a Wednesday. Timezone conversion follows America/Toronto. Verify the issuer for revisions."
      }));
      const at = Date.parse(event.scheduled_at_utc);
      if (at >= now && at <= cutoff) events.push(event);
    }
  }
  if (!recognized) throw new Error("Bank of Canada policy-rate calendar did not contain any parseable announcement dates");
  return finalizedEvents(events, maxEvents);
}

export function parseEcbCouncilCalendar(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 730, maxEvents = 40, lastModified = null } = {}) {
  const text = textLines(input);
  if (!/Schedules for the meetings of the Governing Council and General Council of the ECB/i.test(text)) {
    throw new Error("ECB calendar did not contain its expected Governing Council schedule");
  }
  const lines = text.split("\n");
  const events = [];
  let recognized = 0;
  const cutoff = clampHorizon(now, horizonDays, 730);
  for (let index = 0; index < lines.length - 1; index++) {
    const match = /^(\d{2})\/(\d{2})\/(20\d{2})$/.exec(lines[index]);
    if (!match) continue;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const description = lines[index + 1] || "";
    if (!validDate(year, month, day) || !/Governing Council of the ECB: monetary policy meeting/i.test(description)) continue;
    recognized++;
    const date = dateKey({ year, month, day });
    const ordinal = dateOrdinal(date);
    if (ordinal + 12 * 3600000 < now || ordinal > cutoff) continue;
    events.push(dateOnlyScheduleEvent({
      id: "ecb:governing-council", type: "ECB_MONETARY_POLICY_MEETING", title: `ECB Governing Council monetary policy meeting${description.match(/\(Day [12]\)/i)?.[0] ? ` ${description.match(/\(Day [12]\)/i)[0]}` : ""}`,
      country: "EU", publisher: "European Central Bank", publisherId: "ECB", url: ECB_COUNCIL_CALENDAR_URL,
      date, timezone: FRANKFURT, retrievedAt, revision: lastModified,
      affected: ["6E", "6B", "ZN"], relevance: "editorial euro-area monetary-policy context for currency and rates futures; not a market-impact forecast",
      note: `The ECB lists this Governing Council meeting date without a release time.${/followed by press conference/i.test(description) ? " A press conference is listed after the meeting on this date, but no time is supplied." : ""} A meeting date does not establish the decision or press-conference time; verify the issuer for revisions.`
    }));
  }
  if (!recognized) throw new Error("ECB calendar did not contain any parseable monetary-policy meeting dates");
  return finalizedEvents(events, maxEvents);
}

export function parseRbaBoardCalendar(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 730, maxEvents = 40, lastModified = null } = {}) {
  const text = textLines(input);
  if (!/Board Meeting Schedules/i.test(text) || !/Monetary Policy Board/i.test(text)) {
    throw new Error("Reserve Bank of Australia page did not contain its expected Monetary Policy Board schedule");
  }
  const sections = [...text.matchAll(/(?:^|\n)Board meeting schedules (20\d{2})\s*\n/gi)];
  if (!sections.length) throw new Error("Reserve Bank of Australia calendar did not include year sections");
  const events = [];
  let recognized = 0;
  const cutoff = clampHorizon(now, horizonDays, 730);
  for (let index = 0; index < sections.length; index++) {
    const year = Number(sections[index][1]);
    const start = sections[index].index + sections[index][0].length;
    const end = sections[index + 1]?.index ?? text.length;
    for (const row of text.slice(start, end).split("\n")) {
      const match = /^(\d{1,2})\s*[–-]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.exec(row);
      if (!match) continue;
      const startMonth = MONTHS[match[3].toLowerCase()];
      const firstDay = Number(match[1]);
      const lastDay = Number(match[2]);
      const endMonth = MONTHS[match[3].toLowerCase()];
      if (startMonth !== endMonth || !validDate(year, startMonth, firstDay) || !validDate(year, endMonth, lastDay) || lastDay < firstDay) continue;
      const date = dateKey({ year, month: startMonth, day: firstDay });
      const endDate = dateKey({ year, month: endMonth, day: lastDay });
      recognized++;
      if (dateOrdinal(endDate) + 12 * 3600000 < now || dateOrdinal(date) > cutoff) continue;
      events.push(dateOnlyScheduleEvent({
        id: "rba:monetary-policy-board", type: "RBA_MONETARY_POLICY_BOARD_MEETING", title: "Reserve Bank of Australia Monetary Policy Board meeting",
        country: "AU", publisher: "Reserve Bank of Australia", publisherId: "RBA", url: RBA_BOARD_CALENDAR_URL,
        date, endDate, timezone: SYDNEY, retrievedAt, revision: lastModified,
        affected: ["6A", "6B"], relevance: "editorial Australian monetary-policy context for currency futures; not a market-impact forecast",
        note: "The RBA lists this board meeting date range but does not provide a decision release time here. No time is inferred; verify the issuer for revisions."
      }));
    }
  }
  if (!recognized) throw new Error("Reserve Bank of Australia calendar did not contain any parseable Monetary Policy Board ranges");
  return finalizedEvents(events, maxEvents);
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

function sourceEnvelope({ source, events, provider, publisher, publisherId, scheduleUrl, timezone, timezoneBasis, frequency, coverageNotes }) {
  return {
    schema_version: 1,
    data_type: "official_economic_release_schedule",
    status: "fresh",
    provider,
    publisher,
    publisher_id: publisherId,
    source_url: scheduleUrl,
    schedule_url: scheduleUrl,
    source_timezone: timezone,
    timezone_basis: timezoneBasis,
    frequency,
    retrieved_at: source.retrievedAt,
    data_as_of: null,
    source_revision: source.revision || source.lastModified || null,
    event_count: events.length,
    events,
    coverage_notes: coverageNotes
  };
}

export async function fetchEcbCouncilCalendar(fetchImpl = fetch) {
  const source = await fetchHtml(fetchImpl, ECB_COUNCIL_CALENDAR_URL);
  const events = parseEcbCouncilCalendar(source.html, { retrievedAt: source.retrievedAt, lastModified: source.lastModified });
  return sourceEnvelope({
    source, events, provider: "ECB Governing Council monetary policy meeting calendar", publisher: "European Central Bank", publisherId: "ECB",
    scheduleUrl: ECB_COUNCIL_CALENDAR_URL, timezone: FRANKFURT, timezoneBasis: "meeting location Europe/Berlin; date-only publisher schedule",
    frequency: "publisher-listed meeting dates; updated by ECB",
    coverageNotes: [
      "Contains Governing Council monetary-policy meeting days only; no release time is supplied and general/non-monetary meetings are excluded.",
      "The ECB can revise its published schedule. Verify the issuer before relying on a date.",
      "This is an additional central-bank source, not complete global macro or exchange calendar coverage."
    ]
  });
}

export async function fetchBoeMpcCalendar(fetchImpl = fetch) {
  const [schedule, policy] = await Promise.all([fetchHtml(fetchImpl, BOE_MPC_CALENDAR_URL), fetchHtml(fetchImpl, BOE_POLICY_URL)]);
  const revision = findPageRevision(textLines(schedule.html), schedule.lastModified);
  const policyText = textLines(policy.html);
  if (!/publish the MPC.s decision with the minutes of the meetings at 12 noon on the day of the announcement/i.test(policyText)) {
    throw new Error("Bank of England release-time policy was not confirmed by the official issuer page");
  }
  const events = parseBoeMpcCalendar(schedule.html, { retrievedAt: schedule.retrievedAt, lastModified: revision });
  return sourceEnvelope({
    source: { ...schedule, revision }, events, provider: "Bank of England Monetary Policy Committee announcement calendar", publisher: "Bank of England", publisherId: "BOE",
    scheduleUrl: BOE_MPC_CALENDAR_URL, timezone: LONDON, timezoneBasis: "publisher states 12 noon on announcement day; IANA Europe/London conversion",
    frequency: "publisher-confirmed announcement dates; updated by Bank of England",
    coverageNotes: [
      "The announcement calendar and separate monetary-policy page are checked together; the latter states the usual 12 noon publication policy.",
      "Meeting dates or release policy may be revised. Verify the issuer calendar and announcement page before relying on a date.",
      "This is an additional central-bank source, not complete global macro or exchange calendar coverage."
    ]
  });
}

export async function fetchBocRateCalendar(fetchImpl = fetch) {
  const [schedule, policy] = await Promise.all([fetchHtml(fetchImpl, BOC_RATE_CALENDAR_URL), fetchHtml(fetchImpl, BOC_POLICY_URL)]);
  const events = parseBocRateCalendar(schedule.html, { policyInput: policy.html, retrievedAt: schedule.retrievedAt, lastModified: schedule.lastModified });
  return sourceEnvelope({
    source: schedule, events, provider: "Bank of Canada policy interest rate announcement schedule", publisher: "Bank of Canada", publisherId: "BOC",
    scheduleUrl: BOC_RATE_CALENDAR_URL, timezone: TORONTO, timezoneBasis: "issuer states 9:45 Eastern Time; IANA America/Toronto conversion",
    frequency: "publisher-listed eight fixed rate-announcement dates per year; updated by Bank of Canada",
    coverageNotes: [
      "The rate-date schedule and separate official blackout-guidelines page are checked together; the latter states the decision is published at 9:45 Eastern Time.",
      "Eastern Time is resolved with America/Toronto so standard/daylight offsets follow the calendar date.",
      "This is an additional central-bank source, not complete global macro or exchange calendar coverage."
    ]
  });
}

export async function fetchRbaBoardCalendar(fetchImpl = fetch) {
  const source = await fetchHtml(fetchImpl, RBA_BOARD_CALENDAR_URL);
  const events = parseRbaBoardCalendar(source.html, { retrievedAt: source.retrievedAt, lastModified: source.lastModified });
  return sourceEnvelope({
    source, events, provider: "Reserve Bank of Australia Monetary Policy Board meeting calendar", publisher: "Reserve Bank of Australia", publisherId: "RBA",
    scheduleUrl: RBA_BOARD_CALENDAR_URL, timezone: SYDNEY, timezoneBasis: "meeting location Australia/Sydney; date-only publisher schedule",
    frequency: "publisher-listed board meeting date ranges; updated by RBA",
    coverageNotes: [
      "Only Monetary Policy Board date ranges are included; the page does not supply a decision release time and no time is inferred.",
      "Meeting date ranges may be revised. Verify the issuer calendar before relying on a date.",
      "This is an additional central-bank source, not complete global macro or exchange calendar coverage."
    ]
  });
}

const BEA_INSTRUMENT_RELEVANCE = {
  "Gross Domestic Product": { type: "BEA_GDP_RELEASE", affected: ["ES", "NQ", "ZN"], note: "Editorial macro relevance for U.S. equity-index and Treasury futures; not a market-impact forecast." },
  "Personal Income and Outlays": { type: "BEA_PERSONAL_INCOME_OUTLAYS_RELEASE", affected: ["ES", "NQ", "ZN", "GC"], note: "Includes BEA personal-consumption and price-index releases; relevance tags are editorial context, not a market-impact forecast." },
  "U.S. International Trade in Goods and Services": { type: "BEA_INTERNATIONAL_TRADE_RELEASE", affected: ["6E", "6B", "6J", "6A", "6C", "6S", "DX"], note: "Editorial international-trade context for currency futures; not a market-impact forecast." },
  "U.S. International Transactions": { type: "BEA_INTERNATIONAL_TRANSACTIONS_RELEASE", affected: ["6E", "6B", "6J", "6A", "6C", "6S", "DX"], note: "Editorial international-transactions context for currency futures; not a market-impact forecast." },
  "U.S. International Investment Position": { type: "BEA_INTERNATIONAL_INVESTMENT_POSITION_RELEASE", affected: ["6E", "6B", "6J", "6A", "6C", "6S", "DX"], note: "Editorial international-investment context for currency futures; not a market-impact forecast." },
  "U.S. International Transactions and Investment Position": { type: "BEA_INTERNATIONAL_TRANSACTIONS_AND_INVESTMENT_POSITION_RELEASE", affected: ["6E", "6B", "6J", "6A", "6C", "6S", "DX"], note: "Editorial international-transactions context for currency futures; not a market-impact forecast." },
  "Corporate Profits": { type: "BEA_CORPORATE_PROFITS_RELEASE", affected: ["ES", "NQ"], note: "Editorial U.S. corporate-profits context for equity-index futures; not a market-impact forecast." }
};

function beaTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|\+00:00)$/i.exec(String(value || ""));
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() + 1 !== month || calendarDate.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null;
  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : null;
}

function beaSlug(value) {
  return String(value).normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 90) || "release";
}

export function parseBeaReleaseDates(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 400, maxEvents = 250 } = {}) {
  let data = input;
  if (typeof input === "string") {
    try { data = JSON.parse(input); } catch { throw new Error("BEA release schedule was not valid JSON"); }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("BEA release schedule did not contain an object");
  const revision = typeof data.file_last_updated === "string" && data.file_last_updated.length <= 64 ? data.file_last_updated : null;
  const cutoff = now + Math.max(1, Math.min(550, Number(horizonDays) || 400)) * 86400000;
  const rows = [];
  let categoryCount = 0;
  for (const [release, record] of Object.entries(data)) {
    if (release === "file_last_updated") continue;
    if (!release.trim() || !record || typeof record !== "object" || Array.isArray(record) || !Array.isArray(record.release_dates)) {
      throw new Error("BEA release schedule contained an unexpected category record");
    }
    categoryCount++;
    for (const value of record.release_dates) {
      const timestamp = beaTimestamp(value);
      if (!timestamp) throw new Error("BEA release schedule contained an invalid UTC release timestamp");
      const epoch = Date.parse(timestamp);
      if (epoch < now || epoch > cutoff) continue;
      const classification = BEA_INSTRUMENT_RELEVANCE[release] || null;
      const slug = beaSlug(release);
      rows.push({
        event_id: `bea:${slug}:${timestamp.replace(/[-:.]/g, "").replace(/Z$/, "z")}`,
        event_type: classification?.type || "BEA_PUBLISHER_RELEASE",
        title: release,
        country: "US",
        publisher: "U.S. Bureau of Economic Analysis",
        publisher_id: "BEA",
        source_url: BEA_RELEASE_SCHEDULE_URL,
        scheduled_at_utc: timestamp,
        scheduled_date: timestamp.slice(0, 10),
        scheduled_timezone: "UTC",
        timezone_basis: "publisher JSON timestamp with explicit UTC offset",
        schedule_time_resolution: "exact",
        published_at_utc: null,
        actual_release_at_utc: null,
        retrieved_at_utc: retrievedAt,
        previous_value: null,
        forecast_value: null,
        actual_value: null,
        unit: null,
        period_label: "Publisher-listed release date and time; forecast and actual values are not supplied.",
        affected_instruments: classification?.affected || [],
        relevance_basis: classification?.note || "No instrument mapping is asserted for this BEA release category.",
        importance: null,
        schedule_status: "scheduled",
        data_class: "official-bea-release-schedule",
        source_revision: revision,
        date_only: false,
        schedule_local_time: timestamp.slice(11, 19),
        schedule_note: "BEA schedule data can be revised. Verify the publisher schedule before relying on an event."
      });
    }
  }
  if (!categoryCount) throw new Error("BEA release schedule did not contain any release categories");
  const unique = [...new Map(rows.map(row => [row.event_id, row])).values()];
  unique.sort((a, b) => a.scheduled_at_utc.localeCompare(b.scheduled_at_utc) || a.title.localeCompare(b.title));
  return { events: unique.slice(0, Math.max(1, Math.min(500, Number(maxEvents) || 250))), sourceRevision: revision, categoryCount };
}

export async function fetchBeaReleaseCalendar(fetchImpl = fetch) {
  const response = await fetchImpl(BEA_RELEASE_DATES_URL, {
    headers: { Accept: "application/json", "User-Agent": "FinanceIntelligenceOS/1.3 public research" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Official BEA release schedule HTTP " + response.status);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !/(application\/json|text\/json)/.test(contentType)) throw new Error("Official BEA schedule returned an unexpected content type");
  let text = "";
  if (response.body?.getReader) {
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_SCHEDULE_BYTES) { await reader.cancel(); throw new Error("Official BEA schedule response too large"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } else {
    text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_SCHEDULE_BYTES) throw new Error("Official BEA schedule response too large");
  }
  const retrievedAt = new Date().toISOString();
  const parsed = parseBeaReleaseDates(text, { retrievedAt });
  return {
    schema_version: 1,
    data_type: "official_economic_release_schedule",
    status: "fresh",
    provider: "U.S. Bureau of Economic Analysis release calendar",
    publisher: "U.S. Bureau of Economic Analysis",
    publisher_id: "BEA",
    source_url: BEA_RELEASE_SCHEDULE_URL,
    source_feed_url: BEA_RELEASE_DATES_URL,
    schedule_url: BEA_RELEASE_SCHEDULE_URL,
    source_timezone: "UTC",
    timezone_basis: "BEA machine-readable release dates include explicit UTC offsets",
    frequency: "publisher-updated release schedule",
    retrieved_at: retrievedAt,
    data_as_of: null,
    source_revision: parsed.sourceRevision,
    source_category_count: parsed.categoryCount,
    event_count: parsed.events.length,
    events: parsed.events,
    coverage_notes: [
      "This feed uses BEA's machine-readable release-date JSON and includes upcoming categories published by BEA within a 400-day horizon.",
      "The publisher's release schedule may change; check the official BEA schedule for revisions before relying on an event.",
      "BEA provides release dates and times only here; forecasts, actual values, and measured release timestamps are not included.",
      "Instrument relevance tags are editorial context. Unmapped categories remain visible without inferred market relevance.",
      "BEA coverage is one component of a partial macro calendar, not a complete U.S. or global event calendar."
    ]
  };
}
