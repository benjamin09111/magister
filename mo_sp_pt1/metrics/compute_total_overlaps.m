function omega = compute_total_overlaps(paths, gateway)
% Calcula Omega = suma de overlaps por nodos entre pares de rutas
% Excluye el gateway por valor, consistente con Delta_ij y la referencia

omega = 0;

for i = 1:length(paths)
    for j = i+1:length(paths)
        shared = intersect(paths{i}(paths{i} ~= gateway), paths{j}(paths{j} ~= gateway));
        omega = omega + length(shared);
    end
end
end
