window.addEventListener('DOMContentLoaded', () => {
    const ipcRenderer = window.electron?.ipcRenderer;
  
    if (!ipcRenderer) {
      console.error('ipcRenderer is not available on window.electron');
      return;
    }
  
    ipcRenderer.on('set-questions', (event, rawQuestions) => {
      console.log('[questionsRenderer] Received raw questions:', rawQuestions);
  
      const listElement = document.getElementById('questions-list');
      if (!listElement) return;
  
      listElement.innerHTML = '';
  
      let questions = [];
      if (typeof rawQuestions === 'string') {
        // If it's a single big string like "1. ... 2. ...", split it
        questions = rawQuestions.split(/\n?\d+\.\s+/).filter(Boolean);
      } else if (Array.isArray(rawQuestions)) {
        questions = rawQuestions;
      }
  
      if (questions.length > 0) {
        questions.forEach(q => {
          const li = document.createElement('li');
          li.textContent = q.trim();
          listElement.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No questions available.';
        listElement.appendChild(li);
      }
    });
  });
  