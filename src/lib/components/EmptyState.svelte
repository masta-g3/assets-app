<script lang="ts">
  export let title: string = "No data yet";
  export let description: string = "Get started by adding your first asset entry.";
  export let icon: string = "📊";
  export let showQuickStart: boolean = true;
  export let showImportOption: boolean = true;
  export let onAddEntry: (() => void) | null = null;
  export let onImport: (() => void) | null = null;
  export let onGetStarted: (() => void) | null = null;
  
  // Quick tips for getting started
  const quickTips = [
    "💡 Start with one platform (like your 401k or savings account)",
    "📅 Add entries monthly for best tracking",
    "💰 Include contributions to see investment vs contribution growth",
    "📈 View analytics once you have 2+ months of data"
  ];
  
  function handleAddEntry() {
    if (onAddEntry) {
      onAddEntry();
    }
  }
  
  function handleImport() {
    if (onImport) {
      onImport();
    }
  }
  
  function handleGetStarted() {
    if (onGetStarted) {
      onGetStarted();
    }
  }
</script>

<div class="empty-state">
  <div class="empty-state-content">
    <div class="empty-icon">{icon}</div>
    <h3 class="empty-title">{title}</h3>
    <p class="empty-description">{description}</p>
    
    {#if showQuickStart}
      <div class="quick-start">
        <h4>Quick Start Tips</h4>
        <ul class="tips-list">
          {#each quickTips as tip}
            <li>{tip}</li>
          {/each}
        </ul>
      </div>
    {/if}
    
    <div class="empty-actions">
      {#if onAddEntry}
        <button class="primary-action" on:click={handleAddEntry}>
          <span class="action-icon">➕</span>
          Add Your First Asset
        </button>
      {/if}
      
      {#if showImportOption && onImport}
        <button class="secondary-action" on:click={handleImport}>
          <span class="action-icon">📄</span>
          Import from CSV
        </button>
      {/if}
      
      {#if onGetStarted}
        <button class="tertiary-action" on:click={handleGetStarted}>
          <span class="action-icon">🎯</span>
          Show Me How
        </button>
      {/if}
    </div>
    
    <div class="privacy-note">
      <small>
        <strong>Privacy first:</strong> All your data stays in your browser. 
        Nothing is sent to any server.
      </small>
    </div>
  </div>
</div>

<style>
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    padding: var(--space-xl);
    text-align: center;
  }
  
  .empty-state-content {
    max-width: 500px;
    width: 100%;
  }
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: var(--space-lg);
    opacity: 0.8;
  }
  
  .empty-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-deep-brown);
    margin: 0 0 var(--space-sm) 0;
  }
  
  .empty-description {
    font-size: 1.1rem;
    color: var(--color-slate);
    margin: 0 0 var(--space-lg) 0;
    line-height: 1.5;
  }
  
  .quick-start {
    background: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    text-align: left;
  }
  
  .quick-start h4 {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-deep-brown);
    font-size: 1.1rem;
  }
  
  .tips-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .tips-list li {
    color: var(--color-slate);
    font-size: 0.95rem;
    line-height: 1.4;
  }
  
  .empty-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }
  
  .primary-action, .secondary-action, .tertiary-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    font-size: 1rem;
  }
  
  .primary-action {
    background: var(--color-forest-green);
    color: white;
  }
  
  .primary-action:hover {
    background: var(--color-forest-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(95, 116, 100, 0.3);
  }
  
  .secondary-action {
    background: white;
    border: 2px solid var(--color-forest-green);
    color: var(--color-forest-green);
  }
  
  .secondary-action:hover {
    background: var(--color-forest-green);
    color: white;
    transform: translateY(-1px);
  }
  
  .tertiary-action {
    background: transparent;
    border: 1px solid var(--color-stone-gray);
    color: var(--color-slate);
  }
  
  .tertiary-action:hover {
    background: rgba(95, 116, 100, 0.05);
    border-color: var(--color-forest-green);
    color: var(--color-deep-brown);
  }
  
  .action-icon {
    font-size: 1.2rem;
  }
  
  .privacy-note {
    padding: var(--space-md);
    background: rgba(95, 116, 100, 0.03);
    border-radius: var(--border-radius-sm);
    border-left: 3px solid var(--color-moss);
  }
  
  .privacy-note small {
    color: var(--color-slate);
    line-height: 1.4;
  }
  
  @media (max-width: 768px) {
    .empty-state {
      min-height: 250px;
      padding: var(--space-lg);
    }
    
    .empty-icon {
      font-size: 3rem;
    }
    
    .empty-title {
      font-size: 1.3rem;
    }
    
    .empty-actions {
      gap: var(--space-sm);
    }
    
    .primary-action, .secondary-action, .tertiary-action {
      padding: var(--space-sm) var(--space-md);
      font-size: 0.95rem;
    }
  }
</style> 