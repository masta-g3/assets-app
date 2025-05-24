<script lang="ts">
  import { onMount } from 'svelte';

  let isDark = false;

  /**
   * Apply or remove the `dark-mode` class on <body> and persist the choice.
   */
  function applyTheme(dark: boolean) {
    isDark = dark;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark-mode', dark);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    }
  }

  function toggleTheme() {
    applyTheme(!isDark);
  }

  onMount(() => {
    const stored = localStorage.getItem('theme');
    let currentTheme = false;
    if (stored === 'dark' || stored === 'light') {
      currentTheme = stored === 'dark';
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = prefersDark;
      /* Keep in sync with system preference if no manual override */
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches);
        }
      };
      mq.addEventListener('change', listener);
      // Return cleanup function for listener?
    }
    // Apply the theme *after* determining it, only once
    applyTheme(currentTheme);
  });
</script>

<header class="site-header">
  <div class="header-bg"></div>
  <div class="container">
    <div class="header-content">
      <div class="logo">
        <h1>Homestead</h1>
        <p class="tagline">Your personal asset landscape</p>
      </div>
      <!-- Ensure button is rendered -->
      <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle dark mode">
        {#if isDark}
          <!-- Moon icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 0111.21 3 7 7 0 0012 21a9 9 0 009-8.21z"></path>
          </svg>
        {:else}
          <!-- Sun icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  .site-header {
    background-color: rgba(255, 255, 255, 0.9);
    box-shadow: var(--shadow-sm);
    padding: var(--space-md) 0;
    margin-bottom: var(--space-xl);
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  }
  
  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.05;
    background-image: 
      radial-gradient(circle at 20% 30%, var(--color-moss) 0%, transparent 70%),
      radial-gradient(circle at 80% 40%, var(--color-sky-blue) 0%, transparent 70%);
    z-index: 0;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  
  .logo h1 {
    font-family: var(--font-family-serif);
    color: var(--color-deep-brown);
    margin: 0;
    font-size: 2rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    position: relative;
    display: inline-block;
  }
  
  .logo h1::after {
    content: "";
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, 
      var(--color-deep-brown) 0%,
      var(--color-ochre) 50%,
      transparent 100%);
  }
  
  .tagline {
    margin: 0.5rem 0 0;
    font-size: 0.95rem;
    color: var(--color-stone-gray);
    font-weight: 300;
    letter-spacing: 0.02em;
  }
  
  @media (max-width: 768px) {
    .logo h1 {
      font-size: 1.7rem;
    }
  }

  /* --- Reinstated original subtle styles, wrapped in :global() --- */
  :global(.theme-toggle) {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: var(--space-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-slate);
    transition: color 0.2s ease;
    width: 36px;
    height: 36px;
    z-index: 10;
  }

  :global(.theme-toggle:hover) {
    color: var(--color-deep-brown);
    background-color: rgba(0,0,0,0.05);
  }
</style>