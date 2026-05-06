---
title: Playbook Reference
description: Reference for Stakkr top-level and phase playbooks.
---

# Playbook Reference

Use the top-level site playbooks for normal operator flows. Use phase playbooks
only when you are intentionally resuming or inspecting a specific lifecycle
step.

## Top-Level Playbooks

| Playbook | Use |
| --- | --- |
| `playbooks/site-openshift-sno.yml` | Normal single-node OpenShift deployment. Includes installer prep, artifacts, agent media, VM build, verification, pivot wait, install wait, install complete, media detach, and post-install validation. |
| `playbooks/site-openshift-sno-redeploy.yml` | Removes the local SNO VM shell, then runs the SNO site playbook. |
| `playbooks/site-openshift-compact.yml` | Compact-cluster entrypoint. Imports the shared cluster site playbook. |
| `playbooks/site-openshift-compact-redeploy.yml` | Compact redeploy entrypoint. Imports the shared cluster redeploy playbook. |
| `playbooks/site-openshift-cluster.yml` | Shared multi-node cluster lifecycle used by the compact path. |
| `playbooks/site-openshift-cluster-redeploy.yml` | Cluster cleanup followed by the shared cluster lifecycle. |

## OpenShift Phase Playbooks

| Playbook | Use |
| --- | --- |
| `playbooks/cluster/openshift-installer-binaries.yml` | Prepares `openshift-install` and `oc` for local cluster work. |
| `playbooks/cluster/openshift-install-artifacts.yml` | Renders install artifacts from cluster and guest variables. |
| `playbooks/cluster/openshift-agent-media.yml` | Generates and publishes local agent install media. |
| `playbooks/cluster/openshift-cluster.yml` | Provisions the local OpenShift VM shells on the hypervisor. |
| `playbooks/cluster/openshift-cluster-verify.yml` | Verifies local cluster domains and agent ISO attachment. |
| `playbooks/cluster/openshift-pivot-wait.yml` | Waits for the first node pivot reboot. Used by the SNO path. |
| `playbooks/cluster/openshift-install-wait.yml` | Runs `openshift-install wait-for bootstrap-complete`. |
| `playbooks/cluster/openshift-install-complete.yml` | Runs `openshift-install wait-for install-complete`. |
| `playbooks/cluster/openshift-cluster-cleanup.yml` | Removes local OpenShift cluster VM shells. |
| `playbooks/maintenance/detach-install-media.yml` | Detaches agent media and restores disk-first boot order. |
| `playbooks/day2/openshift-post-install-validate.yml` | Runs post-install validation after cluster bring-up. |

## Bootstrap Playbooks

| Playbook | Use |
| --- | --- |
| `playbooks/bootstrap/rhel10-vms.yml` | Builds one or more generic RHEL 10 guests from `rhel10_vms`. |
| `playbooks/bootstrap/idm-local.yml` | Builds the local IdM VM from `vars/guests/idm_vm.yml`. |

## Host Policy Playbooks

| Playbook | Use |
| --- | --- |
| `playbooks/maintenance/host-resource-management-apply.yml` | Applies host CPU pools and performance-domain slices. |
| `playbooks/maintenance/host-resource-management-rollback.yml` | Removes host CPU policy artifacts. |
| `playbooks/maintenance/host-memory-oversubscription-apply.yml` | Applies zram, THP, and KSM policy. |
| `playbooks/maintenance/host-memory-oversubscription-rollback.yml` | Removes memory policy service and restores rollback values. |
| `playbooks/maintenance/cgroup-tiering-apply-v1.yml` | Applies shared guest CPU placement to live VM scopes. |
| `playbooks/maintenance/cgroup-tiering-rollback-v1.yml` | Restores stock live VM CPU placement. |
| `playbooks/maintenance/contention-tiering-apply-v1.yml` | Applies Gold, Silver, and Bronze CPUWeight values to live VM scopes. |
| `playbooks/maintenance/contention-tiering-rollback-v1.yml` | Restores equal CPUWeight to managed VM scopes. |
| `playbooks/maintenance/clock-frequency-tiering-apply-v1.yml` | Applies the separate clock-tiering experiment. |
| `playbooks/maintenance/clock-frequency-tiering-rollback-v1.yml` | Rolls back the clock-tiering experiment. |

## Examples

Run the normal SNO path:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site-openshift-sno.yml
```

Run the compact path with vault prompting:

```bash
ansible-playbook -K -i inventory/hosts.yml playbooks/site-openshift-compact.yml --ask-vault-pass
```

Resume only the OpenShift install completion wait:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/cluster/openshift-install-complete.yml
```
