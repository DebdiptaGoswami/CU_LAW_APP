import { marked } from 'marked';

// DOM Elements
const body = document.body;
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toast = document.getElementById('toast');

// History Drawer Elements
const openHistoryBtn = document.getElementById('openHistoryBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyOverlay = document.getElementById('history-overlay');
const historyDrawer = document.getElementById('history-drawer');
const historyList = document.getElementById('history-list');

// Generator Elements
const subjectSelect = document.getElementById('subject-select');
const marksSelect = document.getElementById('marks-select');
const questionInput = document.getElementById('question');
const textCounter = document.getElementById('textCounter');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const skeletonLoader = document.getElementById('skeletonLoader');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const copyBtn = document.getElementById('copyBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const readAloudBtn = document.getElementById('readAloudBtn');

// Search Elements
const searchTopicInput = document.getElementById('search-topic');
const searchBtn = document.getElementById('searchBtn');
const searchBtnText = document.getElementById('searchBtnText');
const searchSkeletonLoader = document.getElementById('searchSkeletonLoader');
const searchOutputSection = document.getElementById('searchOutputSection');
const searchOutputContent = document.getElementById('searchOutputContent');

// -----------------------------------------------------------------------------
// Toast Notification
// -----------------------------------------------------------------------------
const showToast = (message, duration = 3000) => {
  toast.textContent = message;
  toast.classList.remove('hidden');
  // Small delay to allow CSS transition to kick in
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 400); // wait for transition
  }, duration);
};

// -----------------------------------------------------------------------------
// Theme Management
// -----------------------------------------------------------------------------
const initTheme = () => {
  const savedTheme = localStorage.getItem('cu_law_theme');
  if (savedTheme === 'light') {
    body.classList.add('light-theme');
  }
};
initTheme();

themeToggleBtn.addEventListener('click', () => {
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  localStorage.setItem('cu_law_theme', isLight ? 'light' : 'dark');
});

// -----------------------------------------------------------------------------
// History Management
// -----------------------------------------------------------------------------
let historyData = JSON.parse(localStorage.getItem('cu_law_history') || '[]');

const saveToHistory = (entry) => {
  // entry = { type: 'answer'|'search', query: string, subject?: string, marks?: string, answer: string, timestamp: number }
  historyData.unshift(entry);
  if (historyData.length > 5) historyData.pop(); // Keep only last 5
  localStorage.setItem('cu_law_history', JSON.stringify(historyData));
  renderHistory();
};

