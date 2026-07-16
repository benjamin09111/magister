function results = run_experiment_suite_vs_mo(cfg, alt_routing_fn, method_name)
% run_experiment_suite_vs_mo  Batería completa: método alternativo vs MO.
%
% Réplica exacta de run_experiment_suite_ngres pero comparando el método
% alternativo (alt_routing_fn) contra MO en lugar de SP contra MO.

num_lambdas = length(cfg.lambdas);
num_n       = length(cfg.n_range);

if isfield(cfg, 'm_contention_values')
    m_values = cfg.m_contention_values;
else
    m_values = [4, 8, 12];
end
num_m = length(m_values);

% --- Metadatos -----------------------------------------------------------
results.lambdas     = cfg.lambdas;
results.n_range     = cfg.n_range;
results.m_values    = m_values;
results.N           = cfg.N;
results.num_tests   = cfg.num_tests;
results.method_name = method_name;

% --- Métricas de routing -------------------------------------------------
results.mean_overlaps_alt  = zeros(num_lambdas, num_n);
results.mean_overlaps_mo   = zeros(num_lambdas, num_n);
results.mean_hops_alt      = zeros(num_lambdas, num_n);
results.mean_hops_mo       = zeros(num_lambdas, num_n);

% --- Métricas de demanda -------------------------------------------------
results.mean_conflict_alt  = zeros(num_lambdas, num_n);
results.mean_conflict_mo   = zeros(num_lambdas, num_n);

results.mean_contention_alt = zeros(num_m, num_n);
results.mean_contention_mo  = zeros(num_m, num_n);

% --- Schedulability ------------------------------------------------------
results.mean_sched_alt = zeros(num_lambdas, num_n);
results.mean_sched_mo  = zeros(num_lambdas, num_n);

% =========================================================================
% Parte 1: overlaps + hops + conflict demand variando lambda (m fijo)
% =========================================================================
if isfield(cfg, 'm_fixed_for_lambda')
    m_fixed_for_lambda = cfg.m_fixed_for_lambda;
elseif isfield(cfg, 'm_fixed')
    m_fixed_for_lambda = cfg.m_fixed;
else
    m_fixed_for_lambda = 8;
end

for l_idx = 1:num_lambdas
    lambda = cfg.lambdas(l_idx);
    Lambda = lambda / cfg.N;
    psi    = Lambda; %#ok<NASGU>

    fprintf('\n====================================================\n');
    fprintf('%s vs MO: lambda = %d (Lambda = %.4f)\n', method_name, lambda, Lambda);
    fprintf('====================================================\n');
    fprintf('%-8s %-10s %-10s %-10s %-10s %-10s %-10s %-10s\n', ...
        'n', 'ALT_Omg', 'MO_Omg', 'ALT_Hops', 'MO_Hops', ...
        'ALT_Conf', 'MO_Conf', 'Red_%');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        total_omega_alt   = 0;  total_omega_mo   = 0;
        total_hops_alt    = 0;  total_hops_mo    = 0;
        total_conflict_alt = 0; total_conflict_mo = 0;
        total_sched_alt   = 0;  total_sched_mo   = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_vs_mo(cfg, lambda, n, m_fixed_for_lambda, t, alt_routing_fn);

            total_omega_alt    = total_omega_alt    + trial.omega_alt;
            total_omega_mo     = total_omega_mo     + trial.omega_mo;
            total_hops_alt     = total_hops_alt     + trial.avg_hops_alt;
            total_hops_mo      = total_hops_mo      + trial.avg_hops_mo;
            total_conflict_alt = total_conflict_alt + trial.conflict_alt;
            total_conflict_mo  = total_conflict_mo  + trial.conflict_mo;
            total_sched_alt    = total_sched_alt    + trial.sched_alt;
            total_sched_mo     = total_sched_mo     + trial.sched_mo;
        end

        mean_omega_alt    = total_omega_alt    / cfg.num_tests;
        mean_omega_mo     = total_omega_mo     / cfg.num_tests;
        mean_hops_alt     = total_hops_alt     / cfg.num_tests;
        mean_hops_mo      = total_hops_mo     / cfg.num_tests;
        mean_conflict_alt = total_conflict_alt / cfg.num_tests;
        mean_conflict_mo  = total_conflict_mo  / cfg.num_tests;

        results.mean_overlaps_alt(l_idx, n_idx)  = mean_omega_alt;
        results.mean_overlaps_mo(l_idx, n_idx)   = mean_omega_mo;
        results.mean_hops_alt(l_idx, n_idx)      = mean_hops_alt;
        results.mean_hops_mo(l_idx, n_idx)       = mean_hops_mo;
        results.mean_conflict_alt(l_idx, n_idx)  = mean_conflict_alt;
        results.mean_conflict_mo(l_idx, n_idx)   = mean_conflict_mo;
        results.mean_sched_alt(l_idx, n_idx)     = total_sched_alt / cfg.num_tests;
        results.mean_sched_mo(l_idx, n_idx)      = total_sched_mo  / cfg.num_tests;

        if mean_conflict_alt > 0
            reduc = 100 * (mean_conflict_alt - mean_conflict_mo) / mean_conflict_alt;
        else
            reduc = 0;
        end

        fprintf('%-8d %-10.2f %-10.2f %-10.2f %-10.2f %-10.2f %-10.2f %-10.1f\n', ...
            n, mean_omega_alt, mean_omega_mo, mean_hops_alt, mean_hops_mo, ...
            mean_conflict_alt, mean_conflict_mo, reduc);
    end
end

% =========================================================================
% Parte 2: contention demand variando m = {4,8,12}, lambda fijo
% =========================================================================
% (Desactivado para correr rápido solo overlaps y hops)
% if isfield(cfg, 'lambda_fixed_for_contention')
%     lambda_fixed_for_contention = cfg.lambda_fixed_for_contention;
% else
%     lambda_fixed_for_contention = 4;
% end
% 
% for m_idx = 1:num_m
%     m = m_values(m_idx);
% 
%     fprintf('\n====================================================\n');
%     fprintf('%s vs MO CONTENTION: m = %d, lambda = %d\n', method_name, m, lambda_fixed_for_contention);
%     fprintf('====================================================\n');
% 
%     for n_idx = 1:num_n
%         n = cfg.n_range(n_idx);
% 
%         total_contention_alt = 0;
%         total_contention_mo  = 0;
% 
%         for t = 1:cfg.num_tests
%             trial = run_single_trial_vs_mo(cfg, lambda_fixed_for_contention, n, m, t, alt_routing_fn);
%             total_contention_alt = total_contention_alt + trial.contention_alt;
%             total_contention_mo  = total_contention_mo  + trial.contention_mo;
%         end
% 
%         results.mean_contention_alt(m_idx, n_idx) = total_contention_alt / cfg.num_tests;
%         results.mean_contention_mo(m_idx, n_idx)  = total_contention_mo  / cfg.num_tests;
%     end
% end
end
