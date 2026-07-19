function gateways = select_cluster_gateways(G, cluster_labels, k, method)
% SELECT_CLUSTER_GATEWAYS Calcula las centralidades locales en cada subgrafo de clúster
% y designa el nodo con mayor métrica como el gateway del clúster.
%
% INPUT:
%   G              - Grafo original de MATLAB (graph)
%   cluster_labels - Vector [N x 1] de etiquetas de clúster (1 a k)
%   k              - Número de clústeres
%   method         - Método de centralidad: 'degree', 'betweenness', 'closeness', 'eigenvector', 'random'
%
% OUTPUT:
%   gateways       - Vector de tamaño k con los IDs de los nodos gateway (1-based en G)
%                    Donde gateways(c) es el gateway del clúster c.

gateways = zeros(k, 1);

for c = 1:k
    % Nodos que pertenecen al clúster c
    nodes_in_c = find(cluster_labels == c);
    
    if isempty(nodes_in_c)
        continue;
    end
    
    % Subgrafo inducido del clúster c (aislado de conexiones exteriores)
    subG = subgraph(G, nodes_in_c);
    num_nodes = numnodes(subG);
    
    if num_nodes == 1
        gateways(c) = nodes_in_c(1);
        continue;
    end
    
    % Calcular métricas de centralidad sobre el subgrafo
    switch lower(method)
        case 'degree'
            c_vals = centrality(subG, 'degree');
            
        case 'betweenness'
            c_vals = centrality(subG, 'betweenness');
            
        case 'closeness'
            c_vals = centrality(subG, 'closeness');
            
        case 'eigenvector'
            % eigenvector puede no converger en grafos pequeños o no conexos
            try
                c_vals = centrality(subG, 'eigenvector');
            catch
                % Fallback a Degree si falla la convergencia
                c_vals = centrality(subG, 'degree');
            end
            
        case 'random'
            % Selección aleatoria de k gateways de todo el grafo (independiente de clústeres)
            % Usamos una semilla basada en la adyacencia de G para consistencia y reproducibilidad
            A_flat = adjacency(G);
            seed_val = full(sum(A_flat(:))) + k * 999;
            rng(seed_val, 'twister');
            rand_nodes = randperm(numnodes(G), k);
            gateways = rand_nodes(:);
            return;
            
        otherwise
            c_vals = centrality(subG, 'degree');
    end
    
    % Reemplazar cualquier NaN que ocurra por componentes desconectadas por -1
    c_vals(isnan(c_vals)) = -1;
    
    % Encontrar el índice del nodo con la centralidad máxima local
    [~, max_idx] = max(c_vals);
    
    % El gateway en el grafo global es el nodo correspondiente en nodes_in_c
    gateways(c) = nodes_in_c(max_idx);
end
end
