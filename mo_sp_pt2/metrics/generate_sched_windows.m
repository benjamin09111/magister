function windows = generate_sched_windows(flows, H)
% Genera ventanas críticas EDF hasta el hyperperiod H.
% Usamos instantes de deadlines: k*T_i + D_i + phi_i <= H.
% Si phi_i no existe, se asume 0.
%
% Esto es más fiel que evaluar solo H, porque EDF/DBF analiza
% demanda acumulada en ventanas temporales críticas.

windows = [];

for i = 1:flows.n
    T_i = flows.T(i);
    D_i = flows.D(i);
    if isfield(flows, 'phi')
        phi_i = flows.phi(i);
    else
        phi_i = 0;
    end

    k = 0;
    while k * T_i + D_i + phi_i <= H
        windows(end+1) = k * T_i + D_i + phi_i; %#ok<AGROW>
        k = k + 1;
    end
end

windows = unique(windows);
windows = windows(windows > 0 & windows <= H);

if isempty(windows)
    windows = H;
end
end
