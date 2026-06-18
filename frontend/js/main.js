import { renderOverview } from './overview.js';
import { renderAssets, openCreateAssetModal, teardownAssets } from './assets.js';
import { renderJobs, teardownJobs } from './jobs.js';
import { openAssetDrawer } from './asset-drawer.js';
import { loadAssets, getState, subscribe } from './state.js';
import { Drawer, Modal, icon } from './ui.js';
import { api } from './api.js';

// ---------- Routes ----------
const ROUTES = {
  '/overview': { label: 'Overview', icon: 'overview', view: 'overview', render: renderOverview, teardown: null },
  '/assets':   { label: 'Assets',   icon: 'assets',   view: 'assets',   render: renderAssets,   teardown: teardownAssets },
  '/jobs':     { label: 'Jobs',     icon: 'jobs',     view: 'jobs',     render: renderJobs,     teardown: teardownJobs },
};
const DEFAULT_ROUTE = '/overview';

let currentRoute = null;

function parseHash() {
  const hash = window.location.hash.slice(1) || DEFAULT_ROUTE;
  const [path, query] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  return { path, params };
}

function showView(viewName) {
  ['overview', 'assets', 'jobs', 'loading'].forEach((v) => {
    document.getElementById(`view-${v}`)?.classList.add('hidden');
  });
  document.getElementById(`view-${viewName}`)?.classList.remove('hidden');
}

function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  nav.innerHTML = Object.entries(ROUTES).map(([path, r]) => `
    <a href="#${path}" class="nav-link" data-path="${path}">
      ${icon(r.icon, { size: 14 })}
      <span>${r.label}</span>
    </a>
  `).join('');
}

function updateActiveNav(path) {
  document.querySelectorAll('.nav-link').forEach((el) => {
    el.classList.toggle('active', el.dataset.path === path);
  });
}

function renderBreadcrumb(path) {
  const r = ROUTES[path];
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  bc.innerHTML = `
    <span class="text-fg-muted">Mini EASM</span>
    <span class="text-fg-muted">/</span>
    <span class="text-fg font-medium">${r?.label || 'Unknown'}</span>
  `;
}

async function navigate() {
  const { path, params } = parseHash();
  const route = ROUTES[path] || ROUTES[DEFAULT_ROUTE];
  const targetPath = ROUTES[path] ? path : DEFAULT_ROUTE;

  if (currentRoute && currentRoute !== route) {
    try { currentRoute.teardown?.(); } catch (e) { console.error(e); }
  }
  currentRoute = route;

  document.getElementById('view-loading')?.classList.add('hidden');
  showView(route.view);
  updateActiveNav(targetPath);
  renderBreadcrumb(targetPath);

  await route.render(document.getElementById(`view-${route.view}`), params);

  if (params.asset) openAssetDrawer(params.asset);
}

// ---------- API status indicator ----------
async function checkApi() {
  try {
    await api.listAssets(1);
    setApiStatus(true);
  } catch {
    setApiStatus(false);
  }
}
function setApiStatus(ok) {
  const dot = document.getElementById('api-status-dot');
  const label = document.getElementById('api-status-label');
  if (dot) dot.style.backgroundColor = ok ? 'var(--c-success)' : 'var(--c-danger)';
  if (label) label.textContent = ok ? 'connected' : 'offline';
}

// ---------- Active jobs indicator in topbar ----------
function updateActiveJobsIndicator() {
  const ind = document.getElementById('active-jobs-indicator');
  const count = document.getElementById('active-jobs-count');
  if (!ind || !count) return;
  const n = getState().activeJobs.size;
  count.textContent = n;
  ind.classList.toggle('hidden', n === 0);
  ind.classList.toggle('flex', n > 0);
}

// ---------- Keyboard shortcuts ----------
function wireShortcuts() {
  window.addEventListener('keydown', (e) => {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (isTyping && e.key !== 'Escape') return;
    if (Modal.isOpen() || Drawer.isOpen()) return;

    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openCreateAssetModal();
    }
  });
}

// ---------- Init ----------
function init() {
  renderNav();
  wireShortcuts();
  document.getElementById('new-asset-btn')?.addEventListener('click', openCreateAssetModal);
  document.getElementById('mobile-nav-btn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('flex');
    sidebar.classList.toggle('absolute');
    sidebar.classList.toggle('z-40');
    sidebar.classList.toggle('h-full');
  });

  subscribe(updateActiveJobsIndicator);
  window.addEventListener('hashchange', navigate);

  checkApi();
  setInterval(checkApi, 30000);
  navigate();
}

init();
