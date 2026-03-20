# Shared Execution Pool Validation

These results came from the shared-pool path after:

```bash
./scripts/host-resource-management.sh apply
```

Live intent during the test:

- guest vCPU pool: `2-11`
- emulator threads: `0-1`
- `kvm-worker-01`: Gold `CPUWeight=512`
- `kvm-worker-02`: Silver `CPUWeight=333`
- `kvm-worker-03`: Bronze `CPUWeight=167`

## What This Proved

The test was trying to answer three simple questions:

1. When all three workers are busy, does Gold beat Silver and Bronze?
2. When a higher tier goes idle, can a lower tier borrow the freed CPU?
3. Is this relative weighting, rather than hard reservation?

The answer to all three was yes.

At a high level, the measured results showed:

- all three busy: Gold > Silver > Bronze
- Gold idle: Silver and Bronze both expanded into the freed capacity
- settled one-worker runs: Gold, Silver, and Bronze could each expand when the
  others were quiet

That is the behavior the shared execution pool model is supposed to produce.

Verification method:

- run comparable CPU load inside the workers
- sample per-VM cumulative CPU time with:

```bash
sudo virsh -c qemu:///system cpu-stats <vm> --total
```

- compare `cpu_time` deltas over the same 60-second window

## How To Read The Tables

The tables use a normalized view so the three workers are easier to compare.

Derived visualization model:

- `avg logical CPUs = cpu_time delta / 60`
- `4 GHz-equivalent = avg logical CPUs * 4`
- `shared-pool per-CPU equivalent = 4 GHz-equivalent / 10`

This does not claim the CPUs were literally running at `4 GHz`. It is a
normalized capacity view that makes the shared-pool split easier to compare.

The easiest way to read the last column is:

- pretend the shared guest pool is one bucket made of `10` equal CPUs
- pretend each of those CPUs is worth `4 GHz`
- then spread each VM's measured share evenly across that `10`-CPU bucket

Example:

- if a VM shows `20 GHz-equivalent` in a `10`-CPU shared pool
- then its shared-pool per-CPU equivalent is `2 GHz`
- that means, on average, it consumed about half of the full pool capacity

This is only a visualization aid. It makes it easier to compare how much of
the total shared pool each VM actually received during the same time window.

On this host, the shared guest pool is CPUs `2-11`, which means:

- `10` logical CPUs in the pool
- about `40 GHz-equivalent` max capacity when fully saturated

Practical note:

- the `40 GHz-equivalent` ceiling is only a normalization target
- you should not expect the measured totals to hit that exact number in every
  run
- this host continues to run the surrounding OpenShift environment, so some CPU
  time is always spent on background guest and host work that is not part of
  the single stress workload being demonstrated here
- use the numbers to compare relative share and borrowing behavior, not as a
  promise of a literal `4 GHz x 10 CPUs` sustained result

## Case 1: All Three Workers Loaded

Observed `cpu_time` deltas over 60 seconds:

| VM | Delta |
| --- | --- |
| `kvm-worker-01` | `292.815357 s` |
| `kvm-worker-02` | `218.796768 s` |
| `kvm-worker-03` | `90.227549 s` |

Normalized view:

| VM | Avg logical CPUs | `4 GHz`-equivalent | Shared-pool per-CPU equivalent |
| --- | --- | --- | --- |
| `kvm-worker-01` | `4.88` | `19.52 GHz` | `1.95 GHz` |
| `kvm-worker-02` | `3.65` | `14.59 GHz` | `1.46 GHz` |
| `kvm-worker-03` | `1.50` | `6.02 GHz` | `0.60 GHz` |

Interpretation:

- Gold received the most CPU time
- Silver received less than Gold
- Bronze received the least
- the shared guest pool was effectively saturated at about `40.12 GHz-equivalent`

That is the expected rank order for `512 > 333 > 167`.

## Case 2: Worker 1 Idle, Workers 2 And 3 Loaded

Observed `cpu_time` deltas over 60 seconds:

| VM | Delta |
| --- | --- |
| `kvm-worker-01` | `43.738443 s` |
| `kvm-worker-02` | `310.012859 s` |
| `kvm-worker-03` | `246.153924 s` |

Normalized view:

