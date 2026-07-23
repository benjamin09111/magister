function export_topology_statistics()
% EXPORT_TOPOLOGY_STATISTICS
%
% Generates K topology instances with the MATLAB reference generator
% (sprand + spones, see topology/generate_random_topology.m) and exports
% per-instance summary statistics (degree sequence, density, connectivity,
% clustering coefficient) as JSON. This is the MATLAB half of a genuine
% STATISTICAL equivalence check between MATLAB's sprand-based generator and
% Python's networkx.erdos_renyi_graph — as opposed to the purely
% mathematical argument (both are G(N,p) binomial random graphs) used
% elsewhere, which was never backed by actual data.
%
% Run this once from MATLAB:
%
%   >> export_topology_statistics
%
% Then, on the Python side, run:
%
%   python software/backend/validation/validate_topology_statistics.py
%
% which generates the same number of Erdos-Renyi instances in Python,
% computes the same statistics, and runs a two-sample Kolmogorov-Smirnov
% test comparing the pooled degree distributions (plus density/clustering/
% connectivity-rate comparisons).

this_dir = fileparts(mfilename('fullpath'));
root_dir = fileparts(this_dir); % mo_sp_pt1/
addpath(genpath(root_dir));

repo_root = fileparts(root_dir); % seminario_udp/
out_dir = fullfile(repo_root, 'validation');
if ~exist(out_dir, 'dir')
    mkdir(out_dir);
end

% ---------------------------------------------------------------------
% Fixed experiment parameters (must match the Python-side script exactly)
% ---------------------------------------------------------------------
N = 66;
lambda_val = 8;
K = 100; % number of topology instances (paper-standard: >= 30-100)
base_seed = 20240722;

Lambda = lambda_val / N;

instances = cell(K, 1);
for k = 1:K
    rng(base_seed + k, 'twister');
    G = generate_random_topology(N, Lambda);

    degrees = full(sum(adjacency(G), 2));
    density_actual = numedges(G) / (N * (N - 1) / 2);
    is_conn = (max(conncomp(G)) == 1);
    clust = mean(clustering_coefficients(G));

    instances{k} = struct( ...
        'degrees', degrees(:)', ...
        'num_edges', numedges(G), ...
        'density', density_actual, ...
        'is_connected', is_conn, ...
        'clustering_coefficient', clust ...
    );
end

result = struct();
result.meta = struct( ...
    'source', 'mo_sp_pt1 (MATLAB reference, sprand+spones)', ...
    'matlab_version', version(), ...
    'N', N, ...
    'lambda_val', lambda_val, ...
    'K', K, ...
    'base_seed', base_seed ...
);
result.instances = instances;

json_text = jsonencode(result, 'PrettyPrint', true);
out_path = fullfile(out_dir, 'matlab_topology_stats.json');
fid = fopen(out_path, 'w');
fwrite(fid, json_text, 'char');
fclose(fid);

fprintf('Exported %d topology instances to: %s\n', K, out_path);
fprintf('Now run: python software/backend/validation/validate_topology_statistics.py\n');
end

function c = clustering_coefficients(G)
% Local clustering coefficient per node (fraction of connected neighbor
% pairs), self-contained (no Bioinformatics/Statistics toolbox required).
A = full(adjacency(G));
N = size(A, 1);
c = zeros(N, 1);
for i = 1:N
    neighbors = find(A(i, :));
    kdeg = length(neighbors);
    if kdeg < 2
        c(i) = 0;
        continue;
    end
    sub = A(neighbors, neighbors);
    possible = kdeg * (kdeg - 1);
    c(i) = sum(sub(:)) / possible;
end
end
