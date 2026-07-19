function T = generate_periods_harmonic(n, cfg)
% Genera n periodos armónicos de la forma 2^eta
% con eta en [cfg.eta_min, cfg.eta_max]
%
% Según el paper:
% eta ∈ [4,7] => T ∈ {16, 32, 64, 128}

possible_periods = cfg.period_values;
idx = randi(length(possible_periods), n, 1);
T = possible_periods(idx);
end