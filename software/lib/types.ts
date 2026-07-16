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
}

export interface SchedulabilityDetails {
  windows: number;
  contention: number;
  conflict: number;
  total_demand: number;
  slack: number;
  worst_window: number;
  worst_slack: number;
  failing_window?: number | null;
}

export interface DbfCurvePoint {
  t: number;
  contention: number;
  conflict: number;
  demand: number;
  capacity: number;
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
  H: number;
  eta_min: number;
  eta_max: number;
  use_implicit_deadlines: boolean;
  conflict_pair_mode: 'paper_double' | 'single';
  gateway_mode: 'auto' | 'manual';
  selected_gateway: number | null;
}

export interface SweepParameters {
  sweep_param: 'N' | 'lambda' | 'channels';
  sweep_start: number;
  sweep_end: number;
  sweep_step: number;
  replicas: number;
  methods: string[];
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
}

