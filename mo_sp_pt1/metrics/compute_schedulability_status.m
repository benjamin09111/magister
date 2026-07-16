function [is_schedulable, details] = compute_schedulability_status(flows, gateway, m, H)
% Test EDF de ventana única (l = H) según el setup experimental del paper.
%
% Evalúa la condición física de programabilidad en l = H:
%   contention(H) + conflict(H) <= H
%
% Donde:
% - contention(H) es la demanda de contención normalizada por m canales en H.
% - conflict(H) es la demanda por conflictos en H.

contention = compute_contention_demand_window(flows, m, H);
conflict = compute_conflict_demand_window(flows, gateway, H);
total_demand = contention + conflict;

is_schedulable = (total_demand <= H);

details = struct();
details.windows = H;
details.contention = contention;
details.conflict = conflict;
details.total_demand = total_demand;
details.slack = H - total_demand;
details.worst_window = H;
details.worst_slack = H - total_demand;
if ~is_schedulable
    details.failing_window = H;
else
    details.failing_window = [];
end
end
