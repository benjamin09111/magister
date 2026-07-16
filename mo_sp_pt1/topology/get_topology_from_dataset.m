function topology = get_topology_from_dataset(cfg, lambda, trial_idx)
% Carga una topologia especifica del dataset generado previamente.

persistent loaded_data;
this_file = mfilename('fullpath');
this_dir = fileparts(this_file);
project_root = fileparts(this_dir);
dataset_path = fullfile(project_root, 'dataset_topologies.dat');

if isempty(loaded_data)
    if exist(dataset_path, 'file')
        loaded_data = load(dataset_path, '-mat');
    else
        error('Dataset %s no encontrado. Ejecuta generate_topology_dataset primero.', dataset_path);
    end
end

if isfield(cfg, 'num_tests')
    if ~isfield(loaded_data, 'K') || loaded_data.K ~= cfg.num_tests || ~isfield(loaded_data, 'N') || loaded_data.N ~= cfg.N
        loaded_data = load(dataset_path, '-mat');
    end
end

if trial_idx < 1 || trial_idx > loaded_data.K
    error('trial_idx=%d fuera de rango. El dataset tiene K=%d topologias por lambda. Regenera el dataset si cambias num_tests.', trial_idx, loaded_data.K);
end

lambda_idx = find(loaded_data.lambdas == lambda, 1);
if isempty(lambda_idx)
    error('Lambda %d no encontrado en el dataset.', lambda);
end

topology = loaded_data.topologies_data{lambda_idx, trial_idx};
end
