# Prerequisites

Read this before the first local build or rebuild.

## What You Need On The Host

- a local checkout of this repo
- `ansible-core`
- `ssh` and a working SSH keypair
- `libvirt`, `virsh`, and a functioning KVM host
- enough local disk for guest images and runtime artifacts

Install the required Ansible collection with:

```bash
cd <project-root>
ansible-galaxy collection install -r requirements.yml
```

## What You Need From Red Hat

- RHSM credentials:
  - activation key plus organization ID, or
  - username plus password
- a RHEL KVM guest image in `qcow2` format for local guest bootstrap

## Local Secrets And Ignored Files

The main local secret file is:

- `inventory/group_vars/all/lab_credentials.yml`

Start from:

```bash
cp inventory/group_vars/all/lab_credentials.yml.example \
  inventory/group_vars/all/lab_credentials.yml
ansible-vault encrypt inventory/group_vars/all/lab_credentials.yml
```

Typical local content includes:

- `lab_default_password`
- `lab_operator_ssh_public_key`
- `lab_rhsm_activation_key`
- `lab_rhsm_organization_id`
- or the username/password RHSM variant

Keep real secrets out of tracked files.

## Quick Preflight

Before you start a build, the practical checks are:

```bash
ansible --version
ansible-galaxy collection list | grep freeipa.ansible_freeipa
test -f inventory/group_vars/all/lab_credentials.yml
test -f ~/.ssh/id_ed25519
test -f /path/to/rhel-10.1.qcow2
```

For the local IdM path, also confirm:

```bash
ip link show bridge0
virsh net-list --all
```
