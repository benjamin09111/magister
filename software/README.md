# 6TiSCH Multi-Objective Routing Simulator

Interactive Python/Next.js simulator for **real-time routing and scheduling in
TSCH wireless sensor-actuator networks (WSAN)**. It replicates and extends the
EDF scheduling + minimal-overlap shortest-path routing framework from
Gutiérrez Gaitán et al., *"EDF scheduling and minimal-overlap shortest-path
routing for real-time TSCH networks"* (NG-RES 2021,
[10.4230/OASIcs.NG-RES.2021.2](https://doi.org/10.4230/OASIcs.NG-RES.2021.2)),
originally developed in MATLAB (see `mo_sp_pt1/`, `mo_sp_pt2/` at the
repository root) and reimplemented here in Python (FastAPI) with an
interactive Next.js web UI.

Developed as part of a magíster (M.Sc.) thesis at Universidad Diego Portales,
with the goal of eventual publication as an original software article in
[SoftwareX](https://www.sciencedirect.com/journal/softwarex).

## Code metadata

| | |
|---|---|
| Current code version | 0.1.0 |
| Permanent link to code/repository | *pending — no public repository created yet* |
| Permanent link to Reproducible Capsule | *pending* |
| Legal code license | [MIT](./LICENSE) |
| Code versioning system used | git |
| Software code languages, tools & services used | Python 3.11+ (FastAPI, NetworkX, NumPy, matplotlib, SQLite/aiosqlite), TypeScript/Next.js 16 (React, Recharts, Cytoscape.js, Zustand) |
| Compilation requirements, operating environments & dependencies | Python 3.11+; Node.js 20+; see `backend/requirements.txt` and `package.json` |
| If available, link to developer documentation/manual | This README + in-app "Información Técnica" tab |
| Support email for questions | *pending — add before submission* |

## Architecture

```
software/
├── app/                    # Next.js App Router pages
├── components/             # React components (graph, charts, config panels, info)
├── lib/                    # Zustand store, TypeScript types, API client
├── backend/
│   ├── main.py             # FastAPI app: all HTTP endpoints
│   ├── models/              # Pydantic request/response models
│   ├── engine/              # Core algorithms (topology, routing, scheduler, metrics)
│   ├── db/                  # SQLite persistence (history, saved topologies, datasets)
│   ├── validation/           # MATLAB <-> Python cross-validation suite
│   └── tests/                # pytest suite
└── public/figures_phi/      # Generated matplotlib figures (sweep plots)
```

The frontend talks to the backend over a local REST API
(`NEXT_PUBLIC_API_URL`, default `http://127.0.0.1:8000`). There is no
database server to install — persistence uses a local SQLite file
(`backend/db/history.db`, created automatically on first run).

## Installation

**Backend (Python 3.11+):**

```bash
cd software/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

**Frontend (Node.js 20+):**

```bash
cd software
npm install
```

## Quickstart

From `software/`, run both processes (two terminals, or use the bundled
`npm run dev` which launches both — see `dev-runner.js`):

```bash
# Terminal 1 — backend
cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
npm run dev
```

Open `http://localhost:3000`. The app auto-generates a default topology on
first load; use the "Simulador" tab to configure N/λ/gateway/algorithm and
run a simulation, "Comparación" to run two algorithms side by side, and
"Investigación" for Monte Carlo parameter sweeps (10 to 1000 topology
replicas) with persistent, re-plottable datasets.

## Testing

```bash
cd software/backend
pip install -r requirements-dev.txt
pytest -v
```

53+ tests cover: schedulability correctness (the `forall t in (0,H]` test,
not just `t=H`), topology generation determinism, routing algorithm
properties (MO never worse than SP baseline), TSCH scheduler half-duplex/
channel-limit constraints, and the multi-gateway clustering/routing port.

Frontend:

```bash
cd software
npx tsc --noEmit   # type-check
npm run build      # production build
npm run lint       # currently reports pre-existing violations, see "Known limitations" below
```

CI (`.github/workflows/ci.yml`) runs the backend test suite and the frontend
type-check/build on every push touching `software/`.

## Reproducibility

Every simulation run is driven by an explicit, reported **seed**: if you
don't supply one, the server draws one and returns it, so any run (topology,
sensor sampling, flow periods, and the stochastic routing methods) can be
replayed exactly. See the in-app "Información Técnica" tab for the full
methodology (schedulability formulas, algorithms, multi-gateway clustering).

### MATLAB &harr; Python cross-validation

See [`backend/validation/README.md`](backend/validation/README.md) for the
two-tier validation methodology comparing this Python port against the
MATLAB reference (`mo_sp_pt1/`), and
`backend/validation/validate_topology_statistics.py` for a statistical
(Kolmogorov-Smirnov) comparison of the topology generators, as opposed to
just the mathematical argument that both are G(N,p) binomial random graphs.
Both scripts require running a companion `.m` script once in MATLAB — this
has not yet been done (no MATLAB execution environment was available while
building this suite), so the cross-language comparison is currently
Python-side self-consistent but not yet cross-validated against real MATLAB
output.

## Fidelity to the baseline paper — known deviations

This software is not a byte-for-byte port of the MATLAB reference; some
choices intentionally diverge, and are documented (not hidden) in the
in-app "Información Técnica" tab, section 7. In summary:

- **dbf, not ff-dbf**: the paper's *forced-forward* demand-bound function
  (ff-dbf, from Baruah et al. 2010 and the author's own FF-DBF-WIN 2018
  work) is NOT implemented. Both this software and the MATLAB reference use
  the classical EDF demand-bound function instead. Implementing the exact
  ff-dbf bound correctly requires the precise recursive formula from those
  two papers, which was not available while this fidelity pass was done —
  rather than guess at a plausible-looking but unverified formula, this is
  left as an explicitly flagged fidelity gap for future work.
- **sbf(t) = t**: the supply-bound function is the trivial TDMA identity
  (no blackout/overhead modeling).
- **Erdős–Rényi, not sprand**: mathematically equivalent (both G(N,p)), and
  now backed by a statistical KS-test tool (see above) — but the real
  cross-language run is still pending.
- **Multi-gateway comparison mode**: SP-MG/MO-MG work in the single-run
  "Simulador" tab; the side-by-side "Comparación" tab does not support
  multi-gateway yet.

## Comparison with existing TSCH/6TiSCH simulation software

*(First draft for the eventual manuscript — verify and expand before
submission; the author should confirm current feature sets, as tooling in
this space evolves.)*

| | This software | [6TiSCH Simulator](https://github.com/openwsn-berkeley/6tisch-simulator) | Contiki-NG / Cooja |
|---|---|---|---|
| Focus | Routing/scheduling **co-design** analysis (overlap-minimization heuristic + EDF schedulability) | Full protocol-stack discrete-event simulation (6TiSCH/RPL/6top) | Firmware-level emulation of real TSCH stacks |
| Language | Python + web UI | Python | C (Contiki-NG) + Java (Cooja) |
| Interactive web UI | Yes (topology editor, live schedule grid, sbf/dbf charts) | No (scripted, log/plot post-processing) | Partial (Cooja GUI, not web-based) |
| Schedulability analysis (sbf/dbf) | Built-in, per-run and incremental | Not built-in | Not built-in |
| Batch/Monte Carlo studies with persistent datasets | Yes (10–1000 topologies, SQLite-backed) | Via external scripting | Via external scripting |
| Realism | Analytical/graph-based (no radio propagation model) | High (packet-level, radio duty cycling) | Highest (real firmware) |

The niche this software occupies: a **fast, interactive, analysis-first**
tool for exploring how routing decisions affect EDF schedulability in TSCH
networks — complementary to, not a replacement for, full protocol-stack
simulators when packet-level/radio-level realism is required.

## Known limitations (transparency, not marketing)

- `npm run lint` currently reports ~79 pre-existing errors/warnings across
  files predating this fidelity pass (mostly `@typescript-eslint/no-explicit-any`
  and unused-variable warnings). CI runs it as a non-blocking report step.
  Cleaning these up is future work.
- No public GitHub repository or Zenodo DOI archive yet — required before
  a SoftwareX submission.

## License

[MIT](./LICENSE). See [`CITATION.cff`](./CITATION.cff) for citation metadata.
