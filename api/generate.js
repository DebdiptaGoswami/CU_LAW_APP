import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key in environment variables.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });

    const prompt = `You are an expert Indian Law Professor at Calcutta University (CU). 
Your task is to write a comprehensive, high-scoring 16-mark exam answer for a BA LLB student. 
The answer must be approximately 1,000 words and strictly follow the typical high-scoring structure found in CU Law study materials.

Topic/Question: "${question}"

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

    return res.status(200).json({ answer: text });
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate answer.' });
  }
}
