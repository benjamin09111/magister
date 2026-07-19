function plot_psi_all_lambdas(sweep_results, cfg, n_target)
% plot_psi_all_lambdas  Comparativa Omega vs psi para los 3 lambdas en una figura.
%
% Figura de síntesis: permite comparar el efecto de psi sobre los overlaps
% para los tres niveles de densidad de red (lambda = 4, 8, 12) con n fijo.
% Es la figura principal para publicación, ya que reúne toda la información
% del análisis de sensibilidad en un solo panel.
%
% INPUT:
%   sweep_results - struct de run_psi_sweep_experiment
%   cfg           - struct de configuración
%   n_target      - número de flujos objetivo (debe estar en cfg.n_range)

% --- Localizar n en el rango ----------------------------------------------
n_range = sweep_results.n_range;
[~, n_idx] = min(abs(n_range - n_target));
n_actual    = n_range(n_idx);

psi_values  = sweep_results.psi_values;
psi_auto    = sweep_results.psi_auto;
lambda_colors = {'#1f77b4', '#ff7f0e', '#2ca02c'};
markers       = {'o', 's', '^'};

% --- Figura ---------------------------------------------------------------
fig = figure('Color', 'w', 'Position', [100, 100, 720, 430]);
ax  = axes('Parent', fig);
hold(ax, 'on'); grid(ax, 'on');

legend_labels = {};

for l_idx = 1:length(sweep_results.lambdas)
    lambda_val  = sweep_results.lambdas(l_idx);
    omega_curve = squeeze(sweep_results.mean_overlaps(:, l_idx, n_idx));
    c = lambda_colors{l_idx};
    mk = markers{l_idx};

    semilogx(ax, psi_values, omega_curve, ...
        ['-' mk], 'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 5);

    legend_labels{end+1} = sprintf('$\\lambda=%d$, $n=%d$', lambda_val, n_actual); %#ok<AGROW>
end

% Línea vertical: psi_auto de referencia
% Nota: LabelInterpreter no está soportado en todas las versiones de MATLAB;
% se usa xline simple + text annotation para compatibilidad.
xline(ax, psi_auto, 'k--', 'LineWidth', 1.6);

% --- Etiquetas y estilo paper -------------------------------------------
ax.XLabel.String = 'Penalization factor $\psi$ (log scale)';
ax.YLabel.String = 'Average total overlaps $\Omega$';
ax.XLabel.Interpreter = 'latex';
ax.YLabel.Interpreter = 'latex';
ax.XLim = [min(psi_values)*0.8, max(psi_values)*1.2];
ax.YLim(1) = 0;
ax.XGrid = 'on'; ax.YGrid = 'on';
ax.GridLineStyle = '--'; ax.GridAlpha = 0.5;
ax.GridColor = '#D0D0D0';
ax.Box = 'off';
ax.TickLength = [0.03 0.03];
ax.XAxis.Scale = 'log';
set(ax, 'FontName', 'Times New Roman', 'FontSize', 10);

legend(ax, legend_labels, ...
    'Location', 'NorthEast', 'Interpreter', 'latex', ...
    'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Box', 'on', 'EdgeColor', '#BBBBBB', 'LineWidth', 0.8);

% Etiqueta de psi_auto: se dibuja al final para leer YLim ya estabilizado
drawnow;
y_top = ax.YLim(2);
text(ax, psi_auto, y_top * 0.97, '$\psi_{\mathrm{auto}}$', ...
    'Interpreter', 'latex', ...
    'FontSize', 9, 'FontName', 'Times New Roman', ...
    'HorizontalAlignment', 'center', 'VerticalAlignment', 'top', ...
    'Color', 'k');

drawnow;
end
