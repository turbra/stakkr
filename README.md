# Stakkr

`stakkr` lets you shape how three `kvm-worker-*` guests share CPU on one KVM
host.

The default path is simple:

- all three workers share one guest CPU pool
- Gold, Silver, and Bronze decide who gets more CPU when the host is busy

That is the small-scale adaptation of the host resource management model being
developed in `dcib2026`.

There is also an optional second path:

- each worker gets its own CPU lane
- each lane gets its own frequency ceiling

That clock-lane path is useful for experiments, but it is not the default
operating model.

## Start Here

- shared execution pool path:
  [method](./docs/shared-execution-pool-performance-domains.md),
  [findings](./docs/shared-execution-pool-validation.md)
- clock-lane path:
  [method](./docs/clock-frequency-tiering.md),
  [findings](./docs/clock-frequency-validation.md)
- [dashboard generation and serving](./docs/dashboard.md)


## Default Operating Model

- host reserve: `0-1`
- guest execution pool: `2-11`
- emulator threads: `0-1`
- performance domains:
  - `kvm-worker-01` Gold `CPUWeight=512`
  - `kvm-worker-02` Silver `CPUWeight=333`
  - `kvm-worker-03` Bronze `CPUWeight=167`

Use this path when you want the workers to compete in one pool and degrade in
an intentional order.

## Quick Commands

Inventory check:

```bash
ansible-inventory -i inventory/hosts.yml --graph
```

Apply the shared execution pool path:

```bash
./scripts/host-resource-management.sh apply
./scripts/host-resource-management.sh status
```

> [!IMPORTANT]
> `./scripts/host-resource-management.sh apply` is the default shared execution
> pool action. It applies both:
>
> - shared execution pool placement
> - Gold / Silver / Bronze performance-domain `CPUWeight`

> [!TIP]
> `./scripts/host-resource-management.sh status` is the normal verification
> command. Use `./scripts/host-resource-management.sh contention-status` only
> when you want a narrower view of the Gold / Silver / Bronze weights.

Roll back the shared execution pool path:

```bash
./scripts/host-resource-management.sh rollback
```

Apply the clock-tiering experiment:

```bash
./scripts/host-resource-management.sh clock-apply
./scripts/host-resource-management.sh clock-status
```

Roll back the clock-tiering experiment:

```bash
./scripts/host-resource-management.sh clock-rollback
```

Run the dashboard:

```bash
./scripts/dashboard-workflow.sh serve
```

Then open:

```text
http://localhost:8081/
```
