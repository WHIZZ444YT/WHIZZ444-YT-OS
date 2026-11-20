#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]; checks=[]
def ok(name, condition, detail=''):
    checks.append((name, bool(condition), detail))
    if not condition: errors.append(name + (': '+detail if detail else ''))

def readj(p): return json.loads((ROOT/p).read_text(encoding='utf-8'))

try:
    resources=readj(Path('resources.json'))
    source_hay=' '.join(' '.join(str(x.get(k,'')) for k in ('category','name','description','url')).lower() for x in resources.get('resources',[]))
    ok('Active resource directory is futures-only',resources.get('scope')=='futures-only' and len(resources.get('resources',[]))>=40 and not any(x in source_hay for x in ['polymarket','kalshi','stocktwits','sec.gov','sec edgar']))
    archived_resources=readj(Path('legacy/global-research/resources.json'))
    archived_markets=readj(Path('legacy/global-research/data/market-universe.json'))
    ok('Full Global Research source baselines remain archived',len(archived_resources.get('resources',[]))==585 and len(archived_markets.get('markets',[]))>=70)
    markets=readj(Path('ict-futures/data/market-universe.json')); ok('ICT Futures retains 15 contract families',len(markets.get('markets',[]))==15,f"found {len(markets.get('markets',[]))}")
    academy=readj(Path('ict-futures/data/ict-academy.json')); ok('Part 2 ICT Academy preserves 76 IDs, expands to 82 lessons and 10 tracks, and keeps nine tutorials',len(academy.get('concepts',[]))==82 and len(academy.get('tracks',[]))==10 and len(academy.get('learningProgram',{}).get('tutorials',[]))==9 and len(academy.get('curriculum',{}).get('preservedConceptIds',[]))==76 and set(academy.get('curriculum',{}).get('preservedConceptIds',[])).issubset({c.get('id') for c in academy.get('concepts',[])}),f"lessons={len(academy.get('concepts',[]))}, tracks={len(academy.get('tracks',[]))}, tutorials={len(academy.get('learningProgram',{}).get('tutorials',[]))}")
except Exception as e: errors.append(f'dataset parsing: {e}')

for p in ['cloudflare/src/index.js','cloudflare/src/futures-observations.mjs','cloudflare/src/economic-calendar.mjs','cloudflare/src/economic-calendar-extended.mjs','cloudflare/src/economic-providers.js','cloudflare/src/cot-contracts.mjs','assets/academy-learning.js','assets/academy-catalog.js','assets/site-shell.js','assets/overview-dashboard.js','assets/runtime-config.js','assets/research-directory.js','assets/academy-search.js','assets/academy-learning.js','assets/academy-catalog.js','assets/news-page.js','assets/risk-calculator.js','assets/futures-risk-engine.mjs','assets/account.js','assets/macro-page.js','assets/economic-data.js','assets/cot-page.js','assets/futures-intelligence.js','assets/volume-open-interest.js','assets/data-health.js','assets/sessions-page.js','assets/strategy-lab.js','assets/strategy-backtest-engine.mjs']:
    r=subprocess.run(['node','--check',str(ROOT/p)],capture_output=True,text=True)
    ok(f'JavaScript syntax: {p}',r.returncode==0,(r.stderr or r.stdout).strip()[:300])

worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
ok('Worker limits Builder models to allow-list','ALLOWED_BUILDER_MODELS' in worker and 'Model is not allow-listed' in worker)
ok('Worker has GDELT scheduled collection','async scheduled' in worker and 'refreshNews(env)' in worker)
ok('Worker contains health/news/provider/calendar endpoints','/api/v1/health' in worker and '/api/v1/news' in worker and '/api/v1/providers' in worker and all(x in worker for x in ['/api/v1/events','/api/v1/events/eia','/api/v1/events/cftc','/api/v1/events/fomc','/api/v1/events/bea']))
ok('Worker contains BLS and CFTC endpoints','/api/v1/macro' in worker and '/api/v1/cot' in worker and 'api.bls.gov/publicAPI/v1' in worker and 'publicreporting.cftc.gov/resource/' in worker)
ok('Worker contains NY Fed public reference rates','/api/v1/macro/funding' in worker and 'markets.newyorkfed.org/api/rates/all/latest.json' in worker)
ok('Worker prediction endpoints are retained as dormant compatibility code','/api/v1/prediction/polymarket' in worker and '/api/v1/prediction/kalshi' in worker and 'gamma-api.polymarket.com/events' in worker and 'external-api.kalshi.com/trade-api/v2/markets' in worker)
ok('Worker has production-origin allow-list without wildcard','finance-intelligence-os-whizz444yt-7353.vercel.app' in worker and 'includes("*")' in worker and 'return json' in worker)

worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
dashboard=(ROOT/'assets/futures-intelligence.js').read_text(encoding="utf-8")
risk=(ROOT/'assets/risk-calculator.js').read_text(encoding="utf-8")
risk_engine=(ROOT/'assets/futures-risk-engine.mjs').read_text(encoding="utf-8")
news_page=(ROOT/'assets/news-page.js').read_text(encoding="utf-8")
ok('Manual GDELT refresh is supported with a lock and cooldown','url.searchParams.get("refresh")==="1"' in worker and 'NEWS_REFRESH_LOCK_KEY' in worker and 'ctx.waitUntil(refreshNews(env)' in worker)
cot_contracts=(ROOT/'cloudflare/src/cot-contracts.mjs').read_text(encoding="utf-8")
cot_page=(ROOT/'assets/cot-page.js').read_text(encoding="utf-8")
cot_builder=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
ok('Part 6 COT supports Legacy, TFF and Disaggregated with separate futures-only and combined dataset IDs',all(x in cot_contracts for x in ['legacy','disaggregated','tff','6dca-aqww','jun7-fc8e','72hh-3qpy','kh3c-gbw2','gpe5-46if','yw9f-hn96']))
ok('Part 6 COT normalization preserves source category mappings and missing values','sourceFieldMapping' in cot_contracts and 'sourceNativeFields' in cot_contracts and 'not treated as zero' in cot_contracts and 'netPercentOfOpenInterest' in cot_contracts)
ok('Part 6 COT separates position, publication and retrieval timestamps','positionDate: reportDate' in cot_contracts and 'publishedAt: null' in cot_contracts and 'retrievedAt' in cot_contracts and 'publicationTimestampStatus' in cot_contracts)
ok('Part 6 COT search supports bounded names or exact source market codes','validateCotQuery' in cot_contracts and 'contract_market_code' in worker and 'upper(contract_market_name)' in worker and 'cftc_contract_market_code =' in worker)
ok('Part 6 COT page adds variant selection, category history chart and CSV export',all(x in cot_page for x in ['cotVariant','cotChart','netPercentOfOpenInterest','URL.createObjectURL']) and 'Export filtered CSV' in cot_builder and 'cot-chart' in cot_builder)
cot_migration=(ROOT/'supabase/migrations/20261119125044_add_cot_report_observations.sql').read_text(encoding="utf-8")
ok('Part 6 COT persistence migration is idempotent, versioned, indexed and read-only to browser roles',all(x in cot_migration for x in ['create table if not exists','report_variant','published_at timestamptz','source_fields jsonb','unique (report_family, report_variant, contract_market_code, report_date, trader_category)','create index if not exists','enable row level security','revoke insert, update, delete']))
futures_observation_migration=(ROOT/'supabase/migrations/20261120110000_add_futures_market_observations.sql').read_text(encoding="utf-8")
futures_observation_module=(ROOT/'cloudflare/src/futures-observations.mjs').read_text(encoding="utf-8")
ok('Part 6 listed-market schema separates scoped entitlements from source observations and enforces read policy',all(x in futures_observation_migration for x in ['create table if not exists public.futures_market_data_entitlements','create table if not exists public.futures_market_observations','unique (provider_id, venue, instrument_root, delay_class)','unique (provider_id, exchange_instrument_id','public_display_status','futures_market_display_approved','enable row level security','revoke all on public.futures_market_data_entitlements','public-display-approved']))
ok('Part 6 futures-observation ingestion normalizes explicit timestamps without accepting entitlement fields',all(x in futures_observation_module for x in ['normalizeFuturesObservationBatch','timestamp(input.observedAt','timestamp(input.dataAsOf','quality_status: "provider-reported"']) and 'public_display_approved_by' not in futures_observation_module)
ok('Part 6 Worker ingest is bearer-protected and public reads require an approved provider scope',all(x in worker for x in ['/api/v1/ingest/futures-market-data','request.headers.get("Authorization")!=="Bearer "+env.INGEST_TOKEN','public_display_status:"eq.public-display-approved"','quality_status:"neq.rejected"','provider-entitlement-registry']))
ok('Dashboard preserves missing numeric values','v===null||v===undefined' in dashboard and 'Object.values(state.providers)' in dashboard)
ok('Risk calculator supports standard/micro profiles and explicitly conditional tick references','market.microSpec' in risk and 'contractMode' in risk and 'CONDITIONAL ESTIMATE · SPEC UNVERIFIED' in risk)
ok('P8 risk engine uses fixed-point arithmetic and remaining-loss caps',all(x in risk_engine for x in ['BigInt','allInPerContract','dailyRemaining','drawdownRemaining']))
prop_rules=readj(Path('data/prop-firm-programs.json'))
ok('P8 program registry is versioned and Blue Shift 25K remains unverified',prop_rules.get('schemaVersion')==1 and prop_rules.get('records')==[] and any(x.get('label')=='Blue Shift 25K' and x.get('status')=='UNVERIFIED' and x.get('officialRulebookUrl') is None for x in prop_rules.get('unverifiedMentions',[])))
ok('News page requests controlled refresh with its active filters',"if(force)params.set('refresh','1')" in news_page and 'Refresh snapshot' in news_page and all(x in news_page for x in ['newsInstrument','newsTopic','newsPublisher','newsTime']))
ok('Prediction volume metrics remain nullable','volume24hr:asFiniteNumber(event.volume24hr)' in worker and 'volume24h:asFiniteNumber(m.volume_24h_fp??m.volume_24h)' in worker)
ok('Static assets no longer receive a one-year immutable cache','max-age=300, stale-while-revalidate=86400' in (ROOT/'vercel.json').read_text(encoding="utf-8") and 'immutable' not in (ROOT/'vercel.json').read_text(encoding="utf-8"))

