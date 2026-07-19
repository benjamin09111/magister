"""
plot_multigateway_results.py
============================
Lee results_multigateway.mat y genera las 6 figuras científicas (a a f) 
según las especificaciones del paper de multi-gateway adaptadas a nuestra baseline.

Gráficos Generados:
  - plot_a_schedulability.png: Éxito de Schedulability vs n para k=1, 3, 5 (Degree vs Random)
  - plot_b_network_demand.png: Perfil de demanda de red vs l (ms) para n=14, k=3 (SBF vs Random vs Degree)
  - plot_c_network_map.png: Mapa de la red en 2D con clustering espectral NJW y gateways locales
  - plot_d_deviation_k1.png: Desviación de centralidades vs Degree para k=1
  - plot_e_deviation_k3.png: Desviación de centralidades vs Degree para k=3
  - plot_f_deviation_k5.png: Desviación de centralidades vs Degree para k=5

Uso:
  python plot_multigateway_results.py
"""

import os
import numpy as np
import scipy.io
import matplotlib.pyplot as plt
import networkx as nx

# ─────────────────────────────────────────────────────────────────────────────
# 1. CONFIGURACIÓN Y CARGA DE DATOS
# ─────────────────────────────────────────────────────────────────────────────
MAT_FILE = "results_multigateway.mat"
OUT_DIR  = "figures_phi"
os.makedirs(OUT_DIR, exist_ok=True)

if not os.path.exists(MAT_FILE):
    print(f"Nota: No se encontró {MAT_FILE}. Asegúrate de correr main_multigateway.m en MATLAB primero.")
    exit(0)

# Cargar datos .mat
data = scipy.io.loadmat(MAT_FILE)
results = data['results'][0, 0]
cfg = data['cfg'][0, 0]

# Extraer parámetros básicos
ks = results['ks'].flatten()
methods = [m.strip() for m in results['gateway_methods']]
lambdas = results['lambdas'].flatten()
n_range = results['n_range'].flatten()
m_channels = int(results['m_fixed'][0, 0])

# Matrices de resultados [num_ks x num_methods x num_lambdas x num_n]
# Usamos el ruteo MO (Minimal Overlaps) que es nuestra baseline optimizada
sched_mo = results['sched_ratio_mo']
overlaps_mo = results['mean_overlaps_mo']
hops_mo = results['mean_hops_mo']

# Encontrar índices de métodos
deg_idx = methods.index('degree')
rand_idx = methods.index('random')
bc_idx = methods.index('betweenness')
cc_idx = methods.index('closeness')
ec_idx = methods.index('eigenvector')

# Configurar estilo global para calidad de publicación (IEEE/LaTeX)
plt.rcParams.update({
    "font.family":      "serif",           # Fuente con serifas (estilo LaTeX/IEEE)
    "font.size":        10,                # Tamaño base del texto
    "axes.titlesize":   11,                # Título de subplots
    "axes.labelsize":   10,                # Etiquetas de ejes
    "legend.fontsize":  8.5,               # Leyendas
    "xtick.labelsize":  8.5,               # Marcas de ejes
    "ytick.labelsize":  8.5,               # Marcas de ejes
    "axes.grid":        True,              # Mostrar cuadrícula por defecto
    "grid.linestyle":   "--",              # Cuadrícula segmentada suave
    "grid.alpha":       0.45,              # Transparencia de cuadrícula
    "figure.dpi":       150,               # Calidad de renderizado en pantalla
})

COLOR_OPT   = "#2ca02c"  # Verde para optimizaciones/centralidades
COLOR_RAND  = "#d62728"  # Rojo para referencia/random
COLOR_BLUE  = "#1f77b4"  # Azul para general/curvas intermedias

# ─────────────────────────────────────────────────────────────────────────────
# 📊 GRÁFICO (a): Éxito de Programación (Schedulability Ratio)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Gráfico (a)...")
fig_a, ax_a = plt.subplots(figsize=(7, 5))

# Usamos lambda=8 (densidad media de referencia)
l_idx = 1 # lambda = 8 es el segundo elemento de [4, 8, 12]

# Colores por k para diferenciar fácilmente las curvas
colors_k = {1: COLOR_RAND, 3: COLOR_OPT, 5: COLOR_BLUE}
markers_k = {1: "o", 3: "D", 5: "s"}

