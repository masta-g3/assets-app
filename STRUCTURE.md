# Homestead – Project Structure

This document provides a high‑level overview of the repository layout and the purpose of the main files/directories.  It acts as a quick reference when navigating the codebase.

## Top‑level

| Path | Description |
| --- | --- |
| `src/` | Svelte source code for the Homestead web application.  All runtime logic lives here. |
| `public/` | Static assets that are copied to the final build output as‑is. |
| `dist/` | Auto‑generated production build output (created by `npm run build`).  **Not edited manually.** |
| `sample_data.csv` | Example portfolio data you can import through the UI. |
| `SPEC.md` | Functional & design specification for the application. |
| `README.md` | Quick start guide, feature list and CSV format documentation. |
| `STRUCTURE.md` | (This file) Detailed repository layout reference. |
| `package.json`  & `package‑lock.json` | Project metadata and NPM dependency lockfile. |
| `vite.config.ts` | Vite build & dev‑server configuration. |
| `tsconfig*.json` | TypeScript configuration for app & tooling. |

## `src/` – application source

| Path | Description |
| --- | --- |
| `src/app.css` | Global CSS variables & base styles. |
| `src/App.svelte` | Root component – orchestrates page layout and tabs. |
| `src/main.ts` | Application entry point that mounts the root component. |
| `src/lib/` | All first‑class application logic grouped by concern. |

### `src/lib/components/`
Self‑contained UI components.  They only manage presentation logic and emit events or calls to the store when necessary.

* `Header.svelte` – Top navigation bar with theme toggle.
* `DateSlider.svelte` – Interactive timeline selector for snapshot dates.
* `KeyMetrics.svelte` – Displays high‑level portfolio statistics.
* `AllocationTable.svelte` – Editable table of platform holdings.
* `AllocationChart.svelte` – Donut chart of portfolio allocation (Chart.js).
* `PortfolioEvolutionChart.svelte` – Stacked area chart showing value over time.
* `PlatformPerformance.svelte` – Bar chart comparing platform performance.
* `ImportExport.svelte` – UI for CSV import/export and clearing data.

### `src/lib/stores/`
Centralised state management using Svelte stores.

* `assetStore.ts` – Holds all asset data, derived views, and helper actions (load/update/delete/etc.).

### `src/lib/utils/`
Pure helper functions – **no DOM or store access**.

* `calculations.ts` – Portfolio math, formatting helpers, colour lookup.
* `csv.ts` – CSV parsing/exporting (using PapaParse) plus downloads.

### `src/lib/db/`
Simple data‑access layer that wraps IndexedDB (`idb` package) with typed helper functions.

* `index.ts` – Schema definition, allowed platforms list and CRUD helpers.

## Development workflow

```
# Install dependencies
npm install

# Start dev server with hot‑reload
npm run dev

# Type‑check & lint
npm run check

# Production build
npm run build
```

To quickly see the application in action, start the dev server and import `sample_data.csv` via **Data Management → Import CSV**.

---
Keep this document up‑to‑date when files or folders are added/removed. 