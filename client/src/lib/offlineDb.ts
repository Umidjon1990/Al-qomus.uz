import { DictionaryEntry } from './api';

const DB_NAME = 'al-qomus-offline';
const DB_VERSION = 1;
const STORE_NAME = 'dictionary';
const META_STORE = 'meta';

let db: IDBDatabase | null = null;

export async function openDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('arabic', 'arabic', { unique: false });
        store.createIndex('uzbek', 'uzbek', { unique: false });
        store.createIndex('dictionarySource', 'dictionarySource', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
}

export async function saveEntries(entries: DictionaryEntry[]): Promise<void> {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    entries.forEach((entry) => {
      store.put(entry);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getOfflineEntryCount(): Promise<number> {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function searchOffline(
  searchTerm: string,
  sources: string[] = ['Ghoniy']
): Promise<DictionaryEntry[]> {
  const database = await openDatabase();
  const normalizedSearch = searchTerm.toLowerCase().replace(/[\u064B-\u0652\u0670\u0671]/g, '');
  const isArabic = /[\u0600-\u06FF]/.test(searchTerm);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const results: DictionaryEntry[] = [];

    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor && results.length < 50) {
        const entry = cursor.value as DictionaryEntry;
        
        if (!sources.includes(entry.dictionarySource || '')) {
          cursor.continue();
          return;
        }

        let matches = false;
        
        if (isArabic) {
          const arabicNormalized = (entry.arabic || '').replace(/[\u064B-\u0652\u0670\u0671]/g, '');
          matches = arabicNormalized.includes(normalizedSearch);
        } else {
          matches = (entry.uzbek || '').toLowerCase().includes(normalizedSearch);
        }

        if (matches) {
          results.push(entry);
        }
        
        cursor.continue();
      } else {
        if (isArabic) {
          results.sort((a, b) => {
            const aArabic = (a.arabic || '').replace(/[\u064B-\u0652\u0670\u0671]/g, '');
            const bArabic = (b.arabic || '').replace(/[\u064B-\u0652\u0670\u0671]/g, '');
            
            const aExact = aArabic === normalizedSearch;
            const bExact = bArabic === normalizedSearch;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            const aPrefix = aArabic.startsWith(normalizedSearch);
            const bPrefix = bArabic.startsWith(normalizedSearch);
            if (aPrefix && !bPrefix) return -1;
            if (!aPrefix && bPrefix) return 1;
            
            return (a.arabic || '').length - (b.arabic || '').length;
          });
        } else {
          results.sort((a, b) => {
            const aUzbek = (a.uzbek || '').toLowerCase();
            const bUzbek = (b.uzbek || '').toLowerCase();
            
            const aExact = aUzbek === normalizedSearch;
            const bExact = bUzbek === normalizedSearch;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            const aPrefix = aUzbek.startsWith(normalizedSearch);
            const bPrefix = bUzbek.startsWith(normalizedSearch);
            if (aPrefix && !bPrefix) return -1;
            if (!aPrefix && bPrefix) return 1;
            
            return (a.uzbek || '').length - (b.uzbek || '').length;
          });
        }
        
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function setMeta(key: string, value: any): Promise<void> {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([META_STORE], 'readwrite');
    const store = transaction.objectStore(META_STORE);
    store.put({ key, value });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getMeta(key: string): Promise<any> {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([META_STORE], 'readonly');
    const store = transaction.objectStore(META_STORE);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

export async function clearOfflineData(): Promise<void> {
  const database = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, META_STORE], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(META_STORE).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function isOfflineReady(): Promise<boolean> {
  try {
    const count = await getOfflineEntryCount();
    return count > 0;
  } catch {
    return false;
  }
}
