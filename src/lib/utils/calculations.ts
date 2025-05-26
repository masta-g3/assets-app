import type { AssetEntry } from '../db';
import { format, parse, isAfter, isBefore, addMonths, addYears, subMonths, subYears } from 'date-fns';

export interface AssetSummary {
  totalValue: number;
  totalPreviousValue: number;
  percentChange: number;
  absoluteChange: number;
  avgRate: number;
  largestHolding: {
    platform: string;
    amount: number;
  };
  platforms: string[];
  platformData: {
    [platform: string]: {
      amount: number;
      rate: number;
      percentage: number;
      previousAmount: number;
      percentChange: number;
      absoluteChange: number;
    };
  };
}

// Sort entries by date (newest first)
export const sortByDate = (entries: AssetEntry[]): AssetEntry[] => {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
};

// Group entries by date
export const groupByDate = (entries: AssetEntry[]): Map<string, AssetEntry[]> => {
  const dateMap = new Map<string, AssetEntry[]>();
  
  entries.forEach(entry => {
    if (!dateMap.has(entry.date)) {
      dateMap.set(entry.date, []);
    }
    dateMap.get(entry.date)?.push(entry);
  });
  
  return dateMap;
};

// Group entries by platform
export const groupByPlatform = (entries: AssetEntry[]): Map<string, AssetEntry[]> => {
  const platformMap = new Map<string, AssetEntry[]>();
  
  entries.forEach(entry => {
    if (!platformMap.has(entry.platform)) {
      platformMap.set(entry.platform, []);
    }
    platformMap.get(entry.platform)?.push(entry);
  });
  
  return platformMap;
};

// Calculate total value for a given date
export const calculateTotalForDate = (entries: AssetEntry[]): number => {
  return entries.reduce((total, entry) => total + entry.amount, 0);
};

// Get previous date entries
export const getPreviousDateEntries = (
  currentDate: string, 
  allDates: string[], 
  entriesByDate: Map<string, AssetEntry[]>
): AssetEntry[] => {
  // Find the previous date in the sorted list of all dates
  const currentIndex = allDates.indexOf(currentDate);
  
  // If this is the most recent date (index 0), use the second most recent date
  if (currentIndex === 0 && allDates.length > 1) {
    const previousDate = allDates[1];
    return entriesByDate.get(previousDate) || [];
  }
  
  // If this is the oldest date or invalid, try to find the closest older date
  if (currentIndex < 0 || currentIndex >= allDates.length - 1) {
    // Try to find any older date to use as comparison
    for (let i = 0; i < allDates.length; i++) {
      const dateA = new Date(allDates[i]);
      const dateB = new Date(currentDate);
      if (dateA < dateB) {
        return entriesByDate.get(allDates[i]) || [];
      }
    }
    return [];
  }
  
  const previousDate = allDates[currentIndex + 1]; // Since dates are newest-to-oldest
  return entriesByDate.get(previousDate) || [];
};

// Get entries for a month/year ago
export const getHistoricalEntries = (
  currentDate: string,
  period: 'MoM' | 'YoY',
  allDates: string[],
  entriesByDate: Map<string, AssetEntry[]>
): AssetEntry[] => {
  // Return empty array if no current date or no dates available
  if (!currentDate || allDates.length === 0) return [];
  
  const dateObj = parse(currentDate, 'yyyy-MM-dd', new Date());
  if (isNaN(dateObj.getTime())) return []; // Invalid date
  
  let targetDate: Date;
  
  if (period === 'MoM') {
    targetDate = subMonths(dateObj, 1);
  } else {
    targetDate = subYears(dateObj, 1);
  }
  
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');
  
  // If there's only one date available, use it for comparison (better than nothing)
  if (allDates.length === 1) {
    return entriesByDate.get(allDates[0]) || [];
  }
  
  // If there are just two dates, use the older one for any comparison
  if (allDates.length === 2 && currentDate === allDates[0]) {
    return entriesByDate.get(allDates[1]) || [];
  }
  
  // Find closest date to target
  let closestDate = '';
  let smallestDiff = Infinity;
  
  for (const date of allDates) {
    // Skip current date
    if (date === currentDate) continue;
    
    const entryDateObj = parse(date, 'yyyy-MM-dd', new Date());
    const targetObj = parse(targetDateStr, 'yyyy-MM-dd', new Date());
    
    // Skip if invalid dates
    if (isNaN(entryDateObj.getTime()) || isNaN(targetObj.getTime())) continue;
    
    const diff = Math.abs(entryDateObj.getTime() - targetObj.getTime());
    
    // Find closest date that's either older than currentDate or closest to target
    const currentDateObj = parse(currentDate, 'yyyy-MM-dd', new Date());
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestDate = date;
    }
  }
  
  // If still no date found, just use the next entry in allDates
  if (!closestDate && allDates.length > 1) {
    const currentIndex = allDates.indexOf(currentDate);
    if (currentIndex === 0 && allDates.length > 1) {
      closestDate = allDates[1];
    } else if (currentIndex > 0) {
      closestDate = allDates[currentIndex - 1];
    }
  }
  
  return entriesByDate.get(closestDate) || [];
};

