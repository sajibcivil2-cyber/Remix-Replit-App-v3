/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DseStockItem } from '../types/dse';

const DB_NAME = 'DSE_QUANT_TERMINAL_DB';
const DB_VERSION = 1;
const STORE_NAME = 'stocks_universe';
const META_KEY = 'stocks_metadata';
const LS_FALLBACK_KEY = 'dse_saved_stocks_fallback';
const LS_META_KEY = 'dse_saved_stocks_meta';

/**
 * Opens or initializes the IndexedDB database.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Persists all stocks into IndexedDB (with localStorage fallback).
 */
export async function saveStocksToDatabase(stocks: DseStockItem[]): Promise<{
  success: boolean;
  count: number;
  savedAt: string;
}> {
  const savedAt = new Date().toISOString();

  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, 'metadata'], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const metaStore = tx.objectStore('metadata');

      // Clear previous records and re-insert
      store.clear();

      for (const stock of stocks) {
        store.put(stock);
      }

      metaStore.put({
        id: META_KEY,
        count: stocks.length,
        savedAt,
        symbols: stocks.map(s => s.symbol),
      });

      tx.oncomplete = () => {
        // Also save lightweight metadata to localStorage
        try {
          localStorage.setItem(
            LS_META_KEY,
            JSON.stringify({ count: stocks.length, savedAt })
          );
        } catch {
          // ignore localStorage errors
        }
        resolve({ success: true, count: stocks.length, savedAt });
      };

      tx.onerror = (e: any) => {
        reject(e.target.error || new Error('Transaction failed'));
      };
    });
  } catch (idbErr) {
    console.warn('IndexedDB unavailable, falling back to localStorage:', idbErr);
    try {
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(stocks));
      localStorage.setItem(LS_META_KEY, JSON.stringify({ count: stocks.length, savedAt }));
      return { success: true, count: stocks.length, savedAt };
    } catch (lsErr: any) {
      throw new Error(`Failed to save database: ${lsErr?.message || 'Storage full'}`);
    }
  }
}

/**
 * Loads the saved stocks universe from IndexedDB (or localStorage fallback).
 */
export async function loadStocksFromDatabase(): Promise<DseStockItem[] | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as DseStockItem[]);
        } else {
          resolve(null);
        }
      };

      request.onerror = (e: any) => {
        reject(e.target.error || new Error('Failed to query IndexedDB'));
      };
    });
  } catch (err) {
    // Try localStorage fallback
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as DseStockItem[];
        }
      }
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * Completely clears / wipes the saved database.
 */
export async function clearDatabase(): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, 'metadata'], 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore('metadata').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  }

  try {
    localStorage.removeItem(LS_FALLBACK_KEY);
    localStorage.removeItem(LS_META_KEY);
  } catch {
    // ignore
  }

  return true;
}

/**
 * Returns saved metadata (count and lastSaved timestamp).
 */
export async function getDatabaseStats(): Promise<{ count: number; lastSaved: string | null }> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const request = store.get(META_KEY);

      request.onsuccess = () => {
        if (request.result) {
          resolve({ count: request.result.count, lastSaved: request.result.savedAt });
        } else {
          resolve({ count: 0, lastSaved: null });
        }
      };

      request.onerror = () => {
        resolve({ count: 0, lastSaved: null });
      };
    });
  } catch {
    try {
      const meta = localStorage.getItem(LS_META_KEY);
      if (meta) {
        return JSON.parse(meta);
      }
    } catch {
      // ignore
    }
    return { count: 0, lastSaved: null };
  }
}

/**
 * Exports current stock universe as a downloadable JSON database backup.
 */
export function exportDatabaseToJson(stocks: DseStockItem[], fileName?: string): void {
  const payload = {
    appName: 'DSE Quant & Profit Predictor',
    version: '2.0',
    exportDate: new Date().toISOString(),
    totalSymbols: stocks.length,
    stocks,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = fileName || `dse_stock_database_${d}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses an exported JSON backup file and restores the stock database.
 */
export function importDatabaseFromJson(file: File): Promise<DseStockItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        let items: DseStockItem[] = [];

        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.stocks)) {
          items = parsed.stocks;
        } else {
          throw new Error('Invalid JSON format: expected an array of stocks or a database backup object.');
        }

        // Validate basic structure
        if (items.length === 0) {
          throw new Error('Imported JSON file contains 0 stocks.');
        }

        const validItems = items.filter(s => s && s.symbol && Array.isArray(s.bars));
        if (validItems.length === 0) {
          throw new Error('No valid stock items with bars found in this file.');
        }

        resolve(validItems);
      } catch (err: any) {
        reject(new Error(`Failed to parse database JSON file: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
