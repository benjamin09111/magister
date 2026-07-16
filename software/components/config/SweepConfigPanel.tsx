'use client';

import React from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { Play, RotateCcw, AlertTriangle } from 'lucide-react';

export default function SweepConfigPanel() {
  const { 
    params, 
    sweepParams, 
    updateSweepParams, 
    sweepStatus, 
    setSweepStatus, 
    setSweepResult 
  } = useSimStore();

  const handleStartSweep = async () => {
    // Basic validation
    if (sweepParams.sweep_start >= sweepParams.sweep_end) {
      toast.error('El valor inicial debe ser menor al valor final.');
      return;
    }
    if (sweepParams.sweep_step <= 0) {
      toast.error('El paso (step) debe ser mayor a 0.');
      return;
    }
    if (sweepParams.replicas < 1) {
      toast.error('El número de réplicas debe ser al menos 1.');
      return;
    }
    if (sweepParams.methods.length === 0) {
      toast.error('Debes seleccionar al menos un método para evaluar.');
      return;
    }

    setSweepStatus('running');
    const toastId = toast.loading('Ejecutando barrido paramétrico en el servidor... Esto puede tardar unos segundos.', { duration: 0 });

    try {
      const payload = {
        sweep_param: sweepParams.sweep_param,
        sweep_start: sweepParams.sweep_start,
        sweep_end: sweepParams.sweep_end,
        sweep_step: sweepParams.sweep_step,
        replicas: sweepParams.replicas,
        methods: sweepParams.methods,
        // Global fixed base parameters
        N: params.N,
        lambda_val: params.lambda,
        sensors_count: params.sensorsCount,
        k_max: params.k_max,
        m_fixed: params.m_fixed,
        H: params.H,
        eta_min: params.eta_min,
        eta_max: params.eta_max,
        conflict_pair_mode: params.conflict_pair_mode,
        gateway_mode: params.gateway_mode,
        selected_gateway: params.selected_gateway
      };

      const result = await fetchApi('/simulation/sweep', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSweepResult(result);
      setSweepStatus('completed');
      toast.success('¡Barrido paramétrico finalizado con éxito!', { id: toastId });
    } catch (e: any) {
      setSweepStatus('idle');
      toast.error('Error al correr el barrido: ' + e.message, { id: toastId });
    }
  };

  const handleMethodChange = (methodId: string, checked: boolean) => {
    // SP is baseline and cannot be removed
    if (methodId === 'SP') return;

    let updatedMethods = [...sweepParams.methods];
    if (checked) {
      if (!updatedMethods.includes(methodId)) {
        updatedMethods.push(methodId);
      }
    } else {
      updatedMethods = updatedMethods.filter(m => m !== methodId);
    }
    updateSweepParams({ methods: updatedMethods });
  };

  const handleParamSelectChange = (val: 'N' | 'lambda' | 'channels') => {
    // Suggest safe defaults depending on chosen parameter to vary
    if (val === 'N') {
      updateSweepParams({
        sweep_param: val,
        sweep_start: 10,
        sweep_end: 30,
        sweep_step: 5
      });
    } else if (val === 'lambda') {
      updateSweepParams({
        sweep_param: val,
        sweep_start: 4,
        sweep_end: 12,
        sweep_step: 4
      });
    } else if (val === 'channels') {
      updateSweepParams({
        sweep_param: val,
        sweep_start: 4,
        sweep_end: 16,
        sweep_step: 4
      });
    }
  };

  return (
    <div className="bg-white border border-slate-350 rounded p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
        Configuración del Barrido
      </h3>

      <div className="flex flex-col gap-4">
        {/* Sweep Variable Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Variable Eje X (Parámetro a Variar):
          </label>
          <select
            value={sweepParams.sweep_param}
            onChange={(e) => handleParamSelectChange(e.target.value as any)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-semibold"
          >
            <option value="N">Flujos de red / Nodos (N)</option>
            <option value="lambda">Densidad de enlaces (Lambda)</option>
            <option value="channels">Canales TSCH (m)</option>
          </select>
        </div>

        {/* Range fields */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Inicio:</label>
            <input
              type="number"
              value={sweepParams.sweep_start}
              onChange={(e) => updateSweepParams({ sweep_start: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-semibold font-mono rounded p-1.5 focus:ring-1 focus:ring-[#0056b3]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Fin:</label>
            <input
              type="number"
              value={sweepParams.sweep_end}
              onChange={(e) => updateSweepParams({ sweep_end: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-semibold font-mono rounded p-1.5 focus:ring-1 focus:ring-[#0056b3]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Paso:</label>
            <input
              type="number"
              value={sweepParams.sweep_step}
              onChange={(e) => updateSweepParams({ sweep_step: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-semibold font-mono rounded p-1.5 focus:ring-1 focus:ring-[#0056b3]"
            />
          </div>
        </div>

        {/* Replicas select dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-655 mb-1">
            Réplicas de Monte Carlo (por punto):
          </label>
          <select
            value={sweepParams.replicas}
            onChange={(e) => updateSweepParams({ replicas: parseInt(e.target.value) })}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:ring-1 focus:ring-[#0056b3] focus:border-[#0056b3] font-semibold"
          >
            <option value="10">10 Réplicas (Debug Rápido)</option>
            <option value="50">50 Réplicas (Intermedio)</option>
            <option value="100">100 Réplicas (Suave - Recomendado)</option>
            <option value="500">500 Réplicas (Detallado)</option>
            <option value="1000">1000 Réplicas (Máxima Suavidad / Publicación)</option>
          </select>
          <span className="text-[9px] text-slate-400 block mt-1 leading-normal">
            Correr simulaciones con más iteraciones promedia múltiples topologías aleatorias para suavizar ("smooth") los gráficos de performance.
          </span>
        </div>

        {/* Routing Methods Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Métodos a evaluar y comparar:
          </label>
          <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded p-2.5">
            {[
              { id: 'SP', name: 'Shortest Path (SP)', disabled: true, desc: 'Línea base (Obligatorio)' },
              { id: 'MO', name: 'Minimal Overlap (MO)', disabled: false, desc: 'Optimizado (Paper principal)' },
              { id: 'MO_ACO', name: 'MO + ACO', disabled: false, desc: 'Optimización metaheurística' },
              { id: 'QLearning', name: 'Q-Learning Routing', disabled: false, desc: 'RL Tabular Off-policy' },
              { id: 'SARSA', name: 'SARSA Routing', disabled: false, desc: 'RL Tabular On-policy' }
            ].map((m) => {
              const isChecked = m.id === 'SP' || sweepParams.methods.includes(m.id);
              return (
                <label key={m.id} className="flex items-start gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={m.disabled}
                    onChange={(e) => handleMethodChange(m.id, e.target.checked)}
                    className="mt-0.5 accent-[#0056b3] h-3.5 w-3.5 border-slate-350 rounded cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div>
                    <span className="font-semibold text-slate-700 block leading-tight">{m.name}</span>
                    <span className="text-[10px] text-slate-500">{m.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Warning card for computation time / parallel process info */}
        {sweepParams.replicas >= 100 && (
          <div className="flex gap-2 bg-[#0056b3]/10 border border-[#0056b3]/30 rounded p-2.5 text-[10px] text-slate-700 leading-normal">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#0056b3] mt-0.5" />
            <div>
              <span className="font-bold text-[#0056b3]">Procesamiento en Paralelo:</span> Para {sweepParams.replicas} réplicas, el backend distribuirá los cálculos en múltiples núcleos de CPU de forma paralela para acelerar la simulación de Monte Carlo.
            </div>
          </div>
        )}

        {/* Fixed Base values info drawer */}
        <div className="bg-slate-100 border border-slate-200 rounded p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Configuración Base (Fija)
          </span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-600 font-mono">
            {sweepParams.sweep_param !== 'N' && (
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span>Nodos (N):</span> <span className="font-bold text-slate-800">{params.N}</span>
              </div>
            )}
            {sweepParams.sweep_param !== 'lambda' && (
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span>Lambda (λ):</span> <span className="font-bold text-slate-800">{params.lambda}</span>
              </div>
            )}
            {sweepParams.sweep_param !== 'channels' && (
              <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
                <span>Canales (m):</span> <span className="font-bold text-slate-800">{params.m_fixed}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-200/60 pb-0.5">
              <span>Hiperper. (H):</span> <span className="font-bold text-slate-800">{params.H}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-0.5 col-span-2">
              <span>Rango Periodo (T):</span> <span className="font-bold text-slate-800">[{2**params.eta_min}, {2**params.eta_max}] slots</span>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1.5">
            * Modifica estos valores base en la pestaña de Topología.
          </span>
        </div>

        {/* Start Sweep Button */}
        <button
          onClick={handleStartSweep}
          disabled={sweepStatus === 'running'}
          className={`w-full py-3 rounded font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
            sweepStatus === 'running'
              ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
              : 'bg-[#02529c] hover:bg-[#003d73] border-none text-white cursor-pointer active:scale-95'
          }`}
        >
          <Play size={12} className={sweepStatus === 'running' ? 'animate-spin' : ''} />
          {sweepStatus === 'running' ? 'Ejecutando Barrido...' : 'Ejecutar Barrido'}
        </button>
      </div>
    </div>
  );
}
