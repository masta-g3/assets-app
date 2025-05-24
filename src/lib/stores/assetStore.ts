import { writable, derived } from 'svelte/store';
import type { AssetEntry } from '../db';
import { assetDb, platformTagDb } from '../db';
import { 
  sortByDate, 
  groupByDate, 
  calculateSummary, 
  calculateMonthlyRates,
  getHistoricalEntries,
  getYearStartEntries,
  getPlatformColor,
  type AssetSummary
} from '../utils/calculations';
import { calculateEnhancedAnalytics, type EnhancedAssetSummary } from '../analytics';

// State types
interface AssetState {
  loading: boolean;
  assets: AssetEntry[];
  selectedDate: string;
  allDates: string[];
  entriesByDate: Map<string, AssetEntry[]>;
  currentEntries: AssetEntry[];
  previousEntries: AssetEntry[];
  momEntries: AssetEntry[];
  yoyEntries: AssetEntry[];
  yearStartEntries: AssetEntry[];
  summary: EnhancedAssetSummary;
  comparisonPeriod: 'MoM' | 'YTD' | 'YoY';
  dataView: 'percentage' | 'absolute';
  monthlyRateData: MonthlyRateData;
  platformTags: Record<string, string>;
  allocationChartGroupBy: 'platform' | 'tag';
  platformPerformanceView: 'bar' | 'timeseries';
  timeSeriesPerformanceType: 'interval' | 'cumulative';
  timeSeriesDateRange: { start: string | null; end: string | null };
  timeSeriesShowTotal: boolean;
}

// Define structure for the rate data
export interface MonthlyRateData {
  dates: string[];
  expectedRates: number[];
  realizedRates: number[];
}

// Types for derived data
export interface PlatformPerformanceData {
  // Structure for the existing bar chart, likely remains similar
  // but driven by the main summary object.
  // This interface might not be explicitly needed if 'summary' prop is used directly.
}

export interface PlatformPerformanceTimeSeriesPoint {
  date: string; // yyyy-MM-dd
  value: number; // The calculated performance metric
}

export interface PlatformPerformanceTimeSeries {
  [platform: string]: PlatformPerformanceTimeSeriesPoint[];
}

