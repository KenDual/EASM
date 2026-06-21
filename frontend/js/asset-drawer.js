import { api } from "./api.js";
import {
    Drawer,
    Toast,
    icon,
    statusBadge,
    typeBadge,
    fmtRelative,
    fmtDateTime,
    fmtDuration,
    escapeHtml,
    copyToClipboard,
} from "./ui.js";
import {
    getAsset,
    trackJob,
    loadAssets,
    activeJobsForAsset,
    subscribe,
    refreshAsset,
} from "./state.js";

// Scanner catalog with applicability + display metadata.
const SCANNERS = [
    {
        type: "dns",
        label: "DNS",
        appliesTo: ["domain"],
        desc: "A/AAAA/MX/NS/TXT/CNAME records",
    },
    {
        type: "whois",
        label: "WHOIS",
        appliesTo: ["domain"],
        desc: "Registrar + creation/expiry",
    },
    {
        type: "subdomain",
        label: "Subdomains",
        appliesTo: ["domain"],
        desc: "crt.sh + bruteforce list",
    },
    {
        type: "cert_trans",
        label: "CT Logs",
        appliesTo: ["domain"],
        desc: "Certificate transparency log entries",
    },
    {
        type: "ssl",
        label: "SSL/TLS",
        appliesTo: ["domain"],
        desc: "Certificate chain + expiry",
    },
    {
        type: "tech",
        label: "Tech",
        appliesTo: ["domain"],
        desc: "HTTP headers + tech fingerprint",
    },
    { type: "asn", label: "ASN", appliesTo: ["ip"], desc: "BGP/ASN ownership" },
    {
        type: "ip",
        label: "IP info",
        appliesTo: ["ip"],
        desc: "Geo + reverse DNS",
    },
    {
        type: "port",
        label: "Ports",
        appliesTo: ["ip"],
        desc: "Common port sweep (private only)",
    },
];

let currentAssetId = null;
let currentTab = null;
let cachedResults = {}; // scan_type -> result row
let cachedJobs = [];
let unsubscribeState = null;

export async function openAssetDrawer(assetId, opts = {}) {
    currentAssetId = assetId;
    cachedResults = {};
    cachedJobs = [];

    let asset = getAsset(assetId);
    if (!asset) {
        try {
            asset = await api.getAsset(assetId);
        } catch (err) {
            Toast.error(err.message);
            return;
        }
    }

    const scanners = SCANNERS.filter((s) => s.appliesTo.includes(asset.type));
    currentTab = opts.tab || "overview";

    Drawer.open({
        render: (el) => {
            el.innerHTML = renderShell(asset, scanners);
            wireShellEvents(el, asset, scanners);
            renderActiveTab(el, asset);
        },
        onClose: () => {
            unsubscribeState?.();
            unsubscribeState = null;
            currentAssetId = null;
        },
    });

    unsubscribeState?.();
    unsubscribeState = subscribe(() => {
        if (!Drawer.isOpen() || currentAssetId !== assetId) return;
        updateActiveBadge(asset);
    });

    await Promise.all([loadResults(assetId), loadJobs(assetId)]);
    const root = document.getElementById("drawer-content");
    renderTabBar(root, asset, scanners);
    renderActiveTab(root, asset);
}

