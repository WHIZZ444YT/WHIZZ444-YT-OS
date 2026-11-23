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
    status.textContent = !words.length ? 'Enter a topic or browse the public pages below.'
      : !matches.length ? 'No results. Try a symbol, lesson alias or tool name.'
      : matches.length + (matches.length === 1 ? ' result.' : ' results.') + (matches.length > 30 ? ' Showing the first 30.' : '');
    const groups = new Map(['Markets', 'Lessons', 'Tools', 'Sources'].map(name => [name, []]));
    for (const row of matches.slice(0, 30)) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = row.path;
      link.textContent = row.title;
      item.append(link, ' · ' + row.category);
      if (row.practicePath) {
        const practice = document.createElement('a');
        practice.href = row.practicePath;
        practice.textContent = 'Open Lab exercise';
        item.append(' · ', practice);
      }
      const group = row.category === 'Contract profile' ? 'Markets'
        : row.category === 'Practice' ? 'Tools' : groups.has(row.category) ? row.category : 'Lessons';
      groups.get(group).push(item);
    }
    results.replaceChildren(...[...groups].filter(([, items]) => items.length).map(([group, items]) => {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = group;
      const list = document.createElement('ul');
      list.append(...items);
      section.append(heading, list);
      return section;
    }));
  }
  const query = () => new URLSearchParams(location.search).get('q') || '';
  form.hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = new URL(location.href);
    if (field.value.trim()) next.searchParams.set('q', field.value.trim());
    else next.searchParams.delete('q');
    if (next.href !== location.href) history.pushState(null, '', next);
    render(query());
  });
  root.querySelector('[data-clear-search]').addEventListener('click', () => {
    field.value = '';
    form.requestSubmit();
    field.focus();
  });
  addEventListener('popstate', () => render(query()));
  render(query());
})();
