<script lang="ts">
  import { onMount } from 'svelte';
</script>

<header class="site-header">
  <div class="header-bg"></div>
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
</style>