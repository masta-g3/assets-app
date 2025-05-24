<script lang="ts">
  import type { AssetEntry } from '../../db';
  import type { RiskAnalysisResult } from '../../analytics/types/metrics';
  import { calculateSmartRiskAnalysis } from '../../analytics/risk';
  import { formatCurrency, formatPercentage } from '../../utils/calculations';
  import AllocationChart from '../AllocationChart.svelte';
  
  export let assets: AssetEntry[];
  
  $: riskAnalysis = calculateSmartRiskAnalysis(assets);
  $: hasInvestmentRisk = !!riskAnalysis.investmentRiskMetrics;
  $: diversification = riskAnalysis.diversificationMetrics;
  $: dataQuality = riskAnalysis.dataQuality;
  
  // Get data quality status information
  function getDataQualityInfo(quality: string) {
    switch (quality) {
      case 'ENHANCED':
        return {
          status: 'Enhanced Data',
          description: 'Comprehensive risk analysis available',
          color: 'success'
        };
      case 'MIXED':
        return {
          status: 'Partial Data',
          description: 'Limited risk analysis available',
          color: 'warning'
        };
      case 'SNAPSHOT_ONLY':
        return {
          status: 'Basic Data',
          description: 'Diversification analysis only',
          color: 'info'
        };
      default:
        return {
          status: 'Unknown',
          description: 'Data quality assessment needed',
          color: 'neutral'
        };
    }
  }
  
  $: dataQualityInfo = getDataQualityInfo(dataQuality);
  
  // Calculate diversification score color
  function getDiversificationScoreClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }
  
  // Format risk level for volatility
  function getRiskLevel(volatility: number): { level: string; class: string } {
    if (volatility < 0.1) return { level: 'Very Low', class: 'excellent' };
    if (volatility < 0.15) return { level: 'Low', class: 'good' };
    if (volatility < 0.25) return { level: 'Moderate', class: 'fair' };
    if (volatility < 0.35) return { level: 'High', class: 'warning' };
    return { level: 'Very High', class: 'poor' };
  }
</script>

