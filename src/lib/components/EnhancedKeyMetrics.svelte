<script lang="ts">
  import type { EnhancedAssetSummary } from '../analytics';
  import { formatCurrency, formatPercentage } from '../utils/calculations';
  
  export let summary: EnhancedAssetSummary;
  export let comparisonPeriod: 'MoM' | 'YTD' | 'YoY' = 'MoM';
  
  // Calculate total debt from summary
  $: totalDebt = Object.values(summary.platformData || {})
    .reduce((sum, platform) => sum + (platform.amount < 0 ? platform.amount : 0), 0);
  
  $: periodLabel = comparisonPeriod === 'MoM' ? 'MoM' : (comparisonPeriod === 'YoY' ? 'YoY' : 'YTD');
  
  // Enhanced analytics
  $: hasEnhancedMetrics = !!(summary.portfolioMetrics || summary.cashFlowMetrics);
  $: cashFlow = summary.cashFlowMetrics;
  $: performance = summary.portfolioMetrics;
  
  // Calculate gains attribution if we have cash flow data
  $: contributionGains = cashFlow?.contributionGains || 0;
  $: investmentGains = cashFlow?.investmentGains || 0;
  $: totalGains = summary.totalValue - (summary.totalPreviousValue || summary.totalValue);
  
  // Determine change indicator
  function getChangeClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }
  
  // Get change arrow
  function getChangeArrow(value: number): string {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '→';
  }
  
  // Format large numbers with K/M suffixes
  function formatCompact(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  }
</script>

