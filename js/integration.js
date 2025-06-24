// integration.js

/**
 * ChatGPTIntegration
 * Fournit des fonctions pour interagir avec la page de ChatGPT.
 * Par exemple, insérer un prompt dans la zone de texte.
 */

const ChatGPTIntegration = {
  insertPromptIntoTextbox(promptText) {
    const editor = document.querySelector('#prompt-textarea.ProseMirror');
    if (editor) {
      editor.focus();

      // Remplace les \n (échappés) par des sauts de ligne HTML
      const normalized = promptText
        .replace(/\\n/g, '\n')             // Transformer les \n en vrais sauts de ligne
        .replace(/\r\n|\r|\n/g, '\n');    // Uniformiser tout en \n (sécurité)

      const paragraphs = normalized
        .split('\n')
        .map(line => `<p>${line.trim() || '<br>'}</p>`) // ligne vide = saut de ligne
        .join('');

      editor.innerHTML = paragraphs || '<p><br></p>';

      const inputEvent = new Event('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
    } else {
      console.warn('Impossible de trouver la zone d’édition de ChatGPT (ProseMirror).');
    }
  }
};
