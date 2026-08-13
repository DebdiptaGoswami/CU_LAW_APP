import { marked } from 'marked';

// -----------------------------------------------------------------------------
// Subjects Data (Used across Generator, Evaluator, Flashcards)
// -----------------------------------------------------------------------------
const subjectsData = [
  { group: "Semester 1", subjects: ["General Principles of Law of Contract", "Family Law - I"] },
  { group: "Semester 2", subjects: ["Special Contract", "Family Law - II"] },
  { group: "Semester 3", subjects: ["Competition Law", "Law of Torts including MV Accident"] },
  { group: "Semester 4", subjects: ["Constitutional Law - I", "Law of Crimes - I (BNS)", "Land Laws"] },
  { group: "Semester 5", subjects: ["Constitutional Law - II", "Administrative Law", "Property Law"] },
  { group: "Semester 6", subjects: ["Law of Crimes - II (BNSS)", "Civil Procedure Code", "Law of Copyright", "Jurisprudence"] },
  { group: "Semester 7", subjects: ["Public International Law", "Banking Law", "Law of Evidence (BSA)"] },
  { group: "Semester 8", subjects: ["Human Rights Law", "Interpretation of Statutes", "Labour Law - I"] },
  { group: "Semester 9", subjects: ["Company Law", "Information Technology Law", "Labour Law - II"] },
  { group: "Semester 10", subjects: ["Taxation Law (Income Tax & GST)", "Environmental Law"] }
];

const populateSubjects = () => {
  const selects = ['subject-select', 'evaluator-subject', 'flashcard-subject'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    subjectsData.forEach(semester => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = semester.group;
      semester.subjects.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        optgroup.appendChild(option);
      });
      el.appendChild(optgroup);
    });
  });
};
populateSubjects();

// -----------------------------------------------------------------------------
// Global DOM & Utilities
// -----------------------------------------------------------------------------
const body = document.body;
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toast = document.getElementById('toast');

const showToast = (message, duration = 3000) => {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 400);
  }, duration);
};

const initTheme = () => {
  if (localStorage.getItem('cu_law_theme') === 'light') body.classList.add('light-theme');
};
initTheme();
themeToggleBtn.addEventListener('click', () => {
  body.classList.toggle('light-theme');
  localStorage.setItem('cu_law_theme', body.classList.contains('light-theme') ? 'light' : 'dark');
});

// Tab Switching Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.getAttribute('data-tab')).classList.remove('hidden');
  });
});

// -----------------------------------------------------------------------------
// History Drawer
// -----------------------------------------------------------------------------
let historyData = JSON.parse(localStorage.getItem('cu_law_history') || '[]');
const historyList = document.getElementById('history-list');
const historyOverlay = document.getElementById('history-overlay');
const historyDrawer = document.getElementById('history-drawer');

const saveToHistory = (entry) => {
  historyData.unshift(entry);
  if (historyData.length > 5) historyData.pop();
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
    let icon = '📝';
    let title = 'Answer';
    if (item.type === 'search') { icon = '🔍'; title = 'Search'; }
    else if (item.type === 'evaluate') { icon = '⚖️'; title = 'Eval'; }
    else if (item.type === 'decode') { icon = '📖'; title = 'Decoder'; }
    
    card.innerHTML = `<h4>${icon} ${title}</h4><p><strong>Q:</strong> ${item.query}</p>`;
    card.addEventListener('click', () => loadHistoryItem(index));
    historyList.appendChild(card);
  });
};