function renderShell(asset, scanners) {
    const isLong = asset.name.length > 40;
    return `
    <div class="sticky top-0 z-10 bg-surface border-b border-line">
      <div class="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[11px] text-fg-muted uppercase tracking-wider mb-1">
            <span>Asset</span>
            <span>·</span>
            <span class="mono">${escapeHtml(asset.id.slice(0, 8))}</span>
            <button class="btn btn-ghost btn-icon" title="Copy ID" data-copy="${escapeHtml(asset.id)}">${icon("copy", { size: 11 })}</button>
          </div>
          <h2 class="${isLong ? "text-base" : "text-lg"} font-semibold leading-tight break-all">${escapeHtml(asset.name)}</h2>
          <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
            ${typeBadge(asset.type)}
            ${statusBadge(asset.status)}
            <span id="drawer-active-badge"></span>
            <span class="text-[11px] text-fg-muted">Added <span data-relative-time="${asset.created_at}">${fmtRelative(asset.created_at)}</span></span>
          </div>
        </div>
        <button class="btn btn-ghost btn-icon shrink-0" data-drawer-close aria-label="Close">${icon("close", { size: 16 })}</button>
      </div>
      <div class="px-5 pb-3 flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-fg-muted">Run:</span>
          <select id="drawer-scan-type" class="field" style="padding-top:0.25rem;padding-bottom:0.25rem;font-size:12px;width:auto;">
            <option value="all">All applicable</option>
            ${scanners.map((s) => `<option value="${s.type}">${s.label}</option>`).join("")}
          </select>
          <button id="drawer-run-btn" class="btn btn-primary btn-sm">${icon("play", { size: 11 })} Run scan</button>
        </div>
      </div>
      <div id="drawer-tabs"></div>
    </div>
    <div id="drawer-tab-content" class="p-5"></div>
  `;
}

function wireShellEvents(el, asset, scanners) {
    el.querySelector("[data-drawer-close]").addEventListener("click", () =>
        Drawer.close(),
    );
    el.querySelector("[data-copy]").addEventListener("click", (e) =>
        copyToClipboard(e.currentTarget.dataset.copy),
    );
    el.querySelector("#drawer-run-btn").addEventListener("click", () => {
        const type = el.querySelector("#drawer-scan-type").value;
        runScan(asset, type);
    });
    renderTabBar(el, asset, scanners);
}

function renderTabBar(root, asset, scanners) {
    const tabs = root.querySelector("#drawer-tabs");
    if (!tabs) return;
    const tabDefs = [
        { id: "overview", label: "Overview" },
        ...scanners.map((s) => ({
            id: s.type,
            label: s.label,
            hasData: !!cachedResults[s.type],
        })),
        { id: "history", label: "Scan history", count: cachedJobs.length },
    ];
    tabs.innerHTML = `
    <div class="tab-list px-3">
      ${tabDefs
          .map(
              (t) => `
        <button class="tab ${t.id === currentTab ? "active" : ""}" data-tab="${t.id}">
          ${escapeHtml(t.label)}
          ${t.id !== "overview" && t.id !== "history" ? (t.hasData ? '<span class="w-1.5 h-1.5 rounded-full bg-success/80"></span>' : '<span class="w-1.5 h-1.5 rounded-full bg-line"></span>') : ""}
          ${t.count != null ? `<span class="tab-count">${t.count}</span>` : ""}
        </button>
      `,
          )
          .join("")}
    </div>
  `;
    tabs.querySelectorAll(".tab").forEach((b) => {
        b.addEventListener("click", () => {
            currentTab = b.dataset.tab;
            renderTabBar(root, asset, scanners);
            renderActiveTab(root, asset);
        });
    });
}

function updateActiveBadge(asset) {
    const el = document.getElementById("drawer-active-badge");
    if (!el) return;
    const active = activeJobsForAsset(asset.id);
    if (active.length === 0) {
        el.innerHTML = "";
        return;
    }
    el.innerHTML = `<span class="badge badge-info"><span class="spinner" style="width:9px;height:9px;border-width:1.5px"></span>${active.length} running</span>`;
}

async function loadResults(assetId) {
    try {
        const data = await api.getAssetResults(assetId);
        cachedResults = {};
        for (const r of data) {
            const prev = cachedResults[r.scan_type];
            if (!prev || new Date(r.created_at) > new Date(prev.created_at)) {
                cachedResults[r.scan_type] = r;
            }
        }
    } catch (err) {
        Toast.error(`Failed to load results: ${err.message}`);
    }
}

async function loadJobs(assetId) {
    try {
        cachedJobs = await api.getAssetScans(assetId);
    } catch (err) {
        cachedJobs = [];
    }
}

function renderActiveTab(root, asset) {
    const target = root.querySelector("#drawer-tab-content");
    if (!target) return;
    if (currentTab === "overview") return renderOverviewTab(target, asset);
    if (currentTab === "history") return renderHistoryTab(target, asset);
    renderScannerTab(target, asset, currentTab);
}

