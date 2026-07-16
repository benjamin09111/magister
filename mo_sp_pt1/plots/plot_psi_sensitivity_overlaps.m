function plot_psi_sensitivity_overlaps(sweep_results, cfg, lambda_idx, n_target)
% plot_psi_sensitivity_overlaps  Curva de Omega vs psi para un lambda y n dados.
%
% Genera la figura principal del análisis de sensibilidad paramétrica:
% muestra cómo evoluciona el solapamiento total Omega al variar psi,
% marcando el valor automático de referencia y la zona de mejor desempeño.
%
% INPUT:
%   sweep_results - struct devuelto por run_psi_sweep_experiment
%   cfg           - struct de configuración
%   lambda_idx    - índice del lambda a graficar (1=4, 2=8, 3=12)
%   n_target      - número de flujos objetivo (debe estar en cfg.n_range)

% --- Localizar el índice de n en el rango ---------------------------------
n_range = sweep_results.n_range;
[~, n_idx] = min(abs(n_range - n_target));
n_actual = n_range(n_idx);
lambda_val = sweep_results.lambdas(lambda_idx);

% --- Extraer datos --------------------------------------------------------
psi_values = sweep_results.psi_values;
omega_curve = squeeze(sweep_results.mean_overlaps(:, lambda_idx, n_idx));
psi_auto    = sweep_results.psi_auto;

% --- Omega de referencia MO estándar (evaluada en psi_auto) ---------------
% Interpolar (o marcar directamente si psi_auto está en el vector)
omega_auto = interp1(psi_values, omega_curve, psi_auto, 'linear', 'extrap');

% --- Figura ---------------------------------------------------------------
fig = figure('Color', 'w', 'Position', [100, 100, 680, 400]);
ax  = axes('Parent', fig);
hold(ax, 'on'); grid(ax, 'on');

% Curva principal
semilogx(ax, psi_values, omega_curve, ...
    '-o', 'Color', '#1f77b4', 'LineWidth', 2.0, ...
    'MarkerFaceColor', '#1f77b4', 'MarkerSize', 6);

% Línea vertical: psi automático de referencia
% Nota: LabelInterpreter no soportado en todas las versiones — se usa text()
xline(ax, psi_auto, '--', ...
    'Color', '#d62728', 'LineWidth', 1.8);

% Punto de psi automático sobre la curva
plot(ax, psi_auto, omega_auto, 'rs', ...
    'MarkerSize', 9, 'MarkerFaceColor', '#d62728', 'LineWidth', 1.5);

% Encontrar el mínimo de la curva
[omega_min, idx_min] = min(omega_curve);
psi_best = psi_values(idx_min);
plot(ax, psi_best, omega_min, 'g^', ...
    'MarkerSize', 9, 'MarkerFaceColor', '#2ca02c', 'LineWidth', 1.5);

% --- Etiquetas y estilo paper -------------------------------------------
ax.XLabel.String = 'Penalization factor $\psi$ (log scale)';
ax.YLabel.String = 'Average total overlaps $\Omega$';
ax.XLabel.Interpreter = 'latex';
ax.YLabel.Interpreter = 'latex';
ax.XLim = [min(psi_values)*0.8, max(psi_values)*1.2];
ax.YLim(1) = 0;
ax.XGrid = 'on';  ax.YGrid = 'on';
ax.GridLineStyle = '--';  ax.GridAlpha = 0.5;
ax.GridColor = '#D0D0D0';
ax.Box = 'off';
ax.TickLength = [0.03 0.03];
set(ax, 'FontName', 'Times New Roman', 'FontSize', 10);
ax.XAxis.Scale = 'log';

legend(ax, {...
    sprintf('MO($\\psi$), $\\lambda=%d$, $n=%d$', lambda_val, n_actual), ...
    '$\psi_{\mathrm{auto}}$ (reference)', ...
    sprintf('$\\psi_{\\mathrm{auto}}$ point ($\\Omega=%.1f$)', omega_auto), ...
    sprintf('Best $\\psi=%.4g$ ($\\Omega=%.1f$)', psi_best, omega_min)}, ...
    'Location', 'NorthEast', 'Interpreter', 'latex', ...
    'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Box', 'on', 'EdgeColor', '#BBBBBB', 'LineWidth', 0.8);

drawnow;
% Etiqueta de psi_auto: dibujada al final para leer YLim estabilizado
y_top = ax.YLim(2);
text(ax, psi_auto, y_top * 0.97, sprintf('$\\psi_{\\mathrm{auto}}=%.4f$', psi_auto), ...
    'Interpreter', 'latex', 'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Color', '#d62728', 'HorizontalAlignment', 'center', 'VerticalAlignment', 'top');
drawnow;
end
