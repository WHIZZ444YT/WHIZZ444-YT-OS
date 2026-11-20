# Part 4 — BEA Release Calendar Update

**Review date:** 20 November 2026  
**Roadmap state:** Part 4 remains partial  
**Change scope:** Add a source-attributed BEA publisher schedule adapter to the Sessions calendar.

The repository Worker source version is now 2.2.0. Production was last observed on 2.0.0; this change has not deployed the Worker.

## Source and schedule semantics

The adapter reads BEA's [machine-readable release-date JSON](https://apps.bea.gov/API/signup/release_dates.json). The issuer's [release schedule page](https://www.bea.gov/news/schedule) links to this feed. The feed supplies release categories and explicit UTC-offset timestamps; its `file_last_updated` field is preserved as publisher revision metadata, not interpreted as a timestamp with an assumed timezone.

The Worker parser:

- accepts only the expected JSON category structure and ISO timestamps explicitly expressed in UTC;
- rejects invalid calendar dates and malformed schedule records rather than silently normalizing them;
- omits past releases, limits the look-ahead to 400 days, sorts records and removes repeated category/timestamp rows;
- labels selected GDP, personal income/outlays, trade, international transactions and corporate-profits categories with editorial instrument context; unclassified categories remain visible without inferred instrument relevance;
- does not add forecasts, actual values, measured release times or price-impact claims;
- reads the feed through a 12-second timeout, JSON content-type check and 1 MiB response limit;
- caches the provider snapshot through the existing Worker KV schedule mechanism and returns an explicitly stale prior snapshot when refresh fails.

The new route is `/api/v1/events/bea`. The Sessions UI merges it with existing publisher schedules, reports its retrieval time/status, converts the UTC instants to the selected display timezone, and links each event to BEA's schedule. Data Health and the live Worker smoke checklist also include the feed.

## Verification performed

- Parser tests cover UTC preservation, duplicate removal, past-row exclusion, source revision metadata, unclassified releases and rejection of invalid timestamps.
- Fetch tests cover the official JSON source, accepted content type and source attribution.
- Worker route tests cover CORS, source metadata, event envelope, caching and unconfigured storage.
- Worker smoke tests now expect nine publisher feeds.
- Site validation checks the BEA endpoint and its Sessions page source link.

These checks use controlled fixtures. They do not prove the deployed Worker can currently reach BEA or that its route is production-live. The Worker change requires a separate reviewed deployment and live route smoke check.

## Remaining Part 4 work

The BEA feed is one addition to a partial macro calendar. Official CME/ICE product hours, breaks, holidays and early closes; additional relevant global publishers; publisher revision history; live Worker deployment; production route checks; and full browser, mobile, keyboard and assistive-technology review remain outstanding. The feed does not provide licensed futures prices or prove any event's market impact.
