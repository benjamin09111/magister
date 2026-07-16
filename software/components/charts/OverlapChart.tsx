'use client';

import React from 'react';
import { useSimStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function OverlapChart() {
  const { activeResult, routingMethod } = useSimStore();

  if (!activeResult) return null;

  const data = [
    {
      name: 'Colisiones (Solapamientos)',
      'Línea Base (SP)': activeResult.baseline.totalOverlaps,
      'Método Optimizado': activeResult.totalOverlaps,
    },
    {
      name: 'Salto Promedio (Hops)',
      'Línea Base (SP)': parseFloat(activeResult.baseline.averageHops.toFixed(2)),
      'Método Optimizado': parseFloat(activeResult.averageHops.toFixed(2)),
    }
  ];

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 mb-3">
        Comparativa de Enrutamiento ({routingMethod} vs SP)
      </h3>
      
      <div className="h-[200px] w-full font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
            />
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#1f2937',
                fontSize: 11,
                borderRadius: 4
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 10, paddingTop: 10, fontFamily: 'sans-serif' }}
            />
            {/* Red (#d62728) for literature baseline (SP) */}
            <Bar 
              dataKey="Línea Base (SP)" 
              fill="#d62728" 
              radius={[2, 2, 0, 0]} 
            />
            {/* Green (#2ca02c) for optimized method (MO/MO-ACO) */}
            <Bar 
              dataKey="Método Optimizado" 
              fill="#2ca02c" 
              radius={[2, 2, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200 pt-2.5">
        <div>
          Reducción de solapes:{' '}
          <span className="text-emerald-700 font-bold">
            {activeResult.baseline.totalOverlaps > 0
              ? `${Math.round(((activeResult.baseline.totalOverlaps - activeResult.totalOverlaps) / activeResult.baseline.totalOverlaps) * 100)}%`
              : '0%'}
          </span>
        </div>
        <div>
          Penalización de saltos (hops):{' '}
          <span className={activeResult.averageHops > activeResult.baseline.averageHops ? 'text-red-650 font-bold' : 'text-slate-550'}>
            {(activeResult.averageHops - activeResult.baseline.averageHops).toFixed(2)} hops
          </span>
        </div>
      </div>
    </div>
  );
}
