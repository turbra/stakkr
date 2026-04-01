# Stakkr

`stakkr` lets you shape how three `kvm-worker-*` guests share CPU on one KVM
host.

The default path is simple:

- all three workers share one guest CPU pool
- Gold, Silver, and Bronze decide who gets more CPU when the host is busy
- the host can also carry a foundation policy for CPU pools and memory efficiency

That is the small-scale adaptation of the host resource management model being
developed in [Calabi](https://github.com/gprocunier/calabi).

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
- local prerequisites:
  [checklist](./docs/prerequisites.md)
- local IdM VM bootstrap:
  [guide](./docs/idm-local-bootstrap.md)
- generic RHEL 10 VM bootstrap:
  [guide](./docs/rhel10-vm-bootstrap.md)
- local OpenShift cluster scaffold:
  [guide](./docs/openshift-local-cluster.md)
- [Cockpit observer](./cockpit/stakkr-observer/README.md)

> [!NOTE]
> The local IdM bootstrap currently expects a seeded guest image (`qcow2` or
> `raw`), not a RHEL DVD ISO. Its default NIC model now follows the worker VM
> pattern: `bridge0` with `virtio`.

> [!IMPORTANT]
> The local IdM path depends on the checklist in
> [prerequisites.md](./docs/prerequisites.md), including:
>
> - `freeipa.ansible_freeipa`
> - `inventory/group_vars/all/lab_credentials.yml`
> - a local RHEL guest image in `qcow2` format

> [!NOTE]
> The current OpenShift scaffold on `sno-go` is validated for true SNO first:
> one control-plane node, no initial workers, with a `12` vCPU SNO profile.
> It now follows the Calabi pattern for install media cleanup: the agent ISO is
> detached in a separate maintenance step after the first pivot reboot, before
> the final installer completion waits.
> The normal operator entrypoint is now
> [site-openshift-sno.yml](./playbooks/site-openshift-sno.yml), not a manual
> sequence of cluster phase playbooks.


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

Apply the host foundation first:

```bash
./scripts/host-resource-management.sh host-resource-management-apply
./scripts/host-resource-management.sh host-memory-oversubscription-apply
./scripts/host-resource-management.sh host-resource-management-status
./scripts/host-resource-management.sh host-memory-oversubscription-status
```

> [!NOTE]
> The `*-status` commands are direct host inspections now. They validate live
> state with system tools like `systemctl`, `virsh`, and `/sys` reads instead
> of running Ansible status playbooks, so they do not require vault decryption.

Apply the live shared execution pool policy second:

```bash
./scripts/host-resource-management.sh shared-execution-pool-apply
./scripts/host-resource-management.sh shared-execution-pool-status
```

> [!IMPORTANT]
> The host foundation commands do not require the managed worker VMs to already
> exist. `shared-execution-pool-apply` does.
>
> The live shared execution pool flow in this repo is defined around these
> already-deployed worker domains:
>
> - `kvm-worker-01`
> - `kvm-worker-02`
> - `kvm-worker-03`
>
> If those guests are not already present and running, apply the host
> foundation first, then deploy the workers, and only then run
> `shared-execution-pool-apply`.

> [!IMPORTANT]
> The normal operator order is:
>
> 1. `host-resource-management-apply`
> 2. `host-memory-oversubscription-apply`
> 3. `shared-execution-pool-apply`

> [!NOTE]
> `host-resource-management-*` is the host CPU foundation layer.
> `host-memory-oversubscription-*` is the host memory foundation layer.
> `shared-execution-pool-*` is the live VM policy layer.

Roll back the live shared execution pool policy:

```bash
./scripts/host-resource-management.sh shared-execution-pool-rollback
./scripts/host-resource-management.sh shared-execution-pool-status
```

Roll back the host foundation:

```bash
./scripts/host-resource-management.sh host-memory-oversubscription-rollback
./scripts/host-resource-management.sh host-resource-management-rollback
./scripts/host-resource-management.sh host-memory-oversubscription-status
./scripts/host-resource-management.sh host-resource-management-status
```

> [!IMPORTANT]
> `./scripts/host-resource-management.sh shared-execution-pool-apply` is the
> default live shared execution pool action. It applies both:
>
> - shared execution pool placement
> - Gold / Silver / Bronze performance-domain `CPUWeight`

> [!TIP]
> `./scripts/host-resource-management.sh shared-execution-pool-status` is the
> normal verification command for the live VM policy layer. Use
> `./scripts/host-resource-management.sh contention-status` only when you want a
> narrower view of the Gold / Silver / Bronze weights.

Apply the clock-tiering experiment:

```bash
./scripts/host-resource-management.sh clock-apply
./scripts/host-resource-management.sh clock-status
```

Roll back the clock-tiering experiment:

```bash
./scripts/host-resource-management.sh clock-rollback
```

Use the Cockpit observer:

```bash
sudo dnf install -y ./cockpit/stakkr-observer/rpmbuild/RPMS/noarch/cockpit-stakkr-observer-1.0.0-1.el10.noarch.rpm
```

Then open Cockpit and navigate to `Stakkr Observer`.

> [!NOTE]
> The Cockpit observer is now the supported UI path for Stakkr.
