"""
plot_phi_results.py
===================
Lee resultados_phi.md y genera figuras de publicación para el
análisis de sensibilidad paramétrica de ψ (phi) en el algoritmo MO.

Figuras generadas:
  1. Overlaps vs n  — curvas por psi, panel 3×lambda  [paper figure]
  2. Overlaps vs psi — curvas por n, panel 3×lambda   [sensibilidad principal]
  3. Hops vs psi    — curvas por n, panel 3×lambda    [costo de ruta]
  4. Heatmap Ω(psi, n) — una heatmap por lambda        [mapa de calor]
  5. Reducción % vs psi — para n=14 y n=22, 3 lambdas [figura síntesis]

Uso:
  python plot_phi_results.py

Los gráficos se guardan en ./figures_phi/ (PNG, 300 dpi)
"""

import re
import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.ticker import LogLocator, NullFormatter

# ─────────────────────────────────────────────────────────────────────────────
# 1.  PARSING
# ─────────────────────────────────────────────────────────────────────────────

DATA_FILE = "resultados_phi.md"
OUT_DIR   = "figures_phi"
os.makedirs(OUT_DIR, exist_ok=True)

PSI_VALUES = [0.001, 0.0031623, 0.01, 0.031623, 0.1, 0.31623, 1.0, 3.1623, 10.0]
PSI_AUTO   = 8 / 66          # lambda=8 / N=66  ≈ 0.1212
LAMBDAS    = [4, 8, 12]
N_RANGE    = list(range(2, 23, 2))   # [2,4,...,22]
N_PSI      = len(PSI_VALUES)
N_LAM      = len(LAMBDAS)
N_N        = len(N_RANGE)

# Estructuras 3D:  data[metric][psi_idx, lam_idx, n_idx]
alt_omg  = np.full((N_PSI, N_LAM, N_N), np.nan)
mo_omg   = np.full((N_PSI, N_LAM, N_N), np.nan)
alt_hops = np.full((N_PSI, N_LAM, N_N), np.nan)
mo_hops  = np.full((N_PSI, N_LAM, N_N), np.nan)

