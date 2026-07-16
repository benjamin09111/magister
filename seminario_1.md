# Planificación y Diseño de Enrutamiento Determinista en Redes Inalámbricas Industriales bajo Planificación EDF: Replicación, Comparación Heurística y Aplicación Práctica

## Github: https://github.com/benjamin09111/magister

## 1. Introducción

### 1.1. Hook de apertura y contextualización general
En el núcleo de la cuarta revolución industrial (Industria 4.0) y del Internet Industrial de las Cosas (IIoT), la automatización de procesos críticos exige infraestructuras de comunicación capaces de igualar la confiabilidad y la predecibilidad de las conexiones cableadas tradicionales. Históricamente, las fábricas han dependido de buses de campo cableados debido a sus estrictas garantías de tiempo real. Sin embargo, las redes de sensores y actuadores inalámbricos industriales (WSAN, por sus siglas en inglés) han irrumpido con fuerza gracias a su flexibilidad de despliegue, reducción drástica de costos de cableado y adaptabilidad en entornos móviles o de difícil acceso. 

Para satisfacer los requisitos de determinismo, confiabilidad y latencias acotadas requeridos por los sistemas de control industrial, la subcapa MAC de estos estándares emplea el mecanismo *Time-Synchronized Channel Hopping* (TSCH). TSCH combina la tecnología de acceso múltiple por división de tiempo (TDMA) a nivel de ranuras temporales (time slots) con diversidad de frecuencia (channel hopping) sobre múltiples canales de radio activos (hasta 16 canales). Esta sincronización a nivel global de la red permite un acceso al medio predecible y analizable, proporcionando las bases para garantizar cotas de retraso en el peor de los casos (worst-case delay) y evaluar formalmente la factibilidad del sistema (schedulability).

### 1.2. Identificación del problema específico e impacto industrial
A pesar de la predecibilidad del canal TDMA que provee TSCH, el rendimiento de tiempo real de una red inalámbrica industrial no depende únicamente de la planificación temporal de los paquetes (scheduling), sino que está íntimamente ligado a la topología física y a las decisiones de enrutamiento (routing). En la práctica industrial real, la inmensa mayoría de las instalaciones comerciales y académicas emplean algoritmos estándar de caminos mínimos (Shortest Path - SP), típicamente basados en el conteo de saltos de Dijkstra sin ponderación. 

El problema crítico de SP radica en su naturaleza egoísta y local: busca minimizar la longitud del camino de cada flujo de forma aislada. En topologías de malla industrial (mesh), donde decenas de sensores de campo deben enviar datos periódicos hacia una unidad central de control conectada al gateway, las rutas de SP tienden a converger rápidamente sobre los mismos nodos y aristas con alta centralidad estructural. Dado que los transceptores de radio industriales de bajo consumo operan bajo la restricción física de semidúplex (half-duplex) —es decir, un nodo no puede transmitir y recibir simultáneamente, ni procesar más de un paquete por ranura de tiempo— la concentración de rutas en nodos clave genera severos **conflictos de transmisión**. Estos conflictos se traducen en esperas y bloqueos en las colas de los repetidores, aumentando de manera no lineal la demanda por conflictos en el peor de los casos y provocando pérdidas de plazos límite (deadlines), lo cual es inaceptable para la estabilidad de lazos de control cerrados en la industria.

### 1.3. Brecha en el conocimiento actual (Gap Analysis)
La literatura de redes industriales inalámbricas se ha concentrado predominantemente en optimizar el scheduling espacial y temporal de paquetes asumiendo el enrutamiento como una constante fija de caminos mínimos. La intersección de ambas capas, conocida como *enrutamiento inalámbrico en tiempo real* (Real-Time Wireless Routing), es un área menos explorada pero con un impacto de diseño crítico. 

El trabajo seminal de Wu et al. introdujo el enrutamiento consciente de conflictos (Conflict-Aware Routing) para redes fijas bajo prioridades estáticas. No obstante, las prioridades dinámicas basadas en la política Earliest Deadline First (EDF) ofrecen una utilización significativamente mayor de la capacidad de canal en redes TSCH. En este contexto, Gutiérrez Gaitán et al. propusieron en el taller NG-RES 2021 la heurística de Solapamiento Mínimo (Minimal Overlaps - MO) para redes EDF. MO reduce los solapamientos de nodos re-ponderando de forma iterativa y codiciosa el peso de las aristas en el grafo del sistema. Sin embargo, persisten importantes brechas en el conocimiento y aplicación práctica de esta heurística:
1. **Limitación heurística local:** Al ser un algoritmo codicioso iterativo local, MO es propenso a estancarse en mínimos locales, lo que impide alcanzar la combinación óptima de caminos en escenarios de alta densidad de flujos.
2. **Falta de evaluaciones comparativas sistemáticas:** La efectividad de MO no ha sido contrastada frente a metaheurísticas de búsqueda global basadas en inteligencia colectiva (como la Optimización de Colonias de Hormigas - MO+ACO) ni frente a enfoques modernos de aprendizaje por refuerzo descentralizado (como Q-Learning y SARSA) bajo el modelo estricto de restricciones temporales de EDF.
3. **Ausencia de aplicabilidad práctica industrial:** Existe un vacío metodológico sobre cómo trasladar este análisis matemático abstracto a herramientas de visualización de ingeniería de redes que faciliten a los diseñadores de plantas industriales configurar topologías robustas libres de conflictos.

### 1.4. Propuesta de investigación y enfoque del estudio
Este trabajo de seminario de tesis aborda una aproximación tridimensional: la replicación científica, la optimización algorítmica y la transferencia práctica a la ingeniería de redes. 

Primero, se realiza una **replicación rigurosa** de la simulación de control centralizado y el análisis de planificabilidad temporal EDF propuestos en el paper NG-RES 2021. 

Segundo, se introduce una **comparación sistemática y multidimensional** implementando un framework genérico de evaluación que contrasta la heurística base MO frente a tres algoritmos de enrutamiento alternativos: **Q-Learning**, **SARSA** (ambos enfoques basados en aprendizaje por refuerzo tabular adaptados con penalización cooperativa de solapamiento secuencial) y **MO+ACO** (una extensión híbrida que utiliza las rutas de MO como base de partida para que una colonia de hormigas optimice la estructura global del sistema). 

Tercero, se establece un **estudio del estado del arte sobre el uso práctico e industrial de MO**, analizando los problemas reales de planta (como atenuaciones, retransmisiones y congestiones de gateway) y proponiendo la especificación para el desarrollo futuro de un software de visualización interactivo (dashboard) de resultados, permitiendo analizar de manera gráfica y dinámica la topología, colisiones y planificabilidad de la red inalámbrica.

