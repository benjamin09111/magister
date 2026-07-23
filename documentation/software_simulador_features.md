# Características y Módulo de Experimentos del Simulador 6TiSCH (NG-RES)

Este documento detalla las características implementadas en el simulador interactivo multi-objetivo 6TiSCH para la tesis de magíster, incluyendo el análisis paramétrico, la comparación de métodos, la fijación del parámetro de penalización de colisiones $\psi$, las correcciones de fidelidad académica realizadas tras el feedback del profesor guía (22-07), y la infraestructura de calidad/publicación agregada para el objetivo de someter el software a **SoftwareX**.

**Este es el documento de referencia para redactar el paper de SoftwareX.** Cada sección cita el archivo y, cuando aplica, la línea de código real que la implementa — nada aquí es aspiracional. Las secciones 1-7 documentan el estado previo al feedback del 22-07; las secciones 8 en adelante documentan las correcciones y extensiones posteriores, organizadas en dos rondas de trabajo.

**Última actualización:** 2026-07-22.

---

## Índice

1. Fijación del parámetro de penalización de enlaces ($\psi$)
2. Módulo de comparación de métodos
3. Barrido paramétrico (batch) y generador de figuras
4. Visualización de la Demand-Bound Function (DBF)
5. Nomenclatura profesional TSCH (Superframe/Hiperperíodo)
6. Multi-Gateway — diseño original (MATLAB)
7. Estructura de archivos (versión previa al 22-07)

**Ronda 1 — correcciones de fidelidad críticas y feedback del profesor (22-07):**

8. Corrección crítica: test de schedulability $\forall t \in (0,H]$
9. Reproducibilidad: sistema de semillas (seed) end-to-end
10. Selección de gateway por betweenness centrality (fidelidad al paper)
11. Hiperperíodo real $H = \mathrm{lcm}(T)$
12. Generadores de topología configurables (NetworkX)
13. Visualización incremental sbf/dbf (flujo por flujo)
14. Comparación sbf/dbf superpuesta entre algoritmos
15. Persistencia de datasets de investigación (módulo offline)
16. Multi-Gateway — port completo y funcional a Python
17. Suite de validación cruzada MATLAB ↔ Python
18. Sección "Información Técnica" y FAQ en el software

**Ronda 2 — infraestructura de calidad para publicación (SoftwareX):**

19. Legibilidad del gráfico sbf/dbf (zoom/brush)
20. Suite de tests automatizados (pytest) e integración continua (CI)
21. Validación estadística de generadores de topología (test de Kolmogorov-Smirnov)
22. Metadatos de publicación: LICENSE, CITATION.cff, README, comparación con software existente
23. Desviaciones conocidas y trabajo futuro
24. Estructura de archivos actualizada (completa)

---

## 1. Fijación del Parámetro de Penalización de Enlaces ($\psi$)

El algoritmo de enrutamiento **Minimal Overlap (MO)** centralizado penaliza dinámicamente el peso de los enlaces incidentes a nodos congestionados (solapados) en cada iteración $k$ de acuerdo con la regla:

$$w_k(u,v) = w_0(u,v) + \delta_{u,v} \cdot \psi$$

Donde:
*   $w_k(u,v)$ es el peso del enlace en la iteración $k$.
*   $\delta_{u,v}$ representa el grado de solapamiento del enlace (colisiones de flujos).
*   $\psi$ es el factor de penalización de enrutamiento.

### Justificación de la Constante $\psi = 0.0265$
En la formulación original de la literatura (NG-RES), el factor de penalización se calculaba de forma dinámica en base al grado promedio y tamaño de la red:

$$\psi_{\mathrm{auto}} = \frac{\bar{d}}{N}$$

Sin embargo, el análisis de optimización bayesiana realizado en secciones previas demostró que este cálculo dinámico no conduce a las mejores tasas de programabilidad del planificador TSCH. El barrido paramétrico y los experimentos determinaron de manera consistente que el valor óptimo que maximiza la tasa de éxito de scheduling (Schedulability Ratio) a través de múltiples densidades es una constante fija:

$$\psi^* = 0.0265$$

**Implementación en el Software:**
Se ha establecido el valor por defecto $\psi = 0.0265$ tanto en los endpoints de simulación individual (`/simulation/run` y `/simulation/compare`) como en el barrido paramétrico (`/simulation/sweep`) — ver `software/backend/main.py` (`psi = config.mo_psi if config.mo_psi is not None else 0.0265`). El valor es **configurable por el usuario** (campo `mo_psi`), pero $0.0265$ es el default que replica las condiciones óptimas reportadas en el análisis previo.

---

## 2. Módulo de Comparación de Métodos (Simulación Individual)

El simulador cuenta con una interfaz de **Comparación de Métodos** dentro del panel lateral izquierdo de enrutamiento que permite contrastar el rendimiento de dos algoritmos de forma simultánea en la misma topología de red.

### Lógica de Ejecución Sincronizada
Al hacer clic en "Iniciar Simulación" en modo comparación, la plataforma envía una petición POST al endpoint `/simulation/compare` con el grafo cargado. El backend realiza las siguientes tareas de forma secuencial y bajo idénticas condiciones:
1.  Genera una lista reproducible de flujos de sensores y asigna sus propiedades periódicas ($T_i, D_i$) usando una **semilla explícita compartida** por ambos métodos (ver sección 9 — antes del 22-07 la semilla se derivaba solo de N/sensors_count/λ, sin exponerse ni poder fijarse explícitamente).
2.  Ejecuta el **Método A** (ej: Shortest Path como Baseline de la literatura).
3.  Ejecuta el **Método B** (ej: Minimal Overlap optimizado con $\psi = 0.0265$).
4.  Calcula métricas agregadas (solapamientos totales, saltos promedio, programabilidad TSCH) y el schedule TSCH para cada uno.

