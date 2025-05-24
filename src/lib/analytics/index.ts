// Main analytics API - provides a clean interface to all enhanced calculations

export * from './types/metrics';
export * from './core/performance';
export * from './risk';

// Re-export common functions for backward compatibility
export { 
  calculateCashFlowMetrics,
  calculatePerformanceMetrics,
  calculateEnhancedMetrics
} from './core/performance';

import type { AssetEntry } from '../db';
import type { EnhancedAssetSummary, TimeSeriesPoint } from './types/metrics';
import { calculateSummary } from '../utils/calculations';
import { calculatePerformanceMetrics, calculateCashFlowMetrics } from './core/performance';
import { calculateSmartRiskAnalysis } from './risk';

/**
 * Enhanced analytics that includes performance metrics, risk analysis, and portfolio insights
 */
export function calculateEnhancedAnalytics(
  entries: AssetEntry[], 
  previousEntries?: AssetEntry[]
): EnhancedAssetSummary {
  const basicSummary = calculateSummary(entries, previousEntries || []);
  
  // Calculate performance metrics if we have historical data
  const performanceMetrics = entries.length >= 2 ? calculatePerformanceMetrics(entries) : undefined;
  
  // Calculate cash flow metrics
  const cashFlowMetrics = entries.length >= 2 ? calculateCashFlowMetrics(entries) : undefined;
  
  // Calculate smart risk analysis (automatically detects data quality)
  const riskAnalysis = entries.length >= 2 ? calculateSmartRiskAnalysis(entries) : undefined;
  
  return {
    ...basicSummary,
    portfolioMetrics: performanceMetrics,
    cashFlowMetrics,
    riskAnalysis, // Updated from riskMetrics to riskAnalysis
    diversificationMetrics: riskAnalysis?.diversificationMetrics ? {
      score: riskAnalysis.diversificationMetrics.score,
      platformCount: riskAnalysis.diversificationMetrics.platformCount,
      concentrationRisk: riskAnalysis.diversificationMetrics.concentrationRisk,
      largestPlatformWeight: riskAnalysis.diversificationMetrics.largestPlatformWeight
    } : undefined
  };
} 