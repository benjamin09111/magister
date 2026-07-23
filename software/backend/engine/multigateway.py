"""
Multi-gateway (MG) extension: spectral clustering + local gateway selection +
SP-MG / MO-MG routing. Ported from the MATLAB reference in
mo_sp_pt2/topology/njw_spectral_clustering.m, select_cluster_gateways.m,
select_sensors_mg.m, and routing/run_shortest_path_routing_mg.m,
run_minimal_overlap_routing_mg.m — faithfully, including the deterministic
k-means seed (42) used to make clustering reproducible.
"""
import random
from typing import Dict, List, Optional

import networkx as nx
import numpy as np

from backend.engine.metrics import path_to_edges, compute_total_overlaps_mg


def njw_spectral_clustering(G: nx.Graph, k: int, kmeans_seed: int = 42) -> Dict[int, int]:
    """
    Ng-Jordan-Weiss spectral clustering over the normalized graph Laplacian.
    Returns {node_id: cluster_label} with cluster labels in [0, k).
    """
    nodes = list(G.nodes())
    n = len(nodes)

    if k <= 1:
        return {node: 0 for node in nodes}

    A = nx.to_numpy_array(G, nodelist=nodes)
    degrees = A.sum(axis=1)
    degrees[degrees == 0] = 1e-12

    d_inv_sqrt = np.diag(1.0 / np.sqrt(degrees))
    L = np.diag(degrees) - A
    L_sym = d_inv_sqrt @ L @ d_inv_sqrt
    L_sym = (L_sym + L_sym.T) / 2.0  # enforce symmetry (numerical safety)

    eigvals, eigvecs = np.linalg.eigh(L_sym)  # ascending order, like MATLAB's 'smallestreal'
    U = eigvecs[:, :k]

    row_norms = np.sqrt((U ** 2).sum(axis=1))
    row_norms[row_norms == 0] = 1e-12
    Y = U / row_norms[:, None]

    labels = _custom_kmeans(Y, k, seed=kmeans_seed)
    return {nodes[i]: int(labels[i]) for i in range(n)}


def _custom_kmeans(X: np.ndarray, k: int, seed: int = 42, max_iters: int = 100) -> np.ndarray:
    """
    Deterministic, dependency-free k-means mirroring mo_sp_pt2's custom_kmeans
    (fixed seed for centroid init, re-seeds an empty cluster to a random point).
    """
    n = X.shape[0]
    rng = random.Random(seed)
    init_idx = rng.sample(range(n), k)
    centroids = X[init_idx, :].copy()
    labels = np.zeros(n, dtype=int)

    for _ in range(max_iters):
        old_labels = labels.copy()
        dists = np.zeros((n, k))
        for j in range(k):
            dists[:, j] = ((X - centroids[j]) ** 2).sum(axis=1)
        labels = np.argmin(dists, axis=1)

        if np.array_equal(labels, old_labels):
            break

        for j in range(k):
            members = X[labels == j]
            if len(members) > 0:
                centroids[j] = members.mean(axis=0)
            else:
                centroids[j] = X[rng.randrange(n)]

    return labels


def select_cluster_gateways(G: nx.Graph, cluster_labels: Dict[int, int], k: int, method: str = 'betweenness') -> List[int]:
    """
    Picks the node with highest LOCAL centrality (computed on the induced
    subgraph of each cluster) as that cluster's gateway.
    """
    gateways = []
    for c in range(k):
        nodes_in_c = [node for node, label in cluster_labels.items() if label == c]
        if not nodes_in_c:
            continue
        if len(nodes_in_c) == 1:
            gateways.append(nodes_in_c[0])
            continue

        subG = G.subgraph(nodes_in_c)
        if method == 'degree':
            scores = dict(subG.degree())
        elif method == 'closeness':
            scores = nx.closeness_centrality(subG)
        elif method == 'eigenvector':
            try:
                scores = nx.eigenvector_centrality(subG, max_iter=1000)
            except (nx.NetworkXError, nx.PowerIterationFailedConvergence):
                scores = dict(subG.degree())
        else:  # default: betweenness
            scores = nx.betweenness_centrality(subG)

        gateways.append(int(max(scores, key=scores.get)))

    return gateways


