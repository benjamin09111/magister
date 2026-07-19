function conflict = compute_conflict_demand_window_mg(flows, ell)
% COMPUTE_CONFLICT_DEMAND_WINDOW_MG Calcula la componente de transmission conflicts
% para una ventana ell, aplicando la regla de reuso de slots a 3 saltos.
%
% INPUT:
%   flows - Struct de flujos que contiene los caminos (.paths), periodos (.T),
%           número de flujos (.n) y modo de conteo (.conflict_pair_mode)
%   ell   - Tamaño de la ventana de evaluación (slots)
%
% OUTPUT:
%   conflict - Demanda de conflictos calculada en la ventana ell

paths = flows.paths;
T = flows.T(:);
n = flows.n;

% Matriz de overlaps Delta_ij basada en enlaces con reuso a 3 saltos
Delta = compute_pairwise_overlap_matrix_3hop(paths);

conflict = 0;

pair_mode = 'unique';
if isfield(flows, 'conflict_pair_mode')
    pair_mode = flows.conflict_pair_mode;
end

if strcmp(pair_mode, 'paper_double')
    % Modo de conteo doble del paper (i ~= j)
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
    % Modo de conteo único de pares (i < j)
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
