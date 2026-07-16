function results = run_experiment_suite(cfg)
% Corre todas las simulaciones y guarda resultados medios

num_lambdas = length(cfg.lambdas);
num_n = length(cfg.n_range);

results.mean_overlaps_sp = zeros(num_lambdas, num_n);
results.mean_overlaps_mo = zeros(num_lambdas, num_n);
results.mean_hops_sp = zeros(num_lambdas, num_n);
results.mean_hops_mo = zeros(num_lambdas, num_n);

results.lambdas = cfg.lambdas;
results.n_range = cfg.n_range;

for l_idx = 1:num_lambdas
    lambda = cfg.lambdas(l_idx);
    Lambda = lambda / cfg.N;
    psi = Lambda;

    fprintf('\n====================================================\n');
    fprintf('SIMULACIÓN: lambda = %d (Lambda = %.4f, psi = %.4f)\n', lambda, Lambda, psi);
    fprintf('====================================================\n');
    fprintf('%-8s %-10s %-10s %-10s %-10s %-10s\n', ...
        'n', 'SP_Omg', 'MO_Omg', 'Red_%', 'SP_Hops', 'MO_Hops');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        total_omega_sp = 0;
        total_omega_mo = 0;
        total_hops_sp = 0;
        total_hops_mo = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial(cfg.N, lambda, n, cfg.k_max, t, cfg.use_topology_dataset);

            total_omega_sp = total_omega_sp + trial.omega_sp;
            total_omega_mo = total_omega_mo + trial.omega_mo;
            total_hops_sp = total_hops_sp + trial.avg_hops_sp;
            total_hops_mo = total_hops_mo + trial.avg_hops_mo;
        end

        mean_omega_sp = total_omega_sp / cfg.num_tests;
        mean_omega_mo = total_omega_mo / cfg.num_tests;
        mean_hops_sp = total_hops_sp / cfg.num_tests;
        mean_hops_mo = total_hops_mo / cfg.num_tests;

        results.mean_overlaps_sp(l_idx, n_idx) = mean_omega_sp;
        results.mean_overlaps_mo(l_idx, n_idx) = mean_omega_mo;
        results.mean_hops_sp(l_idx, n_idx) = mean_hops_sp;
        results.mean_hops_mo(l_idx, n_idx) = mean_hops_mo;

        reduc = 100 * (mean_omega_sp - mean_omega_mo) / mean_omega_sp;

        fprintf('%-8d %-10.2f %-10.2f %-10.1f %-10.2f %-10.2f\n', ...
            n, mean_omega_sp, mean_omega_mo, reduc, mean_hops_sp, mean_hops_mo);
    end
end
end
