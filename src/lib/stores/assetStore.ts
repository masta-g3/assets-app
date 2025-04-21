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
  summary: AssetSummary;
  comparisonPeriod: 'MoM' | 'YTD' | 'YoY';
  dataView: 'percentage' | 'absolute';
  monthlyRateData: MonthlyRateData;
  platformTags: Record<string, string>;
  allocationChartGroupBy: 'platform' | 'tag';
}

// Define structure for the rate data
export interface MonthlyRateData {
  dates: string[];
  expectedRates: number[];
  realizedRates: number[];
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
    summary: {
      totalValue: 0,
      totalPreviousValue: 0,
      percentChange: 0,
      absoluteChange: 0,
      avgRate: 0,
      largestHolding: { platform: '', amount: 0 },
      platforms: [],
      platformData: {}
    },
    comparisonPeriod: 'MoM',
    dataView: 'percentage',
    monthlyRateData: { dates: [], expectedRates: [], realizedRates: [] },
    platformTags: {},
    allocationChartGroupBy: 'platform',
  };
  
  const { subscribe, set, update } = writable<AssetState>(initialState);
  
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
      const currentEntries = entriesByDate.get(selectedDate) || [];
      
      // Get previous date entries based on default comparison period (MoM)
      const previousEntries = getHistoricalEntries(selectedDate, 'MoM', allDates, entriesByDate);
      
      // Get month-over-month and year-over-year entries
      const momEntries = getHistoricalEntries(selectedDate, 'MoM', allDates, entriesByDate);
      const yoyEntries = getHistoricalEntries(selectedDate, 'YoY', allDates, entriesByDate);
      
      // Calculate summary statistics
      const summary = calculateSummary(currentEntries, previousEntries);
      
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
      let previousEntries: AssetEntry[] = [];
      if (state.comparisonPeriod === 'MoM') {
        previousEntries = getHistoricalEntries(date, 'MoM', state.allDates, state.entriesByDate);
      } else if (state.comparisonPeriod === 'YoY') {
        previousEntries = getHistoricalEntries(date, 'YoY', state.allDates, state.entriesByDate);
      } else {
        previousEntries = getYearStartEntries(date, state.allDates, state.entriesByDate);
      }

      const summary = calculateSummary(currentEntries, previousEntries);
      
      // Calculate monthly rates
      const monthlyRateData = calculateMonthlyRates(state.allDates, state.entriesByDate);
      
      return {
        ...state,
        selectedDate: date,
        currentEntries,
        previousEntries,
        momEntries: getHistoricalEntries(date, 'MoM', state.allDates, state.entriesByDate),
        yoyEntries: getHistoricalEntries(date, 'YoY', state.allDates, state.entriesByDate),
        summary,
        monthlyRateData
      };
    });
  };
  
  // Set comparison period
  const setComparisonPeriod = (period: 'MoM' | 'YTD' | 'YoY') => {
    update(state => {
      let previousEntries: AssetEntry[] = [];

      if (period === 'MoM') {
        previousEntries = getHistoricalEntries(state.selectedDate, 'MoM', state.allDates, state.entriesByDate);
      } else if (period === 'YoY') {
        previousEntries = getHistoricalEntries(state.selectedDate, 'YoY', state.allDates, state.entriesByDate);
      } else {
        previousEntries = getYearStartEntries(state.selectedDate, state.allDates, state.entriesByDate);
      }

      const summary = calculateSummary(state.currentEntries, previousEntries);

      // Calculate monthly rates
      const monthlyRateData = calculateMonthlyRates(state.allDates, state.entriesByDate);

      return {
        ...state,
        comparisonPeriod: period,
        previousEntries,
        summary,
        monthlyRateData
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