const loadHistoryItem = (index) => {
  const item = historyData[index];
  closeDrawer();
  if (item.type === 'answer') {
    document.querySelector('[data-tab="tab-generator"]').click();
    document.getElementById('question').value = item.query;
    document.getElementById('outputContent').innerHTML = marked.parse(item.answer);
    document.getElementById('outputSection').classList.remove('hidden');
  } else if (item.type === 'search') {
    document.querySelector('[data-tab="tab-search"]').click();
    document.getElementById('search-topic').value = item.query;
    document.getElementById('searchOutputContent').innerHTML = marked.parse(item.answer);
    document.getElementById('searchOutputSection').classList.remove('hidden');
  } else if (item.type === 'evaluate') {
    document.querySelector('[data-tab="tab-evaluator"]').click();
    renderScorecard(JSON.parse(item.answer));
  } else if (item.type === 'decode') {
    document.querySelector('[data-tab="tab-decoder"]').click();
    if(item.statute) document.getElementById('decode-statute').value = item.statute;
    document.getElementById('decode-section').value = item.query;
    document.getElementById('decodeOutputContent').innerHTML = marked.parse(item.answer);
    document.getElementById('decodeOutputSection').classList.remove('hidden');
    currentDecoderMarkdown = item.answer;
  }
};

const openDrawer = () => { renderHistory(); historyOverlay.classList.remove('hidden'); setTimeout(() => historyOverlay.classList.add('show'), 10); historyDrawer.classList.add('open'); };
const closeDrawer = () => { historyDrawer.classList.remove('open'); historyOverlay.classList.remove('show'); setTimeout(() => historyOverlay.classList.add('hidden'), 300); };
document.getElementById('openHistoryBtn').addEventListener('click', openDrawer);
document.getElementById('closeHistoryBtn').addEventListener('click', closeDrawer);
historyOverlay.addEventListener('click', closeDrawer);

// -----------------------------------------------------------------------------
// Evaluator Logic
// -----------------------------------------------------------------------------
const evaluatorBtn = document.getElementById('evaluatorBtn');
const evalFileInput = document.getElementById('evaluator-image');
const evalTextInput = document.getElementById('evaluator-text');

let base64Image = null;

evalFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => { base64Image = reader.result.split(',')[1]; };
  reader.readAsDataURL(file);
});

evaluatorBtn.addEventListener('click', async () => {
  const subject = document.getElementById('evaluator-subject').value;
  const marks = document.getElementById('evaluator-marks').value;
  const question = document.getElementById('evaluator-question').value.trim();
  const textAnswer = evalTextInput.value.trim();

  if (!question) return showToast("Please enter the exam question context.");
  if (!base64Image && !textAnswer) return showToast("Please upload an image or paste text.");

  evaluatorBtn.disabled = true;
  document.getElementById('evaluatorBtnText').textContent = 'Evaluating Script...';
  document.getElementById('evaluatorLoadingSpinner').classList.remove('hidden');
  document.getElementById('evaluatorOutputSection').classList.remove('hidden');
  document.getElementById('evaluatorDashboard').classList.add('hidden');
  document.getElementById('evaluatorSkeleton').classList.remove('hidden');

  try {
    const payload = { type: 'evaluate', subject, marks, question };
    if (base64Image) payload.image = base64Image;
    if (textAnswer) payload.textAnswer = textAnswer;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    const scorecard = JSON.parse(data.answer); // expects JSON string from API
    renderScorecard(scorecard);
    
    saveToHistory({ type: 'evaluate', query: question, answer: data.answer, timestamp: Date.now() });
  } catch (error) {
    console.error(error);
    showToast(`Evaluation Failed: ${error.message}`);
  } finally {
    evaluatorBtn.disabled = false;
    document.getElementById('evaluatorBtnText').textContent = 'Evaluate Answer Script';
    document.getElementById('evaluatorLoadingSpinner').classList.add('hidden');
    document.getElementById('evaluatorSkeleton').classList.add('hidden');
  }
});

const renderScorecard = (data) => {
  // data = { score: 12, maxMarks: 16, grade: "A+", statProg: 80, caseProg: 75, structProg: 90, termProg: 85, strengths: [], weaknesses: [], tips: [] }
  document.getElementById('evalScore').textContent = `${data.score} / ${data.maxMarks}`;
  document.getElementById('evalGrade').textContent = data.grade;
  
  setTimeout(() => {
    document.getElementById('prog-stat').style.width = `${data.statProg}%`;
    document.getElementById('prog-case').style.width = `${data.caseProg}%`;
    document.getElementById('prog-struct').style.width = `${data.structProg}%`;
    document.getElementById('prog-term').style.width = `${data.termProg}%`;
  }, 100);

  const fillList = (id, items) => {
    document.getElementById(id).innerHTML = items.map(i => `<li>${i}</li>`).join('');
  };
  fillList('evalStrengths', data.strengths);
  fillList('evalWeaknesses', data.weaknesses);
  fillList('evalTips', data.tips);
  
  document.getElementById('evaluatorDashboard').classList.remove('hidden');
};

