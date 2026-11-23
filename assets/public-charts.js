(() => {
  const form = document.querySelector('#public-chart-controls');
  if (!form) return;
  const [market, comparison, interval] = ['market', 'comparison', 'interval'].map(name => form.elements[name]);
  const slots = [...document.querySelectorAll('[data-chart-slot]')];
  const status = document.querySelector('#public-chart-status');
  const params = new URLSearchParams(location.search);
  function applySelection(params) {
    const defaults = {market: 'nq', comparison: '', interval: '15'};
    for (const field of [market, comparison, interval]) {
      const value = params.get(field.name);
      field.value = [...field.options].some(option => option.value === value) ? value : defaults[field.name];
    }
  }

  function syncComparison() {
    for (const option of comparison.options) {
      option.disabled = option.value !== '' && option.value === market.value;
    }
    if (comparison.value === market.value) comparison.value = '';
  }

  function update(mount = false) {
    const selected = [market, comparison];
    slots.forEach((slot, i) => {
      const option = selected[i].selectedOptions[0];
      const symbol = option?.dataset.symbol;
      slot.hidden = !symbol;
      const mountPoint = slot.querySelector('[data-chart-mount]');
      mountPoint.replaceChildren();
      if (!symbol) return;
      slot.querySelector('h2').textContent = option.textContent;
      const external = new URL('https://www.tradingview.com/chart/');
      external.search = new URLSearchParams({symbol, interval: interval.value});
      slot.querySelector('a').href = external.href;
      const context = slot.querySelector('[data-chart-context]');
      if (context) context.textContent = [option.dataset.exchange, symbol,
        symbol.endsWith('!') ? 'Continuous series' : 'Provider symbol',
        'TradingView · delay unconfirmed'].filter(Boolean).join(' · ');
      const profile = slot.querySelector('[data-chart-profile]');
      if (profile) profile.href = '/ict-futures/markets/' + encodeURIComponent(option.value) + '.html';
      if (!mount) return;
      const embed = new URL('https://s.tradingview.com/widgetembed/');
      embed.search = new URLSearchParams({
        symbol, interval: interval.value, locale: 'en', style: '1',
        theme: document.body.classList.contains('os-light') ? 'light' : 'dark',
        allow_symbol_change: 'false', enable_publishing: 'false'
      });
      const frame = document.createElement('iframe');
      frame.src = embed.href;
      frame.title = option.textContent + ' TradingView chart';
      frame.loading = 'lazy';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'origin';
      const fallback = document.createElement('p');
      fallback.textContent = 'If the preview is blocked or unavailable, open the direct TradingView chart above.';
      mountPoint.append(frame);
      if (context) mountPoint.append(fallback);
    });
    status.textContent = mount ? 'Provider previews requested. Use the direct links if an embed is unavailable.'
      : 'Direct chart links are ready. Load previews to connect to TradingView.';
  }
  form.addEventListener('change', () => {
    syncComparison();
    const next = new URL(location.href);
    for (const field of [market, comparison, interval]) {
      if (field.value) next.searchParams.set(field.name, field.value);
      else next.searchParams.delete(field.name);
    }
    if (next.href !== location.href) history.pushState(null, '', next);
    update();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    update(true);
  });
  addEventListener('popstate', () => {
    applySelection(new URLSearchParams(location.search));
    syncComparison();
    update();
  });
  applySelection(params);
  syncComparison();
  form.inert = false;
  update();
})();
