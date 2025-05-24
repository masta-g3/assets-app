import type { AssetEntry } from '../../db';
import type { 
  RiskAnalysisResult, 
  InvestmentRiskMetrics, 
  DataQuality,
  TimeSeriesPoint 
} from '../types/metrics';
import { parseISO, differenceInDays, format } from 'date-fns';

/**
 * Smart risk analysis that detects data quality and shows/hides metrics appropriately
 */
export function calculateSmartRiskAnalysis(entries: AssetEntry[]): RiskAnalysisResult {
  // Analyze data quality first
  const dataQualityInfo = analyzeDataQuality(entries);
  
  // Always calculate diversification (works with any data)
  const diversificationMetrics = calculateDiversificationMetrics(entries);
  
  // Only calculate investment risk metrics if we have enhanced data
  let investmentRiskMetrics: InvestmentRiskMetrics | undefined;
  
  if (dataQualityInfo.dataQuality === 'ENHANCED') {
    // We have contribution data - can calculate proper investment risk metrics
    investmentRiskMetrics = calculateInvestmentRiskMetrics(entries);
  }
  // For SNAPSHOT_ONLY or MIXED data, we don't show investment risk metrics
  
  return {
    dataQuality: dataQualityInfo.dataQuality,
    portfolioDataSummary: {
      totalEntries: dataQualityInfo.totalEntries,
      enhancedEntries: dataQualityInfo.enhancedEntries,
      snapshotOnlyEntries: dataQualityInfo.snapshotOnlyEntries,
      coveragePeriod: dataQualityInfo.coveragePeriod
    },
    diversificationMetrics,
    investmentRiskMetrics,
    limitations: generateLimitations(dataQualityInfo),
    improvements: generateImprovements(dataQualityInfo)
  };
}

/**
 * Analyze data quality to determine what metrics we can reliably calculate
 */
function analyzeDataQuality(entries: AssetEntry[]): {
  dataQuality: DataQuality;
  totalEntries: number;
  enhancedEntries: number;
  snapshotOnlyEntries: number;
  coveragePeriod: string;
} {
  if (entries.length === 0) {
    return {
      dataQuality: 'SNAPSHOT_ONLY',
      totalEntries: 0,
      enhancedEntries: 0,
      snapshotOnlyEntries: 0,
      coveragePeriod: 'No data'
    };
  }
  
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  let enhancedCount = 0;
  let snapshotOnlyCount = 0;
  
  for (const entry of sortedEntries) {
    // Enhanced data has contribution information or explicit enhanced data quality
    if (entry.contributionAmount !== undefined || 
        entry.dataQuality === 'enhanced' || 
        entry.transactionType === 'contribution') {
      enhancedCount++;
    } else {
      snapshotOnlyCount++;
    }
  }
  
  const total = enhancedCount + snapshotOnlyCount;
  const enhancedRatio = total > 0 ? enhancedCount / total : 0;
  
  let dataQuality: DataQuality;
  if (enhancedRatio >= 0.8) {
    dataQuality = 'ENHANCED'; // 80%+ enhanced data
  } else if (enhancedRatio >= 0.3) {
    dataQuality = 'MIXED'; // 30-80% enhanced data
  } else {
    dataQuality = 'SNAPSHOT_ONLY'; // <30% enhanced data
  }
  
  const startDate = format(parseISO(sortedEntries[0].date), 'MMM yyyy');
  const endDate = format(parseISO(sortedEntries[sortedEntries.length - 1].date), 'MMM yyyy');
  const coveragePeriod = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
  
  return {
    dataQuality,
    totalEntries: total,
    enhancedEntries: enhancedCount,
    snapshotOnlyEntries: snapshotOnlyCount,
    coveragePeriod
  };
}

/**
 * Calculate investment risk metrics using TWR-based returns (only for enhanced data)
 */
function calculateInvestmentRiskMetrics(entries: AssetEntry[]): InvestmentRiskMetrics {
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  // Calculate Time-Weighted Returns for risk analysis
  const twrReturns = calculateTWRReturns(sortedEntries);
  
  if (twrReturns.length < 2) {
    return createEmptyInvestmentRiskMetrics();
  }
  
  // Calculate portfolio values for drawdown analysis
  const portfolioValues = sortedEntries.map(entry => ({
    date: entry.date,
    value: entry.amount
  }));
  
  return {
    annualizedVolatility: calculateAnnualizedVolatility(twrReturns, sortedEntries),
    downsideDeviation: calculateDownsideDeviation(twrReturns, sortedEntries),
    maxDrawdown: calculateMaxDrawdown(portfolioValues),
    maxDrawdownDuration: calculateMaxDrawdownDuration(portfolioValues),
    currentDrawdown: calculateCurrentDrawdown(portfolioValues),
    valueAtRisk95: calculateValueAtRisk(twrReturns, 0.95),
    valueAtRisk99: calculateValueAtRisk(twrReturns, 0.99),
    sharpeRatio: calculateSharpeRatio(twrReturns),
    sortinoRatio: calculateSortinoRatio(twrReturns)
  };
}

