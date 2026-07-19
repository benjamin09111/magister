%% main_mo_phi.m
% =========================================================================
% Análisis de Sensibilidad Paramétrica del Factor de Penalización ψ (phi) 
% en el Algoritmo Minimal Overlaps (MO) para Redes TSCH bajo EDF.
%
% PROPÓSITO:
%   Explorar el comportamiento del parámetro ψ (psi), definido en el paper
%   NG-RES 2021 como factor de densidad del grafo y utilizado para escalar
%   la penalización de aristas por solapamiento en cada iteración de MO:
%
%       w(e)^(k) = w(e)^(k-1) + delta_ij * psi
%
%   En la implementación base, ψ se fija de forma automática y arbitraria
%   como ψ_auto = avg_degree / N = λ/N. Este script evalúa sistemáticamente
%   un rango de valores de ψ sobre el mismo dataset de 100 topologías y 3
%   valores de λ, generando curvas Ω(ψ) y figuras de publicación para
%   identificar las versiones Best-MO y Worst-MO del algoritmo.
%
% DISEÑO JUSTIFICADO DEL RANGO DE ψ:
%   Para N=66 y λ ∈ {4,8,12}:
%     ψ_auto_min = 4/66 ≈ 0.061   (λ=4)
%     ψ_auto_mid = 8/66 ≈ 0.121   (λ=8, valor central de referencia)
%     ψ_auto_max = 12/66 ≈ 0.182  (λ=12)
%
%   El rango de barrido cubre 3 órdenes de magnitud centrados en ψ_auto_mid:
%     psi_min = 0.001  → ψ/ψ_auto ≈ 0.008 (subpenalización extrema → ~SP)
%     psi_max = 10.0   → ψ/ψ_auto ≈ 83    (sobrepenalización extrema → distorsión)
%
%   Se usa escala logarítmica uniforme para explorar de forma proporcional
%   las diferentes órdenes de magnitud (9 puntos por defecto).
%   Referencia metodológica: análisis de sensibilidad de parámetros en
%   metaheurísticas (Stützle & Hoos, 2000; Dorigo & Stützle, 2004).
%
% CONFIGURACIÓN:
%   Idéntica al paper base NG-RES 2021:
%     N=66, λ∈{4,8,12}, n∈[2..22] paso 2, 100 topologías, k_max=100.
%   Las variables de la sección "PARÁMETROS AJUSTABLES" permiten modificar
%   el rango y resolución del barrido sin tocar ningún otro archivo.
%
% ARCHIVOS GENERADOS:
%   results_mo_phi.mat  — resultados completos para post-procesamiento
%   Figuras interactivas MATLAB para exportar a PDF/PNG.
%
% DEPENDENCIAS (sin modificar):
%   routing/run_mo_fixed_psi_routing.m
%   experiments/run_psi_sweep_experiment.m
%   plots/plot_psi_sensitivity_overlaps.m
%   plots/plot_psi_sensitivity_heatmap.m
%   plots/plot_psi_all_lambdas.m
%   plots/plot_psi_best_worst_vs_n.m
%
% AUTOR: Análisis de Sensibilidad ψ — Seminario de Tesis, 2025.
% =========================================================================

clear; clc; close all;

%% ======================================================================
%  SETUP DE RUTAS (no modificar)
%% ======================================================================
this_file    = mfilename('fullpath');
this_dir     = fileparts(this_file);
project_root = fileparts(this_dir);
addpath(genpath(project_root));

%% ======================================================================
%  PARÁMETROS AJUSTABLES
%  ↓↓↓ EDITAR AQUÍ PARA CAMBIAR EL EXPERIMENTO ↓↓↓
%% ======================================================================

% --- Resolución del barrido -----------------------------------------------
% Número de valores de psi a evaluar. Más puntos = curva más suave,
% pero mayor tiempo de cómputo. Recomendado: 9-15 para publicación.
NUM_PSI_POINTS = 9;

% --- Rango de psi ----------------------------------------------------------
% Escala logarítmica: cubre desde subpenalización severa hasta
% sobrepenalización extrema (ver justificación en el encabezado).
PSI_MIN = 0.001;   % ψ_auto ≈ 0.121 para λ=8 → ratio 0.008 (casi SP)
PSI_MAX = 10.0;    % ratio ≈ 83 (sobrepenalización extrema)

