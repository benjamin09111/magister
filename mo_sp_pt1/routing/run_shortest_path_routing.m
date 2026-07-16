function paths = run_shortest_path_routing(G, sensors, gateway)
% Rutas iniciales SP (hop-count shortest path)

n = length(sensors);
paths = cell(n, 1);

for i = 1:n
    paths{i} = shortestpath(G, sensors(i), gateway, 'Method', 'unweighted');
end
end