/**
 * Calculate Time-Weighted Returns for risk analysis
 * This separates investment performance from contributions
 */
function calculateTWRReturns(entries: AssetEntry[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const previous = entries[i - 1];
    
    // Adjust previous value for any contributions made in current period
    const contributionAmount = current.contributionAmount || 0;
    const adjustedPreviousValue = previous.amount + contributionAmount;
    
    if (adjustedPreviousValue > 0) {
      // TWR: (Ending Value) / (Beginning Value + Contributions) - 1
      const periodReturn = (current.amount / adjustedPreviousValue) - 1;
      
      // Sanity check: filter out extreme returns (likely data errors)
      if (Math.abs(periodReturn) < 2.0) { // 200% max period return filter
        returns.push(periodReturn);
      }
    }
  }
  
  return returns;
}

/**
 * Calculate annualized volatility from TWR returns
 */
function calculateAnnualizedVolatility(returns: number[], entries: AssetEntry[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  // Detect frequency and annualize
  const avgDaysBetweenPoints = getAverageFrequency(entries);
  const periodsPerYear = 365 / avgDaysBetweenPoints;
  
  return stdDev * Math.sqrt(periodsPerYear);
}

/**
 * Calculate downside deviation (volatility of negative returns only)
 */
function calculateDownsideDeviation(returns: number[], entries: AssetEntry[]): number {
  const negativeReturns = returns.filter(r => r < 0);
  if (negativeReturns.length < 2) return 0;
  
  const meanNegativeReturn = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
  const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - meanNegativeReturn, 2), 0) / (negativeReturns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  const avgDaysBetweenPoints = getAverageFrequency(entries);
  const periodsPerYear = 365 / avgDaysBetweenPoints;
  
  return stdDev * Math.sqrt(periodsPerYear);
}

/**
 * Calculate Sharpe ratio (return per unit of risk)
 */
function calculateSharpeRatio(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1));
  
  // Assume risk-free rate of 3% annually (convert to period rate)
  const riskFreeRate = 0.03 / (365 / 30); // Rough conversion for monthly data
  
  return stdDev > 0 ? (meanReturn - riskFreeRate) / stdDev : 0;
}

/**
 * Calculate Sortino ratio (return per unit of downside risk)
 */
function calculateSortinoRatio(returns: number[]): number {
  const negativeReturns = returns.filter(r => r < 0);
  if (negativeReturns.length < 2) return 0;
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideDeviation = Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length);
  
  const riskFreeRate = 0.03 / (365 / 30);
  
  return downsideDeviation > 0 ? (meanReturn - riskFreeRate) / downsideDeviation : 0;
}

/**
 * Calculate maximum drawdown from portfolio values
 */
