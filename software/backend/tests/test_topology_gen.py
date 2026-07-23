"""
Tests for backend/engine/topology_gen.py — random topology generation,
gateway selection, and sensor sampling. Covers determinism (reproducibility
is a hard SoftwareX requirement) and basic structural correctness.
"""
import networkx as nx
import pytest

from backend.engine.topology_gen import (
    generate_random_topology,
    select_gateway_by_centrality,
    select_sensors,
    get_node_centralities,
)

GENERATORS = ["erdos_renyi", "watts_strogatz", "barabasi_albert", "random_geometric"]


@pytest.mark.parametrize("generator", GENERATORS)
def test_generated_graph_is_connected(generator):
    G = generate_random_topology(N=40, lambda_val=6, seed=123, generator=generator)
    assert nx.is_connected(G)
    assert G.number_of_nodes() == 40


@pytest.mark.parametrize("generator", GENERATORS)
def test_generation_is_deterministic_given_seed(generator):
    G1 = generate_random_topology(N=40, lambda_val=6, seed=42, generator=generator)
    G2 = generate_random_topology(N=40, lambda_val=6, seed=42, generator=generator)
    assert sorted(G1.edges()) == sorted(G2.edges())


def test_different_seeds_usually_differ():
    G1 = generate_random_topology(N=40, lambda_val=6, seed=1, generator="erdos_renyi")
    G2 = generate_random_topology(N=40, lambda_val=6, seed=2, generator="erdos_renyi")
    assert sorted(G1.edges()) != sorted(G2.edges())


def test_erdos_renyi_mean_degree_approximates_lambda():
    # Statistical sanity check (not a strict equality — G(N,p) is random):
    # mean degree over several seeded instances should be within a
    # generous tolerance of the requested lambda.
    lambda_val = 8
    N = 100
    mean_degrees = []
    for seed in range(20):
        G = generate_random_topology(N=N, lambda_val=lambda_val, seed=seed, generator="erdos_renyi")
        mean_degrees.append(sum(dict(G.degree()).values()) / N)
    overall_mean = sum(mean_degrees) / len(mean_degrees)
    # Connectivity repair adds a few extra edges, so allow it to run slightly
    # above lambda_val, but it must stay in a sane neighborhood.
    assert lambda_val * 0.7 <= overall_mean <= lambda_val * 1.3


def test_gateway_default_is_betweenness():
    G = generate_random_topology(N=30, lambda_val=6, seed=7)
    gateway = select_gateway_by_centrality(G)  # default method
    expected = max(nx.betweenness_centrality(G), key=nx.betweenness_centrality(G).get)
    assert gateway == expected


def test_gateway_degree_method():
    G = generate_random_topology(N=30, lambda_val=6, seed=7)
    gateway = select_gateway_by_centrality(G, method="degree")
    degrees = dict(G.degree())
    assert degrees[gateway] == max(degrees.values())


def test_select_sensors_excludes_gateway():
    N = 30
    gateway = 5
    sensors = select_sensors(N, count=10, gateway=gateway, seed=1)
    assert gateway not in sensors
    assert len(sensors) == 10
    assert len(set(sensors)) == 10  # no duplicates


def test_select_sensors_deterministic():
    s1 = select_sensors(30, count=8, gateway=0, seed=99)
    s2 = select_sensors(30, count=8, gateway=0, seed=99)
    assert s1 == s2


def test_node_centralities_shape():
    G = generate_random_topology(N=10, lambda_val=4, seed=3)
    centralities = get_node_centralities(G)
    assert len(centralities) == 10
    for node_data in centralities.values():
        assert "betweenness" in node_data and "degree" in node_data
