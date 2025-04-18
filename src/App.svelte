<script lang="ts">
  import { onMount } from 'svelte';
  import { assetStore } from './lib/stores/assetStore';
  
  // Components
  import Header from './lib/components/Header.svelte';
  import DateSlider from './lib/components/DateSlider.svelte';
  import KeyMetrics from './lib/components/KeyMetrics.svelte';
  import AllocationTable from './lib/components/AllocationTable.svelte';
  import AllocationChart from './lib/components/AllocationChart.svelte';
  import PortfolioEvolutionChart from './lib/components/PortfolioEvolutionChart.svelte';
  import PlatformPerformance from './lib/components/PlatformPerformance.svelte';
  import ImportExport from './lib/components/ImportExport.svelte';
  
  // App state
  let activeTab = 'overview';
  
  // Load data on mount
  onMount(() => {
    assetStore.loadAssets();
  });
</script>

<Header />

<main>
  <div class="container">
    {#if $assetStore.loading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading your data...</p>
      </div>
    {:else}
      <DateSlider 
        dates={$assetStore.allDates} 
        selectedDate={$assetStore.selectedDate} 
      />
      
      <div class="tabs">
        <button 
          class="tab-btn {activeTab === 'overview' ? 'active' : ''}" 
          on:click={() => activeTab = 'overview'}
        >
          Overview
        </button>
        <button 
          class="tab-btn {activeTab === 'performance' ? 'active' : ''}" 
          on:click={() => activeTab = 'performance'}
        >
          Performance Analysis
        </button>
        <button 
          class="tab-btn {activeTab === 'data' ? 'active' : ''}" 
          on:click={() => activeTab = 'data'}
        >
          Data Management
        </button>
      </div>
      
      <div class="tab-content">
        {#if activeTab === 'overview'}
          <div class="overview-tab">
            <KeyMetrics 
              summary={$assetStore.summary} 
              comparisonPeriod={$assetStore.comparisonPeriod} 
            />
            
            <div class="columns">
              <div class="column">
                <AllocationTable 
                  entries={$assetStore.currentEntries} 
                  date={$assetStore.selectedDate} 
                />
              </div>
              <div class="column">
                <AllocationChart entries={$assetStore.currentEntries} />
              </div>
            </div>
            
            <PortfolioEvolutionChart 
              assets={$assetStore.assets} 
              selectedDate={$assetStore.selectedDate} 
            />
          </div>
        {:else if activeTab === 'performance'}
          <div class="performance-tab">
            <div class="period-selector">
              <span>Comparison Period:</span>
              <div class="button-group">
                <button 
                  class="period-btn {$assetStore.comparisonPeriod === 'MoM' ? 'active' : ''}" 
                  on:click={() => assetStore.setComparisonPeriod('MoM')}
                >
                  Month-over-Month
                </button>
                <button 
                  class="period-btn {$assetStore.comparisonPeriod === 'YTD' ? 'active' : ''}" 
                  on:click={() => assetStore.setComparisonPeriod('YTD')}
                >
                  Year-to-Date
                </button>
                <button 
                  class="period-btn {$assetStore.comparisonPeriod === 'YoY' ? 'active' : ''}" 
                  on:click={() => assetStore.setComparisonPeriod('YoY')}
                >
                  Year-over-Year
                </button>
              </div>
            </div>
            
            <PlatformPerformance 
              summary={$assetStore.summary} 
              dataView={$assetStore.dataView} 
            />
          </div>
        {:else if activeTab === 'data'}
          <div class="data-tab">
            <ImportExport />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</main>

<footer>
  <div class="container">
    <p>Homestead - Your personal asset landscape</p>
    <p class="privacy">All data is stored locally in your browser. Your privacy is preserved.</p>
  </div>
</footer>

<style>
  main {
    flex: 1;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
  }
  
  .tabs {
    display: flex;
    gap: 2px;
    margin-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-stone-gray);
  }
  
  .tab-btn {
    padding: var(--space-sm) var(--space-md);
    background-color: transparent;
    border: none;
    color: var(--color-slate);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    border-radius: 0;
  }
  
  .tab-btn:hover {
    background-color: transparent;
    color: var(--color-deep-brown);
    border-bottom-color: var(--color-sandstone);
  }
  
  .tab-btn.active {
    color: var(--color-deep-brown);
    border-bottom-color: var(--color-deep-brown);
  }
  
  .tab-content {
    margin-top: var(--space-md);
  }
  
  .columns {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .period-selector {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-md);
    background-color: white;
    padding: var(--space-md);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-sm);
  }
  
  .period-selector span {
    margin-right: var(--space-md);
    font-weight: 500;
  }
  
  .button-group {
    display: flex;
    gap: 2px;
  }
  
  .period-btn {
    padding: var(--space-xs) var(--space-sm);
    background-color: transparent;
    border: 1px solid var(--color-stone-gray);
    color: var(--color-slate);
    font-size: 0.9rem;
  }
  
  .period-btn:first-child {
    border-radius: var(--border-radius-sm) 0 0 var(--border-radius-sm);
  }
  
  .period-btn:last-child {
    border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
  }
  
  .period-btn.active {
    background-color: var(--color-deep-brown);
    color: white;
    border-color: var(--color-deep-brown);
  }
  
  footer {
    background-color: white;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    padding: var(--space-md) 0;
    margin-top: var(--space-xl);
    font-size: 0.9rem;
    color: var(--color-stone-gray);
  }
  
  footer .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  footer p {
    margin: 0;
  }
  
  .privacy {
    font-style: italic;
  }
  
  @media (max-width: 768px) {
    .columns {
      grid-template-columns: 1fr;
    }
    
    .period-selector {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .period-selector span {
      margin-bottom: var(--space-sm);
    }
    
    .button-group {
      width: 100%;
    }
    
    .period-btn {
      flex: 1;
      text-align: center;
    }
    
    footer .container {
      flex-direction: column;
      gap: var(--space-sm);
      text-align: center;
    }
  }
</style>