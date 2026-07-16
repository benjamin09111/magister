function candidates = build_candidate_route_sets(G, sensors, gateway, mo_paths, cfg)
% Construye varias rutas candidatas por flujo
% Cada conjunto incluye primero la ruta MO, y luego alternativas diversas

n = length(sensors);
candidates = cell(n, 1);

% =========================================================
% Uso global de nodos/aristas en MO
% =========================================================
N = numnodes(G);
node_usage = zeros(N, 1);
edge_usage = zeros(numedges(G), 1);

for i = 1:n
    p = mo_paths{i};

    % Nodos (sin contar gateway al final)
    for k = 1:max(0, length(p)-1)
        node_usage(p(k)) = node_usage(p(k)) + 1;
    end

    % Aristas
    e = path_to_edges(p);
    for k = 1:size(e,1)
        id = findedge(G, e(k,1), e(k,2));
        if id > 0
            edge_usage(id) = edge_usage(id) + 1;
        end
    end
end

for i = 1:n
    candidates{i} = generate_candidate_paths_for_flow( ...
        G, sensors(i), gateway, mo_paths{i}, node_usage, edge_usage, cfg);
end
end
