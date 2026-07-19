function path = construct_aco_path(G, source, gateway, tau, dist_to_gateway, partial_paths, cfg)
% Construcción ACO equilibrada: exploración útil sin excesivo costo

current = source;
visited = false(1, numnodes(G));
visited(current) = true;
path = current;

max_steps = max(6, ceil(cfg.aco_max_steps_factor * numnodes(G)));

for step = 1:max_steps
    if current == gateway
        return;
    end

    nbrs = neighbors(G, current)';
    nbrs = nbrs(~visited(nbrs));

    if isempty(nbrs)
        sp = shortestpath(G, current, gateway);
        if isempty(sp)
            path = shortestpath(G, source, gateway);
        else
            path = [path, sp(2:end)];
        end
        return;
    end

    desirability = zeros(size(nbrs));

    for k = 1:length(nbrs)
        nxt = nbrs(k);

        tau_uv = max(tau(current, nxt), eps);

        d = dist_to_gateway(nxt);
        if isinf(d)
            eta = eps;
        else
            eta = 1 / (1 + d);
        end

        overlap_pen = local_overlap_penalty(nxt, partial_paths);

        heuristic = eta / (1 + cfg.aco_overlap_penalty * overlap_pen + cfg.aco_hop_penalty);
        desirability(k) = (tau_uv ^ cfg.aco_alpha) * (heuristic ^ cfg.aco_beta) * (1 + cfg.aco_noise * rand());
    end

    if all(desirability <= 0) || any(isnan(desirability))
        sp = shortestpath(G, current, gateway);
        if isempty(sp)
            path = shortestpath(G, source, gateway);
        else
            path = [path, sp(2:end)];
        end
        return;
    end

    probs = desirability / sum(desirability);
    idx = roulette_wheel_selection(probs);
    next_node = nbrs(idx);

    path = [path, next_node];
    visited(next_node) = true;
    current = next_node;
end

% Si no llega, cerrar con shortest path
sp = shortestpath(G, current, gateway);
if isempty(sp)
    path = shortestpath(G, source, gateway);
else
    path = [path, sp(2:end)];
end
end