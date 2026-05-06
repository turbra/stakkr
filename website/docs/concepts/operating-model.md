---
title: Operating Model
description: The default Stakkr CPU, memory, and VM policy shape.
---

# Operating Model

The default Stakkr model reserves a small CPU set for host and emulator work,
puts guest vCPUs in a shared execution pool, and uses relative weights for
Gold, Silver, and Bronze contention behavior.

## CPU Policy

| Setting | Default |
| --- | --- |
| Host reserve | `0-1` |
| Host housekeeping | `0-1` |
| Emulator CPUs | `0-1` |
| Guest execution pool | `2-11` |
| Gold `CPUWeight` | `512` |
| Silver `CPUWeight` | `333` |
| Bronze `CPUWeight` | `167` |

The weighted performance domains are relative contention domains. They are not
hard reservations.

## Memory Policy

| Setting | Default |
| --- | --- |
| zram device | `zram0` |
| zram size | `16G` |
| zram compression | `zstd` |
| THP mode | `madvise` |
| THP defrag mode | `madvise` |
| KSM run | `1` |

The memory policy is applied by the host memory oversubscription playbook and
verified by the status command.

## Live VM Policy

The live shared execution-pool path currently targets these managed workers:

| VM | Tier |
| --- | --- |
| `kvm-worker-01` | Gold |
| `kvm-worker-02` | Silver |
| `kvm-worker-03` | Bronze |

The managed workers must already exist before `shared-execution-pool-apply`
can shape their live systemd scopes and libvirt CPU pinning.

## Separate Experiment

Clock frequency tiering is a separate experiment. It uses dedicated CPU lanes
and per-lane max-frequency caps instead of the default shared execution-pool
model.
