function labels = njw_spectral_clustering(G, k)
% NJW_SPECTRAL_CLUSTERING Particiona el grafo G en k clústeres usando el
% algoritmo Ng-Jordan-Weiss (NJW) sobre el Laplaciano Normalizado.
%
% INPUT:
%   G      - Grafo objeto de MATLAB (graph)
%   k      - Número de clústeres deseado
%
% OUTPUT:
%   labels - Vector [N x 1] con la etiqueta de clúster (1 a k) para cada nodo.

N = numnodes(G);

if k == 1
    labels = ones(N, 1);
    return;
end

% 1. Matriz de Adyacencia y Grados
A = adjacency(G);
D_vals = full(sum(A, 2));

% Prevenir división por cero en nodos aislados
D_vals(D_vals == 0) = 1e-12;

% D^(-1/2)
D_inv_sqrt = diag(1 ./ sqrt(D_vals));

% Laplaciano Normalizado Simétrico: L_sym = I - D^(-1/2) * A * D^(-1/2)
% Equivalentemente: L = D - A, L_sym = D^(-1/2) * L * D^(-1/2)
L = diag(D_vals) - A;
L_sym = D_inv_sqrt * L * D_inv_sqrt;

% Asegurar que la matriz sea simétrica
L_sym = (L_sym + L_sym') / 2;

% 2. Eigendecomposición: extraer los primeros k autovectores con los menores autovalores
% Usamos 'smallestreal' para obtener los autovectores correspondientes a la parte algebraica mínima.
try
    [U, ~] = eigs(L_sym, k, 'smallestreal');
catch
    % Fallback en caso de que eigs falle por problemas de convergencia en grafos muy pequeños/dispersos
    [U, ~] = eig(full(L_sym));
    U = U(:, 1:k);
end

% 3. Normalizar las filas de U para tener longitud unitaria (matriz Y en NJW)
row_norms = sqrt(sum(U.^2, 2));
row_norms(row_norms == 0) = 1e-12;
Y = U ./ row_norms;

% 4. Agrupamiento K-Means sobre las filas de Y
% Usamos nuestra implementación customizada para asegurar portabilidad e independencia de Toolboxes.
labels = custom_kmeans(Y, k);
end

function labels = custom_kmeans(X, k)
% CUSTOM_KMEANS Algoritmo K-means robusto y autocontenido para MATLAB.
%
% INPUT:
%   X      - Matriz de datos [N x D]
%   k      - Número de clústeres
%
% OUTPUT:
%   labels - Etiquetas de clúster [N x 1] de 1 a k.

[N, D] = size(X);
max_iters = 100;

% Inicialización de centroides determinista (basada en el generador de números aleatorios con semilla fija)
rng(42, 'twister');
idx = randperm(N, k);
centroids = X(idx, :);

labels = zeros(N, 1);

for iter = 1:max_iters
    old_labels = labels;
    
    % Calcular distancias euclidianas cuadradas de cada punto a todos los centroides
    dists = zeros(N, k);
    for j = 1:k
        % dists(:, j) = suma de diferencias cuadradas
        dists(:, j) = sum((X - centroids(j, :)).^2, 2);
    end
    
    % Asignar cada punto al centroide más cercano
    [~, labels] = min(dists, [], 2);
    
    % Si no hay cambios en las etiquetas, el algoritmo ha convergido
    if isequal(labels, old_labels)
        break;
    end
    
    % Actualizar centroides como el promedio de los puntos asignados
    for j = 1:k
        nodes_in_cluster = (labels == j);
        if any(nodes_in_cluster)
            centroids(j, :) = mean(X(nodes_in_cluster, :), 1);
        else
            % Si un clúster queda vacío, re-inicializar el centroide en un punto aleatorio
            centroids(j, :) = X(randi(N), :);
        end
    end
end
end
