(() => {
  const origin = "https://s3.tradingview.com/external-embedding/";
  const scripts = { chart: "embed-widget-advanced-chart.js", tape: "embed-widget-ticker-tape.js" };
  const theme = () => document.body.classList.contains("os-light") ? "light" : "dark";

  function mount(node, kind, config, title, creditUrl) {
    const container = document.createElement("div");
    container.className = "tradingview-widget-container tv-hosted-" + kind;
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    const credit = document.createElement("div");
    credit.className = "tradingview-widget-copyright";
    const link = document.createElement("a");
    link.href = creditUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer nofollow";
    link.textContent = title + " by TradingView";
    credit.append(link);
    const script = document.createElement("script");
    script.src = origin + scripts[kind];
    script.async = true;
    script.textContent = JSON.stringify(config);
    const state = document.createElement("p");
    state.setAttribute("role", "status");
    state.textContent = "Connecting to TradingView. The direct link remains available.";
    let timer;
    const frameObserver = new MutationObserver(() => {
      const frame = widget.querySelector("iframe");
      if (!frame) return;
      frame.title = title + " · TradingView";
      frameObserver.disconnect();
      clearTimeout(timer);
      state.textContent = "TradingView frame requested. Use the direct link if the symbol or preview is unavailable.";
    });
    const unavailable = () => {
      state.textContent = "Preview unavailable. Open the direct TradingView link.";
    };
    frameObserver.observe(widget, { childList:true, subtree:true });
    script.addEventListener("error", () => {
      clearTimeout(timer);
      frameObserver.disconnect();
      unavailable();
    }, { once:true });
    node.replaceChildren(container, state);
    container.append(widget, credit, script);
    timer = setTimeout(unavailable, 10000);
    return () => {
      clearTimeout(timer);
      frameObserver.disconnect();
      node.replaceChildren();
    };
  }

  function onThemeChange(update) {
    let current = theme();
    new MutationObserver(() => {
      const next = theme();
      if (next !== current) {
        current = next;
        update();
      }
    }).observe(document.body, { attributes:true, attributeFilter:["class"] });
  }

  const tape = document.querySelector("[data-tradingview-tape]");
  if (tape) {
    const button = tape.querySelector("button");
    let dispose;
    const update = () => {
      dispose?.();
      const symbols = JSON.parse(tape.dataset.tradingviewTape);
      dispose = mount(tape.querySelector("[data-tape-mount]"), "tape", {
        symbols, colorTheme:theme(), locale:"en", displayMode:"adaptive", showSymbolLogo:true
      }, "Futures ticker tape", "https://www.tradingview.com/markets/futures/");
    };
    button.addEventListener("click", () => {
      if (dispose) {
        dispose();
        dispose = undefined;
        button.textContent = "Load ticker tape";
      } else {
        update();
        button.textContent = "Hide ticker tape";
      }
    });
    onThemeChange(() => { if (dispose) update(); });
  }

  window.FinanceTradingViewWidgets = Object.freeze({ mount, theme, onThemeChange });
})();
