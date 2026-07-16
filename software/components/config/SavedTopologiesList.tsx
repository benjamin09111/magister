'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSimStore } from '@/lib/store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import cytoscape from 'cytoscape';
import { FolderOpen, Trash2, Play, AlertTriangle } from 'lucide-react';

interface SavedTopologiesListProps {
  onLoadTopology: () => void;
}

export default function SavedTopologiesList({ onLoadTopology }: SavedTopologiesListProps) {
  const { 
    updateParams, 
    setGraphData, 
    setImportedTopologyName,
    setSimStatus,
    setActiveResult
  } = useSimStore();

  const [topologies, setTopologies] = useState<any[]>([]);
  const [selectedTopo, setSelectedTopo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<string | null>(null);
  
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<any>(null);

  const fetchTopologies = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/topologies');
      setTopologies(data);
      if (data.length > 0 && !selectedTopo) {
        setSelectedTopo(data[0]);
      }
    } catch (e: any) {
      toast.error('Error al cargar topologías: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopologies();
  }, []);

  // Initialize Cytoscape for visual preview on topology selection
  useEffect(() => {
    if (!selectedTopo || !containerRef.current) return;

    // Clean up previous instance
    if (layoutRef.current) {
      try {
        layoutRef.current.stop();
      } catch (_) {}
      layoutRef.current = null;
    }
    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch (_) {}
      cyRef.current = null;
    }

    try {
      // Re-map nodes/edges into cytoscape elements format
      const cyNodes = selectedTopo.nodes.map((node: any) => ({
        data: {
          id: node.id,
          label: node.label || `N${node.id}`,
          type: node.type || 'normal'
        },
        position: node.position ? { x: node.position.x, y: node.position.y } : undefined
      }));

      const cyEdges = selectedTopo.edges.map((edge: any) => ({
        data: {
          id: edge.id || `${edge.source}_${edge.target}`,
          source: edge.source,
          target: edge.target
        }
      }));

      const cy = cytoscape({
        container: containerRef.current,
        elements: [...cyNodes, ...cyEdges],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#e2e8f0',
              'border-color': '#94a3b8',
              'border-width': 1.5,
              shape: 'ellipse',
              width: 20,
              height: 20,
              label: 'data(label)',
              color: '#334155',
              'font-size': '8px',
              'font-family': 'Inter, sans-serif',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 4,
            },
          },
          {
            selector: 'node[type="gateway"]',
            style: {
              'background-color': '#d62728',
              'border-color': '#b91c1c',
              'border-width': 2.5,
              width: 26,
              height: 26,
              color: '#b91c1c',
              'font-size': '9px',
            },
          },
          {
            selector: 'node[type="sensor"]',
            style: {
              'background-color': '#1f77b4',
              'border-color': '#1d4ed8',
              'border-width': 2,
              width: 20,
              height: 20,
              color: '#1e3a8a',
              'font-size': '8px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1,
              'line-color': '#cbd5e1',
              'curve-style': 'bezier',
              opacity: 0.8,
            },
          },
        ],
        layout: { name: 'null' },
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
      });

      cyRef.current = cy;

      const layout = cy.layout(selectedTopo.nodes[0]?.position ? { name: 'preset' } : { name: 'cose', padding: 15 } as any);
      layoutRef.current = layout;
      layout.run();
      
      // Auto-fit after rendering
      setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.fit();
          cyRef.current.center();
        }
      }, 100);

    } catch (err) {
      console.error('Error rendering cytoscape preview:', err);
    }

    return () => {
      if (layoutRef.current) {
        try {
          layoutRef.current.stop();
        } catch (_) {}
        layoutRef.current = null;
      }
      if (cyRef.current) {
        try {
          cyRef.current.destroy();
        } catch (_) {}
        cyRef.current = null;
      }
    };
  }, [selectedTopo]);

  const handleImport = () => {
    if (!selectedTopo) return;

    // Load store parameters
    updateParams({
      N: selectedTopo.N,
      lambda: selectedTopo.lambda_val,
      sensorsCount: selectedTopo.sensors_count,
      selected_gateway: selectedTopo.gateway,
      gateway_mode: selectedTopo.gateway_mode
    });

    // Load graph data
    setGraphData({
      nodes: selectedTopo.nodes,
      edges: selectedTopo.edges
    });

    setImportedTopologyName(selectedTopo.name);
    
    // Reset any active simulation results to prevent visual mismatch
    setSimStatus('idle');
    setActiveResult(null);

    toast.success(`Topología "${selectedTopo.name}" cargada correctamente`);
    onLoadTopology(); // Callback to redirect to Network tab
  };

  const handleDelete = async (topoId: string) => {
    try {
      await fetchApi(`/topologies/${topoId}`, { method: 'DELETE' });
      toast.success('Topología eliminada con éxito');
      setShowConfirmDeleteModal(null);
      
      const remaining = topologies.filter(t => t.id !== topoId);
      setTopologies(remaining);
      if (selectedTopo?.id === topoId) {
        setSelectedTopo(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (e: any) {
      toast.error('Error al eliminar topología: ' + e.message);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 w-full h-full min-h-[500px]">
      {/* Sidebar List (col-span-4) */}
      <div className="lg:col-span-4 flex flex-col bg-white border border-slate-350 rounded shadow-sm overflow-hidden h-[545px]">
        {/* Title */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-[#0056b3]" />
            Mis Topologías Guardadas
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Selecciona una topología para ver la vista previa y cargarla en el simulador.
          </p>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-slate-50/50">
          {loading ? (
            <div className="text-center text-slate-500 text-xs py-10 font-mono">Cargando topologías...</div>
          ) : topologies.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-10 font-sans">
              No tienes topologías guardadas.<br />
              Genera una red y haz clic en "Guardar Topología" para empezar.
            </div>
          ) : (
            topologies.map((topo) => {
              const isSelected = selectedTopo?.id === topo.id;
              return (
                <div
                  key={topo.id}
                  onClick={() => setSelectedTopo(topo)}
                  className={`border rounded p-3 flex justify-between items-center transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'border-[#0056b3] bg-[#0056b3]/5 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-350'
                  }`}
                >
                  <div className="flex flex-col gap-1 select-none">
                    <span className="font-bold text-slate-800">{topo.name}</span>
                    <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                      <span>N={topo.N}</span>
                      <span>λ={topo.lambda_val}</span>
                      <span>Sens={topo.sensors_count}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">{topo.timestamp}</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConfirmDeleteModal(topo.id);
                    }}
                    className="p-1.5 rounded hover:bg-rose-50 text-rose-600 border border-transparent hover:border-rose-200 transition-colors cursor-pointer flex items-center justify-center"
                    title="Eliminar de la BD"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Preview Pane (col-span-8) */}
      <div className="lg:col-span-8 flex flex-col bg-white border border-slate-350 rounded shadow-sm overflow-hidden h-[545px]">
        {selectedTopo ? (
          <div className="flex-1 flex flex-col h-full relative">
            {/* Visualizer header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Vista Previa: <span className="underline font-mono text-[#0056b3]">{selectedTopo.name}</span>
                </h4>
                <p className="text-[9px] text-slate-500 font-mono">
                  Guardado el: {selectedTopo.timestamp}
                </p>
              </div>
              <button
                type="button"
                onClick={handleImport}
                className="px-3 py-1.5 text-xs font-bold rounded bg-[#2ca02c] hover:bg-[#258525] text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Cargar en el Simulador
              </button>
            </div>

            {/* Cytoscape Container */}
            <div className="flex-1 bg-slate-50 relative border-b border-slate-200">
              <div ref={containerRef} className="absolute inset-0 z-10" />
              
              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 flex flex-col gap-1 p-2 bg-white/95 backdrop-blur-sm border border-slate-300 rounded text-[9px] z-20 select-none shadow-sm font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#d62728] border border-[#b91c1c] rounded-full inline-block" />
                  <span className="text-slate-700 font-semibold">Gateway (GW)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#1f77b4] border border-[#1d4ed8] rounded-full inline-block" />
                  <span className="text-slate-700 font-semibold">Sensores Emisores</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#e2e8f0] border border-[#94a3b8] rounded-full inline-block" />
                  <span className="text-slate-700 font-semibold">Routers Intermedios</span>
                </div>
              </div>
            </div>

            {/* Topology summary fields */}
            <div className="p-3 bg-slate-50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0 select-none border-t border-slate-200">
              <div className="flex flex-col gap-0.5 bg-white border border-slate-250 p-2 rounded">
                <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wide">Nodos (N)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{selectedTopo.N}</span>
              </div>
              <div className="flex flex-col gap-0.5 bg-white border border-slate-250 p-2 rounded">
                <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wide">Densidad (λ)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{selectedTopo.lambda_val}</span>
              </div>
              <div className="flex flex-col gap-0.5 bg-white border border-slate-250 p-2 rounded">
                <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wide">Sensores</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{selectedTopo.sensors_count}</span>
              </div>
              <div className="flex flex-col gap-0.5 bg-white border border-slate-250 p-2 rounded">
                <span className="text-slate-500 font-bold text-[9px] uppercase tracking-wide">Gateway (GW)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">N{selectedTopo.gateway} ({selectedTopo.gateway_mode})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-sans text-xs bg-slate-50/50">
            <span>Selecciona una topología del listado para ver su previsualización.</span>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 max-w-sm w-full rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 relative font-sans">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-650" />
            
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-650" />
                Confirmar eliminación
              </h4>
            </div>
            
            <div className="p-5 text-xs text-slate-650 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente esta topología de la base de datos?
              Esta acción no se puede deshacer.
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteModal(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-350 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(showConfirmDeleteModal)}
                className="px-3 py-1.5 text-xs font-bold rounded bg-red-600 hover:bg-red-750 text-white transition-colors cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
