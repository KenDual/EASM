// Reusable UI primitives: drawer, modal, toast, icons, formatters.

// ---------- Icons ----------
const ICONS = {
  overview: '<path d="M3 12h7V3H3zM14 21h7V12h-7zM14 9h7V3h-7zM3 21h7v-6H3z"/>',
  assets: '<path d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4 9-4M12 11v10"/>',
  jobs: '<path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v6h-6"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  close: '<path d="M6 6l12 12M6 18L18 6"/>',
  play: '<path d="M5 4l14 8-14 8z" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  domain: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  ip: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  filter: '<path d="M3 6h18M7 12h10M10 18h4"/>',
};

export function icon(name, attrs = {}) {
  const size = attrs.size ?? 14;
  const cls = attrs.class ?? '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${ICONS[name] || ''}</svg>`;
}

// ---------- Format helpers ----------
export function fmtRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function fmtDuration(start, end) {
  if (!start) return '—';
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  const ms = b - a;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function statusBadge(status) {
  const map = {
    pending:   ['warning', 'pending'],
    running:   ['info', 'running'],
    completed: ['success', 'completed'],
    partial:   ['warning', 'partial'],
    failed:    ['danger', 'failed'],
    active:    ['success', 'active'],
    inactive:  ['neutral', 'inactive'],
  };
  const [variant, label] = map[status] || ['neutral', status || 'unknown'];
  return `<span class="badge badge-${variant}"><span class="dot"></span>${escapeHtml(label)}</span>`;
}

export function typeBadge(type) {
  const t = (type || '').toLowerCase();
  if (t === 'domain') return `<span class="badge badge-info">${icon('domain', { size: 10 })}domain</span>`;
  if (t === 'ip') return `<span class="badge badge-accent">${icon('ip', { size: 10 })}ip</span>`;
  return `<span class="badge badge-neutral">${escapeHtml(type)}</span>`;
}

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ---------- Drawer ----------
const drawerEl = () => document.getElementById('drawer');
const drawerBackdrop = () => document.getElementById('drawer-backdrop');
const drawerContent = () => document.getElementById('drawer-content');

export const Drawer = {
  _onClose: null,
  open({ render, onClose } = {}) {
    drawerContent().innerHTML = '';
    if (typeof render === 'function') render(drawerContent());
    else if (typeof render === 'string') drawerContent().innerHTML = render;
    drawerEl().classList.add('open');
    drawerBackdrop().classList.add('open');
    document.body.style.overflow = 'hidden';
    this._onClose = onClose;
  },
  setContent(html) {
    if (typeof html === 'string') drawerContent().innerHTML = html;
    else if (typeof html === 'function') {
      drawerContent().innerHTML = '';
      html(drawerContent());
    }
  },
  close() {
    drawerEl().classList.remove('open');
    drawerBackdrop().classList.remove('open');
    document.body.style.overflow = '';
    if (this._onClose) this._onClose();
    this._onClose = null;
  },
  isOpen() {
    return drawerEl().classList.contains('open');
  },
};

// ---------- Modal ----------
const modalEl = () => document.getElementById('modal');
const modalBackdrop = () => document.getElementById('modal-backdrop');

export const Modal = {
  _onClose: null,
  open({ title, body, footer, onClose, width } = {}) {
    if (width) modalEl().style.maxWidth = width;
    modalEl().innerHTML = `
      <div class="flex items-center justify-between px-4 py-3 border-b border-line">
        <h3 class="text-sm font-semibold">${escapeHtml(title || '')}</h3>
        <button class="btn btn-ghost btn-icon" data-modal-close aria-label="Close">${icon('close', { size: 14 })}</button>
      </div>
      <div class="p-4">${typeof body === 'string' ? body : ''}</div>
      ${footer ? `<div class="px-4 py-3 border-t border-line flex justify-end gap-2">${footer}</div>` : ''}
    `;
    if (typeof body === 'function') {
      const slot = modalEl().querySelector('.p-4');
      slot.innerHTML = '';
      body(slot);
    }
    modalBackdrop().classList.add('open');
    document.body.style.overflow = 'hidden';
    this._onClose = onClose;
    modalEl().querySelector('[data-modal-close]').addEventListener('click', () => this.close());
    const firstField = modalEl().querySelector('input, select, textarea');
    if (firstField) setTimeout(() => firstField.focus(), 50);
  },
  close() {
    modalBackdrop().classList.remove('open');
    document.body.style.overflow = '';
    if (this._onClose) this._onClose();
    this._onClose = null;
  },
  isOpen() {
    return modalBackdrop().classList.contains('open');
  },
};

// ---------- Toast ----------
export const Toast = {
  show(message, variant = 'info', timeout = 3000) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${variant}`;
    const iconName = variant === 'success' ? 'check' : variant === 'error' ? 'alert' : 'play';
    t.innerHTML = `${icon(iconName, { size: 14 })}<span>${escapeHtml(message)}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity 200ms';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 200);
    }, timeout);
  },
  success(m) { this.show(m, 'success'); },
  error(m) { this.show(m, 'error', 5000); },
  info(m) { this.show(m, 'info'); },
};

// ---------- Helpers ----------
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text);
    Toast.success('Copied to clipboard');
  } catch {
    Toast.error('Copy failed');
  }
}

// Global drawer/modal close on backdrop click + Esc
window.addEventListener('click', (e) => {
  if (e.target?.id === 'drawer-backdrop') Drawer.close();
  if (e.target?.id === 'modal-backdrop') Modal.close();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (Modal.isOpen()) Modal.close();
    else if (Drawer.isOpen()) Drawer.close();
  }
});

// Live "ago" updates
setInterval(() => {
  document.querySelectorAll('[data-relative-time]').forEach((el) => {
    el.textContent = fmtRelative(el.getAttribute('data-relative-time'));
  });
}, 30000);
