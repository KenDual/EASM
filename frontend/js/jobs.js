import { api } from './api.js';
import { icon, statusBadge, escapeHtml, fmtRelative, fmtDuration, Toast } from './ui.js';
import { getState, loadAssets, subscribe } from './state.js';
import { openAssetDrawer } from './asset-drawer.js';

let viewEl = null;
let jobs = [];
let loading = false;
let unsubscribe = null;
let filter = { status: 'all', type: 'all', q: '' };

export async function renderJobs(container) {
  viewEl = container;
  container.innerHTML = `
    <div class="px-4 md:px-6 py-5 space-y-4">
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-lg font-semibold tracking-tight">Scan jobs</h1>
          <p class="text-xs text-fg-muted mt-0.5">Every scan ever queued, newest first.</p>
        </div>
        <button id="jobs-refresh" class="btn btn-secondary btn-sm">${icon('refresh', { size: 13 })} Refresh</button>
      </div>

      <div class="panel">
        <div class="px-3 py-2.5 border-b border-line flex items-center gap-2 flex-wrap">
          <div class="relative flex-1 min-w-48">
            ${icon('search', { size: 13, class: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted' })}
            <input id="jobs-q" type="text" placeholder="Filter by asset name…" class="field" style="padding-left: 1.875rem;" />
          </div>
          <select id="jobs-status" class="field" style="width:auto">
            <option value="all">All statuses</option>
            <option value="pending">pending</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="partial">partial</option>
            <option value="failed">failed</option>
          </select>
          <select id="jobs-type" class="field" style="width:auto">
            <option value="all">All scan types</option>
            ${['all','dns','whois','subdomain','cert_trans','asn','ip','port','ssl','tech'].map((t) => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <div class="text-xs text-fg-muted ml-auto" id="jobs-count"></div>
        </div>
        <div id="jobs-table-wrap"></div>
      </div>
    </div>
  `;

  container.querySelector('#jobs-refresh').addEventListener('click', () => load(true));
  container.querySelector('#jobs-q').addEventListener('input', (e) => { filter.q = e.target.value.trim(); renderTable(); });
  container.querySelector('#jobs-status').addEventListener('change', (e) => { filter.status = e.target.value; renderTable(); });
  container.querySelector('#jobs-type').addEventListener('change', (e) => { filter.type = e.target.value; renderTable(); });

  unsubscribe?.();
  unsubscribe = subscribe(() => renderTable());

  await load();
}

export function teardownJobs() {
  unsubscribe?.();
  unsubscribe = null;
}

async function load(force = false) {
  loading = true;
  renderTable();
  try {
    await loadAssets({ force });
    const { assets } = getState();
    const all = await Promise.all(
      assets.map((a) => api.getAssetScans(a.id).then((rows) => rows.map((r) => ({ ...r, _asset: a }))).catch(() => []))
    );
    jobs = all.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    Toast.error(err.message);
  } finally {
    loading = false;
    renderTable();
  }
}

function getFiltered() {
  return jobs.filter((j) => {
    if (filter.status !== 'all' && j.status !== filter.status) return false;
    if (filter.type !== 'all' && j.scan_type !== filter.type) return false;
    if (filter.q && !(j._asset?.name || '').toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  });
}

function renderTable() {
  if (!viewEl) return;
  const wrap = viewEl.querySelector('#jobs-table-wrap');
  const countEl = viewEl.querySelector('#jobs-count');
  if (!wrap) return;
  const { activeJobs } = getState();
  const list = getFiltered();
  countEl.textContent = loading ? 'loading…' : `${list.length} of ${jobs.length}`;

  if (loading && jobs.length === 0) {
    wrap.innerHTML = `<div class="p-4 space-y-2">
      ${Array.from({ length: 6 }).map(() => '<div class="skeleton h-9 w-full"></div>').join('')}
    </div>`;
    return;
  }
  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-state">${icon('jobs', { size: 28 })}<p>${jobs.length === 0 ? 'No scan jobs yet.' : 'No jobs match your filters.'}</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="overflow-x-auto"><table class="data-table">
      <thead><tr>
        <th>Asset</th><th>Type</th><th>Status</th><th>Duration</th><th>Started</th><th>Job</th>
      </tr></thead>
      <tbody>
        ${list.map((j) => {
          const isActive = activeJobs.has(j.id) || j.status === 'pending' || j.status === 'running';
          return `
            <tr class="clickable" data-asset="${j.asset_id}">
              <td>
                <div class="flex items-center gap-2">
                  <span class="font-medium">${escapeHtml(j._asset?.name || j.asset_id.slice(0, 8))}</span>
                  ${j._asset ? `<span class="badge badge-neutral">${escapeHtml(j._asset.type)}</span>` : ''}
                </div>
              </td>
              <td><span class="badge badge-neutral">${escapeHtml(j.scan_type)}</span></td>
              <td>${isActive ? `<span class="badge badge-info"><span class="spinner" style="width:9px;height:9px;border-width:1.5px"></span>${escapeHtml(j.status)}</span>` : statusBadge(j.status)}</td>
              <td class="mono text-fg-secondary">${fmtDuration(j.started_at, j.ended_at)}</td>
              <td class="mono text-fg-secondary" data-relative-time="${j.created_at}">${fmtRelative(j.created_at)}</td>
              <td class="mono text-fg-muted text-xs">${escapeHtml(j.id.slice(0, 8))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table></div>
  `;

  wrap.querySelectorAll('tbody tr').forEach((row) => {
    row.addEventListener('click', () => openAssetDrawer(row.dataset.asset, { tab: 'history' }));
  });
}
