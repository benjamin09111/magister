function [is_schedulable, details] = compute_schedulability_status_mg(flows, m, H)
% COMPUTE_SCHEDULABILITY_STATUS_MG Evalúa la condición física de programabilidad
% en todo el hyperperiodo H:
%   contention(l) + conflict(l) <= l  para todo l in [1, H]
%
% INPUT:
%   flows          - Struct de flujos de tráfico
%   m              - Número de canales activos
%   H              - Longitud del hiperperiodo (slots)
%
% OUTPUT:
%   is_schedulable - Boolean (true si el conjunto de flujos es programable)
%   details        - Struct con información de la demanda y holgura por ventana

is_schedulable = true;
details = struct();
details.windows = (1:H)';
details.contention = zeros(H, 1);
details.conflict = zeros(H, 1);
details.total_demand = zeros(H, 1);
details.slack = zeros(H, 1);

worst_slack = Inf;
worst_window = [];
failing_window = [];

for ell = 1:H
    % Calcular demanda de contención y conflictos para la ventana ell
    contention = compute_contention_demand_window_mg(flows, m, ell);
    conflict = compute_conflict_demand_window_mg(flows, ell);
    total_demand = contention + conflict;
    
    slack = ell - total_demand;
    
    % Almacenar detalles
    details.contention(ell) = contention;
    details.conflict(ell) = conflict;
    details.total_demand(ell) = total_demand;
    details.slack(ell) = slack;
    
    % Encontrar el peor caso de holgura
    if slack < worst_slack
        worst_slack = slack;
        worst_window = ell;
    end
    
    % Si no se cumple la condición, el conjunto de flujos no es programable
    if total_demand > ell
        is_schedulable = false;
        if isempty(failing_window)
            failing_window = ell;
        end
    end
end

details.worst_window = worst_window;
details.worst_slack = worst_slack;
details.failing_window = failing_window;
end
