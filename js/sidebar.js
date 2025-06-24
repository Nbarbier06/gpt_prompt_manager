// sidebar.js
const Sidebar = (() => {
  let currentFolderId = null;
  let sidebarVisible = false;
  let folderDoubleClickTimer = null;
  let toggleButton;

  function init() {
    loadSidebarHTML()
      .then(() => {
        injectSidebarCSS();
        initializeSidebarEvents();
        refreshAllUI();
        createToggleButton();
      })
      .catch(err => console.error("Erreur lors du chargement de la sidebar :", err));
  }

function createToggleButton() {
  toggleButton = document.createElement('button');
  toggleButton.textContent = '≡';
  toggleButton.title = 'Afficher/Masquer la sidebar';
  toggleButton.className = 'myExtension-toggle-button';

  toggleButton.classList.add('toggle-button-style');

  toggleButton.addEventListener('click', () => {
    sidebarVisible = !sidebarVisible;
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (sidebarVisible) {
        sidebar.classList.add('sidebar-visible');
        toggleButton.style.right = '310px';
      } else {
        sidebar.classList.remove('sidebar-visible');
        toggleButton.style.right = '10px';
      }
    }
  });

  document.body.appendChild(toggleButton);
}

function loadSidebarHTML() {
  return fetch(chrome.runtime.getURL('html/sidebar.html'))
    .then(response => response.text())
    .then(html => {
      const container = document.createElement('div');
      container.innerHTML = html.trim();

      const sidebarEl = container.querySelector('.sidebar');
      const modalBackdrop = container.querySelector('.sidebar-modal-backdrop');
      const modalFolderBackdrop = container.querySelector('.sidebar-modal-backdrop-folder');
      const fileInput = container.querySelector('.sidebar-import-file-input');

      if (sidebarEl) document.body.appendChild(sidebarEl);
      if (modalBackdrop) document.body.appendChild(modalBackdrop);
      if (modalFolderBackdrop) document.body.appendChild(modalFolderBackdrop);
      if (fileInput) document.body.appendChild(fileInput);
    });
}

function injectSidebarCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('css/sidebar.css');
  document.head.appendChild(link);
}

// Fonction pour basculer une section
function toggleSection(section, toggleButton) {
  const isCollapsed = section.classList.toggle('myExtension-collapsed');
  toggleButton.textContent = isCollapsed ? '►' : '▼';

  if (isCollapsed) {
    section.style.maxHeight = '50px';
  } else {
    section.style.maxHeight = '';
  }
}


