import { api } from "./api.js";
import {
    Drawer,
    Modal,
    Toast,
    icon,
    typeBadge,
    statusBadge,
    fmtRelative,
    escapeHtml,
    copyToClipboard,
} from "./ui.js";
import {
    getState,
    loadAssets,
    subscribe,
    activeJobsForAsset,
} from "./state.js";
import { openAssetDrawer } from "./asset-drawer.js";

let viewEl = null;
let filter = { q: "", type: "all" };
let unsubscribe = null;

export async function renderAssets(container) {
    viewEl = container;
    filter.q = (document.getElementById("global-search")?.value || "").trim();

    container.innerHTML = `
    <div class="px-4 md:px-6 py-5 space-y-4">
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-lg font-semibold tracking-tight">Assets</h1>
          <p class="text-xs text-fg-muted mt-0.5">Domains and IPs being monitored.</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="refresh-assets" class="btn btn-secondary btn-sm" title="Refresh">
            ${icon("refresh", { size: 13 })} Refresh
          </button>
          <button id="open-new-asset" class="btn btn-primary btn-sm">
            ${icon("plus", { size: 13 })} New asset
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="px-3 py-2.5 border-b border-line flex items-center gap-2 flex-wrap">
          <div class="relative flex-1 min-w-48">
            ${icon("search", { size: 13, class: "absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" })}
            <input id="assets-search" type="text" placeholder="Filter by name…" value="${escapeHtml(filter.q)}"
              class="field" style="padding-left: 1.875rem;" />
          </div>
          <div class="flex items-center gap-1 text-xs">
            ${["all", "domain", "ip"]
                .map(
                    (t) => `
              <button data-type="${t}" class="type-filter btn btn-sm ${filter.type === t ? "btn-secondary" : "btn-ghost"}">${t}</button>
            `,
                )
                .join("")}
          </div>
          <div class="text-xs text-fg-muted ml-auto" id="assets-count"></div>
        </div>
        <div id="assets-table-wrap"></div>
      </div>
    </div>
  `;

    container
        .querySelector("#refresh-assets")
        .addEventListener("click", async () => {
            await loadAssets({ force: true });
        });
    container
        .querySelector("#open-new-asset")
        .addEventListener("click", openCreateAssetModal);
    const searchInput = container.querySelector("#assets-search");
    searchInput.addEventListener("input", (e) => {
        filter.q = e.target.value.trim();
        renderTable();
    });
    container.querySelectorAll(".type-filter").forEach((btn) => {
        btn.addEventListener("click", () => {
            filter.type = btn.dataset.type;
            container.querySelectorAll(".type-filter").forEach((b) => {
                b.classList.toggle(
                    "btn-secondary",
                    b.dataset.type === filter.type,
                );
                b.classList.toggle("btn-ghost", b.dataset.type !== filter.type);
            });
            renderTable();
        });
    });

    // global search keeps view filter in sync
    const globalSearch = document.getElementById("global-search");
    if (globalSearch) {
        globalSearch.oninput = (e) => {
            filter.q = e.target.value.trim();
            if (searchInput) searchInput.value = filter.q;
            renderTable();
        };
    }

    unsubscribe?.();
    unsubscribe = subscribe(() => renderTable());

    await loadAssets();
    renderTable();
}

export function teardownAssets() {
    unsubscribe?.();
    unsubscribe = null;
    const globalSearch = document.getElementById("global-search");
    if (globalSearch) globalSearch.oninput = null;
}

function getFilteredAssets() {
    const { assets } = getState();
    return assets.filter((a) => {
        if (filter.type !== "all" && a.type !== filter.type) return false;
        if (filter.q && !a.name.toLowerCase().includes(filter.q.toLowerCase()))
            return false;
        return true;
    });
}

