# Características y Módulo de Experimentos del Simulador 6TiSCH (NG-RES)

Este documento detalla las características implementadas en el simulador interactivo multi-objetivo 6TiSCH para la tesis de magíster, incluyendo el análisis paramétrico, la comparación de métodos y la fijación del parámetro de penalización de colisiones $\psi$.

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
Se ha establecido y fijado de forma permanente el valor de $\psi = 0.0265$ tanto en los endpoints de simulación individual (`/simulation/run` y `/simulation/compare`) como en el barrido paramétrico (`/simulation/sweep`). Esto anula el cálculo dinámico y garantiza que el simulador web replique con absoluta fidelidad las condiciones óptimas reportadas en el paper académico.

---

## 2. Módulo de Comparación de Métodos (Simulación Individual)

El simulador cuenta con una interfaz de **Comparación de Métodos** dentro del panel lateral izquierdo de enrutamiento que permite contrastar el rendimiento de dos algoritmos de forma simultánea en la misma topología de red.

### Lógica de Ejecución Sincronizada
Al hacer clic en "Iniciar Simulación" en modo comparación, la plataforma envía una petición POST al endpoint `/simulation/compare` con el grafo cargado. El backend realiza las siguientes tareas de forma secuencial y bajo idénticas condiciones:
1.  Genera una lista reproducible de flujos de sensores y asigna sus propiedades periódicas ($T_i, D_i$) usando una semilla fija basada en los parámetros globales de la red.
2.  Ejecuta el **Método A** (ej: Shortest Path como Baseline de la literatura).
3.  Ejecuta el **Método B** (ej: Minimal Overlap optimizado con $\psi = 0.0265$).
4.  Calcula métricas agregadas (solapamientos totales, saltos promedio, programabilidad TSCH) y el schedule TSCH para cada uno.

### Visualización y Dashboard de Resultados
*   **Cuadro de Métricas Lado a Lado:** Compara numéricamente los resultados de ambos métodos y calcula automáticamente los porcentajes de mejora en reducción de overlaps y longitud de rutas (hops).
*   **Gráficos Agrupados (Recharts):** Renderiza barras agrupadas por sensor para comparar visualmente los solapamientos individuales y los saltos acumulados en la ruta de cada nodo sensor para ambos algoritmos.
*   **Inspección Sincronizada del Planificador TSCH:** Tanto el grafo de Cytoscape como los visualizadores de la cuadrícula Gantt y la tabla de flujos se adaptan de inmediato al método seleccionado por el usuario en las pestañas de visualización rápida `[Método A] [Método B]`. Esto permite inspeccionar la distribución del espectro temporal y de canales para ambos algoritmos sin perder el contexto espacial del grafo.

---

## 3. Barrido Paramétrico (Simulaciones por Lote) y Generador de Figuras

La pestaña de **Barrido Paramétrico** permite evaluar la escalabilidad y robustez de los algoritmos de enrutamiento frente a variaciones sistemáticas de la red, promediando métricas a lo largo de múltiples réplicas independientes para eliminar el sesgo de topologías particulares.

### Configuración del Barrido y Paralelismo de Alto Rendimiento
El usuario puede parametrizar el experimento definiendo:
*   **Variable Eje X (Barrido):** Variar la escala de la red ($N$), densidad de la red ($\lambda \in \{4, 8, 12\}$) o canales TSCH disponibles ($m$).
*   **Rango de Variación:** Valores de inicio, fin y paso de incremento.
*   **Réplicas de Monte Carlo (por punto):** Permite configurar corridas estadísticas en valores discretos predefinidos: **10, 50, 100 (Recomendado), 500 o 1000 réplicas (Máxima Suavidad / Calidad de Publicación)**.
*   **Algoritmos a Evaluar:** Selección múltiple de algoritmos a evaluar comparativamente (SP siempre se incluye como baseline de referencia).

