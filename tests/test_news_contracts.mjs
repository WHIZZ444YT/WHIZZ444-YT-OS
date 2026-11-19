import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUTURES_INSTRUMENTS, NEWS_SOURCE_REGISTRY, classifyNewsTopics,
  filterNewsArticles, marketDataStatus, newsResponseEnvelope,
  parseProviderSeenTime, validateNewsQuery
} from '../cloudflare/src/news-contracts.mjs';

test('news query validates contract, topic, publisher, time bounds, limit and unsupported inputs', () => {
  const valid = validateNewsQuery(new URLSearchParams('instrument=BTC&topic=policy&publisher=example.com&limit=25&sort=provider_seen_desc&since=2026-11-19T00%3A00%3A00Z'));
  assert.equal(valid.ok, true);
  assert.equal(valid.query.instrument, 'btc');
  assert.equal(validateNewsQuery(new URLSearchParams('instrument=SPY')).code, 'unsupported_instrument');
  assert.equal(validateNewsQuery(new URLSearchParams('topic=event-horizon')).code, 'unsupported_topic');
  assert.equal(validateNewsQuery(new URLSearchParams('topic=earnings')).ok, true);
  assert.equal(validateNewsQuery(new URLSearchParams('publisher=not a host')).code, 'invalid_publisher');
  assert.equal(validateNewsQuery(new URLSearchParams('limit=101')).code, 'invalid_limit');
  assert.equal(validateNewsQuery(new URLSearchParams('since=2026-11-20T00:00:00Z&until=2026-11-19T00:00:00Z')).code, 'invalid_time_range');
  assert.equal(validateNewsQuery(new URLSearchParams('unknown=1')).code, 'unsupported_parameter');
  assert.equal(validateNewsQuery(new URLSearchParams('instrument=nq&instrument=es')).code, 'duplicate_parameter');
});

test('publisher seen timestamp parses without presenting it as publication time', () => {
  assert.equal(new Date(parseProviderSeenTime('20261119T123456Z')).toISOString(), '2026-11-19T12:34:56.000Z');
  assert.deepEqual(classifyNewsTopics('Federal Reserve FOMC rate decision and Treasury yield'), ['policy', 'rates', 'treasuries']);
});

test('news filtering combines contract, topic, publisher and provider-seen time', () => {
  const rows = [
    { title: 'FOMC policy', publisher: 'fed.example', instrument_tags: ['nq'], topic_tags: ['policy'], provider_seen_at: '20261119T120000Z' },
    { title: 'EIA inventory', publisher: 'energy.example', instrument_tags: ['cl'], topic_tags: ['energy'], provider_seen_at: '20261119T110000Z' },
    { title: 'CPI', publisher: 'fed.example', instrument_tags: ['nq'], topic_tags: ['macro'], provider_seen_at: '20261118T120000Z' }
  ];
  const query = validateNewsQuery(new URLSearchParams('instrument=NQ&topic=policy&publisher=fed.example&since=2026-11-19T00:00:00Z')).query;
  assert.equal(filterNewsArticles(rows, query).length, 1);
  assert.equal(filterNewsArticles(rows, query)[0].title, 'FOMC policy');
  assert.equal(FUTURES_INSTRUMENTS.size, 15);
});

test('news envelope declares freshness, data class and rights limitations', () => {
  const response = newsResponseEnvelope({ status: 'stale', lastCheckedAt: '2026-11-19T10:00:00Z', notes: ['stale cache'] }, [{ title: 'test' }], Date.parse('2026-11-19T10:05:00Z'));
  assert.equal(response.data_type, 'news_discovery');
  assert.equal(response.cache_age_seconds, 300);
  assert.equal(response.data_as_of, null);
  assert.match(response.licence_display_class, /GDELT attribution required/);
  assert.equal(response.status, 'stale');
});

test('market-data status stays not configured without a licensed upstream', () => {
  const status = marketDataStatus(new Date('2026-11-19T12:00:00Z'));
  assert.equal(status.status, 'not-configured');
  assert.equal(status.data_type, 'exchange_market_data_status');
  assert.equal(status.data_as_of, null);
  assert.ok(status.limitations.some(item => item.includes('No licensed CME/ICE')));
  assert.ok(NEWS_SOURCE_REGISTRY.every(source => Object.hasOwn(source, 'terms_licence_url') && Object.hasOwn(source, 'terms_status')));
});
