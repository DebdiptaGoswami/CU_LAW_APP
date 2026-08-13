import { marked } from 'marked';

// DOM Elements
const subjectSelect = document.getElementById('subject-select');
const marksSelect = document.getElementById('marks-select');
const questionInput = document.getElementById('question');
const generateBtn = document.getElementById('generateBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.getElementById('loadingSpinner');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const copyBtn = document.getElementById('copyBtn');

// No client-side API key logic needed.

const generateAnswer = async () => {
  const question = questionInput.value.trim();
  const subject = subjectSelect.value;
  const marks = marksSelect.value;

  if (!question) {
    alert('Please enter an exam question.');
    return;
  }

  // UI state updates
  generateBtn.disabled = true;
  downloadPdfBtn.disabled = true;
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
      body: JSON.stringify({ question, subject, marks }),
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
    
    if (outputContent.innerHTML.trim() !== '') {
      downloadPdfBtn.disabled = false;
    }
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

// Download PDF functionality
downloadPdfBtn.addEventListener('click', () => {
  const element = document.getElementById('outputContent');
  
  // Create a wrapper for clean PDF rendering (overriding dark mode styles)
  const wrapper = document.createElement('div');
  wrapper.innerHTML = element.innerHTML;
  wrapper.className = 'markdown-body';
  wrapper.style.color = '#000';
  wrapper.style.backgroundColor = '#fff';
  wrapper.style.padding = '20px';
  wrapper.style.fontSize = '12pt';
  
  // Override h2 and blockquote colors inside wrapper
  const headings = wrapper.querySelectorAll('h1, h2, h3, strong');
  headings.forEach(h => h.style.color = '#000');
  
  const blockquotes = wrapper.querySelectorAll('blockquote');
  blockquotes.forEach(bq => {
    bq.style.color = '#333';
    bq.style.backgroundColor = '#f9f9f9';
    bq.style.borderLeftColor = '#8a2be2';
  });

  const opt = {
    margin:       0.75, // 0.75 inch margin
    filename:     'CU_Law_Answer_Script.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(wrapper).save();
});

// Tab Switching Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons and hide all contents
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));

    // Add active class to clicked button and show corresponding content
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.remove('hidden');
  });
});

// DOM Elements for Search
const searchTopicInput = document.getElementById('search-topic');
const searchBtn = document.getElementById('searchBtn');
const searchBtnText = document.getElementById('searchBtnText');
const searchLoadingSpinner = document.getElementById('searchLoadingSpinner');
const searchOutputSection = document.getElementById('searchOutputSection');
const searchOutputContent = document.getElementById('searchOutputContent');

const searchCases = async () => {
  const topic = searchTopicInput.value.trim();

  if (!topic) {
    alert('Please enter a legal topic to search.');
    return;
  }

  // UI state updates
  searchBtn.disabled = true;
  searchBtnText.textContent = 'Searching...';
  searchLoadingSpinner.classList.remove('hidden');
  searchOutputSection.classList.add('hidden');
  searchOutputContent.innerHTML = '';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'search', topic }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server responded with an error');
    }

    // Parse Markdown and update UI
    searchOutputContent.innerHTML = marked.parse(data.answer);
    searchOutputSection.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error searching cases:', error);
    alert(`Error: ${error.message || 'Failed to search cases. Please try again.'}`);
  } finally {
    searchBtn.disabled = false;
    searchBtnText.textContent = 'Search Cases';
    searchLoadingSpinner.classList.add('hidden');
  }
};

searchBtn.addEventListener('click', searchCases);
searchTopicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchCases();
  }
});
