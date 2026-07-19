function Delta = compute_pairwise_overlap_matrix(paths, gateway)
% Calcula la matriz Delta de overlaps por pares de rutas
% Delta(i,j) = número de nodos compartidos entre path_i y path_j
% excluyendo el gateway
%
% Esta matriz modela la base de los transmission conflicts

n = length(paths);
Delta = zeros(n, n);

for i = 1:n
    for j = i+1:n
        pi = paths{i};
        pj = paths{j};

        if isempty(pi) || isempty(pj)
            ov = 0;
        else
            pi_no_gw = pi(pi ~= gateway);
            pj_no_gw = pj(pj ~= gateway);
            ov = length(intersect(pi_no_gw, pj_no_gw));
        end

        Delta(i, j) = ov;
        Delta(j, i) = ov;
    end
end
end