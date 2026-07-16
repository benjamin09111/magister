function plot_gateway_centrality_deviation(gw_results, cfg)
% Deviation de schedulability ratio respecto de degree centrality.

fig = figure('Color', 'w', 'Position', [100, 100, 650, 400]);
methods = gw_results.gateway_methods;
baseline_idx = gw_results.baseline_idx;
colors = paper_colors();
color_idx = 1;

num_lambdas = length(gw_results.lambdas);

for l_idx = 1:num_lambdas
    ax = subplot(1, num_lambdas, l_idx, 'Parent', fig);
    hold(ax, 'on'); grid(ax, 'on');
    setup_paper_axes(ax, 'Number of flows, n', 'Deviation (%)');

    x = gw_results.n_range;
    plot(ax, [min(x), max(x)], [0, 0], ':', 'Color', [0.35 0.35 0.35], 'LineWidth', 1.0);

    color_idx = 1;
    for method_idx = 1:length(methods)
        if method_idx == baseline_idx
            continue;
        end

        c = colors{color_idx};
        color_idx = color_idx + 1;

        y_sp = squeeze(gw_results.dev_vs_degree.sched_sp(method_idx, l_idx, :));
        y_mo = squeeze(gw_results.dev_vs_degree.sched_mo(method_idx, l_idx, :));

        plot(ax, x, y_sp, '--o', ...
            'Color', c, 'LineWidth', 1.5, ...
            'MarkerFaceColor', 'white', 'MarkerSize', 4);
        plot(ax, x, y_mo, '-s', ...
            'Color', c, 'LineWidth', 1.8, ...
            'MarkerFaceColor', 'white', 'MarkerSize', 4);
    end

    ax.XLim = [min(x), max(x)];
    ax.FontSize = 9;
    text(ax, 0.05, 0.92, sprintf('\\lambda=%d', gw_results.lambdas(l_idx)), ...
        'Units', 'normalized', 'FontName', 'Times New Roman', 'FontSize', 9, ...
        'Interpreter', 'tex');
end

legend_labels = build_legend_labels(methods, baseline_idx);
legend(fig.Children(end), legend_labels, ...
    'Location', 'SouthWest', 'FontSize', 7, 'FontName', 'Times New Roman', ...
    'Box', 'on', 'EdgeColor', [0.73 0.73 0.73]);

save_paper_figure(fig, 'gateway_centrality_deviation');
end

function labels = build_legend_labels(methods, baseline_idx)
labels = {'degree baseline'};
for method_idx = 1:length(methods)
    if method_idx == baseline_idx
        continue;
    end
    name = char(methods{method_idx});
    labels{end+1} = sprintf('%s SP', name); %#ok<AGROW>
    labels{end+1} = sprintf('%s MO', name); %#ok<AGROW>
end
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
