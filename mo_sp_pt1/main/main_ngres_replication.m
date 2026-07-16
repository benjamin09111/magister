%% main_ngres_replication.m
% Punto de entrada legado.
% Redirige al control centralizado recomendado.

this_file = mfilename('fullpath');
this_dir = fileparts(this_file);
run(fullfile(this_dir, 'main_experiments_control.m'));
