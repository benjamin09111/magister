import time
import random
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

import networkx as nx
import numpy as np

# Import backend modules
from backend.engine.topology_gen import (
    generate_random_topology,
    get_node_centralities,
    select_gateway_by_centrality,
    select_sensors,
    draw_fresh_seed
)
from backend.engine.routing_sp import run_shortest_path_routing
from backend.engine.routing_mo import run_minimal_overlap_routing
from backend.engine.routing_moaco import run_moaco_routing
from backend.engine.routing_qlearning import run_qlearning_routing
from backend.engine.routing_sarsa import run_sarsa_routing
from backend.engine.multigateway import (
    njw_spectral_clustering,
    select_cluster_gateways,
    select_sensors_mg,
    assign_sensors_to_nearest_gateway,
    run_shortest_path_routing_mg,
    run_minimal_overlap_routing_mg
)
from backend.engine.metrics import (
    compute_total_overlaps,
    compute_average_hops,
    compute_pairwise_overlap_matrix,
    compute_schedulability_status,
    compute_dbf_curves,
    compute_hyperperiod,
    compute_incremental_dbf_series,
    compute_total_overlaps_mg,
    compute_pairwise_overlap_matrix_mg,
    compute_dbf_curves_mg,
    compute_schedulability_status_mg,
    compute_incremental_dbf_series_mg
)
from backend.engine.scheduler import build_tsch_schedule
from backend.db.database import (
    init_db,
    add_history_item,
    get_all_history,
    delete_history_item,
    delete_all_history,
    add_saved_topology,
    get_all_saved_topologies,
    delete_saved_topology,
    add_dataset,
    get_all_datasets,
    get_dataset,
    delete_dataset
)
from backend.models.simulation import TopoConfigModel, SimConfigModel, SweepConfigModel, CompareConfigModel

