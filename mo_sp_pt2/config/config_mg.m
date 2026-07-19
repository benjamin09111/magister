function cfg = config_mg()
% CONFIG_MG Configuración base para simulaciones con Multi-Gateway
% Adaptada de config_ngres.m de mo_sp_pt1.

cfg.N = 66;
cfg.lambdas = [4, 8, 12];
cfg.n_range = 2:2:30;

% Parámetros de la heurística MO
cfg.k_max = 100;
cfg.num_tests = 100; % Por defecto 100 topologías (se puede reducir para test rápido)
cfg.m_fixed = 8;     % Número de canales por defecto (puede ser 8 o 16)
cfg.use_topology_dataset = true;
cfg.conflict_pair_mode = 'paper_double';

% Parámetros del módulo Multi-Gateway
cfg.k_range = [1, 3, 5]; % Número de gateways (clusters) a evaluar
cfg.centrality_methods = {'degree', 'betweenness', 'closeness', 'eigenvector', 'random'};

% =========================================================
% Modelo de flujos
% =========================================================

% Cada costo Ci = hops * w
cfg.w = 2;

% Periodos armónicos 2^eta, eta en [4,7] => {16, 32, 64, 128} slots
cfg.eta_min = 4;
cfg.eta_max = 7;
cfg.period_values = 2.^(cfg.eta_min:cfg.eta_max);

% Hyperperiod esperado
cfg.H = max(cfg.period_values);   % 128 slots

% Deadlines implícitos: Di = Ti
cfg.use_implicit_deadlines = true;

cfg.stage = 'multi_gateway_ready';
end
