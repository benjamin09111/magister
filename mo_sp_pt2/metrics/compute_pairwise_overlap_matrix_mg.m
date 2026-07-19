function Delta = compute_pairwise_overlap_matrix_mg(paths, gateways)
% COMPUTE_PAIRWISE_OVERLAP_MATRIX_MG Calcula la matriz Delta de overlaps por
% pares de rutas, excluyendo el conjunto completo de todos los gateways.
%
% INPUT:
%   paths    - Cell array [n x 1] con la secuencia de nodos para cada ruta.
%   gateways - Vector con los IDs de todos los gateways designados.
%
% OUTPUT:
%   Delta    - Matriz simétrica [n x n] de solapamiento de nodos intermedios.

n = length(paths);
Delta = zeros(n, n);

for i = 1:n
    for j = i+1:n
        pi = paths{i};
        pj = paths{j};
        
        if isempty(pi) || isempty(pj)
            ov = 0;
        else
            % Excluir todos los gateways de ambas rutas
            pi_no_gws = setdiff(pi, gateways);
            pj_no_gws = setdiff(pj, gateways);
            ov = length(intersect(pi_no_gws, pj_no_gws));
        end
        
        Delta(i, j) = ov;
        Delta(j, i) = ov;
    end
end
end
