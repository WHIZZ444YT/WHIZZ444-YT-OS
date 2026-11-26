export const BLS_CALENDAR_URL = "https://www.bls.gov/schedule/news_release/bls.ics";
export const BLS_CALENDAR_SCHEDULE_URL = "https://www.bls.gov/schedule/";
export const BLS_CALENDAR_TZ = "America/New_York";
export const EIA_WPSR_SCHEDULE_URL = "https://www.eia.gov/petroleum/supply/weekly/schedule.php";
export const BLS_CALENDAR_MAX_BYTES = 1024 * 1024;
export const BLS_CALENDAR_MAX_EVENTS = 500;

function unescapeText(value) {
  return String(value || "").replace(/\\([\\,;nN])/g, (_, char) => ({ n: "\n", N: "\n" }[char] || char)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
}

function unfoldLines(input) {
  const lines = String(input || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const output = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && output.length) output[output.length - 1] += line.slice(1);
    else output.push(line);
  }
  return output;
}

function property(line) {
  const colon = line.indexOf(":");
  if (colon < 1) return null;
  const [name, ...parameters] = line.slice(0, colon).split(";");
  const params = {};
  for (const entry of parameters) {
    const equals = entry.indexOf("=");
    if (equals > 0) params[entry.slice(0, equals).toUpperCase()] = entry.slice(equals + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function dateParts(value) {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [, year, month, day] = match;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() + 1 !== Number(month) || check.getUTCDate() !== Number(day)) return null;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function partsInZone(epochMs, timeZone) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(epochMs));
  const result = {};
  for (const item of values) if (item.type !== "literal") result[item.type] = Number(item.value);
  return result;
}

function offsetMinutes(epochMs, timeZone) {
  const p = partsInZone(epochMs, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((wallAsUtc - Math.floor(epochMs / 1000) * 1000) / 60000);
}

export function resolveCalendarWallTime(date, clock, timeZone) {
  if (!date || !timeZone || !/^\d{2}:\d{2}:\d{2}$/.test(clock || "")) return { status: "invalid", epochMs: null };
  const nominal = Date.UTC(date.year, date.month - 1, date.day, Number(clock.slice(0, 2)), Number(clock.slice(3, 5)), Number(clock.slice(6, 8)));
  const offsets = new Set();
  try {
    for (const hours of [-36, -24, -12, 0, 12, 24, 36]) offsets.add(offsetMinutes(nominal + hours * 3600000, timeZone));
    const candidates = [...offsets].map(offset => nominal - offset * 60000).filter(epochMs => {
      const actual = partsInZone(epochMs, timeZone);
      return actual.year === date.year && actual.month === date.month && actual.day === date.day &&
        actual.hour === Number(clock.slice(0, 2)) && actual.minute === Number(clock.slice(3, 5)) && actual.second === Number(clock.slice(6, 8));
    }).sort((a, b) => a - b);
    if (!candidates.length) return { status: "nonexistent", epochMs: null };
    if (candidates.length > 1) return { status: "ambiguous", epochMs: null };
    return { status: "exact", epochMs: candidates[0] };
  } catch {
    return { status: "invalid-timezone", epochMs: null };
  }
}

function timestamp(propertyValue, { defaultTimezone = BLS_CALENDAR_TZ } = {}) {
  const value = String(propertyValue?.value || "");
  if (/^\d{8}$/.test(value) || propertyValue?.params?.VALUE?.toUpperCase() === "DATE") {
    const date = dateParts(value.slice(0, 8));
    return date ? { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, at: null, timezone: null, basis: "date-only", resolution: "date-only" } : null;
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, seconds = "00", zulu] = match;
  const date = dateParts(`${year}${month}${day}`);
  if (!date || Number(hour) > 23 || Number(minute) > 59 || Number(seconds) > 59) return null;
  if (zulu) return { date: `${year}-${month}-${day}`, at: new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +seconds)).toISOString(), timezone: "UTC", basis: "explicit-utc", resolution: "exact" };
  const timezone = propertyValue?.params?.TZID || defaultTimezone;
  const result = resolveCalendarWallTime(date, `${hour}:${minute}:${seconds}`, timezone);
  return { date: `${year}-${month}-${day}`, at: result.epochMs === null ? null : new Date(result.epochMs).toISOString(), timezone, basis: propertyValue?.params?.TZID ? "ics-tzid" : "source-calendar-policy", resolution: result.status };
}

