%% main_mo_phi_optimization_v2.m
% =========================================================================
% Optimización Bayesiana del Factor de Penalización ψ (phi) — MO Algorithm
% =========================================================================
%
% ALGORITMO: Bayesian Optimization (BO) con surrogate Gaussian Process (GP)
% ─────────────────────────────────────────────────────────────────────────
% Esta es la implementación profesional del estado del arte para optimización
% de hiperparámetros de funciones costosas y estocásticas.
%
% ¿Por qué BO es el mejor para este problema?
%   1. F(ψ) = E[Ω|ψ] es COSTOSA (~9s/evaluación) → necesitamos minimizar
%      el número de evaluaciones (no como GSS que evalúa ciegamente)
%   2. F(ψ) es ESTOCÁSTICA (ruidosa por Monte Carlo) → necesitamos modelar
%      la incertidumbre explícitamente (no como Brent's que asume exactitud)
%   3. F(ψ) es aproximadamente UNIMODAL → BO con GP la captura perfectamente
%
% PIPELINE COMPLETO (4 fases):
% ─────────────────────────────
%   FASE 1 — Warm-up Informed Grid
%     Evalúa 10 puntos iniciales en [PSI_MIN, PSI_MAX] (escala log),
%     con NUM_TRIALS_WARMUP trials por punto. Proporciona el prior inicial
%     al GP. Se usa el conocimiento del barrido previo para concentrar
%     los puntos en la región de interés.
%
%   FASE 2 — Bayesian Optimization Loop (con GP + EI)
%     En cada iteración:
%       a) Ajusta un Gaussian Process (kernel RBF + ruido) a las
%          evaluaciones previas en escala log(ψ)
%       b) Calcula la función de adquisición Expected Improvement (EI)
%          en una grilla densa de candidatos
%       c) Selecciona el candidato con mayor EI
%       d) Evalúa F(ψ) con número adaptativo de trials (Successive
%          Halving: más trials cerca del mínimo estimado)
%       e) Comprueba criterios de parada multi-criterio
%
%   FASE 3 — Refinamiento Local
%     Alrededor del mejor ψ encontrado, evalúa 5 puntos vecinos con
%     NUM_TRIALS_REFINE trials. Ajusta parábola y reporta el mínimo
%     analítico con intervalo de confianza.
%
%   FASE 4 — Validación Final
%     100 trials en los 3 mejores candidatos + ψ_auto del paper.
%     Reporta media ± 1.96*σ/√n (intervalo de confianza 95%).
%
% CRITERIOS DE PARADA (detiene cuando se cumple cualquiera):
%   C1 — Convergencia en ψ:  |log(ψ_k) - log(ψ_{k-1})| < EPS_PSI
%   C2 — Convergencia en Ω:  |F(ψ_k) - F(ψ_{k-1})| < EPS_OMEGA
%   C3 — Flat region:         las últimas FLAT_WINDOW evaluaciones tienen
%                              rango < FLAT_THRESHOLD (mínimo encontrado)
%   C4 — Budget agotado:      número de evaluaciones >= MAX_BO_ITERS
%
% REFERENCIAS:
%   - Snoek, J., Larochelle, H., & Adams, R. P. (2012). Practical Bayesian
%     Optimization of Machine Learning Algorithms. NIPS 2012.
%   - Shahriari, B. et al. (2016). Taking the Human Out of the Loop: A
%     Review of Bayesian Optimization. Proceedings of the IEEE, 104(1).
%   - Rasmussen, C. E., & Williams, C. K. I. (2006). Gaussian Processes
%     for Machine Learning. MIT Press.
%   - Jamieson, K. & Talwalkar, A. (2016). Non-stochastic Best Arm
%     Identification and Hyperparameter Optimization. AISTATS 2016.
%
% AUTOR: Seminario de Tesis — Enrutamiento TSCH bajo EDF, 2025.
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
%  PARAMETROS AJUSTABLES
%% ======================================================================

