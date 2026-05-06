---
title: Host Resource Management Script
description: Command reference for scripts/host-resource-management.sh.
---

# Host Resource Management Script

Use `scripts/host-resource-management.sh` as the operator wrapper for host CPU
policy, memory oversubscription, live shared execution-pool policy, and clock
tiering experiments.

```bash
./scripts/host-resource-management.sh <action> [ansible-playbook args]
```

The wrapper runs from the repository root and uses `inventory/hosts.yml`.
Status actions inspect live host state directly with `systemctl`, `virsh`, and
`/sys` reads. Apply and rollback actions call the Ansible playbooks listed
below.

## Normal Order

Run the host foundation before applying the live VM policy.

```bash
./scripts/host-resource-management.sh host-resource-management-apply
./scripts/host-resource-management.sh host-memory-oversubscription-apply
./scripts/host-resource-management.sh shared-execution-pool-apply
./scripts/host-resource-management.sh shared-execution-pool-status
```

The shared execution-pool action expects the managed worker domains to already
exist and be running:

| VM | Tier | Target CPUWeight |
| --- | --- | --- |
| `kvm-worker-01` | Gold | `512` |
| `kvm-worker-02` | Silver | `333` |
| `kvm-worker-03` | Bronze | `167` |

## Actions

| Action | Behavior |
| --- | --- |
| `host-resource-management-apply` | Runs `playbooks/maintenance/host-resource-management-apply.yml`. Installs systemd manager and machine slice policy from `vars/global/host_resource_management.yml`. |
| `host-resource-management-rollback` | Runs `playbooks/maintenance/host-resource-management-rollback.yml`. Removes the host resource policy files and reloads affected services. |
| `host-resource-management-status` | Inspects configured CPU pools, performance-domain weights, systemd drop-ins, machine slices, and irqbalance state. |
| `host-memory-oversubscription-apply` | Runs `playbooks/maintenance/host-memory-oversubscription-apply.yml`. Applies zram, THP, and KSM policy from `vars/global/host_memory_oversubscription.yml`. |
| `host-memory-oversubscription-rollback` | Runs `playbooks/maintenance/host-memory-oversubscription-rollback.yml`. Stops the policy unit and restores rollback values. |
| `host-memory-oversubscription-status` | Inspects the live zram, THP, KSM, and service state. |
| `shared-execution-pool-apply` | Runs `cgroup-tiering-apply-v1.yml`, then `contention-tiering-apply-v1.yml`. This is the default live VM policy action. |
| `shared-execution-pool-rollback` | Runs `contention-tiering-rollback-v1.yml`, then `cgroup-tiering-rollback-v1.yml`. |
| `shared-execution-pool-status` | Shows whether managed workers look like shared execution-pool, clock-tiered, stock, or mixed state. |
| `contention-status` | Shows only the live Gold, Silver, and Bronze CPUWeight state. |
| `contention-apply` | Runs `playbooks/maintenance/contention-tiering-apply-v1.yml`. |
| `contention-rollback` | Runs `playbooks/maintenance/contention-tiering-rollback-v1.yml`. |
| `clock-status` | Shows the live per-VM cpuset, emulator pinning, and CPU max-frequency state for the clock-tiering experiment. |
| `clock-apply` | Runs `playbooks/maintenance/clock-frequency-tiering-apply-v1.yml`. |
| `clock-rollback` | Runs `playbooks/maintenance/clock-frequency-tiering-rollback-v1.yml`. |

Legacy aliases are still accepted:

| Alias | Current action |
| --- | --- |
| `apply` | `shared-execution-pool-apply` |
| `rollback` | `shared-execution-pool-rollback` |
| `status` | `shared-execution-pool-status` |

## Passing Ansible Arguments

Extra arguments are forwarded to `ansible-playbook` for apply and rollback
actions.

```bash
./scripts/host-resource-management.sh shared-execution-pool-apply --ask-vault-pass
```

Status actions do not call Ansible and do not use forwarded playbook arguments.

## Related Pages

- [Shared Execution Pool With Weighted Performance Domains](/shared-execution-pool-performance-domains)
- [Clock Frequency Tiering](/clock-frequency-tiering)
- [Configuration Reference](/reference/configuration)
