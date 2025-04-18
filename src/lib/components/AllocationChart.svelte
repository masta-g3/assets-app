<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import Chart from 'chart.js/auto';
  import type { AssetEntry } from '../db';
  import { formatCurrency, formatPercentage, getPlatformColor } from '../utils/calculations';
  
  export let entries: AssetEntry[] = [];
  
  let chartContainer: HTMLCanvasElement;
  let chart: Chart | null = null;
  
  // Prepare data for the chart
  function prepareChartData() {
    // Group by platform and sum amounts
    const platformTotals = new Map<string, number>();
    
    entries.forEach(entry => {
      const currentTotal = platformTotals.get(entry.platform) || 0;
      platformTotals.set(entry.platform, currentTotal + entry.amount);
    });
    
    // Convert to arrays for Chart.js
    const platforms: string[] = [];
    const amounts: number[] = [];
    const colors: string[] = [];
    
    platformTotals.forEach((amount, platform) => {
      platforms.push(platform);
      amounts.push(amount);
      colors.push(getPlatformColor(platform));
    });
    
    return {
      platforms,
      amounts,
      colors
    };
  }
  
  // Create or update chart
  function updateChart() {
    const { platforms, amounts, colors } = prepareChartData();
    
    // Calculate total for percentages
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    
    // If we already have a chart, update it
    if (chart) {
      chart.data.labels = platforms;
      chart.data.datasets[0].data = amounts;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();
      return;
    }
    
    // Create new chart
    chart = new Chart(chartContainer, {
      type: 'doughnut',
      data: {
        labels: platforms,
        datasets: [{
          data: amounts,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: 'white'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12
              },
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const percentage = (value / total) * 100;
                return `${context.label}: ${formatCurrency(value)} (${formatPercentage(percentage)})`;
              }
            }
          }
        },
        cutout: '65%',
        animation: {
          animateRotate: true,
          animateScale: true
        }
      }
    });
  }
  
  // Initialize and update chart
  onMount(() => {
    if (entries.length > 0) {
      updateChart();
    }
    
    return () => {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    };
  });
  
  // Update chart when entries change
  afterUpdate(() => {
    if (entries.length > 0) {
      updateChart();
    } else if (chart) {
      chart.destroy();
      chart = null;
    }
  });
</script>

<div class="allocation-chart card">
  <h3>Portfolio Allocation</h3>
  
  <div class="chart-container">
    {#if entries.length === 0}
      <div class="no-data">No allocation data available</div>
    {:else}
      <canvas bind:this={chartContainer}></canvas>
    {/if}
  </div>
</div>

<style>
  .allocation-chart {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .chart-container {
    height: 300px;
    position: relative;
    margin-top: var(--space-md);
  }
  
  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-stone-gray);
    font-style: italic;
  }
</style>