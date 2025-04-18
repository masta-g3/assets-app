# Asset Management Specification: "Homestead"

## Overview

This specification outlines the migration of the current Assets management tool to a modern HTML/JS framework. The new application, titled "Homestead," will integrate the core "Forager" design philosophy (nature, foraging) with subtle undertones inspired by land cultivation and strategic property development. Users will manage their financial assets as if tending to plots of land within their personal economic landscape. **Crucially, this version adopts a privacy-first approach, storing all data locally within the user's browser, with options to import/export data via CSV.**

## Design Philosophy

### Core Aesthetic
- **Cultivated Minimalism**: Clean layouts reminiscent of well-tended gardens or organized land parcels, using natural textures and organic shapes within a structured grid.
- **Biophilic Interface**: Integration of natural elements – wood grains, stone textures, leaf patterns – signifying asset types or platforms.
- **Value Visualization**: Clear, intuitive representation of asset growth and value changes, perhaps visualized as structures developing on a plot or increasing yield.
- **Color-Coded Districts**: Platforms/asset types grouped visually using distinct, natural color palettes (e.g., forest greens for equities, earthy browns for real estate, watery blues for cash equivalents).
- **Strategic Overview**: Dashboard elements providing a high-level view of the entire portfolio, akin to surveying one's land holdings.

