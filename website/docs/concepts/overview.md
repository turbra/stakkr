---
title: What Stakkr Does
description: How Stakkr organizes local OpenShift, guest bootstrap, and host policy workflows.
---

# What Stakkr Does

Stakkr provides a narrow local lab model for one libvirt host.

It has four main responsibilities:

| Responsibility | What it means |
| --- | --- |
| Prepare | Keep local prerequisites, inventory, secrets, and generated paths explicit |
| Deploy | Bring up local OpenShift SNO, compact OpenShift, generic RHEL 10 guests, and local IdM |
| Shape | Apply host CPU, memory, and live VM performance-domain policy |
| Inspect | Validate the live state with direct status commands and the Cockpit observer |

The repo is intentionally local-first. It does not define an AWS, mirror
registry, disconnected, or production OpenShift lifecycle.

## Operating Styles

| Mode | Use it when |
| --- | --- |
| Host foundation | You want CPU and memory policy installed before VM lifecycle work |
| OpenShift SNO | You want a true single-node local OpenShift lab |
| OpenShift compact | You want a compact multi-node local cluster on the same host model |
| Generic guest bootstrap | You want RHEL 10 guests outside the OpenShift-specific flow |
| Observer | You want a live Cockpit view of the applied host policy |

## Source Of Truth

Stakkr does not hide the operational entrypoints behind a second lifecycle.
The primary sources are the playbooks, script wrapper, variable files, and
Cockpit observer source in the repository.

Use [Playbook Reference](/reference/playbooks/) and
[Configuration Reference](/reference/configuration/) when you need the exact
file that owns a behavior.
