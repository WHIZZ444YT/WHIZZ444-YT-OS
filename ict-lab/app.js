(() => {
  const views = [...document.querySelectorAll('#views a')];
  const params = new URLSearchParams(location.search);
  const selected = views.find(link => link.dataset.view === params.get('view')) || views[0];
  const view = selected.dataset.view;
  const query = params.get('q') || '';
  const title = selected.textContent;
  document.title = title + ' | ICT Lab | Futures Intelligence OS';
  selected.setAttribute('aria-current', 'page');
  document.querySelector('#section').value = view;
  document.querySelector('#search').value = query;
  const root = document.querySelector('#lesson');
  const render = window['render' + title];
  if (render) {
    document.querySelector('#lab-search').hidden = false;
    render(root, params.get('id') || '', query);
  }
})();
