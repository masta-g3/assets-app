<script lang="ts">
  import { onMount } from 'svelte';
  import { assetStore } from '../stores/assetStore';
  import type { RiskMetrics, EnhancedAssetSummary } from '../analytics/types/metrics';
  import { Chart, registerables } from 'chart.js';
  import 'chartjs-adapter-date-fns';

  Chart.register(...registerables);

  let summary: EnhancedAssetSummary | null = null;
  let riskMetrics: RiskMetrics | null = null;
  let diversificationMetrics: any = null;
  
  // Chart containers
  let volatilityChartContainer: HTMLCanvasElement;
  let drawdownChartContainer: HTMLCanvasElement;
  let riskReturnContainer: HTMLCanvasElement;
  
  // Chart instances
  let volatilityChart: Chart | null = null;
  let drawdownChart: Chart | null = null;
  let riskReturnChart: Chart | null = null;

  // Subscribe to store updates
  assetStore.subscribe(value => {
    summary = value.summary;
    riskMetrics = value.summary?.riskMetrics || null;
    diversificationMetrics = value.summary?.diversificationMetrics || null;
    
    // Update charts when data changes
    setTimeout(() => {
      updateCharts();
    }, 100);
  });

  onMount(() => {
    setTimeout(() => {
      initializeCharts();
    }, 50);
  });

  function initializeCharts() {
    createVolatilityChart();
    createDrawdownChart();
    createRiskReturnChart();
  }

  function updateCharts() {
    if (riskMetrics) {
      updateVolatilityChart();
      updateDrawdownChart();
      updateRiskReturnChart();
    }
  }

  function createVolatilityChart() {
    if (!volatilityChartContainer || !riskMetrics) return;

    const ctx = volatilityChartContainer.getContext('2d');
    if (!ctx) return;

    volatilityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Volatility', 'Downside Volatility'],
        datasets: [{
          label: 'Annualized Volatility (%)',
          data: [
            (riskMetrics.annualizedVolatility * 100),
            (riskMetrics.downsideDeviation * 100)
          ],
          backgroundColor: [
            'rgba(59, 130, 246, 0.6)', // Blue
            'rgba(239, 68, 68, 0.6)'   // Red for downside
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Portfolio Volatility Analysis'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Volatility (%)'
            }
          }
        }
      }
    });
  }

  function createDrawdownChart() {
    if (!drawdownChartContainer || !riskMetrics) return;

    const ctx = drawdownChartContainer.getContext('2d');
    if (!ctx) return;

    drawdownChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Max Drawdown', 'Current Drawdown'],
        datasets: [{
          label: 'Drawdown (%)',
          data: [
            (riskMetrics.maxDrawdown * 100),
            (riskMetrics.currentDrawdown * 100)
          ],
          backgroundColor: [
            'rgba(239, 68, 68, 0.6)',   // Red for max drawdown
            'rgba(245, 158, 11, 0.6)'   // Orange for current
          ],
          borderColor: [
            'rgba(239, 68, 68, 1)',
            'rgba(245, 158, 11, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Drawdown Analysis'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Drawdown (%)'
            }
          }
        }
      }
    });
  }

  function createRiskReturnChart() {
    if (!riskReturnContainer || !summary?.portfolioMetrics || !riskMetrics) return;

    const ctx = riskReturnContainer.getContext('2d');
    if (!ctx) return;

    const return_ = summary.portfolioMetrics.timeWeightedReturn * 100;
    const risk = riskMetrics.annualizedVolatility * 100;

    riskReturnChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Portfolio',
          data: [{
            x: risk,
            y: return_
          }],
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          pointRadius: 8,
          pointHoverRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Risk-Return Profile'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Return: ${context.parsed.y.toFixed(2)}%, Risk: ${context.parsed.x.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Risk (Annualized Volatility %)'
            },
            beginAtZero: true
          },
          y: {
            title: {
              display: true,
              text: 'Return (Time-Weighted %)'
            }
          }
        }
      }
    });
  }

  function updateVolatilityChart() {
    if (!volatilityChart || !riskMetrics) return;

    volatilityChart.data.datasets[0].data = [
      (riskMetrics.annualizedVolatility * 100),
      (riskMetrics.downsideDeviation * 100)
    ];
    volatilityChart.update();
  }

  function updateDrawdownChart() {
    if (!drawdownChart || !riskMetrics) return;

    drawdownChart.data.datasets[0].data = [
      (riskMetrics.maxDrawdown * 100),
      (riskMetrics.currentDrawdown * 100)
    ];
    drawdownChart.update();
  }

  function updateRiskReturnChart() {
    if (!riskReturnChart || !summary?.portfolioMetrics || !riskMetrics) return;

    const return_ = summary.portfolioMetrics.timeWeightedReturn * 100;
    const risk = riskMetrics.annualizedVolatility * 100;

    riskReturnChart.data.datasets[0].data = [{
      x: risk,
      y: return_
    }];
    riskReturnChart.update();
  }

  function getRiskScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getRiskScoreLabel(score: number): string {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Moderate Risk';
    if (score >= 40) return 'High Risk';
    return 'Very High Risk';
  }

  function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  function formatDays(days: number): string {
    if (days === 0) return 'N/A';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${(days / 365).toFixed(1)} years`;
  }
</script>

<div class="space-y-6">
  <!-- Risk Overview Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Volatility</h3>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">
        {riskMetrics ? formatPercentage(riskMetrics.annualizedVolatility) : 'N/A'}
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-400">Annualized</p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Max Drawdown</h3>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">
        {riskMetrics ? formatPercentage(riskMetrics.maxDrawdown) : 'N/A'}
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {riskMetrics ? formatDays(riskMetrics.maxDrawdownDuration) : 'N/A'}
      </p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Value at Risk (95%)</h3>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">
        {riskMetrics ? formatPercentage(riskMetrics.valueAtRisk95) : 'N/A'}
      </p>
      <p class="text-xs text-gray-500 dark:text-gray-400">Expected loss</p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Diversification Score</h3>
      <p class="text-2xl font-bold {diversificationMetrics ? getRiskScoreColor(diversificationMetrics.score) : 'text-gray-500'}">
        {diversificationMetrics ? `${diversificationMetrics.score}/100` : 'N/A'}
      </p>
      <p class="text-xs {diversificationMetrics ? getRiskScoreColor(diversificationMetrics.score) : 'text-gray-500'}">
        {diversificationMetrics ? getRiskScoreLabel(diversificationMetrics.score) : 'N/A'}
      </p>
    </div>
  </div>

  <!-- Charts Row -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Volatility Chart -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="h-64">
        <canvas bind:this={volatilityChartContainer}></canvas>
      </div>
    </div>

    <!-- Drawdown Chart -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="h-64">
        <canvas bind:this={drawdownChartContainer}></canvas>
      </div>
    </div>
  </div>

  <!-- Risk-Return Chart -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="h-80">
      <canvas bind:this={riskReturnContainer}></canvas>
    </div>
  </div>

  <!-- Diversification Analysis -->
  {#if diversificationMetrics}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Diversification</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {diversificationMetrics.platformCount}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Platforms</p>
        </div>
        
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatPercentage(diversificationMetrics.largestPlatformWeight)}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Largest Holding</p>
        </div>
        
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {(diversificationMetrics.concentrationRisk * 100).toFixed(0)}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Concentration Index</p>
        </div>
      </div>

      <!-- Rebalance Recommendations -->
      {#if diversificationMetrics.rebalanceRecommendations.length > 0}
        <div>
          <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Rebalancing Recommendations</h4>
          <div class="space-y-2">
            {#each diversificationMetrics.rebalanceRecommendations as rec}
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="flex-1">
                  <p class="font-medium text-gray-900 dark:text-white">{rec.platform}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{rec.rationale}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {formatPercentage(rec.currentWeight)} → {formatPercentage(rec.recommendedWeight)}
                  </p>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    {rec.action === 'reduce' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      rec.action === 'increase' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}">
                    {rec.action.toUpperCase()}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Risk Metrics Table -->
  {#if riskMetrics}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed Risk Metrics</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Volatility Measures</h4>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Total Volatility:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {formatPercentage(riskMetrics.annualizedVolatility)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Downside Volatility:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {formatPercentage(riskMetrics.downsideDeviation)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Risk Measures</h4>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">VaR (95%):</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {formatPercentage(riskMetrics.valueAtRisk95)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">VaR (99%):</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {formatPercentage(riskMetrics.valueAtRisk99)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-300">Current Drawdown:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {formatPercentage(riskMetrics.currentDrawdown)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Component-specific styles if needed */
</style> 