% --- Rango de busqueda (acotado por barrido previo, 100 trials) ----------
% psi* observado in [0.003162, 0.031623] para n>=10, todos los lambdas.
% Rango con margen x4.7 sobre el maximo observado.
PSI_MIN = 0.001;
PSI_MAX = 0.15;

% --- Escenario de referencia para la optimizacion ------------------------
LAMBDA_OPT = 8;
N_OPT      = 14;

% --- Budget de trials por fase -------------------------------------------
NUM_TRIALS_WARMUP  = 25;
NUM_TRIALS_BO      = 20;
NUM_TRIALS_REFINE  = 40;
NUM_TRIALS_VALID   = 100;

% --- Fase 1: Warm-up grid -----------------------------------------------
N_WARMUP_POINTS = 10;

% --- Fase 2: Bayesian Optimization loop ----------------------------------
MAX_BO_ITERS    = 25;
N_BO_CANDIDATES = 200;

% --- GP: hiperparametros iniciales del kernel RBF ------------------------
GP_LENGTH_SCALE_INIT = 1.0;
GP_SIGNAL_VAR_INIT   = 4.0;
GP_NOISE_VAR_INIT    = 0.1;

% --- Criterios de parada (Fase 2) ----------------------------------------
EPS_PSI        = 0.05;
EPS_OMEGA      = 0.05;
FLAT_WINDOW    = 5;
FLAT_THRESHOLD = 0.15;

% --- Successive Halving: factor para puntos prometedores -----------------
SH_RATIO = 2.0;

% --- Configuracion de la red (paper base) --------------------------------
N_NODES  = 66;
LAMBDAS  = [4, 8, 12];
N_RANGE  = 2:2:22;
K_MAX    = 100;

%% ======================================================================
%  CONFIGURACION DERIVADA
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

psi_auto_ref = LAMBDA_OPT / N_NODES;

dataset_path = fullfile(project_root, 'dataset_topologies.dat');
if ~isfile(dataset_path)
    fprintf('Generando dataset...\n');
    cfg_tmp = cfg; cfg_tmp.num_tests = 100;
    generate_topology_dataset(cfg_tmp);
    clear get_topology_from_dataset;
end

eval_omega = @(psi_val, n_trials) evaluate_omega_local(...
    psi_val, LAMBDA_OPT, N_OPT, cfg, n_trials);

%% ======================================================================
%  CABECERA
%% ======================================================================
fprintf('\n');
fprintf('=================================================================\n');
fprintf('  BAYESIAN OPTIMIZATION de psi en MO -- NG-RES 2021\n');
fprintf('=================================================================\n');
fprintf('  Escenario: lambda=%d, n=%d, N=%d\n', LAMBDA_OPT, N_OPT, N_NODES);
fprintf('  Rango:     psi in [%.4g, %.4g] (log scale)\n', PSI_MIN, PSI_MAX);
fprintf('  psi_auto:  %.6f\n', psi_auto_ref);
fprintf('  Criterios stop: eps_psi=%.2f | eps_omega=%.2f | flat<%d\n', ...
    EPS_PSI, EPS_OMEGA, FLAT_WINDOW);
fprintf('=================================================================\n\n');

%% ======================================================================
%  FASE 1: WARM-UP INFORMED GRID
%% ======================================================================
fprintf('--- FASE 1: Warm-up Grid (%d pts x %d trials) ---\n', ...
    N_WARMUP_POINTS, NUM_TRIALS_WARMUP);

% 70% de puntos en [PSI_MIN, 0.05] donde esta el optimo conocido
log_lo = log10(PSI_MIN); log_hi = log10(PSI_MAX); log_mid = log10(0.05);
n_lo = round(N_WARMUP_POINTS * 0.7);
n_hi = N_WARMUP_POINTS - n_lo;
psi_warmup = unique([logspace(log_lo, log_mid, n_lo), ...
                     logspace(log_mid, log_hi, n_hi+1)]);

