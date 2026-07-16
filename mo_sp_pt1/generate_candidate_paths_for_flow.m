function candidate_paths = generate_candidate_paths_for_flow(G, source, gateway, mo_path, node_usage, edge_usage, cfg)
% Genera rutas candidatas diversas para un flujo
% La primera ruta siempre es la ruta MO
% Las demás se crean penalizando fuertemente nodos/aristas usados por MO

candidate_paths = {};
candidate_paths{1} = mo_path;

target_num = cfg.num_candidates_per_flow;
max_attempts = cfg.max_candidate_attempts;

mo_edges = path_to_edges(mo_path);

% Para comparación de duplicados
signatures = {};
signatures{1} = path_signature(mo_path);

attempt = 0;

while length(candidate_paths) < target_num && attempt < max_attempts
    attempt = attempt + 1;

    w = ones(numedges(G), 1);

    % ============================================
    % Penalización global: alejarse de zonas usadas por MO
    % ============================================
    for eid = 1:numedges(G)
        endpoints_uv = G.Edges.EndNodes(eid, :);
        u = endpoints_uv(1);
        v = endpoints_uv(2);

        global_edge_term = cfg.candidate_global_edge_penalty * edge_usage(eid);
        global_node_term = cfg.candidate_global_node_penalty * (node_usage(u) + node_usage(v));

        w(eid) = w(eid) + global_edge_term + global_node_term;
    end

    % ============================================
    % Penalización fuerte de la ruta MO propia
    % ============================================
    % Penalizar aristas de la propia MO
    for k = 1:size(mo_edges,1)
        eid = findedge(G, mo_edges(k,1), mo_edges(k,2));
        if eid > 0
            w(eid) = w(eid) + cfg.candidate_own_mo_edge_penalty * (0.5 + rand());
        end
    end

    % Penalizar nodos de la propia MO (excepto fuente y gateway)
    if length(mo_path) > 2
        inner_nodes = mo_path(2:end-1);

        for idx = 1:length(inner_nodes)
            node_k = inner_nodes(idx);
            nbrs = neighbors(G, node_k);

            for t = 1:length(nbrs)
                eid = findedge(G, node_k, nbrs(t));
                if eid > 0
                    w(eid) = w(eid) + cfg.candidate_own_mo_node_penalty * (0.5 + rand());
                end
            end
        end
    end

    % ============================================
    % Ruido aleatorio adicional
    % ============================================
    w = w + cfg.candidate_random_weight_scale * rand(numedges(G), 1);

    % Crear grafo ponderado
    Gw = G;
    Gw.Edges.Weight = w;

    % Ruta candidata
    p = shortestpath(Gw, source, gateway);

    if isempty(p)
        continue;
    end

    sig = path_signature(p);

    % Guardar solo si es nueva
    if ~any(strcmp(signatures, sig))
        candidate_paths{end+1} = p; %#ok<AGROW>
        signatures{end+1} = sig; %#ok<AGROW>
    end
end
end


function s = path_signature(path)
s = sprintf('%d-', path);
end