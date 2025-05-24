import type { AssetEntry } from '../../db';
import type { 
  PerformanceMetrics, 
  CashFlowMetrics, 
  TimeSeriesPoint,
  TimePeriod 
} from '../types/metrics';
import { addDays, differenceInDays, parseISO, format } from 'date-fns';

/**
 * Calculate cash flow metrics by separating contributions from investment performance
 */
export function calculateCashFlowMetrics(entries: AssetEntry[]): CashFlowMetrics {
  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  let totalContributions = 0;
  let totalWithdrawals = 0;
  let hasAnyContributionData = false;
  const contributionsByPeriod: Array<{
    date: string;
    amount: number;
    type: 'contribution' | 'withdrawal';
  }> = [];

  // Process each entry to identify contributions/withdrawals
  for (const entry of sortedEntries) {
    if (entry.contributionAmount !== undefined && entry.contributionAmount !== null) {
      hasAnyContributionData = true;
      if (entry.contributionAmount > 0) {
        totalContributions += entry.contributionAmount;
        contributionsByPeriod.push({
          date: entry.date,
          amount: entry.contributionAmount,
          type: 'contribution'
        });
      } else {
        totalWithdrawals += Math.abs(entry.contributionAmount);
        contributionsByPeriod.push({
          date: entry.date,
          amount: Math.abs(entry.contributionAmount),
          type: 'withdrawal'
        });
      }
    }
  }

  const netContributions = totalContributions - totalWithdrawals;
  
  // Calculate average contribution amount (excluding withdrawals)
  const contributions = contributionsByPeriod.filter(c => c.type === 'contribution');
  const averageContributionAmount = contributions.length > 0 
    ? contributions.reduce((sum, c) => sum + c.amount, 0) / contributions.length
    : 0;

  // Calculate contribution frequency (contributions per year)
  const contributionDates = contributions.map(c => c.date);
  const contributionFrequency = contributionDates.length > 1
    ? calculateAnnualizedFrequency(contributionDates)
    : 0;

  // Calculate gains attribution only if we have contribution data
  const currentValue = sortedEntries.length > 0 
    ? sortedEntries[sortedEntries.length - 1].amount 
    : 0;
  
  // Don't show investment gains if we don't have contribution data
  // because we can't separate contributions from market performance
  const investmentGains = hasAnyContributionData ? currentValue - netContributions : 0;
  const contributionGains = hasAnyContributionData ? netContributions : 0;

  return {
    totalContributions,
    totalWithdrawals,
    netContributions,
    contributionGains,
    investmentGains,
    averageContributionAmount,
    contributionFrequency,
    contributionsByPeriod
  };
}

/**
 * Enhanced performance calculation that handles mixed data quality
 */
export function calculatePerformanceMetrics(
  entries: AssetEntry[],
  period?: TimePeriod
): PerformanceMetrics & { dataQualityInfo: DataQualityInfo } {
  if (entries.length < 2) {
    return {
      ...createEmptyPerformanceMetrics(),
      dataQualityInfo: {
        hasEnhancedData: false,
        hasSnapshotOnlyData: false,
        enhancedDataRatio: 0,
        confidenceLevel: 'low',
        methodology: 'insufficient_data',
        totalEntries: 0,
        enhancedEntries: 0,
        snapshotOnlyEntries: 0,
        estimatedEntries: 0
      }
    };
  }

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  // Analyze data quality
  const dataQualityInfo = analyzeDataQuality(sortedEntries);
  
  // Choose calculation method based on data quality
  if (dataQualityInfo.hasEnhancedData && dataQualityInfo.enhancedDataRatio > 0.8) {
    // High confidence: mostly enhanced data
    return calculateEnhancedPerformanceMetrics(sortedEntries, dataQualityInfo);
  } else if (dataQualityInfo.hasEnhancedData && dataQualityInfo.enhancedDataRatio > 0.3) {
    // Medium confidence: mixed data
    return calculateHybridPerformanceMetrics(sortedEntries, dataQualityInfo);
  } else {
    // Legacy mode: snapshot-only data
    return calculateLegacyPerformanceMetrics(sortedEntries, dataQualityInfo);
  }
}

