---
title: First SNO Deploy
description: Prepare local inputs and run the Stakkr single-node OpenShift path.
---

# First SNO Deploy

Use the SNO path when the target is a true single-node OpenShift lab on one
local libvirt host.

## Before You Start

Read [Prerequisites](/prerequisites/) first. The SNO workflow assumes these
local inputs already exist:

| Input | Path |
| --- | --- |
| Active inventory | `inventory/hosts.yml` |
| Pull secret | `secrets/pull-secret.txt` |
| SSH private key | `secrets/id_ed25519` |
| SSH public key | `secrets/id_ed25519.pub` |
| Cluster vars | `vars/cluster/openshift_install_cluster.yml` |
| VM vars | `vars/guests/openshift_cluster_vm.yml` |

The SNO DNS records must point `api`, `api-int`, and `*.apps` at the single
control-plane node IP.

## Prepare Variables

Copy the SNO examples, then edit the active files for the local network and
storage plan:

```sh
cp vars/cluster/openshift_install_cluster.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.yml.example vars/guests/openshift_cluster_vm.yml
```

Keep `platform_type: none` for this path.

## Deploy

Run the SNO site playbook:

```sh
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno.yml --ask-vault-pass --ask-become-pass
```

For a clean rebuild, use:

```sh
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno-redeploy.yml --ask-vault-pass --ask-become-pass
```

## Verify

After completion, run the host policy and VM checks that match your path:

```sh
./scripts/host-resource-management.sh shared-execution-pool-status
sudo virsh list --all
```

For the full phase order, inputs, cleanup, and live checks, see
[SNO OpenShift Cluster Scaffold](/openshift-sno-cluster/).
