function trial = run_single_trial_vs_mo(cfg, lambda, n, m, trial_idx, alt_routing_fn)
% run_single_trial_vs_mo  Trial genérico: método alternativo vs MO.
%
% Usa exactamente la misma topología, sensores y periodos que
% run_single_trial_ngres para garantizar comparabilidad con los resultados
% del paper base.
%
% Optimización: MO se ejecuta UNA SOLA VEZ por trial. Si alt_routing_fn
% es run_moaco_routing, los mo_paths pre-calculados se pasan directamente
% al wrapper ACO (5º argumento) para evitar recalcular SP+MO dentro de él.

Lambda = lambda / cfg.N;
psi    = Lambda;

if nargin < 5
    trial_idx = [];
end

% ---- Semilla determinista (igual que run_single_trial_ngres) ------------
if ~isempty(trial_idx)
    seed_val = trial_idx + 1000 * lambda + 100000 * n;
    rng(seed_val, 'twister');
end

% ---- Topología ----------------------------------------------------------
if cfg.use_topology_dataset && ~isempty(trial_idx)
    topo    = get_topology_from_dataset(cfg, lambda, trial_idx);
    G       = topo.Graph;
    gateway = topo.Gateway;
else
    G       = generate_random_topology(cfg.N, Lambda);
    gateway = select_gateway_by_betweenness(G);
end

sensors = select_sensors(G, gateway, n);

% ---- Periodos comunes para ambos métodos --------------------------------
T_common = generate_periods_harmonic(n, cfg);

% ---- MO (referencia) — se calcula UNA sola vez -------------------------
sp_paths = run_shortest_path_routing(G, sensors, gateway);
[mo_paths, omega_mo] = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, cfg.k_max);
% mo_flows = build_flow_set(mo_paths, cfg, T_common);

avg_hops_mo   = compute_average_hops(mo_paths);
conflict_mo   = 0; % compute_conflict_demand(mo_flows, gateway, cfg.H);
contention_mo = 0; % compute_contention_demand(mo_flows, m, cfg.H);
sched_mo      = 0; % compute_schedulability_status(mo_flows, gateway, m, cfg.H);

% ---- Método alternativo -------------------------------------------------
% Si el método alternativo es run_moaco_routing, le pasamos los mo_paths
% ya calculados (5º arg) para que no repita SP+MO internamente.
fn_info = functions(alt_routing_fn);
is_moaco = strcmp(fn_info.function, 'run_moaco_routing');

if is_moaco
    alt_paths = alt_routing_fn(G, sensors, gateway, cfg, mo_paths);
else
    alt_paths = alt_routing_fn(G, sensors, gateway, cfg);
end

% alt_flows = build_flow_set(alt_paths, cfg, T_common);

omega_alt       = compute_total_overlaps(alt_paths, gateway);
avg_hops_alt    = compute_average_hops(alt_paths);
conflict_alt    = 0; % compute_conflict_demand(alt_flows, gateway, cfg.H);
contention_alt  = 0; % compute_contention_demand(alt_flows, m, cfg.H);
sched_alt       = 0; % compute_schedulability_status(alt_flows, gateway, m, cfg.H);

% ---- Empaquetar resultados ---------------------------------------------
trial.omega_alt       = omega_alt;
trial.omega_mo        = omega_mo;

trial.avg_hops_alt    = avg_hops_alt;
trial.avg_hops_mo     = avg_hops_mo;

trial.conflict_alt    = conflict_alt;
trial.conflict_mo     = conflict_mo;

trial.contention_alt  = contention_alt;
trial.contention_mo   = contention_mo;

trial.sched_alt       = sched_alt;
trial.sched_mo        = sched_mo;
end