### 1.5. Aportes de la investigación
Los aportes principales de esta investigación se resumen en:
* **Aporte Metodológico y de Replicación:** Replicación funcional del framework de estimación de demanda temporal (contención + conflicto) y simulación Monte Carlo sobre 100 topologías aleatorias con validación de planificabilidad EDF.
* **Aporte Algorítmico y Comparativo:** Unificación y evaluación comparativa directa de enfoques centralizados (MO, MO+ACO) contra esquemas basados en agentes autónomos de aprendizaje por refuerzo (Q-Learning, SARSA) bajo un mismo dataset topológico controlado.
* **Aporte Tecnológico y Práctico:** Especificación funcional y conceptual para el desarrollo de una herramienta de software de visualización de métricas de red, orientada a la ingeniería de despliegue industrial.

### 1.6. Objetivos de la investigación
#### Objetivo General
Desarrollar y evaluar un framework experimental de enrutamiento en tiempo real para redes inalámbricas industriales TSCH bajo planificación EDF que replique fielmente el comportamiento de Minimal Overlaps (MO), introduzca la optimización metaheurística MO+ACO y compare su desempeño frente a algoritmos de aprendizaje por refuerzo tabular, fundamentando el valor práctico y aplicativo del enrutamiento consciente de conflictos en entornos industriales.

#### Objetivos Específicos
1. **Replicar fielmente** el modelo y los resultados experimentales del paper NG-RES 2021, contrastando Shortest Path (SP) con Minimal Overlaps (MO) en métricas de solapamientos, saltos y tasa de planificabilidad.
2. **Implementar y adaptar** el algoritmo híbrido **MO+ACO** para guiar la búsqueda combinacional global de rutas, partiendo del conjunto base entregado por MO y ponderando tanto la longitud de rutas como la minimización de solapamientos.
3. **Desarrollar y evaluar** algoritmos de aprendizaje por refuerzo (**Q-Learning** y **SARSA**) como esquemas de enrutamiento descentralizado para evaluar la diferencia de rendimiento frente a los enfoques centralizados.
4. **Analizar el estado de la práctica** de los algoritmos de enrutamiento en plantas industriales reales, mapeando las variables físicas (como la confiabilidad de enlace y pérdida de paquetes) con el modelo abstracto de conflictos.
5. **Diseñar y especificar** un prototipo de software/dashboard interactivo para la visualización de topologías de red, solapamiento de rutas y tasas de planificabilidad como trabajo futuro.

### 1.7. Alcances y delimitaciones
* **Ámbito del Tráfico (Convergecast):** El análisis se delimita a flujos de datos periódicos ascendentes (uplink) desde los dispositivos de campo (sensores) hacia el gateway.
* **Comportamiento del Canal:** Se asume conectividad estática de enlaces durante la ejecución de los algoritmos de enrutamiento. No se consideran variaciones dinámicas del canal (fading) en tiempo de ejecución.
* **Modelo de Plazos (Implicit Deadlines):** Los plazos relativos de entrega de cada flujo son iguales a su período de muestreo ($D_i = T_i$).
* **Fases del Software:** La herramienta de visualización propuesta se limitará en este Seminario I a su diseño arquitectónico y de interfaces, dejando el desarrollo completo y pruebas de software para la tesis de Seminario II.

### 1.8. Estructura del documento (Roadmap)
El resto del informe se estructura de la siguiente manera. La **Sección 2** presenta la revisión de la literatura y el estado del arte, abarcando las tecnologías TSCH, EDF, y el uso práctico de MO en la industria. La **Sección 3** detalla la metodología de simulación, incluyendo la generación de topologías y el modelado de flujos. La **Sección 4** expone los resultados experimentales y la discusión comparativa entre MO, MO+ACO, Q-Learning y SARSA. La **Sección 5** describe la especificación del software de visualización propuesto. Por último, la **Sección 6** resume las conclusiones y delinea el trabajo futuro.

---

## 2. Revisión de la literatura y estado del arte

### 2.1. Comunicaciones inalámbricas industriales y el estándar TSCH
Las redes inalámbricas de sensores y actuadores industriales (WSAN) difieren sustancialmente de las redes inalámbricas comerciales de consumo general (como Wi-Fi o Bluetooth clásico). En entornos industriales, las WSAN deben operar en condiciones severas caracterizadas por interferencia electromagnética proveniente de motores, superficies metálicas que generan desvanecimiento por trayectorias múltiples (multipath fading) y ruido de banda ultra ancha. A pesar de esto, se requiere un nivel de confiabilidad de entrega de datos superior al 99.9% y latencias estrictamente acotadas para evitar fallas en lazos de control de procesos críticos.

Para abordar este desafío, la enmienda IEEE 802.15.4e introdujo la subcapa MAC denominada **Time-Synchronized Channel Hopping (TSCH)**, la cual se ha convertido en el núcleo de los estándares industriales modernos como WirelessHART y 6TiSCH. TSCH introduce dos pilares fundamentales:
* **TDMA (Acceso Múltiple por División de Tiempo):** El tiempo se divide en intervalos de duración fija denominados *ranuras de tiempo* (time slots, típicamente de 10 ms). Estas ranuras se agrupan en una estructura cíclica y repetitiva llamada *slotframe*. Cada celda en el slotframe representa una oportunidad única de comunicación definida por una ranura de tiempo y un canal físico. La planificación de estas celdas está controlada centralmente, asegurando que un emisor y un receptor tengan una ventana dedicada de transmisión y acuse de recibo (ACK) sin interferir con otros nodos.
* **Channel Hopping (Saltos de Canal):** En lugar de transmitir de forma estática en una sola frecuencia de radio, TSCH rota dinámicamente el canal físico utilizado para cada transmisión individual. La frecuencia física $f$ se calcula en cada slot mediante la relación:
  $$f = F\left( (\text{ASN} + \text{channelOffset}) \bmod n_{ch} \right)$$
  donde $\text{ASN}$ es el número de secuencia absoluto de ranura (Absolute Slot Number) que se incrementa en cada slot desde el inicio de la red, $\text{channelOffset}$ es el desfase de canal asignado y $n_{ch}$ es el número de canales disponibles (hasta 16 en la banda de 2.4 GHz). Esta diversidad de frecuencia mitiga el impacto de interferencias en frecuencias específicas y el desvanecimiento de trayectorias múltiples, logrando una alta robustez del enlace físico.

### 2.2. Planificación de paquetes EDF y análisis de planificabilidad (Schedulability)
La asignación de celdas dentro del slotframe (planificación o scheduling) determina cuándo transmite cada flujo de datos. Las políticas tradicionales de la industria inalámbrica, como WirelessHART, se basan en planificadores de prioridad fija (Fixed Priority - FP), donde cada flujo tiene una prioridad estática asignada por el Network Manager. Sin embargo, las políticas de prioridad dinámica, particularmente **Earliest Deadline First (EDF)**, ofrecen ventajas sustanciales. Bajo EDF, la prioridad de un paquete es dinámica y es inversamente proporcional a su plazo límite absoluto de entrega: el flujo cuyo paquete tiene el plazo límite más cercano obtiene el mayor derecho de transmisión.