function renderOverviewTab(el, asset) {
    const counts = {
        total: cachedJobs.length,
        completed: cachedJobs.filter((j) => j.status === "completed").length,
        failed: cachedJobs.filter((j) => j.status === "failed").length,
        partial: cachedJobs.filter((j) => j.status === "partial").length,
    };
    const lastJob = cachedJobs[0];
    const scannersForType = SCANNERS.filter((s) =>
        s.appliesTo.includes(asset.type),
    );

    el.innerHTML = `
    <div class="space-y-5">
      <section class="panel">
        <div class="panel-header"><span class="panel-title">Identity</span></div>
        <div class="p-4">
          <dl class="kv">
            <dt>ID</dt><dd class="mono">${escapeHtml(asset.id)}</dd>
            <dt>Name</dt><dd class="mono">${escapeHtml(asset.name)}</dd>
            <dt>Type</dt><dd>${typeBadge(asset.type)}</dd>
            <dt>Status</dt><dd>${statusBadge(asset.status)}</dd>
            <dt>Created</dt><dd>${fmtDateTime(asset.created_at)}</dd>
            <dt>Updated</dt><dd>${fmtDateTime(asset.updated_at)}</dd>
          </dl>
        </div>
      </section>

      <section class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        ${kpi("Total scans", counts.total)}
        ${kpi("Completed", counts.completed, "success")}
        ${kpi("Partial", counts.partial, "warning")}
        ${kpi("Failed", counts.failed, "danger")}
      </section>

      ${
          lastJob
              ? `
      <section class="panel">
        <div class="panel-header">
          <span class="panel-title">Last scan</span>
          <span class="text-[11px] text-fg-muted">${fmtRelative(lastJob.created_at)}</span>
        </div>
        <div class="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div class="text-sm">
            <span class="badge badge-neutral">${escapeHtml(lastJob.scan_type)}</span>
            ${statusBadge(lastJob.status)}
            ${lastJob.error ? `<span class="text-xs text-danger ml-2 truncate-1">${escapeHtml(lastJob.error)}</span>` : ""}
          </div>
          <span class="text-xs text-fg-muted mono">${fmtDuration(lastJob.started_at, lastJob.ended_at)}</span>
        </div>
      </section>
      `
              : ""
      }

      <section class="panel">
        <div class="panel-header"><span class="panel-title">Available scanners (${scannersForType.length})</span></div>
        <div class="divide-y divide-line-soft">
          ${scannersForType
              .map((s) => {
                  const hit = cachedResults[s.type];
                  return `
              <div class="px-4 py-2.5 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium">${escapeHtml(s.label)}</div>
                  <div class="text-[11px] text-fg-muted">${escapeHtml(s.desc)}</div>
                </div>
                <div class="text-[11px] text-fg-muted mono">${hit ? fmtRelative(hit.created_at) : "never"}</div>
                <button class="btn btn-secondary btn-sm" data-scan="${s.type}">${icon("play", { size: 11 })} Run</button>
              </div>
            `;
              })
              .join("")}
        </div>
      </section>
    </div>
  `;
    el.querySelectorAll("[data-scan]").forEach((b) => {
        b.addEventListener("click", () => runScan(asset, b.dataset.scan));
    });
}

function kpi(label, value, variant = "neutral") {
    const color = {
        neutral: "text-fg",
        success: "text-success",
        warning: "text-warning",
        danger: "text-danger",
    }[variant];
    return `
    <div class="panel p-3">
      <div class="text-[11px] uppercase tracking-wider text-fg-muted">${escapeHtml(label)}</div>
      <div class="text-2xl font-semibold mt-1 ${color}">${value}</div>
    </div>
  `;
}

