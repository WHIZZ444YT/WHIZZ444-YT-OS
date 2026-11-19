export const COT_DATASETS = Object.freeze({
  legacy: Object.freeze({
    label: "Legacy",
    futures_only: Object.freeze({ id: "6dca-aqww", label: "Futures Only", variant: "futures-only", sourceUrl: "https://publicreporting.cftc.gov/Commitments-of-Traders/Legacy-Futures-Only/6dca-aqww" }),
    combined: Object.freeze({ id: "jun7-fc8e", label: "Futures and Options Combined", variant: "combined", sourceUrl: "https://publicreporting.cftc.gov/Commitments-of-Traders/Legacy-Combined/jun7-fc8e" })
  }),
  disaggregated: Object.freeze({
    label: "Disaggregated",
    futures_only: Object.freeze({ id: "72hh-3qpy", label: "Futures Only", variant: "futures-only", sourceUrl: "https://publicreporting.cftc.gov/Commitments-of-Traders/Disaggregated-Futures-Only/72hh-3qpy" }),
    combined: Object.freeze({ id: "kh3c-gbw2", label: "Futures and Options Combined", variant: "combined", sourceUrl: "https://publicreporting.cftc.gov/Commitments-of-Traders/Disaggregated-Combined/kh3c-gbw2" })
  }),
  tff: Object.freeze({
    label: "Traders in Financial Futures (TFF)",
    futures_only: Object.freeze({ id: "gpe5-46if", label: "Futures Only", variant: "futures-only", sourceUrl: "https://publicreporting.cftc.gov/Commitments-of-Traders/TFF-Futures-Only/gpe5-46if" }),
    combined: Object.freeze({ id: "yw9f-hn96", label: "Futures and Options Combined", variant: "combined", sourceUrl: "https://publicreporting.cftc.gov/Commitments-of-Traders/TFF-Combined/yw9f-hn96" })
  })
});

export const COT_SCHEDULE_URL = "https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm";

const POSITION_FIELDS = Object.freeze({
  legacy: [
    // The official Legacy schema (https://publicreporting.cftc.gov/api/views/jun7-fc8e)
    // has no commercial spreading field. Keep this null so Socrata never
    // rejects the entire $select projection for either Legacy dataset.
    { label: "Commercial", long: "comm_positions_long_all", short: "comm_positions_short_all", spread: null, spreadReason: "not provided by the CFTC Legacy schema" },
    { label: "Non-commercial", long: "noncomm_positions_long_all", short: "noncomm_positions_short_all", spread: "noncomm_postions_spread_all" },
    { label: "Non-reportable", long: "nonrept_positions_long_all", short: "nonrept_positions_short_all", spread: null }
  ],
  disaggregated: [
    { label: "Producer / Merchant / Processor / User", long: "prod_merc_positions_long", short: "prod_merc_positions_short", spread: null },
    { label: "Swap Dealers", long: "swap_positions_long_all", short: "swap__positions_short_all", spread: "swap__positions_spread_all" },
    { label: "Managed Money", long: "m_money_positions_long_all", short: "m_money_positions_short_all", spread: "m_money_positions_spread" },
    { label: "Other Reportables", long: "other_rept_positions_long", short: "other_rept_positions_short", spread: "other_rept_positions_spread" },
    { label: "Non-Reportables", long: "nonrept_positions_long_all", short: "nonrept_positions_short_all", spread: null }
  ],
  tff: [
    { label: "Dealer / Intermediary", long: "dealer_positions_long_all", short: "dealer_positions_short_all", spread: "dealer_positions_spread_all" },
    { label: "Asset Manager / Institutional", long: "asset_mgr_positions_long", short: "asset_mgr_positions_short", spread: "asset_mgr_positions_spread" },
    { label: "Leveraged Funds", long: "lev_money_positions_long", short: "lev_money_positions_short", spread: "lev_money_positions_spread" },
    { label: "Other Reportables", long: "other_rept_positions_long", short: "other_rept_positions_short", spread: "other_rept_positions_spread" },
    { label: "Non-Reportables", long: "nonrept_positions_long_all", short: "nonrept_positions_short_all", spread: null }
  ]
});

export function cotSourceColumns(report) {
  const fields = POSITION_FIELDS[report];
  if (!fields) throw new TypeError(`Unsupported COT report family: ${report}`);
  return [...new Set([
    "report_date_as_yyyy_mm_dd",
    "cftc_contract_market_code",
    "cftc_market_code",
    "cftc_commodity_code",
    "contract_market_name",
    "market_and_exchange_names",
    "open_interest_all",
    ...fields.flatMap(category => [category.long, category.short, category.spread].filter(Boolean))
  ])];
}

