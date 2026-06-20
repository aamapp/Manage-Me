import { GoogleGenAI, Type } from '@google/genai';

let aiConfigured = false;
let aiClient: GoogleGenAI | null = null;
let aiModelName = 'gemini-2.5-flash';

// Attempt to initialize using import.meta.env
try {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any)?.env?.VITE_GEMINI_API_KEY || (process as any)?.env?.GEMINI_API_KEY;
  if (apiKey && apiKey.length > 20) {
    aiClient = new GoogleGenAI({ apiKey });
    aiConfigured = true;
  }
} catch (error) {
  console.error("Error initializing Google Gen AI SDK:", error);
}

const SYSTEM_PERSONA = `You are an extremely intelligent, empathetic, and human-like business / agency assistant for Apon AI (a creative agency & project management app).
You speak fluently, naturally, and warmly in Bengali, acting as a smart, friendly colleague, financial manager, or accountant.

Your primary duty is to help the user understand everything happening in their agency: project progress, clients, incomes, expenses, payments, and dues.

Guidelines for your conversation:
1. Financial & Business Intelligence:
   - When asked about calculations, lists, income, expenses, or projects, always respond with exact, highly accurate numbers based on the 'Current App Data Context' provided.
   - Map Bengali terms clearly to their variables:
     - "মোট বাজেট" (Total Budget) -> refer to totalBudget
     - "মোট আদায়" / "মোট পেমেন্ট সংগৃহীত" (Total Received / Collected) -> refer to totalPaid
     - "মোট বকেয়া" / "পাওনা" (Total Due) -> refer to totalDue
     - "মোট প্রজেক্ট" (Total Projects count) -> refer to totalProjects
     - "মোট ক্লায়েন্ট" (Total Clients count) -> refer to totalClients
     - "মোট আয়" (Total General Income) -> refer to totalIncome
     - "মোট ব্যয়" / "মোট খরচ" (Total Expense) -> refer to totalExpense
     - "নিট লাভ" / "সঞ্চয়" (Net Savings/Profit) -> calculate totalIncome - totalExpense (or totalPaid - totalExpense)
   - If the user asks about specific records or lists (e.g., "বকেয়া প্রজেক্টগুলোর লিস্ট দাও", "চলমান প্রজেক্ট কোনগুলো?", "সাম্প্রতিক আয়ের বিবরণী দেখাও", "কোনটি সবচেয়ে বড় বাজেট?"), list them nicely in a clean, professional, readable format.
   
2. Formatting & Readable Presentation:
   - Use beautiful Bengali markdown formatting (bullet points, clean charts/lists, clear bold titles, and subtle divider symbols) to make monetary values and tables pleasing to read.
   - Always display monetary amounts with the correct currency symbol provided in context. For example: ৳ 50,000 or $50,000.
   - Offer proactive business advice when appropriate (e.g., if totalDue/বকেয়া is high, politely suggest contacting those clients; if expenses are high, outline the highest expense categories).

3. Communication Style:
   - Conversational, natural, and helpful. Avoid listing JSON, schema keys, or technical database jargon.
   - Greetings: If the user says "সালাম", "আসসালামু আলাইকুম", reply with "ওয়ালাইকুম আসসালাম". If the user says "Hello" or "Hi", reply with "হ্যালো! কেমন আছেন? কিভাবে সাহায্য করতে পারি?".

4. Actions & Commands:
   - If the user asks to "navigate to", "open", or "go to" a page, use the \`navigate_to_page\` function. If the user asks to "download", "export", or "save" a report or list, use the \`download_report\` function.`;

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
    },
    {
      name: "generate_image",
      description: "Generates an image. ONLY use this tool if the user explicitly says words like 'ছবি তৈরি করো', 'আঁকো', 'image', 'draw', or 'generate an image'. Do NOT use this tool for answering questions about numbers, counts, reports, or analytics.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: "A detailed prompt for the image to be generated, based on the user's request and context."
          }
        },
        required: ["prompt"]
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

