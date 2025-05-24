import { openDB } from 'idb';
import type { DBSchema } from 'idb';

// Transaction types simplified to core use cases
export type TransactionType = 'snapshot' | 'contribution';



// Simplified AssetEntry interface
export interface AssetEntry {
  id?: number;
  date: string;  // YYYY-MM-DD format
  platform: string;
  amount: number;
  rate: number;
  
  // Required fields for clean data model
  transactionType: TransactionType;
  contributionAmount?: number;  // Required when transactionType is 'contribution'
  
  // Optional fields
  notes?: string;
  
  // Data quality indicator - 'enhanced' for new entries, 'snapshot_only' for legacy
  dataQuality?: 'snapshot_only' | 'enhanced';
}



// Define the database schema
interface HomesteadDB extends DBSchema {
  assets: {
    key: number;
    value: AssetEntry;
    indexes: {
      'by-date': string;
      'by-platform': string;
      'by-transaction-type': TransactionType;
    };
  };
  platformTags: {
    key: string; // platform name
    value: { platform: string; tag: string };
  };
}

// List of allowed platforms
export const ALLOWED_PLATFORMS = [
  'Wealthfront',
  'Robinhood',
  'Real Estate',
  'Checking',
  'Savings',
  'Retirement',
  'Stocks',
  'Bonds',
  'Crypto',
  'Cash',
  'Other'
];



// DB name and version
const DB_NAME = 'homestead-db';
const DB_VERSION = 3; // Incrementing for new schema

// Migration helper to add default values for existing entries
const migrateAssetEntry = (entry: any): AssetEntry => {
  // Determine data quality based on available information
  let dataQuality: 'snapshot_only' | 'enhanced' = 'snapshot_only';
  
  if (entry.contributionAmount !== undefined || entry.transactionType === 'contribution') {
    dataQuality = 'enhanced';
  } else if (entry.dataQuality === 'enhanced') {
    dataQuality = 'enhanced';
  }
  
  return {
    ...entry,
    transactionType: entry.transactionType || 'snapshot',
    dataQuality,
    // Don't set defaults for contributionAmount, notes - keep them undefined
  };
};

// Open the database
export const dbPromise = openDB<HomesteadDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 1) {
      // Create the assets store
      const assetStore = db.createObjectStore('assets', { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      
      // Create indexes for querying
      assetStore.createIndex('by-date', 'date');
      assetStore.createIndex('by-platform', 'platform');
    }
    
    if (oldVersion < 2) {
      // Create the platformTags store
      db.createObjectStore('platformTags', { keyPath: 'platform' });
    }

          if (oldVersion < 3) {
        // Add new indexes to existing assets store during upgrade transaction
        try {
          const existingAssetStore = transaction.objectStore('assets');
          if (existingAssetStore) {
            try {
              existingAssetStore.createIndex('by-transaction-type', 'transactionType');
            } catch (e) {
              console.log('Index by-transaction-type may already exist');
            }
          }
        } catch (e) {
          console.log('Could not add indexes to existing assets store, this is okay for new installs');
        }


      }
  },
});

// Asset database operations (enhanced)
export const assetDb = {
  // Add a new asset entry
  async add(entry: Omit<AssetEntry, 'id'>) {
    const enhancedEntry = migrateAssetEntry(entry);
    return (await dbPromise).add('assets', enhancedEntry as AssetEntry);
  },
  
  // Add multiple asset entries in a transaction
  async addMultiple(entries: Omit<AssetEntry, 'id'>[]) {
    const db = await dbPromise;
    const tx = db.transaction('assets', 'readwrite');
    const enhancedEntries = entries.map(entry => migrateAssetEntry(entry));
    await Promise.all([
      ...enhancedEntries.map(entry => tx.store.add(entry as AssetEntry)),
      tx.done
    ]);
  },
  
  // Update an existing asset entry
  async update(entry: AssetEntry) {
    const enhancedEntry = migrateAssetEntry(entry);
    return (await dbPromise).put('assets', enhancedEntry);
  },
  
  // Delete an asset entry by ID
  async delete(id: number) {
    return (await dbPromise).delete('assets', id);
  },
  
  // Get all asset entries (with migration)
  async getAll(): Promise<AssetEntry[]> {
    const entries = await (await dbPromise).getAll('assets');
    return entries.map(migrateAssetEntry);
  },
  
  // Get all entries sorted by date
  async getAllByDate(): Promise<AssetEntry[]> {
    const entries = await (await dbPromise).getAllFromIndex('assets', 'by-date');
    return entries.map(migrateAssetEntry);
  },
  
  // Get entries for a specific date
  async getByDate(date: string): Promise<AssetEntry[]> {
    const db = await dbPromise;
    const index = db.transaction('assets').store.index('by-date');
    const entries = await index.getAll(date);
    return entries.map(migrateAssetEntry);
  },
  
  // Get entries for a specific platform
  async getByPlatform(platform: string): Promise<AssetEntry[]> {
    const db = await dbPromise;
    const index = db.transaction('assets').store.index('by-platform');
    const entries = await index.getAll(platform);
    return entries.map(migrateAssetEntry);
  },

  // New methods for enhanced querying
  async getByTransactionType(transactionType: TransactionType): Promise<AssetEntry[]> {
    const db = await dbPromise;
    try {
      const index = db.transaction('assets').store.index('by-transaction-type');
      const entries = await index.getAll(transactionType);
      return entries.map(migrateAssetEntry);
    } catch (e) {
      // Fallback to filtering all entries if index doesn't exist
      const allEntries = await this.getAll();
      return allEntries.filter(entry => 
        (entry.transactionType || 'snapshot') === transactionType
      );
    }
  },


  
  // Get all unique dates in the database
  async getAllDates() {
    const entries = await this.getAllByDate();
    const uniqueDates = new Set(entries.map(entry => entry.date));
    return [...uniqueDates].sort();
  },
  
  // Clear all assets from the database
  async clear() {
    return (await dbPromise).clear('assets');
  },
  
  // Count the number of asset entries
  async count() {
    return (await dbPromise).count('assets');
  }
};



// Platform Tag database operations (unchanged)
export const platformTagDb = {
  async set(platform: string, tag: string) {
    if (!tag) {
      return this.delete(platform);
    }
    return (await dbPromise).put('platformTags', { platform, tag });
  },

  async delete(platform: string) {
    return (await dbPromise).delete('platformTags', platform);
  },

  async get(platform: string): Promise<string | undefined> {
    const entry = await (await dbPromise).get('platformTags', platform);
    return entry?.tag;
  },

  async getAll(): Promise<Record<string, string>> {
    const allTags = await (await dbPromise).getAll('platformTags');
    return allTags.reduce((acc, { platform, tag }) => {
      acc[platform] = tag;
      return acc;
    }, {} as Record<string, string>);
  },

  async clear() {
    return (await dbPromise).clear('platformTags');
  },
};