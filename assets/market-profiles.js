(() => {
  const root = document.querySelector('[data-market-profiles]');
  if (!root) return;
  const form = root.querySelector('form');
  const { q, tier } = form.elements;
  const cards = [...root.querySelectorAll('[data-market-profile]')];
  const status = root.querySelector('[role=status]');
  const preset = new URLSearchParams(location.search).get('market');
  const matching = cards.find(card => card.dataset.marketProfile === preset);
  if (matching) q.value = preset.toUpperCase();
  function update() {
    const query = q.value.trim().toLowerCase();
    for (const card of cards) {
      card.hidden = Boolean(tier.value && tier.value !== card.dataset.tier)
        || Boolean(query && !card.textContent.toLowerCase().includes(query)
          && card.dataset.marketProfile !== query);
    }
    status.textContent = cards.filter(card => !card.hidden).length + ' matching contract profiles';
  }
  form.hidden = false;
  form.addEventListener('input', update);
  form.addEventListener('submit', event => { event.preventDefault(); update(); });
  update();
})();
