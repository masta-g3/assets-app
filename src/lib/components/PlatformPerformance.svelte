<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import Chart from 'chart.js/auto';
  import type { AssetSummary } from '../utils/calculations';
  import { formatCurrency, formatPercentage, getPlatformColor } from '../utils/calculations';
  
  export let summary: AssetSummary;
  export let dataView: 'percentage' | 'absolute' = 'percentage';
  
  let chartContainer: HTMLCanvasElement;
  let chart: Chart | null = null;
  
  $: showPercentage = dataView === 'percentage';
  
  // Create or update chart
  function updateChart() {
    // Get platforms and data
    const platforms = summary.platforms;
    
    // Calculate datasets
    const data = platforms.map(platform => {
      const platformData = summary.platformData[platform];
      return showPercentage ? platformData.percentChange : platformData.absoluteChange;
    });
    
    // Sort data pairs by the value (descending)
    const combined = platforms.map((platform, index) => ({ 
      platform, 
      value: data[index] 
    }));
    
    combined.sort((a, b) => b.value - a.value);
    
    // Get sorted arrays
    const sortedPlatforms = combined.map(item => item.platform);
    const sortedData = combined.map(item => item.value);
    const colors = sortedPlatforms.map(platform => getPlatformColor(platform));
    
    // If we already have a chart, update it
    if (chart) {
      chart.data.labels = sortedPlatforms;
      chart.data.datasets[0].data = sortedData;
      chart.data.datasets[0].backgroundColor = colors;
      
      // Update the Y-axis title text via options
      // Ensure scales and y scale exist and have a title property before updating
      if (chart.options.scales?.y && chart.options.scales.y.title) {
        chart.options.scales.y.title.text = showPercentage ? 'Change (%)' : 'Change ($)';
        chart.options.scales.y.title.display = true; // Also ensure display is set
      } else {
        // Fallback or handle cases where y scale might not be configured as expected
        // For now, we'll assume it's always a CartesianScale and try setting it.
        // This might need more robust handling if scale types can vary.
        chart.options.scales = {
          ...chart.options.scales,
          y: {
            ...(chart.options.scales?.y),
            title: {
              display: true,
              text: showPercentage ? 'Change (%)' : 'Change ($)'
            }
          }
        };
      }

      chart.update();
      return;
    }
    
    // Create new chart
    chart = new Chart(chartContainer, {
      type: 'bar',
      data: {
        labels: sortedPlatforms,
        datasets: [{
          data: sortedData,
          backgroundColor: colors
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              display: false
            }
          },
          y: {
            title: {
              display: true,
              text: showPercentage ? 'Change (%)' : 'Change ($)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                if (showPercentage) {
                  return `Change: ${formatPercentage(value)}`;
                } else {
                  return `Change: ${formatCurrency(value)}`;
                }
              },
              afterLabel: (context) => {
                const platform = context.label;
                const platformData = summary.platformData[platform];
                if (showPercentage) {
                  return `Absolute: ${formatCurrency(platformData.absoluteChange)}`;
                } else {
                  return `Percentage: ${formatPercentage(platformData.percentChange)}`;
                }
              }
            }
          }
        }
      }
    });
  }
  
  // Initialize and update chart
  onMount(() => {
    if (summary.platforms.length > 0) {
      updateChart();
    }
    
    return () => {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    };
  });
  
  // Update chart when summary or dataView changes
  $: if (summary.platforms.length > 0 && chart) {
    updateChart();
  }
  
  // Toggle data view
  function toggleDataView() {
    dataView = dataView === 'percentage' ? 'absolute' : 'percentage';
  }
  
  // Find best and worst performing platforms whenever summary or view changes
  $: bestPlatform = findBestPlatform(summary, showPercentage);
  $: worstPlatform = findWorstPlatform(summary, showPercentage);
  
  function findBestPlatform(sum: AssetSummary, usePercentage: boolean) {
    if (sum.platforms.length === 0) return null;
    
    let best = { platform: '', value: -Infinity };
    
    sum.platforms.forEach(platform => {
      const data = sum.platformData[platform];
      
      // Skip platforms with no previous data
      if (data.previousAmount === 0) return;
      
      const value = usePercentage ? data.percentChange : data.absoluteChange;
      
      if (value > best.value) {
        best = { platform, value };
      }
    });
    
    return best.platform ? {
      platform: best.platform,
      value: best.value
    } : null;
  }
  
  function findWorstPlatform(sum: AssetSummary, usePercentage: boolean) {
    if (sum.platforms.length === 0) return null;
    
    let worst = { platform: '', value: Infinity };
    
    sum.platforms.forEach(platform => {
      const data = sum.platformData[platform];
      
      // Skip platforms with no previous data
      if (data.previousAmount === 0) return;
      
      const value = usePercentage ? data.percentChange : data.absoluteChange;
      
      if (value < worst.value) {
        worst = { platform, value };
      }
    });
    
    return worst.platform ? {
      platform: worst.platform,
      value: worst.value
    } : null;
  }
