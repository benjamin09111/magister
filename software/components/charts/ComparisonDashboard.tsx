'use client';

import React from 'react';
import { useSimStore } from '@/lib/store';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { CheckCircle2, XCircle, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import DemandBoundChart from './DemandBoundChart';

export default function ComparisonDashboard() {
  const { compareResultsPayload, compareMethodsSelected, simStatus, isCompareMode } = useSimStore();

  if (!isCompareMode || simStatus !== 'completed' || !compareResultsPayload) {
    return null;
  }

  const { method_a: resA, method_b: resB } = compareResultsPayload;
  const nameA = compareMethodsSelected.methodA;
  const nameB = compareMethodsSelected.methodB;

  // Combine flow-level data for side-by-side charts
  const sensorData = resA.flows.map((flowA) => {
    const flowB = resB.flows.find((f) => f.sensorId === flowA.sensorId);
    const hopsA = flowA.path.length - 1;
    const hopsB = flowB ? flowB.path.length - 1 : 0;
    
    return {
      name: `N${flowA.sensorId}`,
      [`${nameA}_overlaps`]: flowA.overlaps,
      [`${nameB}_overlaps`]: flowB ? flowB.overlaps : 0,
      [`${nameA}_hops`]: hopsA,
      [`${nameB}_hops`]: hopsB,
    };
  });

  // Calculate improvement percentage
  const calcImprovement = (valA: number, valB: number, type: 'overlaps' | 'hops') => {
    if (valA === valB) return { text: 'Sin cambio', status: 'neutral' };
    
    if (type === 'overlaps') {
      if (valA === 0) return { text: `+${valB} solapes`, status: 'negative' };
      const pct = ((valA - valB) / valA) * 100;
      if (pct > 0) {
        return { text: `-${pct.toFixed(1)}% (Reducción)`, status: 'positive' };
      } else {
        return { text: `+${Math.abs(pct).toFixed(1)}% (Incremento)`, status: 'negative' };
      }
    } else {
      const diff = valA - valB;
      if (diff > 0) {
        return { text: `-${diff.toFixed(2)} saltos prom.`, status: 'positive' };
      } else {
        return { text: `+${Math.abs(diff).toFixed(2)} saltos prom.`, status: 'negative' };
      }
    }
  };

  const overlapsImprovement = calcImprovement(resA.totalOverlaps, resB.totalOverlaps, 'overlaps');
  const hopsImprovement = calcImprovement(resA.averageHops, resB.averageHops, 'hops');

  // Coloring rules based on method names
  const getColor = (method: string) => {
    if (method === 'MO') return '#2ca02c'; // Verde
    if (method === 'SP') return '#d62728'; // Rojo
    if (method === 'MO_ACO') return '#1f77b4'; // Azul
    return '#9467bd'; // Purpura / others
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Metrics Summary Table Card */}
      <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Resumen Comparativo: {nameA} vs {nameB}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-650 font-bold">
                <th className="py-2.5 px-3">Métrica Analizada</th>
                <th className="py-2.5 px-3 text-center" style={{ color: getColor(nameA) }}>
                  {nameA} (Método A)
                </th>
                <th className="py-2.5 px-3 text-center" style={{ color: getColor(nameB) }}>
                  {nameB} (Método B)
                </th>
                <th className="py-2.5 px-3 text-right">Comparación / Mejora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-mono">
              {/* Overlaps Row */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-sans font-semibold">Solapamientos Totales (Overlaps)</td>
                <td className="py-3 px-3 text-center font-bold text-slate-700">{resA.totalOverlaps}</td>
                <td className="py-3 px-3 text-center font-bold text-slate-700">{resB.totalOverlaps}</td>
                <td className="py-3 px-3 text-right">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                    overlapsImprovement.status === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : overlapsImprovement.status === 'negative'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {overlapsImprovement.status === 'positive' && <ArrowDown className="w-3.5 h-3.5 mr-0.5 inline" />}
                    {overlapsImprovement.status === 'negative' && <ArrowUp className="w-3.5 h-3.5 mr-0.5 inline" />}
                    {overlapsImprovement.text}
                  </span>
                </td>
              </tr>

              {/* Average Hops Row */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-sans font-semibold">Saltos Promedio por Ruta (Hops)</td>
                <td className="py-3 px-3 text-center font-semibold text-slate-700">{resA.averageHops.toFixed(2)}</td>
                <td className="py-3 px-3 text-center font-semibold text-slate-700">{resB.averageHops.toFixed(2)}</td>
                <td className="py-3 px-3 text-right">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                    hopsImprovement.status === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : hopsImprovement.status === 'negative'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {hopsImprovement.status === 'positive' && <ArrowDown className="w-3.5 h-3.5 mr-0.5 inline" />}
                    {hopsImprovement.status === 'negative' && <ArrowUp className="w-3.5 h-3.5 mr-0.5 inline" />}
                    {hopsImprovement.text}
                  </span>
                </td>
              </tr>

              {/* Schedulability Row */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-sans font-semibold">Programabilidad TSCH</td>
                <td className="py-3 px-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${
                    resA.isSchedulable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {resA.isSchedulable ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    {resA.isSchedulable ? 'PROGRAMABLE' : 'NO PROGRAMABLE'}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${
                    resB.isSchedulable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {resB.isSchedulable ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    {resB.isSchedulable ? 'PROGRAMABLE' : 'NO PROGRAMABLE'}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-sans font-bold text-slate-500 text-[10px]">
                  {resA.isSchedulable === resB.isSchedulable 
                    ? 'Mismo resultado' 
                    : resB.isSchedulable 
                    ? 'Mejora programabilidad' 
                    : 'Pérdida programabilidad'}
                </td>
              </tr>

              {/* Execution Time Row */}
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-sans font-semibold">Tiempo de Cómputo (CPU)</td>
                <td className="py-3 px-3 text-center text-slate-500">{(resA.executionTime ? resA.executionTime * 1000 : 0).toFixed(1)} ms</td>
                <td className="py-3 px-3 text-center text-slate-500">{(resB.executionTime ? resB.executionTime * 1000 : 0).toFixed(1)} ms</td>
                <td className="py-3 px-3 text-right font-sans text-slate-500 text-[10px]">
                  {(resA.executionTime && resB.executionTime)
                    ? (resA.executionTime > resB.executionTime 
                      ? `${(resA.executionTime / resB.executionTime).toFixed(1)}x más rápido` 
                      : `${(resB.executionTime / resA.executionTime).toFixed(1)}x más lento`)
                    : 'N/D'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side Charts Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Sensor Overlaps Chart */}
        <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            Solapamientos (Overlaps) por Sensor
          </h3>
          <div className="h-[230px] w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sensorData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar 
                  dataKey={`${nameA}_overlaps`} 
                  fill={getColor(nameA)} 
                  name={`${nameA} Overlaps`} 
                  radius={[3, 3, 0, 0]} 
                />
                <Bar 
                  dataKey={`${nameB}_overlaps`} 
                  fill={getColor(nameB)} 
                  name={`${nameB} Overlaps`} 
                  radius={[3, 3, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sensor Hops Chart */}
        <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            Largo de Ruta (Hops) por Sensor
          </h3>
          <div className="h-[230px] w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sensorData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar 
                  dataKey={`${nameA}_hops`} 
                  fill={getColor(nameA)} 
                  name={`${nameA} Hops`} 
                  radius={[3, 3, 0, 0]} 
                />
                <Bar 
                  dataKey={`${nameB}_hops`} 
                  fill={getColor(nameB)} 
                  name={`${nameB} Hops`} 
                  radius={[3, 3, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Demand Bound Function Curve for currently inspected compared method */}
      <div className="w-full mt-2">
        <DemandBoundChart />
      </div>
    </div>
  );
}
