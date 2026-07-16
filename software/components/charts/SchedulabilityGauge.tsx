'use client';

import React from 'react';
import { useSimStore } from '@/lib/store';

export default function SchedulabilityGauge() {
  const { activeResult, params } = useSimStore();

  if (!activeResult) return null;

  const { contention, conflict, total_demand, slack } = activeResult.schedDetails;
  const H = params.H;

  const contentionPct = Math.min(100, (contention / H) * 100);
  const conflictPct = Math.min(100, (conflict / H) * 100);
  const remainingPct = Math.max(0, 100 - contentionPct - conflictPct);
  
  const isSchedulable = activeResult.isSchedulable;

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-700">
          Análisis de Programabilidad EDF
        </h3>
        
        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${
          isSchedulable 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {isSchedulable ? 'PROGRAMABLE' : 'NO PROGRAMABLE'}
        </span>
      </div>

      {/* Stacked capacity bar */}
      <div className="w-full bg-slate-100 border border-slate-200 rounded h-6 overflow-hidden flex mb-4 mt-2">
        {contentionPct > 0 && (
          <div 
            style={{ width: `${contentionPct}%` }} 
            className="bg-[#0056b3] hover:bg-[#003d73] transition-all flex items-center justify-center text-[10px] font-mono text-white"
            title={`Channel Contention: ${contention.toFixed(1)} slots`}
          >
            {contentionPct > 12 ? 'Contención' : ''}
          </div>
        )}
        {conflictPct > 0 && (
          <div 
            style={{ width: `${conflictPct}%` }} 
            className="bg-amber-500 hover:bg-amber-600 transition-all flex items-center justify-center text-[10px] font-mono text-slate-950"
            title={`Transmission Conflicts: ${conflict.toFixed(1)} slots`}
          >
            {conflictPct > 12 ? 'Conflictos' : ''}
          </div>
        )}
        {remainingPct > 0 && (
          <div 
            style={{ width: `${remainingPct}%` }} 
            className="bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center text-[10px] font-mono text-white"
            title={`Slack libre: ${slack.toFixed(1)} slots`}
          >
            {remainingPct > 12 ? 'Slack' : ''}
          </div>
        )}
      </div>

      {/* Breakdown Details */}
      <div className="flex flex-col gap-2.5 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 bg-[#0056b3] rounded" />
            Demanda por Contención:
          </span>
          <span className="font-mono text-slate-700 font-semibold">
            {contention.toFixed(1)} slots ({Math.round(contentionPct)}%)
          </span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
            Demanda por Conflictos:
          </span>
          <span className="font-mono text-slate-700 font-semibold">
            {conflict.toFixed(1)} slots ({Math.round(conflictPct)}%)
          </span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded" />
            Margen de Holgura (Slack):
          </span>
          <span className={`font-mono font-bold ${slack >= 0 ? 'text-emerald-750' : 'text-rose-650'}`}>
            {slack.toFixed(1)} slots ({Math.round(remainingPct)}%)
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-750">
          <span className="text-slate-600 font-medium">Total Demanda vs Capacidad H:</span>
          <span className="font-mono text-slate-800 font-bold">
            {total_demand.toFixed(1)} / {H} slots
          </span>
        </div>
      </div>
    </div>
  );
}