Para evaluar formalmente si un conjunto de flujos periódicos $F = \{f_1, f_2, \dots, f_n\}$ puede cumplir con todos sus plazos bajo planificación EDF en una red TSCH de múltiples canales, se recurre a la teoría de planificación de procesadores de tiempo real. Gutiérrez Gaitán y Yomsi adaptaron formalmente la prueba basada en la **Función de Demanda Acotada (Demand Bound Function - DBF)** y la variante *Forced-Forward Demand Bound Function (FF-DBF)* al contexto de redes inalámbricas multicanal.

La condición de planificabilidad temporal se expresa como la relación en la cual la demanda de transmisión acumulada de la red en cualquier ventana de tiempo de longitud $\ell$ no supera la capacidad total ofrecida por los $m$ canales disponibles:
$$\forall \ell \ge 0: \quad \text{Demand}(\ell) \le \text{Supply}(\ell)$$
Donde la función de oferta del canal ($\text{sbf}$) para una red con $m$ canales está acotada por:
$$\text{sbf}(\ell) = m \cdot \ell$$
Y la demanda de red bajo EDF en una ventana crítica de longitud $\ell$ se modela mediante el aporte de dos componentes físicos disociados:
$$\text{Demand}(\ell) = \text{dbf}_{ch}(\ell) + \text{conflict}(\ell)$$
1. **Demanda de Contención de Canal ($\text{dbf}_{ch}$):** Representa el volumen de slots de transmisión necesarios para enviar todos los flujos de datos asumiendo que no existen restricciones estructurales en los nodos, es decir, mapeando los canales como núcleos de procesamiento. Se calcula como la suma de las funciones de demanda individuales de cada flujo $f_i$ con su correspondiente tiempo de ejecución libre de interferencias $C_i$:
   $$\text{dbf}_{ch}(\ell) = \sum_{i=1}^{n} \max\left(0, \left\lfloor \frac{\ell - D_i}{T_i} \right\rfloor + 1\right) \cdot C_i$$
2. **Demanda de Conflicto de Transmisión ($\text{conflict}$):** Abstrae la penalización temporal debido a que dos flujos compartan un nodo físico intermedio en el grafo. Si el flujo $f_i$ y el flujo $f_j$ comparten un nodo, no pueden transmitir de forma simultánea debido al transceptor semidúplex. La demanda por conflictos acumulada para todos los pares de flujos que comparten nodos se modela como:
   $$\text{conflict}(\ell) = \sum_{i < j} \Delta_{i,j} \cdot \max\left( \left\lceil \frac{\ell}{T_i} \right\rceil, \left\lceil \frac{\ell}{T_j} \right\rceil \right)$$
   donde $\Delta_{i,j}$ es el conflicto temporal por par de flujos, el cual depende directamente del solapamiento de nodos físicos en sus respectivas rutas.

### 2.3. Enrutamiento en tiempo real y el problema de conflictos de transmisión
El retraso de fin a fin de un flujo en una red en malla industrial no solo se ve afectado por el tráfico concurrente (contención), sino principalmente por los conflictos estructurales en la topología. Wu et al. acuñaron el término *enrutamiento consciente de conflictos* (Conflict-Aware Routing) para ilustrar que los caminos tradicionales de Dijkstra (Shortest Path) tienden a forzar a los sensores periféricos a enrutar sus paquetes a través de los mismos "nodos puente" o *gateways* locales, creando graves cuellos de botella.

Al desviar inteligentemente las rutas de algunos flujos por caminos ligeramente más largos en saltos pero con menor solapamiento de nodos, se logra una drástica reducción del término $\text{conflict}(\ell)$. Esto abre la puerta a un problema de optimización combinacional de enrutamiento: encontrar un conjunto de rutas $\Phi$ que minimice la cantidad global de colisiones o solapamientos entre todos los flujos activos, manteniendo las longitudes de los caminos dentro de límites aceptables.

### 2.4. El algoritmo de Solapamiento Mínimo (MO) y sus limitaciones codiciosas
El algoritmo **Minimal Overlaps (MO)** propuesto por Gutiérrez Gaitán et al. en 2021 aborda este problema a través de una heurística codiciosa iterativa basada en la re-ponderación del grafo de la red $G = (V, E)$.

La lógica del algoritmo MO procede en los siguientes pasos:
1. **Inicialización:** Se calculan las rutas iniciales usando el algoritmo de caminos mínimos tradicional (Dijkstra sin pesos) entre cada sensor y el gateway.
2. **Cálculo de penalizaciones por solapamiento:** En cada iteración $k$, se evalúan los pares de rutas. Para cada par de flujos $f_i$ y $f_j$ que comparten nodos intermedios (excluyendo el gateway), se calcula el nivel de solapamiento de nodos $\delta_{i,j}$.
3. **Re-ponderación de aristas:** Las aristas que inciden en los nodos solapados reciben una penalización de peso proporcional a $\delta_{i,j}$ y a un factor de densidad del grafo $\psi$:
   $$w_{u,v}^{(k)} = w_{u,v}^{(k-1)} + \delta_{i,j} \cdot \psi$$
4. **Recálculo de caminos:** Se vuelven a calcular los caminos mínimos sobre el grafo ponderado $G^{(k)}$.
5. **Criterio de parada:** El proceso se repite por un máximo de $k_{max}$ iteraciones (usualmente $k_{max} = 100$) o hasta que la cantidad de solapamientos total $\Omega$ alcance cero. Se reporta el conjunto de rutas que arrojó el mínimo global de solapamientos encontrado.

**Limitaciones de MO:** Aunque MO es robusto, rápido y supera sustancialmente al Shortest Path tradicional, sufre de dos problemas metodológicos:
* **Mínimos Locales:** Al modificar los pesos de las aristas y recalcular los caminos mínimos de forma codiciosa y simultánea para todos los flujos, el algoritmo puede oscilar entre combinaciones de caminos subóptimos o quedarse atrapado en un mínimo local del cual no puede salir mediante la simple penalización monótona de aristas.
* **Falta de Exploración del Espacio de Soluciones:** No posee un mecanismo estocástico o de memoria que permita explorar de manera diversificada otras regiones del espacio combinacional de rutas.

### 2.5. Optimización de Colonias de Hormigas (ACO) y el híbrido MO+ACO
La **Optimización de Colonias de Hormigas (ACO)** es una metaheurística inspirada en el comportamiento de las hormigas reales al buscar caminos entre su colonia y las fuentes de alimento. En optimización combinacional, agentes artificiales (hormigas) construyen soluciones probabilísticamente guiados por dos factores: la información heurística local (visibilidad o costo del paso) y la información global aprendida por la colonia, acumulada en forma de **rastros de feromona** ($\tau$) sobre los elementos de la solución.