### Visualización y Dashboard de Resultados
*   **Cuadro de Métricas Lado a Lado:** Compara numéricamente los resultados de ambos métodos y calcula automáticamente los porcentajes de mejora en reducción de overlaps y longitud de rutas (hops).
*   **Gráficos Agrupados (Recharts):** Renderiza barras agrupadas por sensor para comparar visualmente los solapamientos individuales y los saltos acumulados en la ruta de cada nodo sensor para ambos algoritmos.
*   **Inspección Sincronizada del Planificador TSCH:** Tanto el grafo de Cytoscape como los visualizadores de la cuadrícula Gantt y la tabla de flujos se adaptan de inmediato al método seleccionado por el usuario en las pestañas de visualización rápida `[Método A] [Método B]`. Esto permite inspeccionar la distribución del espectro temporal y de canales para ambos algoritmos sin perder el contexto espacial del grafo.
*   **(Nuevo, sección 14) Gráfico sbf/dbf superpuesto:** ambos métodos se grafican sobre la misma línea de oferta.

---

## 3. Barrido Paramétrico (Simulaciones por Lote) y Generador de Figuras

La pestaña de **Investigación** (antes "Barrido Paramétrico") permite evaluar la escalabilidad y robustez de los algoritmos de enrutamiento frente a variaciones sistemáticas de la red, promediando métricas a lo largo de múltiples réplicas independientes para eliminar el sesgo de topologías particulares.

### Configuración del Barrido y Paralelismo de Alto Rendimiento
El usuario puede parametrizar el experimento definiendo:
*   **Variable Eje X (Barrido):** Variar el **número de flujos** ($n$, eje principal del paper, `sweep_param='n'`, agregado en la Ronda 1 — antes no existía), la escala de la red ($N$), densidad de la red ($\lambda \in \{4, 8, 12\}$) o canales TSCH disponibles ($m$).
*   **Rango de Variación:** Valores de inicio, fin y paso de incremento.
*   **Réplicas de Monte Carlo (por punto):** Permite configurar corridas estadísticas en valores discretos predefinidos: **10, 50, 100 (Recomendado), 500 o 1000 réplicas (Máxima Suavidad / Calidad de Publicación)**.
*   **Algoritmos a Evaluar:** Selección múltiple de algoritmos a evaluar comparativamente (SP siempre se incluye como baseline de referencia).
*   **(Nuevo, sección 12) Generador de topología** y **método de centralidad del gateway**, configurables también para el barrido.
*   **(Nuevo, sección 15) Guardar dataset:** checkbox que persiste el resultado agregado del barrido en SQLite.

**Paralelización Multinúcleo (Evitando timeouts):**
Cuando el usuario selecciona una cantidad elevada de réplicas ($\ge 100$), el tiempo de ejecución secuencial en Python superaría el límite de timeout del navegador. Para mitigar esto, el backend implementa una arquitectura en paralelo utilizando un `ProcessPoolExecutor` de Python.
*   El backend distribuye las $N_{\mathrm{puntos}} \times N_{\mathrm{réplicas}}$ simulaciones independientes en múltiples procesos del sistema local.
*   Esto divide el tiempo de cómputo de manera lineal según el número de núcleos/hilos del hardware de CPU del usuario, permitiendo generar gráficos suaves ("smooth") de alta resolución en pocos segundos.
*   **Reproducibilidad del barrido (sección 9):** cada réplica usa una semilla determinística derivada de una semilla base: `replica_seed = base_seed + point_idx * 100_000 + rep` (`main.py::run_sweep_simulation`), en el mismo espíritu que el esquema `seed_val = trial_idx + 1000*lambda + 100000*n` de la referencia MATLAB (`run_single_trial_ngres.m`).

---

## 4. Visualización de la Demand-Bound Function (DBF) y Depuración EDF

Para la evaluación formal de la programabilidad en tiempo real (schedulability) bajo planificación EDF, se ha integrado la visualización de la **oferta (supply-bound function, sbf) vs. demanda (demand-bound function, dbf)**.

### Base Matemática y Concepto
Para que un conjunto de flujos sea programable en TSCH, la demanda acumulada de transmisión de los trabajos activos en **toda** ventana de tiempo de tamaño $t$ dentro del hiperperíodo no debe superar el tamaño físico de la propia ventana temporal:

$$\forall t \in (0, H]:\quad dbf(t) = Contention(t) + Conflict(t) \;\le\; sbf(t) = t$$

> **Corrección de fidelidad crítica (ver sección 8):** antes del 22-07, tanto este software como la referencia MATLAB evaluaban esta condición **solo en $t=H$**, no para todo $t$. Esto es un bug de fidelidad respecto al paper, corregido en la Ronda 1.

1.  **Demanda por Contención ($Contention(t)$):**
    $$Contention(t) = \frac{dbf_{\mathrm{EDF}}(t)}{m}, \qquad dbf_{\mathrm{EDF}}(t) = \sum_i \max\left(0, \left\lfloor \frac{t - D_i}{T_i} \right\rfloor + 1\right) \cdot C_i$$
    Representa la carga agregada de canalización normalizada por la cantidad de canales TSCH disponibles ($m$).
2.  **Demanda por Conflictos de Ruta ($Conflict(t)$):**
    $$Conflict(t) = \sum_{i<j,\ \Delta_{ij}>0} \Delta_{ij} \cdot \max\left(\left\lceil \frac{t}{T_i}\right\rceil, \left\lceil \frac{t}{T_j}\right\rceil\right)$$
    Representa las interferencias espaciales que surgen cuando flujos concurrentes comparten nodos intermedios hacia el gateway (restricción half-duplex).

Implementado en `software/backend/engine/metrics.py::compute_contention_demand_window`, `compute_conflict_demand_window`, `compute_dbf_curves`.

### Implementación Visual Interactiva (`DemandBoundChart`)
El gráfico interactivo del simulador dibuja dinámicamente cuatro curvas a lo largo de todo el espectro temporal $t \in [1, H]$:
*   **Oferta — $sbf(t) = t$:** línea diagonal segmentada de referencia física (supply-bound function trivial de TDMA sin overhead de blackout).
*   **Demanda por Contención:** curva azul.
*   **Demanda por Conflictos:** curva amarilla.
*   **Demanda Total ($dbf(t)$):** curva morada gruesa.