app = FastAPI(
    title="6TiSCH Multi-Objective Routing Simulator API",
    description="Backend services for analyzing, routing, and scheduling 6TiSCH networks.",
    version="1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.post("/topology/generate")
async def generate_topology(config: TopoConfigModel):
    """
    Generates a random network topology, identifies centralities,
    selects the gateway, and samples random sensor nodes.
    """
    try:
        # Resolve reproducibility seed: use the caller's if given, otherwise
        # draw a fresh one and return it so this exact topology can be
        # replayed later (academic reproducibility requirement).
        seed = config.seed if config.seed is not None else draw_fresh_seed()
        random.seed(seed)

        # Generate topology graph
        G = generate_random_topology(config.N, config.lambda_val, seed=seed, generator=config.topology_generator)

        # Calculate centralities
        centralities = get_node_centralities(G)

        gateway_for_sensor: Dict[int, int] = {}
        cluster_labels: Dict[int, int] = {}

        if config.gateway_mode == 'multi-gateway':
            # NJW spectral clustering + local-centrality gateway per cluster
            # (mo_sp_pt2 multi-gateway extension).
            k = config.num_gateways or 3
            if k < 1 or k > config.N - 1:
                raise HTTPException(status_code=400, detail=f"num_gateways must be between 1 and N-1 (got {k}).")
            cluster_labels = njw_spectral_clustering(G, k)
            gateways = select_cluster_gateways(G, cluster_labels, k, method=config.mg_centrality_method)

            if config.sensors_count is not None:
                sensors_count = max(2, min(config.N - len(gateways), config.sensors_count))
            else:
                sensors_count = max(2, int(config.N * 0.25))

            sensors = select_sensors_mg(G, gateways, sensors_count, seed=seed)
            gateway_for_sensor = assign_sensors_to_nearest_gateway(G, sensors, gateways)
            gateway = gateways[0]  # kept for backward-compat consumers that expect a single "gateway"
        else:
            # Determine gateway
            if config.gateway_mode == 'manual' and config.selected_gateway is not None:
                gateway = config.selected_gateway
                if gateway >= config.N or gateway < 0:
                    raise HTTPException(status_code=400, detail="Selected gateway index is out of bounds.")
            else:
                # Paper-faithful default: highest betweenness centrality (Sec. 3.1).
                gateway = select_gateway_by_centrality(G, method=config.centrality_metric)

            gateways = [gateway]

            # Select sensors count (use client parameter if provided, otherwise default to 25% of nodes)
            if config.sensors_count is not None:
                sensors_count = max(2, min(config.N - 1, config.sensors_count))
            else:
                sensors_count = max(2, int(config.N * 0.25))

            sensors = select_sensors(config.N, sensors_count, gateway, seed=seed)
            gateway_for_sensor = {s: gateway for s in sensors}

        gateways_set = set(gateways)
        gateway_index = {gw: idx for idx, gw in enumerate(gateways)}

        # Format nodes and edges for Cytoscape.js
        nodes_list = []
        for u in G.nodes():
            u_type = 'gateway' if u in gateways_set else ('sensor' if u in sensors else 'normal')
            label = f"GW{gateway_index[u] + 1}" if (u in gateways_set and len(gateways) > 1) else ("GW" if u in gateways_set else f"N{u}")
            nodes_list.append({
                "data": {
                    "id": str(u),
                    "label": label,
                    "type": u_type,
                    "betweenness": centralities[str(u)]["betweenness"],
                    "degree": centralities[str(u)]["degree"],
                    "cluster": cluster_labels.get(u) if cluster_labels else None
                }
            })

        edges_list = []
        for idx, (u, v) in enumerate(G.edges()):
            edges_list.append({
                "data": {
                    "id": f"e{idx}",
                    "source": str(u),
                    "target": str(v),
                    "weight": 1.0
                }
            })

        return {
            "N": config.N,
            "lambda_val": config.lambda_val,
            "gateway": gateway,
            "gateways": gateways,
            "gatewayForSensor": {str(s): gw for s, gw in gateway_for_sensor.items()},
            "sensors": sensors,
            "nodes": nodes_list,
            "edges": edges_list,
            "seed": seed,
            "centralityMetric": config.centrality_metric,
            "topologyGenerator": config.topology_generator
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def _run_simulation_mg(config: SimConfigModel, G: nx.Graph, seed: int) -> Dict[str, Any]:
    """
    Multi-gateway counterpart of run_simulation's single-gateway body. Kept
    as a separate, self-contained function (rather than threading a
    gateway-vs-gateways branch through every line of the single-gateway path)
    to avoid any risk of regressing the already-validated single-gateway
    code. Only SP and MO are supported, matching the MATLAB reference's
    actual scope (mo_sp_pt2 does not define MO_ACO/QLearning/SARSA variants
    for multiple gateways).
    """
    method = config.routing_method
    if method not in ('SP', 'MO'):
        raise HTTPException(
            status_code=400,
            detail=f"Routing method '{method}' is not supported in multi-gateway mode. "
                   f"Only 'SP' and 'MO' are validated against the MATLAB reference (mo_sp_pt2)."
        )

    k = config.num_gateways or 3
    if config.gateways:
        gateways = config.gateways
    else:
        cluster_labels = njw_spectral_clustering(G, k)
        gateways = select_cluster_gateways(G, cluster_labels, k, method=config.mg_centrality_method)

    sensors = config.sensors
    if not sensors:
        sensors = select_sensors_mg(G, gateways, config.sensors_count, seed=seed)

    gateway_for_sensor = assign_sensors_to_nearest_gateway(G, sensors, gateways)

    sp_paths = run_shortest_path_routing_mg(G, sensors, gateway_for_sensor)

    start_time = time.time()
    if method == 'SP':
        paths = sp_paths
    else:  # 'MO'
        psi = config.mo_psi if config.mo_psi is not None else 0.0265
        paths = run_minimal_overlap_routing_mg(G, sp_paths, sensors, gateway_for_sensor, psi, config.k_max)
    execution_time = time.time() - start_time

    random_gen = random.Random(seed)
    period_values = [2 ** eta for eta in range(config.eta_min, config.eta_max + 1)]
    T = [random_gen.choice(period_values) for _ in range(len(sensors))]
    D = list(T)
    H = compute_hyperperiod(T)
    w_slots = 2

    sp_C = [(len(p) - 1) * w_slots for p in sp_paths]
    sp_flows = {"n": len(sensors), "C": sp_C, "T": T, "D": D, "paths": sp_paths, "conflict_pair_mode": config.conflict_pair_mode}
    sp_is_schedulable, sp_sched_details = compute_schedulability_status_mg(sp_flows, config.m_fixed, H)
    sp_total_overlaps = compute_total_overlaps_mg(sp_paths, gateways)
    sp_avg_hops = compute_average_hops(sp_paths)
    sp_dbf_curves = compute_dbf_curves_mg(sp_flows, config.m_fixed, H)

    sel_C = [(len(p) - 1) * w_slots for p in paths]
    sel_flows = {"n": len(sensors), "C": sel_C, "T": T, "D": D, "paths": paths, "conflict_pair_mode": config.conflict_pair_mode}
    sel_is_schedulable, sel_sched_details = compute_schedulability_status_mg(sel_flows, config.m_fixed, H)
    sel_total_overlaps = compute_total_overlaps_mg(paths, gateways)
    sel_avg_hops = compute_average_hops(paths)
    sel_dbf_curves = compute_dbf_curves_mg(sel_flows, config.m_fixed, H)
    sel_incremental_dbf = compute_incremental_dbf_series_mg(sel_flows, gateways, config.m_fixed, H)

    # Concrete TSCH grid builder is gateway-agnostic internally (derives
    # sender/receiver purely from each path's node sequence), so it works
    # unchanged for multi-gateway paths.
    paths_dict = {str(sensors[idx]): path for idx, path in enumerate(paths)}
    tsch_grid, tsch_all_sched = build_tsch_schedule(
        paths=paths_dict, sensors=sensors, gateway=gateways[0],
        T=T, D=D, H=H, m=config.m_fixed, w_slots=w_slots
    )

    is_schedulable = sel_is_schedulable and tsch_all_sched

    delta_matrix = compute_pairwise_overlap_matrix_mg(paths, gateways)
    flows_detail = []
    for idx, sensor in enumerate(sensors):
        sensor_overlaps = int(np.sum(delta_matrix[idx]))
        flows_detail.append({
            "sensorId": str(sensor),
            "path": [str(n) for n in paths[idx]],
            "period": T[idx],
            "deadline": D[idx],
            "overlaps": sensor_overlaps,
            "isSchedulable": is_schedulable,
            "gatewayId": str(gateway_for_sensor[sensor])
        })

    return {
        "method": method,
        "executionTime": execution_time,
        "isSchedulable": is_schedulable,
        "totalOverlaps": sel_total_overlaps,
        "averageHops": sel_avg_hops,
        "paths": {str(sensors[idx]): [str(n) for n in paths[idx]] for idx in range(len(paths))},
        "flows": flows_detail,
        "schedDetails": sel_sched_details,
        "tschGrid": tsch_grid,
        "dbfCurves": sel_dbf_curves,
        "incrementalDbf": sel_incremental_dbf,
        "seed": seed,
        "H": H,
        "periods": T,
        "gateway": gateways[0],
        "gateways": gateways,
        "gatewayForSensor": {str(s): gw for s, gw in gateway_for_sensor.items()},
        "centralityMetric": config.mg_centrality_method,
        "baseline": {
            "method": "SP",
            "isSchedulable": sp_is_schedulable,
            "totalOverlaps": sp_total_overlaps,
            "averageHops": sp_avg_hops,
            "schedDetails": sp_sched_details,
            "dbfCurves": sp_dbf_curves
        }
    }

@app.post("/simulation/run")
async def run_simulation(config: SimConfigModel):
    """
    Executes the simulation: performs routing, computes schedulability,
    allocates TSCH scheduler cells, and returns comparison with Dijkstra SP.
    """
    try:
        # Reconstruct graph from edges
        if not config.edges:
            raise HTTPException(status_code=400, detail="Graph topology edges must be provided.")

        G = nx.Graph()
        for i in range(config.N):
            G.add_node(i)

        for edge_item in config.edges:
            edge_data = edge_item["data"]
            u = int(edge_data["source"])
            v = int(edge_data["target"])
            weight = float(edge_data.get("weight", 1.0))
            G.add_edge(u, v, weight=weight)

        # Resolve reproducibility seed up front: every random decision from
        # here on (gateway tie-breaks, sensor sampling, flow periods, and the
        # stochastic routing methods MOACO/QLearning/SARSA which draw from the
        # global `random` module) is derived from this single seed.
        seed = config.seed if config.seed is not None else draw_fresh_seed()
        random.seed(seed)

        if config.gateway_mode == 'multi-gateway':
            return _run_simulation_mg(config, G, seed)

        # Determine gateway
        gateway = config.selected_gateway
        if gateway is None:
            gateway = select_gateway_by_centrality(G, method=config.centrality_metric)

        # Determine sensors
        sensors = config.sensors
        if not sensors:
            sensors = select_sensors(config.N, config.sensors_count, gateway, seed=seed)

        # 1. ALWAYS run Shortest Path as literature baseline reference
        sp_paths = run_shortest_path_routing(G, sensors, gateway)
        
        # 2. Run selected algorithm
        method = config.routing_method
        start_time = time.time()
        
        if method == 'SP':
            paths = sp_paths
        elif method == 'MO':
            psi = config.mo_psi if config.mo_psi is not None else 0.0265
            paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, config.k_max)
        elif method == 'MO_ACO':
            psi = config.mo_psi if config.mo_psi is not None else 0.0265
            mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, config.k_max)
            
            aco_cfg = {
                "num_candidates_per_flow": 8,
                "max_candidate_attempts": 40,
                "aco_num_ants": config.aco_num_ants if config.aco_num_ants is not None else 20,
                "aco_num_iterations": config.aco_num_iterations if config.aco_num_iterations is not None else 35,
                "aco_alpha": config.aco_alpha if config.aco_alpha is not None else 1.0,
                "aco_beta": config.aco_beta if config.aco_beta is not None else 2.5,
                "aco_rho": config.aco_rho if config.aco_rho is not None else 0.10,
                "aco_Q": config.aco_Q if config.aco_Q is not None else 2.0,
                "aco_hops_penalty": config.aco_hops_penalty if config.aco_hops_penalty is not None else 0.001,
                "aco_partial_overlap_penalty": config.aco_partial_overlap_penalty if config.aco_partial_overlap_penalty is not None else 25.0
            }
            paths = run_moaco_routing(G, mo_paths, sensors, gateway, aco_cfg)
        elif method == 'QLearning':
            ql_cfg = {
                "ql_alpha": config.ql_alpha if config.ql_alpha is not None else 0.1,
                "ql_gamma": config.ql_gamma if config.ql_gamma is not None else 0.9,
                "ql_epsilon_start": config.ql_epsilon_start if config.ql_epsilon_start is not None else 1.0,
                "ql_epsilon_min": config.ql_epsilon_min if config.ql_epsilon_min is not None else 0.05,
                "ql_num_episodes": config.ql_num_episodes if config.ql_num_episodes is not None else 400
            }
            paths = run_qlearning_routing(G, sensors, gateway, ql_cfg)
        elif method == 'SARSA':
            sar_cfg = {
                "sar_alpha": config.sar_alpha if config.sar_alpha is not None else 0.1,
                "sar_gamma": config.sar_gamma if config.sar_gamma is not None else 0.9,
                "sar_epsilon_start": config.sar_epsilon_start if config.sar_epsilon_start is not None else 1.0,
                "sar_epsilon_min": config.sar_epsilon_min if config.sar_epsilon_min is not None else 0.05,
                "sar_num_episodes": config.sar_num_episodes if config.sar_num_episodes is not None else 400
            }
            paths = run_sarsa_routing(G, sensors, gateway, sar_cfg)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown routing method: {method}")
            
        execution_time = time.time() - start_time

        # 3. Generate harmonic periods for flows, deterministically from `seed`
        random_gen = random.Random(seed)
        period_values = [2 ** eta for eta in range(config.eta_min, config.eta_max + 1)]
        T = [random_gen.choice(period_values) for _ in range(len(sensors))]
        D = list(T) # implicit deadlines

        # The authoritative hyperperiod is H = lcm(T) of the periods actually
        # drawn (paper §6.1: "H = lcm(T)"), NOT an arbitrary client input.
        # This also fixes a fidelity bug where schedulability could be
        # evaluated over a window shorter (or longer, wastefully) than the
        # true hyperperiod of the generated flow set.
        H = compute_hyperperiod(T)

        # 4. Compute metrics for reference SP
        w_slots = 2
        sp_C = [(len(p) - 1) * w_slots for p in sp_paths]  # Ci = hops * w
        sp_flows = {
            "n": len(sensors),
            "C": sp_C,
            "T": T,
            "D": D,
            "paths": sp_paths,
            "conflict_pair_mode": config.conflict_pair_mode
        }
        sp_is_schedulable, sp_sched_details = compute_schedulability_status(sp_flows, gateway, config.m_fixed, H)
        sp_total_overlaps = compute_total_overlaps(sp_paths, gateway)
        sp_avg_hops = compute_average_hops(sp_paths)
        sp_dbf_curves = compute_dbf_curves(sp_flows, gateway, config.m_fixed, H)

        # 5. Compute metrics for selected method
        sel_C = [(len(p) - 1) * w_slots for p in paths]
        sel_flows = {
            "n": len(sensors),
            "C": sel_C,
            "T": T,
            "D": D,
            "paths": paths,
            "conflict_pair_mode": config.conflict_pair_mode
        }
        sel_is_schedulable, sel_sched_details = compute_schedulability_status(sel_flows, gateway, config.m_fixed, H)
        sel_total_overlaps = compute_total_overlaps(paths, gateway)
        sel_avg_hops = compute_average_hops(paths)
        sel_dbf_curves = compute_dbf_curves(sel_flows, gateway, config.m_fixed, H)
        sel_incremental_dbf = compute_incremental_dbf_series(sel_flows, gateway, config.m_fixed, H)

        # 6. Build concrete TSCH Schedule Grid for selected method
        paths_dict = {str(sensors[idx]): path for idx, path in enumerate(paths)}
        tsch_grid, tsch_all_sched = build_tsch_schedule(
            paths=paths_dict,
            sensors=sensors,
            gateway=gateway,
            T=T,
            D=D,
            H=H,
            m=config.m_fixed,
            w_slots=w_slots
        )
        
        # Override schedulability with concrete TSCH result if concrete check is stricter
        is_schedulable = sel_is_schedulable and tsch_all_sched
        
        # Generate flow details
        delta_matrix = compute_pairwise_overlap_matrix(paths, gateway)
        flows_detail = []
        for idx, sensor in enumerate(sensors):
            sensor_overlaps = int(np.sum(delta_matrix[idx]))
            flows_detail.append({
                "sensorId": str(sensor),
                "path": [str(n) for n in paths[idx]],
                "period": T[idx],
                "deadline": D[idx],
                "overlaps": sensor_overlaps,
                "isSchedulable": is_schedulable
            })
            
        results_payload = {
            "method": method,
            "executionTime": execution_time,
            "isSchedulable": is_schedulable,
            "totalOverlaps": sel_total_overlaps,
            "averageHops": sel_avg_hops,
            "paths": {str(sensors[idx]): [str(n) for n in paths[idx]] for idx, path in enumerate(paths)},
            "flows": flows_detail,
            "schedDetails": sel_sched_details,
            "tschGrid": tsch_grid,
            "dbfCurves": sel_dbf_curves,
            "incrementalDbf": sel_incremental_dbf,
            # Reproducibility & fidelity metadata
            "seed": seed,
            "H": H,
            "periods": T,
            "gateway": gateway,
            "centralityMetric": config.centrality_metric,
            # Comparison baseline
            "baseline": {
                "method": "SP",
                "isSchedulable": sp_is_schedulable,
                "totalOverlaps": sp_total_overlaps,
                "averageHops": sp_avg_hops,
                "schedDetails": sp_sched_details,
                "dbfCurves": sp_dbf_curves
            }
        }

        return results_payload

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def execute_single_sweep_replica(
    rep: int,
    temp_N: int,
    temp_lambda: float,
    temp_sensors_count: int,
    temp_m: int,
    period_values: List[int],
    methods: List[str],
    k_max: int,
    H_hint: int,
    conflict_pair_mode: str,
    replica_seed: int,
    centrality_metric: str = 'betweenness',
    topology_generator: str = 'erdos_renyi'
) -> Dict[str, Any]:
    """
    Helper function to run a single Monte Carlo simulation replica.
    Executed in parallel processes on Windows.

    Every random decision (topology, gateway tie-breaks, sensor sampling,
    flow periods, and the stochastic routing methods) is derived from
    `replica_seed`, so any single replica of any sweep can be reproduced
    exactly by re-running /simulation/run with the same seed/parameters.
    """
    random.seed(replica_seed)  # reseed the whole process: ProcessPoolExecutor workers are reused across tasks

    # Topology
    G = generate_random_topology(temp_N, temp_lambda, seed=replica_seed, generator=topology_generator)
    gateway = select_gateway_by_centrality(G, method=centrality_metric)
    sensors = select_sensors(temp_N, temp_sensors_count, gateway, seed=replica_seed)

    # Flow properties, reproducible from the same replica seed
    random_gen = random.Random(replica_seed)
    T = [random_gen.choice(period_values) for _ in range(len(sensors))]
    D = list(T)
    # Authoritative hyperperiod for THIS replica's flow set (paper §6.1: H = lcm(T)).
    H = compute_hyperperiod(T) if T else H_hint

    sp_paths = run_shortest_path_routing(G, sensors, gateway)
    
    replica_results = {}
    for m in methods:
        if m == 'SP':
            paths = sp_paths
        elif m == 'MO':
            psi = 0.0265
            paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, k_max)
        elif m == 'MO_ACO':
            psi = 0.0265
            mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, k_max)
            aco_cfg = {
                "num_candidates_per_flow": 8,
                "max_candidate_attempts": 40,
                "aco_num_ants": 20,
                "aco_num_iterations": 35,
                "aco_alpha": 1.0,
                "aco_beta": 2.5,
                "aco_rho": 0.10,
                "aco_Q": 2.0,
                "aco_hops_penalty": 0.001,
                "aco_partial_overlap_penalty": 25.0
            }
            paths = run_moaco_routing(G, mo_paths, sensors, gateway, aco_cfg)
        elif m == 'QLearning':
            ql_cfg = {
                "ql_alpha": 0.1,
                "ql_gamma": 0.9,
                "ql_epsilon_start": 1.0,
                "ql_epsilon_min": 0.05,
                "ql_num_episodes": 250
            }
            paths = run_qlearning_routing(G, sensors, gateway, ql_cfg)
        elif m == 'SARSA':
            sar_cfg = {
                "sar_alpha": 0.1,
                "sar_gamma": 0.9,
                "sar_epsilon_start": 1.0,
                "sar_epsilon_min": 0.05,
                "sar_num_episodes": 250
            }
            paths = run_sarsa_routing(G, sensors, gateway, sar_cfg)
        else:
            paths = sp_paths
            
        overlaps = compute_total_overlaps(paths, gateway)
        avg_hops = compute_average_hops(paths)
        
        w_slots = 2
        sel_C = [(len(p) - 1) * w_slots for p in paths]
        sel_flows = {
            "n": len(sensors),
            "C": sel_C,
            "T": T,
            "D": D,
            "paths": paths,
            "conflict_pair_mode": conflict_pair_mode
        }
        is_sched, _ = compute_schedulability_status(sel_flows, gateway, temp_m, H)
        
        # Concrete TSCH Grid check
        paths_dict = {str(sensors[idx]): path for idx, path in enumerate(paths)}
        _, concrete_sched = build_tsch_schedule(
            paths=paths_dict,
            sensors=sensors,
            gateway=gateway,
            T=T,
            D=D,
            H=H,
            m=temp_m,
            w_slots=2
        )
        
        replica_results[m] = {
            "overlaps": overlaps,
            "hops": avg_hops,
            "schedulable": 1.0 if (is_sched and concrete_sched) else 0.0
        }

    # Metadata for traceability / dataset persistence (ignored by aggregation,
    # which only reads keys in `methods`).
    replica_results["_meta"] = {
        "replicaIndex": rep,
        "seed": replica_seed,
        "H": H,
        "gateway": gateway,
        "sensors": sensors,
        "N": temp_N,
        "lambda_val": temp_lambda,
        "m": temp_m,
        "edges": [[int(u), int(v)] for u, v in G.edges()],
        "T": T
    }

    return replica_results


