---
title: Generic RHEL 10 VM Bootstrap
description: >-
  Generic RHEL 10 guest bootstrap path using the same local host model and
  tier-oriented resource patterns as the rest of Stakkr.
---

# Generic RHEL 10 VM Bootstrap

This workflow deploys one, two, or many RHEL 10 guests from a structured
configuration file instead of a one-off playbook. It is modeled after the
working IdM bootstrap, but it is not tied to IdM or any other workload.

The guest definition stays generic:

- guest identity
- source qcow2 or raw image
- disk target
- network attachment and static addressing
- DNS settings
- default access user and credentials
- optional RHSM registration
- optional Stakkr performance-domain placement

The current bundled driver is `local-libvirt`. The configuration model is meant
to be reusable even if you later add a different provider-specific driver.

## Prerequisites

- a RHEL 10 qcow2 or raw guest image
- working libvirt / KVM on the target hypervisor
- a network plan for each guest:
  - MAC address
  - static IPv4 address
  - gateway
  - DNS servers
- a default admin user, SSH key, and optional password
- if you use vaulted secrets, an encrypted:
  - `inventory/group_vars/all/lab_credentials.yml`

If you have not already done so, review:

- [Prerequisites]({{ '/prerequisites.html' | relative_url }})

## Configuration Pattern

Start from the example guest list:

- [rhel10_vms.yml.example](../vars/guests/rhel10_vms.yml.example)

Copy it to your own file and edit the guest list:

```bash
cp vars/guests/rhel10_vms.yml.example vars/guests/my-rhel10-vms.yml
```

Each entry in `rhel10_vms` represents one VM. You can keep one entry, remove
entries, or add many more.

The important fields per guest are:

- `name`
- `role`
- `source_image`
- `disk_path`
- `resources.memory_mb`
- `resources.vcpus`
- `network.*`
- `access.*`

Optional fields:

- `subscription.*`
- `stakkr.*`
- `cloud_init.runcmd`

## Deploy

From the project root:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap/rhel10-vms.yml -e @vars/guests/my-rhel10-vms.yml --ask-vault-pass --ask-become-pass
```

If you are not using vaulted variables, omit `--ask-vault-pass`.

If your SSH private key is protected with a passphrase, load it into
`ssh-agent` first. Otherwise `wait_for_connection` will prompt for the
passphrase repeatedly while it retries SSH:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

## What The Playbook Does

For each guest, the playbook:

1. validates the requested image, network, and access data
2. seeds or reuses the guest disk
3. injects the requested admin user, SSH key, and optional password
4. renders cloud-init metadata, user-data, and network-config
5. creates the VM with `virt-install`
6. waits for SSH
7. removes the temporary cloud-init ISO

## Stakkr Placement

If you want a guest to participate in Stakkr host policy, set:

```yaml
stakkr:
  enabled: true
  tier: silver
  iothreads: 0
```

When enabled, the guest is placed into the selected performance domain and gets
the matching partition, `CPUWeight`, vCPU pinning, and emulator pinning model.

If you want a plain VM with no Stakkr-specific placement, leave:

```yaml
stakkr:
  enabled: false
```

The Cockpit observer only shows Stakkr-managed guests. A VM deployed with
`stakkr.enabled: false` is still valid, but it will not appear in the observer.

## Verification

After deployment:

```bash
sudo virsh list --all
sudo virsh dominfo <guest-fqdn>
sudo virsh domifaddr <guest-fqdn>
```

To verify SSH:

```bash
ssh -i ~/.ssh/id_ed25519 <admin-user>@<guest-ip>
```

Using the bundled example values, that would be:

```bash
ssh -i ~/.ssh/id_ed25519 cloud-user@192.168.1.230
ssh -i ~/.ssh/id_ed25519 cloud-user@192.168.1.231
```

If your environment resolves the configured guest names in DNS, you can also
connect by FQDN:

```bash
ssh -i ~/.ssh/id_ed25519 cloud-user@rhel10-admin.stakkr.lan
ssh -i ~/.ssh/id_ed25519 cloud-user@rhel10-app.stakkr.lan
```

If Stakkr placement is enabled for a guest:

```bash
sudo virsh vcpupin <guest-fqdn>
sudo virsh emulatorpin <guest-fqdn>
```

## Clean Rebuild

If you want to force a rebuild of a specific guest, temporarily set:

```yaml
provisioning:
  rebuild_disk_from_image: true
  recreate_domain: true
```

Then rerun the same playbook.

After the clean rebuild succeeds, return those flags to `false` so reruns are
safe by default.

If a deployment is partially created and you want to remove it cleanly first,
delete the libvirt domain, disk, and temporary runtime directory for that
guest:

```bash
sudo virsh destroy <guest-fqdn>
sudo virsh undefine <guest-fqdn> --nvram
sudo rm -f <disk_path>
sudo rm -rf /var/lib/stakkr/rhel10-vms/<guest-short-name>
```

## Change A Guest Tier After Deployment

Today, changing a guest's Stakkr tier is a libvirt domain recreation workflow,
not a live retiering workflow.

To move an existing guest from one tier to another:

1. update the guest's `stakkr.tier` value in your VM definition
2. set:

```yaml
provisioning:
  rebuild_disk_from_image: false
  recreate_domain: true
```

3. rerun the same playbook

That recreates the libvirt domain definition with the new partitioning and CPU
placement, while keeping the existing guest disk.

After the tier change succeeds, return:

```yaml
provisioning:
  rebuild_disk_from_image: false
  recreate_domain: false
```

If you also set `rebuild_disk_from_image: true`, the guest disk will be reseeded
from the source image, which is usually not what you want for a simple tier
change.
