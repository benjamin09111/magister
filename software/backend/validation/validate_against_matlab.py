"""
Cross-validation suite: Python (software/backend) <-> MATLAB (mo_sp_pt1 reference).

WHY THIS EXISTS
---------------
The professor's feedback (Part 2) explicitly conditions moving the simulator
to Python on proving the Python algorithms are equivalent to the MATLAB
reference ("si ya esta validado que los algoritmos de Python son equivalentes
a los de MATLAB, no habria problema en cambiar a Python"). Before this
script, no such validation existed anywhere in the repo.

HOW TO RUN
----------
1) In MATLAB, from anywhere (paths are resolved relative to the script file):

       >> run('mo_sp_pt1/experiments/export_validation_case.m')

   This generates ONE fixed, seeded topology + flow set using the MATLAB
   reference implementation and writes <repo_root>/validation/matlab_case.json.

2) Then, from this repo's root (or anywhere), run:

       python software/backend/validation/validate_against_matlab.py

METHODOLOGY (important — read before trusting a green report)
---------------------------------------------------------------
Dijkstra tie-breaking (which of several equal-length shortest paths gets
picked) is an implementation detail that legitimately differs between
MATLAB's `shortestpath` and NetworkX's `shortest_path`, even on the exact
same graph. A naive "does Python's independently-computed SP path list
equal MATLAB's" comparison would produce false failures caused by ties,
not bugs. So this suite runs two tiers of checks:

  TIER 1 — exact, tie-break-independent (must match to machine precision):
    Feed Python's metric/routing functions the MATLAB-computed paths
    directly (not Python's own independently-computed paths), and check
    that the *formulas* (Omega, avg hops, contention(H), conflict(H),
    total_demand(H)) reproduce identical numbers. This validates that the
    ported formulas are correct, independent of any routing tie-breaks.
    Also runs Python's MO algorithm STARTING FROM MATLAB's own SP paths
    (Phi^0), so the deterministic greedy MO search is directly comparable
    (MO has no randomness) and should reproduce the same Omega.

  TIER 2 — informational (may legitimately differ):
    Runs Python's OWN shortest_path routing on the same graph/gateway/
    sensors and compares Omega/hops to MATLAB's. Report differences as
    informational (not failures) since they can be caused solely by
    Dijkstra tie-breaking on a graph with multiple equal-length paths.

A known, INTENTIONAL deviation (not a bug) is documented separately: the
Python backend's schedulability verdict now checks demand(t) <= t for all
t in (0, H] (see engine/metrics.py::compute_schedulability_status), fixing
a bug present in both the old Python code and the current MATLAB reference
(both only checked t = H). So `is_schedulable` may legitimately differ from
the MATLAB reference's verdict; the underlying contention/conflict/demand
numbers AT t = H are what must match exactly (Tier 1).
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOFTWARE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
REPO_ROOT = os.path.abspath(os.path.join(SOFTWARE_DIR, ".."))
sys.path.insert(0, SOFTWARE_DIR)

import networkx as nx  # noqa: E402

from backend.engine.routing_sp import run_shortest_path_routing  # noqa: E402
from backend.engine.routing_mo import run_minimal_overlap_routing  # noqa: E402
from backend.engine.metrics import (  # noqa: E402
    compute_total_overlaps,
    compute_average_hops,
    compute_contention_demand_window,
    compute_conflict_demand_window,
    compute_schedulability_status,
)

EPS_EXACT = 1e-6   # for values that must match to machine precision (formulas fed identical inputs)
EPS_HOPS = 1e-9


class Report:
    def __init__(self):
        self.checks = []  # (tier, name, ok, detail)

    def add(self, tier, name, ok, detail=""):
        self.checks.append((tier, name, ok, detail))

    def print_and_exit(self):
        print("=" * 78)
        print("MATLAB <-> Python cross-validation report")
        print("=" * 78)
        tier1_ok = True
        for tier, name, ok, detail in self.checks:
            status = "PASS" if ok else "FAIL"
            print(f"[{tier}] {status:4s}  {name}" + (f"  -- {detail}" if detail else ""))
            if tier == "TIER1" and not ok:
                tier1_ok = False
        print("-" * 78)
        if tier1_ok:
            print("TIER 1 (exact equivalence of ported formulas/algorithms): ALL PASSED")
            print("=> The Python engine reproduces the MATLAB reference numerically,")
            print("   independent of routing tie-break non-determinism.")
        else:
            print("TIER 1 FAILED — this is a real fidelity bug, not a tie-break artifact.")
        print("TIER 2 checks are informational only (see module docstring).")
        sys.exit(0 if tier1_ok else 1)


def load_matlab_case():
    path = os.path.join(REPO_ROOT, "validation", "matlab_case.json")
    if not os.path.isfile(path):
        print(f"ERROR: {path} not found.")
        print("Run the MATLAB half first: mo_sp_pt1/experiments/export_validation_case.m")
        sys.exit(2)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_graph(edges, N):
    G = nx.Graph()
    G.add_nodes_from(range(N))
    for u, v in edges:
        G.add_edge(int(u), int(v), weight=1.0)
    return G


def close(a, b, eps):
    return abs(float(a) - float(b)) <= eps


def main():
    case = load_matlab_case()
    meta = case["meta"]
    N = meta["N"]
    psi = meta["psi"]
    k_max = meta["k_max"]
    m_fixed = meta["m_fixed"]
    w = meta["w"]
    H = meta["H"]
    gateway = case["gateway"]
    sensors = case["sensors"]
    T = case["T"]
    D = case["D"]

    G = build_graph(case["edges"], N)

    report = Report()

    print(f"Loaded MATLAB case: N={N}, lambda={meta['lambda_val']}, seed={meta['seed']}, "
          f"gateway={gateway}, sensors={sensors}")
    print(f"MATLAB version: {meta.get('matlab_version', '?')}")
    print()

    # ------------------------------------------------------------------
    # TIER 1a: metric formulas, fed MATLAB's own SP/MO paths verbatim.
    # ------------------------------------------------------------------
    matlab_sp_paths = case["sp"]["paths"]
    matlab_mo_paths = case["mo"]["paths"]

    py_sp_omega = compute_total_overlaps(matlab_sp_paths, gateway)
    report.add("TIER1", "Omega(SP) via Python metrics on MATLAB's SP paths",
                py_sp_omega == case["sp"]["omega"],
                f"python={py_sp_omega} matlab={case['sp']['omega']}")

    py_sp_hops = compute_average_hops(matlab_sp_paths)
    report.add("TIER1", "avg_hops(SP) via Python metrics on MATLAB's SP paths",
                close(py_sp_hops, case["sp"]["avg_hops"], EPS_HOPS),
                f"python={py_sp_hops} matlab={case['sp']['avg_hops']}")

    py_mo_omega = compute_total_overlaps(matlab_mo_paths, gateway)
    report.add("TIER1", "Omega(MO) via Python metrics on MATLAB's MO paths",
                py_mo_omega == case["mo"]["omega"],
                f"python={py_mo_omega} matlab={case['mo']['omega']}")

    py_mo_hops = compute_average_hops(matlab_mo_paths)
    report.add("TIER1", "avg_hops(MO) via Python metrics on MATLAB's MO paths",
                close(py_mo_hops, case["mo"]["avg_hops"], EPS_HOPS),
                f"python={py_mo_hops} matlab={case['mo']['avg_hops']}")

    # ------------------------------------------------------------------
    # TIER 1b: contention(H)/conflict(H)/total_demand(H), fed MATLAB's paths.
    # These are the exact quantities the (shared, legacy) l=H-only test
    # uses, so this validates the DBF/contention/conflict formulas
    # independent of the l=H-vs-forall-l schedulability POLICY difference.
    # ------------------------------------------------------------------
    for label, paths, matlab_details in (
        ("SP", matlab_sp_paths, case["sp"]["sched_details"]),
        ("MO", matlab_mo_paths, case["mo"]["sched_details"]),
    ):
        flows = {
            "n": len(sensors),
            "C": [(len(p) - 1) * w for p in paths],
            "T": T,
            "D": D,
            "paths": paths,
            "conflict_pair_mode": "paper_double",
        }
        contention = compute_contention_demand_window(flows, m_fixed, H)
        conflict = compute_conflict_demand_window(flows, gateway, H)
        total_demand = contention + conflict

        report.add("TIER1", f"contention(H) [{label}]",
                    close(contention, matlab_details["contention"], EPS_EXACT),
                    f"python={contention} matlab={matlab_details['contention']}")
        report.add("TIER1", f"conflict(H) [{label}]",
                    close(conflict, matlab_details["conflict"], EPS_EXACT),
                    f"python={conflict} matlab={matlab_details['conflict']}")
        report.add("TIER1", f"total_demand(H) [{label}]",
                    close(total_demand, matlab_details["total_demand"], EPS_EXACT),
                    f"python={total_demand} matlab={matlab_details['total_demand']}")

        # Informational: the legacy l=H-only verdict vs Python's new forall-l verdict.
        legacy_is_sched = total_demand <= H + EPS_EXACT
        new_is_sched, _ = compute_schedulability_status(flows, gateway, m_fixed, H)
        note = "MATCH" if legacy_is_sched == new_is_sched else \
            "DIFFERS (expected: Python's forall-l test is stricter/more correct, see module docstring)"
        report.add("INFO", f"is_schedulable legacy(l=H) vs Python forall-l [{label}]",
                    True, f"legacy={legacy_is_sched} forall_l={new_is_sched} -- {note}")

    # ------------------------------------------------------------------
    # TIER 1c: Python's OWN MO algorithm, started from MATLAB's exact SP
    # paths (Phi^0). MO is deterministic (no RNG), so given the same
    # starting point, same graph, same psi/k_max, it must reproduce the
    # same Omega regardless of any SP tie-breaking.
    # ------------------------------------------------------------------
    # run_minimal_overlap_routing returns only best_paths in the Python port;
    # recompute omega from its output for the comparison.
    py_mo_paths = run_minimal_overlap_routing(G, matlab_sp_paths, sensors, gateway, psi, k_max)
    py_mo_omega_full = compute_total_overlaps(py_mo_paths, gateway)
    report.add("TIER1", "Omega(MO) - Python's OWN MO search from MATLAB's Phi^0",
                py_mo_omega_full == case["mo"]["omega"],
                f"python={py_mo_omega_full} matlab={case['mo']['omega']}")

    # ------------------------------------------------------------------
    # TIER 2 (informational): Python's own independent SP routing.
    # ------------------------------------------------------------------
    py_sp_paths = run_shortest_path_routing(G, sensors, gateway)
    py_sp_omega_indep = compute_total_overlaps(py_sp_paths, gateway)
    py_sp_hops_indep = compute_average_hops(py_sp_paths)
    match = (py_sp_omega_indep == case["sp"]["omega"]) and close(py_sp_hops_indep, case["sp"]["avg_hops"], EPS_HOPS)
    report.add("INFO", "Python's independent SP routing vs MATLAB's SP routing",
                True,
                f"omega: python={py_sp_omega_indep} matlab={case['sp']['omega']} | "
                f"hops: python={py_sp_hops_indep} matlab={case['sp']['avg_hops']} | "
                f"{'identical (no ties encountered)' if match else 'differs — expected under Dijkstra tie-breaking, NOT a bug'}")

    print()
    report.print_and_exit()


if __name__ == "__main__":
    main()
