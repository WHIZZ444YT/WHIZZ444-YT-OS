(() => {
  const markets = {
    nq: ["tff", "NASDAQ-100"], es: ["tff", "S&P 500"],
    gc: ["disaggregated", "GOLD"], cl: ["disaggregated", "CRUDE OIL"]
  };
  function cotPath(id) {
    const market = markets[id];
    if (!market) return null;
    return "/api/v1/cot?" + new URLSearchParams({ report: market[0], q: market[1] });
  }

  function fundingText(data) {
    const rates = (Array.isArray(data?.rates) ? data.rates : [])
      .filter(row => ["SOFR", "EFFR"].includes(row.type) && Number.isFinite(row.percentRate) && row.effectiveDate);
    if (!rates.length) return "No published funding rates available. See Macro for source details.";
    return rates.map(row => row.type + " " + row.percentRate + "% · effective " + row.effectiveDate).join("; ")
      + " · " + (data.status || "status unavailable") + " · New York Fed";
  }

  function cotText(data) {
    const date = data?.dataAsOf || data?.reportDate || data?.report_date;
    if (!date || !(data.normalizedRows?.length || data.rows?.length)) return "No matching published report. See COT & Positioning.";
    return "CFTC report " + date + " · " + (data.report_family || data.report || "futures")
      + " · " + (data.status || "status unavailable");
  }

  window.FinanceResearchPreview = Object.freeze({ cotPath, fundingText, cotText });
})();
