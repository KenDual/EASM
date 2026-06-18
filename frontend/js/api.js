import { API_URL } from '../config.js';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, opts);
  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Assets
  listAssets: (page = 1) => request('GET', `/assets?page=${page}`),
  getAsset: (id) => request('GET', `/assets/${id}`),
  createAsset: (body) => request('POST', '/assets', body),
  deleteAsset: (id) => request('DELETE', `/assets/${id}`),

  // Scans
  startScan: (assetId, scanType) => request('POST', `/assets/${assetId}/scan`, { scan_type: scanType }),
  getJob: (id) => request('GET', `/scan-jobs/${id}`),
  getJobResults: (id) => request('GET', `/scan-jobs/${id}/results`),
  getAssetScans: (assetId) => request('GET', `/assets/${assetId}/scans`),
};
