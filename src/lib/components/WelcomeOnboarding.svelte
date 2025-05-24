<script lang="ts">
  import { assetStore } from '../stores/assetStore';
  
  export let onComplete: () => void = () => {};
  
  let currentStep = 0;
  const totalSteps = 4;
  
  // Sample entry for demonstration
  let sampleEntry = {
    platform: 'Wealthfront',
    balance: 15000,
    contributions: 500,
    expectedReturn: 7.0
  };
  
  function nextStep() {
    if (currentStep < totalSteps - 1) {
      currentStep++;
    } else {
      onComplete();
    }
  }
  
  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }
  
  function skipOnboarding() {
    onComplete();
  }
  
  async function addSampleEntry() {
    const entryToAdd = {
      date: new Date().toISOString().split('T')[0], // Today's date
      platform: sampleEntry.platform,
      amount: sampleEntry.balance,
      rate: sampleEntry.expectedReturn,
      transactionType: 'contribution' as const,
      contributionAmount: sampleEntry.contributions,
      dataQuality: 'enhanced' as const
    };
    
    await assetStore.addEntry(entryToAdd);
    nextStep();
  }
</script>

<div class="onboarding-overlay">
  <div class="onboarding-modal">
    <div class="onboarding-header">
      <h2>Welcome to Homestead</h2>
      <p class="subtitle">Your personal investment tracking companion</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {((currentStep + 1) / totalSteps) * 100}%"></div>
      </div>
      <span class="step-counter">Step {currentStep + 1} of {totalSteps}</span>
    </div>
    
    <div class="onboarding-content">
      {#if currentStep === 0}
        <div class="step">
          <div class="step-icon">🏡</div>
          <h3>Track Your Financial Landscape</h3>
          <p>
            Homestead helps you monitor your investment portfolio across multiple platforms like 401k, 
            Wealthfront, savings accounts, and more. Get insights into your performance and growth.
          </p>
          <div class="features">
            <div class="feature">
              <span class="feature-icon">📊</span>
              <span>Portfolio analytics with attribution analysis</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔒</span>
              <span>All data stored locally in your browser</span>
            </div>
            <div class="feature">
              <span class="feature-icon">💡</span>
              <span>Smart contribution vs market growth tracking</span>
            </div>
          </div>
        </div>
      {:else if currentStep === 1}
        <div class="step">
          <div class="step-icon">📝</div>
          <h3>How It Works</h3>
          <p>
            Track your investments with simple monthly snapshots. Record your account balances 
            and any contributions to see how your money grows over time.
          </p>
          <div class="process-steps">
            <div class="process-step">
              <div class="process-number">1</div>
              <div>
                <strong>Record Monthly Balances</strong>
                <p>Enter your account balance from each platform</p>
              </div>
            </div>
            <div class="process-step">
              <div class="process-number">2</div>
              <div>
                <strong>Track Contributions</strong>
                <p>Note any money you added this period</p>
              </div>
            </div>
            <div class="process-step">
              <div class="process-number">3</div>
              <div>
                <strong>Get Insights</strong>
                <p>See contribution vs investment growth analytics</p>
              </div>
            </div>
          </div>
        </div>
      {:else if currentStep === 2}
        <div class="step">
          <div class="step-icon">💰</div>
          <h3>Try Adding Your First Asset</h3>
          <p>
            Let's add a sample entry to see how it works. You can edit or delete this later.
          </p>
          <div class="sample-form">
            <div class="form-group">
              <label for="sample-platform">Platform</label>
              <input 
                id="sample-platform"
                type="text" 
                bind:value={sampleEntry.platform}
                placeholder="e.g. Wealthfront, 401k"
              />
            </div>
            <div class="form-group">
              <label for="sample-balance">Current Balance ($)</label>
              <input 
                id="sample-balance"
                type="number" 
                bind:value={sampleEntry.balance}
                placeholder="15000"
              />
            </div>
            <div class="form-group">
              <label for="sample-contributions">Contributions This Month ($)</label>
              <input 
                id="sample-contributions"
                type="number" 
                bind:value={sampleEntry.contributions}
                placeholder="500"
              />
            </div>
            <div class="form-group">
              <label for="sample-expected-return">Expected Annual Return (%)</label>
              <input 
                id="sample-expected-return"
                type="number" 
                bind:value={sampleEntry.expectedReturn}
                step="0.1"
                placeholder="7.0"
              />
            </div>
          </div>
          <button class="add-sample-btn" on:click={addSampleEntry}>
            Add This Sample Entry
          </button>
        </div>
      {:else if currentStep === 3}
        <div class="step">
          <div class="step-icon">🎉</div>
          <h3>You're All Set!</h3>
          <p>
            Great! Your first entry has been added. You can now:
          </p>
          <div class="next-steps">
            <div class="next-step">
              <span class="step-icon-small">📊</span>
              <span>View your portfolio in the <strong>Overview</strong> tab</span>
            </div>
            <div class="next-step">
              <span class="step-icon-small">📈</span>
              <span>Analyze performance in the <strong>Performance Analysis</strong> tab</span>
            </div>
            <div class="next-step">
              <span class="step-icon-small">💾</span>
              <span>Import/export data in the <strong>Data Management</strong> tab</span>
            </div>
            <div class="next-step">
              <span class="step-icon-small">➕</span>
              <span>Add more entries as you update your accounts monthly</span>
            </div>
          </div>
          <p class="privacy-reminder">
            <strong>Privacy:</strong> All your data stays in your browser. Nothing is sent to any server.
          </p>
        </div>
      {/if}
    </div>
    
    <div class="onboarding-footer">
      <button class="skip-btn" on:click={skipOnboarding}>
        Skip Tutorial
      </button>
      
      <div class="nav-buttons">
        {#if currentStep > 0}
          <button class="prev-btn" on:click={prevStep}>
            Previous
          </button>
        {/if}
        
        {#if currentStep < totalSteps - 1}
          <button class="next-btn" on:click={nextStep}>
            {currentStep === 2 ? 'Continue' : 'Next'}
          </button>
        {:else}
          <button class="finish-btn" on:click={onComplete}>
            Start Using Homestead
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .onboarding-overlay {
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
  
  .onboarding-modal {
    background: white;
    border-radius: var(--border-radius-lg);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
  }
  
  .onboarding-header {
    padding: var(--space-lg);
    text-align: center;
    border-bottom: 1px solid var(--color-stone-gray);
  }
  
  .onboarding-header h2 {
    margin: 0 0 var(--space-xs) 0;
    color: var(--color-deep-brown);
  }
  
  .subtitle {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-slate);
    font-size: 1.1rem;
  }
  
  .progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(95, 116, 100, 0.2);
    border-radius: 2px;
    margin-bottom: var(--space-xs);
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-moss), var(--color-forest-green));
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  
  .step-counter {
    font-size: 0.9rem;
    color: var(--color-slate);
  }
  
  .onboarding-content {
    padding: var(--space-lg);
    min-height: 400px;
  }
  
  .step {
    text-align: center;
  }
  
  .step-icon {
    font-size: 3rem;
    margin-bottom: var(--space-md);
  }
  
  .step h3 {
    margin: 0 0 var(--space-md) 0;
    color: var(--color-deep-brown);
  }
  
  .step p {
    margin-bottom: var(--space-lg);
    line-height: 1.6;
    color: var(--color-slate);
  }
  
  .features {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
  }
  
  .feature {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  
  .feature-icon {
    font-size: 1.2rem;
    width: 24px;
  }
  
  .process-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    text-align: left;
    max-width: 450px;
    margin: 0 auto;
  }
  
  .process-step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
  }
  
  .process-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-forest-green);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    flex-shrink: 0;
    margin-top: 4px;
  }
  
  .process-step strong {
    color: var(--color-deep-brown);
    display: block;
    margin-bottom: var(--space-xs);
  }
  
  .process-step p {
    margin: 0;
    color: var(--color-slate);
    font-size: 0.9rem;
  }
  
  .sample-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
    text-align: left;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .form-group label {
    font-weight: 500;
    color: var(--color-deep-brown);
    font-size: 0.9rem;
  }
  
  .form-group input {
    padding: var(--space-sm);
    border: 1px solid var(--color-stone-gray);
    border-radius: var(--border-radius-sm);
    font-size: 1rem;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: var(--color-forest-green);
    box-shadow: 0 0 0 2px rgba(95, 116, 100, 0.2);
  }
  
  .add-sample-btn {
    background: var(--color-forest-green);
    color: white;
    border: none;
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .add-sample-btn:hover {
    background: var(--color-forest-dark);
    transform: translateY(-1px);
  }
  
  .next-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    text-align: left;
    max-width: 400px;
    margin: 0 auto var(--space-lg) auto;
  }
  
  .next-step {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    background: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-sm);
  }
  
  .step-icon-small {
    font-size: 1.2rem;
    width: 24px;
  }
  
  .privacy-reminder {
    font-size: 0.9rem;
    color: var(--color-slate);
    text-align: center;
    margin-top: var(--space-lg);
    padding: var(--space-sm);
    background: rgba(95, 116, 100, 0.05);
    border-radius: var(--border-radius-sm);
  }
  
  .onboarding-footer {
    padding: var(--space-lg);
    border-top: 1px solid var(--color-stone-gray);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .skip-btn {
    background: none;
    border: none;
    color: var(--color-slate);
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.9rem;
  }
  
  .skip-btn:hover {
    color: var(--color-deep-brown);
  }
  
  .nav-buttons {
    display: flex;
    gap: var(--space-sm);
  }
  
  .prev-btn, .next-btn, .finish-btn {
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--border-radius-sm);
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }
  
  .prev-btn {
    background: white;
    border: 1px solid var(--color-stone-gray);
    color: var(--color-slate);
  }
  
  .prev-btn:hover {
    background: rgba(95, 116, 100, 0.05);
  }
  
  .next-btn, .finish-btn {
    background: var(--color-forest-green);
    color: white;
  }
  
  .next-btn:hover, .finish-btn:hover {
    background: var(--color-forest-dark);
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    .onboarding-modal {
      margin: var(--space-sm);
      max-height: 95vh;
    }
    
    .onboarding-header {
      padding: var(--space-md);
    }
    
    .onboarding-content {
      padding: var(--space-md);
    }
    
    .step-icon {
      font-size: 2.5rem;
    }
    
    .sample-form {
      grid-template-columns: 1fr;
    }
    
    .form-group input {
      padding: var(--space-md);
      font-size: 1.1rem;
      min-height: 44px;
    }
    
    .add-sample-btn {
      width: 100%;
      padding: var(--space-md);
      font-size: 1.1rem;
      min-height: 48px;
    }
    
    .onboarding-footer {
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
    }
    
    .skip-btn {
      padding: var(--space-sm);
      font-size: 1rem;
      min-height: 44px;
    }
    
    .nav-buttons {
      width: 100%;
      justify-content: space-between;
    }
    
    .prev-btn, .next-btn, .finish-btn {
      padding: var(--space-md);
      font-size: 1rem;
      min-height: 48px;
      flex: 1;
    }
    
    .prev-btn {
      margin-right: var(--space-sm);
    }
    
    .process-steps {
      gap: var(--space-md);
    }
    
    .process-step {
      gap: var(--space-sm);
    }
    
    .next-steps {
      gap: var(--space-sm);
    }
    
    .next-step {
      padding: var(--space-md);
    }
  }
</style> 