import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ArrowLeft, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IconGenerator: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateIcon = async () => {
    setLoading(true);
    try {
      // Use the API key from the environment
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: "A high-quality, professional app icon for a software named 'Manage-Me'. The design features a vibrant purple square with rounded corners (iOS style). In the center, there is a clean, bold, white letter 'M'. The style is minimalist, modern, and flat design, with a very subtle gradient on the purple background. 1024x1024 resolution, sharp edges, no text other than the letter M, centered perfectly.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData) {
        setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
      }
    } catch (error) {
      console.error("Error generating icon:", error);
      alert("আইকন তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>ফিরে যান</span>
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ImageIcon size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Manage-Me আইকন জেনারেটর</h1>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            আপনার অ্যাপের জন্য একটি হাই-রেজোলিউশন (১০২৪x১০২৪) আইকন তৈরি করুন। এটি আপনার দেওয়া ডিজাইনের মতো হবে।
          </p>

          {!imageUrl ? (
            <button
              onClick={generateIcon}
              disabled={loading}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>তৈরি হচ্ছে...</span>
                </>
              ) : (
                <span>আইকন তৈরি করুন</span>
              )}
            </button>
          ) : (
            <div className="space-y-6">
              <div className="relative group inline-block">
                <img 
                  src={imageUrl} 
                  alt="Generated Icon" 
                  className="w-64 h-64 rounded-[22%] shadow-2xl border-4 border-white mx-auto"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22%] flex items-center justify-center">
                  <p className="text-white text-sm font-medium">১০২৪ x ১০২৪ পিক্সেল</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 items-center">
                <a 
                  href={imageUrl} 
                  download="icon.png"
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={18} />
                  <span>icon.png ডাউনলোড করুন</span>
                </a>
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-left text-sm text-amber-800 max-w-md">
                  <h3 className="font-bold mb-1">পরবর্তী ধাপ:</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>ডাউনলোড করা ফাইলটি <b>public/icon.png</b> নামে সেভ করুন।</li>
                    <li>অনলাইন কনভার্টার (যেমন: convertico.com) ব্যবহার করে এটি থেকে <b>icon.ico</b> তৈরি করুন।</li>
                    <li><b>icon.ico</b> ফাইলটিও <b>public/</b> ফোল্ডারে রাখুন।</li>
                    <li>সবশেষে <code>npm run electron:build</code> কমান্ড দিন।</li>
                  </ol>
                </div>

                <button 
                  onClick={() => setImageUrl(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm underline"
                >
                  আবার তৈরি করুন
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
