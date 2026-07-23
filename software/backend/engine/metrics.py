import numpy as np
import math
import networkx as nx
from typing import List, Dict, Tuple, Any

def compute_hyperperiod(T: List[int]) -> int:
    """
    H = lcm(T), the least common multiple of the flows' periods (paper §6.1:
    "H = lcm(T), where T = {T1, T2, ..., Tn}"). Since periods are harmonic
    powers of two (T_i = 2^eta_i), lcm(T) reduces to max(T), but we compute
    it generally via math.lcm so the property holds even if the period
    generation scheme changes in the future.
    """
    if not T:
        return 1
    result = T[0]
    for t in T[1:]:
        result = math.lcm(result, t)
    return result

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

def generate_critical_windows(flows: Dict[str, Any], H: int) -> List[int]:
    """
    Generates the classical EDF critical instants ell = k*T_i + D_i, for every
    flow i and k = 0, 1, 2, ..., restricted to (0, H]. Per EDF DBF theory, the
    demand-bound function is a non-decreasing step function that only changes
    value at these instants, so checking schedulability at this set of points
    is necessary AND sufficient (mirrors the paper's sched. windows, and
    metrics/generate_sched_windows.m in the MATLAB reference).
    """
    T = flows['T']
    D = flows['D']
    n = flows['n']
    windows = set()
    for i in range(n):
        k = 0
        while True:
            ell = k * T[i] + D[i]
            if ell > H:
                break
            if ell > 0:
                windows.add(ell)
            k += 1
    if not windows:
        return [H]
    return sorted(windows)

