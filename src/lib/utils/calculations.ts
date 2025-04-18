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
  if (currentIndex <= 0 || currentIndex >= allDates.length) {
    return [];
  }
  
  const previousDate = allDates[currentIndex - 1];
  return entriesByDate.get(previousDate) || [];
};

// Get entries for a month/year ago
export const getHistoricalEntries = (
  currentDate: string,
  period: 'MoM' | 'YoY',
  allDates: string[],
  entriesByDate: Map<string, AssetEntry[]>
): AssetEntry[] => {
  const dateObj = parse(currentDate, 'yyyy-MM-dd', new Date());
  let targetDate: Date;
  
  if (period === 'MoM') {
    targetDate = subMonths(dateObj, 1);
  } else {
    targetDate = subYears(dateObj, 1);
  }
  
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');
  
  // Find closest date to target
  let closestDate = '';
  let smallestDiff = Infinity;
  
  for (const date of allDates) {
    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
    const targetObj = parse(targetDateStr, 'yyyy-MM-dd', new Date());
    const diff = Math.abs(dateObj.getTime() - targetObj.getTime());
    
    if (diff < smallestDiff && isBefore(dateObj, parse(currentDate, 'yyyy-MM-dd', new Date()))) {
      smallestDiff = diff;
      closestDate = date;
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
  
  let rateSum = 0;
  
  currentEntries.forEach(entry => {
    if (!platforms.includes(entry.platform)) {
      platforms.push(entry.platform);
    }
    
    if (entry.amount > largestAmount) {
      largestAmount = entry.amount;
      largestPlatform = entry.platform;
    }
    
    rateSum += entry.rate;
    
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
  
  const avgRate = currentEntries.length > 0 ? rateSum / currentEntries.length : 0;
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
  // Color palette matches spec
  const colorMap: Record<string, string> = {
    'Wealthfront': '#5F7464', // vegetation green
    'Robinhood': '#A7C5E8', // sky blue
    'Real Estate': '#6B4F4F', // deep soil brown
    'Checking': '#A0A0A0', // stone gray
    'Savings': '#C0A183', // sandstone
    'Retirement': '#D48C3F', // ochre for growth
    'Stocks': '#81A969', // lighter green
    'Bonds': '#B8997A', // light brown
    'Crypto': '#6897BB', // blue-purple
    'Cash': '#9CA3AF', // light gray
    'Other': '#8B5A2B', // brown
  };
  
  const baseColor = colorMap[platform] || '#3C3C3C'; // Default dark slate
  
  if (opacity === 1) {
    return baseColor;
  }
  
  // Convert hex to rgba
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};