import { SlideData } from '../types';

const DB_NAME = 'LuminaDeckDB';
const STORE_NAME = 'projects';
const SLIDE_STORE = 'slides'; // New store for durable slide tracking
const CURRENT_PROJECT_KEY = 'current_project';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bumped version for new store
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SLIDE_STORE)) {
        db.createObjectStore(SLIDE_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveProject = async (slides: SlideData[]): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction([STORE_NAME, SLIDE_STORE], 'readwrite');
    const projectStore = tx.objectStore(STORE_NAME);
    const slideStore = tx.objectStore(SLIDE_STORE);
    
    projectStore.put({ id: CURRENT_PROJECT_KEY, slides, updatedAt: Date.now() });
    // Batch save slides for durable access
    slides.forEach(s => slideStore.put(s));
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Failed to save project", e);
  }
};

export const updatePersistentSlide = async (slide: SlideData): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SLIDE_STORE, 'readwrite');
      tx.objectStore(SLIDE_STORE).put(slide);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Durable checkpoint failed", e);
  }
};

export const loadProject = async (): Promise<SlideData[] | null> => {
   try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CURRENT_PROJECT_KEY);
      request.onsuccess = () => {
        if (request.result && request.result.slides) {
            resolve(request.result.slides);
        } else {
            resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
   } catch (e) {
     console.error("Failed to load project", e);
     return null;
   }
};

export const clearProject = async (): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_NAME, SLIDE_STORE], 'readwrite');
            tx.objectStore(STORE_NAME).delete(CURRENT_PROJECT_KEY);
            tx.objectStore(SLIDE_STORE).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to clear project", e);
    }
}