**Detección Visual de Sobrecargas (Falla de Schedulability):**
Si en algún punto $t$, la curva de *Demanda Total* supera la línea diagonal de *Oferta*, la red no es programable. El componente sombrea automáticamente la ventana de tiempo infractora en color **rojo translúcido**. Esto permite al diseñador diagnosticar de forma visual inmediata la causa del fallo: si es por exceso de volumen de tráfico (contención) o por problemas de enrutamiento espacial (conflictos por overlaps).

**(Nuevo, secciones 13, 14, 19):** construcción incremental flujo-por-flujo con slider/reproducción, superposición A vs. B en modo comparación, y zoom/brush para legibilidad cuando $H$ es grande.

---

## 5. Nomenclatura Profesional TSCH (Superframe / Hiperperíodo)

Para alinear el simulador con la terminología formal de la literatura de redes industriales IEEE 802.15.4-TSCH y 6TiSCH:
*   Se renombró la vista del planificador a **Planificador TSCH (Timeslot × Canal por Superframe)**.
*   Se introdujo una nota contextual explicando que el hiperperíodo mínimo común múltiplo de todos los flujos de sensores ($H$ slots) sirve como la longitud periódica del **Superframe** (o *Slotframe*) de TSCH.
*   La celda activa bajo el cursor detalla el **Slot del Superframe** y los ejes horizontales muestran la grilla de canales vs. slots del superframe actual.
*   **(Nuevo, sección 11):** $H$ ahora se calcula como $\mathrm{lcm}(T)$ real de los períodos generados, no un input arbitrario del cliente.

---

## 6. Módulo Multi-Gateway — Diseño Original (MATLAB)

*(Diseño e implementación original en MATLAB, previos al 22-07. Ver sección 16 para el port completo y funcional a Python realizado en la Ronda 1, que es el que corre hoy en el simulador interactivo.)*

Para extender el simulador más allá de un único gateway fijo, se diseñó la funcionalidad **Multi-Gateway (MG)** en MATLAB (`mo_sp_pt2/`), permitiendo configurar múltiples sinks ($k \in \{1, 3, 5\}$) para dividir y paralelizar la demanda temporal de la red.

### Algoritmos y Características Clave (diseño MATLAB):
*   **Clustering Espectral NJW (Ng-Jordan-Weiss):** Particiona el grafo de conectividad de la red en $k$ subgrupos.
*   **Centralidades de Clúster:** Para cada clúster, se calcula la centralidad local (Grado, Betweenness, Closeness o Eigenvector) y se designa al nodo con mayor relevancia local como gateway exclusivo de dicho clúster.
*   **Adaptación de la Heurística MO-MG:** El enrutamiento Minimal Overlaps (MO) optimiza los caminos dirigidos a gateways locales, excluyendo la penalización de solapamientos en los gateways para evitar penalizaciones artificiales en los últimos saltos convergentes.
*   **Reuso a 3 Saltos:** El cálculo de colisiones espaciales adopta la regla de que segmentos de enlaces compartidos de longitud superior a 3 saltos no incrementan más el conflicto de canal (reuso espacial de canal).

---

## 7. Estructura de Archivos (versión previa al 22-07)

*(Sección histórica — ver sección 24 para la estructura de archivos completa y actualizada.)*

*   **Backend y Simulación Combinatoria (MATLAB & Python):**
    *   `mo_sp_pt2/config/config_mg.m`, `mo_sp_pt2/topology/njw_spectral_clustering.m`, `mo_sp_pt2/topology/select_cluster_gateways.m`, `mo_sp_pt2/routing/run_minimal_overlap_routing_mg.m`, `mo_sp_pt2/metrics/compute_schedulability_status_mg.m`, `mo_sp_pt2/main/main_multigateway.m` — diseño MG en MATLAB.
    *   `plot_multigateway_results.py` — graficador de figuras de la tesis.
    *   `software/backend/engine/metrics.py`, `software/backend/main.py`, `software/backend/models/simulation.py`.
*   **Frontend (Next.js / TypeScript):**
    *   `software/components/charts/DemandBoundChart.tsx`, `software/lib/types.ts`, `software/lib/store.ts`, `software/components/config/SweepConfigPanel.tsx`, `software/components/charts/SweepPlots.tsx`, `software/components/charts/ComparisonDashboard.tsx`, `software/components/tsch/TSCHScheduleGrid.tsx`, `software/app/page.tsx`.

---
---

# RONDA 1 — Correcciones de fidelidad y feedback del profesor (22-07)

El 22 de julio de 2026, el profesor guía entregó feedback sobre el estado del simulador (ver `feedback-2207.md` en la raíz del repositorio), que motivó una auditoría completa (`feedback-2207-auditoria.md`) y la siguiente ronda de correcciones. Todas las secciones 8-18 documentan trabajo realizado en respuesta directa a ese feedback.

## 8. Corrección Crítica: Test de Schedulability $\forall t \in (0, H]$

### El problema (bug de fidelidad)
El feedback del profesor señaló explícitamente:

> *"Veo que al final pones una figura de sbf/sbf... es importante recordar que debe mostrar el periodo de evaluación dentro del hiperperiodo, pero si dentro del hiperperiodo en algún momento la demanda supera la oferta, eso hace que el sistema no sea schedulable."*

Al auditar el código se confirmó que `compute_schedulability_status` (tanto en el backend Python **como en la referencia MATLAB** `mo_sp_pt1/metrics/compute_schedulability_status.m`) evaluaba la condición de programabilidad **solo en la ventana $t=H$**:

```python
# ANTES (bug):
is_schedulable = (contention(H) + conflict(H) <= H)
```

