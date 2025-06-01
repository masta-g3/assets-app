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
* `EnhancedKeyMetrics.svelte` – Displays high‑level portfolio statistics with analytics.
* `AllocationTable.svelte` – Editable table of platform holdings with simplified snapshot/contribution model, automatic transaction type detection, and bulk snapshot functionality for efficient monthly updates.
* `AllocationChart.svelte` – Donut chart of portfolio allocation (Chart.js) with platform/tag toggle and helpful guidance when no tags are assigned.
* `PortfolioEvolutionChart.svelte` – Stacked area chart showing value over time.
* `PlatformPerformance.svelte` – Bar chart comparing platform performance.
* `ImportExport.svelte` – UI for CSV import/export and clearing data.
* `CSVFormatModal.svelte` – Modal dialog for CSV format guide and documentation.
* `DataQualityIndicator.svelte` – Shows data quality status and available analytics.
* `WelcomeOnboarding.svelte` – 4-step interactive onboarding flow for new users.
* `EmptyState.svelte` – Reusable empty state component with contextual guidance and actions.
* `PlatformTagEditor.svelte` – Platform tagging system for custom groupings.
* `RiskAnalysisDashboard.svelte` – Comprehensive risk analysis dashboard with volatility, drawdown, and diversification metrics.
* `KeyMetrics.svelte` – Legacy key metrics component.

### `src/lib/stores/`
Centralised state management using Svelte stores.

* `assetStore.ts` – Holds all asset data, derived views, and helper actions (load/update/delete/etc.).

### `src/lib/utils/`
Pure helper functions – **no DOM or store access**.

* `calculations.ts` – Portfolio math, formatting helpers, colour lookup.
* `csv.ts` – CSV parsing/exporting (using PapaParse) plus downloads.

### `src/lib/db/`
Simple data‑access layer that wraps IndexedDB (`idb` package) with typed helper functions.

* `index.ts` – Simplified schema with snapshot and contribution transaction types.

### `src/lib/analytics/`
Professional-grade analytics engine for investment performance calculations.

#### `src/lib/analytics/core/`
* `performance.ts` – TWR, MWR, CAGR calculations with mixed data quality handling.

#### `src/lib/analytics/risk/`
* `index.ts` – Risk analysis engine with volatility, drawdown, VaR calculations, and diversification metrics.

#### `src/lib/analytics/types/`
* `metrics.ts` – Type definitions for performance and cash flow metrics.

### **Analytics System**

**Core Analytics** (`src/lib/analytics/`):
* `index.ts` – Main analytics API with enhanced summary calculations.
* `core/` – Core calculation functions (summary, grouping, time-series).
* `performance/` – Performance metrics (TWR, MWR, CAGR, volatility).
* `risk/` – **SMART RISK ANALYSIS** with data quality detection and TWR-based calculations.
* `goals/` – Goal tracking and progress analysis.
* `types/metrics.ts` – Comprehensive TypeScript interfaces for all analytics.

**Smart Risk Analysis Features**:
* **Data Quality Detection**: Automatically detects ENHANCED (with contributions) vs SNAPSHOT_ONLY data
* **TWR-Based Calculations**: Proper Time-Weighted Return calculations for investment risk metrics
* **Smart Hiding**: Hides misleading metrics instead of showing wrong numbers with warnings
* **Educational UX**: Clear explanations of what's missing and how to unlock more features
* **Sanity Checks**: Volatility validation (5-50% range) and extreme return filtering

## Data Model (Simplified)

The application now uses a clean, minimal data model:

**Transaction Types:**
- `snapshot`: Total account balance at a point in time
- `contribution`: Money added to the account (requires contributionAmount)

**Data Quality:**
- `enhanced`: Entries with contribution data for proper analytics
- `snapshot_only`: Legacy snapshot-only data

This simplified model ensures clean analytics while maintaining backward compatibility.

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