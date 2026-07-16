function results = run_experiment_suite_mo_vs_moaco(cfg)
% Corre todas las simulaciones para MO vs MO+ACO

num_lambdas = length(cfg.lambdas);
num_n = length(cfg.n_range);

results.mean_overlaps_mo = zeros(num_lambdas, num_n);
results.mean_overlaps_moaco = zeros(num_lambdas, num_n);
results.mean_hops_mo = zeros(num_lambdas, num_n);
results.mean_hops_moaco = zeros(num_lambdas, num_n);

results.lambdas = cfg.lambdas;
results.n_range = cfg.n_range;

for l_idx = 1:num_lambdas
    lambda = cfg.lambdas(l_idx);

    fprintf('\n====================================================\n');
    fprintf('SIMULACIÓN MO vs MO+ACO: lambda = %d\n', lambda);
    fprintf('====================================================\n');
    fprintf('%-8s %-10s %-10s %-10s %-10s %-10s\n', ...
        'n', 'MO_Omg', 'ACO_Omg', 'Red_%', 'MO_Hops', 'ACO_Hops');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        total_omega_mo = 0;
        total_omega_moaco = 0;
        total_hops_mo = 0;
        total_hops_moaco = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_mo_vs_moaco(cfg, lambda, n, t);

            total_omega_mo = total_omega_mo + trial.omega_mo;
            total_omega_moaco = total_omega_moaco + trial.omega_moaco;
            total_hops_mo = total_hops_mo + trial.avg_hops_mo;
            total_hops_moaco = total_hops_moaco + trial.avg_hops_moaco;
        end

        mean_omega_mo = total_omega_mo / cfg.num_tests;
        mean_omega_moaco = total_omega_moaco / cfg.num_tests;
        mean_hops_mo = total_hops_mo / cfg.num_tests;
        mean_hops_moaco = total_hops_moaco / cfg.num_tests;

        results.mean_overlaps_mo(l_idx, n_idx) = mean_omega_mo;
        results.mean_overlaps_moaco(l_idx, n_idx) = mean_omega_moaco;
        results.mean_hops_mo(l_idx, n_idx) = mean_hops_mo;
        results.mean_hops_moaco(l_idx, n_idx) = mean_hops_moaco;

        if mean_omega_mo > 0
            reduc = 100 * (mean_omega_mo - mean_omega_moaco) / mean_omega_mo;
        else
            reduc = 0;
        end

        fprintf('%-8d %-10.2f %-10.2f %-10.1f %-10.2f %-10.2f\n', ...
            n, mean_omega_mo, mean_omega_moaco, reduc, mean_hops_mo, mean_hops_moaco);
    end
end
end
