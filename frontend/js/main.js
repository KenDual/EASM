import { renderAssets } from './assets.js';
import { renderScans } from './scans.js';
import { renderDashboard } from './dashboard.js';

const routes = {
  '/assets': () => renderAssets(document.getElementById('view-assets')),
  '/scans': (params) => renderScans(document.getElementById('view-scans'), params.asset),
  '/dashboard': () => renderDashboard(document.getElementById('view-dashboard')),
};

function parseHash() {
  const hash = window.location.hash.slice(1) || '/assets';
  const [path, query] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  return { path, params };
}

function showView(name) {
  ['assets', 'scans', 'dashboard', 'loading'].forEach((v) => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });
  document.getElementById(`view-${name}`)?.classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('href') === `#/${name}`);
  });
}

async function navigate() {
  const { path, params } = parseHash();
  const viewName = path.replace('/', '') || 'assets';
  const handler = routes[path] || routes['/assets'];

  showView(viewName);
  await handler(params);
}

window.addEventListener('hashchange', navigate);
navigate();
