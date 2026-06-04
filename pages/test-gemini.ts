import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: '123' });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'hello',
    });
    console.log(res);
  } catch(e: any) {
    console.log(e.message);
  }
}
run();
