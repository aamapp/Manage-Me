import React, { useRef, useState } from 'react';
import { ArrowLeft, Download, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';

export const IconGenerator: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const iconRef = useRef<HTMLDivElement>(null);

  const downloadIcon = async () => {
    if (!iconRef.current) return;
    setIsCapturing(true);
    
    try {
      // Create a high-resolution canvas (1024x1024)
      const canvas = await html2canvas(iconRef.current, {
        width: 1024,
        height: 1024,
        scale: 1, // We set the div size to 1024px below
        backgroundColor: null,
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = "icon.png";
      link.click();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      alert('আইকন সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsCapturing(false);
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
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Manage-Me হাই-রেজোলিউশন আইকন</h1>
          <p className="text-slate-500 mb-10 max-w-md mx-auto">
            নিচের লোগোটি আপনার দেওয়া ডিজাইনের হুবহু কপি এবং এটি ১০২৪x১০২৪ পিক্সেল সাইজের। এটি ডাউনলোড করে ব্যবহার করুন।
          </p>

          <div className="space-y-10">
            {/* The Icon Source (Hidden from view but used for capture) */}
            <div className="flex justify-center">
              <div 
                ref={iconRef}
                style={{ 
                  width: '1024px', 
                  height: '1024px', 
                  backgroundColor: '#6366f1', 
                  borderRadius: '22%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'absolute',
                  left: '-9999px',
                  top: '0',
                  overflow: 'hidden'
                }}
              >
                <span style={{ 
                  color: 'white', 
                  fontSize: '650px', 
                  fontWeight: '900', 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  display: 'block',
                  transform: 'translateY(-20px)', // Nudge up to compensate for font baseline
                  textAlign: 'center'
                }}>M</span>
              </div>

              {/* Preview Version */}
              <div className="w-64 h-64 bg-[#6366f1] rounded-[22%] shadow-2xl flex items-center justify-center border-4 border-white overflow-hidden">
                <span className="text-white text-[160px] font-black select-none transform -translate-y-1">M</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-center">
              <button
                onClick={downloadIcon}
                disabled={isCapturing}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg
                  ${done ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}
                `}
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>প্রসেসিং হচ্ছে...</span>
                  </>
                ) : done ? (
                  <>
                    <Check size={20} />
                    <span>ডাউনলোড হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>icon.png ডাউনলোড করুন</span>
                  </>
                )}
              </button>
              
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-left text-sm text-amber-900 max-w-md mt-4">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-[10px]">!</span>
                  পরবর্তী ধাপগুলো:
                </h3>
                <ol className="list-decimal list-inside space-y-2 opacity-90">
                  <li>ডাউনলোড করা ফাইলটি <b>public/icon.png</b> নামে সেভ করুন।</li>
                  <li>অনলাইন কনভার্টার (যেমন: <a href="https://convertico.com" target="_blank" className="underline font-bold">convertico.com</a>) দিয়ে এটি থেকে <b>icon.ico</b> তৈরি করুন।</li>
                  <li><b>icon.ico</b> ফাইলটিও <b>public/</b> ফোল্ডারে রাখুন।</li>
                  <li>সবশেষে <code>npm run electron:build</code> কমান্ড দিন।</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
