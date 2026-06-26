import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, AlertTriangle, CheckCircle2, RefreshCw, X, Loader2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AppLogo } from '@/components/AppLogo';

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
  const [isDemoMode, setIsDemoMode] = useState(false);

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

    const localVersion = getVersionFromUrl() || 10;
    if (!localStorage.getItem('android_app_version_code')) {
      localStorage.setItem('android_app_version_code', '10');
    }
    setCurrentVersionCode(localVersion);
    checkForUpdate(localVersion);

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

  // Listen for manual update check triggers from the Settings panel
  useEffect(() => {
    const handleManualCheck = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const callback = customEvent.detail?.callback;
      const localVersion = currentVersionCode || 10;
      
      try {
        const { data, error } = await supabase
          .from('app_updates')
          .select('*')
          .order('version_code', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          if (callback) callback({ success: false, error: 'সার্ভার থেকে তথ্য পাওয়া যায়নি।' });
          return;
        }

        if (data) {
          const update = data as AppUpdate;
          if (update.version_code > localVersion) {
            setUpdateInfo(update);
            setShowModal(true);
            if (callback) callback({ success: true, updateAvailable: true, update });
          } else {
            if (callback) callback({ success: true, updateAvailable: false, update });
          }
        } else {
          if (callback) callback({ success: true, updateAvailable: false });
        }
      } catch (err) {
        if (callback) callback({ success: false, error: 'ত্রুটি ঘটেছে।' });
      }
    };

    window.addEventListener('check-app-update-manually', handleManualCheck);
    return () => {
      window.removeEventListener('check-app-update-manually', handleManualCheck);
    };
  }, [currentVersionCode]);

  // Listen for demo mock updates trigger
  useEffect(() => {
    const handleDemoTrigger = () => {
      setIsDemoMode(true);
      setUpdateInfo({
        id: 0,
        version_code: 99,
        version_name: '2.5.0 (ডেমো)',
        download_url: '#',
        update_message: '✨ সম্পূর্ণ নতুন ও আধুনিক ইউজার ইন্টারফেস (UI/UX) ডিজাইন\n⚡ অপ্টিমাইজড ডাউনলোড ও ইনস্টলেশন স্পিড\n🛠️ অফলাইন ট্র্যাকিং সিস্টেম ও পারফরম্যান্স ইমপ্রুভমেন্ট\n📊 ডার্ক এবং লাইট মোড ইন্টারফেস ফিক্স সমূহ',
        is_force_update: false,
        created_at: new Date().toISOString()
      });
      setShowModal(true);
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadStatus('');
      setDownloadedSizeText('');
      setTotalSizeText('');
    };

    window.addEventListener('trigger-demo-update-modal', handleDemoTrigger);
    return () => {
      window.removeEventListener('trigger-demo-update-modal', handleDemoTrigger);
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
        // চেক করা যে কোনো এন্ড্রয়েড ইন্টারফেস উপলব্ধ আছে কিনা (WebView context)
        const isAndroidApp = !!(window.Android || window.AndroidInterface);
        // যদি ডাটাবেজের version_code আমাদের বর্তমান ইনস্টলড version_code এর চেয়ে বড় হয়
        if (update.version_code > localVersion) {
          setUpdateInfo(update);
          // সেশন অনুযায়ী ডিসমিস করা হয়েছে কিনা চেক (Force update হলে ডিসমিস করা যাবে না, তবে শুধুমাত্র এন্ড্রয়েড অ্যাপে)
          const sessionDismissed = sessionStorage.getItem(`update_dismissed_${update.version_code}`);
          const isForce = update.is_force_update && isAndroidApp;
          if (!sessionDismissed || isForce) {
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

    if (isDemoMode) {
      startSimulatedDemoDownload();
      return;
    }

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

  const startSimulatedDemoDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('ডাউনলোড প্রস্তুত করা হচ্ছে (ডেমো)...');
    setDownloadedSizeText('0 Bytes');
    setTotalSizeText('14.2 MB');

    let percent = 0;
    const totalBytes = 14.2 * 1024 * 1024;
    const interval = setInterval(() => {
      percent += Math.floor(Math.random() * 8) + 4;
      if (percent >= 100) {
        percent = 100;
        clearInterval(interval);
        setDownloadProgress(100);
        setDownloadedSizeText(formatBytes(totalBytes));
        setDownloadStatus('ডাউনলোড সম্পন্ন হয়েছে!');
        
        setTimeout(() => {
          setDownloadStatus('সংস্করণ ইনস্টল করা হচ্ছে...');
          setTimeout(() => {
            setIsDownloading(false);
            setDownloadProgress(0);
            setShowModal(false);
            setIsDemoMode(false);
          }, 2000);
        }, 1200);
      } else {
        const currentBytes = Math.floor((percent / 100) * totalBytes);
        setDownloadProgress(percent);
        setDownloadedSizeText(formatBytes(currentBytes));
        setDownloadStatus(`ডাউনলোড হচ্ছে... ${percent}%`);
      }
    }, 150);
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
    const isAndroidApp = !!(window.Android || window.AndroidInterface);
    if (updateInfo?.is_force_update && isAndroidApp) return; // ফোর্সড আপডেট হলে ক্লোজ করা যাবে না (শুধু অ্যান্ড্রয়েড অ্যাপে)
    if (isDownloading) return; // ডাউনলোড চলাকালীন ক্লোজ করা যাবে না
    setShowModal(false);
    setIsDismissed(true);
    if (isDemoMode) {
      setIsDemoMode(false);
    } else if (updateInfo) {
      sessionStorage.setItem(`update_dismissed_${updateInfo.version_code}`, 'true');
    }
  };

  if (!showModal || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-[350px] md:max-w-md overflow-hidden bg-white border border-slate-100 rounded-3xl shadow-2xl p-8"
        >
          {/* Close button (Only show if not a force update or not in Android App, and not currently downloading) */}
          {(!updateInfo.is_force_update || !(window.Android || window.AndroidInterface)) && !isDownloading && (
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition"
              id="update-dialog-close"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex flex-col items-center text-center">
            {/* Visual Indicator Icon states */}
            <div className={`w-24 h-24 rounded-full bg-[#06153a] flex items-center justify-center mb-6 shadow-lg shadow-indigo-950/10 mx-auto transform hover:scale-105 transition-transform duration-200 ${isDownloading ? 'ring-4 ring-indigo-50 ring-offset-2 animate-pulse' : ''}`}>
              <div className={isDownloading ? "animate-spin" : ""}>
                <AppLogo variant="white" size="52px" />
              </div>
            </div>

            {/* Typography */}
            <h2 className="text-xl md:text-2xl font-extrabold text-[#06153a] mb-2 leading-tight tracking-tight font-sans">
              নতুন আপডেট উপলব্ধ!
            </h2>
            <p className="text-xs font-mono text-slate-400 mb-4 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 inline-block">
              ভার্সন {updateInfo.version_name} (Build {updateInfo.version_code})
            </p>

            <p className="text-sm md:text-base font-normal text-slate-500/90 leading-relaxed max-w-[280px] mb-6">
              অ্যাপটির একটি নতুন সংস্করণ উপলব্ধ রয়েছে। অনুগ্রহ করে অ্যাপটি আপডেট করুন।
            </p>

            {/* If has specific update notes and not downloading, show a toggle or small box */}
            {!isDownloading && updateInfo.update_message && (
              <div className="w-full text-left bg-slate-50/80 border border-slate-100 rounded-2xl py-2.5 px-3.5 mb-4 max-h-[140px] overflow-y-auto custom-scrollbar">
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block mb-1">কী নতুন:</span>
                <p className="text-[11px] md:text-xs text-slate-600 leading-normal font-sans whitespace-pre-wrap">
                  {updateInfo.update_message}
                </p>
              </div>
            )}

            {/* If downloading, show progress, else show release notes */}
            {isDownloading && (
              <div className="w-full flex flex-col items-stretch text-left bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 font-sans animate-pulse">
                    <Loader2 size={13} className="animate-spin" /> {downloadStatus || 'ডাউনলোড হচ্ছে...'}
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-700">
                    {downloadProgress}%
                  </span>
                </div>

                {/* Outer Progress bar */}
                <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 mb-2 shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Byte Counter Text */}
                {dowloadedSizeText && totalSizeText && (
                  <div className="flex justify-end text-[10px] font-mono text-slate-400">
                    <span>{dowloadedSizeText} / {totalSizeText}</span>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-400 mt-2 text-center leading-relaxed">
                  অনুগ্রহ করে অপেক্ষা করুন। ডাউনলোড চলাকালীন অ্যাপটি বন্ধ করবেন না।
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="w-full">
              {!isDownloading && (
                <button
                  onClick={handleDownload}
                  className="w-full h-[52px] flex items-center justify-center gap-2 px-4 bg-[#4e46dc] hover:bg-[#3f37c9] active:scale-[0.98] transition-all text-white font-bold text-sm md:text-base rounded-2xl cursor-pointer shadow-lg shadow-indigo-100/30"
                  id="update-download-btn"
                >
                  <Download size={18} />
                  আপডেট করুন
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

