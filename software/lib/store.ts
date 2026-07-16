import { create } from 'zustand';
import { GraphData, SimParameters, SimResult, HistoryItem, SweepParameters, SweepResultPayload } from './types';

interface SimStore {
  // Parameters
  params: SimParameters;
  updateParams: (updates: Partial<SimParameters>) => void;
  resetParams: () => void;

  // Graph Data
  graphData: GraphData | null;
  setGraphData: (data: GraphData | null) => void;
  selectedSensor: string | null;
  setSelectedSensor: (sensorId: string | null) => void;

  // Simulation Status
  routingMethod: 'SP' | 'MO' | 'MO_ACO' | 'QLearning' | 'SARSA';
  setRoutingMethod: (method: 'SP' | 'MO' | 'MO_ACO' | 'QLearning' | 'SARSA') => void;
  simStatus: 'idle' | 'running' | 'completed';
  setSimStatus: (status: 'idle' | 'running' | 'completed') => void;
  simProgress: number;
  setSimProgress: (progress: number) => void;
  simStep: string;
  setSimStep: (step: string) => void;

  // Results
  activeResult: SimResult | null;
  setActiveResult: (result: SimResult | null) => void;
  compareResults: Record<string, SimResult> | null;
  setCompareResults: (results: Record<string, SimResult> | null) => void;

  // History
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
  addHistoryItem: (item: HistoryItem) => void;

  // Sweep (Batch Simulations)
  sweepParams: SweepParameters;
  updateSweepParams: (updates: Partial<SweepParameters>) => void;
  sweepResult: SweepResultPayload | null;
  setSweepResult: (result: SweepResultPayload | null) => void;
  sweepStatus: 'idle' | 'running' | 'completed';
  setSweepStatus: (status: 'idle' | 'running' | 'completed') => void;

  // Comparison mode (Single graph comparison)
  isCompareMode: boolean;
  setIsCompareMode: (isCompare: boolean) => void;
  compareMethodsSelected: { methodA: string; methodB: string };
  setCompareMethodsSelected: (methods: { methodA: string; methodB: string }) => void;
  compareResultsPayload: { method_a: SimResult; method_b: SimResult } | null;
  setCompareResultsPayload: (payload: { method_a: SimResult; method_b: SimResult } | null) => void;
  selectedCompareMethodView: 'A' | 'B';
  setSelectedCompareMethodView: (val: 'A' | 'B') => void;
  showAllConflicts: boolean;
  setShowAllConflicts: (show: boolean) => void;
}

const defaultParams: SimParameters = {
  N: 30,
  lambda: 8,
  sensorsCount: 8,
  k_max: 100,
  m_fixed: 8,
  H: 128,
  eta_min: 4,
  eta_max: 7,
  use_implicit_deadlines: true,
  conflict_pair_mode: 'paper_double',
  gateway_mode: 'auto',
  selected_gateway: null,
};

const defaultSweepParams: SweepParameters = {
  sweep_param: 'N',
  sweep_start: 10,
  sweep_end: 30,
  sweep_step: 5,
  replicas: 10,
  methods: ['SP', 'MO'],
};

export const useSimStore = create<SimStore>((set) => ({
  // Parameters
  params: defaultParams,
  updateParams: (updates) =>
    set((state) => ({
      params: { ...state.params, ...updates },
    })),
  resetParams: () => set({ params: defaultParams }),

  // Graph Data
  graphData: null,
  setGraphData: (graphData) => set({ graphData }),
  selectedSensor: null,
  setSelectedSensor: (selectedSensor) => set({ selectedSensor }),

  // Simulation Status
  routingMethod: 'MO',
  setRoutingMethod: (routingMethod) => set({ routingMethod }),
  simStatus: 'idle',
  setSimStatus: (simStatus) => set({ simStatus }),
  simProgress: 0,
  setSimProgress: (simProgress) => set({ simProgress }),
  simStep: '',
  setSimStep: (simStep) => set({ simStep }),

  // Results
  activeResult: null,
  setActiveResult: (activeResult) => set({ activeResult }),
  compareResults: null,
  setCompareResults: (compareResults) => set({ compareResults }),

  // History
  history: [],
  setHistory: (history) => set({ history }),
  addHistoryItem: (item) =>
    set((state) => ({
      history: [item, ...state.history],
    })),

  // Sweep (Batch Simulations)
  sweepParams: defaultSweepParams,
  updateSweepParams: (updates) =>
    set((state) => ({
      sweepParams: { ...state.sweepParams, ...updates },
    })),
  sweepResult: null,
  setSweepResult: (sweepResult) => set({ sweepResult }),
  sweepStatus: 'idle',
  setSweepStatus: (sweepStatus) => set({ sweepStatus }),

  // Comparison mode
  isCompareMode: false,
  setIsCompareMode: (isCompareMode) => set({ isCompareMode }),
  compareMethodsSelected: { methodA: 'SP', methodB: 'MO' },
  setCompareMethodsSelected: (compareMethodsSelected) => set({ compareMethodsSelected }),
  compareResultsPayload: null,
  setCompareResultsPayload: (compareResultsPayload) => set({ compareResultsPayload }),
  selectedCompareMethodView: 'A',
  setSelectedCompareMethodView: (selectedCompareMethodView) => set({ selectedCompareMethodView }),
  showAllConflicts: false,
  setShowAllConflicts: (showAllConflicts) => set({ showAllConflicts }),
}));
