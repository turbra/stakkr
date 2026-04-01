# Local OpenShift Cluster Scaffold

This is the minimum local OpenShift scaffolding adapted from Calabi’s cluster
architecture, but reduced to a single-hypervisor Stakkr model.

It covers:
- installer binaries
- `install-config.yaml`
- `agent-config.yaml`
- agent ISO generation
- local libvirt VM shells for a true SNO node
- verification
- post-install boot media cleanup
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

The default example is true SNO:
- `1` control-plane node
- `0` workers

That is the shape that was validated in this repo.
The validated control-plane sizing is:
- `12` vCPU
- `32768` MiB memory

For this path:
- `platform: none` is used in `install-config.yaml`
- `api.ocp.<base_domain>` must resolve to the control-plane node IP
- `api-int.ocp.<base_domain>` must resolve to the control-plane node IP
- `*.apps.ocp.<base_domain>` must resolve to the control-plane node IP

Adding workers is a follow-on workflow, not the initial install shape.

## Local Inputs You Must Provide

- a reachable local KVM/libvirt host
- network, DNS, and node IP values for the cluster network
- working local DNS records for:
  - `api.<cluster_name>.<base_domain>`
  - `api-int.<cluster_name>.<base_domain>`
  - `*.apps.<cluster_name>.<base_domain>`
- pull secret:
  - `secrets/pull-secret.txt`
- SSH keypair for cluster access:
  - `secrets/id_ed25519`
  - `secrets/id_ed25519.pub`
- either:
  - an existing `openshift-install` binary path
  - or enable the installer download flow

## Recommended Run Order

The preferred operator entrypoint is one playbook:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass
```

For a clean rebuild from scratch:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno-redeploy.yml \
  --vault-password-file <vault-file> \
  --ask-become-pass \
  -e openshift_cluster_cleanup_remove_disk_files=true
```

The phase playbooks below still exist, but they are implementation details of
the site playbook and should not be the normal operator path.

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

5. create the OpenShift VM shell

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster.yml
```

6. verify the domain and ISO attachment

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-cluster-verify.yml
```

7. wait for the first pivot reboot

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-pivot-wait.yml
```

8. detach the agent ISO and restore disk-first boot order

```bash
ansible-playbook -i inventory/hosts.yml playbooks/maintenance/detach-install-media.yml
```

9. wait for bootstrap completion

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-wait.yml
```

10. wait for full install completion

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-complete.yml
```

11. validate post-install cluster convergence

```bash
ansible-playbook -i inventory/hosts.yml playbooks/day2/openshift-post-install-validate.yml
```

## Practical Notes

- The local SNO node uses a blank qcow2 root disk plus the generated agent ISO
  on an attached CD-ROM device.
- New VM shells are created with `hd` before `cdrom` so the installer can use
  the ISO on first boot, but later boots prefer the installed disk.
- The expected steady state after a successful install is:
  - root disk on `sda`
  - empty CD-ROM device on `sdb`
  - boot order `hd` then `cdrom`
- During bring-up, the most useful live signal is on-node journald:

```bash
ssh core@<control-plane-ip>
sudo journalctl -b -f -u start-cluster-installation.sh -u bootkube.service -u kubelet -u release-image.service
```

- `curl` and `oc` become useful after the API is actually stable.
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
