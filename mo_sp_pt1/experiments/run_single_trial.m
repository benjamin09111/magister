function trial = run_single_trial(N, lambda, n, k_max, trial_idx, use_topology_dataset)
% Ejecuta 1 prueba completa para un lambda y n dados

Lambda = lambda / N;
psi = Lambda;

if nargin < 5
    trial_idx = [];
end
if nargin < 6
    use_topology_dataset = false;
end

if ~isempty(trial_idx)
    seed_val = trial_idx + 1000 * lambda + 100000 * n;
    rng(seed_val, 'twister');
end

% Topología
if use_topology_dataset && ~isempty(trial_idx)
    topo = get_topology_from_dataset(struct('N', N), lambda, trial_idx);
    G = topo.Graph;
else
    G = generate_random_topology(N, Lambda);
end

% Gateway
if exist('topo', 'var') && isfield(topo, 'Gateway')
    gateway = topo.Gateway;
else
    gateway = select_gateway_by_betweenness(G);
end

% Sensores
sensors = select_sensors(G, gateway, n);

% SP
sp_paths = run_shortest_path_routing(G, sensors, gateway);
omega_sp = compute_total_overlaps(sp_paths, gateway);
avg_hops_sp = compute_average_hops(sp_paths);

% MO
[mo_paths, omega_mo] = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, k_max);
avg_hops_mo = compute_average_hops(mo_paths);

% Salida
trial.omega_sp = omega_sp;
trial.omega_mo = omega_mo;
trial.avg_hops_sp = avg_hops_sp;
trial.avg_hops_mo = avg_hops_mo;
end
