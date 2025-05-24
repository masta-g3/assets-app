<script lang="ts">
  import { onMount } from 'svelte';
  import { assetStore } from './lib/stores/assetStore';
  
  // Components
  import Header from './lib/components/Header.svelte';
  import DateSlider from './lib/components/DateSlider.svelte';
  import KeyMetrics from './lib/components/EnhancedKeyMetrics.svelte';
  import AllocationTable from './lib/components/AllocationTable.svelte';
  import AllocationChart from './lib/components/AllocationChart.svelte';
  import PortfolioEvolutionChart from './lib/components/PortfolioEvolutionChart.svelte';
  import PlatformPerformance from './lib/components/PlatformPerformance.svelte';
  import ImportExport from './lib/components/ImportExport.svelte';
  import DataQualityIndicator from './lib/components/DataQualityIndicator.svelte';
  import WelcomeOnboarding from './lib/components/WelcomeOnboarding.svelte';
  import EmptyState from './lib/components/EmptyState.svelte';
  import RiskAnalysisDashboard from './lib/components/analytics/RiskAnalysisDashboard.svelte';
  
  // App state
  let activeTab = 'overview';
  let showOnboarding = false;
  let isFirstTimeUser = false;
  
  // Check if user is new (no data and hasn't seen onboarding)
  $: {
    if (!$assetStore.loading && $assetStore.assets.length === 0) {
      const hasSeenOnboarding = localStorage.getItem('homestead-onboarding-complete');
      if (!hasSeenOnboarding) {
        isFirstTimeUser = true;
        showOnboarding = true;
      }
    }
  }
  
  // Load data on mount
  onMount(() => {
    assetStore.loadAssets();
  });
  
  function handleOnboardingComplete() {
    localStorage.setItem('homestead-onboarding-complete', 'true');
    showOnboarding = false;
    isFirstTimeUser = false;
  }
  
  function startOnboarding() {
    showOnboarding = true;
  }
  
  function handleAddFirstAsset() {
    // Trigger the add form in AllocationTable
    activeTab = 'overview';
    // We'll need to communicate with AllocationTable to show the add form
    // For now, just switch to overview tab where they can add an asset
  }
  
  function handleImportData() {
    activeTab = 'data';
  }
  
  // Check if we have any data to show
  $: hasData = $assetStore.assets.length > 0;
  $: hasCurrentData = $assetStore.currentEntries.length > 0;
</script>

