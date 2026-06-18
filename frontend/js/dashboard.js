import { api } from './api.js';

export async function renderDashboard(container) {
  container.innerHTML = '<p class="text-gray-500 text-sm">Loading...</p>';

  try {
    const { data: assets, total } = await api.listAssets();

    const domains = assets.filter((a) => a.type === 'domain').length;
    const ips = assets.filter((a) => a.type === 'ip').length;

    container.innerHTML = `
      <div class="space-y-6">
        <h2 class="text-2xl font-semibold">Dashboard</h2>
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div class="text-3xl font-bold text-blue-400">${total}</div>
            <div class="text-sm text-gray-400 mt-1">Total Assets</div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div class="text-3xl font-bold text-purple-400">${domains}</div>
            <div class="text-sm text-gray-400 mt-1">Domains</div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div class="text-3xl font-bold text-green-400">${ips}</div>
            <div class="text-sm text-gray-400 mt-1">IP Addresses</div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
  }
}
