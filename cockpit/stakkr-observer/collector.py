#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys
import time

MANAGED_VMS = ["kvm-worker-01", "kvm-worker-02", "kvm-worker-03"]
VM_TIERS = {
    "kvm-worker-01": "gold",
    "kvm-worker-02": "silver",
    "kvm-worker-03": "bronze",
}
SHARED_GUEST_CPUSET = "2-11"
HOST_CPUSET = "0-1"
CLOCK_CPUSETS = {
    "kvm-worker-01": "2-4",
    "kvm-worker-02": "5-7",
    "kvm-worker-03": "8-11",
}
TIER_WEIGHTS = {"gold": 512, "silver": 333, "bronze": 167}
KERNEL_THREADS = ["ksmd", "kswapd0", "kswapd1", "kcompactd0", "kcompactd1"]


def read_text(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    except (FileNotFoundError, PermissionError):
        return None


def read_int(path: str) -> int | None:
    text = read_text(path)
    if text in (None, ""):
        return None
    return int(text)


def run(*argv: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(list(argv), check=check, capture_output=True, text=True)


def parse_meminfo() -> dict[str, int]:
    wanted = {
        "MemTotal", "MemFree", "MemAvailable", "Buffers", "Cached",
        "SwapCached", "AnonPages", "Shmem", "KReclaimable", "Slab",
        "PageTables", "KernelStack", "Active", "Inactive",
    }
    result: dict[str, int] = {}
    with open("/proc/meminfo", "r", encoding="utf-8") as fh:
        for line in fh:
            key, _, rest = line.partition(":")
            if key in wanted:
                result[key] = int(rest.strip().split()[0]) * 1024
    return result


def parse_ksm() -> dict:
    base = "/sys/kernel/mm/ksm"
    keys = [
        "run", "pages_shared", "pages_sharing", "pages_unshared",
        "pages_volatile", "full_scans", "pages_to_scan", "sleep_millisecs",
        "ksm_zero_pages",
    ]
    result: dict[str, int | str] = {}
    for key in keys:
        result[key] = read_int(os.path.join(base, key)) or 0
    page_size = os.sysconf("SC_PAGE_SIZE")
    result["page_size"] = page_size
    result["estimated_saved_bytes"] = ((result["pages_sharing"] or 0) + (result["ksm_zero_pages"] or 0)) * page_size
    return result


def parse_thp() -> dict:
    enabled = read_text("/sys/kernel/mm/transparent_hugepage/enabled") or ""
    defrag = read_text("/sys/kernel/mm/transparent_hugepage/defrag") or ""

    def active(raw: str) -> str:
        for token in raw.split():
            if token.startswith("[") and token.endswith("]"):
                return token[1:-1]
        return ""

    return {
        "enabled_raw": enabled,
        "defrag_raw": defrag,
        "enabled": active(enabled),
        "defrag": active(defrag),
    }


def parse_zram() -> list[dict]:
    result: list[dict] = []
    proc = run(
        "zramctl", "--bytes", "--noheadings", "--output",
        "NAME,DISKSIZE,DATA,COMPR,TOTAL,MEM-USED,ALGORITHM,STREAMS",
        check=False,
    )
    if proc.returncode != 0:
        return result
    for raw_line in proc.stdout.splitlines():
        parts = raw_line.strip().split()
        if len(parts) != 8:
            continue
        name, disksize, data, compr, total, mem_used, algorithm, streams = parts
        result.append({
            "name": name,
            "disksize_bytes": int(disksize),
            "data_bytes": int(data),
            "compressed_bytes": int(compr),
            "total_bytes": int(total),
            "mem_used_bytes": int(mem_used),
            "algorithm": algorithm,
            "streams": int(streams),
            "estimated_saved_bytes": max(int(data) - int(mem_used), 0),
        })
    return result


def parse_swap() -> list[dict]:
    result: list[dict] = []
    proc = run("swapon", "--bytes", "--noheadings", "--output", "NAME,SIZE,USED,PRIO", check=False)
    if proc.returncode != 0:
        return result
    for raw_line in proc.stdout.splitlines():
        parts = raw_line.strip().split()
        if len(parts) < 4:
            continue
        name, size, used, prio = parts[:4]
        result.append({
            "name": name,
            "size_bytes": int(size),
            "used_bytes": int(used),
            "priority": int(prio),
        })
    return result


def parse_vmstat_swap() -> dict:
    wanted = {"pswpin", "pswpout", "pgsteal_kswapd", "pgsteal_direct", "pgscan_kswapd"}
    result: dict[str, int] = {}
    with open("/proc/vmstat", "r", encoding="utf-8") as fh:
        for line in fh:
            parts = line.split()
            if len(parts) == 2 and parts[0] in wanted:
                result[parts[0]] = int(parts[1])
    return result


def parse_kernel_thread_cpu() -> dict:
    clock_ticks = os.sysconf("SC_CLK_TCK")
    result: dict[str, dict | None] = {}
    for stat_path in glob.glob("/proc/[0-9]*/stat"):
        try:
            with open(stat_path, "r", encoding="utf-8") as fh:
                content = fh.read()
        except (FileNotFoundError, PermissionError):
            continue
        lparen = content.find("(")
        rparen = content.rfind(")")
        if lparen < 0 or rparen < 0:
            continue
        comm = content[lparen + 1:rparen]
        if comm not in KERNEL_THREADS:
            continue
        rest = content[rparen + 2:].split()
        if len(rest) < 13:
            continue
        utime = int(rest[11])
        stime = int(rest[12])
        pid = int(content[:lparen].strip())
        result[comm] = {
            "pid": pid,
            "utime_ticks": utime,
            "stime_ticks": stime,
            "total_ticks": utime + stime,
            "clock_ticks_per_sec": clock_ticks,
            "total_seconds": (utime + stime) / clock_ticks,
        }
    for name in KERNEL_THREADS:
        result.setdefault(name, None)
    return result


def parse_host_cpu() -> dict:
    aggregate: dict = {}
    per_cpu: dict[str, dict] = {}
    with open("/proc/stat", "r", encoding="utf-8") as fh:
        for line in fh:
            if not line.startswith("cpu"):
                continue
            parts = line.split()
            vals = {
                "user": int(parts[1]),
                "nice": int(parts[2]),
                "system": int(parts[3]),
                "idle": int(parts[4]),
                "iowait": int(parts[5]),
                "irq": int(parts[6]),
                "softirq": int(parts[7]),
                "steal": int(parts[8]) if len(parts) > 8 else 0,
            }
            if parts[0] == "cpu":
                aggregate = vals
            else:
                per_cpu[parts[0]] = vals
    return {"aggregate": aggregate, "per_cpu": per_cpu}


def parse_cpu_freq() -> dict[str, float]:
    result: dict[str, float] = {}
    cpu_idx = 0
    with open("/proc/cpuinfo", "r", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("processor"):
                cpu_idx = int(line.split(":")[1].strip())
            elif line.startswith("cpu MHz"):
                result[f"cpu{cpu_idx}"] = float(line.split(":")[1].strip())
    return result


def detect_scope_name(vm_name: str) -> str | None:
    proc = run("systemctl", "list-units", "--type=scope", "--all", "--no-pager", check=False)
    if proc.returncode != 0:
        return None
    for line in proc.stdout.splitlines():
        if vm_name in line:
            return line.split()[0]
    return None


def parse_scope_state() -> dict:
    state: dict = {}
    for vm_name in MANAGED_VMS:
        scope = detect_scope_name(vm_name)
        if not scope:
            continue
        props = run("systemctl", "show", scope, "-p", "AllowedCPUs", "-p", "CPUWeight", check=False)
        allowed = ""
        weight = "[not set]"
        if props.returncode == 0:
            for line in props.stdout.splitlines():
                if line.startswith("AllowedCPUs="):
                    allowed = line.split("=", 1)[1]
                elif line.startswith("CPUWeight="):
                    weight = line.split("=", 1)[1]
        state[vm_name] = {
            "scope": scope,
            "allowed_cpus": allowed,
            "cpu_weight": weight,
            "tier": VM_TIERS[vm_name],
        }
    return state


def parse_vm_pinning() -> dict:
    result: dict = {}
    for vm_name in MANAGED_VMS:
        vcpu_proc = run("virsh", "vcpupin", vm_name, check=False)
        emu_proc = run("virsh", "emulatorpin", vm_name, check=False)
        vcpu_lines = vcpu_proc.stdout.splitlines() if vcpu_proc.returncode == 0 else []
        emu_lines = emu_proc.stdout.splitlines() if emu_proc.returncode == 0 else []
        vcpu_summary = []
        for line in vcpu_lines[2:]:
            parts = line.split()
            if parts:
                vcpu_summary.append(parts[-1])
        emu_summary = []
        for line in emu_lines[2:]:
            parts = line.split(": ")
            if len(parts) == 2:
                emu_summary.append(parts[-1])
        result[vm_name] = {
            "domain": vm_name,
            "tier": VM_TIERS[vm_name],
            "vcpupin_stdout_lines": vcpu_lines,
            "emulatorpin_stdout_lines": emu_lines,
            "live_vcpu_cpuset_summary": sorted(set(vcpu_summary)),
            "live_emulator_cpuset_summary": sorted(set(emu_summary)),
        }
    return result


def parse_cpu_state() -> list[dict]:
    result: list[dict] = []
    cpu_count = os.cpu_count() or 1
    for cpu in range(cpu_count):
        scaling = read_int(f"/sys/devices/system/cpu/cpu{cpu}/cpufreq/scaling_max_freq")
        hardware = read_int(f"/sys/devices/system/cpu/cpu{cpu}/cpufreq/cpuinfo_max_freq")
        if scaling is None or hardware is None:
            continue
        result.append({"cpu": cpu, "current_khz": scaling, "hardware_max_khz": hardware})
    return result


def classify_state(scope_state: dict, vm_state: dict) -> tuple[str, str]:
    clock = all(
        CLOCK_CPUSETS[vm] in vm_state.get(vm, {}).get("live_vcpu_cpuset_summary", [])
        for vm in MANAGED_VMS
    ) and all(
        HOST_CPUSET in vm_state.get(vm, {}).get("live_emulator_cpuset_summary", [])
        for vm in MANAGED_VMS
    )

    shared = all(
        SHARED_GUEST_CPUSET in vm_state.get(vm, {}).get("live_vcpu_cpuset_summary", [])
        for vm in MANAGED_VMS
    ) and all(
        HOST_CPUSET in vm_state.get(vm, {}).get("live_emulator_cpuset_summary", [])
        for vm in MANAGED_VMS
    ) and all(
        str(TIER_WEIGHTS[VM_TIERS[vm]]) == scope_state.get(vm, {}).get("cpu_weight", "")
        for vm in MANAGED_VMS
    )

    stock = all(
        "0-11" in vm_state.get(vm, {}).get("live_vcpu_cpuset_summary", [])
        for vm in MANAGED_VMS
    ) and all(
        "0-11" in vm_state.get(vm, {}).get("live_emulator_cpuset_summary", [])
        for vm in MANAGED_VMS
    )

    if clock:
        return "clock-tiering", "Dedicated worker lanes and per-lane frequency caps are live."
    if shared:
        return "shared execution pool", "Guest vCPUs share CPUs 2-11, emulator threads stay on 0-1, and Gold/Silver/Bronze weights are live."
    if stock:
        return "stock", "No shared execution pool placement, contention weighting, or clock-lane controls are active."
    return "mixed", "Some controls are active, but the host does not match stock, shared execution pool, or clock-tiering exactly."


def parse_domain_cpu_stat(scope_name: str) -> dict | None:
    base = f"/sys/fs/cgroup/machine.slice/{scope_name}/cpu.stat"
    text = read_text(base)
    if text is None:
        match = glob.glob(f"/sys/fs/cgroup/**/{scope_name}/cpu.stat", recursive=True)
        if not match:
            return None
        text = read_text(match[0])
        if text is None:
            return None
    result: dict[str, int] = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 2:
            result[parts[0]] = int(parts[1])
    return result


def parse_domain_cgroups(scope_state: dict) -> dict:
    result: dict = {}
    for vm_name, info in scope_state.items():
        cpu_stat = parse_domain_cpu_stat(info["scope"])
        if cpu_stat:
            result[vm_name] = cpu_stat
    return result


def build_cpu_tiles(mode: str) -> list[dict]:
    tiles = []
    cpu_count = os.cpu_count() or 1
    for cpu in range(cpu_count):
        role_class = "other"
        label = "Other"
        if cpu in (0, 1):
            role_class = "host"
            label = "Host / Emulator"
        elif mode == "clock-tiering":
            if 2 <= cpu <= 4:
                role_class = "gold"
                label = "Gold Lane"
            elif 5 <= cpu <= 7:
                role_class = "silver"
                label = "Silver Lane"
            elif 8 <= cpu <= 11:
                role_class = "bronze"
                label = "Bronze Lane"
        else:
            if 2 <= cpu <= 11:
                role_class = "pool"
                label = "Guest Pool"
        tiles.append({"cpu": cpu, "role_class": role_class, "label": label})
    return tiles


def collect() -> dict:
    scope_state = parse_scope_state()
    vm_state = parse_vm_pinning()
    state_label, state_note = classify_state(scope_state, vm_state)
    domains = []
    for vm_name in MANAGED_VMS:
        domains.append({"name": vm_name, "tier": VM_TIERS[vm_name]})
    return {
        "timestamp": time.time(),
        "state_label": state_label,
        "state_note": state_note,
        "host": {
            "host_reserved": HOST_CPUSET,
            "host_emulator": HOST_CPUSET,
            "guest_domain": SHARED_GUEST_CPUSET,
        },
        "scope_state": scope_state,
        "vm_state": vm_state,
        "cpu_state": parse_cpu_state(),
        "cpu_tiles": build_cpu_tiles(state_label),
        "meminfo": parse_meminfo(),
        "ksm": parse_ksm(),
        "thp": parse_thp(),
        "zram": parse_zram(),
        "swap": parse_swap(),
        "vmstat_swap": parse_vmstat_swap(),
        "kernel_threads": parse_kernel_thread_cpu(),
        "host_cpu": parse_host_cpu(),
        "cpu_freq": parse_cpu_freq(),
        "domains": domains,
        "domain_cgroups": parse_domain_cgroups(scope_state),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Stakkr Observer metrics collector")
    parser.parse_args()
    try:
        json.dump(collect(), sys.stdout)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({"error": str(exc)}, sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
