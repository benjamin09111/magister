%% main_mo_phi_optimization.m
% =========================================================================
% Optimización del Factor de Penalización ψ (phi) del Algoritmo MO
% para Redes TSCH bajo Planificación EDF — NG-RES 2021.
%
% PROPÓSITO:
%   Encontrar automáticamente el valor óptimo de ψ que minimiza los
%   solapamientos promedio Ω en el algoritmo Minimal Overlaps (MO),
%   usando múltiples métodos de búsqueda de distinta complejidad:
%
%   1. GRID SEARCH   — referencia exhaustiva sobre escala logarítmica.
%   2. GOLDEN SECTION SEARCH (GSS) — búsqueda unimodal eficiente O(log n).
%   3. SIMULATED ANNEALING (SA) — metaheurística para funciones ruidosas
%      con múltiples mínimos locales.
%
%   Los resultados permiten al investigador:
%     a) Validar si la función Ω(ψ) es unimodal o multimodal.
%     b) Comparar la eficiencia computacional de cada método.
%     c) Reportar el ψ óptimo con respaldo estadístico para publicación.
%
% JUSTIFICACIÓN METODOLÓGICA:
%   La función objetivo F(ψ) = E[Ω | ψ] es estocástica (promediada sobre
%   100 topologías Monte Carlo). En la práctica, se observa que F es
%   aproximadamente unimodal en escala log para λ y n fijos (el problema
%   es convexo en escala logarítmica), lo que justifica el uso de GSS
%   como método eficiente de referencia. SA se incluye como alternativa
%   robusta frente a posibles multimodalidades en regímenes de alta carga.
%
%   Para la evaluación de F(ψ) se usa un número reducido de trials
%   (num_tests_opt) para mantener el cómputo manejable durante la
%   optimización. Los resultados finales se validan con el dataset completo.
%
% CONFIGURACIÓN:
%   Igual que el paper base: N=66, λ∈{4,8,12}, n∈[2..22], k_max=100.
%   El experimento de optimización se realiza sobre λ y n configurables
%   para reducir tiempo de cómputo (los parámetros de referencia son λ=8
%   y n=14, donde las diferencias entre ψ son más pronunciadas).
%
% ARCHIVOS GENERADOS:
%   results_mo_phi_optimization.mat  — resultados de todos los optimizadores
%   Figuras interactivas: convergencia GSS, convergencia SA, comparativa.
%
% DEPENDENCIAS (sin modificar ningún archivo existente):
%   routing/run_mo_fixed_psi_routing.m
%   experiments/run_psi_sweep_experiment.m   (para grid search + validación)
%   plots/plot_psi_sensitivity_overlaps.m
%
% REFERENCIAS:
%   - Kiefer, J. (1953). Sequential minimax search for a maximum.
%     Proc. Am. Math. Soc., 4(3), 502-506. (GSS)
%   - Kirkpatrick, S., Gelatt, C. D., & Vecchi, M. P. (1983).
%     Optimization by Simulated Annealing. Science, 220(4598), 671-680.
%   - Dorigo, M., & Stützle, T. (2004). Ant Colony Optimization.
%     MIT Press.
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

% --- Rango de búsqueda de ψ (acotado con resultados del barrido previo) ---
% Del barrido exhaustivo (resultados_phi.md, 100 trials):
%   lambda=4  → psi* ≈ 0.003  (mejor Ω en n=22)
%   lambda=8  → psi* ≈ 0.010  (mejor Ω en n=22)
%   lambda=12 → psi* ≈ 0.010  (mejor Ω en n=22)
% Todo lo que está por encima de psi≈0.1 empeora los resultados.
% Rango acotado: [0.001, 0.15] cubre el óptimo con margen suficiente.
PSI_MIN = 0.001;
PSI_MAX = 0.15;

% --- Escenario de referencia para la optimización -------------------------
% Lambda y n para evaluar F(ψ). Usar λ=8, n=14 como punto representativo
% (zona de saturación de SP, donde la diferencia entre ψ es máxima).
LAMBDA_OPT = 8;    % densidad de red para optimizar
N_OPT      = 14;   % flujos activos para optimizar

% --- Número de trials para la función objetivo de optimización ------------
% Menos trials = más rápido pero más ruidoso. Para optimización: 20-30.
% Para validación final: usar 100 (NUM_TESTS_VALIDATION).
NUM_TESTS_OPT        = 20;
NUM_TESTS_VALIDATION = 100;