/**
 * Analyze the quality and type of data available
 */
function analyzeDataQuality(entries: AssetEntry[]): DataQualityInfo {
  let contributionCount = 0;
  let snapshotOnlyCount = 0;
  
  for (const entry of entries) {
    if (entry.transactionType === 'contribution' || entry.dataQuality === 'enhanced') {
      contributionCount++;
    } else {
      snapshotOnlyCount++;
    }
  }
  
  const total = entries.length;
  const contributionDataRatio = contributionCount / total;
  const hasContributionData = contributionCount > 0;
  const hasSnapshotOnlyData = snapshotOnlyCount > 0;
  
  let confidenceLevel: 'high' | 'medium' | 'low';
  let methodology: string;
  
  if (contributionDataRatio >= 0.5) {
    confidenceLevel = 'high';
    methodology = 'enhanced_with_cash_flows';
  } else if (contributionDataRatio >= 0.2) {
    confidenceLevel = 'medium';
    methodology = 'hybrid_analysis';
  } else {
    confidenceLevel = 'low';
    methodology = 'snapshot_approximation';
  }
  
  return {
    hasEnhancedData: hasContributionData,
    hasSnapshotOnlyData,
    enhancedDataRatio: contributionDataRatio,
    confidenceLevel,
    methodology,
    totalEntries: total,
    enhancedEntries: contributionCount,
    snapshotOnlyEntries: snapshotOnlyCount,
    estimatedEntries: 0
  };
}

/**
 * Calculate performance using enhanced data (high confidence)
 */
function calculateEnhancedPerformanceMetrics(
  entries: AssetEntry[], 
  dataQualityInfo: DataQualityInfo
): PerformanceMetrics & { dataQualityInfo: DataQualityInfo } {
  const timeSeriesData = createTimeSeriesFromEntries(entries);
  
  return {
    timeWeightedReturn: calculateTimeWeightedReturn(timeSeriesData),
    moneyWeightedReturn: calculateMoneyWeightedReturn(timeSeriesData),
    cagr: calculateCAGR(timeSeriesData),
    totalReturn: calculateTotalReturn(timeSeriesData),
    volatility: calculateVolatility(timeSeriesData),
    dataQualityInfo
  };
}

/**
 * Calculate performance using hybrid approach (medium confidence)
 */
function calculateHybridPerformanceMetrics(
  entries: AssetEntry[], 
  dataQualityInfo: DataQualityInfo
): PerformanceMetrics & { dataQualityInfo: DataQualityInfo } {
  // Separate enhanced and snapshot-only periods
  const enhancedPeriods = entries.filter(e => e.dataQuality === 'enhanced');
  const snapshotPeriods = entries.filter(e => e.dataQuality === 'snapshot_only');
  
  // Calculate metrics for each period type
  const enhancedMetrics = enhancedPeriods.length >= 2 
    ? calculateEnhancedPerformanceMetrics(enhancedPeriods, dataQualityInfo)
    : null;
  
  const legacyMetrics = snapshotPeriods.length >= 2
    ? calculateLegacyPerformanceMetrics(snapshotPeriods, dataQualityInfo)
    : null;
  
  // Combine results using weighted approach
  const timeSeriesData = createTimeSeriesFromEntries(entries);
  
  return {
    timeWeightedReturn: calculateTimeWeightedReturn(timeSeriesData), // Best effort with mixed data
    moneyWeightedReturn: enhancedMetrics?.moneyWeightedReturn || 0, // Only if we have cash flow data
    cagr: calculateCAGR(timeSeriesData),
    totalReturn: calculateTotalReturn(timeSeriesData),
    volatility: calculateVolatility(timeSeriesData),
    dataQualityInfo
  };
}

/**
 * Calculate performance using legacy snapshot-only approach (lower confidence)
 */
