%% main_mo_psi_comparison.m
% =========================================================================
% Comparación Directa: MO con ψ_optimal vs MO con ψ_auto (paper)
% =========================================================================
%
% PROPÓSITO:
%   Ejecuta el experimento completo con DOS versiones de MO:
%     - MO_optimal : ψ* = 0.02605  (óptimo encontrado via Bayesian Optimization)
%     - MO_paper   : ψ_auto = λ/N  (heurística automática del paper NG-RES 2021)
%
%   Todo lo demás es idéntico: mismas 100 topologías, mismo dataset,
%   mismos lambdas, mismo n_range, mismo k_max. Solo cambia ψ.
%
% CONFIGURACIÓN IDÉNTICA A main_mo_phi.m:
%   N=66, λ∈{4,8,12}, n∈[2..22] paso 2, 100 topologías, k_max=100.
%
% RESULTADO:
%   Genera resultados_comparison.mat con ambos resultados y figuras
%   comparativas Ω vs n y Hops vs n para los 3 lambdas.
%
% =========================================================================

clear; clc; close all;

%% ======================================================================
%  SETUP DE RUTAS (Ultra-robusto ante copia/pega en la consola de MATLAB)
%% ======================================================================
this_file = mfilename('fullpath');
if isempty(this_file)
    % Si se copia y pega en la consola, mfilename es vacío. Usamos el directorio actual.
    base_dir = pwd;
else
    this_dir = fileparts(this_file);
    base_dir = fileparts(this_dir);
end

% Buscar la raíz del proyecto mo_sp_pt1
if exist(fullfile(base_dir, 'topology'), 'dir')
    project_root = base_dir;
elseif exist(fullfile(base_dir, 'mo_sp_pt1'), 'dir')
    project_root = fullfile(base_dir, 'mo_sp_pt1');
elseif exist(fullfile(pwd, 'mo_sp_pt1'), 'dir')
    project_root = fullfile(pwd, 'mo_sp_pt1');
else
    project_root = base_dir;
end

addpath(genpath(project_root));

% Agregar explícitamente mo_sp_gateways si existe en MATLAB Online
if exist('/MATLAB Drive/mo_sp_gateways', 'dir')
    addpath(genpath('/MATLAB Drive/mo_sp_gateways'));
    addpath(fullfile('/MATLAB Drive/mo_sp_gateways', 'topology'));
    addpath(fullfile('/MATLAB Drive/mo_sp_gateways', 'routing'));
    addpath(fullfile('/MATLAB Drive/mo_sp_gateways', 'experiments'));
    addpath(fullfile('/MATLAB Drive/mo_sp_gateways', 'plots'));
    addpath(fullfile('/MATLAB Drive/mo_sp_gateways', 'main'));
end

% Forzar agregar subcarpetas clave al path explícitamente
addpath(fullfile(project_root, 'topology'));
addpath(fullfile(project_root, 'routing'));
addpath(fullfile(project_root, 'experiments'));
addpath(fullfile(project_root, 'plots'));
addpath(fullfile(project_root, 'main'));
savepath; % Guardar los paths para que persistan en la sesión de MATLAB

%% ======================================================================
%  PARÁMETROS — NO TOCAR (idénticos a main_mo_phi.m)
%% ======================================================================
NUM_TESTS = 100;
N_NODES   = 66;
LAMBDAS   = [4, 8, 12];
N_RANGE   = 2:2:22;
K_MAX     = 100;

% ─── ÚNICO CAMBIO: los dos valores de ψ a comparar ────────────────────
PSI_OPTIMAL = 0.02605;          % Óptimo via Bayesian Optimization
% PSI_PAPER se calcula automáticamente como λ/N para cada λ
%   λ=4  → 4/66  ≈ 0.0606
%   λ=8  → 8/66  ≈ 0.1212   (escenario de referencia de la BO)
%   λ=12 → 12/66 ≈ 0.1818

%% ======================================================================
%  CONFIGURACIÓN DERIVADA
%% ======================================================================
cfg = config_ngres();
cfg.N                      = N_NODES;
cfg.lambdas                = LAMBDAS;
cfg.n_range                = N_RANGE;
cfg.num_tests              = NUM_TESTS;
cfg.k_max                  = K_MAX;
cfg.m_fixed                = 8;
cfg.use_topology_dataset   = true;
cfg.conflict_pair_mode     = 'paper_double';
cfg.w                      = 2;
cfg.eta_min                = 4;
cfg.eta_max                = 7;
cfg.period_values          = 2.^(cfg.eta_min:cfg.eta_max);
cfg.H                      = 128;
cfg.use_implicit_deadlines = true;

