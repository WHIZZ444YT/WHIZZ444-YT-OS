"""Shared public market context, built from rights-filtered reference data."""


def build_market_context(registry, lifecycle):
    products = {row["marketId"]: row for row in lifecycle.get("products", [])}
    families = {}
    for market in registry["markets"]:
        product = products.get(market["id"], {})
        chart = market.get("chart")
        families[market["id"]] = {
            "family": market["id"],
            "exchange": market["exchange"],
            "providerSymbol": chart,
            "series": "continuous" if chart and chart.endswith("!") else "provider-symbol" if chart else None,
            "chartProvider": "TradingView" if chart else None,
            "delaySeconds": None,
            "reference": {"source": market.get("specsUrl"), "registryGeneratedAt": registry.get("generatedAt")},
            "lifecycle": {
                "status": "authorized-snapshot" if product.get("contractMonths") else "unavailable",
                "asOf": lifecycle.get("cmeSourceBusinessDate") if product.get("contractMonths") else None,
                "href": "/contract-specs/",
            },
        }
    return {"schemaVersion": 1, "families": families}


def market_context_text(context):
    series = {"continuous": "continuous series", "provider-symbol": "provider symbol"}.get(context["series"])
    chart = (f'{context["chartProvider"]} {context["providerSymbol"]} ({series}); delay unconfirmed'
             if series else "chart symbol unavailable")
    lifecycle = context["lifecycle"]
    expiry = ("expiry snapshot " + (lifecycle["asOf"] or "date unavailable")
              if lifecycle["status"] == "authorized-snapshot" else "listed expiry unavailable")
    return f'{context["exchange"]} · {chart} · {expiry}'