Esto es incorrecto respecto al paper NG-RES, que exige la condición $\forall t \in (0,H]$. Un sistema podía violar la oferta a mitad del hiperperíodo (por ejemplo, en $t=20$ de un $H=128$) y aun así reportarse como "schedulable" porque la demanda acumulada *al final* del hiperperíodo cabía dentro de $H$.

Interesantemente, la extensión multi-gateway en MATLAB (`mo_sp_pt2/metrics/compute_schedulability_status_mg.m`) **ya tenía implementado correctamente** el test $\forall t$ — evidencia independiente de que el bug era conocido/corregido parcialmente en el propio desarrollo previo, pero no se había propagado al módulo principal (`mo_sp_pt1`) ni al backend Python.

### La corrección
`software/backend/engine/metrics.py::compute_schedulability_status` fue reescrita para:
1. Evaluar la curva completa `compute_dbf_curves(flows, gateway, m, H)` para $t=1,\dots,H$.
2. Determinar `is_schedulable` como verdadero si y solo si $dbf(t) \le t$ para **todo** $t$.
3. Reportar `failing_window`: el **primer** $t$ donde la condición se viola (no solo un booleano).
4. Reportar además el **peor caso** (`worst_window`, `worst_slack`): el $t$ con menor holgura, que puede no coincidir con $t=H$.

**Garantía de consistencia (fuente única de verdad):** el booleano de schedulability y el gráfico interactivo se derivan de la **misma** serie `compute_dbf_curves`, de modo que nunca pueden contradecirse entre sí (antes de la corrección, el gráfico ya sombreaba visualmente sobrecargas intermedias que el booleano ignoraba — una inconsistencia interna real).

### Verificación empírica del bug
Se construyó un caso de prueba donde 2 flujos comparten un nodo intermedio: el test antiguo ($t=H$) reportaba `schedulable=True`, mientras que el test corregido ($\forall t$) reporta correctamente `schedulable=False` con `failing_window=1` (la demanda excede la oferta desde el primer slot debido a un conflicto de solapamiento). Este caso está encapsulado como test de regresión permanente en `software/backend/tests/test_metrics.py::TestSchedulabilityForallT`.

**Relevancia para el paper:** esta corrección es potencialmente el hallazgo más citable de la tesis — demuestra que la implementación original (MATLAB y Python) tenía un error de fidelidad respecto a la definición formal del paper, y que fue detectado y corregido mediante una suite de tests reproducible.

---

## 9. Reproducibilidad: Sistema de Semillas (Seed) End-to-End

### El problema
Antes de esta ronda, la generación de topologías usaba el generador global de `random`/NetworkX **sin semilla explícita**, haciendo que dos ejecuciones con los mismos parámetros produjeran grafos distintos. Los períodos de flujo ($T_i$) sí se derivaban de una semilla, pero calculada implícitamente a partir de `N + sensors_count + λ*100` — no expuesta al usuario ni reportada, por lo que una corrida no podía reproducirse deliberadamente.

### La solución
Se implementó un esquema de semilla explícita, propagada end-to-end:
*   `TopoConfigModel`, `SimConfigModel`, `SweepConfigModel`, `CompareConfigModel` ganan un campo `seed: Optional[int]`.
*   Si el cliente no provee semilla, el servidor dibuja una nueva vía `draw_fresh_seed()` (`software/backend/engine/topology_gen.py`, usa `random.SystemRandom()` para entropía real) y la **retorna en la respuesta**.
*   Esa semilla se usa para: `generate_random_topology(..., seed=seed)`, `select_sensors(..., seed=seed)`, la generación de períodos armónicos (`random.Random(seed)`), y se propaga como `random.seed(seed)` global antes de invocar los métodos estocásticos (MOACO, Q-Learning, SARSA), que dependen del módulo `random` global.
*   El frontend persiste la semilla devuelta en el estado (Zustand `store.ts`) tras cada corrida, de modo que ejecuciones sucesivas sobre la misma topología reutilizan el mismo conjunto de flujos — necesario para comparaciones justas entre algoritmos.

**Verificación:** tests de determinismo en `test_topology_gen.py`, `test_multigateway.py` (mismo seed ⇒ mismo grafo/clustering/gateways, byte-a-byte).

---

## 10. Selección de Gateway por Betweenness Centrality (Fidelidad al Paper)

### El problema
El backend seleccionaba el gateway por **grado máximo** (`method='degree'`) en todos los endpoints, pese a que la función `select_gateway_by_centrality` ya soportaba `betweenness`. El paper NG-RES (§3.1) define explícitamente:

> *"we further assume the gateway is the node with the highest betweenness centrality, i.e., the node if being removed, has the greatest impact on the overall network connectivity."*

Esto era una **desviación explícita y no documentada** del paper.

### La solución
*   Default cambiado a `betweenness` en `select_gateway_by_centrality` (`software/backend/engine/topology_gen.py`).
*   Se agregó el campo `centrality_metric` (betweenness/degree/closeness) a los modelos de configuración, seleccionable por el usuario para análisis de sensibilidad — el paper mismo (nota 3) señala que "diferentes métricas de centralidad requieren investigación adicional", por lo que exponerlo como opción (con betweenness como default fiel) es más riguroso que fijar un único método.

---

## 11. Hiperperíodo Real $H = \mathrm{lcm}(T)$

### El problema
El campo `H` era un input arbitrario del cliente (un dropdown de 64/128/256 slots), sin relación garantizada con los períodos de flujo realmente generados. El paper define:

> *"H = lcm(T), where T = {T1, T2, ..., Tn}"* (§6.1)

Si $H$ era menor que el verdadero hiperperíodo, el análisis de schedulability se truncaba incorrectamente; si era mayor, se desperdiciaba cómputo.

### La solución
Se agregó `compute_hyperperiod(T)` (`software/backend/engine/metrics.py`), que calcula `math.lcm` sobre los períodos efectivamente generados. Todos los cálculos de DBF/schedulability/scheduler TSCH usan este $H$ real, retornado en la respuesta (`SimResult.H`) — el campo `H` del cliente pasa a ser solo un valor orientativo en la UI (con tooltip actualizado explicándolo), no el valor autoritativo.

