function best_paths = run_moaco_as_standalone_routing(G, sensors, gateway, cfg)
% run_moaco_as_standalone_routing  Runs ACO routing starting from SP routes as candidates, without MO fallback.
%
% This function runs the ACO algorithm directly using SP paths as the initial baseline,
% and reports the best paths discovered by the ACO colony.

% 1) Generate initial SP paths
sp_paths = run_shortest_path_routing(G, sensors, gateway);

% 2) Ensure all ACO parameters are defined in cfg.
% If not present, populate with standard defaults from config_mo_aco.m
if ~isfield(cfg, 'aco_num_ants'),            cfg.aco_num_ants = 20; end
if ~isfield(cfg, 'aco_num_iterations'),      cfg.aco_num_iterations = 35; end
if ~isfield(cfg, 'aco_alpha'),               cfg.aco_alpha = 1.0; end
if ~isfield(cfg, 'aco_beta'),                cfg.aco_beta = 2.5; end
if ~isfield(cfg, 'aco_rho'),                 cfg.aco_rho = 0.10; end
if ~isfield(cfg, 'aco_Q'),                   cfg.aco_Q = 2.0; end
if ~isfield(cfg, 'aco_top_k_deposit'),       cfg.aco_top_k_deposit = 4; end
if ~isfield(cfg, 'aco_random_choice_prob'),  cfg.aco_random_choice_prob = 0.10; end

% Candidate generation params
if ~isfield(cfg, 'num_candidates_per_flow'), cfg.num_candidates_per_flow = 8; end
if ~isfield(cfg, 'max_candidate_attempts'),  cfg.max_candidate_attempts = 40; end
if ~isfield(cfg, 'candidate_global_edge_penalty'), cfg.candidate_global_edge_penalty = 12.0; end
if ~isfield(cfg, 'candidate_global_node_penalty'), cfg.candidate_global_node_penalty = 6.0; end
if ~isfield(cfg, 'candidate_own_mo_edge_penalty'), cfg.candidate_own_mo_edge_penalty = 20.0; end
if ~isfield(cfg, 'candidate_own_mo_node_penalty'), cfg.candidate_own_mo_node_penalty = 10.0; end
if ~isfield(cfg, 'candidate_random_weight_scale'), cfg.candidate_random_weight_scale = 6.0; end
if ~isfield(cfg, 'aco_partial_overlap_penalty'), cfg.aco_partial_overlap_penalty = 25.0; end
if ~isfield(cfg, 'aco_hops_penalty'),        cfg.aco_hops_penalty = 0.001; end

% Force reporting the pure ACO paths, not fallback to baseline
cfg.aco_report_best_of_mo_and_aco = false;

% 3) Run the ACO algorithm
best_paths = run_mo_aco_routing(G, sp_paths, sensors, gateway, cfg);
end