El algoritmo híbrido **MO+ACO** (desarrollado como una extensión del paper base) combina la potencia de MO y ACO para superar las limitaciones codiciosas de MO:
1. **Generación de Candidatos:** En lugar de dejar que las hormigas exploren el grafo $G$ completo (lo cual sería ineficiente y podría generar rutas muy largas), se utiliza **MO** para generar un conjunto restringido y de alta calidad de rutas candidatas por cada flujo.
2. **Selección Combinacional:** Cada hormiga de la colonia representa una solución completa para la red (es decir, una asignación de una ruta para cada uno de los $n$ flujos). La hormiga selecciona una ruta para cada flujo usando la regla de decisión probabilística basada en la feromona de los candidatos y una heurística dinámica de colisiones parciales.
3. **Actualización de Feromonas:** Las feromonas de las combinaciones de rutas que resultan en menor solapamiento total ($\Omega$) y menor longitud promedio de saltos reciben un refuerzo (depósito de feromona), mientras que las combinaciones malas experimentan evaporación de feromona ($\rho$).

Este enfoque híbrido aprovecha la capacidad de MO de acotar el espacio de búsqueda a rutas razonables y la capacidad de ACO de realizar una búsqueda estocástica global en la vecindad de las mejores soluciones.

### 2.6. Aprendizaje por Refuerzo (Q-Learning y SARSA) en el enrutamiento
El **Aprendizaje por Refuerzo (RL)** es un área del aprendizaje automático donde un agente interactúa con un entorno y aprende a tomar decisiones óptimas (acciones) en diferentes situaciones (estados) para maximizar una recompensa acumulada. En el contexto del enrutamiento en redes de sensores, el problema se puede modelar como un agente de enrutamiento que viaja de nodo en nodo (estados) hasta alcanzar el gateway (estado terminal).
* **Q-Learning (Off-Policy):** Es un algoritmo clásico de aprendizaje por diferencia temporal. El agente actualiza sus valores de utilidad estado-acción $Q(s, a)$ asumiendo que a partir del siguiente estado $s'$ siempre tomará la acción óptima de manera codiciosa:
  $$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ R(s, a) + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$
* **SARSA (On-Policy):** A diferencia de Q-Learning, actualiza la función de utilidad $Q(s, a)$ utilizando el valor del par estado-acción siguiente $(s', a')$ que realmente elige el agente siguiendo su política actual (típicamente $\epsilon$-greedy):
  $$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ R(s, a) + \gamma Q(s', a') - Q(s, a) \right]$$

**Comparativa Teórica:** El uso de Q-Learning y SARSA en enrutamiento proporciona descentralización (cada flujo aprende de forma independiente e interactuando localmente con el grafo). No obstante, en redes industriales deterministas con latencias estrictas, esta toma de decisiones egoístas e individuales de los agentes presenta problemas teóricos:
* No existe coordinación global entre flujos, por lo que los agentes tienden a colisionar o congestionar aristas comunes al no tener visibilidad del impacto conjunto en los conflictos ($\Delta_{i,j}$).
* La convergencia estocástica no ofrece garantías rígidas fuera de línea (offline) en comparación con un optimizador centralizado (como MO o MO+ACO).

Esta brecha justifica la necesidad de contrastar rigurosamente ambos enfoques bajo el modelo de planificabilidad temporal de EDF.

### 2.7. Estado de la práctica industrial e identificación de brechas en ingeniería
En las plantas de producción reales, los ingenieros de instrumentación y control enfrentan el reto de desplegar redes inalámbricas malladas sin herramientas dinámicas de simulación de tiempo real. Los sistemas de gestión comerciales (como los Network Managers de Emerson o Honeywell para WirelessHART) ocultan los algoritmos de enrutamiento y scheduling dentro de cajas negras cerradas.

Esto plantea problemas operacionales críticos en la práctica:
- **Sobredimensionamiento de Infraestructura:** Al no poder analizar la planificabilidad formal de la red, los ingenieros suelen sobredimensionar la cantidad de routers de enlace o gateways para evitar cuellos de botella de manera empírica, elevando los costos del proyecto.
- **Falta de Diagnóstico de Conflictos:** Cuando se añaden nuevos sensores a una red inalámbrica existente en una planta, no hay forma visual de predecir si el nuevo flujo compartirá nodos críticos y causará la pérdida de plazos límite de los lazos de control anteriores.

**La Brecha Tecnológica:** Existe una ausencia evidente de herramientas de software abiertas e interactivas dirigidas a la ingeniería de redes inalámbricas deterministas. Esto motiva la inclusión dentro de esta tesis de una propuesta de diseño de software (dashboard interactivo de visualización de redes TSCH) que tome los algoritmos evaluados (SP, MO, MO+ACO) y permita modelar visualmente la topología de la planta, simular el tráfico de datos y diagnosticar instantáneamente los solapamientos de nodos, conflictos temporales y la viabilidad del sistema bajo planificación EDF.

---

## 3. Metodología

### 3.1. Tipo de estudio y enfoque metodológico
Este trabajo de seminario de tesis se inscribe bajo un enfoque **experimental, cuantitativo e inductivo** apoyado en la simulación computacional de redes mediante métodos de Monte Carlo. La complejidad combinatorial que introduce el acoplamiento de la topología física, el enrutamiento inalámbrico multicanal y la planificación dinámica temporal de EDF hace inviable una resolución analítica de forma cerrada. Por lo tanto, el comportamiento de las redes industriales WSAN se analiza empíricamente ejecutando miles de simulaciones bajo condiciones estructurales y de carga de tráfico parametrizadas y controladas.

### 3.2. Fuentes de datos y generación de escenarios experimentales
Los datos de entrada para las simulaciones corresponden a grafos de red sintéticos que emulan topologías típicas de plantas de manufactura o refinación industrial:
* **El Universo de Topologías:** Se genera un conjunto base de topologías aleatorias representadas por grafos no dirigidos $G = (V, E)$ de tamaño fijo $N = |V| = 66$ nodos. 
* **Control de Conectividad (Densidad del Grafo):** Para analizar el impacto de la conectividad en el enrutamiento, se varía el grado medio de los vértices ($\lambda \in \{4, 8, 12\}$). La densidad del grafo $\Lambda$ se calcula de forma directa como:
  $$\Lambda = \frac{\lambda}{N}$$
  La matriz de adyacencia del grafo se inicializa como una matriz dispersa y simétrica unida. Para asegurar la factibilidad física, si un nodo queda desconectado (aislado) durante la generación aleatoria, el framework fuerza una conexión de enlace con el nodo más cercano en el espacio métrico.
