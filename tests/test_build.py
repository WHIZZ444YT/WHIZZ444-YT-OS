import json, os, re, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_academy import academy_video_coverage
class BuildTests(unittest.TestCase):
    def test_futures_sources_and_archived_baselines(self):
        active=json.loads((ROOT/'resources.json').read_text(encoding="utf-8"))
        ict_sources=json.loads((ROOT/'ict-futures/data/source-directory.json').read_text(encoding="utf-8"))
        self.assertEqual(active['scope'],'futures-only')
        self.assertEqual(active['count'],len(active['resources']))
        self.assertGreaterEqual(len(active['resources']),40)
        self.assertEqual(active['resources'],ict_sources['sources'])
        forbidden=('polymarket','kalshi','stocktwits','sec.gov','sec edgar')
        for item in active['resources']:
            hay=' '.join(str(item.get(k,'')) for k in ('category','name','description','url')).lower()
            self.assertFalse(any(term in hay for term in forbidden),hay)
        archived=json.loads((ROOT/'legacy/global-research/resources.json').read_text(encoding="utf-8"))
        archived_markets=json.loads((ROOT/'legacy/global-research/data/market-universe.json').read_text(encoding="utf-8"))
        self.assertEqual(len(archived['resources']),585)
        self.assertGreaterEqual(len(archived_markets['markets']),70)
        markets=json.loads((ROOT/'ict-futures/data/market-universe.json').read_text(encoding="utf-8"))['markets']
        self.assertEqual(len(markets),15)
        self.assertTrue(all(m['specStatus']=='unverified' and m['specVersionId']=='imported-reference-2026-11-08' and m['specVerifiedAt'] is None and m['specEffectiveFrom'] is None and m['specEffectiveTo'] is None for m in markets))
        self.assertTrue(all(isinstance(m['tickSize'],str) and isinstance(m['tickValue'],str) for m in markets))
        self.assertTrue(all(isinstance(m['microSpec']['tickSize'],str) and isinstance(m['microSpec']['tickValue'],str) for m in markets if m.get('microSpec')))
        academy=json.loads((ROOT/'ict-futures/data/ict-academy.json').read_text(encoding="utf-8"))
        self.assertEqual(len(academy['concepts']),82)
        self.assertEqual(len(academy['curriculum']['preservedConceptIds']),76)
        self.assertTrue(set(academy['curriculum']['preservedConceptIds']).issubset({x['id'] for x in academy['concepts']}))
        self.assertEqual(len(academy['tracks']),10)
        self.assertEqual(len(academy['learningProgram']['tutorials']),9)
        for path in ['legacy/global-research/index.html','legacy/global-research/assets/prediction-markets.js',
                     'legacy/global-research/assets/research-directory.js',
                     'legacy/global-research/ict-source-directory-unfiltered.json',
                     'legacy/global-research/ict-resources-unfiltered.json']:
            self.assertTrue((ROOT/path).exists(),path)
    def test_builder_models_allowlist(self):
        models=json.loads((ROOT/'integrations/builder/models.json').read_text(encoding="utf-8"))['models']
        self.assertEqual({x['name'] for x in models},{'page','ict-lesson','research-article','glossary'})
    def test_rls_user_tables_present(self):
        sql=(ROOT/'supabase/setup.sql').read_text(encoding="utf-8")
        for table in ['profiles','watchlists','watchlist_items','journal_trades','lesson_progress','user_events','alert_rules','user_preferences']:
            self.assertIn(f'public.{table}',sql)
        self.assertIn('(select auth.uid())',sql)
    def test_worker_no_open_proxy(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('ALLOWED_BUILDER_MODELS',js)
        self.assertNotIn('url.searchParams.get("target")',js)
    def test_bls_registered_v2_key_and_daily_limit_cache(self):
        worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('env.BLS_API_KEY',worker)
        self.assertIn('publicAPI/v2/timeseries/data/',worker)
        self.assertIn('registrationkey',worker)
        self.assertIn('status:\"rate-limited\"',worker)
        self.assertIn('nextMidnight',worker)
        self.assertIn('snapshot?.status===\"rate-limited\"&&(!forced||!env.BLS_API_KEY)',worker)
    def test_macro_page_manual_refresh_bypasses_limit_cache(self):
        js=(ROOT/'assets/macro-page.js').read_text(encoding="utf-8")
        self.assertIn('load(force=false)',js)
        self.assertIn('?refresh=1',js)
        self.assertIn('load(true)',js)
    def test_worker_has_public_bls_and_cftc_data_adapters(self):
        worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('/api/v1/macro',worker)
        self.assertIn('/api/v1/cot',worker)
        self.assertIn('api.bls.gov/publicAPI/v1',worker)
        self.assertIn('publicreporting.cftc.gov/resource/',worker)
    def test_no_secret_values_in_environment_sample(self):
        data=(ROOT/'.env.example').read_text(encoding="utf-8")
        self.assertNotRegex(data,r'(sk_live_|sb_secret_|Bearer [A-Za-z0-9])')

    def test_gdelt_refresh_uses_a_single_rate_limited_query(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('const GDELT_QUERY = {',js)
        self.assertIn('queryCount:1',js)
        self.assertNotIn('GDELT_QUERIES.map',js)
        self.assertIn('maxrecords","100"',js)
    def test_bls_provider_retries_transient_failures(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('attempt<2',js)
        self.assertIn('setTimeout(resolve,700)',js)
        self.assertIn('BLS HTTP ',js)
    def test_worker_manual_news_refresh_is_bounded(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('url.searchParams.get("refresh")==="1"',js)
        self.assertIn('NEWS_REFRESH_LOCK_KEY',js)
        self.assertIn('ctx.waitUntil(refreshNews(env)',js)
        self.assertIn('cooldownSeconds:300',js)
    def test_cot_category_fields_follow_cftc_schemas(self):
        js=(ROOT/'cloudflare/src/cot-contracts.mjs').read_text(encoding="utf-8")
        for field in ['dealer_positions_long_all','asset_mgr_positions_long','lev_money_positions_long','prod_merc_positions_long','swap__positions_short_all','m_money_positions_long_all','other_rept_positions_long']:
            self.assertIn(field,js)
        self.assertIn('normalizedRows', (ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8"))
        self.assertIn('report_variant',js)
        self.assertIn('publishedAt: null',js)
        self.assertIn('not treated as zero',js)
        self.assertNotIn('comm_positions_spread_all',js)
        worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('cot:"+report+":"+variant+":v6:',worker)
        self.assertIn('rows:snapshot.rows||[]',worker)
        self.assertIn('prefix:"cot:tff:futures-only:v6:"',worker)
    def test_cot_contract_unit_suite(self):
        result=subprocess.run(['node','--test',str(ROOT/'tests/test_cot_contracts.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
    def test_part6_cot_variant_controls_and_csv_export(self):
        page=(ROOT/'assets/cot-page.js').read_text(encoding="utf-8")
        builder=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        self.assertIn('contract_market_code',page)
        self.assertIn('syncSearchControls',page)
        self.assertIn('Refresh CFTC data',builder)
        self.assertIn('type="button" disabled>Search CFTC market',builder)
        self.assertIn('Export filtered CSV',builder)
        self.assertIn('Futures and Options Combined',builder)
        self.assertIn('cot-chart',builder)
    def test_null_values_are_not_coerced_to_zero(self):
        js=(ROOT/'assets/futures-intelligence.js').read_text(encoding="utf-8")
        self.assertIn('v===null||v===undefined',js)
        self.assertIn('function setProvider',js)
        self.assertIn('Object.values(state.providers)',js)
    def test_micro_risk_mode_and_cost_validation(self):
        js=(ROOT/'assets/risk-calculator.js').read_text(encoding="utf-8")
        engine=(ROOT/'assets/futures-risk-engine.mjs').read_text(encoding="utf-8")
        self.assertIn("id='contractMode'",js)
        self.assertIn('market.microSpec',js)
        self.assertIn('calculateFuturesPosition',js)
        self.assertIn('CONDITIONAL ESTIMATE · SPEC UNVERIFIED',js)
        self.assertIn('dailyLossRemaining',js)
        self.assertIn('spreadTicks',js)
        self.assertIn('BigInt',engine)
        self.assertIn('allInPerContract',engine)

    def test_p8_futures_risk_calculation_examples(self):
        result=subprocess.run(['node','--test',str(ROOT/'tests/test_futures_risk_engine.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)

    def test_p8_prop_firm_registry_keeps_blue_shift_unverified(self):
        rules=json.loads((ROOT/'data/prop-firm-programs.json').read_text(encoding="utf-8"))
        self.assertEqual(rules['schemaVersion'],1)
        self.assertEqual(rules['records'],[])
        mention=rules['unverifiedMentions'][0]
        self.assertEqual(mention['label'],'Blue Shift 25K')
        self.assertEqual(mention['status'],'UNVERIFIED')
        self.assertIsNone(mention['officialRulebookUrl'])
    def test_news_page_calls_refresh_route(self):
        js=(ROOT/'assets/news-page.js').read_text(encoding="utf-8")
        self.assertIn("if(force)params.set('refresh','1')",js)
        self.assertIn('Refresh snapshot',js)
        self.assertIn('newsInstrument',js)
        self.assertIn('newsPublisher',js)
        self.assertIn('provider_seen_at',js)
    def test_dormant_event_market_handlers_preserve_unknown_volume_as_null(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('volume24hr:asFiniteNumber(event.volume24hr)',js)
        self.assertIn('volume24h:asFiniteNumber(m.volume_24h_fp??m.volume_24h)',js)
        # These server handlers remain only as dormant compatibility code; no frontend consumes them.
        desk=(ROOT/'assets/futures-intelligence.js').read_text(encoding="utf-8")
        self.assertNotIn('/api/v1/prediction/polymarket',desk)
        self.assertNotIn('/api/v1/prediction/kalshi',desk)

    def test_cot_fetch_is_scoped_to_selected_contract(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('fetchCot(report,variant,q,contractMarketCode,env)',js)
        self.assertIn('upper(contract_market_name)',js)
        self.assertIn('marketKey',js)
        self.assertIn('cftc_contract_market_code =',js)
        self.assertIn('cotSourceColumns(report).join(",")',js)
        self.assertIn('u.searchParams.set("$limit","156")',js)
        self.assertIn('query_scope:q||contractMarketCode?"filtered-market-history":"latest-provider-observations"',js)
        page=(ROOT/'assets/cot-page.js').read_text(encoding="utf-8")
        self.assertIn('if(term.length<3)',page)
        self.assertIn('params.set("q",term)',page)
    def test_built_futures_desk_assets_match_source(self):
        for name in ['futures-intelligence.js','futures-intelligence.css','news-page.js','risk-calculator.js']:
            self.assertEqual((ROOT/'dist/assets'/name).read_bytes(),(ROOT/'assets'/name).read_bytes())


    def test_part1_thirteen_area_navigation_is_centralized(self):
        js=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        labels=['Overview','Futures Markets','ICT Academy','Entry Models','Sessions & Calendar','Futures News','Volume & Open Interest','COT & Positioning','Contract Specs & Expiry','Strategy Lab','Risk & Prop Firms','Journal & Watchlists','Data Health & Sources']
        for label in labels:self.assertIn("('"+label+"',",js)
        self.assertIn('NAV_GROUPS',js)
        self.assertIn('class="os-sidebar"',js)
        self.assertNotIn("('Prediction Markets',",js)
        self.assertNotIn("('Equities',",js)
        self.assertEqual(js.count("('Overview', '/'),"),1)

    def test_part1_shared_shell_dashboard_and_accessibility_contract(self):
        shell=(ROOT/'assets/site-shell.js').read_text(encoding="utf-8")
        css=(ROOT/'assets/site-shell.css').read_text(encoding="utf-8")
        dashboard=(ROOT/'assets/overview-dashboard.js').read_text(encoding="utf-8")
        home=(ROOT/'index.html').read_text(encoding="utf-8")
        builder=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        for token in ['sidebarToggle','sidebarScrim','Escape','fios.app-sidebar.collapsed.v1','osThemeToggle','fios.theme.preference.v1','aria-expanded']:
            self.assertIn(token,shell)
        for token in ['prefers-reduced-motion','os-app-shell','os-sidebar','os-contract-spec-card','os-state-chip','os-loading-state','os-error-state','--os-focus']:
            self.assertIn(token,css)
        for token in ['overviewContract','overviewClockET','overviewClockLocal','overviewTimezone','overviewNewsList','overviewCotSummary','overviewPrivateMetrics','overviewHealthBadge','Promise.allSettled','/api/v1/news','/api/v1/cot?report=tff','/auth/v1/user','/rest/v1/watchlists','/rest/v1/journal_trades','America/New_York']:
            self.assertIn(token,dashboard)
        self.assertNotIn('SUPABASE_SERVICE_ROLE_KEY',dashboard)
        self.assertNotIn('service_role',dashboard.lower())
        self.assertIn('Futures news is unavailable:',dashboard)
        self.assertIn('state === "not-yet-fetched"',dashboard)
        self.assertIn('articles, but none matched this contract',dashboard)
        self.assertIn('@media(max-width:600px)',css)
        self.assertIn('.os-workspace-link{display:none}',css)
        source_loader=(ROOT/'assets/research-directory.js').read_text(encoding="utf-8")
        self.assertIn('The futures source directory is temporarily unavailable',source_loader)
        self.assertNotIn('main Finance OS research workspace',source_loader)
        for token in ['overviewCalendarTitle','NOT CONNECTED','QUOTE NOT CONNECTED']:
            self.assertIn(token,home)
        self.assertIn('calendar is not available',home.lower())
        self.assertIn('wrap_standalone_shell',builder)
        self.assertIn('os-ict-terminal',builder)
        self.assertIn('os-futures-desk',builder)

    def test_part1_contract_session_and_risk_route_compatibility(self):
        builder=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        self.assertIn("DIST/'contract-specs/index.html'",builder)
        self.assertIn("DIST/'sessions/index.html'",builder)
        self.assertIn("DIST/'risk/index.html'",builder)
        self.assertIn("DIST/'tools/index.html',redirect_page",builder)
        self.assertIn("'/ict-futures/#sessions'",builder)
        self.assertIn('UNVERIFIED IMPORTED REFERENCE',builder)
        self.assertIn('NOT SUPPLIED IN REGISTRY',builder)
        self.assertIn('NOT CONFIGURED',builder)
        self.assertIn('Reference set',builder)
        self.assertIn('Settlement / delivery',builder)
        self.assertIn('Roll / continuous-series method',builder)
        sitemap_urls=next(line for line in builder.splitlines() if 'urls=[' in line)
        self.assertNotIn("'/sessions/',",sitemap_urls)
        shell_css=(ROOT/'assets/site-shell.css').read_text(encoding="utf-8")
        self.assertIn('body.os-ict-terminal .topbar{z-index:var(--os-z-topbar)',shell_css)
        self.assertIn("html = html.replace('<body>', '<body class=\"dark os-ict-terminal\">', 1)",builder)
        self.assertIn('--os-z-sidebar:30',shell_css)
        self.assertIn('--os-z-topbar:20',shell_css)
    def test_futures_module_assets_and_retired_route_redirects(self):
        for name in ['volume-open-interest.js','data-health.js']:
            self.assertTrue((ROOT/'assets'/name).exists(),name)
            self.assertTrue((ROOT/'dist/assets'/name).exists(),name)
        self.assertTrue((ROOT/'assets/prediction-markets.js').exists())
        self.assertFalse((ROOT/'dist/assets/prediction-markets.js').exists())
        for route in ['volume-open-interest','sources','research','prediction-markets','legacy','entry-models','strategy-lab','data-health','sessions','contract-specs','risk','tools']:
            self.assertTrue((ROOT/'dist'/route/'index.html').exists(),route)
        self.assertIn('/sources/',(ROOT/'dist/research/index.html').read_text(encoding="utf-8"))
        self.assertIn('noindex',(ROOT/'dist/prediction-markets/index.html').read_text(encoding="utf-8"))
        self.assertIn('#sessions',(ROOT/'dist/sessions/index.html').read_text(encoding="utf-8"))
        self.assertIn('/risk/',(ROOT/'dist/tools/index.html').read_text(encoding="utf-8"))
        self.assertTrue((ROOT/'dist/contract-specs/index.html').exists())
        contract=(ROOT/'dist/contract-specs/index.html').read_text(encoding="utf-8")
        self.assertEqual(contract.count('class="os-contract-spec-card"'),15)
        self.assertIn('UNVERIFIED IMPORTED REFERENCE',contract)
        self.assertIn('NOT SUPPLIED IN REGISTRY',contract)
        self.assertIn('imported-reference-2026-11-08',contract)
    def test_part3_ict_terminal_uses_a_canonical_builder_bundle(self):
        template=(ROOT/'ict-futures/index.html').read_text(encoding="utf-8")
        self.assertEqual(template.count('__FUTURES_DATA_BUNDLE__'),1)
        self.assertNotIn('const DATA_BUNDLE = {',template)
        html=(ROOT/'dist/ict-futures/index.html').read_text(encoding="utf-8")
        match=re.search(r'const DATA_BUNDLE = (.*?);\s*const DATA=DATA_BUNDLE;',html,re.S)
        self.assertIsNotNone(match)
        bundle=json.loads(match.group(1))
        self.assertEqual(len(bundle['markets']),15)
        self.assertEqual(bundle['academy']['conceptCount'],82)
        self.assertEqual(len(bundle['academy']['concepts']),82)
        self.assertEqual(len(bundle['academy']['tracks']),10)
        self.assertTrue(all(m['specStatus']=='unverified' and isinstance(m['tickSize'],str) for m in bundle['markets']))
        self.assertTrue(all(not c.get('verifiedVideoIds') for c in bundle['academy']['concepts']))
        self.assertIn('c.id===n',template)
    def test_part3_contract_version_is_shown_in_risk_output(self):
        js=(ROOT/'assets/risk-calculator.js').read_text(encoding="utf-8")
        self.assertIn('specVersionId',js)
        self.assertIn('reference set ',js)
        self.assertIn('specEffectiveFrom',js)
        self.assertIn('official exchange source',js)
        self.assertIn('CONDITIONAL ESTIMATE · SPEC UNVERIFIED',js)
    def test_weekly_open_interest_is_separate_from_exchange_volume(self):
        worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        voi=(ROOT/'assets/volume-open-interest.js').read_text(encoding="utf-8")
        self.assertIn('/api/v1/volume-open-interest',worker)
        self.assertIn('cadence:"weekly"',worker)
        self.assertIn('metric:"open_interest"',worker)
        self.assertIn('status:"not-connected"',worker)
        self.assertIn('/api/v1/volume-open-interest?',voi)
        self.assertIn('Daily / intraday volume', (ROOT/'scripts/build_site.py').read_text(encoding="utf-8"))
    def test_provider_health_checks_are_independent(self):
        js=(ROOT/'assets/data-health.js').read_text(encoding="utf-8")
        self.assertIn('Promise.allSettled',js)
        for endpoint in ['/api/v1/news','/api/v1/macro','/api/v1/cot?report=tff','/api/v1/macro/funding']:
            self.assertIn(endpoint,js)
    def test_retired_event_market_ui_has_no_active_frontend_consumers(self):
        desk=(ROOT/'assets/futures-intelligence.js').read_text(encoding="utf-8")
        health=(ROOT/'assets/data-health.js').read_text(encoding="utf-8")
        ict=(ROOT/'ict-futures/index.html').read_text(encoding="utf-8")
        worker=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        for frontend in [desk,health,ict]:
            for token in ['/api/v1/prediction/polymarket','/api/v1/prediction/kalshi','gamma-api.polymarket.com','api.elections.kalshi.com']:
                self.assertNotIn(token,frontend)
        self.assertNotIn('id="predictions"',ict)
        self.assertNotIn('href="#predictions"',ict)
        self.assertIn('/api/v1/prediction/polymarket',worker)
        self.assertIn('/api/v1/prediction/kalshi',worker)


    def test_p2_economic_provider_adapters(self):
        js=(ROOT/'cloudflare/src/economic-providers.js').read_text(encoding="utf-8")
        for provider in ['case "bea"','case "eia"','case "fred"','case "us_treasury"','case "ecb"']:
            self.assertIn(provider,js)
        self.assertIn('searchParams.delete("api_key")',js)
        self.assertIn('searchParams.delete("UserID")',js)
        self.assertIn('url.searchParams.set("limit", "100000")',js)
    def test_p2_ingestion_is_protected_and_persistent(self):
        js=(ROOT/'cloudflare/src/index.js').read_text(encoding="utf-8")
        self.assertIn('url.pathname==="/api/v1/ingest"',js)
        self.assertIn('env.INGEST_TOKEN',js)
        self.assertIn('economic_observations',js)
        self.assertIn('ingestion_runs',js)
        self.assertIn('on_conflict=provider,dataset_id,series_id,frequency,observation_date',js)
        self.assertIn('scheduledEconomicIngestion(env)',js)
        self.assertIn('recordIngestionRun(env,provider,"skipped"',js)
        self.assertIn('recordIngestionRun(env,provider,"failed"',js)
        self.assertIn('url.pathname==="/api/v1/economic/history"',js)
        self.assertIn('query.set("and"',js)
        self.assertIn('i+=1000',js)
    def test_p2_supabase_migration_security(self):
        sql=(ROOT/'supabase/migrations/20261108134935_add_economic_observations_and_ingestion_runs.sql').read_text(encoding="utf-8")
        self.assertIn('create table if not exists public.economic_observations',sql)
        self.assertIn('create table if not exists public.ingestion_runs',sql)
        self.assertIn('enable row level security',sql)
        self.assertIn('revoke all on public.ingestion_runs from anon, authenticated',sql)
        guard=(ROOT/'supabase/migrations/20261108140821_deny_browser_access_to_ingestion_runs.sql').read_text(encoding="utf-8")
        self.assertIn('using (false)',guard)
        self.assertIn('with check (false)',guard)
        self.assertIn('unique(provider, dataset_id, series_id, frequency, observation_date)',sql)
    def test_p2_macro_ui_and_secret_configuration(self):
        ui=(ROOT/'assets/economic-data.js').read_text(encoding="utf-8")
        env=(ROOT/'.env.example').read_text(encoding="utf-8")
        build=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        for provider in ['id:"bea"','id:"eia"','id:"fred"','id:"us_treasury"','id:"ecb"']:
            self.assertIn(provider,ui)
        self.assertIn('request("/api/v1/economic/"+p.id)',ui)
        for key in ['BEA_API_KEY','EIA_API_KEY','FRED_API_KEY']:
            self.assertIn(key,env)
        self.assertIn('economic-data.js',build)
        self.assertIn('Refresh economic providers',build)



    def test_part2_preserves_76_concept_ids_and_builds_82_full_lessons(self):
        data=json.loads((ROOT/'ict-futures/data/ict-academy.json').read_text(encoding="utf-8"))
        lessons=data['concepts']
        self.assertEqual(len(lessons),82)
        self.assertEqual(len(data['curriculum']['preservedConceptIds']),76)
        self.assertTrue(set(data['curriculum']['preservedConceptIds']).issubset({x['id'] for x in lessons}))
        self.assertEqual(len({x['id'] for x in lessons}),82)
        for lesson in lessons:
            content=lesson['learning']
            curriculum=lesson['curriculum']
            self.assertGreaterEqual(len(content['learningObjectives']),3)
            self.assertGreaterEqual(len(content['guidedWalkthrough']),3)
            self.assertTrue(content['workedExample']['body'])
            self.assertTrue(content['practicalExercise']['task'])
            self.assertTrue(content['practicalExercise']['deliverable'])
            self.assertGreaterEqual(len(curriculum['knowledgeChecks']),3)
            self.assertIn(curriculum['sourceEvidenceLabel'],['SOURCED','CONVENTION'])
            self.assertNotEqual(curriculum.get('performanceEvidenceLabel'),'TESTED')
            for question in curriculum['knowledgeChecks']:
                self.assertGreaterEqual(len(question['options']),3)
                self.assertIn(question['correctIndex'],range(len(question['options'])))
                self.assertTrue(question['explanation'])
    def test_part2_video_gate_reports_missing_verified_mappings(self):
        coverage=json.loads((ROOT/'dist/ict-futures/academy/video-coverage.json').read_text(encoding="utf-8"))
        self.assertEqual(coverage['status'],'PARTIAL')
        self.assertEqual(coverage['eligibleCount'],82)
        self.assertEqual(coverage['coveredCount'],0)
        self.assertEqual(coverage['missingCount'],82)
        self.assertEqual(len(coverage['entryModelCoverage']['missingIds']),8)
        self.assertIn('VIDEO NEEDED',(ROOT/'dist/ict-futures/academy/market-structure.html').read_text(encoding="utf-8"))
        academy=(ROOT/'dist/academy/index.html').read_text(encoding="utf-8")
        self.assertIn('VIDEO COVERAGE: PARTIAL',academy)
        self.assertIn('/assets/academy-learning.css',academy)
    def test_part2_video_registry_requires_complete_verified_metadata(self):
        def record(concept_ids,segments=None):
            return {'resourceId':'lesson-video-01','title':'Exact lesson upload','channelId':'UC123','channelName':'Example channel','videoId':'abcdefghijk','url':'https://www.youtube.com/watch?v=abcdefghijk','language':'en','sourceClass':'official_ict','conceptIds':concept_ids,'segments':segments or {},'verificationStatus':'verified','verifiedAt':'2026-11-19','verifiedBy':'editor-1','lastLinkCheck':'2026-11-19','linkStatus':'verified','embedStatus':'enabled','embedPermission':'allowed','fallbackLinkStatus':'available'}
        single=academy_video_coverage({'concepts':[{'id':'lesson-a','name':'A','curriculum':{'videoResources':[record(['lesson-a'])]}}]})
        shared_missing=academy_video_coverage({'concepts':[{'id':'lesson-a','name':'A','curriculum':{'videoResources':[record(['lesson-a','lesson-b'])]}},{'id':'lesson-b','name':'B','curriculum':{'videoResources':[record(['lesson-a','lesson-b'])]}}]})
        shared_segmented=academy_video_coverage({'concepts':[{'id':lesson,'name':lesson,'curriculum':{'videoResources':[record(['lesson-a','lesson-b'],{'lesson-a':{'startSeconds':10,'endSeconds':35},'lesson-b':{'startSeconds':36,'endSeconds':65}})]}} for lesson in ('lesson-a','lesson-b')]})
        self.assertEqual(single['coveredCount'],1)
        self.assertEqual(shared_missing['coveredCount'],0)
        self.assertEqual(shared_segmented['coveredCount'],2)
    def test_part2_has_ten_prerequisite_tracks_and_preserves_nine_tutorials(self):
        data=json.loads((ROOT/'ict-futures/data/ict-academy.json').read_text(encoding="utf-8"))
        tracks=data['tracks'];tutorials=data['learningProgram']['tutorials']
        self.assertEqual(len(tracks),10)
        self.assertEqual(len(tutorials),9)
        lesson_ids={x['id'] for x in data['concepts']}
        mapped=[lesson_id for track in tracks for lesson_id in track.get('sequence',[])]
        self.assertEqual(len(mapped),82)
        self.assertEqual(len(set(mapped)),82)
        self.assertEqual(set(mapped),lesson_ids)
        track_ids={x['id'] for x in tracks}
        for track in tracks:
            self.assertIsInstance(track['readingMinutes'],int)
            self.assertIsInstance(track['practiceMinutes'],int)
            self.assertTrue(track['completionCriteria'])
            for prerequisite in track.get('prerequisites',[]):
                self.assertIn(prerequisite,track_ids)
        self.assertTrue(tracks[-1]['tutorialIds'])
        for tutorial in tutorials:
            self.assertGreaterEqual(len(tutorial['steps']),4)
            self.assertTrue(tutorial['deliverable'])
            self.assertGreaterEqual(len(tutorial['review']),3)
            self.assertEqual(tutorial['trackId'],'replay-journaling-evaluation')
    def test_part2_academy_builder_generates_82_lessons_and_tutorial_compatibility(self):
        lessons=list((ROOT/'dist/ict-futures/academy').glob('*.html'))
        tutorials=list((ROOT/'dist/ict-futures/academy/tutorials').glob('*.html'))
        self.assertEqual(len(lessons),82)
        self.assertEqual(len(tutorials),10)
        for page in lessons:
            content=page.read_text(encoding="utf-8")
            self.assertIn('IDENTIFICATION RULES',content)
            self.assertIn('HYPOTHETICAL EXAMPLES',content)
            self.assertIn('PRACTICE TASK',content)
            self.assertIn('SOURCES AND VIDEO CLASSIFICATION',content)
            self.assertIn('SOURCE NOTES AND EDITORIAL REVIEW',content)
            self.assertIn('data-academy-quiz-question',content)
        for lesson_id in ['listed-futures-market-basics','contract-specs-and-tick-math','futures-expiry-first-notice-and-roll','continuous-contract-mapping','futures-margin-and-position-risk','futures-volume-open-interest']:
            self.assertTrue((ROOT/'dist/ict-futures/academy'/f'{lesson_id}.html').exists())
        self.assertTrue((ROOT/'dist/ict-futures/academy/tutorials/index.html').exists())
        self.assertTrue((ROOT/'dist/academy/index.html').exists())
        search_index=json.loads((ROOT/'dist/academy/search-index.json').read_text(encoding="utf-8"))
        self.assertEqual(search_index['version'],2)
        self.assertEqual(search_index['count'],82)
        self.assertEqual(len(search_index['lessons']),82)
        self.assertTrue(all(x['aliases'] and x['instrumentFamilies'] and x['timeframes'] and x['sessions'] and x['sourceEvidenceLabel'] for x in search_index['lessons']))
    def test_part2_prerequisite_and_resource_registries_are_consistent(self):
        data=json.loads((ROOT/'ict-futures/data/ict-academy.json').read_text(encoding="utf-8"))
        ids={c['id'] for c in data['concepts']}
        sources={r['id'] for r in data['curriculum']['resourceRegistry']}
        for lesson in data['concepts']:
            curriculum=lesson['curriculum']
            self.assertTrue(curriculum['aliases'])
            self.assertTrue(curriculum['purpose'])
            self.assertTrue(curriculum['instrumentFamilies'])
            self.assertTrue(curriculum['timeframes'])
            self.assertTrue(curriculum['sessions'])
            self.assertTrue(set(curriculum['prerequisiteIds']).issubset(ids))
            self.assertTrue(set(curriculum['sourceRefs']).issubset(sources))
        self.assertEqual(len(data['curriculum']['sourceDocument']['reviewedPages']),39)
        self.assertGreaterEqual(len(data['curriculum']['playbookTraceability']),8)
    def test_part2_progress_sync_preserves_legacy_and_supports_all_quiz_questions(self):
        js=(ROOT/'assets/academy-learning.js').read_text(encoding="utf-8")
        self.assertIn('finance-os-supabase-session-v1',js)
        self.assertIn('/auth/v1/user',js)
        self.assertIn('/rest/v1/lesson_progress',js)
        self.assertIn('on_conflict=user_id,lesson_slug',js)
        self.assertIn('progress_data',js)
        self.assertIn('lesson_version',js)
        self.assertIn('ictfos.academy.progress.v2',js)
        self.assertIn('legacyCompletion',js)
        self.assertIn('migrateContentVersion',js)
        self.assertIn('quizAnswers',js)
        self.assertIn('mergeRemote(root,slug,checks,quizData)',js)
        merge=js.split('async function mergeRemote')[1].split('function initRoot')[0]
        self.assertNotIn('checks.length',merge)
        self.assertNotIn('quiz||',merge)
        migration=(ROOT/'supabase/migrations/20261108144106_add_lesson_progress_data.sql').read_text(encoding="utf-8")
        self.assertIn('add column if not exists progress_data jsonb',migration)
        self.assertIn('add column if not exists lesson_version text',migration)
        self.assertNotIn('SUPABASE_SERVICE_ROLE_KEY',js)
        self.assertNotIn('service_role',js.lower())
    def test_p7_futures_specific_strategy_backtest_engine(self):
        engine=(ROOT/'assets/strategy-backtest-engine.mjs').read_text(encoding="utf-8")
        self.assertIn('ENGINE_VERSION = "p7.0.0"',engine)
        self.assertIn('signalKnownAt: "source-bar-close"',engine)
        self.assertIn('entry: "next-bar-open"',engine)
        self.assertIn('stop-first-same-bar',engine)
        self.assertIn('runFingerprint',engine)
        self.assertIn('out-of-sample',engine)
        self.assertIn('exactExpiryDate',engine)
        self.assertIn('observedGapCount',engine)
        self.assertIn('do not align to the supplied tick size',engine)
        self.assertIn('future-derived columns',engine)
        rule_cards=(ROOT/'docs/futures-only-roadmap/22-PART-7-MODEL-RULE-CARDS.md').read_text(encoding="utf-8")
        self.assertIn('No ICT detector is enabled',rule_cards)
        for model in ['liquidity-sweep-mss','silver-bullet','ict-2022-model','judas-mss','amd-po3','unicorn','fvg-continuation','ifvg','fvg-ote','smt-assisted']:
            self.assertIn(model,rule_cards)
        result=subprocess.run(['node','--test',str(ROOT/'tests/test_strategy_backtest.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)
    def test_p7_strategy_lab_frontend_assets_and_build(self):
        js=(ROOT/'assets/strategy-lab.js').read_text(encoding="utf-8")
        build=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        self.assertIn('runExperiment',js)
        self.assertIn('/rest/v1/strategy_backtests',js)
        self.assertIn('/rest/v1/strategy_backtest_trades',js)
        self.assertNotIn('SUPABASE_SERVICE_ROLE_KEY',js)
        self.assertIn('backtest-input-template.csv',build)
        self.assertIn('Exact contract code (must match CSV)',build)
        self.assertIn('dataSource:$("dataSource").value.trim()',js)
        self.assertIn('external signal only',build)
        self.assertIn('strategy-lab.css',build)
        self.assertIn('strategy-backtest-engine.mjs',js)
    def test_p4_private_backtest_schema_and_owner_rls(self):
        sql=(ROOT/'supabase/migrations/20261108151112_add_strategy_backtest_runs_and_trades.sql').read_text(encoding="utf-8")
        self.assertIn('create table if not exists public.strategy_backtests',sql)
        self.assertIn('create table if not exists public.strategy_backtest_trades',sql)
        self.assertIn('enable row level security',sql)
        self.assertIn('(select auth.uid()) = user_id',sql)
        self.assertIn('foreign key (backtest_id, user_id)',sql)
        self.assertIn('revoke all on public.strategy_backtests from anon',sql)


    def test_p5_account_cloud_workspace_auth_and_crud(self):
        js=(ROOT/'assets/account.js').read_text(encoding="utf-8")
        build=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        for token in ['grant_type=refresh_token','localStorage.setItem(SESSION_KEY','/rest/v1/journal_trades','/rest/v1/watchlists','/rest/v1/watchlist_items','/rest/v1/research_notes','/rest/v1/alert_rules','/rest/v1/alert_events','/rest/v1/user_preferences','exportBackup','fios.v2.watchlist','fios.v2.journal','ictfos.journal.v1']:
            self.assertIn(token,js)
        self.assertIn('refresh_token',js)
        self.assertIn('last_condition_met',js)
        self.assertIn('manual-browser-check',js)
        self.assertNotIn('SUPABASE_SERVICE_ROLE_KEY',js)
        self.assertNotIn('service_role',js.lower())
        self.assertIn('Account & sync',build)
    def test_p5_private_notes_alert_events_and_legacy_trade_import_migrations(self):
        notes=(ROOT/'supabase/migrations/20261108161355_add_cloud_workspace_notes_and_alert_events.sql').read_text(encoding="utf-8")
        legacy=(ROOT/'supabase/migrations/20261108162550_add_idempotent_legacy_trade_import.sql').read_text(encoding="utf-8")
        self.assertIn('create table if not exists public.research_notes',notes)
        self.assertIn('create table if not exists public.alert_events',notes)
        self.assertIn('enable row level security',notes)
        self.assertIn('(select auth.uid()) = user_id',notes)
        self.assertIn('foreign key (alert_id, user_id)',notes)
        self.assertIn('add column if not exists legacy_id text',legacy)
        self.assertIn('unique (user_id, legacy_id)',legacy)
    def test_p5_composite_foreign_key_indexes_are_present(self):
        sql=(ROOT/'supabase/migrations/20261108163000_add_workspace_composite_fk_indexes.sql').read_text(encoding="utf-8")
        self.assertIn('on public.alert_events(alert_id, user_id)',sql)
        self.assertIn('on public.strategy_backtest_trades(backtest_id, user_id)',sql)

    def test_part4_timezone_engine_dst_and_date_boundaries(self):
        result=subprocess.run(['node','--test',str(ROOT/'tests/test_session_time.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)
        template=(ROOT/'ict-futures/index.html').read_text(encoding='utf-8')
        self.assertIn('<script src="/assets/session-time.js"></script>',template)
        self.assertIn('resolveWallTime', (ROOT/'assets/session-time.js').read_text(encoding='utf-8'))

    def test_part4_session_and_event_sources_are_classified_and_unverified(self):
        data=json.loads((ROOT/'ict-futures/data/ict-playbook.json').read_text(encoding='utf-8'))
        sessions=data['sessions']
        required={'window_id','display_name','market_scope','instrument_families','timezone','start_local','end_local','source_id','evidence_label','active_from','active_to','notes'}
        self.assertEqual(len(sessions),13)
        self.assertTrue(all(required.issubset(row) for row in sessions))
        self.assertTrue(all(row['timezone']=='America/New_York' for row in sessions))
        exchange=next(row for row in sessions if row['id']=='cmebreak')
        self.assertEqual(exchange['scheduleClass'],'exchange-break-reference')
        self.assertEqual(exchange['status'],'unverified')
        self.assertTrue(all(row['scheduleClass'] in ('ict-reference-window','market-reference-window') for row in sessions if row['id']!='cmebreak'))
        snapshot=data['calendarSnapshot']
        self.assertEqual(snapshot['status'],'unverified')
        self.assertEqual(snapshot['asOfDate'],'2026-11-08')
        self.assertIsNone(snapshot['retrievedAtUtc'])
        self.assertTrue(all(row['publisher'] and row['status']=='unverified' and row['dataClass']=='publisher-link-reference' and row['retrievedAtUtc'] is None and row['revisionAtUtc'] is None and row['actualAtUtc'] is None for row in data['events']))
        terminal=(ROOT/'ict-futures/index.html').read_text(encoding='utf-8')
        for token in ['Imported publisher references · not a schedule','calendarScheduleEvents()','No verified publisher schedule','scheduleClass']:
            self.assertIn(token,terminal)

    def test_part5_news_api_contracts_and_provider_status(self):
        result=subprocess.run(['node','--test',str(ROOT/'tests/test_news_contracts.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)
        retry_result=subprocess.run(['node','--test',str(ROOT/'tests/test_provider_http.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(retry_result.returncode,0,retry_result.stdout+'\n'+retry_result.stderr)
        worker=(ROOT/'cloudflare/src/index.js').read_text(encoding='utf-8')
        source=(ROOT/'cloudflare/src/news-contracts.mjs').read_text(encoding='utf-8')
        provider_http=(ROOT/'cloudflare/src/provider-http.mjs').read_text(encoding='utf-8')
        page=(ROOT/'assets/news-page.js').read_text(encoding='utf-8')
        for route in ['/api/v1/news/sources','/api/v1/market-data/status']:
            self.assertIn(route,worker)
        for field in ['data_type','frequency','delay_class','source_provider','source_url','data_as_of','retrieved_at','cache_age_seconds','licence_display_class','limitations']:
            self.assertIn(field,source)
        self.assertIn('validateNewsQuery',worker)
        self.assertIn('filterNewsArticles',worker)
        self.assertIn('newsSourceStatus',page)
        self.assertIn('published_at',worker)
        self.assertIn('provider_seen_at',worker)
        for token in ['Retry-After','response.status >= 500','providerCircuitIsOpen','nextProviderCircuitState']:
            self.assertIn(token,provider_http+'\n'+worker)

    def test_part5_worker_news_and_market_data_routes(self):
        result=subprocess.run(['node','--test',str(ROOT/'tests/test_worker_news_routes.mjs')],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)

    def test_p5_account_assets_are_in_the_static_build(self):
        build=(ROOT/'scripts/build_site.py').read_text(encoding="utf-8")
        self.assertIn('account.js',build)
        self.assertIn('Account & sync',build)
        css=(ROOT/'assets/site-shell.css').read_text(encoding="utf-8")
        self.assertIn('.workspace-tabs',css)
        self.assertIn('.workspace-metrics',css)

if __name__=='__main__': unittest.main()
