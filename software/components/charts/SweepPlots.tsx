'use client';

import React, { useState } from 'react';
import { useSimStore } from '@/lib/store';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Download, Table, BarChart3, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export default function SweepPlots() {
  const { sweepResult, sweepParams, sweepStatus } = useSimStore();
  const [activeSubTab, setActiveSubTab] = useState<'interactive' | 'paper' | 'data'>('interactive');

  if (sweepStatus === 'running') {
    return (
      <div className="bg-white border border-slate-350 rounded p-12 shadow-sm flex flex-col items-center justify-center min-h-[450px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0056b3] rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-bold text-slate-800 animate-pulse">Ejecutando Simulaciones por Lotes...</h3>
        <p className="text-xs text-slate-500 max-w-sm text-center mt-2">
          Generando topologías aleatorias, corriendo algoritmos de enrutamiento y planificando timeslots en segundo plano. Esto puede tomar hasta un minuto dependiendo del número de réplicas y métodos seleccionados.
        </p>
      </div>
    );
  }

  if (!sweepResult) {
    return (
      <div className="bg-white border border-slate-350 rounded p-12 shadow-sm flex flex-col items-center justify-center min-h-[450px] text-center">
        <div className="w-16 h-16 bg-slate-50 border border-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No hay datos de barrido</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Configura los parámetros en el panel izquierdo y haz clic en "Ejecutar Barrido" para comenzar la simulación paramétrica y ver los gráficos.
        </p>
      </div>
    );
  }

  const { results, sweep_param, plotUrl } = sweepResult;

  // Flatten metrics for Recharts
  const chartData = results.map((pt) => {
    const item: any = { name: pt.value };
    Object.keys(pt.metrics).forEach((m) => {
      item[`${m}_overlaps`] = pt.metrics[m].overlaps;
      item[`${m}_hops`] = pt.metrics[m].hops;
      item[`${m}_schedulability`] = pt.metrics[m].schedulability;
    });
    return item;
  });

  const methodsList = Object.keys(results[0]?.metrics || {});

  // Methods metadata for coloring and formatting
  const methodMeta: Record<string, { color: string; label: string }> = {
    SP: { color: '#d62728', label: 'Dijkstra (SP)' },
    MO: { color: '#2ca02c', label: 'Minimal Overlap (MO)' },
    MO_ACO: { color: '#1f77b4', label: 'MO + ACO' },
    QLearning: { color: '#9467bd', label: 'Q-Learning' },
    SARSA: { color: '#ff7f0e', label: 'SARSA' }
  };

  const getMethodMeta = (m: string) => {
    return methodMeta[m] || { color: '#64748b', label: m };
  };

  const paramLabelMap: Record<string, string> = {
    N: 'Nodos / Flujos (N)',
    lambda: 'Densidad (Lambda)',
    channels: 'Canales TSCH (m)'
  };
  const axisLabel = paramLabelMap[sweep_param] || sweep_param;

  // Download raw aggregate data as CSV
  const handleDownloadCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `EjeX_Valor_${sweep_param},Metodo,Solapamientos_Promedio,Saltos_Promedio,Programabilidad_Pct\n`;

    results.forEach((pt) => {
      Object.keys(pt.metrics).forEach((m) => {
        const metrics = pt.metrics[m];
        csvContent += `${pt.value},${m},${metrics.overlaps},${metrics.hops},${metrics.schedulability}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sweep_results_${sweep_param}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-350 rounded shadow-sm flex flex-col min-h-[450px]">
      {/* Tab bar header */}
      <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200 px-5 py-3 rounded-t">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            Resultados del Barrido Paramétrico
          </h3>
          <p className="text-[10px] text-slate-500">
            Variable: {axisLabel} • Réplicas: {sweepParams.replicas} por punto
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-slate-200/60 border border-slate-300 rounded p-0.5 text-[10px] font-semibold">
          <button
            onClick={() => setActiveSubTab('interactive')}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-all ${
              activeSubTab === 'interactive'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <BarChart3 size={11} />
            Gráficos Interactivos
          </button>
          <button
            onClick={() => setActiveSubTab('paper')}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-all ${
              activeSubTab === 'paper'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <ImageIcon size={11} />
            Gráfico de Paper (Matplotlib)
          </button>
          <button
            onClick={() => setActiveSubTab('data')}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-all ${
              activeSubTab === 'data'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Table size={11} />
            Tabla de Datos
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Interactive Charts Subtab */}
        {activeSubTab === 'interactive' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Overlaps Chart */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Solapamientos Promedio</h4>
                <div className="h-[200px] w-full font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={9} />
                      <YAxis stroke="#475569" fontSize={9} domain={[0, 'auto']} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {methodsList.map((m) => {
                        const meta = getMethodMeta(m);
                        return (
                          <Line
                            key={m}
                            type="monotone"
                            dataKey={`${m}_overlaps`}
                            stroke={meta.color}
                            name={meta.label}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hops Chart */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Saltos Promedio (Hops)</h4>
                <div className="h-[200px] w-full font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={9} />
                      <YAxis stroke="#475569" fontSize={9} domain={[0, 'auto']} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {methodsList.map((m) => {
                        const meta = getMethodMeta(m);
                        return (
                          <Line
                            key={m}
                            type="monotone"
                            dataKey={`${m}_hops`}
                            stroke={meta.color}
                            name={meta.label}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Schedulability Rate Chart */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Programabilidad Exitosa (%)</h4>
                <div className="h-[200px] w-full font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={9} />
                      <YAxis stroke="#475569" fontSize={9} domain={[0, 100]} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {methodsList.map((m) => {
                        const meta = getMethodMeta(m);
                        return (
                          <Line
                            key={m}
                            type="monotone"
                            dataKey={`${m}_schedulability`}
                            stroke={meta.color}
                            name={meta.label}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 italic block text-center leading-normal">
              * Gráficos interactivos de promedios ponderados. Hover para valores exactos.
            </span>
          </div>
        )}

        {/* Publication Figure Subtab */}
        {activeSubTab === 'paper' && (
          <div className="flex flex-col items-center justify-center gap-4 flex-1">
            {plotUrl ? (
              <div className="flex flex-col items-center max-w-4xl border border-slate-200 bg-slate-55 shadow-sm p-4 rounded">
                {/* Image render with unique stamp to bypass caching */}
                <img 
                  src={`${plotUrl}?t=${new Date().getTime()}`} 
                  alt="Gráfico de Paper Matplotlib" 
                  className="max-h-[350px] w-auto border border-slate-300 shadow-inner"
                />
                
                <div className="flex justify-between items-center w-full mt-4 bg-slate-50 border border-slate-200 rounded p-3 text-[11px] text-slate-600 gap-6">
                  <div>
                    <span className="font-bold text-slate-800 block">Gráfico Guardado Correctamente</span>
                    Este PNG se guardó en alta resolución (300 DPI) en la raíz del proyecto en: 
                    <code className="bg-slate-200 px-1 rounded mx-1 font-semibold text-slate-700">figures_phi/sweep_plot.png</code>.
                  </div>
                  <a
                    href={plotUrl}
                    download="figures_phi_sweep_plot.png"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0056b3] hover:bg-[#003d73] text-white rounded font-bold text-[10px] whitespace-nowrap"
                  >
                    <Download size={11} />
                    Guardar Imagen
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Error al localizar la figura generada por Matplotlib.</div>
            )}
          </div>
        )}

        {/* Tabular Data Subtab */}
        {activeSubTab === 'data' && (
          <div className="flex flex-col flex-1 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">Métricas Detalladas</span>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold text-[10px] transition-all"
              >
                <Download size={11} />
                Exportar CSV
              </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-650 font-bold bg-slate-100/80">
                    <th className="py-2.5 px-4 font-sans">Valor ({sweep_param})</th>
                    <th className="py-2.5 px-4 font-sans">Algoritmo</th>
                    <th className="py-2.5 px-4 text-center">Solapamientos (Promedio)</th>
                    <th className="py-2.5 px-4 text-center">Saltos (Promedio)</th>
                    <th className="py-2.5 px-4 text-center">Programabilidad (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-750">
                  {results.map((pt, idx) => {
                    const methods = Object.keys(pt.metrics);
                    return methods.map((m, mIdx) => (
                      <tr key={`${idx}-${mIdx}`} className="hover:bg-slate-50 transition-colors">
                        {mIdx === 0 && (
                          <td 
                            rowSpan={methods.length} 
                            className="py-2 px-4 border-r border-slate-250/75 bg-slate-50 font-bold text-slate-900 font-sans text-center"
                          >
                            {pt.value}
                          </td>
                        )}
                        <td className="py-2 px-4 border-r border-slate-200 text-slate-800 font-semibold">
                          {m}
                        </td>
                        <td className="py-2 px-4 text-center font-bold text-orange-600">
                          {pt.metrics[m].overlaps}
                        </td>
                        <td className="py-2 px-4 text-center text-slate-700">
                          {pt.metrics[m].hops}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            pt.metrics[m].schedulability > 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : pt.metrics[m].schedulability > 30
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {pt.metrics[m].schedulability}%
                          </span>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
