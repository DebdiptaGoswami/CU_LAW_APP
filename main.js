import { GoogleGenerativeAI } from '@google/generative-ai';
import { marked } from 'marked';

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const questionInput = document.getElementById('question');
const generateBtn = document.getElementById('generateBtn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.getElementById('loadingSpinner');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const copyBtn = document.getElementById('copyBtn');

// Load API key from local storage if available
document.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('geminiApiKey');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
});

// Save API key on change
apiKeyInput.addEventListener('change', (e) => {
  localStorage.setItem('geminiApiKey', e.target.value.trim());
});

const generateAnswer = async () => {
  const apiKey = apiKeyInput.value.trim();
  const question = questionInput.value.trim();

  if (!apiKey) {
    alert('Please enter your Google Gemini API Key.');
    return;
  }

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
    const genAI = new GoogleGenerativeAI(apiKey);
    let model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });

    const prompt = `You are an expert Indian Law Professor at Calcutta University (CU). 
Your task is to write a comprehensive, high-scoring 16-mark exam answer for a BA LLB student. 
The answer must be approximately 1,000 words and strictly follow the typical high-scoring structure found in CU Law study materials.

Topic/Question: "\${question}"

Tone & Style: Use an academic, authoritative, and traditional Indian legal writing style. Avoid conversational fluff or modern corporate language.

Formatting Rules:
1. **Key Terms**: Automatically **bold** statutory sections and landmark case names. Use *italics* for Latin maxims.
2. **Concise Bare Act Quoting**: Quote the statutory section definition, then immediately break down its Essential Ingredients into numbered bullet points instead of long paragraphs.
3. **Structured Case Law Presentation**: Discuss at least 2-3 landmark cases. Every case must strictly use this sub-bullet format:
   - **Case Name & Citation**: (e.g., Mohori Bibee v. Dharmodas Ghose (1903) 30 I.A. 114)
   - **Facts**: Concise 2-line summary of what happened.
   - **Legal Point / Issue**: The legal question raised.
   - **Held / Principle**: The exact ratio decidendi given by the court.
4. **Tabular Comparison**: Whenever a question asks to distinguish between two concepts (e.g., Indemnity vs. Guarantee, Void vs. Voidable), you MUST force the output to render a clean, side-by-side Markdown Table with specific parameters of comparison.

Structure the answer precisely as follows:
1. **Introduction & Meaning**: Define the core concepts clearly with *Latin maxims* if applicable.
2. **Relevant Legal Provisions & Essential Ingredients**: Quote the statutory definition concisely and break down ingredients as per Rule 2.
3. **Leading Case Laws**: Apply the strict structure as per Rule 3.
4. **Illustrations**: Provide 1 or 2 practical examples to demonstrate the application of the law.
5. **Exceptions/Differences** (if applicable based on the question, use a Markdown Table for differences as per Rule 4).
6. **Conclusion**: A strong concluding paragraph summarizing the legal position.`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (modelError) {
      console.warn("Primary model failed, attempting fallback to gemini-3.6-flash...", modelError);
      if (modelError.status === 404 || (modelError.message && modelError.message.includes('404'))) {
        model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        result = await model.generateContent(prompt);
      } else {
        throw modelError;
      }
    }
    const response = await result.response;
    const text = response.text();

    // Parse Markdown and update UI
    outputContent.innerHTML = marked.parse(text);
    outputSection.classList.remove('hidden');
    
    // Smooth scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    console.error('Error generating answer:', error);
    alert(`Error: ${error.message || 'Failed to generate answer. Please check your API key and try again.'}`);
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
