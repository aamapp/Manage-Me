import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      2. Greetings: If the user greets you, reply with "আসসালামু আলাইকুম" or "ওয়ালাইকুম আসসালাম". Do not add greetings in the middle or start of regular answers if the user didn't greet you first.
      3. Understanding Context: Read the user's intent. If they ask about income, don't just dump data—summarize it nicely.
      4. Formatting: Use Markdown (bold, lists) to make your answers easy to read, but keep the tone conversational.
      5. Don't mention JSON or system data. Just answer naturally based on the data provided.
      
      Today's date is: ${new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (ISO: ${new Date().toISOString()}).
      
      Here is the current state of the application data:
      ${JSON.stringify(contextData)}`;

      // Accessing the API key
      const getApiKey = () => {
        const key = (process as any).env?.GEMINI_API_KEY || 
                    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                    (import.meta as any).env?.GEMINI_API_KEY;
        
        const finalKey = key ? key.trim() : null;
        
        // Ignore the placeholder string from AI Studio
        if (finalKey === "AI Studio Free Tier" || !finalKey) {
          console.log("[AI Key Debug] No valid key found (placeholder or empty).");
          return null;
        }

        console.log(`[AI Key Debug] Key loaded. Prefix: "${finalKey.substring(0, 4)}", Length: ${finalKey.length}`);
        return finalKey;
      };

      const apiKey = getApiKey();
      
      let aiResponseText = 'দুঃখিত, এমুহূর্তে আমি উত্তর দিতে পারছি না, কারণ এআই কনফিগার করা নেই। আপনার সেটিংস বা ব্রাউজারের এনভায়রনমেন্টে এপিআই কি (API Key) সঠিকভাবে দেওয়া হয়েছে কিনা চেক করুন।';
      
      try {
        if (apiKey && apiKey.length > 20) {
          // Standard initialization for @google/generative-ai
          const genAI = new GoogleGenerativeAI(apiKey);
          
          // Using a more standard model reference
          const modelName = 'gemini-1.5-flash';
          console.log(`[AI Request] Using model: ${modelName}`);

          const model = genAI.getGenerativeModel({ 
            model: modelName,
          });
          
          let chatHistory = [...messages, userMessage].map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          }));
          
          // Ensure alternating roles and starting with user
          if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
             chatHistory.shift();
          }

          const result = await model.generateContent({
             contents: chatHistory,
             systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] } as any
          });
          
          const response = await result.response;
          aiResponseText = response.text() || 'কোনো উত্তর পাইনি।';
        } else {
          aiResponseText = 'দুঃখিত, এপিআই কি (API Key) পাওয়া যায়নি। দয়া করে সেটিংস থেকে GEMINI_API_KEY টি সঠিকভাবে সেট করুন।';
        }
      } catch (error: any) {
        console.error('AI Error Details:', error);
        if (error.message?.includes('API key not valid') || (error.status === 400 && error.message?.includes('invalid'))) {
          aiResponseText = 'আপনার দেওয়া এপিআই কি (API Key) টি সঠিক নয়। এআই স্টুডিও থেকে নতুন একটি কী জেনারেট করে সেটিংস-এ আপডেট করার চেষ্টা করুন এবং নিশ্চিত করুন যে এর সাথে কোনো বাড়তি স্পেস নেই।';
        } else if (error.message?.includes('quota') || error.status === 429) {
          aiResponseText = 'দুঃখিত, এপিআই কোটা (Quota) শেষ হয়ে গেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
        } else {
          aiResponseText = 'দুঃখিত, এআই সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।';
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