% --- Grid Search (referencia) ---------------------------------------------
GRID_NUM_POINTS = 16;  % más puntos en rango acotado → mayor resolución (~0.001 a 0.15)

% --- Golden Section Search ------------------------------------------------
GSS_TOLERANCE  = 1e-4;   % tolerancia de convergencia (en escala log de ψ)
GSS_MAX_ITER   = 40;     % máximo de evaluaciones de F(ψ)

% --- Simulated Annealing --------------------------------------------------
SA_TEMP_INIT   = 5.0;   % temperatura inicial (escala de Omega típica)
SA_TEMP_MIN    = 0.01;  % temperatura final (criterio de parada)
SA_ALPHA       = 0.85;  % factor de enfriamiento (cooling rate)
SA_MAX_ITER    = 50;    % iteraciones totales del SA

% --- Configuración del experimento (no modificar salvo necesidad) ---------
N_NODES  = 66;
LAMBDAS  = [4, 8, 12];
N_RANGE  = 2:2:22;
K_MAX    = 100;

% --- Control de ejecución --------------------------------------------------
RUN_GRID_SEARCH = true;
RUN_GSS         = true;
RUN_SA          = true;
SAVE_RESULTS    = true;

%% ======================================================================
%  CONFIGURACIÓN DERIVADA (no modificar)
%% ======================================================================

cfg = config_ngres();
cfg.N                    = N_NODES;
cfg.lambdas              = LAMBDAS;
cfg.n_range              = N_RANGE;
cfg.k_max                = K_MAX;
cfg.m_fixed              = 8;
cfg.use_topology_dataset = true;
cfg.conflict_pair_mode   = 'paper_double';
cfg.w                    = 2;
cfg.eta_min              = 4;
cfg.eta_max              = 7;
cfg.period_values        = 2.^(cfg.eta_min:cfg.eta_max);
cfg.H                    = 128;
cfg.use_implicit_deadlines = true;

% Función auxiliar: evalúa E[Ω] para un psi dado con num_tests trials
% Se hace cfg local para no contaminar el cfg global
eval_omega = @(psi_val, n_trials) evaluate_omega_for_psi(...
    psi_val, LAMBDA_OPT, N_OPT, cfg, n_trials);

psi_auto_ref = LAMBDA_OPT / N_NODES;  % ψ_auto de referencia

%% ======================================================================
%  RESUMEN INICIAL
%% ======================================================================

fprintf('\n========================================================\n');
fprintf('OPTIMIZACIÓN DE ψ (phi) EN MO — NG-RES 2021\n');
fprintf('========================================================\n');
fprintf('Escenario: λ=%d, n=%d, N=%d, k_max=%d\n', ...
    LAMBDA_OPT, N_OPT, N_NODES, K_MAX);
fprintf('Rango ψ: [%.4g, %.4g] (escala log)\n', PSI_MIN, PSI_MAX);
fprintf('ψ_auto referencia: %.6f\n', psi_auto_ref);
fprintf('Métodos: Grid=%d, GSS=%d, SA=%d\n', RUN_GRID_SEARCH, RUN_GSS, RUN_SA);
fprintf('Trials opt / validación: %d / %d\n', NUM_TESTS_OPT, NUM_TESTS_VALIDATION);
fprintf('========================================================\n\n');

%% ======================================================================
%  VERIFICACIÓN DEL DATASET
%% ======================================================================

cfg_full = cfg;
cfg_full.num_tests = NUM_TESTS_VALIDATION;
dataset_path = fullfile(project_root, 'dataset_topologies.dat');
if ~isfile(dataset_path)
    fprintf('Generando dataset...\n');
    generate_topology_dataset(cfg_full);
    clear get_topology_from_dataset;
end

% Usar num_tests reducidos para optimización
cfg.num_tests = NUM_TESTS_OPT;

%% ======================================================================
%  MÉTODO 1: GRID SEARCH (búsqueda exhaustiva)
%% ======================================================================

