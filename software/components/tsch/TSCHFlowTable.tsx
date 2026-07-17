'use client';

import React from 'react';
import { useSimStore } from '@/lib/store';

interface TSCHFlowTableProps {
  forceMethodView?: 'A' | 'B';
}

export default function TSCHFlowTable({ forceMethodView }: TSCHFlowTableProps = {}) {
  const { 
    activeResult: storeActiveResult, 
    selectedSensor, 
    setSelectedSensor,
    isCompareMode,
    compareResultsPayload,
    selectedCompareMethodView
  } = useSimStore();

  const activeResult = React.useMemo(() => {
    if (isCompareMode && compareResultsPayload) {
      const view = forceMethodView || selectedCompareMethodView;
      return view === 'A' 
        ? compareResultsPayload.method_a 
        : compareResultsPayload.method_b;
    }
    return storeActiveResult;
  }, [isCompareMode, compareResultsPayload, selectedCompareMethodView, forceMethodView, storeActiveResult]);

  if (!activeResult || !activeResult.flows) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-350 rounded p-4 shadow-sm mt-3 flex flex-col max-h-[190px]">
      <h3 className="text-xs font-bold text-slate-700 mb-2">
        Detalle de Flujos de Sensores
      </h3>
      
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
              <th className="py-2.5 px-3">Sensor</th>
              <th className="py-2.5 px-3">Ruta de Saltos</th>
              <th className="py-2.5 px-3 text-center">Periodo (T_i)</th>
              <th className="py-2.5 px-3 text-center">Límite (D_i)</th>
              <th className="py-2.5 px-3 text-center">Solapamientos</th>
              <th className="py-2.5 px-3 text-center">Estado</th>
              <th className="py-2.5 px-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {activeResult.flows.map((flow) => {
              const isSelected = selectedSensor === flow.sensorId;
              return (
                <tr 
                  key={flow.sensorId} 
                  className={`hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-[#0056b3]/5 text-[#0056b3]' : 'text-slate-700'
                  }`}
                >
                  <td className="py-3 px-3 font-semibold font-mono">
                    N{flow.sensorId}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    <div className="flex items-center gap-1 flex-wrap">
                      {flow.path.map((node, nIdx) => (
                        <React.Fragment key={nIdx}>
                          <span className={nIdx === 0 ? 'text-[#1f77b4] font-bold' : (nIdx === flow.path.length - 1 ? 'text-[#d62728] font-bold' : '')}>
                            {nIdx === flow.path.length - 1 ? 'GW' : `N${node}`}
                          </span>
                          {nIdx < flow.path.length - 1 && <span className="text-slate-400">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {flow.period} slots
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {flow.deadline} slots
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-orange-650">
                    {flow.overlaps}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      flow.isSchedulable 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {flow.isSchedulable ? 'PROGRAMADO' : 'FALLIDO'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedSensor(isSelected ? null : flow.sensorId)}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                        isSelected 
                          ? 'bg-[#0056b3] text-white hover:bg-[#003d73]' 
                          : 'bg-slate-100 border border-slate-350 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Ocultar Ruta' : 'Ver Ruta'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
