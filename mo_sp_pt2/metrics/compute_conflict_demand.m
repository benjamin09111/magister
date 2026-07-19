function conflict_demand = compute_conflict_demand(flows, gateway, H)
% Calcula una aproximación del worst-case conflict demand en el hyperperiod H
%
% Basado en la idea del paper:
% la componente de transmission conflicts depende de los overlaps Delta(i,j)
% y del número de activaciones de los flujos en el intervalo.
%
% Para ser mas fieles al paper, evaluamos las ventanas criticas EDF y
% reportamos el peor caso.

windows = generate_sched_windows(flows, H);
conflict_demand = 0;

for w_idx = 1:length(windows)
    ell = windows(w_idx);
    conflict_ell = compute_conflict_demand_window(flows, gateway, ell);
    conflict_demand = max(conflict_demand, conflict_ell);
end
end