function calculateMaxDrawdown(portfolioValues: { date: string; value: number }[]): number {
  if (portfolioValues.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = portfolioValues[0].value;

  for (const point of portfolioValues) {
    if (point.value > peak) {
      peak = point.value;
    }
    
    const drawdown = (peak - point.value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate maximum drawdown duration
 */
function calculateMaxDrawdownDuration(portfolioValues: { date: string; value: number }[]): number {
  if (portfolioValues.length < 2) return 0;

  let maxDuration = 0;
  let currentDuration = 0;
  let peak = portfolioValues[0].value;
  let drawdownStartDate: string | null = null;

  for (let i = 0; i < portfolioValues.length; i++) {
    const point = portfolioValues[i];
    
    if (point.value > peak) {
      peak = point.value;
      if (drawdownStartDate && currentDuration > maxDuration) {
        maxDuration = currentDuration;
      }
      currentDuration = 0;
      drawdownStartDate = null;
    } else if (point.value < peak) {
      if (!drawdownStartDate) {
        drawdownStartDate = point.date;
        currentDuration = 0;
      } else {
        currentDuration = differenceInDays(parseISO(point.date), parseISO(drawdownStartDate));
      }
    }
  }

  if (drawdownStartDate && currentDuration > maxDuration) {
    maxDuration = currentDuration;
  }

  return maxDuration;
}

/**
 * Calculate current drawdown
 */
function calculateCurrentDrawdown(portfolioValues: { date: string; value: number }[]): number {
  if (portfolioValues.length < 2) return 0;

  const currentValue = portfolioValues[portfolioValues.length - 1].value;
  let peak = 0;

  for (const point of portfolioValues) {
    if (point.value > peak) {
      peak = point.value;
    }
  }

  return peak > 0 ? (peak - currentValue) / peak : 0;
}

/**
 * Calculate Value at Risk using percentile method
 */
function calculateValueAtRisk(returns: number[], confidence: number): number {
  if (returns.length < 2) return 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sortedReturns.length);
  const percentileReturn = sortedReturns[Math.max(0, index)];
  
  return Math.abs(percentileReturn);
}

/**
 * Calculate diversification metrics (works with any data quality)
 */
function calculateDiversificationMetrics(entries: AssetEntry[]): {
  score: number;
  platformCount: number;
  concentrationRisk: number;
  largestPlatformWeight: number;
} {
  if (entries.length === 0) {
    return {
      score: 0,
      platformCount: 0,
      concentrationRisk: 0,
      largestPlatformWeight: 0
    };
  }

  const platformAllocations = calculatePlatformAllocations(entries);
  const totalValue = entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  
  const weights = Object.values(platformAllocations).map(p => p.amount / totalValue);
  const concentrationRisk = calculateHerfindahlIndex(weights);
  const largestPlatformWeight = Math.max(...weights);
  const diversificationScore = calculateDiversificationScore(weights);

  return {
    score: diversificationScore,
    platformCount: Object.keys(platformAllocations).length,
    concentrationRisk,
    largestPlatformWeight
  };
}

/**
 * Helper functions
 */

function getAverageFrequency(entries: AssetEntry[]): number {
  if (entries.length < 2) return 30;

  let totalDays = 0;
  let intervals = 0;

  for (let i = 1; i < entries.length; i++) {
    const days = differenceInDays(parseISO(entries[i].date), parseISO(entries[i - 1].date));
    if (days > 0) {
      totalDays += days;
      intervals++;
    }
  }

  return intervals > 0 ? totalDays / intervals : 30;
}

function calculatePlatformAllocations(entries: AssetEntry[]): Record<string, { amount: number }> {
  const allocations: Record<string, { amount: number }> = {};

  for (const entry of entries) {
    if (allocations[entry.platform]) {
      allocations[entry.platform].amount += Math.abs(entry.amount);
    } else {
      allocations[entry.platform] = {
        amount: Math.abs(entry.amount)
      };
    }
  }

  return allocations;
}

function calculateHerfindahlIndex(weights: number[]): number {
  return weights.reduce((sum, weight) => sum + weight * weight, 0);
}

function calculateDiversificationScore(weights: number[]): number {
  const platformCount = weights.length;
  const platformScore = Math.min(40, platformCount * 8);

  const maxWeight = Math.max(...weights);
  const concentrationPenalty = maxWeight > 0.5 ? (maxWeight - 0.5) * 60 : 0;

  const idealWeight = 1 / platformCount;
  const balanceVariance = weights.reduce((sum, w) => sum + Math.pow(w - idealWeight, 2), 0) / platformCount;
  const balanceScore = Math.max(0, 10 - balanceVariance * 100);

  const rawScore = platformScore - concentrationPenalty + balanceScore;
  return Math.max(0, Math.min(100, rawScore));
}

function generateLimitations(dataQualityInfo: any): string[] {
  const limitations: string[] = [];
  
  if (dataQualityInfo.dataQuality === 'SNAPSHOT_ONLY') {
    limitations.push('Investment risk metrics unavailable - portfolio changes include contributions');
    limitations.push('Cannot separate market performance from cash flows');
    limitations.push('Volatility and drawdown analysis not meaningful');
  } else if (dataQualityInfo.dataQuality === 'MIXED') {
    limitations.push('Limited investment risk analysis - partial contribution data');
    limitations.push('Risk metrics may not reflect full portfolio history');
  }
  
  if (dataQualityInfo.totalEntries < 6) {
    limitations.push('Limited historical data - metrics may not be representative');
  }
  
  return limitations;
}

function generateImprovements(dataQualityInfo: any): string[] {
  const improvements: string[] = [];
  
  if (dataQualityInfo.dataQuality === 'SNAPSHOT_ONLY') {
    improvements.push('Add contribution amounts to unlock investment risk analysis');
    improvements.push('Track deposits/withdrawals separately from market performance');
    improvements.push('Use enhanced data entry form for future entries');
  } else if (dataQualityInfo.dataQuality === 'MIXED') {
    improvements.push('Add contribution data to remaining entries');
    improvements.push('Complete historical contribution tracking');
  }
  
  if (dataQualityInfo.totalEntries < 12) {
    improvements.push('Add more historical data for better trend analysis');
  }
  
  return improvements;
}

function createEmptyInvestmentRiskMetrics(): InvestmentRiskMetrics {
  return {
    annualizedVolatility: 0,
    downsideDeviation: 0,
    maxDrawdown: 0,
    maxDrawdownDuration: 0,
    currentDrawdown: 0,
    valueAtRisk95: 0,
    valueAtRisk99: 0,
    sharpeRatio: 0,
    sortinoRatio: 0
  };
} 