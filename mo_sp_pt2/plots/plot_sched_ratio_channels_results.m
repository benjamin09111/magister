function plot_sched_ratio_channels_results(sched, cfg)
% Schedulability ratio varying number of channels - estilo paper

fig = figure('Color', 'w', 'Position', [100, 100, 650, 400]);
ax = axes('Parent', fig);
hold(ax, 'on'); grid(ax, 'on');

m_colors = {'#1f77b4', '#ff7f0e', '#2ca02c'};
method_styles.SP = struct('linestyle', '--', 'marker', 'o');
method_styles.MO = struct('linestyle', '-', 'marker', 's');

for m_idx = 1:length(sched.m_values)
    c = m_colors{m_idx};

    plot(ax, sched.n_range, sched.ratio_channels_sp(m_idx, :), ...
        'linestyle', '--', 'marker', 'o', ...
        'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);

    plot(ax, sched.n_range, sched.ratio_channels_mo(m_idx, :), ...
        'linestyle', '-', 'marker', 's', ...
        'Color', c, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);
end

ax.XLabel.String = 'Number of flows, $n$';
ax.YLabel.String = 'Schedulability ratio';
ax.XLabel.Interpreter = 'latex';
ax.YLabel.Interpreter = 'latex';

ax.XLim = [min(sched.n_range), max(sched.n_range)];
ax.YLim = [0 1.05];

ax.XGrid = 'on';
ax.YGrid = 'on';
ax.GridLineStyle = '--';
ax.GridAlpha = 0.6;
ax.GridColor = '#D0D0D0';

ax.TickLength = [0.03 0.03];

ax.Box = 'off';

legend_labels = {};
for m_idx = 1:length(sched.m_values)
    m_val = sched.m_values(m_idx);
    legend_labels{end+1} = sprintf('$m=%d$ SP', m_val);
    legend_labels{end+1} = sprintf('$m=%d$ MO', m_val);
end

h_legend = legend(ax, legend_labels, ...
    'Location', 'SouthWest', ...
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