nav_source=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
p1_labels=['Overview','Futures Markets','ICT Academy','Entry Models','Sessions & Calendar','Futures News','Volume & Open Interest','COT & Positioning','Contract Specs & Expiry','Strategy Lab','Risk & Prop Firms','Journal & Watchlists','Data Health & Sources']
ok('Part 1 has exactly 13 futures-only areas',all("('"+label+"'," in nav_source for label in p1_labels) and "('Prediction Markets'," not in nav_source)
ok('Part 1 groups navigation in a shared accessible app shell','NAV_GROUPS' in nav_source and 'aria-label="13 futures product areas"' in nav_source and 'class="os-sidebar"' in nav_source)
ok('Part 1 sessions route is a first-class calendar page while risk/tools keep compatibility redirects',all(x in nav_source for x in ["DIST/'sessions/index.html'","DIST/'risk/index.html'","DIST/'tools/index.html',redirect_page","sessions-page.css","sessions-page.js"]) and "redirect_page('Sessions & Calendar" not in nav_source)
ok('Part 1 distinguishes source-checked core contract facts from unverified lifecycle data','PARTIAL · SOURCED CORE' in nav_source and 'SOURCED · CHECKED' in nav_source and 'NOT VERIFIED IN THIS RECORD' in nav_source and 'NO LICENSED SNAPSHOT CONFIGURED · CHECK OFFICIAL SOURCE' in nav_source and 'NO APPROVED POLICY CONFIGURED' in nav_source)
ok('Weekly open-interest endpoint is distinct from exchange volume','/api/v1/volume-open-interest' in worker and 'cadence:"weekly"' in worker and 'metric:"open_interest"' in worker and 'status:"not-connected"' in worker)
ok('P1 health checker tests provider endpoints independently','Promise.allSettled' in (ROOT/'assets/data-health.js').read_text(encoding="utf-8") and '/api/v1/providers' in (ROOT/'assets/data-health.js').read_text(encoding="utf-8"))
active_frontends=[(ROOT/'assets/futures-intelligence.js').read_text(encoding="utf-8"),(ROOT/'assets/data-health.js').read_text(encoding="utf-8"),(ROOT/'ict-futures/index.html').read_text(encoding="utf-8")]
ok('No active frontend calls retired event-market APIs',all('/api/v1/prediction/polymarket' not in x and '/api/v1/prediction/kalshi' not in x and 'gamma-api.polymarket.com' not in x and 'api.elections.kalshi.com' not in x for x in active_frontends) and 'id="predictions"' not in active_frontends[2])
ok('Prediction Worker APIs remain server-side only for compatibility','/api/v1/prediction/polymarket' in worker and '/api/v1/prediction/kalshi' in worker)
ok('Entry Models page does not claim an audited ranking',"no audited win-rate" in nav_source.lower() and 'Strategy Lab' in nav_source)

