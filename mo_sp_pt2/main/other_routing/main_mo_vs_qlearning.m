%% main_mo_vs_qlearning.m
% Comparación de Minimal Overlaps (MO) vs Q-Learning Standalone.
% Genera los mismos gráficos que main_experiments_control.m pero comparando con Q-Learning.

clear; clc; close all;

this_file = mfilename('fullpath');
this_dir = fileparts(this_file);
project_root = fileparts(fileparts(this_dir));

addpath(genpath(project_root));

%% ==============================
%  CONFIGURACION CENTRAL
%% ==============================

% Parámetros idénticos al control del paper
N = 66;
lambdas = [4, 8, 12];
n_range = 2:2:22;
num_tests = 30;

% Routing / MO
k_max = 100;
m_fixed = 8;

% Topologia
use_topology_dataset = true;
regenerate_dataset = false;

% Flujos
w = 2;
eta_min = 4;
eta_max = 7;
H = 128;
use_implicit_deadlines = true;

% Contention / conflict / schedulability
m_contention_values = [4, 8, 12];
m_sched_values = [2, 8, 16];
lambda_fixed_for_contention = 4;
lambda_fixed_sched = 4;
conflict_pair_mode = 'paper_double';

save_results = true;

%% ==============================
%  CONFIGURACION DERIVADA
%% ==============================

cfg = config_ngres();
cfg.N = N;
cfg.lambdas = lambdas;
cfg.n_range = n_range;
cfg.num_tests = num_tests;
cfg.k_max = k_max;
cfg.m_fixed = m_fixed;
cfg.use_topology_dataset = use_topology_dataset;
cfg.conflict_pair_mode = conflict_pair_mode;
cfg.w = w;
cfg.eta_min = eta_min;
cfg.eta_max = eta_max;
cfg.period_values = 2.^(eta_min:eta_max);
cfg.H = H;
cfg.use_implicit_deadlines = use_implicit_deadlines;
cfg.m_contention_values = m_contention_values;
cfg.m_sched_values = m_sched_values;
cfg.lambda_fixed_for_contention = lambda_fixed_for_contention;
cfg.lambda_fixed_sched = lambda_fixed_sched;

%% ==============================
%  DATASET DE TOPOLOGIAS
%% ==============================

dataset_path = fullfile(project_root, 'dataset_topologies.dat');
needs_dataset_regen = regenerate_dataset || ~isfile(dataset_path);
if cfg.use_topology_dataset && ~needs_dataset_regen
    try
        loaded_dataset = load(dataset_path, '-mat');
        if ~isfield(loaded_dataset, 'K') || ~isfield(loaded_dataset, 'N') || ~isfield(loaded_dataset, 'lambdas') || ...
                loaded_dataset.K ~= cfg.num_tests || loaded_dataset.N ~= cfg.N || ...
                ~isequal(loaded_dataset.lambdas, cfg.lambdas)
            needs_dataset_regen = true;
        end
    catch
        needs_dataset_regen = true;
    end
end

if cfg.use_topology_dataset && needs_dataset_regen
    fprintf('Generando dataset de topologias...\n');
    generate_topology_dataset(cfg);
    clear get_topology_from_dataset;
end

%% ==============================
%  EJECUCION DE EXPERIMENTOS
%% ==============================

fprintf('\nCorriendo experimento general: Q-Learning vs MO...\n');
results = run_experiment_suite_vs_mo(cfg, @run_qlearning_routing, 'Q-Learning');

sched = struct();
% fprintf('\nCorriendo experimento de schedulability: Q-Learning vs MO...\n');
% sched = run_experiment_suite_schedulability_vs_mo(cfg, @run_qlearning_routing, 'Q-Learning');

%% ==============================
%  PLOTS
%% ==============================

fprintf('\nGenerando graficos...\n');
plot_overlaps_vs_mo(results, cfg);
plot_hops_vs_mo(results, cfg);
% plot_conflict_vs_mo(results, cfg);
% plot_contention_vs_mo(results, cfg);
% plot_sched_ratio_density_vs_mo(sched, cfg);
% plot_sched_ratio_channels_vs_mo(sched, cfg);

%% ==============================
%  GUARDAR RESULTADOS
%% ==============================

if save_results
    out_path = fullfile(project_root, 'results_mo_vs_qlearning.mat');
    save(out_path, 'cfg', 'results', 'sched');
    fprintf('Resultados guardados en %s\n', out_path);
end

fprintf('Listo.\n');
