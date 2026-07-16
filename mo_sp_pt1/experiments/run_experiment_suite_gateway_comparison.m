function gw_results = run_experiment_suite_gateway_comparison(cfg)
% Compara metodos de seleccion de gateway bajo SP y MO.
% Diseno paired: misma topologia, sensores y periodos para cada metodo.

if isfield(cfg, 'gateway_methods') && ~isempty(cfg.gateway_methods)
    gateway_methods = cfg.gateway_methods;
else
    gateway_methods = {'betweenness', 'degree', 'eigenvector', 'closeness'};
end

if ~isfield(cfg, 'use_topology_dataset') || ~cfg.use_topology_dataset
    error('Gateway comparison requiere use_topology_dataset=true para asegurar comparaciones paired.');
end

if isfield(cfg, 'baseline_gateway_method') && ~isempty(cfg.baseline_gateway_method)
    baseline_method = cfg.baseline_gateway_method;
else
    baseline_method = 'degree';
end

if isfield(cfg, 'gw_m_fixed')
    m_fixed = cfg.gw_m_fixed;
elseif isfield(cfg, 'm_fixed')
    m_fixed = cfg.m_fixed;
else
    m_fixed = 8;
end

num_methods = length(gateway_methods);
num_lambdas = length(cfg.lambdas);
num_n = length(cfg.n_range);

gw_results.gateway_methods = gateway_methods;
gw_results.baseline_gateway_method = baseline_method;
gw_results.lambdas = cfg.lambdas;
gw_results.n_range = cfg.n_range;
gw_results.N = cfg.N;
gw_results.num_tests = cfg.num_tests;
gw_results.m_fixed = m_fixed;

gw_results.mean_overlaps_sp = zeros(num_methods, num_lambdas, num_n);
gw_results.mean_overlaps_mo = zeros(num_methods, num_lambdas, num_n);
gw_results.mean_hops_sp = zeros(num_methods, num_lambdas, num_n);
gw_results.mean_hops_mo = zeros(num_methods, num_lambdas, num_n);
gw_results.mean_conflict_sp = zeros(num_methods, num_lambdas, num_n);
gw_results.mean_conflict_mo = zeros(num_methods, num_lambdas, num_n);
gw_results.ratio_sched_sp = zeros(num_methods, num_lambdas, num_n);
gw_results.ratio_sched_mo = zeros(num_methods, num_lambdas, num_n);

rng_state = rng;
rng(789, 'twister');

for l_idx = 1:num_lambdas
    lambda = cfg.lambdas(l_idx);

    fprintf('\n====================================================\n');
    fprintf('GATEWAY COMPARISON: lambda = %d, m = %d\n', lambda, m_fixed);
    fprintf('====================================================\n');

    for n_idx = 1:num_n
        n = cfg.n_range(n_idx);

        totals = init_totals(num_methods);

        for t = 1:cfg.num_tests
            topo = get_topology_from_dataset(cfg, lambda, t);
            G = topo.Graph;

            gateways = zeros(num_methods, 1);
            for gw_idx = 1:num_methods
                gateways(gw_idx) = select_gateway(G, gateway_methods{gw_idx});
            end

            sensors = select_common_sensors_for_gateways(G, gateways, n);
            T_common = generate_periods_harmonic(n, cfg);

            for gw_idx = 1:num_methods
                trial = run_single_trial_gateway( ...
                    cfg, lambda, n, m_fixed, t, gateway_methods{gw_idx}, sensors, T_common);

                totals.omega_sp(gw_idx) = totals.omega_sp(gw_idx) + trial.omega_sp;
                totals.omega_mo(gw_idx) = totals.omega_mo(gw_idx) + trial.omega_mo;
                totals.hops_sp(gw_idx) = totals.hops_sp(gw_idx) + trial.avg_hops_sp;
                totals.hops_mo(gw_idx) = totals.hops_mo(gw_idx) + trial.avg_hops_mo;
                totals.conflict_sp(gw_idx) = totals.conflict_sp(gw_idx) + trial.conflict_sp;
                totals.conflict_mo(gw_idx) = totals.conflict_mo(gw_idx) + trial.conflict_mo;
                totals.sched_sp(gw_idx) = totals.sched_sp(gw_idx) + trial.sched_sp;
                totals.sched_mo(gw_idx) = totals.sched_mo(gw_idx) + trial.sched_mo;
            end
        end

        for gw_idx = 1:num_methods
            gw_results.mean_overlaps_sp(gw_idx, l_idx, n_idx) = totals.omega_sp(gw_idx) / cfg.num_tests;
            gw_results.mean_overlaps_mo(gw_idx, l_idx, n_idx) = totals.omega_mo(gw_idx) / cfg.num_tests;
            gw_results.mean_hops_sp(gw_idx, l_idx, n_idx) = totals.hops_sp(gw_idx) / cfg.num_tests;
            gw_results.mean_hops_mo(gw_idx, l_idx, n_idx) = totals.hops_mo(gw_idx) / cfg.num_tests;
            gw_results.mean_conflict_sp(gw_idx, l_idx, n_idx) = totals.conflict_sp(gw_idx) / cfg.num_tests;
            gw_results.mean_conflict_mo(gw_idx, l_idx, n_idx) = totals.conflict_mo(gw_idx) / cfg.num_tests;
            gw_results.ratio_sched_sp(gw_idx, l_idx, n_idx) = totals.sched_sp(gw_idx) / cfg.num_tests;
            gw_results.ratio_sched_mo(gw_idx, l_idx, n_idx) = totals.sched_mo(gw_idx) / cfg.num_tests;
        end

        fprintf('n=%d | baseline=%s | methods=%d\n', n, baseline_method, num_methods);
    end
