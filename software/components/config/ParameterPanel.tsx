'use client';

import React, { useState, useEffect } from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { SimParameters } from '@/lib/types';
import { FolderOpen, Save, Trash2, X, AlertTriangle, FileText, Shuffle } from 'lucide-react';

export default function ParameterPanel() {
  const { 
    params, 
    updateParams, 
    resetParams, 
    graphData,
    setGraphData, 
    setSimStatus, 
    setActiveResult, 
    setSelectedSensor,
    routingMethod,
    setRoutingMethod,
    isSelectingGateway,
    setIsSelectingGateway,
    importedTopologyName,
    setImportedTopologyName,
    showSaveTopologyModal,
    setShowSaveTopologyModal,
    isCompareMode,
    compareMethodsSelected,
    setCompareMethodsSelected
  } = useSimStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editDefaults, setEditDefaults] = useState(false);
  const [draftParams, setDraftParams] = useState<Partial<SimParameters>>({});

  const [showImportModal, setShowImportModal] = useState(false);
  const [savedTopologies, setSavedTopologies] = useState<any[]>([]);
  const [loadingTopologies, setLoadingTopologies] = useState(false);

  const [lastGenerated, setLastGenerated] = useState<{
    N: number;
    lambda: number;
    selected_gateway: number | null;
    gateway_mode: 'auto' | 'manual' | 'multi-gateway';
    sensorsCount: number;
  } | null>(null);

  const [activeParamConfigTab, setActiveParamConfigTab] = useState<'A' | 'B'>('A');

  const currentMethodToConfigure = isCompareMode
    ? (activeParamConfigTab === 'A' ? compareMethodsSelected.methodA : compareMethodsSelected.methodB)
    : routingMethod;

  const loadSavedTopologies = async () => {
    setLoadingTopologies(true);
    try {
      const list = await fetchApi('/topologies');
      setSavedTopologies(list);
    } catch (e: any) {
      toast.error('Error al cargar topologías: ' + e.message);
    } finally {
      setLoadingTopologies(false);
    }
  };

  useEffect(() => {
    if (showImportModal) {
      loadSavedTopologies();
    }
  }, [showImportModal]);



  const handleDeleteTopology = async (id: string, name: string) => {
    try {
      await fetchApi(`/topologies/${id}`, { method: 'DELETE' });
      toast.success(`Topología "${name}" eliminada`);
      loadSavedTopologies();
    } catch (e: any) {
      toast.error('Error al eliminar topología: ' + e.message);
    }
  };

  const handleSelectTopology = (topo: any) => {
    updateParams({
      N: topo.N,
      lambda: topo.lambda_val,
      sensorsCount: topo.sensors_count,
      selected_gateway: topo.gateway,
      gateway_mode: topo.gateway_mode
    });

    setGraphData({
      nodes: topo.nodes,
      edges: topo.edges
    });

    setImportedTopologyName(topo.name);
    setShowImportModal(false);
    
    setLastGenerated({
      N: topo.N,
      lambda: topo.lambda_val,
      selected_gateway: topo.gateway,
      gateway_mode: topo.gateway_mode,
      sensorsCount: topo.sensors_count
    });

    toast.success(`Topología "${topo.name}" importada correctamente`);
  };

  const isDefaultTopology = 
    (!lastGenerated || (
      lastGenerated.N === 30 &&
      lastGenerated.lambda === 8 &&
      lastGenerated.gateway_mode === 'auto'
    )) &&
    params.gateway_mode === 'auto';

  // Sync initial generated parameters if graph exists on mount or loads
  useEffect(() => {
    if (graphData && lastGenerated === null) {
      setLastGenerated({
        N: params.N,
        lambda: params.lambda,
        selected_gateway: params.selected_gateway,
        gateway_mode: params.gateway_mode,
        sensorsCount: params.sensorsCount
      });
    }
  }, [graphData, params, lastGenerated]);

  const hasParamsChanged = () => {
    if (!graphData) return true;
    if (!lastGenerated) return false;
    
    return (
      params.N !== lastGenerated.N ||
      params.lambda !== lastGenerated.lambda ||
      params.selected_gateway !== lastGenerated.selected_gateway ||
      params.gateway_mode !== lastGenerated.gateway_mode ||
      params.sensorsCount !== lastGenerated.sensorsCount
    );
  };

  const hasDraftChanged = () => {
    for (const key of Object.keys(draftParams)) {
      const k = key as keyof SimParameters;
      if (draftParams[k] !== params[k]) {
        return true;
      }
    }
    return false;
  };

  const isNInvalid = isNaN(params.N) || params.N < 10 || params.N > 100;
  const isSensorsInvalid = isNaN(params.sensorsCount) || params.sensorsCount < 1 || params.sensorsCount > params.N - 1;
  const isGatewayInvalid = params.gateway_mode === 'manual' && (isNaN(params.selected_gateway ?? NaN) || (params.selected_gateway ?? 0) < 0 || (params.selected_gateway ?? 0) >= params.N);

  const isButtonDisabled = isNInvalid || isSensorsInvalid || isGatewayInvalid;

  const handleGenerateTopology = async () => {
    if (isButtonDisabled) return;

    try {
      const res = await fetchApi('/topology/generate', {
        method: 'POST',
        body: JSON.stringify({
          N: params.N,
          lambda_val: params.lambda,
          gateway_mode: params.gateway_mode,
          selected_gateway: params.gateway_mode === 'manual' ? params.selected_gateway : null,
          centrality_metric: params.centrality_metric,
          topology_generator: params.topology_generator,
          seed: params.seed,
          num_gateways: params.num_gateways,
          mg_centrality_method: params.mg_centrality_method
        }),
      });

      const cytoscapeNodes = res.nodes.map((n: any) => n.data);
      const cytoscapeEdges = res.edges.map((e: any) => e.data);

      setGraphData({
        nodes: cytoscapeNodes,
        edges: cytoscapeEdges
      });

      // Update actual sensors count, gateway, and reproducibility seed
      // returned by the backend (if the user didn't pin one, the server
      // drew a fresh one — we store it so this exact topology can be
      // regenerated later, per SoftwareX reproducibility requirements).
      // In multi-gateway mode, "gateways" locks in the exact partition so
      // the simulation reuses the same clusters/gateways shown in the graph.
      updateParams({
        selected_gateway: res.gateway,
        sensorsCount: res.sensors.length,
        seed: res.seed,
        gateways: params.gateway_mode === 'multi-gateway' ? res.gateways : null
      });

      setLastGenerated({
        N: params.N,
        lambda: params.lambda,
        selected_gateway: res.gateway,
        gateway_mode: params.gateway_mode,
        sensorsCount: res.sensors.length
      });
      
      toast.success('Topología y sensores generados correctamente');
    } catch (e: any) {
      toast.error('Error al generar la topología: ' + e.message);
    }
  };

  return (
    <div className="bg-white border border-slate-350 rounded p-4 shadow-sm font-mono flex flex-col gap-3">
      {/* Wizard Progress Indicator */}
      <div className="flex border-b border-slate-200 text-[10px] font-sans font-bold mb-1">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex-1 pb-2 text-center border-b-2 transition-all ${
            step === 1 
              ? 'border-[#0056b3] text-[#0056b3]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. PARÁMETROS DE RED
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex-1 pb-2 text-center border-b-2 transition-all ${
            step === 2 
              ? 'border-[#0056b3] text-[#0056b3]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. CONFIG. ENRUTAMIENTO
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`flex-1 pb-2 text-center border-b-2 transition-all ${
            step === 3 
              ? 'border-[#0056b3] text-[#0056b3]' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. GATEWAY
        </button>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-2.5">
          {/* Topología Importada Banner o Botones de Guardar/Importar */}
          {importedTopologyName ? (
            <div className="bg-emerald-50 border border-emerald-250 rounded p-2.5 flex justify-between items-center text-[10px] font-sans">
              <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span>topología importada: <span className="underline font-mono font-bold text-emerald-900">{importedTopologyName}</span></span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setImportedTopologyName(null);
                  setGraphData(null);
                  toast.info('Se quitó la topología importada');
                }}
                className="text-[10px] text-red-700 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Trash2 className="w-3 h-3" />
                Eliminar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="py-1.5 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                Importar Topología
              </button>
              <div className="relative group w-full">
                <button
                  type="button"
                  onClick={() => setShowSaveTopologyModal(true)}
                  disabled={!graphData || isDefaultTopology}
                  className={`w-full py-1.5 px-2 rounded border transition-colors flex items-center justify-center gap-1 font-sans ${
                    graphData && !isDefaultTopology
                      ? 'border-[#2ca02c] bg-white text-[#2ca02c] hover:bg-emerald-50 cursor-pointer shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className={`w-3.5 h-3.5 ${graphData && !isDefaultTopology ? 'text-[#2ca02c]' : 'text-slate-400'}`} />
                  Guardar Topología
                </button>
                {graphData && isDefaultTopology && (
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-center pointer-events-none">
                    Esta es la topología por defecto. Genera una nueva topología para poder guardarla.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nodos N */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Nodos de Red (N):
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                  Cantidad de nodos físicos en la topología (sensores, routers y gateway). Más nodos incrementan el tamaño del grafo y la complejidad; menos nodos lo simplifican.
                </div>
              </span>
            </span>
            <input
              type="number"
              disabled={!!importedTopologyName}
              value={isNaN(params.N) ? '' : params.N}
              onChange={(e) => {
                const val = e.target.value;
                updateParams({ N: val === '' ? NaN : parseInt(val) });
              }}
              className={`w-20 bg-white border text-xs rounded p-1 font-semibold text-center focus:outline-none focus:ring-1 font-mono transition-colors ${
                isNInvalid
                  ? 'border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 text-slate-800 focus:ring-[#0056b3] focus:border-[#0056b3] disabled:bg-slate-50 disabled:text-slate-400'
              }`}
            />
          </div>

          {/* Lambda Density */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Densidad (λ):
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                  Grado de conectividad promedio. Más densidad (λ alto) aumenta caminos alternativos pero multiplica las interferencias y colisiones en el vecindario del gateway.
                </div>
              </span>
            </span>
            <select
              value={params.lambda}
              disabled={!!importedTopologyName}
              onChange={(e) => updateParams({ lambda: parseInt(e.target.value) })}
              className="w-28 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="4">4 (Disperso)</option>
              <option value="8">8 (Medio)</option>
              <option value="12">12 (Denso)</option>
            </select>
          </div>

          {/* Emisores (Sensores) */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Emisores:
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                  Cantidad de nodos sensores que transmiten datos. Más emisores incrementan el volumen de tráfico y los solapamientos de celdas; menos emisores descongestionan los enlaces.
                </div>
              </span>
            </span>
            <input
              type="number"
              disabled={!!importedTopologyName}
              value={isNaN(params.sensorsCount) ? '' : params.sensorsCount}
              onChange={(e) => {
                const val = e.target.value;
                updateParams({ sensorsCount: val === '' ? NaN : parseInt(val) });
              }}
              className={`w-20 bg-white border text-xs rounded p-1 font-semibold text-center focus:outline-none focus:ring-1 font-mono transition-colors ${
                isSensorsInvalid
                  ? 'border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 text-slate-800 focus:ring-[#0056b3] focus:border-[#0056b3] disabled:bg-slate-50 disabled:text-slate-400'
              }`}
            />
          </div>

          {/* Canales m */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Canales TSCH (m):
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                  Canales de frecuencia utilizables en paralelo. Más canales reducen las colisiones al permitir transmisiones concurrentes en frecuencias distintas; menos canales saturan el medio.
                </div>
              </span>
            </span>
            <select
              value={params.m_fixed}
              disabled={!!importedTopologyName}
              onChange={(e) => updateParams({ m_fixed: parseInt(e.target.value) })}
              className="w-28 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="16">16 (Estándar)</option>
              <option value="8">8 (Medio)</option>
              <option value="4">4 (Coexistencia)</option>
              <option value="2">2 (Contención)</option>
            </select>
          </div>

          {/* Hyperperiodo H */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Hiperperíodo (H):
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                  Cota superior orientativa. El hiperperíodo REAL usado para schedulability se recalcula siempre como H = lcm(T) de los períodos efectivamente generados (paper §6.1), y se muestra en los resultados tras correr la simulación.
                </div>
              </span>
            </span>
            <select
              value={params.H}
              disabled={!!importedTopologyName}
              onChange={(e) => updateParams({ H: parseInt(e.target.value) })}
              className="w-28 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="64">64 slots</option>
              <option value="128">128 slots</option>
              <option value="256">256 slots</option>
            </select>
          </div>

          {/* Rango Periodos (Eta) */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Períodos (eta):
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help font-mono">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                  Rango de exponentes para el período periódico de generación de paquetes ($T_i = 2^\eta$). Valores más bajos generan tráfico de alta frecuencia; valores más altos espacian los paquetes.
                </div>
              </span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max={params.eta_max}
                disabled={!!importedTopologyName}
                value={params.eta_min}
                onChange={(e) => updateParams({ eta_min: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-10 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 text-center font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] disabled:bg-slate-50 disabled:text-slate-400"
                title="eta_min"
              />
              <span className="text-slate-400 font-semibold text-[10px]">a</span>
              <input
                type="number"
                min={params.eta_min}
                max="10"
                disabled={!!importedTopologyName}
                value={params.eta_max}
                onChange={(e) => updateParams({ eta_max: Math.max(params.eta_min, parseInt(e.target.value) || 2) })}
                className="w-10 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 text-center font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] disabled:bg-slate-50 disabled:text-slate-400"
                title="eta_max"
              />
            </div>
          </div>

          {/* Generador de Topología */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Generador Aleatorio:
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-56 text-left">
                  Familia de generador estocástico de NetworkX (Hagberg, Schult &amp; Swart, 2008). Erdős–Rényi (G(N,p)) replica en distribución la matriz sprand/spones de la referencia MATLAB. Watts–Strogatz y Barabási–Albert permiten explorar topologías small-world / scale-free; Geométrico Aleatorio simula despliegues espaciales típicos de WSAN.
                </div>
              </span>
            </span>
            <select
              value={params.topology_generator}
              disabled={!!importedTopologyName}
              onChange={(e) => updateParams({ topology_generator: e.target.value as SimParameters['topology_generator'] })}
              className="w-40 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="erdos_renyi">Erdős–Rényi (≈ sprand)</option>
              <option value="watts_strogatz">Watts–Strogatz</option>
              <option value="barabasi_albert">Barabási–Albert</option>
              <option value="random_geometric">Geométrico Aleatorio</option>
            </select>
          </div>

          {/* Métrica de Centralidad del Gateway */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Gateway por:
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-56 text-left">
                  Métrica de centralidad usada para elegir el gateway en modo automático. El paper (§3.1) define el gateway como el nodo de mayor betweenness centrality; grado y closeness quedan disponibles para análisis de sensibilidad (nota 3 del paper).
                </div>
              </span>
            </span>
            <select
              value={params.centrality_metric}
              disabled={!!importedTopologyName || params.gateway_mode !== 'auto'}
              onChange={(e) => updateParams({ centrality_metric: e.target.value as SimParameters['centrality_metric'] })}
              className="w-40 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="betweenness">Betweenness (fiel al paper)</option>
              <option value="degree">Grado (sensibilidad)</option>
              <option value="closeness">Closeness (sensibilidad)</option>
            </select>
          </div>

          {/* Seed de reproducibilidad */}
          <div className="flex justify-between items-center text-xs gap-3">
            <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
              Semilla (seed):
              <span className="relative group inline-block font-mono">
                <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                  ?
                </span>
                <div className="absolute bottom-full mb-1.5 left-0 -translate-x-4 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-56 text-left">
                  Fija la aleatoriedad de topología, sensores y períodos de flujo para reproducibilidad exacta (requisito de publicación en SoftwareX). Vacío = el servidor genera una semilla nueva y la reporta aquí tras ejecutar.
                </div>
              </span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="auto"
                value={params.seed ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateParams({ seed: val === '' ? null : parseInt(val) });
                }}
                className="w-24 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 text-center font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3]"
                title="Semilla de reproducibilidad (vacío = aleatoria)"
              />
              <button
                type="button"
                onClick={() => updateParams({ seed: null })}
                title="Limpiar semilla (usar una nueva aleatoria en la próxima ejecución)"
                className="p-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600"
              >
                <Shuffle size={12} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-1.5 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={resetParams}
              disabled={!!importedTopologyName}
              className="py-1.5 text-xs font-semibold rounded border border-slate-350 bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 disabled:hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleGenerateTopology}
              disabled={isButtonDisabled || !!importedTopologyName}
              className={`col-span-2 py-1.5 text-xs font-bold rounded transition-all shadow-sm ${
                isButtonDisabled || !!importedTopologyName
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-355'
                  : 'bg-[#02529c] hover:bg-[#003d73] text-white'
              }`}
            >
              Generar Red
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3 font-sans text-xs">
          {/* Algoritmo de Enrutamiento */}
          {isCompareMode ? (
            <div className="flex flex-col gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-700 font-bold font-mono">Algoritmo 1:</span>
                <select
                  value={compareMethodsSelected.methodA}
                  onChange={(e) => setCompareMethodsSelected({
                    ...compareMethodsSelected,
                    methodA: e.target.value
                  })}
                  className="w-44 bg-white border border-slate-300 text-[#0056b3] text-xs rounded p-1 font-bold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono"
                >
                  <option value="SP" disabled={compareMethodsSelected.methodB === 'SP'}>Shortest Path (SP)</option>
                  <option value="MO" disabled={compareMethodsSelected.methodB === 'MO'}>Minimal Overlap (MO)</option>
                  <option value="MO_ACO" disabled={compareMethodsSelected.methodB === 'MO_ACO'}>MO + ACO</option>
                  <option value="QLearning" disabled={compareMethodsSelected.methodB === 'QLearning'}>Q-Learning</option>
                  <option value="SARSA" disabled={compareMethodsSelected.methodB === 'SARSA'}>SARSA</option>
                </select>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-700 font-bold font-mono">Algoritmo 2:</span>
                <select
                  value={compareMethodsSelected.methodB}
                  onChange={(e) => setCompareMethodsSelected({
                    ...compareMethodsSelected,
                    methodB: e.target.value
                  })}
                  className="w-44 bg-white border border-slate-300 text-[#0056b3] text-xs rounded p-1 font-bold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono"
                >
                  <option value="MO" disabled={compareMethodsSelected.methodA === 'MO'}>Minimal Overlap (MO)</option>
                  <option value="SP" disabled={compareMethodsSelected.methodA === 'SP'}>Shortest Path (SP)</option>
                  <option value="MO_ACO" disabled={compareMethodsSelected.methodA === 'MO_ACO'}>MO + ACO</option>
                  <option value="QLearning" disabled={compareMethodsSelected.methodA === 'QLearning'}>Q-Learning</option>
                  <option value="SARSA" disabled={compareMethodsSelected.methodA === 'SARSA'}>SARSA</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-3 pb-2 border-b border-slate-100">
              <span className="text-slate-700 font-bold font-mono">Algoritmo:</span>
              <select
                value={routingMethod}
                onChange={(e) => setRoutingMethod(e.target.value as any)}
                className="w-48 bg-white border border-slate-300 text-[#0056b3] text-xs rounded p-1 font-bold focus:outline-none focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-mono"
              >
                <option value="MO">Minimal Overlap (MO)</option>
                <option value="SP">Shortest Path (SP)</option>
                <option value="MO_ACO" disabled={params.gateway_mode === 'multi-gateway'}>
                  MO + ACO{params.gateway_mode === 'multi-gateway' ? ' (no soportado en Multi-gateway)' : ''}
                </option>
                <option value="QLearning" disabled={params.gateway_mode === 'multi-gateway'}>
                  Q-Learning{params.gateway_mode === 'multi-gateway' ? ' (no soportado en Multi-gateway)' : ''}
                </option>
                <option value="SARSA" disabled={params.gateway_mode === 'multi-gateway'}>
                  SARSA{params.gateway_mode === 'multi-gateway' ? ' (no soportado en Multi-gateway)' : ''}
                </option>
              </select>
            </div>
          )}

          {/* Editar valores por defecto checkbox con tooltip + BOTÓN GUARDAR a la derecha */}
          <div className="flex justify-between items-center pb-1">
            <div className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                id="edit-defaults"
                checked={editDefaults}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEditDefaults(checked);
                  if (!checked) {
                    // Reset drafts and restore defaults in the store
                    setDraftParams({});
                    updateParams({
                      mo_psi: 0.0265,
                      aco_alpha: 1.0,
                      aco_beta: 2.5,
                      aco_rho: 0.10,
                      aco_Q: 2.0,
                      aco_num_ants: 20,
                      aco_num_iterations: 35,
                      aco_hops_penalty: 0.001,
                      aco_partial_overlap_penalty: 25.0,
                      ql_alpha: 0.1,
                      ql_gamma: 0.9,
                      ql_epsilon_start: 1.0,
                      ql_epsilon_min: 0.05,
                      ql_num_episodes: 400,
                      sar_alpha: 0.1,
                      sar_gamma: 0.9,
                      sar_epsilon_start: 1.0,
                      sar_epsilon_min: 0.05,
                      sar_num_episodes: 400,
                    });
                    toast.info('Se restauraron los parámetros óptimos por defecto');
                  } else {
                    // Initialize drafts with current store values
                    setDraftParams({
                      mo_psi: params.mo_psi ?? 0.0265,
                      aco_alpha: params.aco_alpha ?? 1.0,
                      aco_beta: params.aco_beta ?? 2.5,
                      aco_rho: params.aco_rho ?? 0.10,
                      aco_Q: params.aco_Q ?? 2.0,
                      aco_num_ants: params.aco_num_ants ?? 20,
                      aco_num_iterations: params.aco_num_iterations ?? 35,
                      aco_hops_penalty: params.aco_hops_penalty ?? 0.001,
                      aco_partial_overlap_penalty: params.aco_partial_overlap_penalty ?? 25.0,
                      ql_alpha: params.ql_alpha ?? 0.1,
                      ql_gamma: params.ql_gamma ?? 0.9,
                      ql_epsilon_start: params.ql_epsilon_start ?? 1.0,
                      ql_epsilon_min: params.ql_epsilon_min ?? 0.05,
                      ql_num_episodes: params.ql_num_episodes ?? 400,
                      sar_alpha: params.sar_alpha ?? 0.1,
                      sar_gamma: params.sar_gamma ?? 0.9,
                      sar_epsilon_start: params.sar_epsilon_start ?? 1.0,
                      sar_epsilon_min: params.sar_epsilon_min ?? 0.05,
                      sar_num_episodes: params.sar_num_episodes ?? 400,
                    });
                  }
                }}
                className="rounded border-slate-300 text-[#0056b3] focus:ring-[#0056b3] w-3.5 h-3.5 cursor-pointer"
              />
              <label htmlFor="edit-defaults" className="text-slate-600 font-bold select-none cursor-pointer flex items-center gap-1.5">
                Editar valores por defecto
                <span className="relative group inline-block font-mono">
                  <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help font-mono">
                    ?
                  </span>
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-52 text-left">
                    Los parámetros por defecto son los óptimos para minimizar las superposiciones y por ende poder cumplir el deadline.
                  </div>
                </span>
              </label>
            </div>

            {/* Botón Guardar en la esquina derecha */}
            <button
              type="button"
              disabled={!editDefaults || !hasDraftChanged()}
              onClick={() => {
                updateParams(draftParams);
                toast.success('Parámetros guardados correctamente');
              }}
              className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all ${
                editDefaults && hasDraftChanged()
                  ? 'bg-[#2ca02c] border-[#258525] text-white hover:bg-[#258525] active:scale-95 shadow-sm'
                  : 'bg-slate-100 border-slate-250 text-slate-400 cursor-not-allowed'
              }`}
            >
              Guardar
            </button>
          </div>

          {isCompareMode && (
            <div className="flex border border-slate-200 rounded overflow-hidden text-[9px] font-sans font-bold bg-slate-50 mb-1">
              <button
                type="button"
                onClick={() => setActiveParamConfigTab('A')}
                className={`flex-1 py-1 text-center transition-all ${
                  activeParamConfigTab === 'A' 
                    ? 'bg-[#0056b3] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-105'
                }`}
              >
                Parámetros: Algoritmo 1 ({compareMethodsSelected.methodA})
              </button>
              <button
                type="button"
                onClick={() => setActiveParamConfigTab('B')}
                className={`flex-1 py-1 text-center transition-all border-l border-slate-200 ${
                  activeParamConfigTab === 'B' 
                    ? 'bg-[#0056b3] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-105'
                }`}
              >
                Parámetros: Algoritmo 2 ({compareMethodsSelected.methodB})
              </button>
            </div>
          )}

          {/* Parámetros Específicos */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2.5">
            {currentMethodToConfigure === 'SP' && (
              <p className="text-[10px] text-slate-500 italic leading-normal font-sans">
                El algoritmo Shortest Path (SP) no tiene parámetros de enrutamiento adicionales personalizables. Calcula la ruta más corta (Dijkstra) individualmente para cada flujo.
              </p>
            )}

            {currentMethodToConfigure === 'MO' && (
              <div className="flex flex-col gap-2 font-mono text-[11px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-semibold flex items-center gap-1 select-none font-sans">
                    Factor de Penalización (ψ):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-56 text-left">
                        Tasa de penalización de aristas compartidas. Valores más altos evitan overlaps rápidamente pero pueden dar rutas muy largas. Valores más bajos priorizan la ruta corta, arriesgando overlaps persistentes.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="1.0"
                    disabled={!editDefaults}
                    value={draftParams.mo_psi !== undefined ? draftParams.mo_psi : (params.mo_psi ?? 0.0265)}
                    onChange={(e) => setDraftParams({ ...draftParams, mo_psi: parseFloat(e.target.value) || 0.0001 })}
                    className="w-18 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1 focus:ring-[#0056b3] transition-colors"
                  />
                </div>
              </div>
            )}

            {currentMethodToConfigure === 'MO_ACO' && (
              <div className="flex flex-col gap-2 font-mono text-[10px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-semibold flex items-center gap-1 select-none font-sans">
                    Factor de Penalización (ψ):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-56 text-left">
                        Tasa de penalización de aristas compartidas. Valores más altos evitan overlaps rápidamente pero pueden dar rutas muy largas. Valores más bajos priorizan la ruta corta, arriesgando overlaps persistentes.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="1.0"
                    disabled={!editDefaults}
                    value={draftParams.mo_psi !== undefined ? draftParams.mo_psi : (params.mo_psi ?? 0.0265)}
                    onChange={(e) => setDraftParams({ ...draftParams, mo_psi: parseFloat(e.target.value) || 0.0001 })}
                    className="w-18 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1 focus:ring-[#0056b3] transition-colors"
                  />
                </div>

                <div className="border-t border-slate-200 my-1 pt-1.5 text-slate-400 font-sans font-bold text-[9px]">PARÁMETROS ACO:</div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div className="flex justify-between items-center gap-1">
                    <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                      Alfa (α):
                      <span className="relative group inline-block font-mono">
                        <span className="w-3 h-3 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help">
                          ?
                        </span>
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                          Importancia de la feromona. Valores más altos hacen que las hormigas sigan rígidamente los caminos históricos. Valores más bajos promueven mayor exploración aleatoria.
                        </div>
                      </span>
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      disabled={!editDefaults}
                      value={draftParams.aco_alpha !== undefined ? draftParams.aco_alpha : (params.aco_alpha ?? 1.0)}
                      onChange={(e) => setDraftParams({ ...draftParams, aco_alpha: parseFloat(e.target.value) || 0 })}
                      className="w-12 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-1">
                    <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                      Beta (β):
                      <span className="relative group inline-block font-mono">
                        <span className="w-3 h-3 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help">
                          ?
                        </span>
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                          Importancia de la visibilidad heurística (cercanía física). Valores más altos atraen a las hormigas al camino más corto geométricamente. Valores más bajos reducen el peso de la distancia física.
                        </div>
                      </span>
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      disabled={!editDefaults}
                      value={draftParams.aco_beta !== undefined ? draftParams.aco_beta : (params.aco_beta ?? 2.5)}
                      onChange={(e) => setDraftParams({ ...draftParams, aco_beta: parseFloat(e.target.value) || 0 })}
                      className="w-12 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-1">
                    <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                      Evaporación (ρ):
                      <span className="relative group inline-block font-mono">
                        <span className="w-3 h-3 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help">
                          ?
                        </span>
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                          Tasa de desaparición de feromona. Valores más altos evaporan rápido y ayudan a olvidar malas rutas pero arriesgan perder soluciones buenas. Valores más bajos retienen el aprendizaje más tiempo.
                        </div>
                      </span>
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      disabled={!editDefaults}
                      value={draftParams.aco_rho !== undefined ? draftParams.aco_rho : (params.aco_rho ?? 0.10)}
                      onChange={(e) => setDraftParams({ ...draftParams, aco_rho: parseFloat(e.target.value) || 0 })}
                      className="w-12 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-1">
                    <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                      Depósito (Q):
                      <span className="relative group inline-block font-mono">
                        <span className="w-3 h-3 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help">
                          ?
                        </span>
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                          Cantidad de feromona depositada por solución. Valores más altos refuerzan fuertemente las rutas exitosas. Valores más bajos suavizan el ritmo de convergencia.
                        </div>
                      </span>
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      disabled={!editDefaults}
                      value={draftParams.aco_Q !== undefined ? draftParams.aco_Q : (params.aco_Q ?? 2.0)}
                      onChange={(e) => setDraftParams({ ...draftParams, aco_Q: parseFloat(e.target.value) || 0 })}
                      className="w-12 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-1">
                    <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                      Hormigas:
                      <span className="relative group inline-block font-mono">
                        <span className="w-3 h-3 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help">
                          ?
                        </span>
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                          Población de agentes por iteración. Valores más altos exploran más combinaciones de rutas en paralelo mejorando el óptimo, pero aumentan la carga de cómputo.
                        </div>
                      </span>
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      disabled={!editDefaults}
                      value={draftParams.aco_num_ants !== undefined ? draftParams.aco_num_ants : (params.aco_num_ants ?? 20)}
                      onChange={(e) => setDraftParams({ ...draftParams, aco_num_ants: parseInt(e.target.value) || 1 })}
                      className="w-12 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-1">
                    <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                      Iteraciones:
                      <span className="relative group inline-block font-mono">
                        <span className="w-3 h-3 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help">
                          ?
                        </span>
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                          Iteraciones máximas del proceso de colonia. Valores más altos permiten converger a mejores combinaciones sin colisión, pero aumentan el tiempo de ejecución.
                        </div>
                      </span>
                    </span>
                    <input
                      type="number"
                      min="5"
                      max="150"
                      disabled={!editDefaults}
                      value={draftParams.aco_num_iterations !== undefined ? draftParams.aco_num_iterations : (params.aco_num_iterations ?? 35)}
                      onChange={(e) => setDraftParams({ ...draftParams, aco_num_iterations: parseInt(e.target.value) || 5 })}
                      className="w-12 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center gap-2 mt-1">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Penalización Saltos:
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Penaliza la longitud del camino en ACO. Valores más altos forzan caminos cortos. Valores más bajos permiten desvíos más largos para evitar colisiones.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1.0"
                    disabled={!editDefaults}
                    value={draftParams.aco_hops_penalty !== undefined ? draftParams.aco_hops_penalty : (params.aco_hops_penalty ?? 0.001)}
                    onChange={(e) => setDraftParams({ ...draftParams, aco_hops_penalty: parseFloat(e.target.value) || 0 })}
                    className="w-18 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Penalización Overlap:
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Penaliza la colisión de caminos de flujos. Valores más altos evitan a toda costa cruzar rutas de otros sensores. Valores más bajos toleran cierto nivel de solapamiento.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={!editDefaults}
                    value={draftParams.aco_partial_overlap_penalty !== undefined ? draftParams.aco_partial_overlap_penalty : (params.aco_partial_overlap_penalty ?? 25.0)}
                    onChange={(e) => setDraftParams({ ...draftParams, aco_partial_overlap_penalty: parseFloat(e.target.value) || 0 })}
                    className="w-18 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            )}

            {currentMethodToConfigure === 'QLearning' && (
              <div className="flex flex-col gap-2 font-mono text-[10px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Tasa de Aprendizaje (α):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Paso de actualización de la Q-table. Valores más altos actualizan rápido ignorando el histórico de recompensas. Valores más bajos aprenden de forma más estable y robusta.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.ql_alpha !== undefined ? draftParams.ql_alpha : (params.ql_alpha ?? 0.1)}
                    onChange={(e) => setDraftParams({ ...draftParams, ql_alpha: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Factor Descuento (γ):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Importancia de recompensas futuras. Valores cercanos a 1 priorizan el éxito a largo plazo (llegar al gateway). Valores cercanos a 0 priorizan el beneficio inmediato (saltos individuales).
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.ql_gamma !== undefined ? draftParams.ql_gamma : (params.ql_gamma ?? 0.9)}
                    onChange={(e) => setDraftParams({ ...draftParams, ql_gamma: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Epsilon Inicial (ε_start):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Tasa de exploración inicial de rutas. Valores más altos forzan mayor exploración aleatoria al principio. Valores más bajos inician explotando el conocimiento previo.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.ql_epsilon_start !== undefined ? draftParams.ql_epsilon_start : (params.ql_epsilon_start ?? 1.0)}
                    onChange={(e) => setDraftParams({ ...draftParams, ql_epsilon_start: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Epsilon Mínimo (ε_min):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Tasa de exploración mínima final. Valores más altos mantienen un nivel permanente de ruido/búsqueda aleatoria. Valores más bajos aseguran la convergencia total al final del aprendizaje.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.ql_epsilon_min !== undefined ? draftParams.ql_epsilon_min : (params.ql_epsilon_min ?? 0.05)}
                    onChange={(e) => setDraftParams({ ...draftParams, ql_epsilon_min: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Episodios:
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Total de ejecuciones de entrenamiento. Valores más altos permiten a los agentes refinar las rutas óptimas del grafo, pero aumentan notablemente el tiempo de cómputo.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    disabled={!editDefaults}
                    value={draftParams.ql_num_episodes !== undefined ? draftParams.ql_num_episodes : (params.ql_num_episodes ?? 400)}
                    onChange={(e) => setDraftParams({ ...draftParams, ql_num_episodes: parseInt(e.target.value) || 50 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1 font-mono"
                  />
                </div>
              </div>
            )}

            {currentMethodToConfigure === 'SARSA' && (
              <div className="flex flex-col gap-2 font-mono text-[10px]">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Tasa de Aprendizaje (α):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Paso de actualización de la Q-table. Valores más altos actualizan rápido ignorando el histórico de recompensas. Valores más bajos aprenden de forma más estable y robusta.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.sar_alpha !== undefined ? draftParams.sar_alpha : (params.sar_alpha ?? 0.1)}
                    onChange={(e) => setDraftParams({ ...draftParams, sar_alpha: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Factor Descuento (γ):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Importancia de recompensas futuras. Valores cercanos a 1 priorizan el éxito a largo plazo (llegar al gateway). Valores cercanos a 0 priorizan el beneficio inmediato (saltos individuales).
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.sar_gamma !== undefined ? draftParams.sar_gamma : (params.sar_gamma ?? 0.9)}
                    onChange={(e) => setDraftParams({ ...draftParams, sar_gamma: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Epsilon Inicial (ε_start):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Tasa de exploración inicial de rutas. Valores más altos forzan mayor exploración aleatoria al principio. Valores más bajos inician explotando el conocimiento previo.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.sar_epsilon_start !== undefined ? draftParams.sar_epsilon_start : (params.sar_epsilon_start ?? 1.0)}
                    onChange={(e) => setDraftParams({ ...draftParams, sar_epsilon_start: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Epsilon Mínimo (ε_min):
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Tasa de exploración mínima final. Valores más altos mantienen un nivel permanente de ruido/búsqueda aleatoria. Valores más bajos aseguran la convergencia total al final del aprendizaje.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    disabled={!editDefaults}
                    value={draftParams.sar_epsilon_min !== undefined ? draftParams.sar_epsilon_min : (params.sar_epsilon_min ?? 0.05)}
                    onChange={(e) => setDraftParams({ ...draftParams, sar_epsilon_min: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-700 font-sans flex items-center gap-1 select-none">
                    Episodios:
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-white border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help">
                        ?
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Total de ejecuciones de entrenamiento. Valores más altos permiten a los agentes refinar las rutas óptimas del grafo, pero aumentan notablemente el tiempo de cómputo.
                      </div>
                    </span>
                  </span>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    disabled={!editDefaults}
                    value={draftParams.sar_num_episodes !== undefined ? draftParams.sar_num_episodes : (params.sar_num_episodes ?? 400)}
                    onChange={(e) => setDraftParams({ ...draftParams, sar_num_episodes: parseInt(e.target.value) || 50 })}
                    className="w-16 bg-white border border-slate-300 rounded p-0.5 text-right font-bold focus:outline-none focus:ring-1 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between gap-2 mt-1.5 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-1.5 px-3 text-xs font-semibold rounded border border-slate-350 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="py-1.5 px-3 text-xs font-semibold rounded border border-transparent bg-[#02529c] hover:bg-[#003d73] text-white transition-colors cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3 font-sans text-xs">
          {/* Gateway Selection Mode */}
          <div className={`flex flex-col gap-1.5 pt-0.5 pb-1 border-b border-slate-100 ${!graphData ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-center text-xs gap-3">
              <span className="text-slate-700 font-semibold flex items-center gap-1 select-none">
                Gateway:
                <span className="relative group inline-block font-mono">
                  <span 
                    className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help"
                  >
                    ?
                  </span>
                  {/* Tooltip flotante al hacer hover en el icono ? */}
                  <div className="absolute bottom-full mb-1.5 left-0 -translate-x-6 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                    En modo <strong>Auto</strong>, el sistema selecciona el nodo de mayor centralidad (betweenness por defecto, fiel al paper) como Gateway. En modo <strong>Manual</strong> escribes su ID o lo seleccionas en el grafo. En modo <strong>Multi-gateway</strong> se particiona la red en k clústeres (clustering espectral NJW) con un gateway local por clúster.
                  </div>
                </span>
              </span>
              <div className="flex bg-slate-100 border border-slate-250 rounded p-0.5 text-[10px] font-semibold font-mono">
                <button
                  type="button"
                  disabled={!graphData || !!importedTopologyName}
                  onClick={() => {
                    updateParams({ gateway_mode: 'auto' });
                    setIsSelectingGateway(false);
                  }}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    params.gateway_mode === 'auto'
                      ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  disabled={!graphData || !!importedTopologyName}
                  onClick={() => updateParams({ gateway_mode: 'manual' })}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    params.gateway_mode === 'manual'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                  }`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  disabled={!graphData || !!importedTopologyName}
                  onClick={() => {
                    updateParams({ gateway_mode: 'multi-gateway' });
                    setIsSelectingGateway(false);
                  }}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    params.gateway_mode === 'multi-gateway'
                      ? 'bg-purple-600 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
                  }`}
                >
                  Multi-gateway
                </button>
              </div>
            </div>

            {!graphData && (
              <span className="text-[9px] text-amber-600 font-bold block">
                Genera la topología para configurar el gateway
              </span>
            )}

            {graphData && params.gateway_mode === 'manual' && (
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-100/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    ID Nodo Gateway:
                    <span className="relative group inline-block font-mono">
                      <span className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-pointer font-sans"
                            onClick={() => setIsSelectingGateway(!isSelectingGateway)}
                      >
                        🔍
                      </span>
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans w-48 text-left">
                        Haz clic para habilitar selección en el grafo directamente.
                      </div>
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-bold font-mono">N</span>
                    <input
                      type="number"
                      min="0"
                      max={params.N - 1}
                      disabled={!graphData || !!importedTopologyName}
                      value={params.selected_gateway === null || isNaN(params.selected_gateway) ? '' : params.selected_gateway}
                      onChange={(e) => {
                        const val = e.target.value;
                        const nodeId = val === '' ? NaN : parseInt(val);
                        
                        // Update selected gateway
                        updateParams({ selected_gateway: nodeId });
                        
                        // Also update the graph node roles locally if the ID is valid
                        if (!isNaN(nodeId) && nodeId >= 0 && nodeId < params.N && graphData) {
                          const nodeIdStr = nodeId.toString();
                          const targetNode = graphData.nodes.find(n => n.id === nodeIdStr);
                          const isTargetSensor = targetNode?.type === 'sensor';

                          const updatedNodes = graphData.nodes.map(node => {
                            let newType = node.type;
                            if (node.id === nodeIdStr) {
                              newType = 'gateway';
                            } else if (node.type === 'gateway') {
                              newType = isTargetSensor ? 'sensor' : 'normal';
                            }
                            return { ...node, type: newType };
                          });
                          setGraphData({ ...graphData, nodes: updatedNodes });
                        }
                      }}
                      className={`w-14 bg-white border text-center font-bold text-xs rounded p-0.5 focus:outline-none focus:ring-1 font-mono transition-colors ${
                        isGatewayInvalid
                          ? 'border-red-500 text-red-650 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-300 text-slate-800 focus:ring-[#0056b3] focus:border-[#0056b3] disabled:bg-slate-50 disabled:text-slate-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {graphData && params.gateway_mode === 'multi-gateway' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100/50">
                <span className="text-[9px] text-purple-750 bg-purple-50 border border-purple-200 rounded p-2 block leading-normal font-sans">
                  Particiona la red con clustering espectral NJW en <strong>k</strong> clústeres y designa un gateway local por clúster (port de mo_sp_pt2). Solo <strong>SP</strong> y <strong>MO</strong> están validados contra la referencia MATLAB para multi-gateway; ACO/Q-Learning/SARSA quedan deshabilitados en este modo.
                </span>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-semibold">Número de Gateways (k):</span>
                  <select
                    value={params.num_gateways}
                    onChange={(e) => updateParams({ num_gateways: parseInt(e.target.value) })}
                    className="w-24 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono"
                  >
                    <option value="1">1</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                  </select>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-semibold">Centralidad Local:</span>
                  <select
                    value={params.mg_centrality_method}
                    onChange={(e) => updateParams({ mg_centrality_method: e.target.value as SimParameters['mg_centrality_method'] })}
                    className="w-32 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 font-mono"
                  >
                    <option value="betweenness">Betweenness</option>
                    <option value="degree">Grado</option>
                    <option value="closeness">Closeness</option>
                    <option value="eigenvector">Eigenvector</option>
                  </select>
                </div>

                {routingMethod !== 'SP' && routingMethod !== 'MO' && (
                  <span className="text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded p-1.5 block">
                    El algoritmo "{routingMethod}" no está soportado en modo Multi-gateway. Cambia a SP o MO en el Paso 2.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2 mt-1.5 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-1.5 px-3 text-xs font-semibold rounded border border-slate-350 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* IMPORT TOPOLOGY MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 max-w-md w-full rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 relative font-sans">
            {/* Header strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0056b3]" />
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-[#0056b3]" />
                Importar Topología Guardada
              </h4>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 max-h-[300px] overflow-y-auto flex flex-col gap-2">
              {loadingTopologies ? (
                <div className="text-center text-slate-500 text-xs py-8">Cargando topologías...</div>
              ) : savedTopologies.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">No hay topologías guardadas en la base de datos.</div>
              ) : (
                savedTopologies.map((topo) => (
                  <div 
                    key={topo.id}
                    className="border border-slate-200 hover:border-[#0056b3] rounded p-3 flex justify-between items-center bg-slate-50/50 hover:bg-[#0056b3]/5 transition-all text-xs"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-800">{topo.name}</span>
                      <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                        <span>N={topo.N}</span>
                        <span>λ={topo.lambda_val}</span>
                        <span>Sensores={topo.sensors_count}</span>
                        <span>GW={topo.gateway} ({topo.gateway_mode})</span>
                      </div>
                      <span className="text-[9px] text-slate-450">{topo.timestamp}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTopology(topo)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#0056b3] hover:bg-[#003d73] text-white transition-colors cursor-pointer"
                      >
                        Cargar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTopology(topo.id, topo.name)}
                        className="p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-750 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                        title="Eliminar de la BD"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-350 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