// Find previous amount for a platform
export const getPreviousPlatformAmount = (
  platform: string,
  previousEntries: AssetEntry[]
): number => {
  const entry = previousEntries.find(e => e.platform === platform);
  return entry ? entry.amount : 0;
};

// Calculate summary stats for a given date
export const calculateSummary = (
  currentEntries: AssetEntry[],
  previousEntries: AssetEntry[]
): AssetSummary => {
  if (!currentEntries || currentEntries.length === 0) {
    return {
      totalValue: 0,
      totalPreviousValue: 0,
      percentChange: 0,
      absoluteChange: 0,
      avgRate: 0,
      largestHolding: { platform: '', amount: 0 },
      platforms: [],
      platformData: {}
    };
  }
  
  const totalValue = calculateTotalForDate(currentEntries);
  const totalPreviousValue = calculateTotalForDate(previousEntries);
  
  // Calculate largest holding
  let largestAmount = 0;
  let largestPlatform = '';
  
  // Calculate platform-specific data
  const platforms: string[] = [];
  const platformData: AssetSummary['platformData'] = {};
  
  let weightedRateSum = 0;
  
  currentEntries.forEach(entry => {
    if (!platforms.includes(entry.platform)) {
      platforms.push(entry.platform);
    }
    
    if (entry.amount > largestAmount) {
      largestAmount = entry.amount;
      largestPlatform = entry.platform;
    }
    
    // Sum of (amount * rate) for weighted average
    weightedRateSum += entry.amount * entry.rate;
    
    const previousAmount = getPreviousPlatformAmount(entry.platform, previousEntries);
    const absoluteChange = entry.amount - previousAmount;
    const percentChange = previousAmount > 0 ? (absoluteChange / previousAmount) * 100 : 0;
    
    platformData[entry.platform] = {
      amount: entry.amount,
      rate: entry.rate,
      percentage: (entry.amount / totalValue) * 100,
      previousAmount,
      percentChange,
      absoluteChange
    };
  });
  
  // Add platforms that exist in previous but not current
  previousEntries.forEach(entry => {
    if (!platforms.includes(entry.platform)) {
      platforms.push(entry.platform);
      platformData[entry.platform] = {
        amount: 0,
        rate: 0,
        percentage: 0,
        previousAmount: entry.amount,
        percentChange: -100,
        absoluteChange: -entry.amount
      };
    }
  });
  
  // Calculate weighted average rate
  const avgRate = totalValue > 0 ? weightedRateSum / totalValue : 0;
  const absoluteChange = totalValue - totalPreviousValue;
  const percentChange = totalPreviousValue > 0 ? (absoluteChange / totalPreviousValue) * 100 : 0;
  
  return {
    totalValue,
    totalPreviousValue,
    percentChange,
    absoluteChange,
    avgRate,
    largestHolding: {
      platform: largestPlatform,
      amount: largestAmount
    },
    platforms,
    platformData
  };
};

// Calculate monthly expected and realized rates over time
export const calculateMonthlyRates = (
  allDates: string[], // Assumed sorted newest to oldest
  entriesByDate: Map<string, AssetEntry[]>
): { dates: string[]; expectedRates: number[]; realizedRates: number[] } => {
  const dates = [...allDates].sort(); // Sort oldest to newest for time series
  const expectedRates: number[] = [];
  const realizedRates: number[] = [];

  let previousTotalValue: number | null = null;

  dates.forEach((date, index) => {
    const entries = entriesByDate.get(date) || [];
    const totalValue = calculateTotalForDate(entries);
    
    // Calculate Weighted Average Expected Rate for the current date
    let weightedRateSum = 0;
    entries.forEach(entry => {
      weightedRateSum += entry.amount * entry.rate;
    });
    const expectedRate = totalValue > 0 ? weightedRateSum / totalValue : 0;
    expectedRates.push(expectedRate);

    // Calculate Realized Monthly Rate
    let realizedRate = 0; // Default for the first data point
    if (previousTotalValue !== null && previousTotalValue !== 0) {
      const change = totalValue - previousTotalValue;
      realizedRate = (change / previousTotalValue) * 100;
    }
    realizedRates.push(realizedRate);

    previousTotalValue = totalValue;
  });

  // Format dates for chart labels
  const formattedDates = dates.map(d => {
    const dateObj = parse(d, 'yyyy-MM-dd', new Date());
    return isNaN(dateObj.getTime()) ? d : format(dateObj, 'MMM yyyy');
  });

  return { dates: formattedDates, expectedRates, realizedRates };
};

