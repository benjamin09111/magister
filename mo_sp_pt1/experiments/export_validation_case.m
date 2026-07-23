function export_validation_case()
% EXPORT_VALIDATION_CASE
%
% Generates ONE fully-specified, seeded experiment instance using the
% MATLAB reference implementation (the "ground truth" of the NG-RES 2021
% replication) and exports the topology, routing, and metrics to a
% portable JSON file. This is one half of the MATLAB<->Python
% cross-validation suite required to certify that the Python/NetworkX
% rewrite (software/backend) is numerically equivalent to the MATLAB
% reference (mo_sp_pt1) before it is used as the basis of a publication.
%
% Run this once from MATLAB (Current Folder = mo_sp_pt1, or anywhere,
% since paths are resolved relative to this file):
%
%   >> export_validation_case
%
% It writes ../validation/matlab_case.json (relative to this file, i.e.
% <repo_root>/validation/matlab_case.json). Then, on the Python side, run:
%
%   python software/backend/validation/validate_against_matlab.py
%
% which reads that JSON, reconstructs the EXACT same graph (not a fresh
% random one) in NetworkX, re-runs Python's SP and MO routing on it, and
% compares Omega (overlaps), average hops, and schedulability against the
% MATLAB reference with strict tolerances. All node indices below are
% converted to 0-based before export, to match Python conventions
% directly (MATLAB graphs are 1-indexed internally).

this_dir = fileparts(mfilename('fullpath'));
root_dir = fileparts(this_dir); % mo_sp_pt1/
addpath(genpath(root_dir));

repo_root = fileparts(root_dir); % seminario_udp/
out_dir = fullfile(repo_root, 'validation');
if ~exist(out_dir, 'dir')
    mkdir(out_dir);
end

% ---------------------------------------------------------------------
% Fixed experiment parameters (must match the Python-side test exactly)
% ---------------------------------------------------------------------
N = 66;
lambda_val = 8;
n_sensors = 10;
psi = 0.0265;
k_max = 100;
m_fixed = 8;
eta_min = 4;
eta_max = 7;
seed = 20240722;

rng(seed, 'twister');

Lambda = lambda_val / N;
G = generate_random_topology(N, Lambda);
gateway1 = select_gateway(G, 'betweenness'); % 1-indexed
sensors1 = select_sensors(G, gateway1, n_sensors); % 1-indexed

sp_paths1 = run_shortest_path_routing(G, sensors1, gateway1);
[mo_paths1, mo_omega] = run_minimal_overlap_routing(G, sp_paths1, sensors1, gateway1, psi, k_max);

sp_omega = compute_total_overlaps(sp_paths1, gateway1);
sp_hops = compute_average_hops(sp_paths1);
mo_hops = compute_average_hops(mo_paths1);

% ---------------------------------------------------------------------
% Flow model + schedulability (paper §3.2), for both SP and MO route sets
% ---------------------------------------------------------------------
w = 2;
period_values = 2 .^ (eta_min:eta_max);
T = period_values(randi(numel(period_values), n_sensors, 1));
D = T; % implicit deadlines
H_computed = max(T); % periods are harmonic powers of two => lcm(T) = max(T)

flow_cfg = struct();
flow_cfg.w = w;
flow_cfg.H = H_computed;
flow_cfg.use_implicit_deadlines = true;
flow_cfg.conflict_pair_mode = 'paper_double';

sp_flow = build_flow_set(sp_paths1, flow_cfg, T);
[sp_is_sched, sp_sched_details] = compute_schedulability_status(sp_flow, gateway1, m_fixed, H_computed);

mo_flow = build_flow_set(mo_paths1, flow_cfg, T);
[mo_is_sched, mo_sched_details] = compute_schedulability_status(mo_flow, gateway1, m_fixed, H_computed);

% ---------------------------------------------------------------------
% Export: convert every node id to 0-indexed for direct Python re-use
% ---------------------------------------------------------------------
edges1 = G.Edges.EndNodes; % Mx2, 1-indexed
edges0 = edges1 - 1;

gateway0 = gateway1 - 1;
sensors0 = sensors1 - 1;

sp_paths0 = cellfun(@(p) p - 1, sp_paths1, 'UniformOutput', false);
mo_paths0 = cellfun(@(p) p - 1, mo_paths1, 'UniformOutput', false);

result = struct();
result.meta = struct( ...
    'source', 'mo_sp_pt1 (MATLAB reference)', ...
    'matlab_version', version(), ...
    'seed', seed, ...
    'N', N, ...
    'lambda_val', lambda_val, ...
    'n_sensors', n_sensors, ...
    'psi', psi, ...
    'k_max', k_max, ...
    'm_fixed', m_fixed, ...
    'w', w, ...
    'H', H_computed, ...
    'indexing', '0-based (converted from MATLAB 1-based on export)' ...
);
result.edges = num2cell(edges0, 2);
result.gateway = gateway0;
result.sensors = sensors0(:)';
result.T = T(:)';
result.D = D(:)';
result.sp = struct( ...
    'paths', {sp_paths0}, ...
    'omega', sp_omega, ...
    'avg_hops', sp_hops, ...
    'is_schedulable', sp_is_sched, ...
    'sched_details', sp_sched_details ...
);
result.mo = struct( ...
    'paths', {mo_paths0}, ...
    'omega', mo_omega, ...
    'avg_hops', mo_hops, ...
    'is_schedulable', mo_is_sched, ...
    'sched_details', mo_sched_details ...
);

json_text = jsonencode(result, 'PrettyPrint', true);
out_path = fullfile(out_dir, 'matlab_case.json');
fid = fopen(out_path, 'w');
fwrite(fid, json_text, 'char');
fclose(fid);

fprintf('Exported validation case to: %s\n', out_path);
fprintf('  gateway (0-idx) = %d\n', gateway0);
fprintf('  sensors (0-idx) = %s\n', mat2str(sensors0));
fprintf('  SP: omega=%d hops=%.3f schedulable=%d\n', sp_omega, sp_hops, sp_is_sched);
fprintf('  MO: omega=%d hops=%.3f schedulable=%d\n', mo_omega, mo_hops, mo_is_sched);
fprintf('Now run: python software/backend/validation/validate_against_matlab.py\n');
end
