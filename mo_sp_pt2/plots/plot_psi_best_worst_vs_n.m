function plot_psi_best_worst_vs_n(sweep_results, cfg, lambda_idx)
% plot_psi_best_worst_vs_n  Curvas Best-MO, Worst-MO y MO-auto vs n.
%
% Para cada n en cfg.n_range, identifica el psi que minimiza Omega (best-MO)
% y el psi que maximiza Omega (worst-MO), y traza ambas curvas junto con la
% curva de referencia MO-auto. Esta figura compara directamente el rango de
% variabilidad de MO inducida por la elección de psi, y constituye una
% contribución metodológica clara: cuantifica los límites teóricos del
% algoritmo según el parámetro de penalización.
%
% INPUT:
%   sweep_results - struct de run_psi_sweep_experiment
%   cfg           - struct de configuración
%   lambda_idx    - índice del lambda a graficar (1=4, 2=8, 3=12)

n_range    = sweep_results.n_range;
psi_values = sweep_results.psi_values;
lambda_val = sweep_results.lambdas(lambda_idx);
psi_auto   = sweep_results.psi_auto;
num_n      = length(n_range);

% Extraer la submatriz (num_psi x num_n)
omega_mat = squeeze(sweep_results.mean_overlaps(:, lambda_idx, :));
hops_mat  = squeeze(sweep_results.mean_hops(:,    lambda_idx, :));

% Inicializar vectores de best/worst
omega_best = zeros(1, num_n);  psi_best_vec = zeros(1, num_n);
omega_worst = zeros(1, num_n); psi_worst_vec = zeros(1, num_n);
omega_auto  = zeros(1, num_n);
hops_best   = zeros(1, num_n);
hops_worst  = zeros(1, num_n);
hops_auto_v = zeros(1, num_n);

for n_idx = 1:num_n
    col = omega_mat(:, n_idx);
    [omega_best(n_idx),  idx_b] = min(col);
    [omega_worst(n_idx), idx_w] = max(col);
    psi_best_vec(n_idx)  = psi_values(idx_b);
    psi_worst_vec(n_idx) = psi_values(idx_w);

    % psi_auto interpolado
    omega_auto(n_idx)  = interp1(psi_values, col, psi_auto, 'linear', 'extrap');

    % hops correspondientes
    hops_best(n_idx)   = hops_mat(idx_b, n_idx);
    hops_worst(n_idx)  = hops_mat(idx_w, n_idx);
    hops_auto_v(n_idx) = interp1(psi_values, hops_mat(:, n_idx), psi_auto, 'linear', 'extrap');
end

% ========================================================================
% FIGURA 1: Overlaps - Best/Worst/Auto vs n
% ========================================================================
fig1 = figure('Color', 'w', 'Position', [100, 100, 680, 420]);
ax1  = axes('Parent', fig1);
hold(ax1, 'on'); grid(ax1, 'on');

% Región sombreada entre best y worst
fill(ax1, [n_range, fliplr(n_range)], [omega_best, fliplr(omega_worst)], ...
    [0.85 0.93 1.0], 'EdgeColor', 'none', 'FaceAlpha', 0.55);

% Curvas
plot(ax1, n_range, omega_worst, '--v', 'Color', '#d62728', ...
    'LineWidth', 1.8, 'MarkerFaceColor', 'white', 'MarkerSize', 5);
plot(ax1, n_range, omega_auto, '-s',  'Color', '#ff7f0e', ...
    'LineWidth', 1.8, 'MarkerFaceColor', 'white', 'MarkerSize', 5);
plot(ax1, n_range, omega_best, '-^',  'Color', '#2ca02c', ...
    'LineWidth', 1.8, 'MarkerFaceColor', 'white', 'MarkerSize', 5);

ax1.XLabel.String = 'Number of flows, $n$';
ax1.YLabel.String = 'Average total overlaps $\Omega$';
ax1.XLabel.Interpreter = 'latex';
ax1.YLabel.Interpreter = 'latex';
ax1.XLim = [min(n_range), max(n_range)];
ax1.YLim(1) = 0;
ax1.XGrid = 'on'; ax1.YGrid = 'on';
ax1.GridLineStyle = '--'; ax1.GridAlpha = 0.5;
ax1.GridColor = '#D0D0D0';
ax1.Box = 'off';
ax1.TickLength = [0.03 0.03];
set(ax1, 'FontName', 'Times New Roman', 'FontSize', 10);

legend(ax1, {...
    'Feasibility range (best-worst)', ...
    sprintf('Worst-MO (max $\\psi$), $\\lambda=%d$', lambda_val), ...
    sprintf('MO-auto ($\\psi_{\\mathrm{auto}}$), $\\lambda=%d$', lambda_val), ...
    sprintf('Best-MO (opt $\\psi$), $\\lambda=%d$', lambda_val)}, ...
    'Location', 'NorthWest', 'Interpreter', 'latex', ...
    'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Box', 'on', 'EdgeColor', '#BBBBBB', 'LineWidth', 0.8);

drawnow;

% ========================================================================
% FIGURA 2: Hops - Best/Worst/Auto vs n (trade-off)
% ========================================================================
fig2 = figure('Color', 'w', 'Position', [800, 100, 680, 420]);
ax2  = axes('Parent', fig2);
hold(ax2, 'on'); grid(ax2, 'on');

fill(ax2, [n_range, fliplr(n_range)], [hops_best, fliplr(hops_worst)], ...
    [0.95 0.95 0.88], 'EdgeColor', 'none', 'FaceAlpha', 0.55);

plot(ax2, n_range, hops_worst, '--v', 'Color', '#d62728', ...
    'LineWidth', 1.8, 'MarkerFaceColor', 'white', 'MarkerSize', 5);
plot(ax2, n_range, hops_auto_v, '-s', 'Color', '#ff7f0e', ...
    'LineWidth', 1.8, 'MarkerFaceColor', 'white', 'MarkerSize', 5);
plot(ax2, n_range, hops_best,  '-^', 'Color', '#2ca02c', ...
    'LineWidth', 1.8, 'MarkerFaceColor', 'white', 'MarkerSize', 5);

ax2.XLabel.String = 'Number of flows, $n$';
ax2.YLabel.String = 'Average route length (hops)';
ax2.XLabel.Interpreter = 'latex';
ax2.YLabel.Interpreter = 'latex';
ax2.XLim = [min(n_range), max(n_range)];
ax2.YLim(1) = 0;
ax2.XGrid = 'on'; ax2.YGrid = 'on';
ax2.GridLineStyle = '--'; ax2.GridAlpha = 0.5;
ax2.GridColor = '#D0D0D0';
ax2.Box = 'off';
ax2.TickLength = [0.03 0.03];
set(ax2, 'FontName', 'Times New Roman', 'FontSize', 10);

legend(ax2, {...
    'Hops range (best-worst)', ...
    sprintf('Worst-MO, $\\lambda=%d$', lambda_val), ...
    sprintf('MO-auto ($\\psi_{\\mathrm{auto}}$), $\\lambda=%d$', lambda_val), ...
    sprintf('Best-MO, $\\lambda=%d$', lambda_val)}, ...
    'Location', 'NorthWest', 'Interpreter', 'latex', ...
    'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Box', 'on', 'EdgeColor', '#BBBBBB', 'LineWidth', 0.8);

drawnow;
end
