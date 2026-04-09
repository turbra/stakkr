---
title: Stakkr Observer
description: >-
  GitHub Pages entry for the Stakkr Cockpit observer, covering purpose, panels,
  install paths, and links to the packaged source.
---

# Stakkr Observer

<p class="stakkr-lead">
  Cockpit-based observability for the Stakkr host resource model, packaged as a
  standalone plugin and published here as the UI landing page.
</p>

<div class="stakkr-cta-row">
  <a href="https://github.com/turbra/stakkr/tree/main/cockpit/stakkr-observer">SOURCE</a>
  <a href="https://github.com/turbra/stakkr/blob/main/cockpit/stakkr-observer/README.md">README</a>
  <a href="{{ '/' | relative_url }}">DOCS HOME</a>
</div>

<div class="stakkr-badge-row">
  <img alt="Cockpit plugin" src="https://img.shields.io/badge/Cockpit-plugin-004080?style=flat-square" />
  <img alt="RPM installable" src="https://img.shields.io/badge/RPM-installable-EE0000?style=flat-square" />
  <img alt="Python 3 backend" src="https://img.shields.io/badge/Python-3-3776AB?style=flat-square" />
  <img alt="Plain JavaScript frontend" src="https://img.shields.io/badge/Frontend-plain%20JavaScript-1A1A1A?style=flat-square" />
</div>

The observer is the supported Stakkr UI path. It answers the live-state
question that the workflow docs deliberately do not:

> [!NOTE]
> Is the current host resource policy behaving the way Stakkr intends right
> now?

## What It Shows

- current host policy state
- CPU performance domains and weights
- CPU pool topology and per-CPU utilization
- host memory overview, including THP, KSM, and zram state
- memory management overhead from `ksmd`, `kswapd*`, and `kcompactd*`

## Where It Fits

Use the observer after the host foundation or cluster workflows are already in
motion. It is not a replacement for the operator entrypoints.

- For the default host CPU model, start with
  [Shared Execution Pool]({{ '/shared-execution-pool-performance-domains.html' | relative_url }})
- For the alternate experiment, use
  [Clock Frequency Tiering]({{ '/clock-frequency-tiering.html' | relative_url }})
- For repo-wide navigation, go back to the
  [Documentation Map]({{ '/documentation-map.html' | relative_url }})

## Install Paths

From the built RPM at the repo root:

```bash
cd /path/to/stakkr
sudo dnf install -y ./cockpit/stakkr-observer/rpmbuild/RPMS/noarch/cockpit-stakkr-observer-1.0.0-1.el10.noarch.rpm
```

From source into Cockpit's plugin directory:

```bash
sudo mkdir -p /usr/share/cockpit/stakkr-observer
sudo rsync -av /path/to/stakkr/cockpit/stakkr-observer/ /usr/share/cockpit/stakkr-observer/
```

## Panels

| Panel                      | Purpose                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Current State              | Live host policy state, host reserve, emulator placement, and guest domain placement |
| CPU Performance Domains    | Scope weights, allowed CPUs, vCPU pinning, and emulator pinning                      |
| CPU Pool Topology          | Per-CPU role map, utilization, and current frequency                                 |
| Memory Overview            | Host memory totals, THP state, KSM savings, zram state, and swap usage               |
| Memory Management Overhead | CPU cost of `ksmd`, `kswapd*`, and `kcompactd*`                                      |

## Source Of Truth

The authoritative implementation for the observer lives under
[`cockpit/stakkr-observer/`](https://github.com/turbra/stakkr/tree/main/cockpit/stakkr-observer).
This page is the GitHub Pages navigation destination for it, not a second
implementation.