**Paralelización Multinúcleo (Evitando timeouts):**
Cuando el usuario selecciona una cantidad elevada de réplicas ($\ge 100$), el tiempo de ejecución secuencial en Python superaría el límite de timeout del navegador. Para mitigar esto, el backend implementa una arquitectura en paralelo utilizando un `ProcessPoolExecutor` de Python.
*   El backend distribuye las $N_{\mathrm{puntos}} \times N_{\mathrm{réplicas}}$ simulaciones independientes en múltiples procesos del sistema local.
*   Esto divide el tiempo de cómputo de manera lineal según el número de núcleos/hilos del hardware de CPU del usuario (Windows), permitiendo generar gráficos suaves ("smooth") de alta resolución en pocos segundos.

---

## 4. Visualización de la Demand-Bound Function (DBF) y Depuración EDF

Para la evaluación formal de la programabilidad en tiempo real (schedulability) bajo planificación EDF en la parte demostrativa, se ha integrado la visualización de la **Demand-Bound Function (DBF)**. 

### Base Matemática y Concepto
Para que un conjunto de flujos sea programable en TSCH, la demanda acumulada de transmisión de los trabajos activos en cualquier ventana de tiempo de tamaño $t$ ($Demand(t)$) no debe superar el tamaño físico de la propia ventana temporal (que es $t$ slots). La demanda se compone de dos factores críticos:

$$Demand(t) = Contention(t) + Conflict(t) \le t \quad \forall t \in [1, H]$$

1.  **Demanda por Contención ($Contention(t)$):**
    $$Contention(t) = \frac{DBF_{\mathrm{EDF}}(t)}{m}$$
    Representa la carga agregada de canalización normalizada por la cantidad de canales TSCH disponibles ($m$). Mide la carga media compartida de los flujos.
2.  **Demanda por Conflictos de Ruta ($Conflict(t)$):**
    Representa las interferencias espaciales que surgen cuando flujos concurrentes comparten nodos intermedios hacia el gateway. Dado que los nodos transceptores operan en modo Half-Duplex (no pueden transmitir y recibir simultáneamente en el mismo slot), el solapamiento de rutas ($Overlaps$) causa bloqueos temporales obligatorios que consumen slots adicionales.

### Implementación Visual Interactiva (`DemandBoundChart`)
El gráfico interactivo del simulador dibuja dinámicamente cuatro curvas a lo largo de todo el espectro temporal $t \in [1, H]$:
*   **Capacidad Límite ($y = t$):** Línea diagonal segmentada de referencia física.
*   **Demanda por Contención:** Curva azul.
*   **Demanda por Conflictos:** Curva amarilla.
*   **Demanda Total:** Curva morada gruesa ($Contention + Conflict$).

**Detección Visual de Sobrecargas (Falla de Schedulability):**
Si en algún punto $t$, la curva de *Demanda Total* supera la línea diagonal de *Capacidad*, la red no es programable. El componente sombrea automáticamente la ventana de tiempo infractora en color **rojo translúcido** ("Zona de Sobrecarga"). Esto permite al diseñador diagnosticar de forma visual inmediata la causa del fallo: si es por exceso de volumen de tráfico (contención) o por problemas de enrutamiento espacial (conflictos por overlaps).

---

## 5. Nomenclatura Profesional TSCH (Superframe / Hiperperíodo)

Para alinear el simulador con la terminología formal de la literatura de redes industriales IEEE 802.15.4-TSCH y 6TiSCH:
*   Se renombró la vista del planificador a **Planificador TSCH (Timeslot × Canal por Superframe)**.
*   Se introdujo una nota contextual explicando que el hiperperíodo mínimo común múltiplo de todos los flujos de sensores ($H$ slots) sirve como la longitud periódica del **Superframe** (o *Slotframe*) de TSCH.
*   La celda activa bajo el cursor detalla el **Slot del Superframe** y los ejes horizontales muestran la grilla de canales vs. slots del superframe actual.

---

## 6. Módulo Multi-Gateway (Particionamiento y Designación de Sinks)

