# Homestead - Investment Portfolio Tracker

Homestead is a sophisticated, privacy-focused investment portfolio tracking application that provides professional-grade analytics for your financial assets. All data is stored locally in your browser, ensuring your financial information remains completely private.

## ✨ Key Features

### 📊 **Professional Analytics Engine**
- **Time-Weighted Returns (TWR)** and **Money-Weighted Returns (MWR)** calculations
- **CAGR (Compound Annual Growth Rate)** analysis with data quality detection
- **Volatility analysis** with proper frequency detection and sanity checks
- **Attribution analysis** - distinguish between contribution growth vs market performance
- **Smart data quality detection** - enhanced analytics when contribution data is available

### 🎯 **Risk Analysis Dashboard**
- **Volatility, VaR, and drawdown calculations** (when data supports reliable metrics)
- **Platform diversification analysis** always available
- **Correlation analysis** between different platforms
- **Smart hiding approach** - shows educational content instead of misleading numbers
- **Sanity checks** with 5-50% volatility range validation

### 🏦 **Portfolio Management**
- **Multi-platform tracking** across 401k, Wealthfront, savings, real estate, crypto, etc.
- **Platform tagging system** for custom groupings and alternative chart views
- **Contribution tracking** with automatic transaction type detection
- **Enhanced data model** supporting both snapshot-only and enhanced analytics

### 📈 **Advanced Visualizations**
- **Portfolio evolution charts** with contribution attribution toggle
- **Platform performance comparisons** with time series analysis
- **Allocation charts** with platform/tag switching
- **Interactive date range controls** for time series analysis
- **Responsive Chart.js integration** with mobile-optimized touch interactions

### 🎓 **User Experience**
- **4-step interactive onboarding** for new users
- **Smart empty states** with contextual guidance and actions
- **Modal-based help system** for comprehensive CSV format guides
- **Mobile-responsive design** with accessibility features (ARIA labels, keyboard navigation)
- **Theme support** with consistent design system

### 🔐 **Privacy & Data Management**
- **100% client-side storage** using IndexedDB - no data ever sent to servers
- **Enhanced CSV import/export** with validation, error reporting, and progress indicators
- **Data quality indicators** showing available analytics capabilities
- **Automatic data migration** for schema upgrades

## 🏗️ Technology Stack

- **Svelte + TypeScript** for reactive UI with type safety
- **Chart.js** with date adapters and annotation plugins for advanced visualizations
- **IndexedDB** (via idb) for robust local data storage with migrations
- **date-fns** for comprehensive date manipulation
- **PapaParse** for CSV parsing with validation
- **Vite** for fast development and optimized production builds

## 🚀 Getting Started

### Quick Start
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Visit `http://localhost:5173` and complete the onboarding tutorial
5. Import `sample_data.csv` via **Data Management → Import CSV** to see the app in action

### Development Workflow
```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Type-check and lint
npm run check

# Production build
npm run build
```

## 📁 Project Structure

A detailed technical overview is available in [STRUCTURE.md](STRUCTURE.md). The app follows a modular architecture:

- `src/lib/analytics/` - Professional-grade analytics engine
- `src/lib/components/` - UI components with advanced features
- `src/lib/stores/` - Centralized state management
- `src/lib/utils/` - Pure helper functions
- `src/lib/db/` - IndexedDB data access layer

## 📊 Sample Data & CSV Format

### Getting Started
The repository includes `sample_data.csv` and `sample_test_data.csv` for testing different data scenarios. Import via **Data Management → Import CSV**.

### Enhanced CSV Format
The app supports both basic and enhanced CSV formats:

#### Basic Format (Snapshot-only)
```csv
Date,Platform,Amount,Rate
2024-01-01,Wealthfront,15000,7.5
2024-01-01,401k,45000,6.8
2024-02-01,Wealthfront,15500,7.5
2024-02-01,401k,46000,6.8
```

#### Enhanced Format (With Contributions)
```csv
Date,Platform,Amount,Rate,TransactionType,ContributionAmount,Notes
2024-01-01,Wealthfront,15000,7.5,contribution,500,Monthly contribution
2024-01-01,401k,45000,6.8,contribution,1000,Payroll deduction
2024-02-01,Wealthfront,15500,7.5,contribution,500,Monthly contribution
2024-02-01,401k,46000,6.8,contribution,1000,Payroll deduction
```

#### Field Descriptions
- **Date**: YYYY-MM-DD format (consistent monthly snapshots recommended)
- **Platform**: Platform/account name (e.g., "Wealthfront", "401k", "Savings")
- **Amount**: Current account balance as number (no currency symbols)
- **Rate**: Expected annual return percentage (e.g., 7.5 for 7.5%)
- **TransactionType**: `snapshot` or `contribution` (optional, auto-detected)
- **ContributionAmount**: Money added this period (optional, enables enhanced analytics)
- **Notes**: Optional description field

### Data Quality Impact
- **Snapshot-only data**: Basic analytics, portfolio evolution, platform comparison
- **Enhanced data (with contributions)**: Full analytics suite including TWR, attribution analysis, and risk metrics

## 🎯 Current Development Status

The app is in **Phase 5** of development with production-ready core features:

### ✅ **Completed Phases**
- **Phase 1-4**: Core functionality, analytics engine, visualization improvements, UX polish
- **Phase 5.1**: Smart risk analysis and diversification metrics

### 🚧 **In Progress**
- **Phase 5.2**: Benchmark comparison system (S&P 500 integration)
- **Phase 5.3**: Goal tracking and progress analysis
- **Phase 5.4**: Enhanced platform intelligence and management

See [PLANNING.md](PLANNING.md) for detailed development roadmap and technical decisions.

## 💡 Usage Tips

1. **Start Simple**: Use the onboarding tutorial to add your first asset
2. **Monthly Updates**: Consistent monthly snapshots provide the best analytics
3. **Track Contributions**: Include contribution amounts to unlock advanced analytics
4. **Platform Tags**: Use tags to group platforms for alternative chart views
5. **Export Regularly**: Use CSV export for data backup
6. **Mobile Friendly**: Full functionality available on phones and tablets

## 📱 Accessibility & Mobile Support

- **Responsive design** optimized for all screen sizes
- **Touch-friendly controls** with 44px minimum touch targets
- **Keyboard navigation** with proper tab order and ARIA labels
- **Screen reader support** with semantic HTML and ARIA attributes
- **High contrast** support with theme-consistent color system

## 🔒 Privacy Commitment

- **Zero server communication** - all data processing happens in your browser
- **No analytics tracking** - your usage patterns are not monitored
- **No external dependencies** at runtime - works completely offline
- **Local storage only** - your data never leaves your device
- **Open source** - verify privacy claims by reviewing the code

## 📄 License

MIT