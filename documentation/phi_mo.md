# Análisis de Sensibilidad Paramétrica del Factor de Penalización ψ (phi) en MO

**Archivo:** `documentation/phi_mo.md`  
**Proyecto:** Seminario de Tesis — Enrutamiento Determinista en Redes TSCH bajo EDF  
**Referencia base:** Gutiérrez Gaitán et al., *NG-RES 2021*

---

## 1. Contexto y motivación

### 1.1 ¿Qué es ψ (phi) en el algoritmo MO?

El algoritmo **Minimal Overlaps (MO)** opera re-ponderando iterativamente el grafo de la red G = (V, E) para penalizar las aristas que inciden en nodos compartidos entre rutas de distintos flujos. En cada iteración k, la actualización de pesos sigue la ecuación:

```
w(u,v)^(k) = w(u,v)^(k-1) + delta_ij * psi
```

donde:
- `delta_ij` = número de nodos compartidos (solapamiento) entre el flujo f_i y el flujo f_j (excluido el gateway)
- `psi` = **factor de densidad de penalización** — determina cuánto peso adicional recibe cada arista por unidad de solapamiento

El parámetro ψ controla la **agresividad** con la que MO disuade al algoritmo de caminos mínimos (Dijkstra) de reutilizar nodos ya congestionados. Es el knob central de todo el mecanismo de re-ponderación.

### 1.2 ¿Por qué es arbitrario?

En el paper original (NG-RES 2021), ψ se define como la densidad del grafo:

```
psi_auto = avg_degree / N = lambda / N
```

donde `lambda` es el grado medio y `N = 66` es el tamaño de la red. Esta elección es **heurística y arbitraria**: no existe en el paper una justificación analítica de por qué esta es la escala correcta de penalización. La implementación en MATLAB (`run_minimal_overlap_routing.m`) usa esta definición directamente.

### 1.3 Importancia del análisis

La elección de ψ determina:
- Si MO converge hacia el mínimo de solapamientos o se estanca
- La velocidad de convergencia (pocos vs. muchos pasos necesarios)
- Si el algoritmo produce **best-MO** (mínimo Ω posible) o **worst-MO** (el algoritmo se degrada)

Analizar sistemáticamente ψ permite:
1. **Validar** que el `psi_auto` del paper es una elección razonable
2. **Cuantificar** cuánta mejora deja sobre la mesa la heurística automática
3. **Proveer un marco de referencia** (best/worst MO) para comparar contra MO+ACO, Q-Learning, SARSA

---

## 2. Diseño del rango de barrido

### 2.1 Valores de referencia

Para los parámetros del paper (N=66):

| lambda | psi_auto = lambda/N |
|--------|---------------------|
| 4      | 4/66 ≈ 0.0606       |
| 8      | 8/66 ≈ 0.1212  ← referencia central |
| 12     | 12/66 ≈ 0.1818      |

### 2.2 Justificación del rango [0.001, 10.0]

El rango elegido cubre ~4 órdenes de magnitud centrado en `psi_auto` (lambda=8):

| Extremo       | Valor | Ratio psi / psi_auto (lambda=8) | Comportamiento esperado |
|---------------|-------|----------------------------------|-------------------------|
| psi → 0       | 0.001 | × 0.008 | Sin penalización → MO ≈ SP (peor versión) |
| psi_auto      | 0.121 | × 1.0   | Referencia del paper |
| psi moderado  | ~0.5–2.0 | × 4–16 | Posiblemente mejor Ω |
| psi → ∞       | 10.0  | × 83    | Sobrepenalización → distorsión del grafo |

La escala logarítmica uniforme es la correcta porque la dinámica del algoritmo es multiplicativa: cambiar ψ de 0.1 a 0.2 tiene el mismo efecto relativo que de 1.0 a 2.0.

**Referencia metodológica:** Stützle, T. & Hoos, H. H. (2000). MAX-MIN Ant System. *Future Generation Computer Systems*, 16(8), 889-914.

### 2.3 Comportamiento esperado de Omega(psi)

