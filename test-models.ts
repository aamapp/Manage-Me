import { GoogleGenAI } from '@google/genai';
async function run() {
  const customKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!customKey) {
    console.log("No key");
    return;
  }
  const ai = new GoogleGenAI({ apiKey: customKey.trim() });
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'hello',
    });
    console.log("1.5-flash works");
  } catch(e: any) {
    console.log("1.5-flash error:", e.status, e.message);
  }
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'hello',
    });
    console.log("2.0-flash works");
  } catch(e: any) {
    console.log("2.0-flash error:", e.status, e.message);
  }
}
run();
