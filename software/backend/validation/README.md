# MATLAB &harr; Python cross-validation suite

This is the evidence required by the professor's feedback (Parte 2, ultimo
parrafo): *"si ya esta validado que los algoritmos de Python son equivalentes
a los de MATLAB, no habria problema en cambiar a Python."* Before this suite
existed, that equivalence was asserted in documentation but never actually
checked against the MATLAB reference.

## How to run it

**Step 1 — MATLAB (produces the reference case).**
From MATLAB, with any current folder (paths resolve relative to the script):

```matlab
run('mo_sp_pt1/experiments/export_validation_case.m')
```

This generates ONE fixed, seeded topology (`N=66`, `lambda=8`, `n=10` sensors,
seed `20240722`), runs the MATLAB reference's SP and MO routing, computes
Omega/hops/schedulability, and writes `validation/matlab_case.json` at the
repo root (0-indexed, ready for direct reuse in Python).

**Step 2 — Python (validates against it).**

```bash
python software/backend/validation/validate_against_matlab.py
```

## What "equivalent" means here (read before trusting a green report)

Dijkstra tie-breaking (which of several *equal-length* shortest paths gets
picked) legitimately differs between MATLAB's `shortestpath` and NetworkX's
`shortest_path`, even on the identical graph. A naive "are the path lists
byte-identical" check would fail on ties that are not bugs. So the suite
runs two tiers:

- **TIER 1 (must pass — real fidelity bugs if not)**: feeds Python's ported
  functions the *MATLAB-computed* paths directly, and checks the formulas
  (Omega, avg hops, contention(H), conflict(H), total demand(H)) reproduce
  identical numbers. Also runs Python's own MO search starting from MATLAB's
  exact SP paths (MO is deterministic, no RNG), so it is directly comparable.
- **TIER 2 (informational only)**: runs Python's own independent SP routing
  and compares to MATLAB's. Differences here are expected on graphs with
  path ties and are not failures.

## A known, intentional deviation from the MATLAB reference

The MATLAB reference's `compute_schedulability_status.m` (and the Python
backend before this pass) only checks demand at a single window, `l = H`.
This is a fidelity bug relative to the NG-RES paper, which requires
`forall l in (0, H]: demand(l) <= l`. The Python backend now implements the
correct `forall l` test (`engine/metrics.py::compute_schedulability_status`).
Because of this, the validation report's `is_schedulable` comparison may
legitimately show `legacy(l=H) != forall_l` — that is the fix working as
intended, not a discrepancy to chase down. The underlying
contention/conflict/demand numbers *at* `l = H` (Tier 1) are what must match
exactly, and they do.

## Statistical validation of the topology generator (not just algorithmic)

`validate_against_matlab.py` validates the ROUTING/METRICS algorithms on
ONE fixed topology. It does NOT tell you whether Python's `erdos_renyi_graph`
generator produces topologies statistically equivalent to MATLAB's
`sprand`-based generator — that claim was, until now, only argued
mathematically (both are G(N,p) binomial random graphs), never checked
against actual data.

`validate_topology_statistics.py` closes that gap:

```matlab
run('mo_sp_pt1/experiments/export_topology_statistics.m')
```

```bash
python software/backend/validation/validate_topology_statistics.py
```

This generates K=100 topology instances on each side and runs a two-sample
Kolmogorov-Smirnov test on the pooled degree distributions (plus mean
density/clustering comparisons). If the MATLAB half hasn't been run yet,
the script still runs and clearly reports a Python-only self-consistency
check against the theoretical G(N,p) expectation — but flags that the real
cross-language comparison is pending.

## Extending this suite

The current routing/metrics case is a single seeded instance (good for a
deterministic, reviewable fidelity check). For a statistical equivalence
claim across many topologies on Omega/hops/schedulability specifically (as
opposed to just the raw graph structure, which `validate_topology_statistics.py`
already covers), export N cases from `export_validation_case.m` (loop over
seeds) and extend `validate_against_matlab.py` to aggregate Tier 1 checks
across all of them.
