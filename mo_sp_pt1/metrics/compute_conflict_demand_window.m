function conflict = compute_conflict_demand_window(flows, gateway, ell)
% Calcula la componente de transmission conflicts para una ventana ell.
%
% Siguiendo la estructura del paper:
% sum_{i,j} Delta_ij * max(ceil(ell/T_i), ceil(ell/T_j))
%
% Por defecto usamos pares unicos i<j para evitar doble conteo simetrico.

paths = flows.paths;
T = flows.T(:);
n = flows.n;

Delta = compute_pairwise_overlap_matrix(paths, gateway);

conflict = 0;

pair_mode = 'unique';
if isfield(flows, 'conflict_pair_mode')
    pair_mode = flows.conflict_pair_mode;
end

if strcmp(pair_mode, 'paper_double')
    for i = 1:n
        for j = 1:n
            if i ~= j && Delta(i,j) > 0
                activ_i = ceil(ell / T(i));
                activ_j = ceil(ell / T(j));
                conflict = conflict + Delta(i,j) * max(activ_i, activ_j);
            end
        end
    end
else
    for i = 1:n
        for j = i+1:n
            if Delta(i,j) > 0
                activ_i = ceil(ell / T(i));
                activ_j = ceil(ell / T(j));

                conflict = conflict + Delta(i,j) * max(activ_i, activ_j);
            end
        end
    end
end
end
