# Auditoría y respuesta al feedback del 22-07

**Objetivo:** software de tesis de magíster, publicable en *SoftwareX*. Requisito transversal: fidelidad académica al paper baseline (NG-RES 2021, `paper.md`) y equivalencia demostrable con la implementación MATLAB de referencia (`mo_sp_pt1`).

**Método de la auditoría:** lectura directa del código de las tres bases —MATLAB de referencia (`mo_sp_pt1`), backend Python (`software/backend`) y frontend (`software`)— comparada contra el paper y contra lo que pide el profesor. No se toma la documentación (`documentation/*.md`, `context.md`) como verdad: es aspiracional; se reporta lo que el **código realmente hace**.

Leyenda de estado:
- ✅ **Hecho** — implementado y fiel.
- 🟡 **Parcial** — existe pero incompleto o con desviación.
- ❌ **Falta** — no existe.
- 🐞 **Bug de fidelidad** — existe pero es incorrecto respecto al paper.

---

## Hallazgo transversal (leer primero)

El software Python **no es una traducción 1:1 del MATLAB**: en varios puntos es *más completo* que la referencia, y en otros *se desvía*. Esto importa para el punto 2.9 (validación de equivalencia).

- **El MATLAB de referencia NO calcula schedulability en su pipeline principal.** En `run_single_trial_ngres.m` y `run_single_trial_vs_mo.m` toda la parte de flujos/demand/EDF está comentada y forzada a `0`. Solo la comparación de gateways (`run_single_trial_gateway.m`) computa demand/conflict/schedulability de verdad. → La "réplica del paper" en MATLAB reporta overlaps y hops reales, pero **schedulability trivialmente 0** salvo en un experimento.
- **El Python SÍ calcula schedulability** (test analítico DBF + grilla TSCH concreta). En eso *supera* al MATLAB.
- Pero el Python **se desvía del paper** en tres cosas que el MATLAB sí respeta: usa Erdős–Rényi en vez de `sprand`, elige gateway por **grado** en vez de **betweenness**, y (como el MATLAB) evalúa schedulability en **una sola ventana ℓ=H** en vez de ∀ℓ.

Conclusión: la equivalencia MATLAB↔Python **aún no está validada** y, de hecho, hoy **divergen**. Esto es lo primero que hay que resolver para publicar.

---

# PARTE 1

## 1.1 — Topología: ¿`sprand`? / permitir 10–100–1000 topologías

**Qué dijo el profe:** ¿Usas `sprand` de MATLAB para la matriz de adyacencia? La idea es que el cálculo de desempeño permita 10, 100 o hasta 1000 topologías diferentes.

**Paper (`paper.md` §6.1):** 100 topologías; cada grafo desde una *sparse uniformly distributed random matrix* N×N con densidad Λ=λ/N; N=66; gateway = mayor **betweenness centrality**.

**MATLAB (`mo_sp_pt1`):** ✅ usa `sprand`+`spones` (`topology/generate_random_topology.m:6-10`), densidad λ/N, gateway por betweenness (`select_gateway_by_betweenness.m`), y **guarda un dataset** λ×K en `dataset_topologies.dat` con `rng(123)`.

**Python (`software/backend`):**
- Generador: **solo `nx.erdos_renyi_graph(N, λ/N)`** (`engine/topology_gen.py:13`). No hay `sprand` ni equivalente.
- Gateway: el código soporta betweenness, pero **en la práctica el backend siempre llama con `method='degree'`** (`main.py:82,155,330,691`). → **desviación del paper.**
- Múltiples topologías: ✅ el barrido `/simulation/sweep` genera N réplicas Monte Carlo (10/50/100/500/1000) con `ProcessPoolExecutor`.
- Dataset guardable: ❌ el sweep **no persiste** las topologías generadas (solo un PNG).

**Estado: 🟡 Parcial.** Múltiples topologías: sí. Pero (a) generador distinto al paper, (b) gateway por grado en vez de betweenness, (c) sin dataset reutilizable.

**Qué falta:**
1. Cambiar el gateway por defecto a **betweenness** (fiel al paper). Trivial: ya está implementado, solo hay que invocarlo.
2. Validar que Erdős–Rényi(N, λ/N) es estadísticamente equivalente a `sprand(N,N,λ/N)` —lo son en esperanza, ambos son grafos binomiales G(N,p)— y **documentarlo**; o añadir un generador "sprand-like" explícito. (Ver 2.6.)
3. Persistir el dataset de topologías del sweep (ver 2.8).