%% ======================================================================
%  VERIFICACIÓN DEL DATASET
%% ======================================================================
dataset_path = fullfile(project_root, 'dataset_topologies.dat');
needs_regen  = ~isfile(dataset_path);
if ~needs_regen
    try
        ds = load(dataset_path, '-mat');
        needs_regen = ds.K < cfg.num_tests || ds.N ~= cfg.N || ...
            ~isequal(ds.lambdas, cfg.lambdas);
    catch
        needs_regen = true;
    end
end
if needs_regen
    fprintf('Generando dataset de topologias (%d x %d λ)...\n', ...
        cfg.num_tests, length(cfg.lambdas));
    generate_topology_dataset(cfg);
    clear get_topology_from_dataset;
    fprintf('Dataset generado.\n\n');
else
    fprintf('Dataset existente OK.\n\n');
end

%% ======================================================================
%  CABECERA
%% ======================================================================
fprintf('\n=============================================================\n');
fprintf('  COMPARACION: MO(psi*) vs MO(psi_auto)\n');
fprintf('=============================================================\n');
fprintf('  N=%d  |  lambda in [%s]  |  n in [%d..%d]  |  trials=%d\n', ...
    N_NODES, num2str(LAMBDAS), min(N_RANGE), max(N_RANGE), NUM_TESTS);
fprintf('  MO_optimal : psi* = %.5f   (Bayesian Optimization)\n', PSI_OPTIMAL);
for li = 1:length(LAMBDAS)
    psi_p = LAMBDAS(li) / N_NODES;
    fprintf('  MO_paper   : psi_auto = %.5f  (lambda=%d/N, paper NG-RES 2021)\n', psi_p, LAMBDAS(li));
end
fprintf('=============================================================\n\n');

%% ======================================================================
%  EXPERIMENTO 1: MO con ψ* óptimo
%% ======================================================================
fprintf('--- Ejecutando MO_optimal (psi* = %.5f) ---\n', PSI_OPTIMAL);
t1 = tic;

routing_optimal = @(G, s, gw, c) run_mo_fixed_psi_routing(G, s, gw, c, PSI_OPTIMAL);
res_optimal = run_experiment_suite_vs_mo(cfg, routing_optimal, 'MO_optimal');

t1_elapsed = toc(t1);
fprintf('MO_optimal completado en %.1f segundos (%.1f min).\n\n', ...
    t1_elapsed, t1_elapsed/60);

%% ======================================================================
%  EXPERIMENTO 2: MO con ψ_auto del paper (una por lambda)
%% ======================================================================
fprintf('--- Ejecutando MO_paper (psi_auto = lambda/N) ---\n');
t2 = tic;

% psi_auto varía con lambda, usamos el de λ=8 como referencia única
% (mismo que el paper usa como valor central)
PSI_PAPER = 8 / N_NODES;   % = 0.12121...
fprintf('  Usando psi_auto = %.5f (lambda=8/N, referencia central)\n', PSI_PAPER);

routing_paper = @(G, s, gw, c) run_mo_fixed_psi_routing(G, s, gw, c, PSI_PAPER);
res_paper = run_experiment_suite_vs_mo(cfg, routing_paper, 'MO_paper');

t2_elapsed = toc(t2);
fprintf('MO_paper completado en %.1f segundos (%.1f min).\n\n', ...
    t2_elapsed, t2_elapsed/60);

%% ======================================================================
%  GUARDAR RESULTADOS
%% ======================================================================
out_path = fullfile(project_root, 'results_psi_comparison.mat');
save(out_path, 'cfg', 'res_optimal', 'res_paper', ...
    'PSI_OPTIMAL', 'PSI_PAPER', 'LAMBDAS', 'N_RANGE');
fprintf('Resultados guardados en: %s\n\n', out_path);

%% ======================================================================
%  RESUMEN EN CONSOLA
%% ======================================================================
fprintf('=============================================================\n');
fprintf('RESUMEN DE RESULTADOS (n=14, referencia)\n');
fprintf('=============================================================\n');
[~, n14_idx] = min(abs(N_RANGE - 14));
fprintf('%-8s  %-14s  %-14s  %-10s\n', 'lambda', 'Omega_optimal', 'Omega_paper', 'Mejora%');
fprintf('%s\n', repmat('-', 1, 52));
for li = 1:length(LAMBDAS)
    o_opt  = res_optimal.mean_overlaps_alt(li, n14_idx);
    o_pap  = res_paper.mean_overlaps_alt(li, n14_idx);
    mejora = (o_pap - o_opt) / max(o_pap, 1e-9) * 100;
    fprintf('%-8d  %-14.3f  %-14.3f  %-10.1f\n', LAMBDAS(li), o_opt, o_pap, mejora);
