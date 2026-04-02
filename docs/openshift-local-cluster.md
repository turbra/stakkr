# Local OpenShift Cluster Scaffold

This guide is the local OpenShift path for one libvirt host.

The current validated shape is intentionally narrow:
- true SNO
- `1` control-plane node
- `0` workers
- `12` vCPU
- `32768` MiB memory
- `gold` performance-domain tier for `ocp-control-01`

It covers:
- installer binaries
- `install-config.yaml`
- `agent-config.yaml`
- agent ISO generation
- local libvirt VM creation
- pivot handling
- post-install media cleanup
- post-install validation

It does not pull in Calabi's AWS, bastion, mirror-registry, or disconnected
dependencies.

## Start Here

> [!IMPORTANT]
> Do not run the deploy playbooks until the prerequisites and required input
> files below are in place.
>
> `playbooks/site-openshift-sno.yml` assumes those inputs already exist.
> If they do not, the deploy will fail in the early phase playbooks.

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

> [!NOTE]
> You do not download the final agent boot ISO manually in this workflow.
> The repo generates that ISO after the installer inputs are rendered.
> The prerequisite is the `openshift-install` binary, not a prebuilt ISO.

## Required Inputs

Before the first deploy, copy the example matrices and populate them for your
environment:

```bash
cp vars/cluster/openshift_install_cluster.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.yml.example vars/guests/openshift_cluster_vm.yml
```

The required files are:
- cluster metadata:
  [openshift_install_cluster.yml.example](../vars/cluster/openshift_install_cluster.yml.example)
- VM shell definitions:
  [openshift_cluster_vm.yml.example](../vars/guests/openshift_cluster_vm.yml.example)

Populate them with:
- cluster name and base domain
- machine network, gateway, and DNS servers
- API and ingress VIP values
- the control-plane node IP and MAC address
- VM sizing and root disk path

> [!IMPORTANT]
> For the validated true SNO path, `platform: none` is used in
> `install-config.yaml`.
>
> That means:
> - `api.ocp.<base_domain>` must resolve to the single control-plane node IP
> - `api-int.ocp.<base_domain>` must resolve to the single control-plane node IP
> - `*.apps.ocp.<base_domain>` must resolve to the single control-plane node IP

## Recommended Workflow

From the project root:

1. prepare the required input files

```bash
cp vars/cluster/openshift_install_cluster.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.yml.example vars/guests/openshift_cluster_vm.yml
```

2. edit those copied files for your environment

3. run the normal deploy entrypoint

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

4. if you want a clean rebuild from scratch, use the redeploy entrypoint instead

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno-redeploy.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass \
  -e openshift_cluster_cleanup_remove_disk_files=true
```

## What The Deploy Command Does

`playbooks/site-openshift-sno.yml` runs these phase playbooks in order:

1. `playbooks/cluster/openshift-installer-binaries.yml`
2. `playbooks/cluster/openshift-install-artifacts.yml`
3. `playbooks/cluster/openshift-agent-media.yml`
4. `playbooks/cluster/openshift-cluster.yml`
5. `playbooks/cluster/openshift-cluster-verify.yml`
6. `playbooks/cluster/openshift-pivot-wait.yml`
7. `playbooks/maintenance/detach-install-media.yml`
8. `playbooks/cluster/openshift-install-wait.yml`
9. `playbooks/cluster/openshift-install-complete.yml`
10. `playbooks/day2/openshift-post-install-validate.yml`

`playbooks/site-openshift-sno-redeploy.yml` does this:

1. `playbooks/cluster/openshift-cluster-cleanup.yml`
2. `playbooks/site-openshift-sno.yml`

> [!TIP]
> Use the site playbooks for normal operation.
> The phase playbooks are primarily for understanding the flow, debugging, or
> rerunning a specific stage.

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
ssh core@<control-plane-ip>
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

```bash
sudo virsh domblklist ocp-control-01.ocp.stakkr.lan --details
sudo virsh dumpxml ocp-control-01.ocp.stakkr.lan | grep -A5 -B5 '<boot'
```

> [!NOTE]
> New VM shells are created with `hd` before `cdrom` so the installer can use
> the ISO on first boot, but later boots prefer the installed disk.

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
