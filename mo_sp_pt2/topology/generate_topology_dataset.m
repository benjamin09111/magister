function generate_topology_dataset(cfg_in)
% Genera un dataset de topologias aleatorias para cada lambda.

if nargin > 0 && ~isempty(cfg_in)
    cfg = cfg_in;
else
    cfg = config_ngres();
end

this_file = mfilename('fullpath');
this_dir = fileparts(this_file);
project_root = fileparts(this_dir);
dataset_path = fullfile(project_root, 'dataset_topologies.dat');

N = cfg.N;
lambdas = cfg.lambdas;
K = cfg.num_tests;

topologies_data = cell(length(lambdas), K);
rng(123);

for i = 1:length(lambdas)
    lambda = lambdas(i);
    density = lambda / N;

    for k = 1:K
        G = generate_random_topology(N, density);

        s.Graph = G;
        s.Gateway = select_gateway_by_betweenness(G);
        s.Lambda = lambda;

        topologies_data{i, k} = s;
    end
end

save(dataset_path, 'topologies_data', 'N', 'K', 'lambdas', '-mat');
end
