<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import Chart from 'chart.js/auto';
  import { assetStore, type MonthlyRateData } from '../stores/assetStore';
  import type { AssetEntry } from '../db';
  import { 
    formatCurrency, 
    formatPercentage,
    getPlatformColor, 
    groupByDate, 
    groupByPlatform 
  } from '../utils/calculations';
  import { format, parse } from 'date-fns';
  
  export let assets: AssetEntry[] = [];
  export let selectedDate: string = '';
  
  let chartContainer: HTMLCanvasElement;
  let chartInstance: Chart | null = null;
  
  // State for chart toggle
  let showRatesChart = false;
  
  // State for theme detection
  let isDarkMode = false;
  
  // Subscribe to rate data from the store
  let monthlyRateData: MonthlyRateData = { dates: [], expectedRates: [], realizedRates: [] };
  assetStore.subscribe(value => {
    if (value.monthlyRateData) {
      monthlyRateData = value.monthlyRateData;
    }
  });
  
  // Prepare data for the VALUE chart
  function prepareValueChartData() {
    // Group by date first
    const entriesByDate = groupByDate(assets);
    
    // Get all dates and platforms
    const dates = [...entriesByDate.keys()].sort();
    const platformSet = new Set<string>();
    
    assets.forEach(entry => platformSet.add(entry.platform));
    
    const platforms = [...platformSet];
    
    // Prepare datasets
    const datasets = platforms.map((platform) => {
      const data: number[] = [];
      
      dates.forEach(date => {
        const entriesForDate = entriesByDate.get(date) || [];
        const entryForPlatform = entriesForDate.find(e => e.platform === platform);
        
        if (entryForPlatform) {
          data.push(entryForPlatform.amount);
        } else {
          // Fill in zero for missing data points
          data.push(0);
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
  function renderChart() {
    if (!chartContainer) return;
    if (chartInstance) {
      chartInstance.destroy(); // Destroy previous chart instance
      chartInstance = null;
    }
    
    if (showRatesChart) {
      renderRatesChart();
    } else {
      renderValueChart();
    }
  }
  
  // Render the Value Evolution Chart
  function renderValueChart() {
    const { dates, datasets } = prepareValueChartData();
    
    if (assets.length === 0) return;
    
    // Create new chart
    chartInstance = new Chart(chartContainer, {
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
  
  // Render the Monthly Rates Chart
  function renderRatesChart() {
    const { dates, expectedRates, realizedRates } = monthlyRateData;
    
    if (dates.length === 0) return;
    
    // Check dark mode on render
    if (typeof document !== 'undefined') {
      isDarkMode = document.body.classList.contains('dark-mode');
    }
    
    chartInstance = new Chart(chartContainer, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Expected Rate (W-Avg)',
            data: expectedRates,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1
          },
          {
            label: 'Realized Rate (MoM)',
            data: realizedRates,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Month'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Rate (%)'
            },
            beginAtZero: false, // Rates can be negative
            grid: {
              // Make the zero line darker and thicker
              color: context => {
                const defaultGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                const zeroLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'; // Lighter gray for dark, darker for light
                return context.tick.value === 0 ? zeroLineColor : defaultGridColor;
              },
              lineWidth: context => {
                if (context.tick.value === 0) {
                  return 2; // Thicker line for zero
                } else {
                  return 1; // Default grid line width
                }
              }
            }
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
              title: (context) => context[0].label,
              label: (context) => {
                return `${context.dataset.label}: ${formatPercentage(context.parsed.y)}`;
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
    renderChart();
    
    // Add listener for theme changes
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const currentlyDark = document.body.classList.contains('dark-mode');
          if (currentlyDark !== isDarkMode) {
            isDarkMode = currentlyDark;
            renderChart(); // Re-render chart on theme change
          }
        }
      }
    });

    observer.observe(document.body, { attributes: true });

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      observer.disconnect();
    };
  });
  
  // Update chart when assets change or toggle is flipped
  afterUpdate(() => {
    // Re-render if assets, selectedDate, or toggle changes
    // Assets check handles initial load and clearing data
    if (assets.length > 0) {
      renderChart();
    } else if (chartInstance) {
      chartInstance.destroy(); // Clear chart if no assets
      chartInstance = null;
    }
  });
  
  $: assets, selectedDate, showRatesChart, renderChart(); // Reactive statement to re-render
  $: monthlyRateData, renderChart();
</script>

<div class="evolution-chart card">
  <div class="chart-header">
    <h3>{showRatesChart ? 'Monthly Rate Analysis' : 'Portfolio Evolution'}</h3>
    <div class="toggle-buttons">
      <button class:active={!showRatesChart} on:click={() => showRatesChart = false}>Value</button>
      <button class:active={showRatesChart} on:click={() => showRatesChart = true} disabled={monthlyRateData.dates.length < 2}>Rates</button>
    </div>
  </div>
  
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
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
  }
  
  .toggle-buttons button {
    background-color: var(--color-light-gray);
    border: 1px solid var(--color-border);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    margin-left: var(--space-xs);
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.2s ease;
  }
  
  .toggle-buttons button:hover {
    background-color: var(--color-medium-gray);
  }
  
  .toggle-buttons button.active {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  .toggle-buttons button:disabled {
    background-color: var(--color-light-gray);
    color: var(--color-stone-gray);
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>