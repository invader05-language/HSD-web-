const CONTENT_MEDIA_DB_NAME = "baiyun-hsd-content-media";
const CONTENT_MEDIA_DB_VERSION = 1;
const CONTENT_MEDIA_STORE_NAME = "blobs";

function getIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") throw new Error("CONTENT_MEDIA_STORAGE_UNAVAILABLE");
  return indexedDB;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = getIndexedDb().open(CONTENT_MEDIA_DB_NAME, CONTENT_MEDIA_DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CONTENT_MEDIA_STORE_NAME)) {
        request.result.createObjectStore(CONTENT_MEDIA_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("CONTENT_MEDIA_STORAGE_UNAVAILABLE"));
  });
}

export async function saveContentMediaBlob(localBlobId: string, blob: Blob) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CONTENT_MEDIA_STORE_NAME, "readwrite");
    transaction.objectStore(CONTENT_MEDIA_STORE_NAME).put(blob, localBlobId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("CONTENT_MEDIA_STORAGE_FAILED"));
  });
  database.close();
}

export async function readContentMediaBlob(localBlobId: string) {
  const database = await openDatabase();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(CONTENT_MEDIA_STORE_NAME, "readonly");
    const request = transaction.objectStore(CONTENT_MEDIA_STORE_NAME).get(localBlobId);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(new Error("CONTENT_MEDIA_STORAGE_FAILED"));
  });
  database.close();
  return blob;
}

export async function deleteContentMediaBlob(localBlobId: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CONTENT_MEDIA_STORE_NAME, "readwrite");
    transaction.objectStore(CONTENT_MEDIA_STORE_NAME).delete(localBlobId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("CONTENT_MEDIA_STORAGE_FAILED"));
  });
  database.close();
}
