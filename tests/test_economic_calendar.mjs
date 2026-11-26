import test from 'node:test';
import assert from 'node:assert/strict';
import { BLS_CALENDAR_URL, EIA_WPSR_SCHEDULE_URL, fetchBlsCalendar, fetchEiaWpsrSchedule, parseBlsIcs, parseEiaWpsrSchedule, resolveCalendarWallTime } from '../cloudflare/src/economic-calendar.mjs';
import { BEA_RELEASE_DATES_URL, BEA_RELEASE_SCHEDULE_URL, BOC_POLICY_URL, BOC_RATE_CALENDAR_URL, BOE_MPC_CALENDAR_URL, BOE_POLICY_URL, CFTC_COT_SCHEDULE_URL, ECB_COUNCIL_CALENDAR_URL, FOMC_CALENDAR_URL, RBA_BOARD_CALENDAR_URL, classifyPublisherScheduleFailure, fetchBeaReleaseCalendar, fetchBocRateCalendar, fetchBoeMpcCalendar, fetchCftcCotSchedule, fetchEcbCouncilCalendar, fetchFomcCalendar, fetchRbaBoardCalendar, parseBeaReleaseDates, parseBocRateCalendar, parseBoeMpcCalendar, parseCftcCotSchedule, parseEcbCouncilCalendar, parseFomcCalendar, parseRbaBoardCalendar } from '../cloudflare/src/economic-calendar-extended.mjs';

const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:release-1\r\nDTSTAMP:20261001T120000Z\r\nDTSTART;TZID=America/New_York:20261119T083000\r\nSUMMARY:Consumer Price Index for October\r\nURL:https://www.bls.gov/schedule/news_release/cpi.htm\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:release-2\r\nDTSTART:20260701T083000\r\nSUMMARY:Employment Situation for June\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:date-only\r\nDTSTART;VALUE=DATE:20261225\r\nSUMMARY:Publisher date only\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:cancelled\r\nDTSTART;TZID=America/New_York:20261204T083000\r\nSUMMARY:Cancelled release\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\nEND:VCALENDAR`;
const eiaSchedule = `<html><h1>Weekly Petroleum Status Report Schedule</h1><p>The standard release time and day of the week will be at 10:30 a.m. eastern time on Wednesday with the following exceptions. All times are eastern.</p><table><tr><th>Data for the week ending</th><th>Alternate release date</th><th>Release day</th><th>Release time</th><th>Holiday</th></tr><tr><td>January 16, 2026</td><td>January 22, 2026</td><td>Thursday</td><td>12:00 p.m.</td><td>Martin Luther King Jr. Day</td></tr></table></html>`;
const cftcSchedule = `<html><h1>Release Schedule</h1><p>The Commitments of Traders reports are released at 3:30 p.m. Eastern time. The following is a tentative schedule of releases through 2026.</p><h2>2026 Release Schedule</h2><table><tr><th>Month</th><th>Dates</th></tr><tr><td>November</td><td>06</td><td>16*</td><td>20</td><td>30*</td></tr><tr><td>December</td><td>04</td><td>11</td><td>18</td><td>28*</td></tr></table><p>*Delayed release date due to a federal holiday.</p></html>`;
const fomcCalendar = `<html><h1>Federal Open Market Committee</h1><p>Meeting calendars, statements, and minutes.</p><h3>2026 FOMC Meetings</h3><h4>December</h4><p>8-9*</p><h3>2025 FOMC Meetings</h3><h4>December</h4><p>9-10*</p><h3>2027 FOMC Meetings</h3><h4>January</h4><p>26-27</p><h4>March</h4><p>16-17*</p><h4>October</h4><p>26-27</p><p>Last Update: November 18, 2026</p></html>`;
const boeCalendar = `<html><h1>Monetary Policy Committee dates for 2026 and 2027</h1><h2>2026 confirmed dates</h2><p>Thursday 17 December | December MPC Summary and minutes</p><h2>2027 confirmed dates</h2><p>Thursday 4 February | February MPC Summary and minutes</p><p>Thursday 17 June | June MPC Summary and minutes</p><p>This page was last updated 21 September 2026</p></html>`;
const boePolicy = `<html><p>We publish the MPC&rsquo;s decision with the minutes of the meetings at 12 noon on the day of the announcement, which is usually a Thursday.</p></html>`;
const bocCalendar = `<html><h1>Policy interest rate</h1><h2>Schedule for 2026</h2><table><tr><th>Dates</th><th>Publications</th></tr><tr><td>December 9</td><td>Interest rate announcement</td></tr></table><h2>Schedule for 2027</h2><table><tr><td>January 27</td><td>Interest rate announcement and Monetary Policy Report</td></tr><tr><td>March 3</td><td>Interest rate announcement</td></tr><tr><td>April 28</td><td>Interest rate announcement and Monetary Policy Report</td></tr></table></html>`;