X_obs = log10(psi_warmup(:));
Y_obs = zeros(size(X_obs));

t0 = tic;
for i = 1:length(psi_warmup)
    Y_obs(i) = eval_omega(psi_warmup(i), NUM_TRIALS_WARMUP);
    fprintf('  [W%02d/%02d] psi=%.5g   Omega=%.3f\n', ...
        i, length(psi_warmup), psi_warmup(i), Y_obs(i));
end
t_warmup = toc(t0);
fprintf('Warmup OK en %.1fs\n\n', t_warmup);

[f_best, idx_best] = min(Y_obs);
x_best = X_obs(idx_best);
psi_best_current = 10^x_best;
f_prev = f_best; x_prev = x_best;
gp_hp = [GP_LENGTH_SCALE_INIT, GP_SIGNAL_VAR_INIT, GP_NOISE_VAR_INIT];

%% ======================================================================
%  FASE 2: BAYESIAN OPTIMIZATION LOOP
%% ======================================================================
fprintf('--- FASE 2: Bayesian Optimization (%d iters max) ---\n', MAX_BO_ITERS);

hist_psi   = psi_warmup(:);
hist_omega = Y_obs(:);
hist_ei    = nan(MAX_BO_ITERS, 1);
stop_reason = 'budget agotado (C4)';

X_cand = linspace(log10(PSI_MIN), log10(PSI_MAX), N_BO_CANDIDATES)';

for iter = 1:MAX_BO_ITERS

    % 2a. Ajustar GP
    [gp_mu, gp_sigma, gp_hp] = fit_gp_1d(X_obs, Y_obs, X_cand, ...
        gp_hp(1), gp_hp(2), gp_hp(3));

    % 2b. Expected Improvement
    f_min_obs = min(Y_obs);
    z  = (f_min_obs - gp_mu) ./ (gp_sigma + 1e-10);
    ei = max((f_min_obs - gp_mu) .* normcdf(z) + gp_sigma .* normpdf(z), 0);

    % 2c. Seleccionar proximo punto
    [ei_max, idx_next] = max(ei);
    x_next   = X_cand(idx_next);
    psi_next = 10^x_next;

    % Successive Halving
    ei_pos = ei(ei > 0);
    if ~isempty(ei_pos) && ei_max > SH_RATIO * mean(ei_pos)
        n_trials_next = round(NUM_TRIALS_BO * 2);
        flag_sh = ' [SH:2x]';
    else
        n_trials_next = NUM_TRIALS_BO;
        flag_sh = '';
    end

    % 2d. Evaluar
    f_next = eval_omega(psi_next, n_trials_next);

    X_obs(end+1) = x_next;    %#ok<AGROW>
    Y_obs(end+1) = f_next;    %#ok<AGROW>
    hist_psi(end+1)   = psi_next; %#ok<AGROW>
    hist_omega(end+1) = f_next;   %#ok<AGROW>
    hist_ei(iter)     = ei_max;

    if f_next < f_best
        f_best = f_next;
        x_best = x_next;
        psi_best_current = psi_next;
    end

    fprintf('  [BO %02d/%02d] psi=%.5g  Omega=%.3f  EI=%.4f  best=%.3f (psi*=%.5g)%s\n', ...
        iter, MAX_BO_ITERS, psi_next, f_next, ei_max, f_best, psi_best_current, flag_sh);

    % 2e. Criterios de parada
    delta_psi = abs(x_next - x_prev);
    if delta_psi < EPS_PSI && iter > 3
        stop_reason = sprintf('C1: convergencia psi (|Dlog(psi)|=%.3f)', delta_psi);
        break;
    end

    delta_omega = abs(f_next - f_prev);
    if delta_omega < EPS_OMEGA && iter > 3
        stop_reason = sprintf('C2: convergencia Omega (|DOmega|=%.3f)', delta_omega);
        break;
    end

    if iter >= FLAT_WINDOW
        recent = hist_omega(end-FLAT_WINDOW+1:end);
        if range(recent) < FLAT_THRESHOLD
            stop_reason = sprintf('C3: flat region (rango=%.3f en ventana %d)', ...
                range(recent), FLAT_WINDOW);
            break;
        end
    end

    x_prev = x_next; f_prev = f_next;
