"use strict";

/* global cockpit, drawSparkline */

var COLLECTOR_PATH = "/usr/share/cockpit/stakkr-observer/collector.py";
var TIER_COLORS = { gold: "#c9b037", silver: "#a8a9ad", bronze: "#cd7f32" };

var state = {
    interval: 5000,
    paused: false,
    timer: null,
    prev: null,
    current: null,
    history: [],
};

function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
        Object.keys(attrs).forEach(function (key) {
            if (key === "className") node.className = attrs[key];
            else if (key === "textContent") node.textContent = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
    }
    if (children) {
        if (!Array.isArray(children)) children = [children];
        children.forEach(function (child) {
            if (typeof child === "string") node.appendChild(document.createTextNode(child));
            else if (child) node.appendChild(child);
        });
    }
    return node;
}

function clear(id) {
    var node = document.getElementById(id);
    if (node) node.innerHTML = "";
    return node;
}

function humanBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return "n/a";
    var units = ["B", "KiB", "MiB", "GiB", "TiB"];
    var val = Math.abs(bytes);
    for (var i = 0; i < units.length; i++) {
        if (val < 1024 || i === units.length - 1) return (i === 0 ? val.toFixed(0) : val.toFixed(1)) + " " + units[i];
        val /= 1024;
    }
    return val.toFixed(1) + " TiB";
}

function pct(v) {
    if (v == null || isNaN(v)) return "n/a";
    return v.toFixed(1) + "%";
}

function fetchData() {
    return cockpit.spawn(["python3", COLLECTOR_PATH], { superuser: "require", err: "message" }).then(function (output) {
        return JSON.parse(output);
    });
}

function setStatus(kind, errorText) {
    var dot = document.getElementById("poll-status");
    dot.className = "status-dot status-dot--" + kind;
    var banner = document.getElementById("error-banner");
    if (errorText) {
        banner.hidden = false;
        banner.textContent = errorText;
    } else {
        banner.hidden = true;
        banner.textContent = "";
    }
}

function compute(prev, curr) {
    if (!prev) return null;
    var dt = curr.timestamp - prev.timestamp;
    if (dt <= 0) return null;

    var deltas = { dt: dt, domain_cpu: {}, per_cpu_pct: {}, thread_cpu: {} };
    var cpuFields = ["user", "nice", "system", "idle", "iowait", "irq", "softirq", "steal"];

    Object.keys(curr.host_cpu.per_cpu || {}).forEach(function (cpuKey) {
        var c = curr.host_cpu.per_cpu[cpuKey];
        var p = prev.host_cpu.per_cpu[cpuKey];
        if (!p) return;
        var totalC = 0;
        var totalP = 0;
        cpuFields.forEach(function (field) {
            totalC += c[field] || 0;
            totalP += p[field] || 0;
        });
        var idleC = (c.idle || 0) + (c.iowait || 0);
        var idleP = (p.idle || 0) + (p.iowait || 0);
        var totalD = totalC - totalP;
        var idleD = idleC - idleP;
        deltas.per_cpu_pct[cpuKey] = totalD > 0 ? ((totalD - idleD) / totalD) * 100 : 0;
    });

    Object.keys(curr.domain_cgroups || {}).forEach(function (name) {
        var c = curr.domain_cgroups[name];
        var p = prev.domain_cgroups[name];
        if (!p || c.usage_usec == null || p.usage_usec == null) return;
        deltas.domain_cpu[name] = ((c.usage_usec - p.usage_usec) / (dt * 1e6)) * 100;
    });

    ["ksmd", "kswapd0", "kswapd1", "kcompactd0", "kcompactd1"].forEach(function (name) {
        var c = curr.kernel_threads[name];
        var p = prev.kernel_threads[name];
        if (!c || !p) {
            deltas.thread_cpu[name] = 0;
            return;
        }
        deltas.thread_cpu[name] = ((c.total_seconds - p.total_seconds) / dt) * 100;
    });

    return deltas;
}