export async function generateAiImage(prompt: string): Promise<string> {
  if (!aiClient) {
    const customKey = localStorage.getItem('custom_gemini_api_key');
    if (customKey && customKey.length > 20) {
      aiClient = new GoogleGenAI({ apiKey: customKey.trim() });
      aiConfigured = true;
    } else {
      throw new Error("API Key is missing.");
    }
  }

  try {
    // 1. Generate a clear English visual prompt from the user's input/context.
    const promptEnhancerResponse = await aiClient.models.generateContent({
      model: aiModelName,
      contents: `You are an expert prompt engineer for an AI image generator (like Midjourney or Imagen). The user wants an image based on the following context (which might be in Bengali). Create a concise, visually descriptive prompt in English (max 40 words). Make it visually stunning and conceptual. Do NOT include instructions to render specific text, numbers, or accurate data charts in the image, because image models cannot plot real data. Only output the english prompt, no extra text. Context: "${prompt}"`,
    });
    
    let enhancedPrompt = promptEnhancerResponse.text?.trim() || "A beautiful abstract digital art illustration";
    // Remove any markdown formatting or quotes
    enhancedPrompt = enhancedPrompt.replace(/['"]/g, '').replace(/\n/g, ' ').trim();

    // 2. Since standard Gemini API keys often don't have access to Imagen 3 (returning 403),
    // we use a reliable free fallback (pollinations.ai) to actually render the image,
    // using the Gemini-enhanced prompt!
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true`;
    
    // We return the URL directly
    return imageUrl;

  } catch (error: any) {
    let is404 = error.status === 404 || error.message?.includes("404");
    if (error.message && error.message.includes("{")) {
       try {
         const parsedError = JSON.parse(error.message);
         if (parsedError.error?.code === 404 || parsedError.error?.status === "NOT_FOUND") {
            is404 = true;
         }
       } catch (e) {}
    }

    if (is404) {
       // Fallback to gemini-1.5-flash if 2.5-flash is not found
       if (aiModelName === 'gemini-2.5-flash') {
         aiModelName = 'gemini-2.0-flash';
         return generateAiImage(prompt);
       } else if (aiModelName === 'gemini-2.0-flash') {
         aiModelName = 'gemini-1.5-flash';
         return generateAiImage(prompt);
       }
    }
    console.error("Image generation process error:", error);
    throw new Error("ছবি তৈরি করতে সমস্যা হচ্ছে। দয়া করে আবার চেষ্টা করুন।");
  }
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

    // Add context to the current message with highly explicit labels
    const currencySym = contextData?.currency || '৳';
    const messageWithContext = `Current App Data Context:
    - Currency Symbol: ${currencySym}
    - Total Budget (মোট বাজেট): ${contextData?.totalBudget || 0} ${currencySym}
    - Total Paid/Collected (মোট আদায়): ${contextData?.totalPaid || 0} ${currencySym}
    - Total Due (মোট বকেয়া): ${contextData?.totalDue || 0} ${currencySym}
    - Total Projects count (মোট প্রজেক্ট): ${contextData?.totalProjects || 0}
    - Total Clients count (মোট ক্লায়েন্ট): ${contextData?.totalClients || 0}
    - Total Income from records (মোট আয়): ${contextData?.totalIncome || 0} ${currencySym}
    - Total Expense from records (মোট ব্যয়/খরচ): ${contextData?.totalExpense || 0} ${currencySym}

    - Detailed Lists:
      - Projects List (প্রজেক্ট তালিকা): ${JSON.stringify(contextData?.projectsList || [])}
      - Income/Payment Log (আয়/লেনদেনের ইতিহাস): ${JSON.stringify(contextData?.incomeList || [])}
      - Expense Log (খরচের তালিকা): ${JSON.stringify(contextData?.expenseList || [])}
      - Clients List (ক্লায়েন্ট তালিকা): ${JSON.stringify(contextData?.clientsList || [])}

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
    let errorCode = error.status;
    if (error.message && error.message.includes("{")) {
       try {
         const parsedError = JSON.parse(error.message);
         errorCode = parsedError.error?.code || errorCode;
       } catch (e) {}
    }

    if (errorCode === 429 || error.message?.includes("429") || error.message?.includes("quota")) {
      throw new Error("এপিআই কোটা শেষ হয়ে গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } else if (errorCode === 404 || error.message?.includes("404") || error.message?.includes("NOT_FOUND")) {
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