export function validateCotQuery(params) {
  const allowed = new Set(["report", "variant", "q", "contract_market_code"]);
  for (const key of params.keys()) {
    if (!allowed.has(key)) return { ok: false, code: "unsupported_parameter", message: `Unsupported COT parameter: ${key}` };
    if (params.getAll(key).length !== 1) return { ok: false, code: "duplicate_parameter", message: `COT parameter may appear only once: ${key}` };
  }
  const report = (params.get("report") || "tff").toLowerCase();
  if (!Object.hasOwn(COT_DATASETS, report)) return { ok: false, code: "unsupported_report", message: "report must be legacy, disaggregated or tff" };
  const variant = (params.get("variant") || "futures-only").toLowerCase();
  if (!new Set(["futures-only", "combined"]).has(variant)) return { ok: false, code: "unsupported_variant", message: "variant must be futures-only or combined" };
  const q = (params.get("q") || "").trim();
  const contractMarketCode = (params.get("contract_market_code") || "").trim();
  if (q && contractMarketCode) return { ok: false, code: "ambiguous_market_filter", message: "Use either q or contract_market_code, not both" };
  if (q && (q.length < 3 || q.length > 80 || !/^[\p{L}\p{N} .&'()\-/]+$/u.test(q))) return { ok: false, code: "invalid_market_query", message: "q must be a 3–80 character CFTC market-name search using plain text" };
  if (contractMarketCode && !/^[A-Za-z0-9]{3,12}$/.test(contractMarketCode)) return { ok: false, code: "invalid_contract_market_code", message: "contract_market_code must be a 3–12 character source-native CFTC code" };
  const dataset = COT_DATASETS[report][variant === "combined" ? "combined" : "futures_only"];
  return { ok: true, query: { report, variant, q, contractMarketCode }, dataset };
}

export function asFiniteNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeCotRows(rows, { report, variant = "futures-only", retrievedAt = null, sourceUrl = null } = {}) {
  const fields = POSITION_FIELDS[report];
  if (!fields) throw new TypeError(`Unsupported COT report family: ${report}`);
  const normalized = [];
  for (const raw of rows || []) {
    const sourceDate = raw.report_date_as_yyyy_mm_dd || raw.report_date || null;
    const reportDate = sourceDate ? String(sourceDate).slice(0, 10) : null;
    const contractMarketCode = raw.cftc_contract_market_code || null;
    const marketName = raw.contract_market_name || raw.market_and_exchange_names || raw.contract_name || null;
    for (const category of fields) {
      const long = asFiniteNumber(raw[category.long]);
      const short = asFiniteNumber(raw[category.short]);
      const spread = category.spread ? asFiniteNumber(raw[category.spread]) : null;
      if (long === null && short === null && spread === null) continue;
      const openInterest = asFiniteNumber(raw.open_interest_all ?? raw.open_interest);
      normalized.push({
        provider: "CFTC Public Reporting Environment",
        reportFamily: report,
        reportVariant: variant,
        reportDate,
        positionDate: reportDate,
        publishedAt: null,
        publicationTimestampStatus: "not-provided-per-row-by-cftc-dataset",
        retrievedAt,
        contractMarketCode,
        cftcMarketCode: raw.cftc_market_code || null,
        commodityCode: raw.cftc_commodity_code || null,
        marketName,
        marketAndExchangeNames: raw.market_and_exchange_names || null,
        traderCategory: category.label,
        long,
        short,
        spread,
        net: long !== null && short !== null ? long - short : null,
        openInterest,
        longPercentOfOpenInterest: long !== null && openInterest > 0 ? long / openInterest * 100 : null,
        shortPercentOfOpenInterest: short !== null && openInterest > 0 ? short / openInterest * 100 : null,
        netPercentOfOpenInterest: long !== null && short !== null && openInterest > 0 ? (long - short) / openInterest * 100 : null,
        sourceFieldMapping: { long: category.long, short: category.short, spread: category.spread, openInterest: "open_interest_all" },
        sourceNativeFields: raw,
        sourceUrl,
        unit: "contracts",
        qualityStatus: "source-reported",
        missingReason: {
          long: long === null ? "source field missing or blank; not treated as zero" : null,
          short: short === null ? "source field missing or blank; not treated as zero" : null,
          spread: !category.spread ? (category.spreadReason || "not a separate field for this category") : spread === null ? "source field missing or blank; not treated as zero" : null,
          openInterest: openInterest === null ? "source field missing or blank; not treated as zero" : null
        }
      });
    }
  }
  return annotateCotChanges(normalized);
}

export function annotateCotChanges(rows) {
  const bySeries = new Map();
  for (const row of rows || []) {
    const key = [row.reportFamily, row.reportVariant, row.contractMarketCode || row.marketName || "", row.traderCategory].join("|");
    const series = bySeries.get(key) || [];
    series.push(row);
    bySeries.set(key, series);
  }
  for (const series of bySeries.values()) {
    series.sort((a, b) => String(a.reportDate || "").localeCompare(String(b.reportDate || "")));
    let previous = null;
    for (const row of series) {
      row.longChange = previous && row.long !== null && previous.long !== null ? row.long - previous.long : null;
      row.shortChange = previous && row.short !== null && previous.short !== null ? row.short - previous.short : null;
      row.netChange = previous && row.net !== null && previous.net !== null ? row.net - previous.net : null;
      previous = row;
    }
  }
  return [...(rows || [])].sort((a, b) => String(b.reportDate || "").localeCompare(String(a.reportDate || "")));
}

export function cotResponseEnvelope(snapshot, rows = snapshot?.normalizedRows || []) {
  return {
    schema_version: 1,
    data_type: "cftc_cot_positions",
    provider: snapshot?.provider || "CFTC Public Reporting Environment",
    report_family: snapshot?.report || null,
    report_name: snapshot?.reportName || null,
    report_variant: snapshot?.variant || "futures-only",
    position_date: snapshot?.dataAsOf || null,
    published_at: null,
    publication_timestamp_status: "not-provided-per-row-by-cftc-dataset",
    retrieved_at: snapshot?.retrievedAt || null,
    source_url: snapshot?.sourceUrl || null,
    schedule_url: COT_SCHEDULE_URL,
    frequency: "weekly",
    unit: "contracts",
    status: snapshot?.status || "unavailable",
    rows
  };
}
