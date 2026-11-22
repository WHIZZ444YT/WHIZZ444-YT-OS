(() => {
  const migration = document.getElementById('ict-terminal-routes');
  if (!migration) return;
  const { routes, markets } = JSON.parse(migration.textContent);
  const market = new URLSearchParams(location.search).get('market');
  const recognized = markets.includes(market);
  let fragment;
  try {
    fragment = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (fragment && !Object.hasOwn(routes, fragment)) return;
  if (market !== null && !recognized) return;

  const path = recognized && (!fragment || fragment === 'market-profile')
    ? '/ict-futures/markets/' + market + '.html'
    : routes[fragment || 'desk'];
  const target = new URL(path, location.origin);
  if (target.origin !== location.origin || target.pathname === location.pathname) return;
  if (recognized && ['/charts/', '/markets/', '/futures-intelligence/', '/risk/', '/news/', '/sessions/', '/sources/'].includes(target.pathname)) {
    target.searchParams.set('market', market);
  }
  location.replace(target.href);
})();
