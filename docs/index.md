---
title: Stakkr
description: >-
  Documentation-first entry point for local OpenShift, RHEL bootstrap, and host
  resource policy workflows on one libvirt host.
---

# Stakkr

<p class="stakkr-lead">
  On-prem KVM lab scaffolding for OpenShift bring-up, VM bootstrap, and host
  resource policy on one libvirt host.
</p>

It is documentation-first on purpose. The repo already contains the operator
entrypoints, execution order, and validation notes. This site keeps those
paths visible without inventing a second lifecycle.

<div class="stakkr-cta-row">
  <a href="{{ '/documentation-map.html' | relative_url }}">DOCS MAP</a>
  <a href="{{ '/stakkr-observer.html' | relative_url }}">OBSERVER</a>
  <a href="https://github.com/turbra/stakkr">REPOSITORY</a>
</div>

<div class="stakkr-badge-row">
  <a href="https://github.com/turbra/stakkr/blob/main/LICENSE"><img alt="License: GPL-3.0" src="https://img.shields.io/github/license/turbra/stakkr?style=flat-square" /></a>
  <img alt="OpenShift 4.20" src="https://img.shields.io/badge/OpenShift-4.20-EE0000?style=flat-square" />
  <img alt="KVM and libvirt" src="https://img.shields.io/badge/KVM-libvirt-0066CC?style=flat-square" />
  <img alt="Ansible driven" src="https://img.shields.io/badge/Ansible-driven-1A1A1A?style=flat-square" />
  <img alt="RHEL 10" src="https://img.shields.io/badge/RHEL-10-EE0000?style=flat-square" />
</div>

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
- <a href="{{ '/stakkr-observer.html' | relative_url }}"><kbd>COCKPIT OBSERVER</kbd></a>
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

- Host setup and local requirements:
  <a href="{{ '/prerequisites.html' | relative_url }}">Prerequisites</a> for
  package, credential, image, and local-only file checks
- Default host CPU and VM contention model:
  <a href="{{ '/shared-execution-pool-performance-domains.html' | relative_url }}">Shared Execution Pool</a>
  for host foundation, live VM policy, and validation order
- Single-node local OpenShift:
  <a href="{{ '/openshift-sno-cluster.html' | relative_url }}">SNO OpenShift Cluster Scaffold</a>
  for the true SNO path on one libvirt host
- Compact local OpenShift:
  <a href="{{ '/openshift-compact-cluster.html' | relative_url }}">Compact OpenShift Cluster Scaffold</a>
  for compact-cluster lifecycle on the same host model
- Generic guest bootstrap:
  <a href="{{ '/rhel10-vm-bootstrap.html' | relative_url }}">Generic RHEL 10 VM Bootstrap</a>
  for base VM bring-up outside the OpenShift-specific flows
- Local IdM lab bring-up:
  <a href="{{ '/idm-local-bootstrap.html' | relative_url }}">Local IdM Bootstrap</a>
  for seeded image and bridge-based local IdM bootstrap
- Separate CPU lane experiment:
  <a href="{{ '/clock-frequency-tiering.html' | relative_url }}">Clock Frequency Tiering</a>
  for the experimental path, not the default operating model

## Observer

The supported Stakkr UI path is the Cockpit observer.

Use the observer when the question is not "what command should I run?" but
"is the host resource policy behaving the way the repo intends right now?"

- CPU performance domains
- CPU pool topology
- memory overview
- memory management overhead

Installation and panel details are in the
[Stakkr Observer page]({{ '/stakkr-observer.html' | relative_url }}).

## Repository

- <a href="https://github.com/turbra/stakkr"><kbd>REPOSITORY</kbd></a>
- <a href="https://github.com/turbra/stakkr/blob/main/README.md"><kbd>TOP README</kbd></a>
- <a href="https://github.com/turbra/stakkr/tree/main/docs"><kbd>DOCS SOURCE</kbd></a>
