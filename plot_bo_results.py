"""
plot_bo_results.py
==================
Lee results_mo_phi_bo_v2.mat y genera figuras de alta calidad (estilo paper)
para ilustrar el proceso de optimizacion bayesiana y la validacion del factor psi.

Figuras generadas:
  1. fig_bo_convergence_trace.png      - Trayectoria del optimizador (Warm-up vs BO)
  2. fig_bo_gp_surrogate.png           - Ajuste final del proceso gaussiano y Expected Improvement
  3. fig_bo_validation_comparison.png  - Comparacion final validada (100 trials) con CIs

Uso:
  python plot_bo_results.py
"""

import os
import numpy as np
import scipy.io
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# ─────────────────────────────────────────────────────────────────────────────
# 1. CARGA DE DATOS Y CONFIGURACION
# ─────────────────────────────────────────────────────────────────────────────
MAT_FILE = "results_mo_phi_bo_v2.mat"
OUT_DIR  = "figures_phi"
os.makedirs(OUT_DIR, exist_ok=True)

if not os.path.exists(MAT_FILE):
    raise FileNotFoundError(f"No se encontro el archivo de resultados {MAT_FILE}")

# Cargar .mat
data = scipy.io.loadmat(MAT_FILE)
results = data['results_v2'][0, 0]

# Extraer variables principales
psi_min = float(data['PSI_MIN'][0, 0])
psi_max = float(data['PSI_MAX'][0, 0])
psi_auto = float(data['psi_auto_ref'][0, 0])
psi_optimal = float(data['psi_optimal'][0, 0])
lambda_opt = int(data['LAMBDA_OPT'][0, 0])
n_opt = int(data['N_OPT'][0, 0])

hist_psi = results['bo_hist_psi'].flatten()
hist_omega = results['bo_hist_omega'].flatten()
gp_hp = results['gp_hp_final'].flatten() # [l, sf2, sn2]
val_psi = results['validation_psi'].flatten()
val_omega = results['validation_omega'].flatten()
val_ci95 = results['validation_ci95'].flatten()

# Estilo global de graficos para publicacion
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

def save_fig(name):
    path = os.path.join(OUT_DIR, name)
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  -> {path}")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 1: TRAYECTORIA DE CONVERGENCIA BO (CONVERGENCE TRACE)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 1: Trayectoria de convergencia BO ...")
n_warmup = 10 # Los 10 puntos de la cuadricula inicial
n_total = len(hist_omega)

fig, ax = plt.subplots(figsize=(7.5, 4.2), facecolor="w")

# Regiones de fases (sombreado de fondo)
ax.axvspan(1, n_warmup, color="#e6f2ff", alpha=0.6, label="Phase 1: Warm-up Grid")
ax.axvspan(n_warmup, n_total, color="#fff2e6", alpha=0.6, label="Phase 2: Bayesian Optimization")

# Curva de observaciones
ax.plot(range(1, n_total + 1), hist_omega, "o-", color="#1f77b4", linewidth=1.8,
        markerfacecolor="white", markeredgewidth=1.5, markersize=5, label=r"Evaluated $\bar{\Omega}(\psi)$")

# Running minimum
running_min = np.minimum.accumulate(hist_omega)
ax.plot(range(1, n_total + 1), running_min, "k--", linewidth=1.4, label="Running Best")

# Destacar el mejor absoluto de la optimizacion
idx_best = np.argmin(hist_omega)
ax.plot(idx_best + 1, hist_omega[idx_best], "r*", markersize=12, label=r"Global Best Found ($\bar{\Omega}=%.3f$)" % hist_omega[idx_best])

# Titulos y formato
ax.set_title(f"Optimization Trace | $\lambda={lambda_opt}$, $n={n_opt}$ flows", fontsize=11, fontweight="bold", pad=8)
ax.set_xlabel("Evaluation Index", fontsize=10)
ax.set_ylabel(r"Average Overlaps $\bar{\Omega}$ (20-40 trials)", fontsize=10)
ax.set_xlim(0.8, n_total + 0.2)
ax.set_xticks(range(1, n_total + 1))
ax.set_ylim(0, max(hist_omega) * 1.1)

# Leyenda
ax.legend(loc="upper right", framealpha=0.95, edgecolor="#BBBBBB")

