"""
Statistical (not just mathematical) validation that Python's Erdos-Renyi
generator produces topologies equivalent to MATLAB's sprand-based generator.

Everywhere else in this codebase, the claim "erdos_renyi_graph(N, p) is
equivalent to sprand(N,N,p)+spones(.)" is backed only by a mathematical
argument (both are G(N,p) binomial random graphs). This script backs that
claim with actual data: it generates K topology instances in Python, and
if the MATLAB half has been exported (see below), it runs a two-sample
Kolmogorov-Smirnov test on the pooled degree distributions, plus comparisons
of mean density and mean clustering coefficient.

HOW TO RUN
----------
1) (Optional but required for the real cross-language comparison) In MATLAB:

       >> run('mo_sp_pt1/experiments/export_topology_statistics.m')

   This writes <repo_root>/validation/matlab_topology_stats.json.

2) Then:

       python software/backend/validation/validate_topology_statistics.py

   If the MATLAB file is missing, this still runs (and clearly reports) a
   Python-only self-consistency check against the THEORETICAL G(N,p)
   expectation — useful, but NOT the same as a real cross-language
   comparison.
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOFTWARE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
REPO_ROOT = os.path.abspath(os.path.join(SOFTWARE_DIR, ".."))
sys.path.insert(0, SOFTWARE_DIR)

import networkx as nx  # noqa: E402

from backend.engine.topology_gen import generate_random_topology  # noqa: E402

ALPHA = 0.05  # significance level for the KS test


def load_matlab_stats():
    path = os.path.join(REPO_ROOT, "validation", "matlab_topology_stats.json")
    if not os.path.isfile(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_python_instances(N, lambda_val, K, base_seed):
    instances = []
    for k in range(K):
        G = generate_random_topology(N, lambda_val, seed=base_seed + k, generator="erdos_renyi")
        degrees = [d for _, d in G.degree()]
        instances.append({
            "degrees": degrees,
            "num_edges": G.number_of_edges(),
            "density": G.number_of_edges() / (N * (N - 1) / 2),
            "is_connected": nx.is_connected(G),
            "clustering_coefficient": nx.average_clustering(G),
        })
    return instances


def pooled_degrees(instances):
    out = []
    for inst in instances:
        out.extend(inst["degrees"])
    return out


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def main():
    matlab_data = load_matlab_stats()

    if matlab_data is not None:
        N = matlab_data["meta"]["N"]
        lambda_val = matlab_data["meta"]["lambda_val"]
        K = matlab_data["meta"]["K"]
        base_seed = matlab_data["meta"]["base_seed"]
        matlab_instances = matlab_data["instances"]
        print(f"Loaded {len(matlab_instances)} MATLAB instances "
              f"(N={N}, lambda={lambda_val}, MATLAB={matlab_data['meta'].get('matlab_version', '?')})")
    else:
        N, lambda_val, K, base_seed = 66, 8, 100, 20240722
        matlab_instances = None
        print("No validation/matlab_topology_stats.json found - running "
              "Python-only self-consistency check (theoretical G(N,p) expectation).")
        print("For the REAL cross-language comparison, run "
              "mo_sp_pt1/experiments/export_topology_statistics.m in MATLAB first.\n")

    python_instances = generate_python_instances(N, lambda_val, K, base_seed)
    py_degrees = pooled_degrees(python_instances)
    py_mean_degree = mean(py_degrees)
    py_mean_density = mean([i["density"] for i in python_instances])
    py_mean_clustering = mean([i["clustering_coefficient"] for i in python_instances])
    py_connected_rate = mean([1.0 if i["is_connected"] else 0.0 for i in python_instances])

    theoretical_p = lambda_val / N
    theoretical_mean_degree = (N - 1) * theoretical_p

    print("=" * 78)
    print(f"Python (Erdos-Renyi, K={K}, N={N}, lambda={lambda_val}) summary:")
    print(f"  mean degree        = {py_mean_degree:.3f}   (theoretical G(N,p) ~ {theoretical_mean_degree:.3f})")
    print(f"  mean density       = {py_mean_density:.4f}  (theoretical p = {theoretical_p:.4f})")
    print(f"  mean clustering    = {py_mean_clustering:.4f}")
    print(f"  connectivity rate  = {py_connected_rate * 100:.1f}% (both generators force connectivity by construction)")
    print("-" * 78)

    # Self-consistency bound: mean degree should be within ~15% of the
    # theoretical G(N,p) expectation (connectivity repair pushes it slightly
    # above; this is a sanity band, not a strict statistical test).
    self_consistent = abs(py_mean_degree - theoretical_mean_degree) / theoretical_mean_degree < 0.15
    print(f"Python self-consistency vs theoretical G(N,p): {'PASS' if self_consistent else 'FAIL'}")

    if matlab_instances is None:
        print("\nCross-language statistical comparison: NOT RUN (MATLAB data missing).")
        sys.exit(0 if self_consistent else 1)

    matlab_degrees = pooled_degrees(matlab_instances)
    matlab_mean_degree = mean(matlab_degrees)
    matlab_mean_density = mean([i["density"] for i in matlab_instances])
    matlab_mean_clustering = mean([i["clustering_coefficient"] for i in matlab_instances])

    print(f"\nMATLAB (sprand, K={len(matlab_instances)}) summary:")
    print(f"  mean degree        = {matlab_mean_degree:.3f}")
    print(f"  mean density       = {matlab_mean_density:.4f}")
    print(f"  mean clustering    = {matlab_mean_clustering:.4f}")

    from scipy.stats import ks_2samp
    ks_stat, p_value = ks_2samp(py_degrees, matlab_degrees)

    print("-" * 78)
    print(f"Two-sample Kolmogorov-Smirnov test on pooled degree distributions:")
    print(f"  D statistic = {ks_stat:.4f}, p-value = {p_value:.4f}")
    distributions_equivalent = p_value > ALPHA
    if distributions_equivalent:
        print(f"  => PASS: cannot reject H0 (same distribution) at alpha={ALPHA}. "
              f"Python's Erdos-Renyi generator is statistically indistinguishable "
              f"from MATLAB's sprand generator on this sample.")
    else:
        print(f"  => FAIL: reject H0 at alpha={ALPHA} - the degree distributions differ "
              f"significantly. This would be a real fidelity issue, not expected given "
              f"both are G(N,p) constructions.")

    density_diff_pct = abs(py_mean_density - matlab_mean_density) / matlab_mean_density * 100
    print(f"\nMean density difference: {density_diff_pct:.2f}%")

    sys.exit(0 if (distributions_equivalent and self_consistent) else 1)


if __name__ == "__main__":
    main()
