(() => {
 const presentation = window.FinanceProviderPresentation;
 const config = window.FINANCE_OS_CONFIG || {};
 const api = String(config.apiBase || window.FINANCE_OS_API_BASE || "").replace(/\/$/, "");
 const element = id => document.getElementById(id);
 const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
 }[character]));
 const hiddenProviders = new Set(["builder-admin", "builder-content", "supabase", "kalshi", "polymarket"]);
 const labels = {
  fresh: "Fresh snapshot", partial: "Partial snapshot", stale: "Stale snapshot",
  empty: "No observations", unavailable: "Unavailable", denied: "Access denied",
  limited: "Rate limited", "not-configured": "Not configured", "not-yet-fetched": "Not fetched",
  "available-on-demand": "Available on request", "official-source-link": "Official link",
  "reference-only": "Official link", "hosted-display-only": "Hosted display", excluded: "Excluded",
  configured: "Configured", blocked: "Blocked", unknown: "Unknown"
 };
 const safeUrl = value => {
  try {
   const url = new URL(value);
   return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
   return null;
  }
 };
 async function request(path) {
  const response = await fetch(api + path, {
   headers: {Accept: "application/json"}, signal: AbortSignal.timeout(18000), cache: "no-store"
  });
  if (!response.ok) throw Object.assign(new Error("Gateway request failed"), {status: response.status});
  return response.json();
 }
 function label(value) {
  return Object.hasOwn(labels, value) ? labels[value] : labels.unknown;
 }
 function card(row) {
  const {status, configuration, authorization, freshness, attemptAt, outcome, successAt, asOf} = row.health;
  const tone = ["fresh", "partial"].includes(freshness) ? "good"
   : ["denied", "limited", "unavailable", "blocked"].includes(status) ? "bad" : "warn";
  const sourceUrl = safeUrl(row.source?.sourceUrl);
  const termsUrl = safeUrl(row.source?.termsUrl);
  const fields = [
   ["Access", row.access], ["Configuration", configuration], ["Authorization", authorization],
   ["Freshness", label(freshness)], ["Data as of", presentation.timestamp(asOf)],
   ["Last successful fetch", presentation.timestamp(successAt)],
   ["Last upstream attempt", presentation.timestamp(attemptAt)], ["Attempt outcome", outcome]
  ];
  return `<article class="health-card" id="provider-${escape(row.id)}">
   <div class="health-card-head"><h3>${escape(row.title)}</h3><span class="status-pill ${tone}">${label(status)}</span></div>
   ${row.dataset ? `<p>${escape(row.dataset)}</p>` : ""}
   <dl>${fields.map(([name, value]) => `<div class="health-meta"><dt>${name}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>
   <p>${sourceUrl ? `<a href="${escape(sourceUrl)}">Source · ${escape(row.source.attribution || row.source.label)}</a>` : ""}
   ${termsUrl ? ` · <a href="${escape(termsUrl)}">Terms</a>` : ""}</p></article>`;
 }
 function rows(registration, economic, market) {
  const registry = registration?.registry;
  const sources = new Map((registry?.sources || []).map(source => [source.id, source]));
  const interfaces = new Map((registry?.interfaces || []).map(item => [item.id, item]));
  const economics = new Map((economic?.providers || []).map(item => [item.id, item]));
  const output = new Map();
  for (const provider of registration?.providers || []) {
   if (hiddenProviders.has(provider.id) || provider.id === "licensed-futures-market-data") continue;
   if (provider.id === "cme-rss" && sources.has("cme")) continue;
   const mapping = interfaces.get(provider.id);
   const source = sources.get(mapping?.providerId);
   const schedule = mapping?.type === "publisher-schedule";
   const id = schedule ? provider.id : source?.id || provider.id;
   const economicStatus = schedule ? null : economics.get(id === "treasury" ? "us_treasury" : id);
   const state = economicStatus?.state || provider.state;
   const economicDataset = typeof state?.datasetId === "string" ? state.datasetId : null;
   output.set(id, {
    id, title: schedule ? provider.label : source?.label || provider.label,
    dataset: schedule ? "Official publisher schedule" : economicDataset || source?.dataset,
    access: provider.access?.replaceAll("-", " ") || "Unknown", source,
    health: presentation.healthState(state, {
     decision: source?.decision, credentialConfigured: economicStatus?.credential ? economicStatus.credentialConfigured : undefined,
     ttlSeconds: economicStatus?.ttlSeconds
    })
   });
  }
  for (const source of sources.values()) {
   if (output.has(source.id)) continue;
   output.set(source.id, {
    id: source.id, title: source.label, dataset: source.dataset, source,
    access: source.access?.replaceAll("-", " ") || "Unknown",
    health: presentation.healthState(null, {decision: source.decision})
   });
  }
  for (const item of economics.values()) {
   const id = item.id === "us_treasury" ? "treasury" : item.id;
   if (output.has(id)) continue;
   output.set(id, {
    id, title: item.label, dataset: item.state?.datasetId,
    access: item.credential ? "Registered API" : "Public API",
    health: presentation.healthState(item.state, {
     credentialConfigured: item.credential ? item.credentialConfigured : undefined, ttlSeconds: item.ttlSeconds
    })
   });
  }
  const exchangeSource = sources.get("cme") || {sourceUrl: "https://www.cmegroup.com/market-data.html", label: "CME Group"};
  output.set("licensed-futures-market-data", {
   id: "licensed-futures-market-data", title: "Licensed CME / ICE market data",
   dataset: "Exchange prices, quotes and bars", access: "Licensed entitlement required", source: exchangeSource,
   health: presentation.healthState(market, {decision: market?.status === "not-configured" ? "entitlement-missing" : null})
  });
  return [...output.values()];
 }
 async function refresh() {
  const headline = element("healthHeadline");
  const meta = element("healthLatency");
  const grid = element("healthGrid");
  const button = element("healthRefresh");
  if (!api) {
   headline.textContent = "Gateway not configured";
   meta.textContent = "Official links remain available.";
   element("healthUpdated").textContent = "Dataset health is unavailable in this deployment.";
   grid.textContent = "Set the public Worker URL to enable dataset status.";
   button.disabled = true;
   return;
  }
  button.disabled = true;
  headline.textContent = "Checking gateway…";
  try {
   const results = await Promise.allSettled([
    request("/health"), request("/api/v1/providers"),
    request("/api/v1/economic/providers"), request("/api/v1/market-data/status")
   ]);
   const [edge, registration, economic, market] = results.map(result =>
    result.status === "fulfilled" ? result.value : null);
   headline.textContent = edge?.ok ? "Gateway responding" : "Gateway health unavailable";
   meta.textContent = edge?.ok ? "The gateway responded to its health check." : "Browse the source directory for publisher links.";
   const registryStatus = element("providerRegistryStatus");
   registryStatus.textContent = registration
    ? `Registry loaded.${economic ? "" : " Economic configuration status unavailable."}${market ? "" : " Exchange status unavailable."}`
    : "Provider registry unavailable. Use the official source directory.";
   const datasets = rows(registration, economic, market);
   grid.innerHTML = datasets.map(card).join("");
   const snapshots = datasets.filter(row => ["fresh", "partial"].includes(row.health.freshness)).length;
   element("healthUpdated").textContent = `${snapshots} of ${datasets.length} datasets report a fresh or partial snapshot. Gateway availability and upstream attempts are checked independently.`;
  } catch {
   headline.textContent = "Health check unavailable";
   meta.textContent = "Browse the source directory for publisher links.";
   grid.textContent = "Provider status could not be displayed.";
  } finally {
   button.disabled = false;
  }
 }
 element("healthRefresh").addEventListener("click", refresh);
 refresh();
})();