save_fig("fig_bo_convergence_trace.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 2: GP SURROGATE FIT + EXPECTED IMPROVEMENT (EI)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 2: GP Surrogate y Expected Improvement ...")

def rbf_k(X1, X2, l, sf2):
    X1 = np.atleast_2d(X1).T if X1.ndim == 1 else X1
    X2 = np.atleast_2d(X2).T if X2.ndim == 1 else X2
    dists = np.sum(X1**2, axis=1, keepdims=True) + np.sum(X2**2, axis=1) - 2 * np.dot(X1, X2.T)
    return sf2 * np.exp(-0.5 * dists / (l**2))

def predict_gp(X_train, Y_train, X_test, l, sf2, sn2):
    y_mean = np.mean(Y_train)
    y_std = np.std(Y_train) + 1e-8
    Y_norm = (Y_train - y_mean) / y_std
    
    n = len(X_train)
    K_tt = rbf_k(X_train, X_train, l, sf2) + (sn2 + 1e-6) * np.eye(n)
    K_st = rbf_k(X_test, X_train, l, sf2)
    K_ss_diag = sf2 * np.ones(len(X_test))
    
    L = np.linalg.cholesky(K_tt)
    alpha = np.linalg.solve(L.T, np.linalg.solve(L, Y_norm))
    mu_norm = np.dot(K_st, alpha)
    v = np.linalg.solve(L, K_st.T)
    var_norm = K_ss_diag - np.sum(v**2, axis=0)
    var_norm = np.maximum(var_norm, 1e-10)
    
    mu = mu_norm * y_std + y_mean
    sigma = np.sqrt(var_norm) * y_std
    return mu, sigma

# Reconstruir GP sobre grilla log-psi densa
X_train = np.log10(hist_psi)
Y_train = hist_omega
X_dense = np.linspace(np.log10(psi_min), np.log10(psi_max), 300)
psi_dense = 10**X_dense

l_opt, sf2_opt, sn2_opt = gp_hp
gp_mu, gp_sig = predict_gp(X_train, Y_train, X_dense, l_opt, sf2_opt, sn2_opt)

# EI calculation
f_best = np.min(Y_train)
import scipy.stats as stats
z = (f_best - gp_mu) / (gp_sig + 1e-10)
ei = (f_best - gp_mu) * stats.norm.cdf(z) + gp_sig * stats.norm.pdf(z)
ei = np.maximum(ei, 0)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8.5, 6.2), sharex=True, gridspec_kw={'hspace': 0.12})

# Panel Superior: GP Surrogate
ax1.fill_between(psi_dense, gp_mu - 1.96 * gp_sig, gp_mu + 1.96 * gp_sig, color="#b3d1ff", alpha=0.6, label="95% Confidence Interval")
ax1.semilogx(psi_dense, gp_mu, color="#0055ff", linewidth=2.0, label="GP Mean Function $\mu(\psi)$")
ax1.semilogx(hist_psi, hist_omega, "k+", markersize=8, markeredgewidth=1.5, label="Observations")
ax1.plot(psi_optimal, f_best, "r*", markersize=12, label=r"Optimal $\psi^* = %.5f$" % psi_optimal)
ax1.axvline(psi_auto, color="#d62728", linestyle="--", linewidth=1.3, label=r"$\psi_{\mathrm{auto}} = %.4f$ (paper)" % psi_auto)

# Etiqueta de psi_auto
y_lim_gp = ax1.get_ylim()
ax1.text(psi_auto * 1.1, y_lim_gp[1] * 0.9, r"$\psi_{\mathrm{auto}}$", color="#d62728", fontsize=9, fontweight="bold", ha="left")

ax1.set_ylabel(r"Overlaps $\bar{\Omega}(\psi)$", fontsize=10)
ax1.set_ylim(0, max(hist_omega) * 1.1)
ax1.set_title("Gaussian Process Surrogate Model (Final Fit)", fontsize=11, fontweight="bold")
ax1.legend(loc="upper right", framealpha=0.9)

# Panel Inferior: Expected Improvement (EI)
ax2.fill_between(psi_dense, 0, ei, color="#2ca02c", alpha=0.7, label="Expected Improvement (EI)")
idx_ei_max = np.argmax(ei)
ax2.plot(psi_dense[idx_ei_max], ei[idx_ei_max], "rv", markersize=8, markerfacecolor="red", label="Max Acquisition Point")

