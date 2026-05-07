import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';

// We are going to initialize the ai using the API KEY from env.
// For now, this is a placeholder UI. 

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistant: React.FC = () => {
  const { 
    projects, 
    clients, 
    incomeRecords, 
    expenses, 
    ghazalNotes, 
    shoppingLists, 
    user 
  } = useAppContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'আসসালামু আলাইকুম! আমি আপনার এআই অ্যাসিস্ট্যান্ট। আপনার প্রজেক্ট, ক্লায়েন্ট, আয় বা ব্যয়ের বিষয়ে যেকোনো তথ্য জানার থাকলে আমাকে জিজ্ঞেস করতে পারেন।'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const totalBudget = projects.reduce((sum, p) => sum + (p.totalamount || 0), 0);
      const totalPaid = projects.reduce((sum, p) => sum + (p.paidamount || 0), 0);
      const totalDue = projects.reduce((sum, p) => sum + (p.dueamount || 0), 0);
      
      const totalIncome = incomeRecords.reduce((sum, i) => sum + (i.amount || 0), 0);
      const totalExpense = expenses.reduce((sum, i) => sum + (i.amount || 0), 0);

      const contextData = {
        totalProjects: projects.length,
        totalClients: clients.length,
        totalBudget,
        totalPaid,
        totalDue,
        totalIncome,
        totalExpense,
        projectsList: projects.map(p => ({
          name: p.name,
          client: p.clientname,
          type: p.type,
          budget: p.totalamount,
          paid: p.paidamount,
          due: p.dueamount,
          status: p.status,
          deadline: p.deadline,
          createdAt: p.createdat,
          notes: p.notes,
        })),
        incomeList: incomeRecords.map(i => ({
          client: i.clientname,
          project: i.projectname,
          amount: i.amount,
          date: i.date,
          method: i.method
        })),
        expenseList: expenses.map(e => ({
          category: e.category,
          amount: e.amount,
          date: e.date,
          notes: e.notes
        })),
        clientsList: clients.map(c => ({
          name: c.name,
          contact: c.contact,
          totalProjects: c.totalprojects,
          totalEarnings: c.totalearnings
        })),
        shoppingLists: shoppingLists.map(s => ({
          title: s.title,
          date: s.date,
          itemsCount: s.items?.length || 0,
          totalAmount: s.totalamount,
          notes: s.notes
        })),
        ghazalNotes: ghazalNotes.map(g => ({
          title: g.title,
          lyricsExcerpt: g.lyrics ? g.lyrics.substring(0, 100) + '...' : ''
        }))
      };

      const systemInstruction = `You are a highly intelligent, empathetic, and human-like AI assistant for managing a creative agency and project management app. 
      You speak fluently and naturally in Bengali, as if you are a friendly colleague or personal manager.
      
      Guidelines for your conversation:
      1. Conversational & Natural: Talk like a human. Be polite, smart, and helpful. Avoid sounding like a robot.
      2. Greetings: If the user greets with "সালাম" or "আসসালামু আলাইকুম", reply with "ওয়ালাইকুম আসসালাম". If the user says "Hello" or "Hi", reply with "হ্যালো! কেমন আছেন?". Adjust the greeting to match the user's tone. Do not add unnecessary greetings if the user didn't greet you first.
      3. Understanding Context: Read the user's intent. If they ask about income, don't just dump data—summarize it nicely.
      4. Formatting: Use Markdown (bold, lists) to make your answers easy to read, but keep the tone conversational.
      5. Don't mention JSON or system data. Just answer naturally based on the data provided.
      6. Actions & Commands: You have the ability to perform actions using tools. If the user asks to "navigate to", "open", or "go to" a page, use the \`navigate_to_page\` function. If the user asks to "download", "export", or "save" a report or list, use the \`download_report\` function.
      
      Today's date is: ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (ISO: ${new Date().toISOString()}).
      
      Here is the current state of the application data:
      ${JSON.stringify(contextData)}`;

      // Accessing the API key
      const getApiKey = () => {
        // Higher priority to VITE_ prefix for client-side bundle stability
        const key = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                    (process as any).env?.GEMINI_API_KEY || 
                    (process as any).env?.VITE_GEMINI_API_KEY ||
                    (import.meta as any).env?.GEMINI_API_KEY;
        
        const finalKey = key ? key.trim() : null;
        
        // Check for common typo 'Alza' instead of 'AIza'
        if (finalKey && (finalKey.startsWith('Alza') || finalKey.startsWith('alza'))) {
          console.warn("[AI Key Debug] Potential typo detected: Key starts with 'Alza' or 'alza' instead of 'AIza'.");
          return "TYPO_DETECTED";
        }

        // Check if starts with AIza
        if (finalKey && finalKey.length > 0 && !finalKey.startsWith('AIza')) {
          console.warn("[AI Key Debug] Key does not start with 'AIza'. Prefix: " + finalKey.substring(0, 4));
        }

        // Ignore placeholders
        if (!finalKey || 
            finalKey === "AI Studio Free Tier" || 
            finalKey === "YOUR_API_KEY" || 
            finalKey.length < 30) {
          console.log("[AI Key Debug] No valid key provided yet.");
          return null;
        }

        console.log(`[AI Key Debug] Key found. Prefix: "${finalKey.substring(0, 4)}", Suffix: "...${finalKey.substring(finalKey.length - 4)}", Length: ${finalKey.length}`);
        return finalKey;
      };

      const apiKey = getApiKey();
      
      if (apiKey === "TYPO_DETECTED") {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'আপনার এপিআই কি (API Key) টিতে সম্ভবত একটি টাইপো (Typo) রয়েছে। কি-টি "AIza" (বড় হাতের A, বড় হাতের I, ছোট হাতের z, ছোট হাতের a) দিয়ে শুরু হওয়ার কথা, কিন্তু আপনারটি "Alza" দিয়ে শুরু হয়েছে। দয়া করে সেটিংস থেকে কি-টি ঠিক করুন (ছোট হাতের l এর জায়গায় বড় হাতের I হবে)।'
        }]);
        setIsLoading(false);
        return;
      }
      
      let aiResponseText = 'দুঃখিত, এপিআই কি (API Key) পাওয়া যায়নি। দয়া করে সেটিংস থেকে GEMINI_API_KEY টি সঠিকভাবে সেট করুন।';
      
      try {
        if (apiKey && apiKey.length > 20) {
          const genAI = new GoogleGenerativeAI(apiKey);
          const chatHistory = [...messages.slice(1), userMessage].map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          }));

          const aiTools: Tool[] = [{
            functionDeclarations: [
              {
                name: "download_report",
                description: "Download a report as a PDF file. Use this when the user asks to download, export, or save a report/list.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    topic: {
                      type: SchemaType.STRING,
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
                  type: SchemaType.OBJECT,
                  properties: {
                    page_name: {
                      type: SchemaType.STRING,
                      description: "The name of the page to navigate to: 'dashboard', 'projects', 'income', 'expenses', 'clients', 'reports', 'settings', 'shopping', 'assistant'."
                    }
                  },
                  required: ["page_name"]
                }
              }
            ]
          }];

          const modelsToTry = [
            { name: "gemini-1.5-flash", useTools: true },
            { name: "gemini-1.5-flash", useTools: false },
            { name: "gemini-2.0-flash", useTools: true },
            { name: "gemini-2.0-flash", useTools: false },
            { name: "gemini-pro", useTools: false }
          ];
          
          let result = null;
          let lastError = null;

          for (const modelConfig of modelsToTry) {
            let modelSuccess = false;
            let retries = 1; // Allow 1 retry per config
            
            while (retries >= 0 && !modelSuccess) {
              try {
                console.log(`[AI Model Config] Trying model: ${modelConfig.name} (Tools: ${modelConfig.useTools})`);
                const modelParams: any = { model: modelConfig.name };
                if (modelConfig.useTools) {
                  modelParams.tools = aiTools;
                }
                const model = genAI.getGenerativeModel(modelParams);
                
                if (modelConfig.name === "gemini-pro") {
                  // gemini-pro might not support systemInstruction properly
                  const historyWithSystem = [{ role: 'user', parts: [{ text: systemInstruction }]}, { role: 'model', parts: [{ text: 'Understood.' }]}, ...chatHistory];
                  result = await model.generateContent({ contents: historyWithSystem });
                } else {
                  result = await model.generateContent({
                     contents: chatHistory,
                     systemInstruction: systemInstruction 
                  });
                }
                
                modelSuccess = true;
                break; // Success! We found a working model.
              } catch (error: any) {
                console.warn(`[AI Model Config] Model ${modelConfig.name} (Tools: ${modelConfig.useTools}) failed:`, error.message || error);
                
                // Keep track of the most relevant error to show the user
                // API Key errors are more important than 404s
                const errorStr = (error.message || '').toLowerCase();
                const isApiKeyError = error.status === 400 && (errorStr.includes('api key') || errorStr.includes('expired') || errorStr.includes('key_invalid'));
                
                if (isApiKeyError) {
                   throw error; // Immediately throw, because no model will work with a bad API key
                }

                if (error.status === 429 || errorStr.includes('quota')) {
                   throw error; // Fail fast on quota exhausted
                }
                
                // If the error seems to be about tools validation, and we are using tools, remember it but continue
                if (error.status === 400 && errorStr.includes('tool')) {
                   lastError = error;
                   break;
                }

                if (!lastError || lastError.status === 404) {
                   lastError = error; // Prioritize non-404 errors as the root cause over "model not found"
                }

                const isTempError = error.status === 503 || error.status === 500 || error.status === 502 || error.status === 429 || errorStr.includes('fetch failed') || errorStr.includes('network');
                
                if (isTempError && retries > 0) {
                  retries--;
                  await new Promise(resolve => setTimeout(resolve, 1500)); // wait 1.5s before retry
                  continue;
                }
                
                break; // Move to next modelConfig if not retrying
              }
            }
            if (modelSuccess) {
               break;
            }
          }

          if (!result) {
            throw lastError || new Error("All AI models failed.");
          }
          
          const response = await result.response;
          const functionCalls = response.functionCalls();
          
          if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            
            if (call.name === "navigate_to_page") {
               const pageName = (call.args as any).page_name;
               const pathMap: any = {
                 'dashboard': '/',
                 'projects': '/projects',
                 'income': '/income',
                 'expenses': '/expenses',
                 'clients': '/clients',
                 'reports': '/reports',
                 'settings': '/settings',
                 'shopping': '/shopping-lists',
                 'assistant': '/ai-assistant'
               };
               const path = pathMap[pageName?.toLowerCase()] || '/';
               navigate(path);
               aiResponseText = `আমি আপনাকে ব্রাউজারের ${pageName} পেইজে নিয়ে এসেছি।`;
            } else if (call.name === "download_report") {
               const topic = (call.args as any).topic;
               
               const downloadPDF = (data: any[], filename: string, title: string) => {
                  if (!data || data.length === 0) return;
                  const doc = new jsPDF();
                  
                  // Add a title
                  doc.setFontSize(18);
                  doc.text(title, 14, 20);
                  
                  const headers = Object.keys(data[0] || {});
                  const rows = data.map(obj => Object.values(obj).map(v => v?.toString() || ''));
                  
                  autoTable(doc, {
                    head: [headers],
                    body: rows,
                    startY: 30,
                    styles: { fontSize: 10, cellPadding: 3 },
                    headStyles: { fillColor: [63, 81, 181] },
                  });
                  
                  doc.save(filename);
               };
               
               switch(topic) {
                  case 'projects':
                     downloadPDF(contextData.projectsList, `Projects_Report_${Date.now()}.pdf`, 'Projects Report');
                     aiResponseText = "প্রজেক্ট লিস্ট এর ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
                     break;
                  case 'income':
                     downloadPDF(contextData.incomeList, `Income_Report_${Date.now()}.pdf`, 'Income Report');
                     aiResponseText = "আয় এর রিপোর্ট ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
                     break;
                  case 'expense':
                     downloadPDF(contextData.expenseList, `Expense_Report_${Date.now()}.pdf`, 'Expense Report');
                     aiResponseText = "ব্যয়ের রিপোর্ট ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
                     break;
                  case 'clients':
                     downloadPDF(contextData.clientsList, `Clients_Report_${Date.now()}.pdf`, 'Clients Report');
                     aiResponseText = "ক্লায়েন্ট লিস্টের ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
                     break;
                  default:
                     downloadPDF(contextData.projectsList, `Report_${Date.now()}.pdf`, 'Report');
                     aiResponseText = "আপনার রিপোর্টটি ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
               }
            } else {
               aiResponseText = response.text() || "আমি প্রক্রিয়াটি সম্পন্ন করেছি।";
            }
          } else {
            aiResponseText = response.text() || "কোনো উত্তর পাইনি।";
          }
        }
      } catch (error: any) {
        console.error("AI Request Failed Details:", error);
        if (error.message?.includes("expired") || error.message?.includes("API key not valid") || error.status === 400) {
          aiResponseText = "আপনার এপিআই কি (API Key) টি কার্যকর নয় বা মেয়াদ শেষ হয়ে গেছে। আপনি যদি Vercel-এ নতুন কি (Key) আপডেট করে Redeploy করে থাকেন, তবে দয়া করে ব্রাউজারে Hard Reload (Ctrl+Shift+R) দিন অথবা সেটিংস থেকে 'অ্যাপ ক্যাশ ক্লিয়ার' করুন। কারণ ব্রাউজার আগের কি (Key) ক্যাশ করে রেখেছে।";
        } else if (error.message?.includes("not found") || error.status === 404) {
          aiResponseText = "দুঃখিত, এই এপিআই কি (API Key) দিয়ে জেমিনি মডেলটি পাওয়া যাচ্ছে না (404 Error)। নিশ্চিত করুন যে আপনার কি-টি 'AIza' দিয়ে শুরু হয়েছে (A, I - বড় হাতের) এবং Google AI Studio-তে Gemini API সচল আছে। টাইপ করার সময় 'I' (বড় হাতের আই) আর 'l' (ছোট হাতের এল) এর মধ্যে পার্থক্য খেয়াল করুন।";
        } else if (error.message?.includes("quota")) {
          aiResponseText = "এপিআই কোটা শেষ হয়ে গেছে। কিছুক্ষণ পর চেষ্টা করুন।";
        } else {
          aiResponseText = "সার্ভারে অতিরিক্ত চাপ বা নেটওয়ার্ক সমস্যার কারণে যোগাযোগ করা যাচ্ছে না। দয়া করে একটু পর আবার চেষ্টা করুন।";
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText
      }]);
      
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = 'দুঃখিত, কোনো একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      
      if (error?.status === 429 || error?.message?.includes('429')) {
         errorMessage = 'দুঃখিত, কোটা শেষ হয়ে গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-40px)]">
      {/* Header */}
      <div className="px-4 py-4 sm:px-6 sm:py-6 shrink-0 bg-white border-b border-indigo-50/50 rounded-t-3xl shadow-sm z-10 flex items-center gap-3">
         <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
             <Bot size={24} />
         </div>
         <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
              এআই অ্যাসিস্ট্যান্ট
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500">আপনার ব্যক্তিগত স্মার্ট হেল্পার</p>
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] space-y-6">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              <div className={`p-3.5 sm:p-4 rounded-2xl ${
                  message.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' 
                  : 'bg-white text-slate-700 rounded-tl-sm shadow-sm border border-slate-100'
                }`}
                style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
              >
                <div className="text-sm font-medium leading-relaxed markdown-body">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                       ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                       ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2" {...props} />,
                       p: ({node, ...props}) => <p className="my-1" {...props} />,
                       strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                       h1: ({node, ...props}) => <h1 className="text-lg font-bold my-2" {...props} />,
                       h2: ({node, ...props}) => <h2 className="text-base font-bold my-2" {...props} />,
                       h3: ({node, ...props}) => <h3 className="text-sm font-bold my-1" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] flex-row">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-white border border-slate-200 text-indigo-600">
                <Bot size={18} />
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white text-slate-700 rounded-tl-sm shadow-sm border border-slate-100 flex items-center gap-1.5 h-[52px]">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 sm:p-6 bg-white border-t border-slate-100 rounded-b-3xl">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-[32px] focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all shadow-sm p-1.5 pr-2 pl-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="flex-1 bg-transparent border-none px-4 py-3 text-sm sm:text-base font-medium text-slate-700 focus:outline-none resize-none min-h-[52px] max-h-[150px] leading-relaxed"
              style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
              rows={1}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                !input.trim() || isLoading 
                ? 'bg-slate-200 text-slate-400' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              <Send size={20} className={`${isLoading ? 'opacity-50' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
