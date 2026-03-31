# Local IdM Bootstrap

This is the local KVM-host path for deploying a FreeIPA / IdM server with
Stakkr.

It builds a VM on the local hypervisor, waits for guest SSH, configures the
IdM server, and then removes the temporary cloud-init media.

## Before You Run It

Review [prerequisites.md](./prerequisites.md).

The practical requirements are:

- `freeipa.ansible_freeipa` installed from [requirements.yml](../requirements.yml)
- a local vaulted
  `inventory/group_vars/all/lab_credentials.yml`
- a local RHEL guest image in `qcow2` format
- `bridge0` present on the host

The deployment shape is driven by:

- [idm_vm.yml](../vars/guests/idm_vm.yml)

That file controls:

- VM name and domain
- source image and target disk path
- bridge and static IP settings
- performance-domain tier
- IdM realm and guest configuration defaults

## Deploy

From the repo root:

```bash
cd <project-root>
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap/idm-local.yml --ask-vault-pass --ask-become-pass
```

## What It Does

The playbook runs in four stages:

1. validates the VM and IdM settings
2. seeds or reuses the guest disk and defines the VM with `virt-install`
3. waits for SSH and configures the IdM guest
4. detaches the temporary cloud-init ISO

## Verify

On the host:

```bash
sudo virsh dominfo rhel-idm.stakkr.lan
sudo virsh vcpupin rhel-idm.stakkr.lan
sudo virsh emulatorpin rhel-idm.stakkr.lan
ping -c 3 192.168.1.229
```

SSH access:

```bash
ssh -i ~/.ssh/id_ed25519 cloud-user@192.168.1.229
```

Inside the guest:

```bash
sudo systemctl status ipa.service --no-pager
hostnamectl
kinit admin
ipa user-find admin
```

## Web UI

Open:

```text
https://192.168.1.229/
```

Or, if local DNS resolves the guest name:

```text
https://rhel-idm.stakkr.lan/
```

If a browser basic-auth popup appears first, cancel it and use the IdM login
page.

Login with:

- username: `admin`
- password: `lab_default_password`

## Rebuild

If you need a clean redeploy, remove the current guest first:

```bash
sudo virsh destroy rhel-idm.stakkr.lan
sudo virsh undefine rhel-idm.stakkr.lan --nvram
sudo rm -f /var/lib/libvirt/images/idm-01.qcow2
sudo rm -rf /var/lib/stakkr/rhel-idm
```

Then temporarily set these in [idm_vm.yml](../vars/guests/idm_vm.yml):

```yaml
provisioning:
  rebuild_disk_from_image: true
  recreate_domain: true
```

Run the bootstrap again, then return those flags to `false` for normal reruns.
