function [dbf_total, jobs] = compute_edf_dbf_window(flows, ell)
% Calcula la demand bound function EDF clásica en una ventana ell.
%
% dbf_i(ell) = max(0, floor((ell - D_i - phi_i)/T_i) + 1) * C_i
% Si phi_i no existe, se asume 0.
%
% Retorna:
% - dbf_total: suma de demanda de transmisión
% - jobs: número de jobs considerados por flujo

n = flows.n;
C = flows.C(:);
D = flows.D(:);
T = flows.T(:);
if isfield(flows, 'phi')
    phi = flows.phi(:);
else
    phi = zeros(n, 1);
end

jobs = zeros(n, 1);
dbf_total = 0;

for i = 1:n
    if ell >= D(i)
        jobs(i) = max(0, floor((ell - D(i) - phi(i)) / T(i)) + 1);
    else
        jobs(i) = 0;
    end

    dbf_total = dbf_total + jobs(i) * C(i);
end
end
