%% main_experiments_control.m
% Control centralizado para ejecutar la replica NG-RES y extensiones.
% Edita solo esta seccion superior para cambiar los experimentos.

clear; clc; close all;

this_file = mfilename('fullpath');
this_dir = fileparts(this_file);
project_root = fileparts(this_dir);

addpath(genpath(project_root));

%% ==============================
%  CONFIGURACION CENTRAL
%% ==============================

% Red y experimentos
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

% Comparaciones a ejecutar
run_routing_only = false;
run_sp_vs_mo = true;
run_mo_vs_aco = false;
run_schedulability = false;
run_gateway_comparison = false;
run_plots = true;
run_legacy_plots = true;
run_gateway_plots = true;
save_results = true;

% Gateway comparison / deviation analysis
gateway_methods = {'betweenness', 'degree', 'eigenvector', 'closeness'};
baseline_gateway_method = 'degree';
gw_m_fixed = 8;

% Salida / trazabilidad
show_summary = true;

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
cfg.gateway_methods = gateway_methods;
cfg.baseline_gateway_method = baseline_gateway_method;
cfg.gw_m_fixed = gw_m_fixed;

%% ==============================
%  RESUMEN INICIAL
%% ==============================

if show_summary
    fprintf('\n=========================================\n');
    fprintf('NG-RES 2021 - CONTROL CENTRAL\n');
    fprintf('=========================================\n');
    fprintf('Project root: %s\n', project_root);
    fprintf('N = %d\n', cfg.N);
    fprintf('lambda = [%s]\n', num2str(cfg.lambdas));
    fprintf('n range = [%s]\n', num2str(cfg.n_range));
    fprintf('num_tests = %d\n', cfg.num_tests);
    fprintf('H = %d\n', cfg.H);
    fprintf('w = %d\n', cfg.w);
    fprintf('use_topology_dataset = %d\n', cfg.use_topology_dataset);
    fprintf('conflict_pair_mode = %s\n', cfg.conflict_pair_mode);
    fprintf('run_routing_only = %d\n', run_routing_only);
    fprintf('run_sp_vs_mo = %d\n', run_sp_vs_mo);
    fprintf('run_mo_vs_aco = %d\n', run_mo_vs_aco);
    fprintf('run_schedulability = %d\n', run_schedulability);
    fprintf('run_gateway_comparison = %d\n', run_gateway_comparison);
    fprintf('run_plots = %d\n', run_plots);
    fprintf('run_legacy_plots = %d\n', run_legacy_plots);
    fprintf('gateway_methods = [%s]\n', strjoin(gateway_methods, ', '));
    fprintf('baseline_gateway_method = %s\n', baseline_gateway_method);
    fprintf('=========================================\n');
end

%% ==============================
%  DATASET DE TOPOLOGIAS
%% ==============================

dataset_path = fullfile(project_root, 'dataset_topologies.dat');
needs_dataset_regen = regenerate_dataset || ~isfile(dataset_path);
if cfg.use_topology_dataset && ~needs_dataset_regen
    try
        loaded_dataset = load(dataset_path, '-mat');
        if ~isfield(loaded_dataset, 'K') || ~isfield(loaded_dataset, 'N') || ~isfield(loaded_dataset, 'lambdas') || ...
                loaded_dataset.K ~= cfg.num_tests || loaded_dataset.N ~= cfg.N || ~isequal(loaded_dataset.lambdas, cfg.lambdas)
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

results = struct();
sched = struct();
results_routing = struct();
results_moaco = struct();
gw_results = struct();

if run_routing_only
    results_routing = run_experiment_suite_routing(cfg);
end

if run_sp_vs_mo
    results = run_experiment_suite_ngres(cfg);
end

if run_schedulability
    sched = run_experiment_suite_schedulability(cfg);
end

if run_mo_vs_aco
    results_moaco = run_experiment_suite_mo_vs_moaco(cfg);
end

if run_gateway_comparison
    gw_results = run_experiment_suite_gateway_comparison(cfg);
end

%% ==============================
%  PLOTS
%% ==============================

if run_plots && run_legacy_plots
    if run_sp_vs_mo && ~isempty(fieldnames(results))
        plot_overlaps_results(results, cfg);
        plot_hops_results(results, cfg);
        % plot_conflict_demand_results(results, cfg);
        % plot_contention_demand_results(results, cfg);
    end

    if run_schedulability && ~isempty(fieldnames(sched))
        plot_sched_ratio_density_results(sched, cfg);
        plot_sched_ratio_channels_results(sched, cfg);
    end

    if run_mo_vs_aco && ~isempty(fieldnames(results_moaco))
        plot_overlaps_results_mo_vs_moaco(results_moaco, cfg);
        plot_hops_results_mo_vs_moaco(results_moaco, cfg);
    end

    if run_gateway_comparison && run_gateway_plots && ~isempty(fieldnames(gw_results))
        plot_gateway_centrality_deviation(gw_results, cfg);
        plot_gateway_mo_improvement(gw_results, cfg);
    end
end

%% ==============================
%  GUARDAR RESULTADOS
%% ==============================

if save_results
    out_path = fullfile(project_root, 'results_control.mat');
    save(out_path, 'cfg', 'results', 'sched', 'results_routing', 'results_moaco', 'gw_results');
    fprintf('Resultados guardados en %s\n', out_path);
end

fprintf('Listo.\n');