with open(DATA_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

def find_psi_index(psi_str):
    """Mapea el string de psi del archivo al índice en PSI_VALUES."""
    psi_val = float(psi_str)
    diffs = [abs(psi_val - p) / (p + 1e-12) for p in PSI_VALUES]
    return int(np.argmin(diffs))

# ── Estado del parser ────────────────────────────────────────────────────────
current_psi_idx = None
current_lam_idx = None
in_table        = False

# Patrones
RE_PSI_LINE  = re.compile(r"\[(\d+)/9\]\s+Evaluando psi\s*=\s*([0-9.eE+\-]+)")
RE_BLOCK_HDR = re.compile(r"MO\(psi=[^)]+\) vs MO: lambda\s*=\s*(\d+)")
RE_DATA_ROW  = re.compile(
    r"^\s*(\d+)\s+"           # n
    r"([\d.]+)\s+"            # ALT_Omg
    r"([\d.]+)\s+"            # MO_Omg
    r"([\d.]+)\s+"            # ALT_Hops
    r"([\d.]+)\s+"            # MO_Hops
    r"([\d.]+)\s+"            # ALT_Conf
    r"([\d.]+)"               # MO_Conf
)

for line in lines:
    line = line.rstrip()

    m = RE_PSI_LINE.search(line)
    if m:
        current_psi_idx = find_psi_index(m.group(2))
        current_lam_idx = None
        in_table = False
        continue

    m = RE_BLOCK_HDR.search(line)
    if m:
        lam = int(m.group(1))
        current_lam_idx = LAMBDAS.index(lam)
        in_table = False
        continue

    # Cabecera de tabla: saltar
    if "ALT_Omg" in line:
        in_table = True
        continue

    # Fila de datos
    if in_table and current_psi_idx is not None and current_lam_idx is not None:
        m = RE_DATA_ROW.match(line)
        if m:
            n_val = int(m.group(1))
            if n_val in N_RANGE:
                n_idx = N_RANGE.index(n_val)
                alt_omg [current_psi_idx, current_lam_idx, n_idx] = float(m.group(2))
                mo_omg  [current_psi_idx, current_lam_idx, n_idx] = float(m.group(3))
                alt_hops[current_psi_idx, current_lam_idx, n_idx] = float(m.group(4))
                mo_hops [current_psi_idx, current_lam_idx, n_idx] = float(m.group(5))

print("Datos parseados OK.")
print(f"  PSI shape: {alt_omg.shape}  (psi, lambda, n)")
print(f"  NaN count: {np.isnan(alt_omg).sum()}")

# ─────────────────────────────────────────────────────────────────────────────
# 2.  ESTILO GLOBAL
# ─────────────────────────────────────────────────────────────────────────────

plt.rcParams.update({
    "font.family":      "serif",
    "font.size":        10,
    "axes.titlesize":   10,
    "axes.labelsize":   10,
    "legend.fontsize":  8,
    "xtick.labelsize":  8,
    "ytick.labelsize":  8,
    "axes.grid":        True,
    "grid.linestyle":   "--",
    "grid.alpha":       0.45,
    "figure.dpi":       150,
})

LAM_COLORS  = ["#1f77b4", "#ff7f0e", "#2ca02c"]
LAM_MARKERS = ["o", "s", "^"]
LAM_LABELS  = [r"$\lambda=4$", r"$\lambda=8$", r"$\lambda=12$"]

PSI_COLORS  = plt.cm.plasma(np.linspace(0.1, 0.9, N_PSI))
PSI_LABELS  = [f"$\\psi={v:.4g}$" for v in PSI_VALUES]

def psi_label_short(p):
    if p < 0.01:
        return f"{p:.3f}"
    elif p < 1:
        return f"{p:.3f}"
    else:
        return f"{p:.1f}"

def save(name):
    path = os.path.join(OUT_DIR, name)
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  -> {path}")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 1: Ω vs n — curvas por ψ, panel 1×3 lambdas
# ─────────────────────────────────────────────────────────────────────────────
print("\nGenerando Fig 1: Overlaps vs n por psi ...")

fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), sharey=False)
fig.suptitle(r"Overlaps $\Omega$ vs. number of flows $n$ — sensitivity to $\psi$",
             fontsize=11, y=1.01)

for li, (ax, lam, lc) in enumerate(zip(axes, LAMBDAS, LAM_COLORS)):
    for pi in range(N_PSI):
        curve = alt_omg[pi, li, :]
        lw = 2.0 if abs(PSI_VALUES[pi] - PSI_AUTO) < 0.05 else 1.0
        ls = "-" if pi % 2 == 0 else "--"
        ax.plot(N_RANGE, curve, ls, color=PSI_COLORS[pi],
                linewidth=lw, label=PSI_LABELS[pi], alpha=0.85)

    # Línea MO referencia (psi_auto natural)
    mo_ref = mo_omg[0, li, :]   # MO_Omg es constante en todos los psi
    ax.plot(N_RANGE, mo_ref, "k-.", linewidth=1.6,
            label=r"MO$_{\mathrm{ref}}$ ($\psi_{\mathrm{auto}}$)")

    ax.set_title(r"$\lambda = %d$" % lam)
    ax.set_xlabel(r"Number of flows $n$")
    ax.set_xlim(N_RANGE[0], N_RANGE[-1])
    ax.set_ylim(bottom=0)

axes[0].set_ylabel(r"Average total overlaps $\Omega$")

# Leyenda única en la última subgráfica
handles, labels = axes[-1].get_legend_handles_labels()
axes[-1].legend(handles, labels, fontsize=6.5, loc="upper left",
                ncol=2, framealpha=0.9)

plt.tight_layout()
save("fig1_overlaps_vs_n.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 2: Ω vs ψ — curvas por n, panel 1×3 lambdas  (figura síntesis principal)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 2: Overlaps vs psi por n …")

