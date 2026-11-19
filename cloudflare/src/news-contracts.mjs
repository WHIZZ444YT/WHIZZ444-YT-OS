export const FUTURES_INSTRUMENTS = new Set([
  'nq', 'es', 'ym', 'rty', 'gc', 'si', 'cl', 'zn', '6e', '6b', '6j', '6a', '6c', 'dx', 'btc'
]);

export const NEWS_TOPICS = new Set([
  'all', 'macro', 'policy', 'rates', 'inflation', 'employment', 'energy', 'metals', 'currencies',
  'treasuries', 'positioning', 'exchange', 'geopolitics', 'supply', 'earnings'
]);

const TOPIC_RULES = {
  macro: ['inflation', 'cpi', 'ppi', 'pce', 'gdp', 'payroll', 'jobs', 'employment', 'retail sales', 'ism', 'jolts'],
  policy: ['fomc', 'federal reserve', 'ecb', 'bank of england', 'bank of japan', 'bank of canada', 'rba', 'rate decision'],
  rates: ['yield', 'treasury', 'interest rate', 'sofr', 'fed funds', 'bond auction'],
  inflation: ['inflation', 'cpi', 'ppi', 'pce'],
  employment: ['payroll', 'nfp', 'jobless claims', 'unemployment', 'employment report'],
  energy: ['crude oil', 'wti', 'natural gas', 'eia', 'opec', 'refinery', 'petroleum'],
  metals: ['gold', 'silver', 'copper', 'metals', 'bullion'],
  currencies: ['euro', 'sterling', 'pound', 'yen', 'australian dollar', 'canadian dollar', 'ecb', 'boe', 'boj', 'rba', 'boc'],
  treasuries: ['treasury', 'yield curve', 'bond auction', '10-year', '30-year'],
  positioning: ['cftc', 'commitments of traders', 'cot', 'speculative positioning'],
  exchange: ['cme group', 'ice futures', 'exchange notice', 'trading hours', 'expiration calendar'],
  geopolitics: ['geopolitical', 'sanctions', 'conflict', 'war', 'trade restrictions'],
  supply: ['supply', 'production', 'inventory', 'inventories', 'outage', 'storage'],
  earnings: ['earnings', 'quarterly results', 'revenue', 'guidance', 'profit warning']
};

export const NEWS_SOURCE_REGISTRY = [
  {
    source_id: 'gdelt-doc', publisher: 'GDELT Project DOC API',
    canonical_url: 'https://api.gdeltproject.org/api/v2/doc/doc',
    category: ['macro', 'policy', 'rates', 'energy', 'metals', 'currencies', 'treasuries', 'positioning', 'exchange', 'geopolitics', 'supply', 'earnings'],
    instrument_tags: [...FUTURES_INSTRUMENTS], source_class: 'discovery-index', country: 'global',
    content_type: 'REST JSON API', access_method: 'public API; bounded scheduled query',
    terms_licence_url: 'https://gdeltproject.org/about.html', terms_status: 'GDELT citation required; underlying publisher rights remain separate',
    attribution_requirement: 'Cite and link the GDELT Project; retain each original publisher link; no full story text is stored or displayed.',
    polling_interval_seconds: 1800, enabled: true, last_checked: null,
    parser_version: 'gdelt-normalizer-v2',
    known_limitations: ['Discovery coverage is incomplete.', 'GDELT seen/index time is not publisher publication time.', 'Article facts remain unverified.', 'Underlying publisher content rights remain separate from GDELT dataset terms.']
  }
];

export function classifyNewsTopics(text) {
  const value = String(text || '').toLowerCase();
  return Object.entries(TOPIC_RULES)
    .filter(([, terms]) => terms.some(term => value.includes(term)))
    .map(([topic]) => topic);
}

export function keywordRelevanceScore(text, instrumentTags, topicTags) {
  const value = String(text || '').toLowerCase();
  const topicTerms = Object.values(TOPIC_RULES).flat();
  const matchedTerms = new Set(topicTerms.filter(term => value.includes(term)));
  // A transparent tag-density heuristic (matched configured phrases / 5), not a probability or direction score.
  const score = Math.min(1, matchedTerms.size / 5 + Math.min(3, instrumentTags.length) * 0.1);
  return { score: Number(score.toFixed(2)), method: 'configured-keyword-density-v1', matched_topic_tags: topicTags };
}

