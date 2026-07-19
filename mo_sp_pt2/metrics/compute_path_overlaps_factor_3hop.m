function delta = compute_path_overlaps_factor_3hop(path1, path2)
% COMPUTE_PATH_OVERLAPS_FACTOR_3HOP Calcula el factor de traslape con reuso 
% de slots a 3 saltos para dos rutas, según la regla de multi-gateway.
%
% INPUT:
%   path1 - Vector con la secuencia de nodos de la ruta 1
%   path2 - Vector con la secuencia de nodos de la ruta 2
%
% OUTPUT:
%   delta - Factor de traslape delta_ij aplicando min(3, len_q) por cada
%           segmento de enlaces compartido disjunto.

delta = 0;
if length(path1) < 2 || length(path2) < 2
    return;
end

% Construir lista de aristas no dirigidas para path1 (min, max asegura orden de pares)
edges1 = [min(path1(1:end-1), path1(2:end))', max(path1(1:end-1), path1(2:end))'];

% Construir lista de aristas no dirigidas para path2
edges2 = [min(path2(1:end-1), path2(2:end))', max(path2(1:end-1), path2(2:end))'];

% Encontrar la intersección de filas (enlaces compartidos)
shared_edges = intersect(edges1, edges2, 'rows');

if isempty(shared_edges)
    return;
end

% Crear un grafo temporario con las aristas compartidas
G_shared = graph(shared_edges(:, 1), shared_edges(:, 2));

% Agrupar aristas compartidas en componentes continuas (segmentos de cruce)
bins = conncomp(G_shared);
num_comps = max(bins);

for c = 1:num_comps
    % Nodos en esta componente conexa
    nodes_in_c = find(bins == c);
    
    % Subgrafo inducido para la componente c
    subG = subgraph(G_shared, nodes_in_c);
    
    % Cantidad de aristas en esta componente disjunta (longitud del segmento)
    len_q = numedges(subG);
    
    % Regra de reuso de slots a 3 saltos
    delta = delta + min(3, len_q);
end
end