// Create the store with initial state
const createAssetStore = () => {
  const initialState: AssetState = {
    loading: true,
    assets: [],
    selectedDate: '',
    allDates: [],
    entriesByDate: new Map(),
    currentEntries: [],
    previousEntries: [],
    momEntries: [],
    yoyEntries: [],
    yearStartEntries: [],
    summary: {
      totalValue: 0,
      totalPreviousValue: 0,
      percentChange: 0,
      absoluteChange: 0,
      avgRate: 0,
      largestHolding: { platform: '', amount: 0 },
      platforms: [],
      platformData: {},
      portfolioMetrics: {
        timeWeightedReturn: 0,
        moneyWeightedReturn: 0,
        cagr: 0,
        totalReturn: 0,
        volatility: 0
      },
      cashFlowMetrics: {
        totalContributions: 0,
        totalWithdrawals: 0,
        netContributions: 0,
        contributionGains: 0,
        investmentGains: 0,
        averageContributionAmount: 0,
        contributionFrequency: 0,
        contributionsByPeriod: []
      }
    },
    comparisonPeriod: 'MoM',
    dataView: 'percentage',
    monthlyRateData: { dates: [], expectedRates: [], realizedRates: [] },
    platformTags: {},
    allocationChartGroupBy: 'platform',
    platformPerformanceView: 'bar',
    timeSeriesPerformanceType: 'interval',
    timeSeriesDateRange: { start: null, end: null },
    timeSeriesShowTotal: false,
  };
  
  const { subscribe, set, update } = writable<AssetState>(initialState);
  
  // Helper to determine comparison entries based on period for a GIVEN DATE
  const getComparisonEntries = (
    dateForComparison: string,
    period: 'MoM' | 'YTD' | 'YoY',
    allDates: string[],
    entriesByDate: Map<string, AssetEntry[]>
  ): AssetEntry[] => {
    if (period === 'YTD') {
      return getYearStartEntries(dateForComparison, allDates, entriesByDate);
    }
    // For MoM and YoY, getHistoricalEntries handles them
    return getHistoricalEntries(dateForComparison, period, allDates, entriesByDate);
  };
  
  // Load assets from database
  const loadAssets = async () => {
    update(state => ({ ...state, loading: true }));
    
    try {
      const [assets, platformTags] = await Promise.all([
        assetDb.getAll(),
        platformTagDb.getAll()
      ]);
      
      const sortedAssets = sortByDate(assets);
      
      // Group by date for easier access
      const entriesByDate = groupByDate(assets);
      
      // Get all unique dates sorted (newest first)
      const allDates = [...entriesByDate.keys()].sort((a, b) => b.localeCompare(a));
      
      // Set selected date to most recent if available
      const selectedDate = allDates.length > 0 ? allDates[0] : '';
      
      // Get entries for selected date
      const currentEntries = selectedDate ? (entriesByDate.get(selectedDate) || []) : [];
      
      // Determine various comparison entries for the selectedDate
      const momEntries = getHistoricalEntries(selectedDate, 'MoM', allDates, entriesByDate);
      const yoyEntries = getHistoricalEntries(selectedDate, 'YoY', allDates, entriesByDate);
      const yearStartEntries = getYearStartEntries(selectedDate, allDates, entriesByDate);

      // previousEntries for summary is based on the initial comparisonPeriod  
      const previousEntries = getComparisonEntries(selectedDate, initialState.comparisonPeriod, allDates, entriesByDate);
      
      // Calculate enhanced summary statistics
      const summary = calculateEnhancedAnalytics(currentEntries, previousEntries);
      
      // Calculate monthly rates
      const monthlyRateData = calculateMonthlyRates(allDates, entriesByDate);
      
      // Update store
      update(state => ({
        ...state,
        loading: false,
        assets: sortedAssets,
        selectedDate,
        allDates,
        entriesByDate,
        currentEntries,
        previousEntries,
        momEntries,
        yoyEntries,
        yearStartEntries,
        summary,
        monthlyRateData,
        platformTags,
      }));
    } catch (error) {
      console.error('Failed to load assets:', error);
      update(state => ({ ...state, loading: false }));
    }
  };
  
  // Select a different date
  const selectDate = (date: string) => {
    update(state => {
      if (!state.entriesByDate.has(date)) {
        return state;
      }
      
      const currentEntries = state.entriesByDate.get(date) || [];
      
      // Update all date-specific comparison entries
      const momEntries = getHistoricalEntries(date, 'MoM', state.allDates, state.entriesByDate);
      const yoyEntries = getHistoricalEntries(date, 'YoY', state.allDates, state.entriesByDate);
      const yearStartEntries = getYearStartEntries(date, state.allDates, state.entriesByDate);

      // previousEntries for summary is based on the current state.comparisonPeriod
      const previousEntries = getComparisonEntries(date, state.comparisonPeriod, state.allDates, state.entriesByDate);
      
      const summary = calculateEnhancedAnalytics(currentEntries, previousEntries);
      
      // Calculate monthly rates
      const monthlyRateData = calculateMonthlyRates(state.allDates, state.entriesByDate);
      
      return {
        ...state,
        selectedDate: date,
        currentEntries,
        previousEntries,
        momEntries,
        yoyEntries,
        yearStartEntries,
        summary,
        monthlyRateData
      };
    });
  };
  
  // Set comparison period
  const setComparisonPeriod = (period: 'MoM' | 'YTD' | 'YoY') => {
    update(state => {
      // Only need to recalculate previousEntries and summary, as currentEntries and other specific
      // historical entries (mom, yoy, yearStart) depend on selectedDate, not the comparisonPeriod for the summary.
      const previousEntries = getComparisonEntries(state.selectedDate, period, state.allDates, state.entriesByDate);
      const summary = calculateEnhancedAnalytics(state.currentEntries, previousEntries);
      
      return {
        ...state,
        comparisonPeriod: period,
        previousEntries,
        summary
      };
    });
  };
  
  // Set data view mode
  const setDataView = (view: 'percentage' | 'absolute') => {
    update(state => ({ ...state, dataView: view }));
  };
  
  // Add a new asset entry
  const addEntry = async (entry: Omit<AssetEntry, 'id'>) => {
    try {
      await assetDb.add(entry);
      await loadAssets();
      return true;
    } catch (error) {
      console.error('Failed to add entry:', error);
      return false;
    }
  };
  
  // Update an asset entry
  const updateEntry = async (entry: AssetEntry) => {
    try {
      await assetDb.update(entry);
      await loadAssets();
      return true;
    } catch (error) {
      console.error('Failed to update entry:', error);
      return false;
    }
  };
  
  // Delete an asset entry
  const deleteEntry = async (id: number) => {
    try {
      await assetDb.delete(id);
      await loadAssets();
      return true;
    } catch (error) {
      console.error('Failed to delete entry:', error);
      return false;
    }
  };
  
  // Clear all data
  const clearAllData = async () => {
    update(state => ({ ...state, loading: true }));
    try {
      await Promise.all([
        assetDb.clear(),
        platformTagDb.clear()
      ]);
      set(initialState); 
      await loadAssets();
    } catch (error) {
      console.error('Failed to clear data:', error);
      update(state => ({ ...state, loading: false }));
    }
  };
  
  // Set a platform tag
  const setTag = async (platform: string, tag: string) => {
    try {
      await platformTagDb.set(platform, tag);
      update(state => {
        const newTags = { ...state.platformTags };
        if (tag) {
          newTags[platform] = tag;
        } else {
          delete newTags[platform];
        }
        return { ...state, platformTags: newTags };
      });
    } catch (error) {
      console.error('Failed to set platform tag:', error);
    }
  };

  // Set allocation chart grouping
  const setAllocationChartGroupBy = (groupBy: 'platform' | 'tag') => {
    update(state => ({ ...state, allocationChartGroupBy: groupBy }));
  };
  
  // Set platform performance chart view
  const setPlatformPerformanceView = (view: 'bar' | 'timeseries') => {
    update(state => ({
      ...state,
      platformPerformanceView: view,
    }));
  };

  const setTimeSeriesPerformanceType = (type: 'interval' | 'cumulative') => {
    update(state => ({ ...state, timeSeriesPerformanceType: type }));
  };

  const setTimeSeriesDateRange = (range: { start: string | null; end: string | null }) => {
    // Basic validation: if both defined, start should be <= end.
    // More advanced validation (e.g., valid date strings) could be added.
    if (range.start && range.end && range.start > range.end) {
      // Option: swap them, or alert, or ignore. For now, accept.
      // console.warn('Time series date range: start date is after end date.');
    }
    update(state => ({ ...state, timeSeriesDateRange: range }));
  };

  const setTimeSeriesShowTotal = (show: boolean) => {
    update(state => ({ ...state, timeSeriesShowTotal: show }));
  };
  
  return {
    subscribe,
    loadAssets,
    selectDate,
    setComparisonPeriod,
    setDataView,
    addEntry,
    updateEntry,
    deleteEntry,
    clearAllData,
    setTag,
    setAllocationChartGroupBy,
    setPlatformPerformanceView,
    setTimeSeriesPerformanceType,
    setTimeSeriesDateRange,
    setTimeSeriesShowTotal,
  };
};