end

fprintf('\n--> PARADA: %s\n', stop_reason);
fprintf('--> Mejor encontrado: psi*=%.6g, Omega*=%.3f\n\n', psi_best_current, f_best);

%% ======================================================================
%  FASE 3: REFINAMIENTO LOCAL
%% ======================================================================
fprintf('--- FASE 3: Refinamiento local (5 pts x %d trials) ---\n', NUM_TRIALS_REFINE);

log_best  = log10(psi_best_current);
log_neigh = linspace(max(log_best-0.35, log10(PSI_MIN)), ...
                     min(log_best+0.35, log10(PSI_MAX)), 5);
psi_refine   = 10.^log_neigh;
omega_refine = zeros(size(psi_refine));

for i = 1:length(psi_refine)
    omega_refine(i) = eval_omega(psi_refine(i), NUM_TRIALS_REFINE);
    fprintf('  [R%d] psi=%.5g  Omega=%.3f\n', i, psi_refine(i), omega_refine(i));
end

p_coeff = polyfit(log_neigh, omega_refine, 2);
if p_coeff(1) > 0
    log_psi_analytic = -p_coeff(2) / (2 * p_coeff(1));
    log_psi_analytic = max(min(log_psi_analytic, log10(PSI_MAX)), log10(PSI_MIN));
    psi_analytic = 10^log_psi_analytic;
    fprintf('\n  Minimo analitico (parabola): psi=%.6g\n', psi_analytic);
else
    [~, idx_r] = min(omega_refine);
    psi_analytic = psi_refine(idx_r);
    fprintf('\n  Minimo discreto: psi=%.6g\n', psi_analytic);
end

%% ======================================================================
%  FASE 4: VALIDACION FINAL
%% ======================================================================
fprintf('\n--- FASE 4: Validacion final (%d trials) ---\n', NUM_TRIALS_VALID);

psi_cands_val = unique([psi_best_current, psi_analytic, psi_auto_ref]);
psi_cands_val = psi_cands_val(psi_cands_val >= PSI_MIN*0.5);
labels_val    = arrayfun(@(p) sprintf('psi=%.5g',p), psi_cands_val,'UniformOutput',false);

omega_val_mean = zeros(1, length(psi_cands_val));
omega_val_ci95 = zeros(1, length(psi_cands_val));

for i = 1:length(psi_cands_val)
    n_reps = 4;
    reps   = zeros(1, n_reps);
    for r = 1:n_reps
        reps(r) = eval_omega(psi_cands_val(i), round(NUM_TRIALS_VALID/n_reps));
    end
    omega_val_mean(i) = mean(reps);
    omega_val_ci95(i) = 1.96 * std(reps) / sqrt(n_reps);
    fprintf('  %s -> Omega = %.3f +/- %.3f (95%% CI)\n', ...
        labels_val{i}, omega_val_mean(i), omega_val_ci95(i));
end

[omega_final_best, idx_final] = min(omega_val_mean);
psi_optimal = psi_cands_val(idx_final);

idx_auto = find(abs(psi_cands_val - psi_auto_ref) < 1e-8);
if ~isempty(idx_auto)
    psi_auto_omega = omega_val_mean(idx_auto);
    mejora = (psi_auto_omega - omega_final_best) / max(psi_auto_omega,1e-9) * 100;
else
    psi_auto_omega = eval_omega(psi_auto_ref, NUM_TRIALS_VALID);
    mejora = (psi_auto_omega - omega_final_best) / max(psi_auto_omega,1e-9) * 100;
end

