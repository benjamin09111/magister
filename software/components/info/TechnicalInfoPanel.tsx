'use client';

import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

function Section({ title, defaultOpen = false, children, accent = '#0056b3' }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-250 rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</span>
        {open ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />}
      </button>
      {open && <div className="p-4 text-xs text-slate-700 leading-relaxed flex flex-col gap-3">{children}</div>}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <code className="block bg-slate-800 text-emerald-300 text-[11px] rounded px-3 py-2 font-mono overflow-x-auto whitespace-pre">
      {children}
    </code>
  );
}

const FAQ_STATUS_CONFIG = {
  done: { label: 'Resuelto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'text-emerald-600' },
  partial: { label: 'Parcial', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'text-amber-600' },
  open: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: 'text-slate-400' },
} as const;

function FAQItem({ q, status, children }: { q: string; status: keyof typeof FAQ_STATUS_CONFIG; children: React.ReactNode }) {
  const cfg = FAQ_STATUS_CONFIG[status];
  return (
    <div className="border border-slate-200 rounded p-3 bg-white">
      <div className="flex items-start gap-2 mb-1.5">
        <CheckCircle2 size={14} className={`${cfg.icon} shrink-0 mt-0.5`} />
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 border ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-[11px] font-bold text-slate-800 mb-1.5">P: {q}</p>
      <div className="text-[11px] text-slate-700 leading-normal"><span className="font-semibold text-slate-500">R: </span>{children}</div>
    </div>
  );
}