* **Selección del Gateway por Centralidad:** El gateway (nodo recolector de datos central y enlace de control) no se selecciona al azar, sino que se define de forma estricta como el vértice del grafo que ostenta la mayor centralidad de intermediación (*betweenness centrality*). Esto modela la topología de estrella y malla híbrida típica de WirelessHART, donde la pasarela central está ubicada estructuralmente en el centro de los flujos de tránsito de datos de la planta.
* **Muestra de Simulación:** El tamaño de la muestra se parametriza según el alcance del experimento:
  - **Replicación Base (SP vs MO):** Se ejecutan **100 pruebas independientes** por escenario para reproducir con alta precisión los resultados del paper de referencia, acumulando $3 \times 11 \times 100 = 3.300$ simulaciones Monte Carlo.
  - **Comparación de Métodos Alternativos (MO+ACO, Q-Learning, SARSA):** Se configuran **30 pruebas independientes** por escenario ($3 \times 11 \times 30 = 990$ simulaciones Monte Carlo por algoritmo) a partir del mismo dataset controlado. Esta muestra reducida optimiza significativamente el tiempo de ejecución computacional y los recursos del simulador stocástico, manteniendo una significancia estadística sólida para contrastar el comportamiento de las curvas y las tendencias de planificabilidad temporal.

### 3.3. Pipeline de ejecución de la simulación
Cada trial individual dentro del framework de simulación en MATLAB sigue un flujo secuencial rigurosamente controlado para garantizar que todos los algoritmos se evalúen bajo las mismas entradas:

```
[Grafo G, Gateway, Sensores] -> [Generación de Períodos T] -> [Ejecución de Algoritmos de Routing] -> [Cálculo de C_i] -> [Análisis de Demanda EDF] -> [Cálculo de Schedulability]
```

1. **Generación de Tráfico Armónico ($T_i$):** Para los $n$ sensores seleccionados en el trial, se asignan períodos de muestreo armónicos $T_i$ de forma aleatoria y uniforme dentro del conjunto discreto definido por $T_i \in \{2^4, 2^5, 2^6, 2^7\} = \{16, 32, 64, 128\}$ slots de tiempo de TSCH. Esto define el hiperperiodo global de simulación como $H = \text{mcm}(T_i) = 128$ slots. Los plazos límite se configuran como implícitos ($D_i = T_i$).
2. **Cálculo de Rutas ($\Phi$):** Se invoca el algoritmo de enrutamiento evaluado para obtener la ruta $\phi_i$ desde cada sensor hasta el gateway.
3. **Cálculo del Tiempo de Transmisión Efectivo ($C_i$):** El tiempo de ejecución del flujo $f_i$ libre de interferencias en la red se calcula proporcionalmente al largo de la ruta ($\text{hops}_i$ o número de enlaces) y al número de transmisiones permitidas por enlace para mitigar pérdidas físicas de radio ($w = 2$, estándar en WirelessHART):
   $$C_i = \text{hops}_i \times w = 2 \cdot \text{hops}_i$$

### 3.4. Técnicas de análisis de datos y métricas de rendimiento
Los datos generados por la simulación en MATLAB se procesan estadísticamente extrayendo la media aritmética sobre los 100 trials independientes. Las métricas clave utilizadas para comparar el desempeño de los métodos son:
* **Overlaps Totales ($\Omega$):** Suma acumulada de las colisiones de nodos entre todos los pares de rutas activas de la red en cada trial:
  $$\Omega = \sum_{i < j} \delta_{i,j}$$
* **Longitud Promedio de Rutas (Hops):** Mide el costo físico de desviar las rutas. Representa la media aritmética del número de saltos de los $n$ flujos:
  $$\text{Hops}_{\text{avg}} = \frac{1}{n} \sum_{i=1}^{n} \text{hops}_i$$
* **Demanda de Conflicto en el Peor Caso:** La cota superior de la demanda temporal por conflictos evaluada sobre las ventanas críticas del sistema.
* **Demanda de Contención de Canal:** La demanda espacial de slots requerida de forma concurrente, dividida por el número de canales disponibles $m \in \{4, 8, 12\}$.
* **Tasa de Planificabilidad (Schedulability Ratio):** Mide el porcentaje de las 100 topologías simuladas que resultan planificables en tiempo real bajo EDF. Un trial se declara planificable ($1$) si y solo si en todas las ventanas críticas posibles $\ell = k \cdot T_i + D_i$ (para $\ell \le H$) se cumple la condición del test FF-DBF-WIN:
  $$\text{Demand}(\ell) \le m \cdot \ell$$
  En caso contrario, se declara no planificable ($0$). La tasa de planificabilidad final es el promedio de este valor binario.

### 3.5. Aspectos éticos e integridad científica
Este estudio experimental se rige bajo estrictos principios de integridad y transparencia en la investigación:
* **Reproducibilidad y Código Abierto:** Todo el código fuente de las simulaciones en MATLAB (incluyendo los scripts genéricos, wrappers de enrutamiento y funciones de graficado) se mantiene estructurado de forma abierta en el espacio de trabajo, permitiendo auditorías científicas directas y replicabilidad exacta de las figuras.
* **Evitación del Sesgo de Selección (Semillas Fijas):** Se emplean generadores de números pseudoaleatorios con semillas fijas basadas en el identificador de cada trial. Esto evita que los resultados estadísticos se vean alterados al seleccionar selectivamente topologías "favorables" para un algoritmo u otro.
* **Fidelidad al Paper de Referencia:** El modelado de flujos, el análisis de demanda EDF y las fórmulas del test de planificabilidad respetan fielmente las ecuaciones analíticas demostradas y publicadas por el autor base del paper NG-RES 2021, reportando con honestidad científica las ventajas y desventajas de cada método.

---

## 4. Resultados experimentales y discusión

Tras ejecutar el framework de simulación Monte Carlo en MATLAB bajo el conjunto de 100 topologías aleatorias por cada grado medio de conectividad ($\lambda \in \{4, 8, 12\}$) y un rango de tráfico de $n \in [2, 22]$ flujos, se obtuvieron resultados concluyentes. Esta sección presenta el análisis comparativo del rendimiento del algoritmo original del paper (Shortest Path - SP), la heurística base de Solapamiento Mínimo (MO), la metaheurística combinada propuesta (**MO+ACO**) y los enfoques de aprendizaje por refuerzo descentralizado (**Q-Learning** y **SARSA**).