| VM | Avg logical CPUs | `4 GHz`-equivalent | Shared-pool per-CPU equivalent |
| --- | --- | --- | --- |
| `kvm-worker-01` | `0.73` | `2.92 GHz` | `0.29 GHz` |
| `kvm-worker-02` | `5.17` | `20.67 GHz` | `2.07 GHz` |
| `kvm-worker-03` | `4.10` | `16.41 GHz` | `1.64 GHz` |

Interpretation:

- worker 1 was mostly idle
- workers 2 and 3 both expanded into the freed capacity
- Silver still outpaced Bronze
- the shared guest pool again ran essentially full at about `39.99 GHz-equivalent`

This shows that idle capacity is borrowable and not stranded.

## Case 3: Settled Run With Worker 1 Loaded

Observed `cpu_time` deltas over a `61`-second window:

| VM | Delta |
| --- | --- |
| `kvm-worker-01` | `357.285897 s` |
| `kvm-worker-02` | `60.487454 s` |
| `kvm-worker-03` | `45.766638 s` |

Normalized view:

| VM | Avg logical CPUs | `4 GHz`-equivalent | Shared-pool per-CPU equivalent |
| --- | --- | --- | --- |
| `kvm-worker-01` | `5.86` | `23.43 GHz` | `2.34 GHz` |
| `kvm-worker-02` | `0.99` | `3.97 GHz` | `0.40 GHz` |
| `kvm-worker-03` | `0.75` | `3.00 GHz` | `0.30 GHz` |

Interpretation:

- worker 1 was the only materially busy VM
- Gold expanded into most of the shared pool
- workers 2 and 3 fell back to background activity
- the shared guest pool was no longer fully saturated, at about `30.40 GHz-equivalent`

## Case 4: Settled Run With Worker 2 Loaded

Observed `cpu_time` deltas over a `60`-second window:

| VM | Delta |
| --- | --- |
| `kvm-worker-01` | `29.374517 s` |
| `kvm-worker-02` | `356.087829 s` |
| `kvm-worker-03` | `44.523157 s` |

Normalized view:

| VM | Avg logical CPUs | `4 GHz`-equivalent | Shared-pool per-CPU equivalent |
| --- | --- | --- | --- |
| `kvm-worker-01` | `0.49` | `1.96 GHz` | `0.20 GHz` |
| `kvm-worker-02` | `5.93` | `23.74 GHz` | `2.37 GHz` |
| `kvm-worker-03` | `0.74` | `2.97 GHz` | `0.30 GHz` |

Interpretation:

- worker 2 was the only materially busy VM
- Silver expanded into most of the shared pool
- workers 1 and 3 fell back to background activity
- the shared guest pool was no longer fully saturated, at about `28.67 GHz-equivalent`

## Case 5: Settled Run With Worker 3 Loaded

Observed `cpu_time` deltas over a `66`-second window:

| VM | Delta |
| --- | --- |
| `kvm-worker-01` | `29.560951 s` |
| `kvm-worker-02` | `45.712334 s` |
| `kvm-worker-03` | `357.396285 s` |

Normalized view:

| VM | Avg logical CPUs | `4 GHz`-equivalent | Shared-pool per-CPU equivalent |
| --- | --- | --- | --- |
| `kvm-worker-01` | `0.45` | `1.79 GHz` | `0.18 GHz` |
| `kvm-worker-02` | `0.69` | `2.77 GHz` | `0.28 GHz` |
| `kvm-worker-03` | `5.42` | `21.66 GHz` | `2.17 GHz` |

Interpretation:

- worker 3 was the only materially busy VM
- worker 3 expanded into most of the shared pool
- workers 1 and 2 were reduced to low background activity
- the shared guest pool was no longer fully saturated, at about `26.22 GHz-equivalent`

Again, this matches relative weighting, not hard reservation.

## Conclusion

The observed behavior matches the intended shared execution pool model:

- all guest vCPU threads compete in one shared execution pool
- Gold, Silver, and Bronze influence degradation under contention
- idle capacity remains usable by lower tiers

The staircase is now complete:

- Gold alone can expand into most of the pool
- Silver alone can expand into most of the pool
- Bronze alone can also expand when higher tiers are idle

The difference is not whether borrowing happens. The difference is what happens
when multiple tiers contend at the same time.

The tests validate the main scheduler claim:

- the policy biases contention
- it does not strand CPU when higher tiers go idle
