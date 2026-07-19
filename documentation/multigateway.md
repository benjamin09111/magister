# Módulo de Designación Multi-Gateway en Redes TSCH bajo EDF

**Archivo:** `documentation/multigateway.md`  
**Proyecto:** Seminario de Tesis — Enrutamiento Determinista en Redes TSCH bajo EDF  
**Referencia base:** Gutiérrez Gaitán et al., *IEEE LES 2022 / LES 2023* (Multi-Gateway Designation)

---

## 1. Introducción y Motivación

En redes de sensores inalámbricos en tiempo real (WSN) basadas en el estándar **IEEE 802.15.4-TSCH**, la convergencia de todo el tráfico hacia un único gateway central genera cuellos de botella severos de contención y colisiones por transmisión en los saltos finales. 

La introducción del módulo **Multi-Gateway (MG)** permite distribuir espacialmente los puntos de recolección de datos en la topología. Al paralelizar los flujos y acortar las distancias medias de enrutamiento (hops), la tasa de éxito de programación (Schedulability Ratio) aumenta significativamente. 

Este módulo adapta los principios del paper de multi-gateway de la literatura a nuestra baseline determinista de **66 nodos** (Santos2020a + Heurística MO), utilizando un particionamiento de red agnóstico a la posición geográfica y designaciones basadas en la centralidad local de los clústeres.

---

## 2. Modelado Matemático y Algoritmos

El módulo Multi-Gateway se organiza en tres capas secuenciales e independientes (ortogonales):

```
+-------------------------------------------------------------+
| 1. CONFIGURACIÓN DE RED (Baseline Santos2020a)              |
|    N = 66 nodos, densidad Λ = λ/N (λ = 4 a 12, default = 4) |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 2. PARTICIONAMIENTO Y DESIGNACIÓN (Insights Multi-Gateway)  |
|    - Clustering Espectral NJW (agnóstico a posiciones)      |
|    - k Gateways seleccionados por centralidad de clúster    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 3. RUTEO Y SCHEDULABILITY (Núcleo de la Tesis)              |
|    - Ruteo Heurístico MO (Santos2020a) global a gateways     |
|    - Cómputo de Overlaps Δi,j (con reuso de slots a 3 saltos)|
|    - Test de Schedulability FF-DBF-WSN en H = 128 slots     |
+-------------------------------------------------------------+
```

### 2.1 Clustering Espectral (Ng-Jordan-Weiss - NJW)
Para particionar el grafo $G = (V, E)$ en $k$ clústeres disjuntos sin depender de coordenadas físicas, el simulador ejecuta la descomposición espectral de la matriz Laplaciana Simétrica Normalizada:

$$L_{\mathrm{sym}} = I - D^{-1/2} A D^{-1/2}$$

1. Extrae los primeros $k$ autovectores correspondientes a los $k$ menores autovalores de $L_{\mathrm{sym}}$ en una matriz $U \in \mathbb{R}^{N \times k}$.
2. Normaliza las filas de $U$ para tener longitud unitaria, proyectando los nodos en una hiperesfera de dimensión $k$.
3. Aplica el algoritmo $K$-means sobre las filas normalizadas para obtener las etiquetas de clúster $\{C_1, C_2, \dots, C_k\}$.

### 2.2 Centralidad Local y Selección de Gateways
Para cada clúster $C_c$, se genera el subgrafo inducido $\text{subG}_c$ (ignorando las conexiones hacia nodos fuera del clúster). Se calcula la métrica de centralidad seleccionada para designar al gateway local $gw_c$:

$$gw_c = \arg\max_{v \in C_c} \text{Centrality}(v, \text{subG}_c)$$

Las centralidades evaluadas comparativamente son:
*   **Degree Centrality (DC)** (Grado local en el clúster)
*   **Betweenness Centrality (BC)** (Intermediación local)
*   **Closeness Centrality (CC)** (Cercanía media local)
*   **Eigenvector Centrality (EC)** (Conectividad local con nodos influyentes)
*   **Random (RND)** (Gateway asignado al azar para control/baseline)

### 2.3 Ruteo Heurístico MO-MG y Exclusión de Gateways
Cada sensor activo $s_i$ transmite datos periódicamente hacia el gateway $gw_c$ del clúster al que pertenece. Para optimizar las rutas y minimizar overlaps de forma inteligente:
1. Se calculan las rutas Shortest Path (SP) iniciales a los gateways designados.
2. La heurística MO actualiza dinámicamente los pesos del grafo penalizando los tramos intermedios congestionados.
3. **Regla de Exclusión de Gateways:** Los nodos gateway se excluyen de la matriz de solapamientos intermedios. Dado que todos los flujos del clúster deben converger en su gateway correspondiente, penalizar el último salto inhibiría artificialmente la optimización de los tramos intermedios (donde realmente ocurren las colisiones y el algoritmo MO tiene su mayor efectividad).

### 2.4 Test de Schedulability FF-DBF-WSN con Reuso a 3 Saltos
La programabilidad real-time multicanal se evalúa en todo el hiperperíodo $H=128$ slots ($1280$ ms) de acuerdo al test de demanda global normalizado:

