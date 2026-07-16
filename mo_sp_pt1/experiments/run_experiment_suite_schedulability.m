function sched = run_experiment_suite_schedulability(cfg)
% Schedulability ratio:
% 1) varying density: lambda = {4,8,12}, m = 8
% 2) varying channels: m = {2,8,16}, lambda = 4

num_lambdas = length(cfg.lambdas);
num_n = length(cfg.n_range);

sched.lambdas = cfg.lambdas;
sched.n_range = cfg.n_range;
sched.N = cfg.N;
sched.num_tests = cfg.num_tests;

% 1) Varying density
m_fixed = 8;
sched.m_fixed = m_fixed;

sched.ratio_density_sp = zeros(num_lambdas, num_n);
sched.ratio_density_mo = zeros(num_lambdas, num_n);

for l_idx = 1:num_lambdas
    lambda = cfg.lambdas(l_idx);

    fprintf('\n====================================================\n');
    fprintf('SCHEDULABILITY DENSITY: lambda = %d, m = %d\n', lambda, m_fixed);
    fprintf('====================================================\n');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        count_sp = 0;
        count_mo = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_ngres(cfg, lambda, n, m_fixed, t);
            count_sp = count_sp + trial.sched_sp;
            count_mo = count_mo + trial.sched_mo;
        end

        sched.ratio_density_sp(l_idx, n_idx) = count_sp / cfg.num_tests;
        sched.ratio_density_mo(l_idx, n_idx) = count_mo / cfg.num_tests;

        fprintf('n=%d | SP=%.2f | MO=%.2f\n', ...
            n, sched.ratio_density_sp(l_idx,n_idx), sched.ratio_density_mo(l_idx,n_idx));
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

sched.ratio_channels_sp = zeros(length(m_values), num_n);
sched.ratio_channels_mo = zeros(length(m_values), num_n);

for m_idx = 1:length(m_values)
    m = m_values(m_idx);

    fprintf('\n====================================================\n');
    fprintf('SCHEDULABILITY CHANNELS: lambda = %d, m = %d\n', lambda_fixed, m);
    fprintf('====================================================\n');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        count_sp = 0;
        count_mo = 0;

        for t = 1:cfg.num_tests
            trial = run_single_trial_ngres(cfg, lambda_fixed, n, m, t);
            count_sp = count_sp + trial.sched_sp;
            count_mo = count_mo + trial.sched_mo;
        end

        sched.ratio_channels_sp(m_idx, n_idx) = count_sp / cfg.num_tests;
        sched.ratio_channels_mo(m_idx, n_idx) = count_mo / cfg.num_tests;

        fprintf('n=%d | SP=%.2f | MO=%.2f\n', ...
            n, sched.ratio_channels_sp(m_idx,n_idx), sched.ratio_channels_mo(m_idx,n_idx));
    end
end
end
