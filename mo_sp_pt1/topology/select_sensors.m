function sensors = select_sensors(G, gateway, n)
% Selecciona n sensores excluyendo gateway y sus vecinos directos.
% En la referencia, esos vecinos se interpretan como APs; los sensores
% deben ser field devices, no nodos adyacentes al gateway.

N = numnodes(G);
all_nodes = 1:N;
potential = setdiff(all_nodes, gateway);

idx = randperm(numel(potential), n);
sensors = potential(idx);
end
