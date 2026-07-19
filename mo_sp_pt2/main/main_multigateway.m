%% main_multigateway.m
% =========================================================================
% Simulación Real-Time Multi-Gateway (Santos2020a + Multi-Gateway)
% =========================================================================
%
% PROPÓSITO:
%   Orquesta la simulación multi-gateway sobre las 100 topologías baseline.
%   Aplica clustering espectral NJW y selecciona gateways locales por
%   centralidades. Evalúa ruteo SP y MO-MG bajo plazos implícitos EDF.
%
% ENTRADA:
%   dataset_topologies.dat (cargado de la raíz)
%
% SALIDA:
%   results_multigateway.mat (guardado en la raíz)
%
% =========================================================================

clear; clc; close all;

%% ======================================================================
%  SETUP DE RUTAS (Ultra-robusto ante copia/pega en la consola de MATLAB)
%  Cumple estrictamente con la sección 3 de AGENTS.md
% ======================================================================
this_file = mfilename('fullpath');
if isempty(this_file)
    base_dir = pwd;
else
    this_dir = fileparts(this_file);
    base_dir = fileparts(this_dir);
end

% Detección de la raíz del proyecto para mo_sp_pt2
if exist(fullfile(base_dir, 'topology'), 'dir')
    project_root = base_dir;
elseif exist(fullfile(base_dir, 'mo_sp_pt2'), 'dir')
    project_root = fullfile(base_dir, 'mo_sp_pt2');
elseif exist(fullfile(pwd, 'mo_sp_pt2'), 'dir')
    project_root = fullfile(pwd, 'mo_sp_pt2');
else
    project_root = base_dir;
end

addpath(genpath(project_root));

% Agregar explícitamente mo_sp_gateways o similares si existe en MATLAB Online
if exist('/MATLAB Drive/mo_sp_gateways', 'dir')
    addpath(genpath('/MATLAB Drive/mo_sp_gateways'));
end

% Forzar agregar subcarpetas clave al path explícitamente
addpath(fullfile(project_root, 'topology'));
addpath(fullfile(project_root, 'routing'));
addpath(fullfile(project_root, 'metrics'));
addpath(fullfile(project_root, 'experiments'));
addpath(fullfile(project_root, 'main'));
savepath; % Guardar los paths para que persistan

%% ======================================================================
%  CARGAR CONFIGURACIÓN
%  ======================================================================
cfg = config_mg();

% Para verificar rápidamente el script, puedes modificar cfg.num_tests = 10;
% Pero por defecto, config_mg() corre las 100 topologías baseline del paper.
cfg.num_tests = 100; 

fprintf('\n=============================================================\n');
fprintf('  SIMULACIÓN REAL-TIME MULTI-GATEWAY\n');
fprintf('=============================================================\n');
fprintf('  N = %d nodos (Baseline Santos2020a)\n', cfg.N);
fprintf('  lambda = [%s]\n', num2str(cfg.lambdas));
fprintf('  n_range = [%d..%d] paso 2 (flujos)\n', min(cfg.n_range), max(cfg.n_range));
fprintf('  k_range = [%s] (gateways / clústeres)\n', num2str(cfg.k_range));
fprintf('  Canales m = %d\n', cfg.m_fixed);
fprintf('  Topologías = %d\n', cfg.num_tests);
fprintf('  Heurística MO (k_max = %d)\n', cfg.k_max);
fprintf('=============================================================\n\n');

%% ======================================================================
%  VERIFICACIÓN DEL DATASET
%  ======================================================================
% El dataset debe estar ubicado en la raíz del proyecto para asegurar
% que ocupamos las mismas 100 topologías baseline de mo_sp_pt1
dataset_path = fullfile(fileparts(project_root), 'dataset_topologies.dat');

% Si no existe en el directorio superior, buscaremos en el actual
if ~isfile(dataset_path)
    dataset_path = fullfile(project_root, 'dataset_topologies.dat');
end

if ~isfile(dataset_path)
    error('No se encontró dataset_topologies.dat en %s. Corre el generador de la baseline primero.', dataset_path);
else
    fprintf('Cargando dataset de topologías baseline: %s\n\n', dataset_path);
end

%% ======================================================================
%  EJECUTAR SIMULACIÓN COMPLETA
%  ======================================================================
t_start = tic;

results = run_experiment_suite_mg(cfg);

t_elapsed = toc(t_start);
fprintf('\nSimulación combinatoria completada en %.1f segundos (%.1f minutos).\n', ...
    t_elapsed, t_elapsed / 60);

%% ======================================================================
%  GUARDAR RESULTADOS
%  ======================================================================
% Guardamos el archivo .mat en el directorio superior (raíz de magister)
% para que plot_multigateway_results.py pueda graficar directamente.
out_dir = fileparts(project_root);
if ~exist(out_dir, 'dir') || ~exist(fullfile(out_dir, 'mo_sp_pt1'), 'dir')
    % Si no es un subdirectorio, guardar en el project_root
    out_path = fullfile(project_root, 'results_multigateway.mat');
else
    out_path = fullfile(out_dir, 'results_multigateway.mat');
end

save(out_path, 'results', 'cfg');
fprintf('Resultados guardados exitosamente en:\n  %s\n\n', out_path);
fprintf('¡Listo! Ahora puedes correr plot_multigateway_results.py en tu terminal para generar las figuras de publicación.\n\n');

