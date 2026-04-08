---
title: Stakkr
description: >-
  Documentation-first entry point for local OpenShift, RHEL bootstrap, and host
  resource policy workflows on one libvirt host.
---

# Stakkr

`stakkr` is an on-prem KVM lab scaffold for OpenShift bring-up, VM bootstrap,
and host resource management on one libvirt host.

It is documentation-first on purpose. The repo already contains the operator
entrypoints, execution order, and validation notes. This site keeps those
paths visible without inventing a second lifecycle.

## Start Here

Use these pages in this order when you are orienting yourself:

- <a href="{{ '/documentation-map.html' | relative_url }}"><kbd>DOCUMENTATION MAP</kbd></a>
  for reading order and task-based navigation
- <a href="{{ '/prerequisites.html' | relative_url }}"><kbd>PREREQUISITES</kbd></a>
  before the first local build, rebuild, or bootstrap
- <a href="{{ '/shared-execution-pool-performance-domains.html' | relative_url }}"><kbd>SHARED EXECUTION POOL</kbd></a>
  for the default host CPU policy model
- <a href="{{ '/openshift-sno-cluster.html' | relative_url }}"><kbd>SNO OPENSHIFT</kbd></a>
  if the target is a single-node OpenShift lab
- <a href="{{ '/openshift-compact-cluster.html' | relative_url }}"><kbd>COMPACT OPENSHIFT</kbd></a>
  if the target is a compact multi-node local cluster
- <a href="https://github.com/turbra/stakkr/blob/main/cockpit/stakkr-observer/README.md"><kbd>COCKPIT OBSERVER</kbd></a>
  for the supported Stakkr UI path

## What Stakkr Covers

- local OpenShift SNO deployment with the Gold tier
- local OpenShift compact deployment with the Gold tier
- generic RHEL 10 VM bootstrap with Silver and Bronze examples
- local IdM bootstrap with a seeded guest image
- shared execution-pool performance domains
- host memory oversubscription with KSM, THP, and zram policy
- optional clock-lane CPU experiments
- Cockpit observer for live host policy inspection

## Current Operating Model

The default live shape is intentionally narrow:

| Layer                | Current model                          |
| -------------------- | -------------------------------------- |
| Host reserve         | `0-1`                                  |
| Guest execution pool | `2-11`                                 |
| Emulator threads     | `0-1`                                  |
| Performance domains  | Gold `512`, Silver `333`, Bronze `167` |

This is the current reference behavior for the shared execution-pool path. It
is not the same thing as the separate clock-tiering experiment.

## Main Workflow Paths

| Need                                     | First page                                                                   | Why              |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| Host setup and local requirements        | [Prerequisites]({{ '/prerequisites.html'                                     | relative_url }}) | package, credential, image, and local-only file checks |
| Default host CPU and VM contention model | [Shared Execution Pool]({{ '/shared-execution-pool-performance-domains.html' | relative_url }}) | host foundation, live VM policy, and validation order  |
| Single-node local OpenShift              | [SNO OpenShift Cluster Scaffold]({{ '/openshift-sno-cluster.html'            | relative_url }}) | true SNO path for one libvirt host                     |
| Compact local OpenShift                  | [Compact OpenShift Cluster Scaffold]({{ '/openshift-compact-cluster.html'    | relative_url }}) | compact cluster lifecycle for the same host model      |
| Generic guest bootstrap                  | [Generic RHEL 10 VM Bootstrap]({{ '/rhel10-vm-bootstrap.html'                | relative_url }}) | base VM bring-up outside the OpenShift-specific flows  |
| Local IdM lab bring-up                   | [Local IdM Bootstrap]({{ '/idm-local-bootstrap.html'                         | relative_url }}) | seeded image and bridge-based local IdM bootstrap      |
| Separate CPU lane experiment             | [Clock Frequency Tiering]({{ '/clock-frequency-tiering.html'                 | relative_url }}) | experimental path, not the default operating model     |

## Observer

The supported Stakkr UI path is the Cockpit observer.

Use the observer when the question is not "what command should I run?" but
"is the host resource policy behaving the way the repo intends right now?"

- CPU performance domains
- CPU pool topology
- memory overview
- memory management overhead

Installation and panel details are in the
[Cockpit observer README](https://github.com/turbra/stakkr/blob/main/cockpit/stakkr-observer/README.md).

## Repository

- <a href="https://github.com/turbra/stakkr"><kbd>REPOSITORY</kbd></a>
- <a href="https://github.com/turbra/stakkr/blob/main/README.md"><kbd>TOP README</kbd></a>
- <a href="https://github.com/turbra/stakkr/tree/main/docs"><kbd>DOCS SOURCE</kbd></a>