function renderState(curr) {
    var container = clear("state-content");
    if (!container) return;

    var cls = curr.state_label === "shared execution pool" ? "shared" :
        curr.state_label === "clock-tiering" ? "clock" :
        curr.state_label === "stock" ? "stock" : "mixed";

    var grid = el("div", { className: "summary-grid" }, [
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "Current State" }),
            el("span", { className: "state-badge " + cls, textContent: curr.state_label }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "Host Reserved" }),
            el("span", { className: "metric-value", textContent: curr.host.host_reserved }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "Host Emulator" }),
            el("span", { className: "metric-value", textContent: curr.host.host_emulator }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "Guest Domain" }),
            el("span", { className: "metric-value", textContent: curr.host.guest_domain }),
        ]),
    ]);
    container.appendChild(grid);
    container.appendChild(el("p", { textContent: curr.state_note }));
}

function renderCpu(curr, deltas) {
    var container = clear("cpu-content");
    if (!container) return;

    var scopeGrid = el("div", { className: "scope-grid" });
    Object.keys(curr.scope_state || {}).forEach(function (name) {
        var scope = curr.scope_state[name];
        var domainCpu = deltas && deltas.domain_cpu[name] ? deltas.domain_cpu[name] : 0;
        scopeGrid.appendChild(el("div", { className: "scope-card" }, [
            el("h4", { textContent: name }),
            el("div", null, [el("span", { className: "tier-badge tier-" + scope.tier, textContent: scope.tier })]),
            el("div", { className: "metric-label", textContent: "AllowedCPUs" }),
            el("div", { className: "metric-value", textContent: scope.allowed_cpus || "<manager default>" }),
            el("div", { className: "metric-label", textContent: "CPUWeight" }),
            el("div", { className: "metric-value", textContent: scope.cpu_weight }),
            el("div", { className: "metric-label", textContent: "CPU (cores)" }),
            el("div", { className: "metric-value", textContent: (domainCpu / 100).toFixed(2) }),
        ]));
    });
    container.appendChild(scopeGrid);

    var vmGrid = el("div", { className: "vm-grid" });
    Object.keys(curr.vm_state || {}).forEach(function (name) {
        var vm = curr.vm_state[name];
        vmGrid.appendChild(el("div", { className: "vm-card" }, [
            el("h4", { textContent: name }),
            el("div", { className: "metric-label", textContent: "vCPU cpuset" }),
            el("div", { className: "metric-value", textContent: vm.live_vcpu_cpuset_summary.join(", ") || "n/a" }),
            el("div", { className: "metric-label", textContent: "Emulator cpuset" }),
            el("div", { className: "metric-value", textContent: vm.live_emulator_cpuset_summary.join(", ") || "n/a" }),
            el("pre", { textContent: vm.vcpupin_stdout_lines.join("\n") }),
        ]));
    });
    container.appendChild(vmGrid);
}

function renderTopology(curr, deltas) {
    var container = clear("topology-content");
    if (!container) return;
    var map = el("div", { className: "cpu-map" });
    (curr.cpu_tiles || []).forEach(function (tile) {
        var cpuState = (curr.cpu_state || []).find(function (item) { return item.cpu === tile.cpu; }) || {};
        var perCpu = deltas && deltas.per_cpu_pct["cpu" + tile.cpu] ? deltas.per_cpu_pct["cpu" + tile.cpu] : 0;
        var roleClass = "cpu-" + (tile.role_class || "other");
        map.appendChild(el("div", { className: "cpu-tile " + roleClass }, [
            el("div", { className: "cpu-num", textContent: String(tile.cpu) }),
            el("div", { className: "cpu-role", textContent: tile.label }),
            el("div", { className: "cpu-meta", textContent: pct(perCpu) + " util" }),
            el("div", { className: "cpu-meta", textContent: cpuState.current_khz ? (cpuState.current_khz / 1000000).toFixed(2) + " GHz" : "n/a" }),
        ]));
    });
    container.appendChild(map);
}

