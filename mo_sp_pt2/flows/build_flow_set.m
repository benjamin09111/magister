function flows = build_flow_set(paths, cfg, T)
% Construye flujos F = {C_i, D_i, T_i, phi_i}

n = length(paths);

C = compute_route_costs(paths, cfg);

if nargin < 3 || isempty(T)
    T = generate_periods_harmonic(n, cfg);
end

if cfg.use_implicit_deadlines
    D = T;
else
    D = T;
end

flows = struct();
flows.n = n;
flows.C = C(:);
flows.T = T(:);
flows.D = D(:);
flows.phi = zeros(n, 1);
flows.paths = paths(:);
flows.H = cfg.H;
flows.w = cfg.w;
if isfield(cfg, 'conflict_pair_mode')
    flows.conflict_pair_mode = cfg.conflict_pair_mode;
else
    flows.conflict_pair_mode = 'unique';
end
end
