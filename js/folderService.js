// folderService.js

const FolderService = {
  getAll() {
    return StorageService.getJSON(STORAGE_KEYS.FOLDERS);
  },

  setAll(folders) {
    StorageService.setJSON(STORAGE_KEYS.FOLDERS, folders);
  },

  create(folderName) {
    const folders = this.getAll();
    const newFolder = { id: Utils.generateId(), name: folderName.trim() };
    folders.push(newFolder);
    this.setAll(folders);
    return newFolder;
  },

  update(folderId, newName) {
    const folders = this.getAll();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return null;
    folder.name = newName.trim();
    this.setAll(folders);
    return folder;
  },

  delete(folderId) {
    const updatedFolders = this.getAll().filter(f => f.id !== folderId);
    this.setAll(updatedFolders);

    const prompts = PromptService.getAll();
    for (const prompt of prompts) {
      if (Array.isArray(prompt.folderIds)) {
        prompt.folderIds = prompt.folderIds.filter(fid => fid !== folderId);
      }
    }
    PromptService.setAll(prompts);
  }
};
