(() => {
  const root = document.getElementById('public-search');
  if (!root) return;
  const form = root.querySelector('form');
  const field = form.elements.q;
  const status = root.querySelector('[role=status]');
  const results = root.querySelector('[data-results]');
  const records = JSON.parse(root.querySelector('script').textContent);
  const normalize = value => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const searchable = records.map(row => ({...row, terms: normalize([row.title, row.category, row.keywords].join(' '))}));
  function render(query) {
    field.value = query;
    const words = normalize(query).split(' ').filter(Boolean);
    const matches = words.length ? searchable.filter(row => words.every(word => row.terms.includes(word))) : [];
    status.textContent = words.length ? matches.length + ' matches' + (matches.length > 30 ? '. Showing the first 30.' : '.') : '';
    results.replaceChildren(...matches.slice(0, 30).map(row => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = row.path;
      link.textContent = row.title;
      item.append(link, ' · ' + row.category);
      return item;
    }));
  }
  const query = () => new URLSearchParams(location.search).get('q') || '';
  form.hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = new URL(location.href);
    if (field.value.trim()) next.searchParams.set('q', field.value.trim());
    else next.searchParams.delete('q');
    history.pushState(null, '', next);
    render(query());
  });
  addEventListener('popstate', () => render(query()));
  render(query());
})();