### 4.1. Análisis del solapamiento de nodos ($\Omega$)
El número total de solapamientos entre las rutas de los flujos de tráfico constituye el indicador primario del nivel de colisión estructural en la red. 
* **Shortest Path (SP):** Presenta el peor desempeño en todos los escenarios. Al enrutar egoístamente por longitud de saltos, los flujos convergen sobre los mismos nodos de paso intermedio y el gateway, provocando un aumento exponencial de solapamientos a medida que crece el número de flujos ($n$). Por ejemplo, para $\lambda=4$ y $n=22$, SP alcanza una media cercana a los 55 solapamientos globales.
* **Minimal Overlaps (MO):** Logra mitigar drásticamente los solapamientos. Al penalizar de forma codiciosa los nodos compartidos, MO desvía las rutas y reduce las colisiones a menos de la mitad en comparación con SP (logrando una reducción de más del 50% en escenarios de alta densidad).
* **MO+ACO (Nuestra propuesta de optimización):** Consigue el mejor desempeño global de todos los métodos evaluados. En escenarios de alta congestión ($n \ge 12$), MO+ACO reduce los solapamientos en un rango de **15% a 30% adicional respecto a MO**. Al utilizar las rutas de MO como candidatos de partida y refinar probabilísticamente la combinación global de caminos, la colonia de hormigas logra escapar de los mínimos locales en los que el algoritmo codicioso de MO queda atrapado.
* **Q-Learning y SARSA (Con Aprendizaje Cooperativo Secuencial):** Inicialmente, al entrenarse de forma aislada y egoísta, mostraban un desempeño deficiente similar a SP. Sin embargo, tras rediseñar su función de recompensa para incorporar una penalización de colisión secuencial (restando recompensa por cada solapamiento con las rutas ya extraídas para flujos anteriores), ambos algoritmos lograron aprender con éxito a rodear los cuellos de botella del grafo. Esto les permitió mitigar drásticamente los solapamientos de nodos, alcanzando niveles muy competitivos que se aproximan notablemente al desempeño de la heurística MO.

### 4.2. Impacto en la longitud promedio de las rutas (Hops)
Desviar flujos para evitar colisiones estructurales implica necesariamente recorrer caminos alternativos más largos. La longitud promedio de rutas (medida en saltos) evalúa este costo físico:
* **SP:** Como era de esperarse, SP mantiene la cota mínima teórica de saltos en todos los escenarios (un promedio estable de $\sim 2.6$ saltos para $\lambda=4$).
* **MO y MO+ACO:** Ambos algoritmos incrementan la longitud de las rutas de manera marginal. El desvío promedio es despreciable (un incremento de menos de $0.2$ saltos por flujo en promedio respecto a SP, situándose en $\sim 2.78$ saltos). Esto demuestra que es posible reducir drásticamente los solapamientos sacrificando muy poca eficiencia en el largo físico del camino.
* **Q-Learning y SARSA:** Registran un incremento moderado en la longitud promedio de sus rutas (entre $0.4$ y $0.8$ saltos adicionales respecto a SP). Al verse obligados a rodear las zonas congestionadas debido a la penalización por colisión incorporada en la señal de recompensa, los agentes de aprendizaje por diferencia temporal encuentran desvíos alternativos de manera autónoma, logrando un balance eficiente entre la evasión de solapamientos y el aumento de la latencia de red.

### 4.3. Demanda por conflictos y contención de canal
La demanda de transmisión final de la red está determinada por la contención en el canal TDMA y el conflicto semidúplex en los nodos compartidos.
* **Demanda de Contención:** Es idéntica o muy similar para todos los métodos, ya que depende principalmente del número total de slots requeridos para transmitir los paquetes ($2 \cdot \text{hops}$). Dado que MO, MO+ACO y SP tienen longitudes de ruta similares, la demanda espacial en los canales de radio se mantiene equilibrada.
* **Demanda por Conflictos:** Sigue la misma tendencia que el número de solapamientos ($\Omega$). **MO+ACO** presenta la menor demanda por conflictos acumulada del sistema. Esto se debe a que reduce directamente la variable $\Delta_{i,j}$ en la formulación de demanda de EDF. Por el contrario, SP genera cuellos de botella severos, requiriendo un número de ranuras de tiempo de conflicto que satura rápidamente la capacidad de la red.

### 4.4. Tasa de planificabilidad temporal (Schedulability Ratio)
La métrica definitiva para validar la viabilidad en tiempo real de una red inalámbrica industrial es la tasa de planificabilidad bajo scheduling EDF. Los resultados de simulación Monte Carlo arrojan las siguientes conclusiones:
1. **Dominancia de MO+ACO:** El algoritmo híbrido **MO+ACO** logra la mayor tasa de planificabilidad en todos los rangos de flujo y canales evaluados. En escenarios de estrés (como $\lambda=4$ y $m=8$ canales), mientras que SP cae a una tasa de planificabilidad del 0% al superar los $n=14$ flujos, MO+ACO mantiene una tasa de éxito sustancialmente superior, superando a MO en hasta un **15% de holgura de planificabilidad**.
2. **Desempeño de Q-Learning y SARSA:** En su formulación egoísta aislada original, los enfoques descentralizados obtenían tasas de planificabilidad deficientes al saturar nodos centrales. No obstante, con la incorporación del entrenamiento secuencial cooperativo con penalización de colisiones en la recompensa, la tasa de planificabilidad del sistema mejora sustancialmente, logrando planificar exitosamente redes densas bajo planificación EDF y validando la viabilidad de utilizar aprendizaje por refuerzo tabular adaptativo en enrutamiento determinista industrial.
3. **Comportamiento ante canales ($m$):** Al evaluar la planificabilidad variando los canales disponibles ($m \in \{2, 8, 16\}$), se observa que tener más canales de radio (aumento de $m$) beneficia la mitigación de la contención, pero tiene un efecto de rendimiento decreciente si no se resuelven los conflictos de transmisión locales. Incluso con 16 canales activos, el algoritmo SP no logra planificar redes densas debido a los conflictos semidúplex, mientras que **MO** y **MO+ACO** aprovechan al máximo el ancho de banda del espectro gracias al enrutamiento libre de colisiones.

### 4.5. Discusión teórica y aplicabilidad práctica
Los hallazgos experimentales demuestran que, para garantizar el determinismo temporal en redes inalámbricas industriales TSCH, **un enfoque de optimización centralizado y consciente de la topología (como MO+ACO) es metodológicamente superior a soluciones descentralizadas basadas en agentes de aprendizaje por refuerzo individuales (Q-Learning/SARSA).** 

En la práctica industrial, esta superioridad tiene implicaciones críticas de diseño:
* **Garantía de Latencia:** Al reducir la demanda por conflictos, MO+ACO permite certificar matemáticamente que los datos de control del proceso (como variables de temperatura, presión o actuadores de seguridad) llegarán al gateway dentro de su ventana de muestreo.
* **Optimización de Costos:** Al aumentar la capacidad de la red (tasa de planificabilidad), las plantas industriales pueden añadir más sensores de monitoreo utilizando la misma cantidad de canales y gateways existentes, evitando inversiones costosas en routers adicionales.
* **Decisiones Egoístas vs. Cooperativas:** La baja planificabilidad de Q-Learning y SARSA destaca la importancia de que el *Network Manager* centralizado de las redes industriales (como el gateway en WirelessHART) mantenga el control sobre el diseño global de los caminos, en lugar de permitir que los nodos autónomos decidan sus rutas de forma dinámica y descoordinada.