// Export the store
export const assetStore = createAssetStore();

// Derived store for unique platform names across all assets
export const uniquePlatforms = derived(
  assetStore,
  ($assetStore) => {
    const platforms = new Set($assetStore.assets.map(a => a.platform));
    return Array.from(platforms).sort();
  }
);

// Derived store for Allocation Chart data, grouped by platform or tag
export const groupedAllocationData = derived(
  [assetStore],
  ([$assetStore]) => {
    const { currentEntries, platformTags, allocationChartGroupBy } = $assetStore;
    const grouped: Record<string, number> = {};

    for (const entry of currentEntries) {
      // Only include positive amounts in the allocation chart
      if (entry.amount <= 0) {
          continue;
      }
      
      let groupName = entry.platform;
      if (allocationChartGroupBy === 'tag') {
        groupName = platformTags[entry.platform] || entry.platform;
      }

      grouped[groupName] = (grouped[groupName] || 0) + entry.amount;
    }

    const sortedEntries = Object.entries(grouped).sort(([, a], [, b]) => b - a);

    const labels = sortedEntries.map(([name]) => name);
    const data = sortedEntries.map(([, amount]) => amount);
    
    const colors = sortedEntries.map(([name, _]) => {
        if (allocationChartGroupBy === 'tag') {
            const originalPlatform = Object.entries(platformTags).find(([, tag]) => tag === name)?.[0] || name;
            return getPlatformColor(originalPlatform);
        } else {
            return getPlatformColor(name);
        }
    });

    return {
      labels,
      data,
      colors,
    };
  }
);

