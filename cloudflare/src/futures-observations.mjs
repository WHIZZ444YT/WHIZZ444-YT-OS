const ROOT_PATTERN = /^[A-Z0-9]{1,10}$/;
const CONTRACT_MONTH_PATTERN = /^\d{4}(0[1-9]|1[0-2])$/;
const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i;
const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const OBSERVATION_TYPES = new Set(["bar", "daily_volume", "open_interest"]);
const INTERVALS = new Set(["1m", "5m", "15m", "30m", "1h", "1d", "publication"]);
const VOLUME_UNITS = new Set(["contracts", "lots", "trades"]);
const DELAY_CLASSES = new Set(["real-time", "delayed", "end-of-day", "unknown"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value, field, { minimum = -Infinity, integer = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || (integer && !Number.isSafeInteger(value))) {
    throw new Error(`${field} must be a finite${integer ? " integer" : " number"}${minimum >= 0 ? " greater than or equal to zero" : ""}.`);
  }
  return value;
}

function timestamp(value, field) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${field} must be an ISO 8601 timestamp with an explicit timezone.`);
  }
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/i);
  const year = parts[1], month = parts[2], day = parts[3], hour = parts[4], minute = parts[5], second = parts[6];
  const offsetHour = parts[9], offsetMinute = parts[10];
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarDate.getUTCFullYear() !== Number(year) || calendarDate.getUTCMonth() !== Number(month) - 1 || calendarDate.getUTCDate() !== Number(day)
      || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
      || (offsetHour !== undefined && (Number(offsetHour) > 14 || Number(offsetMinute) > 59 || (Number(offsetHour) === 14 && Number(offsetMinute) !== 0)))) {
    throw new Error(`${field} must be a valid calendar timestamp with an explicit timezone.`);
  }
  return new Date(value).toISOString();
}

function hasNoControlCharacters(value) {
  return !/[\u0000-\u001f\u007f]/.test(value);
}

function httpsUrl(value, field) {
  let parsed;
  try { parsed = new URL(String(value || "")); } catch { throw new Error(`${field} must be an HTTPS URL.`); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error(`${field} must be an HTTPS URL without embedded credentials.`);
  return parsed.toString();
}

export function normalizeFuturesObservationBatch(payload, now = new Date()) {
  if (!isRecord(payload)) throw new Error("Request body must be a JSON object.");
  const providerId = String(payload.providerId || "").trim().toLowerCase();
  if (!PROVIDER_PATTERN.test(providerId)) throw new Error("providerId must be a stable lowercase provider identifier.");
  if (!Array.isArray(payload.observations) || payload.observations.length < 1 || payload.observations.length > 500) {
    throw new Error("observations must contain between 1 and 500 rows.");
  }
  const retrievedAt = now.toISOString();
  const seenKeys = new Set();
  const records = payload.observations.map((input, index) => {
    const prefix = `observations[${index}]`;
    if (!isRecord(input)) throw new Error(`${prefix} must be an object.`);
    const venue = String(input.venue || "").trim().toUpperCase();
    const root = String(input.instrumentRoot || "").trim().toUpperCase();
    const exchangeInstrumentId = String(input.exchangeInstrumentId || "").trim();
    const contractMonth = String(input.contractMonth || "").trim();
    const observationType = String(input.observationType || "").trim();
    const interval = String(input.interval || "").trim();
    const sourceRecordId = String(input.sourceRecordId || "").trim();
    const sourceUrl = httpsUrl(input.sourceUrl, `${prefix}.sourceUrl`);
    const delayClass = String(input.delayClass || "unknown").trim();

    if (!/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(venue)) throw new Error(`${prefix}.venue is required and must be a short venue code.`);
    if (!ROOT_PATTERN.test(root)) throw new Error(`${prefix}.instrumentRoot must be an uppercase listed-futures root such as NQ or 6E.`);
    if (!exchangeInstrumentId || exchangeInstrumentId.length > 100 || !hasNoControlCharacters(exchangeInstrumentId)) throw new Error(`${prefix}.exchangeInstrumentId is required (maximum 100 characters).`);
    if (!CONTRACT_MONTH_PATTERN.test(contractMonth)) throw new Error(`${prefix}.contractMonth must use YYYYMM for the listed expiry.`);
    if (!OBSERVATION_TYPES.has(observationType)) throw new Error(`${prefix}.observationType must be bar, daily_volume, or open_interest.`);
    if (!INTERVALS.has(interval)) throw new Error(`${prefix}.interval is not supported.`);
    if (observationType === "daily_volume" && interval !== "1d") throw new Error(`${prefix}.daily_volume must use the 1d interval.`);
    if (observationType === "open_interest" && interval !== "publication") throw new Error(`${prefix}.open_interest must use the publication interval.`);
    if (!sourceRecordId || sourceRecordId.length > 200 || !hasNoControlCharacters(sourceRecordId)) throw new Error(`${prefix}.sourceRecordId is required (maximum 200 characters).`);
    if (!DELAY_CLASSES.has(delayClass)) throw new Error(`${prefix}.delayClass must be real-time, delayed, end-of-day, or unknown.`);

    const base = {
      provider_id: providerId,
      venue,
      instrument_root: root,
      contract_month: contractMonth,
      exchange_instrument_id: exchangeInstrumentId,
      observation_type: observationType,
      interval_code: interval,
      observed_at: timestamp(input.observedAt, `${prefix}.observedAt`),
      data_as_of: timestamp(input.dataAsOf, `${prefix}.dataAsOf`),
      retrieved_at: retrievedAt,
      source_url: sourceUrl,
      source_record_id: sourceRecordId,
      delay_class: delayClass,
      quality_status: "provider-reported"
    };
    const uniqueKey = [providerId, exchangeInstrumentId, contractMonth, observationType, interval, base.observed_at, sourceRecordId].join("\u001f");
    if (seenKeys.has(uniqueKey)) throw new Error(`${prefix} duplicates another observation in this batch.`);
    seenKeys.add(uniqueKey);

    if (observationType === "bar") {
      if (interval === "publication") throw new Error(`${prefix}.bar cannot use the publication interval.`);
      const open = finiteNumber(input.open, `${prefix}.open`);
      const high = finiteNumber(input.high, `${prefix}.high`);
      const low = finiteNumber(input.low, `${prefix}.low`);
      const close = finiteNumber(input.close, `${prefix}.close`);
      if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) throw new Error(`${prefix} has inconsistent OHLC values.`);
      const volumeUnit = String(input.volumeUnit || "").trim();
      if (!VOLUME_UNITS.has(volumeUnit)) throw new Error(`${prefix}.volumeUnit must be contracts, lots, or trades.`);
      return { ...base, open, high, low, close, volume: finiteNumber(input.volume, `${prefix}.volume`, { minimum: 0, integer: volumeUnit !== "lots" }), open_interest: null, volume_unit: volumeUnit };
    }

    if (observationType === "daily_volume") {
      const volumeUnit = String(input.volumeUnit || "").trim();
      if (!VOLUME_UNITS.has(volumeUnit)) throw new Error(`${prefix}.volumeUnit must be contracts, lots, or trades.`);
      return { ...base, open: null, high: null, low: null, close: null, volume: finiteNumber(input.volume, `${prefix}.volume`, { minimum: 0, integer: volumeUnit !== "lots" }), open_interest: null, volume_unit: volumeUnit };
    }

    if (input.openInterest === undefined || input.openInterest === null) throw new Error(`${prefix}.openInterest is required for an open-interest observation.`);
    return { ...base, open: null, high: null, low: null, close: null, volume: null, open_interest: finiteNumber(input.openInterest, `${prefix}.openInterest`, { minimum: 0, integer: true }), volume_unit: null };
  });

  return { providerId, records };
}

export function validateFuturesObservationQuery(params) {
  const root = String(params.get("root") || "").trim().toUpperCase();
  if (!ROOT_PATTERN.test(root)) return { ok: false, code: "invalid_root", message: "Supply one listed-futures root such as NQ or 6E." };
  const contractMonth = String(params.get("contractMonth") || "").trim();
  if (contractMonth && !CONTRACT_MONTH_PATTERN.test(contractMonth)) return { ok: false, code: "invalid_contract_month", message: "contractMonth must use YYYYMM." };
  const type = String(params.get("type") || "").trim();
  if (type && !OBSERVATION_TYPES.has(type)) return { ok: false, code: "invalid_type", message: "type must be bar, daily_volume, or open_interest." };
  const interval = String(params.get("interval") || "").trim();
  if (interval && !INTERVALS.has(interval)) return { ok: false, code: "invalid_interval", message: "interval is not supported." };
  const from = String(params.get("from") || "").trim();
  const to = String(params.get("to") || "").trim();
  const validDate = value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) return false;
    return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  };
  if (!validDate(from) || !validDate(to)) return { ok: false, code: "invalid_date_range", message: "from and to must use YYYY-MM-DD." };
  if (from && to && from > to) return { ok: false, code: "invalid_date_range", message: "from must not be after to." };
  const rawLimit = String(params.get("limit") || "200");
  if (!/^\d{1,3}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 500) return { ok: false, code: "invalid_limit", message: "limit must be between 1 and 500." };
  return { ok: true, query: { root, contractMonth: contractMonth || null, type: type || null, interval: interval || null, from: from || null, to: to || null, limit: Number(rawLimit) } };
}