function renderMemory(curr, deltas) {
    var container = clear("memory-content");
    if (!container) return;
    var mem = curr.meminfo || {};
    var zram = curr.zram && curr.zram[0] ? curr.zram[0] : null;
    var grid = el("div", { className: "metric-grid" }, [
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "MemTotal" }),
            el("span", { className: "metric-value", textContent: humanBytes(mem.MemTotal) }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "MemAvailable" }),
            el("span", { className: "metric-value", textContent: humanBytes(mem.MemAvailable) }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "THP" }),
            el("span", { className: "metric-value", textContent: curr.thp.enabled + " / " + curr.thp.defrag }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "KSM saved" }),
            el("span", { className: "metric-value", textContent: humanBytes(curr.ksm.estimated_saved_bytes) }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "zram" }),
            el("span", { className: "metric-value", textContent: zram ? (humanBytes(zram.data_bytes) + " data / " + humanBytes(zram.mem_used_bytes) + " RAM") : "not active" }),
        ]),
        el("div", { className: "metric" }, [
            el("span", { className: "metric-label", textContent: "Swap Used" }),
            el("span", { className: "metric-value", textContent: humanBytes((curr.swap || []).reduce(function (sum, item) { return sum + item.used_bytes; }, 0)) }),
        ]),
    ]);
    container.appendChild(grid);
}

function renderOverhead(curr, deltas) {
    var container = clear("overhead-content");
    if (!container) return;
    var row = el("div", { className: "overhead-row" });
    ["ksmd", "kswapd0", "kswapd1", "kcompactd0", "kcompactd1"].forEach(function (name) {
        var value = deltas && deltas.thread_cpu[name] ? deltas.thread_cpu[name] : 0;
        var history = state.history.map(function (item) {
            return item.thread_cpu ? (item.thread_cpu[name] || 0) : 0;
        });
        var canvas = el("canvas", { className: "sparkline-canvas", "data-thread": name });
        row.appendChild(el("div", { className: "overhead-card" }, [
            el("span", { className: "metric-label", textContent: name }),
            el("span", { className: "metric-value", textContent: pct(value) + " core" }),
            canvas,
        ]));
        requestAnimationFrame(function () {
            drawSparkline(canvas, history, { color: "#e65100", fill: "rgba(230,81,0,0.08)", min: 0, spotColor: "#e65100" });
        });
    });
    container.appendChild(row);
}

function render() {
    if (!state.current) return;
    var deltas = state.history.length > 0 ? state.history[state.history.length - 1] : null;
    renderState(state.current);
    renderCpu(state.current, deltas);
    renderTopology(state.current, deltas);
    renderMemory(state.current, deltas);
    renderOverhead(state.current, deltas);
}

function poll() {
    if (state.paused) return;
    fetchData().then(function (data) {
        var deltas = compute(state.prev, data);
        state.current = data;
        state.prev = data;
        if (deltas) {
            state.history.push(deltas);
            if (state.history.length > 120) state.history.shift();
        }
        setStatus("ok");
        render();
    }).catch(function (err) {
        setStatus("error", String(err));
    }).finally(schedulePoll);
}

function schedulePoll() {
    window.clearTimeout(state.timer);
    if (!state.paused) state.timer = window.setTimeout(poll, state.interval);
}

function setPaused(paused) {
    state.paused = paused;
    document.getElementById("pause-btn").textContent = paused ? "Resume" : "Pause";
    if (paused) {
        setStatus("paused");
        window.clearTimeout(state.timer);
    } else {
        setStatus("waiting");
        poll();
    }
}

document.getElementById("interval-select").addEventListener("change", function (event) {
    state.interval = parseInt(event.target.value, 10);
    schedulePoll();
});

document.getElementById("pause-btn").addEventListener("click", function () {
    setPaused(!state.paused);
});

poll();