Se espera una curva en forma de U asimétrica o monotónica-convexa en escala log:

```
Omega
│ o               <- psi muy pequeño: sin penalización → MO ≈ SP → máximo Omega
│    o
│       o
│          o
│            o   <- mínimo: psi óptimo
│              o
│                o  <- psi muy grande: rutas muy largas, posible re-aumento de Omega
└─────────────────────── psi (log)
```

Para psi → 0: la penalización es insuficiente para desviar rutas → Omega se acerca al valor SP.
Para psi óptimo: el grafo se re-pondera lo suficiente para separar rutas sin distorsionarlo.
Para psi → inf: el grafo se distorsiona severamente; los caminos mínimos pueden volverse
muy largos o zig-zaguear, lo que puede incrementar Omega nuevamente.

---

## 3. Arquitectura de los nuevos archivos

### 3.1 Principio de diseño

> **Regla de oro:** NO se modifica ningún archivo existente. Todo el análisis de ψ
> se implementa como una capa adicional de wrappers que reutiliza la infraestructura existente.

La única "interfaz" entre el nuevo código y el código existente es la firma de
`run_minimal_overlap_routing`:

```matlab
[best_paths, best_omega] = run_minimal_overlap_routing(G, sp_paths, sensors, gateway, psi, k_max)
```

El parámetro `psi` (5º argumento) ya existe y acepta cualquier valor numérico.
El `psi_auto` se calcula externamente en el script que llama a la función.
Solo necesitamos inyectarlo con un valor diferente.

### 3.2 Mapa de archivos nuevos

```
mo_sp_pt1/
├── routing/
│   └── run_mo_fixed_psi_routing.m       [NUEVO] wrapper MO con psi externo
│
├── experiments/
│   └── run_psi_sweep_experiment.m       [NUEVO] barrido sistemático de psi
│
├── plots/
│   ├── plot_psi_sensitivity_overlaps.m  [NUEVO] curva Omega(psi) detallada
│   ├── plot_psi_sensitivity_heatmap.m   [NUEVO] heatmap 2D psi x n → Omega
│   ├── plot_psi_all_lambdas.m           [NUEVO] Omega(psi) para 3 lambdas
│   └── plot_psi_best_worst_vs_n.m       [NUEVO] best/worst MO vs n
│
├── main/
│   ├── main_mo_phi.m                    [NUEVO] análisis visual completo
│   └── main_mo_phi_optimization.m      [NUEVO] búsqueda del psi óptimo
│
└── documentation/
    └── phi_mo.md                        [ESTE ARCHIVO]
```

### 3.3 Dependencias entre archivos

```
main_mo_phi.m
  └─ run_psi_sweep_experiment.m
        └─ run_experiment_suite_vs_mo.m        [EXISTENTE, sin cambios]
                └─ run_single_trial_vs_mo.m    [EXISTENTE, sin cambios]
                        └─ run_mo_fixed_psi_routing.m   [NUEVO]
                                └─ run_minimal_overlap_routing.m  [EXISTENTE, sin cambios]

main_mo_phi_optimization.m
  └─ evaluate_omega_for_psi()   [función local interna del script]
        └─ run_experiment_suite_vs_mo.m        [EXISTENTE, sin cambios]
                └─ run_mo_fixed_psi_routing.m  [NUEVO]
```

---

## 4. Descripción detallada de cada archivo

### 4.1 `routing/run_mo_fixed_psi_routing.m`

**Rol:** Wrapper mínimo. Recibe un `psi_fixed` numérico y llama a `run_minimal_overlap_routing`
con ese valor en lugar del psi automático.

**Por qué así:** El framework de experimentos (`run_experiment_suite_vs_mo`) espera una función
handle con firma `f(G, sensors, gateway, cfg)`. Este wrapper adapta la interfaz sin tocar
nada existente.

**Uso típico:**
```matlab
fn = @(G, s, gw, cfg) run_mo_fixed_psi_routing(G, s, gw, cfg, 0.5);
results = run_experiment_suite_vs_mo(cfg, fn, 'MO(psi=0.5)');
```