def compute_schedulability_status(flows: Dict[str, Any], gateway: int, m: int, H: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Evaluates schedulability of the system over the WHOLE hyperperiod, i.e.
    forall ell in (0, H]: demand(ell) = contention(ell) + conflict(ell) <= ell.

    This replaces the previous single-window test at ell = H only, which could
    silently miss an overload occurring in the middle of the hyperperiod (the
    exact failure mode flagged in the professor's feedback: "si dentro del
    hiperperiodo en algun momento la demanda supera la oferta, eso hace que el
    sistema no sea schedulable"). The result is derived from the SAME per-slot
    curve rendered by compute_dbf_curves, so the chart and this boolean can
    never contradict each other.
    """
    EPS = 1e-9
    curves = compute_dbf_curves(flows, gateway, m, H)

    is_schedulable = True
    failing_window: Any = None
    worst_slack = float(H)
    worst_window = H

    for pt in curves:
        slack = pt["t"] - pt["demand"]
        if slack < worst_slack:
            worst_slack = slack
            worst_window = pt["t"]
        if pt["demand"] > pt["t"] + EPS and failing_window is None:
            failing_window = pt["t"]
            is_schedulable = False

    # Aggregate load at H is still useful context (total demand across the
    # whole hyperperiod), reported alongside — but never used to decide
    # schedulability on its own.
    at_H = curves[-1] if curves else {"contention": 0.0, "conflict": 0.0, "demand": 0.0}
    at_worst = next((pt for pt in curves if pt["t"] == worst_window), at_H)

    details = {
        "windows": H,
        "contention": float(at_H["contention"]),
        "conflict": float(at_H["conflict"]),
        "total_demand": float(at_H["demand"]),
        "slack": float(worst_slack),
        "worst_window": int(worst_window),
        "worst_slack": float(worst_slack),
        "worst_contention": float(at_worst["contention"]),
        "worst_conflict": float(at_worst["conflict"]),
        "worst_demand": float(at_worst["demand"]),
        "failing_window": failing_window
    }

    return bool(is_schedulable), details

def compute_incremental_dbf_series(flows: Dict[str, Any], gateway: int, m: int, H: int) -> List[Dict[str, Any]]:
    """
    For k = 1..n, computes the full DBF curve and schedulability verdict
    considering only the FIRST k flows (in the given order). This lets the
    frontend animate flows being added one at a time and see exactly which
    addition first makes the system non-schedulable — the professor's
    feedback: "me gustaria ver el grafico del sbf vs el dbf... ideal seria
    que se fueran agregando uno a uno, y eso fuera dinamicamente actualizando
    el grafico. Esto permite mostrar que cuando se agregan flujos que ya no
    son schedulables, la demanda (carga) supera la oferta (capacidad)."
    """
    n = flows["n"]
    series = []
    for k in range(1, n + 1):
        sub_flows = {
            "n": k,
            "C": flows["C"][:k],
            "T": flows["T"][:k],
            "D": flows["D"][:k],
            "paths": flows["paths"][:k],
            "conflict_pair_mode": flows.get("conflict_pair_mode", "unique"),
        }
        curves = compute_dbf_curves(sub_flows, gateway, m, H)
        is_schedulable, details = compute_schedulability_status(sub_flows, gateway, m, H)
        series.append({
            "numFlows": k,
            "curves": curves,
            "isSchedulable": is_schedulable,
            "failingWindow": details["failing_window"],
            "totalOverlaps": compute_total_overlaps(sub_flows["paths"], gateway),
        })
    return series

def compute_dbf_curves(flows: Dict[str, Any], gateway: int, m: int, H: int) -> List[Dict[str, Any]]:
    """
    Computes DBF curves (contention, conflict, total demand, capacity) for all t in [1, H].
    Allows full visualization of schedulability over time, and is the single
    source of truth consumed both by the frontend chart and by
    compute_schedulability_status (see above).
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

# =============================================================================
# Multi-gateway (MG) metrics — ported from mo_sp_pt2/metrics/*_mg.m and
# compute_pairwise_overlap_matrix_3hop.m. Kept as separate functions (mirroring
# the MATLAB reference's own mo_sp_pt1 vs mo_sp_pt2 split) rather than
# generalizing the single-gateway functions above, to avoid any risk of
# regressing the already-validated single-gateway code paths.
# =============================================================================

def compute_pairwise_path_overlap_mg(path_a: List[int], path_b: List[int], gateways: List[int]) -> int:
    """Node overlap excluding ALL designated gateways (not just one)."""
    if not path_a or not path_b:
        return 0
    gws = set(gateways)
    set_a = set(node for node in path_a if node not in gws)
    set_b = set(node for node in path_b if node not in gws)
    return len(set_a.intersection(set_b))

def compute_total_overlaps_mg(paths: List[List[int]], gateways: List[int]) -> int:
    """Omega for multi-gateway: sum of node overlaps excluding ALL gateways."""
    omega = 0
    n = len(paths)
    for i in range(n):
        for j in range(i + 1, n):
            omega += compute_pairwise_path_overlap_mg(paths[i], paths[j], gateways)
    return omega

def compute_pairwise_overlap_matrix_mg(paths: List[List[int]], gateways: List[int]) -> np.ndarray:
    n = len(paths)
    Delta = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(i + 1, n):
            ov = compute_pairwise_path_overlap_mg(paths[i], paths[j], gateways)
            Delta[i, j] = ov
            Delta[j, i] = ov
    return Delta

def compute_path_overlaps_factor_3hop(path1: List[int], path2: List[int]) -> int:
    """
    3-hop slot-reuse conflict factor between two routes: groups the EDGES
    shared by both paths into maximal contiguous segments, and each disjoint
    segment contributes min(3, segment_length) — i.e. spatial/channel reuse
    means a shared run longer than 3 hops does not keep adding conflict
    demand. Mirrors compute_path_overlaps_factor_3hop.m exactly.
    """
    if len(path1) < 2 or len(path2) < 2:
        return 0

    edges1 = set(path_to_edges(path1))
    edges2 = set(path_to_edges(path2))
    shared_edges = edges1.intersection(edges2)
    if not shared_edges:
        return 0

    G_shared = nx.Graph()
    G_shared.add_edges_from(shared_edges)

    delta = 0
    for component in nx.connected_components(G_shared):
        subG = G_shared.subgraph(component)
        segment_len = subG.number_of_edges()
        delta += min(3, segment_len)
    return delta

def compute_pairwise_overlap_matrix_3hop(paths: List[List[int]]) -> np.ndarray:
    n = len(paths)
    Delta = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(i + 1, n):
            val = compute_path_overlaps_factor_3hop(paths[i], paths[j])
            Delta[i, j] = val
            Delta[j, i] = val
    return Delta

def compute_conflict_demand_window_mg(flows: Dict[str, Any], ell: float) -> float:
    """
    Transmission-conflict demand for multi-gateway, applying the 3-hop
    slot-reuse rule (mo_sp_pt2/metrics/compute_conflict_demand_window_mg.m).
    """
    paths = flows['paths']
    T = flows['T']
    n = flows['n']
    conflict_pair_mode = flows.get('conflict_pair_mode', 'unique')

    Delta = compute_pairwise_overlap_matrix_3hop(paths)
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

def compute_dbf_curves_mg(flows: Dict[str, Any], m: int, H: int) -> List[Dict[str, Any]]:
    """Multi-gateway counterpart of compute_dbf_curves (3-hop conflict rule)."""
    curves = []
    for t in range(1, H + 1):
        contention = compute_contention_demand_window(flows, m, t)
        conflict = compute_conflict_demand_window_mg(flows, t)
        total_demand = contention + conflict
        curves.append({
            "t": t,
            "contention": float(round(contention, 2)),
            "conflict": float(round(conflict, 2)),
            "demand": float(round(total_demand, 2)),
            "capacity": float(t)
        })
    return curves

def compute_schedulability_status_mg(flows: Dict[str, Any], m: int, H: int) -> Tuple[bool, Dict[str, Any]]:
    """
    Multi-gateway schedulability test, forall ell in (0, H]. Note the MATLAB
    reference's mo_sp_pt2/metrics/compute_schedulability_status_mg.m ALREADY
    implements this forall-l test correctly (unlike the single-window l=H
    test in mo_sp_pt1), independently corroborating the P0 fidelity fix
    applied to compute_schedulability_status above.
    """
    EPS = 1e-9
    curves = compute_dbf_curves_mg(flows, m, H)

    is_schedulable = True
    failing_window: Any = None
    worst_slack = float(H)
    worst_window = H

    for pt in curves:
        slack = pt["t"] - pt["demand"]
        if slack < worst_slack:
            worst_slack = slack
            worst_window = pt["t"]
        if pt["demand"] > pt["t"] + EPS and failing_window is None:
            failing_window = pt["t"]
            is_schedulable = False

    at_H = curves[-1] if curves else {"contention": 0.0, "conflict": 0.0, "demand": 0.0}
    at_worst = next((pt for pt in curves if pt["t"] == worst_window), at_H)

    details = {
        "windows": H,
        "contention": float(at_H["contention"]),
        "conflict": float(at_H["conflict"]),
        "total_demand": float(at_H["demand"]),
        "slack": float(worst_slack),
        "worst_window": int(worst_window),
        "worst_slack": float(worst_slack),
        "worst_contention": float(at_worst["contention"]),
        "worst_conflict": float(at_worst["conflict"]),
        "worst_demand": float(at_worst["demand"]),
        "failing_window": failing_window
    }
    return bool(is_schedulable), details

def compute_incremental_dbf_series_mg(flows: Dict[str, Any], gateways: List[int], m: int, H: int) -> List[Dict[str, Any]]:
    """Multi-gateway counterpart of compute_incremental_dbf_series."""
    n = flows["n"]
    series = []
    for k in range(1, n + 1):
        sub_flows = {
            "n": k,
            "C": flows["C"][:k],
            "T": flows["T"][:k],
            "D": flows["D"][:k],
            "paths": flows["paths"][:k],
            "conflict_pair_mode": flows.get("conflict_pair_mode", "unique"),
        }
        curves = compute_dbf_curves_mg(sub_flows, m, H)
        is_schedulable, details = compute_schedulability_status_mg(sub_flows, m, H)
        series.append({
            "numFlows": k,
            "curves": curves,
            "isSchedulable": is_schedulable,
            "failingWindow": details["failing_window"],
            "totalOverlaps": compute_total_overlaps_mg(sub_flows["paths"], gateways),
        })
    return series

