import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// IndexedDB avoids localStorage's small quota for photo/voice memories on web.
// Existing first-page localStorage records remain readable until a successful write.
let database: Promise<IDBDatabase> | undefined;
function db() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('little-days', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
    request.onblocked = () => reject(new Error('Close other Little Days tabs and retry.'));
  });
  return database;
}
async function request<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction('records', mode);
    const operation = run(transaction.objectStore('records'));
    transaction.oncomplete = () => resolve(operation.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Storage write was interrupted.'));
  });
}
const web = Platform.OS === 'web';
export const storage = {
  async getAllKeys(): Promise<string[]> {
    if (!web) return [...(await AsyncStorage.getAllKeys())];
    const keys = await request('readonly', (store) => store.getAllKeys());
    return [...new Set([...keys.map(String), ...(await AsyncStorage.getAllKeys())])];
  },
  async getItem(key: string): Promise<string | null> {
    if (!web) return AsyncStorage.getItem(key);
    const value = await request('readonly', (store) => store.get(key));
    return typeof value === 'string' ? value : AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (!web) return AsyncStorage.setItem(key, value);
    await request('readwrite', (store) => store.put(value, key));
    // Remove only this successfully migrated record, never an unrelated key.
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string) {
    if (web) await request('readwrite', (store) => store.delete(key));
    await AsyncStorage.removeItem(key);
  },
};
