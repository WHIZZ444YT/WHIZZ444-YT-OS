(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ICTSessionTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function partsInZone(value, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(value);
    const result = {};
    for (const part of parts) if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }

  function offsetMinutesInZone(value, timeZone) {
    const label = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(value).find(part => part.type === 'timeZoneName')?.value || 'GMT';
    if (label === 'GMT' || label === 'UTC') return 0;
    const match = label.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) throw new RangeError(`Unsupported UTC offset label for ${timeZone}: ${label}`);
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
  }

  function parseWall(dateKey, clock) {
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
    const time = /^(\d{2}):(\d{2})$/.exec(String(clock || ''));
    if (!date || !time) throw new RangeError('Expected a YYYY-MM-DD date and HH:MM time.');
    const [, ys, ms, ds] = date;
    const [, hs, mins] = time;
    const values = { year: Number(ys), month: Number(ms), day: Number(ds), hour: Number(hs), minute: Number(mins) };
    const check = new Date(Date.UTC(values.year, values.month - 1, values.day));
    if (check.getUTCFullYear() !== values.year || check.getUTCMonth() + 1 !== values.month || check.getUTCDate() !== values.day || values.hour > 23 || values.minute > 59) {
      throw new RangeError('The wall-clock date or time is outside its valid range.');
    }
    return values;
  }

  function resolveWallTime(dateKey, clock, timeZone, disambiguation = 'reject') {
    if (!timeZone) throw new RangeError('An IANA timezone is required.');
    if (!['reject', 'earlier', 'later'].includes(disambiguation)) throw new RangeError('Disambiguation must be reject, earlier, or later.');
    const wall = parseWall(dateKey, clock);
    const nominal = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
    const offsets = new Set();
    for (const hours of [-36, -24, -12, 0, 12, 24, 36]) offsets.add(offsetMinutesInZone(new Date(nominal + hours * 3600000), timeZone));
    const candidates = [...offsets]
      .map(offset => nominal - offset * 60000)
      .filter(epochMs => {
        const actual = partsInZone(new Date(epochMs), timeZone);
        return actual.year === wall.year && actual.month === wall.month && actual.day === wall.day && actual.hour === wall.hour && actual.minute === wall.minute;
      })
      .sort((a, b) => a - b);
    if (!candidates.length) return { status: 'nonexistent', timeZone, candidates: [], epochMs: null };
    if (candidates.length > 1) {
      const epochMs = disambiguation === 'earlier' ? candidates[0] : disambiguation === 'later' ? candidates[candidates.length - 1] : null;
      return { status: 'ambiguous', timeZone, candidates, epochMs };
    }
    return { status: 'exact', timeZone, candidates, epochMs: candidates[0] };
  }

  function addDays(dateKey, days) {
    const wall = parseWall(dateKey, '00:00');
    if (!Number.isInteger(days)) throw new RangeError('Day adjustment must be a whole number.');
    const value = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }

  function formatInZone(epochMs, timeZone, locale = 'en-IN') {
    if (!Number.isFinite(epochMs)) return null;
    return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(epochMs));
  }

  return { partsInZone, offsetMinutesInZone, resolveWallTime, addDays, formatInZone };
});
