import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AppUpdate {
  id: number;
  version_code: number;
  version_name: string;
  download_url: string;
  is_force_update: boolean;
  update_message: string;
  created_at: string;
}

export const AppUpdateChecker: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdate | null>(null);
  const [currentVersionCode, setCurrentVersionCode] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // ১. URL বা হ্যাশ থেকে version_code সংগ্রহ ও স্টোর করা
    const getVersionFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      let urlVersion = urlParams.get('version_code') || urlParams.get('v');

      if (!urlVersion) {
        // Hash router এর জন্য চেক
        const hash = window.location.hash;
        const qStrIdx = hash.indexOf('?');
        if (qStrIdx !== -1) {
          const hashParams = new URLSearchParams(hash.substring(qStrIdx));
          urlVersion = hashParams.get('version_code') || hashParams.get('v');
        }
      }

      if (urlVersion) {
        const parsed = parseInt(urlVersion, 10);
        if (!isNaN(parsed)) {
          localStorage.setItem('android_app_version_code', parsed.toString());
          return parsed;
        }
      }

      // ক্যাশেড ভার্সন চেক
      const cached = localStorage.getItem('android_app_version_code');
      if (cached) {
        const parsed = parseInt(cached, 10);
        if (!isNaN(parsed)) return parsed;
      }

      return null;
    };

    const localVersion = getVersionFromUrl();
    if (localVersion !== null) {
      setCurrentVersionCode(localVersion);
      checkForUpdate(localVersion);
    }
  }, []);

  const checkForUpdate = async (localVersion: number) => {
    try {
      // সুপাবেজ থেকে সর্বশেষ আপডেট তথ্য আনা
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking for update:', error);
        return;
      }

      if (data) {
        const update = data as AppUpdate;
        // যদি ডাটাবেজের version_code আমাদের বর্তমান ইনস্টলড version_code এর চেয়ে বড় হয়
        if (update.version_code > localVersion) {
          setUpdateInfo(update);
          // সেশন অনুযায়ী ডিসমিস করা হয়েছে কিনা চেক (Force update হলে ডিসমিস করা যাবে না)
          const sessionDismissed = sessionStorage.getItem(`update_dismissed_${update.version_code}`);
          if (!sessionDismissed || update.is_force_update) {
            setShowModal(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse update version:', err);
    }
  };

  const handleDownload = () => {
    if (!updateInfo) return;
    // ব্রাউজারে ডাউনলোড লিংক ওপেন করা
    window.open(updateInfo.download_url, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    if (updateInfo?.is_force_update) return; // ফোর্সড আপডেট হলে ক্লোজ করা যাবে না
    setShowModal(false);
    setIsDismissed(true);
    if (updateInfo) {
      sessionStorage.setItem(`update_dismissed_${updateInfo.version_code}`, 'true');
    }
  };

  if (!showModal || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl"
        >
          {/* Top warning stripe if force update */}
          <div className={`h-2 w-full ${updateInfo.is_force_update ? 'bg-amber-500' : 'bg-emerald-500'}`} />

          {/* Close button (Only show if not a force update) */}
          {!updateInfo.is_force_update && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              id="update-dialog-close"
            >
              <X size={20} />
            </button>
          )}

          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            {/* Visual Indicator Icon */}
            <div className={`p-4 rounded-2xl mb-5 ${updateInfo.is_force_update ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {updateInfo.is_force_update ? (
                <AlertTriangle size={36} className="animate-bounce" />
              ) : (
                <Download size={36} className="animate-pulse" />
              )}
            </div>

            {/* Typography */}
            <h2 className="text-2xl font-bold font-sans text-white mb-2 leading-tight">
              {updateInfo.is_force_update ? 'জরুরী আপডেট উপলব্ধ!' : 'নতুন সংস্করণ অবমুক্ত!'}
            </h2>
            <p className="text-sm font-mono text-slate-400 mb-4 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-800 inline-block">
              ভার্সন {updateInfo.version_name} (Build {updateInfo.version_code})
            </p>

            {/* Change log / Message Container */}
            <div className="w-full text-left bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-6 max-h-[160px] overflow-y-auto custom-scrollbar">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">আপডেট বার্তা:</span>
              <p className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {updateInfo.update_message || 'বাগ ফিক্সিং এবং পারফরম্যান্স ইমপ্রুভমেন্ট করা হয়েছে।'}
              </p>
            </div>

            {/* Notice for Force Updates */}
            {updateInfo.is_force_update && (
              <p className="text-xs text-amber-400/80 mb-6 font-sans flex items-center justify-center gap-1.5 bg-amber-950/20 border border-amber-900/30 w-full py-2.5 rounded-xl px-2">
                <AlertTriangle size={14} /> এই আপডেটটি ব্যতিরেকে অ্যাপ ব্যবহার করা যাবে না।
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleDownload}
                className="w-full py-4 px-6 text-white text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                id="update-download-btn"
              >
                <Download size={20} />
                এখনই আপডেট করুন
              </button>

              {!updateInfo.is_force_update && (
                <button
                  onClick={handleClose}
                  className="w-full py-3.5 px-6 text-slate-400 hover:text-white text-sm font-medium rounded-2xl bg-transparent hover:bg-slate-800/50 active:scale-[0.98] transition"
                  id="update-later-btn"
                >
                  পরবর্তীতে মনে করান
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