end

rng(rng_state);
gw_results = compute_gateway_deviations(gw_results);
end

function totals = init_totals(num_methods)
totals.omega_sp = zeros(num_methods, 1);
totals.omega_mo = zeros(num_methods, 1);
totals.hops_sp = zeros(num_methods, 1);
totals.hops_mo = zeros(num_methods, 1);
totals.conflict_sp = zeros(num_methods, 1);
totals.conflict_mo = zeros(num_methods, 1);
totals.sched_sp = zeros(num_methods, 1);
totals.sched_mo = zeros(num_methods, 1);
end

function sensors = select_common_sensors_for_gateways(G, gateways, n)
N = numnodes(G);
all_nodes = 1:N;
excluded = unique(gateways(:));

for idx = 1:length(gateways)
    excluded = unique([excluded; neighbors(G, gateways(idx))]); %#ok<AGROW>
end

potential = setdiff(all_nodes, excluded(:)');

if numel(potential) < n
    potential = setdiff(all_nodes, unique(gateways(:))');
end

if numel(potential) < n
    error('No hay suficientes sensores comunes para comparar gateways. n=%d, disponibles=%d', n, numel(potential));
end

idx = randperm(numel(potential), n);
sensors = potential(idx);
end

function gw_results = compute_gateway_deviations(gw_results)
methods = gw_results.gateway_methods;
baseline_idx = find(strcmp(methods, gw_results.baseline_gateway_method), 1);

if isempty(baseline_idx)
    error('Baseline gateway method no encontrado: %s', gw_results.baseline_gateway_method);
end

gw_results.baseline_idx = baseline_idx;

gw_results.dev_vs_degree.overlaps_sp = percent_dev(gw_results.mean_overlaps_sp, gw_results.mean_overlaps_sp(baseline_idx, :, :));
gw_results.dev_vs_degree.overlaps_mo = percent_dev(gw_results.mean_overlaps_mo, gw_results.mean_overlaps_mo(baseline_idx, :, :));
gw_results.dev_vs_degree.conflict_sp = percent_dev(gw_results.mean_conflict_sp, gw_results.mean_conflict_sp(baseline_idx, :, :));
gw_results.dev_vs_degree.conflict_mo = percent_dev(gw_results.mean_conflict_mo, gw_results.mean_conflict_mo(baseline_idx, :, :));
gw_results.dev_vs_degree.sched_sp = percent_dev(gw_results.ratio_sched_sp, gw_results.ratio_sched_sp(baseline_idx, :, :));
gw_results.dev_vs_degree.sched_mo = percent_dev(gw_results.ratio_sched_mo, gw_results.ratio_sched_mo(baseline_idx, :, :));

gw_results.dev_degree_mo_vs_sp.overlaps = percent_dev(gw_results.mean_overlaps_mo(baseline_idx, :, :), gw_results.mean_overlaps_sp(baseline_idx, :, :));
gw_results.dev_degree_mo_vs_sp.conflict = percent_dev(gw_results.mean_conflict_mo(baseline_idx, :, :), gw_results.mean_conflict_sp(baseline_idx, :, :));
gw_results.dev_degree_mo_vs_sp.sched = percent_dev(gw_results.ratio_sched_mo(baseline_idx, :, :), gw_results.ratio_sched_sp(baseline_idx, :, :));

mean_sched_mo = zeros(length(methods), 1);
for idx = 1:length(methods)
    values = gw_results.ratio_sched_mo(idx, :, :);
    mean_sched_mo(idx) = mean(values(:));
end

[~, best_idx] = max(mean_sched_mo);
gw_results.best_mo_gateway_idx = best_idx;
gw_results.best_mo_gateway_method = methods{best_idx};

gw_results.dev_best_mo_vs_baseline.overlaps = percent_dev(gw_results.mean_overlaps_mo(best_idx, :, :), gw_results.mean_overlaps_sp(baseline_idx, :, :));
gw_results.dev_best_mo_vs_baseline.conflict = percent_dev(gw_results.mean_conflict_mo(best_idx, :, :), gw_results.mean_conflict_sp(baseline_idx, :, :));
gw_results.dev_best_mo_vs_baseline.sched = percent_dev(gw_results.ratio_sched_mo(best_idx, :, :), gw_results.ratio_sched_sp(baseline_idx, :, :));
end

function dev = percent_dev(values, baseline)
dev = zeros(size(values));
baseline_full = repmat(baseline, [size(values, 1), 1, 1]);
valid = abs(baseline_full) > eps;
dev(valid) = 100 * (values(valid) - baseline_full(valid)) ./ baseline_full(valid);
dev(~valid) = 0;
end