opt_results.grid = struct();
if RUN_GRID_SEARCH
    fprintf('--- MÉTODO 1: GRID SEARCH (%d puntos) ---\n', GRID_NUM_POINTS);
    psi_grid   = logspace(log10(PSI_MIN), log10(PSI_MAX), GRID_NUM_POINTS);
    omega_grid = zeros(1, GRID_NUM_POINTS);

    t0 = tic;
    for i = 1:GRID_NUM_POINTS
        omega_grid(i) = eval_omega(psi_grid(i), NUM_TESTS_OPT);
        fprintf('  [%02d/%02d] psi=%.5g  Omega=%.3f\n', i, GRID_NUM_POINTS, psi_grid(i), omega_grid(i));
    end
    t_grid = toc(t0);

    [omega_best_grid, idx_best] = min(omega_grid);
    psi_best_grid = psi_grid(idx_best);

    fprintf('Grid Search → ψ*=%.5g, Ω*=%.3f (%.1fs)\n\n', ...
        psi_best_grid, omega_best_grid, t_grid);

    opt_results.grid.psi_values   = psi_grid;
    opt_results.grid.omega_values = omega_grid;
    opt_results.grid.psi_best     = psi_best_grid;
    opt_results.grid.omega_best   = omega_best_grid;
    opt_results.grid.time_s       = t_grid;
end

%% ======================================================================
%  MÉTODO 2: GOLDEN SECTION SEARCH (GSS)
%  Búsqueda unimodal eficiente sobre escala logarítmica de ψ.
%  Referencia: Kiefer (1953). Reduce el intervalo con ratio áureo.
%% ======================================================================

opt_results.gss = struct();
if RUN_GSS
    fprintf('--- MÉTODO 2: GOLDEN SECTION SEARCH ---\n');
    fprintf('  Búsqueda sobre log(ψ) en [%.4g, %.4g]\n', PSI_MIN, PSI_MAX);

    phi_gr = (sqrt(5) - 1) / 2;   % ratio áureo ≈ 0.618

    % Trabajamos en escala log para exploración proporcional
    log_a = log10(PSI_MIN);
    log_b = log10(PSI_MAX);

    % Puntos interiores iniciales
    log_c = log_b - phi_gr * (log_b - log_a);
    log_d = log_a + phi_gr * (log_b - log_a);
    fc    = eval_omega(10^log_c, NUM_TESTS_OPT);
    fd    = eval_omega(10^log_d, NUM_TESTS_OPT);

    gss_psi_history   = [10^log_c, 10^log_d];
    gss_omega_history = [fc, fd];
    gss_iter = 2;

    t0 = tic;
    while (log_b - log_a) > log10(1 + GSS_TOLERANCE) && gss_iter < GSS_MAX_ITER
        if fc < fd
            log_b = log_d;
            log_d = log_c;
            fd    = fc;
            log_c = log_b - phi_gr * (log_b - log_a);
            fc    = eval_omega(10^log_c, NUM_TESTS_OPT);
            gss_psi_history(end+1)   = 10^log_c; %#ok<AGROW>
            gss_omega_history(end+1) = fc;         %#ok<AGROW>
        else
            log_a = log_c;
            log_c = log_d;
            fc    = fd;
            log_d = log_a + phi_gr * (log_b - log_a);
            fd    = eval_omega(10^log_d, NUM_TESTS_OPT);
            gss_psi_history(end+1)   = 10^log_d; %#ok<AGROW>
            gss_omega_history(end+1) = fd;         %#ok<AGROW>
        end
        gss_iter = gss_iter + 1;
        fprintf('  [iter %02d] intervalo log-ψ ∈ [%.4g, %.4g]  width=%.4g\n', ...
            gss_iter, log_a, log_b, log_b - log_a);
    end
    t_gss = toc(t0);

    psi_best_gss   = 10^((log_a + log_b) / 2);
    omega_best_gss = eval_omega(psi_best_gss, NUM_TESTS_OPT);

    fprintf('GSS → ψ*=%.5g, Ω*=%.3f (%d evals, %.1fs)\n\n', ...
        psi_best_gss, omega_best_gss, gss_iter, t_gss);

    opt_results.gss.psi_history   = gss_psi_history;
    opt_results.gss.omega_history = gss_omega_history;
    opt_results.gss.psi_best      = psi_best_gss;
    opt_results.gss.omega_best    = omega_best_gss;
    opt_results.gss.n_evals       = gss_iter;
    opt_results.gss.time_s        = t_gss;
end

%% ======================================================================
%  MÉTODO 3: SIMULATED ANNEALING (SA)
%  Metaheurística para funciones estocásticas con posible multimodalidad.
%  Opera en escala logarítmica de ψ para exploración proporcional.
%  Referencia: Kirkpatrick et al. (1983).
%% ======================================================================

