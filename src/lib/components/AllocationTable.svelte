<script lang="ts">
  import { ALLOWED_PLATFORMS } from '../db';
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
    if (showAddForm) {
      newEntry = {
        date,
        platform: ALLOWED_PLATFORMS[0],
        amount: 0,
        rate: 0
      };
    }
  }
  
  // Add new entry
  async function addNewEntry() {
    if (!newEntry.platform || newEntry.amount <= 0) {
      alert('Please fill in all fields correctly');
      return;
    }
    
    if (await assetStore.addEntry(newEntry)) {
      showAddForm = false;
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
        <div class="form-group">
          <label for="platform">Platform</label>
          <select id="platform" bind:value={newEntry.platform}>
            {#each ALLOWED_PLATFORMS as platform}
              <option value={platform}>{platform}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="amount">Amount</label>
          <input 
            type="number" 
            id="amount" 
            bind:value={newEntry.amount} 
            min="0" 
            step="0.01"
          />
        </div>
        
        <div class="form-group">
          <label for="rate">Expected Rate (%)</label>
          <input 
            type="number" 
            id="rate" 
            bind:value={newEntry.rate} 
            min="0" 
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
        {#if allocations.length === 0}
          <tr>
            <td colspan={editMode ? 5 : 4} class="no-data">
              No assets for this date
            </td>
          </tr>
        {:else}
          {#each allocations as entry (entry.id)}
            <tr>
              <td>
                {#if editMode}
                  <select bind:value={entry.platform}>
                    {#each ALLOWED_PLATFORMS as platform}
                      <option value={platform}>{platform}</option>
                    {/each}
                  </select>
                {:else}
                  {entry.platform}
                {/if}
              </td>
              <td>
                {#if editMode}
                  <input 
                    type="number" 
                    bind:value={entry.amount} 
                    min="0" 
                    step="0.01"
                  />
                {:else}
                  {formatCurrency(entry.amount)}
                {/if}
              </td>
              <td>
                {#if editMode}
                  <input 
                    type="number" 
                    bind:value={entry.rate} 
                    min="0" 
                    max="100" 
                    step="0.1"
                  />
                {:else}
                  {formatPercentage(entry.rate)}
                {/if}
              </td>
              <td>{formatPercentage(entry.percentage)}</td>
              {#if editMode}
                <td>
                  <button 
                    class="delete-btn" 
                    on:click={() => deleteEntry(entry.id!)}
                  >
                    Delete
                  </button>
                </td>
              {/if}
            </tr>
          {/each}
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
  
  .delete-btn {
    background-color: var(--color-negative);
    color: white;
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.8rem;
  }
  
  .delete-btn:hover {
    background-color: rgba(244, 67, 54, 0.8);
    color: white;
  }
  
  .add-form {
    background-color: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
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