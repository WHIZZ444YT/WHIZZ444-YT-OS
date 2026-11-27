// Public capability catalogue. Source access and configuration are not permission to reuse data.
const catalog = [
  ["cftc","CFTC","TFF futures-only gpe5-46if; Disaggregated futures-only 72hh-3qpy; combined yw9f-hn96 / kh3c-gbw2; Legacy 6dca-aqww / jun7-fc8e","https://publicreporting.cftc.gov/stories/s/COT-Help/p2fg-u73y/","public-source","review-required"],
  ["bls","BLS","CPI CUSR0000SA0, core CUSR0000SA0L1E, PPI WPSFD4, payroll CES0000000001, wages CES0500000003, unemployment LNS14000000, JOLTS JTS000000000000000JOL","https://www.bls.gov/developers/api_faqs.htm","public-source","review-required"],
  ["treasury","Treasury Fiscal Data","Monthly average interest rates; optional debt to penny","https://fiscaldata.treasury.gov/api-documentation/","public-source","review-required"],
  ["treasury-yield","US Treasury yields","Daily nominal and real par curves","https://home.treasury.gov/treasury-daily-interest-rate-xml-feed","public-source","review-required"],
  ["nyfed","New York Fed","SOFR, EFFR, OBFR, TGCR, BGCR; operations and dealer statistics conditional","https://markets.newyorkfed.org/static/docs/markets-api.html","public-source","review-required"],
  ["ecb","ECB","EXR D.USD.EUR.SP00.A; monetary aggregates/rates conditional","https://data.ecb.europa.eu/help/api/overview","public-source","review-required"],
  ["world-bank","World Bank","GDP NY.GDP.MKTP.CD; growth NY.GDP.MKTP.KD.ZG, CPI FP.CPI.TOTL.ZG, trade NE.TRD.GNFS.ZS, optional debt GC.DOD.TOTL.GD.ZS","https://datahelpdesk.worldbank.org/knowledgebase/articles/889392","public-source","review-required"],
  ["bis","BIS","Global liquidity indicators WS_GLI; verify current agency/version metadata","https://stats.bis.org/api-doc/v2/","official-reference","reference-only"],
  ["imf","IMF","IFS/WEO and global indicators candidate only","https://data.imf.org/en/Resource-Pages/IMF-API","official-reference","reference-only"],
  ["gdelt","GDELT","DOC 2.0 ArticleList headline discovery","https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/","public-source","review-required"],
  ["sec","SEC EDGAR","Filings/submissions context, issuer watchlist CIK only","https://www.sec.gov/search-filings/edgar-application-programming-interfaces","official-reference","reference-only"],
  ["bea","BEA","NIPA T10101 real GDP growth; PCE price series candidate T20804 with metadata-verified lines","https://apps.bea.gov/API/docs/","registered-api","review-required"],
  ["eia","EIA","PET.WCESTUS1.W crude stocks excluding SPR; production PET.WCRFPUS2.W and Lower 48 storage via documented metadata to confirm","https://www.eia.gov/opendata/documentation.php","registered-api","review-required"],
  ["fred","FRED","Selected macro series; ALFRED vintage-aware candidate","https://fred.stlouisfed.org/docs/api/terms_of_use.html","registered-api","reference-only"],
  ["usda-nass","USDA NASS","Quick Stats crop production and stocks","https://quickstats.nass.usda.gov/api","registered-api","review-required"],
  ["usda-fas","USDA FAS","Production, Supply and Distribution (PSD); WASDE remains separate publication","https://apps.fas.usda.gov/opendata/","registered-api","review-required"],
  ["tradingview","TradingView","Hosted market widgets","https://www.tradingview.com/widget-docs/faq/data/","hosted-widget","hosted-display-only"],
  ["cme","CME Group","Contract specs, holidays, Daily Bulletin, Volume & OI, licensed prices/history","https://www.cmegroup.com/market-data/license-data.html","official-reference","reference-only"],
  ["ice","ICE","DX specs, expiry, market reports and market data","https://www.ice.com/fixed-income-data-services/data-and-analytics/exchange-data","official-reference","reference-only"],
  ["cboe","Cboe","VIX historical context","https://www.cboe.com/tradable-products/vix/vix-historical-data","official-reference","reference-only"],
  ["databento","Databento","Live/historical futures, venue/schema-specific","https://databento.com/futures","licensed","excluded"],
  ["fed-board","Federal Reserve Board","FOMC meeting calendar, policy statements, official RSS, H.4.1","https://www.federalreserve.gov/feeds/feeds.htm","public-source","review-required"],
  ["boe","Bank of England","MPC schedule and decisions","https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates","public-source","review-required"],
  ["boc","Bank of Canada","Policy interest rate schedule","https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/","public-source","review-required"],
  ["rba","Reserve Bank of Australia","Board meeting calendar","https://www.rba.gov.au/schedules-events/board-meeting-schedules.html","public-source","review-required"],
  ["opec","OPEC","Monthly Oil Market Report and official releases","https://www.opec.org/","official-reference","reference-only"],
];

const terms = {
  "cme": "https://www.cmegroup.com/market-data/license-data/information-policies.html",
  "ice": "https://www.ice.com/fixed-income-data-services/data-and-analytics/exchange-data",
  "tradingview": "https://www.tradingview.com/policies/",
  "fred": "https://fred.stlouisfed.org/legal/terms/",
  "bls": "https://www.bls.gov/developers/termsOfService.htm",
  "eia": "https://www.eia.gov/opendata/terms-of-service.php",
  "bis": "https://data.bis.org/help/legal",
  "world-bank": "https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets"
};
const aliases = {
  "cftc-pre": "cftc",
  "bls-v1": "bls",
  "us-treasury": "treasury",
  "us_treasury": "treasury",
  "nyfed-markets": "nyfed",
  "gdelt-doc": "gdelt",
  "cme-rss": "cme"
};
const scheduleOwners = {
  "bls-calendar": "bls",
  "cftc-cot-schedule": "cftc",
  "fomc-calendar": "fed-board",
  "ecb-council-calendar": "ecb",
  "boe-mpc-calendar": "boe",
  "boc-rate-calendar": "boc",
  "rba-monetary-policy-calendar": "rba",
  "bea-release-calendar": "bea",
  "eia-wpsr-schedule": "eia"
};

export function providerRegistry(providers) {
  const interfaces = providers.map(({ id }) => {
    const providerId = scheduleOwners[id] || aliases[id] || id;
    if (!catalog.some(([sourceId]) => sourceId === providerId)) return null;
    const type = scheduleOwners[id] ? "publisher-schedule" : "provider";
    return { id, providerId, type };
  }).filter(Boolean);

  return {
    schemaVersion: 1,
    sources: catalog.map(([id, label, dataset, sourceUrl, access, decision]) => ({
      id, label, dataset, sourceUrl, termsUrl: terms[id] || null, access, decision,
      owner: "Finance Intelligence OS source maintainer",
      attribution: label,
      fallback: "official-reference",
      // null indicates that this catalogue records no affirmative grant for this operation.
      grants: {
        fetch: null,
        display: decision === "hosted-display-only" ? "provider-hosted-only" : null,
        cache: null,
        persist: null,
        export: null
      }
    })),
    interfaces
  };
}