opt_results.sa = struct();
if RUN_SA
    fprintf('--- MÉTODO 3: SIMULATED ANNEALING ---\n');
    fprintf('  T0=%.2f, T_min=%.4f, alpha=%.3f, MaxIter=%d\n', ...
        SA_TEMP_INIT, SA_TEMP_MIN, SA_ALPHA, SA_MAX_ITER);

    % Inicializar en el centro del rango (escala log)
    log_psi_cur  = (log10(PSI_MIN) + log10(PSI_MAX)) / 2;
    omega_cur    = eval_omega(10^log_psi_cur, NUM_TESTS_OPT);
    log_psi_best = log_psi_cur;
    omega_best_sa = omega_cur;

    log_range    = log10(PSI_MAX) - log10(PSI_MIN);
    T            = SA_TEMP_INIT;

    sa_psi_history   = 10^log_psi_cur;
    sa_omega_history = omega_cur;

    t0 = tic;
    for iter = 1:SA_MAX_ITER
        if T < SA_TEMP_MIN; break; end

        % Perturbación proporcional al rango y temperatura actual
        step       = log_range * (T / SA_TEMP_INIT) * (2*rand - 1) * 0.5;
        log_psi_new = min(max(log_psi_cur + step, log10(PSI_MIN)), log10(PSI_MAX));
        omega_new   = eval_omega(10^log_psi_new, NUM_TESTS_OPT);

        % Criterio de aceptación de Metropolis
        delta = omega_new - omega_cur;
        if delta < 0 || rand < exp(-delta / T)
            log_psi_cur = log_psi_new;
            omega_cur   = omega_new;
        end

        % Actualizar mejor global
        if omega_cur < omega_best_sa
            omega_best_sa = omega_cur;
            log_psi_best  = log_psi_cur;
        end

        sa_psi_history(end+1)   = 10^log_psi_cur; %#ok<AGROW>
        sa_omega_history(end+1) = omega_cur;        %#ok<AGROW>

        T = T * SA_ALPHA;  % enfriamiento geométrico

        if mod(iter, 10) == 0
            fprintf('  [iter %02d] T=%.4f  psi=%.5g  Omega=%.3f  best=%.3f\n', ...
                iter, T, 10^log_psi_cur, omega_cur, omega_best_sa);
        end
    end
    t_sa = toc(t0);
    psi_best_sa = 10^log_psi_best;

    fprintf('SA → ψ*=%.5g, Ω*=%.3f (%d iters, %.1fs)\n\n', ...
        psi_best_sa, omega_best_sa, iter, t_sa);

    opt_results.sa.psi_history   = sa_psi_history;
    opt_results.sa.omega_history = sa_omega_history;
    opt_results.sa.psi_best      = psi_best_sa;
    opt_results.sa.omega_best    = omega_best_sa;
    opt_results.sa.n_evals       = iter + 2;
    opt_results.sa.time_s        = t_sa;
end

%% ======================================================================
%  VALIDACIÓN FINAL del mejor ψ encontrado
%% ======================================================================

% Recolectar los mejores candidatos de los métodos ejecutados
psi_candidates = [];
if RUN_GRID_SEARCH; psi_candidates(end+1) = opt_results.grid.psi_best; end
if RUN_GSS;         psi_candidates(end+1) = opt_results.gss.psi_best;  end
if RUN_SA;          psi_candidates(end+1) = opt_results.sa.psi_best;   end

fprintf('--- VALIDACIÓN FINAL (trials=%d) ---\n', NUM_TESTS_VALIDATION);
cfg_val = cfg;
cfg_val.num_tests = NUM_TESTS_VALIDATION;

psi_candidates = unique([psi_candidates, psi_auto_ref]);   % incluir ψ_auto
omega_validation = zeros(1, length(psi_candidates));
labels_val = cell(1, length(psi_candidates));

for i = 1:length(psi_candidates)
    omega_validation(i) = evaluate_omega_for_psi(...
        psi_candidates(i), LAMBDA_OPT, N_OPT, cfg_val, NUM_TESTS_VALIDATION);
    labels_val{i} = sprintf('ψ=%.4g', psi_candidates(i));
    fprintf('  %s → Ω=%.3f\n', labels_val{i}, omega_validation(i));
end

[omega_val_best, idx_val_best] = min(omega_validation);
psi_optimal = psi_candidates(idx_val_best);

fprintf('\n→ ψ ÓPTIMO VALIDADO: %.6g  (Ω=%.3f)\n', psi_optimal, omega_val_best);
fprintf('→ ψ_auto referencia: %.6g  (Ω=%.3f)\n', psi_auto_ref, ...
    omega_validation(psi_candidates == psi_auto_ref));
