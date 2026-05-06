---
title: Local State And Secrets
description: Which Stakkr files are local-only and which files are committed examples.
---

# Local State And Secrets

Stakkr expects local operator state. Keep credentials, private keys,
kubeconfigs, pull secrets, local IPs, and machine-specific overrides out of
committed docs and examples unless they are explicitly safe placeholders.

## Local Inputs

| Path | Role |
| --- | --- |
| `inventory/hosts.yml` | Active local inventory |
| `inventory/group_vars/all/lab_credentials.yml` | Local vaulted credentials |
| `secrets/pull-secret.txt` | OpenShift pull secret |
| `secrets/id_ed25519` | Local SSH private key |
| `secrets/id_ed25519.pub` | Local SSH public key |
| `vars/cluster/openshift_install_cluster.yml` | Active OpenShift cluster inputs |
| `vars/guests/openshift_cluster_vm.yml` | Active OpenShift VM inputs |

## Committed Examples

Use committed examples as templates, then copy them to active local files:

| Example | Active file |
| --- | --- |
| `inventory/hosts.yml.example` | `inventory/hosts.yml` |
| `vars/cluster/openshift_install_cluster.yml.example` | `vars/cluster/openshift_install_cluster.yml` |
| `vars/cluster/openshift_install_cluster.compact.yml.example` | `vars/cluster/openshift_install_cluster.yml` |
| `vars/guests/openshift_cluster_vm.yml.example` | `vars/guests/openshift_cluster_vm.yml` |
| `vars/guests/openshift_cluster_vm.compact.yml.example` | `vars/guests/openshift_cluster_vm.yml` |

## Generated Output

Generated install artifacts, downloaded tools, and runtime output live under
`generated/` by default. Treat that tree as disposable local output.

See [Configuration Reference](/reference/configuration/) for the source files
that define these paths.
