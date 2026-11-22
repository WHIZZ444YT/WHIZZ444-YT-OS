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

  const progress = lab.querySelector('[data-ict-practice-progress]');
  if (progress) {
    function renderProgress() {
      try {
        const prefix = /^ict-lab\.practice\.v1\.(annotation|plan|tests|journal)\./;
        const count = Object.keys(localStorage).filter(key => prefix.test(key)).length;
        progress.textContent = count
          ? count + (count === 1 ? ' saved practice record' : ' saved practice records') + ' in this browser across chart annotation, planning, testing and journal.'
          : 'No saved annotation, plan, test or journal records in this browser yet.';
      } catch (_) { /* Keep the written storage guidance visible. */ }
    }
    renderProgress();
    addEventListener('pageshow', renderProgress);
    addEventListener('storage', renderProgress);
  }
  const form = lab.querySelector('[data-ict-search]');
  if (!form) return;
  const field = form.elements.q;
  const status = lab.querySelector('[data-ict-search-status]');
  const filter = lab.querySelector('[data-ict-filter]');
  const evidence = lab.querySelector('[data-ict-evidence]');
  const normalize = input => input.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').trim();
  const cards = [...lab.querySelectorAll('[data-ict-item]')];
  function apply() {
    const tokens = normalize(field.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const text = normalize(card.textContent + ' ' + (card.dataset.search || ''));
      card.hidden = !tokens.every(token => text.includes(token)) || Boolean(filter?.value && card.dataset.category !== filter.value)
        || Boolean(evidence?.value && !card.dataset.evidence?.split(' / ').includes(evidence.value));
      if (!card.hidden) visible++;
    }
    for (const group of lab.querySelectorAll('[data-ict-group]')) {
      group.hidden = !group.querySelector('[data-ict-item]:not([hidden])');
    }
    status.hidden = !tokens.length && !filter?.value && !evidence?.value;
    status.textContent = visible ? visible + ' matching items.' : 'No matches. Try another topic or ID.';
  }
  field.value = params.get('q') || '';
  form.hidden = false;
  if (filter) filter.closest('[data-ict-filter-wrap]').hidden = false;
  const readEvidence = query => {
    if (evidence) evidence.value = [...evidence.options].some(option => option.value === query.get('evidence')) ? query.get('evidence') : '';
  };
  readEvidence(params);
  if (evidence) evidence.closest('[data-ict-evidence-wrap]').hidden = false;
  evidence?.addEventListener('change', () => {
    const next = new URL(location.href);
    if (evidence.value) next.searchParams.set('evidence', evidence.value);
    else next.searchParams.delete('evidence');
    history.pushState(null, '', next);
    apply();
  });
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
    readEvidence(next);
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
