# Interpreting Stakkr Observer

This document explains what each panel reports and how to read it in the
Stakkr host model.

<a href="./README.md"><kbd>&nbsp;&nbsp;OBSERVER README&nbsp;&nbsp;</kbd></a>
<a href="../../docs/shared-execution-pool-performance-domains.md"><kbd>&nbsp;&nbsp;SHARED EXECUTION POOL&nbsp;&nbsp;</kbd></a>
<a href="../../docs/clock-frequency-tiering.md"><kbd>&nbsp;&nbsp;CLOCK-TIERING&nbsp;&nbsp;</kbd></a>

## Current State

This is the first panel to check.

It answers one question:

**what policy is active on the host right now?**

Possible values:

- `stock`
- `shared execution pool`
- `clock-tiering`
- `mixed`

What good looks like:

- `shared execution pool` when the default Stakkr policy is applied
- `clock-tiering` only when that experiment is intentionally active
- `stock` after a full rollback

`mixed` means pieces of more than one model are still present.

## CPU Performance Domains

This panel shows the live Gold/Silver/Bronze control state.

It should let you confirm:

- `AllowedCPUs`
- `CPUWeight`
- vCPU cpuset placement
- emulator cpuset placement

In the default shared execution pool path, good looks like:

- `kvm-worker-01`: Gold, `CPUWeight=512`
- `kvm-worker-02`: Silver, `CPUWeight=333`
- `kvm-worker-03`: Bronze, `CPUWeight=167`
- guest vCPUs on `2-11`
- emulator threads on `0-1`

If the weights look correct but the pinning does not, the host is not fully in
the shared execution pool state yet.

## CPU Pool Topology

This is the per-CPU map.

Each tile shows:

- CPU number
- role assignment
- current utilization
- current frequency

Use it to verify:

- host reserve CPUs stay on the reserved side
- guest pool CPUs line up with the intended domain
- clock-tiering, when active, is visible as separated worker lanes

## Memory Overview

This panel summarizes:

- `MemTotal`
- `MemAvailable`
- THP mode
- KSM savings
- zram usage
- swap usage

Use it to answer:

- is memory oversubscription active?
- is KSM saving anything useful?
- is zram carrying compressed pages?
- is the host falling into real swap pressure?

## Memory Management Overhead

This panel tracks CPU cost from:

- `ksmd`
- `kswapd0`
- `kswapd1`
- `kcompactd0`
- `kcompactd1`

The point is not just whether KSM or zram is enabled. The point is whether the
kernel work behind those features is cheap enough to justify keeping them on.

Low steady-state overhead is what you want. Persistent overhead with little
memory benefit is a sign to revisit the host memory policy.
