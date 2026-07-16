'use client';

import React, { useMemo, useState } from 'react';
import { useSimStore } from '@/lib/store';

// Helper to generate distinct background colors for each sensor
const getSensorColorClass = (sensorId: string, isDimmed: boolean) => {
  const num = parseInt(sensorId) || 0;
  const colors = [
    'bg-pink-500 text-white',
    'bg-cyan-500 text-slate-900',
    'bg-purple-500 text-white',
    'bg-orange-500 text-slate-900',
    'bg-emerald-500 text-white',
    'bg-sky-500 text-slate-900',
    'bg-rose-500 text-white',
    'bg-indigo-500 text-white',
    'bg-amber-500 text-slate-900',
    'bg-teal-500 text-white',
  ];
  
  const baseColor = colors[num % colors.length];
  return isDimmed ? `${baseColor} opacity-20` : baseColor;
};

export default function TSCHScheduleGrid() {
  const { 
    activeResult: storeActiveResult, 
    params, 
    selectedSensor, 
    setSelectedSensor,
    isCompareMode,
    compareResultsPayload,
    compareMethodsSelected,
    selectedCompareMethodView,
    setSelectedCompareMethodView
  } = useSimStore();
  const [hoveredCell, setHoveredCell] = useState<any>(null);

  const activeResult = useMemo(() => {
    if (isCompareMode && compareResultsPayload) {
      return selectedCompareMethodView === 'A' 
        ? compareResultsPayload.method_a 
        : compareResultsPayload.method_b;
    }
    return storeActiveResult;
  }, [isCompareMode, compareResultsPayload, selectedCompareMethodView, storeActiveResult]);

  const gridData = useMemo(() => {
    if (!activeResult || !activeResult.tschGrid) return null;
    
    // Map grid entries by slot and channel for O(1) lookup
    const lookup: Record<string, any> = {};
    activeResult.tschGrid.forEach((cell) => {
      lookup[`${cell.slot}_${cell.channel}`] = cell;
    });
    
    return lookup;
  }, [activeResult]);

  if (!activeResult || !gridData) {
    return (
      <div className="h-[250px] flex items-center justify-center border border-dashed border-slate-300 rounded bg-white text-slate-500 text-xs">
        Ninguna simulación activa. Inicia una simulación para ver la grilla TSCH.
      </div>
    );
  }

  const channels = Array.from({ length: params.m_fixed }, (_, i) => i);
  const slots = Array.from({ length: params.H }, (_, i) => i);

  return (
    <div className="bg-white border border-slate-350 rounded p-4 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-center mb-3 gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700">
            Planificador TSCH (Timeslot × Canal por Superframe)
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Muestra la asignación dinámica de celdas para cada salto (duración = 2 slots por enlace) en el Superframe (Hiperperíodo = H slots).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCompareMode && compareResultsPayload && (
            <div className="flex bg-slate-100 border border-slate-300 rounded p-0.5 text-[10px] font-semibold">
              <button
                onClick={() => setSelectedCompareMethodView('A')}
                className={`px-2.5 py-1 rounded transition-all ${
                  selectedCompareMethodView === 'A'
                    ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {compareMethodsSelected.methodA}
              </button>
              <button
                onClick={() => setSelectedCompareMethodView('B')}
                className={`px-2.5 py-1 rounded transition-all ${
                  selectedCompareMethodView === 'B'
                    ? 'bg-[#0056b3] text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {compareMethodsSelected.methodB}
              </button>
            </div>
          )}
          
          {selectedSensor && (
            <button
              onClick={() => setSelectedSensor(null)}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-2 py-1 rounded transition-colors whitespace-nowrap"
            >
              Limpiar Filtro
            </button>
          )}
        </div>
      </div>

      {/* Grid container with horizontal scrolling */}
      <div className="overflow-x-auto border border-slate-300 rounded">
        <div className="min-w-[800px] bg-white p-2">
          {/* Header Row: Slots */}
          <div className="flex">
            {/* Corner label */}
            <div className="w-14 shrink-0 text-[10px] text-slate-500 font-mono flex items-center justify-center border-r border-b border-slate-200 pb-1.5" title="Slots del Superframe (eje horizontal) vs Canal Físico (eje vertical)">
              CH \ Slot
            </div>
            
            {/* Slot labels */}
            <div className="flex flex-1">
              {slots.map((slot) => (
                <div 
                  key={slot} 
                  className={`flex-1 min-w-[20px] text-[9px] font-mono text-center text-slate-500 pb-1.5 border-b border-slate-200 ${
                    slot % 10 === 0 ? 'text-[#0056b3] font-bold border-l border-slate-200' : ''
                  }`}
                >
                  {slot}
                </div>
              ))}
            </div>
          </div>

          {/* Rows: Channels */}
          {channels.map((channel) => (
            <div key={channel} className="flex">
              {/* Channel Label */}
              <div className="w-14 shrink-0 text-[10px] font-mono font-bold text-slate-600 flex items-center justify-center border-r border-slate-200 py-1 bg-slate-50">
                CH {channel}
              </div>
              
              {/* Channel slot cells */}
              <div className="flex flex-1">
                {slots.map((slot) => {
                  const key = `${slot}_${channel}`;
                  const cell = gridData[key];
                  const isOccupied = !!cell;
                  
                  // Dim if another sensor is selected
                  const isDimmed = selectedSensor !== null && isOccupied && cell.sensor !== selectedSensor;
                  const isCurrentSelection = selectedSensor !== null && isOccupied && cell.sensor === selectedSensor;

                  return (
                    <div
                      key={slot}
                      onMouseEnter={() => isOccupied && setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => isOccupied && setSelectedSensor(cell.sensor)}
                      className={`flex-1 min-w-[20px] h-6 border-b border-r border-slate-200 relative cursor-pointer transition-all ${
                        slot % 10 === 0 ? 'border-l border-slate-200' : ''
                      } ${
                        isOccupied 
                          ? getSensorColorClass(cell.sensor, isDimmed)
                          : 'bg-slate-50 hover:bg-slate-100'
                      } ${
                        isCurrentSelection ? 'ring-2 ring-[#0056b3] ring-inset scale-[0.98] z-10' : ''
                      }`}
                    >
                      {isOccupied && !isDimmed && (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono">
                          {cell.sensor}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cell inspector */}
      <div className="h-12 mt-3 flex items-center bg-slate-50 border border-slate-200 rounded p-2.5">
        {hoveredCell ? (
          <div className="flex gap-4 text-xs font-mono w-full justify-between items-center text-slate-700">
            <div>
              Sensor: <span className="text-cyan-600 font-bold">N{hoveredCell.sensor}</span>
            </div>
            <div>
              Enlace: <span className="text-[#0056b3]">{hoveredCell.sender} → {hoveredCell.receiver}</span>
            </div>
            <div>
              Salto: <span className="text-amber-600">#{hoveredCell.hop + 1}</span>
            </div>
            <div>
              Job: <span className="text-indigo-655 font-semibold">#{hoveredCell.job}</span>
            </div>
            <div>
              Slot Superframe: <span className="text-emerald-600 font-bold">{hoveredCell.slot}</span>
            </div>
            <div>
              Límite: <span className="text-red-600 font-semibold">{hoveredCell.deadline}</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 font-mono">
            Pasa el cursor sobre una celda programada para ver los detalles de transmisión.
          </div>
        )}
      </div>
    </div>
  );
}