fprintf('\n');
fprintf('=================================================================\n');
fprintf('  RESULTADO FINAL\n');
fprintf('=================================================================\n');
fprintf('  psi OPTIMO:       %.6g\n', psi_optimal);
fprintf('  Omega (100t):     %.3f +/- %.3f (95%% CI)\n', ...
    omega_final_best, omega_val_ci95(idx_final));
fprintf('  psi_auto (paper): %.6f  ->  Omega=%.3f\n', psi_auto_ref, psi_auto_omega);
fprintf('  Mejora vs paper:  %.1f%%\n', mejora);
fprintf('  Criterio parada:  %s\n', stop_reason);
fprintf('=================================================================\n');

%% ======================================================================
%  GUARDAR
%% ======================================================================
results_v2.psi_optimal      = psi_optimal;
results_v2.omega_optimal    = omega_final_best;
results_v2.omega_ci95       = omega_val_ci95(idx_final);
results_v2.psi_auto         = psi_auto_ref;
results_v2.omega_auto       = psi_auto_omega;
results_v2.mejora_pct       = mejora;
results_v2.bo_hist_psi      = hist_psi;
results_v2.bo_hist_omega    = hist_omega;
results_v2.bo_hist_ei       = hist_ei;
results_v2.refine_psi       = psi_refine;
results_v2.refine_omega     = omega_refine;
results_v2.psi_analytic     = psi_analytic;
results_v2.stop_reason      = stop_reason;
results_v2.gp_hp_final      = gp_hp;
results_v2.validation_psi   = psi_cands_val;
results_v2.validation_omega = omega_val_mean;
results_v2.validation_ci95  = omega_val_ci95;

out_path = fullfile(project_root, 'results_mo_phi_bo_v2.mat');
save(out_path, 'results_v2', 'psi_optimal', 'psi_auto_ref', ...
    'LAMBDA_OPT', 'N_OPT', 'PSI_MIN', 'PSI_MAX', 'stop_reason');
fprintf('\nResultados guardados: %s\n', out_path);

%% ======================================================================
%  VISUALIZACION
%% ======================================================================
fprintf('\nGenerando figuras...\n');

% FIG 1: Trayectoria BO
fig1 = figure('Color','w','Position',[50,50,860,420]);
n_warmup_pts = length(psi_warmup);
n_total      = length(hist_omega);
ax1 = axes('Parent', fig1);
fill(ax1, [1 n_warmup_pts n_warmup_pts 1], ...
    [0 0 max(hist_omega)*1.08 max(hist_omega)*1.08], ...
    [0.9 0.95 1.0], 'EdgeColor','none','FaceAlpha',0.5);
hold(ax1,'on');
plot(ax1, 1:n_total, hist_omega, 'o-', 'Color','#1f77b4', ...
    'LineWidth',1.6,'MarkerFaceColor','#1f77b4','MarkerSize',5);
[~, ig] = min(hist_omega);
plot(ax1, ig, hist_omega(ig), 'r*', 'MarkerSize',14,'LineWidth',2);
running_min = cummin(hist_omega);
plot(ax1, 1:n_total, running_min, 'k--', 'LineWidth',1.4);
xline(ax1, n_warmup_pts + 0.5, 'Color','#888888','LineStyle','--','LineWidth',1.2);
drawnow;
y_top = ax1.YLim(2);
text(ax1, n_warmup_pts/2, y_top*0.95, 'Phase 1', ...
    'FontSize',8,'HorizontalAlignment','center','Color','#555555');
text(ax1, n_warmup_pts+1.5, y_top*0.95, 'Phase 2: BO', ...
    'FontSize',8,'HorizontalAlignment','left','Color','#555555');
ax1.XLabel.String = 'Evaluation index';
ax1.YLabel.String = '$\bar{\Omega}(\psi)$';
ax1.XLabel.Interpreter = 'latex'; ax1.YLabel.Interpreter = 'latex';
ax1.YLim(1) = 0; ax1.Box = 'off'; grid(ax1,'on'); ax1.GridAlpha = 0.4;
set(ax1,'FontName','Times New Roman','FontSize',10);
title(ax1, sprintf('BO convergence -- lambda=%d, n=%d', LAMBDA_OPT, N_OPT), ...
    'FontName','Times New Roman','FontSize',12);
