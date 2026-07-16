'use client';

import React, { useState, useEffect } from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Activity, ShieldAlert, Cpu, BarChart3, HelpCircle, History, Network, CheckCircle, Database } from 'lucide-react';

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
    setSelectedCompareMethodView
  } = useSimStore();

  const [activeTab, setActiveTab] = useState<'network' | 'compare' | 'scheduler' | 'sweep' | 'history'>('network');
  const [methodDrawer, setMethodDrawer] = useState<string | null>(null);

  // Sincronizar isCompareMode según la pestaña seleccionada
  useEffect(() => {
    if (activeTab === 'compare') {
      setIsCompareMode(true);
    } else if (activeTab === 'network') {
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
        }))
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
    <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto gap-6 bg-slate-100">
      <Toaster position="top-right" theme="light" />
      
      {/* MATLAB Classic-style Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white border border-slate-350 rounded p-5 shadow-sm relative overflow-hidden">
        {/* Solid blue strip indicating MATLAB style titlebar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#0056b3]" />
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-slate-700">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              Plataforma 6TiSCH Multi-Objetivo
            </h1>
            <p className="text-xs text-slate-500">
              Seminario de Tesis: Modelamiento de Enrutamiento y Programabilidad TSCH bajo Demanda
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-50 border border-slate-300 rounded p-1 shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'network'
                ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Network size={14} />
            Topología
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'compare'
                ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 size={14} />
            Comparar Métodos
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'scheduler'
                ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Activity size={14} />
            Planificador TSCH
          </button>
          <button
            onClick={() => setActiveTab('sweep')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'sweep'
                ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 size={14} />
            Barrido Paramétrico
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded transition-all ${
              activeTab === 'history'
                ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Database size={14} />
            Historial DB
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Pestaña: Topología (Grafo a la izquierda, panel a la derecha) */}
        {activeTab === 'network' && (
          <>
            {/* Lado izquierdo: Grafo de la red y gráficos de métricas individuales */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="relative">
                <TopologyGraph />
                
                {simStatus === 'completed' && activeResult && (
                  <div className="absolute top-4 right-4 z-10 flex gap-1.5 font-mono">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded border shadow-sm ${
                      activeResult.isSchedulable 
                        ? 'bg-[#2ca02c]/10 text-[#2ca02c] border border-[#2ca02c]/40' 
                        : 'bg-[#d62728]/10 text-[#d62728] border border-[#d62728]/40'
                    }`}>
                      {activeResult.isSchedulable ? '✓ PROGRAMABLE' : '✗ NO PROGRAMABLE'}
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-white border border-slate-300 text-slate-750 shadow-sm">
                      SOLAPES: {activeResult.totalOverlaps}
                    </span>
                  </div>
                )}
              </div>

              {simStatus === 'completed' && activeResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <OverlapChart />
                  <SchedulabilityGauge />
                  <DemandBoundChart />
                </div>
              )}
            </div>

            {/* Lado derecho: Panel de configuración y controles de ejecución */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <ParameterPanel />

              {/* Botón suelto para iniciar simulación individual */}
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

        {/* Pestaña: Comparar Métodos (Grafo a la izquierda, selectores A/B a la derecha) */}
        {activeTab === 'compare' && (
          <>
            {/* Lado izquierdo: Grafo de la red y dashboard comparativo con DBF */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="relative">
                <TopologyGraph />
                
                {simStatus === 'completed' && compareResultsPayload && (
                  <div className="absolute top-4 right-4 z-10 flex gap-1.5 font-mono">
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#0056b3]/10 border border-[#0056b3]/45 text-[#0056b3] shadow-sm">
                      COMPARACIÓN: {compareMethodsSelected.methodA} vs {compareMethodsSelected.methodB}
                    </span>
                  </div>
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

        {/* Pestaña: Barrido Paramétrico */}
        {activeTab === 'sweep' && (
          <>
            <div className="lg:col-span-8 flex flex-col gap-6">
              <SweepPlots />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-6">
              <SweepConfigPanel />
            </div>
          </>
        )}

        {/* Pestaña: Planificador TSCH (Ancho completo) */}
        {activeTab === 'scheduler' && (
          <div className="lg:col-span-12 flex flex-col gap-6">
            <TSCHScheduleGrid />
            <TSCHFlowTable />
          </div>
        )}

        {/* Pestaña: Historial DB (Ancho completo) */}
        {activeTab === 'history' && (
          <div className="lg:col-span-12 flex flex-col gap-6">
            <HistoryList />
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
    </div>
  );
}