Para extender el simulador interactivo más allá de un único gateway fijo, se ha incorporado la funcionalidad **Multi-Gateway (MG)**. Esta extensión del simulador permite al usuario configurar múltiples sinks ($k \in \{1, 3, 5\}$) para dividir y paralelizar la demanda temporal de la red.

### Algoritmos y Características Clave:
*   **Clustering Espectral NJW ( Ng-Jordan-Weiss):** Particiona de forma automática y agnóstica a la ubicación geográfica el grafo de conectividad de la red en $k$ subgrupos.
*   **Centralidades de Clúster:** Para cada clúster de nodos, se calcula la centralidad local (Grado, Betweenness, Closeness o Eigenvector) y se designa al nodo con mayor relevancia local como el gateway exclusivo de dicho clúster.
*   **Adaptación de la Heurística MO-MG:** El enrutamiento Minimal Overlaps (MO) optimiza los caminos dirigidos a gateways locales correspondientes, omitiendo la penalización de solapamientos en los gateways para evitar penalizaciones artificiales en los últimos saltos convergentes.
*   **Soporte Multicanal y de Reuso a 3 Saltos:** El cálculo de colisiones espaciales e interferencias adopta la regla física de reuso a 3 saltos, donde segmentos compartidos de longitud superior a 3 enlaces no incrementan el conflicto de canal gracias al scheduling temporal.

---

## 7. Estructura de Archivos Involucrados en estas Funcionalidades

Los siguientes archivos del código implementan y extienden esta lógica:

*   **Backend y Simulación Combinatoria (MATLAB & Python):**
    *   `mo_sp_pt2/config/config_mg.m` — Parámetros combinatorios del módulo multi-gateway ($k$, m, centralidades).
    *   `mo_sp_pt2/topology/njw_spectral_clustering.m` — Implementación portable de agrupamiento espectral NJW con K-means autocontenido.
    *   `mo_sp_pt2/topology/select_cluster_gateways.m` — Selección de gateways locales por centralidad de subgrafo.
    *   `mo_sp_pt2/routing/run_minimal_overlap_routing_mg.m` — Heurística MO multi-gateway con exclusión.
    *   `mo_sp_pt2/metrics/compute_schedulability_status_mg.m` — Test de demand-bound EDF multi-gateway normalizado.
    *   `mo_sp_pt2/main/main_multigateway.m` — Ejecutable principal MATLAB de simulación.
    *   `plot_multigateway_results.py` — Graficador de alta calidad en Python que genera las figuras de la tesis.
    *   `software/backend/engine/metrics.py` — Implementa la función `compute_dbf_curves` para calcular el breakdown de la DBF slot a slot de 1 a $H$.
    *   `software/backend/main.py` — Paraleliza el Monte Carlo mediante `ProcessPoolExecutor` y retorna las curvas DBF en `/simulation/run` y `/simulation/compare`.
    *   `software/backend/models/simulation.py` — Contiene los modelos Pydantic para validación de payloads.
*   **Frontend (Next.js 14 / TypeScript):**
    *   `software/components/charts/DemandBoundChart.tsx` — Componente interactivo Recharts para graficar la DBF y zonas de sobrecarga en tiempo real.
    *   `software/lib/types.ts` — Extiende las interfaces TypeScript (`SimResult`, `DbfCurvePoint`) para tipar las curvas.
    *   `software/lib/store.ts` — Implementa el estado Zustand para sincronizar comparaciones.
    *   `software/components/config/SweepConfigPanel.tsx` — Selector desplegable de Monte Carlo con advertencias de paralelismo.
    *   `software/components/charts/SweepPlots.tsx` — Visualiza los gráficos promediados suavizados de Monte Carlo.
    *   `software/components/charts/ComparisonDashboard.tsx` — Integra el análisis de DBF lado a lado para depuración en modo comparación.
    *   `software/components/tsch/TSCHScheduleGrid.tsx` — Grilla TSCH adaptada a la nomenclatura de Superframe.
    *   `software/app/page.tsx` — Integra el panel principal y las llamadas a la API REST.

