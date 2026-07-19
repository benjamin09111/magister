function gateway = select_gateway_by_betweenness(G)
% Gateway = nodo con máxima betweenness centrality
gateway = select_gateway(G, 'betweenness');
end
