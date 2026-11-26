(() => {
  const config = window.FINANCE_OS_CONFIG || {};
  const base = String(config.apiBase || "").replace(/\/$/, "");
  const rows = document.querySelectorAll("[data-credential]");
  const write = (row, message) => { row.querySelector("[data-credential-status]").textContent = message; };

  if (!base) {
    rows.forEach(row => write(row, "API gateway is not configured for this environment."));
    return;
  }

  fetch(base + "/api/v1/economic/providers", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store"
  }).then(async response => {
    if (!response.ok) throw new Error("Provider status unavailable");
    const data = await response.json();
    const providers = Array.isArray(data.providers) ? data.providers : [];
    for (const row of rows) {
      const provider = providers.find(item => item.credential === row.dataset.credential);
      const configured = row.dataset.credential === "BLS_API_KEY"
        ? data.optionalCredentials?.BLS_API_KEY : provider?.credentialConfigured;
      if (provider?.state?.credentialStatus === "rejected") {
        write(row, "Upstream rejected the credential on the last attempt.");
      } else if (configured === true) {
        write(row, "Configured in the Worker. See Data Health for retrieval results.");
      } else if (configured === false) {
        write(row, row.dataset.credential === "BLS_API_KEY"
          ? "Optional key not configured. Anonymous BLS access is available."
          : "Key not configured.");
      } else {
        write(row, "Gateway credential status unavailable.");
      }
    }
  }).catch(() => rows.forEach(row => write(row, "Gateway credential status unavailable.")));
})();
