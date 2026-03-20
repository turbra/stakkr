(async function () {
  const DATA_URL = "./live-state.json";
  const VM_NAMES = ["kvm-worker-01", "kvm-worker-02", "kvm-worker-03"];
  const TIERS = {
    "kvm-worker-01": "gold",
    "kvm-worker-02": "silver",
    "kvm-worker-03": "bronze",
  };

  function text(el, value) {
    el.textContent = value;
    return el;
  }

  function div(cls, value) {
    const el = document.createElement("div");
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = value;
    return el;
  }

  function pre(value) {
    const el = document.createElement("pre");
    el.textContent = value;
    return el;
  }

  function fmtGhz(khz) {
    return `${(khz / 1000000).toFixed(2)} GHz`;
  }

  function showError(msg) {
    const el = document.getElementById("error");
    el.style.display = "block";
    el.textContent = msg;
  }

  function clockControl(mode) {
    if (mode === "clock-tiering") return "Live";
    if (mode === "mixed") return "Partial";
    return "Inactive";
  }

  function configuredIntent(data) {
    return data.state_note;
  }

  function renderKeys(data) {
    const grid = document.getElementById("key-grid");
    const items = [
      ["Current State", data.state_label],
      ["Current Mode", data.mode],
      ["Host Reserve", data.host.housekeeping_cpus],
      ["Shared Cgroup Pool", data.host.guest_shared_cpus],
      ["Contention Tiers", "Enabled"],
      ["Clock Control", clockControl(data.mode)],
    ];
    items.forEach(([label, value]) => {
      const key = div("key");
      key.appendChild(text(document.createElement("strong"), label));
      key.appendChild(div("value", value));
      grid.appendChild(key);
    });
  }

  function renderSharedPool(data) {
    const layout = document.getElementById("cpu-layout");
    const wrap = div("tier-layout");

    const host = div("tier-card host");
    host.innerHTML = `<div><div class="eyebrow">Reserved</div><div class="title">Host / Emulator</div></div><div class="sub">CPUs ${data.host.housekeeping_cpus}<br>QEMU emulator threads live here</div>`;
    wrap.appendChild(host);

    const pool = div("tier-card pool");
    pool.innerHTML = `<div><div class="eyebrow">Shared Guest Pool</div><div class="title">CPUs ${data.host.guest_shared_cpus}</div></div><div class="sub">Guest vCPU threads from all workers compete in one shared execution pool</div>`;
    wrap.appendChild(pool);

    VM_NAMES.forEach((vmName) => {
      const tier = TIERS[vmName];
      const vm = data.vm_state[vmName] || {};
      const scope = data.scope_state[vmName] || {};
      const card = div(`tier-card ${tier}`);
      card.innerHTML =
        `<div><div class="eyebrow">${tier}</div><div class="title">${vmName}</div></div>` +
        `<div class="sub">CPUWeight ${scope.cpu_weight || "<unknown>"}<br>vCPU cpuset ${(vm.live_vcpu_cpuset_summary || ["<unknown>"]).join(", ")}</div>`;
      wrap.appendChild(card);
    });

    layout.appendChild(wrap);
    document.getElementById("cpu-layout-note").textContent =
      `In shared-pool mode, the host keeps CPUs ${data.host.housekeeping_cpus}, all workers share CPUs ${data.host.guest_shared_cpus}, and Gold, Silver, and Bronze shape degradation with CPUWeight.`;
  }

  function renderClockOrMixed(data) {
    const laneProfiles = {
      0: ["host", "Host", "--"],
      1: ["host", "Host", "--"],
      2: ["gold", "W1", "3 GHz"],
      3: ["gold", "W1", "3 GHz"],
      4: ["gold", "W1", "3 GHz"],
      5: ["silver", "W2", "2 GHz"],
      6: ["silver", "W2", "2 GHz"],
      7: ["silver", "W2", "2 GHz"],
      8: ["bronze", "W3", "1 GHz"],
      9: ["bronze", "W3", "1 GHz"],
      10: ["bronze", "W3", "1 GHz"],
      11: ["bronze", "W3", "1 GHz"],
    };
    const layout = document.getElementById("cpu-layout");
    const lane = div("cpu-lane");
    (data.cpu_state || []).slice().sort((a, b) => a.cpu - b.cpu).forEach((cpuInfo) => {
      const [klass, role, cap] = laneProfiles[cpuInfo.cpu] || ["host", "Host", "--"];
      const cpu = div(`cpu ${klass}`);
      cpu.innerHTML =
        `<div class="num">${cpuInfo.cpu}</div>` +
        `<div class="role">${role}</div>` +
        `<div class="cap">${cap}</div>` +
        `<div class="live">current ${fmtGhz(cpuInfo.current_khz)}<br>max ${fmtGhz(cpuInfo.hardware_max_khz)}</div>`;
      lane.appendChild(cpu);
    });
    layout.appendChild(lane);
    document.getElementById("cpu-layout-note").textContent =
      data.mode === "clock-tiering"
        ? "The live state matches the dedicated clock-tiering lane model."
        : "The live state is mixed. The lane map is shown only as a fallback visual.";
  }

  function renderScopes(data) {
    const grid = document.getElementById("scope-grid");
    VM_NAMES.forEach((vmName) => {
      const scope = data.scope_state[vmName] || {};
      const tier = TIERS[vmName];
      const card = div("scope");
      card.appendChild(text(document.createElement("h3"), vmName));
      card.appendChild(pre(
        `Scope: ${scope.scope || "<unresolved>"}\n` +
        `Tier: ${tier}\n` +
        `AllowedCPUs: ${scope.allowed_cpus || "<unknown>"}\n` +
        `CPUWeight: ${scope.cpu_weight || "<unknown>"}`
      ));
      grid.appendChild(card);
    });
  }

  function renderPins(data) {
    const grid = document.getElementById("vm-grid");
    VM_NAMES.forEach((vmName) => {
      const vm = data.vm_state[vmName] || {};
      const card = div("vm");
      const note = div("note");
      const liveVcpu = (vm.live_vcpu_cpuset_summary || ["<unknown>"]).join(", ");
      const liveEmu = (vm.live_emulator_cpuset_summary || ["<unknown>"]).join(", ");
      const target = data.mode === "clock-tiering"
        ? `Clock-tier target: ${vm.target_vcpu_cpuset || "<unknown>"} at ${vm.target_scaling_max_freq_khz || "<unknown>"} kHz`
        : `Shared-pool target: ${data.host.guest_shared_cpus} with emulator on ${data.host.housekeeping_cpus}`;
      card.appendChild(text(document.createElement("h3"), vmName));
      note.innerHTML = `Current vCPU cpuset: <strong>${liveVcpu}</strong><br>Current emulator cpuset: <strong>${liveEmu}</strong><br>${target}`;
      card.appendChild(note);
      card.appendChild(pre((vm.vcpupin_stdout_lines || []).join("\n")));
      card.appendChild(pre((vm.emulatorpin_stdout_lines || []).join("\n")));
      grid.appendChild(card);
    });
  }

  function renderCpuTable(data) {
    document.getElementById("clock-heading").textContent =
      data.mode === "clock-tiering" ? "Current Host CPU Max Frequency" : "Current Host CPU Frequency State";
    const body = document.getElementById("cpu-table-body");
    (data.cpu_state || []).slice().sort((a, b) => a.cpu - b.cpu).forEach((cpu) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${cpu.cpu}</td><td>${cpu.current_khz} kHz</td><td>${cpu.hardware_max_khz} kHz</td>`;
      body.appendChild(tr);
    });
  }

  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: HTTP ${res.status}`);
    const data = await res.json();
    document.getElementById("hero-meta").textContent =
      `Generated at ${data.generated_utc}. This view combines live worker pinning, host CPU reservation, current systemd scope AllowedCPUs, live CPUWeight, and host CPU frequency state.`;
    renderKeys(data);
    document.getElementById("configured-intent").textContent = configuredIntent(data);
    if (data.mode === "shared-pool") renderSharedPool(data);
    else renderClockOrMixed(data);
    renderScopes(data);
    renderPins(data);
    renderCpuTable(data);
  } catch (err) {
    showError(err.message);
  }
})();
