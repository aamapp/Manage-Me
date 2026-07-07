import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Loader2, ArrowLeft, Copy, Check, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { generateAiResponse, generateAiImage } from "@/services/geminiService";

interface Message {
  id: string;
  role: "user" | "assistant";
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
    user,
  } = useAppContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "আসসালামু আলাইকুম! আমি আপনার এআই অ্যাসিস্ট্যান্ট। আপনার প্রজেক্ট, ক্লায়েন্ট, ইনকাম বা খরচ সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- VOICE & AUDIO CALL MODE STATE & REFS ---
  const [isCallMode, setIsCallMode] = useState(false);
  const [isListeningText, setIsListeningText] = useState(false); // for quick text area microphone
  const [callStatus, setCallStatus] = useState<"connecting" | "listening" | "thinking" | "speaking" | "muted">("connecting");
  const [userTranscript, setUserTranscript] = useState("");
  const [aiSpeechOutput, setAiSpeechOutput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const textMicRecognitionRef = useRef<any>(null);
  const callRecognitionRef = useRef<any>(null);
  const isCallModeRef = useRef(false);
  const isMutedRef = useRef(false);
  const latestTranscriptRef = useRef("");

  useEffect(() => {
    isCallModeRef.current = isCallMode;
  }, [isCallMode]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (textMicRecognitionRef.current) {
        try { textMicRecognitionRef.current.stop(); } catch (e) {}
      }
      if (callRecognitionRef.current) {
        try { callRecognitionRef.current.stop(); } catch (e) {}
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // 1. Voice-to-Text Typing inside the normal text box
  const startTextMicListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("দুঃখিত, আপনার ব্রাউজারে ভয়েস ইনপুট সাপোর্ট করে না। দয়া করে গুগল ক্রোম ব্রাউজার ব্যবহার করুন।");
      return;
    }

    if (isListeningText) {
      try {
        textMicRecognitionRef.current?.stop();
      } catch (e) {}
      setIsListeningText(false);
      return;
    }

    window.speechSynthesis?.cancel(); // Cancel any speech reading if active

    const recognition = new SpeechRecognition();
    recognition.lang = "bn-BD";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListeningText(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert("মাইক্রোফোন অ্যাক্সেস ব্লক করা আছে। দয়া করে আপনার ব্রাউজারের অ্যাড্রেস বারের লক আইকনে ক্লিক করে মাইক্রোফোন ব্যবহারের অনুমতি (Allow) দিন, অথবা অ্যাপটি নতুন ট্যাবে (Open in new tab) ওপেন করুন।");
      } else if (event.error === "network") {
        alert("দুঃখিত, ইন্টারনেট বা নেটওয়ার্ক সংযোগে সমস্যা হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।");
      }
      setIsListeningText(false);
    };

    recognition.onend = () => {
      setIsListeningText(false);
    };

    textMicRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListeningText(false);
    }
  };

  // 2. Immersive Hands-Free Audio Call Mode
  const speakBengaliText = (text: string, callback?: () => void) => {
    if (!window.speechSynthesis) {
      if (callback) callback();
      return;
    }

    window.speechSynthesis.cancel();

    if (!isSpeakerOn) {
      if (callback) callback();
      return;
    }

    // Clean markdown, links, and formatting before speaking
    const cleanText = text
      .replace(/!\[.*\]\(.*\)/g, "") // remove markdown images
      .replace(/[*#_`\-[\]()]/g, "") // remove basic markdown formatting
      .replace(/https?:\/\/[^\s]+/g, "") // remove links
      .replace(/৳/g, "টাকা") // replace currency symbols with words for better pronunciation
      .trim();

    if (!cleanText) {
      if (callback) callback();
      return;
    }

    // Check if running in Android WebView with native TTS Interface
    if ((window as any).AndroidInterface && typeof (window as any).AndroidInterface.speak === "function") {
      try {
        let callbackCalled = false;
        (window as any).onAndroidSpeechEnd = () => {
          if (!callbackCalled) {
            callbackCalled = true;
            if (callback) callback();
          }
        };
        (window as any).AndroidInterface.speak(cleanText);
        // Fallback safety in case Android side doesn't trigger the end callback
        setTimeout(() => {
          if (!callbackCalled) {
            callbackCalled = true;
            if (callback) callback();
          }
        }, Math.max(3000, cleanText.length * 200));
        return;
      } catch (e) {
        console.error("Android native TTS bridge failed:", e);
      }
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "bn-BD";

    // Select suitable Bengali voice if available
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.includes("bn") || v.lang.includes("BN"));
    if (bnVoice) {
      utterance.voice = bnVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    let callbackCalled = false;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const safeCallback = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (callbackCalled) return;
      callbackCalled = true;
      if (callback) callback();
    };

    utterance.onend = () => {
      safeCallback();
    };

    utterance.onerror = (err) => {
      console.error("Speech synthesis error:", err);
      if (err.error === "interrupted" || err.error === "canceled") {
        return;
      }
      safeCallback();
    };

    // Calculate maximum duration based on text length: ~150 words per minute => 2.5 words per second
    // Let's allow plenty of time: 400ms per character plus a 5 second buffer
    const timeoutMs = Math.max(5000, cleanText.length * 400);
    fallbackTimer = setTimeout(() => {
      if (!callbackCalled) {
        console.warn("Speech synthesis timed out, forcing fallback callback.");
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
        safeCallback();
      }
    }, timeoutMs);

    window.speechSynthesis.speak(utterance);
  };

  const startCallRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || isMutedRef.current) return;

    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.onend = null;
        callRecognitionRef.current.onerror = null;
        callRecognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "bn-BD";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setCallStatus("listening");
      setUserTranscript("");
      latestTranscriptRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      setUserTranscript(combined);
      latestTranscriptRef.current = combined;
    };

    recognition.onerror = (event: any) => {
      console.error("Call speech error:", event.error);
      if (event.error === "not-allowed") {
        alert("মাইক্রোফোন অ্যাক্সেস ব্লক করা আছে। দয়া করে আপনার ব্রাউজারের অ্যাড্রেস বারের লক আইকনে ক্লিক করে মাইক্রোফোন ব্যবহারের অনুমতি (Allow) দিন, অথবা অ্যাপটি নতুন ট্যাবে (Open in new tab) ওপেন করুন।");
        terminateCall();
      } else if (event.error === "network") {
        console.warn("Call speech network issue detected, silent retry will trigger onend");
      }
    };

    recognition.onend = () => {
      const transcript = latestTranscriptRef.current;
      // Check if we captured valid Bengali voice input
      if (transcript.trim() && isCallModeRef.current && !isMutedRef.current) {
        submitVoiceQuery(transcript.trim());
      } else if (isCallModeRef.current && !isMutedRef.current) {
        // If nothing heard, wait a second and restart listening loop in call mode
        setTimeout(() => {
          if (isCallModeRef.current && !isMutedRef.current) {
            startCallRecognition();
          }
        }, 1200);
      }
    };

    callRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start call recognition:", e);
    }
  };

  const submitVoiceQuery = async (queryText: string) => {
    setCallStatus("thinking");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: queryText,
    };
    setMessages((prev) => [...prev, userMessage]);

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
        currency: user?.currency || '৳',
        projectsList: projects.map((p) => ({
          name: p.name,
          client: p.clientname,
          budget: p.totalamount,
          paid: p.paidamount,
          due: p.dueamount,
          status: p.status,
        })),
        incomeList: incomeRecords.map((i) => ({
          client: i.clientname,
          amount: i.amount,
          date: i.date,
        })),
        expenseList: expenses.map((e) => ({
          category: e.category,
          amount: e.amount,
          date: e.date,
        })),
        clientsList: clients.map((c) => ({
          name: c.name,
          totalProjects: c.totalprojects,
          totalEarnings: c.totalearnings,
        })),
      };

      const response = await generateAiResponse(
        queryText,
        messages.slice(1),
        contextData
      );

      let aiResponseText = "আমি আপনার কথাটি বুঝতে পেরেছি।";
      if (response.text) {
        aiResponseText = response.text;
      } else if (response.functionCall) {
        if (response.functionCall.name === "navigate_to_page") {
          const pageName = response.functionCall.args.page_name;
          aiResponseText = `আমি আপনাকে ব্রাউজারের ${pageName} পেইজে নিয়ে যাচ্ছি।`;
          setTimeout(() => {
            const pathMap: any = {
              dashboard: "/",
              projects: "/projects",
              income: "/income",
              expenses: "/expenses",
              clients: "/clients",
              reports: "/reports",
              settings: "/settings",
              shopping: "/shopping-lists",
              assistant: "/ai-assistant",
            };
            const path = pathMap[pageName?.toLowerCase()] || "/";
            navigate(path);
          }, 3000);
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponseText,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      setAiSpeechOutput(aiResponseText);
      setCallStatus("speaking");

      speakBengaliText(aiResponseText, () => {
        if (isCallModeRef.current && !isMutedRef.current) {
          setCallStatus("listening");
          setUserTranscript("");
          setTimeout(() => {
            startCallRecognition();
          }, 400);
        } else if (isCallModeRef.current && isMutedRef.current) {
          setCallStatus("muted");
        }
      });

    } catch (error: any) {
      console.error("AI voice processing error:", error);
      const errorMsg = "দুঃখিত, কোনো একটি নেটওয়ার্ক সমস্যা হয়েছে। দয়া করে আবার বলুন।";
      setAiSpeechOutput(errorMsg);
      setCallStatus("speaking");
      speakBengaliText(errorMsg, () => {
        if (isCallModeRef.current && !isMutedRef.current) {
          setCallStatus("listening");
          setUserTranscript("");
          startCallRecognition();
        }
      });
    }
  };

  const startAudioCall = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("দুঃখিত, আপনার ব্রাউজারে ভয়েস কল সাপোর্ট করে না। দয়া করে গুগল ক্রোম ব্যবহার করুন।");
      return;
    }

    if (textMicRecognitionRef.current) {
      try {
        textMicRecognitionRef.current.onend = null;
        textMicRecognitionRef.current.onerror = null;
        textMicRecognitionRef.current.stop();
      } catch (e) {}
      setIsListeningText(false);
    }

    setIsCallMode(true);
    setCallStatus("connecting");
    setUserTranscript("");

    const welcomeMessage = "আসসালামু আলাইকুম! আমি আপনার এআই অ্যাসিস্ট্যান্ট। আমি শুনছি, বলুন আপনাকে কীভাবে সাহায্য করতে পারি?";
    setAiSpeechOutput(welcomeMessage);

    window.speechSynthesis?.cancel();

    setTimeout(() => {
      setCallStatus("speaking");
      speakBengaliText(welcomeMessage, () => {
        if (!isMutedRef.current) {
          setCallStatus("listening");
          startCallRecognition();
        } else {
          setCallStatus("muted");
        }
      });
    }, 600);
  };

  const terminateCall = () => {
    setIsCallMode(false);
    window.speechSynthesis?.cancel();
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.onend = null;
        callRecognitionRef.current.onerror = null;
        callRecognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setCallStatus("listening");
      setTimeout(() => {
        startCallRecognition();
      }, 200);
    } else {
      setIsMuted(true);
      setCallStatus("muted");
      if (callRecognitionRef.current) {
        try {
          callRecognitionRef.current.onend = null;
          callRecognitionRef.current.onerror = null;
          callRecognitionRef.current.stop();
        } catch (e) {}
      }
    }
  };

  const toggleSpeaker = () => {
    if (isSpeakerOn) {
      setIsSpeakerOn(false);
      window.speechSynthesis?.cancel();
    } else {
      setIsSpeakerOn(true);
      if (aiSpeechOutput && callStatus === "speaking") {
        speakBengaliText(aiSpeechOutput);
      }
    }
  };

  const startLongPress = (id: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMessageId(id);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMessageId(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const totalBudget = projects.reduce(
        (sum, p) => sum + (p.totalamount || 0),
        0,
      );
      const totalPaid = projects.reduce(
        (sum, p) => sum + (p.paidamount || 0),
        0,
      );
      const totalDue = projects.reduce((sum, p) => sum + (p.dueamount || 0), 0);

      const totalIncome = incomeRecords.reduce(
        (sum, i) => sum + (i.amount || 0),
        0,
      );
      const totalExpense = expenses.reduce(
        (sum, i) => sum + (i.amount || 0),
        0,
      );

      const contextData = {
        totalProjects: projects.length,
        totalClients: clients.length,
        totalBudget,
        totalPaid,
        totalDue,
        totalIncome,
        totalExpense,
        currency: user?.currency || '৳',
        projectsList: projects.map((p) => ({
          name: p.name,
          client: p.clientname,
          type: p.type,
          budget: p.totalamount,
          paid: p.paidamount,
          due: p.dueamount,
          status: p.status,
        })),
        incomeList: incomeRecords.map((i) => ({
          client: i.clientname,
          project: i.projectname,
          amount: i.amount,
          date: i.date,
          method: i.method,
        })),
        expenseList: expenses.map((e) => ({
          category: e.category,
          amount: e.amount,
          date: e.date,
          notes: e.notes,
        })),
        clientsList: clients.map((c) => ({
          name: c.name,
          contact: c.contact,
          totalProjects: c.totalprojects,
          totalEarnings: c.totalearnings,
        })),
      };

      const response = await generateAiResponse(
        userMessage.content,
        messages.slice(1),
        contextData,
      );

      let aiResponseText = "আমি প্রক্রিয়াটি সম্পন্ন করেছি।";
      if (response.functionCall) {
        const call = response.functionCall;
        if (call.name === "navigate_to_page") {
          const pageName = call.args.page_name;
          const pathMap: any = {
            dashboard: "/",
            projects: "/projects",
            income: "/income",
            expenses: "/expenses",
            clients: "/clients",
            reports: "/reports",
            settings: "/settings",
            shopping: "/shopping-lists",
            assistant: "/ai-assistant",
          };
          const path = pathMap[pageName?.toLowerCase()] || "/";
          navigate(path);
          aiResponseText = `আমি আপনাকে ব্রাউজারের ${pageName} পেইজে নিয়ে এসেছি।`;
        } else if (call.name === "download_report") {
          const topic = call.args.topic;

          const downloadPDF = async (
            data: any[],
            filename: string,
            title: string,
          ) => {
            if (!data || data.length === 0) return;

            const headers = Object.keys(data[0] || {});
            
            // Create a wrapper element for rendering
            const element = document.createElement("div");
            element.style.padding = "20px";
            element.style.fontFamily = "'Kohinoor Bangla', sans-serif, Arial";
            element.style.backgroundColor = "white";
            
            // Title
            const h1 = document.createElement("h2");
            h1.innerText = title;
            h1.style.color = "#1e293b";
            h1.style.textAlign = "center";
            h1.style.marginBottom = "24px";
            element.appendChild(h1);
            
            // Table
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            table.style.marginBottom = "20px";
            table.style.fontSize = "12px";
            
            // Thead
            const thead = document.createElement("thead");
            const trHead = document.createElement("tr");
            headers.forEach(h => {
              const th = document.createElement("th");
              th.innerText = h.charAt(0).toUpperCase() + h.slice(1);
              th.style.borderBottom = "2px solid #cbd5e1";
              th.style.padding = "10px 8px";
              th.style.backgroundColor = "#f8fafc";
              th.style.color = "#334155";
              th.style.textAlign = "left";
              th.style.fontWeight = "bold";
              trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);
            
            // Tbody
            const tbody = document.createElement("tbody");
            data.forEach((row, i) => {
              const tr = document.createElement("tr");
              tr.style.backgroundColor = i % 2 === 0 ? "#ffffff" : "#f8fafc";
              headers.forEach(h => {
                const td = document.createElement("td");
                td.innerText = row[h]?.toString() || "";
                td.style.borderBottom = "1px solid #f1f5f9";
                td.style.padding = "10px 8px";
                td.style.color = "#475569";
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            
            element.appendChild(table);
            
            // Add to DOM temporarily to ensure fonts are rendered and available
            element.style.position = "absolute";
            element.style.left = "-9999px";
            element.style.top = "-9999px";
            document.body.appendChild(element);
            
            const opt = {
              margin:       15,
              filename:     filename,
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };
            
            try {
              // @ts-ignore
              const html2pdfModule = await import('html2pdf.js');
              const html2pdf: any = html2pdfModule.default ? html2pdfModule.default : html2pdfModule;
              await html2pdf().set(opt).from(element).save();
            } catch (err) {
              console.error("PDF generation failed:", err);
            } finally {
              if (document.body.contains(element)) {
                document.body.removeChild(element);
              }
            }
          };

          switch (topic) {
            case "projects":
              downloadPDF(
                contextData.projectsList,
                `Projects_Report_${Date.now()}.pdf`,
                "Projects Report",
              );
              aiResponseText =
                "প্রজেক্ট লিস্ট এর ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
              break;
            case "income":
              downloadPDF(
                contextData.incomeList,
                `Income_Report_${Date.now()}.pdf`,
                "Income Report",
              );
              aiResponseText =
                "আয় এর রিপোর্ট ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
              break;
            case "expense":
              downloadPDF(
                contextData.expenseList,
                `Expense_Report_${Date.now()}.pdf`,
                "Expense Report",
              );
              aiResponseText =
                "ব্যয়ের রিপোর্ট ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
              break;
            case "clients":
              downloadPDF(
                contextData.clientsList,
                `Clients_Report_${Date.now()}.pdf`,
                "Clients Report",
              );
              aiResponseText =
                "ক্লায়েন্ট লিস্টের ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
              break;
            default:
              downloadPDF(
                contextData.projectsList,
                `Report_${Date.now()}.pdf`,
                "Report",
              );
              aiResponseText =
                "আপনার রিপোর্টটি ডেটা অটোম্যাক যুক্ত হয়ে PDF ফাইল হিসেবে ডাউনলোড শুরু হয়েছে!";
          }
        } else if (call.name === "generate_image") {
          const prompt = call.args.prompt;
          
          try {
            const base64Url = await generateAiImage(prompt);
            aiResponseText = `![Generated Image](${base64Url})`;
          } catch (e: any) {
             console.error("Image gen error:", e);
             aiResponseText = e.message ? `দুঃখিত, ছবিটি তৈরি করা সম্ভব হয়নি: ${e.message}` : "দুঃখিত, ছবিটি তৈরি করা সম্ভব হয়নি। (দয়া করে API Key চেক করুন)";
          }
        }
      } else if (response.text) {
        aiResponseText = response.text;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponseText,
        },
      ]);
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage =
        error.message || "দুঃখিত, কোনো একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।";

      // If the error message is a JSON string (like from the API), show a generic Bengali message instead of raw JSON
      if (
        typeof errorMessage === "string" &&
        errorMessage.trim().startsWith("{")
      ) {
        errorMessage =
          "সার্ভারে সাময়িক সমস্যা হচ্ছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:static lg:inset-auto lg:h-[calc(100dvh-80px)] flex flex-col overflow-hidden bg-[#f8fafc] z-[100] lg:z-auto">
      {/* Header */}
      <div className="py-2 px-4 sm:px-6 sm:py-3 shrink-0 bg-white border-b border-indigo-50/50 lg:rounded-t-3xl shadow-sm z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            className="relative z-20 w-[38px] h-[38px] shrink-0 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors lg:hidden active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Bot size={20} />
          </div>
          <div className="min-w-0">
            <h1
              className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-none mb-0.5 truncate"
              style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
            >
              এআই অ্যাসিস্ট্যান্ট
            </h1>
            <p
              className="text-[11px] sm:text-xs font-bold text-slate-500 truncate"
              style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
            >
              আপনার ব্যক্তিগত স্মার্ট হেল্পার
            </p>
          </div>
        </div>

        {/* Voice Call Trigger Button */}
        {voiceSupported && (
          <button
            type="button"
            onClick={startAudioCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-all shadow-sm shadow-indigo-100 active:scale-95 animate-pulse shrink-0"
            style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
            title="এআই অডিও কল করুন"
          >
            <Phone size={12} className="animate-bounce" />
            <span>কল করুন</span>
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${message.role === "user" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-indigo-600"}`}
              >
                {message.role === "user" ? (
                  <User size={16} />
                ) : (
                  <Bot size={18} />
                )}
              </div>
              <div className="flex flex-col gap-1 items-start max-w-full">
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl cursor-pointer select-none transition-shadow ${
                    message.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm shadow-md"
                      : activeMessageId === message.id ? "bg-white text-slate-700 rounded-tl-sm shadow-md border border-indigo-200" : "bg-white text-slate-700 rounded-tl-sm shadow-sm border border-slate-100"
                  }`}
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif", WebkitTapHighlightColor: "transparent" }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (message.role === "assistant" && !message.content.includes("![Generated Image]")) {
                      setActiveMessageId(message.id);
                    }
                  }}
                  onTouchStart={() => {
                    if (message.role === "assistant" && !message.content.includes("![Generated Image]")) {
                       startLongPress(message.id);
                    }
                  }}
                  onTouchEnd={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onMouseDown={() => {
                    if (message.role === "assistant" && !message.content.includes("![Generated Image]")) {
                       startLongPress(message.id);
                    }
                  }}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onClick={() => {
                     if (message.role === "assistant" && !message.content.includes("![Generated Image]")) {
                       setActiveMessageId(prev => prev === message.id ? null : message.id);
                     }
                  }}
                >
                  <div className="text-sm font-medium leading-relaxed markdown-body">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-4 my-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal pl-4 my-2" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="my-1" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold" {...props} />
                        ),
                        h1: ({ node, ...props }) => (
                          <h1 className="text-lg font-bold my-2" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-base font-bold my-2" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-sm font-bold my-1" {...props} />
                        ),
                        img: ({ node, src, ...props }) => {
                          if (!src) return null;
                          return (
                            <img src={src} className="rounded-xl w-full max-w-sm mt-3 shadow-md" referrerPolicy="no-referrer" {...props} />
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {message.role === "assistant" && activeMessageId === message.id && (
                  <div className="flex items-center gap-2 mt-1 px-1 opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
                    >
                      {copiedId === message.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copiedId === message.id ? "কপি হয়েছে" : "কপি করুন"}
                    </button>
                  </div>
                )}
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
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-6 bg-[#f8fafc] lg:rounded-b-3xl">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all shadow-sm p-1 pr-1.5 pl-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="flex-1 bg-transparent border-none px-3 py-1.5 text-sm sm:text-base font-medium text-slate-700 focus:outline-none resize-none min-h-[38px] max-h-[150px] leading-relaxed"
              style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
              rows={1}
            />
            {/* Voice Typing Microphone Button */}
            {voiceSupported && (
              <button
                type="button"
                onClick={startTextMicListening}
                className={`shrink-0 w-9 h-9 mr-1.5 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  isListeningText
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
                title="ভয়েস টাইপিং করুন"
              >
                {isListeningText ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                !input.trim() || isLoading
                  ? "bg-slate-200 text-slate-400"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
              }`}
            >
              <Send
                size={18}
                className={`${isLoading ? "opacity-50" : ""}`}
              />
            </button>
          </div>
        </form>
      </div>

      {/* 3. FULL SCREEN AUDIO CALL MODE OVERLAY */}
      {isCallMode && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[200] flex flex-col justify-between p-6 text-white transition-all duration-300">
          {/* Call Header */}
          <div className="flex justify-between items-center w-full max-w-md mx-auto pt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-green-400 font-mono">
                {callStatus === "connecting" && "কানেক্টিং..."}
                {callStatus === "listening" && "আপনার কথা শুনছে..."}
                {callStatus === "thinking" && "ভাবছে..."}
                {callStatus === "speaking" && "কথা বলছে..."}
                {callStatus === "muted" && "মাইক মিউট করা"}
              </span>
            </div>
            <button
              type="button"
              onClick={terminateCall}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Central Pulsing Wave Area */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full gap-8">
            <div className="relative">
              {/* Concentric Pulsing Ripples */}
              {callStatus === "speaking" && isSpeakerOn && (
                <>
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full scale-150 animate-ping opacity-75" />
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full scale-125 animate-ping opacity-50" />
                </>
              )}
              {callStatus === "listening" && (
                <>
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full scale-150 animate-ping opacity-75" />
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full scale-125 animate-ping opacity-50" />
                </>
              )}
              {callStatus === "thinking" && (
                <div className="absolute inset-0 bg-purple-500/20 rounded-full scale-150 animate-pulse" />
              )}
              
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-indigo-600 border-4 border-white/20 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                <Bot size={48} className="text-white animate-bounce" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                এআই অডিও কল
              </h2>
              <p className="text-xs sm:text-sm text-slate-400" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                {callStatus === "connecting" && "অডিও লাইন সংযুক্ত হচ্ছে..."}
                {callStatus === "listening" && "নিদ্বিধায় আপনার প্রশ্নটি বলুন..."}
                {callStatus === "thinking" && "দয়া করে একটু অপেক্ষা করুন..."}
                {callStatus === "speaking" && "আপনার উত্তর দেওয়া হচ্ছে..."}
                {callStatus === "muted" && "মাইক আনমিউট করতে নিচের বাটনে চাপুন"}
              </p>
            </div>

            {/* EQ Visualizer representation */}
            <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs bg-white/5 rounded-2xl px-6">
              {callStatus === "speaking" && isSpeakerOn ? (
                // Speaking waves
                [...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-indigo-400 rounded-full"
                    style={{
                      height: `${30 + Math.sin(i + Date.now() / 100) * 40}%`,
                      animationName: "pulse",
                      animationDuration: "0.6s",
                      animationTimingFunction: "ease-in-out",
                      animationIterationCount: "infinite",
                      animationDirection: "alternate",
                      animationDelay: `${i * 80}ms`
                    }}
                  />
                ))
              ) : callStatus === "listening" ? (
                // Listening waves (green)
                [...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full"
                    style={{
                      height: `${20 + Math.cos(i + Date.now() / 100) * 30}%`,
                      animationName: "pulse",
                      animationDuration: "0.4s",
                      animationTimingFunction: "ease-in-out",
                      animationIterationCount: "infinite",
                      animationDirection: "alternate",
                      animationDelay: `${i * 50}ms`
                    }}
                  />
                ))
              ) : callStatus === "thinking" ? (
                // Thinking (loader)
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                // Silent / Idle bars
                [...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-2 bg-slate-600 rounded-full" />
                ))
              )}
            </div>

            {/* Real-time speech transcription boxes */}
            <div className="w-full space-y-3 px-2">
              {/* User transcript */}
              {userTranscript && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm max-h-[80px] overflow-y-auto">
                  <span className="text-[10px] text-emerald-400 block mb-0.5 font-semibold uppercase tracking-wider font-sans">আপনি বলছেন:</span>
                  <p className="text-slate-100 font-medium text-xs sm:text-sm" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                    {userTranscript}
                  </p>
                </div>
              )}

              {/* AI current spoken output */}
              {aiSpeechOutput && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm max-h-[150px] overflow-y-auto">
                  <span className="text-[10px] text-indigo-400 block mb-0.5 font-semibold uppercase tracking-wider font-sans">এআই উত্তর:</span>
                  <p className="text-slate-200 font-medium text-xs sm:text-sm leading-relaxed" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                    {aiSpeechOutput.replace(/[*#_`\-[\]()]/g, "")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Call Controls Area */}
          <div className="w-full max-w-md mx-auto flex items-center justify-around pb-8 pt-4 shrink-0">
            {/* Speaker Toggle Button */}
            <button
              type="button"
              onClick={toggleSpeaker}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border ${
                isSpeakerOn
                  ? "bg-white/10 text-white border-white/10 hover:bg-white/20"
                  : "bg-red-500/20 text-red-400 border-red-500/20 hover:bg-red-500/30"
              }`}
              title={isSpeakerOn ? "স্পিকার বন্ধ করুন" : "স্পিকার চালু করুন"}
            >
              {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={terminateCall}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all active:scale-90 hover:scale-105"
              title="কল শেষ করুন"
            >
              <PhoneOff size={24} />
            </button>

            {/* Mute Mic Button */}
            <button
              type="button"
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border ${
                !isMuted
                  ? "bg-white/10 text-white border-white/10 hover:bg-white/20"
                  : "bg-red-500/20 text-red-400 border-red-500/20 hover:bg-red-500/30 animate-pulse"
              }`}
              title={isMuted ? "মাইক চালু করুন" : "মাইক মিউট করুন"}
            >
              {!isMuted ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