// -----------------------------------------------------------------------------
// Flashcards Logic
// -----------------------------------------------------------------------------
let flashcardsDeck = JSON.parse(localStorage.getItem('cu_law_flashcards') || '[]');
let fcIndex = 0;

const fcContainer = document.getElementById('flashcardContainer');
const fcFlipBtn = document.getElementById('fcFlipBtn');
const fcPrevBtn = document.getElementById('fcPrevBtn');
const fcNextBtn = document.getElementById('fcNextBtn');

const renderFlashcard = () => {
  if (flashcardsDeck.length === 0) return;
  const card = flashcardsDeck[fcIndex];
  fcContainer.classList.remove('flipped'); // Reset flip state
  
  document.getElementById('fcCurrent').textContent = fcIndex + 1;
  document.getElementById('fcTotal').textContent = flashcardsDeck.length;
  
  setTimeout(() => {
    document.getElementById('fcFrontSubject').textContent = card.subject || 'Law';
    document.getElementById('fcFrontTopic').textContent = card.topic;
    document.getElementById('fcFrontTitle').textContent = card.caseName;
    document.getElementById('fcBackFacts').textContent = card.facts;
    document.getElementById('fcBackIssue').textContent = card.issue;
    document.getElementById('fcBackRatio').textContent = card.ratio;
    document.getElementById('fcBackSection').textContent = card.section;
  }, 150); // wait half of flip animation to change text if it was flipped

  fcPrevBtn.disabled = fcIndex === 0;
  fcNextBtn.disabled = fcIndex === flashcardsDeck.length - 1;
};

