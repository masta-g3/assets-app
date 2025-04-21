<script lang="ts">
  import { assetStore, uniquePlatforms } from '../stores/assetStore';
  import { createEventDispatcher } from 'svelte';

  // Reactive declaration for platform tags from the store
  $: platformTags = $assetStore.platformTags;

  // Component state
  let dialog: HTMLDialogElement;
  let currentTags: Record<string, string> = {};

  // Dispatcher for closing the modal
  const dispatch = createEventDispatcher();

  // Function to open the modal
  export function open() {
    // Initialize local tag state when opening
    currentTags = { ...$assetStore.platformTags }; 
    dialog?.showModal();
  }

  // Function to close the modal
  function close() {
    dialog?.close();
    dispatch('close');
  }

  // Handle input changes and update the store
  async function handleTagChange(platform: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const newTag = input.value.trim();
    currentTags[platform] = newTag;
    // Update the central store via the action
    await assetStore.setTag(platform, newTag);
  }

  // Close modal on outside click
  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialog) {
      close();
    }
  }

  // Close modal on Escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog bind:this={dialog} on:click={handleDialogClick} class="platform-tag-modal">
  <h2>Edit Platform Tags</h2>
  <p>Assign custom tags to group platforms in the allocation chart. Leave blank to remove tag.</p>
  
  {#if $uniquePlatforms.length > 0}
    <div class="tag-list">
      {#each $uniquePlatforms as platform (platform)}
        <div class="tag-item">
          <label for="tag-{platform}">{platform}</label>
          <input 
            type="text" 
            id="tag-{platform}" 
            placeholder="Enter tag (optional)"
            value={currentTags[platform] || ''} 
            on:input={(e) => handleTagChange(platform, e)} 
          />
        </div>
      {/each}
    </div>
  {:else}
    <p>No platforms found. Add some asset data first.</p>
  {/if}

  <button class="close-button" on:click={close}>Close</button>
</dialog>

<style>
  .platform-tag-modal {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 2rem;
    max-width: 500px;
    background-color: var(--background-color);
    color: var(--text-color);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .platform-tag-modal::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  h2 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--primary-color);
  }

  p {
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: var(--secondary-text-color);
  }

  .tag-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    max-height: 60vh; /* Allow scrolling if many platforms */
    overflow-y: auto;
  }

  .tag-item {
    display: grid;
    grid-template-columns: 1fr 2fr;
    align-items: center;
    gap: 1rem;
  }

  label {
    font-weight: 500;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  input[type="text"] {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--input-background);
    color: var(--text-color);
    width: 100%;
  }

  .close-button {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    display: block;
    margin-left: auto; /* Align button to the right */
  }

  .close-button:hover {
    background-color: var(--primary-hover-color);
  }
</style> 