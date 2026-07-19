function plot_gateway_mo_improvement(gw_results, cfg)
% Deviation de MO sobre degree+SP y best-centrality+MO sobre degree+SP.

fig = figure('Color', 'w', 'Position', [120, 120, 650, 400]);
colors = paper_colors();
x = gw_results.n_range;

ax1 = subplot(1, 2, 1, 'Parent', fig);
hold(ax1, 'on'); grid(ax1, 'on');
setup_paper_axes(ax1, 'Number of flows, n', 'Deviation (%)');
plot(ax1, [min(x), max(x)], [0, 0], ':', 'Color', [0.35 0.35 0.35], 'LineWidth', 1.0);

for l_idx = 1:length(gw_results.lambdas)
    y = squeeze(gw_results.dev_degree_mo_vs_sp.sched(1, l_idx, :));
    plot(ax1, x, y, '-s', ...
        'Color', colors{l_idx}, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);
end

ax1.XLim = [min(x), max(x)];
text(ax1, 0.05, 0.92, 'degree MO vs degree SP', ...
    'Units', 'normalized', 'FontName', 'Times New Roman', 'FontSize', 8);

ax2 = subplot(1, 2, 2, 'Parent', fig);
hold(ax2, 'on'); grid(ax2, 'on');
setup_paper_axes(ax2, 'Number of flows, n', 'Deviation (%)');
plot(ax2, [min(x), max(x)], [0, 0], ':', 'Color', [0.35 0.35 0.35], 'LineWidth', 1.0);

for l_idx = 1:length(gw_results.lambdas)
    y = squeeze(gw_results.dev_best_mo_vs_baseline.sched(1, l_idx, :));
    plot(ax2, x, y, '-s', ...
        'Color', colors{l_idx}, 'LineWidth', 1.8, ...
        'MarkerFaceColor', 'white', 'MarkerSize', 4);
end

ax2.XLim = [min(x), max(x)];
text(ax2, 0.05, 0.92, sprintf('%s MO vs degree SP', gw_results.best_mo_gateway_method), ...
    'Units', 'normalized', 'FontName', 'Times New Roman', 'FontSize', 8, ...
    'Interpreter', 'none');

legend_labels = cell(1, length(gw_results.lambdas));
for l_idx = 1:length(gw_results.lambdas)
    legend_labels{l_idx} = sprintf('\\lambda=%d', gw_results.lambdas(l_idx));
end
legend(ax2, legend_labels, ...
    'Location', 'SouthWest', 'FontSize', 8, 'FontName', 'Times New Roman', ...
    'Interpreter', 'tex', 'Box', 'on', 'EdgeColor', [0.73 0.73 0.73]);

save_paper_figure(fig, 'gateway_mo_improvement');
end

function setup_paper_axes(ax, xlabel_text, ylabel_text)
set(ax, 'FontName', 'Times New Roman', 'FontSize', 10);
ax.XLabel.String = xlabel_text;
ax.YLabel.String = ylabel_text;
ax.XGrid = 'on';
ax.YGrid = 'on';
ax.GridLineStyle = '--';
ax.GridAlpha = 0.6;
ax.GridColor = [0.82 0.82 0.82];
ax.TickLength = [0.02 0.02];
ax.Box = 'off';
end

function colors = paper_colors()
colors = {
    [0.1216 0.4667 0.7059], ...
    [1.0000 0.4980 0.0549], ...
    [0.1725 0.6275 0.1725], ...
    [0.8392 0.1529 0.1569]
};
end

function save_paper_figure(fig, output_name)
this_file = mfilename('fullpath');
this_dir = fileparts(this_file);
project_root = fileparts(this_dir);
output_dir = fullfile(project_root, 'figures');
if ~exist(output_dir, 'dir')
    mkdir(output_dir);
end

pdf_path = fullfile(output_dir, [output_name '.pdf']);
png_path = fullfile(output_dir, [output_name '.png']);

try
    exportgraphics(fig, pdf_path, 'ContentType', 'vector', 'BackgroundColor', 'white');
    exportgraphics(fig, png_path, 'Resolution', 300, 'BackgroundColor', 'white');
catch
    saveas(fig, pdf_path);
    print(fig, png_path, '-dpng', '-r300');
end
end
