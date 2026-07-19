function plot_psi_sensitivity_heatmap(sweep_results, cfg, lambda_idx)
% plot_psi_sensitivity_heatmap  Heatmap 2D: psi x n -> Omega promedio.
%
% Visualiza el espacio de soluciones completo del análisis de sensibilidad
% paramétrica de psi para todos los valores de n evaluados y un lambda fijo.
% Los ejes son: n (flujos) en X, psi en Y (escala log), y el color codifica
% el nivel promedio de solapamiento Omega.
%
% Este gráfico permite identificar de forma inmediata para qué combinaciones
% (psi, n) el algoritmo MO produce mejores o peores resultados, y dónde
% se ubica el psi automático de referencia en el espacio de soluciones.
%
% INPUT:
%   sweep_results - struct de run_psi_sweep_experiment
%   cfg           - struct de configuración
%   lambda_idx    - índice del lambda a graficar (1=4, 2=8, 3=12)

psi_values = sweep_results.psi_values;
n_range    = sweep_results.n_range;
lambda_val = sweep_results.lambdas(lambda_idx);
psi_auto   = sweep_results.psi_auto;

% Extraer la submatriz (num_psi x num_n) para el lambda elegido
omega_mat = squeeze(sweep_results.mean_overlaps(:, lambda_idx, :));   % (num_psi x num_n)

% --- Figura ---------------------------------------------------------------
fig = figure('Color', 'w', 'Position', [100, 100, 720, 440]);
ax  = axes('Parent', fig);

% Usar imagesc sobre escala logarítmica en Y manualmente
imagesc(ax, n_range, log10(psi_values), omega_mat);
axis(ax, 'xy');   % para que Y crezca hacia arriba

% Colormap tipo "calor inverso": azul = pocos overlaps, rojo = muchos
colormap(ax, flipud(hot));
cb = colorbar(ax);
cb.Label.String     = 'Average total overlaps $\Omega$';
cb.Label.Interpreter = 'latex';
cb.Label.FontName   = 'Times New Roman';
cb.Label.FontSize   = 10;

% Línea horizontal: psi_auto de referencia
% Nota: LabelInterpreter no soportado en todas las versiones — se usa text()
hold(ax, 'on');
yline(ax, log10(psi_auto), '--w', 'LineWidth', 2.0);

% Marcar el mínimo global
[~, lin_idx] = min(omega_mat(:));
[r_min, c_min] = ind2sub(size(omega_mat), lin_idx);
plot(ax, n_range(c_min), log10(psi_values(r_min)), 'g^', ...
    'MarkerSize', 10, 'MarkerFaceColor', '#2ca02c', 'LineWidth', 2);

% --- Eje Y personalizado (escala log visual) -------------------------------
n_ticks_y = 6;
psi_tick_vals = logspace(log10(min(psi_values)), log10(max(psi_values)), n_ticks_y);
ax.YTick = log10(psi_tick_vals);
ax.YTickLabel = arrayfun(@(v) sprintf('%.3g', v), psi_tick_vals, 'UniformOutput', false);

% --- Etiquetas y estilo paper -------------------------------------------
ax.XLabel.String = 'Number of flows, $n$';
ax.YLabel.String = 'Penalization factor $\psi$ (log scale)';
ax.XLabel.Interpreter = 'latex';
ax.YLabel.Interpreter = 'latex';
ax.XTick = n_range;
ax.Box = 'off';
set(ax, 'FontName', 'Times New Roman', 'FontSize', 10);

legend(ax, {sprintf('Best $\\psi=%.4g$, $n=%d$', psi_values(r_min), n_range(c_min))}, ...
    'Location', 'SouthEast', 'Interpreter', 'latex', ...
    'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Box', 'on', 'EdgeColor', '#BBBBBB', 'LineWidth', 0.8, ...
    'Color', [0.95 0.95 0.95]);

drawnow;
% Etiqueta de psi_auto: dibujada al final para XLim estabilizado
x_right = ax.XLim(2);
text(ax, x_right * 0.98, log10(psi_auto), ...
    sprintf('$\\psi_{\\mathrm{auto}}=%.4f$', psi_auto), ...
    'Interpreter', 'latex', 'FontSize', 9, 'FontName', 'Times New Roman', ...
    'Color', 'w', 'HorizontalAlignment', 'right', 'VerticalAlignment', 'bottom');
drawnow;
end
