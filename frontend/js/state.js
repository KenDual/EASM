// Lightweight pub/sub store. Tracks asset cache + active scan jobs.
import { api } from "./api.js";
import { Toast } from "./ui.js";

const subscribers = new Set();
const state = {
    assets: [],
    assetsLoaded: false,
    assetsLoading: false,
    apiOnline: false,
    activeJobs: new Map(), // jobId -> { id, asset_id, scan_type, status }
    pollers: new Map(), // jobId -> intervalId
};

export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

function emit() {
    for (const fn of subscribers) {
        try {
            fn(state);
        } catch (e) {
            console.error("subscriber error", e);
        }
    }
}

export function getState() {
    return state;
}

export async function loadAssets({ force = false } = {}) {
    if (state.assetsLoading) return;
    if (state.assetsLoaded && !force) return;
    state.assetsLoading = true;
    emit();
    try {
        const { data } = await api.listAssets(1);
        state.assets = data || [];
        state.assetsLoaded = true;
        state.apiOnline = true;
    } catch (err) {
        state.apiOnline = false;
        Toast.error(`API: ${err.message}`);
    } finally {
        state.assetsLoading = false;
        emit();
    }
}

export function getAsset(id) {
    return state.assets.find((a) => a.id === id);
}

export async function refreshAsset(id) {
    try {
        const fresh = await api.getAsset(id);
        const idx = state.assets.findIndex((a) => a.id === id);
        if (idx >= 0) state.assets[idx] = fresh;
        else state.assets.unshift(fresh);
        emit();
        return fresh;
    } catch {}
}

// ---------- Job tracking ----------
export function trackJob(job, { onUpdate, onDone } = {}) {
    if (!job || !job.id) return;
    state.activeJobs.set(job.id, job);
    emit();
    const intervalId = setInterval(async () => {
        try {
            const fresh = await api.getJob(job.id);
            state.activeJobs.set(job.id, fresh);
            onUpdate?.(fresh);
            if (["completed", "partial", "failed"].includes(fresh.status)) {
                clearInterval(intervalId);
                state.pollers.delete(job.id);
                state.activeJobs.delete(job.id);
                emit();
                onDone?.(fresh);
                const variant =
                    fresh.status === "completed"
                        ? "success"
                        : fresh.status === "failed"
                          ? "error"
                          : "info";
                Toast.show(`Scan ${fresh.scan_type} ${fresh.status}`, variant);
            } else {
                emit();
            }
        } catch (err) {
            clearInterval(intervalId);
            state.pollers.delete(job.id);
            state.activeJobs.delete(job.id);
            emit();
            onDone?.({ ...job, status: "failed", error: err.message });
        }
    }, 1500);
    state.pollers.set(job.id, intervalId);
}

export function isJobActive(jobId) {
    return state.activeJobs.has(jobId);
}

export function activeJobsForAsset(assetId) {
    return [...state.activeJobs.values()].filter((j) => j.asset_id === assetId);
}
