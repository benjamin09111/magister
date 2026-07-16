import networkx as nx
import numpy as np
import random
from typing import List, Dict, Tuple, Any
from backend.engine.metrics import path_to_edges, compute_total_overlaps, compute_average_hops, compute_pairwise_path_overlap

def path_signature(path: List[int]) -> str:
    return "-".join(map(str, path))

def generate_candidate_paths_for_flow(
    G: nx.Graph,
    source: int,
    gateway: int,
    mo_path: List[int],
    node_usage: Dict[int, int],
    edge_usage: Dict[Tuple[int, int], int],
    cfg: Dict[str, Any]
) -> List[List[int]]:
    """
    Generates diverse candidate routes for a flow by penalizing nodes/edges used by others.
    """
    candidate_paths = [mo_path]
    signatures = {path_signature(mo_path)}
    
    target_num = cfg.get('num_candidates_per_flow', 8)
    max_attempts = cfg.get('max_candidate_attempts', 40)
    
    global_edge_penalty = cfg.get('candidate_global_edge_penalty', 12.0)
    global_node_penalty = cfg.get('candidate_global_node_penalty', 6.0)
    own_mo_edge_penalty = cfg.get('candidate_own_mo_edge_penalty', 20.0)
    own_mo_node_penalty = cfg.get('candidate_own_mo_node_penalty', 10.0)
    random_weight_scale = cfg.get('candidate_random_weight_scale', 6.0)
    
    mo_edges = set(path_to_edges(mo_path))
    mo_path_set = set(mo_path)
    
    attempt = 0
    while len(candidate_paths) < target_num and attempt < max_attempts:
        attempt += 1
        
        # Build weighted graph copy
        Gw = G.copy()
        for u, v in Gw.edges():
            edge = tuple(sorted([u, v]))
            w = 1.0
            
            # Global edge and node usage penalty
            edge_use = edge_usage.get(edge, 0)
            node_use = node_usage.get(u, 0) + node_usage.get(v, 0)
            
            w += global_edge_penalty * edge_use + global_node_penalty * node_use
            
            # Penalize own MO route edges
            if edge in mo_edges:
                w += own_mo_edge_penalty * (0.5 + random.random())
                
            # Penalize own MO route internal nodes
            if u in mo_path_set and u != source and u != gateway:
                w += own_mo_node_penalty * (0.5 + random.random())
            if v in mo_path_set and v != source and v != gateway:
                w += own_mo_node_penalty * (0.5 + random.random())
                
            # Random noise
            w += random_weight_scale * random.random()
            
            Gw[u][v]['weight'] = w
            
        try:
            p = nx.shortest_path(Gw, source=source, target=gateway, weight='weight')
            sig = path_signature(p)
            if sig not in signatures:
                candidate_paths.append(p)
                signatures.add(sig)
        except (nx.NetworkXNoPath, KeyError):
            continue
            
    return candidate_paths

def build_candidate_route_sets(
    G: nx.Graph,
    sensors: List[int],
    gateway: int,
    mo_paths: List[List[int]],
    cfg: Dict[str, Any]
) -> List[List[List[int]]]:
    """
    Builds sets of candidate routes for all sensors.
    """
    n = len(sensors)
    
    # Calculate global node/edge usage in MO
    node_usage = {node: 0 for node in G.nodes()}
    edge_usage = {tuple(sorted(edge)): 0 for edge in G.edges()}
    
    for path in mo_paths:
        # Exclude gateway
        for node in path[:-1]:
            node_usage[node] = node_usage.get(node, 0) + 1
            
        for edge in path_to_edges(path):
            edge_usage[edge] = edge_usage.get(edge, 0) + 1
            
    candidates = []
    for i in range(n):
        c_paths = generate_candidate_paths_for_flow(
            G, sensors[i], gateway, mo_paths[i], node_usage, edge_usage, cfg
        )
        candidates.append(c_paths)
        
    return candidates

def roulette_wheel_selection(probs: np.ndarray) -> int:
    r = random.random()
    cumsum = np.cumsum(probs)
    for idx, c in enumerate(cumsum):
        if r <= c:
            return idx
    return len(probs) - 1

