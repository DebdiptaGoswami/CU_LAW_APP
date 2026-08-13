import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, topic, question, subject, marks, image, textAnswer, count } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key in environment variables.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Default model for text tasks
    let model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });
    let prompt = "";
    let result;

    if (type === 'evaluate') {
      prompt = `You are a strict, senior Calcutta University (CU) Law Exam Evaluator. 
Evaluate the provided student answer against standard CU valuation standards for the subject: ${subject || 'Law'}.
Context: The question asked is "${question}" and it carries ${marks} marks.

Be rigorous with statutory section accuracy, Indian landmark case citations, and structured heading breakdowns.
You MUST output your evaluation EXACTLY as a JSON object with this schema (no markdown code blocks, just the raw JSON object starting with {):
{
  "score": <integer score out of ${marks}>,
  "maxMarks": ${marks},
  "grade": "<string grade, e.g. O, A+, A, B+, B>",
  "statProg": <integer percentage 0-100 for Statutory Coverage>,
  "caseProg": <integer percentage 0-100 for Case Law Application>,
  "structProg": <integer percentage 0-100 for Structure & Formatting>,
  "termProg": <integer percentage 0-100 for Legal Precision>,
  "strengths": ["<string bullet point>", "<string bullet point>"],
  "weaknesses": ["<string bullet point>", "<string bullet point>"],
  "tips": ["<string tip for improvement>", "<string tip>"]
}`;

      if (image) {
        // Multimodal call
        model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // As requested by user
        const imagePart = { inlineData: { data: image, mimeType: "image/jpeg" } };
        
        try {
          result = await model.generateContent([prompt, imagePart]);
        } catch (err) {
          console.warn("gemini-2.5-flash failed, trying fallback...", err);
          model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
          result = await model.generateContent([prompt, imagePart]);
        }
      } else {
        prompt += `\n\nStudent Answer to Evaluate:\n${textAnswer}`;
        result = await model.generateContent(prompt);
      }

    } else if (type === 'flashcards') {
      prompt = `You are an expert Indian Law Professor. Generate ${count || 5} highly relevant flashcards for the subject: "${subject}".
Focus on landmark Indian case laws and important statutory sections/maxims.
You MUST output EXACTLY a JSON array of objects with this schema (no markdown blocks, just raw JSON array starting with [):
[
  {
    "subject": "${subject}",
    "topic": "<Broad Topic Name>",
    "caseName": "<Case Name OR Section No.>",
    "facts": "<Very concise 2 line summary of facts>",
    "issue": "<The core legal issue>",
    "ratio": "<The court's holding/principle>",
    "section": "<Associated Bare Act Section>"
  }
]`;
      result = await model.generateContent(prompt);

    } else if (type === 'search') {
      if (!topic) return res.status(400).json({ error: 'Topic is required for search' });
      
      prompt = `You are an expert Indian Legal Researcher. 
Your task is to provide a highly structured, accurate Markdown table referencing case laws and statutory sections for the legal topic: "${topic}".

STRICT RULES:
1. Output ONLY a single Markdown table. Do not include any introductory, explanatory, or concluding text.
2. The table must have exactly these 4 columns: Topic, Statutory Section, Landmark Cases, Key Principle (Ratio).
3. Include at least 3 to 5 highly relevant landmark cases for the given topic.
4. Enforce specific statutory updates for criminal law (apply Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, and Bharatiya Sakshya Adhiniyam where applicable).`;
      
      result = await model.generateContent(prompt);

    } else if (type === 'decode') {
      const { section, rawText, statute } = req.body;
      if (!section) return res.status(400).json({ error: 'Section is required for decoding.' });
      
      prompt = `You are an expert legal educator and Indian Law Professor.
Your task is to provide a thorough, plain-English breakdown of the statutory section provided below.

Statute Context: ${statute}
Section: ${section}
${rawText ? `Raw Text of Section:\n"${rawText}"\n` : ''}

You MUST generate a highly structured Markdown breakdown adhering STRICTLY to the following sections and emojis:

### 📖 Plain English Translation (Comprehensive Overview)
Explain the section in simple, crystal-clear, everyday language as if explaining it to a beginner. Avoid dense legalese here.

### 🧩 Essential Ingredients & Elements (Numbered Breakdown)
Extract and list every single legal requirement/ingredient that must be proven for this section to apply in numbered bullet points. Highlight key terms in **bold**.

### 💡 Real-World Examples & Statutory Illustrations
Provide 2-3 clear, easy-to-understand hypothetical scenarios/examples demonstrating how this section works in practice.

### ⚖️ Landmark Case Laws & Ratios
List 2-3 landmark Indian Supreme Court or High Court cases relevant to this section, formatted strictly as:
- **Case Name & Citation**
  - **Facts**: (2 lines summary)
  - **Court Holding / Ratio Decidendi**: (The principle established)

### 🔄 Old vs. New Criminal Code Mapping
If the input belongs to new criminal codes (BNS, BNSS, BSA), clearly state the corresponding old section from IPC, CrPC, or the Evidence Act, noting key differences or updates. If not applicable, simply write "Not Applicable to this statute."

### 📝 Exam Tip / How to Answer in CU Exams
A brief, actionable tip on how to incorporate this specific section effectively into a 10-mark or 16-mark Calcutta University exam script.`;

      result = await model.generateContent(prompt);

    } else {
      // Default type: 'answer'
      if (!question) return res.status(400).json({ error: 'Question is required' });

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

      result = await model.generateContent(prompt);
    }
    
    const response = await result.response;
    let text = response.text();

    // Clean markdown code blocks from JSON outputs if AI added them
    if (type === 'evaluate' || type === 'flashcards') {
      text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    }

    return res.status(200).json({ answer: text });
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate response.' });
  }
}
