<script lang="ts">
  import type { AssetEntry } from '../db';
  import { formatCurrency, formatPercentage } from '../utils/calculations';
  import { assetStore } from '../stores/assetStore';
  
  export let entries: AssetEntry[] = [];
  export let date: string = '';
  
  let editMode = false;
  let editedEntries: AssetEntry[] = [];
  let showAddForm = false;
  
  // Single simple entry form
  let newEntry = {
    date: '',
    platform: '',
    balance: 0,
    contributions: 0,
    expectedReturn: 0
  };
  
  // Update edited entries when entries change
  $: {
    editedEntries = entries.map(entry => ({ ...entry }));
    
    // Set default date for new entry
    if (date) {
      newEntry.date = date;
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
    if (!newEntry.platform || newEntry.balance <= 0) {
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
</script>

<div class="allocation-table card">
  <div class="table-header">
    <h3>Asset Allocation</h3>
    
    <div class="table-actions">
      {#if !editMode}
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
</style>