def run_moaco_routing(
    G: nx.Graph,
    mo_paths: List[List[int]],
    sensors: List[int],
    gateway: int,
    cfg: Dict[str, Any]
) -> List[List[int]]:
    """
    Runs the full MO + ACO Combinational routing algorithm.
    """
    n = len(sensors)
    
    # Defaults config if not provided
    num_ants = cfg.get('aco_num_ants', 20)
    num_iterations = cfg.get('aco_num_iterations', 35)
    alpha = cfg.get('aco_alpha', 1.0)
    beta = cfg.get('aco_beta', 2.5)
    rho = cfg.get('aco_rho', 0.10)
    Q = cfg.get('aco_Q', 2.0)
    top_k_deposit = cfg.get('aco_top_k_deposit', 4)
    random_choice_prob = cfg.get('aco_random_choice_prob', 0.10)
    partial_overlap_penalty = cfg.get('aco_partial_overlap_penalty', 25.0)
    hops_penalty = cfg.get('aco_hops_penalty', 0.001)
    report_best_of_mo_and_aco = cfg.get('aco_report_best_of_mo_and_aco', True)
    
    baseline_paths = [list(path) for path in mo_paths]
    baseline_omega = compute_total_overlaps(baseline_paths, gateway)
    baseline_hops = compute_average_hops(baseline_paths)
    
    # Build candidate routes
    candidates = build_candidate_route_sets(G, sensors, gateway, mo_paths, cfg)
    num_candidates = [len(c) for c in candidates]
    
    # Initialize Pheromone (tau) and Heuristic Info (eta)
    tau = []
    eta = []
    for i in range(n):
        # Initial pheromones: 1.0 for all, with a slight bias to the MO baseline path
        tau_i = np.ones(num_candidates[i])
        tau_i[0] = 1.2
        tau.append(tau_i)
        
        eta_i = np.zeros(num_candidates[i])
        mo_path_i = candidates[i][0]
        mo_edges_i = set(path_to_edges(mo_path_i))
        
        for j in range(num_candidates[i]):
            p = candidates[i][j]
            p_edges = set(path_to_edges(p))
            
            # Compute path difference compared to MO
            node_xor = set(mo_path_i).symmetric_difference(set(p))
            node_diff = len(node_xor)
            
            edge_common = len(mo_edges_i.intersection(p_edges))
            novelty = node_diff + max(0, len(p_edges) - edge_common)
            hops_term = len(p) - 1
            
            eta_i[j] = 1.0 + novelty / (1.0 + hops_penalty * hops_term)
            
        eta.append(eta_i)
        
    best_paths_aco = [list(path) for path in baseline_paths]
    best_omega_aco = float('inf')
    best_hops_aco = float('inf')
    
    # Main ACO optimization loop
    for iter_idx in range(num_iterations):
        ant_selected_idx = []
        ant_paths = []
        ant_omega = []
        ant_hops = []
        
        for ant in range(num_ants):
            selected_idx = [-1] * n
            selected_paths = [None] * n
            
            # Construct combination in random flow order
            flow_order = list(range(n))
            random.shuffle(flow_order)
            
            for i in flow_order:
                desirability = np.zeros(num_candidates[i])
                
                for j in range(num_candidates[i]):
                    candidate_path = candidates[i][j]
                    
                    # Compute dynamic overlap with paths already selected by this ant
                    partial_overlap = 0.0
                    partial_hops = len(candidate_path) - 1
                    
                    for k in range(n):
                        if selected_paths[k] is not None:
                            partial_overlap += compute_pairwise_path_overlap(
                                candidate_path, selected_paths[k], gateway
                            )
                            
                    heuristic_dynamic = 1.0 / (
                        1.0 + partial_overlap_penalty * partial_overlap + hops_penalty * partial_hops
                    )
                    
                    desirability[j] = (tau[i][j] ** alpha) * ((eta[i][j] * heuristic_dynamic) ** beta)
                    
                # Epsilon selection
                if random.random() < random_choice_prob:
                    # Explore locally from top 3
                    sorted_indices = np.argsort(desirability)[::-1]
                    top_limit = min(3, len(sorted_indices))
                    chosen_j = random.choice(sorted_indices[:top_limit])
                else:
                    if np.all(desirability <= 0) or np.any(np.isnan(desirability)):
                        chosen_j = random.randint(0, num_candidates[i] - 1)
                    else:
                        probs = desirability / np.sum(desirability)
                        chosen_j = roulette_wheel_selection(probs)
                        
                selected_idx[i] = chosen_j
                selected_paths[i] = candidates[i][chosen_j]
                
            omega_val = compute_total_overlaps(selected_paths, gateway)
            hops_val = compute_average_hops(selected_paths)
            
            ant_selected_idx.append(selected_idx)
            ant_paths.append(selected_paths)
            ant_omega.append(omega_val)
            ant_hops.append(hops_val)
            
        # Sort ants by overlaps first, and average hops as a tie breaker
        # We can zip indices, values and sort them
        ant_sorting_keys = [(ant_omega[a], ant_hops[a], a) for a in range(num_ants)]
        ant_sorting_keys.sort() # lexicographical sort
        
        best_ant_iter = ant_sorting_keys[0][2]
        iter_best_paths = ant_paths[best_ant_iter]
        iter_best_omega = ant_omega[best_ant_iter]
        iter_best_hops = ant_hops[best_ant_iter]
        
        if (iter_best_omega < best_omega_aco) or \
           (iter_best_omega == best_omega_aco and iter_best_hops < best_hops_aco):
            best_paths_aco = [list(path) for path in iter_best_paths]
            best_omega_aco = iter_best_omega;
            best_hops_aco = iter_best_hops
            
        # Pheromone evaporation
        for i in range(n):
            tau[i] = (1.0 - rho) * tau[i]
            
        # Deposit on top-k ants
        top_k = min(top_k_deposit, num_ants)
        for rank in range(1, top_k + 1):
            ant_idx = ant_sorting_keys[rank - 1][2]
            sel = ant_selected_idx[ant_idx]
            omega_val = ant_omega[ant_idx]
            
            deposit_amount = (Q / (1.0 + omega_val)) * (1.0 / rank)
            for i in range(n):
                j = sel[i]
                tau[i][j] += deposit_amount
                
        # Best global reinforcement
        if np.isfinite(best_omega_aco):
            bonus = 0.20 * Q / (1.0 + best_omega_aco)
            for i in range(n):
                jbest = 0
                for j in range(num_candidates[i]):
                    if candidates[i][j] == best_paths_aco[i]:
                        jbest = j
                        break
                tau[i][jbest] += bonus
                
        if best_omega_aco == 0:
            break
            
    # Report best of MO and ACO
    if report_best_of_mo_and_aco:
        if (best_omega_aco < baseline_omega) or \
           (best_omega_aco == baseline_omega and best_hops_aco < baseline_hops):
            return best_paths_aco
        else:
            return baseline_paths
    else:
        return best_paths_aco
