<script lang="ts">
  import type { AssetEntry } from '../db';
  
  export let entries: AssetEntry[] = [];
  
  // Analyze data quality
  $: dataQuality = analyzeDataQuality(entries);
  
  function analyzeDataQuality(entries: AssetEntry[]) {
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
    const contributionRatio = total > 0 ? contributionCount / total : 0;
    
    let status: 'excellent' | 'good' | 'basic' | 'poor';
    let confidenceLevel: 'high' | 'medium' | 'low';
    let availableAnalytics: string[];
    
    if (contributionRatio >= 0.5) {
      status = 'excellent';
      confidenceLevel = 'high';
      availableAnalytics = ['TWR', 'MWR', 'CAGR', 'Cash Flow Analysis', 'Contribution Attribution'];
    } else if (contributionRatio >= 0.2) {
      status = 'good';
      confidenceLevel = 'medium';
      availableAnalytics = ['CAGR', 'Mixed Analysis', 'Total Return'];
    } else if (contributionRatio > 0) {
      status = 'basic';
      confidenceLevel = 'low';
      availableAnalytics = ['CAGR', 'Total Return', 'Limited Analysis'];
    } else {
      status = 'poor';
      confidenceLevel = 'low';
      availableAnalytics = ['CAGR', 'Total Return (includes contributions)'];
    }
    
    return {
      total,
      contributionCount,
      snapshotOnlyCount,
      contributionRatio,
      status,
      confidenceLevel,
      availableAnalytics
    };
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'excellent': return 'var(--color-positive)';
      case 'good': return 'var(--color-moss)';
      case 'basic': return 'var(--color-ochre)';
      case 'poor': return 'var(--color-negative)';
      default: return 'var(--color-stone-gray)';
    }
  }
  
  function getRecommendation(status: string): string {
    switch (status) {
      case 'excellent':
        return "Your data quality is excellent! All advanced analytics are available.";
      case 'good':
        return "Good data quality. Most analytics are available. Consider adding cash flow data to remaining entries.";
      case 'basic':
        return "Basic data quality. Limited analytics available. Try using Advanced Mode for new entries.";
      case 'poor':
        return "Limited data quality. Consider adding cash flow information for better analytics.";
      default:
        return "Add some asset data to see analytics quality.";
    }
  }
</script>

<div class="data-quality-indicator card">
  <div class="header">
    <h4>Data Quality Status</h4>
    <div class="status-badge" style="background-color: {getStatusColor(dataQuality.status)}">
      {dataQuality.status.toUpperCase()}
    </div>
  </div>
  
  {#if dataQuality.total > 0}
    <div class="quality-breakdown">
      <div class="breakdown-item">
        <span class="label">Contribution Data:</span>
        <span class="value">{dataQuality.contributionCount} / {dataQuality.total} entries ({Math.round(dataQuality.contributionRatio * 100)}%)</span>
      </div>
      
      <div class="breakdown-item">
        <span class="label">Snapshot Only:</span>
        <span class="value">{dataQuality.snapshotOnlyCount} entries</span>
      </div>
    </div>
    
    <div class="analytics-available">
      <h5>Available Analytics:</h5>
      <div class="analytics-list">
        {#each dataQuality.availableAnalytics as analytic}
          <span class="analytic-tag">{analytic}</span>
        {/each}
      </div>
    </div>
    
    <div class="recommendation">
      <p>{getRecommendation(dataQuality.status)}</p>
    </div>
  {:else}
    <div class="no-data">
      <p>No data available yet. Add some asset entries to see data quality analysis.</p>
    </div>
  {/if}
</div>

<style>
  .data-quality-indicator {
    background: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  
  .header h4 {
    margin: 0;
    color: var(--color-forest-dark);
  }
  
  .status-badge {
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    color: white;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  
  .quality-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    background: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-sm);
  }
  
  .breakdown-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }
  
  .label {
    color: var(--color-forest-dark);
    font-weight: 500;
  }
  
  .value {
    color: var(--color-slate);
  }
  
  .analytics-available {
    margin-bottom: var(--space-md);
  }
  
  .analytics-available h5 {
    margin: 0 0 var(--space-sm) 0;
    color: var(--color-forest-dark);
    font-size: 0.95rem;
  }
  
  .analytics-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .analytic-tag {
    background: var(--color-moss);
    color: white;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .recommendation {
    padding: var(--space-sm);
    background: rgba(163, 197, 230, 0.1);
    border-radius: var(--border-radius-sm);
    border-left: 3px solid var(--color-sky-blue);
  }
  
  .recommendation p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-forest-dark);
    line-height: 1.4;
  }
  
  .no-data {
    text-align: center;
    padding: var(--space-lg);
    color: var(--color-stone-gray);
    font-style: italic;
  }
  
  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }
    
    .breakdown-item {
      flex-direction: column;
      gap: var(--space-xs);
    }
  }
</style> 