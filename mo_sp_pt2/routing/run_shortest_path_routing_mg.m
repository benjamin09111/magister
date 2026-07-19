function paths = run_shortest_path_routing_mg(G, sensors, gateways_for_sensors)
% RUN_SHORTEST_PATH_ROUTING_MG Calcula las rutas iniciales Shortest Path (SP) 
% para cada sensor hacia su gateway asignado.
%
% INPUT:
%   G                     - Grafo original de MATLAB (graph)
%   sensors               - Vector de IDs de nodos sensores [n x 1]
%   gateways_for_sensors - Vector de IDs de gateways asignados [n x 1]
%                           donde gateways_for_sensors(i) es el gateway de sensors(i)
%
% OUTPUT:
%   paths                 - Cell array [n x 1] con la secuencia de nodos para cada ruta.

n = length(sensors);
paths = cell(n, 1);

for i = 1:n
    % Usamos 'Method', 'unweighted' para hop-count shortest path como en el baseline
    paths{i} = shortestpath(G, sensors(i), gateways_for_sensors(i), 'Method', 'unweighted');
end
end
