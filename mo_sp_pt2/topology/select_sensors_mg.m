function sensors = select_sensors_mg(G, gateways, n)
% SELECT_SENSORS_MG Selecciona n sensores de forma aleatoria excluyendo a
% todos los gateways designados.
%
% INPUT:
%   G        - Grafo original de MATLAB (graph)
%   gateways - Vector de IDs de nodos designados como gateways
%   n        - Número de sensores a elegir
%
% OUTPUT:
%   sensors  - Vector de tamaño n con los IDs de los sensores seleccionados.

N = numnodes(G);
all_nodes = 1:N;

% Excluir todos los gateways
potential = setdiff(all_nodes, gateways(:)');

% Si por alguna razón hay menos potenciales que n, lanzamos un error descriptivo
if numel(potential) < n
    error('select_sensors_mg: No hay suficientes nodos que no sean gateways para elegir n=%d sensores (disponibles=%d).', n, numel(potential));
end

% Selección aleatoria uniforme
idx = randperm(numel(potential), n);
sensors = potential(idx);
end