N_HIGHLIGHT = [6, 10, 14, 18, 22]   # subconjunto legible
n_colors = plt.cm.viridis(np.linspace(0.15, 0.85, len(N_HIGHLIGHT)))

fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), sharey=False)
fig.suptitle(r"Overlaps $\Omega$ vs. $\psi$ — sensitivity analysis",
             fontsize=11, y=1.01)

for li, (ax, lam) in enumerate(zip(axes, LAMBDAS)):
    for ni_h, n_val in enumerate(N_HIGHLIGHT):
        n_idx = N_RANGE.index(n_val)
        curve_alt = alt_omg[:, li, n_idx]
        curve_mo  = mo_omg[0, li, n_idx]  # referencia horizontal
        ax.semilogx(PSI_VALUES, curve_alt, "-o",
                    color=n_colors[ni_h], linewidth=1.6,
                    markersize=4, label=f"$n={n_val}$")
        ax.axhline(curve_mo, color=n_colors[ni_h],
                   linestyle=":", linewidth=0.9, alpha=0.6)

    # Línea vertical psi_auto
    ax.axvline(PSI_AUTO, color="k", linestyle="--", linewidth=1.4)
    ylim = ax.get_ylim()
    ax.text(PSI_AUTO * 1.12, ylim[1] * 0.95,
            r"$\psi_{\mathrm{auto}}$", fontsize=8,
            ha="left", va="top", color="k")

    ax.set_title(r"$\lambda = %d$" % lam)
    ax.set_xlabel(r"$\psi$ (log scale)")
    ax.set_xlim(min(PSI_VALUES) * 0.7, max(PSI_VALUES) * 1.5)
    ax.set_ylim(bottom=0)

axes[0].set_ylabel(r"Average total overlaps $\Omega$")

handles, labels = axes[0].get_legend_handles_labels()
axes[0].legend(handles, labels, fontsize=7.5, loc="upper left", framealpha=0.9)
axes[0].text(0.03, 0.98, "(solid = MO(ψ), dotted = MO ref)",
             transform=axes[0].transAxes, fontsize=6.5,
             va="top", ha="left", color="gray")

plt.tight_layout()
save("fig2_overlaps_vs_psi.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 3: Hops vs ψ — igual estructura
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 3: Hops vs psi …")

fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), sharey=False)
fig.suptitle(r"Average hops vs. $\psi$ — routing length cost",
             fontsize=11, y=1.01)

for li, (ax, lam) in enumerate(zip(axes, LAMBDAS)):
    for ni_h, n_val in enumerate(N_HIGHLIGHT):
        n_idx = N_RANGE.index(n_val)
        curve_alt = alt_hops[:, li, n_idx]
        curve_mo  = mo_hops[0, li, n_idx]
        ax.semilogx(PSI_VALUES, curve_alt, "-s",
                    color=n_colors[ni_h], linewidth=1.6,
                    markersize=4, label=f"$n={n_val}$")
        ax.axhline(curve_mo, color=n_colors[ni_h],
                   linestyle=":", linewidth=0.9, alpha=0.6)

    ax.axvline(PSI_AUTO, color="k", linestyle="--", linewidth=1.4)
    ylim = ax.get_ylim()
    ax.text(PSI_AUTO * 1.12, ylim[1] * 0.98,
            r"$\psi_{\mathrm{auto}}$", fontsize=8,
            ha="left", va="top", color="k")

    ax.set_title(r"$\lambda = %d$" % lam)
    ax.set_xlabel(r"$\psi$ (log scale)")
    ax.set_xlim(min(PSI_VALUES) * 0.7, max(PSI_VALUES) * 1.5)

axes[0].set_ylabel(r"Average hops per route")

handles, labels = axes[0].get_legend_handles_labels()
axes[0].legend(handles, labels, fontsize=7.5, loc="upper left", framealpha=0.9)

