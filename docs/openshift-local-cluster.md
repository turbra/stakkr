# Local OpenShift Cluster Scaffold

This is the minimum local OpenShift scaffolding adapted from Calabi’s cluster
architecture, but reduced to a single-hypervisor Stakkr model.

It covers:
- installer binaries
- `install-config.yaml`
- `agent-config.yaml`
- agent ISO generation
- local libvirt VM shells for OpenShift nodes
- verification
- cleanup

It does not pull in Calabi’s AWS, bastion, mirror-registry, or disconnected
dependencies.

## Design Pattern

The local cluster scaffold keeps the same core separation Calabi uses:

- cluster metadata:
  - [openshift_install_cluster.yml.example](../vars/cluster/openshift_install_cluster.yml.example)
- VM shell definitions:
  - [openshift_cluster_vm.yml.example](../vars/guests/openshift_cluster_vm.yml.example)
- install artifact settings:
  - [openshift_install_artifacts.yml](../vars/cluster/openshift_install_artifacts.yml)
- agent media settings:
  - [openshift_agent_media.yml](../vars/cluster/openshift_agent_media.yml)
- installer binary settings:
  - [openshift_installer_binaries.yml](../vars/cluster/openshift_installer_binaries.yml)

That split matters because:
- cluster network and DNS data changes in one place
- VM resource and disk layout changes in another
- the same node set can be reused through the full workflow

## Supported Shape

The default example is:
- `1` control-plane node
- `1` worker node

That gives you the requested starting point:
- single-node control plane
- at least one worker

To add more workers:
- add worker entries to:
  - `openshift_install_cluster.nodes`
  - `openshift_cluster_nodes`

The node names and MAC addresses must match between those two files.

## Local Inputs You Must Provide

- a reachable local KVM/libvirt host
- network, DNS, and VIP values for the cluster network
- pull secret:
  - `secrets/pull-secret.txt`
- SSH keypair for cluster access:
  - `secrets/id_ed25519`
  - `secrets/id_ed25519.pub`
- either:
  - an existing `openshift-install` binary path
  - or enable the installer download flow

## Recommended Run Order

From the project root:

1. review and copy the example matrices

```bash
cp vars/cluster/openshift_install_cluster.yml.example vars/cluster/openshift_install_cluster.yml
cp vars/guests/openshift_cluster_vm.yml.example vars/guests/openshift_cluster_vm.yml
```

2. prepare installer binaries

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-installer-binaries.yml
```

3. render the OpenShift install artifacts

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-artifacts.yml
```

4. generate and publish the agent ISO

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-agent-media.yml
```

5. create the OpenShift VM shells

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster.yml
```

6. verify the domains and ISO attachment

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster-verify.yml
```

7. wait for install completion

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-wait.yml
```

## Practical Notes

- This scaffold uses file-backed local libvirt disks, not AWS EBS devices.
- The OpenShift node root disks are blank qcow2 files by default.
- The agent ISO is attached as virtual CD-ROM media.
- Stakkr performance domains are applied to the VM shells through the same
  host resource management model used elsewhere in the repo.

## Cleanup

To remove the local cluster VM shells:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster-cleanup.yml
```

If you also want the root disk files removed, set:

```yaml
openshift_cluster_cleanup_remove_disk_files: true
```

in the cleanup role defaults or pass it with `-e`.