test('publisher schedule failures are classified without exposing raw upstream messages', () => {
  assert.equal(classifyPublisherScheduleFailure(new Error('Official schedule HTTP 403')), 'upstream_http_403');
  assert.equal(classifyPublisherScheduleFailure(new Error('BLS calendar HTTP 403')), 'upstream_http_403');
  assert.equal(classifyPublisherScheduleFailure(new Error('The request timed out')), 'upstream_timeout');
  assert.equal(classifyPublisherScheduleFailure(new Error('Bank of England MPC calendar did not contain its expected confirmed-date schedule')), 'publisher_schedule_format_changed');
  assert.equal(classifyPublisherScheduleFailure(new Error('Bank of England release-time policy was not confirmed by the official issuer page')), 'publisher_policy_changed');
  assert.equal(classifyPublisherScheduleFailure(new Error('opaque upstream detail')), 'upstream_fetch_failed');
});
const bocPolicy = `<html><p>The key policy rate decision is published on a Wednesday at 9:45 Eastern Time.</p></html>`;
const ecbCalendar = `<html><h1>Schedules for the meetings of the Governing Council and General Council of the ECB and related press conferences</h1><p>25/11/2026</p><p>Governing Council of the ECB: non-monetary policy meeting (in Frankfurt)</p><p>16/12/2026</p><p>Governing Council of the ECB: monetary policy meeting in Frankfurt (Day 1)</p><p>17/12/2026</p><p>Governing Council of the ECB: monetary policy meeting in Frankfurt (Day 2), followed by press conference</p><p>03/02/2027</p><p>Governing Council of the ECB: monetary policy meeting in Frankfurt (Day 1)</p></html>`;
const rbaCalendar = `<html><h1>Board Meeting Schedules</h1><p>The meeting schedules for the Monetary Policy Board and Payments System Board are below.</p><h2>Board meeting schedules 2026</h2><table><tr><td>December</td><td>7&ndash;8 December</td><td></td></tr></table><h2>Board meeting schedules 2027</h2><table><tr><td>February</td><td>8&ndash;9 February</td><td>24 February</td></tr></table></html>`;

test('BLS ICS parsing preserves source attribution, distinct timestamps, and schedule-only fields', () => {
  const events = parseBlsIcs(calendar, { retrievedAt: '2026-11-19T12:00:00.000Z' });
  assert.equal(events.length, 4);
  const cpi = events.find(event => event.event_id === 'bls:release-1');
  assert.equal(cpi.title, 'Consumer Price Index for October');
  assert.equal(cpi.scheduled_at_utc, '2026-11-19T13:30:00.000Z');
  assert.equal(cpi.scheduled_timezone, 'America/New_York');
  assert.equal(cpi.timezone_basis, 'ics-tzid');
  assert.equal(cpi.actual_release_at_utc, null);
  assert.equal(cpi.forecast_value, null);
  assert.equal(cpi.retrieved_at_utc, '2026-11-19T12:00:00.000Z');
  assert.equal(cpi.source_url, 'https://www.bls.gov/schedule/news_release/cpi.htm');
  assert.deepEqual(cpi.affected_instruments, ['NQ', 'ES', 'GC', 'ZN', '6E', 'DX']);
});

test('floating BLS calendar times use the publisher Eastern-time policy and adjust for DST', () => {
  const events = parseBlsIcs(calendar);
  const employment = events.find(event => event.event_id === 'bls:release-2');
  assert.equal(employment.scheduled_at_utc, '2026-07-01T12:30:00.000Z');
  assert.equal(employment.timezone_basis, 'source-calendar-policy');
  assert.equal(employment.scheduled_timezone, 'America/New_York');
});