function initializeSidebarEvents() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const searchInput = sidebar.querySelector('.sidebar-search');
  const folderList = sidebar.querySelector('.sidebar-folder-list');
  const promptList = sidebar.querySelector('.sidebar-prompt-list');
  const fab = sidebar.querySelector('.sidebar-fab');
  const fabMenu = sidebar.querySelector('.sidebar-fab-menu');
  const navItems = sidebar.querySelectorAll('.sidebar-nav-item');
  const settingsBtn = sidebar.querySelector('.sidebar-settings-btn');
  const settingsMenu = sidebar.querySelector('.sidebar-settings-menu');
  const importBtn = sidebar.querySelector('.sidebar-import-btn');
  const exportBtn = sidebar.querySelector('.sidebar-export-btn');
  const fileInput = document.querySelector('.sidebar-import-file-input');

  const fabCreatePromptBtn = sidebar.querySelector('.fab-create-prompt-btn');
  const fabCreateFolderBtn = sidebar.querySelector('.fab-create-folder-btn');

  // Gestion des dossiers
  const folderSection = sidebar.querySelector('.sidebar-folders-section');
  const folderToggle = folderSection ? folderSection.querySelector('.sidebar-section-toggle') : null;
  if (folderToggle) {
    folderToggle.addEventListener('click', () => toggleSection(folderSection, folderToggle));
  }

  // Gestion des prompts
  const promptsSection = sidebar.querySelector('.sidebar-prompts-section');
  const promptsToggle = promptsSection ? promptsSection.querySelector('.sidebar-section-toggle') : null;
  if (promptsToggle) {
    promptsToggle.addEventListener('click', () => toggleSection(promptsSection, promptsToggle));
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => refreshPrompts());
    searchInput.addEventListener('input', () => refreshFolders());
  }

  if (fab) {
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fabMenu) {
        fabMenu.style.display = (fabMenu.style.display === 'flex') ? 'none' : 'flex';
      }
    });
  }

  if (fabCreatePromptBtn && fabMenu) {
    fabCreatePromptBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fabMenu.style.display = 'none';
      openPromptModal();
    });
  }

  if (fabCreateFolderBtn && fabMenu) {
    fabCreateFolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fabMenu.style.display = 'none';
      openFolderModal();
    });
  }

  if (navItems) {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        currentFolderId = item.dataset.special;
        refreshPrompts();
        highlightSelectedFolderOrNav();

        // Empêche les changements de taille en recalculant uniquement le contenu
        const promptsSection = document.querySelector('.sidebar-prompts-section');
        if (promptsSection && promptsSection.classList.contains('myExtension-collapsed')) {
          promptsSection.style.maxHeight = '50px';
        } else if (promptsSection) {
          promptsSection.style.maxHeight = '';
        }
      });
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (settingsMenu) {
        settingsMenu.style.display = (settingsMenu.style.display === 'flex') ? 'none' : 'flex';
      }
    });
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
    
        // Vérifier si le fichier est un CSV
        if (!file.name.endsWith('.csv')) {
          alert('Veuillez importer un fichier au format CSV.');
          return;
        }
    
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target.result;
    
          // Validation du contenu CSV
          if (validateCSVContent(csvContent)) {
            CSVService.importPromptsFromCSV(csvContent);
            refreshPrompts();
            showNotification('Importation réussie !');
          }
        };
        reader.readAsText(file);
      }
    });    
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportPrompts();
    });
  }

  if (folderList) {
    folderList.addEventListener('click', (event) => {
      const folderItem = event.target.closest('.sidebar-folder-item');
      if (!folderItem) return;

      if (folderDoubleClickTimer) {
        clearTimeout(folderDoubleClickTimer);
        folderDoubleClickTimer = null;
        const folderId = folderItem.dataset.folderId;
        const folder = FolderService.getAll().find(f => f.id === folderId);
        if (folder) openFolderModal(folder, true);
      } else {
        folderDoubleClickTimer = setTimeout(() => {
          folderDoubleClickTimer = null;
          const folderId = folderItem.dataset.folderId;
          if (currentFolderId === folderId) {
            currentFolderId = 'all';
          } else {
            currentFolderId = folderId;
          }
          refreshPrompts();
          highlightSelectedFolderOrNav();
        }, 300);
      }
    });
  }

  if (promptList) {
    promptList.addEventListener('click', (event) => {
      const editButton = event.target.closest('.edit-prompt-button');
      if (editButton) {
        const li = editButton.closest('.sidebar-prompt-item');
        if (!li) return;

        const promptId = li.dataset.promptId;
        const prompt = PromptService.getAll().find(p => p.id === promptId);

        if (prompt) openPromptModal(prompt); // Ouvrir le modal en mode modification
        return;
      }

      const actionButton = event.target.closest('.sidebar-prompt-action');
      if (!actionButton) return; // Si ce n'est pas un bouton d'action, ignorer.

      const li = actionButton.closest('.sidebar-prompt-item');
      if (!li) return;

      const promptId = li.dataset.promptId;
      const prompt = PromptService.getAll().find(p => p.id === promptId);

      if (!prompt) return;

      // Identifier l'action en fonction du titre ou d'une autre propriété.
      const action = actionButton.title;
      switch (action) {
        case 'Insérer dans ChatGPT':
          ChatGPTIntegration.insertPromptIntoTextbox(prompt.promptText || '');
          break;
        case 'Favori':
          const isFavorite = !prompt.isFavorite;
          PromptService.setFavorite(prompt.id, isFavorite);
          actionButton.textContent = isFavorite ? '★' : '☆';
          break;
        case 'Supprimer':
          PromptService.delete(promptId);
          showNotification('Prompt supprimé avec succès.', 'error');
          refreshPrompts();
          break;
        default:
          console.warn(`Action inconnue : ${action}`);
      }
    });
  }

  // On ne cache plus la section entière, mais seulement la liste interne.
  if (folderToggle && folderSection) {
    folderToggle.addEventListener('click', () => {
      const folderList = folderSection.querySelector('.sidebar-folder-list');
      if (folderList) {
        if (folderList.style.display === 'none') {
          folderList.style.display = '';
        } else {
          folderList.style.display = 'none';
        }
      }
    });
  }

  if (promptsToggle && promptsSection) {
    promptsToggle.addEventListener('click', () => {
      const promptList = promptsSection.querySelector('.sidebar-prompt-list');
      if (promptList) {
        if (promptList.style.display === 'none') {
          promptList.style.display = '';
        } else {
          promptList.style.display = 'none';
        }
      }
    });
  }

  document.addEventListener('click', (e) => {
    const clickedInsideFab = fab && (fab.contains(e.target) || (fabMenu && fabMenu.contains(e.target)));
    if (!clickedInsideFab && fabMenu) {
      fabMenu.style.display = 'none';
    }
    const clickedInsideSettings = settingsBtn && (settingsBtn.contains(e.target) || (settingsMenu && settingsMenu.contains(e.target)));
    if (!clickedInsideSettings && settingsMenu) {
      settingsMenu.style.display = 'none';
    }
  });

  setupPromptModalEvents();
  setupFolderModalEvents();
}

