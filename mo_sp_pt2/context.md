# 📘 NG-RES 2021 – Replicación en MATLAB

## Routing, Demand y Schedulability (SP, MO, MO+ACO)

---

# 🎯 Objetivo del proyecto

Replicar y extender los resultados del paper **NG-RES 2021** en MATLAB, enfocándonos en:

* Comparación de algoritmos de routing:

  * **Shortest Path (SP / Dijkstra)**
  * **Minimal Overlaps (MO)**
  * **MO + ACO (extensión propia)**

* Evaluación de:

  * Overlaps (Ω)
  * Hops (longitud de rutas)
  * Conflict demand
  * Contention demand
  * **Schedulability ratio (EDF worst-case)**

---

# 🧠 Pipeline general

```text
Topología → Gateway → Sensores → Routing → Flujos → Demand → EDF → Schedulability
```

---

# 📁 Estructura del proyecto

## 🔹 1. Configuración

### `config/config_ngres.m`

Define todos los parámetros del experimento:

* `N = 66`
* `lambdas = [4, 8, 12]`
* `n_range = [2:2:22]`
* `num_tests = 100`
* `H = 128` (hyperperiod)
* `m` (canales)
* `k_max` (MO)
* `use_topology_dataset`

---

## 🔹 2. Topología y centralidad

### `topology/generate_topology_dataset.m`

Genera dataset fijo de topologías:

* Usa:

  * `sprand`
  * `spones`
* Densidad:
  [
  \Lambda = \frac{\lambda}{N}
  ]
* Asegura conectividad
* Calcula gateway con:

  * **betweenness centrality**
* Genera:

  * 100 topologías por λ

---

### `topology/get_topology_from_dataset.m`

Carga una topología específica del dataset:

```matlab
topology = get_topology_from_dataset(cfg, lambda, idx);
```

---

### `topology/select_sensors.m`

Selecciona `n` sensores (nodos origen de tráfico):

* Excluye el gateway
* Selección aleatoria

---

# 🔹 3. Routing

## SP

### `routing/run_shortest_path_routing.m`

* Usa Dijkstra
* Minimiza hops

---

## MO

### `routing/run_minimal_overlap_routing.m`

* Parte de rutas SP
* Minimiza overlaps (Δij)
* Usa parámetro:

  * `k_max` (iteraciones)

---

## MO + ACO (extensión)

### `routing/run_mo_aco_routing.m`

Extiende MO con exploración global:

* Genera múltiples rutas candidatas
* Construye soluciones completas (todas las rutas)
* Evalúa overlap global
* Usa heurística tipo ACO:

  * exploración
  * selección probabilística

---

### Idea clave MO+ACO:

> MO optimiza localmente, ACO busca combinaciones globales mejores

---

# 🔹 4. Métricas de routing

### `metrics/compute_total_overlaps.m`

Calcula:

[
\Omega = \sum_{i<j} \Delta_{ij}
]

---

### `metrics/compute_pairwise_overlap_matrix.m`

Matriz Δᵢⱼ de nodos compartidos

---

### `metrics/compute_average_hops.m`

Promedio de longitud de rutas

---

# 🔹 5. Modelado de flujos

### `flows/build_flow_set.m`

Cada flujo:

[
f_i = (C_i, D_i, T_i)
]

Donde:

* ( C_i = \text{hops} \cdot w )
* ( T_i = 2^\eta )
* ( D_i = T_i ) (implicit deadlines)

---

### `flows/generate_periods_harmonic.m`

Genera períodos:

```text
T ∈ {16, 32, 64, 128}
```

---

# 🔹 6. Demand (modelo NG-RES)

Separación clave del paper:

```text
Total demand = Contention + Conflict
```

---

## 🔸 Contention demand

### `metrics/compute_contention_demand_window.m`

[
\text{contention}(\ell) = \frac{\sum_i \text{dbf}_i(\ell)}{m}
]

---

## 🔸 Conflict demand

### `metrics/compute_conflict_demand_window.m`

[
\sum_{i<j} \Delta_{ij} \cdot \max\left(
\left\lceil \frac{\ell}{T_i} \right\rceil,
\left\lceil \frac{\ell}{T_j} \right\rceil
\right)
]

---

# 🔹 7. EDF y schedulability

## 🔸 Ventanas críticas

### `metrics/generate_sched_windows.m`

[
\ell = kT_i + D_i
]

---

## 🔸 DBF (Demand Bound Function)

### `metrics/compute_edf_dbf_window.m`

[
\text{dbf}_i(\ell) =
\max\left(0, \left\lfloor \frac{\ell - D_i}{T_i} \right\rfloor + 1 \right) \cdot C_i
]

---

## 🔸 Schedulability final

### `metrics/compute_schedulability_status.m`

[
\forall \ell:\quad
\text{contention}(\ell) + \text{conflict}(\ell) \le \ell
]

---

## 🔥 Interpretación

> El sistema es schedulable si en ninguna ventana crítica la demanda excede el tiempo disponible.

---

# 🔹 8. Experimentos

### `experiments/run_single_trial_ngres.m`

Ejecuta:

* SP
* MO
* MO+ACO (si se usa)

Calcula:

* overlaps
* hops
* demand
* schedulability

---

### `experiments/run_experiment_suite_ngres.m`

Barrido completo:

* λ ∈ {4,8,12}
* n ∈ [2..22]
* 100 topologías

---

### `experiments/run_experiment_suite_schedulability.m`

Calcula:

* schedulability vs density
* schedulability vs channels

---

# 🔹 9. Visualización

### `plots/plot_*`

Genera gráficos:

* overlaps
* hops
* conflict demand
* contention demand
* schedulability

---

# 🔹 10. Main

### `main/main_ngres_replication.m`

Orquesta todo:

```matlab
generate_topology_dataset
run_experiments
plot_results
```

---

# 🚀 MO vs MO+ACO (extensión)

## Objetivo

Mejorar MO usando exploración global

---

## Funcionamiento

1. Genera múltiples rutas por flujo
2. Construye soluciones completas
3. Evalúa overlap global
4. Selecciona mejor combinación

---

## Ventajas

* Reduce overlaps en casos complejos
* Mejora schedulability en alta carga

---

## Desventajas

* Mayor costo computacional
* No siempre mejora (MO ya es fuerte)

---

# ⚠️ Consideraciones importantes

## ✔ Lo que es fiel al paper

* Generación de topologías (sprand)
* Gateway por centralidad
* Separación contention/conflict
* Uso de EDF
* Modelado de flujos

---

## ⚠️ Aproximaciones

* No se implementa FFDBF-WIN completo
* No se usan offsets φᵢ
* Se usa DBF estándar EDF

---

# 🎯 Conclusión

El proyecto:

* Replica correctamente NG-RES
* Implementa EDF worst-case realista
* Extiende con MO+ACO
* Permite comparar múltiples estrategias de routing

---

# 📌 Objetivo futuro

* Incorporar offsets φᵢ
* Implementar FFDBF más completo
* Integrar deadlines variables
* Evaluar modelos ML para routing

---

# 🔥 Frase resumen

> “The system evaluates schedulability under EDF by separating contention and conflict demand over multiple time windows, comparing routing strategies SP, MO, and MO+ACO.”

---
