function contention_demand = compute_contention_demand(flows, m, H)
% Calcula una aproximación del avg. worst-case contention demand
%
% Intuición:
% - la demanda total de slots depende de C_i y del número de activaciones
% - la contención disminuye al aumentar el número de canales m
%
% Para ser mas fiel al paper, evaluamos la demanda en todas las
% ventanas criticas EDF y reportamos el peor caso.

windows = generate_sched_windows(flows, H);
contention_demand = 0;

for w_idx = 1:length(windows)
    ell = windows(w_idx);
    contention_ell = compute_contention_demand_window(flows, m, ell);
    contention_demand = max(contention_demand, contention_ell);
end
end
