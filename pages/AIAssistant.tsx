import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { generateAiResponse } from '@/services/geminiService';

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
      content: 'আসসালামু আলাইকুম! আমি আপনার এআই অ্যাসিস্ট্যান্ট। আপনার প্রজেক্ট, ক্লায়েন্ট, ইনকাম বা খরচ সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।'
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
          status: p.status
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
        }))
      };

      const response = await generateAiResponse(userMessage.content, messages.slice(1), contextData);

      let aiResponseText = 'আমি প্রক্রিয়াটি সম্পন্ন করেছি।';
      if (response.functionCall) {
        const call = response.functionCall;
        if (call.name === "navigate_to_page") {
           const pageName = call.args.page_name;
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
           const topic = call.args.topic;
           
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
        }
      } else if (response.text) {
        aiResponseText = response.text;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText
      }]);
      
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = error.message || 'দুঃখিত, কোনো একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      
      // If the error message is a JSON string (like from the API), show a generic Bengali message instead of raw JSON
      if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
         errorMessage = 'সার্ভারে সাময়িক সমস্যা হচ্ছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
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
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
              এআই অ্যাসিস্ট্যান্ট
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>আপনার ব্যক্তিগত স্মার্ট হেল্পার</p>
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