contract_registry=readj(Path('ict-futures/data/market-universe.json'))
contract_rows=contract_registry.get('markets',[])
contract_version='partial-official-spec-review-'+str(contract_registry.get('generatedAt','undated'))
ok('Part 3 has 15 partial contract records with dated official core-spec evidence',len(contract_rows)==15 and all(x.get('specStatus')=='partial' and x.get('specVersionId')==contract_version and x.get('specVerifiedAt') is None and x.get('specEffectiveFrom') is None and x.get('specEffectiveTo') is None and x.get('specEvidence',{}).get('sourceStatus')=='SOURCED' and x.get('specEvidence',{}).get('checkedAt')==contract_registry.get('generatedAt') and isinstance(x.get('tickSize'),str) and isinstance(x.get('tickValue'),str) for x in contract_rows) and sum(bool(x.get('microSpec')) for x in contract_rows)==13 and all(x['microSpec'].get('specEvidence',{}).get('sourceStatus')=='SOURCED' for x in contract_rows if x.get('microSpec')))
terminal_template=(ROOT/'ict-futures/index.html').read_text(encoding='utf-8')
terminal_built=(ROOT/'dist/ict-futures/index.html').read_text(encoding='utf-8')
terminal_match=re.search(r'const DATA_BUNDLE = (.*?);\s*const DATA=DATA_BUNDLE;',terminal_built,re.S)
try: terminal_data=json.loads(terminal_match.group(1)) if terminal_match else {}
except Exception: terminal_data={}
verified_video_ids={'ict-2022-model':'ict-2022-ep14','mss':'ict-2022-ep03-mss','fvg':'ict-2022-ep06-fvg','order-block':'ict-2022-ep22-order-block','silver-bullet':'ict-2023-silver-bullet-model','liquidity':'ict-2025-advanced-liquidity','liquidity-run':'ict-liquidity-runs-2022','ipda':'ict-ipda-data-ranges-2022','market-maker-buy-model':'ict-2024-mmbm-example','market-maker-sell-model':'ttrades-cpi-gold-market-maker-sell-model-2024','ote':'ttrades-ote-2023','unicorn':'ttrades-unicorn-2023','ifvg':'ttrades-ifvg-2023','amd-po3':'ttrades-po3-amd-2023','cisd':'ttrades-cisd-orderblock-2023','market-structure':'ttrades-structure-mss-fvg-displacement-2022','displacement':'ttrades-structure-mss-fvg-displacement-2022','bsl':'ttrades-liquidity-levels-2023','ssl':'ttrades-liquidity-levels-2023','eqh':'ttrades-liquidity-levels-2023','eql':'ttrades-liquidity-levels-2023','pdh-pdl':'ttrades-liquidity-levels-2023','pwh-pwl':'ttrades-liquidity-levels-2023','session-high-low':'ttrades-liquidity-levels-2023','swing-high-low':'paul-leroy-fvg-essentials-swing-pivots-2022','judas-swing':'ict-judas-swing-2017','bos':'ttrades-structure-shift-liquidity-grab-2022','breaker-block':'ttrades-breaker-blocks-simplified-2024','mitigation-block':'ttrades-mitigation-blocks-simplified-2024','dealing-range':'ttrades-choosing-dealing-ranges-2022','premium-discount':'ttrades-equilibrium-discount-premium-2025','equilibrium':'ttrades-equilibrium-discount-premium-2025','irl-erl':'ttrades-internal-external-liquidity-daily-bias-2024','opposing-liquidity':'ttrades-draw-on-liquidity-2023','ndog':'ict-ndog-new-day-opening-gap-2023','nwog':'ict-nwog-new-week-opening-gap-2023','bpr':'ttrades-balanced-price-range-2022','liquidity-void':'ict-month-04-liquidity-voids-2022','mean-threshold':'ttrades-orderblocks-mean-threshold-2023','killzones':'ttrades-killzones-indicator-settings-2023','time-anchors':'ttrades-important-time-levels-2024','smt':'ttrades-smt-divergence-ict-concepts-2023','weekly-profiles':'ttrades-weekly-profile-intraweek-reversal-2026','mmxm':'ttrades-mmxm-advanced-lesson-2024','pd-arrays':'ict-pd-array-matrix-revealed-2025','asian-range':'ict-friday-asian-range-2020','volume-imbalance':'ict-daily-volume-imbalance-draw-2024','fpfvg':'ict-opening-range-first-presented-fvg-2025','rejection-block':'ict-rejection-block-entry-techniques','midnight-open':'lumitraders-ny-midnight-open-explained-2026','weekly-open':'lumitraders-premarket-plan-weekly-open-2024'}
ok('Part 3 ICT terminal uses the canonical source bundle instead of embedded duplicate data',terminal_template.count('__FUTURES_DATA_BUNDLE__')==1 and 'const DATA_BUNDLE = {' not in terminal_template and len(terminal_data.get('markets',[]))==15 and terminal_data.get('academy',{}).get('conceptCount')==82 and len(terminal_data.get('academy',{}).get('tracks',[]))==10 and {v.get('id') for v in terminal_data.get('academy',{}).get('featuredVideos',[])}==set(verified_video_ids.values()))
ok('Part 3 risk output identifies the selected reference version, source and effective date','specVersionId' in risk and 'official exchange source' in risk and 'specEffectiveFrom' in risk and bool(terminal_data.get('markets')) and terminal_data['markets'][0].get('specEffectiveFrom') is None)

news_contracts=(ROOT/'cloudflare/src/news-contracts.mjs').read_text(encoding='utf-8')
ok('Part 5 news route filters futures families, event topics, publishers and bounded time',all(x in news_contracts for x in ['instrument','publisher','since','until','provider_seen_desc','unsupported_instrument']))
ok('Part 5 news responses expose provenance, cache age and display-rights class',all(x in news_contracts for x in ['data_type','frequency','delay_class','source_provider','source_url','data_as_of','retrieved_at','cache_age_seconds','licence_display_class','limitations']))
ok('Part 5 licensed market data is explicitly not configured and has no bars route','/api/v1/market-data/status' in (ROOT/'cloudflare/src/index.js').read_text(encoding='utf-8') and (ROOT/'dist/news/index.html').exists() and 'licensed-vendor-or-exchange-entitlement-required' in (ROOT/'cloudflare/src/index.js').read_text(encoding='utf-8') and 'not-configured' in news_contracts and (ROOT/'dist/assets/news-page.js').exists())
ok('Part 5 generated news page displays contract, event, publisher and time filters plus GDELT attribution',all(x in (ROOT/'dist/news/index.html').read_text(encoding='utf-8') for x in ['newsInstrument','newsTopic','newsPublisher','newsTime','GDELT Project terms and citation']))

playbook=readj(Path('ict-futures/data/ict-playbook.json'))
required_session_fields={'window_id','display_name','market_scope','instrument_families','timezone','start_local','end_local','source_id','evidence_label','active_from','active_to','notes'}
ok('Part 4 session definitions carry IANA timezone and source/evidence metadata',len(playbook.get('sessions',[]))==13 and all(required_session_fields.issubset(x) and x.get('timezone')=='America/New_York' for x in playbook.get('sessions',[])))
cme_reference=next((x for x in playbook.get('sessions',[]) if x.get('id')=='cmebreak'),{})
ok('Part 4 CME maintenance reference is separated from ICT windows and marked unverified',cme_reference.get('scheduleClass')=='exchange-break-reference' and cme_reference.get('status')=='unverified' and 'product-specific' in cme_reference.get('verificationNote',''))
calendar_snapshot=playbook.get('calendarSnapshot',{})
ok('Part 4 imported publisher events carry explicit stale/unverified provenance',calendar_snapshot.get('status')=='unverified' and calendar_snapshot.get('asOfDate')=='2026-11-08' and calendar_snapshot.get('retrievedAtUtc') is None and len(playbook.get('events',[]))>0 and all(e.get('publisher') and e.get('status')=='unverified' and e.get('retrievedAtUtc') is None and e.get('actualAtUtc') is None and e.get('revisionAtUtc') is None for e in playbook.get('events',[])))
time_engine=(ROOT/'assets/session-time.js').read_text(encoding='utf-8')
ok('Part 4 terminal ships the tested DST-aware conversion engine',"<script src=\"/assets/session-time.js\"></script>" in terminal_template and (ROOT/'dist/assets/session-time.js').exists() and all(x in time_engine for x in ['resolveWallTime','nonexistent','ambiguous']))
ok('Part 4 unverified references are excluded from calendar/countdown/export',all(x in terminal_built for x in ['calendarScheduleEvents()','Imported publisher references · not a schedule','No verified publisher schedule']) and 'rows=calendarScheduleEvents()' in terminal_built)
calendar_api=(ROOT/'cloudflare/src/economic-calendar.mjs').read_text(encoding='utf-8')
extended_calendar_api=(ROOT/'cloudflare/src/economic-calendar-extended.mjs').read_text(encoding='utf-8')
session_page=(ROOT/'dist/sessions/index.html').read_text(encoding='utf-8')
session_ui=(ROOT/'assets/sessions-page.js').read_text(encoding='utf-8')
ok('Part 4 official BLS, EIA, CFTC, BEA, Federal Reserve and four additional central-bank schedule adapters are source-attributed and bounded',all(x in calendar_api for x in ['BLS_CALENDAR_URL','EIA_WPSR_SCHEDULE_URL','BLS_CALENDAR_MAX_BYTES','America/New_York','parseBlsIcs','parseEiaWpsrSchedule','resolveCalendarWallTime','actual_release_at_utc: null']) and all(x in extended_calendar_api for x in ['BEA_RELEASE_DATES_URL','parseBeaReleaseDates','fetchBeaReleaseCalendar','CFTC_COT_SCHEDULE_URL','FOMC_CALENDAR_URL','ECB_COUNCIL_CALENDAR_URL','BOE_MPC_CALENDAR_URL','BOC_RATE_CALENDAR_URL','RBA_BOARD_CALENDAR_URL','parseCftcCotSchedule','parseFomcCalendar','parseEcbCouncilCalendar','parseBoeMpcCalendar','parseBocRateCalendar','parseRbaBoardCalendar','MAX_SCHEDULE_BYTES']))
ok('Part 4 dedicated sessions page separates publisher schedules, ICT conventions and unverified exchange hours',all(x in session_ui for x in ['/api/v1/events','/api/v1/events/eia','/api/v1/events/cftc','/api/v1/events/fomc','/api/v1/events/ecb','/api/v1/events/boe','/api/v1/events/boc','/api/v1/events/rba','/api/v1/events/bea']) and all(x in session_page for x in ['sessionsWindowDate','PRACTITIONER CONVENTION','Official product hours are not configured','CME holiday calendar','BLS · EIA · CFTC · FED · ECB · BOE · BOC · RBA · BEA','Verify CFTC COT schedule','Verify FOMC meeting dates','Verify ECB council dates','Verify Bank of England MPC dates','Verify Bank of Canada dates','Verify RBA board dates','Verify BEA release schedule']) and 'http-equiv="refresh"' not in session_page)

