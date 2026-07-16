function best_paths = run_moaco_routing(G, sensors, gateway, cfg, mo_paths_in)
% run_moaco_routing  MO + ACO routing (uses MO paths as base candidates for ACO).
%
% If mo_paths_in is provided (pre-computed externally), skips SP+MO computation
% and uses those paths directly as ACO candidates. This avoids double MO execution
% when called from run_single_trial_vs_mo.

% 1) Get MO base paths (either reuse external or compute fresh)
if nargin >= 5 && ~isempty(mo_paths_in)
    % Reuse pre-computed MO paths — no extra SP or MO execution needed
    mo_paths = mo_paths_in;
else
    % Calculate psi (density) from G
    N = numnodes(G);
    avg_degree = 2 * numedges(G) / N;
    psi = avg_degree / N;

    % Generate initial SP paths, then run MO
    sp_paths = run_shortest_path_routing(G, sensors, gateway);

    if isfield(cfg, 'k_max')
        k_max = cfg.k_max;
    else
        k_max = 100;
    end
    mo_paths = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, k_max);
end

% 2) Ensure ACO parameters are defined in cfg
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
if ~isfield(cfg, 'aco_report_best_of_mo_and_aco'), cfg.aco_report_best_of_mo_and_aco = true; end

% 3) Run the ACO optimization starting from MO paths
best_paths = run_mo_aco_routing(G, mo_paths, sensors, gateway, cfg);
end
