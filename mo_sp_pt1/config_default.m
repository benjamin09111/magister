function cfg = config_default()
% CONFIGURACIÓN BASE EXACTA SEGÚN EL PAPER / CÓDIGO ORIGINAL

cfg.N = 66;
cfg.lambdas = [4, 8, 12];
cfg.n_range = 2:2:22;
cfg.k_max = 100;
cfg.num_tests = 100;
cfg.use_topology_dataset = true;
cfg.conflict_pair_mode = 'paper_double';

% Mantengo colores similares al código original
cfg.colors = {
    [0 0.44 0.74], ...
    [0.85 0.32 0.10], ...
    [0.46 0.67 0.18]
};

% Para futura escalabilidad con deadline / scheduling
cfg.enable_deadline_module = false;
end