test('ambiguous and nonexistent publisher wall times are not guessed', () => {
  assert.equal(resolveCalendarWallTime({ year: 2026, month: 11, day: 1 }, '01:30:00', 'America/New_York').status, 'ambiguous');
  assert.equal(resolveCalendarWallTime({ year: 2026, month: 3, day: 8 }, '02:30:00', 'America/New_York').status, 'nonexistent');
});

test('date-only rows stay date-only, cancelled status is retained, and invalid event URLs fall back safely', () => {
  const rows = parseBlsIcs(calendar.replace('URL:https://www.bls.gov/schedule/news_release/cpi.htm', 'URL:javascript:alert(1)'));
  const dateOnly = rows.find(event => event.event_id === 'bls:date-only');
  assert.equal(dateOnly.scheduled_at_utc, null);
  assert.equal(dateOnly.date_only, true);
  assert.equal(dateOnly.scheduled_date, '2026-12-25');
  const cancelled = rows.find(event => event.event_id === 'bls:cancelled');
  assert.equal(cancelled.schedule_status, 'cancelled');
  assert.equal(rows.find(event => event.event_id === 'bls:release-1').source_url, 'https://www.bls.gov/schedule/');
});

test('ICS continuation lines, escaped text, deduplication, and event limit are handled', () => {
  const content = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:same\nDTSTART;TZID=America/New_York:20261201T083000\nSUMMARY:Payrolls\\, employment\n  and labour\nEND:VEVENT\nBEGIN:VEVENT\nUID:same\nDTSTART;TZID=America/New_York:20261202T083000\nSUMMARY:Duplicate\nEND:VEVENT\nBEGIN:VEVENT\nUID:other\nDTSTART;TZID=America/New_York:20261203T083000\nSUMMARY:Producer Price Index\nEND:VEVENT\nEND:VCALENDAR`;
  const unfolded = parseBlsIcs(content.replace(/BEGIN:VEVENT\nUID:same\nDTSTART;TZID=America\/New_York:20261202T083000\nSUMMARY:Duplicate\nEND:VEVENT\n/, ''));
  assert.equal(unfolded[0].title, 'Payrolls, employment and labour');
  const rows = parseBlsIcs(content, { maxEvents: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Duplicate');
});

test('fetch adapter accepts the official ICS format and rejects unexpected content and oversized responses', async () => {
  const good = await fetchBlsCalendar(async (url, options) => {
    assert.equal(url, BLS_CALENDAR_URL);
    assert.equal(options.headers.Accept, 'text/calendar');
    return new Response(calendar, { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
  });
  assert.equal(good.status, 'fresh');
  assert.equal(good.provider, 'U.S. Bureau of Labor Statistics Online Calendar');
  assert.equal(good.event_count, 4);
  assert.equal(good.source_timezone, 'America/New_York');
  await assert.rejects(fetchBlsCalendar(async () => new Response('<html>blocked</html>', { headers: { 'content-type': 'text/html' } })), /unexpected content type/);
  await assert.rejects(fetchBlsCalendar(async () => new Response(`BEGIN:VCALENDAR\n${'x'.repeat(1024 * 1024 + 32)}`, { headers: { 'content-type': 'text/calendar' } })), /too large/);
});

test('EIA schedule parser follows the publisher weekly rule and replaces holiday week with its stated exception', () => {
  const events = parseEiaWpsrSchedule(eiaSchedule, { retrievedAt: '2026-01-10T12:00:00.000Z', now: Date.parse('2026-01-10T12:00:00.000Z'), horizonDays: 20 });
  assert.deepEqual(events.map(event => event.scheduled_date), ['2026-01-14', '2026-01-22', '2026-01-28']);
  assert.equal(events[0].scheduled_at_utc, '2026-01-14T15:30:00.000Z');
  assert.equal(events[0].timezone_basis, 'publisher-standard-weekly-rule');
  assert.equal(events[1].scheduled_at_utc, '2026-01-22T17:00:00.000Z');
  assert.equal(events[1].timezone_basis, 'publisher-holiday-exception');
  assert.match(events[1].schedule_note, /Martin Luther King Jr\. Day/);
  assert.equal(events[1].period_label, 'Data for week ending 2026-01-16');
  assert.deepEqual(events[1].affected_instruments, ['CL']);
  assert.equal(events[1].forecast_value, null);
});

test('EIA schedule parser refuses a changed or incomplete publisher page shape', () => {
  assert.throws(() => parseEiaWpsrSchedule('<html><h1>Not the EIA schedule</h1></html>'), /expected publisher schedule text/);
});

test('EIA schedule parser reads the publisher standard weekday and time instead of assuming a fixed Wednesday release', () => {
  const changed = eiaSchedule.replace('10:30 a.m. eastern time on Wednesday', '11:15 a.m. eastern time on Thursday');
  const events = parseEiaWpsrSchedule(changed, { retrievedAt: '2026-01-10T12:00:00.000Z', now: Date.parse('2026-01-10T12:00:00.000Z'), horizonDays: 10 });
  assert.equal(events[0].scheduled_date, '2026-01-15');
  assert.equal(events[0].scheduled_at_utc, '2026-01-15T16:15:00.000Z');
  assert.equal(events[0].timezone_basis, 'publisher-standard-weekly-rule');
  assert.match(events[0].schedule_note, /Thursday at 11:15 a\.m\. Eastern/);
  assert.throws(() => parseEiaWpsrSchedule(changed.replace('11:15 a.m.', '13:90 a.m.')), /release time is invalid/);
});

test('EIA adapter fetches only the official public schedule and returns a source-labelled envelope', async () => {
  const result = await fetchEiaWpsrSchedule(async (url, options) => {
    assert.equal(url, EIA_WPSR_SCHEDULE_URL);
    assert.equal(options.headers.Accept, 'text/html');
    return new Response(eiaSchedule, { headers: { 'content-type': 'text/html; charset=utf-8', 'last-modified': 'Wed, 18 Nov 2026 12:00:00 GMT' } });
  });
  assert.equal(result.status, 'fresh');
  assert.equal(result.publisher, 'U.S. Energy Information Administration');
  assert.equal(result.source_timezone, 'America/New_York');
  assert.equal(result.source_revision, 'Wed, 18 Nov 2026 12:00:00 GMT');
  assert.match(result.frequency, /weekly Wednesday 10:30 Eastern/);
  assert.match(result.coverage_notes[0], /EIA's published weekly Wednesday 10:30/);
  assert.ok(Array.isArray(result.events));
  await assert.rejects(fetchEiaWpsrSchedule(async () => new Response(eiaSchedule, { headers: { 'content-type': 'application/json' } })), /unexpected content type/);
});

test('CFTC parser follows the published date table and resolves the stated Eastern release time', () => {
  const events = parseCftcCotSchedule(cftcSchedule, { retrievedAt: '2026-11-19T12:00:00.000Z', now: Date.parse('2026-11-19T12:00:00.000Z'), horizonDays: 45 });
  assert.deepEqual(events.map(event => event.scheduled_date), ['2026-11-20', '2026-11-30', '2026-12-04', '2026-12-11', '2026-12-18', '2026-12-28']);
  assert.equal(events[0].scheduled_at_utc, '2026-11-20T20:30:00.000Z');
  assert.equal(events[0].publisher_id, 'CFTC');
  assert.equal(events[0].source_url, CFTC_COT_SCHEDULE_URL);
  assert.equal(events[0].affected_instruments.length, 0);
  assert.match(events[1].schedule_note, /delayed for a federal holiday/);
  assert.equal(events[0].actual_release_at_utc, null);
});

test('CFTC parser accepts dates rendered as pipe-separated cells while preserving holiday markers', () => {
  const compactTable = cftcSchedule.replace('<tr><td>November</td><td>06</td><td>16*</td><td>20</td><td>30*</td></tr>', '<tr><td>November | 06 | 16* | 20 | 30*</td></tr>');
  const events = parseCftcCotSchedule(compactTable, { now: Date.parse('2026-11-19T12:00:00.000Z'), horizonDays: 12 });
  assert.deepEqual(events.map(event => event.scheduled_date), ['2026-11-20', '2026-11-30']);
  assert.match(events[1].schedule_note, /delayed for a federal holiday/);
});

test('Federal Reserve calendar produces explicitly date-only FOMC meeting records', () => {
  const events = parseFomcCalendar(fomcCalendar, { retrievedAt: '2026-11-19T12:00:00.000Z', now: Date.parse('2026-11-19T12:00:00.000Z'), horizonDays: 500 });
  assert.deepEqual(events.map(event => event.scheduled_date), ['2026-12-08', '2027-01-26', '2027-03-16', '2027-10-26']);
  assert.equal(events[0].scheduled_at_utc, null);
  assert.equal(events[0].date_only, true);
  assert.equal(events[0].schedule_time_resolution, 'date-only');
  assert.equal(events[0].scheduled_end_date, '2026-12-09');
  assert.equal(events[0].publisher_id, 'FED');
  assert.equal(events[0].source_url, FOMC_CALENDAR_URL);
  assert.match(events[2].schedule_note, /Summary of Economic Projections/);
  assert.match(events[0].period_label, /2026-12-08 to 2026-12-09/);
});

test('BoE confirmed announcement dates resolve the official noon policy using UK DST rules', () => {
  const events = parseBoeMpcCalendar(boeCalendar, { now: Date.parse('2026-11-20T00:00:00.000Z'), horizonDays: 300 });
  assert.deepEqual(events.map(event => event.scheduled_date), ['2026-12-17', '2027-02-04', '2027-06-17']);
  assert.equal(events[0].scheduled_at_utc, '2026-12-17T12:00:00.000Z');
  assert.equal(events[2].scheduled_at_utc, '2027-06-17T11:00:00.000Z');
  assert.equal(events[0].scheduled_timezone, 'Europe/London');
  assert.match(events[0].schedule_note, /12 noon/);
  assert.throws(() => parseBoeMpcCalendar('<html><h1>Changed page</h1></html>'), /expected confirmed-date schedule/);
});

test('Bank of Canada schedule only receives the issuer-confirmed 9:45 Eastern time and DST-aware offsets', () => {
  const events = parseBocRateCalendar(bocCalendar, { policyInput: bocPolicy, now: Date.parse('2026-11-20T00:00:00.000Z'), horizonDays: 400 });
  assert.deepEqual(events.map(event => event.scheduled_date), ['2026-12-09', '2027-01-27', '2027-03-03', '2027-04-28']);
  assert.equal(events[0].scheduled_at_utc, '2026-12-09T14:45:00.000Z');
  assert.equal(events[3].scheduled_at_utc, '2027-04-28T13:45:00.000Z');
  assert.equal(events[0].scheduled_timezone, 'America/Toronto');
  assert.throws(() => parseBocRateCalendar(bocCalendar, { policyInput: '<html>schedule page changed</html>' }), /time policy was not confirmed/);
  assert.throws(() => parseBocRateCalendar(bocCalendar.replace('December 9', 'December 10'), { policyInput: bocPolicy }), /conflicts with the publisher's Wednesday/);
});

test('ECB and RBA schedules remain date-only and include only monetary board meetings', () => {
  const ecb = parseEcbCouncilCalendar(ecbCalendar, { now: Date.parse('2026-11-20T00:00:00.000Z'), horizonDays: 500 });
  assert.deepEqual(ecb.map(event => event.scheduled_date), ['2026-12-16', '2026-12-17', '2027-02-03']);
  assert.equal(ecb[0].scheduled_at_utc, null);
  assert.equal(ecb[0].scheduled_timezone, 'Europe/Berlin');
  assert.equal(ecb[1].date_only, true);
  assert.match(ecb[1].title, /Day 2/);

  const rba = parseRbaBoardCalendar(rbaCalendar, { now: Date.parse('2026-11-20T00:00:00.000Z'), horizonDays: 500 });
  assert.deepEqual(rba.map(event => event.scheduled_date), ['2026-12-07', '2027-02-08']);
  assert.equal(rba[0].scheduled_end_date, '2026-12-08');
  assert.equal(rba[0].scheduled_at_utc, null);
  assert.equal(rba[0].scheduled_timezone, 'Australia/Sydney');
  assert.throws(() => parseRbaBoardCalendar('<html>page changed</html>'), /expected Monetary Policy Board schedule/);
});

test('CFTC and Federal Reserve fetchers validate official HTML and keep source metadata', async () => {
  const cftc = await fetchCftcCotSchedule(async url => {
    assert.equal(url, CFTC_COT_SCHEDULE_URL);
    return new Response(cftcSchedule, { headers: { 'content-type': 'text/html', 'last-modified': 'Wed, 18 Nov 2026 12:00:00 GMT' } });
  });
  assert.equal(cftc.publisher_id, 'CFTC');
  assert.equal(cftc.source_timezone, 'America/New_York');
  assert.match(cftc.coverage_notes.join(' '), /twice-weekly/);

  const fomc = await fetchFomcCalendar(async url => {
    assert.equal(url, FOMC_CALENDAR_URL);
    return new Response(fomcCalendar, { headers: { 'content-type': 'text/html', 'last-modified': 'Wed, 18 Nov 2026 12:00:00 GMT' } });
  });
  assert.equal(fomc.publisher_id, 'FED');
  assert.equal(fomc.source_revision, 'November 18, 2026');
  assert.equal(fomc.events[0].source_revision, 'November 18, 2026');
  await assert.rejects(fetchCftcCotSchedule(async () => new Response('<html>blocked</html>', { headers: { 'content-type': 'text/html' } })), /expected publisher schedule text/);
});

test('four central-bank schedule adapters fetch only official pages and retain source coverage metadata', async () => {
  const fixtures = new Map([
    [ECB_COUNCIL_CALENDAR_URL, ecbCalendar], [BOE_MPC_CALENDAR_URL, boeCalendar], [BOE_POLICY_URL, boePolicy],
    [BOC_RATE_CALENDAR_URL, bocCalendar], [BOC_POLICY_URL, bocPolicy], [RBA_BOARD_CALENDAR_URL, rbaCalendar]
  ]);
  const fetchImpl = async url => {
    assert.ok(fixtures.has(url), `unexpected publisher URL ${url}`);
    return new Response(fixtures.get(url), { headers: { 'content-type': 'text/html; charset=utf-8', 'last-modified': 'Wed, 18 Nov 2026 12:00:00 GMT' } });
  };
  const [ecb, boe, boc, rba] = await Promise.all([
    fetchEcbCouncilCalendar(fetchImpl), fetchBoeMpcCalendar(fetchImpl), fetchBocRateCalendar(fetchImpl), fetchRbaBoardCalendar(fetchImpl)
  ]);
  assert.equal(ecb.publisher_id, 'ECB');
  assert.equal(ecb.events[0].date_only, true);
  assert.equal(boe.publisher_id, 'BOE');
  assert.equal(boe.source_revision, '21 September 2026');
  assert.equal(boe.events[0].schedule_local_time, '12:00:00');
  assert.equal(boc.publisher_id, 'BOC');
  assert.match(boc.timezone_basis, /9:45 Eastern Time/);
  assert.equal(rba.publisher_id, 'RBA');
  assert.equal(rba.events[0].date_only, true);
  assert.ok([ecb, boe, boc, rba].every(feed => feed.status === 'fresh' && feed.event_count === feed.events.length && feed.coverage_notes.length >= 2));
  await assert.rejects(fetchBoeMpcCalendar(async () => new Response('<html>blocked</html>', { headers: { 'content-type': 'text/html' } })), /release-time policy was not confirmed/);
});

test('BEA JSON schedule parser preserves explicit UTC dates, removes duplicates and labels relevance conservatively', () => {
  const payload = {
    'Gross Domestic Product': { release_dates: ['2026-11-25T13:30:00+00:00', '2026-11-25T13:30:00+00:00', '2026-10-29T12:30:00+00:00'] },
    'Personal Income and Outlays': { release_dates: ['2026-12-23T13:30:00+00:00'] },
    'Arts and Cultural Production Satellite Account': { release_dates: ['2027-01-15T14:00:00Z'] },
    'Far Future Release': { release_dates: ['2028-02-01T14:00:00Z'] },
    file_last_updated: '2026-10-22T12:48:27.656675'
  };
  const result = parseBeaReleaseDates(payload, { retrievedAt: '2026-11-20T00:00:00.000Z', now: Date.parse('2026-11-20T00:00:00Z') });
  assert.equal(result.categoryCount, 4);
  assert.equal(result.sourceRevision, payload.file_last_updated);
  assert.equal(result.events.length, 3);
  const gdp = result.events.find(event => event.title === 'Gross Domestic Product');
  assert.equal(gdp.scheduled_at_utc, '2026-11-25T13:30:00.000Z');
  assert.equal(gdp.scheduled_timezone, 'UTC');
  assert.deepEqual(gdp.affected_instruments, ['ES', 'NQ', 'ZN']);
  assert.equal(gdp.actual_release_at_utc, null);
  assert.deepEqual(result.events.find(event => event.title.startsWith('Arts')).affected_instruments, []);
  assert.equal(result.events[0].publisher_id, 'BEA');
  assert.throws(() => parseBeaReleaseDates({ 'GDP': { release_dates: ['2026-02-31T12:30:00Z'] } }), /invalid UTC release timestamp/);
  assert.throws(() => parseBeaReleaseDates({ 'GDP': { release_dates: ['2026-11-25T13:30:00-05:00'] } }), /invalid UTC release timestamp/);
});

test('BEA release calendar fetch uses only the official bounded JSON feed and records source revisions', async () => {
  let requestedUrl = '';
  const fixture = JSON.stringify({ 'Gross Domestic Product': { release_dates: ['2027-01-28T13:30:00+00:00'] }, file_last_updated: '2026-10-22T12:48:27.656675' });
  const feed = await fetchBeaReleaseCalendar(async (url, options) => {
    requestedUrl = String(url);
    assert.match(options.headers.Accept, /application\/json/);
    return new Response(fixture, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  });
  assert.equal(requestedUrl, BEA_RELEASE_DATES_URL);
  assert.equal(feed.publisher_id, 'BEA');
  assert.equal(feed.source_url, BEA_RELEASE_SCHEDULE_URL);
  assert.equal(feed.source_feed_url, BEA_RELEASE_DATES_URL);
  assert.equal(feed.source_revision, '2026-10-22T12:48:27.656675');
  assert.equal(feed.events[0].event_id.startsWith('bea:gross-domestic-product:'), true);
  assert.ok(feed.coverage_notes.some(note => /not a complete/.test(note)));
  await assert.rejects(fetchBeaReleaseCalendar(async () => new Response('<html>unexpected</html>', { headers: { 'content-type': 'text/html' } })), /unexpected content type/);
});

test("BLS keeps the newest sequence even when the older row appears later", () => {
  const feed = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT","UID:rescheduled","SEQUENCE:3","DTSTART;TZID=America/New_York:20260309T083000","SUMMARY:Rescheduled payrolls","STATUS:TENTATIVE","END:VEVENT",
    "BEGIN:VEVENT","UID:rescheduled","SEQUENCE:2","DTSTART;TZID=America/New_York:20260306T083000","SUMMARY:Old payroll date","END:VEVENT",
    "BEGIN:VEVENT","UID:removed","SEQUENCE:2","DTSTART;VALUE=DATE:20261102","SUMMARY:Cancelled date","STATUS:CANCELLED","END:VEVENT",
    "BEGIN:VEVENT","UID:removed","SEQUENCE:1","DTSTART;VALUE=DATE:20261102","SUMMARY:Old meeting","END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const rows = parseBlsIcs(feed);
  assert.equal(rows.length, 2);
  const revised = rows.find(row => row.event_id === "bls:rescheduled");
  assert.equal(revised.scheduled_at_utc, "2026-03-09T12:30:00.000Z");
  assert.equal(revised.schedule_status, "tentative");
  assert.equal(revised.source_sequence, 3);
  const cancelled = rows.find(row => row.event_id === "bls:removed");
  assert.equal(cancelled.schedule_status, "cancelled");
  assert.equal(cancelled.scheduled_at_utc, null);
});