---

## 1.2 — Planificador por enlaces (pares de nodos) + half-duplex

**Qué dijo el profe:** cada slot debe asignarse por **enlaces** (tuplas/pares de nodo: 1-2, 3-4…); eso indica que por ese enlace ocurre una transmisión. Si un nodo transmite o retransmite, **no puede recibir en el mismo slot**.

**Paper (§3):** transmisiones per-slot/per-hop; transceptores half-duplex.

**MATLAB:** ❌ **no** modela slots ni enlaces ni half-duplex. La unidad es el **flujo** completo (`C_i = hops·w`); el "conflicto" es un *proxy* agregado vía la matriz de overlaps Δ_ij (nodos compartidos). No hay restricción TX/RX por slot.

**Python:** ✅ **implementado y superior al MATLAB.** `engine/scheduler.py::build_tsch_schedule` construye una grilla concreta **Timeslot × Canal** por EDF:
- Cada tarea es **un hop = un par (sender, receiver) = un enlace** (`scheduler.py:43-61`).
- **Half-duplex explícito:** `node_busy[sender]` y `node_busy[receiver]` se marcan ocupados durante la transmisión; un nodo ocupado no puede TX ni RX en ese slot (`scheduler.py:69-74,120,153-154`).
- Dependencia store-and-forward: el hop *h* solo se planifica si terminó el *h-1* (`scheduler.py:90-96`); EDF por deadline (`:104`); tope de `m` canales por slot (`:125`).

**Estado: ✅ Hecho** en Python (cumple exactamente lo que pide el profe y va más allá del MATLAB).

**Qué falta (menor / pulido):**
- El frontend dibuja la grilla como **Canal × Slot**; el enlace (sender→receiver) solo aparece en el tooltip (`TSCHScheduleGrid.tsx:208`). Considerar una vista/opción **por enlace** para hacerlo explícito como pide el profe.
- Documentar en el paper de SoftwareX que la schedulability final combina **test analítico DBF ∧ grilla concreta EDF** (`main.py:267`), y cuál es la "oficial".

---

## 1.3 — Gráfico sbf vs dbf, perspectiva temporal, agregar flujos uno a uno dinámicamente

**Qué dijo el profe:** quiere el gráfico del **sbf vs dbf**, que ofrece una perspectiva temporal del número de flujos programables; ideal que los flujos se agreguen **uno a uno actualizando dinámicamente** el gráfico, mostrando que cuando se agregan flujos que ya no son schedulables la demanda (carga) supera la oferta (capacidad).

**Python backend:** ✅ `metrics.py::compute_dbf_curves` devuelve, para cada `t ∈ [1,H]`: `contention`, `conflict`, `demand` (=suma) y `capacity` (=t). Se expone como `dbfCurves`.

**Frontend (`DemandBoundChart.tsx`):** ✅ grafica 4 curvas —"Capacidad Límite t" (la **oferta**), "Contención (DBF/m)", "Conflictos de Ruta", "Demanda Total" (la **dbf**)— sobre el eje temporal `t=1..H`, y **sombrea en rojo** los rangos donde `demand > capacity` con badge "SOBRECARGA DETECTADA".

**Estado: 🟡 Parcial (bueno pero incompleto).**

**Qué falta:**
1. ❌ **La construcción incremental flujo-por-flujo NO existe.** La curva llega completa del backend; no hay control para añadir/quitar flujos uno a uno y re-renderizar dinámicamente. **Esto es exactamente lo central del feedback** y hay que implementarlo: un slider/botón "+1 flujo" que recomputa `dbfCurves` con `n=1,2,3,…` y anima la transición, marcando el flujo `k` a partir del cual el sistema deja de ser schedulable.
2. 🟡 **La "oferta" es la recta trivial `capacity = t`.** El paper define formalmente la **sbf** (supply-bound function). No se usa la nomenclatura sbf/ff-dbf. Para fidelidad de SoftwareX: etiquetar explícitamente la curva como **sbf(ℓ)** y justificar su forma (para TDMA con normalización por m, sbf(ℓ)=ℓ; si se modela blackout/overhead, sbf tiene pendiente <1).
3. ❌ No hay una métrica explícita de **"número de flujos programables"** en función del tiempo/carga (la lectura temporal que pide el profe). Derivarla del punto 1.

---

## 1.4 — Comparación entre routings con la vista sbf/dbf

