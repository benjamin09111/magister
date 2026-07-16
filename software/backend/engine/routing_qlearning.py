import networkx as nx
import numpy as np
import random
from typing import List, Dict, Any

def run_qlearning_routing(
    G: nx.Graph,
    sensors: List[int],
    gateway: int,
    cfg: Dict[str, Any]
) -> List[List[int]]:
    """
    Tabular Q-learning for routing on undirected graphs.
    """
    n = len(sensors)
    N = G.number_of_nodes()
    paths = []
    
    # Q-learning hyperparameters
    alpha = cfg.get('ql_alpha', 0.1)
    gamma = cfg.get('ql_gamma', 0.9)
    epsilon_start = cfg.get('ql_epsilon_start', 1.0)
    epsilon_min = cfg.get('ql_epsilon_min', 0.05)
    num_episodes = cfg.get('ql_num_episodes', 600)
    max_steps = 2 * N
    
    # We map node labels to indices 0..N-1 if node names are not consecutive integers.
    # But since N is consecutive in our topologies, we can use integer keys.
    # To be fully robust, let's map node labels to 0..N-1.
    nodes_list = list(G.nodes())
    node_to_idx = {node: idx for idx, node in enumerate(nodes_list)}
    idx_to_node = {idx: node for idx, node in enumerate(nodes_list)}
    
    gw_idx = node_to_idx[gateway]
    
    for i in range(n):
        sensor = sensors[i]
        sensor_idx = node_to_idx[sensor]
        
        # Initialize Q-table: N x N matrix (state x action) initialized to -inf
        Q = np.full((N, N), -np.inf)
        for u in G.nodes():
            u_idx = node_to_idx[u]
            for v in G.neighbors(u):
                v_idx = node_to_idx[v]
                Q[u_idx, v_idx] = 0.0
                
        # Training episodes
        for ep in range(1, num_episodes + 1):
            # Decay epsilon
            epsilon = max(epsilon_min, epsilon_start * (1.0 - ep / num_episodes))
            
            s = sensor_idx
            step = 0
            
            while s != gw_idx and step < max_steps:
                step += 1
                u_node = idx_to_node[s]
                nb = [node_to_idx[v] for v in G.neighbors(u_node)]
                
                if not nb:
                    break
                    
                # Epsilon-greedy action selection
                if random.random() < epsilon:
                    a = random.choice(nb)
                else:
                    # Greedy selection
                    q_vals = Q[s, nb]
                    max_idx = np.argmax(q_vals)
                    a = nb[max_idx]
                    
                s_next = a
                s_next_node = idx_to_node[s_next]
                
                # Reward function
                if s_next == gw_idx:
                    R = 100.0
                else:
                    R = -1.0  # Hop penalty
                    
                # Overlap penalty (avoid nodes already used by previous paths)
                if i > 0:
                    overlap_count = 0
                    for prev_path in paths:
                        # Exclude gateway
                        if s_next_node in prev_path[:-1]:
                            overlap_count += 1
                    R -= 20.0 * overlap_count
                    
                # Q-update
                s_next_node_real = idx_to_node[s_next]
                nb_next = [node_to_idx[v] for v in G.neighbors(s_next_node_real)]
                
                if s_next == gw_idx:
                    max_q_next = 0.0  # Terminal state
                elif not nb_next:
                    max_q_next = -100.0  # Dead end
                else:
                    max_q_next = np.max(Q[s_next, nb_next])
                    
                Q[s, a] = Q[s, a] + alpha * (R + gamma * max_q_next - Q[s, a])
                s = s_next
                
        # Extract greedy path
        path_idx = [sensor_idx]
        s = sensor_idx
        visited = [False] * N
        visited[sensor_idx] = True
        step = 0
        
        while s != gw_idx and step < max_steps:
            step += 1
            s_node = idx_to_node[s]
            nb = [node_to_idx[v] for v in G.neighbors(s_node)]
            if not nb:
                break
                
            # Filter out visited neighbors to avoid loops
            unvisited_nb = [v for v in nb if not visited[v]]
            if unvisited_nb:
                q_vals = Q[s, unvisited_nb]
                max_idx = np.argmax(q_vals)
                a = unvisited_nb[max_idx]
            else:
                q_vals = Q[s, nb]
                max_idx = np.argmax(q_vals)
                a = nb[max_idx]
                
            s = a
            path_idx.append(s)
            visited[s] = True
            
        # Convert path indices back to nodes
        path = [idx_to_node[idx] for idx in path_idx]
        
        # Fallback to shortest path if target wasn't reached or loop failed
        if path[-1] != gateway:
            try:
                path = nx.shortest_path(G, source=sensor, target=gateway)
            except (nx.NetworkXNoPath, KeyError):
                path = [sensor, gateway]
                
        paths.append(path)
        
    return paths