### Color Palette
- Primary: Earthy tones - deep soil browns (#6B4F4F), stone grays (#A0A0A0), vegetation greens (#5F7464).
- Accent: Mineral tones for highlights (#C0A183 - sandstone), sky blues for liquidity (#A7C5E8), perhaps a richer ochre for high-growth assets (#D48C3F).
- Background: Textured paper/parchment (#F4F1EA), potentially with subtle grid lines like survey maps.
- Text: Dark slate (#3C3C3C) for readability.

### Typography
- Primary: A clear, sturdy sans-serif suggesting reliability and structure (e.g., Inter, Public Sans).
- Secondary: A slightly more decorative serif for headings or key figures, hinting at established value (e.g., EB Garamond).
- Consistent legibility and clear information hierarchy are paramount.

## Technical Requirements

### Framework Selection
- Implement using a lightweight, reactive framework (Svelte preferred, or Vue/Alpine.js).
- Strict dependency management – minimize bloat.
- Focus on fast load times and efficient rendering, especially for charts and data tables.

### Data Architecture
- **Client-Side First**: All asset data is stored exclusively in the user's browser using LocalStorage or IndexedDB (preferred for potentially larger datasets).
- **No Backend Dependency**: The application operates entirely client-side after initial load, requiring no dedicated backend server for data persistence.
- **Optional CSV Import**: Users can initiate their portfolio by importing data from a CSV file adhering to a specified format. The application will parse this file and populate the local storage.
- **Manual Export**: Users can export their entire portfolio data to a CSV file as a backup or for use elsewhere.
- **Data Structure**: Asset data should be stored in a structured format (e.g., a JSON object or array representing timeseries data) within the chosen browser storage mechanism.
- **Error Handling**: Robust handling for storage limits, parsing errors during CSV import, and potential data corruption.

### Responsive Design
- Mobile-first design ensuring excellent usability on small screens.
- Adapt layouts gracefully for tablet and desktop, utilizing screen real estate for richer visualizations (e.g., side-by-side comparisons, detailed charts).
- Touch interactions optimized; keyboard navigation fully supported.

### Performance Targets
- First Contentful Paint (FCP): < 1.2s
- Time To Interactive (TTI): < 2.5s
- Smooth chart transitions and data table updates (60fps).
- Initial bundle size target: < 150KB (gzipped).

## Functionality Map

*(Replicates and enhances features from `pages/🏡Assets.py`)*

### Core Asset Tracking

#### Data Entry & Management
- **Streamlined Entry**: Intuitive form (perhaps modal or sidebar) for adding new asset snapshots (Date, Platform/District, Amount, Expected Rate). Data is saved directly to local storage.
- **Historical View**: Interactive timeline/slider to select and view past portfolio snapshots read from local storage.
- **Allocation Table**: Editable data grid displaying the selected snapshot's assets.
    - Columns: Platform (District), Amount (Current Value), Expected Rate, Allocation %.
    - Visual distinction for different platforms/districts (color-coding).
    - Dynamic editing, addition, deletion of rows within a snapshot, updating local storage.
    - Clear indication of unsaved changes (if applicable for bulk edits) and a prominent save action to commit to local storage.
- **CSV Import**: A dedicated button/section allowing users to upload a CSV file. Includes file validation and user feedback on success/failure.
- **CSV Export**: A button to generate and download a CSV file containing all portfolio data currently stored locally.

#### Portfolio Overview Dashboard
- **Key Metrics**: Prominent display of:
    - Total Portfolio Value (with change indicator vs. previous period).
    - Period-based Change: MoM, YTD, YoY (selectable, showing % and absolute).
    - Average Expected Rate.
    - Largest Holding (Platform/District and its value).
- **Visual Allocation**: Donut chart or treemap visualizing current asset allocation by platform/district.

### Performance Analysis & Visualization

#### Portfolio Evolution
- **Timeline Chart**: Interactive stacked area chart showing total portfolio value growth over time, segmented by platform/district.
    - Tooltips showing value per platform and total on hover.
    - Vertical line indicating the selected snapshot date.

#### Value Changes Analysis
- **Change Chart**: Interactive bar chart visualizing period-over-period changes (MoM default, selectable).
    - Toggle between Absolute ($) and Percentage (%) change.
    - Toggle between viewing changes per Platform/District and Total Portfolio change.
    - Clear positive/negative color coding.
    - Tooltips showing current and previous values.

#### District Performance Comparison
- **Horizontal Bar Chart**: Comparing the performance (% change) of different platforms/districts over a selected timeframe (MoM, YTD, YoY).
    - Bars color-coded by platform type.
    - Text labels showing % change.
    - Tooltips revealing absolute change and current/past values.
- **Key Statistics**: Display Best and Worst performing districts for the selected timeframe.

### Potential Enhancements (Post-MVP)
- **Goal Setting**: Define financial goals ("Landmarks") and track progress towards them.
- **Contribution Tracking**: Visualize deposits/withdrawals vs. market appreciation.
- **Scenario Modeling**: Simple tool to project future value based on rates/contributions.
- **Asset Grouping**: Allow users to create custom groups beyond platforms (e.g., "Retirement Plots", "Speculative Ventures").

## Interaction Design

### Animations & Transitions
- Smooth chart rendering and updates.
- Subtle animations on metric changes (e.g., number roll-up).
- Visual feedback on data saving (e.g., button state change, brief confirmation).
- Hover effects on chart elements and table rows to reveal more details, reminiscent of inspecting a property card.

### Micro-interactions
- Allocation percentages dynamically update as values are edited in the table.
- Interactive elements provide clear visual cues (hover states, focus rings).
- Date slider interaction should feel smooth and responsive.
- Switching between timeframes or chart types should have subtle, non-jarring transitions.

## Accessibility Requirements

- WCAG 2.1 AA compliance.
- Semantic HTML for screen reader compatibility.
- Full keyboard navigability for all interactive elements.
- Sufficient color contrast for text and UI elements, including chart colors.
- Data tables properly marked up for accessibility.
- Respect `prefers-reduced-motion` media query.

## Technical Integration

### Client-Side Storage & Data Handling
- **Storage Mechanism**: Use IndexedDB for robustness and larger data capacity. Fallback to LocalStorage only if IndexedDB implementation is overly complex for the initial scope (clearly document this trade-off).
- **Data Serialization**: Store data as JSON strings in LocalStorage or as JavaScript objects directly in IndexedDB.
- **Schema**: Define a clear JavaScript object schema for storing the portfolio timeseries data (e.g., `[{date: "YYYY-MM-DD", platform: "...", amount: ..., rate: ...}, ...]`).
- **CSV Parsing**: Implement using a reliable library (e.g., PapaParse.js) to handle various CSV dialects and edge cases.
- **CSV Generation**: Implement logic to format the locally stored data into the specified CSV format for download.
- **Data Validation**: Implement checks during CSV import and data entry to ensure data integrity (e.g., valid dates, numeric amounts/rates).

### State Management
- Use framework's built-in state management (e.g., Svelte stores) or a lightweight library (e.g., Zustand).
- State should be initialized from local storage on application load.
- Changes should be persisted back to local storage.
- Manage loading states (e.g., during CSV import) and error states (e.g., storage full, invalid CSV).

## Development Guidelines

### Code Quality
- TypeScript strongly recommended.
- Modular, component-based architecture.
- Comprehensive unit/integration tests for critical frontend logic (calculations, state changes, local storage interactions, CSV parsing/generation).
- Utilize CSS custom properties for theming and maintainability.
- Linting and formatting standards enforced.

### Build Process
- Use Vite for development server and optimized production builds.
- Code splitting and lazy loading for non-critical components/routes.
- Image and asset optimization.

## Deployment Strategy

- **Static Deployment**: The application is deployed as a static website.
- **Hosting**: Use platforms like Vercel, Netlify, GitHub Pages, or S3/CloudFront.
- **HTTPS**: Enforced via the hosting platform.
- **No Backend**: No server-side components need deployment or maintenance for core functionality.

## Phase 1 MVP Features
- View historical snapshots via date slider (reading from local storage).
- Display key metrics for selected snapshot.
- Display editable allocation table for selected snapshot (saving to local storage).
- Display Portfolio Evolution chart.
- Display Allocation donut/treemap.
- Basic Performance Analysis tab (MoM changes chart, MoM performance comparison).
- **CSV Import Functionality**.
- **CSV Export Functionality**.
- Core accessibility features.

## Handoff Materials
- This specification document.
- Wireframes/Mockups illustrating the "Homestead" theme (to be provided).
- **Expected CSV Format Definition** (see Appendix).
- List of allowed platforms (`ALLOWED_PLATFORMS` in `Assets.py`).

---

## Technical Appendix: Expected CSV Data Format

The application should support importing and exporting data in a CSV format with the following structure:

- **Headers**: The CSV file **must** contain the following headers in the first row:
  `Date,Platform,Amount,Rate`
- **Columns**:
    - `Date`: Text, formatted as `YYYY-MM-DD` (e.g., `2023-10-26`).
    - `Platform`: Text, corresponding to the allowed asset platforms/districts.
    - `Amount`: Numeric, representing the asset value. Should not contain currency symbols or commas.
    - `Rate`: Numeric, representing the expected annual rate as a percentage (e.g., `5.0` for 5%, `0.25` for 0.25%).
- **Encoding**: UTF-8 is recommended.
- **Delimiter**: Comma (`,`).

**Example CSV Content:**

```csv
Date,Platform,Amount,Rate
2023-01-15,Wealthfront,15000.50,4.5
2023-01-15,Robinhood,5200.75,0
2023-01-15,Real Estate,250000,3.0
2023-02-15,Wealthfront,15500.00,4.5
2023-02-15,Robinhood,5100.25,0
2023-02-15,Real Estate,252500,3.1
```

*The engineer should implement robust parsing to handle potential variations or errors in the CSV file gracefully, providing informative feedback to the user.* 