fprintf('→ Mejora sobre ψ_auto: %.1f%%\n', ...
    100*(omega_validation(psi_candidates == psi_auto_ref) - omega_val_best) / ...
     max(omega_validation(psi_candidates == psi_auto_ref), 1e-9));

opt_results.validation.psi_candidates   = psi_candidates;
opt_results.validation.omega_validation = omega_validation;
opt_results.validation.psi_optimal      = psi_optimal;
opt_results.validation.omega_optimal    = omega_val_best;
opt_results.validation.psi_auto         = psi_auto_ref;

%% ======================================================================
%  GUARDAR RESULTADOS
%% ======================================================================

if SAVE_RESULTS
    out_path = fullfile(project_root, 'results_mo_phi_optimization.mat');
    save(out_path, 'cfg', 'opt_results', 'psi_auto_ref', ...
        'LAMBDA_OPT', 'N_OPT', 'PSI_MIN', 'PSI_MAX');
    fprintf('\nResultados guardados en: %s\n', out_path);
end

%% ======================================================================
%  VISUALIZACIÓN
%% ======================================================================

fprintf('\nGenerando figuras de convergencia...\n');

% --- FIG 1: Grid Search — curva objetivo F(ψ) ----------------------------
if RUN_GRID_SEARCH
    fig1 = figure('Color', 'w', 'Position', [50, 50, 680, 400]);
    ax1  = axes('Parent', fig1);
    semilogx(ax1, opt_results.grid.psi_values, opt_results.grid.omega_values, ...
        '-o', 'Color', '#1f77b4', 'LineWidth', 2, ...
        'MarkerFaceColor', '#1f77b4', 'MarkerSize', 6);
    hold(ax1, 'on');
    xline(ax1, psi_auto_ref, 'r--', 'LineWidth', 1.8);
    plot(ax1, opt_results.grid.psi_best, opt_results.grid.omega_best, 'g^', ...
        'MarkerSize', 10, 'MarkerFaceColor', '#2ca02c', 'LineWidth', 2);
    ax1.XLabel.String = 'Penalization factor $\psi$ (log scale)';
    ax1.YLabel.String = '$\bar{\Omega}(\psi)$ — Average overlaps';
    ax1.XLabel.Interpreter = 'latex'; ax1.YLabel.Interpreter = 'latex';
    ax1.YLim(1) = 0; ax1.XAxis.Scale = 'log';
    ax1.Box = 'off'; ax1.GridAlpha = 0.5; grid(ax1, 'on');
    ax1.GridLineStyle = '--'; ax1.GridColor = '#D0D0D0';
    set(ax1, 'FontName', 'Times New Roman', 'FontSize', 10);
    title(ax1, sprintf('Grid Search — $\\lambda=%d$, $n=%d$', LAMBDA_OPT, N_OPT), ...
        'Interpreter', 'latex', 'FontName', 'Times New Roman', 'FontSize', 12);
    legend(ax1, {'$\bar{\Omega}(\psi)$', '$\psi_{\mathrm{auto}}$', ...
        sprintf('$\\psi^*=%.4g$', opt_results.grid.psi_best)}, ...
        'Location', 'NorthEast', 'Interpreter', 'latex', ...
        'FontSize', 9, 'FontName', 'Times New Roman', ...
        'Box', 'on', 'EdgeColor', '#BBBBBB');
    drawnow;
    % Etiqueta xline compatible (LabelInterpreter no soportado en todas las versiones)
    y1_top = ax1.YLim(2);
    text(ax1, psi_auto_ref, y1_top * 0.97, '$\psi_{\mathrm{auto}}$', ...
        'Interpreter', 'latex', 'FontSize', 9, 'FontName', 'Times New Roman', ...
        'Color', 'r', 'HorizontalAlignment', 'center', 'VerticalAlignment', 'top');
end

