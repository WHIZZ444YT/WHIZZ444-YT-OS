(() => {
  const root = document.querySelector('#social-discovery');
  if (!root) return;
  const { methods, platforms } = JSON.parse(root.querySelector('script').textContent);
  const form = root.querySelector('form');
  const { market, method } = form.elements;
  const preset = new URLSearchParams(location.search).get('market');
  if ([...market.options].some(option => option.value === preset)) market.value = preset;
  function update() {
    const selected = market.selectedOptions[0];
    const research = methods.find(row => row.id === method.value);
    if (!selected || !research) return;
    const search = encodeURIComponent(selected.textContent + ' ' + research.terms);
    const rows = platforms.map(platform => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const symbol = selected.dataset.symbol.replace(':', '-').replace(/!$/, '');
      link.href = platform.id === 'tradingview' ? platform.base + encodeURIComponent(symbol) + '/ideas/' : platform.base + search;
      link.textContent = platform.label;
      item.append(link);
      return item;
    });
    root.querySelector('[data-social-links]').replaceChildren(...rows);
  }
  form.hidden = false;
  form.addEventListener('change', update);
  update();
})();
