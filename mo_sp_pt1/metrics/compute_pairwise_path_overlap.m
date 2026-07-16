function ov = compute_pairwise_path_overlap(path_a, path_b, gateway)
% Overlap por nodos compartidos excluyendo el gateway

if isempty(path_a) || isempty(path_b)
    ov = 0;
    return;
end

a = path_a(path_a ~= gateway);
b = path_b(path_b ~= gateway);

ov = length(intersect(a, b));
end