def generate_sweep_plot_png(sweep_param: str, sweep_values: List[float], results_list: List[Dict[str, Any]],
                              methods: List[str], replicas: int) -> str:
    """
    Renders the paper-style matplotlib figure (3 subplots: overlaps, hops,
    schedulability ratio) from already-computed sweep results. Factored out
    of /simulation/sweep so a persisted dataset (see /datasets/{id}) can
    regenerate the SAME figure later WITHOUT re-running the Monte Carlo
    simulation (professor's feedback: "un dataset guardable y que, sobre ese
    dataset, se puedan extraer graficos que resuman el desempeno").
    """
    import os
    import matplotlib
    matplotlib.use('Agg')  # Prevent GUI engine crashes
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "font.family":      "serif",
        "font.size":        10,
        "axes.titlesize":   11,
        "axes.labelsize":   10,
        "legend.fontsize":  8.5,
        "xtick.labelsize":  8.5,
        "ytick.labelsize":  8.5,
        "axes.grid":        True,
        "grid.linestyle":   "--",
        "grid.alpha":       0.45,
        "figure.dpi":       150,
    })

    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(15, 4.5), gridspec_kw={'wspace': 0.28})

    COLOR_MO = "#2ca02c"   # Verde (AGENTS.md rule)
    COLOR_SP = "#d62728"   # Rojo (AGENTS.md rule)
    COLOR_OTHERS = ["#1f77b4", "#9467bd", "#ff7f0e", "#17becf"]

    param_label = {
        "N": "Number of Nodes (N)",
        "lambda": r"Network Density ($\lambda$)",
        "channels": "TSCH Channels (m)",
        "n": "Number of Flows (n)"
    }.get(sweep_param, sweep_param)

    color_idx = 0
    for m in methods:
        y_overlaps = [pt["metrics"][m]["overlaps"] for pt in results_list]
        y_hops = [pt["metrics"][m]["hops"] for pt in results_list]
        y_sched = [pt["metrics"][m]["schedulability"] for pt in results_list]

        if m == "MO":
            col = COLOR_MO
            fmt = "-s"
            lbl = r"Minimal Overlap (MO)"
            mface = COLOR_MO
            msize = 5.5
            lwd = 2.2
        elif m == "SP":
            col = COLOR_SP
            fmt = "--o"
            lbl = r"Dijkstra Shortest Path (SP)"
            mface = "white"
            msize = 5.0
            lwd = 1.6
        else:
            col = COLOR_OTHERS[color_idx % len(COLOR_OTHERS)]
            fmt = "-^" if m == "MO_ACO" else "-d"
            lbl = m
            mface = col
            msize = 5.0
            lwd = 1.8
            color_idx += 1

        ax1.plot(sweep_values, y_overlaps, fmt, color=col, linewidth=lwd,
                 markerfacecolor=mface, markersize=msize, label=lbl)
        ax2.plot(sweep_values, y_hops, fmt, color=col, linewidth=lwd,
                 markerfacecolor=mface, markersize=msize, label=lbl)
        ax3.plot(sweep_values, y_sched, fmt, color=col, linewidth=lwd,
                 markerfacecolor=mface, markersize=msize, label=lbl)

    # Shaded area between SP baseline and MO optimized (AGENTS.md rule)
    if "SP" in methods and "MO" in methods:
        sp_y_overlaps = [pt["metrics"]["SP"]["overlaps"] for pt in results_list]
        mo_y_overlaps = [pt["metrics"]["MO"]["overlaps"] for pt in results_list]
        ax1.fill_between(sweep_values, mo_y_overlaps, sp_y_overlaps,
                         where=[s > m for s, m in zip(sp_y_overlaps, mo_y_overlaps)],
                         color=COLOR_MO, alpha=0.15, interpolate=True)

        sp_y_sched = [pt["metrics"]["SP"]["schedulability"] for pt in results_list]
        mo_y_sched = [pt["metrics"]["MO"]["schedulability"] for pt in results_list]
        ax3.fill_between(sweep_values, sp_y_sched, mo_y_sched,
                         where=[m > s for s, m in zip(mo_y_sched, sp_y_sched)],
                         color=COLOR_MO, alpha=0.15, interpolate=True)

    ax1.set_xlabel(param_label)
    ax1.set_ylabel("Average Total Overlaps")
    ax1.set_title("Routing Overlaps")
    ax1.set_ylim(bottom=0)
    ax1.grid(True, linestyle="--", alpha=0.4)

    ax2.set_xlabel(param_label)
    ax2.set_ylabel("Average Hops per Route")
    ax2.set_title("Route Length (Hops)")
    ax2.set_ylim(bottom=0)
    ax2.grid(True, linestyle="--", alpha=0.4)

    ax3.set_xlabel(param_label)
    ax3.set_ylabel("TSCH Schedulability Ratio (%)")
    ax3.set_title("Schedulability Success Rate")
    ax3.set_ylim(-5, 105)
    ax3.grid(True, linestyle="--", alpha=0.4)

    ax1.legend(loc="best", framealpha=0.92, edgecolor="#BBBBBB")

    fig.suptitle(f"Batch Simulation Sweep (Average of {replicas} independent trials per point)\n"
                 f"Varying parameter: {sweep_param}", fontsize=11, y=1.02)

    # Output directory paths
    out_dirs = ["figures_phi", os.path.join("software", "public", "figures_phi")]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    path_in_public = os.path.join("software", "public", "figures_phi", "sweep_plot.png")
    path_in_root = os.path.join("figures_phi", "sweep_plot.png")

    plt.savefig(path_in_public, dpi=300, bbox_inches="tight")
    plt.savefig(path_in_root, dpi=300, bbox_inches="tight")
    plt.close()

    return "/figures_phi/sweep_plot.png"


