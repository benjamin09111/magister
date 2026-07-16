function G = generate_random_topology(N, Lambda)
% Genera topología aleatoria conectada usando la misma idea del dataset NG-RES.
% Lambda llega como densidad (lambda / N).

% 1. TOPOLOGÍA: grafo disperso uniforme
A = sprand(N, N, Lambda);
A = spones(A);
A = triu(A, 1);
A = A + A';
G = graph(A);

% 2. CONECTIVIDAD FORZADA
bins = conncomp(G);
while max(bins) > 1
    comp_ids = unique(bins);
    main_comp_nodes = find(bins == comp_ids(1));

    for c = 2:length(comp_ids)
        disconnected_nodes = find(bins == comp_ids(c));

        u = main_comp_nodes(randi(numel(main_comp_nodes)));
        v = disconnected_nodes(randi(numel(disconnected_nodes)));

        G = addedge(G, u, v, 1);
    end

    bins = conncomp(G);
end
end
