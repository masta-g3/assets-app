// Core performance metrics for the analytics system
export interface PerformanceMetrics {
  // Time-weighted return (true investment performance)
  timeWeightedReturn: number;
  
  // Money-weighted return (actual investor experience)
  moneyWeightedReturn: number;
  
  // Compound Annual Growth Rate
  cagr: number;
  
  // Total return (absolute)
  totalReturn: number;
  
  // Annualized volatility (standard deviation)
  volatility: number;
  
  // Risk-adjusted returns
  sharpeRatio?: number;
  sortinoRatio?: number;
  
  // Benchmark-relative metrics
  alpha?: number;
  beta?: number;
  trackingError?: number;
  informationRatio?: number;
}

// Cash flow metrics for contribution tracking
export interface CashFlowMetrics {
  totalContributions: number;
  totalWithdrawals: number;
  netContributions: number;
  
  // Performance attribution
  contributionGains: number;  // Gains from new money
  investmentGains: number;    // Gains from existing investments
  
  // Dollar-cost averaging analysis
  averageContributionAmount: number;
  contributionFrequency: number; // contributions per year
  
  // Time-series data
  contributionsByPeriod: Array<{
    date: string;
    amount: number;
    type: 'contribution' | 'withdrawal';
  }>;
}

// Risk analysis metrics
export interface RiskMetrics {
  // Volatility measures
  annualizedVolatility: number;
  downsideDeviation: number;
  
  // Drawdown analysis
  maxDrawdown: number;
  maxDrawdownDuration: number; // in days
  currentDrawdown: number;
  
  // Value at Risk (simple percentile-based)
  valueAtRisk95: number;  // 95th percentile loss
  valueAtRisk99: number;  // 99th percentile loss
  
  // Correlation with benchmarks
  correlationWithMarket?: number;
  correlationWithBonds?: number;
}

// Goal tracking metrics
export interface GoalMetrics {
  goalId: string;
  goalName: string;
  targetAmount: number;
  targetDate: string;
  currentProgress: number;  // 0-1 (percentage)
  projectedCompletion?: string;  // estimated completion date
  onTrack: boolean;
  requiredMonthlyContribution: number;
}

// Platform/allocation analysis
export interface AllocationMetrics {
  platform: string;
  currentValue: number;
  allocationPercentage: number;
  
  // Performance metrics for this platform
  performance: PerformanceMetrics;
  cashFlow: CashFlowMetrics;
  risk: RiskMetrics;
  
  // Rebalancing signals
  targetAllocation?: number;
  allocationDrift?: number;  // difference from target
  rebalanceRecommendation?: 'buy' | 'sell' | 'hold';
}

// Comprehensive portfolio summary
export interface PortfolioSummary {
  // Current state
  totalValue: number;
  totalContributions: number;
  totalGains: number;
  
  // Performance
  overallPerformance: PerformanceMetrics;
  cashFlowAnalysis: CashFlowMetrics;
  riskAnalysis: RiskMetrics;
  
  // Platform breakdown
  platformMetrics: AllocationMetrics[];
  
  // Goals progress
  goalProgress: GoalMetrics[];
  
  // Key insights
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    actionable?: boolean;
  }>;
}

// Time period helpers
export type TimePeriod = '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | 'YTD' | 'ALL';

export interface PeriodMetrics {
  period: TimePeriod;
  startDate: string;
  endDate: string;
  summary: PortfolioSummary;
}

// Data point for time series analysis
export interface TimeSeriesPoint {
  date: string;
  value: number;
  contributions?: number;  // contributions on this date
  benchmark?: number;      // benchmark value for comparison
}

// Enhanced summary that replaces the old AssetSummary
export interface EnhancedAssetSummary {
  // Basic totals (backward compatible)
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
  
  // Enhanced platform data
  platformData: {
    [platform: string]: {
      amount: number;
      rate: number;
      percentage: number;
      previousAmount: number;
      percentChange: number;
      absoluteChange: number;
      
      // New fields
      accountType?: string;
      contributions?: number;
      benchmark?: string;
      performance?: PerformanceMetrics;
    };
  };
  
  // New portfolio-level metrics
  portfolioMetrics?: PerformanceMetrics;
  cashFlowMetrics?: CashFlowMetrics;
  riskAnalysis?: RiskAnalysisResult; // Updated to new smart risk analysis
  
  // Diversification and rebalancing insights
  diversificationMetrics?: {
    score: number; // 0-100, higher is better
    platformCount: number;
    concentrationRisk: number; // Herfindahl Index
    largestPlatformWeight: number; // Weight of largest holding
  };
}

// Data quality classification for risk analysis
export type DataQuality = 'ENHANCED' | 'SNAPSHOT_ONLY' | 'MIXED';

// Investment-specific risk metrics (only available with contribution data)
export interface InvestmentRiskMetrics {
  annualizedVolatility: number;
  downsideDeviation: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // in days
  currentDrawdown: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
}

// Smart risk analysis result that hides/shows metrics based on data quality
export interface RiskAnalysisResult {
  dataQuality: DataQuality;
  portfolioDataSummary: {
    totalEntries: number;
    enhancedEntries: number; // With contribution data
    snapshotOnlyEntries: number;
    coveragePeriod: string; // "2023-11 to 2024-12"
  };
  
  // Always available (can calculate from any data)
  diversificationMetrics: {
    score: number;
    platformCount: number;
    concentrationRisk: number;
    largestPlatformWeight: number;
  };
  
  // Only available with enhanced data quality
  investmentRiskMetrics?: InvestmentRiskMetrics;
  
  // What's missing and how to improve
  limitations: string[];
  improvements: string[];
} 