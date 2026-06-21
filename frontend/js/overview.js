import { api } from "./api.js";
import {
    icon,
    statusBadge,
    escapeHtml,
    fmtRelative,
    fmtDuration,
    Toast,
} from "./ui.js";
import { getState, loadAssets } from "./state.js";
import { openAssetDrawer } from "./asset-drawer.js";

let viewEl = null;
let jobs = [];
let loading = false;

export async function renderOverview(container) {
    viewEl = container;
    container.innerHTML = `
    <div class="px-4 md:px-6 py-5 space-y-5">
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-lg font-semibold tracking-tight">Overview</h1>
          <p class="text-xs text-fg-muted mt-0.5">Posture across all monitored assets.</p>
        </div>
        <button id="overview-refresh" class="btn btn-secondary btn-sm">${icon("refresh", { size: 13 })} Refresh</button>
      </div>

      <div id="overview-kpis" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section class="panel lg:col-span-2">
          <div class="panel-header">
            <span class="panel-title">Recent scan activity</span>
            <a href="#/jobs" class="text-xs text-accent hover:underline">View all →</a>
          </div>
          <div id="overview-recent"></div>
        </section>
        <section class="panel">
          <div class="panel-header"><span class="panel-title">Scans by type</span></div>
          <div id="overview-by-type" class="p-3"></div>
        </section>
      </div>
    </div>
  `;
    container
        .querySelector("#overview-refresh")
        .addEventListener("click", () => load(true));
    await load();
}

async function load(force = false) {
    loading = true;
    render();
    try {
        await loadAssets({ force });
        const { assets } = getState();
        const all = await Promise.all(
            assets.map((a) =>
                api
                    .getAssetScans(a.id)
                    .then((rows) => rows.map((r) => ({ ...r, _asset: a })))
                    .catch(() => []),
            ),
        );
        jobs = all
            .flat()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (err) {
        Toast.error(err.message);
    } finally {
        loading = false;
        render();
    }
}

function render() {
    if (!viewEl) return;
    const { assets } = getState();
    renderKPIs(viewEl.querySelector("#overview-kpis"), assets, jobs);
    renderRecent(viewEl.querySelector("#overview-recent"), jobs.slice(0, 10));
    renderByType(viewEl.querySelector("#overview-by-type"), jobs);
}

function renderKPIs(el, assets, jobs) {
    if (!el) return;
    const domains = assets.filter((a) => a.type === "domain").length;
    const ips = assets.filter((a) => a.type === "ip").length;
    const active = jobs.filter(
        (j) => j.status === "pending" || j.status === "running",
    ).length;
    const failed24h = jobs.filter(
        (j) =>
            j.status === "failed" &&
            Date.now() - new Date(j.created_at).getTime() < 86400000,
    ).length;

    el.innerHTML = [
        kpi(
            "Total assets",
            assets.length,
            "fg",
            `${domains} domains · ${ips} IPs`,
        ),
        kpi(
            "Scan jobs",
            jobs.length,
            "fg",
            `${jobs.filter((j) => j.status === "completed").length} completed`,
        ),
        kpi(
            "Active now",
            active,
            active > 0 ? "info" : "muted",
            active > 0 ? "scanning…" : "idle",
        ),
        kpi(
            "Failures (24h)",
            failed24h,
            failed24h > 0 ? "danger" : "success",
            failed24h === 0 ? "all good" : "check jobs",
        ),
    ].join("");
}

function kpi(label, value, color = "fg", sub = "") {
    const colorClass =
        {
            fg: "text-fg",
            success: "text-success",
            warning: "text-warning",
            danger: "text-danger",
            info: "text-info",
            muted: "text-fg-muted",
        }[color] || "text-fg";
    return `
    <div class="panel p-3">
      <div class="text-[11px] uppercase tracking-wider text-fg-muted">${escapeHtml(label)}</div>
      <div class="flex items-baseline gap-2 mt-1">
        <div class="text-2xl font-semibold ${colorClass}">${value}</div>
      </div>
      <div class="text-[11px] text-fg-muted mt-0.5">${escapeHtml(sub)}</div>
    </div>
  `;
}

function renderRecent(el, list) {
    if (!el) return;
    if (loading && list.length === 0) {
        el.innerHTML = `<div class="p-4 space-y-2">${Array.from({ length: 5 })
            .map(() => '<div class="skeleton h-8 w-full"></div>')
            .join("")}</div>`;
        return;
    }
    if (!list.length) {
        el.innerHTML = `<div class="empty-state">${icon("jobs", { size: 24 })}<p>No scans run yet.</p></div>`;
        return;
    }
    el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Asset</th><th>Type</th><th>Status</th><th>Duration</th><th>When</th></tr></thead>
      <tbody>
        ${list
            .map(
                (j) => `
          <tr class="clickable" data-asset="${j.asset_id}">
            <td class="font-medium">${escapeHtml(j._asset?.name || j.asset_id.slice(0, 8))}</td>
            <td><span class="badge badge-neutral">${escapeHtml(j.scan_type)}</span></td>
            <td>${statusBadge(j.status)}</td>
            <td class="mono text-fg-secondary">${fmtDuration(j.started_at, j.ended_at)}</td>
            <td class="mono text-fg-secondary" data-relative-time="${j.created_at}">${fmtRelative(j.created_at)}</td>
          </tr>
        `,
            )
            .join("")}
      </tbody>
    </table>
  `;
    el.querySelectorAll("tbody tr").forEach((row) => {
        row.addEventListener("click", () =>
            openAssetDrawer(row.dataset.asset, { tab: "history" }),
        );
    });
}

function renderByType(el, jobs) {
    if (!el) return;
    const counts = {};
    for (const j of jobs) counts[j.scan_type] = (counts[j.scan_type] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, n]) => n));

    if (!entries.length) {
        el.innerHTML = `<div class="empty-state py-6">${icon("jobs", { size: 20 })}<p>No data yet.</p></div>`;
        return;
    }
    el.innerHTML = `
    <ul class="space-y-2">
      ${entries
          .map(([type, count]) => {
              const pct = (count / max) * 100;
              return `
          <li>
            <div class="flex items-center justify-between text-xs mb-1">
              <span>${escapeHtml(type)}</span>
              <span class="mono text-fg-muted">${count}</span>
            </div>
            <div class="h-1.5 bg-elevated rounded-full overflow-hidden">
              <div class="h-full bg-accent" style="width:${pct}%"></div>
            </div>
          </li>
        `;
          })
          .join("")}
    </ul>
  `;
}
