# Homestead - Asset Management

Homestead is a privacy-focused asset management application that allows you to track and visualize your financial assets. All data is stored locally in your browser, ensuring your financial information remains private.

## Features

- **Privacy First**: All data is stored in your browser's IndexedDB. No data is sent to any server.
- **Asset Tracking**: Track assets across multiple platforms and accounts.
- **Historical View**: See how your portfolio has evolved over time.
- **Performance Analysis**: Analyze performance by platform and time periods.
- **Data Management**: Import and export data via CSV for backup or use in other applications.
- **Responsive Design**: Works on desktop, tablet, and mobile devices.

## Technology Stack

- **Svelte** for a reactive UI with minimal bundle size
- **TypeScript** for type safety
- **Chart.js** for data visualization
- **IndexedDB** (via idb) for local data storage
- **date-fns** for date manipulation
- **PapaParse** for CSV parsing and generation
- **Vite** for fast development and optimized builds

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Build for production: `npm run build`

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type‑check & lint
npm run check

# Production build
npm run build
```

## Project Structure

A detailed overview is available in [STRUCTURE.md](STRUCTURE.md).  The main app source lives in `src/` and components are grouped under `src/lib`.

## Sample Data

The repository contains `sample_data.csv` that can be imported via **Data Management → Import CSV** inside the application.  This is helpful for demos or initial testing.

## CSV Format

Import and export data using CSV files with the following format:

```csv
Date,Platform,Amount,Rate
2023-01-15,Wealthfront,15000.50,4.5
2023-01-15,Robinhood,5200.75,0
2023-01-15,Real Estate,250000,3.0
```

- **Date**: YYYY-MM-DD format
- **Platform**: The name of the asset platform/account
- **Amount**: Numeric value of the asset (no currency symbols)
- **Rate**: Expected annual rate of return as a percentage

## License

MIT