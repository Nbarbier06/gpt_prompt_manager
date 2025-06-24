// utils.js

// Utility functions used across services

const Utils = (() => {
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
      console.warn('CSV parsing warning: unmatched quote detected');
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    return rows;
  }

  return { generateId, escapeCSV, parseCSVContent };
})();