---

## 12. Generadores de Topología Configurables (NetworkX)

### El feedback
> *"Sugiero que tu simulador permita elegir el tipo de aleatoriedad basado en los generadores disponibles [de NetworkX]"*

### La solución
`generate_random_topology` (`software/backend/engine/topology_gen.py`) soporta 4 generadores seleccionables:

| Generador | Descripción | Calibración de densidad |
|---|---|---|
| `erdos_renyi` (default) | $G(N,p)$ binomial, $p=\lambda/N$ | Equivalente en distribución a `sprand`+`spones` de MATLAB |
| `watts_strogatz` | Small-world | $k$ = grado par más cercano a $\lambda$, rewiring $p=0.1$ |
| `barabasi_albert` | Scale-free (attachment preferencial) | $m = \mathrm{round}(\lambda/2)$ |
| `random_geometric` | Espacial (unit square) | Radio calibrado para $E[\text{grado}] \approx \lambda$ |

Todos pasan por el mismo paso de reparación de conectividad (idéntico al de la referencia MATLAB: unir componentes desconectadas con una arista aleatoria).

---

## 13. Visualización Incremental sbf/dbf (Flujo por Flujo)

### El feedback
> *"me gustaría ver el gráfico del sbf vs el dbf... ideal sería que se fueran agregando uno a uno, y eso fuera dinámicamente actualizando el gráfico. Esto permite mostrar que cuando se agregan flujos que ya no son schedulables, la demanda (carga) supera la oferta."*

### La solución
Nueva función `compute_incremental_dbf_series(flows, gateway, m, H)` (`metrics.py`): para $k=1,\dots,n$, calcula la curva dbf/sbf completa considerando **solo los primeros $k$ flujos**. El frontend (`DemandBoundChart.tsx`) agrega controles de reproducción (play/pause/reset + slider) que recorren $k$, mostrando:
*   La curva actualizándose en tiempo real a medida que se agregan flujos.
*   $\Omega$ acumulado en cada paso.
*   Un indicador explícito: *"Deja de ser schedulable al agregar el flujo #k"* — el primer $k$ en que el sistema deja de ser programable.

**Hallazgo interesante durante la validación:** en un caso de prueba, el sistema deja de ser schedulable ya al agregar el **segundo** flujo, porque dos rutas que comparten un nodo generan conflicto incluso en la primera ventana ($t=1$) — ilustra que el modelo de conflicto por solapamiento es sensible incluso a colisiones mínimas bajo ciertas configuraciones de período/canales.

---

## 14. Comparación sbf/dbf Superpuesta entre Algoritmos

### El feedback
> *"En la comparación de resultados entre enrutamientos, sería ideal ver lo mismo que en [el gráfico sbf/dbf]... agregar visualmente el sbf/dbf le da más cercanía al mundo real-time."*

### La solución
Nuevo componente `OverlapDemandComparisonChart.tsx`: superpone $dbf_A(t)$ y $dbf_B(t)$ de los dos métodos comparados sobre la **misma** línea de oferta $sbf(t)=t$ (válido porque `/simulation/compare` corre ambos métodos sobre la topología y el conjunto de flujos idénticos — mismo $T$/$D$/$H$). Sombrea en el color de cada método las regiones donde ese método específico sobrecarga la oferta, permitiendo ver de un vistazo cuál algoritmo mantiene la demanda bajo control por más tiempo/en más ventanas.

---

## 15. Persistencia de Datasets de Investigación (Módulo Offline)

### El feedback
> *"El caso de 10 o 100 topologías es en realidad algo para ejecutar offline, que, una vez ejecutado, permita generar un dataset guardable y que, sobre ese dataset (para no hacer todo de nuevo), se puedan extraer gráficos que resuman el desempeño. Debiera ser como tú dices, un módulo 'investigación'."*

### La solución
Antes de esta ronda, el barrido regeneraba **todo** desde cero en cada ejecución y no persistía nada (salvo un PNG de la última corrida). Se agregó:

*   **Tabla `datasets` en SQLite** (`software/backend/db/database.py`): guarda, por cada barrido, los parámetros de configuración, la semilla base, los resultados agregados por punto, y un resumen compacto por réplica (sin los grafos completos, para mantener el tamaño razonable).
*   **Endpoints:** `POST /simulation/sweep` (con `save_dataset: true`) persiste automáticamente; `GET /datasets` lista los guardados; `GET /datasets/{id}` **regenera la figura matplotlib y los gráficos interactivos sin volver a simular** (recalcula solo el ploteo desde los datos agregados ya guardados — operación barata); `DELETE /datasets/{id}` elimina.
*   **UI:** checkbox "Guardar dataset de este barrido" + nombre opcional en el panel de barrido; nueva sub-pestaña **"Datasets de Investigación"** dentro de "Guardados", con listado, carga (recalcula gráficos) y eliminación.

---

## 16. Multi-Gateway — Port Completo y Funcional a Python

### El feedback
> *"la idea es que haya cierta 'interactividad' online, para cuando hay 1 topología, varios flujos, 1 o varios gateways, etc."*

Antes de esta ronda, el modo "Multi-gateway" existía como opción en la UI pero mostraba un aviso: *"no está soportado en la simulación actual... se simulará utilizando el Gateway por defecto"*. El diseño de la sección 6 (MATLAB, `mo_sp_pt2/`) nunca se había portado a Python ni conectado al simulador interactivo.

### La solución: `software/backend/engine/multigateway.py`

**Clustering espectral NJW** (`njw_spectral_clustering(G, k)`):
1. Matriz de adyacencia densa $A$ (NumPy, sin dependencia de SciPy para el eigensolver).
2. Laplaciano normalizado simétrico: $L_{sym} = D^{-1/2}(D-A)D^{-1/2}$.
3. Los $k$ autovectores de menor autovalor vía `numpy.linalg.eigh` (equivalente a `eigs(..., 'smallestreal')` de MATLAB).
4. Normalización de filas (matriz $Y$ de NJW) + **k-means determinista** (semilla fija = 42, igual que `custom_kmeans` en `mo_sp_pt2/topology/njw_spectral_clustering.m`) para asignar etiquetas de clúster reproducibles.

