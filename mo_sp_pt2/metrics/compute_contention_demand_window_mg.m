function contention = compute_contention_demand_window_mg(flows, m, ell)
% COMPUTE_CONTENTION_DEMAND_WINDOW_MG Calcula la componente de channel contention
% en una ventana ell.
%
% Usamos DBF EDF clásica y la normalizamos por los m canales:
% contention = dbf_total / m

dbf_total = compute_edf_dbf_window(flows, ell);
contention = dbf_total / m;
end
