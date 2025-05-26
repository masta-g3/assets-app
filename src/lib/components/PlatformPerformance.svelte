<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import 'chartjs-adapter-date-fns'; // Import the date adapter
  import annotationPlugin from 'chartjs-plugin-annotation';
  import { 
    assetStore, 
    platformPerformanceTimeSeriesData 
  } from '../stores/assetStore'; // Updated imports

  // Register the annotation plugin
  Chart.register(annotationPlugin);
  import type { AssetEntry } from '../db';
  import { 
    formatCurrency, 
    formatPercentage, 
    getPlatformColor
  } from '../utils/calculations';
  import type { EnhancedAssetSummary } from '../analytics/types/metrics';
  import { parse as parseDate, format as formatDateFns } from 'date-fns'; // Renamed to avoid conflict if any
  import type { ChartOptions, TitleOptions, TooltipItem } from 'chart.js'; // Refined imports
  import type { AnnotationPluginOptions, LineAnnotationOptions, LabelAnnotationOptions } from 'chartjs-plugin-annotation';

  // --- Component State ---
  // Bar Chart specific
  let barChartContainer: HTMLCanvasElement;
  let barChart: Chart<'bar'> | null = null; // More specific chart type
  let barChartDataView: 'percentage' | 'absolute' = 'percentage'; 
  $: showPercentageInBarChart = barChartDataView === 'percentage';

  // Time Series specific
  let timeSeriesChartContainer: HTMLCanvasElement;
  let timeSeriesChart: Chart<'line'> | null = null; // More specific chart type
  let localTsStartDate: string | null = null;
  let localTsEndDate: string | null = null;

  // Derived from assetStore - using enhanced summary directly
  let currentView: 'bar' | 'timeseries';
  let globalSelectedDate: string; // Main date from app slider
  let allDatesFromStore: string[] = [];
  let entriesByDateFromStore: Map<string, AssetEntry[]> = new Map();
  let enhancedSummary: EnhancedAssetSummary; // Use enhanced summary directly
  let tsPerformanceType: 'interval' | 'cumulative';
  let tsDateRangeFromStore: { start: string | null; end: string | null };
  let timeSeriesDataForChart: import('../stores/assetStore').PlatformPerformanceTimeSeries = {};
  let tsShowTotalFromStore: boolean = false; // ADDED for Show Total state

  // Check if we have enhanced analytics data
  $: hasEnhancedData = enhancedSummary?.portfolioMetrics && enhancedSummary?.cashFlowMetrics;
  $: hasContributionData = (enhancedSummary?.cashFlowMetrics?.contributionsByPeriod?.length ?? 0) > 0;

  // Calculate effective date range for display
  $: effectiveStartDate = localTsStartDate || (allDatesFromStore.length > 0 ? allDatesFromStore[allDatesFromStore.length - 1] : ''); // Oldest date
  $: effectiveEndDate = localTsEndDate || (allDatesFromStore.length > 0 ? allDatesFromStore[0] : ''); // Newest date
  $: isDateRangeFiltered = !!(localTsStartDate || localTsEndDate);

  // Show actual date range in inputs - when no custom dates, show the data range
  $: displayStartDate = localTsStartDate || (allDatesFromStore.length > 0 ? allDatesFromStore[allDatesFromStore.length - 1] : '');
  $: displayEndDate = localTsEndDate || (allDatesFromStore.length > 0 ? allDatesFromStore[0] : '');

  // Filter data for Summary view based on date range (same logic as time series)
  $: filteredSummaryData = (() => {
    if (!isDateRangeFiltered || !enhancedSummary) {
      return enhancedSummary;
    }

    // Apply date filtering to create a new summary based on filtered date range
    const filteredDatesChronological = [...allDatesFromStore].sort((a, b) => a.localeCompare(b));
    let startDate = localTsStartDate;
    let endDate = localTsEndDate;
    
    // Apply date filters
    const datesInRange = filteredDatesChronological.filter(date => {
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });

    if (datesInRange.length < 2) {
      // Not enough data points for comparison
      return {
        ...enhancedSummary,
        platforms: [],
        platformData: {}
      };
    }

    // Get entries for first and last dates in range
    const firstDate = datesInRange[0];
    const lastDate = datesInRange[datesInRange.length - 1];
    
    const firstEntries = entriesByDateFromStore.get(firstDate) || [];
    const lastEntries = entriesByDateFromStore.get(lastDate) || [];
    
    // Build filtered platform data
    const filteredPlatformData: { [platform: string]: any } = {};
    const filteredPlatforms: string[] = [];
    
    // Calculate changes for each platform
    lastEntries.forEach(currentEntry => {
      const platform = currentEntry.platform;
      const previousEntry = firstEntries.find(e => e.platform === platform);
      
      const currentAmount = currentEntry.amount;
      const previousAmount = previousEntry?.amount || 0;
      const absoluteChange = currentAmount - previousAmount;
      const percentChange = previousAmount > 0 ? (absoluteChange / previousAmount) * 100 : 0;
      
      filteredPlatformData[platform] = {
        amount: currentAmount,
        rate: currentEntry.rate,
        percentage: 0, // Will calculate after totals
        previousAmount,
        percentChange,
        absoluteChange,
        accountType: enhancedSummary.platformData[platform]?.accountType,
        contributions: enhancedSummary.platformData[platform]?.contributions,
        benchmark: enhancedSummary.platformData[platform]?.benchmark,
        performance: enhancedSummary.platformData[platform]?.performance
      };
      
      if (!filteredPlatforms.includes(platform)) {
        filteredPlatforms.push(platform);
      }
    });
    
    // Calculate totals and percentages
    const totalValue = Object.values(filteredPlatformData).reduce((sum: number, data: any) => sum + data.amount, 0);
    const totalPreviousValue = Object.values(filteredPlatformData).reduce((sum: number, data: any) => sum + data.previousAmount, 0);
    
    // Update percentages
    Object.keys(filteredPlatformData).forEach(platform => {
      filteredPlatformData[platform].percentage = totalValue > 0 ? (filteredPlatformData[platform].amount / totalValue) * 100 : 0;
    });
    
    const totalAbsoluteChange = totalValue - totalPreviousValue;
    const totalPercentChange = totalPreviousValue > 0 ? (totalAbsoluteChange / totalPreviousValue) * 100 : 0;
    
    // Find largest holding
    const largestHolding = filteredPlatforms.reduce((largest, platform) => {
      const amount = filteredPlatformData[platform].amount;
      return amount > largest.amount ? { platform, amount } : largest;
    }, { platform: '', amount: 0 });
    
    return {
      ...enhancedSummary,
      totalValue,
      totalPreviousValue,
      percentChange: totalPercentChange,
      absoluteChange: totalAbsoluteChange,
      platforms: filteredPlatforms,
      platformData: filteredPlatformData,
      largestHolding
    };
  })();

  // --- Store Subscriptions ---
  const unsubscribeAssetStore = assetStore.subscribe(value => {
    currentView = value.platformPerformanceView;
    globalSelectedDate = value.selectedDate;
    allDatesFromStore = value.allDates;
    entriesByDateFromStore = value.entriesByDate;
    enhancedSummary = value.summary; // Get enhanced summary from store
    tsPerformanceType = value.timeSeriesPerformanceType;
    tsDateRangeFromStore = value.timeSeriesDateRange;
    tsShowTotalFromStore = value.timeSeriesShowTotal;
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

  // --- Enhanced Bar Chart Data Preparation ---
  function getBarChartData() {
    const summaryData = filteredSummaryData || enhancedSummary;
    if (!summaryData || !summaryData.platforms || summaryData.platforms.length === 0) {
      return null;
    }

    const platforms = summaryData.platforms;
    const data = platforms.map(platform => {
      const pd = summaryData.platformData[platform];
      return pd ? (showPercentageInBarChart ? pd.percentChange : pd.absoluteChange) : 0;
    });
    
    // Sort by performance (best to worst)
    const combined = platforms.map((p, i) => ({ platform: p, value: data[i] })).sort((a,b) => b.value - a.value);
    const sortedPlatforms = combined.map(item => item.platform);
    const sortedData = combined.map(item => item.value);
    const colors = sortedPlatforms.map(p => getPlatformColor(p));
    
    return {
      platforms: sortedPlatforms,
      data: sortedData,
      colors,
      titleText: showPercentageInBarChart ? 'Change (%)' : 'Change ($)'
    };
  }

  // --- Chart Update Functions ---
  function updateBarChart() {
    const chartData = getBarChartData();
    if (!chartData || !barChartContainer) {
      if(barChart) { barChart.destroy(); barChart = null;} // Clear chart if no data
      return;
    }

    const { platforms, data, colors, titleText } = chartData;

    // Check if existing chart is still valid (canvas not destroyed)
    if (barChart && barChart.canvas && barChart.canvas.parentNode) {
      try {
        barChart.data.labels = platforms;
        barChart.data.datasets[0].data = data;
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
      } catch (error) {
        // Chart update failed, recreate
        barChart.destroy();
        barChart = null;
      }
    }
    
    // Create new chart if none exists or if update failed
    if (!barChart) {
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
                const summaryData = filteredSummaryData || enhancedSummary;
                const platformInfo = summaryData?.platformData[platform];
                if (!platformInfo) return '';
                
                // Enhanced tooltips with contribution data
                let tooltip = showPercentageInBarChart 
                  ? `Absolute: ${formatCurrency(platformInfo.absoluteChange)}` 
                  : `Percentage: ${formatPercentage(platformInfo.percentChange)}`;
                
                if (hasContributionData && platformInfo.contributions) {
                  tooltip += `\nContributions: ${formatCurrency(platformInfo.contributions)}`;
                }
                
                return tooltip;
              }
            }
          }
        }
      };
      barChart = new Chart(barChartContainer, { type: 'bar', data: { labels: platforms, datasets: [{ data: data, backgroundColor: colors }] }, options });
    }
  }

  function updateTimeSeriesChart() {
    if (!timeSeriesChartContainer) {
      return;
    }

    if (!timeSeriesDataForChart || Object.keys(timeSeriesDataForChart).length === 0) {
      if (timeSeriesChart) { timeSeriesChart.destroy(); timeSeriesChart = null; }
      return;
    }
    
    const datasets = Object.entries(timeSeriesDataForChart).map(([key, points]) => ({
      label: key, // Will be "Total Portfolio" or platform name
      data: points.map(p => ({ x: parseDate(p.date, 'yyyy-MM-dd', new Date()).getTime(), y: p.value })),
      // Use a distinct color for "Total Portfolio", otherwise platform color
      borderColor: key === "Total Portfolio" ? '#3A3D40' : getPlatformColor(key),
      backgroundColor: key === "Total Portfolio" ? 'rgba(58, 61, 64, 0.5)' : getPlatformColor(key, 0.5),
      fill: false, tension: 0.1,
    }));

    // The plugin expects a map of annotation objects, where each object explicitly includes its type.
    const annotationsMap: { [key: string]: any } = {}; 

    if (globalSelectedDate) {
        annotationsMap['selectedDateLine'] = {
            type: 'line', // Explicitly define type here
            scaleID: 'x',
            value: parseDate(globalSelectedDate, 'yyyy-MM-dd', new Date()).getTime(),
            borderColor: 'rgba(155, 155, 147, 0.7)',
            borderWidth: 2, 
            borderDash: [6, 6],
            label: {
              content: 'Slider Date', 
              display: true, 
              position: 'start', // Valid string literal as per documentation for line annotation labels
              font: { size: 10 }, 
              color: 'rgba(155, 155, 147, 0.7)',
              // No explicit cast to LabelAnnotationOptions, relying on structural typing for the label object
            }
        };
    }
    
    const annotationPluginOptions: AnnotationPluginOptions = { annotations: annotationsMap };

    const yAxisTitleText = tsPerformanceType === 'interval' ? 'Interval Performance (%)' : 'Cumulative Performance (%)';

    // Check if existing chart is still valid (canvas not destroyed)
    if (timeSeriesChart && timeSeriesChart.canvas && timeSeriesChart.canvas.parentNode) {
      try {
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
      } catch (error) {
        // Chart update failed, recreate
        timeSeriesChart.destroy();
        timeSeriesChart = null;
      }
    }
    
    // Create new chart if none exists or if update failed
    if (!timeSeriesChart) {
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

  function handleTsPerformanceTypeChange(type: 'interval' | 'cumulative') {
    assetStore.setTimeSeriesPerformanceType(type);
  }

  function handleTsShowTotalChange(event: Event) { // ADDED handler
    const target = event.target as HTMLInputElement;
    assetStore.setTimeSeriesShowTotal(target.checked);
  }

  function applyDateRange() {
    // Apply current display values as custom filters
    localTsStartDate = displayStartDate;
    localTsEndDate = displayEndDate;
    assetStore.setTimeSeriesDateRange({ start: displayStartDate, end: displayEndDate });
  }
  
  function clearDateRange() {
    localTsStartDate = null;
    localTsEndDate = null;
    assetStore.setTimeSeriesDateRange({ start: null, end: null });
  }

  // --- Reactive Updates for Chart Rendering ---
  // Simple reactive statement for view changes only
  $: if (currentView) {
    // Clean up opposite chart when switching views
    if (currentView === 'bar' && timeSeriesChart) {
      timeSeriesChart.destroy();
      timeSeriesChart = null;
    } else if (currentView === 'timeseries' && barChart) {
      barChart.destroy();
      barChart = null;
    }
  }

  // Update bar chart when container becomes available or data changes
  $: if (currentView === 'bar' && barChartContainer && filteredSummaryData) {
    updateBarChart();
  }

  // Update bar chart view when toggle changes
  $: if (currentView === 'bar' && barChartContainer && barChartDataView) {
    updateBarChart();
  }

  // Update time series chart when container becomes available or data changes  
  $: if (currentView === 'timeseries' && timeSeriesChartContainer && timeSeriesDataForChart) {
    updateTimeSeriesChart();
  }

  // Update time series chart when settings change
  $: if (currentView === 'timeseries' && timeSeriesChartContainer && timeSeriesDataForChart && (tsPerformanceType || tsShowTotalFromStore !== undefined)) {
    updateTimeSeriesChart();
  }

  // Sync local date inputs with store (without triggering chart updates)
  $: if (tsDateRangeFromStore) {
    if (tsDateRangeFromStore.start && localTsStartDate !== tsDateRangeFromStore.start) {
      localTsStartDate = tsDateRangeFromStore.start;
    } else if (!tsDateRangeFromStore.start && localTsStartDate) {
      localTsStartDate = null;
    }
    if (tsDateRangeFromStore.end && localTsEndDate !== tsDateRangeFromStore.end) {
      localTsEndDate = tsDateRangeFromStore.end;
    } else if (!tsDateRangeFromStore.end && localTsEndDate) {
      localTsEndDate = null;
    }
  }

  onMount(() => {
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      if (currentView === 'bar') {
        updateBarChart();
      } else if (currentView === 'timeseries') {
        updateTimeSeriesChart();
      }
    }, 50); // Small delay to ensure DOM is ready
  });