% --- Configuración del experimento ----------------------------------------
NUM_TESTS    = 100;   % Topologías por escenario (100 = config paper completa)
N_NODES      = 66;    % Nodos en la red (fijo según paper NG-RES 2021)
LAMBDAS      = [4, 8, 12];   % Densidades de red evaluadas
N_RANGE      = 2:2:22;       % Rango de flujos activos
K_MAX        = 100;           % Iteraciones máximas de MO

% --- Visualización ---------------------------------------------------------
% n fijo para las curvas Ω(ψ): elige un valor representativo de n.
% n=14 está en la zona de saturación de SP, lo que hace las diferencias más visibles.
N_FIXED_FOR_CURVES = 14;

% Lambda para el heatmap 2D (índice en LAMBDAS)
LAMBDA_IDX_FOR_HEATMAP = 2;   % λ=8 (densidad media → más representativa)

% Lambda para las curvas best/worst vs n
LAMBDA_IDX_FOR_BESTWORST = 1;   % λ=4 (menor densidad, mayor variabilidad de ψ)

% --- Control de ejecución --------------------------------------------------
SAVE_RESULTS  = true;
EXPORT_FIGS   = false;   % true → guarda figuras como PDF en /figures/

%% ======================================================================
%  CONFIGURACIÓN DERIVADA (no modificar)
%% ======================================================================

cfg = config_ngres();
cfg.N                   = N_NODES;
cfg.lambdas             = LAMBDAS;
cfg.n_range             = N_RANGE;
cfg.num_tests           = NUM_TESTS;
cfg.k_max               = K_MAX;
cfg.m_fixed             = 8;
cfg.use_topology_dataset = true;
cfg.conflict_pair_mode  = 'paper_double';
cfg.w                   = 2;
cfg.eta_min             = 4;
cfg.eta_max             = 7;
cfg.period_values       = 2.^(cfg.eta_min:cfg.eta_max);
cfg.H                   = 128;
cfg.use_implicit_deadlines = true;

% Vector de psi en escala logarítmica uniforme
psi_values = logspace(log10(PSI_MIN), log10(PSI_MAX), NUM_PSI_POINTS);

% Valor de referencia ψ_auto para λ=8 (central)
psi_auto_ref = 8 / N_NODES;

%% ======================================================================
%  RESUMEN INICIAL
%% ======================================================================

fprintf('\n========================================================\n');
fprintf('ANÁLISIS DE SENSIBILIDAD PARAMÉTRICA — ψ (phi) EN MO\n');
fprintf('========================================================\n');
fprintf('N = %d nodos, λ ∈ [%s], n ∈ [%d..%d], trials = %d\n', ...
    N_NODES, num2str(LAMBDAS), min(N_RANGE), max(N_RANGE), NUM_TESTS);
fprintf('Valores de ψ (%d puntos, escala log):\n', NUM_PSI_POINTS);
fprintf('  ['); fprintf(' %.5g', psi_values); fprintf(' ]\n');
fprintf('ψ_auto de referencia (λ=8/N): %.6f\n', psi_auto_ref);
fprintf('Rango de búsqueda: [%.4g × ψ_auto, %.4g × ψ_auto]\n', ...
    PSI_MIN/psi_auto_ref, PSI_MAX/psi_auto_ref);
fprintf('========================================================\n\n');

%% ======================================================================
%  VERIFICACIÓN DEL DATASET DE TOPOLOGÍAS
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
    fprintf('Generando dataset de topologías (%d topologías × %d λ)...\n', ...
        cfg.num_tests, length(cfg.lambdas));
    generate_topology_dataset(cfg);
    clear get_topology_from_dataset;
    fprintf('Dataset generado.\n\n');
else
    fprintf('Dataset de topologías existente cargado OK.\n\n');
end

%% ======================================================================
%  EJECUCIÓN DEL BARRIDO DE ψ
%% ======================================================================

fprintf('Iniciando barrido de ψ...\n');
t_start = tic;

sweep_results = run_psi_sweep_experiment(cfg, psi_values);

