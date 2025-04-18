<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import Chart from 'chart.js/auto';
  import type { AssetEntry } from '../db';
  import { 
    formatCurrency, 
    getPlatformColor, 
    groupByDate, 
    groupByPlatform 
  } from '../utils/calculations';
  import { format, parse } from 'date-fns';
  
  export let assets: AssetEntry[] = [];
  export let selectedDate: string = '';
  
  let chartContainer: HTMLCanvasElement;
  let chart: Chart | null = null;
  
  // Prepare data for the chart
  function prepareChartData() {
    // Group by date first
    const entriesByDate = groupByDate(assets);
    
    // Get all dates and platforms
    const dates = [...entriesByDate.keys()].sort();
    const platformSet = new Set<string>();
    
    assets.forEach(entry => platformSet.add(entry.platform));
    
    const platforms = [...platformSet];
    
    // Prepare datasets
    const datasets = platforms.map(platform => {
      const data: { x: string; y: number }[] = [];
      
      dates.forEach(date => {
        const entriesForDate = entriesByDate.get(date) || [];
        const entryForPlatform = entriesForDate.find(e => e.platform === platform);
        
        if (entryForPlatform) {
          data.push({
            x: format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM yyyy'),
            y: entryForPlatform.amount
          });
        } else {
          // Fill in zero for missing data points
          data.push({
            x: format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM yyyy'),
            y: 0
          });
        }
      });
      
      return {
        label: platform,
        data,
        backgroundColor: getPlatformColor(platform, 0.7),
        borderColor: getPlatformColor(platform),
        borderWidth: 1,
        fill: 'origin'
      };
    });
    
    return {
      dates: dates.map(date => format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM yyyy')),
      datasets
    };
  }
  
  // Create or update chart
  function updateChart() {
    const { dates, datasets } = prepareChartData();
    
    // If we already have a chart, update it
    if (chart) {
      chart.data.labels = dates;
      chart.data.datasets = datasets;
      chart.update();
      return;
    }
    
    // Create new chart
    chart = new Chart(chartContainer, {
      type: 'line',
      data: {
        labels: dates,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Value ($)'
            },
            stacked: true,
            beginAtZero: true
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (context) => {
                return context[0].label;
              },
              label: (context) => {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
              },
              footer: (context) => {
                // Calculate total for all datasets at this point
                let total = 0;
                context.forEach(item => {
                  total += item.parsed.y;
                });
                return `Total: ${formatCurrency(total)}`;
              }
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12
              },
              padding: 16
            }
          }
        }
      }
    });
  }
  
  // Initialize and update chart
  onMount(() => {
    if (assets.length > 0) {
      updateChart();
    }
    
    return () => {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    };
  });
  
  // Update chart when assets change
  afterUpdate(() => {
    if (assets.length > 0) {
      updateChart();
    } else if (chart) {
      chart.destroy();
      chart = null;
    }
  });
</script>

<div class="evolution-chart card">
  <h3>Portfolio Evolution</h3>
  
  <div class="chart-container">
    {#if assets.length === 0}
      <div class="no-data">No evolution data available</div>
    {:else}
      <canvas bind:this={chartContainer}></canvas>
    {/if}
  </div>
</div>

<style>
  .evolution-chart {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
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
</style>