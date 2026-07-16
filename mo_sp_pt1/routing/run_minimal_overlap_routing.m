function [best_paths, best_omega] = run_minimal_overlap_routing(G, initial_paths, sensors, gateway, psi, k_max)
% Implementa el algoritmo MO manteniendo la lógica del código original:
% - G_k acumulativo
% - penalización de aristas compartidas
% - recalcular shortestpath sobre G_k
% - quedarse con el mejor omega encontrado

n = length(sensors);

Phi = initial_paths;
G_k = G;
G_k.Edges.Weight = ones(numedges(G_k), 1);

best_paths = Phi;
best_omega = compute_total_overlaps(Phi, gateway);

for k = 1:k_max
    current_weights = G_k.Edges.Weight;

    for i = 1:n
        for j = i+1:n
            % nodos compartidos excluyendo gateway
            shared_nodes = intersect(Phi{i}(Phi{i} ~= gateway), Phi{j}(Phi{j} ~= gateway));
            delta_ij = length(shared_nodes);

            if delta_ij > 0
                % Penalizar aristas incidentes a los nodos realmente solapados.
                % Esto aproxima mejor el peso por overlap de nodos descrito en el paper.
                edges_i = path_to_edges(Phi{i});
                edges_j = path_to_edges(Phi{j});

                penalized_edges = [];
                for idx_node = 1:length(shared_nodes)
                    node = shared_nodes(idx_node);

                    penalized_edges = [penalized_edges; incident_edge_ids_from_path(edges_i, node, G_k)]; %#ok<AGROW>
                    penalized_edges = [penalized_edges; incident_edge_ids_from_path(edges_j, node, G_k)]; %#ok<AGROW>
                end

                penalized_edges = unique(penalized_edges);

                for idx_edge = 1:length(penalized_edges)
                    e_id = penalized_edges(idx_edge);
                    if e_id > 0
                        % Penalización acumulativa según overlap de nodos y densidad
                        current_weights(e_id) = current_weights(e_id) + (delta_ij * psi);
                    end
                end
            end
        end
    end

    G_k.Edges.Weight = current_weights;

    % Recalcular Phi^k sobre el grafo modificado G^k
    new_paths = cell(n, 1);
    for i = 1:n
        new_paths{i} = shortestpath(G_k, sensors(i), gateway);
    end

    omega_k = compute_total_overlaps(new_paths, gateway);

    if omega_k < best_omega
        best_omega = omega_k;
        best_paths = new_paths;
    end

    Phi = new_paths;

    if omega_k == 0
        break;
    end
end

function edge_ids = incident_edge_ids_from_path(edges, node, G)
% Devuelve los ids de aristas del grafo que son incidentes al nodo dado,
% restringidos a las aristas que aparecen en la ruta.

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
end
