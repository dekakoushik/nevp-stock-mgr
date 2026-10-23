// Simple in-memory fallback storage with mock AsyncStorage API interface.
// In Expo Go without pre-compiled native modules, this avoids the
// "AsyncStorageError: Native module is null" crash completely while
// providing fast, zero-dependency key-value persistence.

const memoryStore = new Map();

const storage = {
  getItem: async (key) => {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem: async (key, value) => {
    memoryStore.set(key, String(value));
  },
  removeItem: async (key) => {
    memoryStore.delete(key);
  },
  clear: async () => {
    memoryStore.clear();
  },
  getAllKeys: async () => {
    return Array.from(memoryStore.keys());
  }
};

export default storage;
