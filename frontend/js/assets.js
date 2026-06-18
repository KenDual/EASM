import { api } from './api.js';

export async function renderAssets(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">Assets</h2>
      </div>

      <form id="create-asset-form" class="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 class="text-sm font-medium text-gray-400 mb-3">Add Asset</h3>
        <div class="flex gap-3">
          <input id="asset-name" type="text" placeholder="example.com or 1.2.3.4"
            class="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          <select id="asset-type"
            class="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="domain">Domain</option>
            <option value="ip">IP</option>
          </select>
          <button type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors">
            Add
          </button>
        </div>
        <p id="create-error" class="text-red-400 text-xs mt-2 hidden"></p>
      </form>

      <div id="assets-table-wrap"></div>
    </div>
  `;

  const form = container.querySelector('#create-asset-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = container.querySelector('#asset-name').value.trim();
    const type = container.querySelector('#asset-type').value;
    const errEl = container.querySelector('#create-error');
    try {
      await api.createAsset({ name, type });
      container.querySelector('#asset-name').value = '';
      errEl.classList.add('hidden');
      loadTable();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  async function loadTable() {
    const wrap = container.querySelector('#assets-table-wrap');
    wrap.innerHTML = '<p class="text-gray-500 text-sm">Loading...</p>';
    try {
      const { data: assets } = await api.listAssets();
      if (!assets.length) {
        wrap.innerHTML = '<p class="text-gray-600 text-sm">No assets yet.</p>';
        return;
      }
      wrap.innerHTML = `
        <table class="w-full text-sm">
          <thead class="text-gray-500 border-b border-gray-800">
            <tr>
              <th class="text-left py-2">Name</th>
              <th class="text-left py-2">Type</th>
              <th class="text-left py-2">Status</th>
              <th class="text-left py-2">Created</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            ${assets.map((a) => `
              <tr class="border-b border-gray-800/50 hover:bg-gray-900/50">
                <td class="py-2">
                  <a href="#/scans?asset=${a.id}" class="text-blue-400 hover:underline">${a.name}</a>
                </td>
                <td class="py-2"><span class="text-xs px-2 py-0.5 rounded bg-gray-800">${a.type}</span></td>
                <td class="py-2"><span class="text-xs px-2 py-0.5 rounded ${a.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}">${a.status}</span></td>
                <td class="py-2 text-gray-500">${new Date(a.created_at).toLocaleDateString()}</td>
                <td class="py-2 text-right">
                  <button class="delete-btn text-red-400 hover:text-red-300 text-xs" data-id="${a.id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      wrap.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this asset?')) return;
          await api.deleteAsset(btn.dataset.id);
          loadTable();
        });
      });
    } catch (err) {
      wrap.innerHTML = `<p class="text-red-400 text-sm">${err.message}</p>`;
    }
  }

  loadTable();
}
