function idx = roulette_wheel_selection(probs)
% Selección aleatoria proporcional

r = rand();
c = cumsum(probs);
idx = find(r <= c, 1, 'first');

if isempty(idx)
    idx = length(probs);
end
end