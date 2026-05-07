import { GoogleGenAI, Type } from '@google/genai';

let aiConfigured = false;
let aiClient: GoogleGenAI | null = null;
let aiModelName = 'gemini-2.5-flash';

// Attempt to initialize using import.meta.env
try {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || (process as any)?.env?.VITE_GEMINI_API_KEY || (process as any)?.env?.GEMINI_API_KEY;
  if (apiKey && apiKey.length > 20) {
    aiClient = new GoogleGenAI({ apiKey });
    aiConfigured = true;
  }
} catch (error) {
  console.error("Error initializing Google Gen AI SDK:", error);
}

const SYSTEM_PERSONA = `You are a highly intelligent, empathetic, and human-like AI assistant for managing a creative agency and project management app named Apon AI.
You speak fluently and naturally in Bengali, as if you are a friendly colleague or personal manager.

Guidelines for your conversation:
1. Conversational & Natural: Talk like a human. Be polite, smart, and helpful. Avoid sounding like a robot.
2. Greetings: If the user greets with "সালাম" or "আসসালামু আলাইকুম", reply with "ওয়ালাইকুম আসসালাম". If the user says "Hello" or "Hi", reply with "হ্যালো! কেমন আছেন?".
3. Formatting: Use Markdown (bold, lists) to make your answers easy to read, but keep the tone conversational.
4. Don't mention JSON or system data. Just answer naturally based on the data provided.
5. Actions & Commands: You have the ability to perform actions using tools. If the user asks to "navigate to", "open", or "go to" a page, use the \`navigate_to_page\` function. If the user asks to "download", "export", or "save" a report or list, use the \`download_report\` function.`;

const aiTools = [{
  functionDeclarations: [
    {
      name: "download_report",
      description: "Download a report as a PDF file. Use this when the user asks to download, export, or save a report/list.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "The topic: 'projects', 'income', 'expense', 'clients'"
          }
        },
        required: ["topic"]
      }
    },
    {
      name: "navigate_to_page",
      description: "Navigate the user to a specific page or section of the app. Use this when the user wants to see, search or filter something visually on the screen.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          page_name: {
            type: Type.STRING,
            description: "The name of the page to navigate to: 'dashboard', 'projects', 'income', 'expenses', 'clients', 'reports', 'settings', 'shopping', 'assistant'."
          }
        },
        required: ["page_name"]
      }
    }
  ]
}];

export interface AiResponseData {
  text?: string;
  functionCall?: {
    name: string;
    args: any;
  };
}

export async function generateAiResponse(userMessage: string, chatHistory: any[], contextData: any): Promise<AiResponseData> {
  if (!aiClient) {
    // Check if maybe we can get it from localStorage (if user stored custom key previously)
    const customKey = localStorage.getItem('custom_gemini_api_key');
    if (customKey && customKey.length > 20) {
      aiClient = new GoogleGenAI({ apiKey: customKey.trim() });
      aiConfigured = true;
    } else {
      throw new Error("API Key is missing. Please check your environment variables.");
    }
  }

  try {
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Add context to the current message
    const messageWithContext = `Current App Data Context: 
${JSON.stringify(contextData)}

User Message: ${userMessage}`;

    const response = await aiClient.models.generateContent({
      model: aiModelName,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PERSONA }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
        ...formattedHistory,
        { role: 'user', parts: [{ text: messageWithContext }] }
      ],
      config: {
        temperature: 0.7,
        tools: aiTools,
      }
    });

    if (response) {
      if (response.functionCalls && response.functionCalls.length > 0) {
         return {
           functionCall: {
             name: response.functionCalls[0].name,
             args: response.functionCalls[0].args
           }
         };
      }
      return { text: response.text || '' };
    } else {
      throw new Error("No response received from the model.");
    }
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes("429") || error.message?.includes("quota")) {
      throw new Error("এপিআই কোটা শেষ হয়ে গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } else if (error.status === 404) {
       // Fallback to gemini-1.5-flash if 2.5-flash is not found
       if (aiModelName === 'gemini-2.5-flash') {
         aiModelName = 'gemini-2.0-flash';
         return generateAiResponse(userMessage, chatHistory, contextData);
       } else if (aiModelName === 'gemini-2.0-flash') {
         aiModelName = 'gemini-1.5-flash';
         return generateAiResponse(userMessage, chatHistory, contextData);
       }
       throw new Error(`জেমিনি মডেল পাওয়া যাচ্ছে না। দয়া করে সেটিংস চেক করুন।`);
    } else if (error.status === 400 || error.message?.includes("API key")) {
       throw new Error(`আপনার এপিআই কি (API Key) সঠিক নয়। দয়া করে সেটিংস বা .env চেক করুন।`);
    } else if (error.status === 503 || error.status === 500 || error.message?.includes("503") || error.message?.includes("high demand") || error.message?.includes("UNAVAILABLE")) {
       throw new Error(`সার্ভারে বর্তমানে অতিরিক্ত চাপ রয়েছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।`);
    }
    
    // Parse JSON error from Google Gen AI if available
    if (error.message && error.message.includes("{")) {
       try {
         const parsedError = JSON.parse(error.message);
         if (parsedError.error?.code === 503 || parsedError.error?.status === "UNAVAILABLE") {
            throw new Error(`সার্ভারে বর্তমানে অতিরিক্ত চাপ রয়েছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।`);
         }
       } catch (e) {
         // ignore parse error
       }
    }
    
    throw error;
  }
}
