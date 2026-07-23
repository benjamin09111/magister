from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class ReproducibilityMixin(BaseModel):
    """
    Shared fields for academic reproducibility and paper-fidelity, used by
    every config model that generates or consumes a random topology/flow set.
    """
    # Centrality metric used to pick the gateway in 'auto' mode. The NG-RES
    # paper (Sec. 3.1) defines the gateway as the node with highest
    # betweenness centrality; this is the paper-faithful default. 'degree'
    # and 'closeness' remain selectable for sensitivity analysis (footnote 3
    # of the paper explicitly calls this "further research").
    centrality_metric: str = 'betweenness'  # 'betweenness' | 'degree' | 'closeness'
    # Reproducibility: if provided, the topology/flows (and everything
    # derived from them) can be regenerated exactly. If omitted, a fresh seed
    # is drawn internally and returned to the caller so the run can be
    # replayed later (required for SoftwareX-grade reproducibility).
    seed: Optional[int] = None

class MultiGatewayMixin(BaseModel):
    """
    Multi-gateway (MG) extension, ported from mo_sp_pt2: partitions the graph
    with NJW spectral clustering into `num_gateways` clusters and designates a
    local gateway per cluster. Only SP and MO routing are validated for MG
    (the MATLAB reference does not define MO_ACO/QLearning/SARSA variants for
    multiple gateways, so those methods are rejected in 'multi-gateway' mode
    to avoid inventing untested behavior).
    """
    num_gateways: Optional[int] = None  # k = number of gateways/clusters (typically 1, 3, or 5)
    mg_centrality_method: str = 'betweenness'  # local centrality used to pick each cluster's gateway
    gateways: Optional[List[int]] = None  # lock in previously-chosen gateways (from /topology/generate)

class TopoConfigModel(ReproducibilityMixin, MultiGatewayMixin):
    N: int
    lambda_val: float
    selected_gateway: Optional[int] = None
    gateway_mode: str = 'auto' # 'auto', 'manual', or 'multi-gateway'
    sensors_count: Optional[int] = None
    # Graph generator family. 'erdos_renyi' (default) matches the paper's
    # sparse uniformly-distributed random adjacency matrix (sprand/spones in
    # MATLAB) in expectation: both produce G(N, p) binomial random graphs.
    topology_generator: str = 'erdos_renyi'  # 'erdos_renyi' | 'watts_strogatz' | 'barabasi_albert' | 'random_geometric'

class RoutingParamsMixin(BaseModel):
    mo_psi: Optional[float] = None
    aco_alpha: Optional[float] = None
    aco_beta: Optional[float] = None
    aco_rho: Optional[float] = None
    aco_Q: Optional[float] = None
    aco_num_ants: Optional[int] = None
    aco_num_iterations: Optional[int] = None
    aco_hops_penalty: Optional[float] = None
    aco_partial_overlap_penalty: Optional[float] = None
    ql_alpha: Optional[float] = None
    ql_gamma: Optional[float] = None
    ql_epsilon_start: Optional[float] = None
    ql_epsilon_min: Optional[float] = None
    ql_num_episodes: Optional[int] = None
    sar_alpha: Optional[float] = None
    sar_gamma: Optional[float] = None
    sar_epsilon_start: Optional[float] = None
    sar_epsilon_min: Optional[float] = None
    sar_num_episodes: Optional[int] = None

class SimConfigModel(RoutingParamsMixin, ReproducibilityMixin, MultiGatewayMixin):
    N: int
    lambda_val: float
    sensors_count: int
    k_max: int
    m_fixed: int
    H: int  # advisory upper bound; the authoritative hyperperiod is computed as lcm(T) and returned in the response as "H"
    eta_min: int
    eta_max: int
    use_implicit_deadlines: bool
    conflict_pair_mode: str # 'paper_double' or 'single'
    gateway_mode: str
    selected_gateway: Optional[int] = None
    routing_method: str # 'SP', 'MO', 'MO_ACO', 'QLearning', 'SARSA'
    # Keep generated sensors list if frontend wants to lock it
    sensors: Optional[List[int]] = None
    # Keep generated topology edges if frontend wants to lock it
    edges: Optional[List[Dict[str, Any]]] = None

class SweepConfigModel(ReproducibilityMixin):
    sweep_param: str  # "N", "lambda", "channels", "n" (number of flows/sensors)
    sweep_start: float
    sweep_end: float
    sweep_step: float
    replicas: int  # Number of random topologies to simulate per point
    methods: List[str]  # e.g., ["SP", "MO", "MO_ACO", "QLearning", "SARSA"]
    # Base configuration params to be used for non-varying fields
    N: int
    lambda_val: float
    sensors_count: int
    k_max: int
    m_fixed: int
    H: int
    eta_min: int
    eta_max: int
    conflict_pair_mode: str
    gateway_mode: str
    selected_gateway: Optional[int] = None
    topology_generator: str = 'erdos_renyi'
    # If true, persist every replica's topology + raw per-method results to
    # the datasets table so the sweep can be re-plotted later without
    # re-simulating (professor's "modulo investigacion" requirement).
    save_dataset: bool = True
    dataset_name: Optional[str] = None

class CompareConfigModel(RoutingParamsMixin, ReproducibilityMixin, MultiGatewayMixin):
    N: int
    lambda_val: float
    sensors_count: int
    k_max: int
    m_fixed: int
    H: int
    eta_min: int
    eta_max: int
    use_implicit_deadlines: bool
    conflict_pair_mode: str  # 'paper_double' or 'single'
    gateway_mode: str
    selected_gateway: Optional[int] = None
    sensors: Optional[List[int]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    method_a: str  # e.g., 'SP'
    method_b: str  # e.g., 'MO'