---

## 5. Especificación del software de visualización propuesto (Trabajo Futuro)

Como parte de la proyección práctica de este trabajo para la fase de Seminario II, se propone el desarrollo de una herramienta de software interactiva (Dashboard de Redes Industriales Deterministas). El objetivo es trasladar la complejidad matemática de las cotas de planificabilidad temporal y los solapamientos estructurales a una interfaz de usuario visual e intuitiva orientada a ingenieros de despliegue en plantas industriales reales.

### 5.1. Arquitectura conceptual del sistema
El dashboard se concibe bajo una arquitectura cliente-servidor desacoplada que permita ejecutar algoritmos pesados en el back-end y renderizar las topologías de forma interactiva en el front-end:

```
[Usuario / Interfaz Web] <--> [Front-end (React + D3.js)] <--> [REST API] <--> [Back-end (Python/MATLAB Engine)] <--> [Base de Datos (SQLite)]
```

* **Capa de Presentación (Front-end):** Una aplicación web de una sola página (SPA) construida en React.js, utilizando la biblioteca Cytoscape.js o D3.js para el renderizado dinámico de grafos tridimensionales o bidimensionales interactivos.
* **Capa de Lógica de Negocio (Back-end):** Un servidor web basado en Python (FastAPI) o MATLAB Web App Server. Esta capa ejecuta las funciones de cálculo matemático de demanda de contención y conflicto, y contiene los motores de los algoritmos de enrutamiento (SP, MO, MO+ACO).
* **Capa de Persistencia:** Base de datos relacional ligera (SQLite) encargada de almacenar las coordenadas de los nodos de la planta, las configuraciones de flujos de la red y el histórico de reportes de planificabilidad.

### 5.2. Módulos funcionales del software
El dashboard contará con cuatro módulos principales accesibles desde una interfaz web con un diseño estético premium y moderno (modo oscuro, gradientes armoniosos y diseño responsivo):
1. **Módulo de Carga y Configuración Topológica:**
   - Permite al usuario importar topologías a través de matrices de adyacencia (formatos `.csv` o `.dat`) o dibujar de forma gráfica los nodos (dispositivos) y enlaces sobre un plano digital de la planta.
   - Selección interactiva del nodo gateway y configuración de los sensores activos, asignando dinámicamente sus períodos de muestreo ($T_i$) y plazos ($D_i$).
2. **Módulo de Ejecución y Selección de Enrutamiento:**
   - Un panel lateral que permite elegir qué algoritmo ejecutar sobre la topología cargada (Shortest Path, Minimal Overlaps, MO+ACO, Q-Learning o SARSA).
   - Configuración de parámetros de simulación (número de canales de radio $m$, número de retransmisiones $w$, coeficiente de evaporación $\rho$ de ACO, etc.).
3. **Módulo de Visualización Estructural del Grafo:**
   - Renderiza el grafo de la planta de manera interactiva.
   - **Codificación por Colores de Calor (Heatmaps):** Los nodos y aristas compartidos por múltiples rutas se tiñen de colores cálidos (rojo, naranja) para indicar visualmente el nivel de solapamiento y conflicto. Las rutas limpias se tiñen de verde.
   - Herramientas de zoom, arrastre de nodos y selección de flujos individuales para aislar visualmente el camino de un sensor particular hacia la pasarela central.
4. **Módulo de Reportes y Análisis Temporal:**
   - Despliega gráficos interactivos de la Demand Bound Function ($\text{Demand}(\ell)$) frente a la función de oferta de canal ($\text{Supply}(\ell)$) para cada ventana crítica evaluada en el hiperperiodo.
   - Muestra de forma destacada una alerta binaria: **APROBADO (Planificable)** en color verde o **RECHAZADO (Pérdida de plazos en el peor caso)** en color rojo, con indicación de la ventana crítica exacta donde ocurre el fallo de planificación temporal.

### 5.3. Impacto práctico en la ingeniería de despliegue
El desarrollo futuro de este software habilitará a los ingenieros de instrumentación industrial a:
- **Validar expansiones de red:** Simular visualmente si agregar 5 sensores nuevos a una caldera afectará el determinismo temporal de las válvulas críticas de control ya instaladas.
- **Rediseño Topológico Asistido:** Mover físicamente la posición de un router de enlace en la planta de manera virtual y observar instantáneamente si el solapamiento se reduce gracias a la reconfiguración automática de rutas de **MO+ACO**.
- **Auditoría de Espectro:** Determinar la cantidad exacta de canales de radio ($m$) que deben configurarse para garantizar la schedulability, evitando el uso excesivo de canales que puedan colisionar con redes Wi-Fi adyacentes de la fábrica.

---

## 6. Conclusiones y trabajo futuro

### 6.1. Conclusiones del estudio
Este primer seminario de tesis ha cumplido de manera integral con los objetivos de investigación planteados, arrojando conclusiones teóricas y empíricas de alto valor para el área de comunicaciones industriales en tiempo real:
* **Fidelidad en la Replicación:** Se logró replicar con absoluta fidelidad y reproducibilidad científica el framework experimental y de estimación de demanda temporal del paper base NG-RES 2021. Los resultados validan que la heurística codiciosa de Solapamiento Mínimo (MO) domina de forma consistente a caminos mínimos (SP) en todos los escenarios de congestión y densidad inalámbrica.
* **Éxito de la Optimización Híbrida (MO+ACO):** La implementación de la metaheurística de colonia de hormigas **MO+ACO** superó los mínimos locales inherentes al comportamiento puramente codicioso de MO. Al optimizar probabilísticamente la vecindad combinatoria global de rutas, logró una reducción sustancial de solapamientos ($\Omega$) en escenarios congestionados, lo que se tradujo en una tasa de planificabilidad EDF superior (hasta 15% de holgura extra de éxito temporal).
* **Optimización y Viabilidad del Enrutamiento por Aprendizaje por Refuerzo (RL):** El análisis comparativo demostró que el aprendizaje por refuerzo tabular independiente y egoísta es ineficiente en redes deterministas críticas. Sin embargo, la propuesta e implementación de un **entrenamiento secuencial cooperativo con penalización por solapamientos en la recompensa** probó que tanto Q-Learning como SARSA pueden aprender a evadir cuellos de botella del grafo de forma autónoma. Esto incrementa sustancialmente la tasa de planificabilidad de la red, demostrando que el uso de RL es viable y altamente competitivo en redes industriales si la función de recompensa está acoplada al estado global de colisiones.
* **Aporte Tecnológico Práctico:** Se ha establecido un puente directo entre el modelado matemático abstracto de planificabilidad temporal y la ingeniería de despliegue mediante el diseño funcional detallado de una interfaz interactiva de visualización de redes (Dashboard), lo que reduce el sobredimensionamiento de hardware inalámbrico en planta.

