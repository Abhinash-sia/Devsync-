import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── PARSE RESUME TEXT → structured skills data ───────────────────────────────
const parseResumeWithAI = async (resumeText) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Prompt Engineering — the key is being EXTREMELY specific about output format
  // If you just say "extract skills", you'll get an essay, not parseable JSON
  const prompt = `
    You are an expert technical recruiter and resume parser.
    
    Extract information from the following resume text and return a JSON object.
    
    STRICT RULES:
    1. Return ONLY valid JSON — no markdown, no backticks, no explanation text
    2. If a field cannot be found, use an empty array [] or empty string ""
    3. techStack must only contain actual programming languages and frameworks
    
    Required JSON format:
    {
      "techStack": ["array of up to 8 programming languages/frameworks"],
      "bio": "one sentence professional summary (max 150 chars)",
      "lookingFor": "one of: hackathon, freelance, cofounder, openSource, or empty string"
    }
    
    Resume text:
    ${resumeText}
  `;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse the JSON response — if Gemini misbehaves and adds markdown, strip it
  const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();

  return JSON.parse(cleanJson);
};

// ─── GENERATE ICEBREAKER MESSAGE for a new match ─────────────────────────────
const generateIcebreaker = async (userAStack, userBStack, userAName, userBName) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are a friendly developer community bot.
    
    Two developers just matched on DevSync:
    - ${userAName} works with: ${userAStack.join(", ")}
    - ${userBName} works with: ${userBStack.join(", ")}
    
    Write a single, natural, friendly icebreaker message (max 100 words).
    Focus on their complementary tech stacks and potential collaboration.
    Make it feel human, not robotic.
    Return ONLY the message text — no labels, no JSON, no quotes.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

export { parseResumeWithAI, generateIcebreaker };