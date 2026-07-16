from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class TopoConfigModel(BaseModel):
    N: int
    lambda_val: float
    selected_gateway: Optional[int] = None
    gateway_mode: str = 'auto' # 'auto' or 'manual'
    sensors_count: Optional[int] = None

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

class SimConfigModel(RoutingParamsMixin):
    N: int
    lambda_val: float
    sensors_count: int
    k_max: int
    m_fixed: int
    H: int
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

class SweepConfigModel(BaseModel):
    sweep_param: str  # "N", "lambda", "channels"
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

class CompareConfigModel(RoutingParamsMixin):
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