</script>

<div class="platform-performance card">
  <div class="performance-header">
    <h3>Platform Performance</h3>
    <div class="view-toggle-buttons">
      <button class="toggle-btn {currentView === 'bar' ? 'active' : ''}" 
              on:click={() => setView('bar')}>
        Summary
      </button>
      <button class="toggle-btn {currentView === 'timeseries' ? 'active' : ''}" 
              on:click={() => setView('timeseries')}>
        Time Series
      </button>
    </div>
  </div>

  <!-- Common controls that apply to both views -->
  <div class="common-controls">
    <div class="control-group date-range-controls">
      <span class="stat-label">Date Range:</span>
      <input 
        type="date" 
        bind:value={displayStartDate}
        title="Start Date"
      />
      <span class="stat-label">to</span>
      <input 
        type="date" 
        bind:value={displayEndDate}
        title="End Date"
      />
      <div class="date-range-actions">
        <button 
          class="action-btn apply-btn" 
          on:click={applyDateRange}
          title="Apply Date Range"
        >
          Apply
        </button>
        <button 
          class="action-btn clear-btn" 
          on:click={clearDateRange}
          title="Clear Date Range"
        >
          Clear
        </button>
      </div>
    </div>
  </div>

  {#if currentView === 'bar'}
    <div class="view-specific-controls">
      <div class="control-group">
        <span class="stat-label">View:</span>
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
      </div>
    </div>
    <div class="chart-container" style="{filteredSummaryData && filteredSummaryData.platforms && filteredSummaryData.platforms.length === 0 ? 'min-height: 100px;' : ''}">
      {#if !filteredSummaryData || !filteredSummaryData.platforms || filteredSummaryData.platforms.length === 0}
        <div class="no-data">No performance data for selected period</div>
      {:else}
        <canvas bind:this={barChartContainer}></canvas>
      {/if}
    </div>
  {:else if currentView === 'timeseries'}
    <div class="view-specific-controls">
      <div class="control-group">
        <span class="stat-label">Performance Type:</span>
        <div class="view-toggle">
          <button class="toggle-btn {tsPerformanceType === 'interval' ? 'active' : ''}" on:click={() => handleTsPerformanceTypeChange('interval')}>Interval</button>
          <button class="toggle-btn {tsPerformanceType === 'cumulative' ? 'active' : ''}" on:click={() => handleTsPerformanceTypeChange('cumulative')}>Cumulative</button>
        </div>
      </div>
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
      gap: var(--space-sm);
    }
    
    .view-toggle-buttons {
      width: 100%;
    }
    
    .view-toggle-buttons .toggle-btn {
      flex: 1;
      min-height: 44px;
    }
    
    .common-controls {
      padding: var(--space-sm);
    }
    
    .view-specific-controls {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-md);
      padding: var(--space-sm);
    }
    
    .control-group {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-xs);
    }
    
    .date-range-controls {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-sm);
    }
    
    .date-range-controls input[type="date"] {
      width: 100%;
      padding: var(--space-sm);
      font-size: 1rem;
      min-height: 44px;
    }
    
    .date-range-actions {
      margin-left: 0;
      justify-content: stretch;
    }
    
    .action-btn {
      flex: 1;
      padding: var(--space-sm);
      min-height: 44px;
      font-size: 1rem;
    }
    
    .view-toggle {
      width: 100%;
    }
    
    .toggle-btn {
      flex: 1;
      padding: var(--space-sm);
      min-height: 44px;
      font-size: 0.9rem;
    }
    
    .stat-label {
      font-weight: 500;
      margin-bottom: var(--space-xs);
    }
    
    .checkbox-label {
      padding: var(--space-sm);
      min-height: 44px;
      width: 100%;
      justify-content: flex-start;
    }
    
    .chart-container {
      height: 300px;
    }
  }

  .common-controls {
    background-color: rgba(95, 116, 100, 0.02);
    border: 1px solid rgba(95, 116, 100, 0.1);
    border-radius: var(--border-radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .view-specific-controls {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    background-color: rgba(0,0,0,0.01);
    border-radius: var(--border-radius-sm);
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
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

  .date-range-controls {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }
  
  .date-range-controls input[type="date"] {
    padding: var(--space-xs);
    border: 1px solid var(--color-stone-gray);
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
  }
  
  .date-range-actions {
    display: flex;
    gap: var(--space-xs);
    margin-left: var(--space-sm);
  }
  
  .action-btn {
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid var(--color-stone-gray);
    border-radius: var(--border-radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;
    min-width: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: white;
    color: var(--color-stone-gray);
  }

  .action-btn:hover {
    background-color: var(--color-forest-green);
    color: white;
    border-color: var(--color-forest-green);
    transform: none;
  }

  .action-btn.apply-btn {
    border-color: var(--color-forest-green);
    color: var(--color-forest-green);
  }

  .action-btn.clear-btn {
    border-color: var(--color-stone-gray);
    color: var(--color-stone-gray);
  }

  .action-btn.clear-btn:hover {
    background-color: var(--color-stone-gray);
    color: white;
    border-color: var(--color-stone-gray);
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--color-stone-gray);
    font-weight: 500;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    color: var(--color-stone-gray);
    cursor: pointer;
    font-weight: 500;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .date-range-controls input[type="date"]::-webkit-datetime-edit {
    color: var(--color-stone-gray);
  }

  .date-range-controls input[type="date"]:focus {
    outline: none;
    border-color: var(--color-forest-green);
    box-shadow: 0 0 0 2px rgba(95, 116, 100, 0.2);
  }
</style>