function adjustSectionHeights() {
  const sidebar = document.querySelector('.sidebar');
  const folderSection = sidebar.querySelector('.sidebar-folders-section');
  const promptsSection = sidebar.querySelector('.sidebar-prompts-section');

  if (folderSection && promptsSection) {
    promptsSection.style.maxHeight = '';
  }
}

// Réajustement lors des événements pertinents
window.addEventListener('resize', adjustSectionHeights);
document.addEventListener('DOMContentLoaded', adjustSectionHeights);

function refreshAllUI() {
  refreshFolders();
  refreshPrompts();
  highlightSelectedFolderOrNav();
}
function refreshFolders() {
  const folderList = document.querySelector('.sidebar-folder-list');
  const searchInput = document.querySelector('.sidebar-search');
  if (!folderList) {
    console.error('Erreur : .sidebar-folder-list introuvable.');
    return;
  }

  const existingItems = Array.from(folderList.children);
  let folders = FolderService.getAll();
  const query = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';

  if (query) {
    folders = folders.filter(folder =>
      folder.name && folder.name.toLowerCase().includes(query)
    );
  }

  const folderIds = folders.map(folder => folder.id);

  // Supprimer les éléments obsolètes
  existingItems.forEach(item => {
    if (!folderIds.includes(item.dataset.folderId)) {
      folderList.removeChild(item);
    }
  });

  // Ajouter ou mettre à jour les éléments existants
  folders.forEach(folder => {
    let existingItem = folderList.querySelector(`[data-folder-id="${folder.id}"]`);
    if (existingItem) {
      existingItem.textContent = folder.name; // Mise à jour
    } else {
      const li = document.createElement('li');
      li.className = 'sidebar-folder-item';
      li.dataset.folderId = folder.id;
      li.textContent = folder.name;
      folderList.appendChild(li);
    }
  });

  // Gérer le message "aucun dossier"
  if (folders.length === 0 && !folderList.querySelector('.empty-message')) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Aucun dossier trouvé';
    folderList.appendChild(emptyMessage);
  }
}


