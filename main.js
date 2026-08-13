import { marked } from 'marked';

// DOM Elements
const questionInput = document.getElementById('question');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.getElementById('loadingSpinner');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const copyBtn = document.getElementById('copyBtn');

// No client-side API key logic needed.

const generateAnswer = async () => {
  const question = questionInput.value.trim();

  if (!question) {
    alert('Please enter an exam question.');
    return;
  }

  // UI state updates
  generateBtn.disabled = true;
  btnText.textContent = 'Generating Answer...';
  loadingSpinner.classList.remove('hidden');
  outputSection.classList.add('hidden');
  outputContent.innerHTML = '';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server responded with an error');
    }

    // Parse Markdown and update UI
    outputContent.innerHTML = marked.parse(data.answer);
    outputSection.classList.remove('hidden');
    
    // Smooth scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    console.error('Error generating answer:', error);
    alert(`Error: ${error.message || 'Failed to generate answer. Please try again.'}`);
  } finally {
    // Reset UI state
    generateBtn.disabled = false;
    btnText.textContent = 'Generate Answer';
    loadingSpinner.classList.add('hidden');
  }
};

generateBtn.addEventListener('click', generateAnswer);

// Handle Enter key in textarea (Ctrl+Enter to submit)
questionInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    generateAnswer();
  }
});

// Copy to clipboard functionality
copyBtn.addEventListener('click', async () => {
  const textToCopy = outputContent.innerText;
  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Visual feedback
    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    
    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});
