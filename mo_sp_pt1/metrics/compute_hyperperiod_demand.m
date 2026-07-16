function total_demand = compute_hyperperiod_demand(flows, H)
% Calcula la demanda total de transmisión en el hyperperiod H
%
% total_demand = sum_i C_i * ceil(H / T_i)

C = flows.C(:);
T = flows.T(:);
n = flows.n;

total_demand = 0;

for i = 1:n
    num_jobs_i = ceil(H / T(i));
    total_demand = total_demand + C(i) * num_jobs_i;
end
end