<script lang="ts">
  import { assetStore } from '../stores/assetStore';
  import { format, parse } from 'date-fns';
  
  export let dates: string[] = [];
  export let selectedDate: string = '';
  
  let sliderValue = 0;
  
  // Update slider value when selected date changes
  $: {
    if (selectedDate && dates.length > 0) {
      sliderValue = dates.indexOf(selectedDate);
    }
  }
  
  // Format date for display (Month Year)
  function formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    return format(date, 'MMMM yyyy');
  }
  
  // Handle slider changes
  function handleSliderChange() {
    if (dates.length > 0 && sliderValue >= 0 && sliderValue < dates.length) {
      assetStore.selectDate(dates[sliderValue]);
    }
  }
</script>

<div class="date-slider-container card">
  <div class="slider-header">
    <h3>Portfolio Timeline</h3>
    <div class="selected-date">
      {formatDateForDisplay(selectedDate)}
    </div>
  </div>
  
  {#if dates.length > 0}
    <div class="date-slider">
      <input 
        type="range" 
        min="0" 
        max={dates.length - 1} 
        step="1" 
        bind:value={sliderValue}
        on:input={handleSliderChange}
        on:change={handleSliderChange}
      />
      
      <div class="date-markers">
        <span class="marker start">{formatDateForDisplay(dates[dates.length - 1])}</span>
        <span class="marker end">{formatDateForDisplay(dates[0])}</span>
      </div>
    </div>
  {:else}
    <p class="no-data">No timeline data available. Import data or add asset entries.</p>
  {/if}
</div>

<style>
  .date-slider-container {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  
  .slider-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--color-deep-brown);
  }
  
  .selected-date {
    font-weight: 600;
    color: var(--color-green);
    font-size: 1.1rem;
  }
  
  .date-slider {
    margin: var(--space-md) 0;
  }
  
  .date-markers {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-xs);
    font-size: 0.8rem;
    color: var(--color-stone-gray);
  }
  
  .no-data {
    text-align: center;
    padding: var(--space-md);
    color: var(--color-stone-gray);
    font-style: italic;
  }
</style>