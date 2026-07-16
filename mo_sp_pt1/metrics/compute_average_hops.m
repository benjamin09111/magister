function avg_hops = compute_average_hops(paths)
% Longitud media de rutas en hops
% hops = número de aristas = nodos_en_ruta - 1

n = length(paths);
hop_counts = zeros(n, 1);

for i = 1:n
    hop_counts(i) = length(paths{i}) - 1;
end

avg_hops = mean(hop_counts);
end