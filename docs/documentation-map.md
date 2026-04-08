---
title: Documentation Map
description: >-
  Navigation map for the Stakkr documentation set, organized by operator
  intent, workload path, and host-policy layer.
---

# Documentation Map

Use this page when you know the problem category but do not yet know which
Stakkr page should be your first stop.

## Reading Model

The docs are separated on purpose:

- read a setup page when you are preparing the host, secrets, or local inputs
- read a workflow page when you are executing a specific cluster or VM path
- read a validation page when you need to confirm the current live state or
  understand what a path actually proved

That keeps the task pages from becoming reference dumps and keeps the findings
pages from drifting into operator instructions.

## First Route By Intent

### I am orienting to the repo overall

1. <a href="https://github.com/turbra/stakkr/blob/main/README.md"><kbd>TOP README</kbd></a>
2. <a href="{{ '/' | relative_url }}"><kbd>DOCS HOME</kbd></a>
3. choose one workflow from [Main Workflow Paths](#main-workflow-paths)

### I need to prepare the host before any deployment

1. <a href="{{ '/prerequisites.html' | relative_url }}"><kbd>PREREQUISITES</kbd></a>
2. <a href="{{ '/shared-execution-pool-performance-domains.html' | relative_url }}"><kbd>SHARED EXECUTION POOL</kbd></a>
3. open the cluster or VM guide that matches the workload

### I need to understand the default contention model

1. <a href="{{ '/shared-execution-pool-performance-domains.html' | relative_url }}"><kbd>SHARED EXECUTION POOL</kbd></a>
2. <a href="{{ '/shared-execution-pool-validation.html' | relative_url }}"><kbd>SHARED EXECUTION POOL VALIDATION</kbd></a>
3. compare with <a href="{{ '/clock-frequency-tiering.html' | relative_url }}"><kbd>CLOCK FREQUENCY TIERING</kbd></a> only if you are evaluating the experimental path

### I only need the supported UI path

1. <a href="https://github.com/turbra/stakkr/blob/main/cockpit/stakkr-observer/README.md"><kbd>COCKPIT OBSERVER</kbd></a>
2. return to the relevant workflow page if the observer surfaces a specific host-policy issue

## Main Workflow Paths

| Need                               | Best starting point                                                            | Why              |
| ---------------------------------- | ------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------- |
| Single-node local OpenShift        | [SNO OpenShift Cluster Scaffold]({{ '/openshift-sno-cluster.html'              | relative_url }}) | true SNO path, narrow validated shape, and ordered install phases |
| Compact local OpenShift            | [Compact OpenShift Cluster Scaffold]({{ '/openshift-compact-cluster.html'      | relative_url }}) | compact-cluster path without inventing a separate host model      |
| Generic guest bootstrap            | [Generic RHEL 10 VM Bootstrap]({{ '/rhel10-vm-bootstrap.html'                  | relative_url }}) | base RHEL guest bring-up outside the OpenShift flow               |
| Local IdM bootstrap                | [Local IdM Bootstrap]({{ '/idm-local-bootstrap.html'                           | relative_url }}) | seeded image and bridge-based local IdM lab path                  |
| Default host CPU policy            | [Shared Execution Pool]({{ '/shared-execution-pool-performance-domains.html'   | relative_url }}) | host reserve, guest pool, and weighted performance domains        |
| Default host CPU policy findings   | [Shared Execution Pool Validation]({{ '/shared-execution-pool-validation.html' | relative_url }}) | validation results for the default contention model               |
| Experimental per-lane clock policy | [Clock Frequency Tiering]({{ '/clock-frequency-tiering.html'                   | relative_url }}) | separate experiment with dedicated lanes and caps                 |
| Experimental clock-policy findings | [Clock Frequency Tiering Validation]({{ '/clock-frequency-validation.html'     | relative_url }}) | what the clock-lane path actually confirmed                       |

## Choose By Problem

### Host prerequisites and local inputs

- [Prerequisites]({{ '/prerequisites.html' | relative_url }})

### OpenShift cluster bring-up

- [SNO OpenShift Cluster Scaffold]({{ '/openshift-sno-cluster.html' | relative_url }})
- [Compact OpenShift Cluster Scaffold]({{ '/openshift-compact-cluster.html' | relative_url }})

### Generic VM and IdM bootstrap

- [Generic RHEL 10 VM Bootstrap]({{ '/rhel10-vm-bootstrap.html' | relative_url }})
- [Local IdM Bootstrap]({{ '/idm-local-bootstrap.html' | relative_url }})

### Host policy and contention behavior

- [Shared Execution Pool With Weighted Performance Domains]({{ '/shared-execution-pool-performance-domains.html' | relative_url }})
- [Shared Execution Pool Validation]({{ '/shared-execution-pool-validation.html' | relative_url }})
- [Clock Frequency Tiering]({{ '/clock-frequency-tiering.html' | relative_url }})
- [Clock Frequency Tiering Validation]({{ '/clock-frequency-validation.html' | relative_url }})

### Live UI and host inspection

- [Cockpit observer README](https://github.com/turbra/stakkr/blob/main/cockpit/stakkr-observer/README.md)

## Keep The Flow Clean

To avoid circular writing:

- keep operator commands in the workflow pages that own them
- keep findings and confirmed behavior in the validation pages
- keep the Pages home and this map focused on navigation, not duplicated procedure
