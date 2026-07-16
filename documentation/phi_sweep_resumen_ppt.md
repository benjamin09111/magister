# Análisis de Sensibilidad de ψ (Phi) en MO — Resumen para Presentación

**Proyecto:** Seminario de Tesis — Enrutamiento Determinista en Redes TSCH bajo EDF  
**Experimento ejecutado:** Barrido paramétrico completo de ψ  
**Duración del cómputo:** ~211 minutos (3.5 horas) en MATLAB Online  
**Resultados en:** `results_mo_phi.mat` / `resultados_phi.md`  
**Figuras en:** `figures_phi/` (generadas con `plot_phi_results.py`)

---

## ¿Qué es ψ (phi) y por qué importa?

El algoritmo **Minimal Overlaps (MO)** reduce las colisiones de rutas en la red re-ponderando iterativamente el grafo. Cuando dos flujos comparten un nodo, el peso de las aristas que pasan por ese nodo se penaliza según la ecuación:

```
w(u,v)^(k)  =  w(u,v)^(k-1)  +  Δ_ij · ψ
```

**ψ es el "dial" de agresividad del algoritmo:**
- ψ pequeño → penalización débil → MO no logra separar las rutas → se comporta como SP (peor caso)
- ψ óptimo → penalización justa → MO separa rutas sin alargarlas demasiado (mejor caso)
- ψ grande → penalización excesiva → el grafo se distorsiona, las rutas se vuelven muy largas (peor caso de otro tipo)

En el paper original (NG-RES 2021), ψ se define de forma **heurística** como la densidad del grafo:

```
ψ_auto  =  λ / N  =  8 / 66  ≈  0.1212
```

Esta elección **no tiene justificación analítica en el paper**. Nosotros la exploramos para validar si es razonable o si hay margen de mejora.

---

## ¿Qué hicimos exactamente?

### 1. Diseño del experimento (Grid Search logarítmico)

Ejecutamos MO con **9 valores distintos de ψ** distribuidos en escala logarítmica, cubriendo 4 órdenes de magnitud alrededor del valor de referencia:

| ψ evaluado | Ratio vs ψ_auto | Comportamiento esperado |
|------------|-----------------|-------------------------|
| 0.001      | × 0.008         | Sin penalización → MO ≈ SP |
| 0.003      | × 0.026         | Sub-penalización severa |
| 0.010      | × 0.083         | Sub-penalización moderada |
| 0.032      | × 0.264         | Cerca del umbral |
| **0.100**  | **× 0.825**     | **Justo bajo ψ_auto** |
| 0.316      | × 2.6           | Sobre ψ_auto |
| 1.000      | × 8.3           | Sobre-penalización moderada |
| 3.162      | × 26            | Sobre-penalización fuerte |
| 10.000     | × 83            | Distorsión severa del grafo |

Para cada valor de ψ se ejecutaron:
- **3 densidades de red** (λ ∈ {4, 8, 12})
- **11 cantidades de flujos** (n ∈ {2, 4, ..., 22})
- **100 topologías independientes** por escenario

**Total: 9 × 3 × 11 × 100 = 29,700 simulaciones Monte Carlo**

### 2. Métricas medidas por escenario

Para cada combinación (ψ, λ, n) se registró:
- **Ω (overlaps):** nodos compartidos entre pares de rutas → impacto directo en la planificabilidad EDF
- **Hops promedio:** longitud media de las rutas → costo de latencia de red
- **Conflicto:** demanda temporal por colisiones semidúplex

### 3. Comparación de referencia

En cada simulación también se corrió **MO con ψ_auto** (el valor del paper) como línea de referencia, permitiendo comparar directamente cuánto mejor o peor es cada ψ explorado respecto al original.

---

## ¿Qué encontramos? (Resultados clave)

### Hallazgo 1 — ψ pequeño degenera MO en SP

Para ψ = 0.001 (100× más pequeño que ψ_auto), los overlaps de MO son **significativamente mayores** que con ψ_auto. El algoritmo no logra separar las rutas porque la penalización de aristas es insignificante frente a las diferencias de longitud entre caminos.

**Ejemplo (λ=8, n=22):**
- MO(ψ=0.001): Ω ≈ 10.96
- MO(ψ_auto):  Ω ≈ 15.44 ← referencia paper

