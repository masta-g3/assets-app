<script lang="ts">
  import type { AssetSummary } from '../utils/calculations';
  import { formatCurrency, formatPercentage } from '../utils/calculations';
  
  export let summary: AssetSummary;
  export let comparisonPeriod: 'MoM' | 'YTD' | 'YoY' = 'MoM';
  
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
</script>

<div class="metrics-container card">
  <h3>Key Metrics</h3>
  
  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-label">Total Portfolio Value</div>
      <div class="metric-value">{formatCurrency(summary.totalValue)}</div>
      <div class="metric-change {getChangeClass(summary.percentChange)}">
        {getChangeArrow(summary.percentChange)} {formatPercentage(summary.percentChange)}
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-label">{comparisonPeriod} Change</div>
      <div class="metric-value {getChangeClass(summary.absoluteChange)}">
        {formatCurrency(summary.absoluteChange)}
      </div>
      <div class="metric-change {getChangeClass(summary.percentChange)}">
        {getChangeArrow(summary.percentChange)} {formatPercentage(summary.percentChange)}
      </div>
    </div>
    
    <div class="metric">
      <div class="metric-label">Average Expected Rate</div>
      <div class="metric-value">{formatPercentage(summary.avgRate)}</div>
    </div>
    
    <div class="metric">
      <div class="metric-label">Largest Holding</div>
      <div class="metric-value">{summary.largestHolding.platform}</div>
      <div class="metric-change">
        {formatCurrency(summary.largestHolding.amount)}
      </div>
    </div>
  </div>
</div>

<style>
  .metrics-container {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-md);
    margin-top: var(--space-md);
  }
  
  .metric {
    padding: var(--space-md);
    border-radius: var(--border-radius-sm);
    background-color: rgba(95, 116, 100, 0.05);
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
    margin-bottom: var(--space-xs);
  }
  
  .metric-change {
    font-size: 0.9rem;
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
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }
</style>