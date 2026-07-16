'use client';

import React, { useEffect, useState } from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { Trash2, RotateCcw, Eye } from 'lucide-react';

export default function HistoryList() {
  const { history, setHistory, updateParams, setGraphData, setActiveResult, setSimStatus } = useSimStore();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/history');
      setHistory(data);
    } catch (e: any) {
      toast.error('Error al cargar historial: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetchApi(`/history/${id}`, { method: 'DELETE' });
      toast.success('Registro eliminado del historial');
      loadHistory();
    } catch (e: any) {
      toast.error('Error al eliminar registro: ' + e.message);
    }
  };

  const handleClearAll = () => {
    setShowConfirmModal(true);
  };

  const executeClearAll = async () => {
    try {
      await fetchApi('/history', { method: 'DELETE' });
      toast.success('Historial vaciado');
      setHistory([]);
    } catch (e: any) {
      toast.error('Error al vaciar historial: ' + e.message);
    }
  };

  const handleRestoreRun = (item: any) => {
    // 1. Restore simulation parameters
    updateParams({
      N: item.N,
      lambda: item.lambda_val,
      sensorsCount: item.sensors_count,
      k_max: item.parameters.k_max,
      m_fixed: item.channels,
      H: item.parameters.H,
      eta_min: item.parameters.eta_min,
      eta_max: item.parameters.eta_max,
      use_implicit_deadlines: item.parameters.use_implicit_deadlines,
      conflict_pair_mode: item.parameters.conflict_pair_mode,
      gateway_mode: item.parameters.gateway_mode,
      selected_gateway: item.parameters.selected_gateway
    });

    // 2. Restore active simulation results for visual dashboard inspection
    setActiveResult(item.results);
    setSimStatus('completed');
    
    // 3. Reconstruct graph nodes/edges payload for rendering
    if (item.parameters.edges) {
      const cytoscapeNodes = item.parameters.nodes.map((node: any) => ({
        id: node.data.id,
        label: node.data.label,
        type: node.data.type,
        betweenness: node.data.betweenness,
        degree: node.data.degree
      }));

      const cytoscapeEdges = item.parameters.edges.map((edge: any) => ({
        id: edge.data.id,
        source: edge.data.source,
        target: edge.data.target,
        weight: edge.data.weight
      }));

      setGraphData({ nodes: cytoscapeNodes, edges: cytoscapeEdges });
    }

    toast.success(`Resultados y topología de ejecución (${item.method}) restaurados`);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            Historial de Simulaciones
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registro de ejecuciones persistido en base de datos SQLite.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-[10px] text-red-700 hover:text-red-800 font-semibold px-2 py-1 rounded bg-red-50 border border-red-200 transition-colors"
          >
            Vaciar Todo
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-6 text-xs text-slate-500 font-mono">
          Cargando logs...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-300 rounded">
          No hay ejecuciones registradas en el historial.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Método</th>
                <th className="py-2 px-3 text-center">N</th>
                <th className="py-2 px-3 text-center">Solapamientos</th>
                <th className="py-2 px-3 text-center">Programabilidad</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                    {item.timestamp}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-blue-750">
                    {item.method}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {item.N}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-orange-600">
                    {item.total_overlaps}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      item.is_schedulable 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {item.is_schedulable ? 'OK' : 'FAIL'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleRestoreRun(item)}
                        title="Restaurar y visualizar"
                        className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-[#0056b3] hover:text-white transition-colors"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        title="Eliminar de historial"
                        className="p-1 rounded bg-slate-50 border border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-350 max-w-sm w-full rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 relative font-sans">
            {/* Red alert strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#d62728]" />
            
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>⚠️</span> Confirmar Acción
              </h4>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 text-xs text-slate-600 leading-normal">
              ¿Estás seguro de que deseas vaciar el historial completo? Esta acción eliminará permanentemente todos los registros simulados de la base de datos SQLite y no se puede deshacer.
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-350 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await executeClearAll();
                }}
                className="px-3 py-1.5 text-xs font-bold rounded bg-[#d62728] hover:bg-[#b91c1c] text-white transition-colors shadow-sm"
              >
                Sí, vaciar historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