t_elapsed = toc(t_start);
fprintf('\nBarrido completado en %.1f segundos (%.1f min).\n', ...
    t_elapsed, t_elapsed/60);

%% ======================================================================
%  GUARDAR RESULTADOS
%% ======================================================================

if SAVE_RESULTS
    out_path = fullfile(project_root, 'results_mo_phi.mat');
    save(out_path, 'cfg', 'sweep_results', 'psi_values', 'psi_auto_ref');
    fprintf('Resultados guardados en: %s\n\n', out_path);
end

%% ======================================================================
%  VISUALIZACIÓN
%% ======================================================================

fprintf('Generando figuras...\n');

% --- FIG 1: Curvas Ω(ψ) para los 3 lambdas con n fijo -------------------
% Figura principal de publicación: muestra el mínimo y dónde está ψ_auto.
plot_psi_all_lambdas(sweep_results, cfg, N_FIXED_FOR_CURVES);
title(sprintf('$\\Omega$ vs $\\psi$ — $n=%d$ flows', N_FIXED_FOR_CURVES), ...
    'Interpreter', 'latex', 'FontName', 'Times New Roman', 'FontSize', 12);

% --- FIG 2: Curva Ω(ψ) detallada para λ central (λ=8) -------------------
% Muestra claramente el mínimo, ψ_auto y la zona best/worst.
plot_psi_sensitivity_overlaps(sweep_results, cfg, LAMBDA_IDX_FOR_HEATMAP, N_FIXED_FOR_CURVES);
title(sprintf('Sensitivity: $\\Omega$ vs $\\psi$ — $\\lambda=%d$, $n=%d$', ...
    LAMBDAS(LAMBDA_IDX_FOR_HEATMAP), N_FIXED_FOR_CURVES), ...
    'Interpreter', 'latex', 'FontName', 'Times New Roman', 'FontSize', 12);

% --- FIG 3: Heatmap 2D psi × n → Omega para λ=8 -------------------------
% Espacio de soluciones completo: permite ver la sensibilidad global.
plot_psi_sensitivity_heatmap(sweep_results, cfg, LAMBDA_IDX_FOR_HEATMAP);
title(sprintf('$\\Omega(\\psi,n)$ heatmap — $\\lambda=%d$', ...
    LAMBDAS(LAMBDA_IDX_FOR_HEATMAP)), ...
    'Interpreter', 'latex', 'FontName', 'Times New Roman', 'FontSize', 12);

% --- FIG 4-5: Best-MO vs Worst-MO vs MO-auto para λ=4 ------------------
% Permite contextualizar el rendimiento del ψ automático frente a los
% límites teóricos del algoritmo MO.
plot_psi_best_worst_vs_n(sweep_results, cfg, LAMBDA_IDX_FOR_BESTWORST);

% --- FIG 6-7: Idem para λ=12 (alta densidad) ----------------------------
if LAMBDA_IDX_FOR_BESTWORST ~= length(LAMBDAS)
    plot_psi_best_worst_vs_n(sweep_results, cfg, length(LAMBDAS));
end

fprintf('Figuras generadas.\n');

%% ======================================================================
%  RESUMEN ESTADÍSTICO EN CONSOLA
%% ======================================================================

fprintf('\n========================================================\n');
fprintf('RESUMEN DE RESULTADOS\n');
fprintf('========================================================\n');
fprintf('%-8s  %-8s  %-10s  %-10s  %-10s\n', ...
    'lambda', 'n', 'psi_best', 'Omega_best', 'Omega_auto');
fprintf('%s\n', repmat('-', 1, 52));

for l_idx = 1:length(LAMBDAS)
    n_range   = sweep_results.n_range;
    [~, n_idx] = min(abs(n_range - N_FIXED_FOR_CURVES));
    col = squeeze(sweep_results.mean_overlaps(:, l_idx, n_idx));
    [omega_best, idx_b] = min(col);
    omega_auto_val = interp1(psi_values, col, psi_auto_ref, 'linear', 'extrap');
    fprintf('%-8d  %-8d  %-10.5g  %-10.2f  %-10.2f\n', ...
        LAMBDAS(l_idx), N_RANGE(n_idx), psi_values(idx_b), omega_best, omega_auto_val);
end

fprintf('========================================================\n');
fprintf('Listo.\n');
