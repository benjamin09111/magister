function [best_paths_reported, best_omega_reported] = run_mo_aco_routing(G, mo_paths, sensors, gateway, cfg)
% MO + ACO combinacional
% 1) Genera varias rutas candidatas por flujo
% 2) ACO elige UNA ruta por flujo
% 3) Se minimiza el overlap total del conjunto

n = length(sensors);

% =========================================================
% Baseline MO
% =========================================================
baseline_paths = mo_paths;
baseline_omega = compute_total_overlaps(baseline_paths, gateway);
baseline_hops = compute_average_hops(baseline_paths);

% =========================================================
% Construir conjuntos de rutas candidatas
% candidates{i}{j} = j-esima ruta candidata del flujo i
% =========================================================
candidates = build_candidate_route_sets(G, sensors, gateway, mo_paths, cfg);

num_candidates = zeros(n, 1);
for i = 1:n
    num_candidates(i) = length(candidates{i});
end

% =========================================================
% Feromonas por flujo-candidato
% tau{i}(j) = feromona del candidato j del flujo i
% =========================================================
tau = cell(n, 1);
eta = cell(n, 1);

for i = 1:n
    tau{i} = ones(1, num_candidates(i));

    % Sesgo inicial muy suave a MO (que está en posición 1)
    tau{i}(1) = 1.2;

    eta{i} = zeros(1, num_candidates(i));

    mo_path_i = candidates{i}{1};
    mo_edges_i = path_to_edges(mo_path_i);

    for j = 1:num_candidates(i)
        p = candidates{i}{j};
        p_edges = path_to_edges(p);

        % Novedad respecto a MO: mientras más distinta, mejor heurística
        node_diff = length(setxor(mo_path_i, p));

        edge_common = 0;
        if ~isempty(mo_edges_i) && ~isempty(p_edges)
            edge_common = size(intersect(mo_edges_i, p_edges, 'rows'), 1);
        end

        novelty = node_diff + max(0, size(p_edges,1) - edge_common);

        % Hops casi no penalizan por ahora
        hops_term = length(p) - 1;

        eta{i}(j) = 1 + novelty / (1 + cfg.aco_hops_penalty * hops_term);
    end
end

% =========================================================
% Mejor solución ACO encontrada
% =========================================================
best_paths_aco = baseline_paths;
best_omega_aco = inf;
best_hops_aco = inf;

% =========================================================
% ACO principal
% =========================================================
for iter = 1:cfg.aco_num_iterations
    ant_selected_idx = cell(cfg.aco_num_ants, 1);
    ant_paths = cell(cfg.aco_num_ants, 1);
    ant_omega = inf(cfg.aco_num_ants, 1);
    ant_hops = inf(cfg.aco_num_ants, 1);

    for a = 1:cfg.aco_num_ants
        selected_idx = zeros(n, 1);
        selected_paths = cell(n, 1);

        % Construir la combinación en orden aleatorio de flujos
        flow_order = randperm(n);

        for pos = 1:n
            i = flow_order(pos);

            desirability = zeros(1, num_candidates(i));

            for j = 1:num_candidates(i)
                candidate_path = candidates{i}{j};

                % Overlap parcial contra rutas ya elegidas por la hormiga
                partial_overlap = 0;
                partial_hops = length(candidate_path) - 1;

                for k = 1:n
                    if isempty(selected_paths{k})
                        continue;
                    end
                    partial_overlap = partial_overlap + ...
                        compute_pairwise_path_overlap(candidate_path, selected_paths{k}, gateway);
                end

                heuristic_dynamic = 1 / ...
                    (1 + cfg.aco_partial_overlap_penalty * partial_overlap + ...
                         cfg.aco_hops_penalty * partial_hops);

                desirability(j) = (tau{i}(j) ^ cfg.aco_alpha) * ...
                                  ((eta{i}(j) * heuristic_dynamic) ^ cfg.aco_beta);
            end

            % A veces explorar casi al azar entre opciones razonables
            if rand() < cfg.aco_random_choice_prob
                [~, sorted_local] = sort(desirability, 'descend');
                top_local = sorted_local(1:min(3, length(sorted_local)));
                chosen_j = top_local(randi(length(top_local)));
            else
                if all(desirability <= 0) || any(isnan(desirability))
                    chosen_j = randi(num_candidates(i));
                else
                    probs = desirability / sum(desirability);
                    chosen_j = roulette_wheel_selection(probs);
                end
            end

            selected_idx(i) = chosen_j;
            selected_paths{i} = candidates{i}{chosen_j};
        end

        omega_val = compute_total_overlaps(selected_paths, gateway);
        hops_val = compute_average_hops(selected_paths);

        ant_selected_idx{a} = selected_idx;
        ant_paths{a} = selected_paths;
        ant_omega(a) = omega_val;
        ant_hops(a) = hops_val;
    end

    % Ordenar hormigas: overlaps primero, hops de desempate
    [~, sorted_ants] = sortrows([ant_omega, ant_hops], [1 2]);

    best_ant_iter = sorted_ants(1);
    iter_best_paths = ant_paths{best_ant_iter};
    iter_best_omega = ant_omega(best_ant_iter);
    iter_best_hops = ant_hops(best_ant_iter);

    if (iter_best_omega < best_omega_aco) || ...
       (iter_best_omega == best_omega_aco && iter_best_hops < best_hops_aco)
        best_paths_aco = iter_best_paths;
        best_omega_aco = iter_best_omega;
        best_hops_aco = iter_best_hops;
    end

    % =====================================================
    % Evaporación
    % =====================================================
    for i = 1:n
        tau{i} = (1 - cfg.aco_rho) * tau{i};
    end

    % =====================================================
    % Depósito en top-k hormigas
    % =====================================================
    top_k = min(cfg.aco_top_k_deposit, cfg.aco_num_ants);

    for r = 1:top_k
        ant_idx = sorted_ants(r);
        sel = ant_selected_idx{ant_idx};
        omega_val = ant_omega(ant_idx);

        deposit_amount = (cfg.aco_Q / (1 + omega_val)) * (1 / r);

        for i = 1:n
            j = sel(i);
            tau{i}(j) = tau{i}(j) + deposit_amount;
        end
    end

    % Refuerzo suave al mejor global ACO
    if isfinite(best_omega_aco)
        bonus = 0.20 * cfg.aco_Q / (1 + best_omega_aco);
        for i = 1:n
            jbest = 1;
            for j = 1:num_candidates(i)
                if isequal(candidates{i}{j}, best_paths_aco{i})
                    jbest = j;
                    break;
                end
            end
            tau{i}(jbest) = tau{i}(jbest) + bonus;
        end
    end

    if best_omega_aco == 0
        break;
    end
end

% =========================================================
% Reportar mejor entre MO y ACO
% =========================================================
if cfg.aco_report_best_of_mo_and_aco
    if (best_omega_aco < baseline_omega) || ...
       (best_omega_aco == baseline_omega && best_hops_aco < baseline_hops)
        best_paths_reported = best_paths_aco;
        best_omega_reported = best_omega_aco;
    else
        best_paths_reported = baseline_paths;
        best_omega_reported = baseline_omega;
    end
else
    best_paths_reported = best_paths_aco;
    best_omega_reported = best_omega_aco;
end
end


function idx = roulette_wheel_selection(probs)
r = rand();
c = cumsum(probs);
idx = find(r <= c, 1, 'first');
if isempty(idx)
    idx = length(probs);
end
end