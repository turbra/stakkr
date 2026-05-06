---
title: Configuration Reference
description: Reference for Stakkr inventory, variables, secrets, and generated state.
---

# Configuration Reference

Stakkr separates committed examples, local operator inputs, generated output,
and secrets. Treat machine-local files as local state unless a page explicitly
says otherwise.

## Inventory

| Path | Purpose |
| --- | --- |
| `inventory/hosts.yml` | Active Ansible inventory. Local to the operator environment. |
| `inventory/hosts.yml.example` | Committed inventory example. Copy from this when building a new local inventory. |

## Global Variables

| Path | Purpose |
| --- | --- |
| `vars/global/execution_environment.yml` | Defines repository-relative generated, tools, and secrets paths. |
| `vars/global/host_resource_management.yml` | Source of truth for host reserved CPUs, emulator CPUs, guest-domain CPUs, and Gold/Silver/Bronze performance domains. |
| `vars/global/host_memory_oversubscription.yml` | Source of truth for zram, transparent hugepage, KSM, and rollback memory policy. |
| `vars/global/cgroup_tiering.yml` | Source of truth for live shared CPU placement, contention weights, managed workers, and clock-tiering experiment values. |
| `vars/global/rhsm.yml` | Red Hat subscription inputs wired to local credential variables. Do not put real secrets in committed files. |

## OpenShift Variables

| Path | Purpose |
| --- | --- |
| `vars/cluster/openshift_install_cluster.yml.example` | True SNO example. Uses `platform_type: none` and a single control-plane node. |
| `vars/cluster/openshift_install_cluster.compact.yml.example` | Compact example. Uses bare metal style VIPs and three control-plane nodes. |
| `vars/cluster/openshift_installer_binaries.yml` | Installer and client binary settings. |
| `vars/cluster/openshift_install_artifacts.yml` | Install artifact output settings. |
| `vars/cluster/openshift_agent_media.yml` | Agent media settings. |
| `vars/guests/openshift_cluster_vm.yml.example` | True SNO VM example, including the validated local SNO resource profile. |
| `vars/guests/openshift_cluster_vm.compact.yml.example` | Compact VM example with three control-plane profiles. |

Copy the matching example files to the active local names expected by the
playbooks:

```bash
cp vars/cluster/openshift_install_cluster.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.yml.example vars/guests/openshift_cluster_vm.yml
```

Use the compact examples when deploying the compact path.

## Guest Bootstrap Variables

| Path | Purpose |
| --- | --- |
| `vars/guests/rhel10_vms.yml.example` | Example generic RHEL 10 guest definitions. |
| `vars/guests/idm_vm.yml` | Local IdM VM definition used by `playbooks/bootstrap/idm-local.yml`. |

The IdM path currently expects a seeded guest image in `qcow2` or `raw`
format, not a RHEL DVD ISO.

## Secrets And Local State

The docs and examples reference local-only files such as:

| Path | Purpose |
| --- | --- |
| `secrets/pull-secret.txt` | OpenShift pull secret consumed by install artifact generation. |
| `secrets/id_ed25519` | Local SSH private key path used by the execution environment defaults. |
| `inventory/group_vars/all/lab_credentials.yml` | Local credentials such as activation keys, passwords, and operator SSH material. |
| `generated/` | Generated install artifacts, downloaded tools, and runtime output. |

Do not commit real secrets, kubeconfigs, pull secrets, private keys, local IP
addresses, private hostnames, or machine-specific overrides.

## Reference Values

The default host policy currently uses:

| Setting | Value |
| --- | --- |
| Host reserve | `0-1` |
| Host housekeeping | `0-1` |
| Emulator CPUs | `0-1` |
| Guest execution pool | `2-11` |
| Gold `CPUWeight` | `512` |
| Silver `CPUWeight` | `333` |
| Bronze `CPUWeight` | `167` |

The memory policy currently uses:

| Setting | Value |
| --- | --- |
| zram device | `zram0` |
| zram size | `16G` |
| zram compression | `zstd` |
| THP mode | `madvise` |
| THP defrag mode | `madvise` |
| KSM run | `1` |
| KSM pages to scan | `1000` |
| KSM sleep milliseconds | `20` |
