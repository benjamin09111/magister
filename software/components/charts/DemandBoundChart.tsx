'use client';

import React, { useMemo } from 'react';
import { useSimStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from 'recharts';

export default function DemandBoundChart() {
  const { activeResult, params, isCompareMode, compareResultsPayload, selectedCompareMethodView } = useSimStore();

  const data = useMemo(() => {
    // Si estamos en modo comparación, usar el payload adecuado
    let result = activeResult;
    if (isCompareMode && compareResultsPayload) {
      result = selectedCompareMethodView === 'A' 
        ? compareResultsPayload.method_a 
        : compareResultsPayload.method_b;
    }

    if (!result || !result.dbfCurves) return null;
    return result.dbfCurves;
  }, [activeResult, isCompareMode, compareResultsPayload, selectedCompareMethodView]);

  // Encontrar la primera ventana de fallo (t donde demanda > capacidad)
  const failingRanges = useMemo(() => {
    if (!data) return [];
    
    const ranges: { start: number; end: number }[] = [];
    let inFailure = false;
    let failureStart = -1;

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (pt.demand > pt.capacity) {
        if (!inFailure) {
          inFailure = true;
          failureStart = pt.t;
        }
      } else {
        if (inFailure) {
          inFailure = false;
          ranges.push({ start: failureStart, end: data[i - 1].t });
        }
      }
    }

    if (inFailure) {
      ranges.push({ start: failureStart, end: data[data.length - 1].t });
    }

    return ranges;
  }, [data]);

  if (!data) return null;

  const worstSlack = data.reduce((acc: number, val: any) => {
    const slack = val.capacity - val.demand;
    return slack < acc ? slack : acc;
  }, Infinity);

  const isSchedulable = worstSlack >= 0;

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm col-span-1 md:col-span-2">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            Función de Demanda Acotada (Demand-Bound Function)
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Evaluación temporal de schedulability en ventanas de tiempo de tamaño t (1 a {params.H} slots).
          </p>
        </div>
        
        <div className="flex gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${
            isSchedulable 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {isSchedulable ? '✓ SISTEMA SCHEDULABLE' : '✗ SOBRECARGA DETECTADA'}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-250 bg-slate-50 text-[10px] font-mono text-slate-655 font-bold">
            Worst Slack: {worstSlack.toFixed(1)} slots
          </span>
        </div>
      </div>

      <div className="h-[250px] w-full font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="t" 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              label={{ value: 'Tamaño de ventana (t)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
            />
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              label={{ value: 'Demanda de tiempo (slots)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#1f2937',
                fontSize: 10,
                borderRadius: 4
              }}
              formatter={(value: any, name: any) => [`${value} slots`, name]}
              labelFormatter={(label) => `Ventana t = ${label} slots`}
            />
            <Legend 
              wrapperStyle={{ fontSize: 9, paddingTop: 12, fontFamily: 'sans-serif' }}
            />
            
            {/* Failures highlight areas */}
            {failingRanges.map((range, idx) => (
              <ReferenceArea
                key={idx}
                x1={range.start}
                x2={range.end}
                fill="#ef4444"
                fillOpacity={0.12}
                stroke="none"
              />
            ))}

            {/* Reference diagonal capacity limit */}
            <Line 
              type="monotone"
              dataKey="capacity" 
              name="Capacidad Límite t" 
              stroke="#64748b" 
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />

            {/* Contention curve */}
            <Line 
              type="monotone"
              dataKey="contention" 
              name="Contención (DBF / m)" 
              stroke="#0056b3" 
              strokeWidth={1.5}
              dot={false}
            />

            {/* Conflict curve */}
            <Line 
              type="monotone"
              dataKey="conflict" 
              name="Conflictos de Ruta" 
              stroke="#f59e0b" 
              strokeWidth={1.5}
              dot={false}
            />

            {/* Total Demand curve */}
            <Line 
              type="monotone"
              dataKey="demand" 
              name="Demanda Total" 
              stroke="#6b21a8" 
              strokeWidth={2.2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-3 text-[10.5px] text-slate-600 leading-normal">
        <span className="font-bold text-slate-700 block mb-1">Análisis de la Condición EDF:</span>
        <p className="mb-2">
          La condición necesaria y suficiente para que la red sea programable es que la <strong>Demanda Total</strong> en cualquier ventana temporal 
          <code className="bg-slate-200 px-1 rounded text-slate-700 mx-1">t</code> sea menor o igual al tamaño físico del intervalo de tiempo 
          (<code className="bg-slate-200 px-1 rounded text-slate-700 mx-1">Capacity = t</code>).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200 pt-2 text-[10px]">
          <div>
            <span className="font-bold text-blue-700 flex items-center gap-1">
              <span className="w-2 h-2 bg-[#0056b3] rounded-full inline-block" />
              Contención de canalización (DBF/m)
            </span>
            Representa la carga de tráfico compartida de los flujos de sensores dividida por el número de canales disponibles.
          </div>
          <div>
            <span className="font-bold text-amber-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" />
              Interferencia espacial (Conflictos)
            </span>
            Representa las limitaciones debidas a los enlaces compartidos y las restricciones de que un nodo no puede transmitir y recibir simultáneamente.
          </div>
        </div>
      </div>
    </div>
  );
}