{#if showOnboarding}
  <WelcomeOnboarding onComplete={handleOnboardingComplete} />
{/if}

<Header />

<main>
  <div class="container">
    {#if $assetStore.loading}
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading your data...</p>
      </div>
    {:else if !hasData}
      <EmptyState 
        title="Welcome to Homestead"
        description="Start tracking your investment portfolio across multiple platforms. See how your money grows with detailed analytics and insights."
        icon="🏡"
        onAddEntry={handleAddFirstAsset}
        onImport={handleImportData}
        onGetStarted={startOnboarding}
      />
    {:else}
      <DateSlider 
        dates={$assetStore.allDates} 
        selectedDate={$assetStore.selectedDate} 
      />
      
      <div class="tabs" role="tablist" aria-label="Main navigation">
        <button 
          class="tab-btn {activeTab === 'overview' ? 'active' : ''}" 
          role="tab"
          aria-selected={activeTab === 'overview'}
          aria-controls="overview-panel"
          tabindex={activeTab === 'overview' ? 0 : -1}
          on:click={() => activeTab = 'overview'}
          on:keydown={(e) => {
            if (e.key === 'ArrowRight') {
              activeTab = 'performance';
              e.preventDefault();
            }
          }}
        >
          Overview
        </button>
        <button 
          class="tab-btn {activeTab === 'performance' ? 'active' : ''}" 
          role="tab"
          aria-selected={activeTab === 'performance'}
          aria-controls="performance-panel"
          tabindex={activeTab === 'performance' ? 0 : -1}
          on:click={() => activeTab = 'performance'}
          on:keydown={(e) => {
            if (e.key === 'ArrowLeft') {
              activeTab = 'overview';
              e.preventDefault();
            } else if (e.key === 'ArrowRight') {
              activeTab = 'risk';
              e.preventDefault();
            }
          }}
        >
          Performance Analysis
        </button>
        <button 
          class="tab-btn {activeTab === 'risk' ? 'active' : ''}" 
          role="tab"
          aria-selected={activeTab === 'risk'}
          aria-controls="risk-panel"
          tabindex={activeTab === 'risk' ? 0 : -1}
          on:click={() => activeTab = 'risk'}
          on:keydown={(e) => {
            if (e.key === 'ArrowLeft') {
              activeTab = 'performance';
              e.preventDefault();
            } else if (e.key === 'ArrowRight') {
              activeTab = 'data';
              e.preventDefault();
            }
          }}
        >
          Risk Analysis
        </button>
        <button 
          class="tab-btn {activeTab === 'data' ? 'active' : ''}" 
          role="tab"
          aria-selected={activeTab === 'data'}
          aria-controls="data-panel"
          tabindex={activeTab === 'data' ? 0 : -1}
          on:click={() => activeTab = 'data'}
          on:keydown={(e) => {
            if (e.key === 'ArrowLeft') {
              activeTab = 'risk';
              e.preventDefault();
            }
          }}
        >
          Data Management
        </button>
      </div>
      
      <div class="tab-content">
        {#if activeTab === 'overview'}
          <div class="overview-tab" role="tabpanel" id="overview-panel" aria-labelledby="overview-tab">
            <KeyMetrics 
              summary={$assetStore.summary} 
              comparisonPeriod={$assetStore.comparisonPeriod} 
            />
            
            {#if hasCurrentData}
              <div class="columns">
                <div class="column">
                  <AllocationTable 
                    entries={$assetStore.currentEntries} 
                    date={$assetStore.selectedDate} 
                  />
                </div>
                <div class="column">
                  <AllocationChart />
                </div>
              </div>
              
              <PortfolioEvolutionChart 
                assets={$assetStore.assets} 
                selectedDate={$assetStore.selectedDate} 
              />
            {:else}
              <EmptyState 
                title="No data for this date"
                description="There are no asset entries for {$assetStore.selectedDate}. You can add entries for this date or select a different date."
                icon="📅"
                showQuickStart={false}
                showImportOption={false}
                onAddEntry={handleAddFirstAsset}
              />
            {/if}
          </div>
        {:else if activeTab === 'performance'}
          <div class="performance-tab" role="tabpanel" id="performance-panel" aria-labelledby="performance-tab">
            {#if hasData && $assetStore.allDates.length >= 2}
              <PlatformPerformance />
            {:else}
              <EmptyState 
                title="Not enough data for analysis"
                description="You need at least 2 months of data to see performance analytics. Add more entries to unlock detailed performance insights."
                icon="📈"
                showQuickStart={false}
                showImportOption={false}
                onAddEntry={handleAddFirstAsset}
              />
            {/if}
          </div>
        {:else if activeTab === 'risk'}
          <div class="risk-tab" role="tabpanel" id="risk-panel" aria-labelledby="risk-tab">
            <RiskAnalysisDashboard assets={$assetStore.assets} />
          </div>
        {:else if activeTab === 'data'}
          <div class="data-tab" role="tabpanel" id="data-panel" aria-labelledby="data-tab">
            <DataQualityIndicator entries={$assetStore.assets} />
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
    font-weight: 400;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    position: relative;
    box-shadow: none;
    margin: 0 var(--space-xs);
    letter-spacing: 0.03em;
    transition: all 0.3s ease;
  }
  
  .tab-btn::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--color-moss), var(--color-deep-brown));
    transition: width 0.3s ease;
  }
  
  .tab-btn:hover {
    background-color: transparent;
    color: var(--color-deep-brown);
    transform: none;
  }
  
  .tab-btn:hover::after {
    width: 80%;
  }
  
  .tab-btn.active {
    color: var(--color-deep-brown);
    font-weight: 500;
  }
  
  .tab-btn.active::after {
    width: 100%;
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
  
  footer {
    background-color: rgba(255, 255, 255, 0.7);
    border-top: 1px solid rgba(0, 0, 0, 0.03);
    padding: var(--space-lg) 0;
    margin-top: var(--space-xl);
    font-size: 0.9rem;
    color: var(--color-stone-gray);
    position: relative;
    overflow: hidden;
  }
  
  footer::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, 
      transparent 0%,
      var(--color-moss) 20%,
      var(--color-sandstone) 40%, 
      var(--color-sky-blue) 60%,
      var(--color-dusty-rose) 80%,
      transparent 100%);
    opacity: 0.3;
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
    
    footer .container {
      flex-direction: column;
      gap: var(--space-sm);
      text-align: center;
    }
  }
  
  /* Add dark mode overrides for elements styled within App.svelte */
  /* MOVED TO app.css */
</style>