(() => {
  const DATA_URL = "/live-state.json";
  const VM_NAMES = ["kvm-worker-01", "kvm-worker-02", "kvm-worker-03"];
  const TIERS = {
    "kvm-worker-01": "gold",
    "kvm-worker-02": "silver",
    "kvm-worker-03": "bronze",
  };

  const el = (id) => document.getElementById(id);

  function klassForState(label) {
    const normalized = String(label || "").toLowerCase();
    if (normalized === "stock") return "state-stock";
    if (normalized === "shared execution pool") return "state-shared";
    if (normalized === "clock-tiering") return "state-clock";
    return "state-mixed";
  }

  function fmtGHz(khz) {
    return `${(khz / 1000000).toFixed(2)} GHz`;
  }

  function showError(message) {
    const node = el("error");
    node.classList.remove("hidden");
    node.textContent = message;
  }

  function renderSummary(data) {
    const state = data.state_label || "Unknown";
    el("statePill").textContent = state;
    el("statePill").className = `pill ${klassForState(state)}`;
    el("generatedPill").textContent = data.generated_utc || "snapshot";

    el("summaryBox").textContent =
      `Current state : ${state}\n` +
      `${data.state_note || "No summary available."}`;

    el("intentBox").textContent =
      `Host reserve  : ${data.host.housekeeping_cpus}\n` +
      `Guest pool    : ${data.host.guest_shared_cpus}\n` +
      `Current mode  : ${data.mode}\n` +
      `Clock control : ${data.mode === "clock-tiering" ? "live" : data.mode === "mixed" ? "partial" : "inactive"}`;
  }

  function renderLayout(data) {
    const lines = [];
    if (data.state_label === "Shared execution pool") {
      lines.push(`Host / emulator reserve : CPUs ${data.host.housekeeping_cpus}`);
      lines.push(`Shared guest pool       : CPUs ${data.host.guest_shared_cpus}`);
      lines.push("");
      VM_NAMES.forEach((vmName) => {
        const tier = TIERS[vmName];
        const scope = data.scope_state[vmName] || {};
        lines.push(`${vmName.padEnd(14, " ")} : ${tier.padEnd(6, " ")} CPUWeight ${scope.cpu_weight || "?"}`);
      });
    } else if (data.state_label === "Clock-tiering") {
      VM_NAMES.forEach((vmName) => {
        const vm = data.vm_state[vmName] || {};
        lines.push(`${vmName.padEnd(14, " ")} : ${vm.target_vcpu_cpuset || "?"} @ ${vm.target_scaling_max_freq_khz || "?"} kHz`);
      });
      lines.push(`Emulator reserve       : ${data.host.housekeeping_cpus}`);
    } else if (data.state_label === "Stock") {
      lines.push("No host resource controls are active.");
      lines.push("Guest vCPUs and emulator threads are at stock pinning.");
    } else {
      lines.push("The host is in a mixed state.");
      lines.push("Use the scope and pinning tables below as the source of truth.");
    }
    el("layoutBox").textContent = lines.join("\n");
  }

  function renderScopes(data) {
    const body = el("scopeBody");
    body.innerHTML = "";
    VM_NAMES.forEach((vmName) => {
      const tr = document.createElement("tr");
      const scope = data.scope_state[vmName] || {};
      const tier = TIERS[vmName];
      tr.innerHTML =
        `<td>${vmName}</td>` +
        `<td class="tier-${tier}">${tier}</td>` +
        `<td>${scope.allowed_cpus || "<unset>"}</td>` +
        `<td>${scope.cpu_weight || "<unset>"}</td>`;
      body.appendChild(tr);
    });
  }

  function renderPins(data) {
    const grid = el("pinGrid");
    grid.innerHTML = "";
    VM_NAMES.forEach((vmName) => {
      const vm = data.vm_state[vmName] || {};
      const tier = TIERS[vmName];
      const card = document.createElement("section");
      card.className = "card";
      card.innerHTML =
        `<div class="card__title tier-${tier}">${vmName}</div>` +
        `<div class="card__meta">Current vCPU cpuset: ${(vm.live_vcpu_cpuset_summary || ["<unknown>"]).join(", ")}<br>` +
        `Current emulator cpuset: ${(vm.live_emulator_cpuset_summary || ["<unknown>"]).join(", ")}</div>`;
      const vcpu = document.createElement("pre");
      vcpu.className = "terminal";
      vcpu.textContent = (vm.vcpupin_stdout_lines || []).join("\n");
      const emu = document.createElement("pre");
      emu.className = "terminal";
      emu.textContent = (vm.emulatorpin_stdout_lines || []).join("\n");
      card.appendChild(vcpu);
      card.appendChild(emu);
      grid.appendChild(card);
    });
  }

  function renderCpuTable(data) {
    const body = el("cpuBody");
    body.innerHTML = "";
    (data.cpu_state || []).slice().sort((a, b) => a.cpu - b.cpu).forEach((cpu) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${cpu.cpu}</td>` +
        `<td>${fmtGHz(cpu.current_khz)}</td>` +
        `<td>${fmtGHz(cpu.hardware_max_khz)}</td>`;
      body.appendChild(tr);
    });
  }

  async function main() {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load ${DATA_URL}: HTTP ${res.status}`);
      }
      const data = await res.json();
      renderSummary(data);
      renderLayout(data);
      renderScopes(data);
      renderPins(data);
      renderCpuTable(data);
    } catch (err) {
      showError(err.message);
    }
  }

  main();
})();