for k_idx, k in enumerate(ks):
    color = colors_k[k]
    marker = markers_k[k]
    
    # Random designation (k gateways)
    y_rand = sched_mo[k_idx, rand_idx, l_idx, :]
    # Degree centrality designation (k gateways)
    y_deg = sched_mo[k_idx, deg_idx, l_idx, :]
    
    # Línea discontinua delgada para Random
    ax_a.plot(n_range, y_rand, linestyle="--", color=color, linewidth=1.2, 
              marker=marker, markerfacecolor="white", markeredgewidth=1.2, markersize=4.5,
              label=f"Random (k={k})")
    
    # Línea sólida gruesa para Degree
    ax_a.plot(n_range, y_deg, linestyle="-", color=color, linewidth=2.2, 
              marker=marker, markerfacecolor=color, markersize=5.5,
              label=f"Degree (k={k})")
    
    # Sombrear el área de mejora entre Random y Degree para cada k
    ax_a.fill_between(n_range, y_rand, y_deg, where=(y_deg > y_rand),
                      color=color, alpha=0.10, interpolate=True)

ax_a.set_xlabel(r"Number of real-time flows ($n$)", fontsize=10)
ax_a.set_ylabel("Schedulability Ratio", fontsize=10)
ax_a.set_title(r"Graph (a): Schedulability Ratio ($N=66$, $\lambda=8$, $m=8$, Ruteo MO)", fontsize=11, fontweight="bold")
ax_a.set_ylim(-0.05, 1.05)
ax_a.set_xticks(n_range)
ax_a.legend(loc="lower left", framealpha=0.95, edgecolor="#BBBBBB")

out_fig_a = os.path.join(OUT_DIR, "plot_a_schedulability.png")
plt.savefig(out_fig_a, dpi=300, bbox_inches="tight")
plt.close()
print(f"-> Guardado en: {out_fig_a}")

# ─────────────────────────────────────────────────────────────────────────────
# 📊 GRÁFICO (b): Demanda de la Red (Network Demand Profile)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Gráfico (b)...")
fig_b, ax_b = plt.subplots(figsize=(7, 5))

# Cargar datos muestra de results
sample_b = results['sample_b'][0, 0]
time_ms = sample_b['time_ms'].flatten()
demand_rand = sample_b['demand_rand_ms'].flatten()
demand_deg = sample_b['demand_deg_ms'].flatten()
sbf_ms = sample_b['sbf_ms'].flatten()

# Graficar la línea SBF (límite de capacidad) en puntos negros
ax_b.plot(time_ms, sbf_ms, "k:", linewidth=1.5, label="Supply Bound Function (SBF)")

# Random demand profile (dashed red)
ax_b.plot(time_ms, demand_rand, linestyle="--", color=COLOR_RAND, linewidth=1.6, label="Random (k=3, n=14)")

# Degree demand profile (solid green/blue)
ax_b.plot(time_ms, demand_deg, linestyle="-", color=COLOR_BLUE, linewidth=2.0, label="Degree (k=3, n=14)")

# Sombreado de la brecha de demanda
ax_b.fill_between(time_ms, demand_deg, demand_rand, where=(demand_rand > demand_deg),
                  color=COLOR_BLUE, alpha=0.15, interpolate=True)

ax_b.set_xlabel("Evaluation interval $l$ (ms)", fontsize=10)
ax_b.set_ylabel("Network Demand / SBF (ms)", fontsize=10)
ax_b.set_title(r"Graph (b): Network Demand Profile ($N=66$, $k=3$, $n=14$, $m=8$)", fontsize=11, fontweight="bold")
ax_b.grid(True, linestyle="--", alpha=0.45)
ax_b.legend(loc="upper left", framealpha=0.95, edgecolor="#BBBBBB")

out_fig_b = os.path.join(OUT_DIR, "plot_b_network_demand.png")
plt.savefig(out_fig_b, dpi=300, bbox_inches="tight")
plt.close()
print(f"-> Guardado en: {out_fig_b}")

# ─────────────────────────────────────────────────────────────────────────────
# 🕸️ DIAGRAMA (c): Mapa de la Red (Network Map & Clustering)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Gráfico (c)...")
fig_c, ax_c = plt.subplots(figsize=(8, 6.5))

sample_c = results['sample_c'][0, 0]
adj = sample_c['adjacency']
labels = sample_c['labels'].flatten() - 1 # Convertir a 0-based index
gws_deg = sample_c['gateways_deg'].flatten() - 1 # Convertir a 0-based index

