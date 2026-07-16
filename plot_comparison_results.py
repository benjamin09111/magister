"""
plot_comparison_results.py
==========================
Lee results_psi_comparison.mat y genera una figura comparativa de alta
calidad (calidad de paper/publicacion) mostrando la reduccion de superposiciones.

Grafica:
  - Fila 1: Overlaps vs n para lambda=4, 8, 12 (sombreando la diferencia y anotando la mejora en %)
  - Fila 2: Hops vs n para lambda=4, 8, 12

Uso:
  python plot_comparison_results.py
"""

import os
import numpy as np
import scipy.io
import matplotlib.pyplot as plt

# ─────────────────────────────────────────────────────────────────────────────
# 1. CARGA DE DATOS
# ─────────────────────────────────────────────────────────────────────────────
MAT_FILE = "results_psi_comparison.mat"
OUT_DIR  = "figures_phi"
os.makedirs(OUT_DIR, exist_ok=True)

if not os.path.exists(MAT_FILE):
    # Si no existe todavia, imprimimos instrucciones. El usuario debe correr el .m primero.
    print(f"Nota: No se encontro {MAT_FILE}. Asegurate de correr main_mo_psi_comparison.m en MATLAB primero.")
    exit(0)

# Cargar .mat
data = scipy.io.loadmat(MAT_FILE)
n_range = data['N_RANGE'].flatten()
lambdas = data['LAMBDAS'].flatten()
psi_optimal = float(data['PSI_OPTIMAL'][0, 0])
psi_paper = float(data['PSI_PAPER'][0, 0])

res_opt = data['res_optimal'][0, 0]
res_pap = data['res_paper'][0, 0]

# Extraer datos de rendimiento [N_LAMBDA x N_RANGE]
omg_opt = res_opt['mean_overlaps_alt']
omg_pap = res_pap['mean_overlaps_alt']
hops_opt = res_opt['mean_hops_alt']
hops_pap = res_pap['mean_hops_alt']

# Configurar estilo visual para publicacion
plt.rcParams.update({
    "font.family":      "serif",
    "font.size":        10,
    "axes.titlesize":   11,
    "axes.labelsize":   10,
    "legend.fontsize":  8.5,
    "xtick.labelsize":  8.5,
    "ytick.labelsize":  8.5,
    "axes.grid":        True,
    "grid.linestyle":   "--",
    "grid.alpha":       0.45,
    "figure.dpi":       150,
})

# ─────────────────────────────────────────────────────────────────────────────
# 2. GENERACION DEL GRAFICO
# ─────────────────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(2, 3, figsize=(13, 7.5), sharex=True, gridspec_kw={'hspace': 0.1, 'wspace': 0.26})

COLOR_OPT   = "#2ca02c"  # Verde elegante
COLOR_PAPER = "#d62728"  # Rojo de referencia

col_titles = [r"$\lambda = 4$  (sparse)", r"$\lambda = 8$  (medium)", r"$\lambda = 12$  (dense)"]

for li in range(len(lambdas)):
    ax_omg = axes[0, li]
    ax_hop = axes[1, li]
    
    y_opt = omg_opt[li, :]
    y_pap = omg_pap[li, :]
    
    h_opt = hops_opt[li, :]
    h_pap = hops_pap[li, :]
    
    # ── Fila 1: Overlaps ──
    ax_omg.plot(n_range, y_pap, "--o", color=COLOR_PAPER, linewidth=1.6, 
                markerfacecolor="white", markeredgewidth=1.5, markersize=5,
                label=r"Original Paper ($\psi_{\mathrm{auto}} = %.4f$)" % psi_paper)
    
    ax_omg.plot(n_range, y_opt, "-s", color=COLOR_OPT, linewidth=2.2, 
                markerfacecolor=COLOR_OPT, markersize=5.5,
                label=r"Bayesian Optimal ($\psi^* = %.5f$)" % psi_optimal)
    
    # Sombreado de la region de mejora (diferencia)
    ax_omg.fill_between(n_range, y_opt, y_pap, where=(y_pap > y_opt),
                        color=COLOR_OPT, alpha=0.15, interpolate=True)
    
    # Calcular y anotar la reduccion en n=22 (maxima congestion)
    red_22 = (y_pap[-1] - y_opt[-1]) / max(y_pap[-1], 1e-9) * 100
    
    # Solo mostrar la anotacion si hay una reduccion significativa
    if red_22 > 1.0:
        # Dibujar flecha anotativa
        ax_omg.annotate(
            f"$-{red_22:.1f}\\%$",
            xy=(n_range[-1], (y_opt[-1] + y_pap[-1]) / 2.0),
            xytext=(-35, 10), textcoords="offset points",
            fontsize=9, color=COLOR_OPT, fontweight="bold",
            arrowprops=dict(arrowstyle="->", color=COLOR_OPT, lw=1.2),
            bbox=dict(boxstyle="round,pad=0.2", fc="white", ec=COLOR_OPT, lw=0.8)
        )
        
    ax_omg.set_title(col_titles[li], fontsize=10, pad=6)
    ax_omg.set_ylim(bottom=0)
    ax_omg.grid(True, linestyle="--", alpha=0.4)
    
    # ── Fila 2: Hops ──
    ax_hop.plot(n_range, h_pap, "--o", color=COLOR_PAPER, linewidth=1.6, 
                markerfacecolor="white", markeredgewidth=1.5, markersize=5)
    
    ax_hop.plot(n_range, h_opt, "-s", color=COLOR_OPT, linewidth=2.2, 
                markerfacecolor=COLOR_OPT, markersize=5.5)
    
    ax_hop.set_xlabel(r"Number of flows $n$", fontsize=9)
    ax_hop.set_ylim(bottom=0)
    ax_hop.grid(True, linestyle="--", alpha=0.4)
    
    # Configurar marcas de eje X
    ax_hop.set_xticks(n_range[::2])

# Titulos de las filas en el eje Y del primer panel
axes[0, 0].set_ylabel(r"Average Total Overlaps $\bar{\Omega}$", fontsize=9.5)
axes[1, 0].set_ylabel(r"Average Hops per Route", fontsize=9.5)

# Agregar leyenda centralizada en la parte superior
axes[0, 1].legend(loc="upper left", framealpha=0.92, edgecolor="#BBBBBB")

# Titulo global
fig.suptitle(
    r"Performance Comparison: MO with Bayesian-Optimal $\psi^*$ vs. Paper Reference $\psi_{\mathrm{auto}}$"
    "\n"
    r"Shaded area indicates the reduction in scheduling conflicts (overlaps). No trade-off penalty on hops.",
    fontsize=11, y=0.99
)

# Guardar figura
out_fig_path = os.path.join(OUT_DIR, "fig_psi_comparison_overlaps_hops.png")
plt.savefig(out_fig_path, dpi=300, bbox_inches="tight")
plt.close()

print(f"\n[Python] Figura de comparacion generada con exito en: {out_fig_path}")
print("Muestra la reduccion de overlaps con sombreado y marcas de porcentaje de mejora.")
