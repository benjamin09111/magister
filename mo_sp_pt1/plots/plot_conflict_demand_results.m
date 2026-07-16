function plot_conflict_demand_results(results, cfg)
% Figura estilo paper: Avg. worst-case conflict demand

fig = figure('Color', 'w', 'Position', [100, 100, 650, 400]);
ax = axes('Parent', fig);
hold(ax, 'on'); grid(ax, 'on');

lambda_colors = {'#1f77b4', '#ff7f0e', '#2ca02c'};
method_styles.SP = struct('linestyle', '--', 'marker', 'o');
method_styles.MO = struct('linestyle', '-', 'marker', 's');

for l_idx = 1:length(results.lambdas)
    c = lambda_colors{l_idx};

    plot(ax, results.n_range, results.mean_conflict_sp(l_idx, :), ...
        'linestyle', '--', 'marker', 'o', ...
        'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);

    plot(ax, results.n_range, results.mean_conflict_mo(l_idx, :), ...
        'linestyle', '-', 'marker', 's', ...
        'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);
end

ax.XLabel.String = 'Number of flows, $n$';
ax.YLabel.String = 'Average worst-case conflict demand';
ax.XLabel.Interpreter = 'latex';
ax.YLabel.Interpreter = 'latex';

ax.XLim = [min(results.n_range), max(results.n_range)];
ax.YLim(1) = 0;

ax.XGrid = 'on';
ax.YGrid = 'on';
ax.GridLineStyle = '--';
ax.GridAlpha = 0.6;
ax.GridColor = '#D0D0D0';

ax.TickLength = [0.03 0.03];

ax.Box = 'off';

legend_labels = {};
for l_idx = 1:length(results.lambdas)
    lambda_val = results.lambdas(l_idx);
    legend_labels{end+1} = sprintf('$\\lambda=%d$ SP', lambda_val);
    legend_labels{end+1} = sprintf('$\\lambda=%d$ MO', lambda_val);
end

h_legend = legend(ax, legend_labels, ...
    'Location', 'NorthWest', ...
    'FontSize', 8, ...
    'FontName', 'Times New Roman', ...
    'Interpreter', 'latex', ...
    'Box', 'on', ...
    'EdgeColor', '#BBBBBB', ...
    'LineWidth', 0.8);

set(ax, 'FontName', 'Times New Roman', 'FontSize', 10);

fig.Position = [100, 100, 650, 400];

drawnow;
end
