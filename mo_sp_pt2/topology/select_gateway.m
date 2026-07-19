function gateway = select_gateway(G, method)
% Selecciona gateway segun una metrica de centralidad.
% Metodos soportados: betweenness, degree, eigenvector, closeness.

if nargin < 2 || isempty(method)
    method = 'betweenness';
end

method = lower(char(method));

switch method
    case 'betweenness'
        scores = centrality(G, 'betweenness');

    case 'degree'
        scores = centrality(G, 'degree');

    case 'eigenvector'
        scores = centrality(G, 'eigenvector');

    case 'closeness'
        scores = centrality(G, 'closeness');

    otherwise
        error('Metodo de gateway no soportado: %s', method);
end

scores(~isfinite(scores)) = -inf;
max_score = max(scores);
gateway   = find(scores == max_score, 1, 'first');
end