**Gateway local por clúster** (`select_cluster_gateways`): nodo de mayor centralidad (betweenness/grado/closeness/eigenvector) en el **subgrafo inducido** de cada clúster.

**Asignación sensor→gateway** (`assign_sensors_to_nearest_gateway`): cada sensor se asigna al gateway de menor distancia hop-count entre los $k$ candidatos.

**Routing SP-MG / MO-MG** (`run_shortest_path_routing_mg`, `run_minimal_overlap_routing_mg`): idénticos en estructura a los de gateway único, pero:
*   $\Omega$ excluye **todos** los gateways designados (no solo uno) del conteo de solapamiento.
*   Cada sensor calcula su shortest path hacia **su propio** gateway asignado, no uno global.

**Métrica de conflicto con reuso a 3 saltos** (`metrics.py::compute_path_overlaps_factor_3hop`, `compute_pairwise_overlap_matrix_3hop`, `compute_conflict_demand_window_mg`): a diferencia del conflicto de nodo compartido usado en gateway único, para multi-gateway el conflicto se calcula sobre **segmentos de aristas compartidas contiguas**: cada segmento disjunto contribuye $\min(3, \text{longitud del segmento})$ al factor de conflicto — modela que el reuso espacial de canal hace que un segmento compartido de más de 3 saltos no siga aumentando el conflicto.

**Alcance deliberadamente limitado:** solo **SP y MO** están validados para multi-gateway (igual que la referencia MATLAB `mo_sp_pt2`); si el usuario selecciona MOACO/Q-Learning/SARSA en modo multi-gateway, el backend rechaza la petición con un error 400 explícito, en vez de improvisar un comportamiento no verificado contra ninguna referencia. La vista de comparación A/B tampoco soporta aún multi-gateway (limitación documentada, no oculta).

### Integración en la API y UI
*   `TopoConfigModel`/`SimConfigModel`/`CompareConfigModel` ganan `num_gateways` (k∈{1,3,5}), `mg_centrality_method`, y `gateways` (para fijar la partición elegida al generar la topología y reutilizarla en la simulación).
*   `/topology/generate` con `gateway_mode='multi-gateway'` devuelve una **lista** de gateways (`gateways: List[int]`) y el mapeo `gatewayForSensor`; los nodos se etiquetan `GW1`, `GW2`, ... en el grafo.
*   `ParameterPanel.tsx`: selector de $k$ (1/3/5) y método de centralidad local; el selector de algoritmo deshabilita ACO/Q-Learning/SARSA cuando el modo es multi-gateway.

---

## 17. Suite de Validación Cruzada MATLAB ↔ Python

### El feedback
> *"si ya está validado que los algoritmos de Python son equivalentes a los de MATLAB, no habría problema en cambiar a Python."*

Antes de esta ronda, esta equivalencia se **afirmaba** en la documentación pero nunca se había verificado contra la referencia MATLAB.

### La solución: `software/backend/validation/`

**Metodología de dos niveles** (evita falsos negativos por *tie-breaking* de Dijkstra, que legítimamente difiere entre MATLAB y NetworkX en grafos con múltiples caminos más cortos de igual longitud):

*   **Tier 1 (exacto, debe pasar):** se alimenta a las funciones Python las rutas **ya calculadas por MATLAB** y se exige coincidencia exacta de $\Omega$, hops, contención, conflicto y demanda total. También se corre el algoritmo MO de Python partiendo del $\Phi^0$ exacto de MATLAB (MO es determinista, sin RNG), por lo que es directamente comparable.
*   **Tier 2 (informativo):** se corre el routing SP independiente de cada lenguaje; diferencias aquí son esperables por empates de caminos y no son bugs.

**Script MATLAB** (`mo_sp_pt1/experiments/export_validation_case.m`): genera un caso fijo y sembrado ($N=66$, $\lambda=8$, $n=10$ sensores, seed=20240722), corre SP y MO de referencia, y exporta topología + rutas + métricas a `validation/matlab_case.json` (convertido a indexación 0-based para reuso directo en Python).

**Script Python** (`validate_against_matlab.py`): carga ese JSON y ejecuta la comparación de dos niveles, imprimiendo un reporte PASS/FAIL por métrica.

**Estado:** el arnés está construido y fue probado con un caso sintético (smoke test) que efectivamente detectó el bug de la sección 8 (ℓ=H vs. ∀ℓ). **Falta ejecutar el script `.m` en un MATLAB real** para obtener el caso de referencia genuino — no fue posible desde el entorno de desarrollo usado para esta ronda de trabajo.

**Desviación intencional documentada:** dado que la sección 8 corrigió el test de schedulability, la comparación de `is_schedulable` entre MATLAB (legado, ℓ=H) y Python (corregido, ∀ℓ) puede legítimamente diferir — el reporte lo distingue explícitamente como "esperado", no como discrepancia a perseguir.

---

## 18. Sección "Información Técnica" y FAQ en el Software

Se agregó una pestaña completa (`software/components/info/TechnicalInfoPanel.tsx`) con documentación técnica **dentro del software mismo**, para que cualquier persona (revisor, profesor, futuro mantenedor) pueda verificar cómo está construido sin leer el código fuente. Incluye:

*   Modelo formal (fórmulas de sbf/dbf/schedulability, con la notación exacta usada en el código).
*   Generación de topologías y reproducibilidad.
*   Algoritmos de enrutamiento implementados.
*   Módulo de investigación (barridos + datasets).
*   Multi-gateway (clustering NJW).
*   Validación cruzada MATLAB↔Python.
*   Desviaciones conocidas respecto al paper (no ocultas).
*   **Preguntas Frecuentes (FAQ):** un bloque con las preguntas del profesor reformuladas en formato P/R, y un segundo bloque con preguntas típicas de un revisor de SoftwareX (reproducibilidad, tests/CI, licencia, comparación con software existente, escalabilidad), cada una etiquetada honestamente como "Resuelto", "Parcial" o "Pendiente".

