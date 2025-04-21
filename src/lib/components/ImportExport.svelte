<script lang="ts">
  import { importCSV, exportCSV, downloadCSV } from '../utils/csv';
  import { assetStore } from '../stores/assetStore';
  import PlatformTagEditor from './PlatformTagEditor.svelte';
  
  let fileInput: HTMLInputElement;
  let importing = false;
  let exporting = false;
  let message = { text: '', type: 'info' };
  let tagEditorModal: PlatformTagEditor;
  
  // Handle CSV file selection
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    importing = true;
    message = { text: '', type: 'info' };
    
    try {
      const result = await importCSV(file);
      
      if (result.success) {
        message = {
          text: result.message,
          type: 'success'
        };
        
        // Reload data in store
        await assetStore.loadAssets();
      } else {
        message = {
          text: result.message,
          type: 'error'
        };
        
        if (result.errors && result.errors.length > 0) {
          // Display first few errors
          const errorsToShow = result.errors.slice(0, 3);
          message.text += ' Errors: ' + errorsToShow.join(', ');
          
          if (result.errors.length > 3) {
            message.text += ` and ${result.errors.length - 3} more.`;
          }
        }
      }
    } catch (error) {
      message = {
        text: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    } finally {
      importing = false;
      // Reset file input
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }
  
  // Handle export
  async function handleExport() {
    exporting = true;
    message = { text: '', type: 'info' };
    
    try {
      const result = await exportCSV();
      
      if (result.success && result.csvString && result.filename) {
        downloadCSV(result.csvString, result.filename);
        message = {
          text: `Data exported successfully as ${result.filename}`,
          type: 'success'
        };
      } else {
        message = {
          text: result.message || 'Export failed.',
          type: 'error'
        };
      }
    } catch (error) {
      message = {
        text: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      };
    } finally {
      exporting = false;
    }
  }
  
  // Clear all data
  async function handleClearData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      message = { text: '', type: 'info' };
      
      try {
        await assetStore.clearAllData();
        message = {
          text: 'All data has been cleared successfully.',
          type: 'success'
        };
      } catch (error) {
        message = {
          text: `Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error'
        };
      }
    }
  }
  
  // Trigger file input click
  function openFileSelector() {
    if (fileInput) {
      fileInput.click();
    }
  }
  
  function openTagEditor() {
    tagEditorModal?.open();
  }
</script>

<PlatformTagEditor bind:this={tagEditorModal} />

<div class="import-export card">
  <h3>Import/Export Data</h3>
  
  <div class="actions">
    <div class="action-group">
      <h4>Import from CSV</h4>
      <p class="description">
        Upload a CSV file with your asset data. The file must have the headers:
        Date, Platform, Amount, Rate.
      </p>
      <input 
        type="file" 
        accept=".csv" 
        on:change={handleFileSelect} 
        bind:this={fileInput}
        style="display: none"
      />
      <button on:click={openFileSelector} disabled={importing}>
        {#if importing}
          <span class="spinner-small"></span> Importing...
        {:else}
          Import CSV
        {/if}
      </button>
    </div>
    
    <div class="action-group">
      <h4>Export to CSV</h4>
      <p class="description">
        Download all your asset data as a CSV file for backup or use in spreadsheet software.
      </p>
      <button on:click={handleExport} disabled={exporting}>
        {#if exporting}
          <span class="spinner-small"></span> Exporting...
        {:else}
          Export CSV
        {/if}
      </button>
    </div>
    
    <div class="action-group">
      <h4>Edit Platform Tags</h4>
      <p class="description">
        Assign custom tags to platforms for alternative grouping in charts.
      </p>
      <button on:click={openTagEditor}>
        Edit Tags
      </button>
    </div>
    
    <div class="action-group danger">
      <h4>Clear All Data</h4>
      <p class="description">
        Remove all asset data from your browser storage. This action cannot be undone.
      </p>
      <button class="danger" on:click={handleClearData}>
        Clear All Data
      </button>
    </div>
  </div>
  
  {#if message.text}
    <div class="message {message.type}">
      {message.text}
    </div>
  {/if}
  
  <div class="privacy-note">
    <p>
      <strong>Privacy Note:</strong> All data is stored only in your browser's local storage. 
      Nothing is sent to any server. You can export your data for backup at any time.
    </p>
  </div>
</div>

<style>
  .import-export {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-md);
    margin-top: var(--space-md);
  }
  
  .action-group {
    padding: var(--space-md);
    background-color: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-sm);
  }
  
  .action-group.danger {
    background-color: rgba(244, 67, 54, 0.05);
  }
  
  .action-group h4 {
    margin: 0 0 var(--space-sm) 0;
    font-size: 1.1rem;
  }
  
  .description {
    margin-bottom: var(--space-md);
    font-size: 0.9rem;
    color: var(--color-slate);
  }
  
  button.danger {
    background-color: var(--color-negative);
    border-color: var(--color-negative);
  }
  
  button.danger:hover {
    background-color: transparent;
    color: var(--color-negative);
  }
  
  .message {
    margin-top: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
  }
  
  .message.success {
    background-color: rgba(76, 175, 80, 0.1);
    color: var(--color-positive);
    border-left: 3px solid var(--color-positive);
  }
  
  .message.error {
    background-color: rgba(244, 67, 54, 0.1);
    color: var(--color-negative);
    border-left: 3px solid var(--color-negative);
  }
  
  .message.info {
    background-color: rgba(33, 150, 243, 0.1);
    color: #2196F3;
    border-left: 3px solid #2196F3;
  }
  
  .privacy-note {
    margin-top: var(--space-lg);
    padding: var(--space-md);
    background-color: rgba(96, 125, 139, 0.05);
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
  }
  
  .spinner-small {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: var(--space-xs);
  }
  
  @media (max-width: 768px) {
    .actions {
      grid-template-columns: 1fr;
    }
  }
</style>