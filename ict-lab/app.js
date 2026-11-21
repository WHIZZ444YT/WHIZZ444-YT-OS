(() => {
  const views = ['Learn','Playbooks','Practice','Podcasts','Mentors'];
  const params = new URLSearchParams(location.search);
  const selected = views.find(v => v.toLowerCase() === params.get('view')) || 'Learn';
  const view = selected.toLowerCase();
  const query = params.get('q') || '';
  document.title = selected + ' | ICT Lab | Futures Intelligence OS';
  for (const title of views) {
    const link = document.createElement('a');
    link.href = '?view=' + title.toLowerCase();
    link.textContent = title;
    if (title === selected) link.setAttribute('aria-current','page');
    document.querySelector('#views').append(link);
  }
  document.querySelector('#section').value = view;
  document.querySelector('#search').value = query;
  const root = document.querySelector('#lesson');
  const render = window['render' + selected];
  if (render) render(root, params.get('id') || '', query);
  else root.textContent = 'This section could not load. Refresh to try again.';
})();