function edges = path_to_edges(path)
% Convierte ruta a lista de aristas no dirigidas ordenadas [u v]

n_nodes = length(path);

if n_nodes < 2
    edges = [];
    return;
end

edges = zeros(n_nodes - 1, 2);
for i = 1:n_nodes - 1
    edges(i, :) = sort([path(i), path(i+1)]);
end
end