function categoryFor(title) {
  const value = String(title || "").toLowerCase();
  if (/consumer price|producer price|cpi|ppi|inflation/.test(value)) return { category: "inflation", affected: ["NQ", "ES", "GC", "ZN", "6E", "DX"] };
  if (/employment situation|payroll|unemployment|job openings|jolts|employment cost|labor market/.test(value)) return { category: "employment", affected: ["NQ", "ES", "ZN", "GC", "DX"] };
  if (/productivity|unit labor costs|labor productivity/.test(value)) return { category: "labor-productivity", affected: ["NQ", "ES", "ZN", "DX"] };
  return { category: "us-economic-release", affected: [] };
}

function htmlText(value) {
  return String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, " ").replace(/<\/?(?:td|th|p|span|div|a|b|strong)[^>]*>/gi, " ").replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ").trim();
}

function parseEnglishDate(value) {
  const match = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\b/i.exec(String(value || ""));
  if (!match) return null;
  const month = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 }[match[1].toLowerCase()];
  const date = dateParts(`${match[3]}${String(month).padStart(2, "0")}${match[2].padStart(2, "0")}`);
  return date ? `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}` : null;
}

function dateFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  return match ? { year: +match[1], month: +match[2], day: +match[3] } : null;
}

function addDateDays(key, amount) {
  const date = dateFromKey(key);
  if (!date) return null;
  return new Date(Date.UTC(date.year, date.month - 1, date.day + amount)).toISOString().slice(0, 10);
}

