<script lang="ts">
  import { importCSV, exportCSV, downloadCSV } from '../utils/csv';
  import { assetStore } from '../stores/assetStore';
  import PlatformTagEditor from './PlatformTagEditor.svelte';
  import CSVFormatModal from './CSVFormatModal.svelte';
  
  let fileInput: HTMLInputElement;
  let importing = false;
  let exporting = false;
  let message = { text: '', type: 'info' };
  let importResult: any = null; // Store detailed import results
  let tagEditorModal: PlatformTagEditor;
  let showFormatModal = false;
  
  // Handle CSV file selection
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    importing = true;
    message = { text: '', type: 'info' };
    importResult = null;
    
    try {
      const result = await importCSV(file);
      importResult = result;
      
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
  
  // Open CSV format modal
  function openFormatModal() {
    showFormatModal = true;
  }
</script>

<PlatformTagEditor bind:this={tagEditorModal} />
<CSVFormatModal bind:isOpen={showFormatModal} />

<div class="import-export card">
  <h3>Import/Export Data</h3>
  
  <div class="actions">
    <div class="action-group import-group">
      <h4>Import from CSV</h4>
      <p class="description">
        Upload a CSV file with your asset data. Your file should include Date, Platform, Amount, and Rate columns.
      </p>
      
      <div class="format-help-toggle">
        <button class="help-btn" on:click={openFormatModal}>
          📖 View CSV Format Guide
        </button>
      </div>
      
      <input 
        type="file" 
        accept=".csv" 
        on:change={handleFileSelect} 
        bind:this={fileInput}
        style="display: none"
      />
      <button on:click={openFileSelector} disabled={importing} class="import-btn">
        {#if importing}
          <span class="spinner-small"></span> Importing...
        {:else}
          📄 Choose CSV File
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
  
  {#if importResult}
    <div class="import-results">
      <h4>Import Details</h4>
      
      {#if importResult.summary}
        <div class="import-summary">
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">Total Rows:</span>
              <span class="stat-value">{importResult.summary.totalRows}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Valid Rows:</span>
              <span class="stat-value success">{importResult.summary.validRows}</span>
            </div>
            {#if importResult.summary.invalidRows > 0}
              <div class="stat">
                <span class="stat-label">Invalid Rows:</span>
                <span class="stat-value error">{importResult.summary.invalidRows}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      {#if importResult.warnings && importResult.warnings.length > 0}
        <div class="warnings-section">
          <h5>⚠️ Warnings ({importResult.warnings.length})</h5>
          <div class="error-list">
            {#each importResult.warnings.slice(0, 5) as warning}
              <div class="error-item warning">{warning}</div>
            {/each}
            {#if importResult.warnings.length > 5}
              <div class="error-item">... and {importResult.warnings.length - 5} more warnings</div>
            {/if}
          </div>
        </div>
      {/if}
      
      {#if importResult.errors && importResult.errors.length > 0}
        <div class="errors-section">
          <h5>❌ Errors ({importResult.errors.length})</h5>
          <div class="error-list">
            {#each importResult.errors.slice(0, 10) as error}
              <div class="error-item error">{error}</div>
            {/each}
            {#if importResult.errors.length > 10}
              <div class="error-item">... and {importResult.errors.length - 10} more errors</div>
            {/if}
          </div>
        </div>
      {/if}
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
  
  .format-help-toggle {
    margin-bottom: var(--space-md);
  }
  
  .help-btn {
    background: transparent;
    border: 1px solid var(--color-forest-green);
    color: var(--color-forest-green);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .help-btn:hover {
    background: var(--color-forest-green);
    color: white;
  }
  
  .import-btn {
    background: var(--color-forest-green);
    color: white;
    border: none;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .import-btn:hover:not(:disabled) {
    background: var(--color-forest-dark);
    transform: translateY(-1px);
  }
  
  .import-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .import-results {
    margin-top: var(--space-md);
    padding: var(--space-md);
    background: rgba(95, 116, 100, 0.02);
    border: 1px solid rgba(95, 116, 100, 0.15);
    border-radius: var(--border-radius-sm);
  }
  
  .import-results h4 {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-deep-brown);
    font-size: 1.1rem;
  }
  
  .import-summary {
    margin-bottom: var(--space-md);
  }
  
  .summary-stats {
    display: flex;
    gap: var(--space-lg);
    flex-wrap: wrap;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .stat-label {
    font-size: 0.85rem;
    color: var(--color-stone-gray);
    font-weight: 500;
  }
  
  .stat-value {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-deep-brown);
  }
  
  .stat-value.success {
    color: var(--color-positive);
  }
  
  .stat-value.error {
    color: var(--color-negative);
  }
  
  .warnings-section, .errors-section {
    margin-bottom: var(--space-md);
  }
  
  .warnings-section h5, .errors-section h5 {
    margin: 0 0 var(--space-sm) 0;
    font-size: 0.95rem;
    color: var(--color-deep-brown);
  }
  
  .error-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--border-radius-sm);
    background: white;
  }
  
  .error-item {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  .error-item:last-child {
    border-bottom: none;
  }
  
  .error-item.warning {
    background: rgba(255, 193, 7, 0.05);
    color: #e65100;
  }
  
  .error-item.error {
    background: rgba(244, 67, 54, 0.05);
    color: var(--color-negative);
  }
  
  @media (max-width: 768px) {
    .actions {
      grid-template-columns: 1fr;
    }
    
    .summary-stats {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .error-list {
      max-height: 150px;
    }
  }
</style>