export interface NodeData {
  id: string;
  label: string;
  type: 'gateway' | 'sensor' | 'normal';
  x?: number;
  y?: number;
  betweenness?: number;
  degree?: number;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  weight: number;
  isHighlighted?: boolean;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

export interface FlowDetail {
  sensorId: string;
  path: string[]; // Node IDs
  period: number;
  deadline: number;
  overlaps: number;
  isSchedulable: boolean;
  gatewayId?: string; // multi-gateway: which gateway this sensor's route targets
}

export interface SchedulabilityDetails {
  windows: number; // H, the hyperperiod length
  contention: number; // contention at t = H (aggregate load context)
  conflict: number; // conflict at t = H (aggregate load context)
  total_demand: number; // demand at t = H
  slack: number; // worst-case slack across all t in (0, H] (== worst_slack)
  worst_window: number; // the t in (0, H] with the smallest slack
  worst_slack: number;
  worst_contention?: number; // contention AT the worst-case window
  worst_conflict?: number; // conflict AT the worst-case window
  worst_demand?: number; // demand AT the worst-case window
  failing_window?: number | null; // the FIRST t where demand(t) > t, or null if schedulable across the whole hyperperiod
}

export interface DbfCurvePoint {
  t: number;
  contention: number;
  conflict: number;
  demand: number;
  capacity: number; // supply-bound function sbf(t) = t
}

export interface IncrementalDbfPoint {
  numFlows: number; // k: only the first k flows are considered
  curves: DbfCurvePoint[]; // full sbf/dbf curve over t in [1, H] using just those k flows
  isSchedulable: boolean;
  failingWindow: number | null; // first t where dbf(t) > sbf(t), or null
  totalOverlaps: number; // Omega considering just the first k flows
}

export interface SimResult {
  method: string;
  isSchedulable: boolean;
  totalOverlaps: number;
  averageHops: number;
  paths: Record<string, string[]>; // sensorId -> path
  flows: FlowDetail[];
  schedDetails: SchedulabilityDetails;
  tschGrid: Record<string, any>[]; // List of timeslots & channel assignments
  executionTime?: number;
  dbfCurves?: DbfCurvePoint[];
  incrementalDbf?: IncrementalDbfPoint[]; // one entry per k = 1..n flows added, for the "add flows one by one" view
  // Reproducibility & fidelity metadata (see software/backend/engine/metrics.py)
  seed?: number;
  H?: number; // authoritative hyperperiod = lcm(periods), computed server-side
  periods?: number[]; // T_i actually drawn for each sensor, in sensor order
  gateway?: number;
  gateways?: number[]; // multi-gateway: all designated gateway node ids
  gatewayForSensor?: Record<string, number>; // multi-gateway: sensorId -> its assigned gateway
  centralityMetric?: 'betweenness' | 'degree' | 'closeness';
  baseline: {
    method: string;
    isSchedulable: boolean;
    totalOverlaps: number;
    averageHops: number;
    schedDetails: SchedulabilityDetails;
    dbfCurves?: DbfCurvePoint[];
  };
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  method: string;
  N: number;
  lambda_val: number;
  sensors_count: number;
  channels: number;
  total_overlaps: number;
  is_schedulable: boolean;
  average_hops: number;
  parameters: Record<string, any>;
  results: SimResult;
}

export interface SimParameters {
  N: number;
  lambda: number;
  sensorsCount: number; // chosen sensors
  k_max: number;
  m_fixed: number;
  H: number; // advisory upper bound; the true hyperperiod is computed server-side as lcm(periods) and returned in SimResult.H
  eta_min: number;
  eta_max: number;
  use_implicit_deadlines: boolean;
  conflict_pair_mode: 'paper_double' | 'single';
  gateway_mode: 'auto' | 'manual' | 'multi-gateway';
  selected_gateway: number | null;
  // Paper fidelity & reproducibility (see software/backend/models/simulation.py::ReproducibilityMixin)
  centrality_metric: 'betweenness' | 'degree' | 'closeness';
  topology_generator: 'erdos_renyi' | 'watts_strogatz' | 'barabasi_albert' | 'random_geometric';
  seed: number | null; // null = draw a fresh seed server-side and report it back
  // Multi-gateway (mo_sp_pt2 port): only used when gateway_mode === 'multi-gateway'.
  // Only SP and MO routing are validated for multi-gateway (see backend MultiGatewayMixin).
  num_gateways: number; // k = number of gateways/clusters (1, 3, or 5)
  mg_centrality_method: 'betweenness' | 'degree' | 'closeness' | 'eigenvector';
  gateways: number[] | null; // locked-in gateways from /topology/generate, so simulation reuses the exact same partition
  // Routing parameter overrides
  mo_psi?: number;
  aco_alpha?: number;
  aco_beta?: number;
  aco_rho?: number;
  aco_Q?: number;
  aco_num_ants?: number;
  aco_num_iterations?: number;
  aco_hops_penalty?: number;
  aco_partial_overlap_penalty?: number;
  ql_alpha?: number;
  ql_gamma?: number;
  ql_epsilon_start?: number;
  ql_epsilon_min?: number;
  ql_num_episodes?: number;
  sar_alpha?: number;
  sar_gamma?: number;
  sar_epsilon_start?: number;
  sar_epsilon_min?: number;
  sar_num_episodes?: number;
}

export interface SweepParameters {
  sweep_param: 'N' | 'lambda' | 'channels' | 'n';
  sweep_start: number;
  sweep_end: number;
  sweep_step: number;
  replicas: number;
  methods: string[];
  centrality_metric?: 'betweenness' | 'degree' | 'closeness';
  topology_generator?: 'erdos_renyi' | 'watts_strogatz' | 'barabasi_albert' | 'random_geometric';
  seed?: number | null;
  save_dataset?: boolean;
  dataset_name?: string;
}

export interface SweepPointResult {
  value: number;
  metrics: Record<string, {
    overlaps: number;
    hops: number;
    schedulability: number;
  }>;
}

export interface SweepResultPayload {
  sweep_param: string;
  values: number[];
  results: SweepPointResult[];
  plotUrl?: string;
  baseSeed?: number;
  centralityMetric?: string;
  topologyGenerator?: string;
  replicas?: number;
  datasetId?: string;
}

export interface SavedDatasetSummary {
  id: string;
  name: string;
  timestamp: string;
  sweep_param: string;
  replicas: number;
  base_seed: number;
  centrality_metric: string;
  topology_generator: string;
  methods: string[];
  num_points: number;
}

