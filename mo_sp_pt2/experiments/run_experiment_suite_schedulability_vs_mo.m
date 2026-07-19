function sched = run_experiment_suite_schedulability_vs_mo(cfg, alt_routing_fn, method_name)
% run_experiment_suite_schedulability_vs_mo  Schedulability ratio:
% 1) varying density: lambda = {4,8,12}, m = 8
% 2) varying channels: m = {2,8,16}, lambda = 4
% comparing alt_routing_fn against MO.

num_lambdas = length(cfg.lambdas);
num_n = length(cfg.n_range);

sched.lambdas = cfg.lambdas;
sched.n_range = cfg.n_range;
sched.N = cfg.N;
sched.num_tests = cfg.num_tests;
sched.method_name = method_name;

% 1) Varying density
m_fixed = 8;
sched.m_fixed = m_fixed;

sched.ratio_density_alt = zeros(num_lambdas, num_n);
sched.ratio_density_mo  = zeros(num_lambdas, num_n);

for l_idx = 1:num_lambdas
    lambda = cfg.lambdas(l_idx);

    fprintf('\n====================================================\n');
    fprintf('%s vs MO SCHEDULABILITY DENSITY: lambda = %d, m = %d\n', method_name, lambda, m_fixed);
    fprintf('====================================================\n');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        count_alt = 0;
        count_mo = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_vs_mo(cfg, lambda, n, m_fixed, t, alt_routing_fn);
            count_alt = count_alt + trial.sched_alt;
            count_mo = count_mo + trial.sched_mo;
        end

        sched.ratio_density_alt(l_idx, n_idx) = count_alt / cfg.num_tests;
        sched.ratio_density_mo(l_idx, n_idx)  = count_mo / cfg.num_tests;

        fprintf('n=%d | ALT=%.2f | MO=%.2f\n', ...
            n, sched.ratio_density_alt(l_idx,n_idx), sched.ratio_density_mo(l_idx,n_idx));
    end
end

% 2) Varying channels
if isfield(cfg, 'm_sched_values')
    m_values = cfg.m_sched_values;
else
    m_values = [2, 8, 16];
end
lambda_fixed = 4;

if isfield(cfg, 'lambda_fixed_sched')
    lambda_fixed = cfg.lambda_fixed_sched;
end

sched.m_values = m_values;
sched.lambda_fixed = lambda_fixed;

sched.ratio_channels_alt = zeros(length(m_values), num_n);
sched.ratio_channels_mo  = zeros(length(m_values), num_n);

for m_idx = 1:length(m_values)
    m = m_values(m_idx);

    fprintf('\n====================================================\n');
    fprintf('%s vs MO SCHEDULABILITY CHANNELS: lambda = %d, m = %d\n', method_name, lambda_fixed, m);
    fprintf('====================================================\n');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        count_alt = 0;
        count_mo = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_vs_mo(cfg, lambda_fixed, n, m, t, alt_routing_fn);
            count_alt = count_alt + trial.sched_alt;
            count_mo = count_mo + trial.sched_mo;
        end

        sched.ratio_channels_alt(m_idx, n_idx) = count_alt / cfg.num_tests;
        sched.ratio_channels_mo(m_idx, n_idx)  = count_mo / cfg.num_tests;

        fprintf('n=%d | ALT=%.2f | MO=%.2f\n', ...
            n, sched.ratio_channels_alt(m_idx,n_idx), sched.ratio_channels_mo(m_idx,n_idx));
    end
end
end
