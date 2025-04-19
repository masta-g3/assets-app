import { writable, derived } from 'svelte/store';
import type { AssetEntry } from '../db';
import { assetDb } from '../db';
import { 
  sortByDate, 
  groupByDate, 
  calculateSummary, 
  calculateMonthlyRates,
  getHistoricalEntries,
  getYearStartEntries,
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
    monthlyRateData: { dates: [], expectedRates: [], realizedRates: [] }
  };
  
  const { subscribe, set, update } = writable<AssetState>(initialState);
  
  // Load assets from database
  const loadAssets = async () => {
    update(state => ({ ...state, loading: true }));
    
    try {
      // Get all assets from DB
      const assets = await assetDb.getAll();
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
        monthlyRateData
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
    try {
      await assetDb.clear();
      await loadAssets();
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
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
    clearAllData
  };
};

// Export the store
export const assetStore = createAssetStore();