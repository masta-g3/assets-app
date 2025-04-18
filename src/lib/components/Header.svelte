<script lang="ts">
  import { onMount } from 'svelte';
</script>

<header class="site-header">
  <div class="container">
    <div class="header-content">
      <div class="logo">
        <h1>Homestead</h1>
        <p class="tagline">Your personal asset landscape</p>
      </div>
    </div>
  </div>
</header>

<style>
  .site-header {
    background-color: white;
    box-shadow: var(--shadow-sm);
    padding: var(--space-sm) 0;
    margin-bottom: var(--space-lg);
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .logo h1 {
    font-family: var(--font-family-serif);
    color: var(--color-deep-brown);
    margin: 0;
    font-size: 1.8rem;
  }
  
  .tagline {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-stone-gray);
  }
  
  @media (max-width: 768px) {
    .logo h1 {
      font-size: 1.5rem;
    }
  }
</style>