def select_sensors_mg(G: nx.Graph, gateways: List[int], n: int, seed: Optional[int] = None) -> List[int]:
    """Randomly selects n sensors excluding ALL designated gateways."""
    rng = random.Random(None if seed is None else seed + 2)
    candidates = [node for node in G.nodes() if node not in set(gateways)]
    if n > len(candidates):
        raise ValueError(f"Not enough non-gateway nodes to select n={n} sensors (available={len(candidates)}).")
    return sorted(rng.sample(candidates, n))


def assign_sensors_to_nearest_gateway(G: nx.Graph, sensors: List[int], gateways: List[int]) -> Dict[int, int]:
    """Assigns each sensor to its hop-count-nearest gateway (ties broken by gateway order)."""
    assignment = {}
    for sensor in sensors:
        best_gw = gateways[0]
        best_dist = float('inf')
        for gw in gateways:
            try:
                dist = nx.shortest_path_length(G, sensor, gw)
            except nx.NetworkXNoPath:
                continue
            if dist < best_dist:
                best_dist = dist
                best_gw = gw
        assignment[sensor] = best_gw
    return assignment


def run_shortest_path_routing_mg(G: nx.Graph, sensors: List[int], gateway_for_sensor: Dict[int, int]) -> List[List[int]]:
    paths = []
    for sensor in sensors:
        gw = gateway_for_sensor[sensor]
        try:
            paths.append(nx.shortest_path(G, sensor, gw))
        except nx.NetworkXNoPath:
            paths.append([sensor, gw])
    return paths


def run_minimal_overlap_routing_mg(
    G: nx.Graph,
    initial_paths: List[List[int]],
    sensors: List[int],
    gateway_for_sensor: Dict[int, int],
    psi: float,
    k_max: int
) -> List[List[int]]:
    """
    MO adapted for multiple gateways (MO-MG): identical greedy edge-weight
    penalization as single-gateway MO, but overlap accounting excludes ALL
    designated gateways (not just one), and each sensor's shortest path is
    recomputed toward ITS OWN assigned gateway.
    """
    n = len(sensors)
    gws = set(gateway_for_sensor.values())
    Phi = [list(p) for p in initial_paths]

    G_k = G.copy()
    for u, v in G_k.edges():
        G_k[u][v]['weight'] = 1.0

    best_paths = [list(p) for p in Phi]
    best_omega = compute_total_overlaps_mg(best_paths, list(gws))

    for _ in range(1, k_max + 1):
        weight_updates = {}

        for i in range(n):
            for j in range(i + 1, n):
                path_i, path_j = Phi[i], Phi[j]
                nodes_i = set(node for node in path_i if node not in gws)
                nodes_j = set(node for node in path_j if node not in gws)
                shared_nodes = nodes_i.intersection(nodes_j)
                delta_ij = len(shared_nodes)

                if delta_ij > 0:
                    edges_i = path_to_edges(path_i)
                    edges_j = path_to_edges(path_j)
                    penalized_edges = set()
                    for shared_node in shared_nodes:
                        for edge in edges_i:
                            if shared_node in edge:
                                penalized_edges.add(edge)
                        for edge in edges_j:
                            if shared_node in edge:
                                penalized_edges.add(edge)

                    for edge in penalized_edges:
                        u, v = edge
                        if G_k.has_edge(u, v):
                            weight_updates[edge] = weight_updates.get(edge, G_k[u][v]['weight']) + (delta_ij * psi)

        for (u, v), new_w in weight_updates.items():
            G_k[u][v]['weight'] = new_w

        new_paths = []
        for i in range(n):
            gw = gateway_for_sensor[sensors[i]]
            try:
                new_paths.append(nx.shortest_path(G_k, sensors[i], gw, weight='weight'))
            except (nx.NetworkXNoPath, KeyError):
                new_paths.append([sensors[i], gw])

        omega_k = compute_total_overlaps_mg(new_paths, list(gws))
        if omega_k < best_omega:
            best_omega = omega_k
            best_paths = [list(p) for p in new_paths]

        Phi = new_paths
        if omega_k == 0:
            break

    return best_paths
