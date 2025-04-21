<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import Chart from 'chart.js/auto';
  import { assetStore, groupedAllocationData } from '../stores/assetStore';
  import { formatCurrency, formatPercentage, getPlatformColor } from '../utils/calculations';
  
  let chartContainer: HTMLCanvasElement;
  let chart: Chart | null = null;
  
  $: allocationData = $groupedAllocationData;
  $: groupBy = $assetStore.allocationChartGroupBy;

  // Create or update chart
  function updateChart() {
    const { labels, data, colors } = allocationData;
    
    // Calculate total for percentages
    const total = data.reduce((sum, amount) => sum + amount, 0);
    
    // If we already have a chart, update it
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();
      return;
    }
    
    // Create new chart if container exists
    if (chartContainer) {
      chart = new Chart(chartContainer, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
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
  }
  
  // Initialize chart
  onMount(() => {
    if (allocationData && allocationData.data.length > 0) {
      updateChart();
    }
  });
  
  onDestroy(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });
  
  // Update chart when data changes
  afterUpdate(() => {
    if (chartContainer && allocationData) {
      if (allocationData.data.length > 0) {
        if (!chart) {
          updateChart();
        } else {
          const currentLabels = chart.data.labels as string[];
          const currentData = chart.data.datasets[0].data as number[];
          if (JSON.stringify(currentLabels) !== JSON.stringify(allocationData.labels) || JSON.stringify(currentData) !== JSON.stringify(allocationData.data)) {
            updateChart();
          }
        }
      } else if (chart) {
        chart.destroy();
        chart = null;
      }
    }
  });

  function setGroupByPlatform() {
    assetStore.setAllocationChartGroupBy('platform');
  }
  function setGroupByTag() {
    assetStore.setAllocationChartGroupBy('tag');
  }
</script>

<div class="allocation-chart card">
  <div class="header">
    <h3>Portfolio Allocation</h3>
    <div class="group-toggle">
      <span>Group by:</span>
      <button 
        class:active={groupBy === 'platform'} 
        on:click={setGroupByPlatform}
      >
        Platform
      </button>
      <button 
        class:active={groupBy === 'tag'} 
        on:click={setGroupByTag}
      >
        Tag
      </button>
    </div>
  </div>
  
  <div class="chart-container">
    {#if !allocationData || allocationData.data.length === 0}
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
    display: flex;
    flex-direction: column;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
  }
  
  h3 {
    margin: 0;
  }
  
  .group-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  
  .group-toggle span {
    color: var(--secondary-text-color);
  }
  
  .group-toggle button {
    background: none;
    border: 1px solid var(--border-color);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    transition: background-color 0.2s, color 0.2s;
  }
  
  .group-toggle button.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  .group-toggle button:not(.active):hover {
    background-color: var(--hover-background-color);
  }
  
  .chart-container {
    height: 300px;
    position: relative;
    flex-grow: 1;
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