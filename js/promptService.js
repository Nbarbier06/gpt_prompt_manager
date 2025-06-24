// promptService.js

const PromptService = {
  getAll() {
    return StorageService.getJSON(STORAGE_KEYS.PROMPTS);
  },

  setAll(prompts) {
    StorageService.setJSON(STORAGE_KEYS.PROMPTS, prompts);
  },

  create({ name, description, tags = [], creator = 'Unknown', promptText = '', folderIds = [] }) {
    const prompts = this.getAll();
    const newPrompt = {
      id: Utils.generateId(),
      name: (name || '').trim(),
      description: (description || '').trim(),
      tags: Array.isArray(tags) ? tags : [],
      creator: creator.trim(),
      dateCreated: new Date().toISOString(),
      folderIds: Array.isArray(folderIds) ? folderIds : [],
      isFavorite: false,
      promptText: (promptText || '').trim()
    };
    prompts.push(newPrompt);
    this.setAll(prompts);
    return newPrompt;
  },

  update(promptId, updates) {
    const prompts = this.getAll();
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return null;

    const allowedUpdates = ['name', 'description', 'tags', 'folderIds', 'isFavorite', 'promptText'];
    for (const key of allowedUpdates) {
      if (key in updates) {
        if (key === 'tags' || key === 'folderIds') {
          prompt[key] = Array.isArray(updates[key]) ? updates[key] : [];
        } else if (typeof updates[key] === 'string') {
          prompt[key] = updates[key].trim();
        } else {
          prompt[key] = updates[key];
        }
      }
    }

    this.setAll(prompts);
    return prompt;
  },

  delete(promptId) {
    const updatedPrompts = this.getAll().filter(p => p.id !== promptId);
    this.setAll(updatedPrompts);
  },

  setFavorite(promptId, isFavorite) {
    return this.update(promptId, { isFavorite });
  }
};