### 4.2 `experiments/run_psi_sweep_experiment.m`

**Rol:** Itera sobre `psi_values` y ejecuta `run_experiment_suite_vs_mo` para cada uno.

**Decisión de diseño:** Reutiliza `run_experiment_suite_vs_mo` completamente, incluyendo
su manejo de semillas, datasets y estructura de resultados. Solo extrae `mean_overlaps_alt`
y `mean_hops_alt` (el método "alt" es MO con psi fijo; el MO de referencia interno
es irrelevante aquí).

**Salida:** Struct 3D `sweep_results.mean_overlaps(p_idx, l_idx, n_idx)`.

### 4.3 `plots/plot_psi_all_lambdas.m` — figura principal para publicación

**Rol:** Muestra Omega(psi) en escala log para los 3 valores de lambda con n fijo.

**Por qué es la figura clave:** Permite ver en un solo panel si el psi_auto es bueno/malo
para cada densidad de red, y cuál es el margen de mejora potencial. Es la figura
que iría al paper.

### 4.4 `plots/plot_psi_best_worst_vs_n.m` — contribución metodológica principal

**Rol:** Para cada n, encuentra el psi que da el mínimo Omega (best-MO) y el máximo Omega
(worst-MO), y traza ambas curvas junto con MO-auto. Incluye región sombreada entre las cotas.

**Por qué importa:** Cuantifica cuánta variabilidad introduce la elección de psi en el
rendimiento de MO, y permite verificar si MO+ACO supera el límite teórico de best-MO.

### 4.5 `plots/plot_psi_sensitivity_heatmap.m`

**Rol:** Visualiza la matriz completa Omega(psi, n) como imagen de calor para un lambda fijo.

**Decisión técnica:** El eje Y usa escala log manual (log10 de psi con ticks transformados)
porque `imagesc` no soporta escala log nativa en MATLAB.

### 4.6 `main/main_mo_phi.m` — ejecutar primero

**Rol:** Script principal de análisis visual. Toda la configuración está en la sección
"PARÁMETROS AJUSTABLES" para facilitar cambios sin tocar lógica.

**Parámetros clave ajustables:**

| Variable               | Default  | Descripción |
|------------------------|----------|-------------|
| `NUM_PSI_POINTS`       | 9        | Puntos del barrido logarítmico |
| `PSI_MIN`              | 0.001    | Límite inferior del rango |
| `PSI_MAX`              | 10.0     | Límite superior del rango |
| `NUM_TESTS`            | 100      | Trials por escenario (config paper) |
| `N_FIXED_FOR_CURVES`   | 14       | n usado en curvas Omega(psi) |
| `LAMBDA_IDX_FOR_HEATMAP` | 2 (λ=8) | Lambda para el heatmap |

**Tiempo estimado:** ~2–4 horas con 100 trials × 9 psi × 3 lambda × 11 n.

### 4.7 `main/main_mo_phi_optimization.m` — ejecutar segundo

**Rol:** Encuentra automáticamente el psi óptimo usando 3 métodos de búsqueda:
Grid Search, Golden Section Search (GSS) y Simulated Annealing (SA).

---

## 5. Métodos de optimización de ψ

### 5.1 Grid Search (referencia exhaustiva)

**Método:** Evalúa F(psi) = E[Omega | psi] en una grilla logarítmica fija.

**Ventaja:** Simple, visualizable directamente.  
**Desventaja:** Costoso si se quieren muchos puntos.  
**Complejidad:** O(n_points × n_trials)

### 5.2 Golden Section Search (GSS)

**Método:** Búsqueda eficiente para funciones unimodales. Opera en escala log(psi).
Reduce el intervalo de búsqueda con el ratio áureo phi ≈ 0.618 en cada iteración.

**Justificación:** Si F(psi) es estrictamente unimodal en escala log (hipótesis razonable),
GSS converge en O(log(1/eps)/log(phi)) evaluaciones, mucho más eficiente que grid search.