</script>

<div class="platform-performance card">
  <div class="performance-header">
    <h3>Platform Performance</h3>
    
    <div class="view-toggle">
      <button class="toggle-btn {dataView === 'percentage' ? 'active' : ''}" 
              on:click={() => dataView = 'percentage'}>
        Percentage
      </button>
      <button class="toggle-btn {dataView === 'absolute' ? 'active' : ''}" 
              on:click={() => dataView = 'absolute'}>
        Absolute
      </button>
    </div>
  </div>
  
  <div class="performance-stats">
    {#if bestPlatform}
      <div class="stat-card best">
        <div class="stat-label">Best Performer</div>
        <div class="stat-value">{bestPlatform.platform}</div>
        <div class="stat-change positive">
          {showPercentage 
            ? formatPercentage(bestPlatform.value) 
            : formatCurrency(bestPlatform.value)
          }
        </div>
      </div>
    {/if}
    
    {#if worstPlatform}
      <div class="stat-card worst">
        <div class="stat-label">Worst Performer</div>
        <div class="stat-value">{worstPlatform.platform}</div>
        <div class="stat-change negative">
          {showPercentage 
            ? formatPercentage(worstPlatform.value) 
            : formatCurrency(worstPlatform.value)
          }
        </div>
      </div>
    {/if}
  </div>
  
  <div class="chart-container">
    {#if summary.platforms.length === 0}
      <div class="no-data">No performance data available</div>
    {:else}
      <canvas bind:this={chartContainer}></canvas>
    {/if}
  </div>
</div>

<style>
  .platform-performance {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .performance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  
  .view-toggle {
    display: inline-flex;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    border: 1px solid rgba(109, 90, 80, 0.3);
  }
  
  .toggle-btn {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.95rem;
    font-weight: 500;
    background-color: transparent;
    border: none;
    color: var(--color-stone-gray);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    border-radius: 0;
    border-right: 1px solid rgba(109, 90, 80, 0.3);
  }
  
  .toggle-btn:last-child {
    border-right: none;
  }
  
  .toggle-btn:hover {
    background-color: rgba(155, 155, 147, 0.1);
  }
  
  .toggle-btn.active {
    background-color: rgba(255, 255, 255, 0.7);
    color: var(--color-deep-brown);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .performance-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .stat-card {
    padding: var(--space-md);
    border-radius: var(--border-radius-sm);
    background-color: rgba(95, 116, 100, 0.05);
  }
  
  .stat-card.best {
    border-left: 3px solid var(--color-positive);
  }
  
  .stat-card.worst {
    border-left: 3px solid var(--color-negative);
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: var(--color-stone-gray);
    margin-bottom: var(--space-xs);
  }
  
  .stat-value {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--space-xs);
  }
  
  .stat-change {
    font-size: 1rem;
    font-weight: 500;
  }
  
  .positive {
    color: var(--color-positive);
  }
  
  .negative {
    color: var(--color-negative);
  }
  
  .chart-container {
    height: 350px;
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
  
  @media (max-width: 768px) {
    .performance-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .view-toggle {
      margin-top: var(--space-sm);
    }
    
    .performance-stats {
      grid-template-columns: 1fr;
    }
  }
</style>