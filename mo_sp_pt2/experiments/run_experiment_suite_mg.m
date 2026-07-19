function results = run_experiment_suite_mg(cfg)
% RUN_EXPERIMENT_SUITE_MG Ejecuta la simulación completa recorriendo todas las 
% combinaciones de k, centralidades, lambdas, n, y topologías.
%
% INPUT:
%   cfg     - Struct de configuración (debe tener k_range, centrality_methods, etc.)
%
% OUTPUT:
%   results - Struct con matrices de resultados agregados y perfiles muestra.

ks = cfg.k_range;
methods = cfg.centrality_methods;
lambdas = cfg.lambdas;
n_range = cfg.n_range;
num_tests = cfg.num_tests;
m_channels = cfg.m_fixed;

num_ks = length(ks);
num_methods = length(methods);
num_lambdas = length(lambdas);
num_n = length(n_range);

% Matrices para guardar promedios de las métricas (SP y MO)
results.ks = ks;
results.gateway_methods = methods;
results.lambdas = lambdas;
results.n_range = n_range;
results.N = cfg.N;
results.num_tests = num_tests;
results.m_fixed = m_channels;

% Schedulability ratio (SP y MO)
results.sched_ratio_sp = zeros(num_ks, num_methods, num_lambdas, num_n);
results.sched_ratio_mo = zeros(num_ks, num_methods, num_lambdas, num_n);

% Overlaps promedio (SP y MO)
results.mean_overlaps_sp = zeros(num_ks, num_methods, num_lambdas, num_n);
results.mean_overlaps_mo = zeros(num_ks, num_methods, num_lambdas, num_n);

% Hops promedio (SP y MO)
results.mean_hops_sp = zeros(num_ks, num_methods, num_lambdas, num_n);
results.mean_hops_mo = zeros(num_ks, num_methods, num_lambdas, num_n);

% Conflictos promedio (SP y MO)
results.mean_conflict_sp = zeros(num_ks, num_methods, num_lambdas, num_n);
results.mean_conflict_mo = zeros(num_ks, num_methods, num_lambdas, num_n);

fprintf('Iniciando Suite de Experimentos Multi-Gateway...\n');

% Bucle sobre los valores de k (gateways)
for k_idx = 1:num_ks
    k = ks(k_idx);
    fprintf('\n>>> Evaluando k = %d gateways <<<\n', k);
    
    % Bucle sobre las densidades lambda
    for l_idx = 1:num_lambdas
        lambda = lambdas(l_idx);
        fprintf('  lambda = %d | m = %d canales\n', lambda, m_channels);
        
        % Bucle sobre el número de flujos n
        for n_idx = 1:num_n
            n = n_range(n_idx);
            
            % Inicializadores de sumas para promediar
            sum_sched_sp = zeros(num_methods, 1);
            sum_sched_mo = zeros(num_methods, 1);
            sum_overlaps_sp = zeros(num_methods, 1);
            sum_overlaps_mo = zeros(num_methods, 1);
            sum_hops_sp = zeros(num_methods, 1);
            sum_hops_mo = zeros(num_methods, 1);
            sum_conflict_sp = zeros(num_methods, 1);
            sum_conflict_mo = zeros(num_methods, 1);
            
            % Ejecutar sobre las num_tests topologías (diseño paired)
            for t = 1:num_tests
                topo = get_topology_from_dataset(cfg, lambda, t);
                G = topo.Graph;
                
                % 1. Calcular clustering NJW una sola vez para esta topología y k
                cluster_labels = njw_spectral_clustering(G, k);
                
                % 2. Designar gateways para cada método de centralidad
                gateways_matrix = zeros(num_methods, k);
                for met_idx = 1:num_methods
                    gateways_matrix(met_idx, :) = select_cluster_gateways(G, cluster_labels, k, methods{met_idx});
                end
                
                % 3. Seleccionar sensores comunes (excluyendo la unión de todos los gateways designados)
                all_gws = unique(gateways_matrix(:));
                sensors = select_common_sensors_for_gateways(G, all_gws, n);
                
                % 4. Generar períodos armónicos comunes
                T_common = generate_periods_harmonic(n, cfg);
                
                % 5. Correr simulaciones para cada método sobre este escenario paired
                for met_idx = 1:num_methods
                    trial = run_single_trial_mg(cfg, lambda, n, m_channels, k, t, methods{met_idx}, sensors, T_common);
                    
                    sum_sched_sp(met_idx) = sum_sched_sp(met_idx) + trial.sched_sp;
                    sum_sched_mo(met_idx) = sum_sched_mo(met_idx) + trial.sched_mo;
                    
                    sum_overlaps_sp(met_idx) = sum_overlaps_sp(met_idx) + trial.omega_sp;
                    sum_overlaps_mo(met_idx) = sum_overlaps_mo(met_idx) + trial.omega_mo;
                    
                    sum_hops_sp(met_idx) = sum_hops_sp(met_idx) + trial.avg_hops_sp;
                    sum_hops_mo(met_idx) = sum_hops_mo(met_idx) + trial.avg_hops_mo;
                    
                    sum_conflict_sp(met_idx) = sum_conflict_sp(met_idx) + trial.conflict_sp;
                    sum_conflict_mo(met_idx) = sum_conflict_mo(met_idx) + trial.conflict_mo;
                end
            end
            
            % Calcular promedios y almacenar en las matrices correspondientes
            for met_idx = 1:num_methods
                results.sched_ratio_sp(k_idx, met_idx, l_idx, n_idx) = sum_sched_sp(met_idx) / num_tests;
                results.sched_ratio_mo(k_idx, met_idx, l_idx, n_idx) = sum_sched_mo(met_idx) / num_tests;
                
                results.mean_overlaps_sp(k_idx, met_idx, l_idx, n_idx) = sum_overlaps_sp(met_idx) / num_tests;
                results.mean_overlaps_mo(k_idx, met_idx, l_idx, n_idx) = sum_overlaps_mo(met_idx) / num_tests;
                
                results.mean_hops_sp(k_idx, met_idx, l_idx, n_idx) = sum_hops_sp(met_idx) / num_tests;
                results.mean_hops_mo(k_idx, met_idx, l_idx, n_idx) = sum_hops_mo(met_idx) / num_tests;
                
                results.mean_conflict_sp(k_idx, met_idx, l_idx, n_idx) = sum_conflict_sp(met_idx) / num_tests;
                results.mean_conflict_mo(k_idx, met_idx, l_idx, n_idx) = sum_conflict_mo(met_idx) / num_tests;
            end
        end
        fprintf('    Finalizado lambda = %d para todos los flujos n.\n', lambda);
    end