# Crear grafo NetworkX a partir de la matriz de adyacencia
G_net = nx.from_numpy_array(adj)

# Obtener distribución spring layout con semilla para reproducibilidad
pos = nx.spring_layout(G_net, seed=123)

# Colores para los 3 clústeres
cluster_colors = ["#ff9999", "#99ccff", "#99ff99"]
node_colors = [cluster_colors[labels[node]] for node in G_net.nodes()]

# Dibujar enlaces del grafo
nx.draw_networkx_edges(G_net, pos, ax=ax_c, edge_color="#CCCCCC", alpha=0.6, width=0.8)

# Dibujar nodos regulares
nx.draw_networkx_nodes(G_net, pos, ax=ax_c, node_color=node_colors, node_size=130, 
                       edgecolors="black", linewidths=0.6)

# Dibujar los gateways como estrellas grandes
gw_colors = ["#cc0000", "#0000cc", "#006600"]
for cluster_id, gw_node in enumerate(gws_deg):
    ax_c.scatter(pos[gw_node][0], pos[gw_node][1], color=gw_colors[cluster_id], 
                 marker="*", s=380, edgecolors="black", linewidths=0.8,
                 label=f"Gateway {cluster_id+1} (Node {gw_node+1})", zorder=5)

ax_c.set_title("Graph (c): Network Topology Clustering & Gateways (N=66, k=3, NJW)", fontsize=11, fontweight="bold")
ax_c.axis("off")
ax_c.legend(loc="lower center", bbox_to_anchor=(0.5, -0.08), ncol=3, fontsize=9, framealpha=0.95, edgecolor="#BBBBBB")

out_fig_c = os.path.join(OUT_DIR, "plot_c_network_map.png")
plt.savefig(out_fig_c, dpi=300, bbox_inches="tight")
plt.close()
print(f"-> Guardado en: {out_fig_c}")

# ─────────────────────────────────────────────────────────────────────────────
# 📊 GRÁFICOS (d, e, f): Desviación de Schedulability para k=1, k=3 y k=5
# ─────────────────────────────────────────────────────────────────────────────
# Usamos lambda=8 (densidad media de referencia)
l_idx = 1

letters = {1: "d", 3: "e", 5: "f"}
styles_met = {
    bc_idx: {"color": COLOR_BLUE, "marker": "o", "label": "Betweenness (BC)"},
    cc_idx: {"color": COLOR_OPT, "marker": "^", "label": "Closeness (CC)"},
    ec_idx: {"color": COLOR_RAND, "marker": "s", "label": "Eigenvector (EC)"}
}

for k_idx, k in enumerate(ks):
    letter = letters[k]
    print(f"Generando Gráfico ({letter})...")
    
    fig_dev, ax_dev = plt.subplots(figsize=(6, 4.5))
    
    # Línea base cero que representa Degree Centrality (DC)
    ax_dev.axhline(0, color="black", linestyle=":", linewidth=1.2, label="Degree (DC) Reference")
    
    # Schedulability del método de referencia (Degree)
    sched_deg = sched_mo[k_idx, deg_idx, l_idx, :]
    
    for met_idx, style in styles_met.items():
        sched_val = sched_mo[k_idx, met_idx, l_idx, :]
        # Desviación aritmética del éxito de programación vs Degree
        deviation = sched_val - sched_deg
        
        ax_dev.plot(n_range, deviation, linestyle="-", color=style["color"],
                    marker=style["marker"], markerfacecolor=style["color"], markersize=5.5,
                    label=style["label"])
        
    ax_dev.set_xlabel("Number of real-time flows ($n$)", fontsize=9)
    ax_dev.set_ylabel("Schedulability Ratio Deviation vs. DC", fontsize=9)
    ax_dev.set_title(f"Graph ({letter}): Centrality Deviation with k={k} ($N=66$, $\lambda=8$)", fontsize=10, fontweight="bold")
    ax_dev.set_ylim(-0.25, 0.25)
    ax_dev.set_xticks(n_range)
    ax_dev.grid(True, linestyle="--", alpha=0.4)
    ax_dev.legend(loc="lower left", fontsize=8.5, framealpha=0.95, edgecolor="#BBBBBB")
    
    out_fig_dev = os.path.join(OUT_DIR, f"plot_{letter}_deviation_k{k}.png")
    plt.savefig(out_fig_dev, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"-> Guardado en: {out_fig_dev}")

print("\n¡Los seis gráficos de publicación se han generado exitosamente en 'figures_phi/'!")