document.getElementById('generateFlashcardsBtn').addEventListener('click', async () => {
  const subject = document.getElementById('flashcard-subject').value;
  const count = document.getElementById('flashcard-count').value;
  
  const btn = document.getElementById('generateFlashcardsBtn');
  btn.disabled = true;
  document.getElementById('fcBtnText').textContent = 'Generating Deck...';
  document.getElementById('fcLoadingSpinner').classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'flashcards', subject, count })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    flashcardsDeck = JSON.parse(data.answer); // Expect array of JSON objects
    localStorage.setItem('cu_law_flashcards', JSON.stringify(flashcardsDeck));
    fcIndex = 0;
    
    document.getElementById('flashcardViewer').classList.remove('hidden');
    document.getElementById('flashcardSetupSection').classList.add('hidden');
    renderFlashcard();
  } catch (err) {
    showToast(`Flashcard Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    document.getElementById('fcBtnText').textContent = 'Generate Flashcard Deck';
    document.getElementById('fcLoadingSpinner').classList.add('hidden');
  }
});

// Flip and Nav Controls
fcContainer.addEventListener('click', () => fcContainer.classList.toggle('flipped'));
fcFlipBtn.addEventListener('click', () => fcContainer.classList.toggle('flipped'));

fcPrevBtn.addEventListener('click', () => { if (fcIndex > 0) { fcIndex--; renderFlashcard(); }});
fcNextBtn.addEventListener('click', () => { if (fcIndex < flashcardsDeck.length - 1) { fcIndex++; renderFlashcard(); }});

document.getElementById('newDeckBtn').addEventListener('click', () => {
  document.getElementById('flashcardViewer').classList.add('hidden');
  document.getElementById('flashcardSetupSection').classList.remove('hidden');
});

// Auto-load if deck exists
if (flashcardsDeck.length > 0) {
  document.getElementById('flashcardViewer').classList.remove('hidden');
  document.getElementById('flashcardSetupSection').classList.add('hidden');
  renderFlashcard();
}

// -----------------------------------------------------------------------------
// Answer Generator Logic (Original with minor updates)
// -----------------------------------------------------------------------------
let currentRawMarkdown = '';
const questionInput = document.getElementById('question');
const generateBtn = document.getElementById('generateBtn');

document.getElementById('textCounter') && questionInput.addEventListener('input', () => {
  const t = questionInput.value.trim();
  document.getElementById('textCounter').textContent = `${t === '' ? 0 : t.split(/\s+/).length} words | ${t.length} characters`;
});

generateBtn.addEventListener('click', async () => {
  const question = questionInput.value.trim();
  if (!question) return showToast('Please enter an exam question.');
  
  generateBtn.disabled = true;
  document.querySelector('#generateBtn .btn-text').textContent = 'Generating...';
  document.getElementById('outputSection').classList.remove('hidden');
  document.getElementById('outputContent').classList.add('hidden');
  document.getElementById('skeletonLoader').classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'answer', question, subject: document.getElementById('subject-select').value, marks: document.getElementById('marks-select').value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentRawMarkdown = data.answer;
    document.getElementById('outputContent').innerHTML = marked.parse(data.answer);
    saveToHistory({ type: 'answer', query: question, answer: data.answer, timestamp: Date.now() });
  } catch (error) {
    showToast(`Error: ${error.message}`);
    document.getElementById('outputSection').classList.add('hidden');
  } finally {
    generateBtn.disabled = false;
    document.querySelector('#generateBtn .btn-text').textContent = 'Generate Answer';
    document.getElementById('skeletonLoader').classList.add('hidden');
    document.getElementById('outputContent').classList.remove('hidden');
  }
});

// -----------------------------------------------------------------------------
// Search Logic (Original with minor updates)
// -----------------------------------------------------------------------------
document.getElementById('searchBtn').addEventListener('click', async () => {
  const topic = document.getElementById('search-topic').value.trim();
  if (!topic) return showToast('Please enter a legal topic.');
  
  document.getElementById('searchBtn').disabled = true;
  document.getElementById('searchBtnText').textContent = 'Searching...';
  document.getElementById('searchOutputSection').classList.remove('hidden');
  document.getElementById('searchOutputContent').classList.add('hidden');
  document.getElementById('searchSkeletonLoader').classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'search', topic }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('searchOutputContent').innerHTML = marked.parse(data.answer);
    saveToHistory({ type: 'search', query: topic, answer: data.answer, timestamp: Date.now() });
  } catch (error) {
    showToast(`Error: ${error.message}`);
    document.getElementById('searchOutputSection').classList.add('hidden');
  } finally {
    document.getElementById('searchBtn').disabled = false;
    document.getElementById('searchBtnText').textContent = 'Search Cases';
    document.getElementById('searchSkeletonLoader').classList.add('hidden');
    document.getElementById('searchOutputContent').classList.remove('hidden');
  }
});

// Extra Action Toolbar Handlers
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!currentRawMarkdown) return;
  const attribution = "\n\n---\n*Generated via CU Law Exam Engine | Designed by Debdipta Goswami*";
  try { await navigator.clipboard.writeText(currentRawMarkdown + attribution); showToast('Markdown copied to clipboard!'); } catch (err) {}
});

let isSpeaking = false;
document.getElementById('readAloudBtn').addEventListener('click', () => {
  if (!('speechSynthesis' in window)) return showToast('Text-to-speech not supported.');
  if (isSpeaking) { window.speechSynthesis.cancel(); isSpeaking = false; return showToast('Audio stopped.'); }
  const text = document.getElementById('outputContent').innerText;
  if (!text.trim()) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.onend = () => { isSpeaking = false; };
  window.speechSynthesis.speak(utt);
  isSpeaking = true;
  showToast('Reading answer aloud... (Click again to stop)');
});

// PDF Download
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const element = document.getElementById('outputContent');
  if (!element.innerHTML.trim()) return;
  
  const wrapper = document.createElement('div');
  wrapper.innerHTML = element.innerHTML;
  wrapper.className = 'markdown-body';
  wrapper.style.color = '#000';
  wrapper.style.backgroundColor = '#fff';
  wrapper.style.padding = '20px';
  wrapper.style.fontSize = '12pt';
  
  // Add attribution to PDF
  const attribution = document.createElement('div');
  attribution.innerHTML = '<hr><p style="text-align: center; font-style: italic; color: #666; font-size: 0.9rem;">Generated via CU Law Exam Engine | Designed by Debdipta Goswami</p>';
  wrapper.appendChild(attribution);
  
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

// Developer Modal Logic
const devOverlay = document.getElementById('developer-modal-overlay');
const openDevBtn = document.getElementById('aboutDeveloperBtn');
const closeDevBtn = document.getElementById('closeDeveloperModalBtn');

const openDevModal = () => {
  devOverlay.classList.remove('hidden');
  setTimeout(() => devOverlay.classList.add('show'), 10);
};

const closeDevModal = () => {
  devOverlay.classList.remove('show');
  setTimeout(() => devOverlay.classList.add('hidden'), 300);
};

if(openDevBtn) openDevBtn.addEventListener('click', openDevModal);
if(closeDevBtn) closeDevBtn.addEventListener('click', closeDevModal);
if(devOverlay) devOverlay.addEventListener('click', (e) => {
  if (e.target === devOverlay) closeDevModal();
});

// -----------------------------------------------------------------------------
// Bare Act Decoder Logic
// -----------------------------------------------------------------------------
let currentDecoderMarkdown = '';

document.getElementById('decodeBtn')?.addEventListener('click', async () => {
  const statute = document.getElementById('decode-statute').value;
  const section = document.getElementById('decode-section').value.trim();
  const rawText = document.getElementById('decode-raw').value.trim();

  if (!section) return showToast('Please enter a section number.');

  const btn = document.getElementById('decodeBtn');
  btn.disabled = true;
  document.getElementById('decodeBtnText').textContent = 'Decoding...';
  document.getElementById('decodeOutputSection').classList.remove('hidden');
  document.getElementById('decodeOutputContent').classList.add('hidden');
  document.getElementById('decodeSkeletonLoader').classList.remove('hidden');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'decode', statute, section, rawText })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentDecoderMarkdown = data.answer;
    document.getElementById('decodeOutputContent').innerHTML = marked.parse(data.answer);
    saveToHistory({ type: 'decode', query: section, statute: statute, answer: data.answer, timestamp: Date.now() });
  } catch (error) {
    showToast(`Error: ${error.message}`);
    document.getElementById('decodeOutputSection').classList.add('hidden');
  } finally {
    btn.disabled = false;
    document.getElementById('decodeBtnText').textContent = 'Decode Section';
    document.getElementById('decodeSkeletonLoader').classList.add('hidden');
    document.getElementById('decodeOutputContent').classList.remove('hidden');
  }
});

// Decoder Action Buttons
document.getElementById('decodeCopyBtn')?.addEventListener('click', async () => {
  if (!currentDecoderMarkdown) return;
  const attribution = "\n\n---\n*Decoded via CU Law Exam Engine | Designed by Debdipta Goswami*";
  try { await navigator.clipboard.writeText(currentDecoderMarkdown + attribution); showToast('Breakdown copied!'); } catch (err) {}
});

let isDecoderSpeaking = false;
document.getElementById('decodeReadAloudBtn')?.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) return showToast('Text-to-speech not supported.');
  if (isDecoderSpeaking) { window.speechSynthesis.cancel(); isDecoderSpeaking = false; return showToast('Audio stopped.'); }
  const text = document.getElementById('decodeOutputContent').innerText;
  if (!text.trim()) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.onend = () => { isDecoderSpeaking = false; };
  window.speechSynthesis.speak(utt);
  isDecoderSpeaking = true;
  showToast('Reading breakdown aloud...');
});