end

% =========================================================================
% EXTRAER DATOS MUESTRA PARA EL GRÁFICO (B) Y (C)
% =========================================================================
fprintf('\nExtrayendo perfiles de demanda muestra para Gráfico (b)...\n');
% Elegimos la topología t=1, lambda=4 (índice 1), k=3 (índice 2), n=14
sample_topo = get_topology_from_dataset(cfg, 4, 1);
G_sample = sample_topo.Graph;
labels_sample = njw_spectral_clustering(G_sample, 3);

% Gateways bajo Random y Degree
gws_rand = select_cluster_gateways(G_sample, labels_sample, 3, 'random');
gws_deg  = select_cluster_gateways(G_sample, labels_sample, 3, 'degree');

% Sensores y periodos comunes
all_sample_gws = unique([gws_rand; gws_deg]);
sensors_sample = select_common_sensors_for_gateways(G_sample, all_sample_gws, 14);
T_sample = generate_periods_harmonic(14, cfg);

% Mapear sensores al gateway más cercano para Random y Degree
gws_rand_for_sensors = zeros(size(sensors_sample));
gws_deg_for_sensors = zeros(size(sensors_sample));
for i = 1:numel(sensors_sample)
    % Para Random
    min_dist_r = Inf;
    best_gw_r = gws_rand(1);
    for j = 1:numel(gws_rand)
        path = shortestpath(G_sample, sensors_sample(i), gws_rand(j), 'Method', 'unweighted');
        dist = length(path) - 1;
        if dist < min_dist_r
            min_dist_r = dist;
            best_gw_r = gws_rand(j);
        end
    end
    gws_rand_for_sensors(i) = best_gw_r;
    
    % Para Degree
    min_dist_d = Inf;
    best_gw_d = gws_deg(1);
    for j = 1:numel(gws_deg)
        path = shortestpath(G_sample, sensors_sample(i), gws_deg(j), 'Method', 'unweighted');
        dist = length(path) - 1;
        if dist < min_dist_d
            min_dist_d = dist;
            best_gw_d = gws_deg(j);
        end
    end
    gws_deg_for_sensors(i) = best_gw_d;
end

% SP / MO paths y flujos bajo Random (k=3, n=14)
paths_rand = run_shortest_path_routing_mg(G_sample, sensors_sample, gws_rand_for_sensors);
flows_rand = build_flow_set(paths_rand, cfg, T_sample);

% SP / MO paths y flujos bajo Degree (k=3, n=14)
paths_deg = run_shortest_path_routing_mg(G_sample, sensors_sample, gws_deg_for_sensors);
flows_deg = build_flow_set(paths_deg, cfg, T_sample);

% Obtener perfiles de demanda para cada l en [1, H]
demand_profile_rand = zeros(cfg.H, 1);
demand_profile_deg  = zeros(cfg.H, 1);
sbf = (1:cfg.H)'; % sbf normalizada = l (slots) para comparar con la demanda normalizada por m


for ell = 1:cfg.H
    demand_profile_rand(ell) = compute_contention_demand_window_mg(flows_rand, m_channels, ell) + ...
                               compute_conflict_demand_window_mg(flows_rand, ell);
    demand_profile_deg(ell)  = compute_contention_demand_window_mg(flows_deg, m_channels, ell) + ...
                               compute_conflict_demand_window_mg(flows_deg, ell);
end

% Guardar datos de perfiles muestra (convertidos a milisegundos: 1 slot = 10 ms)
results.sample_b.time_ms = (1:cfg.H)' * 10;
results.sample_b.demand_rand_ms = demand_profile_rand * 10;
results.sample_b.demand_deg_ms = demand_profile_deg * 10;
results.sample_b.sbf_ms = sbf * 10;

% Guardar datos para Graficar el Mapa de Red (C) en Python
results.sample_c.adjacency = full(adjacency(G_sample));
results.sample_c.labels = labels_sample;
results.sample_c.gateways_deg = gws_deg;
results.sample_c.gateways_rand = gws_rand;

end

% =========================================================================
% FUNCION AUXILIAR PAIRED SENSORS
% =========================================================================
function sensors = select_common_sensors_for_gateways(G, excluded, n)
N = numnodes(G);
all_nodes = 1:N;
potential = setdiff(all_nodes, excluded(:)');

% Si la exclusión de todos los gateways posibles deja muy pocos nodos,
% disminuimos la exclusión a solo el primer gateway de referencia.
if numel(potential) < n
    potential = setdiff(all_nodes, excluded(1));
end

if numel(potential) < n
    error('select_common_sensors_for_gateways: No hay suficientes nodos comunes libres.');
end

% Mezclar y seleccionar
rng(12345, 'twister'); % Semilla fija para consistencia en la selección común
idx = randperm(numel(potential), n);
sensors = potential(idx);
end
