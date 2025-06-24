// services.js

const STORAGE_KEYS = {
  PROMPTS: 'myExtension_prompts',
  FOLDERS: 'myExtension_folders'
};

function generateId() {
  return 'id-' + Math.random().toString(36).substr(2, 9);
}

function escapeCSV(val) {
  if (!val) return '';
  const needsQuotes = val.includes(',') || val.includes('"') || val.includes('\n');
  return needsQuotes ? `"${val.replace(/"/g, '""')}"` : val;
}

function parseCSVContent(csvContent) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvContent.length) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // handle \r\n
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
    i++;
  }

  // Fin de fichier sans retour à la ligne
  if (inQuotes) {
    console.warn("CSV parsing warning: unmatched quote detected");
  }

  // Push the last row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

const StorageService = {
  getJSON(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const FolderService = {
  getAll() {
    return StorageService.getJSON(STORAGE_KEYS.FOLDERS);
  },

  setAll(folders) {
    StorageService.setJSON(STORAGE_KEYS.FOLDERS, folders);
  },

  create(folderName) {
    const folders = this.getAll();
    const newFolder = { id: generateId(), name: folderName.trim() };
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
      id: generateId(),
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

const CSVService = {
  exportPromptsToCSV() {
    const prompts = PromptService.getAll();
    const header = ['name', 'description', 'tags', 'creator', 'dateCreated', 'promptText', 'folderIds'];
    const rows = prompts.map(p => [
      escapeCSV(p.name),
      escapeCSV(p.description),
      escapeCSV((p.tags || []).join(',')),
      escapeCSV(p.creator),
      p.dateCreated,
      escapeCSV(p.promptText),
      escapeCSV((p.folderIds || []).join(','))
    ]);
    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  importPromptsFromCSV(csvContent) {
    if (typeof csvContent !== 'string') return;

    const rows = parseCSVContent(csvContent);
    const header = rows.shift();
    if (!header || header.length < 7) {
      console.warn("CSV import aborted: header is invalid or incomplete.");
      return;
    }

    const nameIdx = header.indexOf('name');
    const descIdx = header.indexOf('description');
    const tagsIdx = header.indexOf('tags');
    const creatorIdx = header.indexOf('creator');
    const dateCreatedIdx = header.indexOf('dateCreated');
    const promptTextIdx = header.indexOf('promptText');
    const folderIdsIdx = header.indexOf('folderIds');

    const prompts = PromptService.getAll();

    for (const columns of rows) {
      if (columns.length < 7) {
        console.warn("Skipping incomplete CSV row:", columns);
        continue;
      }

      const name = columns[nameIdx] || '';
      const description = columns[descIdx] || '';
      const tags = (columns[tagsIdx] || '').split(',').map(t => t.trim()).filter(Boolean);
      const creator = columns[creatorIdx] || 'Unknown';
      const dateCreated = columns[dateCreatedIdx] || new Date().toISOString();
      const promptText = columns[promptTextIdx] || '';
      const folderIds = (columns[folderIdsIdx] || '').split(',').map(f => f.trim()).filter(Boolean);

      prompts.push({
        id: generateId(),
        name: name.trim(),
        description: description.trim(),
        tags,
        creator: creator.trim(),
        dateCreated: dateCreated.trim(),
        promptText: promptText.trim(),
        folderIds,
        isFavorite: false
      });
    }

    PromptService.setAll(prompts);
  }
};