@app.post("/simulation/sweep")
async def run_sweep_simulation(config: SweepConfigModel):
    """
    Executes a batch simulation parameter sweep, averages results,
    and automatically generates a paper-quality matplotlib figure.
    Uses ProcessPoolExecutor to parallelize simulations over all cores.
    """
    try:
        from concurrent.futures import ProcessPoolExecutor

        # Calculate sweep values
        val = config.sweep_start
        sweep_values = []
        while val <= config.sweep_end + 1e-9:
            sweep_values.append(val)
            val += config.sweep_step
            
        if not sweep_values:
            raise HTTPException(status_code=400, detail="Invalid sweep range configuration.")
            
        methods = config.methods
        if not methods:
            raise HTTPException(status_code=400, detail="No routing methods selected.")
            
        # Ensure Shortest Path (SP) is always simulated as baseline
        if "SP" not in methods:
            methods = ["SP"] + methods
            
        results_list = []

        # Period values
        period_values = [2 ** eta for eta in range(config.eta_min, config.eta_max + 1)]

        # Resolve a base seed for the whole sweep. Every (point, replica) pair
        # derives a distinct, deterministic seed from it, so the ENTIRE sweep
        # (and any single replica within it) can be reproduced exactly by
        # re-supplying the same base seed.
        base_seed = config.seed if config.seed is not None else draw_fresh_seed()

        # Build list of all parallel simulation tasks (sweep points x replicas)
        tasks = []
        for point_idx, current_val in enumerate(sweep_values):
            temp_N = config.N
            temp_lambda = config.lambda_val
            temp_m = config.m_fixed
            temp_sensors_count = config.sensors_count

            if config.sweep_param == "N":
                temp_N = int(current_val)
                temp_sensors_count = max(2, int(temp_N * 0.25))
            elif config.sweep_param == "lambda":
                temp_lambda = float(current_val)
            elif config.sweep_param == "channels":
                temp_m = int(current_val)
            elif config.sweep_param == "n":
                # Number of flows/sensors — the paper's primary sweep axis (Figs. 2-6, n in [2,22]).
                temp_sensors_count = max(2, min(temp_N - 1, int(current_val)))

            for rep in range(config.replicas):
                # Deterministic per-(point, replica) seed, in the same spirit
                # as the MATLAB reference's seed_val = trial_idx + 1000*lambda
                # + 100000*n (run_single_trial_ngres.m), but keyed off the
                # sweep point index so it stays valid regardless of which
                # parameter is being swept.
                replica_seed = base_seed + point_idx * 100_000 + rep
                tasks.append({
                    "val": current_val,
                    "rep": rep,
                    "N": temp_N,
                    "lambda": temp_lambda,
                    "sensors_count": temp_sensors_count,
                    "m": temp_m,
                    "seed": replica_seed
                })

        # Run all simulation tasks in parallel using ProcessPoolExecutor
        # The pool size defaults to the number of processors on the machine.
        if config.replicas > 1 and len(tasks) > 1:
            with ProcessPoolExecutor() as executor:
                futures = [
                    executor.submit(
                        execute_single_sweep_replica,
                        t["rep"], t["N"], t["lambda"], t["sensors_count"], t["m"],
                        period_values, methods, config.k_max, config.H, config.conflict_pair_mode,
                        t["seed"], config.centrality_metric, config.topology_generator
                    )
                    for t in tasks
                ]
                # Gather all results
                all_results = [f.result() for f in futures]
        else:
            # Sync fallback for 1 replica/task
            all_results = [
                execute_single_sweep_replica(
                    t["rep"], t["N"], t["lambda"], t["sensors_count"], t["m"],
                    period_values, methods, config.k_max, config.H, config.conflict_pair_mode,
                    t["seed"], config.centrality_metric, config.topology_generator
                )
                for t in tasks
            ]
            
        # Map flat results back to their respective sweep values
        results_by_val = {val: [] for val in sweep_values}
        for idx, task in enumerate(tasks):
            results_by_val[task["val"]].append(all_results[idx])
            
        # Compute averages for each sweep value point
        for current_val in sweep_values:
            point_accum = {m: {"overlaps": 0.0, "hops": 0.0, "schedulability_count": 0} for m in methods}
            replica_res_list = results_by_val[current_val]
            
            for rep_res in replica_res_list:
                for m in methods:
                    point_accum[m]["overlaps"] += rep_res[m]["overlaps"]
                    point_accum[m]["hops"] += rep_res[m]["hops"]
                    point_accum[m]["schedulability_count"] += int(rep_res[m]["schedulable"])
                    
            point_metrics = {}
            for m in methods:
                point_metrics[m] = {
                    "overlaps": round(point_accum[m]["overlaps"] / config.replicas, 2),
                    "hops": round(point_accum[m]["hops"] / config.replicas, 2),
                    "schedulability": round((point_accum[m]["schedulability_count"] / config.replicas) * 100, 1)
                }
                
            results_list.append({
                "value": current_val,
                "metrics": point_metrics
            })
            
        plot_url = generate_sweep_plot_png(config.sweep_param, sweep_values, results_list, methods, config.replicas)

        # Persist the dataset (aggregated results + compact per-replica raw
        # data) so this exact sweep can be re-plotted later without
        # re-running the Monte Carlo simulation.
        dataset_id = None
        if config.save_dataset:
            dataset_id = str(uuid.uuid4())
            compact_raw_replicas = []
            for idx, task in enumerate(tasks):
                rep_res = dict(all_results[idx])
                meta = rep_res.pop("_meta", {})
                compact_raw_replicas.append({
                    "value": task["val"],
                    "rep": task["rep"],
                    "seed": task["seed"],
                    "N": meta.get("N"),
                    "lambda_val": meta.get("lambda_val"),
                    "m": meta.get("m"),
                    "H": meta.get("H"),
                    "gateway": meta.get("gateway"),
                    "metrics": rep_res
                })
            await add_dataset({
                "id": dataset_id,
                "name": config.dataset_name or f"Sweep {config.sweep_param} ({time.strftime('%Y-%m-%d %H:%M:%S')})",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "sweep_param": config.sweep_param,
                "replicas": config.replicas,
                "base_seed": base_seed,
                "centrality_metric": config.centrality_metric,
                "topology_generator": config.topology_generator,
                "methods": methods,
                "base_config": {
                    "N": config.N, "lambda_val": config.lambda_val, "sensors_count": config.sensors_count,
                    "k_max": config.k_max, "m_fixed": config.m_fixed, "H": config.H,
                    "eta_min": config.eta_min, "eta_max": config.eta_max,
                    "conflict_pair_mode": config.conflict_pair_mode
                },
                "values": sweep_values,
                "results": results_list,
                "raw_replicas": compact_raw_replicas
            })

        return {
            "sweep_param": config.sweep_param,
            "values": sweep_values,
            "results": results_list,
            "plotUrl": plot_url,
            "baseSeed": base_seed,
            "centralityMetric": config.centrality_metric,
            "topologyGenerator": config.topology_generator,
            "replicas": config.replicas
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulation/compare")
async def run_comparison_simulation(config: CompareConfigModel):
    """
    Executes routing, metrics, and TSCH scheduling for two different algorithms 
    on the exact same network topology and flow set for direct side-by-side comparison.
    """
    try:
        # 1. Reconstruct Graph
        if not config.edges:
            raise HTTPException(status_code=400, detail="Graph topology edges must be provided.")
            
        G = nx.Graph()
        for i in range(config.N):
            G.add_node(i)
            
        for edge_item in config.edges:
            edge_data = edge_item["data"]
            u = int(edge_data["source"])
            v = int(edge_data["target"])
            weight = float(edge_data.get("weight", 1.0))
            G.add_edge(u, v, weight=weight)
            
        seed = config.seed if config.seed is not None else draw_fresh_seed()
        random.seed(seed)

        if config.gateway_mode == 'multi-gateway':
            # Scoped limitation: side-by-side comparison under multi-gateway
            # is not yet implemented (only the single-run simulator tab wires
            # SP-MG/MO-MG, see _run_simulation_mg). Fail loudly rather than
            # silently falling back to a single betweenness gateway.
            raise HTTPException(
                status_code=400,
                detail="Multi-gateway mode is not yet supported in the comparison view. "
                       "Use the single simulation tab (routing_method SP or MO) for multi-gateway runs."
            )

        gateway = config.selected_gateway
        if gateway is None:
            gateway = select_gateway_by_centrality(G, method=config.centrality_metric)

        sensors = config.sensors
        if not sensors:
            sensors = select_sensors(config.N, config.sensors_count, gateway, seed=seed)

        # 2. Replicable Flow properties (same seed, same T/D/H for BOTH methods,
        # so the comparison is a true apples-to-apples paired trial)
        random_gen = random.Random(seed)
        period_values = [2 ** eta for eta in range(config.eta_min, config.eta_max + 1)]
        T = [random_gen.choice(period_values) for _ in range(len(sensors))]
        D = list(T)
        H = compute_hyperperiod(T)  # authoritative hyperperiod, see /simulation/run

        # Shortest path is baseline and needed for MO/MO_ACO
        sp_paths = run_shortest_path_routing(G, sensors, gateway)
        
        # Helper execution closure
        def run_single_method(method_name: str) -> dict:
            start_time = time.time()
            if method_name == 'SP':
                paths = sp_paths
            elif method_name == 'MO':
                psi = config.mo_psi if config.mo_psi is not None else 0.0265
                paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, config.k_max)
            elif method_name == 'MO_ACO':
                psi = config.mo_psi if config.mo_psi is not None else 0.0265
                mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, config.k_max)
                aco_cfg = {
                    "num_candidates_per_flow": 8,
                    "max_candidate_attempts": 40,
                    "aco_num_ants": config.aco_num_ants if config.aco_num_ants is not None else 20,
                    "aco_num_iterations": config.aco_num_iterations if config.aco_num_iterations is not None else 35,
                    "aco_alpha": config.aco_alpha if config.aco_alpha is not None else 1.0,
                    "aco_beta": config.aco_beta if config.aco_beta is not None else 2.5,
                    "aco_rho": config.aco_rho if config.aco_rho is not None else 0.10,
                    "aco_Q": config.aco_Q if config.aco_Q is not None else 2.0,
                    "aco_hops_penalty": config.aco_hops_penalty if config.aco_hops_penalty is not None else 0.001,
                    "aco_partial_overlap_penalty": config.aco_partial_overlap_penalty if config.aco_partial_overlap_penalty is not None else 25.0
                }
                paths = run_moaco_routing(G, mo_paths, sensors, gateway, aco_cfg)
            elif method_name == 'QLearning':
                ql_cfg = {
                    "ql_alpha": config.ql_alpha if config.ql_alpha is not None else 0.1,
                    "ql_gamma": config.ql_gamma if config.ql_gamma is not None else 0.9,
                    "ql_epsilon_start": config.ql_epsilon_start if config.ql_epsilon_start is not None else 1.0,
                    "ql_epsilon_min": config.ql_epsilon_min if config.ql_epsilon_min is not None else 0.05,
                    "ql_num_episodes": config.ql_num_episodes if config.ql_num_episodes is not None else 400
                }
                paths = run_qlearning_routing(G, sensors, gateway, ql_cfg)
            elif method_name == 'SARSA':
                sar_cfg = {
                    "sar_alpha": config.sar_alpha if config.sar_alpha is not None else 0.1,
                    "sar_gamma": config.sar_gamma if config.sar_gamma is not None else 0.9,
                    "sar_epsilon_start": config.sar_epsilon_start if config.sar_epsilon_start is not None else 1.0,
                    "sar_epsilon_min": config.sar_epsilon_min if config.sar_epsilon_min is not None else 0.05,
                    "sar_num_episodes": config.sar_num_episodes if config.sar_num_episodes is not None else 400
                }
                paths = run_sarsa_routing(G, sensors, gateway, sar_cfg)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown routing method: {method_name}")
                
            exec_time = time.time() - start_time
            
            # Compute Metrics
            w_slots = 2
            sel_C = [(len(p) - 1) * w_slots for p in paths]
            sel_flows = {
                "n": len(sensors),
                "C": sel_C,
                "T": T,
                "D": D,
                "paths": paths,
                "conflict_pair_mode": config.conflict_pair_mode
            }
            is_schedulable, sched_details = compute_schedulability_status(sel_flows, gateway, config.m_fixed, H)
            total_overlaps = compute_total_overlaps(paths, gateway)
            avg_hops = compute_average_hops(paths)
            dbf_curves = compute_dbf_curves(sel_flows, gateway, config.m_fixed, H)
            incremental_dbf = compute_incremental_dbf_series(sel_flows, gateway, config.m_fixed, H)

            # Build TSCH Schedule Grid
            paths_dict = {str(sensors[idx]): path for idx, path in enumerate(paths)}
            tsch_grid, tsch_all_sched = build_tsch_schedule(
                paths=paths_dict,
                sensors=sensors,
                gateway=gateway,
                T=T,
                D=D,
                H=H,
                m=config.m_fixed,
                w_slots=2
            )
            
            final_schedulable = is_schedulable and tsch_all_sched
            
            # Generate flow details
            delta_matrix = compute_pairwise_overlap_matrix(paths, gateway)
            flows_detail = []
            for idx, sensor in enumerate(sensors):
                sensor_overlaps = int(np.sum(delta_matrix[idx]))
                flows_detail.append({
                    "sensorId": str(sensor),
                    "path": [str(n) for n in paths[idx]],
                    "period": T[idx],
                    "deadline": D[idx],
                    "overlaps": sensor_overlaps,
                    "isSchedulable": final_schedulable
                })
                
            return {
                "method": method_name,
                "executionTime": exec_time,
                "isSchedulable": final_schedulable,
                "totalOverlaps": total_overlaps,
                "averageHops": avg_hops,
                "paths": {str(sensors[idx]): [str(n) for n in paths[idx]] for idx, path in enumerate(paths)},
                "flows": flows_detail,
                "schedDetails": sched_details,
                "tschGrid": tsch_grid,
                "dbfCurves": dbf_curves,
                "incrementalDbf": incremental_dbf
            }

        # Run both methods
        result_a = run_single_method(config.method_a)
        result_b = run_single_method(config.method_b)

        return {
            "method_a": result_a,
            "method_b": result_b,
            "seed": seed,
            "H": H,
            "periods": T,
            "gateway": gateway,
            "centralityMetric": config.centrality_metric
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
async def get_history():
    try:
        return await get_all_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/history")
async def save_history(item: Dict[str, Any]):
    try:
        if "id" not in item:
            item["id"] = str(uuid.uuid4())
        if "timestamp" not in item:
            item["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
        await add_history_item(item)
        return {"status": "success", "id": item["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/history/{item_id}")
async def delete_history(item_id: str):
    try:
        await delete_history_item(item_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/history")
async def clear_history():
    try:
        await delete_all_history()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/topologies")
async def get_topologies():
    try:
        return await get_all_saved_topologies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/topologies")
async def save_topology(item: Dict[str, Any]):
    try:
        if "id" not in item:
            item["id"] = str(uuid.uuid4())
        if "timestamp" not in item:
            item["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
        await add_saved_topology(item)
        return {"status": "success", "id": item["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/topologies/{topo_id}")
async def delete_saved_topo(topo_id: str):
    try:
        await delete_saved_topology(topo_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/datasets")
async def list_datasets():
    """
    Lists saved batch-sweep datasets (summary only — no results payload).
    This is the "modulo investigacion" persistence the professor asked for:
    offline batch runs (10/50/100/.../1000 topologies) are executed once and
    the resulting dataset can be reloaded later to re-derive plots without
    re-simulating.
    """
    try:
        return await get_all_datasets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/datasets/{dataset_id}")
async def get_dataset_detail(dataset_id: str):
    """
    Returns a saved dataset shaped exactly like /simulation/sweep's response
    (sweep_param, values, results, plotUrl), regenerating the matplotlib
    figure fresh from the persisted aggregated results (cheap — no Monte
    Carlo re-simulation involved).
    """
    try:
        dataset = await get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        plot_url = generate_sweep_plot_png(
            dataset["sweep_param"], dataset["values"], dataset["results"],
            dataset["methods"], dataset["replicas"]
        )

        return {
            "sweep_param": dataset["sweep_param"],
            "values": dataset["values"],
            "results": dataset["results"],
            "plotUrl": plot_url,
            "baseSeed": dataset["base_seed"],
            "centralityMetric": dataset["centrality_metric"],
            "topologyGenerator": dataset["topology_generator"],
            "replicas": dataset["replicas"],
            "datasetId": dataset["id"],
            "name": dataset["name"],
            "timestamp": dataset["timestamp"],
            "baseConfig": dataset["base_config"],
            "rawReplicas": dataset["raw_replicas"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/datasets/{dataset_id}")
async def delete_dataset_endpoint(dataset_id: str):
    try:
        await delete_dataset(dataset_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
