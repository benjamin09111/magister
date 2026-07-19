function [best_paths, best_omega] = run_minimal_overlap_routing_mg(G, initial_paths, sensors, gateways_for_sensors, psi, k_max)
% RUN_MINIMAL_OVERLAP_ROUTING_MG Implementa el algoritmo heurístico MO adaptado
% para múltiples gateways (MO-MG), excluyendo del conteo de traslapes a
% todos los nodos designados como gateways.
%
% INPUT:
%   G                    - Grafo original de la topología (graph)
%   initial_paths        - Rutas Shortest Path iniciales [n x 1] cell array
%   sensors              - Vector de IDs de nodos sensores [n x 1]
%   gateways_for_sensors - Vector de IDs de gateways correspondientes [n x 1]
%   psi                  - Factor de penalización por solapamiento
%   k_max                - Número de iteraciones del algoritmo
%
% OUTPUT:
%   best_paths           - Las mejores rutas encontradas bajo MO-MG
%   best_omega           - El valor de Omega mínimo encontrado

n = length(sensors);
gws = unique(gateways_for_sensors); % El conjunto de todos los gateways

Phi = initial_paths;
G_k = G;
G_k.Edges.Weight = ones(numedges(G_k), 1);

best_paths = Phi;
best_omega = compute_total_overlaps_mg(Phi, gws);

for k = 1:k_max
    current_weights = G_k.Edges.Weight;
    
    % Evaluar overlaps por parejas y penalizar aristas incidentes a los nodos en conflicto
    for i = 1:n
        for j = i+1:n
            % Nodos compartidos intermedios (excluyendo a todos los gateways)
            pi_no_gws = setdiff(Phi{i}, gws);
            pj_no_gws = setdiff(Phi{j}, gws);
            
            shared_nodes = intersect(pi_no_gws, pj_no_gws);
            delta_ij = length(shared_nodes);
            
            if delta_ij > 0
                edges_i = path_to_edges(Phi{i});
                edges_j = path_to_edges(Phi{j});
                
                penalized_edges = [];
                for idx_node = 1:length(shared_nodes)
                    node = shared_nodes(idx_node);
                    
                    % Penalizar aristas en la ruta i incidentes al nodo de colisión
                    penalized_edges = [penalized_edges; incident_edge_ids_from_path(edges_i, node, G_k)]; %#ok<AGROW>
                    % Penalizar aristas en la ruta j incidentes al nodo de colisión
                    penalized_edges = [penalized_edges; incident_edge_ids_from_path(edges_j, node, G_k)]; %#ok<AGROW>
                end
                
                penalized_edges = unique(penalized_edges);
                
                % Aplicar la penalización de forma acumulativa
                for idx_edge = 1:length(penalized_edges)
                    e_id = penalized_edges(idx_edge);
                    if e_id > 0
                        current_weights(e_id) = current_weights(e_id) + (delta_ij * psi);
                    end
                end
            end
        end
    end
    
    % Actualizar pesos del grafo
    G_k.Edges.Weight = current_weights;
    
    % Recalcular caminos mínimos individuales ponderados
    new_paths = cell(n, 1);
    for i = 1:n
        new_paths{i} = shortestpath(G_k, sensors(i), gateways_for_sensors(i));
    end
    
    % Evaluar overlaps con los nuevos caminos
    omega_k = compute_total_overlaps_mg(new_paths, gws);
    
    % Si hay mejora, actualizar el registro
    if omega_k < best_omega
        best_omega = omega_k;
        best_paths = new_paths;
    end
    
    Phi = new_paths;
    
    % Si logramos colisiones cero, terminamos anticipadamente
    if omega_k == 0
        break;
    end
end

end

% =========================================================================
% FUNCIONES AUXILIARES (conservadas de run_minimal_overlap_routing.m)
% =========================================================================

function edges = path_to_edges(p)
% Convierte una secuencia de nodos (ruta) a una lista de aristas [n_edges x 2]
n_nodes = length(p);
if n_nodes < 2
    edges = [];
    return;
end
edges = [p(1:end-1)', p(2:end)'];
end

function edge_ids = incident_edge_ids_from_path(edges, node, G)
% Devuelve los IDs de las aristas del grafo G que son incidentes al nodo dado,
% limitadas a las aristas que se encuentran presentes en la ruta.
edge_ids = [];
for k = 1:size(edges, 1)
    e = edges(k, :);
    if any(e == node)
        e_id = findedge(G, e(1), e(2));
        if e_id > 0
            edge_ids(end+1, 1) = e_id; %#ok<AGROW>
        end
    end
end
end
