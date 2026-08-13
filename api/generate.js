import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, topic, question, subject, marks } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key in environment variables.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });
    let prompt = "";

    if (type === 'search') {
      if (!topic) {
        return res.status(400).json({ error: 'Topic is required for search' });
      }
      
      prompt = `You are an expert Indian Legal Researcher. 
Your task is to provide a highly structured, accurate Markdown table referencing case laws and statutory sections for the legal topic: "${topic}".

STRICT RULES:
1. Output ONLY a single Markdown table. Do not include any introductory, explanatory, or concluding text.
2. The table must have exactly these 4 columns: 
   - Topic
   - Statutory Section
   - Landmark Cases
   - Key Principle (Ratio)
3. Include at least 3 to 5 highly relevant landmark cases for the given topic.
4. Enforce specific statutory updates for criminal law (apply Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, and Bharatiya Sakshya Adhiniyam where applicable).`;

    } else {
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      let structureInstructions = "";
      if (marks === "16") {
        structureInstructions = `
Structure the answer precisely for a 16-Mark Comprehensive Essay (approx 1,000-1,200 words):
1. **Introduction & Meaning**: Define the core concepts clearly with *Latin maxims* if applicable.
2. **Relevant Legal Provisions**: Explicit exhaustive analysis quoting Bare Act provisions and breaking down essential ingredients.
3. **Leading Case Laws**: Detailed analysis of 2-3 landmark cases using this strict format:
   - **Case Name & Citation**: (e.g., Mohori Bibee v. Dharmodas Ghose (1903) 30 I.A. 114)
   - **Facts**: Concise summary of what happened.
   - **Legal Point / Issue**: The legal question raised.
   - **Held / Principle**: The exact ratio decidendi given by the court.
4. **Illustrations**: Provide practical examples to demonstrate the application of the law.
5. **Exceptions/Differences**: If applicable, use a Markdown Table for differences.
6. **Conclusion**: A strong concluding paragraph summarizing the legal position.`;
      } else if (marks === "10") {
        structureInstructions = `
Structure the answer for a 10-Mark Standard Answer (approx 600-800 words):
1. **Introduction**: Brief definition of the concept.
2. **Core Statutory Sections**: Highlight the primary sections and ingredients in bullet points.
3. **Key Case Laws**: Discuss 2-3 landmark precedents with clear subheadings (Facts, Issue, Held).
4. **Conclusion**: A brief wrap-up.`;
      } else {
        structureInstructions = `
Structure the answer for a 4/6-Mark Short Note (approx 250-350 words):
1. **Core Definition**: Direct explanation of the concept.
2. **Essential Ingredients**: Bullet points listing conditions/requirements.
3. **Landmark Case**: Briefly cite exactly 1 key case without filler text.`;
      }

      prompt = `You are an expert Indian Law Professor at Calcutta University (CU). 
Your task is to write a high-scoring exam answer for a BA LLB student studying the subject: "${subject || 'General Law'}".

Topic/Question: "${question}"

Tone & Style: Use an academic, authoritative, and traditional Indian legal writing style. Avoid conversational fluff or modern corporate language.
Statutory Mandate: Enforce specific statutory updates for criminal law (apply Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, and Bharatiya Sakshya Adhiniyam where applicable).

Formatting Rules:
1. **Key Terms**: Automatically **bold** statutory sections and landmark case names. Use *italics* for Latin maxims.
2. **Concise Bare Act Quoting**: Break down essential ingredients into numbered bullet points instead of long paragraphs.
3. **Tabular Comparison**: Whenever a question asks to distinguish between two concepts, you MUST render a clean, side-by-side Markdown Table with specific parameters of comparison.

${structureInstructions}`;
    }

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