legend(ax1, {'Warm-up','F(psi_i)','Global best','Running min'}, ...
    'Location','NorthEast','FontSize',8,'Box','on');
drawnow;

% FIG 2: GP surrogate final + EI
X_dense = linspace(log10(PSI_MIN), log10(PSI_MAX), 300)';
[mu_final, sig_final, ~] = fit_gp_1d(X_obs, Y_obs, X_dense, ...
    gp_hp(1), gp_hp(2), gp_hp(3));
psi_dense = 10.^X_dense;

fig2 = figure('Color','w','Position',[100,100,860,500]);
ax2a = subplot(2,1,1,'Parent',fig2);
fill(ax2a, [psi_dense; flipud(psi_dense)], ...
    [mu_final - 1.96*sig_final; flipud(mu_final + 1.96*sig_final)], ...
    [0.7 0.85 1.0],'EdgeColor','none','FaceAlpha',0.6);
hold(ax2a,'on');
semilogx(ax2a, psi_dense, mu_final, 'b-','LineWidth',2.0);
semilogx(ax2a, 10.^X_obs, Y_obs, 'k+','MarkerSize',8,'LineWidth',1.5);
plot(ax2a, psi_optimal, omega_final_best, 'r*','MarkerSize',12,'LineWidth',2);
xline(ax2a, psi_auto_ref, 'Color','#d62728','LineStyle','--','LineWidth',1.3);
drawnow;
ylt = ax2a.YLim(2);
text(ax2a, psi_auto_ref, ylt*0.96, 'psi_{auto}', ...
    'FontSize',8,'Color','#d62728','HorizontalAlignment','center','VerticalAlignment','top');
ax2a.XAxis.Scale = 'log';
ax2a.YLabel.String = 'Omega(psi)';
ax2a.YLim(1) = 0; ax2a.Box = 'off'; grid(ax2a,'on'); ax2a.GridAlpha = 0.4;
set(ax2a,'FontName','Times New Roman','FontSize',9);
legend(ax2a,{'95% CI','GP mean','Observations','psi*'},'Location','NorthEast','FontSize',8);
title(ax2a,'GP Surrogate (final iteration)','FontName','Times New Roman','FontSize',11);

z_f = (min(Y_obs) - mu_final) ./ (sig_final + 1e-10);
ei_f = max((min(Y_obs) - mu_final) .* normcdf(z_f) + sig_final .* normpdf(z_f), 0);
ax2b = subplot(2,1,2,'Parent',fig2);
area(ax2b, psi_dense, ei_f,'FaceColor',[0.2 0.7 0.3],'FaceAlpha',0.7,'EdgeColor','none');
ax2b.XAxis.Scale = 'log';
ax2b.XLabel.String = 'Penalization factor psi';
ax2b.YLabel.String = 'Expected Improvement';
ax2b.Box = 'off'; grid(ax2b,'on'); ax2b.GridAlpha = 0.4;
set(ax2b,'FontName','Times New Roman','FontSize',9);
title(ax2b,'Expected Improvement (final)','FontName','Times New Roman');
drawnow;

% FIG 3: Validacion final con barras + CI
fig3 = figure('Color','w','Position',[150,150,540,380]);
ax3 = axes('Parent',fig3);
bar(ax3, omega_val_mean, 0.55,'FaceColor','#1f77b4','EdgeColor','#0d5a9e');
hold(ax3,'on');
errorbar(ax3, 1:length(psi_cands_val), omega_val_mean, omega_val_ci95, ...
    'k.','LineWidth',1.8,'CapSize',8);
bar(ax3, idx_final, omega_val_mean(idx_final), 0.55, ...
    'FaceColor','#2ca02c','EdgeColor','#1a7a1a');
