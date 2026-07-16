function C = compute_route_costs(paths, cfg)
% Calcula Ci = (#hops) * w
% donde w es el número de slots por enlace
%
% Según el paper/presentación:
% Ci = zeta_i * w, con w = 2

n = length(paths);
C = zeros(n, 1);

for i = 1:n
    hops_i = length(paths{i}) - 1;
    C(i) = hops_i * cfg.w;
end
end