plt.tight_layout()
save("fig3_hops_vs_psi.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 4: Heatmaps Ω(ψ, n) — una por lambda
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 4: Heatmaps …")

fig, axes = plt.subplots(1, 3, figsize=(14, 4.5))
fig.suptitle(r"Heatmap of average overlaps $\Omega(\psi, n)$", fontsize=11, y=1.01)

for li, (ax, lam) in enumerate(zip(axes, LAMBDAS)):
    Z = alt_omg[:, li, :]       # shape (N_PSI, N_N)
    vmax = np.nanmax(alt_omg[:, li, :])

    im = ax.imshow(Z, aspect="auto", origin="lower",
                   cmap="YlOrRd", vmin=0, vmax=vmax,
                   extent=[-0.5, N_N - 0.5, -0.5, N_PSI - 0.5])

    ax.set_xticks(range(N_N))
    ax.set_xticklabels(N_RANGE, fontsize=7, rotation=45)
    ax.set_yticks(range(N_PSI))
    ax.set_yticklabels([psi_label_short(p) for p in PSI_VALUES], fontsize=7)
    ax.set_xlabel(r"Number of flows $n$")
    ax.set_ylabel(r"$\psi$")
    ax.set_title(r"$\lambda = %d$" % lam)

    # Marcar fila de psi_auto
    psi_auto_idx = find_psi_index_val(PSI_AUTO) if False else \
                   int(np.argmin([abs(p - PSI_AUTO) for p in PSI_VALUES]))
    ax.axhline(psi_auto_idx, color="cyan", linewidth=1.6, linestyle="--")
    ax.text(N_N - 0.4, psi_auto_idx + 0.15, r"$\psi_{\rm auto}$",
            color="cyan", fontsize=7, va="bottom", ha="right")

    plt.colorbar(im, ax=ax, fraction=0.045, pad=0.04,
                 label=r"$\Omega$")

plt.tight_layout()
save("fig4_heatmap_overlaps.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 5: Reducción relativa Ω vs MO_ref   [MO(psi) / MO_ref - 1] × 100
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 5: Reduccion relativa Omega vs psi_auto ...")

# Reducción positiva = MO(psi) MEJOR que psi_auto
# ratio = (MO_ref - MO(psi)) / MO_ref * 100   => + = mejora, - = peor
mo_ref_3d = mo_omg[0:1, :, :]  # shape (1, N_LAM, N_N) — constante en psi
reduction = (mo_ref_3d - alt_omg) / (mo_ref_3d + 1e-9) * 100   # %

fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), sharey=False)
fig.suptitle(
    r"Relative overlap reduction $\frac{\Omega_{\mathrm{ref}} - \Omega(\psi)}{\Omega_{\mathrm{ref}}} \times 100\%$"
    "\n(positive = better than reference MO)",
    fontsize=10, y=1.03)

for li, (ax, lam) in enumerate(zip(axes, LAMBDAS)):
    for ni_h, n_val in enumerate(N_HIGHLIGHT):
        n_idx = N_RANGE.index(n_val)
        curve = reduction[:, li, n_idx]
        ax.semilogx(PSI_VALUES, curve, "-o",
                    color=n_colors[ni_h], linewidth=1.6,
                    markersize=4, label=f"$n={n_val}$")

    ax.axhline(0, color="k", linewidth=1.0, linestyle="-")
    ax.axvline(PSI_AUTO, color="k", linestyle="--", linewidth=1.4)
    ylim_abs = max(abs(reduction[:, li, :].min()), abs(reduction[:, li, :].max()))
    ax.set_ylim(-ylim_abs * 1.15, ylim_abs * 1.15)

    ylim = ax.get_ylim()
    ax.text(PSI_AUTO * 1.12, ylim[1] * 0.93,
            r"$\psi_{\mathrm{auto}}$", fontsize=8,
            ha="left", va="top", color="k")

    ax.set_title(r"$\lambda = %d$" % lam)
    ax.set_xlabel(r"$\psi$ (log scale)")
    ax.set_xlim(min(PSI_VALUES) * 0.7, max(PSI_VALUES) * 1.5)

axes[0].set_ylabel(r"Relative reduction (\%)")
handles, labels = axes[0].get_legend_handles_labels()
axes[0].legend(handles, labels, fontsize=7.5, loc="best", framealpha=0.9)

