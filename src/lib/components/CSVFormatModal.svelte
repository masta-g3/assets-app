<script lang="ts">
  export let isOpen = false;
  
  function closeModal() {
    isOpen = false;
  }
  
  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
  
  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
</script>

<svelte:window on:keydown={handleEscape} />

{#if isOpen}
  <div class="modal-overlay" on:click={handleOverlayClick} on:keydown={handleEscape} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-container">
      <div class="modal-header">
        <h2>CSV Format Guide</h2>
        <p class="subtitle">Import your portfolio data with the correct format</p>
        <button class="close-btn" on:click={closeModal} aria-label="Close">
          ✕
        </button>
      </div>
      
      <div class="modal-content">
        <div class="format-section">
          <h3>Required CSV Format</h3>
          <p>Your CSV file should have these exact column headers:</p>
          <div class="csv-headers">
            <span class="header">Date</span>
            <span class="header">Platform</span>
            <span class="header">Amount</span>
            <span class="header">Rate</span>
          </div>
          
          <h3>Example CSV Content</h3>
          <div class="csv-example">
            <pre>Date,Platform,Amount,Rate
2024-01-01,Wealthfront,15000,7.5
2024-01-01,401k,45000,6.8
2024-02-01,Wealthfront,15500,7.5
2024-02-01,401k,46000,6.8</pre>
          </div>
          
          <div class="format-notes">
            <h3>Format Notes</h3>
            <ul>
              <li><strong>Date:</strong> Use YYYY-MM-DD format (e.g., 2024-01-01)</li>
              <li><strong>Platform:</strong> Any text (e.g., "Wealthfront", "401k", "Savings")</li>
              <li><strong>Amount:</strong> Account balance as a number (e.g., 15000.50)</li>
              <li><strong>Rate:</strong> Expected annual return as percentage (e.g., 7.5 for 7.5%)</li>
            </ul>
          </div>
          
          <div class="csv-tips">
            <h3>💡 Pro Tips</h3>
            <ul>
              <li>Export your existing data first to see the exact format</li>
              <li>Use spreadsheet software like Excel or Google Sheets to create your CSV</li>
              <li>Make sure dates are consistent (same day each month)</li>
              <li>Remove any formatting like currency symbols or commas from numbers</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="close-footer-btn" on:click={closeModal}>
          Got it!
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: var(--space-md);
  }
  
  .modal-container {
    background: white;
    border-radius: var(--border-radius-lg);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    position: relative;
  }
  
  .modal-header {
    padding: var(--space-lg);
    text-align: center;
    border-bottom: 1px solid var(--color-stone-gray);
    position: relative;
  }
  
  .modal-header h2 {
    margin: 0 0 var(--space-xs) 0;
    color: var(--color-deep-brown);
  }
  
  .subtitle {
    margin: 0;
    color: var(--color-slate);
    font-size: 1.1rem;
  }
  
  .close-btn {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-slate);
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .close-btn:hover {
    background: rgba(0, 0, 0, 0.1);
    color: var(--color-deep-brown);
  }
  
  .modal-content {
    padding: var(--space-lg);
  }
  
  .format-section {
    text-align: left;
  }
  
  .format-section h3 {
    margin: var(--space-lg) 0 var(--space-sm) 0;
    color: var(--color-deep-brown);
    font-size: 1.1rem;
  }
  
  .format-section h3:first-child {
    margin-top: 0;
  }
  
  .format-section p {
    margin-bottom: var(--space-sm);
    color: var(--color-slate);
  }
  
  .csv-headers {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
    flex-wrap: wrap;
  }
  
  .header {
    background: var(--color-forest-green);
    color: white;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .csv-example {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: var(--border-radius-sm);
    padding: var(--space-sm);
    margin-bottom: var(--space-md);
    overflow-x: auto;
  }
  
  .csv-example pre {
    margin: 0;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.8rem;
    line-height: 1.4;
    color: #333;
  }
  
  .format-notes ul, .csv-tips ul {
    margin: var(--space-sm) 0 0 0;
    padding-left: var(--space-md);
  }
  
  .format-notes li, .csv-tips li {
    margin-bottom: var(--space-xs);
    line-height: 1.4;
  }
  
  .csv-tips {
    background: rgba(255, 193, 7, 0.1);
    border-left: 3px solid #ffc107;
    padding: var(--space-sm);
    border-radius: var(--border-radius-sm);
  }
  
  .modal-footer {
    padding: var(--space-lg);
    border-top: 1px solid var(--color-stone-gray);
    text-align: center;
  }
  
  .close-footer-btn {
    background: var(--color-forest-green);
    color: white;
    border: none;
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .close-footer-btn:hover {
    background: var(--color-forest-dark);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    .modal-container {
      margin: var(--space-sm);
      max-height: 95vh;
    }
    
    .modal-header {
      padding: var(--space-md);
    }
    
    .modal-content {
      padding: var(--space-md);
    }
    
    .csv-headers {
      flex-wrap: wrap;
    }
    
    .csv-example {
      font-size: 0.75rem;
    }
    
    .format-section {
      font-size: 0.9rem;
    }
    
    .close-footer-btn {
      width: 100%;
      padding: var(--space-md);
      font-size: 1.1rem;
      min-height: 48px;
    }
  }
</style> 