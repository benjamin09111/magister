function plot_sched_ratio_density_vs_mo(sched, cfg)
% Schedulability ratio varying density (ALT vs MO) - estilo paper

fig = figure('Color', 'w', 'Position', [100, 100, 650, 400]);
ax = axes('Parent', fig);
hold(ax, 'on'); grid(ax, 'on');

lambda_colors = {
    [0.1216 0.4667 0.7059], ...
    [1.0000 0.4980 0.0549], ...
    [0.1725 0.6275 0.1725]
};

method_name = sched.method_name;

for l_idx = 1:length(sched.lambdas)
    c = lambda_colors{l_idx};

    plot(ax, sched.n_range, sched.ratio_density_alt(l_idx, :), ...
        'linestyle', '--', 'marker', 'o', ...
        'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);

    plot(ax, sched.n_range, sched.ratio_density_mo(l_idx, :), ...
        'linestyle', '-', 'marker', 's', ...
        'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);
end

ax.XLabel.String = 'Number of flows, n';
ax.YLabel.String = 'Schedulability ratio';
ax.XLim = [min(sched.n_range), max(sched.n_range)];
ax.YLim = [0 1.05];

ax.XGrid = 'on';
ax.YGrid = 'on';
ax.GridLineStyle = '--';
ax.GridAlpha = 0.6;
ax.GridColor = [0.82 0.82 0.82];

ax.TickLength = [0.02 0.02];
ax.Box = 'off';

legend_labels = {};
for l_idx = 1:length(sched.lambdas)
    lambda_val = sched.lambdas(l_idx);
    legend_labels{end+1} = sprintf('\\lambda=%d %s', lambda_val, method_name); %#ok<AGROW>
    legend_labels{end+1} = sprintf('\\lambda=%d MO', lambda_val); %#ok<AGROW>
end

legend(ax, legend_labels, ...
    'Location', 'SouthWest', ...
    'FontSize', 8, ...
    'FontName', 'Times New Roman', ...
    'Interpreter', 'tex', ...
    'Box', 'on', ...
    'EdgeColor', [0.73 0.73 0.73]);

set(ax, 'FontName', 'Times New Roman', 'FontSize', 10);
end
