# Local OpenShift Cluster Scaffold

This is the local OpenShift path for one libvirt host.

The repo currently supports two local cluster shapes:
- true SNO
- compact 3-node control plane

Current confidence:
- true SNO is live-validated in this repo
- compact 3-node now has the required playbooks and examples, but this branch
  does not claim live validation without a real deploy

It covers:
- installer binaries
- `install-config.yaml`
- `agent-config.yaml`
- agent ISO generation
- local libvirt VM creation
- compact bare-metal VIP rendering
- pivot handling
- post-install media cleanup
- post-install validation

It does not pull in Calabi's AWS, bastion, mirror-registry, or disconnected
dependencies.

## Start Here

> [!IMPORTANT]
> Choose the topology first, then copy the matching example files into the
> local-only working filenames.
>
> The deploy entrypoints do not choose the topology for you. They read
> `vars/cluster/openshift_install_cluster.yml` and
> `vars/guests/openshift_cluster_vm.yml`.

> [!NOTE]
> The compact 3-node lifecycle entrypoint is
> `playbooks/site-openshift-cluster.yml`.
>
> `playbooks/site-openshift-sno.yml` and
> `playbooks/site-openshift-compact.yml` are operator-friendly wrappers around
> the topology-specific flows.

## Prerequisites

You need all of these before running any deploy command:

- a reachable local KVM/libvirt host from the Ansible control node
- working local DNS for:
  - `api.<cluster_name>.<base_domain>`
  - `api-int.<cluster_name>.<base_domain>`
  - `*.apps.<cluster_name>.<base_domain>`
- a pull secret at `secrets/pull-secret.txt`
- an SSH keypair for cluster access:
  - `secrets/id_ed25519`
  - `secrets/id_ed25519.pub`
- vault access for this repo:
  - `--vault-password-file <vault-file>`
- either:
  - allow this repo to download `openshift-install`
  - or pre-provide an `openshift-install` binary in the configured tool path

Compact-specific prerequisites:
- two unused machine-network IPs for:
  - `api_vip`
  - `ingress_vip`
- enough host CPU and memory for three control-plane VMs

DNS must be updated before deploy:
- true SNO:
  - `api.<cluster_name>.<base_domain>` -> the single control-plane node IP
  - `api-int.<cluster_name>.<base_domain>` -> the single control-plane node IP
  - `*.apps.<cluster_name>.<base_domain>` -> the single control-plane node IP
- compact:
  - `api.<cluster_name>.<base_domain>` -> `api_vip`
  - `api-int.<cluster_name>.<base_domain>` -> `api_vip`
  - `*.apps.<cluster_name>.<base_domain>` -> `ingress_vip`

> [!NOTE]
> You do not download the final agent boot ISO manually in this workflow.
> The repo generates that ISO after the installer inputs are rendered.
> The prerequisite is the `openshift-install` binary, not a prebuilt ISO.

## Choose The Topology

### True SNO

Use these example files:

```bash
cp vars/cluster/openshift_install_cluster.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.yml.example vars/guests/openshift_cluster_vm.yml
```

Topology intent:
- `1` control-plane node
- `0` workers
- `platform_type: none`
- `api`, `api-int`, and `*.apps` all resolve to the single control-plane node IP

### Compact 3-Node

Use these example files:

```bash
cp vars/cluster/openshift_install_cluster.compact.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.compact.yml.example vars/guests/openshift_cluster_vm.yml
```

Topology intent:
- `3` control-plane nodes
- `0` workers
- `platform_type: baremetal`
- `10` vCPU and `16384` MiB per control-plane VM in the compact example
- `api` and `api-int` resolve to `api_vip`
- `*.apps` resolves to `ingress_vip`
- the compact control plane is expected to own those VIPs on the machine network

> [!IMPORTANT]
> The repo now rejects unsupported local shapes during artifact rendering.
> Supported local topologies are only:
>
> - true SNO: `1` control-plane, `0` workers, `platform_type: none`
> - compact: `3` control-plane, `0` workers, `platform_type: baremetal`

## Required Inputs

After copying the matching example pair, populate:
- cluster name and base domain
- platform type
- machine network, gateway, and DNS servers
- API and ingress VIP values
- node IPs and MAC addresses
- VM sizing and root disk paths

The tracked example files are:
- cluster metadata:
  [openshift_install_cluster.yml.example](../vars/cluster/openshift_install_cluster.yml.example)
- compact cluster metadata:
  [openshift_install_cluster.compact.yml.example](../vars/cluster/openshift_install_cluster.compact.yml.example)
- VM shell definitions:
  [openshift_cluster_vm.yml.example](../vars/guests/openshift_cluster_vm.yml.example)
- compact VM shell definitions:
  [openshift_cluster_vm.compact.yml.example](../vars/guests/openshift_cluster_vm.compact.yml.example)

