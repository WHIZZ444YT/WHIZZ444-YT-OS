(() => {
  const base = String(window.FINANCE_OS_CONFIG?.apiBase || "").replace(/\/$/, "");
  const rows = document.querySelectorAll("[data-setup-provider]");
  const messages = new Map([
    ["configured", "Key configured in this Worker. Check retrieval results in Data Health."],
    ["anonymous", "Optional key absent. This Worker uses anonymous BLS v1 access."],
    ["missing", "Key missing from this Worker."],
    ["rejected", "The provider rejected the credential on the last recorded attempt."],
    ["reference-only", "Reference only. Approve the FRED series before activating retrieval."]
  ]);
  const unavailable = "Gateway credential status unavailable.";
  const write = (row, message) => { row.querySelector("[data-credential-status]").textContent = message; };

  if (!base) {
    rows.forEach(row => write(row, "API gateway is not configured for this environment."));
    return;
  }

  fetch(base + "/api/v1/providers?view=setup", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  }).then(async response => {
    if (!response.ok) throw new Error(unavailable);
    const data = await response.json();
    const providers = Array.isArray(data.providers) ? data.providers : [];
    for (const row of rows) {
      const provider = providers.find(item => item?.id === row.dataset.setupProvider);
      write(row, messages.get(provider?.status) || unavailable);
    }
  }).catch(() => rows.forEach(row => write(row, unavailable)));
})();