ax2.set_xlabel(r"Penalization Factor $\psi$ (log scale)", fontsize=10)
ax2.set_ylabel("EI($\psi$)", fontsize=10)
ax2.set_xlim(psi_min * 0.9, psi_max * 1.1)
ax2.set_title("Expected Improvement Acquisition Function", fontsize=11, fontweight="bold")
ax2.legend(loc="upper right", framealpha=0.9)

# Formatear ejes logaritmicos
ax2.set_xscale("log")

save_fig("fig_bo_gp_surrogate.png")

# ─────────────────────────────────────────────────────────────────────────────
# FIG 3: COMPARACION FINAL VALIDADA (100 TRIALS)
# ─────────────────────────────────────────────────────────────────────────────
print("Generando Fig 3: Comparativa validada ...")

# Filtrar duplicados o ordenar candidatos
indices_sort = np.argsort(val_psi)
val_psi = val_psi[indices_sort]
val_omega = val_omega[indices_sort]
val_ci95 = val_ci95[indices_sort]

labels = []
colors = []
for p in val_psi:
    if abs(p - psi_auto) < 1e-6:
        labels.append(f"Original Paper\n$\\psi_{{\\mathrm{{auto}}}} = {p:.5g}$")
        colors.append("#d62728") # Rojo
    elif abs(p - psi_optimal) < 1e-6:
        labels.append(f"Bayesian Optimal\n$\\psi^* = {p:.5g}$")
        colors.append("#2ca02c") # Verde
    else:
        labels.append(f"BO Candidate\n$\\psi = {p:.5g}$")
        colors.append("#1f77b4") # Azul

fig, ax = plt.subplots(figsize=(6.0, 4.0), facecolor="w")

# Graficar barras
bars = ax.bar(range(len(val_psi)), val_omega, color=colors, edgecolor="#404040", width=0.55, linewidth=1.0)

# Graficar intervalos de confianza (si son mayores a cero)
if np.any(val_ci95 > 0):
    ax.errorbar(range(len(val_psi)), val_omega, yerr=val_ci95, fmt="none", ecolor="black", elinewidth=1.6, capsize=6)

# Anotaciones de valor sobre la barra
for bar, val in zip(bars, val_omega):
    ax.text(bar.get_x() + bar.get_width()/2.0, val * 0.5, f"{val:.3f}", 
            ha='center', va='center', color='white', fontsize=10, fontweight='bold')

# Calcular mejora %
idx_auto = np.where(np.abs(val_psi - psi_auto) < 1e-6)[0][0]
idx_opt = np.where(np.abs(val_psi - psi_optimal) < 1e-6)[0][0]
mo_ref_val = val_omega[idx_auto]
mo_opt_val = val_omega[idx_opt]
mejora_val = (mo_ref_val - mo_opt_val) / mo_ref_val * 100

# Anotar la mejora en el grafico
ax.annotate("", xy=(idx_opt, mo_opt_val + 0.08), xytext=(idx_auto, mo_ref_val - 0.1),
            arrowprops=dict(arrowstyle="->", color="#404040", connectionstyle="arc3,rad=-0.2", lw=1.5, ls="--"))
ax.text((idx_opt + idx_auto)/2.0, (mo_opt_val + mo_ref_val)/2.0 + 0.25, f"{mejora_val:+.1f}% Overlap\nReduction",
        fontsize=9.5, fontweight="bold", color="#2ca02c", ha="center", va="center")

ax.set_title(f"Final Validation Comparison | 100 trials", fontsize=11, fontweight="bold", pad=8)
ax.set_ylabel(r"Average Overlaps $\bar{\Omega}$", fontsize=10)
ax.set_xticks(range(len(val_psi)))
ax.set_xticklabels(labels, fontsize=9)
ax.set_ylim(0, max(val_omega) * 1.25)
ax.set_xlim(-0.5, len(val_psi) - 0.5)

save_fig("fig_bo_validation_comparison.png")

print("\nTodas las figuras de optimizacion bayesiana se guardaron exitosamente en ./figures_phi/")
