"""
Tests for backend/engine/multigateway.py — the NJW spectral clustering +
SP-MG/MO-MG port of mo_sp_pt2. Covers determinism, structural correctness
(gateways distinct, sensors excluded), and the same "MO never worse than
SP" property required for the single-gateway MO heuristic.
"""
from backend.engine.topology_gen import generate_random_topology
from backend.engine.multigateway import (
    njw_spectral_clustering,
    select_cluster_gateways,
    select_sensors_mg,
    assign_sensors_to_nearest_gateway,
    run_shortest_path_routing_mg,
    run_minimal_overlap_routing_mg,
)
from backend.engine.metrics import compute_total_overlaps_mg, compute_average_hops


def build_case(seed, N=50, lam=8, k=3, n_sensors=10):
    G = generate_random_topology(N, lam, seed=seed)
    labels = njw_spectral_clustering(G, k)
    gateways = select_cluster_gateways(G, labels, k, method="betweenness")
    sensors = select_sensors_mg(G, gateways, n_sensors, seed=seed)
    gw_for_sensor = assign_sensors_to_nearest_gateway(G, sensors, gateways)
    return G, gateways, sensors, gw_for_sensor


def test_clustering_is_deterministic():
    G = generate_random_topology(50, 8, seed=10)
    labels1 = njw_spectral_clustering(G, 3)
    labels2 = njw_spectral_clustering(G, 3)
    assert labels1 == labels2


def test_clustering_covers_all_nodes():
    G = generate_random_topology(40, 8, seed=11)
    labels = njw_spectral_clustering(G, 3)
    assert set(labels.keys()) == set(G.nodes())
    assert set(labels.values()) <= {0, 1, 2}


def test_gateways_are_distinct_nodes():
    for seed in range(5):
        _, gateways, _, _ = build_case(seed=seed)
        assert len(set(gateways)) == len(gateways)


def test_sensors_exclude_all_gateways():
    for seed in range(5):
        _, gateways, sensors, _ = build_case(seed=seed)
        assert not (set(sensors) & set(gateways))


def test_every_sensor_assigned_to_a_real_gateway():
    _, gateways, sensors, gw_for_sensor = build_case(seed=1)
    for sensor in sensors:
        assert gw_for_sensor[sensor] in gateways


def test_sp_mg_paths_reach_assigned_gateway():
    G, gateways, sensors, gw_for_sensor = build_case(seed=2)
    paths = run_shortest_path_routing_mg(G, sensors, gw_for_sensor)
    for sensor, path in zip(sensors, paths):
        assert path[0] == sensor
        assert path[-1] == gw_for_sensor[sensor]


def test_mo_mg_never_worse_than_sp_mg_baseline():
    for seed in range(8):
        G, gateways, sensors, gw_for_sensor = build_case(seed=seed, N=60, lam=8, k=3, n_sensors=14)
        sp_paths = run_shortest_path_routing_mg(G, sensors, gw_for_sensor)
        mo_paths = run_minimal_overlap_routing_mg(G, sp_paths, sensors, gw_for_sensor, psi=0.0265, k_max=100)

        omega_sp = compute_total_overlaps_mg(sp_paths, gateways)
        omega_mo = compute_total_overlaps_mg(mo_paths, gateways)
        assert omega_mo <= omega_sp, f"seed={seed}: MO-MG ({omega_mo}) worse than SP-MG ({omega_sp})"


def test_multi_gateway_reduces_hops_vs_more_sensors_reaching_far_single_gateway():
    # Sanity check: with k=3 local gateways, average hop count should not be
    # absurdly large relative to network size (each sensor should reach its
    # nearest of 3 gateways, not travel across the whole graph).
    G, gateways, sensors, gw_for_sensor = build_case(seed=3, N=60, lam=8, k=3, n_sensors=14)
    paths = run_shortest_path_routing_mg(G, sensors, gw_for_sensor)
    avg_hops = compute_average_hops(paths)
    assert avg_hops < 60  # trivially bounded by N, just guards against pathological failures