// Format numbers as currency
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format as percentage
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

// Get the chart colors based on platform
export const getPlatformColor = (platform: string, opacity: number = 1): string => {
  // Color palette for specific platforms (aligned with theme)
  const specificColorMap: Record<string, string> = {
    'Wealthfront': '#5A8B5D', // harmonized forest green (from --color-forest-green)
    'Robinhood': '#A3C5E6', // soft sky blue (from --color-sky-blue)
    'Real Estate': '#6D5A50', // earthy brown (from --color-deep-brown)
    'Checking': '#9B9B93', // muted sage gray (from --color-stone-gray)
    'Savings': '#C2B099', // soft sandstone (from --color-sandstone)
    'Retirement': '#D99E68', // warm ochre (from --color-ochre)
    'Stocks': '#4A6B41', // main green (from --color-green)
    'Bonds': '#7A8B5A', // harmonized moss green (from --color-moss)
    'Crypto': '#A3C5E6', // soft sky blue (alternative)
    'Cash': '#9B9B93', // stone gray (for cash equivalents)
    'Other': '#C49A9A', // dusty rose (from --color-dusty-rose)
  };

  // Check if the platform has a specific color
  if (specificColorMap[platform]) {
    const specificColor = specificColorMap[platform];
    return applyOpacity(specificColor, opacity);
  }

  // Extended palette for other platforms - muted, earthy tones
  const extendedPalette: string[] = [
    '#C2B099', // Soft sandstone (warm cream)
    '#A3C5E6', // Soft sky blue
    '#7A8B5A', // Harmonized moss green
    '#D99E68', // Warm ochre
    '#C49A9A', // Dusty rose
    '#9B9B93', // Muted sage gray
    '#5A8B5D', // Harmonized forest green
    '#6D5A50', // Earthy brown
    '#4A6B41', // Main forest green
    '#3F5A36', // Darker forest green
    '#B8A691', // Light sandstone variant
    '#8FA3C7', // Muted sky blue variant
    '#6B7C4A', // Darker moss variant
    '#C18A5A', // Muted ochre variant
    '#A68B8B'  // Muted rose variant
  ];

  // Use a simple hash function to get a consistent index for the platform
  const hash = platform.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % extendedPalette.length;
  const assignedColor = extendedPalette[index] || '#9B9B93'; // Fallback to stone gray

  return applyOpacity(assignedColor, opacity);
};

// Helper function to apply opacity to a hex color
const applyOpacity = (hexColor: string, opacity: number): string => {
  if (opacity === 1) {
    return hexColor;
  }

  // Ensure hex color is valid
  if (!/^#[0-9A-F]{6}$/i.test(hexColor)) {
    console.warn(`Invalid hex color format: ${hexColor}. Using default gray.`);
    hexColor = '#CCCCCC'; // Default to a safe gray
  }
  
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Get entries for start of current year (Year‑to‑Date baseline)
export const getYearStartEntries = (
  currentDate: string,
  allDates: string[],
  entriesByDate: Map<string, AssetEntry[]>
): AssetEntry[] => {
  if (!currentDate || allDates.length === 0) return [];

  const current = parse(currentDate, 'yyyy-MM-dd', new Date());
  if (isNaN(current.getTime())) return []; // Invalid date
  
  const currentYear = current.getFullYear();

  // Find earliest entry in same year (start‑of‑year snapshot)
  const currentIndex = allDates.indexOf(currentDate);
  let candidateDate = '';
  for (let i = currentIndex; i < allDates.length; i++) {
    const dateStr = allDates[i];
    const dateObj = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (isNaN(dateObj.getTime())) continue; // Skip invalid dates
    if (dateObj.getFullYear() !== currentYear) break; // crossed into previous year
    candidateDate = dateStr; // keep updating so last assignment is earliest in year
  }

  // Fallback: if no candidate found in the same year, use previous date if available
  if (!candidateDate && allDates.length > 1) {
    const currentIndex = allDates.indexOf(currentDate);
    if (currentIndex === 0 && allDates.length > 1) {
      candidateDate = allDates[1];
    } else if (currentIndex > 0) {
      candidateDate = allDates[currentIndex - 1];
    }
  }

  return candidateDate ? (entriesByDate.get(candidateDate) || []) : [];
};