economic=(ROOT/'cloudflare/src/economic-providers.js').read_text(encoding="utf-8")
ok('P2 supports BEA, EIA, FRED, Treasury and ECB adapters',all(x in economic for x in ['case "bea"','case "eia"','case "fred"','case "us_treasury"','case "ecb"']))
ok('Provider API keys are removed before source URLs are stored','searchParams.delete("api_key")' in economic and 'searchParams.delete("UserID")' in economic)
ok('Worker protects manual ingestion with a bearer token','url.pathname==="/api/v1/ingest"' in worker and 'Authorization' in worker and 'env.INGEST_TOKEN' in worker)
ok('Economic history is persisted with idempotent upserts','economic_observations' in worker and 'on_conflict=provider,dataset_id,series_id,frequency,observation_date' in worker and 'ingestion_runs' in worker)
ok('Worker supports modern Supabase secret API keys and legacy JWT fallback','function supabaseAdminKey(env)' in worker and 'env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY' in worker and 'key.startsWith("sb_secret_")' in worker and 'function supabaseApiHeaders(env)' in worker)
ok('Economic providers use cadence-aware scheduled ingestion','scheduledEconomicIngestion(env)' in worker and 'cfg.ttlSeconds*1000' in worker)
ok('Supabase migration keeps ingestion runs private', (ROOT/'supabase/migrations/20261108134935_add_economic_observations_and_ingestion_runs.sql').exists() and 'revoke all on public.ingestion_runs from anon, authenticated' in (ROOT/'supabase/migrations/20261108134935_add_economic_observations_and_ingestion_runs.sql').read_text(encoding="utf-8"))
ok('P2 economic dashboard loads all five providers',all(('id:"'+x+'"') in (ROOT/'assets/economic-data.js').read_text(encoding="utf-8") for x in ['bea','eia','fred','us_treasury','ecb']) and 'request("/api/v1/economic/"+p.id)' in (ROOT/'assets/economic-data.js').read_text(encoding="utf-8"))

academy_data=readj(Path('ict-futures/data/ict-academy.json'))
academy_concepts=academy_data.get('concepts',[])
learning_program=academy_data.get('learningProgram',{})
ok('Part 2 enriches all 82 lessons with objectives, walkthrough, hypothetical example, exercise and quiz',
   len(academy_concepts)==82 and all(len(c.get('learning',{}).get('learningObjectives',[]))>=3 and len(c.get('learning',{}).get('guidedWalkthrough',[]))>=3 and c.get('learning',{}).get('workedExample',{}).get('body') and c.get('learning',{}).get('practicalExercise',{}).get('task') and len(c.get('learning',{}).get('knowledgeCheck',{}).get('options',[]))==3 and len(c.get('curriculum',{}).get('knowledgeChecks',[]))>=3 for c in academy_concepts))
tracks=academy_data.get('tracks',[])
preserved_ids=academy_data.get('curriculum',{}).get('preservedConceptIds',[])
resource_ids={r.get('id') for r in academy_data.get('curriculum',{}).get('resourceRegistry',[])}
track_lesson_ids=[lesson_id for track in tracks for lesson_id in track.get('sequence',[])]
ok('Part 2 maps every lesson once into the nine concept tracks and keeps a tutorial track',len(tracks)==10 and len(track_lesson_ids)==82 and len(set(track_lesson_ids))==82 and set(track_lesson_ids)=={c.get('id') for c in academy_concepts} and bool(tracks[-1].get('tutorialIds')))
ok('Part 2 prerequisite graph and source registry references resolve',all(p in {c.get('id') for c in academy_concepts} for c in academy_concepts for p in c.get('curriculum',{}).get('prerequisiteIds',[])) and all(s in resource_ids for c in academy_concepts for s in c.get('curriculum',{}).get('sourceRefs',[])))
ok('Part 2 playbook traceability covers all 39 source pages',len(academy_data.get('curriculum',{}).get('sourceDocument',{}).get('reviewedPages',[]))==39 and len(academy_data.get('curriculum',{}).get('playbookTraceability',[]))>=8)
ok('Part 2 source evidence never promotes a model to TESTED without a test artifact',all(c.get('curriculum',{}).get('performanceEvidenceLabel')!='TESTED' for c in academy_concepts) and 'reproducible linked test artifact' in academy_data.get('curriculum',{}).get('performancePolicy',''))
video_coverage=readj(Path('dist/ict-futures/academy/video-coverage.json')) if (ROOT/'dist/ict-futures/academy/video-coverage.json').exists() else {}
expected_covered=set(verified_video_ids)
expected_missing=[c.get('id') for c in academy_concepts if c.get('id') not in expected_covered]
ok('Part 2 exact-video coverage is computed from the strict registry schema and missing lessons remain explicit',video_coverage.get('status')=='PARTIAL' and video_coverage.get('eligibleCount')==len(academy_concepts) and video_coverage.get('coveredCount')==len(expected_covered) and set(video_coverage.get('coveredIds',[]))==expected_covered and video_coverage.get('missingCount')==len(expected_missing) and video_coverage.get('missingIds')==expected_missing)
ok('Part 2 entry-model video coverage is reported separately',video_coverage.get('entryModelCoverage',{}).get('eligibleCount')==sum(c.get('category')=='Entry Models' for c in academy_concepts) and video_coverage.get('entryModelCoverage',{}).get('coveredIds')==['unicorn','market-maker-buy-model','market-maker-sell-model','ict-2022-model'] and len(video_coverage.get('entryModelCoverage',{}).get('missingIds',[]))==4)
ote_lesson=next((c for c in academy_concepts if c.get('id')=='ote'),{})
ote_video=(ote_lesson.get('curriculum',{}).get('videoResources') or [{}])[0]
ok('Part 2 OTE video is a one-to-one independent TTrades supplement, visibly distinct from official ICT',ote_video.get('sourceClass')=='independent_supplement' and ote_video.get('conceptIds')==['ote'] and 'does not discuss the New York Killzone' in ote_video.get('summary','') and 'Independent supplement' in (ROOT/'dist/ict-futures/academy/ote.html').read_text(encoding='utf-8'))
unicorn_lesson=next((c for c in academy_concepts if c.get('id')=='unicorn'),{})
unicorn_video=(unicorn_lesson.get('curriculum',{}).get('videoResources') or [{}])[0]
ok('Part 2 Unicorn video is a one-to-one independent TTrades model tutorial, visibly distinct from official ICT',unicorn_video.get('sourceClass')=='independent_supplement' and unicorn_video.get('conceptIds')==['unicorn'] and 'Breaker Block plus Fair Value Gap' in unicorn_video.get('summary','') and 'Independent supplement' in (ROOT/'dist/ict-futures/academy/unicorn.html').read_text(encoding='utf-8'))
ifvg_lesson=next((c for c in academy_concepts if c.get('id')=='ifvg'),{})
ifvg_video=(ifvg_lesson.get('curriculum',{}).get('videoResources') or [{}])[0]
ok('Part 2 IFVG concept video is independent and remains separate from the IFVG Reversal Entry Model',ifvg_video.get('sourceClass')=='independent_supplement' and ifvg_video.get('conceptIds')==['ifvg'] and 'not the separate IFVG Reversal Entry Model' in ifvg_video.get('summary','') and 'Independent supplement' in (ROOT/'dist/ict-futures/academy/ifvg.html').read_text(encoding='utf-8'))
for lesson_id,resource_id,needle in [('amd-po3','ttrades-po3-amd-2023','accumulation, manipulation and distribution'),('cisd','ttrades-cisd-orderblock-2023','not be treated as a Market Structure Shift lesson')]:
    lesson=next((c for c in academy_concepts if c.get('id')==lesson_id),{})
    video=(lesson.get('curriculum',{}).get('videoResources') or [{}])[0]
    ok('Part 2 '+lesson_id+' video is an exact, one-to-one independent supplement',video.get('resourceId')==resource_id and video.get('sourceClass')=='independent_supplement' and video.get('conceptIds')==[lesson_id] and needle in video.get('summary','') and 'Independent supplement' in (ROOT/'dist/ict-futures/academy'/f'{lesson_id}.html').read_text(encoding='utf-8'))
