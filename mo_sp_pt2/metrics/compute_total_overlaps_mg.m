function omega = compute_total_overlaps_mg(paths, gateways)
% COMPUTE_TOTAL_OVERLAPS_MG Calcula Omega = suma total de overlaps por nodo intermedio 
% entre todos los pares de rutas, excluyendo el conjunto de todos los gateways.
%
% INPUT:
%   paths    - Cell array [n x 1] con las rutas
%   gateways - Vector de IDs de todos los gateways en la red
%
% OUTPUT:
%   omega    - Suma total de overlaps por nodo intermedio

omega = 0;
n = length(paths);

for i = 1:n
    for j = i+1:n
        pi = paths{i};
        pj = paths{j};
        
        if isempty(pi) || isempty(pj)
            continue;
        end
        
        % Excluir todos los gateways de ambas rutas
        pi_no_gws = setdiff(pi, gateways);
        pj_no_gws = setdiff(pj, gateways);
        
        % Calcular intersección de nodos intermedios
        shared = intersect(pi_no_gws, pj_no_gws);
        omega = omega + length(shared);
    end
end
end
