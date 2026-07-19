function paths = run_qlearning_routing(G, sensors, gateway, cfg)
% run_qlearning_routing  Tabular Q-learning for routing on undirected graphs.
%
% Resolves a route from each sensor to the gateway using tabular Q-learning.
%
% Parameters:
%   G       - MATLAB graph object
%   sensors - array of source node indices
%   gateway - index of the gateway node
%   cfg     - configuration struct (optional)
%
% Returns:
%   paths   - cell array of paths (one for each sensor)

n = length(sensors);
N = numnodes(G);
paths = cell(n, 1);

% Q-learning hyperparameters
alpha = 0.1;           % Learning rate
gamma = 0.9;           % Discount factor
epsilon_start = 1.0;   % Initial exploration rate
epsilon_min = 0.05;    % Minimum exploration rate
num_episodes = 600;    % Number of training episodes per sensor (increased for convergence)
max_steps = 2 * N;     % Max steps per episode to prevent infinite loops

for i = 1:n
    sensor = sensors(i);
    
    % Initialize Q-table: N x N matrix (state x action)
    % Initialize only neighbor slots to 0, others to -inf
    Q = -inf(N, N);
    for u = 1:N
        nb = neighbors(G, u);
        Q(u, nb) = 0;
    end
    
    % Training episodes
    for ep = 1:num_episodes
        % Decay epsilon
        epsilon = max(epsilon_min, epsilon_start * (1 - ep / num_episodes));
        
        s = sensor;
        step = 0;
        
        while s ~= gateway && step < max_steps
            step = step + 1;
            nb = neighbors(G, s);
            
            if isempty(nb)
                break;
            end
            
            % Choose action epsilon-greedy
            if rand() < epsilon
                % Random neighbor
                a = nb(randi(length(nb)));
            else
                % Greedy neighbor
                [~, idx] = max(Q(s, nb));
                a = nb(idx);
            end
            
            s_next = a;
            
            % Reward function
            if s_next == gateway
                R = 100;
            else
                R = -1;  % hop penalty
            end
            
            % Overlap penalty (avoid nodes already used by previous paths)
            if i > 1
                overlap_count = 0;
                for prev_i = 1:(i-1)
                    prev_path = paths{prev_i};
                    if any(prev_path(1:end-1) == s_next)
                        overlap_count = overlap_count + 1;
                    end
                end
                R = R - 20 * overlap_count;
            end
            
            % Q-update
            nb_next = neighbors(G, s_next);
            if s_next == gateway
                max_q_next = 0;  % Terminal state
            elseif isempty(nb_next)
                max_q_next = -100; % Dead end
            else
                max_q_next = max(Q(s_next, nb_next));
            end
            
            Q(s, a) = Q(s, a) + alpha * (R + gamma * max_q_next - Q(s, a));
            
            s = s_next;
        end
    end
    
    % Extract greedy path
    path = sensor;
    s = sensor;
    visited = false(N, 1);
    visited(sensor) = true;
    step = 0;
    
    while s ~= gateway && step < max_steps
        step = step + 1;
        nb = neighbors(G, s);
        if isempty(nb)
            break;
        end
        
        % Filter out visited neighbors if possible to avoid loops
        unvisited_nb = nb(~visited(nb));
        if ~isempty(unvisited_nb)
            [~, idx] = max(Q(s, unvisited_nb));
            a = unvisited_nb(idx);
        else
            % If all neighbors visited, just pick the maximum Q neighbor
            [~, idx] = max(Q(s, nb));
            a = nb(idx);
        end
        
        s = a;
        path(end+1) = s; %#ok<AGROW>
        visited(s) = true;
    end
    
    % If the path did not reach the gateway or contains a loop/fail,
    % fall back to the standard shortest path to ensure valid routing
    if path(end) ~= gateway
        path = shortestpath(G, sensor, gateway, 'Method', 'unweighted');
    end
    
    paths{i} = path;
end
end
