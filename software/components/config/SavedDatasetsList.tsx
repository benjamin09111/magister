'use client';

import React, { useEffect, useState } from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { Trash2, FolderOpen, AlertTriangle, X } from 'lucide-react';
import { SavedDatasetSummary } from '@/lib/types';

const PARAM_LABEL: Record<string, string> = {
  n: 'Número de Flujos (n)',
  N: 'Nodos (N)',
  lambda: 'Densidad (λ)',
  channels: 'Canales (m)',
};

interface Props {
  onLoadDataset?: () => void;
}

export default function SavedDatasetsList({ onLoadDataset }: Props) {
  const { setSweepResult, setSweepStatus } = useSimStore();
  const [datasets, setDatasets] = useState<SavedDatasetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/datasets');
      setDatasets(data);
    } catch (e: any) {
      toast.error('Error al cargar datasets: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      const detail = await fetchApi(`/datasets/${id}`);
      setSweepResult(detail);
      setSweepStatus('completed');
      toast.success(`Dataset "${detail.name}" cargado — gráficos regenerados sin re-simular`);
      onLoadDataset?.();
    } catch (e: any) {
      toast.error('Error al cargar el dataset: ' + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchApi(`/datasets/${id}`, { method: 'DELETE' });
      toast.success('Dataset eliminado');
      setConfirmDeleteId(null);
      loadDatasets();
    } catch (e: any) {
      toast.error('Error al eliminar el dataset: ' + e.message);
    }
  };

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
      <div className="mb-4 pb-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700">
          Datasets de Investigación Guardados
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Resultados de barridos por lotes (Monte Carlo) persistidos en SQLite. Cárgalos para regenerar los gráficos resumen sin volver a simular.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-6 text-xs text-slate-500 font-mono">
          Cargando datasets...
        </div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-300 rounded">
          No hay datasets guardados. Ejecuta un barrido en la pestaña "Investigación" con la opción "Guardar dataset" activada.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                <th className="py-2 px-3">Nombre</th>
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Variable Barrida</th>
                <th className="py-2 px-3 text-center">Réplicas</th>
                <th className="py-2 px-3 text-center">Seed Base</th>
                <th className="py-2 px-3">Métodos</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50 transition-colors text-slate-700">
                  <td className="py-2.5 px-3 font-semibold text-blue-750">{ds.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">{ds.timestamp}</td>
                  <td className="py-2.5 px-3 font-mono">{PARAM_LABEL[ds.sweep_param] || ds.sweep_param}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">{ds.replicas}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{ds.base_seed}</td>
                  <td className="py-2.5 px-3 font-mono text-[10px]">{ds.methods.join(', ')}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => handleLoad(ds.id)}
                        disabled={loadingId === ds.id}
                        title="Cargar y re-graficar sin re-simular"
                        className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-[#0056b3] hover:text-white transition-colors disabled:opacity-50"
                      >
                        <FolderOpen size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(ds.id)}
                        title="Eliminar dataset"
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

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-350 max-w-sm w-full rounded shadow-xl overflow-hidden relative font-sans">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#d62728]" />
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-[#d62728]" /> Confirmar Eliminación
              </h4>
              <button onClick={() => setConfirmDeleteId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-600 leading-normal">
              ¿Eliminar permanentemente este dataset? Esta acción no se puede deshacer.
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-350 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-3 py-1.5 text-xs font-bold rounded bg-[#d62728] hover:bg-[#b91c1c] text-white transition-colors shadow-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
