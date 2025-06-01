<script lang="ts">
  import type { AssetEntry } from '../db';
  import { formatCurrency, formatPercentage } from '../utils/calculations';
  import { assetStore } from '../stores/assetStore';
  
  export let entries: AssetEntry[] = [];
  export let date: string = '';
  
  let editMode = false;
  let editedEntries: AssetEntry[] = [];
  let showAddForm = false;
  let showBulkSnapshotModal = false;
  
  // Single simple entry form
  let newEntry = {
    date: '',
    platform: '',
    balance: 0,
    contributions: 0,
    expectedReturn: 0
  };
  
  // Bulk snapshot form
  let bulkSnapshotDate = '';
  let bulkSnapshotEntries: Array<{
    platform: string;
    balance: number;
    contributions: number;
    expectedReturn: number;
    isNew?: boolean;
  }> = [];
  
  // Update edited entries when entries change
  $: {
    editedEntries = entries.map(entry => ({ ...entry }));
    
    // Set default date for new entry
    if (date) {
      newEntry.date = date;
      bulkSnapshotDate = date;
    }
  }
  
  // Calculate total amount
  $: totalAmount = editedEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  // Calculate allocation percentages
  $: allocations = editedEntries.map(entry => {
    return {
      ...entry,
      percentage: totalAmount > 0 ? (entry.amount / totalAmount) * 100 : 0
    };
  });
  
  // Derive unique platform names from the store
  let uniquePlatforms: string[] = [];
  $: {
    if ($assetStore.assets) {
        const platformSet = new Set($assetStore.assets.map(a => a.platform));
        uniquePlatforms = [...platformSet].sort();
    }
  }
  
  // Toggle edit mode
  function toggleEditMode() {
    if (editMode) {
      editedEntries = entries.map(entry => ({ ...entry }));
    }
    editMode = !editMode;
    showAddForm = false;
  }
  
  // Save changes
  async function saveChanges() {
    let success = true;
    
    for (const entry of editedEntries) {
      if (!await assetStore.updateEntry(entry)) {
        success = false;
      }
    }
    
    if (success) {
      editMode = false;
    } else {
      alert('Failed to save some changes');
    }
  }
  
  // Handle delete
  async function deleteEntry(id: number) {
    if (confirm('Are you sure you want to delete this entry?')) {
      if (await assetStore.deleteEntry(id)) {
        editedEntries = editedEntries.filter(entry => entry.id !== id);
      } else {
        alert('Failed to delete entry');
      }
    }
  }
  
  // Update data quality when contribution amount changes
  function updateEntryDataQuality(entry: AssetEntry) {
    // Auto-determine transaction type based on contribution amount
    const hasContribution = entry.contributionAmount && entry.contributionAmount > 0;
    
    if (hasContribution) {
      entry.transactionType = 'contribution';
      entry.dataQuality = 'enhanced';
    } else {
      entry.transactionType = 'snapshot';
      entry.contributionAmount = undefined;
      entry.dataQuality = 'snapshot_only';
    }
  }

  // Add entry (auto-determines type based on contributions)
  async function addEntry() {
    if (!newEntry.platform || newEntry.balance === 0) {
      alert('Please fill in platform and balance');
      return;
    }
    
    // Auto-determine transaction type and data quality
    const isContribution = newEntry.contributions > 0;
    
    const entryToAdd: Omit<AssetEntry, 'id'> = {
      date: newEntry.date,
      platform: newEntry.platform,
      amount: newEntry.balance,
      rate: newEntry.expectedReturn,
      transactionType: isContribution ? 'contribution' : 'snapshot',
      contributionAmount: isContribution ? newEntry.contributions : undefined,
      dataQuality: isContribution ? 'enhanced' : 'snapshot_only'
    };
    
    if (await assetStore.addEntry(entryToAdd)) {
      // Reset form
      newEntry = {
        date,
        platform: '',
        balance: 0,
        contributions: 0,
        expectedReturn: 0
      };
      showAddForm = false;
    } else {
      alert('Failed to add entry');
    }
  }

  // Initialize bulk snapshot form
  function initializeBulkSnapshot() {
    // Set date to today
    const today = new Date();
    bulkSnapshotDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Start with existing platforms from this date or previous dates
    const existingPlatforms = [...uniquePlatforms];
    
    // Get latest values for each platform as defaults
    bulkSnapshotEntries = existingPlatforms.map(platform => {
      // Find most recent entry for this platform
      const latestEntry = $assetStore.assets
        .filter(asset => asset.platform === platform)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      
      return {
        platform,
        balance: latestEntry?.amount || 0,
        contributions: 0,
        expectedReturn: latestEntry?.rate || 0,
        isNew: false
      };
    });
    
    showBulkSnapshotModal = true;
  }

  // Add new platform row to bulk snapshot
  function addNewPlatformToBulk() {
    bulkSnapshotEntries = [
      ...bulkSnapshotEntries,
      {
        platform: '',
        balance: 0,
        contributions: 0,
        expectedReturn: 0,
        isNew: true
      }
    ];
  }

  // Remove platform row from bulk snapshot
  function removePlatformFromBulk(index: number) {
    bulkSnapshotEntries = bulkSnapshotEntries.filter((_, i) => i !== index);
  }

  // Submit bulk snapshot
  async function submitBulkSnapshot() {
    if (!bulkSnapshotDate) {
      alert('Please select a date');
      return;
    }

    // Validate entries
    const validEntries = bulkSnapshotEntries.filter(entry => 
      entry.platform.trim() && entry.balance !== 0
    );

    if (validEntries.length === 0) {
      alert('Please add at least one valid entry with platform name and balance');
      return;
    }

    // Create entries to add
    const entriesToAdd = validEntries.map(entry => {
      const isContribution = entry.contributions > 0;
      
      return {
        date: bulkSnapshotDate,
        platform: entry.platform.trim(),
        amount: entry.balance,
        rate: entry.expectedReturn,
        transactionType: isContribution ? 'contribution' : 'snapshot',
        contributionAmount: isContribution ? entry.contributions : undefined,
        dataQuality: isContribution ? 'enhanced' : 'snapshot_only'
      } as Omit<AssetEntry, 'id'>;
    });

    // Add all entries
    let success = true;
    for (const entry of entriesToAdd) {
      if (!await assetStore.addEntry(entry)) {
        success = false;
        break;
      }
    }

    if (success) {
      showBulkSnapshotModal = false;
      bulkSnapshotEntries = [];
    } else {
      alert('Failed to add some entries');
    }
  }

  // Close modal helpers
  function closeBulkSnapshotModal() {
    showBulkSnapshotModal = false;
    bulkSnapshotEntries = [];
  }

  function handleModalEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && showBulkSnapshotModal) {
      closeBulkSnapshotModal();
    }
  }

  function handleModalOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeBulkSnapshotModal();
    }
  }