**Qué dijo el profe:** en la comparación de resultados entre enrutamientos, ver lo mismo que en 1.3; los gráficos están OK, pero agregar el sbf/dbf lo acerca al mundo real-time.

**Python:** 🟡 `/simulation/compare` ya devuelve `dbfCurves` para método A, B y baseline; `ComparisonDashboard.tsx` embebe un `DemandBoundChart` para el método inspeccionado (toggle A/B).

**Estado: 🟡 Parcial.** La vista dbf existe en comparación, pero es **de un método a la vez** (por selección A/B), no A vs B **simultáneo**.

**Qué falta:**
1. Superponer sbf/dbf de A y B en el **mismo gráfico** (o lado a lado sincronizado), para ver directamente cuál routing mantiene la demanda bajo la oferta más tiempo.
2. Heredar la dinámica incremental del 1.3 también en modo comparación.

---

## 1.5 — Figura sbf final alargada / periodo de evaluación dentro del hiperperiodo / demanda > oferta ⇒ no schedulable

**Qué dijo el profe:** la figura final sbf/sbf está muy alargada y no se distingue; debe mostrar el **periodo de evaluación dentro del hiperperiodo**; y **si en algún momento dentro del hiperperiodo la demanda supera la oferta, el sistema NO es schedulable**.

**Este es el punto de fidelidad más importante.** 🐞

**El bug:** `metrics.py::compute_schedulability_status` (`:111-132`) evalúa **una sola ventana, ℓ=H**:
```
total_demand = contention(H) + conflict(H);  schedulable ⟺ total_demand ≤ H
```
Los campos `worst_window`/`failing_window` están fijados a `H` (no hay barrido real). El MATLAB de referencia tiene **exactamente el mismo defecto** (`compute_schedulability_status.m:11-15`, solo ℓ=H), pese a que su `context.md` afirma lo contrario.

El criterio correcto del paper es **∀ℓ: dbf(ℓ) ≤ sbf(ℓ)** (equivalentemente, la demanda no debe superar la oferta en **ninguna** ventana crítica ℓ = k·T_i + D_i dentro del hiperperiodo). Con el test actual, un sistema que viola la oferta a mitad del hiperperiodo pero "cabe" en ℓ=H se reporta **schedulable por error**.

**Contradicción interna:** `compute_dbf_curves` **sí** barre `t∈[1,H]` y el frontend **sí** sombrea las sobrecargas intermedias. Es decir: el gráfico dice "SOBRECARGA" pero el booleano `is_schedulable` puede decir "schedulable". **Ambos deben concordar.**

**Estado: 🐞 Bug de fidelidad (crítico).**

**Qué falta / arreglo:**
1. Reescribir `compute_schedulability_status` para evaluar **todas las ventanas críticas** (o todo `t∈[1,H]`, que ya se calcula en `compute_dbf_curves`) y declarar no-schedulable si en **cualquier** `t` se cumple `demand(t) > sbf(t)`. Reportar el **primer** `t` infractor como `failing_window` real.
2. Hacer que el booleano de status se derive de la **misma** serie que grafica el frontend (fuente única de verdad).
3. Sobre la figura "alargada": es un problema de UI/escala con H grande. Opciones: (a) recortar el eje X hasta un poco después del primer punto crítico; (b) zoom/brush interactivo; (c) marcar con línea vertical el hiperperiodo y el primer instante de sobrecarga. Mostrar explícitamente el **periodo de evaluación = hiperperiodo H = lcm(T)** (ver nota sobre H abajo).

---

# PARTE 2

## 2.6 — Generadores NetworkX / elegir el tipo de aleatoriedad

**Qué dijo el profe:** Python está bien; la única salvedad es la formalidad de `sprand`. NetworkX ofrece estos formalismos (y tiene paper asociado). Sugiere que el simulador **permita elegir el tipo de aleatoriedad** según los generadores disponibles (ver `python-top.md`, punto 4: erdős-rényi, watts-strogatz, barabási-albert, random_lobster…).

**Python:** 🟡 usa NetworkX (bien) pero **solo `erdos_renyi_graph`**, sin opción de elegir.

**Estado: 🟡 Parcial.**

**Qué falta:**
1. Exponer un **selector de generador** en la config (backend + UI): `erdos_renyi` (actual, ≈ sprand), `watts_strogatz` (small-world), `barabasi_albert` (scale-free), `random_geometric` (redes espaciales, muy realista para WSAN), y opcional `regular`/`sprand-like`.
2. **Seed reproducible** expuesta como parámetro (hoy `topology_gen.py` usa el RNG global sin semilla → no reproducible; el MATLAB sí fija `rng`). Requisito de SoftwareX.
3. Documentar las propiedades formales de cada generador y **citar el paper de NetworkX** (Hagberg, Schult & Swart, 2008) en el manuscrito.