function refreshPrompts() {
  const promptList = document.querySelector('.sidebar-prompt-list');
  const searchInput = document.querySelector('.sidebar-search');
  if (!promptList) {
    console.error('Erreur : .sidebar-prompt-list introuvable.');
    return;
  }

  const existingItems = Array.from(promptList.children);
  let prompts = PromptService.getAll();
  const query = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';

  // Filtrer les prompts en fonction du dossier ou des favoris
  if (currentFolderId === 'favorites') {
    prompts = prompts.filter(p => p.isFavorite);
  } else if (currentFolderId && currentFolderId !== 'all') {
    prompts = prompts.filter(p => Array.isArray(p.folderIds) && p.folderIds.includes(currentFolderId));
  }

  // Filtrer par recherche
  if (query) {
    prompts = prompts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.promptText && p.promptText.toLowerCase().includes(query)) ||
      (p.tags && p.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  const promptIds = prompts.map(p => p.id);

  // Supprimer les prompts obsolètes
  existingItems.forEach(item => {
    if (!promptIds.includes(item.dataset.promptId)) {
      promptList.removeChild(item);
    }
  });

  // Ajouter ou mettre à jour les prompts existants
  prompts.forEach(prompt => {
    let existingItem = promptList.querySelector(`[data-prompt-id="${prompt.id}"]`);
    const tagsHTML = prompt.tags?.length ?
      `<div class="sidebar-prompt-tags">${prompt.tags.map(tag => `<span class="sidebar-prompt-tag-pill">${tag}</span>`).join('')}</div>`
      : '';
    const textPreview = prompt.promptText?.slice(0, 100) + (prompt.promptText?.length > 100 ? '...' : '') || '';

    if (existingItem) {
      const nameElement = existingItem.querySelector('.sidebar-prompt-name');
      const tagsElement = existingItem.querySelector('.sidebar-prompt-tags');
      const descriptionElement = existingItem.querySelector('.sidebar-prompt-description');

      if (nameElement) nameElement.textContent = prompt.name;
      if (tagsElement) tagsElement.innerHTML = tagsHTML;
      if (descriptionElement) descriptionElement.textContent = prompt.description;
    } else {
      const li = document.createElement('li');
      li.className = 'sidebar-prompt-item'; 
      li.dataset.promptId = prompt.id;
      li.innerHTML = `
        <div class="sidebar-prompt-header">
          <span class="sidebar-prompt-name">${prompt.name}</span>
          <button class="edit-prompt-button" title="Modifier">✎</button>
        </div>
        <div class="sidebar-prompt-content">
          <p class="sidebar-prompt-description">${prompt.description}</p>
          ${tagsHTML}
        </div>
        <div class="sidebar-prompt-actions">
          <button class="sidebar-prompt-action" title="Insérer dans ChatGPT">💬</button>
          <button class="sidebar-prompt-action" title="Favori">${prompt.isFavorite ? '★' : '☆'}</button>
          <button class="sidebar-prompt-action" title="Supprimer">🗑</button>
        </div>
      `;
      promptList.appendChild(li);
    }
  });

  // Gérer le message "aucun prompt"
  if (prompts.length === 0 && !promptList.querySelector('.empty-message')) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Aucun prompt trouvé';
    promptList.appendChild(emptyMessage);
  };

  if (promptList && prompts.length === 0 && !promptList.querySelector('.empty-message')) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Aucun prompt trouvé';
    promptList.appendChild(emptyMessage);
  }
}

function highlightSelectedFolderOrNav() {
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  const folderItems = document.querySelectorAll('.sidebar-folder-item');

  navItems.forEach(item => item.classList.remove('myExtension-selected'));
  folderItems.forEach(item => item.classList.remove('myExtension-selected'));

  if (!currentFolderId || currentFolderId === 'all') {
    const allItem = document.querySelector('[data-special="all"]');
    if (allItem) allItem.classList.add('myExtension-selected');
  } else if (currentFolderId === 'favorites') {
    const favItem = document.querySelector('[data-special="favorites"]');
    if (favItem) favItem.classList.add('myExtension-selected');
  } else {
    const selectedFolder = document.querySelector(`.sidebar-folder-item[data-folder-id="${currentFolderId}"]`);
    if (selectedFolder) selectedFolder.classList.add('myExtension-selected');
  }
}

