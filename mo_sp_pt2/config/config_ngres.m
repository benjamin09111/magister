function cfg = config_ngres()
% Configuración base para réplica NG-RES 2021
% Etapa actual: routing + flow model base

cfg.N = 66;
cfg.lambdas = [4, 8, 12];
cfg.n_range = 2:2:22;

% Parámetros del paper / presentación
cfg.k_max = 100;
cfg.num_tests = 100;
cfg.m_fixed = 8;   % para overlaps y route length
cfg.use_topology_dataset = true;
cfg.conflict_pair_mode = 'paper_double';

cfg.colors = {
    [0 0.44 0.74], ...
    [0.85 0.32 0.10], ...
    [0.46 0.67 0.18]
};

% =========================================================
% Modelo de flujos (según paper)
% =========================================================

% Cada costo Ci = hops * w
cfg.w = 2;

% Periodos armónicos 2^eta, eta en [4,7]
cfg.eta_min = 4;
cfg.eta_max = 7;

% Periodos posibles => {16, 32, 64, 128}
cfg.period_values = 2.^(cfg.eta_min:cfg.eta_max);

% Hyperperiod esperado
cfg.H = max(cfg.period_values);   % 128

% Deadlines implícitos: Di = Ti
cfg.use_implicit_deadlines = true;

% Etapa actual
cfg.stage = 'flow_model_ready';
end