export function validateNewsQuery(searchParams) {
  const allowed = new Set(['instrument', 'topic', 'publisher', 'since', 'until', 'limit', 'refresh', 'sort']);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) return { ok: false, code: 'unsupported_parameter', message: `Unsupported query parameter: ${key}` };
    if (searchParams.getAll(key).length > 1) return { ok: false, code: 'duplicate_parameter', message: `Query parameter may be supplied only once: ${key}` };
  }
  const instrumentRaw = searchParams.get('instrument');
  const instrument = instrumentRaw?.trim().toLowerCase() || null;
  if (instrument && !FUTURES_INSTRUMENTS.has(instrument)) return { ok: false, code: 'unsupported_instrument', message: 'Instrument must be one of the supported listed futures families.' };
  const topic = (searchParams.get('topic') || 'all').trim().toLowerCase();
  if (!NEWS_TOPICS.has(topic)) return { ok: false, code: 'unsupported_topic', message: 'Topic is not in the supported futures news filter list.' };
  const publisher = searchParams.get('publisher')?.trim().toLowerCase() || null;
  const hostLabels = publisher?.split('.') || [];
  if (publisher && (publisher.length > 253 || hostLabels.length < 2 || hostLabels.some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)))) return { ok: false, code: 'invalid_publisher', message: 'Publisher must be a valid hostname.' };
  const parseBound = name => {
    const raw = searchParams.get(name);
    if (raw === null) return { ok: true, value: null };
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) return { ok: false };
    const timestamp = Date.parse(raw);
    return { ok: Number.isFinite(timestamp), value: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null };
  };
  const since = parseBound('since'), until = parseBound('until');
  if (!since.ok || !until.ok) return { ok: false, code: 'invalid_time_bound', message: 'since and until must be valid ISO timestamps with a timezone.' };
  if (since.value && until.value && Date.parse(since.value) > Date.parse(until.value)) return { ok: false, code: 'invalid_time_range', message: 'since must be earlier than or equal to until.' };
  const rawLimit = searchParams.get('limit');
  if (rawLimit !== null && !/^\d+$/.test(rawLimit)) return { ok: false, code: 'invalid_limit', message: 'Limit must be a whole number between 1 and 100.' };
  const limit = rawLimit === null ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { ok: false, code: 'invalid_limit', message: 'Limit must be a whole number between 1 and 100.' };
  const sort = (searchParams.get('sort') || 'provider_seen_desc').trim().toLowerCase();
  if (sort !== 'provider_seen_desc') return { ok: false, code: 'unsupported_sort', message: 'Only provider_seen_desc is available because publisher publication times are not supplied consistently.' };
  const refresh = searchParams.get('refresh') || '0';
  if (!['0', '1'].includes(refresh)) return { ok: false, code: 'invalid_refresh', message: 'Refresh must be 0 or 1.' };
  return { ok: true, query: { instrument, topic, publisher, since: since.value, until: until.value, limit, sort, refresh: refresh === '1' } };
}

export function parseProviderSeenTime(value) {
  const raw = String(value || '');
  const gdelt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(raw);
  if (gdelt) return Date.parse(`${gdelt[1]}-${gdelt[2]}-${gdelt[3]}T${gdelt[4]}:${gdelt[5]}:${gdelt[6]}Z`);
  return Date.parse(raw);
}

export function filterNewsArticles(articles, query) {
  return (Array.isArray(articles) ? articles : [])
    .filter(article => !query.instrument || (article.instrument_tags || article.markets || []).includes(query.instrument))
    .filter(article => query.topic === 'all' || (article.topic_tags || []).includes(query.topic))
    .filter(article => !query.publisher || String(article.publisher || article.domain || '').toLowerCase() === query.publisher)
    .filter(article => {
      const raw = article.provider_seen_at || article.seendate;
      if (!query.since && !query.until) return true;
      const seen = parseProviderSeenTime(raw);
      return Number.isFinite(seen) && (!query.since || seen >= Date.parse(query.since)) && (!query.until || seen <= Date.parse(query.until));
    })
    .sort((a, b) => parseProviderSeenTime(b.provider_seen_at || b.seendate) - parseProviderSeenTime(a.provider_seen_at || a.seendate))
    .slice(0, query.limit);
}

export function newsResponseEnvelope(snapshot, articles, nowMs = Date.now()) {
  const retrievedAt = snapshot?.lastCheckedAt || snapshot?.retrieved_at || null;
  const retrievedMs = retrievedAt ? Date.parse(retrievedAt) : NaN;
  return {
    schema_version: 2,
    data_type: 'news_discovery',
    frequency: 'best-effort 30-minute collection; not a publisher release cadence',
    delay_class: 'discovery-index-delay; publisher publication time may be unavailable',
    source_provider: 'GDELT DOC API',
    source_url: NEWS_SOURCE_REGISTRY[0].canonical_url,
    data_as_of: null,
    retrieved_at: retrievedAt,
    cache_age_seconds: Number.isFinite(retrievedMs) ? Math.max(0, Math.floor((nowMs - retrievedMs) / 1000)) : null,
    status: snapshot?.status || 'not-yet-fetched',
    licence_display_class: 'GDELT attribution required; original publisher content rights remain separate',
    limitations: snapshot?.notes || ['Publisher time, source reuse rights, article facts and full-news coverage are not verified.'],
    lastError: snapshot?.lastError || null,
    lastCheckedAt: retrievedAt,
    generatedAt: snapshot?.generatedAt || null,
    provider: 'GDELT DOC API',
    queryCount: snapshot?.queryCount || 0,
    successfulQueries: snapshot?.successfulQueries || 0,
    refresh: snapshot?.refresh || { status: 'not-requested' },
    articleCount: articles.length,
    articles
  };
}

export function marketDataStatus(now = new Date()) {
  return {
    schema_version: 1,
    data_type: 'exchange_market_data_status',
    frequency: 'not connected',
    delay_class: 'not available',
    source_provider: null,
    source_url: 'https://www.cmegroup.com/market-data.html',
    data_as_of: null,
    retrieved_at: now.toISOString(),
    cache_age_seconds: null,
    status: 'not-configured',
    licence_display_class: 'not-configured; no public market-data entitlement recorded',
    limitations: ['No licensed CME/ICE price, quote, order-book, or aggregate-bar provider is configured for this Worker.', 'No market-data bars route is enabled.', 'A chart widget or public exchange page does not establish redistribution permission.']
  };
}
