import { calculateFuturesPosition, parseMoneyMicros } from './futures-risk-engine.mjs';

export const PRACTICE_KEY = 'ict-lab.practice.v1.';
export const FIXTURE_DATE = '2026-06-02';
export const FIXTURE_START = Date.UTC(2026, 5, 2, 13, 30);
const BAR_MS = 5 * 60 * 1000;

export function closedBarTime(closedCount) {
  return new Date(FIXTURE_START + closedCount * BAR_MS).toISOString();
}

export function readAttempt(raw, dataset, createId) {
  const stored = raw === null ? [] : JSON.parse(raw);
  const records = Array.isArray(stored) ? stored : stored?.decisions;
  if (!Array.isArray(records) || records.some(record => !record || typeof record !== 'object')) {
    throw new Error('The saved replay could not be read.');
  }
  const latest = records.at(-1);
  if (latest?.datasetId && latest.datasetId !== dataset) throw new Error('This replay uses a different dataset.');
  if (latest?.datasetVersion && latest.datasetVersion !== 1) throw new Error('This replay uses a different dataset version.');
  return {
    id: latest?.attemptId ?? stored?.id ?? createId(),
    decisions: records,
    cursor: latest?.nextCursor ?? (4 + records.length),
    revision: latest?.revision ?? records.length,
  };
}

export function appendDecision(storage, key, prior, state, dataset, action, reason, knownLevels, totalBars) {
  if (storage.getItem(key) !== prior) throw new Error('This attempt changed in another tab. Reopen the replay to resume.');
  if (!['Wait', 'Skip', 'Enter long', 'Enter short'].includes(action) || !reason.trim()) throw new Error('Choose a decision and give a rationale.');
  if (!Number.isInteger(state.cursor) || state.cursor < 4 || state.cursor >= totalBars) throw new Error('Replay cursor is outside the active series.');
  const record = {
    datasetId: dataset, datasetVersion: 1, attemptId: state.id,
    bar: state.cursor, nextCursor: state.cursor + 1, barClose: closedBarTime(state.cursor),
    action, reason: reason.trim(), knownLevels, revision: state.revision + 1,
  };
  // A single array write commits the decision and its next cursor. Older builds can still read the array.
  storage.setItem(key, JSON.stringify([...state.decisions, record]));
  return record;
}

export function labRisk(values, spec) {
  const tick = parseMoneyMicros(spec.tickSize, {label: 'Tick size'});
  if (tick <= 0n) throw new Error('Tick size is unavailable.');
  const entry = parseMoneyMicros(values.entry, {label: 'Entry'}), stop = parseMoneyMicros(values.stop, {label: 'Stop'});
  if (entry <= 0n || stop <= 0n) throw new Error('Entry and stop must be positive.');
  if (entry % tick || stop % tick) throw new Error('Entry and stop must align to the selected contract tick.');
  if (!['Long', 'Short'].includes(values.side)) throw new Error('Select a direction.');
  const stopTicks = (entry - stop) * (values.side === 'Long' ? 1n : -1n) / tick;
  if (stopTicks <= 0n) throw new Error('Stop must be on the loss side of entry.');
  const budget = parseMoneyMicros(values.budget, {label: 'Maximum risk'});
  const remaining = parseMoneyMicros(values.remaining, {optional: true, label: 'Remaining loss'});
  const capped = remaining !== null && remaining < budget ? values.remaining : values.budget;
  return calculateFuturesPosition({
    balance: budget === 0n ? '1' : values.budget, riskPercent: '100', dailyLossRemaining: capped,
    drawdownRemaining: '', tickValue: spec.tickValue, stopTicks: stopTicks.toString(), targetTicks: stopTicks.toString(),
    spreadTicks: values.spread, slippageTicks: values.slip, maxContracts: values.max, commissionPerContract: values.fees,
  });
}

const safeImage = value => value == null || (typeof value === 'string' && value.length <= 700000
  && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));

function validateJournal(input, playbooks) {
  if (!input || typeof input !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
      || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date
      || !['NQ', 'ES'].includes(input.symbol) || !['Trade', 'No trade'].includes(input.action)) return null;
  const fields = ['date', 'symbol', 'action', 'plan', 'actual', 'quality', 'adherence', 'emotion', 'review'];
  if (fields.some(field => typeof input[field] !== 'string' || !input[field].trim() || input[field].length > 3000)) return null;
  if (input.action === 'Trade' && (!playbooks.some(name => name.slice(0, 3) === String(input.primary).slice(0, 3))
      || !['Win', 'Loss', 'Scratch'].includes(input.outcome))) return null;
  if (!Array.isArray(input.tags) || input.tags.length > 50 || input.tags.some(tag => typeof tag !== 'string' || tag.length > 150)) return null;
  const before = input.charts?.before ?? null, after = input.charts?.after ?? null;
  if (!safeImage(before) || !safeImage(after)) return null;
  return {...Object.fromEntries(fields.map(field => [field, input[field]])), tags: input.tags,
    primary: input.action === 'Trade' ? input.primary : null, outcome: input.action === 'Trade' ? input.outcome : null,
    charts: {before, after}};
}

export function journalRestorePlan(backup, storage, playbooks) {
  if (!backup || backup.schemaVersion !== 2 || !Array.isArray(backup.entries) || backup.entries.length > 1000) {
    throw new Error('Choose a version 2 Lab journal backup.');
  }
  const seen = new Set();
  const prefix = PRACTICE_KEY + 'journal.';
  return backup.entries.map(entry => {
    const origin = entry?.origin;
    const record = validateJournal(entry?.record, playbooks);
    if (!/^[A-Za-z0-9.-]{1,100}$/.test(origin ?? '') || !record || seen.has(origin)) {
      return {origin, state: 'Invalid or duplicate input'};
    }
    seen.add(origin);
    const key = prefix + origin;
    const existing = storage.getItem(key);
    if (existing === null && !origin.startsWith('v1-')) return {origin, key, record, state: 'Ready'};
    let same = false;
    const matching = raw => {
      try { return JSON.stringify(validateJournal(JSON.parse(raw), playbooks)) === JSON.stringify(record); }
      catch { return false; }
    };
    if (existing === null) {
      same = Object.keys(storage).some(name => name.startsWith(prefix) && matching(storage.getItem(name)));
      return same ? {origin, state: 'Already present'} : {origin, key, record, state: 'Ready'};
    }
    same = matching(existing);
    return {origin, state: same ? 'Already present' : 'Conflict — existing record kept'};
  });
}

export async function upgradeJournalBackup(backup, playbooks) {
  if (backup?.schemaVersion !== 1 || !Array.isArray(backup.entries) || backup.entries.length > 1000) return backup;
  const entries = await Promise.all(backup.entries.map(async entry => {
    const normalized = validateJournal(entry, playbooks);
    if (!normalized) return {record: entry};
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(normalized)));
    const id = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return {origin: 'v1-' + id, record: normalized};
  }));
  return {...backup, schemaVersion: 2, entries};
}
