# Stakkr Observer

Cockpit plugin for watching the Stakkr host resource model from the Cockpit web
console.

It follows the same observer pattern used by `calabi-observer`, but it is
adapted to the smaller Stakkr host shape.

<a href="../../docs/shared-execution-pool-performance-domains.md"><kbd>&nbsp;&nbsp;SHARED EXECUTION POOL&nbsp;&nbsp;</kbd></a>
<a href="../../docs/clock-frequency-tiering.md"><kbd>&nbsp;&nbsp;CLOCK-TIERING&nbsp;&nbsp;</kbd></a>
<a href="./INTERPRETING.md"><kbd>&nbsp;&nbsp;INTERPRETING&nbsp;&nbsp;</kbd></a>

## Contents

- [What It Does](#what-it-does)
- [Panels](#panels)
- [Architecture](#architecture)
- [Files](#files)
- [Data Sources](#data-sources)
- [Installation](#installation)
- [Building The RPM](#building-the-rpm)
- [Requirements](#requirements)
- [Usage](#usage)
- [Security Posture](#security-posture)
- [Tier Colors](#tier-colors)

## What It Does

The observer answers one question: **is the host resource policy working right
now?**

Without it, you have to cross-check `systemctl show`, `virsh vcpupin`,
`virsh emulatorpin`, `/proc/stat`, `/proc/meminfo`, KSM state, THP state, and
zram state by hand. The observer pulls those pieces together into a live Cockpit
view so the current host state is obvious at a glance.

For Stakkr, that means showing whether the host is in:

- `stock`
- `shared execution pool`
- `clock-tiering`
- `mixed`

## Panels

| Panel | Purpose |
| --- | --- |
| **Current State** | Current host policy state, host reserve, emulator placement, guest domain placement |
| **CPU Performance Domains** | Per-VM scope weights, allowed CPUs, live vCPU cpusets, emulator cpusets |
| **CPU Pool Topology** | Per-CPU role map with live CPU utilization and current frequency |
| **Memory Overview** | Host memory totals, available memory, THP state, KSM savings, zram state, swap usage |
| **Memory Management Overhead** | CPU overhead for `ksmd`, `kswapd*`, and `kcompactd*` |

## Panel Screenshots

### CPU Performance Domains

![CPU Performance Domains](./images/observer_cpu_performance_domains.png)

### CPU Pool Topology

![CPU Pool Topology](./images/observer_cpu_pool_topology.png)

### Memory Overview

![Memory Overview](./images/observer_memory_overview.png)

### Memory Management Overhead

![Memory Management Overhead](./images/observer_memory_management_overhead.png)

## Architecture

```text
┌───────────────────────────────────────────────────────┐
│  Browser (Cockpit web console)                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  stakkr-observer.js                             │  │
│  │  - polls collector.py via cockpit.spawn()       │  │
│  │  - computes deltas between samples              │  │
│  │  - renders DOM + canvas sparklines              │  │
│  └──────────────────────┬──────────────────────────┘  │
└─────────────────────────┼─────────────────────────────┘
                          │ cockpit-ws / cockpit-bridge
┌─────────────────────────┼─────────────────────────────┐
│  KVM host (as root)     │                             │
│  ┌──────────────────────▼──────────────────────────┐  │
│  │  collector.py                                   │  │
│  │  - reads procfs, sysfs, and cgroup state        │  │
│  │  - reads libvirt vCPU and emulator pinning      │  │
│  │  - reads systemd scope properties               │  │
│  │  - emits one JSON snapshot to stdout            │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

The frontend polls every 5 seconds by default. Delta computation happens in the
browser. The collector emits cumulative counters and the frontend diffs
consecutive samples to produce rates and CPU utilization.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Cockpit sidebar registration and CSP policy |
| `index.html` | HTML shell with panel structure |
| `collector.py` | Backend metrics collector, runs as root via `cockpit.spawn()` |
| `stakkr-observer.js` | Frontend polling, delta computation, DOM rendering |
| `stakkr-observer.css` | Observer styling for cards, tables, gauges, and topology tiles |
| `sparkline.js` | Canvas sparkline helper |
| `build-rpm.sh` | Builds a noarch Cockpit RPM from the observer sources |
| `cockpit-stakkr-observer.spec` | RPM packaging metadata |
| `INTERPRETING.md` | Operator notes on reading each panel |

No build step. No bundler. Plain HTML, CSS, JavaScript, and Python.

## Data Sources

| Source | What |
| --- | --- |
| `systemctl list-units` + `systemctl show` | live VM scope names, `AllowedCPUs`, `CPUWeight` |
| `virsh vcpupin` | live guest vCPU pinning |
| `virsh emulatorpin` | live emulator thread pinning |
| Per-scope cgroup `cpu.stat` | per-VM cgroup CPU usage |
| `/proc/stat` | host-wide and per-CPU jiffies |
| `/proc/cpuinfo` | current CPU frequency in MHz |
| `/proc/meminfo` | host memory totals and availability |
| `/proc/vmstat` | swap activity counters |
| `/proc/<pid>/stat` | kernel thread CPU cost for `ksmd`, `kswapd*`, `kcompactd*` |
| `/sys/kernel/mm/ksm/*` | KSM sharing, scanning, and saved memory |
| `/sys/kernel/mm/transparent_hugepage/*` | THP enabled and defrag mode |
| `zramctl --bytes` | zram size, usage, compression, and RAM cost |
| `swapon --bytes` | swap device size and usage |

## Installation

### From source

```bash
sudo mkdir -p /usr/share/cockpit/stakkr-observer
sudo rsync -av /path/to/stakkr/cockpit/stakkr-observer/ /usr/share/cockpit/stakkr-observer/
```

Cockpit picks up new plugins on page load. No service restart is required.

### From RPM

Build the RPM first:

```bash
cd /path/to/stakkr/cockpit/stakkr-observer
./build-rpm.sh
```

Then install it from the same directory:

```bash
sudo dnf install -y ./rpmbuild/RPMS/noarch/cockpit-stakkr-observer-1.0.0-1.el10.noarch.rpm
```

If you are standing at the repo root instead, use:

```bash
cd /path/to/stakkr
sudo dnf install -y ./cockpit/stakkr-observer/rpmbuild/RPMS/noarch/cockpit-stakkr-observer-1.0.0-1.el10.noarch.rpm
```

> [!IMPORTANT]
> Use `./...rpm` so `dnf` treats the target as a local file path.

> [!NOTE]
> Prefer a normal SSH shell for the RPM install step. If the Cockpit terminal
> session drops, rerun the same `dnf install` command over SSH.

## Building The RPM

Install the packaging tool once on the build host:

```bash
sudo dnf install -y rpm-build
```

Then build from the observer directory:

```bash
cd /path/to/stakkr/cockpit/stakkr-observer
./build-rpm.sh
```

Build output:

- `rpmbuild/RPMS/noarch/cockpit-stakkr-observer-*.noarch.rpm`
- `rpmbuild/SRPMS/cockpit-stakkr-observer-*.src.rpm`

## Requirements

- `cockpit-system` and `cockpit-bridge`
- `python3`
- `libvirt-client` for `virsh`
- root access through Cockpit's privilege escalation path

The collector reads sysfs, procfs, cgroups, and live libvirt state, so it must
run with root privileges.

## Usage

Navigate to **Stakkr Observer** in the Cockpit sidebar. The plugin starts
polling immediately.

Controls:

- **Interval selector**: change the poll interval to `2s`, `5s`, `10s`, or `30s`
- **Pause / Resume**: stop and resume polling
- **Status dot**:
  - green: healthy
  - amber: paused
  - red: collection error

## Tier Colors

Consistent across the observer:

| Tier | Color | Hex |
| --- | --- | --- |
| Gold | gold | `#c9b037` |
| Silver | silver | `#a8a9ad` |
| Bronze | bronze | `#cd7f32` |

## Security Posture

The plugin stays inside Cockpit's existing authentication and authorization
boundary. It does not open a port, add a second login flow, or accept arbitrary
input from outside Cockpit.

Strengths:

| Area | Detail |
| --- | --- |
| No shell interpolation | `collector.py` uses `subprocess.run()` with list arguments |
| Read-only collector | The collector reads host state. It does not write to the host |
| No external dependencies | Only Python standard library and Cockpit's bundled runtime are used |
| DOM safety | The frontend uses DOM APIs and `textContent`, not arbitrary HTML injection |
| Auth delegation | Privilege escalation is handled by Cockpit's own `superuser: "require"` path |

Residual note:

> [!NOTE]
> The collector runs as root because the data it reads requires it. That is the
> same trust boundary Cockpit already uses for privileged host operations.
