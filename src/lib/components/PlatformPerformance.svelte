<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import 'chartjs-adapter-date-fns'; // Import the date adapter
  import { 
    assetStore, 
    platformPerformanceTimeSeriesData 
  } from '../stores/assetStore'; // Updated imports
  import type { AssetEntry } from '../db';
  import { 
    calculateSummary, 
    formatCurrency, 
    formatPercentage, 
    getPlatformColor,
    getHistoricalEntries,
    getYearStartEntries
  } from '../utils/calculations';
  import type { AssetSummary } from '../utils/calculations';
  import { parse as parseDate, format as formatDateFns } from 'date-fns'; // Renamed to avoid conflict if any
  import type { ChartOptions, TitleOptions, TooltipItem } from 'chart.js'; // Refined imports
  import type { AnnotationPluginOptions, LineAnnotationOptions, LabelAnnotationOptions } from 'chartjs-plugin-annotation';

  // export let summary: AssetSummary; // REMOVED summary prop

  // --- Component State ---
  // Bar Chart specific
  let barChartContainer: HTMLCanvasElement;
  let barChart: Chart<'bar'> | null = null; // More specific chart type
  let barChartDataView: 'percentage' | 'absolute' = 'percentage'; 
  $: showPercentageInBarChart = barChartDataView === 'percentage';
  let localBarChartSummary: AssetSummary | null = null;
  let barChartComparisonPeriod: 'MoM' | 'YTD' | 'YoY' = 'MoM';
  let isLoadingBarChartData: boolean = true;

  // Time Series specific
  let timeSeriesChartContainer: HTMLCanvasElement;
  let timeSeriesChart: Chart<'line'> | null = null; // More specific chart type
  let localTsStartDate: string | null = null;
  let localTsEndDate: string | null = null;

  // Derived from assetStore
  let currentView: 'bar' | 'timeseries';
  let globalSelectedDate: string; // Main date from app slider
  let allDatesFromStore: string[] = [];
  let entriesByDateFromStore: Map<string, AssetEntry[]> = new Map();
  let tsPerformanceType: 'interval' | 'cumulative';
  let tsDateRangeFromStore: { start: string | null; end: string | null };
  let timeSeriesDataForChart: import('../stores/assetStore').PlatformPerformanceTimeSeries = {};
  let tsShowTotalFromStore: boolean = false; // ADDED for Show Total state

  // --- Store Subscriptions ---
  const unsubscribeAssetStore = assetStore.subscribe(value => {
    currentView = value.platformPerformanceView;
    globalSelectedDate = value.selectedDate;
    allDatesFromStore = value.allDates;
    entriesByDateFromStore = value.entriesByDate;
    tsPerformanceType = value.timeSeriesPerformanceType;
    tsDateRangeFromStore = value.timeSeriesDateRange;
    tsShowTotalFromStore = value.timeSeriesShowTotal; // ADDED subscription

    // Initialize local TS date inputs if they haven't been set by user yet or if store changes them
    if (tsDateRangeFromStore.start && localTsStartDate !== tsDateRangeFromStore.start) {
        localTsStartDate = tsDateRangeFromStore.start;
    }
    if (tsDateRangeFromStore.end && localTsEndDate !== tsDateRangeFromStore.end) {
        localTsEndDate = tsDateRangeFromStore.end;
    }
  });

  const unsubscribeTSData = platformPerformanceTimeSeriesData.subscribe(data => {
    timeSeriesDataForChart = data;
    // Defer chart update to reactive statements or explicit calls to avoid premature rendering
  });

  onDestroy(() => {
    if (barChart) barChart.destroy();
    if (timeSeriesChart) timeSeriesChart.destroy();
    unsubscribeAssetStore();
    unsubscribeTSData();
  });

  // --- Data Calculation for Bar Chart ---
  async function calculateBarChartData() {
    if (!globalSelectedDate || allDatesFromStore.length === 0 || entriesByDateFromStore.size === 0) {
      localBarChartSummary = null;
      isLoadingBarChartData = false; // No data to load
      return;
    }
    isLoadingBarChartData = true;
    try {
      const currentEntries = entriesByDateFromStore.get(globalSelectedDate) || [];
      let previousEntries: AssetEntry[];

      if (barChartComparisonPeriod === 'YTD') {
        previousEntries = getYearStartEntries(globalSelectedDate, allDatesFromStore, entriesByDateFromStore);
      } else { // 'MoM' or 'YoY'
        previousEntries = getHistoricalEntries(globalSelectedDate, barChartComparisonPeriod, allDatesFromStore, entriesByDateFromStore);
      }
      
      localBarChartSummary = calculateSummary(currentEntries, previousEntries);
    } catch (error) {
      console.error("Error calculating bar chart summary:", error);
      localBarChartSummary = null;
    } finally {
      isLoadingBarChartData = false;
    }
  }

  // --- Reactive Triggers for Bar Chart Data ---
  $: if (globalSelectedDate && entriesByDateFromStore.size > 0) {
    calculateBarChartData();
  }
  $: if (barChartComparisonPeriod) { // React to local period changes
    calculateBarChartData();
  }

  // --- Chart Update Functions (to be refined for typings later) ---
  function updateBarChart() {
    if (isLoadingBarChartData || !localBarChartSummary || !barChartContainer || !localBarChartSummary.platforms) {
        if(barChart) { barChart.destroy(); barChart = null;} // Clear chart if no data
        return;
    }
    const platforms = localBarChartSummary.platforms;
    const data = platforms.map(platform => {
      const pd = localBarChartSummary!.platformData[platform];
      return pd ? (showPercentageInBarChart ? pd.percentChange : pd.absoluteChange) : 0;
    });
    const combined = platforms.map((p, i) => ({ platform: p, value: data[i] })).sort((a,b) => b.value - a.value);
    const sortedPlatforms = combined.map(item => item.platform);
    const sortedData = combined.map(item => item.value);
    const colors = sortedPlatforms.map(p => getPlatformColor(p));
    const titleText = showPercentageInBarChart ? 'Change (%)' : 'Change ($)';

    if (barChart) {
      barChart.data.labels = sortedPlatforms;
      barChart.data.datasets[0].data = sortedData;
      barChart.data.datasets[0].backgroundColor = colors;
      // Safely update bar chart X-axis title
      if (barChart.options.scales?.x) {
        if (!barChart.options.scales.x.title) {
          barChart.options.scales.x.title = { display: true, text: titleText };
        } else {
          barChart.options.scales.x.title.text = titleText;
          barChart.options.scales.x.title.display = true;
        }
      }
      barChart.update();
    } else {
      const options: ChartOptions<'bar'> = {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, grid: { display: false }, title: { display: true, text: titleText } },
          y: { title: { display: false, text: 'Platform' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: TooltipItem<'bar'>) => {
                const value = context.raw as number;
                return showPercentageInBarChart ? `Change: ${formatPercentage(value)}` : `Change: ${formatCurrency(value)}`;
              },
              afterLabel: (context: TooltipItem<'bar'>) => {
                const platform = context.label;
                const platformInfo = localBarChartSummary?.platformData[platform];
                if (!platformInfo) return '';
                return showPercentageInBarChart 
                  ? `Absolute: ${formatCurrency(platformInfo.absoluteChange)}` 
                  : `Percentage: ${formatPercentage(platformInfo.percentChange)}`;
              }
            }
          }
        }
      };
      barChart = new Chart(barChartContainer, { type: 'bar', data: { labels: sortedPlatforms, datasets: [{ data: sortedData, backgroundColor: colors }] }, options });
    }
  }

  function updateTimeSeriesChart() {
    if (!timeSeriesChartContainer || !timeSeriesDataForChart || Object.keys(timeSeriesDataForChart).length === 0) {
      if (timeSeriesChart) { timeSeriesChart.destroy(); timeSeriesChart = null; }
      return;
    }
    const datasets = Object.entries(timeSeriesDataForChart).map(([key, points]) => ({
      label: key, // Will be "Total Portfolio" or platform name
      data: points.map(p => ({ x: parseDate(p.date, 'yyyy-MM-dd', new Date()).getTime(), y: p.value })),
      // Use a distinct color for "Total Portfolio", otherwise platform color
      borderColor: key === "Total Portfolio" ? '#4A4A4A' : getPlatformColor(key),
      backgroundColor: key === "Total Portfolio" ? 'rgba(74, 74, 74, 0.5)' : getPlatformColor(key, 0.5),
      fill: false, tension: 0.1,
    }));

    // The plugin expects a map of annotation objects, where each object explicitly includes its type.
    const annotationsMap: { [key: string]: any } = {}; 

    if (globalSelectedDate) {
        annotationsMap['selectedDateLine'] = {
            type: 'line', // Explicitly define type here
            scaleID: 'x',
            value: parseDate(globalSelectedDate, 'yyyy-MM-dd', new Date()).getTime(),
            borderColor: 'rgba(128, 128, 128, 0.7)', 
            borderWidth: 2, 
            borderDash: [6, 6],
            label: {
              content: 'Slider Date', 
              display: true, 
              position: 'start', // Valid string literal as per documentation for line annotation labels
              font: { size: 10 }, 
              color: 'rgba(128,128,128,0.7)',
              // No explicit cast to LabelAnnotationOptions, relying on structural typing for the label object
            }
        };
    }
    
    const annotationPluginOptions: AnnotationPluginOptions = { annotations: annotationsMap };

    const yAxisTitleText = tsPerformanceType === 'interval' ? 'Interval Performance (%)' : 'Cumulative Performance (%)';

    if (timeSeriesChart) {
      timeSeriesChart.data.datasets = datasets;
      // Safely update time series chart Y-axis title
      if (timeSeriesChart.options.scales?.y) {
        if (!timeSeriesChart.options.scales.y.title) {
          timeSeriesChart.options.scales.y.title = { display: true, text: yAxisTitleText };
        } else {
          timeSeriesChart.options.scales.y.title.text = yAxisTitleText;
          timeSeriesChart.options.scales.y.title.display = true;
        }
      }
      if (timeSeriesChart.options.plugins) timeSeriesChart.options.plugins.annotation = annotationPluginOptions;
      timeSeriesChart.update();
    } else {
      const options: ChartOptions<'line'> = {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { type: 'time', time: { unit: 'month', tooltipFormat: 'MMM yyyy', displayFormats: { month: 'MMM yyyy' } }, title: { display: true, text: 'Date' } },
          y: { beginAtZero: false, title: { display: true, text: yAxisTitleText }, ticks: { callback: (val) => formatPercentage(val as number) } }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { /* Define similar to bar chart if needed */ } },
          annotation: annotationPluginOptions
        }
      };
      timeSeriesChart = new Chart(timeSeriesChartContainer, { type: 'line', data: { datasets }, options });
    }
  }

  // --- Event Handlers & UI Logic (to be added in next step for UI changes) ---
  function setView(view: 'bar' | 'timeseries') {
    assetStore.setPlatformPerformanceView(view);
  }

  function handleBarChartPeriodChange(period: 'MoM' | 'YTD' | 'YoY') {
    barChartComparisonPeriod = period; // This will trigger reactive data calculation
  }

  function handleTsPerformanceTypeChange(type: 'interval' | 'cumulative') {
    assetStore.setTimeSeriesPerformanceType(type);
  }

  function handleTsShowTotalChange(event: Event) { // ADDED handler
    const target = event.target as HTMLInputElement;
    assetStore.setTimeSeriesShowTotal(target.checked);
  }

  function applyDateRange() {
    const start = localTsStartDate ? formatDateFns(parseDate(localTsStartDate, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd') : null;
    const end = localTsEndDate ? formatDateFns(parseDate(localTsEndDate, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd') : null;
    assetStore.setTimeSeriesDateRange({ start, end });
  }
  
  function clearDateRange() {
    localTsStartDate = null;
    localTsEndDate = null;
    assetStore.setTimeSeriesDateRange({ start: null, end: null });
  }

  // --- Reactive Updates for Chart Rendering ---
  $: if (currentView === 'bar') {
    if (!isLoadingBarChartData && localBarChartSummary) {
      updateBarChart();
    } else if (!isLoadingBarChartData && !localBarChartSummary) {
      // Handle empty/error state for bar chart (e.g., destroy or show 'no data')
      if(barChart) { barChart.destroy(); barChart = null;}
    }
  } else if (currentView === 'timeseries') {
    updateTimeSeriesChart(); // This will handle its own empty data check
  }
  
  // Update bar chart view when its specific data view toggle changes
  $: if (barChartDataView && currentView === 'bar' && !isLoadingBarChartData && localBarChartSummary) {
    updateBarChart();
  }

  onMount(() => {
    // Initial data calculation for bar chart based on current global date and default local period
    calculateBarChartData().then(() => {
        if (currentView === 'bar') updateBarChart();
    });
    // Initial setup for TS chart if it's the active view
    if (currentView === 'timeseries') updateTimeSeriesChart();

    if (tsDateRangeFromStore.start && !localTsStartDate) localTsStartDate = tsDateRangeFromStore.start;
    if (tsDateRangeFromStore.end && !localTsEndDate) localTsEndDate = tsDateRangeFromStore.end;
  });

</script>

<div class="platform-performance card">
  <div class="performance-header">
    <h3>Platform Performance</h3>
    <div class="view-toggle-buttons">
      <button class="toggle-btn {currentView === 'bar' ? 'active' : ''}" 
              on:click={() => setView('bar')}>
        Bar Chart
      </button>
      <button class="toggle-btn {currentView === 'timeseries' ? 'active' : ''}" 
              on:click={() => setView('timeseries')}>
        Time Series
      </button>
    </div>
  </div>

  {#if currentView === 'bar'}
    <div class="bar-chart-controls">
        <div class="stat-label">View:</div>
        <div class="view-toggle">
            <button class="toggle-btn {barChartDataView === 'percentage' ? 'active' : ''}" 
                    on:click={() => barChartDataView = 'percentage'}>
              Percentage
            </button>
            <button class="toggle-btn {barChartDataView === 'absolute' ? 'active' : ''}" 
                    on:click={() => barChartDataView = 'absolute'}>
              Absolute
            </button>
        </div>
        <!-- New Bar Chart Comparison Period Toggle -->
        <div class="stat-label" style="margin-left: var(--space-md);">Compare:</div>
        <div class="view-toggle">
            <button class="toggle-btn {barChartComparisonPeriod === 'MoM' ? 'active' : ''}" 
                    on:click={() => handleBarChartPeriodChange('MoM')}>
              MoM
            </button>
            <button class="toggle-btn {barChartComparisonPeriod === 'YTD' ? 'active' : ''}" 
                    on:click={() => handleBarChartPeriodChange('YTD')}>
              YTD
            </button>
            <button class="toggle-btn {barChartComparisonPeriod === 'YoY' ? 'active' : ''}" 
                    on:click={() => handleBarChartPeriodChange('YoY')}>
              YoY
            </button>
        </div>
    </div>
    <div class="performance-stats">
      <!-- Best/Worst performer can be derived from summary,
           make sure it respects barChartDataView (showPercentageInBarChart) -->
      <!-- Example: (logic to find best/worst would need to be here or passed in) -->
      <!-- {#if bestPlatform} ... {/if} -->
    </div>
    <div class="chart-container" style="{localBarChartSummary && localBarChartSummary.platforms && localBarChartSummary.platforms.length === 0 ? 'min-height: 100px;' : ''}">
      {#if !localBarChartSummary || !localBarChartSummary.platforms || localBarChartSummary.platforms.length === 0}
        <div class="no-data">No performance data for selected period</div>
      {:else}
        <canvas bind:this={barChartContainer}></canvas>
      {/if}
    </div>
  {:else if currentView === 'timeseries'}
    <div class="timeseries-controls">
      <div class="control-group">
        <span class="stat-label">Performance Type:</span>
        <div class="view-toggle">
          <button class="toggle-btn {tsPerformanceType === 'interval' ? 'active' : ''}" on:click={() => handleTsPerformanceTypeChange('interval')}>Interval</button>
          <button class="toggle-btn {tsPerformanceType === 'cumulative' ? 'active' : ''}" on:click={() => handleTsPerformanceTypeChange('cumulative')}>Cumulative</button>
        </div>
      </div>
      <div class="control-group date-range-controls">
        <span class="stat-label">Date Range:</span>
        <input type="date" bind:value={localTsStartDate} title="Start Date" />
        <span class="stat-label">to</span>
        <input type="date" bind:value={localTsEndDate} title="End Date" />
        <div class="date-range-actions">
          <button 
            class="action-btn apply-btn" 
            on:click={applyDateRange}
            title="Apply Date Range"
          >
            <!-- Apply SVG Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="display: block; margin: auto;">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
            </svg>
          </button>
          <button 
            class="action-btn clear-btn" 
            on:click={clearDateRange}
            title="Clear Date Range"
          >
            <!-- Clear SVG Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style="display: block; margin: auto;">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
            </svg>
          </button>
        </div>
      </div>
      <!-- ADDED Show Total Toggle -->
      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={tsShowTotalFromStore} on:change={handleTsShowTotalChange} />
          Total
        </label>
      </div>
    </div>
    <div class="chart-container" style="{Object.keys(timeSeriesDataForChart).length === 0 ? 'min-height: 100px;' : ''}">
      {#if Object.keys(timeSeriesDataForChart).length === 0}
        <div class="no-data">No time-series data for selected type/range.</div>
      {:else}
        <canvas bind:this={timeSeriesChartContainer}></canvas>
      {/if}
    </div>
  {/if}
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
  
  .view-toggle-buttons { /* Styles for the new Bar/Time-Series toggle */
    display: inline-flex;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    border: 1px solid rgba(109, 90, 80, 0.3);
  }

  .bar-chart-controls {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .bar-chart-controls .stat-label {
      font-size: 0.9rem;
      color: var(--color-stone-gray);
  }
  
  /* Ensure toggle-btn styles from original apply to both toggles */
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
  }
  
  .view-toggle-buttons .toggle-btn {
     border-right: 1px solid rgba(109, 90, 80, 0.3);
  }
  .view-toggle-buttons .toggle-btn:last-child {
    border-right: none;
  }

  .view-toggle { /* Added this wrapper class for styling consistency */
    display: inline-flex;
    border-radius: var(--border-radius-md);
    overflow: hidden;
    border: 1px solid rgba(109, 90, 80, 0.3);
  }
  
  /* Styles for Percentage/Absolute and MoM/YTD/YoY toggles */
  .view-toggle .toggle-btn {
     border-right: 1px solid rgba(109, 90, 80, 0.3);
  }
   .view-toggle .toggle-btn:last-child {
    border-right: none;
  }
  
  .toggle-btn:hover {
    background-color: rgba(155, 155, 147, 0.1);
  }
  
  .toggle-btn.active {
    background-color: rgba(255, 255, 255, 0.7); /* A slightly more opaque white for active */
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
    
    .view-toggle-buttons {
      margin-top: var(--space-sm);
    }
    
    .performance-stats {
      grid-template-columns: 1fr;
    }
  }

  .timeseries-controls {
    display: flex;
    flex-direction: column; /* Stack control groups */
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    background-color: rgba(0,0,0,0.02);
    border-radius: var(--border-radius-sm);
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .date-range-controls input[type="date"] {
    padding: var(--space-xs);
    border: 1px solid var(--color-stone-gray-light);
    border-radius: var(--border-radius-sm);
  }
  .action-btn {
    padding: var(--space-xs) var(--space-md); /* Base padding */
    background-color: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
    min-width: 50px; /* Ensure a minimum width for icon buttons */
    display: inline-flex; /* Helps center icon if needed */
    align-items: center;
    justify-content: center;
  }
  .action-btn:hover {
    background-color: var(--color-accent-dark);
  }

  .action-btn.apply-btn {
    margin-right: var(--space-sm);
  }

  /* Optional: Adjust icon size if needed via CSS, though inline width/height on SVG is usually fine */
  .action-btn svg {
    /* width: 1em; */ /* Example: scales with font size */
    /* height: 1em; */
  }

  /* ADDED styles for checkbox label */
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    color: var(--color-stone-gray);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
    /* Add more specific styling if needed to match app theme */
  }
</style>