## Recommended Workflow

From the project root:

1. choose the topology and copy the matching example files into the local-only
   working filenames
2. edit those copied files for your environment
3. run the matching deploy entrypoint

True SNO:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

Compact 3-node:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-compact.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

For a clean rebuild from scratch, use the matching redeploy entrypoint:

True SNO:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno-redeploy.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass \
  -e openshift_cluster_cleanup_remove_disk_files=true
```

Compact 3-node:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-compact-redeploy.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass \
  -e openshift_cluster_cleanup_remove_disk_files=true
```

## What The Deploy Commands Do

Compact 3-node uses the canonical local lifecycle:
- `playbooks/site-openshift-cluster.yml`
- `playbooks/site-openshift-cluster-redeploy.yml`

True SNO keeps its own local wrapper because the proven local media-detach timing
still differs from compact:
- `playbooks/site-openshift-sno.yml`
- `playbooks/site-openshift-sno-redeploy.yml`

`playbooks/site-openshift-cluster.yml` runs these phase playbooks in order:

1. `playbooks/cluster/openshift-installer-binaries.yml`
2. `playbooks/cluster/openshift-install-artifacts.yml`
3. `playbooks/cluster/openshift-agent-media.yml`
4. `playbooks/cluster/openshift-cluster.yml`
5. `playbooks/cluster/openshift-cluster-verify.yml`
6. `playbooks/cluster/openshift-install-wait.yml`
7. `playbooks/cluster/openshift-install-complete.yml`
8. `playbooks/maintenance/detach-install-media.yml`
9. `playbooks/day2/openshift-post-install-validate.yml`

`playbooks/site-openshift-cluster-redeploy.yml` does this:

1. `playbooks/cluster/openshift-cluster-cleanup.yml`
2. `playbooks/site-openshift-cluster.yml`

`playbooks/site-openshift-sno.yml` runs these additional SNO-specific steps:

1. `playbooks/cluster/openshift-pivot-wait.yml`
2. `playbooks/maintenance/detach-install-media.yml`
3. `playbooks/cluster/openshift-install-wait.yml`
4. `playbooks/cluster/openshift-install-complete.yml`
5. `playbooks/day2/openshift-post-install-validate.yml`

> [!TIP]
> Use the site playbooks for normal operation.
> Use the phase playbooks when you need to debug a specific step or resume from
> a known point.

## Phase Commands

If you need to run the flow one phase at a time, use this exact order:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-installer-binaries.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-artifacts.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-agent-media.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster-verify.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-pivot-wait.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/maintenance/detach-install-media.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-wait.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-complete.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

```bash
ansible-playbook -i inventory/hosts.yml playbooks/day2/openshift-post-install-validate.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

## Live Checks

Most useful live signal during bring-up:

```bash
ssh core@<one-control-plane-ip>
sudo journalctl -b -f -u start-cluster-installation.sh -u bootkube.service -u kubelet -u release-image.service
```

Useful cluster-side checks once the API is up:

```bash
oc --kubeconfig=generated/ocp/auth/kubeconfig get nodes
oc --kubeconfig=generated/ocp/auth/kubeconfig get co
oc --kubeconfig=generated/ocp/auth/kubeconfig get clusterversion
```

Expected steady state after a successful install:
- root disk on `sda`
- empty CD-ROM device on `sdb`
- boot order `hd` then `cdrom`

Run the libvirt checks against each configured domain:

```bash
sudo virsh domblklist <domain-fqdn> --details
sudo virsh dumpxml <domain-fqdn> | grep -A5 -B5 '<boot'
```

> [!NOTE]
> New VM shells are created with `hd` before `cdrom` so the installer can use
> the ISO on first boot, but later boots prefer the installed disk.

## Calabi Alignment

Authoritative source:
- Calabi OpenShift orchestration and lifecycle behavior

Aligned here:
- installer binaries, rendered artifacts, agent media, VM creation, installer
  waits, and post-install validation remain separate phases
- compact uses `platform_type: baremetal`, API VIPs, and ingress VIPs in line
  with the Calabi compact control-plane shape
- compact validation now checks that the API VIP resolves to one of the
  configured control-plane MAC addresses on the local machine network

Intentional local divergence:
- this repo keeps the proven local libvirt flow that waits for the first pivot
  reboot, detaches install media, then runs the final installer waits
- Calabi documents install wait and detach as separate phases, but the local
  qcow2 plus CD-ROM boot behavior here is strict enough that the earlier detach
  point is the correct local layer to enforce

## Cleanup

Remove the local cluster VM shells:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster-cleanup.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

If you also want the root disk files removed:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster-cleanup.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass \
  -e openshift_cluster_cleanup_remove_disk_files=true
```
