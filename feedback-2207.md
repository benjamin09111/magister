PARTE 1:

Tengo algunos comentarios/observaciones.

Con respecto a la topología que genera, estás usando SPRAND de Matlab para generar una matriz de adyacencias? La idea es que luego para el cálculo de desempeño/performance, se permita tener 10, 100, o hasta 1000 topologías diferentes.

En la parte del planificador, cada slot debe ser asignado por enlaces, es decir por tuplas/pares de nodo. Un enlace 1-2, 3-4, etc; eso es lo que se debe planificar, lo que indica que por ese enlace ocurre una transmisión. Recordar que si un nodo está siendo usado para transmitir o retransmitir, no puede ser usado en un mismo slot temporal para recibir.

Con respecto al análisis de programabilidad de oferta/demanda, me gustaría ver el gráfico del sbf vs el dbf, esto permite ofrecer una perspectiva temporal del número de flujos programables. Ideal sería que se fueran agregando uno a uno, y eso fuera dinámicamente actualizando el gráfico. Esto permite mostrar que cuando se agregan flujos que ya no son schedulables, la demanda (carga) supera la oferta (capacidad).

En la comparación de resultados entre enrutamientos, sería idear ver lo mismo que en 3. Tus gráficos están OK, pero agregar visualmente el sbf/dbf le da más cercanía al mundo real-time.

Veo que al final pones una figura de sbf/sbf, que está muy alargada y no se logra distinguir bien. Es importante recordar que debe mostrar el periodo de evaluación dentro del hiperperiodo, pero si dentro del hiperperiodo en algun momento la demanda supera la oferta, eso hace que el sistema no sea schedulable.

PARTE 2:

Sobre tener el código del simulador en Python, en realidad no hay problemas. Solo hay una situación con la formalidad que ofrece MATLAB en cuanto al tipo de topologías aleatorias que se generan. SPRAND tiene ciertas propiedades, pero seguramente en Python también hay manera de controlar el nivel de "formalidad" de la aleatoriedad de las topologías.

Haciendo una búsqueda rápida en la Web, encontré que el paquete NetworkX de Python (que incluso podrías estar usando) ofrece estos formalismos. Hay incluso un paper asociado a NetworkX en el que se define el paquete y sus alcances.

En el punto 4 del siguiente tutorial se define el generador estocástico de topologías. Sugiero que tu simulador permita elegir el tipo de aleatoriedad basado en los generadores disponibles, puedes ver la información en el archivo "python-top.md".

Con respecto a la personalización de los experimentos, sí, la idea es que haya cierta "interactividad" online, para cuando hay 1 topología, varios flujos, 1 o varios gateways, etc. 

El caso de 10 o 100 topologías es en realidad algo para ejecutar offline, que, una vez ejecutado, permita generar un dataset guardable y que, sobre ese dataset (para no hacer todo de nuevo), se puedan extraer gráficos que resuman el desempeño. Debiera ser como tú dices, un módulo "investigación".

Como puede ser pesado, lo importante es que en la versión preliminar pueda correr hasta 10 topologías. 30, 50 y 100 topologías es algo común, y diría que el mínimo para tener resultados robustos y válidos para una publicacións. 1000 topologías podría ser exagerado, y quizás podría necesitarse correr en un servidor, pero una vez en una publicación, los revisores nos pidieron ejecutar 1000 topologías diferentes y tuvimos que hacerlo. 
 
En resumen, si ya está validado que los algoritmos de Pyhton son equivalentes a los de MATLAB, no habría problema en cambiar a Python.