---

## 2.7 — Interactividad online: 1 topología, varios flujos, 1 o varios gateways

**Qué dijo el profe:** sí a la interactividad online para 1 topología, varios flujos, 1 o varios gateways.

**Python/Frontend:**
- 1 topología online: ✅ (`/topology/generate` + `/simulation/run`).
- Varios flujos: ✅ (sensores configurables = flujos).
- 1 gateway: ✅ (auto por centralidad, o manual por click).
- **Varios gateways: ❌ placeholder.** `ParameterPanel.tsx:1330-1336` avisa "Multi-gateway no soportado… se simulará con el gateway por defecto". El backend Python siempre usa un `int` como gateway único. (El MATLAB `mo_sp_pt2` y la doc `multigateway.md` describen multi-gateway con clustering NJW, pero **eso está en MATLAB, no portado a Python**.)

**Estado: 🟡 Parcial.** Falta multi-gateway funcional en el software.

**Qué falta:**
1. Portar el multi-gateway de `mo_sp_pt2` (MATLAB) al backend Python: clustering espectral NJW → gateways locales por centralidad de subgrafo → routing MO-MG (rutas a gateway local, sin penalizar el gateway) → schedulability multi-gateway normalizada.
2. Activar el modo `multi` en la UI (ya está tipado en `types.ts:99`).

---

## 2.8 — Módulo "investigación" offline: dataset guardable + gráficos resumen

**Qué dijo el profe:** 10/100 topologías es para **offline**: ejecutar una vez, generar un **dataset guardable**, y sobre ese dataset (sin rehacer todo) extraer gráficos que resuman el desempeño. Un módulo "investigación". Preliminar hasta 10; 30/50/100 es lo común y el mínimo para robustez publicable; 1000 posible pero en servidor.

**Python/Frontend:**
- Pestaña "Investigación" con barrido Monte Carlo (10/50/100/500/1000 réplicas), paralelizado, con gráficos interactivos + PNG estilo paper (300 DPI) + export CSV: ✅.

**Estado: 🟡 Parcial (bueno pero falta lo esencial que pide el profe).**

**Qué falta:**
1. ❌ **Persistir el dataset.** Hoy el sweep **regenera todo cada vez** y solo guarda un PNG; no guarda las topologías ni los resultados crudos. El profe pide explícitamente "un dataset guardable y que **sobre ese dataset** se puedan extraer gráficos". → Guardar (DB/disco): topologías generadas + parámetros + resultados por réplica, con un `dataset_id`; y un modo **"cargar dataset → re-plotear/re-analizar"** sin recomputar.
2. ❌ **Eje X = número de flujos `n`.** El sweep solo varía `N`, `lambda`, `channels` (`SweepConfigModel`). Pero el eje X principal del paper es **n ∈ [2,22]** (Figs. 2–6). Añadir `n` como `sweep_param`.
3. 🟡 Reproducibilidad del dataset (seed por réplica) para que sea auditable/citable.

---

## 2.9 — Validar equivalencia Python ↔ MATLAB

**Qué dijo el profe:** si ya está validado que los algoritmos de Python son equivalentes a los de MATLAB, no hay problema en cambiar a Python.

**Estado: ❌ No validado, y hoy divergen.** No existe ninguna suite de comparación cruzada. Divergencias detectadas:
- Gateway: Python **grado** vs MATLAB **betweenness**.
- Topología: Python **erdős-rényi** vs MATLAB **sprand** (equivalentes en teoría, sin validar).
- Schedulability: MATLAB la **stubbea a 0** en el pipeline principal; Python la calcula. → No comparables tal cual.
- Ambos: test de ventana única ℓ=H (mismo bug), y sin ff-dbf real.

**Qué falta (requisito para publicar):**
1. Suite de **validación cruzada**: mismas semillas → comparar Ω (overlaps), hops promedio y schedulability entre MATLAB y Python, con tolerancias, sobre un conjunto de topologías fijo.
2. Documento de equivalencia (tabla método×métrica) para el manuscrito.
3. Congelar las desviaciones (betweenness, generador, ∀ℓ) **antes** de validar.

---

# Auditoría de fidelidad académica (para SoftwareX)

