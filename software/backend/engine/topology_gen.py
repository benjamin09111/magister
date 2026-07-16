import networkx as nx
import numpy as np
import random
from typing import Dict, List, Tuple, Any

def generate_random_topology(N: int, lambda_val: float) -> nx.Graph:
    """
    Generates a connected random graph similar to the MATLAB generator.
    lambda_val / N is the density.
    """
    density = lambda_val / N
    # Generate random graph
    G = nx.erdos_renyi_graph(N, density)
    
    # Force connectivity if graph is disconnected
    while not nx.is_connected(G):
        components = list(nx.connected_components(G))
        if len(components) <= 1:
            break
        # Pick one node from component 0 and one from another random component
        u = random.choice(list(components[0]))
        v = random.choice(list(random.choice(components[1:])))
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

def select_gateway_by_centrality(G: nx.Graph, method: str = 'degree') -> int:
    """
    Selects the gateway based on centrality metrics.
    """
    if method == 'betweenness':
        centrality = nx.betweenness_centrality(G)
    elif method == 'closeness':
        centrality = nx.closeness_centrality(G)
    else: # default: degree
        centrality = dict(G.degree())
        
    return int(max(centrality, key=centrality.get))

def select_sensors(N: int, count: int, gateway: int) -> List[int]:
    """
    Randomly selects sensor nodes excluding the gateway.
    """
    candidates = [i for i in range(N) if i != gateway]
    if count > len(candidates):
        count = len(candidates)
    return sorted(random.sample(candidates, count))