segmented_resource='ttrades-structure-mss-fvg-displacement-2022'
segmented_ids=['market-structure','mss','displacement','fvg']
segment_ranges={'market-structure':(21,75),'mss':(75,110),'displacement':(110,143),'fvg':(143,165)}
segmented_records={lesson_id:next((r for r in next(c for c in academy_concepts if c.get('id')==lesson_id).get('curriculum',{}).get('videoResources',[]) if r.get('resourceId')==segmented_resource),{}) for lesson_id in segmented_ids}
ok('Part 2 shared TTrades tutorial maps only its four exact timestamped concept segments',all(r.get('sourceClass')=='independent_supplement' and r.get('conceptIds')==segmented_ids and (r.get('segments',{}).get(lesson_id,{}).get('startSeconds'),r.get('segments',{}).get(lesson_id,{}).get('endSeconds'))==segment_ranges[lesson_id] and f"&t={segment_ranges[lesson_id][0]}s" in r.get('url','') and r.get('embedPermission')=='not_checked' for lesson_id,r in segmented_records.items()) and all('Independent supplement' in (ROOT/'dist/ict-futures/academy'/f'{lesson_id}.html').read_text(encoding='utf-8') for lesson_id in segmented_ids))
swing_lesson=next((c for c in academy_concepts if c.get('id')=='swing-high-low'),{})
swing_video=next((r for r in swing_lesson.get('curriculum',{}).get('videoResources',[]) if r.get('resourceId')=='paul-leroy-fvg-essentials-swing-pivots-2022'),{})
ok('Part 2 swing-high-low has an exact independent chapter segment with limited scope',swing_video.get('sourceClass')=='independent_supplement' and swing_video.get('conceptIds')==['swing-high-low'] and (swing_video.get('segments',{}).get('swing-high-low',{}).get('startSeconds'),swing_video.get('segments',{}).get('swing-high-low',{}).get('endSeconds'))==(189,259) and 'not an Official ICT upload' in swing_video.get('summary','') and swing_video.get('channelId')=='UCiTVR5zjDDXowLY2L81rAfQ' and 'Independent supplement' in (ROOT/'dist/ict-futures/academy/swing-high-low.html').read_text(encoding='utf-8'))
judas_lesson=next((c for c in academy_concepts if c.get('id')=='judas-swing'),{})
judas_video=next((r for r in judas_lesson.get('curriculum',{}).get('videoResources',[]) if r.get('resourceId')=='ict-judas-swing-2017'),{})
ok('Part 2 Judas Swing maps to the matching original ICT video only',judas_video.get('sourceClass')=='official_ict' and judas_video.get('conceptIds')==['judas-swing'] and judas_video.get('channelId')=='UCtjxa77NqamhVC8atV85Rog' and 'not a futures-specific strategy test' in judas_video.get('summary','') and 'VERIFIED LESSON VIDEO' in (ROOT/'dist/ict-futures/academy/judas-swing.html').read_text(encoding='utf-8'))
liquidity_resource='ttrades-liquidity-levels-2023'
liquidity_ids=['bsl','ssl','eqh','eql','pdh-pdl','pwh-pwl','session-high-low']
liquidity_ranges={'bsl':(73,97),'ssl':(73,97),'eqh':(274,311),'eql':(274,311),'pdh-pdl':(311,382),'pwh-pwl':(311,382),'session-high-low':(311,382)}
liquidity_records={lesson_id:next((r for r in next(c for c in academy_concepts if c.get('id')==lesson_id).get('curriculum',{}).get('videoResources',[]) if r.get('resourceId')==liquidity_resource),{}) for lesson_id in liquidity_ids}
ok('Part 2 liquidity-level tutorial maps only named chapter topics with timestamped direct links',all(r.get('sourceClass')=='independent_supplement' and r.get('conceptIds')==liquidity_ids and (r.get('segments',{}).get(lesson_id,{}).get('startSeconds'),r.get('segments',{}).get(lesson_id,{}).get('endSeconds'))==liquidity_ranges[lesson_id] and f"&t={liquidity_ranges[lesson_id][0]}s" in r.get('url','') and r.get('embedPermission')=='not_checked' for lesson_id,r in liquidity_records.items()) and all('Independent supplement' in (ROOT/'dist/ict-futures/academy'/f'{lesson_id}.html').read_text(encoding='utf-8') for lesson_id in liquidity_ids))
ok('Part 2 lesson pages distinguish verified mapping from VIDEO NEEDED',all(('VERIFIED LESSON VIDEO' in (ROOT/'dist/ict-futures/academy'/f"{c.get('id')}.html").read_text(encoding='utf-8')) == (c.get('id') in expected_covered) and ('VIDEO NEEDED' in (ROOT/'dist/ict-futures/academy'/f"{c.get('id')}.html").read_text(encoding='utf-8')) == (c.get('id') not in expected_covered) for c in academy_concepts if c.get('id')))
ok('Part 2 Academy dashboard links its learning styles and video coverage register','/assets/academy-learning.css' in (ROOT/'dist/academy/index.html').read_text(encoding='utf-8') and '/ict-futures/academy/video-coverage.json' in (ROOT/'dist/academy/index.html').read_text(encoding='utf-8'))
ok('Part 2 preserves nine guided tutorials with tasks, reviews and curriculum track links',
   len(learning_program.get('tutorials',[]))==9 and all(len(t.get('steps',[]))>=4 and t.get('deliverable') and len(t.get('review',[]))>=3 and t.get('trackId') in {x.get('id') for x in tracks} for t in learning_program.get('tutorials',[])))
verified_video_urls=[v.get('url') for v in academy_data.get('featuredVideos',[]) if v.get('verifiedOfficial')]
ok('P3 verified video references are drawn only from marked official records',
   all(ref.get('url') in verified_video_urls for c in academy_concepts for ref in c.get('learning',{}).get('references',{}).get('officialVideos',[])))
ok('Part 2 progress sync uses authenticated user, current content version and preserves legacy records',
   'migrateContentVersion' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'legacyCompletion' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'part-2-v2' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'mergeRemote(root,slug,checks,quizData)' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'checks.length' not in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8").split('async function mergeRemote')[1].split('function initRoot')[0])
ok('Part 2 progress sync uses authenticated user and existing lesson_progress table',
   'finance-os-supabase-session-v1' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and '/rest/v1/lesson_progress' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'on_conflict=user_id,lesson_slug' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'progress_data' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8") and 'lesson_version' in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8"))