Problemas de fidelidad al paper que trascienden el feedback y **deben** resolverse para publicar:

| # | Problema | Dónde | Impacto |
|---|----------|-------|---------|
| F1 | Schedulability en ventana única ℓ=H (debe ser ∀ℓ) | `metrics.py:111`; MATLAB igual | **Crítico** — decisión de schedulability incorrecta |
| F2 | Sin **sbf** real (solo `capacity=t`) ni nomenclatura sbf/ff-dbf | `metrics.py:149` | Alto — el paper la define formalmente |
| F3 | Usa **dbf** clásica, no **ff-dbf** (forced-forward) | `metrics.py:57` | Medio — el paper usa ff-dbf; documentar o implementar |
| F4 | Gateway por **grado**, no **betweenness** | `main.py` (siempre `degree`) | Alto — desviación explícita del paper |
| F5 | **H** es input, no `lcm(T)` | `SimConfigModel.H` | Medio — el paper define H=lcm(T) |
| F6 | Sin **seed** reproducible en generación de topología | `topology_gen.py` | Alto — reproducibilidad es requisito SoftwareX |
| F7 | Dos mecanismos de schedulability (analítico ∧ grilla) sin especificar el oficial | `main.py:267` | Medio — documentar |
| F8 | Equivalencia MATLAB↔Python no validada | — | **Crítico** para publicar |

---

# Plan de mejora priorizado

### P0 — Fidelidad crítica (bloquea publicación)
1. **F1 / punto 1.5:** reescribir `compute_schedulability_status` → barrido ∀ℓ (ventanas críticas o `t∈[1,H]`), primer `t` infractor real, y **una sola fuente de verdad** compartida con el gráfico.
2. **F4 / punto 1.1:** gateway por **betweenness** por defecto (ya implementado; solo invocarlo).
3. **F5:** calcular **H = lcm(T)** de los periodos realmente generados.
4. **F6 / punto 2.6:** exponer **seed** reproducible en toda la generación aleatoria.
5. **F8 / punto 2.9:** suite de validación cruzada MATLAB↔Python + documento de equivalencia.

### P1 — Cierre del feedback
6. **Punto 1.3:** construcción **incremental flujo-por-flujo** del sbf/dbf con actualización dinámica y marca del flujo crítico.
7. **Punto 2.8:** **persistir el dataset** del sweep (topologías + resultados crudos + seed) y modo "cargar dataset → re-plotear".
8. **Punto 2.8:** añadir **`n` (número de flujos)** como eje de barrido.
9. **Punto 2.7:** portar **multi-gateway** (NJW + MO-MG + schedulability MG) de MATLAB a Python y activarlo en la UI.
10. **Punto 2.6:** **selector de generador** de topología (erdős-rényi / watts-strogatz / barabási-albert / random_geometric).
11. **Punto 1.4:** sbf/dbf de A vs B superpuestos en comparación.

### P2 — Fidelidad de modelo y pulido
12. **F2:** etiquetar y justificar formalmente la **sbf** (nomenclatura del paper).
13. **F3:** documentar la aproximación dbf, o implementar **ff-dbf** completo.
14. **Punto 1.2:** vista de la grilla TSCH **por enlace** (opcional) + documentar el test combinado.
15. **Punto 1.5:** UI del gráfico (zoom/brush, línea de hiperperiodo, recorte de eje) para que no salga "alargado".

---

# Resumen ejecutivo (qué tienes / qué te falta)

| Punto del feedback | Estado | Núcleo de lo que falta |
|--------------------|--------|------------------------|
| 1.1 sprand / N topologías | 🟡 | gateway→betweenness; validar ER≈sprand; dataset guardable |
| 1.2 slots por enlace + half-duplex | ✅ | (pulido) vista por enlace |
| 1.3 sbf vs dbf incremental | 🟡 | **agregar flujos uno a uno dinámicamente**; sbf real |
| 1.4 sbf/dbf en comparación | 🟡 | A vs B superpuestos |
| 1.5 figura + ∀ℓ demanda>oferta | 🐞 | **test ∀ℓ (bug), no solo ℓ=H**; UI de la figura |
| 2.6 elegir generador NetworkX | 🟡 | selector de generador + seed |
| 2.7 online 1/varios gateways | 🟡 | **multi-gateway funcional** en Python |
| 2.8 investigación offline + dataset | 🟡 | **persistir dataset reutilizable**; eje n |
| 2.9 validar equivalencia | ❌ | **suite de validación cruzada** |
