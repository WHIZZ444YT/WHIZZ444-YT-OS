(() => {
  const lab = document.querySelector('[data-ict-view]');
  if (!lab) return;

  const params = new URLSearchParams(location.search);
  const legacy = document.getElementById('ict-legacy-details');
  if (legacy && (params.has('view') || params.has('id') || params.has('q'))) {
    const details = JSON.parse(legacy.textContent);
    const requested = params.get('view') || 'learn';
    if (!Object.hasOwn(details, requested)) return;
    const id = params.get('id') || '';
    const key = requested === 'podcasts' ? id : id.toUpperCase();
    const entries = details[requested];
    const path = Object.hasOwn(entries, key) ? entries[key] : '/ict-lab/' + requested + '/';
    const next = new URL(path, location.origin);
    if (params.get('q')) next.searchParams.set('q', params.get('q'));
    location.replace(next.href);
    return;
  }

  const form = lab.querySelector('[data-ict-search]');
  if (!form) return;
  const field = form.elements.q;
  const status = lab.querySelector('[data-ict-search-status]');
  const filter = lab.querySelector('[data-ict-filter]');
  const normalize = input => input.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').trim();
  const cards = [...lab.querySelectorAll('[data-ict-item]')];
  function apply() {
    const tokens = normalize(field.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const text = normalize(card.textContent + ' ' + (card.dataset.search || ''));
      card.hidden = !tokens.every(token => text.includes(token)) || Boolean(filter?.value && card.dataset.category !== filter.value);
      if (!card.hidden) visible++;
    }
    for (const group of lab.querySelectorAll('[data-ict-group]')) {
      group.hidden = !group.querySelector('[data-ict-item]:not([hidden])');
    }
    status.hidden = !tokens.length && !filter?.value;
    status.textContent = visible ? visible + ' matching items.' : 'No matches. Try another topic or ID.';
  }
  field.value = params.get('q') || '';
  form.hidden = false;
  if (filter) filter.closest('[data-ict-filter-wrap]').hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = new URL(location.href);
    if (field.value.trim()) next.searchParams.set('q', field.value.trim());
    else next.searchParams.delete('q');
    history.pushState(null, '', next);
    apply();
  });
  addEventListener('popstate', () => {
    const next = new URLSearchParams(location.search);
    field.value = next.get('q') || '';
    if (filter) filter.value = [...filter.options].some(option => option.value === next.get('format')) ? next.get('format') : '';
    apply();
  });
  if (filter && [...filter.options].some(option => option.value === params.get('format'))) filter.value = params.get('format');
  filter?.addEventListener('change', () => {
    const next = new URL(location.href);
    if (filter.value) next.searchParams.set('format', filter.value);
    else next.searchParams.delete('format');
    history.pushState(null, '', next);
    apply();
  });
  apply();
})();
