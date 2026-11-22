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
      mountPoint.append(frame);
    });
    status.textContent = mount ? 'Provider previews requested. Use the direct links if an embed is unavailable.'
      : 'Direct chart links are ready. Load previews to connect to TradingView.';
  }
  form.addEventListener('change', () => {
    const next = new URL(location.href);
    next.search = new URLSearchParams(new FormData(form));
    history.pushState(null, '', next);
    update();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    update(true);
  });
  addEventListener('popstate', () => {
    applySelection(new URLSearchParams(location.search));
    update();
  });
  applySelection(params);
  form.inert = false;
  update();
})();