</script>

<svelte:window on:keydown={handleModalEscape} />

<div class="allocation-table card">
  <div class="table-header">
    <h3>Asset Allocation</h3>
    
    <div class="table-actions">
      {#if !editMode}
        <button class="secondary" on:click={initializeBulkSnapshot}>
          New Snapshot
        </button>
        <button class="secondary" on:click={() => showAddForm = !showAddForm}>
          {showAddForm ? 'Cancel' : 'Add Asset'}
        </button>
      {/if}
      
      <button on:click={toggleEditMode}>
        {editMode ? 'Cancel' : 'Edit Assets'}
      </button>
      
      {#if editMode}
        <button on:click={saveChanges}>
          Save Changes
        </button>
      {/if}
    </div>
  </div>
  
  {#if showAddForm}
    <div class="add-form">
      <h4>Add Asset Entry</h4>
      <p class="form-description">
        Record your account balance. Add contributions if you deposited money this period.
      </p>
      
      <div class="form-grid">
        <div class="form-group">
          <label for="add-date">Date</label>
          <input 
            id="add-date"
            type="date" 
            bind:value={newEntry.date}
          />
          <small class="help-text">Defaults to current selected date</small>
        </div>
        
        <div class="form-group">
          <label for="add-platform">Platform</label>
          <input 
            id="add-platform"
            type="text" 
            bind:value={newEntry.platform}
            list="platform-list"
            placeholder="e.g. Wealthfront, 401k, Savings"
          />
          <datalist id="platform-list">
            {#each uniquePlatforms as platform}
              <option value={platform}>{platform}</option>
            {/each}
          </datalist>
        </div>
        
        <div class="form-group">
          <label for="add-balance">Current Balance ($)</label>
          <input 
            id="add-balance"
            type="number" 
            bind:value={newEntry.balance} 
            step="0.01"
            placeholder="10000"
          />
        </div>
        
        <div class="form-group">
          <label for="add-contributions">Contributions This Period ($)</label>
          <input 
            id="add-contributions"
            type="number" 
            bind:value={newEntry.contributions} 
            step="0.01"
            placeholder="0"
          />
          <small class="help-text">Leave as 0 if no money was added</small>
        </div>
        
        <div class="form-group">
          <label for="add-expected-return">Expected Annual Return (%)</label>
          <input 
            id="add-expected-return"
            type="number" 
            bind:value={newEntry.expectedReturn} 
            step="0.1"
            placeholder="7.0"
          />
        </div>
      </div>
      
      <div class="form-actions">
        <button on:click={() => showAddForm = false} class="secondary">Cancel</button>
        <button on:click={addEntry} class="primary">Add Entry</button>
      </div>
    </div>
  {/if}
  
  <div class="table-responsive">
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th>Amount</th>
          <th>Contributions</th>
          <th>Expected Rate</th>
          <th>Allocation %</th>
          {#if editMode}
            <th>Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if editMode}
          {#each editedEntries as entry (entry.id)}
            <tr>
              <td>
                <input 
                  type="text" 
                  bind:value={entry.platform}
                  list="platform-list" 
                />
              </td>
              <td>
                <input 
                  type="number" 
                  bind:value={entry.amount} 
                  step="0.01"
                  placeholder="Account balance"
                />
              </td>
              <td>
                <input 
                  type="number" 
                  bind:value={entry.contributionAmount} 
                  step="0.01"
                  placeholder="0"
                  on:input={() => updateEntryDataQuality(entry)}
                />
              </td>
              <td>
                <input 
                  type="number" 
                  bind:value={entry.rate} 
                  max="100" 
                  step="0.1"
                  placeholder="7.0"
                />
              </td>
              <td><!-- Percentage column empty in edit mode --></td> 
              <td>
                <button 
                  class="danger"
                  on:click={() => deleteEntry(entry.id!)}
                >
                  Delete
                </button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan={6} class="no-data">
                No assets for this date
              </td>
            </tr>
          {/each}
        {:else}
          {#if allocations.length === 0}
            <tr>
              <td colspan={5} class="no-data">
                No assets for this date
              </td>
            </tr>
          {:else}
            {#each allocations as entry (entry.id)}
              <tr>
                <td>{entry.platform}</td>
                <td>{formatCurrency(entry.amount)}</td>
                <td>
                  {#if entry.contributionAmount}
                    <span class="contribution-amount">+{formatCurrency(entry.contributionAmount)}</span>
                    <span class="type-indicator">(Contribution)</span>
                  {:else}
                    <span class="no-contribution">—</span>
                    <span class="type-indicator">(Snapshot)</span>
                  {/if}
                </td>
                <td>{formatPercentage(entry.rate)}</td>
                <td>{formatPercentage(entry.percentage)}</td>
              </tr>
            {/each}
          {/if}
        {/if}
      </tbody>
      <tfoot>
        <tr>
          <th>Total</th>
          <th>{formatCurrency(totalAmount)}</th>
          <th>{formatCurrency(editedEntries.reduce((sum, entry) => sum + (entry.contributionAmount || 0), 0))}</th>
          <th></th>
          <th>100%</th>
          {#if editMode}
            <th></th>
          {/if}
        </tr>
      </tfoot>
    </table>
  </div>
</div>

<!-- Bulk Snapshot Modal -->
{#if showBulkSnapshotModal}
  <div class="modal-overlay" on:click={handleModalOverlayClick} on:keydown={handleModalEscape} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-container">
      <div class="modal-header">
        <h2>New Snapshot</h2>
        <p class="subtitle">Record current portfolio balances for multiple platforms</p>
        <button class="close-btn" on:click={closeBulkSnapshotModal} aria-label="Close">
          ✕
        </button>
      </div>
      
      <div class="modal-content">
        <div class="form-group">
          <label for="bulk-date">Snapshot Date</label>
          <input 
            id="bulk-date"
            type="date" 
            bind:value={bulkSnapshotDate}
          />
        </div>

        <div class="bulk-table-container">
          <table class="bulk-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Current Balance ($)</th>
                <th>Contributions ($)</th>
                <th>Expected Return (%)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each bulkSnapshotEntries as entry, index (index)}
                <tr>
                  <td>
                    {#if entry.isNew}
                                             <input 
                         type="text" 
                         bind:value={entry.platform}
                         placeholder="Platform name"
                         list="platform-list-bulk"
                       />
                    {:else}
                      <span class="platform-name">{entry.platform}</span>
                    {/if}
                  </td>
                  <td>
                    <input 
                      type="number" 
                      bind:value={entry.balance}
                      step="0.01"
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      bind:value={entry.contributions}
                      step="0.01"
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      bind:value={entry.expectedReturn}
                      step="0.1"
                      placeholder="7.0"
                    />
                  </td>
                  <td>
                    {#if entry.isNew}
                      <button 
                        class="remove-btn" 
                        on:click={() => removePlatformFromBulk(index)}
                        aria-label="Remove platform"
                      >
                        ✕
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

                 <div class="modal-actions">
           <button class="secondary" on:click={addNewPlatformToBulk}>
             + Add New Platform
           </button>
         </div>

         <!-- Platform datalist for modal -->
         <datalist id="platform-list-bulk">
           {#each uniquePlatforms as platform}
             <option value={platform}>{platform}</option>
           {/each}
         </datalist>
      </div>
      
      <div class="modal-footer">
        <button class="secondary" on:click={closeBulkSnapshotModal}>
          Cancel
        </button>
        <button class="primary" on:click={submitBulkSnapshot}>
          Create Snapshot
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .allocation-table {
    background-color: white;
    border-radius: var(--border-radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    overflow-x: auto;
  }
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  
  .table-actions {
    display: flex;
    gap: var(--space-sm);
  }
  
  .table-responsive {
    overflow-x: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-stone-gray);
  }
  
  th {
    font-weight: 600;
    background-color: rgba(95, 116, 100, 0.1);
  }
  
  tbody tr:hover {
    background-color: rgba(95, 116, 100, 0.05);
  }
  
  tfoot {
    font-weight: 600;
  }
  
  .no-data {
    text-align: center;
    padding: var(--space-md);
    color: var(--color-stone-gray);
    font-style: italic;
  }
  
  .add-form {
    background: rgba(95, 116, 100, 0.02);
    border: 1px solid rgba(95, 116, 100, 0.1);
    border-radius: var(--border-radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .add-form h4 {
    margin: 0 0 var(--space-xs) 0;
    color: var(--color-forest-dark);
  }
  
  .form-description {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-stone-gray);
    font-size: 0.9rem;
    font-style: italic;
  }
  
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .form-group label {
    font-weight: 500;
    color: var(--color-forest-dark);
    font-size: 0.9rem;
  }
  
  .form-group input {
    border: 1px solid var(--color-stone-gray);
    border-radius: var(--border-radius-sm);
    padding: var(--space-sm);
  }
  
  .help-text {
    font-size: 0.8rem;
    color: var(--color-stone-gray);
    font-style: italic;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
  
  .type-indicator {
    font-size: 0.75rem;
    color: var(--color-stone-gray);
    font-style: italic;
    margin-left: var(--space-xs);
  }

  .contribution-amount {
    color: var(--color-positive);
    font-weight: 500;
  }

  .no-contribution {
    color: var(--color-stone-gray);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .table-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }
    
    .table-actions {
      width: 100%;
    }
    
    .table-actions button {
      flex: 1;
      min-height: 44px;
      font-size: 0.9rem;
    }
    
    .form-grid {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .form-actions button {
      width: 100%;
      min-height: 44px;
      font-size: 1rem;
    }
    
    table {
      min-width: 600px;
    }
    
    .table-responsive {
      -webkit-overflow-scrolling: touch;
    }
    
    th, td {
      padding: var(--space-xs);
      font-size: 0.9rem;
    }
    
    .type-indicator {
      display: block;
      margin-left: 0;
      margin-top: var(--space-xs);
    }
    
    .allocation-table {
      padding: var(--space-sm);
    }
  }

  /* Modal Styles */
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
    max-width: 900px;
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
  
  .bulk-table-container {
    margin: var(--space-md) 0;
    border: 1px solid var(--color-stone-gray);
    border-radius: var(--border-radius-sm);
    overflow-x: auto;
  }
  
  .bulk-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
  }
  
  .bulk-table th,
  .bulk-table td {
    padding: var(--space-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-stone-gray);
  }
  
  .bulk-table th {
    font-weight: 600;
    background-color: rgba(95, 116, 100, 0.1);
  }
  
  .bulk-table tbody tr:hover {
    background-color: rgba(95, 116, 100, 0.05);
  }
  
  .bulk-table input[type="text"],
  .bulk-table input[type="number"] {
    width: 100%;
    border: 1px solid var(--color-stone-gray);
    border-radius: var(--border-radius-sm);
    padding: var(--space-xs);
    font-size: 0.9rem;
  }
  
  .platform-name {
    font-weight: 500;
    color: var(--color-forest-dark);
  }
  
  .remove-btn {
    background: none;
    border: none;
    color: var(--color-danger);
    cursor: pointer;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }
  
  .remove-btn:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-start;
    margin-bottom: var(--space-md);
  }
  
  .modal-footer {
    padding: var(--space-lg);
    border-top: 1px solid var(--color-stone-gray);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
  
  @media (max-width: 768px) {
    .modal-container {
      margin: var(--space-sm);
      max-height: 95vh;
    }
    
    .modal-header,
    .modal-content,
    .modal-footer {
      padding: var(--space-md);
    }
    
    .bulk-table-container {
      -webkit-overflow-scrolling: touch;
    }
    
    .bulk-table {
      min-width: 600px;
    }
    
    .bulk-table th,
    .bulk-table td {
      padding: var(--space-xs);
      font-size: 0.8rem;
    }
    
    .modal-footer {
      flex-direction: column;
    }
    
    .modal-footer button {
      width: 100%;
      min-height: 44px;
    }
  }
</style>