$$FF\text{-}DBF\text{-}WSN(\ell) \le \ell \quad \forall \ell \in [1, H]$$

Donde:
$$FF\text{-}DBF\text{-}WSN(\ell) = \frac{1}{m} \sum_{i=1}^n FF\text{-}DBF(f_i, \ell) + \sum_{i,j = 1, i \ne j}^n \left( \Delta_{i,j} \max \left\{ \left\lceil \frac{\ell}{T_i} \right\rceil, \left\lceil \frac{\ell}{T_j} \right\rceil \right\} \right)$$

*   $m$ es la cantidad de canales TSCH (default = 8).
*   $FF\text{-}DBF(f_i, \ell) = \lfloor \frac{\ell}{T_i} \rfloor \cdot C_i$ (demanda de contención con $C_i = 2 \cdot \text{hops}$).
*   $\Delta_{i,j}$ es el factor de solapamiento de enlaces aplicando la **regla de reuso de slots a 3 saltos**:
    $$\Delta_{i,j} = \sum_{q} \min(3, \text{Len}_q(i,j))$$
    Cualquier segmento de cruce continuo de longitud superior a 3 enlaces no añade más colisiones debido a la reutilización espacial de frecuencias en TSCH.

---

## 3. Estructura del Código del Módulo (`mo_sp_pt2`)

El módulo completo se ubica en la carpeta `mo_sp_pt2/` con la siguiente estructura de archivos MATLAB y Python:

*   **`mo_sp_pt2/config/`**
    *   `config_mg.m` — Define los rangos de gateways $k \in \{1, 3, 5\}$, métodos de centralidad, canales $m=8$ y parámetros del hiperperíodo.
*   **`mo_sp_pt2/topology/`**
    *   `njw_spectral_clustering.m` — Agrupamiento espectral NJW con algoritmo $K$-means autocontenido portable.
    *   `select_cluster_gateways.m` — Calcula centralidades en subgrafos locales y designa gateways.
    *   `select_sensors_mg.m` — Selecciona sensores activos excluyendo todos los gateways.
*   **`mo_sp_pt2/routing/`**
    *   `run_shortest_path_routing_mg.m` — Dijkstra Shortest Path de sensores a sus gateways asignados.
    *   `run_minimal_overlap_routing_mg.m` — Heurística MO adaptada con exclusión de gateways.
*   **`mo_sp_pt2/metrics/`**
    *   `compute_path_overlaps_factor_3hop.m` — Factor de solapamiento de enlaces con reuso a 3 saltos.
    *   `compute_pairwise_overlap_matrix_3hop.m` — Matriz $\Delta_{i,j}$ con reuso a 3 saltos para schedulability.
    *   `compute_pairwise_overlap_matrix_mg.m` — Matriz de overlaps por nodos intermedios para ruteo MO.
    *   `compute_total_overlaps_mg.m` — Total de overlaps acumulados de nodos intermedios.
    *   `compute_conflict_demand_window_mg.m` — Demanda de conflictos en ventana $\ell$.
    *   `compute_contention_demand_window_mg.m` — Demanda de contención de canal en ventana $\ell$.
    *   `compute_schedulability_status_mg.m` — Test de schedulability completo multicanal/multiwindow.
*   **`mo_sp_pt2/experiments/`**
    *   `run_single_trial_mg.m` — Simulación de un trial individual.
    *   `run_experiment_suite_mg.m` — Simulación de la suite completa combinatoria (paired design).
*   **`mo_sp_pt2/main/`**
    *   `main_multigateway.m` — Script principal MATLAB ejecutable que lee el dataset y produce `results_multigateway.mat`.
*   **Raíz del Proyecto**
    *   `plot_multigateway_results.py` — Script Python de graficado de alta calidad que lee `.mat` y exporta los gráficos (a al f) a `figures_phi/`.

---

## 4. Instrucciones de Ejecución y Generación de Gráficos

### 1. Simulación en MATLAB
Ejecuta el pipeline de simulación combinatorio en la consola de tu MATLAB local o MATLAB Online:
```matlab
cd('mo_sp_pt2/main')
main_multigateway
```
Este proceso leerá `dataset_topologies.dat` de la raíz del proyecto y guardará los resultados experimentales promediados en la raíz como `results_multigateway.mat`.

### 2. Generación de Figuras Científicas en Python
Ejecuta el script de graficado desde una terminal en la raíz del proyecto:
```bash
python plot_multigateway_results.py
```
El script generará y guardará de forma automática en la carpeta `figures_phi/` los seis gráficos correspondientes con resolución de publicación de 300 DPI:
*   **`plot_a_schedulability.png`**: Schedulability Ratio vs $n$ (Degree vs Random) para $k \in \{1, 3, 5\}$.
*   **`plot_b_network_demand.png`**: Demanda de red en el tiempo vs curva SBF para $n=14$, $k=3$.
*   **`plot_c_network_map.png`**: Grafo en 2D coloreado por clústeres mostrando los gateways designados como estrellas gigantes oscuras.
*   **`plot_d_deviation_k1.png`**, **`plot_e_deviation_k3.png`**, **`plot_f_deviation_k5.png`**: Desviación aritmética de schedulability vs Degree para Betweenness, Closeness y Eigenvector.
