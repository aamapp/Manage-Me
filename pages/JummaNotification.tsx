import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const JummaNotification = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 z-10 bg-white px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-800" />
        </button>
        <h1 className="text-[19px] font-normal text-slate-800" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>নোটিফিকেশন বিস্তারিত</h1>
      </div>

      <div>
        <img 
          src="https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/JUMMA_MUBARAK_IMG.png" 
          alt="Jumma Mubarak" 
          className="w-full h-auto object-cover"
        />
      </div>

      <div className="p-5">
        <h2 className="text-[22px] font-bold text-slate-800 mb-1 flex items-center gap-2" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
          জুম্মা মোবারক 🥰
        </h2>
        <p className="text-slate-400 text-[13px] mb-6">
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, 09:00 AM
        </p>

        <div className="space-y-4 text-[16px] leading-relaxed text-slate-700" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
          <p>আজ শুক্রবার ছুটির দিন।<br/>সপ্তাহের শেষ দিনটা একটু নিজের জন্যও রাখো না?<br/>এক কাপ চা, পরিবারের সাথে আড্ডা আর... একটু<br/>আয় ব্যয় চেক করে দেখো কোথায় কী গেল 😄</p>
          <p>যত হিসাব ঠিক, মন তত হাল্কা! এখনই খরচ-আয়<br/>একটু মিলিয়ে নাও, দেখবে মাথাটা হালকা লাগবে।</p>
          <p>শুভ জুম্মা আরেকবার! ছুটির দিনটা দারুণ কাটুক 💚</p>
          <p className="pt-2 text-slate-500">— তোমার আয় ব্যয়</p>
        </div>
      </div>
    </div>
  );
};
