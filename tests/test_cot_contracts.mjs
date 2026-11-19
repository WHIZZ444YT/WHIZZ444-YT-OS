import test from 'node:test';
import assert from 'node:assert/strict';
import { COT_DATASETS, cotResponseEnvelope, normalizeCotRows, validateCotQuery } from '../cloudflare/src/cot-contracts.mjs';

test('all report families and futures-only versus combined views use distinct official dataset IDs', () => {
  for (const family of ['legacy', 'disaggregated', 'tff']) {
    assert.notEqual(COT_DATASETS[family].futures_only.id, COT_DATASETS[family].combined.id);
    assert.equal(COT_DATASETS[family].futures_only.variant, 'futures-only');
    assert.equal(COT_DATASETS[family].combined.variant, 'combined');
  }
  assert.equal(validateCotQuery(new URLSearchParams('report=tff&variant=combined')).dataset.id, 'yw9f-hn96');
  assert.equal(validateCotQuery(new URLSearchParams('report=disaggregated')).dataset.id, '72hh-3qpy');
  assert.equal(validateCotQuery(new URLSearchParams('report=legacy&variant=combined')).dataset.id, 'jun7-fc8e');
});

test('COT query validation rejects unsafe, ambiguous and unsupported parameters', () => {
  assert.equal(validateCotQuery(new URLSearchParams('report=spot')).code, 'unsupported_report');
  assert.equal(validateCotQuery(new URLSearchParams('variant=live')).code, 'unsupported_variant');
  assert.equal(validateCotQuery(new URLSearchParams('q=GC%27%20OR%201%3D1')).code, 'invalid_market_query');
  assert.equal(validateCotQuery(new URLSearchParams('q=gold&contract_market_code=123')).code, 'ambiguous_market_filter');
  assert.equal(validateCotQuery(new URLSearchParams('contract_market_code=bad-code!')).code, 'invalid_contract_market_code');
  assert.equal(validateCotQuery(new URLSearchParams('report=tff&report=legacy')).code, 'duplicate_parameter');
  assert.equal(validateCotQuery(new URLSearchParams('root=ES')).code, 'unsupported_parameter');
});

test('TFF category normalization preserves source fields, nulls, report date and explicit variant', () => {
  const normalized = normalizeCotRows([{
    report_date_as_yyyy_mm_dd: '2026-11-10T00:00:00.000',
    cftc_contract_market_code: '123456',
    cftc_market_code: '123',
    market_and_exchange_names: 'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE',
    contract_market_name: 'E-MINI S&P 500',
    open_interest_all: '1000',
    lev_money_positions_long: '350',
    lev_money_positions_short: '200',
    lev_money_positions_spread: '25'
  }], { report: 'tff', variant: 'combined', retrievedAt: '2026-11-19T12:00:00Z', sourceUrl: 'https://source.example/tff' });
  const row = normalized.find(item => item.traderCategory === 'Leveraged Funds');
  assert.equal(row.reportFamily, 'tff');
  assert.equal(row.reportVariant, 'combined');
  assert.equal(row.positionDate, '2026-11-10');
  assert.equal(row.publishedAt, null);
  assert.match(row.publicationTimestampStatus, /not-provided/);
  assert.equal(row.retrievedAt, '2026-11-19T12:00:00Z');
  assert.equal(row.contractMarketCode, '123456');
  assert.equal(row.net, 150);
  assert.equal(row.netPercentOfOpenInterest, 15);
  assert.equal(row.sourceFieldMapping.long, 'lev_money_positions_long');
  assert.equal(row.spread, 25);
});

test('Disaggregated and Legacy mappings stay report-specific and missing values never become zero', () => {
  const disaggregated = normalizeCotRows([{
    report_date_as_yyyy_mm_dd: '2026-11-10', cftc_contract_market_code: 'GC01',
    contract_market_name: 'GOLD', open_interest_all: '0',
    swap_positions_long_all: '80', swap__positions_short_all: '', swap__positions_spread_all: '10'
  }], { report: 'disaggregated', variant: 'futures-only' });
  const swap = disaggregated.find(item => item.traderCategory === 'Swap Dealers');
  assert.equal(swap.long, 80);
  assert.equal(swap.short, null);
  assert.equal(swap.net, null);
  assert.equal(swap.netPercentOfOpenInterest, null);
  assert.equal(swap.sourceFieldMapping.short, 'swap__positions_short_all');
  assert.match(swap.missingReason.short, /not treated as zero/);
  const legacy = normalizeCotRows([{
    report_date_as_yyyy_mm_dd: '2026-11-10', cftc_contract_market_code: 'ES01',
    contract_market_name: 'S&P 500', comm_positions_long_all: '75', comm_positions_short_all: '60',
    noncomm_positions_long_all: '40', noncomm_positions_short_all: '55', open_interest_all: '500'
  }], { report: 'legacy' });
  assert.deepEqual(legacy.map(item => item.traderCategory).sort(), ['Commercial', 'Non-commercial']);
  assert.equal(legacy.find(item => item.traderCategory === 'Commercial').net, 15);
});

test('weekly changes are computed only within the same code, category, family and variant', () => {
  const rows = normalizeCotRows([
    { report_date_as_yyyy_mm_dd: '2026-11-10', cftc_contract_market_code: 'NQ1', contract_market_name: 'NASDAQ', lev_money_positions_long: 150, lev_money_positions_short: 100, open_interest_all: 500 },
    { report_date_as_yyyy_mm_dd: '2026-11-03', cftc_contract_market_code: 'NQ1', contract_market_name: 'NASDAQ', lev_money_positions_long: 120, lev_money_positions_short: 110, open_interest_all: 490 }
  ], { report: 'tff' });
  const leveraged = rows.filter(item => item.traderCategory === 'Leveraged Funds');
  assert.equal(leveraged[0].reportDate, '2026-11-10');
  assert.equal(leveraged[0].netChange, 40);
  assert.equal(leveraged[1].netChange, null);
});

test('response envelope keeps position date, publication timestamp and retrieval time separate', () => {
  const response = cotResponseEnvelope({ report: 'tff', reportName: 'TFF · Futures Only', variant: 'futures-only', dataAsOf: '2026-11-10', retrievedAt: '2026-11-19T12:00:00Z', sourceUrl: 'https://source.example' });
  assert.equal(response.data_type, 'cftc_cot_positions');
  assert.equal(response.position_date, '2026-11-10');
  assert.equal(response.published_at, null);
  assert.equal(response.retrieved_at, '2026-11-19T12:00:00Z');
  assert.equal(response.frequency, 'weekly');
  assert.ok(response.schedule_url);
});
