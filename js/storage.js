// storage.js

const STORAGE_KEYS = {
  PROMPTS: 'myExtension_prompts',
  FOLDERS: 'myExtension_folders'
};

const StorageService = {
  getJSON(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