function openPromptModal(prompt = null) {
  const backdrop = document.querySelector('.sidebar-modal-backdrop');
  if (!backdrop) return;
  const nameInput = backdrop.querySelector('.modal-prompt-name');
  const descInput = backdrop.querySelector('.modal-prompt-description');
  const textInput = backdrop.querySelector('.modal-prompt-text');
  const tagsInput = backdrop.querySelector('.modal-prompt-tags');
  const foldersSelect = backdrop.querySelector('.modal-prompt-folders');
  const saveBtn = backdrop.querySelector('.modal-save-btn');

  if (!nameInput || !descInput || !textInput || !tagsInput || !foldersSelect || !saveBtn) return;

  const folders = FolderService.getAll();
  foldersSelect.innerHTML = '';
  folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    foldersSelect.appendChild(opt);
  });

  if (prompt) {
    nameInput.value = prompt.name;
    descInput.value = prompt.description || '';
    textInput.value = prompt.promptText || '';
    tagsInput.value = prompt.tags.join(', ');
    saveBtn.dataset.promptId = prompt.id;

    if (prompt.folderIds && prompt.folderIds.length > 0) {
      Array.from(foldersSelect.options).forEach(opt => {
        if (prompt.folderIds.includes(opt.value)) {
          opt.selected = true;
        }
      });
    }
  } else {
    nameInput.value = '';
    descInput.value = '';
    textInput.value = '';
    tagsInput.value = '';
    delete saveBtn.dataset.promptId;
  }

  backdrop.style.display = 'flex';
}

function setupPromptModalEvents() {
  const backdrop = document.querySelector('.sidebar-modal-backdrop');
  if (!backdrop) return;

  const saveBtn = backdrop.querySelector('.modal-save-btn');
  const cancelBtn = backdrop.querySelector('.modal-cancel-btn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const promptId = saveBtn.dataset.promptId;
      const nameInput = backdrop.querySelector('.modal-prompt-name');
      const descInput = backdrop.querySelector('.modal-prompt-description');
      const textInput = backdrop.querySelector('.modal-prompt-text');
      const tagsInput = backdrop.querySelector('.modal-prompt-tags');
      const foldersSelect = backdrop.querySelector('.modal-prompt-folders');

      if (!nameInput || !descInput || !textInput || !tagsInput || !foldersSelect) return;

      const name = nameInput.value.trim();
      const description = descInput.value.trim();
      const promptText = textInput.value.trim();
      const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
      const selectedFolders = Array.from(foldersSelect.selectedOptions).map(o => o.value);

      if (!name) {
        alert('Le nom est obligatoire.');
        return;
      }

      const promptData = {
        name,
        description,
        tags,
        promptText,
        creator: 'Me',
        folderIds: selectedFolders
      };

      if (promptId) {
        PromptService.update(promptId, promptData);
        showNotification('Prompt modifié avec succès.');

      } else {
        PromptService.create(promptData);
        showNotification('Prompt créé avec succès.');
      }

      backdrop.style.display = 'none';
      refreshPrompts();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      backdrop.style.display = 'none';
    });
  }

  // Gestion du focus-trap
  const focusableElements = 'input, textarea, button, select';
  const modal = backdrop.querySelector('.sidebar-modal');
  const firstElement = modal.querySelectorAll(focusableElements)[0];
  const focusableContent = modal.querySelectorAll(focusableElements);
  const lastElement = focusableContent[focusableContent.length - 1];

  backdrop.addEventListener('keydown', (e) => {
    const isTabPressed = e.key === 'Tab';
    const isEscapePressed = e.key === 'Escape';
    const isEnterPressed = e.key === 'Enter';

    if (isEscapePressed) {
      backdrop.style.display = 'none';
      e.preventDefault();
      return;
    }

    if (isEnterPressed) {
      const activeElement = document.activeElement;
      if (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
      ) {
        saveBtn.click(); // Simule un clic sur le bouton "Enregistrer"
        e.preventDefault();
      }
    }

    if (!isTabPressed) return;

    if (e.shiftKey) {
      // Si Maj+Tab, et focus sur le premier élément, revenir au dernier
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Si Tab, et focus sur le dernier élément, revenir au premier
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });

  // Mettre le focus sur le premier champ de la modale à l'ouverture
  firstElement.focus();
}

