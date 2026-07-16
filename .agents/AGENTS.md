# Pautas y Reglas de Trabajo para el Proyecto (AGENTS.md)

Este archivo define las reglas de comportamiento, la metodología de colaboración y el sistema de diseño visual unificado para las herramientas del seminario de tesis.

---

## 1. Metodología de Colaboración (Workflow)
*   **Roles:**
    *   **Antigravity (AI):** Diseña los algoritmos, escribe los scripts de simulación de MATLAB, asegura la compatibilidad de plataformas, escribe los scripts de procesamiento en Python y genera las figuras de publicación.
    *   **Usuario:** Ejecuta las simulaciones en su máquina local o en MATLAB Online (nube), genera los datos binarios (`.mat`) y proporciona el archivo o logs de salida.
*   **Interacción:**
    *   Cada vez que se complete un cambio en los archivos `.m`, el agente guiará al usuario sobre cómo correrlo.
    *   Una vez que el usuario reporte la finalización de los datos, el agente correrá scripts de Python asociados para automatizar la graficación y actualizar la documentación.

---

## 2. Sistema de Diseño Visual de Gráficos (Paper Quality)
Todos los gráficos de este proyecto deben tener el mismo diseño visual, tipografía y estilo para asegurar coherencia en la tesis y futuras publicaciones.

### Configuración Global de Matplotlib (Python):
Cualquier script de graficado (`plot_*.py`) debe inicializar la configuración de estilo usando el siguiente bloque base:

```python
plt.rcParams.update({
    "font.family":      "serif",           # Fuente con serifas (estilo LaTeX/IEEE)
    "font.size":        10,                # Tamaño base del texto
    "axes.titlesize":   11,                # Título de subplots
    "axes.labelsize":   10,                # Etiquetas de ejes
    "legend.fontsize":  8.5,               # Leyendas
    "xtick.labelsize":  8.5,               # Marcas de ejes
    "ytick.labelsize":  8.5,               # Marcas de ejes
    "axes.grid":        True,              # Mostrar cuadrícula por defecto
    "grid.linestyle":   "--",              # Cuadrícula segmentada suave
    "grid.alpha":       0.45,              # Transparencia de cuadrícula
    "figure.dpi":       150,               # Calidad de renderizado en pantalla
})
```

### Paleta de Colores y Símbolos Estándar:
*   **Verde (`#2ca02c`):** Utilizado exclusivamente para representar la versión optimizada o óptimo bayesiano de MO ($\psi^*$). Símbolo: Marcador sólido (cuadrado `s` o diamante `D`).
*   **Rojo (`#d62728`):** Utilizado exclusivamente para representar la versión original de referencia de la literatura (paper base con $\psi_{\mathrm{auto}}$). Símbolo: Marcador circular con fondo blanco (`o`, dashed line `--`).
*   **Azul (`#1f77b4`):** Utilizado para curvas generales de exploración o candidatos intermedios de búsqueda.
*   **Sombreado:** Usar sombreado translúcido (`alpha=0.15` a `0.20`) para marcar la brecha o mejora entre curvas de rendimiento.
*   **Formato de salida:** Guardar todas las figuras en la carpeta `figures_phi/` en formato **PNG a 300 DPI** utilizando `bbox_inches="tight"`.

---

## 3. Compatibilidad de Plataformas (MATLAB & OS)
*   **Evitar `LabelInterpreter` en líneas constantes:** No utilizar la propiedad `LabelInterpreter` en `xline` o `yline` en MATLAB, ya que arroja errores fatales en versiones antiguas o en MATLAB Online. En su lugar, graficar la línea constante de forma simple y dibujar el texto usando la función `text(...)` colocada al final después de un comando `drawnow`.
*   **Setup de Rutas Robustas:** Los archivos `.m` principales deben iniciar con el siguiente código robusto de rutas. Esto evita fallos cuando el usuario ejecuta copiando y pegando en la consola o cuando el directorio de MATLAB Drive es renombrado (ej. `mo_sp_gateways` vs `mo_sp_pt1`):
    ```matlab
    this_file = mfilename('fullpath');
    if isempty(this_file)
        base_dir = pwd;
    else
        this_dir = fileparts(this_file);
        base_dir = fileparts(this_dir);
    end
    % Detección de carpeta del proyecto
    if exist(fullfile(base_dir, 'topology'), 'dir')
        project_root = base_dir;
    elseif exist(fullfile(base_dir, 'mo_sp_pt1'), 'dir')
        project_root = fullfile(base_dir, 'mo_sp_pt1');
    elseif exist(fullfile(pwd, 'mo_sp_pt1'), 'dir')
        project_root = fullfile(pwd, 'mo_sp_pt1');
    else
        project_root = base_dir;
    end
    addpath(genpath(project_root));
    if exist('/MATLAB Drive/mo_sp_gateways', 'dir')
        addpath(genpath('/MATLAB Drive/mo_sp_gateways'));
    end
    ```
*   **Codificación en Consola Windows:** En Python, evitar el uso de emojis o caracteres unicode complejos (como `\u2705`) en sentencias `print()` que vayan a consola para prevenir errores de codificación `UnicodeEncodeError: 'charmap' codec can't encode...` en consolas Windows que usen `cp1252`.

---

## 4. Estructuración del Trabajo y Entrega de Entregables
*   **Avanzar Sección por Sección:** El trabajo del seminario de tesis se dividirá y abordará de forma estrictamente secuencial, cerrando una sección de resultados e investigación (ej. `phi_value`) antes de iniciar la siguiente (ej. enrutamiento cognitivo o selección de gateway).
*   **Persistencia de Imágenes y Documentación:** Todos los scripts de graficado creados por el agente deben:
    1.  Guardar físicamente la imagen generada en el directorio local del proyecto (ej. `figures_phi/`).
    2.  Registrar las imágenes y documentar el análisis asociado directamente en los archivos `.md` de la carpeta `documentation/` o el reporte principal (`llenar.md`).
    3.  Asegurar que el usuario siempre tenga acceso a las figuras directamente vinculadas a su respectiva documentación.