---
---

# RONDA 2 — Infraestructura de calidad para publicación (SoftwareX)

Tras completar el feedback del 22-07, se identificaron (mediante autoevaluación crítica, no feedback externo) las brechas típicas que un revisor de SoftwareX exigiría y que no formaban parte del feedback original del profesor. Registradas en `faltante.md` y ejecutadas en esta segunda ronda.

## 19. Legibilidad del Gráfico sbf/dbf (Zoom/Brush)

El feedback señalaba que la figura sbf/dbf final quedaba *"muy alargada"* e ilegible cuando $H$ es grande. Se agregó un componente `<Brush>` (Recharts) a `DemandBoundChart.tsx` y `OverlapDemandComparisonChart.tsx`:
*   Se auto-enfoca en la vecindad de la **primera sobrecarga** detectada (con padding), en vez de comprimir los $H$ puntos completos en un solo ancho.
*   Botón "Ver todo H" para volver a la vista completa.
*   Arrastrable para explorar cualquier otro tramo del hiperperíodo.
*   En el modo incremental (sección 13), el enfoque se recalcula automáticamente al avanzar el slider de flujos — mostrando dinámicamente el momento exacto en que aparece la sobrecarga.

---

## 20. Suite de Tests Automatizados (pytest) e Integración Continua (CI)

### El problema
No existía ni un solo test committeado; toda la verificación de esta tesis se había hecho mediante scripts manuales ejecutados y descartados durante el desarrollo — inaceptable para un software publicado en un journal.

### La solución
**53 tests** en `software/backend/tests/` (pytest), organizados en:

| Archivo | Qué valida |
|---|---|
| `test_metrics.py` | Hiperperíodo (lcm), overlaps (Ω), **consistencia del test ∀t** (schedulable case y overloaded case), serie incremental, regla de reuso a 3 saltos, métricas multi-gateway |
| `test_topology_gen.py` | Conectividad y determinismo de los 4 generadores, grado medio estadístico vs. teórico, selección de gateway (betweenness/grado), exclusión de sensores |
| `test_routing.py` | Validez estructural de rutas SP/MO, **MO nunca peor que SP** (propiedad central del paper, verificada sobre 10 semillas), determinismo de MO |
| `test_scheduler.py` | **Restricción half-duplex** (ningún nodo se usa dos veces en el mismo slot), límite de canales por slot, dependencia de hops dentro de un job, consistencia del flag `all_scheduled` |
| `test_multigateway.py` | Determinismo del clustering, gateways distintos, sensores excluidos de gateways, **MO-MG nunca peor que SP-MG** |

Todos los 53 tests pasan (`pytest -v`, `software/backend/pytest.ini`).

### CI (GitHub Actions)
`.github/workflows/ci.yml`: en cada push/PR que toque `software/`, corre (a) `pytest` sobre el backend, (b) `tsc --noEmit` + `npm run build` sobre el frontend. El paso `npm run lint` se ejecuta como reporte no bloqueante (`continue-on-error`), porque el proyecto tiene ~79 errores/warnings de ESLint preexistentes (principalmente `no-explicit-any` y variables no usadas) en archivos anteriores a esta fidelización — documentado como deuda técnica pendiente, no oculto.

---

## 21. Validación Estadística de Generadores de Topología (Kolmogorov-Smirnov)

### El problema
La afirmación "Erdős-Rényi de NetworkX es equivalente a `sprand` de MATLAB" se sostenía **solo matemáticamente** (ambos son grafos binomiales $G(N,p)$), nunca con datos reales.

### La solución
*   **Script MATLAB** (`mo_sp_pt1/experiments/export_topology_statistics.m`): genera $K=100$ instancias de topología con el generador de referencia (`sprand`+`spones`), exporta por instancia: secuencia de grados, densidad, conectividad, coeficiente de clustering.
*   **Script Python** (`software/backend/validation/validate_topology_statistics.py`): genera las mismas $K=100$ instancias con Erdős-Rényi, y si el archivo MATLAB existe, ejecuta un **test de Kolmogorov-Smirnov de dos muestras** (`scipy.stats.ks_2samp`) sobre las distribuciones de grado agrupadas, más comparación de densidad/clustering promedio.
*   **Estado actual:** la auto-consistencia de Python contra la expectativa teórica $G(N,p)$ pasa (grado medio, densidad y tasa de conectividad dentro de tolerancia). **La comparación cruzada real contra MATLAB está pendiente** de ejecutar el script `.m`.

---

## 22. Metadatos de Publicación: LICENSE, CITATION.cff, README, Comparación con Software Existente

Para cumplir los requisitos formales de SoftwareX:

*   **`software/LICENSE`** — Licencia MIT.
*   **`software/CITATION.cff`** — Metadatos de citación (schema `citation-file-format.org`), incluyendo referencia al paper base NG-RES 2021 (DOI `10.4230/OASIcs.NG-RES.2021.2`). Pendiente completar: DOI de Zenodo y URL del repositorio público una vez creado.
*   **`software/README.md`** — Reescrito por completo (antes era el boilerplate genérico de `create-next-app`): tabla de metadatos de código estilo SoftwareX (versión, licencia, lenguajes/herramientas, requisitos de compilación), arquitectura, instalación, quickstart, testing, reproducibilidad, fidelidad y desviaciones conocidas, limitaciones conocidas.
*   **Tabla comparativa con software similar** (README): frente al **6TiSCH Simulator** (openwsn-berkeley) y **Contiki-NG/Cooja** — contrastando enfoque (co-diseño routing+scheduling analítico vs. simulación de protocolo completo/firmware), UI interactiva, análisis de schedulability incorporado, y estudios batch con datasets persistentes. Marcada explícitamente como primer borrador para el manuscrito, a verificar y ampliar por el autor antes de someter el paper.