function renderTable() {
    if (!viewEl) return;
    const wrap = viewEl.querySelector("#assets-table-wrap");
    const countEl = viewEl.querySelector("#assets-count");
    if (!wrap) return;

    const { assetsLoading, assetsLoaded } = getState();
    const list = getFilteredAssets();
    countEl.textContent = assetsLoaded
        ? `${list.length} ${list.length === 1 ? "asset" : "assets"}`
        : "";

    if (!assetsLoaded && assetsLoading) {
        wrap.innerHTML = `<div class="p-4 space-y-2">
      ${Array.from({ length: 5 })
          .map(() => '<div class="skeleton h-9 w-full"></div>')
          .join("")}
    </div>`;
        return;
    }

    if (list.length === 0) {
        wrap.innerHTML = `
      <div class="empty-state">
        ${icon("assets", { size: 32 })}
        <p>${getState().assets.length === 0 ? "No assets yet." : "No assets match your filters."}</p>
        ${getState().assets.length === 0 ? '<button id="empty-create" class="btn btn-primary btn-sm mt-3">Add your first asset</button>' : ""}
      </div>
    `;
        const emptyBtn = wrap.querySelector("#empty-create");
        if (emptyBtn) emptyBtn.addEventListener("click", openCreateAssetModal);
        return;
    }

    wrap.innerHTML = `
    <div class="overflow-x-auto">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Active scans</th>
            <th>Added</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list
              .map((a) => {
                  const active = activeJobsForAsset(a.id);
                  return `
              <tr class="clickable" data-id="${a.id}">
                <td>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">${escapeHtml(a.name)}</span>
                  </div>
                </td>
                <td>${typeBadge(a.type)}</td>
                <td>${statusBadge(a.status)}</td>
                <td>${active.length ? `<span class="badge badge-info"><span class="spinner" style="width:9px;height:9px;border-width:1.5px"></span>${active.length} running</span>` : '<span class="text-fg-muted text-xs">—</span>'}</td>
                <td class="text-fg-secondary mono" data-relative-time="${a.created_at}">${fmtRelative(a.created_at)}</td>
                <td class="text-right">
                  <div class="inline-flex gap-1">
                    <button class="btn btn-ghost btn-sm" data-action="copy" data-name="${escapeHtml(a.name)}" title="Copy">${icon("copy", { size: 12 })}</button>
                    <button class="btn btn-ghost btn-sm" data-action="open" title="Open">${icon("external", { size: 12 })}</button>
                    <button class="btn btn-ghost btn-sm text-fg-muted hover:text-danger" data-action="delete" title="Delete">${icon("trash", { size: 12 })}</button>
                  </div>
                </td>
              </tr>
            `;
              })
              .join("")}
        </tbody>
      </table>
    </div>
  `;

    wrap.querySelectorAll("tbody tr").forEach((row) => {
        const id = row.dataset.id;
        row.addEventListener("click", (e) => {
            const actionBtn = e.target.closest("[data-action]");
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                e.stopPropagation();
                if (action === "copy") copyToClipboard(actionBtn.dataset.name);
                else if (action === "open") openAssetDrawer(id);
                else if (action === "delete") confirmDelete(id);
                return;
            }
            openAssetDrawer(id);
        });
    });
}

function confirmDelete(id) {
    const asset = getState().assets.find((a) => a.id === id);
    if (!asset) return;
    Modal.open({
        title: "Delete asset?",
        body: `<p class="text-sm text-fg-secondary">This permanently removes <span class="mono text-fg">${escapeHtml(asset.name)}</span> and all its scan history. This cannot be undone.</p>`,
        footer: `
      <button class="btn btn-ghost btn-sm" data-modal-close>Cancel</button>
      <button class="btn btn-danger btn-sm" id="confirm-delete">${icon("trash", { size: 12 })} Delete</button>
    `,
    });
    document
        .getElementById("confirm-delete")
        .addEventListener("click", async () => {
            try {
                await api.deleteAsset(id);
                Modal.close();
                Toast.success("Asset deleted");
                await loadAssets({ force: true });
            } catch (err) {
                Toast.error(err.message);
            }
        });
    // re-wire close button
    document.querySelector("#modal [data-modal-close]:not(.btn)")?.remove;
    document.querySelectorAll("#modal [data-modal-close]").forEach((b) => {
        b.addEventListener("click", () => Modal.close());
    });
}

export function openCreateAssetModal() {
    Modal.open({
        title: "Add asset",
        body: `
      <form id="create-form" class="space-y-3">
        <div>
          <label class="label">Name</label>
          <input id="ca-name" required class="field" placeholder="example.com or 10.0.0.5" autocomplete="off" />
          <p class="text-[11px] text-fg-muted mt-1">FQDN for domains, IPv4/IPv6 for hosts.</p>
        </div>
        <div>
          <label class="label">Type</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="border border-line rounded-md px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-elevated has-[:checked]:border-accent has-[:checked]:bg-accent/10">
              <input type="radio" name="ca-type" value="domain" checked class="accent-cyan-400" />
              <span class="text-sm">Domain</span>
            </label>
            <label class="border border-line rounded-md px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-elevated has-[:checked]:border-accent has-[:checked]:bg-accent/10">
              <input type="radio" name="ca-type" value="ip" class="accent-cyan-400" />
              <span class="text-sm">IP address</span>
            </label>
          </div>
        </div>
        <p id="ca-error" class="text-danger text-xs hidden"></p>
      </form>
    `,
        footer: `
      <button class="btn btn-ghost btn-sm" data-modal-close>Cancel</button>
      <button id="ca-submit" form="create-form" type="submit" class="btn btn-primary btn-sm">Add asset</button>
    `,
    });

    const form = document.getElementById("create-form");
    const submit = document.getElementById("ca-submit");
    const onSubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById("ca-name").value.trim();
        const type = document.querySelector("[name=ca-type]:checked").value;
        const errEl = document.getElementById("ca-error");
        errEl.classList.add("hidden");
        submit.disabled = true;
        submit.innerHTML = '<span class="spinner"></span> Adding…';
        try {
            await api.createAsset({ name, type });
            Modal.close();
            Toast.success(`Added ${name}`);
            await loadAssets({ force: true });
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove("hidden");
            submit.disabled = false;
            submit.textContent = "Add asset";
        }
    };
    form.addEventListener("submit", onSubmit);
    submit.addEventListener("click", onSubmit);
}