<div class="metrics-container card">
  <div class="metrics-header">
    <h3>Portfolio Overview</h3>
    {#if hasEnhancedMetrics}
      <span class="enhanced-badge">Enhanced Analytics</span>
    {/if}
  </div>
  
  <!-- Core Portfolio Metrics -->
  <div class="metrics-grid">
    <div class="metric primary">
      <div class="metric-label">Total Portfolio Value</div>
      <div class="metric-value">{formatCurrency(summary.totalValue)}</div>
      {#if totalDebt < 0}
        <div class="metric-sub-value negative">Debt: {formatCurrency(Math.abs(totalDebt))}</div>
      {/if}
    </div>
    
    <div class="metric">
      <div class="metric-label">{periodLabel} Change</div>
      <div class="metric-value {getChangeClass(summary.absoluteChange)}">
        {formatCurrency(summary.absoluteChange)}
      </div>
      <div class="metric-change {getChangeClass(summary.percentChange)}">
        {getChangeArrow(summary.percentChange)} {formatPercentage(summary.percentChange)}
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-label">Largest Holding</div>
      <div class="metric-value">{summary.largestHolding.platform}</div>
      <div class="metric-change">
        {formatCurrency(summary.largestHolding.amount)}
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-label">Average Expected Rate</div>
      <div class="metric-value">{formatPercentage(summary.avgRate)}</div>
      {#if performance?.cagr !== undefined && performance.cagr > 0 && cashFlow && cashFlow.totalContributions > 0}
        <div class="metric-change">
          Actual CAGR: {formatPercentage(performance.cagr)}
        </div>
      {:else if cashFlow && cashFlow.totalContributions === 0}
        <div class="metric-change">
          CAGR unavailable (snapshot-only data)
        </div>
      {/if}
    </div>
  </div>

  <!-- Enhanced Analytics Section -->
  {#if hasEnhancedMetrics}
    <div class="enhanced-section">
      <!-- Performance Metrics -->
      {#if performance}
        <div class="analytics-group">
          <h4>Performance Analytics</h4>
          <div class="metrics-grid-small">
            <div class="metric-small">
              <div class="metric-label">Time-Weighted Return</div>
              <div class="metric-value {getChangeClass(performance.timeWeightedReturn)}">
                {formatPercentage(performance.timeWeightedReturn)}
              </div>
              <div class="metric-help">True investment performance</div>
            </div>
            
            <div class="metric-small">
              <div class="metric-label">Money-Weighted Return</div>
              <div class="metric-value {getChangeClass(performance.moneyWeightedReturn)}">
                {formatPercentage(performance.moneyWeightedReturn)}
              </div>
              <div class="metric-help">Your actual experience</div>
            </div>
            
            <div class="metric-small">
              <div class="metric-label">Annualized Return (CAGR)</div>
              <div class="metric-value {getChangeClass(performance.cagr)}">
                {formatPercentage(performance.cagr)}
              </div>
              <div class="metric-help">Compound annual growth</div>
            </div>
            
            <div class="metric-small">
              <div class="metric-label">Volatility</div>
              <div class="metric-value neutral">
                {formatPercentage(performance.volatility)}
              </div>
              <div class="metric-help">Annual risk measure</div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Cash Flow Analytics -->
      {#if cashFlow && cashFlow.totalContributions > 0}
        <div class="analytics-group">
          <h4>Cash Flow Analytics</h4>
          <div class="metrics-grid-small">
            <div class="metric-small">
              <div class="metric-label">Total Contributions</div>
              <div class="metric-value positive">
                {formatCompact(cashFlow.totalContributions)}
              </div>
              <div class="metric-help">Money you've invested</div>
            </div>
            
            <div class="metric-small">
              <div class="metric-label">Investment Gains</div>
              <div class="metric-value {getChangeClass(investmentGains)}">
                {formatCompact(investmentGains)}
              </div>
              <div class="metric-help">From market performance</div>
            </div>
            
            {#if cashFlow.totalWithdrawals > 0}
              <div class="metric-small">
                <div class="metric-label">Total Withdrawals</div>
                <div class="metric-value negative">
                  {formatCompact(cashFlow.totalWithdrawals)}
                </div>
                <div class="metric-help">Money you've taken out</div>
              </div>
            {/if}
            
            {#if cashFlow.contributionFrequency > 0}
              <div class="metric-small">
                <div class="metric-label">Contribution Frequency</div>
                <div class="metric-value neutral">
                  {cashFlow.contributionFrequency.toFixed(1)}/year
                </div>
                <div class="metric-help">How often you invest</div>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Insights -->
      {#if cashFlow && performance}
        <div class="insights-section">
          <h4>Key Insights</h4>
          <div class="insights-list">
            {#if cashFlow.totalContributions > 0 && investmentGains > contributionGains}
              <div class="insight positive">
                <span class="insight-icon">🎯</span>
                <span class="insight-text">
                  Your investments have grown more than your contributions! 
                  {formatPercentage((investmentGains / contributionGains) * 100)} growth on invested capital.
                </span>
              </div>
            {:else if cashFlow.totalContributions > 0 && contributionGains > 0}
              <div class="insight neutral">
                <span class="insight-icon">💰</span>
                <span class="insight-text">
                  Most of your portfolio value comes from contributions. 
                  Focus on time in market for compound growth.
                </span>
              </div>
            {:else if cashFlow.totalContributions === 0}
              <div class="insight neutral">
                <span class="insight-icon">📊</span>
                <span class="insight-text">
                  Portfolio analytics are limited with snapshot-only data. 
                  Add cash flow information for better insights.
                </span>
              </div>
            {/if}
            
            {#if performance.volatility > 15}
              <div class="insight warning">
                <span class="insight-icon">⚠️</span>
                <span class="insight-text">
                  Your portfolio has high volatility ({formatPercentage(performance.volatility)}). 
                  Consider diversification.
                </span>
              </div>
            {:else if performance.volatility < 5}
              <div class="insight neutral">
                <span class="insight-icon">🛡️</span>
                <span class="insight-text">
                  Your portfolio is very conservative (low volatility). 
                  Consider higher-growth assets for better returns.
                </span>
              </div>
            {/if}
            
            {#if cashFlow.contributionFrequency > 0 && cashFlow.contributionFrequency < 2}
              <div class="insight neutral">
                <span class="insight-icon">📅</span>
                <span class="insight-text">
                  You invest less than 2 times per year. 
                  Regular contributions can improve dollar-cost averaging.
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .metrics-container {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .metrics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }

  .metrics-header h3 {
    margin: 0;
    color: var(--color-forest-dark);
  }

  .enhanced-badge {
    background: linear-gradient(135deg, var(--color-forest-green), var(--color-forest-dark));
    color: white;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-md);
  }

  .metrics-grid-small {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-sm);
  }
  
  .metric {
    padding: var(--space-md);
    border-radius: var(--border-radius-sm);
    background-color: rgba(95, 116, 100, 0.05);
    display: flex;
    flex-direction: column;
  }

  .metric.primary {
    background: linear-gradient(135deg, rgba(95, 116, 100, 0.1), rgba(95, 116, 100, 0.05));
    border: 2px solid rgba(95, 116, 100, 0.2);
  }

  .metric-small {
    padding: var(--space-sm);
    border-radius: var(--border-radius-sm);
    background-color: rgba(95, 116, 100, 0.03);
    border: 1px solid rgba(95, 116, 100, 0.1);
    display: flex;
    flex-direction: column;
  }
  
  .metric-label {
    font-size: 0.9rem;
    color: var(--color-stone-gray);
    margin-bottom: var(--space-xs);
  }
  
  .metric-value {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .metric-small .metric-value {
    font-size: 1.2rem;
  }
  
  .metric-sub-value {
    font-size: 0.9rem;
    font-weight: 400;
    margin-top: -2px;
    margin-bottom: var(--space-xs);
  }
  
  .metric-change {
    font-size: 0.9rem;
  }

  .metric-help {
    font-size: 0.75rem;
    color: var(--color-stone-gray);
    margin-top: var(--space-xs);
  }

  .enhanced-section {
    border-top: 1px solid rgba(95, 116, 100, 0.2);
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
  }

  .analytics-group {
    margin-bottom: var(--space-lg);
  }

  .analytics-group h4 {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-forest-dark);
    font-size: 1rem;
    font-weight: 600;
  }

  .insights-section h4 {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-forest-dark);
    font-size: 1rem;
    font-weight: 600;
  }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .insight {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
  }

  .insight.positive {
    background: rgba(34, 197, 94, 0.1);
    border-left: 4px solid var(--color-positive);
  }

  .insight.negative {
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid var(--color-negative);
  }

  .insight.neutral {
    background: rgba(107, 114, 128, 0.1);
    border-left: 4px solid var(--color-stone-gray);
  }

  .insight.warning {
    background: rgba(245, 158, 11, 0.1);
    border-left: 4px solid #f59e0b;
  }

  .insight-icon {
    font-size: 1.2rem;
    line-height: 1;
  }

  .insight-text {
    flex: 1;
    line-height: 1.4;
  }
  
  .positive {
    color: var(--color-positive);
  }
  
  .negative {
    color: var(--color-negative);
  }
  
  .neutral {
    color: var(--color-stone-gray);
  }
  
  @media (max-width: 768px) {
    .metrics-grid, .metrics-grid-small {
      grid-template-columns: 1fr;
    }

    .metrics-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }
  }
</style> 