ax3.XTick = 1:length(labels_val);
ax3.XTickLabel = labels_val;
ax3.XTickLabelRotation = 20;
ax3.YLabel.String = 'Omega (mean +/- 95% CI, 100 trials)';
ax3.YLim(1) = 0; ax3.Box = 'off'; grid(ax3,'on'); ax3.GridAlpha = 0.4;
set(ax3,'FontName','Times New Roman','FontSize',10);
title(ax3, sprintf('Final validation | lambda=%d n=%d | psi*=%.5g (%.1f%% improvement)', ...
    LAMBDA_OPT, N_OPT, psi_optimal, mejora), ...
    'FontName','Times New Roman','FontSize',10);
drawnow;

fprintf('Listo.\n');

%% ======================================================================
%  FUNCIONES AUXILIARES
%% ======================================================================

function omega_mean = evaluate_omega_local(psi_val, lambda_opt, n_opt, cfg_base, n_trials)
    cfg_local           = cfg_base;
    cfg_local.lambdas   = lambda_opt;
    cfg_local.n_range   = n_opt;
    cfg_local.num_tests = n_trials;
    routing_fn = @(G, s, gw, c) run_mo_fixed_psi_routing(G, s, gw, c, psi_val);
    res = run_experiment_suite_vs_mo(cfg_local, routing_fn, 'bo_opt');
    omega_mean = mean(res.mean_overlaps_alt(:));
end

function [mu, sigma, hp_out] = fit_gp_1d(X_train, Y_train, X_test, l_init, sf_init, sn_init)
% Gaussian Process 1D con kernel RBF, optimizacion de hiperparametros
% via maximizacion de log-verosimilitud marginal (fminsearch).
    X_train = X_train(:); Y_train = Y_train(:); X_test = X_test(:);
    n = length(X_train);
    y_mean = mean(Y_train); y_std = std(Y_train) + 1e-8;
    Y_norm = (Y_train - y_mean) / y_std;

    nlml = @(th) neg_log_ml(X_train, Y_norm, exp(th(1)), exp(th(2))^2, exp(th(3))^2);
    th0  = [log(l_init), log(sqrt(max(sf_init,1e-6))), log(sqrt(max(sn_init,1e-6)))];
    opts = optimset('Display','off','MaxIter',60,'TolFun',1e-4,'TolX',1e-4);
    try
        th_opt = fminsearch(nlml, th0, opts);
    catch
        th_opt = th0;
    end
    l   = exp(th_opt(1));
    sf2 = exp(th_opt(2))^2;
    sn2 = exp(th_opt(3))^2;
    hp_out = [l, sf2, sn2];

    K_tt = rbf_k(X_train, X_train, l, sf2) + (sn2 + 1e-6)*eye(n);
    K_st = rbf_k(X_test,  X_train, l, sf2);
    K_ss_diag = sf2 * ones(length(X_test), 1);

    L = chol(K_tt, 'lower');
    alpha    = L' \ (L \ Y_norm);
    mu_norm  = K_st * alpha;
    v        = L \ K_st';
    var_norm = max(K_ss_diag - sum(v.^2, 1)', 1e-10);

    mu    = mu_norm * y_std + y_mean;
    sigma = sqrt(var_norm) * y_std;
end

function K = rbf_k(X1, X2, l, sf2)
    X1 = X1(:); X2 = X2(:);
    K  = sf2 * exp(-0.5 * (X1 - X2').^2 / l^2);
end

function v = neg_log_ml(X, Y, l, sf2, sn2)
    n = length(X);
    K = rbf_k(X, X, l, sf2) + (sn2 + 1e-6)*eye(n);
    try
        L     = chol(K, 'lower');
        alpha = L' \ (L \ Y);
        v     = 0.5*Y'*alpha + sum(log(diag(L))) + 0.5*n*log(2*pi);
    catch
        v = 1e10;
    end
end
