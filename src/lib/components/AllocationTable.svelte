<script lang="ts">
  import type { AssetEntry } from '../db';
  import { formatCurrency, formatPercentage } from '../utils/calculations';
  import { assetStore } from '../stores/assetStore';
  
  export let entries: AssetEntry[] = [];
  export let date: string = '';
  
  let editMode = false;
  let editedEntries: AssetEntry[] = [];
  let newEntry: Omit<AssetEntry, 'id'> = {
    date: '',
    platform: '',
    amount: 0,
    rate: 0
  };
  let showAddForm = false;
  let showDateInput = false;
  
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
  
  // --- NEW: Derive unique platform names from the store --- 
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
      // Exiting edit mode without saving
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
  
  // Toggle add form
  function toggleAddForm() {
    showAddForm = !showAddForm;
    showDateInput = false;
    if (showAddForm) {
      newEntry = {
        date,
        platform: uniquePlatforms[0] || '',
        amount: 0,
        rate: 0
      };
    }
  }
  
  // Add new entry
  async function addNewEntry() {
    if (!newEntry.platform) {
      alert('Please fill in all fields correctly');
      return;
    }
    
    if (await assetStore.addEntry(newEntry)) {
      showAddForm = false;
      showDateInput = false;
      newEntry = {
        date,
        platform: '',
        amount: 0,
        rate: 0
      };
    } else {
      alert('Failed to add new entry');
    }
  }
  
  // Helper to reveal date picker
  function requestDateChange() {
    showDateInput = true;
  }
</script>

<div class="allocation-table card">
  <div class="table-header">
    <h3>Asset Allocation</h3>
    
    <div class="table-actions">
      {#if !editMode}
        <button class="secondary" on:click={toggleAddForm}>
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
      <div class="form-grid">
        <!-- Date (defaults to slider date) -->
        <div class="form-group date-group">
          <label for="assetDate">Date</label>
          {#if showDateInput}
            <input type="date" id="assetDate" bind:value={newEntry.date} />
          {:else}
            <div class="date-display">
              <span>{newEntry.date}</span>
              <button class="link-button" on:click={requestDateChange}>(Change)</button>
            </div>
          {/if}
        </div>
        <!-- Platform -->
        <div class="form-group">
          <label for="platform">Platform</label>
          <input 
            type="text" 
            id="platform" 
            bind:value={newEntry.platform}
            list="platform-list" 
          />
          <datalist id="platform-list">
            {#each uniquePlatforms as platform}
              <option value={platform}>{platform}</option>
            {/each}
          </datalist>
        </div>
        
        <div class="form-group">
          <label for="amount">Amount</label>
          <input 
            type="number" 
            id="amount" 
            bind:value={newEntry.amount} 
            step="0.01"
          />
        </div>
        
        <div class="form-group">
          <label for="rate">Expected Rate (%)</label>
          <input 
            type="number" 
            id="rate" 
            bind:value={newEntry.rate} 
            max="100" 
            step="0.1"
          />
        </div>
      </div>
      
      <div class="form-actions">
        <button on:click={toggleAddForm} class="secondary">Cancel</button>
        <button on:click={addNewEntry}>Add Asset</button>
      </div>
    </div>
  {/if}
  
  <div class="table-responsive">
    <table>
      <thead>
        <tr>
          <th>Platform</th>
          <th>Amount</th>
          <th>Expected Rate</th>
          <th>Allocation %</th>
          {#if editMode}
            <th>Actions</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if editMode}
          <!-- Edit Mode: Loop over editedEntries -->
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
                />
              </td>
              <td>
                <input 
                  type="number" 
                  bind:value={entry.rate} 
                  max="100" 
                  step="0.1"
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
          {:else} <!-- Handles empty editedEntries -->
            <tr>
              <td colspan={5} class="no-data">
                No assets for this date
              </td>
            </tr>
          {/each} <!-- Closes each editedEntries -->
        {:else}
          <!-- Display Mode: Loop over allocations -->
          {#if allocations.length === 0}
            <tr>
              <td colspan={4} class="no-data">
                No assets for this date
              </td>
            </tr>
          {:else}
            {#each allocations as entry (entry.id)}
              <tr>
                <td>
                  {entry.platform}
                </td>
                <td>
                  {formatCurrency(entry.amount)}
                </td>
                <td>
                  {formatPercentage(entry.rate)}
                </td>
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
    background-color: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    border-top: 1px solid var(--color-stone-gray);
    border-bottom: 1px solid var(--color-stone-gray);
  }
  
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  
  .form-group input,
  .form-group select {
    border: 1px solid var(--color-stone-gray);
  }
  
  .date-display {
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--color-stone-gray);
    border-radius: 4px;
    display: flex;
    align-items: center;
  }
  
  .link-button {
    background: none;
    border: none;
    color: var(--color-stone-gray);
    cursor: pointer;
    padding: 0 0 0 0.3rem;
    font-size: 0.8rem;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  
  .link-button:hover {
    color: var(--color-green);
  }
  
  .styled-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' stroke='%239B9B93' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.8rem center;
    background-size: 1rem;
    padding-right: 2rem;
  }
  
  @media (max-width: 768px) {
    .table-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }
    
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>