function readEiaStandardRule(html) {
  const publisherText = htmlText(html);
  const rule = /standard release time and day of the week will be at (\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)\s+(?:eastern time|ET) on (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i.exec(publisherText);
  if (!/Weekly Petroleum Status Report Schedule/i.test(html) || !rule) throw new Error("EIA schedule page did not contain its expected publisher schedule text");
  const hour = (Number(rule[1]) % 12) + (/^p/i.test(rule[3]) ? 12 : 0);
  const minute = Number(rule[2]);
  if (Number(rule[1]) < 1 || Number(rule[1]) > 12 || minute > 59) throw new Error("EIA publisher standard release time is invalid");
  return { rule, hour, minute, day: rule[4] };
}

export function parseEiaWpsrSchedule(input, { retrievedAt = new Date().toISOString(), now = Date.now(), horizonDays = 90, maxEvents = 20, lastModified = null } = {}) {
  const html = String(input || "");
  const { rule: standardRule, hour: standardHour, minute: standardMinute, day: standardDayName } = readEiaStandardRule(html);
  const dayNumbers = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const standardDay = dayNumbers[standardDayName.toLowerCase()];
  const exceptions = new Map();
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => htmlText(match[1]));
    if (cells.length < 4) continue;
    const weekEnding = parseEnglishDate(cells[0]);
    const alternate = parseEnglishDate(cells[1]);
    if (!weekEnding || !alternate) continue;
    const day = cells[2] || "Thursday";
    const time = (cells[3] || "12:00 p.m.").replace(/\s+/g, " ").trim();
    const timeMatch = /^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)$/i.exec(time);
    if (!timeMatch || +timeMatch[1] < 1 || +timeMatch[1] > 12 || +timeMatch[2] > 59) continue;
    const hour = (+timeMatch[1] % 12) + (/^p/i.test(timeMatch[3]) ? 12 : 0);
    exceptions.set(weekEnding, { releaseDate: alternate, day, hour, minute: +timeMatch[2], holiday: cells[4] || null });
  }

  const nowParts = partsInZone(now, BLS_CALENDAR_TZ);
  const today = `${nowParts.year}-${String(nowParts.month).padStart(2, "0")}-${String(nowParts.day).padStart(2, "0")}`;
  const dayOfWeek = new Date(dateOrdinalUtc(today)).getUTCDay();
  const firstOffset = (standardDay - dayOfWeek + 7) % 7;
  const firstWednesday = addDateDays(today, firstOffset);
  const until = now + Math.max(1, Math.min(180, Number(horizonDays) || 90)) * 86400000;
  const events = [];
  for (let index = 0; index < 27; index++) {
    const regularDate = addDateDays(firstWednesday, index * 7);
    const weekEnding = addDateDays(regularDate, -5);
    const exception = exceptions.get(weekEnding);
    const date = exception?.releaseDate || regularDate;
    const hour = exception?.hour ?? standardHour;
    const minute = exception?.minute ?? standardMinute;
    const datePartsValue = dateFromKey(date);
    const resolution = resolveCalendarWallTime(datePartsValue, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`, BLS_CALENDAR_TZ);
    if (!resolution.epochMs || resolution.epochMs < now || resolution.epochMs > until) continue;
    const localText = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
    events.push({
      event_id: `eia:wpsr:${weekEnding}`, event_type: "EIA_WEEKLY_PETROLEUM_STATUS_REPORT", title: "Weekly Petroleum Status Report (WPSR)",
      country: "US", publisher: "U.S. Energy Information Administration", publisher_id: "EIA", source_url: EIA_WPSR_SCHEDULE_URL,
      scheduled_at_utc: new Date(resolution.epochMs).toISOString(), scheduled_date: date, scheduled_timezone: BLS_CALENDAR_TZ,
      timezone_basis: exception ? "publisher-holiday-exception" : "publisher-standard-weekly-rule", schedule_time_resolution: "exact",
      published_at_utc: null, actual_release_at_utc: null, retrieved_at_utc: retrievedAt,
      previous_value: null, forecast_value: null, actual_value: null, unit: null, period_label: `Data for week ending ${weekEnding}`,
      affected_instruments: ["CL"], relevance_basis: "editorial energy-futures relevance; not an impact forecast",
      importance: null, schedule_status: "scheduled", data_class: "official-release-schedule",
      source_revision: lastModified, date_only: false, schedule_local_time: localText,
      schedule_note: exception ? `Publisher holiday exception: ${exception.holiday || "alternate release schedule"}.` : `Publisher states the standard release is ${standardRule[4]} at ${String(standardHour % 12 || 12)}:${String(standardMinute).padStart(2, "0")} ${standardHour >= 12 ? "p.m." : "a.m."} Eastern; check the issuer for later changes.`
    });
  }
  return events.slice(0, Math.max(0, Math.min(40, Number(maxEvents) || 20)));
}

function dateOrdinalUtc(dateKey) {
  const date = dateFromKey(dateKey);
  return date ? Date.UTC(date.year, date.month - 1, date.day) : NaN;
}

function validHttpUrl(value) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export function parseBlsIcs(input, { retrievedAt = new Date().toISOString(), maxEvents = BLS_CALENDAR_MAX_EVENTS } = {}) {
  const lines = unfoldLines(input);
  const events = new Map();
  let current = null;
  for (const line of lines) {
    const item = property(line);
    if (!item) continue;
    if (item.name === "BEGIN" && item.value.toUpperCase() === "VEVENT") { current = {}; continue; }
    if (item.name === "END" && item.value.toUpperCase() === "VEVENT") {
      if (!current) continue;
      const summary = unescapeText(current.SUMMARY?.value).slice(0, 240);
      const start = timestamp(current.DTSTART);
      const status = String(current.STATUS?.value || 'CONFIRMED').toUpperCase();
      const sequence = /^\d{1,10}$/.test(current.SEQUENCE?.value || '') ? Number(current.SEQUENCE.value) : 0;
      const stamp = current['LAST-MODIFIED']?.value || current.DTSTAMP?.value || null;
      if (summary && start) {
        const id = unescapeText(current.UID?.value).slice(0, 180) || `bls:${start.date}:${summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}`;
        const relevance = categoryFor(summary);
        const eventId = `bls:${id}`;
        const previous = events.get(eventId);
        const newer = !previous || sequence > previous.source_sequence ||
          (sequence === previous.source_sequence && (stamp || '') >= (previous.source_revision || ''));
        if (newer) events.set(eventId, {
          event_id: eventId, event_type: relevance.category.toUpperCase().replace(/-/g, "_"), title: summary,
          country: "US", publisher: "U.S. Bureau of Labor Statistics", publisher_id: "BLS", source_url: validHttpUrl(current.URL?.value) || BLS_CALENDAR_SCHEDULE_URL,
          scheduled_at_utc: start.at, scheduled_date: start.date, scheduled_timezone: start.timezone || BLS_CALENDAR_TZ,
          timezone_basis: start.basis, schedule_time_resolution: start.resolution,
          published_at_utc: null, actual_release_at_utc: null, retrieved_at_utc: retrievedAt,
          previous_value: null, forecast_value: null, actual_value: null, unit: null, period_label: null,
          affected_instruments: relevance.affected, relevance_basis: "editorial-title-classification; verify issuer context",
          importance: null, schedule_status: status === "CANCELLED" ? "cancelled" : status === "TENTATIVE" ? "tentative" : "scheduled",
          data_class: "official-release-schedule", source_revision: stamp, source_sequence: sequence,
          date_only: start.basis === "date-only"
        });
      }
      current = null;
      continue;
    }
    if (current) current[item.name] = item;
  }
  const deduped = [...events.values()];
  deduped.sort((a, b) => (a.scheduled_at_utc || `${a.scheduled_date}T00:00:00.000Z`).localeCompare(b.scheduled_at_utc || `${b.scheduled_date}T00:00:00.000Z`));
  return deduped.slice(0, Math.max(0, Math.min(BLS_CALENDAR_MAX_EVENTS, Number(maxEvents) || BLS_CALENDAR_MAX_EVENTS)));
}

async function boundedText(response, limit) {
  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > limit) throw new Error("calendar response too large");
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new Error("calendar response too large"); }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function fetchBlsCalendar(fetchImpl = fetch) {
  const response = await fetchImpl(BLS_CALENDAR_URL, {
    headers: { Accept: "text/calendar", "User-Agent": "FinanceIntelligenceOS/1.3 public research" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`BLS calendar HTTP ${response.status}`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !/(text\/calendar|text\/plain|application\/octet-stream)/.test(contentType)) throw new Error("BLS calendar returned an unexpected content type");
  const text = await boundedText(response, BLS_CALENDAR_MAX_BYTES);
  if (!/^\s*BEGIN:VCALENDAR/im.test(text)) throw new Error("BLS calendar format is invalid");
  const retrievedAt = new Date().toISOString();
  const events = parseBlsIcs(text, { retrievedAt });
  return {
    schema_version: 1, data_type: "official_economic_release_schedule", status: "fresh",
    provider: "U.S. Bureau of Labor Statistics Online Calendar", publisher: "U.S. Bureau of Labor Statistics",
    source_url: BLS_CALENDAR_URL, schedule_url: BLS_CALENDAR_SCHEDULE_URL,
    source_timezone: BLS_CALENDAR_TZ, timezone_basis: "BLS calendar documentation states displayed release times are Eastern Time",
    frequency: "updated by publisher as needed", retrieved_at: retrievedAt, data_as_of: null,
    event_count: events.length, events,
    coverage_notes: ["BLS calendar covers most scheduled releases from the BLS national office, not all U.S. or global market events.", "BLS schedules are subject to revision; verify the issuer page before an event.", "Forecasts, actual values, and actual release timestamps are not provided by this schedule feed.", "Instrument relevance tags are editorial classification, not BLS-provided metadata."]
  };
}

export async function fetchEiaWpsrSchedule(fetchImpl = fetch) {
  const response = await fetchImpl(EIA_WPSR_SCHEDULE_URL, {
    headers: { Accept: "text/html", "User-Agent": "FinanceIntelligenceOS/1.3 public research" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`EIA WPSR schedule HTTP ${response.status}`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !/text\/html/.test(contentType)) throw new Error("EIA schedule returned an unexpected content type");
  const text = await boundedText(response, BLS_CALENDAR_MAX_BYTES);
  const { day, hour, minute } = readEiaStandardRule(text);
  const retrievedAt = new Date().toISOString();
  const events = parseEiaWpsrSchedule(text, { retrievedAt, lastModified: response.headers.get("last-modified") || null });
  return {
    schema_version: 1, data_type: "official_economic_release_schedule", status: "fresh",
    provider: "U.S. Energy Information Administration WPSR Schedule", publisher: "U.S. Energy Information Administration",
    source_url: EIA_WPSR_SCHEDULE_URL, schedule_url: EIA_WPSR_SCHEDULE_URL,
    source_timezone: BLS_CALENDAR_TZ, timezone_basis: "EIA states all WPSR schedule times are Eastern Time",
    frequency: `weekly ${day} ${String(hour % 12 || 12)}:${String(minute).padStart(2, "0")} Eastern rule plus publisher-listed holiday exceptions`, retrieved_at: retrievedAt,
    data_as_of: null, source_revision: response.headers.get("last-modified") || null,
    event_count: events.length, events,
    coverage_notes: [`Upcoming standard releases are derived from EIA's published weekly ${day} ${String(hour % 12 || 12)}:${String(minute).padStart(2, "0")} Eastern rule; listed holiday exceptions replace the corresponding standard date.`, "EIA can revise or delay its schedule; verify the official schedule before the release.", "Forecasts, actual values, and actual release timestamps are not supplied by this schedule page.", "The CL relevance tag is editorial and is not a price-impact forecast."]
  };
}