end
fprintf('=============================================================\n\n');

%% ======================================================================
%  VISUALIZACIÓN — Panel 2×3: Overlaps (top) y Hops (bottom) vs n
%% ======================================================================
fprintf('Generando figuras...\n');

COLOR_OPT   = '#2ca02c';   % verde — MO_optimal
COLOR_PAPER = '#d62728';   % rojo  — MO_paper (referencia)

fig = figure('Color', 'w', 'Position', [50, 50, 1100, 620]);
col_labels = {'\lambda=4', '\lambda=8', '\lambda=12'};

for li = 1:length(LAMBDAS)

    % --- Fila 1: Overlaps vs n -------------------------------------------
    ax_omg = subplot(2, 3, li, 'Parent', fig);

    plot(ax_omg, N_RANGE, res_optimal.mean_overlaps_alt(li, :), ...
        '-o', 'Color', COLOR_OPT, 'LineWidth', 2.2, ...
        'MarkerFaceColor', COLOR_OPT, 'MarkerSize', 5.5);
    hold(ax_omg, 'on');
    plot(ax_omg, N_RANGE, res_paper.mean_overlaps_alt(li, :), ...
        '--s', 'Color', COLOR_PAPER, 'LineWidth', 1.8, ...
        'MarkerFaceColor', COLOR_PAPER, 'MarkerSize', 5);

    ax_omg.XLabel.String = '';
    ax_omg.YLabel.String = '$\bar{\Omega}$ (overlaps)';
    ax_omg.YLabel.Interpreter = 'latex';
    ax_omg.YLim = [0, max(ax_omg.YLim(2), 1)];
    ax_omg.Box = 'off';
    grid(ax_omg, 'on');
    ax_omg.GridAlpha = 0.4;
    ax_omg.GridLineStyle = '--';
    set(ax_omg, 'FontName', 'Times New Roman', 'FontSize', 10);
    title(ax_omg, sprintf('$%s$', col_labels{li}), ...
        'Interpreter', 'latex', 'FontSize', 12);

    if li == 2
        legend(ax_omg, ...
            {sprintf('MO($\\psi^*$=%.5g)', PSI_OPTIMAL), ...
             sprintf('MO($\\psi_{\\mathrm{auto}}$=%.5g)', PSI_PAPER)}, ...
            'Interpreter', 'latex', 'Location', 'NorthWest', ...
            'FontSize', 9, 'Box', 'on');
    end

    % --- Fila 2: Hops vs n -----------------------------------------------
    ax_hop = subplot(2, 3, li + 3, 'Parent', fig);

    plot(ax_hop, N_RANGE, res_optimal.mean_hops_alt(li, :), ...
        '-o', 'Color', COLOR_OPT, 'LineWidth', 2.2, ...
        'MarkerFaceColor', COLOR_OPT, 'MarkerSize', 5.5);
    hold(ax_hop, 'on');
    plot(ax_hop, N_RANGE, res_paper.mean_hops_alt(li, :), ...
        '--s', 'Color', COLOR_PAPER, 'LineWidth', 1.8, ...
        'MarkerFaceColor', COLOR_PAPER, 'MarkerSize', 5);

    ax_hop.XLabel.String = 'Number of flows $n$';
    ax_hop.XLabel.Interpreter = 'latex';
    ax_hop.YLabel.String = 'Avg hops per route';
    ax_hop.YLim = [0, max(ax_hop.YLim(2), 1)];
    ax_hop.Box = 'off';
    grid(ax_hop, 'on');
    ax_hop.GridAlpha = 0.4;
    ax_hop.GridLineStyle = '--';
    set(ax_hop, 'FontName', 'Times New Roman', 'FontSize', 10);
end

% Título global
sgtitle(fig, ...
    sprintf(['MO($\\psi^*$=%.5g) vs MO($\\psi_{\\mathrm{auto}}$=%.5g) — ' ...
             'Overlaps (top) and Hops (bottom) vs. $n$'], PSI_OPTIMAL, PSI_PAPER), ...
    'Interpreter', 'latex', 'FontSize', 11);

drawnow;

% Guardar la figura automáticamente
figures_dir = fullfile(project_root, 'figures_phi');
if ~exist(figures_dir, 'dir')
    mkdir(figures_dir);
end
out_fig_path = fullfile(figures_dir, 'fig_psi_optimal_vs_paper_comparison.png');
saveas(fig, out_fig_path);
fprintf('Figura guardada en: %s\n', out_fig_path);
fprintf('Listo.\n');
