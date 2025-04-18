import { openDB } from 'idb';
import type { DBSchema } from 'idb';

// Define types for our data model
export interface AssetEntry {
  id?: number;
  date: string;  // YYYY-MM-DD format
  platform: string;
  amount: number;
  rate: number;
}

// Define the database schema
interface HomesteadDB extends DBSchema {
  assets: {
    key: number;
    value: AssetEntry;
    indexes: {
      'by-date': string;
      'by-platform': string;
    };
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
const DB_VERSION = 1;

// Open the database
export const dbPromise = openDB<HomesteadDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Create the assets store
    const assetStore = db.createObjectStore('assets', { 
      keyPath: 'id', 
      autoIncrement: true 
    });
    
    // Create indexes for querying
    assetStore.createIndex('by-date', 'date');
    assetStore.createIndex('by-platform', 'platform');
  },
});

// Asset database operations
export const assetDb = {
  // Add a new asset entry
  async add(entry: Omit<AssetEntry, 'id'>) {
    return (await dbPromise).add('assets', entry as AssetEntry);
  },
  
  // Add multiple asset entries in a transaction
  async addMultiple(entries: Omit<AssetEntry, 'id'>[]) {
    const db = await dbPromise;
    const tx = db.transaction('assets', 'readwrite');
    await Promise.all([
      ...entries.map(entry => tx.store.add(entry as AssetEntry)),
      tx.done
    ]);
  },
  
  // Update an existing asset entry
  async update(entry: AssetEntry) {
    return (await dbPromise).put('assets', entry);
  },
  
  // Delete an asset entry by ID
  async delete(id: number) {
    return (await dbPromise).delete('assets', id);
  },
  
  // Get all asset entries
  async getAll() {
    return (await dbPromise).getAll('assets');
  },
  
  // Get all entries sorted by date
  async getAllByDate() {
    return (await dbPromise).getAllFromIndex('assets', 'by-date');
  },
  
  // Get entries for a specific date
  async getByDate(date: string) {
    const db = await dbPromise;
    const index = db.transaction('assets').store.index('by-date');
    return index.getAll(date);
  },
  
  // Get entries for a specific platform
  async getByPlatform(platform: string) {
    const db = await dbPromise;
    const index = db.transaction('assets').store.index('by-platform');
    return index.getAll(platform);
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