ok('P3 progress client exposes no service-role credential',
   'service_role' not in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8").lower() and 'SUPABASE_SERVICE_ROLE_KEY' not in (ROOT/'assets/academy-learning.js').read_text(encoding="utf-8"))


ok('P2 exposes bounded read-only Supabase history API','url.pathname==="/api/v1/economic/history"' in worker and 'query.set("and"' in worker and 'Math.min(5000' in worker)
ok('P2 records provider skips and fetch failures when persistence is configured','recordIngestionRun(env,provider,"skipped"' in worker and 'recordIngestionRun(env,provider,"failed"' in worker)
ok('Ingestion ledger has explicit browser-deny migration','using (false)' in (ROOT/'supabase/migrations/20261108140821_deny_browser_access_to_ingestion_runs.sql').read_text(encoding="utf-8") and 'with check (false)' in (ROOT/'supabase/migrations/20261108140821_deny_browser_access_to_ingestion_runs.sql').read_text(encoding="utf-8"))





p7_engine=(ROOT/'assets/strategy-backtest-engine.mjs').read_text(encoding="utf-8")
p7_ui=(ROOT/'assets/strategy-lab.js').read_text(encoding="utf-8")
p4_migration=ROOT/'supabase/migrations/20261108151112_add_strategy_backtest_runs_and_trades.sql'
ok('P7 engine has deterministic next-bar signal execution and conservative exits',
   'ENGINE_VERSION = "p7.0.0"' in p7_engine and 'source-bar-close' in p7_engine and 'next-bar-open' in p7_engine and 'stop-first-same-bar' in p7_engine and 'stop-gap' in p7_engine)
ok('P7 manifest records exact expiry, provenance, gaps and reproducible input fingerprints',
   'exactExpiryDate' in p7_engine and 'dataSource' in p7_engine and 'observedGapCount' in p7_engine and 'runFingerprint' in p7_engine)
ok('P7 validates listed contract, tick grid and safe CSV columns',
   'multiple expiry dates' in p7_engine and 'do not align to the supplied tick size' in p7_engine and 'unsupported columns' in p7_engine)
ok('P7 includes sample-aware metrics and preserves chronological splits',
   all(x in p7_engine for x in ['winRate95PctInterval','averageWinLossRatio','maxConsecutiveLosses','tradesPer1000Bars','in-sample','validation','out-of-sample']))
rule_cards=(ROOT/'docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md').read_text(encoding="utf-8")
ok('P7 catalogue discloses that ten ICT candidates have no active detector',
   'No ICT detector is enabled' in rule_cards and all(x in rule_cards for x in ['liquidity-sweep-mss','silver-bullet','ict-2022-model','judas-mss','amd-po3','unicorn','fvg-continuation','ifvg','fvg-ote','smt-assisted']))
ok('Strategy Lab browser sync uses authenticated private run and trade tables, never a service-role key',
   '/rest/v1/strategy_backtests' in p7_ui and '/rest/v1/strategy_backtest_trades' in p7_ui and 'SUPABASE_SERVICE_ROLE_KEY' not in p7_ui)
ok('P4 database migration enforces owner RLS and user-linked trade rows',
   p4_migration.exists() and 'enable row level security' in p4_migration.read_text(encoding="utf-8") and
   'foreign key (backtest_id, user_id)' in p4_migration.read_text(encoding="utf-8") and
   '(select auth.uid()) = user_id' in p4_migration.read_text(encoding="utf-8"))

p5_ui=(ROOT/'assets/account.js').read_text(encoding="utf-8")
p5_notes=ROOT/'supabase/migrations/20261108161355_add_cloud_workspace_notes_and_alert_events.sql'
p5_legacy=ROOT/'supabase/migrations/20261108162550_add_idempotent_legacy_trade_import.sql'
ok('P5 account supports refresh-token persistence, private CRUD, analytics and legacy imports',
   'grant_type=refresh_token' in p5_ui and all(x in p5_ui for x in ['/rest/v1/journal_trades','/rest/v1/watchlists','/rest/v1/watchlist_items','/rest/v1/research_notes','/rest/v1/alert_rules','/rest/v1/alert_events','/rest/v1/user_preferences']) and 'ictfos.journal.v1' in p5_ui and 'fios.v2.journal' in p5_ui and 'fios.v2.watchlist' in p5_ui)
ok('P5 browser code does not expose privileged Supabase credentials',
   'SUPABASE_SERVICE_ROLE_KEY' not in p5_ui and 'service_role' not in p5_ui.lower())
ok('P5 alert behavior is explicitly user-triggered rather than a claimed live feed',
   'manual-browser-check' in p5_ui and 'No unattended exchange quote stream is configured' in p5_ui)
ok('P5 notes and alert event migrations enforce owner RLS and linked alert ownership',
   p5_notes.exists() and p5_legacy.exists() and 'enable row level security' in p5_notes.read_text(encoding="utf-8") and '(select auth.uid()) = user_id' in p5_notes.read_text(encoding="utf-8") and 'foreign key (alert_id, user_id)' in p5_notes.read_text(encoding="utf-8") and 'unique (user_id, legacy_id)' in p5_legacy.read_text(encoding="utf-8"))
p5_fk_indexes=ROOT/'supabase/migrations/20261108163000_add_workspace_composite_fk_indexes.sql'
ok('P5 alert and backtest composite foreign keys have covering indexes',
   p5_fk_indexes.exists() and 'on public.alert_events(alert_id, user_id)' in p5_fk_indexes.read_text(encoding="utf-8") and
   'on public.strategy_backtest_trades(backtest_id, user_id)' in p5_fk_indexes.read_text(encoding="utf-8"))

p9_migration=ROOT/'supabase/migrations/20261119125110_complete_private_workspace_records.sql'
p9_function=ROOT/'supabase/functions/delete-account/index.ts'
p9_academy=(ROOT/'assets/academy-learning.js').read_text(encoding="utf-8")
ok('P9 journal and research schema adds explicit futures contract, expiry and review fields',
   p9_migration.exists() and all(x in p9_migration.read_text(encoding="utf-8") for x in ['exchange_contract text','expiry_date date','target_price numeric','planned_risk_usd numeric','post_trade_review text','fees drop not null','preferred_session text','selected_data_source text','display_preferences jsonb','add column if not exists is_active boolean,','source_references jsonb','review_conclusion text']) and 'is_active boolean not null default true' not in p9_migration.read_text(encoding="utf-8"))
ok('P9 watchlists support editable contract/session/source/display/active context',
   all(x in p5_ui for x in ['Preferred session','Selected data source label','Display label / preference','Contract status','Status not set','data-edit-item','async function saveItem','Check the exchange calendar']))
ok('P9 research notes keep review outcomes and multiple validated source references',
   all(x in p5_ui for x in ['Review conclusion','Source references (one HTTP(S) URL per line)','source_references:sources','Each source reference must use http or https.']))
ok('P9 exports all private workspace tables with pagination and attachment bytes',
   all(x in p5_ui for x in ['content-range','count=exact','lesson_progress','user_events','strategy_backtests','strategy_backtest_trades','encoding:"base64"','privateAttachments']))
ok('P9 account deletion reauthenticates, checks origin and removes private files before Auth deletion',
   p9_function.exists() and all(x in p9_function.read_text(encoding="utf-8") for x in ['APP_ORIGIN','SUPABASE_SERVICE_ROLE_KEY','/auth/v1/user','DELETE_MY_ACCOUNT','journal-attachments','/auth/v1/admin/users/','readSmallBody(request, 1024)','Array.isArray(parsed)']))
runtime_config=(ROOT/'assets/runtime-config.js').read_text(encoding="utf-8")
ok('P9 account deletion stays disabled until the deployed workflow is explicitly verified',
   'accountDeletionEnabled: false' in runtime_config and 'cfg.accountDeletionEnabled===true' in p5_ui and 'deleteButton.disabled=!deletionReady' in p5_ui)
ok('P9 private REST and Storage requests opt out of browser caching',
   'cache:opt.cache||"no-store"' in p5_ui)
ok('P9 sensitive row edits use updated_at optimistic concurrency checks',
   all(x in p5_ui for x in ['function versionFilter(row)','function requireUpdatedRow(rows,label)','async function updateAlert(a,body)','versionFilter(current)','changed in another session']))
ok('P9 lesson progress stores offline writes and retries after reconnect/focus with session refresh',
   all(x in p9_academy for x in ['syncStatus','"pending"','retryPendingProgress','addEventListener("online"','grant_type=refresh_token']))
ok('P9 manual alerts preserve exact contract context and retry-safe event IDs',
   all(x in p5_ui for x in ['USER_ENTERED_OBSERVATION','MANUAL_ONLY','pending_event','resolution=ignore-duplicates']))

sql=(ROOT/'supabase/setup.sql').read_text(encoding="utf-8")
ok('Supabase schema includes RLS enablement','enable row level security' in sql)
ok('User RLS checks ownership with auth.uid()','(select auth.uid())' in sql and 'with check' in sql)
ok('No service role in browser assets','SUPABASE_SERVICE_ROLE_KEY' not in ''.join(p.read_text(errors='ignore') for p in (ROOT/'assets').glob('*.js')))

# Run generated route build and test final output if it exists.
dist=ROOT/'dist'
if dist.exists():
    expected=['index.html','markets/index.html','futures-intelligence/index.html','academy/index.html','sessions/index.html','contract-specs/index.html','risk/index.html','tools/index.html','sources/index.html','research/index.html','research/positioning/index.html','macro/index.html','news/index.html','account/index.html','status/index.html','docs/index.html','legacy/index.html','ict-futures/index.html','volume-open-interest/index.html','prediction-markets/index.html','entry-models/index.html','strategy-lab/index.html','data-health/index.html']
    ok('All primary route entry points generated',all((dist/p).exists() for p in expected),', '.join(p for p in expected if not (dist/p).exists()))
    html=list(dist.rglob('*.html'))
    ok('Futures-only homepage and generated product boundaries are present','Futures Command Center' in (dist/'index.html').read_text(encoding="utf-8") and len(list((dist/'markets').glob('*.html')))==1 and len(list((dist/'ict-futures/markets').glob('*.html')))==15)
    overview=(dist/'index.html').read_text(errors='ignore')
    desk_page=(dist/'futures-intelligence/index.html').read_text(errors='ignore')
    ict_page=(dist/'ict-futures/index.html').read_text(errors='ignore')
    ok('Part 1 overview renders the 13-area shell and core widget containers',overview.count('class="os-nav-link')==13 and all(x in overview for x in ['overviewContract','overviewNewsList','overviewCotSummary','overviewClockET','overviewCalendarTitle','overviewPrivateMetrics','overviewHealthBadge']))
    ok('Part 1 wraps both standalone terminals in the shared shell',all('data-os-shell' in x and 'id="appSidebar"' in x and 'id="sidebarToggle"' in x for x in [desk_page,ict_page]))
    ok('Part 1 loads dashboard and shared shell assets once',overview.count('overview-dashboard.js')==1 and (dist/'assets/overview-dashboard.js').exists() and (dist/'assets/site-shell.js').exists())
    ok('Part 1 overview avoids fabricated quotes and economic release events','QUOTE NOT CONNECTED' in overview and 'NOT CONNECTED' in overview and 'calendar is not available' in overview.lower())
    contract_page=(dist/'contract-specs/index.html').read_text(encoding='utf-8',errors='ignore')
    ok('Part 1 contract registry exposes all 15 partial families with official product and lifecycle references',contract_page.count('class="os-contract-spec-card"')==15 and contract_page.count('data-family=')==15 and 'PARTIAL · SOURCED CORE' in contract_page and 'SOURCED · CHECKED 2026-11-20' in contract_page and 'CME micro specification' in contract_page and 'contractSpecSearch' in contract_page and 'contractSpecExchange' in contract_page and 'Full lifecycle sign-off remains 0 / 15' in contract_page and 'https://www.cmegroup.com/tools-information/calendars/expiration-calendar.html' in contract_page and 'https://www.ice.com/products/194/US-Dollar-Index-Futures/expiry' in contract_page and 'NOT VERIFIED IN THIS RECORD' in contract_page and 'risk estimates remain conditional' in contract_page.lower() and 'Contract date display is rights-gated' in contract_page)
    lifecycle=readj(Path('dist/data/contract-lifecycle.json'))
    lifecycle_coverage=lifecycle.get('coverage') or {}
    ok('Part 3 lifecycle data is hidden unless public-display rights are explicitly reviewed',lifecycle.get('rightsStatus')=='not-approved' and lifecycle_coverage.get('familyCount')==15 and lifecycle_coverage.get('familiesWithCurrentOrFutureRows')==0 and lifecycle_coverage.get('contractMonthRows')==0 and not lifecycle.get('products') and 'Contract date display is rights-gated' in contract_page)
    ok('Part 3 public JSON contains no unlicensed lifecycle rows',lifecycle.get('sourceFiles')==[] and lifecycle.get('coverage',{}).get('contractMonthRows')==0 and all('contractMonths' not in p for p in lifecycle.get('products',[])))
    voi_page=(dist/'volume-open-interest/index.html').read_text(encoding='utf-8',errors='ignore')
    ok('Part 6 page separates weekly CFTC history from rights-gated exchange observations',all(x in voi_page for x in ['Weekly open-interest history','Authorized exchange observations','exchangeObservationState','exchangeObservationRows','aria-live="polite"','RIGHTS-GATED']))
    ok('Part 1 first-class calendar route preserves the timezone-aware ICT tools','id="sessionsEventList"' in (dist/'sessions/index.html').read_text(errors='ignore') and 'renderSessions' in ict_page)
    risk_page=(dist/'risk/index.html').read_text(errors='ignore')
    ok('P8 risk route labels conditional sizing and no verified firm programs','CONDITIONAL ESTIMATE' in risk_page and 'NO VERIFIED PROGRAMS' in risk_page and 'Blue Shift 25K' in risk_page and 'type="module"' in risk_page)
    dist_prop_rules=readj(Path('dist/data/prop-firm-programs.json'))
    ok('P8 generated registry publishes no numerical terms for the unverified mention',dist_prop_rules.get('records')==[] and (dist/'data/prop-firm-programs.json').exists())
    active_resources=readj(Path('dist/resources.json'))
    ok('Generated resource directory contains only reviewed futures sources',active_resources.get('scope')=='futures-only' and len(active_resources.get('resources',[]))>=40)
    ok('Retired event markets and legacy data are not active assets',not (dist/'assets/prediction-markets.js').exists() and not (dist/'data/market-universe.json').exists())
    ok('Legacy archive content is not copied into public output',not (dist/'legacy/previous-markdown').exists() and not (dist/'legacy/global-research').exists())
    ok('Legacy ICT SEO routes remain and six new futures-foundation lessons are added',len(list((dist/'ict-futures/academy').glob('*.html')))==82 and len(list((dist/'ict-futures/markets').glob('*.html')))==15 and all((dist/'ict-futures/academy'/f'{lesson_id}.html').exists() for lesson_id in ['listed-futures-market-basics','contract-specs-and-tick-math','futures-expiry-first-notice-and-roll','continuous-contract-mapping','futures-margin-and-position-risk','futures-volume-open-interest']))
    bad=[]
    for p in html:
        if 'whizz444yt-ux.github.io/new.w' in p.read_text(errors='ignore'): bad.append(str(p.relative_to(dist)))
    ok('No obsolete hard-coded GitHub Pages hostname',not bad,', '.join(bad[:4]))
    bad_seo=[str(p.relative_to(dist)) for p in [*dist.rglob('sitemap.xml'),*dist.rglob('robots.txt')] if 'whizz444yt-ux.github.io/new.w' in p.read_text(errors='ignore')]
    ok('No stale nested robots/sitemap hostname',not bad_seo,', '.join(bad_seo[:4]))
    ok('Only one authoritative root robots and sitemap',len(list(dist.rglob('robots.txt')))==1 and len(list(dist.rglob('sitemap.xml')))==1)
    ok('No archived nested source ZIPs exposed in static output',not list(dist.rglob('*.zip')))
    ok('P3 Academy learning assets match source',
        all((dist/'assets'/name).exists() and (dist/'assets'/name).read_bytes()==(ROOT/'assets'/name).read_bytes() for name in ['academy-learning.css','academy-learning.js','academy-catalog.js']))
    p3_lessons=list((dist/'ict-futures/academy').glob('*.html'))
    p3_tutorials=list((dist/'ict-futures/academy/tutorials').glob('*.html'))
    ok('Part 2 builds 82 full standalone lessons with multi-question practice and source provenance',len(p3_lessons)==82 and all('IDENTIFICATION RULES' in p.read_text(errors='ignore') and 'HYPOTHETICAL EXAMPLES' in p.read_text(errors='ignore') and 'SOURCES AND VIDEO CLASSIFICATION' in p.read_text(errors='ignore') and 'PRACTICE TASK' in p.read_text(errors='ignore') and 'SOURCE NOTES AND EDITORIAL REVIEW' in p.read_text(errors='ignore') for p in p3_lessons))
    search_index=readj(Path('dist/academy/search-index.json')) if (dist/'academy/search-index.json').exists() else {}
    ok('Part 2 builds an 82-record Academy search index with required facets',search_index.get('version')==2 and search_index.get('count')==82 and len(search_index.get('lessons',[]))==82 and all(x.get('aliases') and x.get('instrumentFamilies') and x.get('timeframes') and x.get('sessions') and x.get('sourceEvidenceLabel') for x in search_index.get('lessons',[])))
    ok('P3 builds nine guided tutorials plus their index',len(p3_tutorials)==10 and (dist/'ict-futures/academy/tutorials/index.html').exists())
    ok('P7 Strategy Lab assets match source',
        all((dist/'assets'/name).exists() and (dist/'assets'/name).read_bytes()==(ROOT/'assets'/name).read_bytes() for name in ['strategy-lab.css','strategy-lab.js','strategy-backtest-engine.mjs']))
    p7_page=(dist/'strategy-lab/index.html').read_text(errors='ignore') if (dist/'strategy-lab/index.html').exists() else ''
    ok('P7 Strategy Lab builds exact-expiry inputs, external-signal tags, OOS and downloads',
        'Exact contract code (must match CSV)' in p7_page and 'external signal only' in p7_page and 'out-of-sample' in p7_page and 'downloadManifest' in p7_page and 'downloadTrades' in p7_page)
    p7_template=dist/'strategy-lab/backtest-input-template.csv'
    ok('P7 CSV template requires exact contract and expiry fields',
        p7_template.exists() and p7_template.read_text(encoding="utf-8").strip()=='timestamp,open,high,low,close,signal,contract,expiry,stop_ticks,volume')
    ok('P7 rule-card decisions are included in generated docs',
        (dist/'docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md').exists())
    p5_page=(dist/'account/index.html').read_text(errors='ignore') if (dist/'account/index.html').exists() else ''
    ok('P5 cloud account route and refreshed account asset are generated',
        'Your private cloud workspace' in p5_page and 'account.js' in p5_page and
        (dist/'assets/account.js').exists() and (dist/'assets/account.js').read_bytes()==(ROOT/'assets/account.js').read_bytes())
    ok('P9 account route is excluded from search indexing even on configured production builds',
        'name="robots" content="noindex,nofollow"' in p5_page)
    ok('P2 economic dashboard asset matches source',
        (dist/'assets/economic-data.js').exists() and (dist/'assets/economic-data.js').read_bytes()==(ROOT/'assets/economic-data.js').read_bytes())
    ok('P1 module assets match source files',
        all((dist/'assets'/name).exists() and (dist/'assets'/name).read_bytes()==(ROOT/'assets'/name).read_bytes()
            for name in ['volume-open-interest.js','data-health.js','overview-dashboard.js','site-shell.js','site-shell.css']))
    ok('Built Futures Desk assets match source files',
        (dist/'assets/futures-intelligence.js').exists() and (dist/'assets/futures-intelligence.css').exists() and
        (dist/'assets/futures-intelligence.js').read_bytes()==(ROOT/'assets/futures-intelligence.js').read_bytes() and
        (dist/'assets/futures-intelligence.css').read_bytes()==(ROOT/'assets/futures-intelligence.css').read_bytes())
    ok('Retired routes are noindex redirects',all('noindex' in (dist/path).read_text(errors='ignore') for path in ['research/index.html','prediction-markets/index.html','legacy/index.html']))
    ok('Generated navigation has no event-market item','Prediction Markets' not in (dist/'index.html').read_text(encoding="utf-8") and '/prediction-markets/' not in (dist/'index.html').read_text(encoding="utf-8"))
    active_ict=(dist/'ict-futures/index.html').read_text(errors='ignore')
    ok('ICT terminal excludes retired event-market and issuer content',
       'id="predictions"' not in active_ict and 'href="#predictions"' not in active_ict and
       'Polymarket' not in active_ict and 'Kalshi' not in active_ict and
       'Stocktwits' not in active_ict and 'SEC EDGAR — Form 4' not in active_ict)
    sitemap=(dist/'sitemap.xml').read_text(errors='ignore')
    ok('Sitemap excludes retired research, prediction and archive routes',
       all(x not in sitemap for x in ['/prediction-markets/','/research/</loc>','/legacy/']))
    ok('Part 1 redirect-only Sessions route is excluded from sitemap','/sessions/' not in sitemap)
    if __import__('os').getenv('SITE_URL'):
        ok('Part 1 canonical routes are discoverable in the indexable sitemap',
           all(x in sitemap for x in ['/contract-specs/','/risk/','/futures-intelligence/','/academy/']) and
           all(x not in sitemap for x in ['/sessions/','/tools/','/prediction-markets/','/legacy/']))
    else:
        ok('Part 1 local noindex build keeps sitemap empty','<url>' not in sitemap)
    ok('Service worker cache no longer references generic 73-instrument dataset',
       'data/market-universe.json' not in (ROOT/'sw.js').read_text(encoding="utf-8") and 'v1.1.0-futures-only-p1' in (ROOT/'sw.js').read_text(encoding="utf-8"))
    ok('Runtime config exists only with publishable Supabase key', (dist/'assets/runtime-config.js').exists() and 'service_role' not in (dist/'assets/runtime-config.js').read_text(encoding="utf-8").lower())
    # Validate inline scripts in the two preserved monolithic applications.
    for page in [dist/'index.html', dist/'ict-futures/index.html']:
        page_html=page.read_text(encoding='utf-8',errors='replace')
        inline=[]
        for match in re.finditer(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script\s*>',page_html,re.I|re.S):
            attrs,body=match.group(1),match.group(2)
            if 'application/json' in attrs.lower() or 'application/ld+json' in attrs.lower(): continue
            if body.strip(): inline.append(body)
        for i,body in enumerate(inline):
            with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
                f.write(body); temp=f.name
            result=subprocess.run(['node','--check',temp],capture_output=True,text=True)
            Path(temp).unlink(missing_ok=True)
            ok(f'Inline app JavaScript: {page.relative_to(dist)} [{i+1}]',result.returncode==0,(result.stderr or '').strip()[:400])
    if not __import__('os').getenv('SITE_URL'):
        robots=(dist/'robots.txt').read_text(encoding="utf-8")
        ok('Local output disallows search indexing','Disallow: /' in robots)
else:
    errors.append('dist output is missing; run scripts/build_site.py')

for name,passed,detail in checks:
    print(('PASS' if passed else 'FAIL')+'  '+name+(f' — {detail}' if detail else ''))
print(f'\n{sum(x[1] for x in checks)}/{len(checks)} checks passed')
if errors:
    print('\nErrors:'); print('\n'.join('- '+e for e in errors)); sys.exit(1)