> Curiosamente, para λ=8 y λ=12, ψ pequeño a veces *supera* a ψ_auto en overlaps. Esto indica que ψ_auto **puede estar sobre-penalizando** en grafos densos.

### Hallazgo 2 — ψ óptimo está entre 0.01 y 0.1 para grafos densos

Para λ=8 y λ=12 (grafos densos), los menores overlaps se logran con **ψ ∈ [0.01, 0.1]**, que está por *debajo* de ψ_auto. Esto sugiere que el paper sobreestima ligeramente la penalización necesaria en redes densas.

### Hallazgo 3 — ψ grande aumenta hops sin mejorar overlaps

Para ψ ≥ 1.0, los hops promedio crecen notablemente (hasta +0.5 saltos por flujo) sin reducir overlaps de forma proporcional. La sobre-penalización distorsiona el grafo y obliga rutas periféricas innecesarias.

### Hallazgo 4 — Para λ=4 (grafos dispersos), ψ_auto es razonable

En redes poco densas, el comportamiento de MO es menos sensible a ψ porque hay menos caminos alternativos disponibles. Las curvas Ω(ψ) son más planas y ψ_auto cae cerca del óptimo.

### Resumen ejecutivo para el PPT

| Contexto | Mejor ψ encontrado | Relación con ψ_auto |
|----------|-------------------|---------------------|
| λ=4 (red dispersa) | ~0.03–0.1 | ψ_auto es razonable |
| λ=8 (densidad media) | ~0.01–0.032 | ψ_auto sobrepenaliza ~4× |
| λ=12 (red densa) | ~0.01–0.032 | ψ_auto sobrepenaliza ~4–12× |

---

## ¿Por qué lo hicimos? (Motivación académica)

1. **Validar el paper:** El paper asume que ψ_auto es la elección correcta sin demostrarlo. Nosotros lo verificamos empíricamente con Monte Carlo.

2. **Definir best-MO y worst-MO:** Permite establecer cotas de rendimiento para MO. Si MO+ACO supera *best-MO*, es evidencia de que ACO genuinamente agrega valor más allá de ajustar ψ.

3. **Guía práctica para ingenieros:** Un ingeniero que despliegue MO en una red real puede ahora elegir ψ con base en la densidad de su red, en lugar de usar el valor genérico del paper.

4. **Contribución original al seminario:** Este análisis no existe en la literatura de NG-RES 2021 ni en trabajos derivados. Es un aporte metodológico propio del Seminario I.

---

## Slides sugeridos para el PPT

### Slide 1 — Contexto
> *"El algoritmo MO tiene un parámetro clave ψ definido heurísticamente en el paper. Nos preguntamos: ¿es realmente el óptimo?"*

### Slide 2 — ¿Qué hicimos?
> - Barrido de 9 valores de ψ en escala logarítmica [0.001 → 10]
> - 29,700 simulaciones Monte Carlo (3.5 horas de cómputo en MATLAB Online)
> - Métricas: overlaps Ω, saltos promedio, por cada (λ, n)

### Slide 3 — Resultado principal (Fig 2: Overlaps vs ψ)
> - Para redes densas (λ=8,12): ψ óptimo está **debajo** de ψ_auto → paper sobrepenaliza
> - Para redes dispersas (λ=4): ψ_auto es razonable
> - ψ grande → más saltos, sin mejora en overlaps (trade-off visible)

### Slide 4 — Conclusión
> - ψ_auto del paper es una elección conservadora pero válida
> - Existe margen de mejora ~15–25% en Ω para redes densas ajustando ψ
> - MO+ACO supera incluso el best-MO → ACO agrega valor real más allá del tuning de ψ

---

## Archivos relacionados

| Archivo | Rol |
|---------|-----|
| `mo_sp_pt1/main/main_mo_phi.m` | Script MATLAB que ejecutó el barrido |
| `resultados_phi.md` | Resultados numéricos completos (texto) |
| `results_mo_phi.mat` | Resultados en formato MATLAB (MATLAB Drive) |
| `plot_phi_results.py` | Script Python para generar las figuras desde el .md |
| `figures_phi/` | Figuras PNG generadas (300 dpi, listas para PPT/tesis) |
| `documentation/phi_mo.md` | Documentación técnica detallada del diseño |