<div class="risk-analysis-dashboard">
  <!-- Header with Data Quality Status -->
  <div class="dashboard-header">
    <div class="header-content">
      <h2>Risk Analysis</h2>
      <div class="data-quality-badge {dataQualityInfo.color}">
        <span class="status-dot"></span>
        <div class="status-info">
          <div class="status-title">{dataQualityInfo.status}</div>
          <div class="status-desc">{dataQualityInfo.description}</div>
        </div>
      </div>
    </div>
    
    <!-- Portfolio Data Summary -->
    <div class="data-summary">
      <div class="summary-stat">
        <span class="label">Coverage Period:</span>
        <span class="value">{riskAnalysis.portfolioDataSummary.coveragePeriod}</span>
      </div>
      <div class="summary-stat">
        <span class="label">Total Entries:</span>
        <span class="value">{riskAnalysis.portfolioDataSummary.totalEntries}</span>
      </div>
      {#if riskAnalysis.portfolioDataSummary.enhancedEntries > 0}
        <div class="summary-stat">
          <span class="label">Enhanced Entries:</span>
          <span class="value success">{riskAnalysis.portfolioDataSummary.enhancedEntries}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="analysis-grid">
    
    <!-- DIVERSIFICATION SECTION - Always Available -->
    <div class="analysis-card diversification-card">
      <div class="card-header">
        <h3>Portfolio Diversification</h3>
        <div class="diversification-score {getDiversificationScoreClass(diversification.score)}">
          {diversification.score.toFixed(0)}/100
        </div>
      </div>
      
      <div class="diversification-content">
        <!-- Diversification Metrics -->
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-label">Platform Count</div>
            <div class="metric-value">{diversification.platformCount}</div>
          </div>
          
          <div class="metric">
            <div class="metric-label">Largest Platform</div>
            <div class="metric-value">{formatPercentage(diversification.largestPlatformWeight * 100)}</div>
          </div>
          
          <div class="metric">
            <div class="metric-label">Concentration Risk</div>
            <div class="metric-value">{(diversification.concentrationRisk * 100).toFixed(1)}%</div>
          </div>
        </div>
        
        <!-- Platform Allocation Chart -->
        <div class="chart-container">
          <h4>Current Allocation</h4>
          <AllocationChart />
        </div>
      </div>
    </div>

    <!-- INVESTMENT RISK SECTION - Only for Enhanced Data -->
    {#if hasInvestmentRisk && riskAnalysis.investmentRiskMetrics}
      {@const risk = riskAnalysis.investmentRiskMetrics}
      {@const riskLevel = getRiskLevel(risk.annualizedVolatility)}
      
      <div class="analysis-card investment-risk-card">
        <div class="card-header">
          <h3>Investment Risk Metrics</h3>
          <div class="risk-level-badge {riskLevel.class}">
            {riskLevel.level} Risk
          </div>
        </div>
        
        <div class="risk-content">
          <!-- Key Risk Metrics -->
          <div class="risk-metrics-grid">
            <div class="risk-metric primary">
              <div class="metric-label">Annualized Volatility</div>
              <div class="metric-value {riskLevel.class}">
                {formatPercentage(risk.annualizedVolatility * 100)}
              </div>
              <div class="metric-help">Investment return uncertainty</div>
            </div>
            
            <div class="risk-metric">
              <div class="metric-label">Maximum Drawdown</div>
              <div class="metric-value warning">
                {formatPercentage(risk.maxDrawdown * 100)}
              </div>
              <div class="metric-help">Worst peak-to-trough decline</div>
            </div>
            
            <div class="risk-metric">
              <div class="metric-label">Current Drawdown</div>
              <div class="metric-value {risk.currentDrawdown > 0 ? 'warning' : 'good'}">
                {formatPercentage(risk.currentDrawdown * 100)}
              </div>
              <div class="metric-help">Distance from recent peak</div>
            </div>
            
            <div class="risk-metric">
              <div class="metric-label">Value at Risk (95%)</div>
              <div class="metric-value warning">
                {formatPercentage(risk.valueAtRisk95 * 100)}
              </div>
              <div class="metric-help">Expected monthly loss in worst 5% of cases</div>
            </div>
          </div>
          
          <!-- Risk-Adjusted Returns -->
          {#if risk.sharpeRatio !== undefined && risk.sortinoRatio !== undefined}
            <div class="risk-adjusted-section">
              <h4>Risk-Adjusted Performance</h4>
              <div class="risk-adjusted-grid">
                <div class="metric">
                  <div class="metric-label">Sharpe Ratio</div>
                  <div class="metric-value {risk.sharpeRatio > 1 ? 'good' : risk.sharpeRatio > 0.5 ? 'fair' : 'poor'}">
                    {risk.sharpeRatio.toFixed(2)}
                  </div>
                  <div class="metric-help">Return per unit of total risk</div>
                </div>
                
                <div class="metric">
                  <div class="metric-label">Sortino Ratio</div>
                  <div class="metric-value {risk.sortinoRatio > 1 ? 'good' : risk.sortinoRatio > 0.5 ? 'fair' : 'poor'}">
                    {risk.sortinoRatio.toFixed(2)}
                  </div>
                  <div class="metric-help">Return per unit of downside risk</div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
      
    {:else}
      <!-- LOCKED INVESTMENT RISK SECTION -->
      <div class="analysis-card locked-card">
        <div class="card-header">
          <h3>Investment Risk Analysis</h3>
          <div class="locked-badge">
            🔒 Unavailable
          </div>
        </div>
        
        <div class="locked-content">
          <div class="locked-explanation">
            <div class="locked-icon">📊</div>
            <h4>Investment Risk Metrics Unavailable</h4>
            <p>
              Investment risk analysis requires enhanced data that separates market performance 
              from contributions. Your current data is {dataQuality.toLowerCase().replace('_', ' ')}.
            </p>
          </div>
          
          <div class="locked-features">
            <h5>Unlock these metrics with enhanced data:</h5>
            <ul>
              <li>Annualized Volatility (Investment uncertainty)</li>
              <li>Maximum & Current Drawdown (Peak-to-trough declines)</li>
              <li>Value at Risk (Expected loss scenarios)</li>
              <li>Sharpe & Sortino Ratios (Risk-adjusted returns)</li>
            </ul>
          </div>
          
          <div class="upgrade-section">
            <h5>How to unlock:</h5>
            <div class="upgrade-steps">
              <div class="step">
                <span class="step-number">1</span>
                <span class="step-text">Add contribution amounts to your portfolio entries</span>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <span class="step-text">Track deposits and withdrawals separately</span>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <span class="step-text">Return here for comprehensive risk analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .risk-analysis-dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem;
  }

  .dashboard-header {
    background: var(--card-bg, white);
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header-content h2 {
    margin: 0;
    color: var(--text-primary, #111827);
  }

  .data-quality-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .data-quality-badge.success {
    background: #dcfce7;
    color: #166534;
  }

  .data-quality-badge.warning {
    background: #fef3c7;
    color: #92400e;
  }

  .data-quality-badge.info {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-title {
    font-weight: 600;
  }

  .status-desc {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .data-summary {
    display: flex;
    gap: 2rem;
    font-size: 0.875rem;
  }

  .summary-stat {
    display: flex;
    gap: 0.5rem;
  }

  .summary-stat .label {
    color: var(--text-secondary, #6b7280);
  }

  .summary-stat .value {
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .summary-stat .value.success {
    color: #059669;
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    .analysis-grid {
      grid-template-columns: 1fr;
    }
  }

  .analysis-card {
    background: var(--card-bg, white);
    border-radius: 0.75rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .card-header h3 {
    margin: 0;
    color: var(--text-primary, #111827);
  }

  .diversification-score {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 1.25rem;
  }

  .diversification-score.excellent {
    background: #dcfce7;
    color: #166534;
  }

  .diversification-score.good {
    background: #dbeafe;
    color: #1e40af;
  }

  .diversification-score.fair {
    background: #fef3c7;
    color: #92400e;
  }

  .diversification-score.poor {
    background: #fee2e2;
    color: #dc2626;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .metric {
    text-align: center;
    padding: 1rem;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 0.5rem;
  }

  .metric-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 0.25rem;
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary, #111827);
  }

  .chart-container {
    margin-bottom: 1.5rem;
  }

  .chart-container h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #111827);
  }

  .risk-level-badge {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .risk-level-badge.excellent {
    background: #dcfce7;
    color: #166534;
  }

  .risk-level-badge.good {
    background: #dbeafe;
    color: #1e40af;
  }

  .risk-level-badge.fair {
    background: #fef3c7;
    color: #92400e;
  }

  .risk-level-badge.warning,
  .risk-level-badge.poor {
    background: #fee2e2;
    color: #dc2626;
  }

  .risk-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .risk-metric {
    padding: 1rem;
    background: var(--bg-secondary, #f9fafb);
    border-radius: 0.5rem;
    text-align: center;
  }

  .risk-metric.primary {
    background: #fef3c7;
    border: 2px solid #f59e0b;
  }

  .metric-help {
    font-size: 0.75rem;
    color: var(--text-secondary, #6b7280);
    margin-top: 0.25rem;
  }

  .risk-adjusted-section h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #111827);
  }

  .risk-adjusted-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .locked-card {
    border: 2px dashed var(--border-color, #e5e7eb);
    background: var(--bg-secondary, #f9fafb);
  }

  .locked-badge {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: #f3f4f6;
    color: #6b7280;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .locked-content {
    text-align: center;
  }

  .locked-explanation {
    margin-bottom: 2rem;
  }

  .locked-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .locked-explanation h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #111827);
  }

  .locked-explanation p {
    color: var(--text-secondary, #6b7280);
    line-height: 1.6;
  }

  .locked-features {
    margin-bottom: 2rem;
    text-align: left;
  }

  .locked-features h5 {
    margin: 0 0 0.75rem 0;
    color: var(--text-primary, #111827);
  }

  .locked-features ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .locked-features li {
    padding: 0.5rem 0;
    color: var(--text-secondary, #6b7280);
    position: relative;
    padding-left: 1.5rem;
  }

  .locked-features li::before {
    content: '🔒';
    position: absolute;
    left: 0;
  }

  .upgrade-section {
    text-align: left;
  }

  .upgrade-section h5 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #111827);
  }

  .upgrade-steps {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .step-number {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .step-text {
    color: var(--text-primary, #111827);
  }
</style> 