const renderHistory = () => {
  historyList.innerHTML = '';
  if (historyData.length === 0) {
    historyList.innerHTML = '<p class="empty-history">No recent history found.</p>';
    return;
  }

  historyData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <h4>${item.type === 'search' ? '🔍 Case Search' : '📝 Answer Gen'}</h4>
      <p><strong>Q:</strong> ${item.query}</p>
    `;
    card.addEventListener('click', () => loadHistoryItem(index));
    historyList.appendChild(card);
  });
};

const loadHistoryItem = (index) => {
  const item = historyData[index];
  closeDrawer();

  if (item.type === 'answer') {
    document.querySelector('[data-tab="tab-generator"]').click();
    questionInput.value = item.query;
    subjectSelect.value = item.subject;
    marksSelect.value = item.marks;
    outputContent.innerHTML = marked.parse(item.answer);
    outputSection.classList.remove('hidden');
    updateCounter();
  } else {
    document.querySelector('[data-tab="tab-search"]').click();
    searchTopicInput.value = item.query;
    searchOutputContent.innerHTML = marked.parse(item.answer);
    searchOutputSection.classList.remove('hidden');
  }
};

const openDrawer = () => {
  renderHistory();
  historyOverlay.classList.remove('hidden');
  setTimeout(() => historyOverlay.classList.add('show'), 10);
  historyDrawer.classList.add('open');
};

const closeDrawer = () => {
  historyDrawer.classList.remove('open');
  historyOverlay.classList.remove('show');
  setTimeout(() => historyOverlay.classList.add('hidden'), 300);
};

openHistoryBtn.addEventListener('click', openDrawer);
closeHistoryBtn.addEventListener('click', closeDrawer);
historyOverlay.addEventListener('click', closeDrawer);

// -----------------------------------------------------------------------------
// Tab Switching
// -----------------------------------------------------------------------------
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.remove('hidden');
  });
});

// -----------------------------------------------------------------------------
// Textarea Counter
// -----------------------------------------------------------------------------
const updateCounter = () => {
  const text = questionInput.value.trim();
  const chars = text.length;
  const words = text === '' ? 0 : text.split(/\s+/).length;
  textCounter.textContent = `${words} words | ${chars} characters`;
};
questionInput.addEventListener('input', updateCounter);

// -----------------------------------------------------------------------------
// Generator Logic
// -----------------------------------------------------------------------------
let currentRawMarkdown = '';

const generateAnswer = async () => {
  const question = questionInput.value.trim();
  const subject = subjectSelect.value;
  const marks = marksSelect.value;

  if (!question) {
    showToast('Please enter an exam question.');
    return;
  }

  // UI state updates
  generateBtn.disabled = true;
  generateBtn.classList.remove('pulse-hover');
  btnText.textContent = 'Generating...';
  
  outputSection.classList.remove('hidden');
  outputContent.classList.add('hidden');
  skeletonLoader.classList.remove('hidden'); // Show shimmer

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'answer', question, subject, marks }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server responded with an error');
    }

    currentRawMarkdown = data.answer;
    outputContent.innerHTML = marked.parse(data.answer);
    
    // Save to history
    saveToHistory({
      type: 'answer',
      query: question,
      subject,
      marks,
      answer: data.answer,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error:', error);
    showToast(`Error: ${error.message || 'Failed to connect.'}`);
    outputSection.classList.add('hidden');
  } finally {
    generateBtn.disabled = false;
    generateBtn.classList.add('pulse-hover');
    btnText.textContent = 'Generate Answer';
    skeletonLoader.classList.add('hidden');
    outputContent.classList.remove('hidden');
  }
};

generateBtn.addEventListener('click', generateAnswer);

// -----------------------------------------------------------------------------
// Action Toolbar Logic
// -----------------------------------------------------------------------------
copyBtn.addEventListener('click', async () => {
  if (!currentRawMarkdown) return;
  try {
    await navigator.clipboard.writeText(currentRawMarkdown);
    showToast('Markdown copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
});

downloadPdfBtn.addEventListener('click', () => {
  const element = document.getElementById('outputContent');
  if (!element.innerHTML.trim()) return;
  
  const wrapper = document.createElement('div');
  wrapper.innerHTML = element.innerHTML;
  wrapper.className = 'markdown-body';
  wrapper.style.color = '#000';
  wrapper.style.backgroundColor = '#fff';
  wrapper.style.padding = '20px';
  wrapper.style.fontSize = '12pt';
  
  const headings = wrapper.querySelectorAll('h1, h2, h3, strong');
  headings.forEach(h => h.style.color = '#000');
  
  const blockquotes = wrapper.querySelectorAll('blockquote');
  blockquotes.forEach(bq => {
    bq.style.color = '#333';
    bq.style.backgroundColor = '#f9f9f9';
    bq.style.borderLeftColor = '#8a2be2';
  });

  const opt = {
    margin:       0.75,
    filename:     'CU_Law_Answer_Script.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF:        { unit: 'in', format: 'A4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(wrapper).save();
  showToast('PDF Downloading...');
});

// Text-to-Speech (Read Aloud)
let isSpeaking = false;
readAloudBtn.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech not supported in this browser.');
    return;
  }

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    showToast('Audio stopped.');
    return;
  }

  const textToRead = outputContent.innerText; // Get plain text without HTML tags
  if (!textToRead.trim()) return;

  const utterance = new SpeechSynthesisUtterance(textToRead);
  utterance.rate = 1.0;
  
  utterance.onend = () => { isSpeaking = false; };
  utterance.onerror = () => { isSpeaking = false; showToast('Speech synthesis interrupted.'); };
  
  window.speechSynthesis.speak(utterance);
  isSpeaking = true;
  showToast('Reading answer aloud... (Click again to stop)');
});

// -----------------------------------------------------------------------------
// Search Logic
// -----------------------------------------------------------------------------
const searchCases = async () => {
  const topic = searchTopicInput.value.trim();

  if (!topic) {
    showToast('Please enter a legal topic.');
    return;
  }

  searchBtn.disabled = true;
  searchBtn.classList.remove('pulse-hover');
  searchBtnText.textContent = 'Searching...';
  
  searchOutputSection.classList.remove('hidden');
  searchOutputContent.classList.add('hidden');
  searchSkeletonLoader.classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'search', topic }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Server responded with an error');
    }

    searchOutputContent.innerHTML = marked.parse(data.answer);
    
    saveToHistory({
      type: 'search',
      query: topic,
      answer: data.answer,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error searching cases:', error);
    showToast(`Error: ${error.message || 'Failed to search.'}`);
    searchOutputSection.classList.add('hidden');
  } finally {
    searchBtn.disabled = false;
    searchBtn.classList.add('pulse-hover');
    searchBtnText.textContent = 'Search Cases';
    searchSkeletonLoader.classList.add('hidden');
    searchOutputContent.classList.remove('hidden');
  }
};

searchBtn.addEventListener('click', searchCases);
searchTopicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchCases();
});
