function cfg = config_mo_aco()
% Configuración para MO vs MO+ACO combinacional
% Objetivo principal: minimizar overlaps
% Se permite aumentar hops si eso ayuda a separar rutas

cfg.N = 66;
cfg.lambdas = [4, 8, 12];
cfg.n_range = 2:2:22;
cfg.k_max = 100;

% Para depurar rápido usar 20; para resultados finales subir a 100
cfg.num_tests = 100;

cfg.colors = {
    [0 0.44 0.74], ...
    [0.85 0.32 0.10], ...
    [0.46 0.67 0.18]
};

% =========================================================
% ACO combinacional
% =========================================================
cfg.aco_num_ants = 20;
cfg.aco_num_iterations = 35;

cfg.aco_alpha = 1.0;      % peso feromona
cfg.aco_beta = 2.5;       % peso heurístico
cfg.aco_rho = 0.10;       % evaporación
cfg.aco_Q = 2.0;          % depósito

cfg.aco_top_k_deposit = 4;

% Pequeña probabilidad de explorar casi al azar entre opciones razonables
cfg.aco_random_choice_prob = 0.10;

% Al final, reportar la mejor entre MO y ACO
cfg.aco_report_best_of_mo_and_aco = true;

% =========================================================
% Generación de rutas candidatas
% =========================================================
cfg.num_candidates_per_flow = 8;          % incluye la ruta MO
cfg.max_candidate_attempts = 40;          % intentos por flujo

% Penalizaciones para forzar rutas distintas a MO
cfg.candidate_global_edge_penalty = 12.0;
cfg.candidate_global_node_penalty = 6.0;
cfg.candidate_own_mo_edge_penalty = 20.0;
cfg.candidate_own_mo_node_penalty = 10.0;

% Perturbación aleatoria para crear diversidad
cfg.candidate_random_weight_scale = 6.0;

% En selección combinacional:
% penalizar mucho overlap parcial
cfg.aco_partial_overlap_penalty = 25.0;

% Hops casi no importan por ahora
cfg.aco_hops_penalty = 0.001;
end