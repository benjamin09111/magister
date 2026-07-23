import networkx as nx
import random
from typing import Dict, List, Optional

def draw_fresh_seed() -> int:
    """
    Draws a fresh, non-reproducible seed (using OS entropy) to be used when
    the caller doesn't provide one. Always returned back to the caller so the
    exact run can be replayed later — required for SoftwareX-grade
    reproducibility (every result must be traceable to an explicit seed).
    """
    return random.SystemRandom().randint(0, 2**31 - 1)

def generate_random_topology(
    N: int,
    lambda_val: float,
    seed: Optional[int] = None,
    generator: str = 'erdos_renyi'
) -> nx.Graph:
    """
    Generates a connected random graph.

    Generator families (NetworkX stochastic generators, see Hagberg, Schult &
    Swart, 2008 - "Exploring network structure, dynamics, and function using
    NetworkX"):

    - 'erdos_renyi'    : G(N, p) binomial random graph, p = lambda_val / N.
                          This is the paper-faithful default: it matches, in
                          expectation, the sparse uniformly-distributed random
                          adjacency matrix built in MATLAB via
                          sprand(N,N,Lambda) + spones(.) (mo_sp_pt1/topology/
                          generate_random_topology.m), since both constructions
                          are binomial G(N,p) graphs with edge probability
                          Lambda = lambda_val / N.
    - 'watts_strogatz' : small-world graph, mean degree ~ lambda_val (rounded
                          to the nearest even number, k>=2), rewiring p=0.1.
    - 'barabasi_albert' : scale-free graph via preferential attachment, with
                          m edges per new node chosen so the resulting mean
                          degree approximates lambda_val (m = round(lambda/2)).
    - 'random_geometric': spatial (unit square) random graph, useful for WSAN
                          deployments where connectivity is distance-limited;
                          radius chosen so the expected mean degree approximates
                          lambda_val.

    `seed` makes graph construction and the connectivity-repair step fully
    reproducible; pass the same seed to get back the exact same graph.
    """
    rng = random.Random(seed)
    density = lambda_val / N

    if generator == 'watts_strogatz':
        k = max(2, int(round(lambda_val)))
        if k % 2 != 0:
            k += 1
        k = min(k, N - 1 if (N - 1) % 2 == 0 else N - 2)
        k = max(2, k)
        G = nx.watts_strogatz_graph(N, k, 0.1, seed=seed)
    elif generator == 'barabasi_albert':
        m = max(1, int(round(lambda_val / 2)))
        m = min(m, N - 1)
        G = nx.barabasi_albert_graph(N, m, seed=seed)
    elif generator == 'random_geometric':
        # Radius calibrated so E[degree] ~= lambda_val for N points uniform
        # in the unit square: E[degree] ~= N * pi * r^2 (interior approx.).
        import math
        r = math.sqrt(max(lambda_val, 1e-6) / (N * math.pi))
        G = nx.random_geometric_graph(N, r, seed=seed)
    else:
        # 'erdos_renyi' (default)
        G = nx.erdos_renyi_graph(N, density, seed=seed)

    # Force connectivity if graph is disconnected
    while not nx.is_connected(G):
        components = list(nx.connected_components(G))
        if len(components) <= 1:
            break
        # Pick one node from component 0 and one from another random component
        u = rng.choice(list(components[0]))
        v = rng.choice(list(rng.choice(components[1:])))
        G.add_edge(u, v)

    # Initialize all weights to 1.0
    for u, v in G.edges():
        G[u][v]['weight'] = 1.0

    return G

def get_node_centralities(G: nx.Graph) -> Dict[str, Dict[str, float]]:
    """
    Computes betweenness centrality and degree of each node.
    """
    betweenness = nx.betweenness_centrality(G, normalized=True)
    degree = dict(G.degree())
    
    centralities = {}
    for node in G.nodes():
        centralities[str(node)] = {
            "betweenness": float(betweenness[node]),
            "degree": int(degree[node])
        }
    return centralities

def select_gateway_by_centrality(G: nx.Graph, method: str = 'betweenness') -> int:
    """
    Selects the gateway based on centrality metrics. Default is 'betweenness',
    matching the NG-RES paper's definition (Sec. 3.1): "we further assume the
    gateway is the node with the highest betweenness centrality, i.e., the
    node if being removed, has the greatest impact on the overall network
    connectivity." 'degree' and 'closeness' remain available for sensitivity
    analysis (the paper's footnote 3 notes this "requires further research").
    """
    if method == 'degree':
        centrality = dict(G.degree())
    elif method == 'closeness':
        centrality = nx.closeness_centrality(G)
    else: # default: betweenness
        centrality = nx.betweenness_centrality(G)

    return int(max(centrality, key=centrality.get))

def select_sensors(N: int, count: int, gateway: int, seed: Optional[int] = None) -> List[int]:
    """
    Randomly selects sensor nodes excluding the gateway. Deterministic when a
    seed is supplied (independent of the topology's own RNG state).
    """
    rng = random.Random(None if seed is None else seed + 1)  # offset from topology seed to avoid correlating sensor picks with edge picks
    candidates = [i for i in range(N) if i != gateway]
    if count > len(candidates):
        count = len(candidates)
    return sorted(rng.sample(candidates, count))
