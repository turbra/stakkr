---
title: First Observer Check
description: Install the Cockpit observer and inspect Stakkr host policy state.
---

# First Observer Check

Use the Cockpit observer when you need a live view of host policy state instead
of another command sequence.

## Install

Build or obtain the observer RPM, then install it on the Cockpit host:

```sh
sudo dnf install -y ./cockpit/stakkr-observer/rpmbuild/RPMS/noarch/cockpit-stakkr-observer-1.0.0-1.el10.noarch.rpm
```

Open Cockpit and navigate to `Stakkr Observer`.

## Check

Use the observer to inspect:

| Panel | Use |
| --- | --- |
| CPU performance domains | Confirm Gold, Silver, and Bronze policy shape |
| CPU pool topology | Confirm host reserve, emulator CPUs, and guest pool |
| Memory overview | Inspect memory pressure and guest memory state |
| Memory management overhead | Inspect KSM, THP, and zram policy effects |

The observer is a UI over live host state. It does not replace the source
configuration files or the apply/rollback playbooks.

## Command Cross-Check

When a panel needs command-line confirmation, run:

```sh
./scripts/host-resource-management.sh host-resource-management-status
./scripts/host-resource-management.sh host-memory-oversubscription-status
./scripts/host-resource-management.sh shared-execution-pool-status
```

For panel details and source-of-truth boundaries, see
[Stakkr Observer](/stakkr-observer/).