function calculateLegacyPerformanceMetrics(
  entries: AssetEntry[], 
  dataQualityInfo: DataQualityInfo
): PerformanceMetrics & { dataQualityInfo: DataQualityInfo } {
  const timeSeriesData = createTimeSeriesFromEntries(entries);
  
  // For snapshot-only data, we can't separate contributions from performance
  // So we calculate simplified metrics with appropriate caveats
  
  return {
    timeWeightedReturn: 0, // Can't calculate without cash flow data
    moneyWeightedReturn: 0, // Can't calculate without cash flow data
    cagr: 0, // Misleading without separating contributions - don't show
    totalReturn: calculateTotalReturn(timeSeriesData), // Total change (includes contributions)
    volatility: calculateProperVolatility(timeSeriesData), // Use proper frequency detection
    dataQualityInfo
  };
}

/**
 * Create time series data from asset entries
 */
function createTimeSeriesFromEntries(entries: AssetEntry[]): TimeSeriesPoint[] {
  const timeSeriesMap = new Map<string, TimeSeriesPoint>();
  
  for (const entry of entries) {
    const existing = timeSeriesMap.get(entry.date);
    if (existing) {
      existing.value += entry.amount;
      if (entry.contributionAmount) {
        existing.contributions = (existing.contributions || 0) + entry.contributionAmount;
      }
    } else {
      timeSeriesMap.set(entry.date, {
        date: entry.date,
        value: entry.amount,
        contributions: entry.contributionAmount || 0
      });
    }
  }
  
  return Array.from(timeSeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate Time-Weighted Return (TWR)
 * This removes the impact of cash flows and shows true investment performance
 */
function calculateTimeWeightedReturn(timeSeriesData: TimeSeriesPoint[]): number {
  if (timeSeriesData.length < 2) return 0;
  
  let cumulativeReturn = 1;
  
  for (let i = 1; i < timeSeriesData.length; i++) {
    const current = timeSeriesData[i];
    const previous = timeSeriesData[i - 1];
    
    // Adjust for cash flows
    const adjustedPreviousValue = previous.value + (current.contributions || 0);
    
    if (adjustedPreviousValue > 0) {
      const periodReturn = current.value / adjustedPreviousValue;
      cumulativeReturn *= periodReturn;
    }
  }
  
  return (cumulativeReturn - 1) * 100;
}

/**
 * Calculate Money-Weighted Return (MWR)
 * This shows the actual investor experience including timing of cash flows
 */
function calculateMoneyWeightedReturn(timeSeriesData: TimeSeriesPoint[]): number {
  if (timeSeriesData.length < 2) return 0;
  
  const totalContributions = timeSeriesData.reduce((sum, point) => 
    sum + (point.contributions || 0), 0);
  const finalValue = timeSeriesData[timeSeriesData.length - 1].value;
  const initialValue = timeSeriesData[0].value;
  
  if (totalContributions <= 0) return 0;
  
  // Simplified MWR calculation
  // In a real implementation, you'd use IRR (Internal Rate of Return)
  return ((finalValue - initialValue) / totalContributions) * 100;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
function calculateCAGR(timeSeriesData: TimeSeriesPoint[]): number {
  if (timeSeriesData.length < 2) return 0;
  
  const startPoint = timeSeriesData[0];
  const endPoint = timeSeriesData[timeSeriesData.length - 1];
  
  const startDate = parseISO(startPoint.date);
  const endDate = parseISO(endPoint.date);
  const years = differenceInDays(endDate, startDate) / 365.25;
  
  if (years <= 0 || startPoint.value <= 0) return 0;
  
  return (Math.pow(endPoint.value / startPoint.value, 1 / years) - 1) * 100;
}

/**
 * Calculate total return (simple percentage change)
 */
function calculateTotalReturn(timeSeriesData: TimeSeriesPoint[]): number {
  if (timeSeriesData.length < 2) return 0;
  
  const startValue = timeSeriesData[0].value;
  const endValue = timeSeriesData[timeSeriesData.length - 1].value;
  
  if (startValue <= 0) return 0;
  
  return ((endValue - startValue) / startValue) * 100;
}

/**
 * Calculate annualized volatility (standard deviation of returns)
 */
function calculateVolatility(timeSeriesData: TimeSeriesPoint[]): number {
  if (timeSeriesData.length < 2) return 0;
  
  // Calculate period returns
  const returns: number[] = [];
  for (let i = 1; i < timeSeriesData.length; i++) {
    const current = timeSeriesData[i];
    const previous = timeSeriesData[i - 1];
    
    if (previous.value > 0) {
      const periodReturn = (current.value - previous.value) / previous.value;
      returns.push(periodReturn);
    }
  }
  
  if (returns.length === 0) return 0;
  
  // Calculate mean return
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // Calculate variance
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
  
  // Annualize volatility (assuming monthly data)
  const periodsPerYear = 12; // Adjust based on actual data frequency
  return Math.sqrt(variance * periodsPerYear) * 100;
}

/**
 * Calculate annualized volatility with proper frequency detection
 */
function calculateProperVolatility(timeSeriesData: TimeSeriesPoint[]): number {
  if (timeSeriesData.length < 2) return 0;
  
  // Calculate period returns and detect frequency
  const returns: number[] = [];
  const daysBetweenPoints: number[] = [];
  
  for (let i = 1; i < timeSeriesData.length; i++) {
    const current = timeSeriesData[i];
    const previous = timeSeriesData[i - 1];
    
    if (previous.value > 0) {
      const periodReturn = (current.value - previous.value) / previous.value;
      returns.push(periodReturn);
      
      // Calculate days between observations
      const daysDiff = differenceInDays(parseISO(current.date), parseISO(previous.date));
      if (daysDiff > 0) {
        daysBetweenPoints.push(daysDiff);
      }
    }
  }
  
  if (returns.length === 0 || daysBetweenPoints.length === 0) return 0;
  
  // Calculate mean return
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // Calculate variance
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
  
  // Detect average frequency
  const avgDaysBetween = daysBetweenPoints.reduce((sum, days) => sum + days, 0) / daysBetweenPoints.length;
  const periodsPerYear = 365.25 / avgDaysBetween;
  
  // Don't annualize if we have very few data points or very irregular data
  if (returns.length < 4 || periodsPerYear > 50) {
    return Math.sqrt(variance) * 100; // Return as period volatility
  }
  
  return Math.sqrt(variance * periodsPerYear) * 100;
}

/**
 * Calculate annualized frequency of contributions
 */
function calculateAnnualizedFrequency(dates: string[]): number {
  if (dates.length < 2) return 0;
  
  const sortedDates = [...dates].sort();
  const firstDate = parseISO(sortedDates[0]);
  const lastDate = parseISO(sortedDates[sortedDates.length - 1]);
  
  const totalDays = differenceInDays(lastDate, firstDate);
  const totalYears = totalDays / 365.25;
  
  if (totalYears === 0) return 0;
  
  return dates.length / totalYears;
}

/**
 * Create empty performance metrics for edge cases
 */
function createEmptyPerformanceMetrics(): PerformanceMetrics {
  return {
    timeWeightedReturn: 0,
    moneyWeightedReturn: 0,
    cagr: 0,
    totalReturn: 0,
    volatility: 0
  };
}

/**
 * Enhanced calculation that separates contributions from market performance
 */
export function calculateEnhancedMetrics(
  currentEntries: AssetEntry[],
  previousEntries: AssetEntry[],
  allEntries: AssetEntry[]
): {
  cashFlow: CashFlowMetrics;
  performance: PerformanceMetrics;
  totalGainsFromInvestments: number;
  totalGainsFromContributions: number;
} {
  const cashFlow = calculateCashFlowMetrics(allEntries);
  const performance = calculatePerformanceMetrics(allEntries);
  
  // Calculate gains attribution
  const currentValue = currentEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalGainsFromContributions = cashFlow.netContributions;
  const totalGainsFromInvestments = currentValue - totalGainsFromContributions;
  
  return {
    cashFlow,
    performance,
    totalGainsFromInvestments,
    totalGainsFromContributions
  };
}

interface DataQualityInfo {
  hasEnhancedData: boolean;
  hasSnapshotOnlyData: boolean;
  enhancedDataRatio: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  methodology: string;
  totalEntries: number;
  enhancedEntries: number;
  snapshotOnlyEntries: number;
  estimatedEntries: number;
} 