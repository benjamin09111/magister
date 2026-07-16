function sweep_results = run_psi_sweep_experiment(cfg, psi_values)
% run_psi_sweep_experiment  Barrido sistemático del parámetro psi (phi) en MO.
%
% Ejecuta el algoritmo Minimal Overlaps (MO) para cada valor de psi en el
% vector psi_values, usando exactamente la misma infraestructura de
% experimentos que el resto del proyecto (run_experiment_suite_vs_mo).
%
% El resultado permite identificar empíricamente las versiones "best-MO" y
% "worst-MO" del algoritmo según la elección de psi, y cuantificar la
% sensibilidad del método a este parámetro arbitrario.
%
% INPUT:
%   cfg        - struct de configuración (mismo que main_experiments_control)
%   psi_values - vector de valores de psi a evaluar (ej: logspace(-2, 1, 9))
%
% OUTPUT:
%   sweep_results - struct con campos:
%     .psi_values      - vector de valores evaluados
%     .psi_auto        - valor de psi automático de referencia (lambda/N)
%     .mean_overlaps   - matriz (num_psi x num_lambdas x num_n)
%     .mean_hops       - matriz (num_psi x num_lambdas x num_n)
%     .lambdas         - vector de lambdas usados
%     .n_range         - vector de n evaluados
%     .cfg             - configuración usada (para trazabilidad)

num_psi    = length(psi_values);
num_lambda = length(cfg.lambdas);
num_n      = length(cfg.n_range);

% --- Pre-alocar resultados ------------------------------------------------
sweep_results.psi_values    = psi_values;
sweep_results.lambdas       = cfg.lambdas;
sweep_results.n_range       = cfg.n_range;
sweep_results.cfg           = cfg;
sweep_results.mean_overlaps = zeros(num_psi, num_lambda, num_n);
sweep_results.mean_hops     = zeros(num_psi, num_lambda, num_n);

% --- Calcular psi_auto de referencia (promedio sobre los 3 lambdas) -------
% psi_auto = lambda/N (densidad del grafo), igual que en MO estándar.
% Usamos lambda=8 (valor central) como representativo.
psi_auto_ref = 8 / cfg.N;
sweep_results.psi_auto = psi_auto_ref;

fprintf('\n============================================================\n');
fprintf('BARRIDO PSI: %d valores x %d lambdas x %d flujos x %d trials\n', ...
    num_psi, num_lambda, num_n, cfg.num_tests);
fprintf('psi_auto de referencia (lambda=8/N=66): %.6f\n', psi_auto_ref);
fprintf('============================================================\n');

% --- Bucle principal sobre valores de psi ---------------------------------
for p_idx = 1:num_psi
    psi_val = psi_values(p_idx);

    fprintf('\n[%d/%d] Evaluando psi = %.6f ...', p_idx, num_psi, psi_val);

    % Construir función handle para este psi específico
    routing_fn = @(G, s, gw, c) run_mo_fixed_psi_routing(G, s, gw, c, psi_val);
    label = sprintf('MO(psi=%.4g)', psi_val);

    % Reutilizar el experimento estándar vs MO
    res = run_experiment_suite_vs_mo(cfg, routing_fn, label);

    % Extraer solo los resultados del método alternativo (= MO con psi fijo)
    % mean_overlaps_alt: (num_lambdas x num_n)
    sweep_results.mean_overlaps(p_idx, :, :) = res.mean_overlaps_alt;
    sweep_results.mean_hops(p_idx, :, :)     = res.mean_hops_alt;

    fprintf(' [OK]\n');
end

fprintf('\nBarrido psi completado.\n');
end