function openFolderModal(folder = null, editing = false) {
  const backdrop = document.querySelector('.sidebar-modal-backdrop-folder');
  if (!backdrop) return;

  const nameInput = backdrop.querySelector('.modal-folder-name');
  const saveBtn = backdrop.querySelector('.modal-folder-save-btn');
  const cancelBtn = backdrop.querySelector('.modal-folder-cancel-btn');
  const deleteBtn = backdrop.querySelector('.modal-folder-delete-btn');

  if (!nameInput || !saveBtn || !cancelBtn || !deleteBtn) return;

  if (folder && editing) {
    nameInput.value = folder.name;
    saveBtn.dataset.folderId = folder.id;
    deleteBtn.style.display = 'inline-block';
  } else if (folder) {
    nameInput.value = folder.name;
    saveBtn.dataset.folderId = folder.id;
    deleteBtn.style.display = 'inline-block';
  } else {
    nameInput.value = '';
    delete saveBtn.dataset.folderId;
    deleteBtn.style.display = 'none';
  }

  backdrop.style.display = 'flex';
}

function setupFolderModalEvents() {
  const backdrop = document.querySelector('.sidebar-modal-backdrop-folder');
  if (!backdrop) return;

  const saveBtn = backdrop.querySelector('.modal-folder-save-btn');
  const cancelBtn = backdrop.querySelector('.modal-folder-cancel-btn');
  const deleteBtn = backdrop.querySelector('.modal-folder-delete-btn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const folderId = saveBtn.dataset.folderId;
      const nameInput = backdrop.querySelector('.modal-folder-name');
      if (!nameInput) return;

      const name = nameInput.value.trim();
      if (!name) {
        alert('Le nom du dossier est obligatoire.');
        return;
      }

      if (folderId) {
        FolderService.update(folderId, name);
        showNotification('Dossier modifié avec succès.');
      } else {
        FolderService.create(name);
        showNotification('Dossier créé avec succès.');
      }

      backdrop.style.display = 'none';
      refreshFolders();
      refreshPrompts();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      backdrop.style.display = 'none';
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const folderId = saveBtn.dataset.folderId;
      if (!folderId) return;
      if (confirm('Supprimer ce dossier ?')) {
        FolderService.delete(folderId);
        if (currentFolderId === folderId) {
          currentFolderId = 'all';
        }
        backdrop.style.display = 'none';
        showNotification('Dossier supprimé avec succès.', 'error');
        refreshAllUI();
      }
    });
  }

  // Gestion du focus-trap
  const focusableElements = 'input, textarea, button, select';
  const modal = backdrop.querySelector('.sidebar-modal');
  const firstElement = modal.querySelectorAll(focusableElements)[0];
  const focusableContent = modal.querySelectorAll(focusableElements);
  const lastElement = focusableContent[focusableContent.length - 1];

  backdrop.addEventListener('keydown', (e) => {
    const isTabPressed = e.key === 'Tab';
    const isEscapePressed = e.key === 'Escape';

    if (isEscapePressed) {
      backdrop.style.display = 'none';
      e.preventDefault();
      return;
    }

    if (!isTabPressed) return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });

  // Mettre le focus sur le premier champ de la modale à l'ouverture
  firstElement.focus();
}

// Gestion de l'import et validation du contenu
function exportPrompts() {
  const csv = CSVService.exportPromptsToCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prompts_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}


function validateCSVContent(csvContent) {
  const requiredHeaders = ['name', 'description', 'promptText', 'tags']; // Colonnes obligatoires
  const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row);
  if (rows.length < 2) {
    console.error('CSV vide ou mal formaté.');
    alert('Le fichier CSV est vide ou mal formaté.');
    return false;
  }

  const headers = rows[0].split(',').map(header => header.trim());
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    console.error('Colonnes manquantes dans le CSV :', missingHeaders);
    alert(`Colonnes manquantes : ${missingHeaders.join(', ')}`);
    return false;
  }

  // Validation des lignes
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(',').map(cell => cell.trim());
    if (cells.length < requiredHeaders.length) {
      console.error(`Données incomplètes à la ligne ${i + 1}.`);
      alert(`Ligne ${i + 1} : données incomplètes.`);
      return false;
    }
  }

  return true; // CSV valide
}


// Gestion des notifications
function showNotification(message, type = 'success') {
  const container = document.getElementById('myExtension-notification-container');
  if (!container) {
    console.error('Conteneur de notification introuvable.');
    return;
  }

  const notification = document.createElement('div');
  notification.className = `myExtension-notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  // Supprimer la notification après 3 secondes
  setTimeout(() => {
    container.removeChild(notification);
  }, 3000);
}
  return { init };
})();