plt.tight_layout()
save("fig5_relative_reduction.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 6: Panel 2×3 comparación MO(psi) vs MO_ref — overlaps y hops juntos
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 6: Panel comparativo Omega y Hops ...")

fig, axes = plt.subplots(2, 3, figsize=(13, 7.5))
fig.suptitle(r"$\psi$ sensitivity: Overlaps (top) and Hops (bottom)", fontsize=11)

N_sel = [10, 14, 18, 22]
nc2 = plt.cm.cool(np.linspace(0.1, 0.9, len(N_sel)))

for li, lam in enumerate(LAMBDAS):
    ax_omg  = axes[0, li]
    ax_hops = axes[1, li]

    for ki, n_val in enumerate(N_sel):
        n_idx = N_RANGE.index(n_val)
        ax_omg.semilogx(PSI_VALUES, alt_omg[:, li, n_idx],
                        "-o", color=nc2[ki], lw=1.5, ms=4,
                        label=f"$n={n_val}$")
        ax_omg.axhline(mo_omg[0, li, n_idx],
                       color=nc2[ki], ls=":", lw=1.0, alpha=0.7)

        ax_hops.semilogx(PSI_VALUES, alt_hops[:, li, n_idx],
                         "-s", color=nc2[ki], lw=1.5, ms=4,
                         label=f"$n={n_val}$")
        ax_hops.axhline(mo_hops[0, li, n_idx],
                        color=nc2[ki], ls=":", lw=1.0, alpha=0.7)

    for ax in [ax_omg, ax_hops]:
        ax.axvline(PSI_AUTO, color="k", ls="--", lw=1.3)
        ax.set_xlim(min(PSI_VALUES) * 0.7, max(PSI_VALUES) * 1.5)
        ax.set_xlabel(r"$\psi$")
        ax.set_ylim(bottom=0)

    ax_omg.set_title(r"$\lambda = %d$" % lam)
    ax_omg.set_ylabel(r"$\Omega$")
    ax_hops.set_ylabel(r"Avg hops")

axes[0, 0].legend(fontsize=7, loc="upper left", framealpha=0.9)

plt.tight_layout()
save("fig6_panel_omg_hops.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 7 (FIGURA PRINCIPAL DE PRESENTACIÓN):
#   Fila superior: Overlaps vs n — una curva por ψ (todos los valores)
#   Fila inferior: Hops vs n    — las MISMAS curvas con los MISMOS colores
#
#   El ψ que minimiza overlaps (para n=22) se resalta con línea gruesa y
#   marcador especial en AMBAS filas → así se ve el trade-off directamente.
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 7: Panel Overlaps + Hops vs n (figura presentacion) ...")

# Paleta de colores: una por valor de psi (mismo en ambas filas)
PSI_COLORS_7 = plt.cm.plasma(np.linspace(0.05, 0.92, N_PSI))

fig7, axes7 = plt.subplots(
    2, 3,
    figsize=(14, 7.5),
    sharex=True,
    gridspec_kw={"hspace": 0.08, "wspace": 0.28}
)

# Etiquetas de columna (lambda)
col_titles = [r"$\lambda = 4$  (sparse)", r"$\lambda = 8$  (medium)", r"$\lambda = 12$  (dense)"]

for li, lam in enumerate(LAMBDAS):

    ax_omg  = axes7[0, li]
    ax_hops = axes7[1, li]

    # --- Encontrar el ψ que minimiza Ω en n=22 (punto de máxima congestión) ---
    n_ref_idx = N_RANGE.index(22)
    omg_at_nmax = alt_omg[:, li, n_ref_idx]          # shape (N_PSI,)
    best_psi_idx = int(np.argmin(omg_at_nmax))
    best_psi_val = PSI_VALUES[best_psi_idx]

    for pi in range(N_PSI):
        is_best = (pi == best_psi_idx)
        lw  = 3.0 if is_best else 1.1
        zo  = 5   if is_best else 2
        ms  = 7   if is_best else 3
        mk  = "D" if is_best else "o"
        alp = 1.0 if is_best else 0.55

        label_str = f"$\\psi={PSI_VALUES[pi]:.4g}$"
        if is_best:
            label_str += r"  $\leftarrow$ best"

        ax_omg.plot(N_RANGE, alt_omg[:, li, :][pi],
                    f"-{mk}", color=PSI_COLORS_7[pi],
                    lw=lw, ms=ms, zorder=zo, alpha=alp,
                    label=label_str)

        ax_hops.plot(N_RANGE, alt_hops[:, li, :][pi],
                     f"-{mk}", color=PSI_COLORS_7[pi],
                     lw=lw, ms=ms, zorder=zo, alpha=alp)

    # MO referencia (ψ_auto del paper) — línea negra punteada
    ax_omg.plot(N_RANGE, mo_omg[0, li, :],
                "k--", lw=1.8, zorder=4,
                label=r"MO$_{\mathrm{ref}}$ ($\psi_{\mathrm{auto}}$)")
    ax_hops.plot(N_RANGE, mo_hops[0, li, :],
                 "k--", lw=1.8, zorder=4)

    # Anotación del mejor ψ en el panel de overlaps
    ax_omg.annotate(
        f"best $\\psi={best_psi_val:.4g}$",
        xy=(N_RANGE[-1], alt_omg[best_psi_idx, li, -1]),
        xytext=(-30, 12), textcoords="offset points",
        fontsize=7.5, color=PSI_COLORS_7[best_psi_idx],
        arrowprops=dict(arrowstyle="->", color=PSI_COLORS_7[best_psi_idx], lw=1.2),
        bbox=dict(boxstyle="round,pad=0.2", fc="white", ec=PSI_COLORS_7[best_psi_idx], lw=0.8)
    )

    # Estilo
    for ax in [ax_omg, ax_hops]:
        ax.set_xlim(N_RANGE[0], N_RANGE[-1])
        ax.set_ylim(bottom=0)
        ax.grid(True, linestyle="--", alpha=0.4)
        ax.set_xticks(N_RANGE[::2])

    ax_omg.set_title(col_titles[li], fontsize=10, pad=6)
    ax_hops.set_xlabel(r"Number of flows $n$", fontsize=9)

axes7[0, 0].set_ylabel(r"Avg total overlaps $\Omega$", fontsize=9)
axes7[1, 0].set_ylabel(r"Avg hops per route", fontsize=9)

# Etiqueta de filas
for row_ax, row_label in zip([axes7[0, 2], axes7[1, 2]],
                              ["Overlaps", "Hops"]):
    row_ax.annotate(
        row_label,
        xy=(1.03, 0.5), xycoords="axes fraction",
        fontsize=10, fontweight="bold", color="gray",
        ha="left", va="center", rotation=270
    )

# Leyenda única (columna central, fila superior)
handles, labels = axes7[0, 1].get_legend_handles_labels()
axes7[0, 1].legend(
    handles, labels,
    fontsize=6.8, loc="upper left",
    framealpha=0.92, edgecolor="#BBBBBB",
    ncol=1, handlelength=1.8
)

# Título global
fig7.suptitle(
    r"$\psi$ sensitivity — Overlaps (top) and Hops (bottom) vs. $n$"
    "\n"
    r"Highlighted curve = $\psi$ that minimizes $\Omega$ at $n=22$",
    fontsize=11, y=1.01
)

save("fig7_overlaps_hops_vs_n_panel.png")

# ─────────────────────────────────────────────────────────────────────────────
print("\nOK Todos los graficos guardados en ./figures_phi/")
print("   fig1_overlaps_vs_n.png")
print("   fig2_overlaps_vs_psi.png")
print("   fig3_hops_vs_psi.png")
print("   fig4_heatmap_overlaps.png")
print("   fig5_relative_reduction.png")
print("   fig6_panel_omg_hops.png")
print("   fig7_overlaps_hops_vs_n_panel.png  <-- FIGURA PRINCIPAL PRESENTACION")
