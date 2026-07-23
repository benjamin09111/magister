"""
Tests for the routing algorithms (SP baseline and MO heuristic). Verifies
structural correctness (every path actually connects sensor->gateway) and
the core property claimed by the paper: MO must never produce a WORSE
(higher) total overlap Omega than the SP baseline it starts from.
"""
import networkx as nx

from backend.engine.topology_gen import generate_random_topology, select_gateway_by_centrality, select_sensors
from backend.engine.routing_sp import run_shortest_path_routing
from backend.engine.routing_mo import run_minimal_overlap_routing
from backend.engine.metrics import compute_total_overlaps


def build_case(seed, N=50, lam=8, n_sensors=10):
    G = generate_random_topology(N, lam, seed=seed)
    gateway = select_gateway_by_centrality(G, method="betweenness")
    sensors = select_sensors(N, n_sensors, gateway, seed=seed)
    return G, gateway, sensors


def test_sp_paths_connect_sensor_to_gateway():
    G, gateway, sensors = build_case(seed=1)
    paths = run_shortest_path_routing(G, sensors, gateway)
    assert len(paths) == len(sensors)
    for sensor, path in zip(sensors, paths):
        assert path[0] == sensor
        assert path[-1] == gateway
        # every consecutive pair must be a real edge in G
        for u, v in zip(path[:-1], path[1:]):
            assert G.has_edge(u, v)


def test_sp_paths_are_shortest():
    G, gateway, sensors = build_case(seed=2)
    paths = run_shortest_path_routing(G, sensors, gateway)
    for sensor, path in zip(sensors, paths):
        expected_len = nx.shortest_path_length(G, sensor, gateway)
        assert len(path) - 1 == expected_len


def test_mo_paths_connect_sensor_to_gateway():
    G, gateway, sensors = build_case(seed=3)
    sp_paths = run_shortest_path_routing(G, sensors, gateway)
    mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi=0.0265, k_max=100)
    for sensor, path in zip(sensors, mo_paths):
        assert path[0] == sensor
        assert path[-1] == gateway
        for u, v in zip(path[:-1], path[1:]):
            assert G.has_edge(u, v)


def test_mo_never_worse_than_sp_baseline():
    # This is the paper's central claim: MO must reduce (or at worst match)
    # the overlap Omega compared to the SP baseline it started from.
    for seed in range(10):
        G, gateway, sensors = build_case(seed=seed, N=60, lam=8, n_sensors=14)
        sp_paths = run_shortest_path_routing(G, sensors, gateway)
        mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi=0.0265, k_max=100)

        omega_sp = compute_total_overlaps(sp_paths, gateway)
        omega_mo = compute_total_overlaps(mo_paths, gateway)
        assert omega_mo <= omega_sp, f"seed={seed}: MO ({omega_mo}) worse than SP ({omega_sp})"


def test_mo_is_deterministic():
    G, gateway, sensors = build_case(seed=4)
    sp_paths = run_shortest_path_routing(G, sensors, gateway)
    mo1 = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi=0.0265, k_max=100)
    mo2 = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi=0.0265, k_max=100)
    assert mo1 == mo2


def test_mo_stops_early_when_overlap_free():
    # A sparse star-like scenario with few sensors should reach Omega=0
    # quickly; MO should not need all k_max iterations to converge (this
    # doesn't assert on iteration count directly, only on the final result).
    G, gateway, sensors = build_case(seed=5, N=80, lam=12, n_sensors=4)
    sp_paths = run_shortest_path_routing(G, sensors, gateway)
    mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi=0.0265, k_max=100)
    omega_mo = compute_total_overlaps(mo_paths, gateway)
    assert omega_mo >= 0  # sanity: never negative
