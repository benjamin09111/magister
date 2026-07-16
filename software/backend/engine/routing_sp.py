import networkx as nx
from typing import List, Dict

def run_shortest_path_routing(G: nx.Graph, sensors: List[int], gateway: int) -> List[List[int]]:
    """
    Computes standard shortest paths from all sensors to the gateway.
    """
    paths = []
    for sensor in sensors:
        try:
            # Dijkstra path on G using edge weight
            path = nx.shortest_path(G, source=sensor, target=gateway, weight='weight')
            paths.append(path)
        except (nx.NetworkXNoPath, KeyError):
            # Fallback if no path is found
            paths.append([sensor, gateway])
    return paths
