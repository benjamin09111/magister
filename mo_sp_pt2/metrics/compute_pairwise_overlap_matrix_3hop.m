function Delta = compute_pairwise_overlap_matrix_3hop(paths)
% COMPUTE_PAIRWISE_OVERLAP_MATRIX_3HOP Calcula la matriz Delta de overlaps por
% pares de rutas, aplicando la regla de reuso de slots a 3 saltos.
%
% INPUT:
%   paths - Cell array [n x 1] con la secuencia de nodos para cada ruta.
%
% OUTPUT:
%   Delta - Matriz simétrica [n x n] donde Delta(i,j) es el factor de
%           solapamiento de aristas con reuso a 3 saltos.

n = length(paths);
Delta = zeros(n, n);

for i = 1:n
    for j = i+1:n
        val = compute_path_overlaps_factor_3hop(paths{i}, paths{j});
        Delta(i, j) = val;
        Delta(j, i) = val;
    end
end
end
