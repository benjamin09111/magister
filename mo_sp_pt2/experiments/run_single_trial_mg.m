function trial = run_single_trial_mg(cfg, lambda, n, m, k, trial_idx, gateway_method, sensors, T_common)
% RUN_SINGLE_TRIAL_MG Ejecuta un trial completo de simulación (SP vs MO) 
% para una configuración específica de Multi-Gateway.
%
% INPUT:
%   cfg            - Struct de configuración base (debe tener cfg.N, cfg.w, cfg.H, etc.)
%   lambda         - Densidad del grafo (parámetro de escala)
%   n              - Número de flujos (sensores activos)
%   m              - Número de canales activos en la red
%   k              - Número de gateways (particiones de clúster)
%   trial_idx      - ID de la topología en el dataset para reproducibilidad
%   gateway_method - Método de centralidad ('degree', 'betweenness', etc.)
%   sensors        - (Opcional) Vector de sensores pre-seleccionados
%   T_common       - (Opcional) Períodos de flujos pre-seleccionados
%
% OUTPUT:
%   trial          - Struct con los resultados detallados de overlaps, hops y schedulability.

% 1. Inicializar semilla y reproducibilidad si trial_idx es provisto
if nargin < 6
    trial_idx = [];
end

if ~isempty(trial_idx)
    seed_val = trial_idx + 1000 * lambda + 100000 * n + 50000 * k;
    rng(seed_val, 'twister');
end

if nargin < 7 || isempty(gateway_method)
    gateway_method = 'degree';
end

% 2. Cargar Topología Baseline
if cfg.use_topology_dataset && ~isempty(trial_idx)
    topo = get_topology_from_dataset(cfg, lambda, trial_idx);
    G = topo.Graph;
else
    Lambda = lambda / cfg.N;
    G = generate_random_topology(cfg.N, Lambda);
end

% 3. Particionar la Red y Designar Gateways
cluster_labels = njw_spectral_clustering(G, k);
gateways = select_cluster_gateways(G, cluster_labels, k, gateway_method);

% 4. Seleccionar Sensores (Excluyendo a todos los gateways)
if nargin < 8 || isempty(sensors)
    sensors = select_sensors_mg(G, gateways, n);
end

% Mapear los gateways: cada sensor se conecta al gateway más cercano (hop-count) en el grafo
gateways_for_sensors = zeros(size(sensors));
for i = 1:numel(sensors)
    min_dist = Inf;
    best_gw = gateways(1);
    for j = 1:numel(gateways)
        path = shortestpath(G, sensors(i), gateways(j), 'Method', 'unweighted');
        dist = length(path) - 1;
        if dist < min_dist
            min_dist = dist;
            best_gw = gateways(j);
        end
    end
    gateways_for_sensors(i) = best_gw;
end

% 5. Generar Períodos Armónicos Comunes
if nargin < 9 || isempty(T_common)
    T_common = generate_periods_harmonic(n, cfg);
end

% =========================================================================
% 6. EVALUAR SHORTHEST PATH (SP)
% =========================================================================
sp_paths = run_shortest_path_routing_mg(G, sensors, gateways_for_sensors);
sp_flows = build_flow_set(sp_paths, cfg, T_common);

% Overlaps por nodos intermedios excluyendo gateways
omega_sp = compute_total_overlaps_mg(sp_paths, gateways);
avg_hops_sp = compute_average_hops(sp_paths);

% Evaluaciones en hiperperiodo
conflict_sp = compute_conflict_demand_window_mg(sp_flows, cfg.H);
contention_sp = compute_contention_demand_window_mg(sp_flows, m, cfg.H);
sched_sp = compute_schedulability_status_mg(sp_flows, m, cfg.H);

% =========================================================================
% 7. EVALUAR MINIMAL OVERLAPS (MO-MG)
% =========================================================================
% Penalización ψ_auto = λ/N según baseline de Santos2020a
psi = lambda / cfg.N;

[mo_paths, omega_mo] = run_minimal_overlap_routing_mg(G, sp_paths, sensors, gateways_for_sensors, psi, cfg.k_max);
mo_flows = build_flow_set(mo_paths, cfg, T_common);

% Overlaps por nodos intermedios excluyendo gateways
avg_hops_mo = compute_average_hops(mo_paths);

% Evaluaciones en hiperperiodo
conflict_mo = compute_conflict_demand_window_mg(mo_flows, cfg.H);
contention_mo = compute_contention_demand_window_mg(mo_flows, m, cfg.H);
sched_mo = compute_schedulability_status_mg(mo_flows, m, cfg.H);

% =========================================================================
% 8. ARMAR RESULTADOS DEL TRIAL
% =========================================================================
trial.gateway_method = char(gateway_method);
trial.gateways = gateways;
trial.sensors = sensors;
trial.gateways_for_sensors = gateways_for_sensors;

trial.omega_sp = omega_sp;
trial.omega_mo = omega_mo;

trial.avg_hops_sp = avg_hops_sp;
trial.avg_hops_mo = avg_hops_mo;

trial.conflict_sp = conflict_sp;
trial.conflict_mo = conflict_mo;

trial.contention_sp = contention_sp;
trial.contention_mo = contention_mo;

trial.sched_sp = sched_sp;
trial.sched_mo = sched_mo;
end