export default function TechnicalInfoPanel() {
  return (
    <div className="lg:col-span-12 flex flex-col gap-4 bg-white border border-slate-300 rounded p-6 shadow-sm font-sans text-sm text-slate-700 leading-relaxed relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#0056b3]" />

      <div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Información Técnica — Cómo está construido este software
        </h3>
        <p className="text-xs text-slate-500">
          Documentación de fidelidad, reproducibilidad y metodología para revisión académica (tesis de magíster,
          objetivo de publicación en <strong>SoftwareX</strong>). Cada afirmación aquí corresponde a código real y
          verificable en <code className="bg-slate-100 px-1 rounded">software/backend/</code>, no a texto aspiracional.
        </p>
      </div>

      <Section title="1. Modelo formal: oferta (sbf) vs. demanda (dbf) y el test de schedulability" defaultOpen>
        <p>
          Un conjunto de flujos es <strong>schedulable</strong> si y solo si, en toda ventana de tiempo{' '}
          <code className="bg-slate-100 px-1 rounded">t</code> dentro del hiperperíodo{' '}
          <code className="bg-slate-100 px-1 rounded">H</code>, la demanda acumulada no supera la oferta:
        </p>
        <Formula>{`∀t ∈ (0, H]:  dbf(t) = contention(t) + conflict(t)  ≤  sbf(t) = t`}</Formula>
        <p>
          <strong>contention(t)</strong> es la demanda EDF clásica normalizada por canales:
        </p>
        <Formula>{`dbf_EDF(t) = Σ_i max(0, ⌊(t - D_i)/T_i⌋ + 1) · C_i        contention(t) = dbf_EDF(t) / m`}</Formula>
        <p>
          <strong>conflict(t)</strong> penaliza los solapamientos de nodos entre rutas (restricción half-duplex —
          un nodo no puede transmitir y recibir en el mismo slot):
        </p>
        <Formula>{`conflict(t) = Σ_{i<j, Δij>0} Δij · max(⌈t/Ti⌉, ⌈t/Tj⌉)`}</Formula>
        <p>
          Implementado en <code className="bg-slate-100 px-1 rounded">engine/metrics.py::compute_schedulability_status</code>.
          Evalúa <strong>todas</strong> las ventanas t=1..H (no solo t=H) y deriva el veredicto de la MISMA serie que
          alimenta el gráfico (<code className="bg-slate-100 px-1 rounded">compute_dbf_curves</code>), de modo que el
          gráfico y el badge &ldquo;schedulable/no schedulable&rdquo; nunca pueden contradecirse.
        </p>
        <p className="text-slate-500">
          Nomenclatura: la curva &ldquo;Oferta&rdquo; en los gráficos es <code className="bg-slate-100 px-1 rounded">sbf(t) = t</code>{' '}
          (supply-bound function trivial para TDMA sin overhead de blackout). La demanda es la <strong>dbf</strong> EDF
          clásica — no la <em>forced-forward</em> dbf (ff-dbf) del paper original; documentado como desviación conocida
          en la sección 7.
        </p>
      </Section>

      <Section title="2. Generación de topologías y reproducibilidad">
        <ul className="list-disc pl-4 flex flex-col gap-1.5">
          <li>
            <strong>Generadores</strong> (NetworkX; Hagberg, Schult &amp; Swart, 2008): Erdős–Rényi G(N,p) (por defecto,
            equivalente en distribución a <code className="bg-slate-100 px-1 rounded">sprand+spones</code> de MATLAB),
            Watts–Strogatz, Barabási–Albert, Geométrico Aleatorio. Seleccionable en el panel de Topología.
          </li>
          <li>
            <strong>Gateway</strong>: por defecto, <em>betweenness centrality</em> máxima (fiel al paper §3.1). Grado y
            closeness disponibles para análisis de sensibilidad (nota 3 del paper).
          </li>
          <li>
            <strong>Semilla (seed)</strong>: toda la aleatoriedad (topología, sensores, períodos de flujo, y los
            métodos estocásticos MOACO/Q-Learning/SARSA) se deriva de una única semilla. Si no se especifica, el
            servidor genera una y la retorna — cada corrida es reproducible exactamente.
          </li>
          <li>
            <strong>Hiperperíodo H</strong>: calculado como <code className="bg-slate-100 px-1 rounded">H = lcm(T)</code>{' '}
            de los períodos realmente generados (paper §6.1), no un input arbitrario del cliente.
          </li>
        </ul>
      </Section>

      <Section title="3. Algoritmos de enrutamiento implementados">
        <ul className="list-disc pl-4 flex flex-col gap-1.5">
          <li><strong>SP</strong> — Dijkstra hop-count, línea base de la literatura.</li>
          <li><strong>MO</strong> — Heurística greedy del paper: penaliza iterativamente aristas incidentes a nodos solapados, minimiza Ω.</li>
          <li><strong>MO+ACO</strong> — Extensión propia: colonia de hormigas sobre candidatas generadas a partir de MO.</li>
          <li><strong>Q-Learning / SARSA</strong> — Routing por aprendizaje por refuerzo tabular (off-policy / on-policy), penalizando overlaps.</li>
          <li><strong>SP-MG / MO-MG</strong> — Variantes multi-gateway (sección 5). ACO/Q-Learning/SARSA no tienen variante multi-gateway validada.</li>
        </ul>
        <p className="text-slate-500">Detalle de pseudocódigo y complejidad de cada uno: panel lateral &ldquo;i&rdquo; junto a cada algoritmo en el simulador.</p>
      </Section>

      <Section title="4. Módulo de investigación: barridos y datasets persistentes">
        <ul className="list-disc pl-4 flex flex-col gap-1.5">
          <li>Barrido Monte Carlo por lotes (10 a 1000 réplicas), paralelizado con <code className="bg-slate-100 px-1 rounded">ProcessPoolExecutor</code>.</li>
          <li>Ejes disponibles: <strong>n</strong> (número de flujos, eje principal del paper, Figs. 2-6), N, λ, canales m.</li>
          <li>Cada réplica usa una semilla determinística derivada de la semilla base del barrido (reproducible punto por punto).</li>
          <li>Los resultados agregados se <strong>persisten en SQLite</strong> (&ldquo;Guardados &gt; Datasets de Investigación&rdquo;) y pueden re-graficarse sin volver a simular.</li>
        </ul>
      </Section>

      <Section title="5. Multi-gateway: clustering espectral NJW">
        <p>Puerto de la extensión <code className="bg-slate-100 px-1 rounded">mo_sp_pt2</code> (MATLAB) a Python:</p>
        <ul className="list-disc pl-4 flex flex-col gap-1.5">
          <li>Particionamiento en k clústeres vía <strong>NJW spectral clustering</strong> sobre el Laplaciano normalizado del grafo, con k-means determinista (seed fija).</li>
          <li>Gateway local por clúster: nodo de mayor centralidad LOCAL (betweenness/grado/closeness/eigenvector) en el subgrafo inducido.</li>
          <li>Cada sensor se asigna a su gateway más cercano (hop-count).</li>
          <li>El conflicto entre rutas usa la <strong>regla de reuso a 3 saltos</strong>: un segmento de aristas compartido contribuye <code className="bg-slate-100 px-1 rounded">min(3, longitud)</code> al factor de conflicto, modelando el reuso espacial de canal más allá de 3 saltos.</li>
          <li>Solo SP y MO están validados para multi-gateway (alcance real de la referencia MATLAB); ACO/Q-Learning/SARSA quedan explícitamente deshabilitados en este modo en vez de improvisar un comportamiento no verificado.</li>
        </ul>
      </Section>

      <Section title="6. Validación cruzada MATLAB ↔ Python">
        <p>
          Suite en <code className="bg-slate-100 px-1 rounded">software/backend/validation/</code>: exporta un caso
          fijo y sembrado desde el MATLAB de referencia (<code className="bg-slate-100 px-1 rounded">mo_sp_pt1/experiments/export_validation_case.m</code>)
          y lo valida en dos niveles:
        </p>
        <ul className="list-disc pl-4 flex flex-col gap-1.5">
          <li><strong>Tier 1 (exacto)</strong>: alimenta las funciones Python con las rutas YA calculadas por MATLAB y exige coincidencia exacta de Ω, hops, contención, conflicto y demanda total — independiente de cómo cada lenguaje rompe empates de Dijkstra.</li>
          <li><strong>Tier 2 (informativo)</strong>: compara el routing SP independiente de cada lenguaje; diferencias aquí son esperables por empates, no bugs.</li>
        </ul>
        <p className="text-slate-500">
          Ver <code className="bg-slate-100 px-1 rounded">software/backend/validation/README.md</code> para el
          procedimiento completo y la metodología detallada.
        </p>
      </Section>

      <Section title="7. Desviaciones conocidas respecto al paper (documentadas, no ocultas)" accent="#b45309">
        <ul className="list-disc pl-4 flex flex-col gap-1.5">
          <li><strong>dbf clásica, no ff-dbf</strong>: el paper usa forced-forward dbf; este software (y la referencia MATLAB) usan dbf EDF estándar.</li>
          <li><strong>sbf trivial</strong>: sbf(t) = t (TDMA ideal sin blackout/overhead), no una sbf con pérdidas modeladas explícitamente.</li>
          <li><strong>Generador de topología</strong>: Erdős–Rényi en vez de <code className="bg-slate-100 px-1 rounded">sprand</code> — equivalentes en distribución (ambos G(N,p)), pero no idénticos bit a bit.</li>
          <li><strong>Comparación multi-gateway</strong>: la vista de comparación A/B aún no soporta multi-gateway (solo la pestaña Simulador).</li>
        </ul>
      </Section>

      <Section title="8. Preguntas Frecuentes (FAQ)" accent="#15803d" defaultOpen>
        <p className="text-slate-500 mb-1">Sobre fidelidad al paper y a la referencia MATLAB</p>
        <FAQItem q="¿Generan las topologías con SPRAND de MATLAB? ¿Se puede tener 10, 100 o hasta 1000 topologías distintas?" status="done">
          No se usa SPRAND directamente (el backend es Python), pero se usa Erdős–Rényi G(N,p) de NetworkX, que es la
          misma construcción matemática (equivalente en distribución). El barrido Monte Carlo soporta hasta 1000
          réplicas/topologías, con dataset persistente.
        </FAQItem>
        <FAQItem q="¿Cómo se planifica por enlaces, respetando que un nodo no puede transmitir y recibir en el mismo slot (half-duplex)?" status="done">
          La grilla TSCH concreta (<code className="bg-slate-100 px-1 rounded">engine/scheduler.py</code>) planifica cada
          hop como un enlace (emisor→receptor) individual bajo EDF, marcando ambos extremos como ocupados durante la
          transmisión — un nodo ocupado no puede ni transmitir ni recibir en ese slot.
        </FAQItem>
        <FAQItem q="¿Se puede ver el gráfico de sbf vs. dbf agregando flujos uno a uno, de forma dinámica?" status="done">
          Sí — slider de reproducción flujo por flujo en el gráfico Oferta vs. Demanda (pestañas Simulador y
          Comparación), marcando el flujo exacto donde el sistema deja de ser schedulable.
        </FAQItem>
        <FAQItem q="En la comparación entre algoritmos de enrutamiento, ¿también se puede ver el sbf/dbf?" status="done">
          Sí — gráfico superpuesto de dbf(t) para el método A y el método B sobre la misma oferta sbf(t)=t.
        </FAQItem>
        <FAQItem q="Si en algún punto dentro del hiperperíodo la demanda supera la oferta, ¿el sistema se marca correctamente como no-schedulable?" status="done">
          Sí, tras corregir un bug real: el test ahora evalúa ∀t∈(0,H], no solo t=H. Antes de esta corrección, tanto
          este software como la referencia MATLAB podían declarar &ldquo;schedulable&rdquo; un sistema que en realidad
          violaba la oferta a mitad del hiperperíodo. Además, se agregó una barra de zoom/brush bajo el gráfico
          (enfocada automáticamente en la primera sobrecarga) para que la figura no quede &ldquo;muy alargada&rdquo;
          e ilegible cuando H es grande.
        </FAQItem>
        <FAQItem q="¿El simulador permite elegir el tipo de generador aleatorio de topologías (no solo uno fijo)?" status="done">
          Sí — selector de Erdős–Rényi, Watts–Strogatz, Barabási–Albert y Geométrico Aleatorio (generadores de
          NetworkX, Hagberg, Schult &amp; Swart 2008).
        </FAQItem>
        <FAQItem q="¿Se puede simular con 1 topología, varios flujos, y uno o varios gateways de forma interactiva (online)?" status="done">
          Sí — modo Multi-gateway funcional (clustering espectral NJW + SP-MG/MO-MG), además de gateway único
          automático (betweenness) o manual.
        </FAQItem>
        <FAQItem q="¿Se puede correr un barrido offline de 10 a 1000 topologías y guardar el dataset para re-graficar después sin repetir la simulación?" status="done">
          Sí — los resultados agregados del barrido se persisten en SQLite y se pueden recargar para regenerar los
          gráficos y la figura estilo paper sin volver a simular.
        </FAQItem>
        <FAQItem q="¿Está validado que los algoritmos en Python son equivalentes a los de MATLAB?" status="partial">
          El arnés de validación cruzada está construido y probado (comparación exacta de Ω, hops, contención,
          conflicto y demanda), pero falta correr el caso de referencia real en un MATLAB local — ver
          <code className="bg-slate-100 px-1 rounded"> software/backend/validation/README.md</code>.
        </FAQItem>

        <p className="text-slate-500 mt-3 mb-1">Preguntas típicas de un revisor de software/publicación (p. ej. SoftwareX)</p>
        <FAQItem q="¿Los resultados son reproducibles? Si corro el mismo experimento dos veces, ¿obtengo lo mismo?" status="done">
          Sí — toda la aleatoriedad (topología, sensores, períodos, y los métodos estocásticos) se deriva de una
          semilla explícita que el sistema reporta y que puede reutilizarse para repetir exactamente la misma corrida.
        </FAQItem>
        <FAQItem q="¿Existen tests automatizados (unit tests) que validen la correctud del código, con integración continua (CI)?" status="done">
          Sí — suite de <code className="bg-slate-100 px-1 rounded">pytest</code> (53 tests) en{' '}
          <code className="bg-slate-100 px-1 rounded">backend/tests/</code>: consistencia del test ∀t, determinismo de
          topología/routing, la propiedad &ldquo;MO nunca peor que SP&rdquo;, restricciones half-duplex/canal del
          scheduler, y el port multi-gateway. <code className="bg-slate-100 px-1 rounded">.github/workflows/ci.yml</code>{' '}
          corre pytest + type-check + build en cada push.
        </FAQItem>
        <FAQItem q="¿Qué licencia tiene el código y cómo se debería citar?" status="done">
          <code className="bg-slate-100 px-1 rounded">LICENSE</code> (MIT) y{' '}
          <code className="bg-slate-100 px-1 rounded">CITATION.cff</code> agregados en la raíz de{' '}
          <code className="bg-slate-100 px-1 rounded">software/</code>. Falta completar el DOI de Zenodo y el enlace al
          repositorio público una vez creado.
        </FAQItem>
        <FAQItem q="¿En qué se diferencia este simulador de otros simuladores TSCH/6TiSCH existentes (p. ej. 6TiSCH simulator, Contiki/Cooja)?" status="partial">
          Se agregó una tabla comparativa (README, sección &ldquo;Comparison with existing TSCH/6TiSCH simulation
          software&rdquo;) frente al 6TiSCH Simulator y Contiki-NG/Cooja. Es un primer borrador para el manuscrito —
          el autor debe verificarla y ampliarla antes de someter el paper.
        </FAQItem>
        <FAQItem q="¿La equivalencia entre el generador Erdős–Rényi y sprand de MATLAB fue validada empíricamente, o solo argumentada matemáticamente?" status="partial">
          Ya existe la herramienta: <code className="bg-slate-100 px-1 rounded">validate_topology_statistics.py</code>{' '}
          genera 100 topologías y las compararía con un test de Kolmogorov-Smirnov contra 100 instancias de MATLAB —
          pero falta correr el script <code className="bg-slate-100 px-1 rounded">.m</code> correspondiente para
          obtener los datos MATLAB reales. Por ahora solo se validó la auto-consistencia de Python contra la
          expectativa teórica G(N,p).
        </FAQItem>
        <FAQItem q="¿Cuál es la complejidad computacional de cada algoritmo de enrutamiento?" status="done">
          Documentada por algoritmo (notación Big-O) en el panel lateral &ldquo;i&rdquo; junto a cada método en el
          simulador — p. ej. SP: O(V log V + E); MO: O(k_max · N · (V log V + E)).
        </FAQItem>
        <FAQItem q="¿El modelo soporta tráfico downlink (gateway → actuadores), o solo uplink (sensores → gateway)?" status="open">
          Solo uplink, igual que el paper base — que explícitamente deja el downlink como extensión futura (&ldquo;we
          note the work can be extended to consider the downlink component&rdquo;). No es una omisión del software,
          es el alcance original del paper.
        </FAQItem>
        <FAQItem q="¿Cómo escala el simulador a redes más grandes (N &gt; 100 nodos) o con más réplicas?" status="partial">
          El barrido Monte Carlo paraleliza réplicas con <code className="bg-slate-100 px-1 rounded">ProcessPoolExecutor</code>{' '}
          sobre todos los núcleos disponibles, pero no hay benchmarks de escalabilidad formales publicados (tiempo vs.
          N, tiempo vs. réplicas) que respalden cuantitativamente el rendimiento.
        </FAQItem>
      </Section>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
        <ExternalLink size={11} />
        Auditoría completa y plan de mejora: <code className="bg-slate-100 px-1 rounded">feedback-2207-auditoria.md</code> (raíz del repositorio).
      </div>
    </div>
  );
}
