function trial = run_single_trial_gateway(cfg, lambda, n, m, trial_idx, gateway_method, sensors, T_common)
% Trial SP vs MO para un metodo especifico de seleccion de gateway.
% Esta funcion es aditiva: no cambia la replica NG-RES existente.

Lambda = lambda / cfg.N;
psi = Lambda;

if nargin < 5
    trial_idx = [];
end

if ~isempty(trial_idx)
    seed_val = trial_idx + 1000 * lambda + 100000 * n;
    rng(seed_val, 'twister');
end

if nargin < 6 || isempty(gateway_method)
    gateway_method = 'betweenness';
end

if cfg.use_topology_dataset && ~isempty(trial_idx)
    topo = get_topology_from_dataset(cfg, lambda, trial_idx);
    G = topo.Graph;
else
    G = generate_random_topology(cfg.N, Lambda);
end

gateway = select_gateway(G, gateway_method);

if nargin < 7 || isempty(sensors)
    sensors = select_sensors(G, gateway, n);
end

if nargin < 8 || isempty(T_common)
    T_common = generate_periods_harmonic(n, cfg);
end

% SP
sp_paths = run_shortest_path_routing(G, sensors, gateway);
sp_flows = build_flow_set(sp_paths, cfg, T_common);

omega_sp = compute_total_overlaps(sp_paths, gateway);
avg_hops_sp = compute_average_hops(sp_paths);
conflict_sp = compute_conflict_demand(sp_flows, gateway, cfg.H);
contention_sp = compute_contention_demand(sp_flows, m, cfg.H);
sched_sp = compute_schedulability_status(sp_flows, gateway, m, cfg.H);

% MO
[mo_paths, omega_mo] = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, cfg.k_max);
mo_flows = build_flow_set(mo_paths, cfg, T_common);

avg_hops_mo = compute_average_hops(mo_paths);
conflict_mo = compute_conflict_demand(mo_flows, gateway, cfg.H);
contention_mo = compute_contention_demand(mo_flows, m, cfg.H);
sched_mo = compute_schedulability_status(mo_flows, gateway, m, cfg.H);

trial.gateway_method = char(gateway_method);
trial.gateway = gateway;
trial.sensors = sensors;

trial.omega_sp = omega_sp;
trial.omega_mo = omega_mo;

trial.avg_hops_sp = avg_hops_sp;
trial.avg_hops_mo = avg_hops_mo;

trial.conflict_sp = conflict_sp;
trial.conflict_mo = conflict_mo;

trial.contention_sp = contention_sp;
trial.contention_mo = contention_mo;

trial.sched_sp = sched_sp;
trial.sched_mo = sched_mo;
end