---

## 23. Desviaciones Conocidas y Trabajo Futuro

Documentadas explícitamente (no ocultas) para uso directo en la sección de limitaciones del paper:

1.  **dbf, no ff-dbf:** el paper usa la *forced-forward demand-bound function* (ff-dbf, de Baruah et al. 2010 y el trabajo previo del autor FF-DBF-WIN 2018). Este software (y la referencia MATLAB) usan la dbf EDF clásica. **Decisión consciente de no implementar una versión ff-dbf no verificada** sin acceso a la fórmula recursiva exacta de esas referencias — se prefirió documentar la desviación honestamente antes que fabricar una implementación con apariencia de fidelidad pero sin validar.
2.  **sbf trivial:** $sbf(t) = t$ (TDMA ideal sin overhead de blackout modelado explícitamente).
3.  **Generador de topología:** Erdős-Rényi vs. `sprand` — equivalencia matemática confirmada, validación estadística cruzada pendiente (sección 21).
4.  **Comparación multi-gateway:** la vista de comparación A/B aún no soporta multi-gateway (solo la pestaña Simulador, sección 16).
5.  **Validación cruzada MATLAB↔Python:** arnés construido y probado, pero pendiente de ejecutar contra un MATLAB real (secciones 17, 21).
6.  **Deuda de lint:** ~79 errores/warnings de ESLint preexistentes, no bloqueantes en CI, pendientes de limpieza.
7.  **Repositorio público y DOI:** pendiente crear el repositorio GitHub y archivar una release en Zenodo (requisito de SoftwareX).

---

## 24. Estructura de Archivos (Actualizada, Completa)

**Backend Python (`software/backend/`):**
*   `main.py` — Todos los endpoints HTTP (`/topology/generate`, `/simulation/run`, `/simulation/compare`, `/simulation/sweep`, `/history`, `/topologies`, `/datasets`).
*   `models/simulation.py` — Modelos Pydantic, incluyendo `ReproducibilityMixin` (seed, centrality_metric) y `MultiGatewayMixin` (num_gateways, mg_centrality_method, gateways).
*   `engine/topology_gen.py` — Generadores de topología (4 tipos), selección de gateway, selección de sensores, `draw_fresh_seed`.
*   `engine/metrics.py` — Todas las métricas: Ω, matrices de overlap, dbf/sbf, `compute_schedulability_status` (∀t), `compute_incremental_dbf_series`, hiperperíodo, y las variantes `_mg`/`_3hop` para multi-gateway.
*   `engine/multigateway.py` — Clustering NJW, selección de gateways locales, asignación sensor→gateway, routing SP-MG/MO-MG.
*   `engine/scheduler.py` — Grilla TSCH concreta (planificación por enlace, half-duplex, EDF).
*   `engine/routing_sp.py`, `routing_mo.py`, `routing_moaco.py`, `routing_qlearning.py`, `routing_sarsa.py` — Algoritmos de enrutamiento single-gateway.
*   `db/database.py` — Persistencia SQLite (history, topologies, **datasets**).
*   `validation/` — Suite de validación cruzada MATLAB↔Python (algorítmica y estadística) + `README.md` con la metodología.
*   `tests/` — Suite pytest (53 tests).
*   `requirements.txt`, `requirements-dev.txt`, `pytest.ini`.
*   `LICENSE`, `CITATION.cff`.

**Frontend Next.js/TypeScript (`software/`):**
*   `app/page.tsx` — Orquestación de pestañas y llamadas a la API.
*   `components/charts/DemandBoundChart.tsx` — sbf/dbf con slider incremental + zoom/brush.
*   `components/charts/OverlapDemandComparisonChart.tsx` — sbf/dbf superpuesto A vs B (**nuevo**).
*   `components/charts/ComparisonDashboard.tsx`, `SchedulabilityGauge.tsx` (con desglose de peor ventana), `SweepPlots.tsx`, `OverlapChart.tsx`.
*   `components/config/ParameterPanel.tsx` — Incluye selector de generador de topología, métrica de centralidad, semilla, y configuración multi-gateway (**nuevo**).
*   `components/config/SweepConfigPanel.tsx` — Incluye eje `n`, checkbox de guardar dataset (**nuevo**).
*   `components/config/SavedDatasetsList.tsx` — Listado/carga/eliminación de datasets guardados (**nuevo**).
*   `components/info/TechnicalInfoPanel.tsx` — Información técnica + FAQ (**nuevo**).
*   `components/graph/TopologyGraph.tsx` — Grafo Cytoscape (soporta múltiples gateways, sección 16).
*   `components/tsch/TSCHScheduleGrid.tsx`, `TSCHFlowTable.tsx`.
*   `lib/types.ts` — Tipos extendidos: `IncrementalDbfPoint`, `SavedDatasetSummary`, campos multi-gateway en `SimParameters`/`SimResult`.
*   `lib/store.ts` — Estado Zustand con defaults actualizados (semilla, generador, multi-gateway).
*   `README.md` — Reescrito por completo (**nuevo**).

**MATLAB (raíz del repositorio):**
*   `mo_sp_pt1/experiments/export_validation_case.m` — Exporta caso de referencia para validación cruzada algorítmica (**nuevo**).
*   `mo_sp_pt1/experiments/export_topology_statistics.m` — Exporta estadísticas de topologías para validación cruzada estadística (**nuevo**).

**CI/CD:**
*   `.github/workflows/ci.yml` — pytest + type-check + build en cada push (**nuevo**).

**Documentos de proceso (raíz del repositorio):**
*   `feedback-2207.md` — Feedback original del profesor (22-07).
*   `feedback-2207-auditoria.md` — Auditoría completa punto por punto + plan de mejora + registro de implementación (ambas rondas).
*   `faltante.md` — Brechas de nivel SoftwareX identificadas tras la Ronda 1, insumo de la Ronda 2.
*   `documentation/software_simulador_features.md` — Este documento.
