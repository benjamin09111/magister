function results = run_experiment_suite_ngres(cfg)
% Corre toda la batería de simulaciones NG-RES para:
% - overlaps
% - average hops
% - conflict demand
% - contention demand
%
% En esta etapa usamos m = {4, 8, 12}, como en la presentación.

num_lambdas = length(cfg.lambdas);
num_n = length(cfg.n_range);

% Para conflict/contention demand, se usa la configuración del cfg si existe.
if isfield(cfg, 'm_contention_values')
    m_values = cfg.m_contention_values;
else
    m_values = [4, 8, 12];
end
num_m = length(m_values);

results.lambdas = cfg.lambdas;
results.n_range = cfg.n_range;
results.m_values = m_values;
results.N = cfg.N;
results.num_tests = cfg.num_tests;

% Routing metrics
results.mean_overlaps_sp = zeros(num_lambdas, num_n);
results.mean_overlaps_mo = zeros(num_lambdas, num_n);
results.mean_hops_sp = zeros(num_lambdas, num_n);
results.mean_hops_mo = zeros(num_lambdas, num_n);

% Demand metrics
results.mean_conflict_sp = zeros(num_lambdas, num_n);
results.mean_conflict_mo = zeros(num_lambdas, num_n);

results.mean_contention_sp = zeros(num_m, num_n);
results.mean_contention_mo = zeros(num_m, num_n);

% =========================================================
% Parte 1: overlaps + hops + conflict demand variando lambda
% (m fijo = 8 para routing/conflict, consistente con la base)
% =========================================================
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
    psi = Lambda;

    fprintf('\n====================================================\n');
    fprintf('NG-RES FULL: lambda = %d (Lambda = %.4f, psi = %.4f)\n', lambda, Lambda, psi);
    fprintf('====================================================\n');
    fprintf('%-8s %-10s %-10s %-10s %-10s %-10s %-10s %-10s\n', ...
        'n', 'SP_Omg', 'MO_Omg', 'SP_Hops', 'MO_Hops', ...
        'SP_Conf', 'MO_Conf', 'Red_%');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        total_omega_sp = 0;
        total_omega_mo = 0;

        total_hops_sp = 0;
        total_hops_mo = 0;

        total_conflict_sp = 0;
        total_conflict_mo = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_ngres(cfg, lambda, n, m_fixed_for_lambda, t);

            total_omega_sp = total_omega_sp + trial.omega_sp;
            total_omega_mo = total_omega_mo + trial.omega_mo;

            total_hops_sp = total_hops_sp + trial.avg_hops_sp;
            total_hops_mo = total_hops_mo + trial.avg_hops_mo;

            total_conflict_sp = total_conflict_sp + trial.conflict_sp;
            total_conflict_mo = total_conflict_mo + trial.conflict_mo;
        end

        mean_omega_sp = total_omega_sp / cfg.num_tests;
        mean_omega_mo = total_omega_mo / cfg.num_tests;

        mean_hops_sp = total_hops_sp / cfg.num_tests;
        mean_hops_mo = total_hops_mo / cfg.num_tests;

        mean_conflict_sp = total_conflict_sp / cfg.num_tests;
        mean_conflict_mo = total_conflict_mo / cfg.num_tests;

        results.mean_overlaps_sp(l_idx, n_idx) = mean_omega_sp;
        results.mean_overlaps_mo(l_idx, n_idx) = mean_omega_mo;

        results.mean_hops_sp(l_idx, n_idx) = mean_hops_sp;
        results.mean_hops_mo(l_idx, n_idx) = mean_hops_mo;

        results.mean_conflict_sp(l_idx, n_idx) = mean_conflict_sp;
        results.mean_conflict_mo(l_idx, n_idx) = mean_conflict_mo;

        if mean_conflict_sp > 0
            reduc = 100 * (mean_conflict_sp - mean_conflict_mo) / mean_conflict_sp;
        else
            reduc = 0;
        end

        fprintf('%-8d %-10.2f %-10.2f %-10.2f %-10.2f %-10.2f %-10.2f %-10.1f\n', ...
            n, mean_omega_sp, mean_omega_mo, mean_hops_sp, mean_hops_mo, ...
            mean_conflict_sp, mean_conflict_mo, reduc);
    end
end

% =========================================================
% Parte 2: contention demand variando m = {4,8,12}
% y usando lambda = 4, como en la lámina
% =========================================================
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
%     fprintf('NG-RES CONTENTION: m = %d, lambda = %d\n', m, lambda_fixed_for_contention);
%     fprintf('====================================================\n');
% 
%     for n_idx = 1:num_n
%         n = cfg.n_range(n_idx);
% 
%         total_contention_sp = 0;
%         total_contention_mo = 0;
% 
%         for t = 1:cfg.num_tests
%             trial = run_single_trial_ngres(cfg, lambda_fixed_for_contention, n, m, t);
% 
%             total_contention_sp = total_contention_sp + trial.contention_sp;
%             total_contention_mo = total_contention_mo + trial.contention_mo;
%         end
% 
%         results.mean_contention_sp(m_idx, n_idx) = total_contention_sp / cfg.num_tests;
%         results.mean_contention_mo(m_idx, n_idx) = total_contention_mo / cfg.num_tests;
%     end
% end
end
