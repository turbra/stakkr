# Clock Frequency Tiering Validation

These findings came from the optional clock-lane experiment after comparing a
stock run to a clock-tiered run.

> [!WARNING]
> This is the dedicated-lane experiment, not the shared-pool contention path.

## What Was Tested

- `kvm-worker-01` on CPUs `2-4` with a `3 GHz` ceiling
- `kvm-worker-02` on CPUs `5-7` with a `2 GHz` ceiling
- `kvm-worker-03` on CPUs `8-11` with a `1 GHz` ceiling
- host / emulator work on CPUs `0-1`

## What Was Confirmed

- `virsh vcpupin` matched the intended worker lanes
- `virsh emulatorpin` kept emulator threads on `0-1`
- `scaling_max_freq` matched the intended per-lane caps
- Grafana showed the expected frequency ceilings on the worker CPUs

## Practical Read

- worker 1 got the fastest lane
- worker 2 got the middle lane
- worker 3 got the slowest lane
- the host pair remained uncapped

That made the experiment easy to reason about:

- `kvm-worker-01` had the highest ceiling
- `kvm-worker-02` had a lower ceiling
- `kvm-worker-03` had the lowest ceiling

## Why It Matters

The clock-lane path proved that `stakkr` can enforce deterministic per-worker
CPU ceilings on this host. That is useful for experiments and intentionally
shaped node behavior, but it is a different model from the shared guest pool.
