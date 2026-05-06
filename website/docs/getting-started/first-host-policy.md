---
title: First Host Policy Apply
description: Apply and verify the Stakkr host CPU and memory foundation.
---

# First Host Policy Apply

Use this path when you want the host foundation in place before deploying or
retiering local VMs.

## Before You Start

Review [Prerequisites](/prerequisites/) and confirm the active inventory works:

```sh
ansible-inventory -i inventory/hosts.yml --graph
```

The host policy uses:

| Layer | Source |
| --- | --- |
| CPU pools and performance domains | `vars/global/host_resource_management.yml` |
| zram, THP, and KSM policy | `vars/global/host_memory_oversubscription.yml` |

## Apply

Run the CPU foundation first:

```sh
./scripts/host-resource-management.sh host-resource-management-apply
```

Apply the memory policy second:

```sh
./scripts/host-resource-management.sh host-memory-oversubscription-apply
```

## Verify

The status commands inspect live host state directly and do not run Ansible:

```sh
./scripts/host-resource-management.sh host-resource-management-status
./scripts/host-resource-management.sh host-memory-oversubscription-status
```

Expected default CPU policy:

| Setting | Value |
| --- | --- |
| Host reserve | `0-1` |
| Guest execution pool | `2-11` |
| Emulator CPUs | `0-1` |
| Gold `CPUWeight` | `512` |
| Silver `CPUWeight` | `333` |
| Bronze `CPUWeight` | `167` |

## Next Step

After the host foundation is active, deploy the worker VMs or confirm they
already exist before applying live shared execution-pool policy:

```sh
./scripts/host-resource-management.sh shared-execution-pool-apply
./scripts/host-resource-management.sh shared-execution-pool-status
```

For the full model and rollback order, see
[Shared Execution Pool With Weighted Performance Domains](/shared-execution-pool-performance-domains/).
