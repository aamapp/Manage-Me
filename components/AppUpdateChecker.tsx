import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, AlertTriangle, CheckCircle2, RefreshCw, X, Loader2 } from 'lucide-react';
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

// Global window properties for WebView Communication
declare global {
  interface Window {
    Android?: {
      downloadAndInstallApk: (url: string) => void;
    };
    AndroidInterface?: {
      downloadAndInstallApk: (url: string) => void;
    };
    setUpdateProgress?: (progress: number) => void;
    setUpdateError?: (error: string) => void;
    setUpdateComplete?: () => void;
  }
}

export const AppUpdateChecker: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdate | null>(null);
  const [currentVersionCode, setCurrentVersionCode] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Download & Progress State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [totalSizeText, setTotalSizeText] = useState<string>('');
  const [dowloadedSizeText, setDownloadedSizeText] = useState<string>('');

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

    // Android WebView রিয়েল-টাইমCallbacks রেজিস্টার করা
    window.setUpdateProgress = (progress: number) => {
      setIsDownloading(true);
      setDownloadProgress(Math.min(100, Math.max(0, progress)));
      setDownloadStatus(`ডাউনলোড হচ্ছে... ${progress}%`);
    };

    window.setUpdateError = (errorMsg: string) => {
      setIsDownloading(false);
      setDownloadStatus(`ত্রুটি: ${errorMsg}`);
      alert(`ডাউনলোড ব্যর্থ হয়েছে: ${errorMsg}`);
    };

    window.setUpdateComplete = () => {
      setDownloadProgress(100);
      setDownloadStatus('ডাউনলোড সম্পন্ন! ইনস্টল করা হচ্ছে...');
      setTimeout(() => {
        setIsDownloading(false);
      }, 5000);
    };

    return () => {
      delete window.setUpdateProgress;
      delete window.setUpdateError;
      delete window.setUpdateComplete;
    };
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

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    if (!updateInfo) return;

    // ১. চেক করা যে কোনো এন্ড্রয়েড ইন্টারফেস উপলব্ধ আছে কিনা (WebView context)
    const androidInterface = window.Android || window.AndroidInterface;

    if (androidInterface && typeof androidInterface.downloadAndInstallApk === 'function') {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadStatus('ডাউনলোড শুরু হচ্ছে (অ্যাপের মাধ্যমে)...');
      try {
        androidInterface.downloadAndInstallApk(updateInfo.download_url);
      } catch (err: any) {
        console.error('Android bridge call failed:', err);
        // Fallback to Web standard download
        startWebStandardDownload();
      }
    } else {
      // ২. স্ট্যান্ডার্ড ওয়েব ডাউনলোডার প্রগ্রেস বারসহ (FallBack)
      startWebStandardDownload();
    }
  };

  const startWebStandardDownload = () => {
    if (!updateInfo) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('ডাউনলোড প্রস্তুত করা হচ্ছে...');
    setDownloadedSizeText('');
    setTotalSizeText('');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', updateInfo.download_url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setDownloadProgress(percentComplete);
        setDownloadedSizeText(formatBytes(event.loaded));
        setTotalSizeText(formatBytes(event.total));
        setDownloadStatus(`ডাউনলোড হচ্ছে... ${percentComplete}%`);
      } else {
        setDownloadStatus('ডাউনলোড হচ্ছে...');
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setDownloadProgress(100);
        setDownloadStatus('ডাউনলোড সম্পূর্ণ হয়েছে!');
        
        const blob = xhr.response;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app-update-${updateInfo.version_name}.apk`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // ফ্লাশ ব্যাকগ্রাউন্ড স্ট্যাটাস
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 3000);
      } else {
        setIsDownloading(false);
        setDownloadStatus('ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        alert('সার্ভার থেকে ফাইলটি ডাউনলোড করা যায়নি।');
      }
    };

    xhr.onerror = () => {
      setIsDownloading(false);
      setDownloadStatus('নেটওয়ার্ক ত্রুটি! কানেকশন চেক করুন।');
      alert('নেটওয়ার্ক সংযোগ ত্রুটি ঘটেছে।');
    };

    xhr.send();
  };

  const handleClose = () => {
    if (updateInfo?.is_force_update) return; // ফোর্সড আপডেট হলে ক্লোজ করা যাবে না
    if (isDownloading) return; // ডাউনলোড চলাকালীন ক্লোজ করা যাবে না
    setShowModal(false);
    setIsDismissed(true);
    if (updateInfo) {
      sessionStorage.setItem(`update_dismissed_${updateInfo.version_code}`, 'true');
    }
  };

  if (!showModal || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-fade-in"
        >
          {/* Top warning stripe if force update */}
          <div className={`h-2 w-full ${updateInfo.is_force_update ? 'bg-amber-500' : 'bg-emerald-500'}`} />

          {/* Close button (Only show if not a force update and not currently downloading) */}
          {!updateInfo.is_force_update && !isDownloading && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              id="update-dialog-close"
            >
              <X size={20} />
            </button>
          )}

          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            {/* Visual Indicator Icon states */}
            <div className={`p-4 rounded-2xl mb-5 ${updateInfo.is_force_update ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {isDownloading ? (
                <Loader2 size={36} className="animate-spin text-emerald-400" />
              ) : updateInfo.is_force_update ? (
                <AlertTriangle size={36} className="animate-bounce" />
              ) : (
                <Download size={36} className="animate-pulse" />
              )}
            </div>

            {/* Typography */}
            <h2 className="text-2xl font-bold font-sans text-white mb-2 leading-tight">
              {isDownloading ? 'আপডেট ডাউনলোড হচ্ছে...' : updateInfo.is_force_update ? 'জরুরী আপডেট উপলব্ধ!' : 'নতুন সংস্করণ অবমুক্ত!'}
            </h2>
            <p className="text-sm font-mono text-slate-400 mb-4 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-800 inline-block">
              ভার্সন {updateInfo.version_name} (Build {updateInfo.version_code})
            </p>

            {/* If downloading, show progress, else show release notes */}
            {isDownloading ? (
              <div className="w-full flex flex-col items-stretch text-left bg-slate-950/40 border border-slate-800/40 rounded-2xl p-5 mb-6">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5 font-sans">
                    <Loader2 size={14} className="animate-spin" /> {downloadStatus || 'ডাউনলোড হচ্ছে...'}
                  </span>
                  <span className="text-base font-bold font-mono text-white">
                    {downloadProgress}%
                  </span>
                </div>

                {/* Outer Progress bar */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-2 shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Byte Counter Text */}
                {dowloadedSizeText && totalSizeText && (
                  <div className="flex justify-end text-xs font-mono text-slate-500">
                    <span>{dowloadedSizeText} / {totalSizeText}</span>
                  </div>
                )}
                
                <p className="text-xs text-slate-400 mt-3 text-center leading-relaxed">
                  অনুগ্রহ করে অপেক্ষা করুন। ডাউনলোড চলাকালীন অ্যাপটি বন্ধ করবেন না।
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              {!isDownloading ? (
                <button
                  onClick={handleDownload}
                  className="w-full py-4 px-6 text-white text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                  id="update-download-btn"
                >
                  <Download size={20} />
                  এখনই আপডেট করুন
                </button>
              ) : (
                <div className="w-full py-4 px-6 text-slate-500 text-sm font-medium rounded-2xl bg-slate-800/20 border border-slate-800/30 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  ডাউনলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...
                </div>
              )}

              {!updateInfo.is_force_update && !isDownloading && (
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