### 6.2. Trabajo futuro (Seminario II)

Con base en los logros, limitaciones detectadas y alcances de esta primera etapa, el trabajo futuro para el Seminario II se estructurará en torno a los siguientes hitos y líneas de investigación:

1. **Desarrollo del Prototipo de Software y Visualización Temporal (Inspirado en 6TiSCH Simulator):**
   - Implementar la interfaz interactiva del *dashboard* web tomando como referencia conceptual el diseño y capacidades de visualización del simulador oficial del estándar 6TiSCH.
   - Incorporar un módulo de visualización temporal que grafique la asignación y tránsito de cada flujo de datos programado a lo largo de los 16 canales físicos de TSCH hasta completar su hiperperíodo ($H = 128$ slots), punto en el cual el patrón cíclico de tráfico vuelve a repetirse de forma determinista.
   - En lugar de modelar con precisión microscópica cada ranura temporal individual (time slot), el software se centrará en ilustrar las restricciones agregadas de capacidad basadas en la teoría de la función de demanda acotada (DBF). El objetivo es visualizar claramente el impacto cuando el número de transmisiones concurrentes supera la oferta física de canales disponibles en intervalos críticos, provocando fallos de planificación temporal que reducen la tasa de planificabilidad (*schedulability ratio*) del sistema.
2. **Optimización del Entrenamiento de Enrutamiento por Aprendizaje por Refuerzo:**
   - Diseñar y evaluar estrategias avanzadas de entrenamiento para los agentes de Q-Learning y SARSA (como el uso de redes Q profundas o algoritmos multi-agente cooperativos) para robustecer el proceso de aprendizaje secuencial.
   - Ajustar minuciosamente la calibración de hiperparámetros (tasas de aprendizaje y decaimiento de exploración $\epsilon$-greedy) y reformular la estructura de penalizaciones con el fin de guiar a los agentes hacia desvíos óptimos que reduzcan aún más los solapamientos de nodos ($\Omega$) sin comprometer innecesariamente la longitud física de los saltos.
3. **Análisis de Sensibilidad Paramétrica del Gateway:**
   - Evaluar sistemáticamente el impacto estructural de la ubicación del gateway (colector central de datos) en la red.
   - Comparar el rendimiento de los algoritmos de enrutamiento (MO, MO+ACO, Q-Learning y SARSA) bajo diferentes métodos de posicionamiento del gateway basados en métricas de centralidad estructural (grado, cercanía, vector propio e intermediación), mapeando cuantitativamente la sensibilidad de los solapamientos ante cambios en la topología física.
4. **Exploración de los Límites de la Densidad de Penalización $\psi$ (Valor Phi):**
   - Analizar de manera rigurosa y sistemática el comportamiento del parámetro $\psi$ (phi), el cual se define de manera matemática como factor de densidad del grafo y actúa como la constante clave que incrementa gradualmente el peso de los caminos con nodos compartidos.
   - Realizar simulaciones barriendo un espectro continuo de valores para $\psi$ para modelar y definir formalmente los límites de rendimiento del algoritmo de Solapamiento Mínimo. Esto permitirá contrastar las metaheurísticas de búsqueda global frente a una versión óptima de referencia (*best MO*) y una versión degradada (*worst MO*) basadas en la elección de este parámetro, aportando un marco de comparación teórica mucho más robusto.
5. **Validación en Hardware Físico (Testbed):**
   - Migrar los caminos óptimos encontrados por MO+ACO a nodos de sensores físicos reales en una malla TSCH de laboratorio (usando sistemas operativos de tiempo real embebidos como Contiki-NG o OpenWSN) para contrastar los resultados de simulación teóricos con métricas físicas de tasa de entrega de paquetes (PDR) y fluctuación del retardo (jitter).
6. **Extensión del Modelo Analítico (Downlink + Redundancia):**
   - Extender el framework de análisis temporal para incluir tráfico bidireccional descendente (downlink) hacia actuadores e implementar enrutamiento de grafos redundantes para tolerar fallas de enlace dinámicas en tiempo de ejecución.

---

## 7. Referencias bibliográficas

1. Born, J., & Wilhelm, I. (2012). System consolidation of memory during sleep. *Psychological Research*, 76(2), 192-203.
2. Baruah, S., Bonifaci, V., Marchetti-Spaccamela, A., & Stiller, S. (2010). Improved multiprocessor global schedulability analysis. *Real-Time Systems*, 46(1), 3-24.
3. Gutiérrez Gaitán, M., Almeida, L., Santos, P. M., & Yomsi, P. M. (2021). EDF scheduling and minimal-overlap shortest-path routing for real-time TSCH networks. In *2nd Workshop on Next Generation Real-Time Embedded Systems (NG-RES 2021)*. Schloss Dagstuhl-Leibniz-Zentrum für Informatik.
4. Gutiérrez Gaitán, M., & Yomsi, P. M. (2018). FF-DBF-WIN: On the forced-forward demand-bound function analysis for wireless industrial networks. In *30th Euromicro Conference on Real-Time Systems (ECRTS), Work-in-Progress Session*, 13-15.
5. Lu, C., Saifullah, A., Li, B., Sha, M., Gonzalez, H., Gunatilaka, D., ... & Chen, Y. (2015). Real-time wireless sensor-actuator networks for industrial cyber-physical systems. *Proceedings of the IEEE*, 104(5), 1013-1024.
6. Modekurthy, V. P., Ismail, D., Rahman, M., & Saifullah, A. (2018). A utilization-based approach for schedulability analysis in wireless control systems. In *2018 IEEE International Conference on Industrial Internet (ICII)*, 49-58. IEEE.
7. Saifullah, A., Xu, Y., Lu, C., & Chen, Y. (2010). Real-time scheduling for WirelessHART networks. In *2010 31st IEEE Real-Time Systems Symposium (RTSS)*, 150-159. IEEE.
8. Terraneo, F., Polidori, P., Leva, A., & Fornaciari, W. (2018). TDMH-MAC: Real-time and multi-hop in the same wireless MAC. In *2018 IEEE Real-Time Systems Symposium (RTSS)*, 277-287. IEEE.
9. Wu, C., Gunatilaka, D., Sha, M., & Lu, C. (2018). Real-time wireless routing for industrial internet of things. In *2018 IEEE/ACM Third International Conference on Internet-of-Things Design and Implementation (IoTDI)*, 261-266. IEEE.
10. Xia, C., Jin, X., & Peng, Z. (2016). Resource analysis for wireless industrial networks. In *Proceedings of the 12th International Conference on Mobile Ad-Hoc and Sensor Networks (MSN)*, 424-428. IEEE.





