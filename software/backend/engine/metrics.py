import numpy as np
from typing import List, Dict, Tuple, Any

def path_to_edges(path: List[int]) -> List[Tuple[int, int]]:
    """
    Converts a path into a list of sorted undirected edges.
    """
    if len(path) < 2:
        return []
    edges = []
    for i in range(len(path) - 1):
        edges.append(tuple(sorted([path[i], path[i+1]])))
    return edges

def compute_pairwise_path_overlap(path_a: List[int], path_b: List[int], gateway: int) -> int:
    """
    Node overlap excluding the gateway.
    """
    if not path_a or not path_b:
        return 0
    set_a = set(node for node in path_a if node != gateway)
    set_b = set(node for node in path_b if node != gateway)
    return len(set_a.intersection(set_b))

def compute_total_overlaps(paths: List[List[int]], gateway: int) -> int:
    """
    Computes total node overlaps between all pairs of paths.
    """
    omega = 0
    n = len(paths)
    for i in range(n):
        for j in range(i + 1, n):
            omega += compute_pairwise_path_overlap(paths[i], paths[j], gateway)
    return omega

def compute_pairwise_overlap_matrix(paths: List[List[int]], gateway: int) -> np.ndarray:
    """
    Computes pairwise overlap matrix Delta(i, j).
    """
    n = len(paths)
    Delta = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(i + 1, n):
            ov = compute_pairwise_path_overlap(paths[i], paths[j], gateway)
            Delta[i, j] = ov
            Delta[j, i] = ov
    return Delta

def compute_average_hops(paths: List[List[int]]) -> float:
    """
    Computes the average path length in hops.
    """
    if not paths:
        return 0.0
    return float(np.mean([len(p) - 1 for p in paths]))

def compute_edf_dbf_window(flows: Dict[str, Any], ell: float) -> float:
    """
    Calculates classical EDF demand bound function in window ell.
    """
    n = flows['n']
    C = flows['C']
    D = flows['D']
    T = flows['T']
    phi = flows.get('phi', [0] * n)
    
    dbf_total = 0.0
    for i in range(n):
        if ell >= D[i]:
            jobs_count = max(0, int(np.floor((ell - D[i] - phi[i]) / T[i])) + 1)
            dbf_total += jobs_count * C[i]
            
    return dbf_total

def compute_contention_demand_window(flows: Dict[str, Any], m: int, ell: float) -> float:
    """
    Computes channel contention demand normalized by channels m in window ell.
    """
    dbf_total = compute_edf_dbf_window(flows, ell)
    return dbf_total / m

def compute_conflict_demand_window(flows: Dict[str, Any], gateway: int, ell: float) -> float:
    """
    Computes transmission conflicts demand in window ell.
    """
    paths = flows['paths']
    T = flows['T']
    n = flows['n']
    conflict_pair_mode = flows.get('conflict_pair_mode', 'unique')
    
    Delta = compute_pairwise_overlap_matrix(paths, gateway)
    conflict = 0.0
    
    if conflict_pair_mode == 'paper_double':
        for i in range(n):
            for j in range(n):
                if i != j and Delta[i, j] > 0:
                    activ_i = int(np.ceil(ell / T[i]))
                    activ_j = int(np.ceil(ell / T[j]))
                    conflict += Delta[i, j] * max(activ_i, activ_j)
    else:
        for i in range(n):
            for j in range(i + 1, n):
                if Delta[i, j] > 0:
                    activ_i = int(np.ceil(ell / T[i]))
                    activ_j = int(np.ceil(ell / T[j]))
                    conflict += Delta[i, j] * max(activ_i, activ_j)
                    
    return conflict

def compute_schedulability_status(flows: Dict[str, Any], gateway: int, m: int, H: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Evaluates schedulability of the system using single window test (l = H).
    """
    contention = compute_contention_demand_window(flows, m, H)
    conflict = compute_conflict_demand_window(flows, gateway, H)
    total_demand = contention + conflict
    
    is_schedulable = (total_demand <= H)
    
    details = {
        "windows": H,
        "contention": float(contention),
        "conflict": float(conflict),
        "total_demand": float(total_demand),
        "slack": float(H - total_demand),
        "worst_window": H,
        "worst_slack": float(H - total_demand),
        "failing_window": H if not is_schedulable else None
    }
    
    return bool(is_schedulable), details

def compute_dbf_curves(flows: Dict[str, Any], gateway: int, m: int, H: int) -> List[Dict[str, Any]]:
    """
    Computes DBF curves (contention, conflict, total demand, capacity) for all t in [1, H].
    Allows full visualization of schedulability over time.
    """
    curves = []
    for t in range(1, H + 1):
        contention = compute_contention_demand_window(flows, m, t)
        conflict = compute_conflict_demand_window(flows, gateway, t)
        total_demand = contention + conflict
        curves.append({
            "t": t,
            "contention": float(round(contention, 2)),
            "conflict": float(round(conflict, 2)),
            "demand": float(round(total_demand, 2)),
            "capacity": float(t)
        })
    return curves

