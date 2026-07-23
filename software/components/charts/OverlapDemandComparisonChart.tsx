'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useSimStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, Brush } from 'recharts';
import { AlertTriangle, CheckCircle2, Maximize2 } from 'lucide-react';

// Coloring rules consistent with ComparisonDashboard.tsx
const getColor = (method: string) => {
  if (method === 'MO') return '#2ca02c'; // Verde
  if (method === 'SP') return '#d62728'; // Rojo
  if (method === 'MO_ACO') return '#1f77b4'; // Azul
  return '#9467bd'; // Purpura / others
};

/**
 * Overlays method A's and method B's dbf(t) (demand) curves against the
 * SAME sbf(t) = t supply line, on the same plot. Addresses the professor's
 * feedback on the routing-comparison section: "en la comparacion de
 * resultados entre enrutamientos, seria ideal ver lo mismo que en [el
 * grafico sbf/dbf]... agregar visualmente el sbf/dbf le da mas cercania al
 * mundo real-time." Both curves come from /simulation/compare, which runs
 * A and B on the identical topology + flow set (same T/D/H), so they share
 * one x-axis and one supply line.
 */
export default function OverlapDemandComparisonChart() {
  const { compareResultsPayload, compareMethodsSelected } = useSimStore();

  const merged = useMemo(() => {
    if (!compareResultsPayload) return null;
    const { method_a: resA, method_b: resB } = compareResultsPayload;
    if (!resA.dbfCurves || !resB.dbfCurves) return null;

    const H = Math.max(resA.dbfCurves.length, resB.dbfCurves.length);
    const byT_B = new Map(resB.dbfCurves.map((p) => [p.t, p]));

    return Array.from({ length: H }, (_, i) => {
      const t = i + 1;
      const pa = resA.dbfCurves![i];
      const pb = byT_B.get(t);
      return {
        t,
        capacity: t,
        demandA: pa ? pa.demand : null,
        demandB: pb ? pb.demand : null,
      };
    });
  }, [compareResultsPayload]);

  if (!compareResultsPayload || !merged) return null;

  const { method_a: resA, method_b: resB } = compareResultsPayload;
  const nameA = compareMethodsSelected.methodA;
  const nameB = compareMethodsSelected.methodB;

  const failingRanges = (key: 'demandA' | 'demandB') => {
    const ranges: { start: number; end: number }[] = [];
    let inFailure = false;
    let start = -1;
    for (let i = 0; i < merged.length; i++) {
      const val = merged[i][key];
      const over = typeof val === 'number' && val > merged[i].capacity;
      if (over && !inFailure) {
        inFailure = true;
        start = merged[i].t;
      } else if (!over && inFailure) {
        inFailure = false;
        ranges.push({ start, end: merged[i - 1].t });
      }
    }
    if (inFailure) ranges.push({ start, end: merged[merged.length - 1].t });
    return ranges;
  };

  const rangesA = failingRanges('demandA');
  const rangesB = failingRanges('demandB');

  // Zoom window — same fix as DemandBoundChart for legibility when H is
  // large: auto-focus around the first overload of either method.
  const [brushRange, setBrushRange] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (merged.length === 0) {
      setBrushRange(null);
      return;
    }
    const firstFailIdx = merged.findIndex((pt) =>
      (typeof pt.demandA === 'number' && pt.demandA > pt.capacity) ||
      (typeof pt.demandB === 'number' && pt.demandB > pt.capacity)
    );
    if (firstFailIdx >= 0 && merged.length > 40) {
      const pad = Math.max(10, Math.round(merged.length * 0.08));
      setBrushRange({
        start: Math.max(0, firstFailIdx - pad),
        end: Math.min(merged.length - 1, firstFailIdx + pad),
      });
    } else {
      setBrushRange({ start: 0, end: merged.length - 1 });
    }
  }, [merged]);

  const isZoomedIn = !!brushRange && (brushRange.start > 0 || brushRange.end < merged.length - 1);

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            Oferta vs. Demanda — {nameA} vs {nameB} (superpuestos)
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Misma topología y mismo conjunto de flujos (T/D/H compartidos) para ambos métodos: comparación directa de dbf(t) contra sbf(t) = t.
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${
            resA.isSchedulable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {resA.isSchedulable ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            {nameA}: {resA.isSchedulable ? 'schedulable' : 'sobrecarga'}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${
            resB.isSchedulable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {resB.isSchedulable ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            {nameB}: {resB.isSchedulable ? 'schedulable' : 'sobrecarga'}
          </span>
          {isZoomedIn && (
            <button
              type="button"
              onClick={() => setBrushRange({ start: 0, end: merged.length - 1 })}
              title="Ver el hiperperíodo completo"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors"
            >
              <Maximize2 size={10} /> Ver todo H
            </button>
          )}
        </div>
      </div>

      <div className="h-[300px] w-full font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
              label={{ value: 'Demanda (slots)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#1f2937', fontSize: 10, borderRadius: 4 }}
              formatter={(value: any, name: any) => [value === null ? '-' : `${value} slots`, name]}
              labelFormatter={(label) => `Ventana t = ${label} slots`}
            />
            <Legend wrapperStyle={{ fontSize: 9, paddingTop: 12, fontFamily: 'sans-serif' }} />

            {rangesA.map((r, idx) => (
              <ReferenceArea key={`a-${idx}`} x1={r.start} x2={r.end} fill={getColor(nameA)} fillOpacity={0.10} stroke="none" />
            ))}
            {rangesB.map((r, idx) => (
              <ReferenceArea key={`b-${idx}`} x1={r.start} x2={r.end} fill={getColor(nameB)} fillOpacity={0.10} stroke="none" />
            ))}

            <Line type="monotone" dataKey="capacity" name="Oferta — sbf(t) = t" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} />
            <Line type="monotone" dataKey="demandA" name={`Demanda ${nameA} — dbf(t)`} stroke={getColor(nameA)} strokeWidth={2.2} dot={false} connectNulls />
            <Line type="monotone" dataKey="demandB" name={`Demanda ${nameB} — dbf(t)`} stroke={getColor(nameB)} strokeWidth={2.2} dot={false} connectNulls />

            {merged.length > 20 && brushRange && (
              <Brush
                dataKey="t"
                height={20}
                stroke="#0056b3"
                fill="#eff6ff"
                travellerWidth={8}
                startIndex={brushRange.start}
                endIndex={brushRange.end}
                onChange={(range: any) => {
                  if (typeof range?.startIndex === 'number' && typeof range?.endIndex === 'number') {
                    setBrushRange({ start: range.startIndex, end: range.endIndex });
                  }
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
