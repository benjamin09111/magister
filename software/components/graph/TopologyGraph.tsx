'use client';

import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import cola from 'cytoscape-cola';
import { useSimStore } from '@/lib/store';
import { toast } from 'sonner';

// Register cola layout once
if (typeof window !== 'undefined') {
  try {
    cytoscape.use(cola);
  } catch (_) {}
}

interface TopologyGraphProps {
  onNodeSelect?: (nodeId: string) => void;
}

export default function TopologyGraph({ onNodeSelect }: TopologyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutRef = useRef<any>(null);

  const {
    graphData,
    setGraphData,
    params,
    updateParams,
    selectedSensor,
    setSelectedSensor,
    activeResult: storeActiveResult,
    isCompareMode,
    compareResultsPayload,
    selectedCompareMethodView,
    showAllConflicts,
    isSelectingGateway,
    setIsSelectingGateway,
  } = useSimStore();

  const activeResult = React.useMemo(() => {
    if (isCompareMode && compareResultsPayload) {
      return selectedCompareMethodView === 'A' 
        ? compareResultsPayload.method_a 
        : compareResultsPayload.method_b;
    }
    return storeActiveResult;
  }, [isCompareMode, compareResultsPayload, selectedCompareMethodView, storeActiveResult]);

  const stateRef = useRef({ params, isSelectingGateway, graphData, selectedSensor, onNodeSelect, activeResult });
  useEffect(() => {
    stateRef.current = { params, isSelectingGateway, graphData, selectedSensor, onNodeSelect, activeResult };
  }, [params, isSelectingGateway, graphData, selectedSensor, onNodeSelect, activeResult]);

  // Build / rebuild graph whenever graphData changes
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Stop active layout and destroy previous instance
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

    // Build elements — NO inline styles; all visual rules go in stylesheet
    const elements: cytoscape.ElementDefinition[] = [];

    graphData.nodes.forEach((node) => {
      const nodeDef: cytoscape.ElementDefinition = {
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label ?? `N${node.id}`,
          type: node.type ?? 'normal',
          degree: node.degree ?? 0,
          betweenness: node.betweenness ?? 0,
        },
      };
      if (node.x !== undefined && node.y !== undefined) {
        nodeDef.position = { x: node.x, y: node.y };
      }
      elements.push(nodeDef);
    });

    graphData.edges.forEach((edge) => {
      elements.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
        },
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: 'null' },
      // ────────────── Stylesheet (no bypasses) ──────────────
      style: [
        // ----- Default node -----
        {
          selector: 'node',
          style: {
            'background-color': '#e2e8f0',
            'border-color': '#94a3b8',
            'border-width': 1.5,
            shape: 'ellipse',
            width: 24,
            height: 24,
            label: 'data(label)',
            color: '#334155',
            'font-size': '9px',
            'font-family': 'Inter, sans-serif',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 5,
          },
        },
        // ----- Gateway node -----
        {
          selector: 'node[type="gateway"]',
          style: {
            'background-color': '#d62728',
            'border-color': '#b91c1c',
            'border-width': 2.5,
            shape: 'ellipse', // Reverted to circular
            width: 30,
            height: 30,
            color: '#b91c1c',
            'font-size': '10px',
            'font-weight': 'bold',
          },
        },
        // ----- Sensor node -----
        {
          selector: 'node[type="sensor"]',
          style: {
            'background-color': '#1f77b4',
            'border-color': '#1d4ed8',
            'border-width': 2,
            width: 24,
            height: 24,
            color: '#1e3a8a',
            'font-size': '9px',
          },
        },
        // ----- Normal intermediate node -----
        {
          selector: 'node[type="normal"]',
          style: {
            'background-color': '#f1f5f9',
            'border-color': '#cbd5e1',
            'border-width': 1.5,
            shape: 'ellipse', // Reverted to circular
            width: 20,
            height: 20,
          },
        },
        // ----- Selected (clicked) node (Sensors Only) -----
        {
          selector: 'node[type="sensor"]:selected',
          style: {
            'border-color': '#02529c',
            'border-width': 3,
            'background-color': '#1f77b4', // Keep original blue
          },
        },
        // ----- Highlighted node (route - Sensors) -----
        {
          selector: 'node[type="sensor"].highlighted',
          style: {
            'border-color': '#0056b3',
            'border-width': 3,
            'background-color': '#1f77b4', // Keep original blue
          },
        },
        // ----- Highlighted node (route - Normals) -----
        {
          selector: 'node[type="normal"].highlighted',
          style: {
            'border-color': '#0056b3',
            'border-width': 2.5,
            'background-color': '#f1f5f9', // Keep original grey
          },
        },
        // ----- Congested node (overlaps) -----
        {
          selector: 'node.congested',
          style: {
            'border-color': '#d62728', // Red border for conflict warning
            'border-width': 3,
            'background-color': '#ffedd5', // Light orange background for warning
            'color': '#ea580c', // Dark orange text for label
            'font-weight': 'bold',
          },
        },
        // ----- Highlighted node (route - Gateway) -----
        {
          selector: 'node[type="gateway"].highlighted',
          style: {
            'border-color': '#0056b3',
            'border-width': 3,
            'background-color': '#d62728', // Keep original red
          },
        },
        // ----- Default edge -----
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#cbd5e1',
            'curve-style': 'bezier',
            opacity: 0.8,
          },
        },
        // ----- Highlighted edge (route) -----
        {
          selector: 'edge.highlighted',
          style: {
            width: 3.5,
            'line-color': '#0056b3',
            'line-style': 'dashed',
            'line-dash-pattern': [8, 5],
            opacity: 1,
            'z-index': 10,
          },
        },
        // ----- Dimmed edge (when route is selected) -----
        {
          selector: 'edge.dimmed',
          style: {
            opacity: 0.1,
          },
        },
      ],
    });

    cyRef.current = cy;

    // Check if we have pre-defined node positions (e.g. from manual gateway change)
    const hasPositions = graphData.nodes.some(n => n.x !== undefined && n.y !== undefined);

    // Run layout separately
    const layout = cy.layout({
      name: 'cola',
      animate: !hasPositions,
      randomize: !hasPositions,
      maxSimulationTime: 2000,
      nodeSpacing: 40,
      edgeLength: 90,
    } as any);

    layoutRef.current = layout;
    layout.run();

    // ----- Canvas/Node tap handler -----
    cy.on('tap', (evt) => {
      const target = evt.target;
      const { 
        params: currentParams, 
        isSelectingGateway: currentSelecting, 
        graphData: currentGraphData, 
        selectedSensor: currentSelectedSensor,
        onNodeSelect: currentOnNodeSelect,
        activeResult: currentActiveResult
      } = stateRef.current;

      if (target === cy) {
        // Tapped on the background!
        setSelectedSensor(null);
        return;
      }

      if (typeof target.isNode === 'function' && target.isNode()) {
        const nodeId = target.id();
        const nodeType = target.data('type');

        if (currentParams.gateway_mode === 'manual' && currentSelecting) {
          const newGatewayId = parseInt(nodeId);
          updateParams({ selected_gateway: newGatewayId });
          setIsSelectingGateway(false);
          
          if (currentGraphData) {
            // Get current positions of all nodes in Cytoscape
            let positions: { id: string; x: number; y: number }[] = [];
            if (cyRef.current) {
              positions = cyRef.current.nodes().map(node => ({
                id: node.id(),
                x: node.position('x'),
                y: node.position('y')
              }));
            }

            const targetNode = currentGraphData.nodes.find(n => n.id === nodeId);
            const isTargetSensor = targetNode?.type === 'sensor';

            const updatedNodes = currentGraphData.nodes.map(node => {
              const pos = positions.find(p => p.id === node.id);
              let newType = node.type;
              
              if (node.id === nodeId) {
                newType = 'gateway';
              } else if (node.type === 'gateway') {
                // If the new gateway was a sensor, promote the old gateway to a sensor to keep count
                newType = isTargetSensor ? 'sensor' : 'normal';
              }
              
              return {
                ...node,
                type: newType,
                x: pos ? pos.x : undefined,
                y: pos ? pos.y : undefined
              };
            });
            
            setGraphData({ ...currentGraphData, nodes: updatedNodes });
            toast.success(`Nodo N${nodeId} establecido como Gateway`);
          }
        } else if (currentActiveResult) {
          // Only allow node click selection of sensors to highlight paths if simulation results exist
          if (nodeType === 'sensor') {
            setSelectedSensor(currentSelectedSensor === nodeId ? null : nodeId);
          } else {
            // Tapped an intermediate node or gateway
            setSelectedSensor(null);
          }
        }

        if (currentOnNodeSelect) currentOnNodeSelect(nodeId);
      }
    });

    return () => {
      if (layoutRef.current) {
        try {
          layoutRef.current.stop();
        } catch (_) {}
        layoutRef.current = null;
      }
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData]);

  // ----- Highlight active route when selectedSensor or showAllConflicts changes -----
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    try {
      // Reset all classes and labels
      cy.elements().removeClass('highlighted dimmed congested');
      cy.edges().removeStyle('line-color');
      cy.edges().removeStyle('width');

      cy.nodes().forEach((node) => {
        if (cy.destroyed()) return;
        try {
          const id = node.id();
          const nodeType = node.data('type');
          if (nodeType === 'gateway') {
            node.style('label', `GW (N${id})`);
          } else {
            node.style('label', `N${id}`);
          }
        } catch (_) {}
      });

      if (!activeResult) return;

      if (showAllConflicts) {
        // 1. Calculate path traffic
        const nodeTraffic: Record<string, number> = {};
        const edgeTraffic: Record<string, number> = {};

        if (activeResult.paths) {
          Object.entries(activeResult.paths).forEach(([sensorId, path]) => {
            if (!path || path.length < 2) return;
            
            path.forEach((nodeId) => {
              const nStr = String(nodeId);
              nodeTraffic[nStr] = (nodeTraffic[nStr] || 0) + 1;
            });

            for (let i = 0; i < path.length - 1; i++) {
              const u = String(path[i]);
              const v = String(path[i + 1]);
              const edgeKey = [u, v].sort().join('-');
              edgeTraffic[edgeKey] = (edgeTraffic[edgeKey] || 0) + 1;
            }
          });
        }

        // 2. Color congested nodes (nodeTraffic > 1) and label them
        cy.nodes().forEach((node) => {
          if (cy.destroyed()) return;
          try {
            const id = node.id();
            const traffic = nodeTraffic[id] || 0;
            const nodeType = node.data('type');

            if (traffic > 0 && nodeType !== 'gateway') {
              node.style('label', `N${id} [${traffic}]`);
              if (traffic > 1) {
                node.addClass('congested');
              }
            }
          } catch (_) {}
        });

        // 3. Highlight active edges and size them proportionally
        cy.edges().addClass('dimmed');
        cy.edges().forEach((edge) => {
          if (cy.destroyed()) return;
          try {
            const s = edge.data('source');
            const t = edge.data('target');
            const edgeKey = [s, t].sort().join('-');
            const traffic = edgeTraffic[edgeKey] || 0;

            if (traffic > 0) {
              edge.addClass('highlighted').removeClass('dimmed');
              edge.style('width', 1.8 + traffic * 1.5);
              if (traffic > 1) {
                edge.style('line-color', '#d62728'); // Congestion color
              } else {
                edge.style('line-color', '#1f77b4'); // Normal route blue
              }
            }
          } catch (_) {}
        });

        return;
      }

      if (!selectedSensor) return;

      const path = activeResult.paths[selectedSensor];
      if (!path || path.length < 2) return;

      // Dim everything first, then highlight the route
      cy.edges().addClass('dimmed');

      path.forEach((nodeId) => {
        if (cy.destroyed()) return;
        try {
          cy.getElementById(nodeId).addClass('highlighted').removeClass('dimmed');
        } catch (_) {}
      });

      for (let i = 0; i < path.length - 1; i++) {
        if (cy.destroyed()) return;
        try {
          const u = String(path[i]);
          const v = String(path[i + 1]);
          cy.edges().filter((e) => {
            const s = e.data('source');
            const t = e.data('target');
            return (s === u && t === v) || (s === v && t === u);
          }).addClass('highlighted').removeClass('dimmed');
        } catch (_) {}
      }
    } catch (_) {}
  }, [selectedSensor, activeResult, showAllConflicts]);

  // ----- Animate active route lines (moving flow effect) -----
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || (!selectedSensor && !showAllConflicts) || !activeResult) return;

    let animId: number;
    let offset = 0;

    const animateFlow = () => {
      try {
        const currentCy = cyRef.current;
        if (currentCy && !currentCy.destroyed()) {
          offset = (offset - 1.2) % 24; // moving offset
          currentCy.edges('.highlighted').style('line-dash-offset', offset);
          animId = requestAnimationFrame(animateFlow);
        }
      } catch (_) {
        // Safe exit if cy was destroyed mid-tick
      }
    };

    animId = requestAnimationFrame(animateFlow);

    return () => {
      cancelAnimationFrame(animId);
      if (cyRef.current) {
        try {
          if (!cyRef.current.destroyed()) {
            cyRef.current.edges().removeStyle('line-dash-offset');
          }
        } catch (_) {}
      }
    };
  }, [selectedSensor, activeResult, graphData, showAllConflicts]);

  return (
    <div className={`relative w-full ${activeResult ? 'h-[400px]' : (isCompareMode ? 'h-[460px]' : 'h-[545px]')} border border-slate-300 rounded overflow-hidden shadow-sm`}>
      <div ref={containerRef} className="cytoscape-container absolute inset-0" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 p-3 bg-white border border-slate-350 rounded text-xs z-10 select-none shadow-sm">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Leyenda</p>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-[#d62728] border border-[#b91c1c] rounded-full inline-block" />
          <span className="text-slate-700 font-medium">Gateway (GW - Círculo Rojo)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-[#1f77b4] border border-[#1d4ed8] rounded-full inline-block" />
          <span className="text-slate-700 font-medium">Emisores (Sensores - Círculo Azul)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 bg-[#e2e8f0] border border-[#cbd5e1] rounded-full inline-block" />
          <span className="text-slate-500 font-medium">Nodo intermedio (Círculo Gris)</span>
        </div>
        {showAllConflicts && (
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-[#ffedd5] border border-[#d62728] rounded-full inline-block" />
            <span className="text-slate-700 font-medium">Nodo Solapado (Overlaps &gt; 1)</span>
          </div>
        )}
        {(selectedSensor || showAllConflicts) && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
            <span className="w-5 h-1 border-t-2 border-dashed border-[#0056b3] inline-block animate-pulse" />
            <span className="text-[#0056b3] font-bold">
              {showAllConflicts ? 'Todos los flujos activos' : `Flujo activo: N${selectedSensor}`}
            </span>
          </div>
        )}
      </div>



      {/* Empty state */}
      {!graphData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
          <span className="text-3xl">🌐</span>
          <p className="text-xs">Configura los parámetros y haz clic en <strong className="text-slate-600">Generar Red</strong></p>
        </div>
      )}
    </div>
  );
}
