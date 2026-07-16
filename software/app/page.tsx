'use client';

import React, { useState, useEffect } from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Activity, ShieldAlert, Cpu, BarChart3, HelpCircle, History, Network, CheckCircle, Database, AlertTriangle, X, Zap, RefreshCw, Check } from 'lucide-react';

// Components
import TopologyGraph from '@/components/graph/TopologyGraph';
import ParameterPanel from '@/components/config/ParameterPanel';
import TSCHScheduleGrid from '@/components/tsch/TSCHScheduleGrid';
import TSCHFlowTable from '@/components/tsch/TSCHFlowTable';
import OverlapChart from '@/components/charts/OverlapChart';
import SchedulabilityGauge from '@/components/charts/SchedulabilityGauge';
import DemandBoundChart from '@/components/charts/DemandBoundChart';
import HistoryList from '@/components/config/HistoryList';
import SweepConfigPanel from '@/components/config/SweepConfigPanel';
import SweepPlots from '@/components/charts/SweepPlots';
import ComparisonDashboard from '@/components/charts/ComparisonDashboard';
import SavedTopologiesList from '@/components/config/SavedTopologiesList';

export default function Home() {
  const { 
    params, 
    updateParams, 
    graphData, 
    setGraphData, 
    routingMethod, 
    setRoutingMethod, 
    simStatus, 
    setSimStatus, 
    activeResult, 
    setActiveResult, 
    addHistoryItem,
    isCompareMode,
    setIsCompareMode,
    compareMethodsSelected,
    setCompareMethodsSelected,
    compareResultsPayload,
    setCompareResultsPayload,
    setSelectedCompareMethodView,
    showAllConflicts,
    setShowAllConflicts
  } = useSimStore();

  const [activeTab, setActiveTab] = useState<'simulador' | 'comparacion' | 'investigacion' | 'guardados' | 'sobre_simulador'>('simulador');
  const [savedSubTab, setSavedSubTab] = useState<'topologias' | 'simulaciones'>('topologias');
  const [methodDrawer, setMethodDrawer] = useState<string | null>(null);
  const [showNewSimModal, setShowNewSimModal] = useState(false);

  const exportSimulationJson = () => {
    if (!activeResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      parameters: params,
      results: activeResult
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `simulacion_${routingMethod}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Resultados exportados como JSON');
  };

  // Sincronizar isCompareMode según la pestaña seleccionada
  useEffect(() => {
    if (activeTab === 'comparacion') {
      setIsCompareMode(true);
    } else if (activeTab === 'simulador') {
      setIsCompareMode(false);
    }
  }, [activeTab, setIsCompareMode]);

  // Auto-generate topology on first load if not present
  useEffect(() => {
    if (!graphData) {
      // Simulate generating initial topology
      const loadInitial = async () => {
        try {
          const res = await fetchApi('/topology/generate', {
            method: 'POST',
            body: JSON.stringify({ N: params.N, lambda_val: params.lambda }),
          });
          
          const cytoscapeNodes = res.nodes.map((n: any) => n.data);
          const cytoscapeEdges = res.edges.map((e: any) => e.data);
          
          setGraphData({ nodes: cytoscapeNodes, edges: cytoscapeEdges });
          updateParams({ selected_gateway: res.gateway, sensorsCount: res.sensors.length });
        } catch (e) {
          // Silent fallback
        }
      };
      loadInitial();
    }
  }, []);

  const handleStartSimulation = async () => {
    if (!graphData || graphData.nodes.length === 0) {
      toast.error('Primero debes generar la topología de la red.');
      return;
    }

    setSimStatus('running');
    toast.loading('Ejecutando algoritmos de enrutamiento y scheduling...', { id: 'sim-toast' });

    try {
      const basePayload = {
        N: params.N,
        lambda_val: params.lambda,
        sensors_count: params.sensorsCount,
        k_max: params.k_max,
        m_fixed: params.m_fixed,
        H: params.H,
        eta_min: params.eta_min,
        eta_max: params.eta_max,
        use_implicit_deadlines: params.use_implicit_deadlines,
        conflict_pair_mode: params.conflict_pair_mode,
        gateway_mode: params.gateway_mode,
        selected_gateway: params.selected_gateway,
        sensors: graphData.nodes.filter(n => n.type === 'sensor').map(n => parseInt(n.id)),
        edges: graphData.edges.map(e => ({
          data: { source: e.source, target: e.target, weight: e.weight }
        })),
        nodes: graphData.nodes.map(n => ({
          data: { id: n.id, label: n.label, type: n.type, degree: n.degree, betweenness: n.betweenness }
        })),
        // Custom routing parameters
        mo_psi: params.mo_psi,
        aco_alpha: params.aco_alpha,
        aco_beta: params.aco_beta,
        aco_rho: params.aco_rho,
        aco_Q: params.aco_Q,
        aco_num_ants: params.aco_num_ants,
        aco_num_iterations: params.aco_num_iterations,
        aco_hops_penalty: params.aco_hops_penalty,
        aco_partial_overlap_penalty: params.aco_partial_overlap_penalty,
        ql_alpha: params.ql_alpha,
        ql_gamma: params.ql_gamma,
        ql_epsilon_start: params.ql_epsilon_start,
        ql_epsilon_min: params.ql_epsilon_min,
        ql_num_episodes: params.ql_num_episodes,
        sar_alpha: params.sar_alpha,
        sar_gamma: params.sar_gamma,
        sar_epsilon_start: params.sar_epsilon_start,
        sar_epsilon_min: params.sar_epsilon_min,
        sar_num_episodes: params.sar_num_episodes,
      };

      if (isCompareMode) {
        const payload = {
          ...basePayload,
          method_a: compareMethodsSelected.methodA,
          method_b: compareMethodsSelected.methodB
        };

        const result = await fetchApi('/simulation/compare', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setCompareResultsPayload(result);
        setActiveResult(result.method_a);
        setSelectedCompareMethodView('A');
        setSimStatus('completed');
        toast.success('Simulación comparativa completada con éxito!', { id: 'sim-toast' });
      } else {
        const payload = {
          ...basePayload,
          routing_method: routingMethod
        };

        const result = await fetchApi('/simulation/run', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        // Update Zustand store
        setActiveResult(result);
        setSimStatus('completed');
        toast.success('Simulación completada con éxito!', { id: 'sim-toast' });

        // Save run automatically to DB history
        const historyItem = {
          method: routingMethod,
          N: params.N,
          lambda_val: params.lambda,
          sensors_count: params.sensorsCount,
          channels: params.m_fixed,
          total_overlaps: result.totalOverlaps,
          is_schedulable: result.isSchedulable,
          average_hops: result.averageHops,
          parameters: {
            k_max: params.k_max,
            H: params.H,
            eta_min: params.eta_min,
            eta_max: params.eta_max,
            use_implicit_deadlines: params.use_implicit_deadlines,
            conflict_pair_mode: params.conflict_pair_mode,
            gateway_mode: params.gateway_mode,
            selected_gateway: params.selected_gateway,
            edges: payload.edges,
            nodes: payload.nodes
          },
          results: result
        };

        const dbSaveRes = await fetchApi('/history', {
          method: 'POST',
          body: JSON.stringify(historyItem)
        });

        if (dbSaveRes && dbSaveRes.id) {
          addHistoryItem({
            id: dbSaveRes.id,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            ...historyItem
          });
        }
      }
    } catch (e: any) {
      setSimStatus('idle');
      toast.error('Error al correr la simulación: ' + e.message, { id: 'sim-toast' });
    }
  };

  const getMethodInfo = (method: string) => {
    switch (method) {
      case 'SP':
        return {
          title: 'Shortest Path (SP)',
          complexity: 'O(V log V + E)',
          description: 'Calcula la ruta más corta (Dijkstra) individualmente para cada emisor sin considerar solapamientos o conflictos. Actúa como la línea base estándar de la literatura.',
          pseudocode: `Dijkstra(G, sensor, gateway):\n  dist[v] = inf, prev[v] = undefined\n  dist[sensor] = 0\n  Q = V\n  while Q is not empty:\n    u = min_distance(Q)\n    for neighbor v of u:\n      alt = dist[u] + w(u, v)\n      if alt < dist[v]:\n        dist[v] = alt\n        prev[v] = u`
        };
      case 'MO':
        return {
          title: 'Minimal Overlap (MO)',
          complexity: 'O(k_max * N * (V log V + E))',
          description: 'Algoritmo centralizado del paper de referencia. Penaliza progresivamente las aristas incidentes a los nodos donde ocurren colisiones de ruta, minimizando el overlap total en iteraciones sucesivas.',
          pseudocode: `Minimal_Overlap(G, initial_paths, psi, k_max):\n  G_k = G\n  best_paths = initial_paths\n  for k = 1 to k_max:\n    for pair (i, j) of paths:\n      shared = intersect(path_i, path_j)\n      if len(shared) > 0:\n        penalize_incident_edges(G_k, shared, delta_ij * psi)\n    new_paths = shortest_paths(G_k)\n    if overlaps(new_paths) < overlaps(best_paths):\n      best_paths = new_paths\n  return best_paths`
        };
      case 'MO_ACO':
        return {
          title: 'MO + Ant Colony Optimization (MO+ACO)',
          complexity: 'O(iter * ants * N_flows * K_cands)',
          description: 'Combina MO con Colonia de Hormigas. Genera múltiples rutas candidatas robustas para cada flujo y permite a agentes artificiales (hormigas) depositar feromonas dinámicas para descubrir la mejor combinación global libre de colisiones.',
          pseudocode: `Ant_Colony_Optimization(candidates, tau, eta):\n  for iter = 1 to max_iter:\n    for ant = 1 to num_ants:\n      for flow in random_order:\n        prob = (tau^alpha) * (eta^beta)\n        select_path_roulette(flow, prob)\n    evaporate_pheromones(tau, rho)\n    deposit_pheromones_top_k(tau, Q)\n  return best_combination`
        };
      case 'QLearning':
        return {
          title: 'Q-Learning Routing',
          complexity: 'O(episodes * steps * neighbors)',
          description: 'Aprendizaje por refuerzo libre de modelo (tabular off-policy). Agentes autónomos en cada nodo exploran el grafo y actualizan una Q-table usando penalizaciones por saltos y penalizaciones por solapamiento con flujos anteriores.',
          pseudocode: `Q_Learning_Update:\n  for each state s, action a:\n    select a using epsilon-greedy\n    take action, observe s_next, reward R\n    R = R_base - overlap_penalty * occupied_nodes\n    Q[s, a] = Q[s, a] + alpha * (R + gamma * max_a' Q[s_next, a'] - Q[s, a])`
        };
      case 'SARSA':
        return {
          title: 'SARSA Routing',
          complexity: 'O(episodes * steps * neighbors)',
          description: 'Aprendizaje por refuerzo on-policy. Similar a Q-Learning pero actualiza su valor Q basándose en la acción real seleccionada para el siguiente paso, lo que fomenta una exploración más conservadora y segura en topologías de red densas.',
          pseudocode: `SARSA_Update:\n  for each state s, action a:\n    take action a, observe s_next, reward R\n    choose next action a_next using epsilon-greedy\n    Q[s, a] = Q[s, a] + alpha * (R + gamma * Q[s_next, a_next] - Q[s, a])`
        };
      default:
        return null;
    }
  };

  const currentInfo = methodDrawer ? getMethodInfo(methodDrawer) : null;

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-slate-100">
      <Toaster position="top-right" theme="light" />
      
      {/* MATLAB Online style top navbar */}
      <header className="w-full bg-white border-b border-slate-200 shrink-0 font-sans shadow-sm z-30">
        <div className="px-4 flex flex-col md:flex-row justify-between items-stretch md:items-center min-h-[48px] gap-2">
          {/* Brand/Title Section */}
          <div className="flex items-center gap-2 py-1.5">
            <div className="p-1 bg-[#0056b3]/5 border border-[#0056b3]/20 rounded text-[#0056b3]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-[11px] font-black tracking-wider text-slate-800 uppercase leading-tight">
                6TiSCH MULTI-OBJETIVO
              </h1>
              <p className="text-[8px] text-slate-500 font-bold font-mono leading-none tracking-tight">
                PORTAL WEB SIMULACIÓN
              </p>
            </div>
          </div>

          {/* Navigation Tabs - MATLAB Online Style */}
          <div className="flex items-stretch self-stretch overflow-x-auto select-none no-scrollbar">
            <button
              onClick={() => setActiveTab('simulador')}
              className={`flex items-center gap-1.5 px-3 border-b-2 text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                activeTab === 'simulador'
                  ? 'border-[#0056b3] text-[#0056b3] bg-[#0056b3]/5 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              SIMULADOR
            </button>
            <button
              onClick={() => setActiveTab('comparacion')}
              className={`flex items-center gap-1.5 px-3 border-b-2 text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                activeTab === 'comparacion'
                  ? 'border-[#0056b3] text-[#0056b3] bg-[#0056b3]/5 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              COMPARACIÓN DE ENRUTAMIENTOS
            </button>
            <button
              onClick={() => setActiveTab('investigacion')}
              className={`flex items-center gap-1.5 px-3 border-b-2 text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                activeTab === 'investigacion'
                  ? 'border-[#0056b3] text-[#0056b3] bg-[#0056b3]/5 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              INVESTIGACIÓN
            </button>
            <button
              onClick={() => setActiveTab('guardados')}
              className={`flex items-center gap-1.5 px-3 border-b-2 text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                activeTab === 'guardados'
                  ? 'border-[#0056b3] text-[#0056b3] bg-[#0056b3]/5 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              GUARDADOS
            </button>
            <button
              onClick={() => setActiveTab('sobre_simulador')}
              className={`flex items-center gap-1.5 px-3 border-b-2 text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                activeTab === 'sobre_simulador'
                  ? 'border-[#0056b3] text-[#0056b3] bg-[#0056b3]/5 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              SOBRE EL SIMULADOR
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 items-start flex-1 w-full ${activeTab === 'simulador' && simStatus === 'completed' ? 'p-0 gap-0' : 'p-4 gap-4'}`}>
        
        {/* Pestaña: Simulador */}
        {activeTab === 'simulador' && (
          <>
            {simStatus === 'completed' && activeResult ? (
              // Full viewport layout: Graph left, TSCH schedule right, half-half split!
              <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                {/* Lado izquierdo: Grafo de la red y métricas */}
                <div className="flex flex-col gap-4 relative">
                  <div className="relative">
                    <TopologyGraph />
                    
                    <div className="absolute top-4 left-4 z-10 font-mono">
                      <button
                        onClick={() => setShowAllConflicts(!showAllConflicts)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded border shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${
                          showAllConflicts
                            ? 'bg-[#d62728] border-[#b91c1c] text-white font-bold'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Zap size={11} className="shrink-0" />
                        {showAllConflicts ? 'VER FLUJO INDIVIDUAL' : 'VISUALIZAR CONFLICTOS'}
                      </button>
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-1.5 font-mono items-center">
                      <button
                        onClick={() => setShowNewSimModal(true)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#02529c] hover:bg-[#003d73] text-white shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                        title="Hacer otra simulación"
                      >
                        <RefreshCw size={10} className="shrink-0" />
                        Hacer otra simulación
                      </button>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded border shadow-sm flex items-center gap-1 ${
                        activeResult.isSchedulable 
                          ? 'bg-[#2ca02c]/10 text-[#2ca02c] border border-[#2ca02c]/40' 
                          : 'bg-[#d62728]/10 text-[#d62728] border border-[#d62728]/40'
                      }`}>
                        {activeResult.isSchedulable ? (
                          <>
                            <Check size={11} className="shrink-0" />
                            PROGRAMABLE
                          </>
                        ) : (
                          <>
                            <X size={11} className="shrink-0" />
                            NO PROGRAMABLE
                          </>
                        )}
                      </span>
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-white border border-slate-300 text-slate-750 shadow-sm">
                        SOLAPES: {activeResult.totalOverlaps}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OverlapChart />
                    <SchedulabilityGauge />
                  </div>
                </div>

                {/* Lado derecho: Grid de TSCH */}
                <div className="flex flex-col gap-4">
                  <TSCHScheduleGrid />
                  <TSCHFlowTable />
                </div>
              </div>
            ) : (
              // Normal split layout before simulation
              <>
                {/* Lado izquierdo: Grafo de la red */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  <TopologyGraph />
                </div>

                {/* Lado derecho: Panel de configuración */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <ParameterPanel />

                  <button
                    onClick={handleStartSimulation}
                    disabled={simStatus === 'running'}
                    className={`w-full py-3 rounded font-bold text-xs flex items-center justify-center gap-2 border transition-all shadow-sm ${
                      simStatus === 'running'
                        ? 'bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed'
                        : 'bg-[#02529c] hover:bg-[#003d73] border-none text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    <Cpu size={14} className={simStatus === 'running' ? 'animate-spin' : ''} />
                    {simStatus === 'running' ? 'Simulando...' : 'Iniciar Simulación'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Pestaña: Comparar Métodos (Grafo a la izquierda, selectores A/B a la derecha) */}
        {activeTab === 'comparacion' && (
          <>
            {/* Lado izquierdo: Grafo de la red y dashboard comparativo con DBF */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="relative">
                <TopologyGraph />
                
                {simStatus === 'completed' && compareResultsPayload && (
                  <>
                    <div className="absolute top-4 left-4 z-10 font-mono">
                      <button
                        onClick={() => setShowAllConflicts(!showAllConflicts)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded border shadow-sm transition-all flex items-center gap-1.5 active:scale-95 ${
                          showAllConflicts
                            ? 'bg-[#d62728] border-[#b91c1c] text-white font-bold'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>⚡</span>
                        {showAllConflicts ? 'VER FLUJO INDIVIDUAL' : 'VISUALIZAR CONFLICTOS'}
                      </button>
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-1.5 font-mono">
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#0056b3]/10 border border-[#0056b3]/45 text-[#0056b3] shadow-sm">
                        COMPARACIÓN: {compareMethodsSelected.methodA} vs {compareMethodsSelected.methodB}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {simStatus === 'completed' && compareResultsPayload && (
                <ComparisonDashboard />
              )}
            </div>

            {/* Lado derecho: Configuración y controles de la simulación comparativa */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white border border-slate-350 rounded p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-200">
                  Comparación de Métodos
                </h3>
                <p className="text-[10px] text-slate-500 mb-4 leading-normal">
                  Ejecuta dos algoritmos de enrutamiento sobre el mismo grafo y conjunto de flujos para comparar métricas y programabilidad.
                </p>

                <div className="flex flex-col gap-3.5 bg-slate-50 border border-slate-200 rounded p-3 mb-4 font-mono">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Método A (Referencia / Baseline):
                    </label>
                    <select
                      value={compareMethodsSelected.methodA}
                      onChange={(e) => setCompareMethodsSelected({
                        ...compareMethodsSelected,
                        methodA: e.target.value
                      })}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-semibold font-mono"
                    >
                      <option value="SP">Shortest Path (SP)</option>
                      <option value="MO">Minimal Overlap (MO)</option>
                      <option value="MO_ACO">MO + ACO</option>
                      <option value="QLearning">Q-Learning Routing</option>
                      <option value="SARSA">SARSA Routing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Método B (Comparativo / Optimizado):
                    </label>
                    <select
                      value={compareMethodsSelected.methodB}
                      onChange={(e) => setCompareMethodsSelected({
                        ...compareMethodsSelected,
                        methodB: e.target.value
                      })}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-semibold font-mono"
                    >
                      <option value="MO">Minimal Overlap (MO)</option>
                      <option value="SP">Shortest Path (SP)</option>
                      <option value="MO_ACO">MO + ACO</option>
                      <option value="QLearning">Q-Learning Routing</option>
                      <option value="SARSA">SARSA Routing</option>
                    </select>
                  </div>
                </div>

                {/* Botón suelto de comparación */}
                <button
                  onClick={handleStartSimulation}
                  disabled={simStatus === 'running'}
                  className={`w-full py-3 rounded font-bold text-xs flex items-center justify-center gap-2 border transition-all shadow-sm ${
                    simStatus === 'running'
                      ? 'bg-slate-100 border border-slate-300 text-slate-400 cursor-not-allowed'
                      : 'bg-[#02529c] hover:bg-[#003d73] border-none text-white cursor-pointer active:scale-95'
                  }`}
                >
                  <Cpu size={14} className={simStatus === 'running' ? 'animate-spin' : ''} />
                  {simStatus === 'running' ? 'Comparando...' : 'Iniciar Comparación'}
                </button>
              </div>

              {/* Parámetros de Red heredados */}
              <ParameterPanel />
            </div>
          </>
        )}

        {/* Pestaña: Investigación (Barrido Paramétrico) */}
        {activeTab === 'investigacion' && (
          <>
            <div className="lg:col-span-8 flex flex-col gap-6">
              <SweepPlots />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-6">
              <SweepConfigPanel />
            </div>
          </>
        )}

        {/* Pestaña: Guardados (con sub-pestañas internas) */}
        {activeTab === 'guardados' && (
          <div className="lg:col-span-12 flex flex-col gap-4 bg-white border border-slate-350 rounded p-4 shadow-sm relative font-sans">
            {/* Indicator color strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0056b3]" />
            
            {/* Sub-navigation bar inside Guardados */}
            <div className="flex border-b border-slate-200 pb-2 mb-2 gap-4">
              <button
                type="button"
                onClick={() => setSavedSubTab('topologias')}
                className={`pb-1 text-xs font-bold uppercase transition-all tracking-wider border-b-2 cursor-pointer ${
                  savedSubTab === 'topologias'
                    ? 'border-[#0056b3] text-[#0056b3]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Topologías Guardadas
              </button>
              <button
                type="button"
                onClick={() => setSavedSubTab('simulaciones')}
                className={`pb-1 text-xs font-bold uppercase transition-all tracking-wider border-b-2 cursor-pointer ${
                  savedSubTab === 'simulaciones'
                    ? 'border-[#0056b3] text-[#0056b3]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Simulaciones Guardadas
              </button>
            </div>

            {/* Inner view rendering */}
            <div className="mt-2 flex-1 flex flex-col">
              {savedSubTab === 'topologias' ? (
                <SavedTopologiesList onLoadTopology={() => setActiveTab('simulador')} />
              ) : (
                <HistoryList />
              )}
            </div>
          </div>
        )}

        {/* Pestaña: Sobre el simulador (Ancho completo) */}
        {activeTab === 'sobre_simulador' && (
          <div className="lg:col-span-12 flex flex-col gap-6 bg-white border border-slate-300 rounded p-6 shadow-sm font-sans text-sm text-slate-700 leading-relaxed relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0056b3]" />
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
              Sobre el Simulador y Fundamentos del Paper
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded p-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-[#0056b3]">
                    1. Deadlines Implícitos
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">
                    En redes inalámbricas industriales en tiempo real como 6TiSCH, se asume el modelo de <strong>plazos de entrega implícitos</strong>.
                  </p>
                  <p className="text-xs text-slate-600">
                    Esto establece que el plazo máximo de entrega de un paquete es igual a su período de generación (<span className="font-mono bg-slate-100 border border-slate-250 px-1 py-0.5 rounded font-bold">D_i = T_i</span>). En términos prácticos: un paquete generado por un sensor debe ser programado en las celdas TSCH y alcanzar el gateway antes de que el mismo nodo genere su siguiente paquete de datos. Si un flujo no cumple esta restricción, se genera congestión y pérdida de determinismo en la red.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-[#0056b3]">
                    2. Modelamiento de Conflictos (paper_double)
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">
                    Para calcular la planificabilidad (schedulability), el simulador analiza pares de enlaces que no pueden transmitir en paralelo debido a interferencias de radiofrecuencia o restricciones físicas del transceptor (por ejemplo, un nodo no puede transmitir y recibir simultáneamente en el mismo slot).
                  </p>
                  <p className="text-xs text-slate-650">
                    El simulador implementa de manera estricta el modo <strong>paper_double</strong>. Este modo duplica penalizaciones y considera restricciones de colisión extendidas, especialmente en el vecindario del Gateway (nodo receptor único central), donde confluyen múltiples flujos y la interferencia acumulada es crítica para el rendimiento real de la red.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded p-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-amber-700">
                    3. Metodología de Simulación
                  </h4>
                  <p className="text-xs text-slate-650 mb-2">
                    Este simulador recrea fielmente el entorno IoT académico del paper base 6TiSCH multi-objetivo:
                  </p>
                  <ul className="list-disc pl-4 text-xs text-slate-600 flex flex-col gap-2">
                    <li><strong>Topología Aleatoria:</strong> Se distribuyen <span className="font-bold text-slate-800">N</span> nodos y se determina la densidad por el grado promedio de conectividad (<span className="font-bold text-slate-800">λ</span>).</li>
                    <li><strong>Gateway:</strong> Se selecciona automáticamente al nodo de mayor centralidad o de forma manual por el usuario ingresando su ID de nodo.</li>
                    <li><strong>Hiperperíodo:</strong> Determina la longitud cíclica en slots de la grilla de celdas TSCH (<span className="font-bold text-slate-800">H</span>).</li>
                    <li><strong>Algoritmos de Enrutamiento:</strong> Se evalúa la literatura de referencia (Shortest Path) frente al óptimo de Minimal Overlap (MO) y optimizaciones avanzadas de Colonia de Hormigas (ACO) y Aprendizaje por Refuerzo (Q-Learning y SARSA).</li>
                  </ul>
                </div>
                
                <div className="bg-[#0056b3]/5 border border-[#0056b3]/20 rounded p-4 text-xs flex gap-2">
                  <HelpCircle className="w-4 h-4 text-[#0056b3] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#0056b3] text-xs mb-1">
                      Nota Académica
                    </h4>
                    <p className="text-slate-650 leading-relaxed">
                      Mantener estos parámetros fijos y alineados con la lógica del paper base asegura que todos los gráficos comparativos de overlaps, hops, tasa de planificabilidad y curvas de demanda (DBF) sigan siendo científicamente consistentes y válidos para la defensa de magíster, facilitando la validación matemática de las simulaciones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lateral Info Drawer */}
      {methodDrawer && currentInfo && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-xl w-full rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800">{currentInfo.title}</h4>
              <button 
                onClick={() => setMethodDrawer(null)}
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
              >
                Cerrar
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Complejidad Algorítmica:</span>
                <span className="font-mono text-[#0056b3] text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {currentInfo.complexity}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Descripción:</span>
                <p className="text-slate-700 leading-relaxed">{currentInfo.description}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Pseudocódigo:</span>
                <pre className="bg-slate-50 text-[10px] font-mono text-slate-600 p-3.5 rounded border border-slate-200 overflow-x-auto leading-normal whitespace-pre">
                  {currentInfo.pseudocode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Simulation Warning Modal */}
      {showNewSimModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-355 max-w-sm w-full rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 relative font-sans">
            {/* Warning color strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Hacer otra simulación
              </h4>
              <button 
                onClick={() => setShowNewSimModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 text-xs text-slate-600 leading-normal flex flex-col gap-3">
              <p>
                Al comenzar otra simulación se limpiarán los resultados actuales de la pantalla.
              </p>
              <p className="bg-amber-50/50 border border-amber-200/60 rounded p-2 text-slate-500 font-mono text-[10px]">
                Nota: Esta simulación ya está registrada en la base de datos local. Puedes recuperarla en cualquier momento en la pestaña &quot;Historial DB&quot; o exportarla a un archivo local.
              </p>
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  exportSimulationJson();
                }}
                className="w-full py-1.5 text-xs font-bold rounded bg-[#2ca02c] hover:bg-[#258525] text-white transition-colors text-center shadow-sm cursor-pointer"
              >
                Guardar resultados (JSON)
              </button>
              
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setShowNewSimModal(false)}
                  className="flex-1 py-1.5 text-xs font-semibold rounded border border-slate-350 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSimModal(false);
                    setSimStatus('idle');
                    setActiveResult(null);
                  }}
                  className="flex-1 py-1.5 text-xs font-bold rounded bg-[#02529c] hover:bg-[#003d73] text-white transition-colors shadow-sm cursor-pointer"
                >
                  Volver a empezar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
