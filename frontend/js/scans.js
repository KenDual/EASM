import { api } from './api.js';

const SCAN_TYPES = ['dns', 'whois', 'subdomain', 'cert_trans', 'asn', 'ip', 'port', 'ssl', 'tech', 'all'];

export async function renderScans(container, assetId) {
  let assets = [];
  try {
    const { data } = await api.listAssets();
    assets = data;
  } catch {}

  const selected = assetId || (assets[0]?.id ?? '');

  container.innerHTML = `
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold">Scans</h2>

      <div class="bg-gray-900 rounded-lg p-4 border border-gray-800 flex gap-3 items-end flex-wrap">
        <div class="flex-1 min-w-40">
          <label class="text-xs text-gray-400 block mb-1">Asset</label>
          <select id="scan-asset" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            ${assets.map((a) => `<option value="${a.id}" ${a.id === selected ? 'selected' : ''}>${a.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">Scan Type</label>
          <select id="scan-type" class="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            ${SCAN_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <button id="start-scan-btn"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors">
          Start Scan
        </button>
      </div>

      <div id="scan-result-area"></div>
    </div>
  `;

  container.querySelector('#start-scan-btn').addEventListener('click', async () => {
    const assetId = container.querySelector('#scan-asset').value;
    const scanType = container.querySelector('#scan-type').value;
    const area = container.querySelector('#scan-result-area');

    if (!assetId) return;

    try {
      const job = await api.startScan(assetId, scanType);
      area.innerHTML = `<p class="text-sm text-gray-400">Job <code>${job.id}</code> started. Polling...</p>`;
      pollJob(job.id, area);
    } catch (err) {
      area.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
    }
  });
}

async function pollJob(jobId, container) {
  const interval = setInterval(async () => {
    try {
      const job = await api.getJob(jobId);
      if (job.status === 'pending' || job.status === 'running') {
        container.innerHTML = `<p class="text-sm text-gray-400">Status: <span class="text-yellow-400">${job.status}</span>...</p>`;
        return;
      }

      clearInterval(interval);

      if (job.status === 'failed') {
        container.innerHTML = `<p class="text-red-400 text-sm">Scan failed: ${job.error}</p>`;
        return;
      }

      const results = await api.getJobResults(jobId);
      renderResults(container, job, results);
    } catch (err) {
      clearInterval(interval);
      container.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
    }
  }, 2000);
}

function renderResults(container, job, results) {
  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-400">Job ${job.id}</span>
        <span class="text-xs px-2 py-0.5 rounded ${job.status === 'completed' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}">${job.status}</span>
      </div>
      ${results.map((r) => `
        <div class="bg-gray-900 rounded-lg border border-gray-800">
          <div class="px-4 py-2 border-b border-gray-800 text-xs font-medium text-gray-400 uppercase">${r.scan_type}</div>
          <div class="p-4"><pre class="json-output">${JSON.stringify(r.data, null, 2)}</pre></div>
        </div>
      `).join('')}
    </div>
  `;
}
