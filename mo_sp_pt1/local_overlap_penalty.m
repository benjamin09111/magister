function penalty = local_overlap_penalty(node, partial_paths)
% Penaliza visitar nodos ya usados por otras rutas parciales

penalty = 0;

for i = 1:length(partial_paths)
    p = partial_paths{i};
    if isempty(p)
        continue;
    end
    if any(p == node)
        penalty = penalty + 1;
    end
end
end