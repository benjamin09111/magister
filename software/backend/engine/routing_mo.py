import networkx as nx
from typing import List, Dict, Tuple
from backend.engine.metrics import path_to_edges, compute_total_overlaps

def run_minimal_overlap_routing(
    G: nx.Graph, 
    initial_paths: List[List[int]], 
    sensors: List[int], 
    gateway: int, 
    psi: float, 
    k_max: int
) -> List[List[int]]:
    """
    Python implementation of Minimal Overlap (MO) Routing.
    Penalizes edges incident to shared nodes in paths and recalculates shortest paths.
    """
    n = len(sensors)
    Phi = [list(path) for path in initial_paths]
    
    # Create G_k as a copy of G and set initial weight of 1.0
    G_k = G.copy()
    for u, v in G_k.edges():
        G_k[u][v]['weight'] = 1.0
        
    best_paths = [list(path) for path in Phi]
    best_omega = compute_total_overlaps(best_paths, gateway)
    
    for k in range(1, k_max + 1):
        # We will accumulate weight updates for this iteration
        # In MATLAB, current_weights is read, updated, and then written back at the end of the loop.
        # So we update weights in a temporary dictionary to preserve the iteration-wise update.
        weight_updates = {}
        
        for i in range(n):
            for j in range(i + 1, n):
                path_i = Phi[i]
                path_j = Phi[j]
                
                # Shared nodes excluding gateway
                nodes_i_no_gw = set(node for node in path_i if node != gateway)
                nodes_j_no_gw = set(node for node in path_j if node != gateway)
                shared_nodes = nodes_i_no_gw.intersection(nodes_j_no_gw)
                
                delta_ij = len(shared_nodes)
                if delta_ij > 0:
                    edges_i = path_to_edges(path_i)
                    edges_j = path_to_edges(path_j)
                    
                    # Find edges in edges_i or edges_j that are incident to any shared node
                    penalized_edges = set()
                    for shared_node in shared_nodes:
                        # From edges_i
                        for edge in edges_i:
                            if shared_node in edge:
                                penalized_edges.add(edge)
                        # From edges_j
                        for edge in edges_j:
                            if shared_node in edge:
                                penalized_edges.add(edge)
                                
                    # Apply penalty
                    for edge in penalized_edges:
                        u, v = edge
                        if G_k.has_edge(u, v):
                            # Initialize or accumulate penalty
                            weight_updates[edge] = weight_updates.get(edge, G_k[u][v]['weight']) + (delta_ij * psi)
                            
        # Write back updated weights to G_k
        for (u, v), new_w in weight_updates.items():
            G_k[u][v]['weight'] = new_w
            
        # Recalculate paths on the modified graph G_k
        new_paths = []
        for i in range(n):
            try:
                p = nx.shortest_path(G_k, source=sensors[i], target=gateway, weight='weight')
                new_paths.append(p)
            except (nx.NetworkXNoPath, KeyError):
                new_paths.append([sensors[i], gateway])
                
        omega_k = compute_total_overlaps(new_paths, gateway)
        
        if omega_k < best_omega:
            best_omega = omega_k
            best_paths = [list(path) for path in new_paths]
            
        Phi = new_paths
        
        if omega_k == 0:
            break
            
    return best_paths
