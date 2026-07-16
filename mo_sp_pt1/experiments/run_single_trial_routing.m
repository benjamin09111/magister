function trial = run_single_trial_routing(cfg, lambda, n, trial_idx)
% Ejecuta 1 prueba de routing SP vs MO
% Replica las métricas base:
% - overlaps
% - average hops

Lambda = lambda / cfg.N;
psi = Lambda;

if nargin < 4
    trial_idx = [];
end

if ~isempty(trial_idx)
    seed_val = trial_idx + 1000 * lambda + 100000 * n;
    rng(seed_val, 'twister');
end

% 1) Topología
if cfg.use_topology_dataset && ~isempty(trial_idx)
    topo = get_topology_from_dataset(cfg, lambda, trial_idx);
    G = topo.Graph;
else
    G = generate_random_topology(cfg.N, Lambda);
end

% 2) Gateway
if exist('topo', 'var') && isfield(topo, 'Gateway')
    gateway = topo.Gateway;
else
    gateway = select_gateway_by_betweenness(G);
end

% 3) Sensores
sensors = select_sensors(G, gateway, n);

% 4) SP
sp_paths = run_shortest_path_routing(G, sensors, gateway);
omega_sp = compute_total_overlaps(sp_paths, gateway);
avg_hops_sp = compute_average_hops(sp_paths);

% 5) MO
[mo_paths, omega_mo] = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, cfg.k_max);
avg_hops_mo = compute_average_hops(mo_paths);

% 6) Guardar resultados
trial.omega_sp = omega_sp;
trial.omega_mo = omega_mo;
trial.avg_hops_sp = avg_hops_sp;
trial.avg_hops_mo = avg_hops_mo;
end
