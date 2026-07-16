function best_paths = run_mo_fixed_psi_routing(G, sensors, gateway, cfg, psi_fixed)
% run_mo_fixed_psi_routing  MO con un valor de psi (densidad de penalización) fijo externo.
%
% Este wrapper permite ejecutar el algoritmo Minimal Overlaps (MO) con un
% valor de psi arbitrario especificado por el usuario, desacoplando la
% penalización de la densidad topológica automática del grafo.
%
% Es el bloque fundamental del análisis de sensibilidad paramétrica:
% al variar psi_fixed sobre un rango controlado, se pueden identificar
% las versiones "best-MO" y "worst-MO" del algoritmo.
%
% USAGE:
%   fn = @(G, s, gw, cfg) run_mo_fixed_psi_routing(G, s, gw, cfg, psi_val);
%   results = run_experiment_suite_vs_mo(cfg, fn, 'MO(psi=X)');
%
% INPUT:
%   G          - grafo de la topología (MATLAB graph object)
%   sensors    - vector de IDs de nodos sensor
%   gateway    - ID del nodo gateway
%   cfg        - struct de configuración (debe incluir cfg.k_max)
%   psi_fixed  - valor de psi a usar como factor de penalización por
%                solapamiento. Reemplaza al psi automático (avg_degree/N).
%
% OUTPUT:
%   best_paths - cell array con la mejor ruta para cada sensor

% --- Verificar que psi_fixed sea válido ------------------------------------
if nargin < 5 || isempty(psi_fixed) || ~isnumeric(psi_fixed) || psi_fixed < 0
    error('run_mo_fixed_psi_routing: psi_fixed debe ser un escalar numeric >= 0.');
end

% --- Rutas iniciales (Dijkstra sin pesos, igual que MO estándar) -----------
sp_paths = run_shortest_path_routing(G, sensors, gateway);

% --- Extraer k_max desde cfg (parámetro de convergencia) -------------------
if isfield(cfg, 'k_max')
    k_max = cfg.k_max;
else
    k_max = 100;   % valor por defecto del paper NG-RES 2021
end

% --- Invocar MO con el psi fijo externo ------------------------------------
% NOTA: run_minimal_overlap_routing acepta psi como 5º argumento.
% No se modifica esa función; aquí simplemente inyectamos un psi
% controlado en lugar del psi topológico automático.
[best_paths, ~] = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi_fixed, k_max);

end