function renderScannerTab(el, asset, scanType) {
    const meta = SCANNERS.find((s) => s.type === scanType);
    const result = cachedResults[scanType];
    el.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 class="text-sm font-semibold">${escapeHtml(meta?.label || scanType)}</h3>
          <p class="text-xs text-fg-muted mt-0.5">${escapeHtml(meta?.desc || "")}</p>
        </div>
        <div class="flex items-center gap-2">
          ${result ? `<span class="text-[11px] text-fg-muted">Last run <span data-relative-time="${result.created_at}">${fmtRelative(result.created_at)}</span></span>` : ""}
          <button class="btn btn-secondary btn-sm" data-rerun>${icon("refresh", { size: 11 })} ${result ? "Re-run" : "Run scan"}</button>
        </div>
      </div>
      ${
          result
              ? renderResultBody(scanType, result)
              : `
        <div class="empty-state">
          ${icon("jobs", { size: 28 })}
          <p>No results yet for this scanner.</p>
          <button class="btn btn-primary btn-sm mt-3" data-rerun-empty>${icon("play", { size: 11 })} Run ${escapeHtml(meta?.label || scanType)}</button>
        </div>
      `
      }
    </div>
  `;
    el.querySelectorAll("[data-rerun], [data-rerun-empty]").forEach((b) => {
        b.addEventListener("click", () => runScan(asset, scanType));
    });
}

function renderResultBody(scanType, result) {
    const data = result.data;
    let pretty = "";
    try {
        pretty = renderPretty(scanType, data);
    } catch {
        pretty = "";
    }
    return `
    <div class="space-y-3">
      ${pretty || ""}
      <details class="panel" ${pretty ? "" : "open"}>
        <summary class="panel-header cursor-pointer">
          <span class="panel-title">Raw JSON</span>
          <span class="text-[11px] text-fg-muted">${Array.isArray(data) ? `${data.length} record(s)` : ""}</span>
        </summary>
        <pre class="code rounded-none border-0 border-t border-line">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
      </details>
    </div>
  `;
}

// ---------- Pretty renderers per scan type ----------
function renderPretty(scanType, data) {
    if (!Array.isArray(data) || data.length === 0) return "";
    const first = data[0];

    if (scanType === "dns") {
        const rows = Object.entries(first || {});
        return `
      <div class="panel"><div class="panel-header"><span class="panel-title">DNS records</span></div>
        <table class="data-table"><tbody>
          ${rows
              .map(
                  ([k, v]) => `
            <tr>
              <td class="mono text-fg-secondary w-20">${escapeHtml(k)}</td>
              <td>${
                  Array.isArray(v) && v.length
                      ? v
                            .map(
                                (x) =>
                                    `<span class="badge badge-neutral mono">${escapeHtml(typeof x === "object" ? JSON.stringify(x) : x)}</span>`,
                            )
                            .join(" ")
                      : '<span class="text-fg-muted text-xs">—</span>'
              }</td>
            </tr>
          `,
              )
              .join("")}
        </tbody></table>
      </div>`;
    }

    if (scanType === "subdomain") {
        const subs = Array.isArray(first?.subdomains)
            ? first.subdomains
            : Array.isArray(first)
              ? first
              : [];
        return `
      <div class="panel"><div class="panel-header">
        <span class="panel-title">Subdomains</span>
        <span class="text-[11px] text-fg-muted">${subs.length} found</span>
      </div>
        <div class="p-3 flex flex-wrap gap-1.5 max-h-72 overflow-y-auto">
          ${subs.map((s) => `<span class="badge badge-neutral mono">${escapeHtml(s)}</span>`).join("")}
        </div>
      </div>`;
    }

    if (scanType === "port") {
        const ports = Array.isArray(first?.open_ports)
            ? first.open_ports
            : Array.isArray(first)
              ? first
              : [];
        if (!ports.length) return "";
        return `
      <div class="panel"><div class="panel-header">
        <span class="panel-title">Open ports</span>
        <span class="text-[11px] text-fg-muted">${ports.length} open</span>
      </div>
        <table class="data-table"><thead><tr><th>Port</th><th>Service</th><th>State</th></tr></thead>
          <tbody>${ports
              .map(
                  (p) => `
            <tr><td class="mono">${escapeHtml(p.port ?? p)}</td><td>${escapeHtml(p.service || "—")}</td><td>${statusBadge(p.state || "active")}</td></tr>
          `,
              )
              .join("")}</tbody>
        </table>
      </div>`;
    }

    if (scanType === "ssl") {
        const c = first || {};
        return `
      <div class="panel"><div class="panel-header"><span class="panel-title">SSL certificate</span></div>
        <div class="p-4"><dl class="kv">
          ${kvRow("Subject", c.subject)}
          ${kvRow("Issuer", c.issuer)}
          ${kvRow("Valid from", c.valid_from)}
          ${kvRow("Valid to", c.valid_to)}
          ${kvRow("SANs", Array.isArray(c.sans) ? c.sans.join(", ") : c.sans)}
          ${kvRow("Protocol", c.protocol)}
        </dl></div>
      </div>`;
    }

    if (scanType === "whois") {
        return `
      <div class="panel"><div class="panel-header"><span class="panel-title">WHOIS</span></div>
        <div class="p-4"><dl class="kv">
          ${Object.entries(first)
              .slice(0, 14)
              .map(([k, v]) => kvRow(k, formatScalar(v)))
              .join("")}
        </dl></div>
      </div>`;
    }

    if (
        scanType === "tech" ||
        scanType === "ip" ||
        scanType === "asn" ||
        scanType === "cert_trans"
    ) {
        return `
      <div class="panel"><div class="panel-header"><span class="panel-title">${escapeHtml(scanType)}</span></div>
        <div class="p-4"><dl class="kv">
          ${Object.entries(first)
              .slice(0, 20)
              .map(([k, v]) => kvRow(k, formatScalar(v)))
              .join("")}
        </dl></div>
      </div>`;
    }

    return "";
}

function kvRow(k, v) {
    return `<dt>${escapeHtml(k)}</dt><dd class="${typeof v === "string" && v.length < 60 ? "mono" : ""}">${v != null ? escapeHtml(v) : '<span class="text-fg-muted">—</span>'}</dd>`;
}

function formatScalar(v) {
    if (v == null) return "";
    if (Array.isArray(v))
        return v.length
            ? v
                  .map((x) => (typeof x === "object" ? JSON.stringify(x) : x))
                  .join(", ")
            : "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

function renderHistoryTab(el, asset) {
    if (!cachedJobs.length) {
        el.innerHTML = `<div class="empty-state">${icon("jobs", { size: 28 })}<p>No scan history yet.</p></div>`;
        return;
    }
    el.innerHTML = `
    <div class="panel">
      <div class="overflow-x-auto"><table class="data-table">
        <thead><tr><th>Type</th><th>Status</th><th>Duration</th><th>Started</th><th>Error</th></tr></thead>
        <tbody>
          ${cachedJobs
              .map(
                  (j) => `
            <tr>
              <td><span class="badge badge-neutral">${escapeHtml(j.scan_type)}</span></td>
              <td>${statusBadge(j.status)}</td>
              <td class="mono text-fg-secondary">${fmtDuration(j.started_at, j.ended_at)}</td>
              <td class="mono text-fg-secondary" data-relative-time="${j.created_at}">${fmtRelative(j.created_at)}</td>
              <td class="text-xs text-danger truncate-1 max-w-[200px]" title="${escapeHtml(j.error || "")}">${escapeHtml(j.error || "")}</td>
            </tr>
          `,
              )
              .join("")}
        </tbody>
      </table></div>
    </div>
  `;
}

// ---------- Run scan ----------
async function runScan(asset, scanType) {
    try {
        const job = await api.startScan(asset.id, scanType);
        Toast.info(`Scan ${scanType} queued`);
        trackJob(job, {
            onDone: async () => {
                await Promise.all([loadResults(asset.id), loadJobs(asset.id)]);
                const root = document.getElementById("drawer-content");
                if (root && currentAssetId === asset.id) {
                    const scanners = SCANNERS.filter((s) =>
                        s.appliesTo.includes(asset.type),
                    );
                    renderTabBar(root, asset, scanners);
                    renderActiveTab(root, asset);
                }
            },
        });
        updateActiveBadge(asset);
    } catch (err) {
        Toast.error(err.message);
    }
}
