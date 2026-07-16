from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class TopoConfigModel(BaseModel):
    N: int
    lambda_val: float
    selected_gateway: Optional[int] = None
    gateway_mode: str = 'auto' # 'auto' or 'manual'

class SimConfigModel(BaseModel):
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

class CompareConfigModel(BaseModel):
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


