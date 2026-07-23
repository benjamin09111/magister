'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSimStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, Brush } from 'recharts';
import { Play, Pause, RotateCcw, ZoomIn, Maximize2 } from 'lucide-react';
import { DbfCurvePoint } from '@/lib/types';

export default function DemandBoundChart() {
  const { activeResult, params, isCompareMode, compareResultsPayload, selectedCompareMethodView } = useSimStore();

  const result = useMemo(() => {
    if (isCompareMode && compareResultsPayload) {
      return selectedCompareMethodView === 'A'
        ? compareResultsPayload.method_a
        : compareResultsPayload.method_b;
    }
    return activeResult;
  }, [activeResult, isCompareMode, compareResultsPayload, selectedCompareMethodView]);

  const incremental = result?.incrementalDbf;
  const totalFlows = incremental?.length ?? 0;

  // k = number of flows currently "added" to the chart (1..totalFlows).
  // Defaults to the full set, i.e. the same view as before this feature existed.
  const [step, setStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset the scrubber to the full flow set whenever a new result arrives.
    setStep(totalFlows > 0 ? totalFlows : 1);
    setIsPlaying(false);
  }, [result, totalFlows]);

  useEffect(() => {
    if (isPlaying && totalFlows > 0) {
      intervalRef.current = setInterval(() => {
        setStep((prev) => {
          if (prev >= totalFlows) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalFlows]);

  const data: DbfCurvePoint[] | null = useMemo(() => {
    if (incremental && incremental.length > 0) {
      const point = incremental[Math.min(step, incremental.length) - 1];
      return point ? point.curves : null;
    }
    // Fallback for older results computed before this field existed.
    return result?.dbfCurves ?? null;
  }, [incremental, step, result]);

  // First k (number of flows) at which the system stops being schedulable.
  const criticalFlowIndex = useMemo(() => {
    if (!incremental) return null;
    const firstFail = incremental.find((pt) => !pt.isSchedulable);
    return firstFail ? firstFail.numFlows : null;
  }, [incremental]);

  const currentPointSummary = incremental ? incremental[Math.min(step, incremental.length) - 1] : null;

  // Encontrar la primera ventana de fallo (t donde demanda > capacidad = sbf)
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

  // Zoom window (x-axis index range) — the professor's feedback flagged the
  // full-hyperperiod chart as "muy alargada" / illegible when H is large.
  // Rather than always rendering all H points compressed into one width, we
  // auto-focus the visible window around the first overload (if any) with
  // padding, and let the user drag the brush below to explore the rest of
  // the hyperperiod. "Ver hiperperíodo completo" resets to the full range.
  const [brushRange, setBrushRange] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) {
      setBrushRange(null);
      return;
    }
    const firstFailIdx = data.findIndex((pt) => pt.demand > pt.capacity);
    if (firstFailIdx >= 0 && data.length > 40) {
      const pad = Math.max(10, Math.round(data.length * 0.08));
      setBrushRange({
        start: Math.max(0, firstFailIdx - pad),
        end: Math.min(data.length - 1, firstFailIdx + pad),
      });
    } else {
      setBrushRange({ start: 0, end: data.length - 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data === null ? null : data.length, step]);

  if (!data) return null;

  const worstSlack = data.reduce((acc: number, val: any) => {
    const slack = val.capacity - val.demand;
    return slack < acc ? slack : acc;
  }, Infinity);

  const isSchedulable = currentPointSummary ? currentPointSummary.isSchedulable : worstSlack >= 0;
  const isZoomedIn = !!brushRange && (brushRange.start > 0 || brushRange.end < data.length - 1);

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm col-span-1 md:col-span-2">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            Oferta vs. Demanda (sbf vs. dbf)
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Evaluación temporal de schedulability en el hiperperíodo completo (t = 1 a {result?.H ?? params.H} slots).
            Usa la barra de zoom bajo el gráfico para inspeccionar de cerca cualquier tramo.
          </p>
        </div>

        <div className="flex gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${
            isSchedulable
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {isSchedulable ? 'SISTEMA SCHEDULABLE' : 'SOBRECARGA: dbf(t) > sbf(t)'}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-250 bg-slate-50 text-[10px] font-mono text-slate-600 font-bold">
            Worst Slack: {worstSlack.toFixed(1)} slots
          </span>
          {isZoomedIn ? (
            <button
              type="button"
              onClick={() => setBrushRange({ start: 0, end: data.length - 1 })}
              title="Ver el hiperperíodo completo"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors"
            >
              <Maximize2 size={10} /> Ver todo H
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-400" title="Arrastra la barra bajo el gráfico para hacer zoom">
              <ZoomIn size={10} /> zoom con la barra inferior
            </span>
          )}
        </div>
      </div>

      {/* Incremental flow-by-flow playback controls */}
      {incremental && incremental.length > 0 && (
        <div className="mb-3 bg-slate-50 border border-slate-200 rounded p-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (step >= totalFlows) setStep(1);
                setIsPlaying((p) => !p);
              }}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded bg-[#02529c] hover:bg-[#003d73] text-white transition-colors"
              title={isPlaying ? 'Pausar' : 'Reproducir: agregar flujos uno a uno'}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={() => { setIsPlaying(false); setStep(1); }}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
              title="Reiniciar"
            >
              <RotateCcw size={12} />
            </button>
            <input
              type="range"
              min={1}
              max={totalFlows}
              value={step}
              onChange={(e) => { setIsPlaying(false); setStep(parseInt(e.target.value)); }}
              className="flex-1 accent-[#0056b3]"
            />
            <span className="shrink-0 text-[10px] font-mono font-bold text-slate-700 w-24 text-right">
              {step} / {totalFlows} flujos
            </span>
          </div>
          <div className="flex justify-between items-center mt-1.5 text-[10px] font-mono">
            <span className="text-slate-500">
              Ω acumulado: <strong className="text-slate-700">{currentPointSummary?.totalOverlaps ?? 0}</strong>
            </span>
            {criticalFlowIndex !== null ? (
              <span className="text-rose-600 font-semibold">
                Deja de ser schedulable al agregar el flujo #{criticalFlowIndex} (demanda supera la oferta)
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">
                Schedulable con los {totalFlows} flujos agregados
              </span>
            )}
          </div>
        </div>
      )}

      <div className="h-[290px] w-full font-mono">
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

            {/* Reference diagonal supply-bound function: sbf(t) = t */}
            <Line
              type="monotone"
              dataKey="capacity"
              name="Oferta — sbf(t) = t"
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
              name="Contención (dbf / m)"
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

            {/* Total Demand curve = dbf(t) */}
            <Line
              type="monotone"
              dataKey="demand"
              name="Demanda Total — dbf(t)"
              stroke="#6b21a8"
              strokeWidth={2.2}
              dot={false}
            />

            {/* Zoom/pan control for legible viewing when H is large — fixes
                the "figura muy alargada" issue: the visible window defaults
                to the neighborhood of the first overload, and can be
                dragged to inspect any other part of the hyperperiod. */}
            {data.length > 20 && brushRange && (
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

      <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-3 text-[10.5px] text-slate-600 leading-normal">
        <span className="font-bold text-slate-700 block mb-1">Análisis de la Condición EDF:</span>
        <p className="mb-2">
          La condición necesaria y suficiente para que la red sea programable es
          <code className="bg-slate-200 px-1 rounded text-slate-700 mx-1">∀t ∈ (0, H]: dbf(t) ≤ sbf(t)</code>,
          es decir, que la <strong>demanda</strong> nunca supere la <strong>oferta</strong> en ninguna ventana dentro del hiperperíodo completo
          <code className="bg-slate-200 px-1 rounded text-slate-700 mx-1">H = {result?.H ?? params.H}</code>
          — no solo al final de él.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200 pt-2 text-[10px]">
          <div>
            <span className="font-bold text-blue-700 flex items-center gap-1">
              <span className="w-2 h-2 bg-[#0056b3] rounded-full inline-block" />
              Contención de canalización (dbf/m)
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