% --- FIG 2: SA — trayectoria de convergencia ------------------------------
if RUN_SA
    fig2 = figure('Color', 'w', 'Position', [100, 100, 680, 400]);
    ax2a = subplot(2, 1, 1, 'Parent', fig2);
    plot(ax2a, 1:length(opt_results.sa.omega_history), opt_results.sa.omega_history, ...
        '-', 'Color', '#ff7f0e', 'LineWidth', 1.6);
    hold(ax2a, 'on');
    yline(ax2a, opt_results.sa.omega_best, 'g--', 'LineWidth', 1.5);
    % Etiqueta yline compatible
    x2a_right = length(opt_results.sa.omega_history);
    text(ax2a, x2a_right * 0.98, opt_results.sa.omega_best, ...
        sprintf('$\Omega^*=%.2f$', opt_results.sa.omega_best), ...
        'Interpreter', 'latex', 'FontSize', 8, 'FontName', 'Times New Roman', ...
        'Color', [0 0.6 0], 'HorizontalAlignment', 'right', 'VerticalAlignment', 'bottom');
    ax2a.XLabel.String = 'SA Iteration';
    ax2a.YLabel.String = '$\Omega(\psi_t)$';
    ax2a.XLabel.Interpreter = 'latex'; ax2a.YLabel.Interpreter = 'latex';
    ax2a.Box = 'off'; grid(ax2a, 'on');
    set(ax2a, 'FontName', 'Times New Roman', 'FontSize', 9);
    title(ax2a, 'Simulated Annealing — $\Omega$ convergence', ...
        'Interpreter', 'latex', 'FontName', 'Times New Roman');

    ax2b = subplot(2, 1, 2, 'Parent', fig2);
    semilogx(ax2b, opt_results.sa.psi_history, opt_results.sa.omega_history, ...
        '.', 'Color', '#d62728', 'MarkerSize', 8);
    hold(ax2b, 'on');
    plot(ax2b, opt_results.sa.psi_best, opt_results.sa.omega_best, 'g^', ...
        'MarkerSize', 10, 'MarkerFaceColor', '#2ca02c');
    ax2b.XLabel.String = 'Explored $\psi$ values (log)';
    ax2b.YLabel.String = '$\Omega$';
    ax2b.XLabel.Interpreter = 'latex'; ax2b.YLabel.Interpreter = 'latex';
    ax2b.Box = 'off'; ax2b.XAxis.Scale = 'log'; grid(ax2b, 'on');
    set(ax2b, 'FontName', 'Times New Roman', 'FontSize', 9);
    drawnow;
end

% --- FIG 3: Comparativa de métodos — validación final --------------------
fig3 = figure('Color', 'w', 'Position', [150, 150, 560, 380]);
ax3  = axes('Parent', fig3);
bar(ax3, omega_validation, 0.6, 'FaceColor', '#1f77b4', 'EdgeColor', '#0d5a9e');
hold(ax3, 'on');
yline(ax3, omega_val_best, 'g--', 'LineWidth', 2);
% Etiqueta yline compatible
text(ax3, length(labels_val) + 0.4, omega_val_best, ...
    sprintf('$\Omega^*=%.2f$', omega_val_best), ...
    'Interpreter', 'latex', 'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Color', [0 0.6 0], 'HorizontalAlignment', 'right', 'VerticalAlignment', 'bottom');
ax3.XTick = 1:length(labels_val);
ax3.XTickLabel = labels_val;
ax3.XTickLabelRotation = 30;
ax3.YLabel.String = 'Validated $\bar{\Omega}$ (100 trials)';
ax3.YLabel.Interpreter = 'latex';
ax3.YLim(1) = 0;
ax3.Box = 'off'; grid(ax3, 'on');
ax3.GridLineStyle = '--'; ax3.GridAlpha = 0.5;
set(ax3, 'FontName', 'Times New Roman', 'FontSize', 10);
title(ax3, sprintf('Validation: $\\lambda=%d$, $n=%d$ — best $\\psi^*=%.4g$', ...
    LAMBDA_OPT, N_OPT, psi_optimal), ...
    'Interpreter', 'latex', 'FontName', 'Times New Roman', 'FontSize', 12);
drawnow;

fprintf('Listo.\n');

%% ======================================================================
%  FUNCIÓN AUXILIAR INTERNA
%% ======================================================================

function omega_mean = evaluate_omega_for_psi(psi_val, lambda_opt, n_opt, cfg_base, n_trials)
% Evalúa E[Omega] para un psi dado, usando run_experiment_suite_vs_mo.
% Usa lambda_opt y n_opt como punto representativo para rapidez.
%
% NOTA: reutiliza run_experiment_suite_vs_mo reducido a 1 lambda y 1 n
% para eficiencia. Esto es correcto porque la función sólo necesita
% comparar ψ en el mismo escenario.

    cfg_local           = cfg_base;
    cfg_local.lambdas   = lambda_opt;
    cfg_local.n_range   = n_opt;
    cfg_local.num_tests = n_trials;

    routing_fn = @(G, s, gw, c) run_mo_fixed_psi_routing(G, s, gw, c, psi_val);
    res = run_experiment_suite_vs_mo(cfg_local, routing_fn, 'opt');

    omega_mean = mean(res.mean_overlaps_alt(:));
end