// Derived store for Platform Performance Time Series Data
export const platformPerformanceTimeSeriesData = derived(
  [assetStore],
  ([$assetStore]): PlatformPerformanceTimeSeries => {
    const {
      allDates, // Sorted newest to oldest
      entriesByDate,
      platformPerformanceView,
      timeSeriesPerformanceType,
      timeSeriesDateRange,
      assets, // Full asset list to get all unique platforms
      timeSeriesShowTotal // ADDED for conditional logic
    } = $assetStore;

    if (platformPerformanceView === 'bar' || allDates.length === 0) {
      return {}; // Return empty if not in timeseries view or no data
    }

    // 1. Determine effective date range for the time series
    let filteredDatesChronological = [...allDates].sort((a, b) => a.localeCompare(b)); // Oldest to newest

    if (timeSeriesDateRange.start) {
      filteredDatesChronological = filteredDatesChronological.filter(d => d >= timeSeriesDateRange.start!);
    }
    if (timeSeriesDateRange.end) {
      filteredDatesChronological = filteredDatesChronological.filter(d => d <= timeSeriesDateRange.end!);
    }

    if (filteredDatesChronological.length === 0) {
      return {}; // No data within the selected range
    }

    const timeSeries: PlatformPerformanceTimeSeries = {};

    if (timeSeriesShowTotal) {
      // Calculate for "Total Portfolio"
      timeSeries["Total Portfolio"] = [];
      const totalPortfolioEntriesChronological: { date: string; totalAmount: number }[] = [];

      filteredDatesChronological.forEach(date => {
        const dayEntries = entriesByDate.get(date) || [];
        const totalAmountForDay = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);
        totalPortfolioEntriesChronological.push({ date, totalAmount: totalAmountForDay });
      });

      if (totalPortfolioEntriesChronological.length === 0) return {};

      if (timeSeriesPerformanceType === 'interval') {
        for (let i = 0; i < totalPortfolioEntriesChronological.length; i++) {
          const currentDay = totalPortfolioEntriesChronological[i];
          let performanceValue = 0;
          if (i > 0) {
            const previousDay = totalPortfolioEntriesChronological[i - 1];
            if (previousDay.totalAmount > 0) {
              performanceValue = ((currentDay.totalAmount - previousDay.totalAmount) / previousDay.totalAmount) * 100;
            } else if (currentDay.totalAmount > 0 && previousDay.totalAmount === 0) {
              performanceValue = 0; // Or 100, based on desired behavior for growth from zero
            }
          } else {
            performanceValue = 0; // First point in interval series
          }
          timeSeries["Total Portfolio"].push({ date: currentDay.date, value: performanceValue });
        }
      } else { // Cumulative
        if (totalPortfolioEntriesChronological.length > 0) {
          const firstDayTotal = totalPortfolioEntriesChronological[0].totalAmount;
          totalPortfolioEntriesChronological.forEach(currentDay => {
            let performanceValue = 0;
            if (firstDayTotal > 0) {
              performanceValue = ((currentDay.totalAmount - firstDayTotal) / firstDayTotal) * 100;
            } else if (currentDay.totalAmount > 0 && firstDayTotal === 0) {
              performanceValue = (currentDay.totalAmount === firstDayTotal) ? 0 : 100; // Growth from zero
            }
            timeSeries["Total Portfolio"].push({ date: currentDay.date, value: performanceValue });
          });
        }
      }
    } else {
      // Original per-platform logic
      const uniquePlatforms = new Set<string>();
      assets.forEach(asset => uniquePlatforms.add(asset.platform));

      uniquePlatforms.forEach(platform => {
        timeSeries[platform] = [];
        let platformEntriesInRange: AssetEntry[] = [];

        filteredDatesChronological.forEach(date => {
          const dayEntries = entriesByDate.get(date) || [];
          const platformEntry = dayEntries.find(e => e.platform === platform);
          if (platformEntry) {
            platformEntriesInRange.push(platformEntry);
          }
        });

        if (platformEntriesInRange.length === 0) return; // No data for this platform in range

        if (timeSeriesPerformanceType === 'interval') {
          for (let i = 0; i < platformEntriesInRange.length; i++) {
            const currentEntry = platformEntriesInRange[i];
            let performanceValue = 0;
            if (i > 0) {
              const previousEntry = platformEntriesInRange[i - 1];
              if (previousEntry.amount > 0) {
                performanceValue = ((currentEntry.amount - previousEntry.amount) / previousEntry.amount) * 100;
              } else if (currentEntry.amount > 0 && previousEntry.amount === 0) {
                performanceValue = 0; 
              }
            } else {
              performanceValue = 0; 
            }
            timeSeries[platform].push({ date: currentEntry.date, value: performanceValue });
          }
        } else { // Cumulative
          if (platformEntriesInRange.length > 0) {
            const firstEntryInSeries = platformEntriesInRange[0];
            const baselineAmount = firstEntryInSeries.amount;

            platformEntriesInRange.forEach(currentEntry => {
              let performanceValue = 0;
              if (baselineAmount > 0) {
                performanceValue = ((currentEntry.amount - baselineAmount) / baselineAmount) * 100;
              } else if (currentEntry.amount > 0 && baselineAmount === 0) {
                performanceValue = (currentEntry.amount === baselineAmount) ? 0 : 100;
              }
              timeSeries[platform].push({ date: currentEntry.date, value: performanceValue });
            });
          }
        }
      });
    }
    return timeSeries;
  }
);