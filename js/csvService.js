// csvService.js

const CSVService = {
  exportPromptsToCSV() {
    const prompts = PromptService.getAll();
    const header = ['name', 'description', 'tags', 'creator', 'dateCreated', 'promptText', 'folderIds'];
    const rows = prompts.map(p => [
      Utils.escapeCSV(p.name),
      Utils.escapeCSV(p.description),
      Utils.escapeCSV((p.tags || []).join(',')),
      Utils.escapeCSV(p.creator),
      p.dateCreated,
      Utils.escapeCSV(p.promptText),
      Utils.escapeCSV((p.folderIds || []).join(','))
    ]);
    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  importPromptsFromCSV(csvContent) {
    if (typeof csvContent !== 'string') return;

    const rows = Utils.parseCSVContent(csvContent);
    const header = rows.shift();
    if (!header || header.length < 7) {
      console.warn('CSV import aborted: header is invalid or incomplete.');
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
        console.warn('Skipping incomplete CSV row:', columns);
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
        id: Utils.generateId(),
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
