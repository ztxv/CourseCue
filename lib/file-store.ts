'use client';

const DATABASE_NAME = 'coursecue-original-files';
const STORE_NAME = 'files';
const DATABASE_VERSION = 1;

type StoredOriginal = {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  createdAt: string;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Private file storage is unavailable in this browser.'));
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error || new Error('Could not open private file storage.'));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('The original file could not be accessed.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error('The original file could not be accessed.')); };
  });
}

export async function saveOriginalFile(courseId: string, file: File) {
  const stored: StoredOriginal = { id: courseId, name: file.name, type: file.type || 'application/octet-stream', blob: file, createdAt: new Date().toISOString() };
  await withStore('readwrite', (store) => store.put(stored));
}

export async function getOriginalFile(courseId: string) {
  const stored = await withStore<StoredOriginal | undefined>('readonly', (store) => store.get(courseId));
  return stored ? { name: stored.name, type: stored.type, blob: stored.blob } : null;
}

export async function deleteOriginalFile(courseId: string) {
  await withStore('readwrite', (store) => store.delete(courseId));
}
