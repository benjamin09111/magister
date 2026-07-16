function contention = compute_contention_demand_window(flows, m, ell)
% Calcula la componente de channel contention en ventana ell.
%
% Usamos DBF EDF clásica y la normalizamos por los m canales:
% contention = dbf_total / m
%
% Esto reemplaza el enfoque anterior total_demand/m solo en H.

dbf_total = compute_edf_dbf_window(flows, ell);
contention = dbf_total / m;
end