**Referencia:** Kiefer, J. (1953). Sequential minimax search for a maximum.
*Proceedings of the American Mathematical Society*, 4(3), 502-506.

**Convergencia típica:** < 25 evaluaciones para tolerancia 1e-4.

### 5.3 Simulated Annealing (SA)

**Método:** Metaheurística que acepta soluciones peores con probabilidad exp(-delta/T),
donde T decrece geométricamente (cooling schedule). Opera en escala log(psi).

**Justificación:** La función F(psi) es estocástica (evaluada sobre topologías aleatorias),
lo que la hace ruidosa. SA es robusto al ruido y puede escapar de falsos mínimos locales
causados por la varianza Monte Carlo.

**Referencia:** Kirkpatrick, S., Gelatt, C. D., & Vecchi, M. P. (1983).
Optimization by Simulated Annealing. *Science*, 220(4598), 671-680.

**Parámetros del cooling schedule:**
- T0 = 5.0 (en unidades de Omega, ya que delta/T determina la probabilidad de aceptación)
- alpha = 0.85 (enfriamiento geométrico)
- T_min = 0.01 (criterio de parada térmica)

---

## 6. Resultados esperados e interpretación

### 6.1 Tipos de resultados posibles

**Caso A — psi_auto es óptimo o casi óptimo:**
- Las curvas Omega(psi) muestran el mínimo en torno a psi_auto
- Valida la elección heurística del paper NG-RES 2021
- Diferencia best-MO vs MO-auto es pequeña (<5%)

**Caso B — existe psi* >> psi_auto:**
- El paper subestima la penalización necesaria
- Hay margen de mejora sin cambiar la estructura del algoritmo
- Motivaría recomendar psi* en futuras implementaciones

**Caso C — existe psi* << psi_auto:**
- El paper sobrepenaliza → MO converge demasiado rápido a un mínimo subóptimo

**Caso D — la curva Omega(psi) es plana:**
- MO es robusto a psi en el rango evaluado → buena noticia para la práctica

### 6.2 Cómo usar los resultados en el magister

1. **Figura best/worst vs n:** Mostrar que MO+ACO supera best-MO → evidencia de que
   ACO genuinamente mejora el algoritmo más allá de lo que psi puede lograr.

2. **Curva Omega(psi):** Justificar la robustez (o no) del psi_auto del paper.

3. **Heatmap:** Mostrar regiones del espacio (psi, n) donde MO es mejor → guía práctica.

---

## 7. Estimaciones de costo computacional

| Experimento | Configuración | Trials | Tiempo estimado |
|-------------|--------------|--------|-----------------|
| main_mo_phi (prototipo) | 9 psi × 3 lambda × 11 n × 10 trials | 2970 | ~20 min |
| main_mo_phi (paper completo) | 9 psi × 3 lambda × 11 n × 100 trials | 29700 | ~3–4 horas |
| main_mo_phi_optimization | Grid(12) + GSS(~25) + SA(50) × 20 trials | ~1740 | ~15 min |

**Recomendación:** Ejecutar primero `main_mo_phi_optimization` con `NUM_TESTS_OPT=10`
para verificar el código y obtener una estimación del psi óptimo, luego ejecutar
`main_mo_phi` con 100 trials para resultados de publicación.

---

## 8. Referencias

1. Gutiérrez Gaitán, M., Almeida, L., Santos, P. M., & Yomsi, P. M. (2021). EDF scheduling and minimal-overlap shortest-path routing for real-time TSCH networks. *NG-RES 2021*. Schloss Dagstuhl.

2. Kiefer, J. (1953). Sequential minimax search for a maximum. *Proceedings of the American Mathematical Society*, 4(3), 502-506.

3. Kirkpatrick, S., Gelatt, C. D., & Vecchi, M. P. (1983). Optimization by Simulated Annealing. *Science*, 220(4598), 671-680.

4. Stützle, T., & Hoos, H. H. (2000). MAX-MIN Ant System. *Future Generation Computer Systems*, 16(8), 889-914.

5. Dorigo, M., & Stützle, T. (2004). *Ant Colony Optimization*. MIT Press.
