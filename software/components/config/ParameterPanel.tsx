'use client';

import React from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ParameterPanel() {
  const { 
    params, 
    updateParams, 
    resetParams, 
    setGraphData, 
    setSimStatus, 
    setActiveResult, 
    setSelectedSensor,
    routingMethod,
    setRoutingMethod
  } = useSimStore();

  const handleGenerateTopology = async () => {
    setSimStatus('idle');
    setActiveResult(null);
    setSelectedSensor(null);
    
    try {
      const topoConfig = {
        N: params.N,
        lambda_val: params.lambda,
        selected_gateway: params.selected_gateway,
        gateway_mode: params.gateway_mode,
      };

      const result = await fetchApi('/topology/generate', {
        method: 'POST',
        body: JSON.stringify(topoConfig),
      });

      // Update store with new graph data
      const cytoscapeNodes = result.nodes.map((node: any) => ({
        id: node.data.id,
        label: node.data.label,
        type: node.data.type,
        betweenness: node.data.betweenness,
        degree: node.data.degree
      }));

      const cytoscapeEdges = result.edges.map((edge: any) => ({
        id: edge.data.id,
        source: edge.data.source,
        target: edge.data.target,
        weight: edge.data.weight
      }));

      setGraphData({ nodes: cytoscapeNodes, edges: cytoscapeEdges });
      
      // Update selected gateway in store parameter in case it was chosen automatically
      updateParams({ 
        selected_gateway: result.gateway,
        sensorsCount: result.sensors.length
      });
      
      toast.success('Topología y sensores generados correctamente');
    } catch (e: any) {
      toast.error('Error al generar la topología: ' + e.message);
    }
  };

  return (
    <div className="bg-white border border-slate-350 rounded p-4 shadow-sm font-mono">
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-200">
        Parámetros de Red
      </h3>

      <div className="flex flex-col gap-2.5">
        {/* Nodos N */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Nodos de Red (N):</span>
          <input
            type="number"
            min="10"
            max="100"
            value={params.N}
            onChange={(e) => updateParams({ N: Math.max(10, Math.min(100, parseInt(e.target.value) || 10)) })}
            className="w-20 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold text-center focus:ring-1 focus:ring-[#0056b3] font-mono"
          />
        </div>

        {/* Lambda Density */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Densidad (λ):</span>
          <select
            value={params.lambda}
            onChange={(e) => updateParams({ lambda: parseInt(e.target.value) })}
            className="w-28 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:ring-1 focus:ring-[#0056b3] font-mono"
          >
            <option value="4">4 (Disperso)</option>
            <option value="8">8 (Medio)</option>
            <option value="12">12 (Denso)</option>
          </select>
        </div>

        {/* Canales m */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Canales TSCH (m):</span>
          <input
            type="number"
            min="2"
            max="16"
            value={params.m_fixed}
            onChange={(e) => updateParams({ m_fixed: Math.max(2, Math.min(16, parseInt(e.target.value) || 2)) })}
            className="w-20 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold text-center focus:ring-1 focus:ring-[#0056b3] font-mono"
          />
        </div>

        {/* Hyperperiodo H */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Hiperperíodo (H):</span>
          <select
            value={params.H}
            onChange={(e) => updateParams({ H: parseInt(e.target.value) })}
            className="w-28 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 font-semibold focus:ring-1 focus:ring-[#0056b3] font-mono"
          >
            <option value="64">64 slots</option>
            <option value="128">128 slots</option>
            <option value="256">256 slots</option>
          </select>
        </div>

        {/* Rango Periodos (Eta) */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Períodos (eta):</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max={params.eta_max}
              value={params.eta_min}
              onChange={(e) => updateParams({ eta_min: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-10 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 text-center font-mono font-semibold"
              title="eta_min"
            />
            <span className="text-slate-400 font-semibold text-[10px]">a</span>
            <input
              type="number"
              min={params.eta_min}
              max="10"
              value={params.eta_max}
              onChange={(e) => updateParams({ eta_max: Math.max(params.eta_min, parseInt(e.target.value) || 2) })}
              className="w-10 bg-white border border-slate-300 text-slate-800 text-xs rounded p-1 text-center font-mono font-semibold"
              title="eta_max"
            />
          </div>
        </div>

        {/* Algoritmo de Enrutamiento */}
        <div className="flex justify-between items-center text-xs gap-3 pt-2 border-t border-slate-150">
          <span className="text-slate-655 font-semibold">Enrutamiento:</span>
          <select
            value={routingMethod}
            onChange={(e) => setRoutingMethod(e.target.value as any)}
            className="w-40 bg-white border border-slate-300 text-[#0056b3] text-xs rounded p-1 font-bold focus:ring-1 focus:ring-[#0056b3] font-mono"
          >
            <option value="MO">Minimal Overlap (MO)</option>
            <option value="SP">Shortest Path (SP)</option>
            <option value="MO_ACO">MO + ACO</option>
            <option value="QLearning">Q-Learning</option>
            <option value="SARSA">SARSA</option>
          </select>
        </div>

        {/* Gateway Selection Mode */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Gateway:</span>
          <div className="flex bg-slate-100 border border-slate-250 rounded p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => updateParams({ gateway_mode: 'auto' })}
              className={`px-2 py-0.5 rounded transition-all ${
                params.gateway_mode === 'auto'
                  ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => updateParams({ gateway_mode: 'manual' })}
              className={`px-2 py-0.5 rounded transition-all ${
                params.gateway_mode === 'manual'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Toggle implicit deadline */}
        <div className="flex justify-between items-center text-xs gap-3">
          <span className="text-slate-655 font-semibold">Deadlines Implícitos:</span>
          <input
            type="checkbox"
            checked={params.use_implicit_deadlines}
            onChange={(e) => updateParams({ use_implicit_deadlines: e.target.checked })}
            className="rounded bg-white border-slate-300 text-[#0056b3] focus:ring-0 cursor-pointer w-4 h-4"
          />
        </div>

        {/* Conflict mode read-only with question tooltip */}
        <div className="flex justify-between items-center text-xs gap-3 relative group pb-1">
          <span className="text-slate-655 font-semibold flex items-center gap-1 select-none">
            Modo Conflictos:
            <span 
              className="w-3.5 h-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 rounded-full flex items-center justify-center text-[9px] font-bold cursor-help"
            >
              ?
            </span>
          </span>
          <span className="font-mono text-slate-700 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] select-all">
            paper_double
          </span>
          
          {/* Tooltip flotante al hacer hover en el icono ? */}
          <div className="absolute bottom-full mb-1.5 left-0 right-0 hidden group-hover:block bg-slate-800 text-white text-[9px] p-2.5 rounded border border-slate-700 shadow-xl z-30 leading-normal font-sans">
            El cálculo de pares de conflictos implementa de forma permanente el modo <strong>paper_double</strong> de la investigación, penalizando transmisiones concurrentes en el vecindario del gateway.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-1.5 pt-2.5 border-t border-slate-200">
          <button
            type="button"
            onClick={resetParams}
            className="py-1.5 text-xs font-semibold rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-650 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleGenerateTopology}
            className="col-span-2 py-1.5 text-xs font-bold rounded bg-[#02529c] hover:bg-[#003d73] text-white transition-all shadow-sm"
          >
            Generar Red
          </button>
        </div>
      </div>
    </div>
  );
}
