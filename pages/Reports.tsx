
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp,
  Wallet,
  RefreshCcw, Clock, Receipt, Download, Share2, Hexagon, X, AlertCircle, ExternalLink, Copy, Music, Filter,
  ChevronRight, ArrowLeft, FileText, ChevronLeft, Calendar, User, Phone, MapPin, Mail, FileDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAppContext } from '@/context/AppContext';
import { APP_NAME } from '@/constants';
import { AppLogo } from '@/components/AppLogo';

// Specialized highly robust App logo component designed specifically for html2canvas export
// This avoids dynamic SVG transforms and scales which cause layout offsets in pdf rendering.
const ReportAppLogo: React.FC<{ size: number; variant?: 'color' | 'white' | 'transparent-color' }> = ({ size, variant = 'color' }) => {
  const strokeColor = variant === 'transparent-color' ? '#4f46e5' : '#FFFFFF';
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: `${size}px`, height: `${size}px` }}
    >
      {variant === 'color' && (
        <rect 
          width="100" 
          height="100" 
          rx="24" 
          fill="#4f46e5" 
        />
      )}
      {/* Mathematically pre-scaled shape paths of the original logo (applying transform=0.75 from center) */}
      <polygon 
        points="41.19,29 55.25,29 47.75,59 28.06,59" 
        stroke={strokeColor} 
        strokeWidth="6.375" 
        strokeLinejoin="round" 
        fill="none" 
      />
      <polygon 
        points="52.25,41 71.94,41 58.81,71 44.75,71" 
        stroke={strokeColor} 
        strokeWidth="6.375" 
        strokeLinejoin="round" 
        fill="none" 
      />
    </svg>
  );
};

import { supabase } from '@/lib/supabase';
import { Expense } from '@/types';
import { DatePicker } from '@/components/DatePicker';

export const Reports: React.FC = () => {
  const { projects, user, adminSelectedUserId, expenses, incomeRecords, isOnline } = useAppContext();
  const currency = user?.currency || '৳';
  const reportRef = useRef<HTMLDivElement>(null);

  // Custom PDF Download States and Subview Systems
  const [viewState, setViewState] = useState<'main' | 'download' | 'preview'>('main');
  
  // Dynamic scaling configurations for mobile responsive preview
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(1100);

  useEffect(() => {
    if (viewState !== 'preview') return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth || containerRef.current.getBoundingClientRect().width;
        if (containerWidth > 0) {
          if (containerWidth < 794) {
            setScale(containerWidth / 794);
          } else {
            setScale(1);
          }
        }
      }
      if (sheetRef.current) {
        setSheetHeight(sheetRef.current.scrollHeight || sheetRef.current.offsetHeight || 1100);
      }
    };

    updateDimensions();
    const t = setTimeout(updateDimensions, 100);

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(t);
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [viewState, expenses, incomeRecords]);
  const [pdfReportType, setPdfReportType] = useState<'all' | 'income' | 'expense'>('all');
  const [pdfQuickRange, setPdfQuickRange] = useState<'current_month' | 'last_month' | 'current_year' | 'custom'>('current_month');
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');
  const [pdfAdminName, setPdfAdminName] = useState('');
  const [pdfContactPhone, setPdfContactPhone] = useState('');
  const [pdfContactEmail, setPdfContactEmail] = useState('');
  const [pdfContactLocation, setPdfContactLocation] = useState('Dhaka, Bangladesh');

  const parseExpenseValue = (fullNotes: string): string => {
    if (!fullNotes) return '';
    const idx = fullNotes.indexOf('[ওয়ালেট:');
    if (idx !== -1) {
      return fullNotes.substring(0, idx).trim();
    }
    return fullNotes.trim();
  };

  const formatReportTime = (timeStr: string): string => {
    if (!timeStr) return '';
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${String(displayHour).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  useEffect(() => {
    if (user?.name) setPdfAdminName(user.name);
    if (user?.phone) setPdfContactPhone(user.phone);
    if (user?.email) setPdfContactEmail(user.email);
  }, [user]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('reports:preview', {
      detail: { active: viewState === 'preview' }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('reports:preview', {
        detail: { active: false }
      }));
    };
  }, [viewState]);

  useEffect(() => {
    const today = new Date();
    if (pdfQuickRange === 'current_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setPdfStartDate(`${year}-${month}-01`);
      const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
      setPdfEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (pdfQuickRange === 'last_month') {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const year = lastMonthDate.getFullYear();
      const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      setPdfStartDate(`${year}-${month}-01`);
      const lastDay = new Date(year, lastMonthDate.getMonth() + 1, 0).getDate();
      setPdfEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (pdfQuickRange === 'current_year') {
      const year = today.getFullYear();
      setPdfStartDate(`${year}-01-01`);
      setPdfEndDate(`${year}-12-31`);
    }
  }, [pdfQuickRange]);

  const pdfTransactions = useMemo(() => {
    const list: any[] = [];

    // Get incomes
    if (pdfReportType === 'all' || pdfReportType === 'income') {
      incomeRecords.forEach((r: any) => {
        if (!r.date) return;
        if (pdfStartDate && r.date < pdfStartDate) return;
        if (pdfEndDate && r.date > pdfEndDate) return;

        list.push({
          id: `income-${r.id}`,
          type: 'income',
          date: r.date,
          time: r.time || '08:00',
          description: r.notes || 'আয়',
          category: r.category || 'আয়',
          amount: Number(r.amount) || 0
        });
      });
    }

    // Get expenses
    if (pdfReportType === 'all' || pdfReportType === 'expense') {
      expenses.forEach((e: any) => {
        if (!e.date) return;
        if (pdfStartDate && e.date < pdfStartDate) return;
        if (pdfEndDate && e.date > pdfEndDate) return;

        list.push({
          id: `expense-${e.id}`,
          type: 'expense',
          date: e.date,
          time: e.time || '10:00',
          description: parseExpenseValue(e.notes || '') || e.category || 'ব্যয়',
          category: e.category || 'ব্যয়',
          amount: Number(e.amount) || 0
        });
      });
    }

    return list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [pdfReportType, pdfStartDate, pdfEndDate, incomeRecords, expenses]);

  const pdfStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    pdfTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [pdfTransactions]);

  const formatPdfRowDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  const formatPdfMonthGroupHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleDownloadCustomPDF = async () => {
    const element = document.getElementById('pdf-report-document-sheet');
    if (!element) return;
    
    setIsGeneratingPDF(true);
    
    // Create an active, visible-to-browser but hidden-to-user fixed-width wrapper to replicate 100% desktop/A4 workspace with correct font rendering
    const wrapper = document.createElement('div');
    wrapper.id = 'pdf-report-clone-wrapper';
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0px';
    wrapper.style.left = '0px'; // Render in active viewport for proper font family/baseline metrics
    wrapper.style.width = '794px';
    wrapper.style.height = 'auto';
    wrapper.style.zIndex = '-9999'; // Render behind the normal layout hierarchy
    wrapper.style.opacity = '0.01'; // Fully transparent to the user, but active in the rendering tree
    wrapper.style.pointerEvents = 'none';
    wrapper.style.overflow = 'hidden';

    // Create an unscaled, standalone clone of the report sheet
    const clone = element.cloneNode(true) as HTMLDivElement;
    
    // Do not apply any manual top offsets since the true browser-rendered font is now fully active
    clone.style.position = 'relative';
    clone.style.top = '0px';
    clone.style.left = '0px';
    clone.style.transform = 'none';
    clone.style.margin = '0px';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.borderRadius = '0px'; // clean printable style
    
    // Give the clone a unique ID so we can find it in the cloned document
    clone.id = 'pdf-report-clone-for-export';

    // Apply alignment fixes DIRECTLY to our clone (primary fix)
    const directHeaderText = clone.querySelector('.pdf-header-left-text') as HTMLElement | null;
    if (directHeaderText) {
      directHeaderText.style.position = 'relative';
      directHeaderText.style.top = '-3px';
    }
    const directH1 = directHeaderText?.querySelector('h1') as HTMLElement | null;
    if (directH1) {
      directH1.style.lineHeight = '1.1';
    }
    const directRightName = clone.querySelector('.pdf-header-right-name') as HTMLElement | null;
    if (directRightName) {
      directRightName.style.position = 'relative';
      directRightName.style.top = '-2px';
    }

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    
    // Give the engine a quick ticks block to render the fonts and SVG graphics completely
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const canvas = await html2canvas(clone, {
        scale: 2.5, // 2.5x super-sampling for crystal clear text readability in export
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: clone.offsetHeight || 1100,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          // Secondary fix: also apply in html2canvas's own cloned document
          const clonedSheet = clonedDoc.getElementById('pdf-report-clone-for-export');
          if (!clonedSheet) return;
          
          const headerTextEl = clonedSheet.querySelector('.pdf-header-left-text') as HTMLElement | null;
          if (headerTextEl) {
            headerTextEl.style.position = 'relative';
            headerTextEl.style.top = '-3px';
          }
          const appNameH1 = headerTextEl?.querySelector('h1') as HTMLElement | null;
          if (appNameH1) {
            appNameH1.style.lineHeight = '1.1';
          }
          const headerRightName = clonedSheet.querySelector('.pdf-header-right-name') as HTMLElement | null;
          if (headerRightName) {
            headerRightName.style.position = 'relative';
            headerRightName.style.top = '-2px';
          }
        }
      });

      const imgWidth = canvas.width / 2.5;
      const imgHeight = canvas.height / 2.5;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      pdf.save(`financial_report_${pdfStartDate}_to_${pdfEndDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert('পিডিএফ তৈরিতে ত্রুটি দেখা দিয়েছে');
    } finally {
      // Safely sweep and remove the wrapper from the DOM tree
      if (wrapper.parentNode) {
        document.body.removeChild(wrapper);
      }
      setIsGeneratingPDF(false);
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // State for Image Preview Modal (Fallback for Android)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (!startDate && !endDate) return true;
      const projectDate = new Date(p.createdat);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        if (projectDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day (Inclusive)
        if (projectDate > end) return false;
      }
      
      return true;
    });
  }, [projects, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(e.date);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (expenseDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (expenseDate > end) return false;
      }

      return true;
    });
  }, [expenses, startDate, endDate]);

  const filteredIncomeRecords = useMemo(() => {
    return incomeRecords.filter(r => {
      if (!startDate && !endDate) return true;
      if (!r.date) return false;
      const recordDate = new Date(r.date);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (recordDate > end) return false;
      }
      
      return true;
    });
  }, [incomeRecords, startDate, endDate]);

  const stats = useMemo(() => {
    const totalIncome = filteredIncomeRecords.reduce((acc, r) => acc + (r.amount || 0), 0);
    const totalDue = filteredProjects.reduce((acc, p) => acc + (p.dueamount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      totalIncome,
      totalDue,
      totalExpenses,
      profit: totalIncome - totalExpenses
    };
  }, [filteredIncomeRecords, filteredProjects, filteredExpenses]);

  // Income vs Expense Pie Chart Data
  const financialData = useMemo(() => {
    return [
      { name: 'মোট আয়', value: stats.totalIncome, color: '#10b981' }, // Emerald Green
      { name: 'মোট খরচ', value: stats.totalExpenses, color: '#ef4444' } // Red
    ];
  }, [stats]);

  const chartData = useMemo(() => {
    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    // Generate data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      // Calculate target month and year accurately
      let targetMonthIndex = now.getMonth() - i;
      let targetYear = now.getFullYear();
      
      // Handle year wrap-around
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }

      const monthlyIncome = filteredIncomeRecords
        .filter(r => {
          if (!r.date) return false;
          const [yearStr, monthStr] = r.date.split('-');
          const recYear = parseInt(yearStr);
          const recMonthIndex = parseInt(monthStr) - 1;
          return recMonthIndex === targetMonthIndex && recYear === targetYear;
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const monthlyExpense = filteredExpenses
        .filter(e => {
          if (!e.date) return false;
          const [yearStr, monthStr] = e.date.split('-');
          const expYear = parseInt(yearStr);
          const expMonthIndex = parseInt(monthStr) - 1;
          return expMonthIndex === targetMonthIndex && expYear === targetYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      result.push({
        name: monthNames[targetMonthIndex],
        income: monthlyIncome,
        expense: monthlyExpense
      });
    }
    return result;
  }, [filteredIncomeRecords, filteredExpenses]);

  const resetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadImage = async () => {
    if (!isOnline) {
      alert('অফলাইনে রিপোর্ট তৈরি করা যাবে না। দয়া করে ইন্টারনেট সংযোগ চেক করুন।');
      return;
    }
    if (!reportRef.current) return;
    setIsCapturing(true);
    
    try {
      // Small delay to ensure DOM is ready and prevent blank areas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = reportRef.current;
      
      // Enhanced configuration for WebView/Mobile compatibility
      const canvas = await html2canvas(element, {
        scale: 2, // Retain high quality
        backgroundColor: '#ffffff',
        useCORS: true, // Essential for loading external profile images
        allowTaint: false, // Must be false to allow data extraction
        logging: false,
        scrollY: -window.scrollY, // Correct scrolling offset
        windowWidth: element.scrollWidth, // Capture full width
        windowHeight: element.scrollHeight // Capture full height
      });

      // 1. Generate Data URL (Base64) - This is the fallback for display
      const dataUrl = canvas.toDataURL('image/png');
      
      // 2. Open Preview Modal immediately (most reliable UX)
      setPreviewImage(dataUrl);

      // 3. Try to upload to Supabase Storage for a real URL (Best for Mobile Apps)
      try {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const fileName = `report_${new Date().getTime()}.png`;
          const { data, error } = await supabase.storage
            .from('reports')
            .upload(`images/${fileName}`, blob, {
              contentType: 'image/png',
              upsert: true
            });
            
          if (!error && data) {
            const { data: { publicUrl: url } } = supabase.storage
              .from('reports')
              .getPublicUrl(`images/${fileName}`);
            setPublicUrl(url);
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload failed', storageErr);
      }
      
      // 4. Try Native Share in background (Preferred for Android if supported)
      if (navigator.share && navigator.canShare) {
          try {
              const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
              if (blob) {
                  const file = new File([blob], `Report-${Date.now()}.png`, { type: 'image/png' });
                  if (navigator.canShare({ files: [file] })) {
                    // Slight delay to let modal open first
                    setTimeout(async () => {
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'Manage-Me Report',
                                text: `Financial Report for ${user?.name}`
                            });
                        } catch(e) {
                            // Share cancelled or failed, user still has modal
                        }
                    }, 500);
                  }
              }
          } catch (error) {
              console.warn('Native share failed or cancelled', error);
          }
      }

      setIsCapturing(false);

    } catch (err) {
      console.error(err);
      alert('রিপোর্ট তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setIsCapturing(false);
    }
  };
  
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    window.scrollTo(0, 0);
    setIsGeneratingPDF(true);
    
    // Wait a bit for the UI to update and fonts to settle
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const element = reportRef.current;
      const fileName = `financial_report_${new Date().getTime()}.pdf`;
      
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          clonedDoc.documentElement.style.overflow = 'visible';
          clonedDoc.documentElement.style.height = 'auto';
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.body.style.height = 'auto';
          
          const pdfHeader = clonedDoc.getElementById('pdf-header');
          const pdfFooter = clonedDoc.getElementById('pdf-footer');
          const container = clonedDoc.getElementById('report-container');

          if (container) {
            container.style.width = '794px';
            container.style.maxWidth = 'none';
            container.style.margin = '0';
            container.style.padding = '40px'; 
            container.style.backgroundColor = '#ffffff';
            container.style.display = 'block';
            container.style.overflow = 'visible';
            container.style.height = 'auto';
            
            const allElements = container.querySelectorAll('*');
            allElements.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.transition = 'none';
              htmlEl.style.animation = 'none';
              htmlEl.style.boxShadow = 'none';
              htmlEl.style.transform = 'none';
              htmlEl.style.opacity = '1';
            });

            // Target specific text elements for Bengali font fix
            const textElements = container.querySelectorAll('h1:not(.pdf-exact-text), h2:not(.pdf-exact-text), h3:not(.pdf-exact-text), h4, h5, h6, p:not(.pdf-exact-text), span:not(.pdf-exact-text), div.text-xs:not(.pdf-exact-text), div.text-sm:not(.pdf-exact-text)');
            textElements.forEach(el => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = '1.8';
              htmlEl.style.paddingTop = '2px';
              htmlEl.style.paddingBottom = '2px';
              htmlEl.style.overflow = 'visible';
            });
          }
        }
      });

      const imgWidth = canvas.width / 2;
      const imgHeight = canvas.height / 2;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 100);
      
    } catch (error) {
      console.error('PDF Error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const hasData = filteredIncomeRecords.length > 0 || filteredExpenses.length > 0 || filteredProjects.length > 0;

  const getReportPeriodText = () => {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('bn-BD');
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `${formatDate(startDate)} থেকে বর্তমান`;
    } else if (endDate) {
      return `শুরু থেকে ${formatDate(endDate)}`;
    } else {
      return new Date().toLocaleDateString('bn-BD');
    }
  };

  return (
    <div className="pb-20">
      {viewState === 'main' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                 {user?.role === 'admin' ? (adminSelectedUserId ? 'ইউজার রিপোর্ট' : 'রিপোর্ট (অ্যাডমিন ভিউ)') : 'রিপোর্ট'}
              </h1>
              <p className="text-slate-500">আর্থিক প্রবৃদ্ধি পর্যবেক্ষণ করুন।</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDownloadPDF}
                className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
                title="সরাসরি পিডিএফ ডাউনলোড"
              >
                <Download size={22} />
              </button>
            </div>
          </div>

          {/* Premium PDF Report Generator Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full text-white/90">নতুন সংস্করণ (New Version)</span>
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">অফিশিয়াল রিপোর্ট ডাউনলোড সিস্টেম</h3>
              <p className="text-xs text-white/80 leading-relaxed max-w-md">আপনার সমস্ত আয়-ব্যয়ের হিসাবকে চমৎকার A4 শিট আকারে সাজিয়ে প্রিভিউসহ PDF আকারে ডাউনলোড করুন।</p>
            </div>
            <button 
              onClick={() => setViewState('download')}
              className="bg-white text-indigo-600 hover:bg-slate-50 active:scale-95 transition-all py-3 px-5 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 shadow-sm font-sans"
            >
              <FileDown size={16} />
              রিপোর্ট ডাউনলোড পৃষ্ঠা
              <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker 
                    label="শুরু তারিখ"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="শুরু তারিখ"
                  />
                  <DatePicker 
                    label="শেষ তারিখ"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="শেষ তারিখ"
                    align="right"
                  />
                </div>
                {(startDate || endDate) && (
                <button onClick={resetFilter} className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">ফিল্টার রিসেট করুন</button>
                )}
            </div>
          </div>

          {/* Report Content (Capture Area) */}
          <div className="overflow-hidden rounded-none shadow-xl">
            <div id="report-container" ref={reportRef} className="bg-white relative w-full mx-auto">
                
                {isGeneratingPDF && (
                  <div id="pdf-header" className="p-6 border-b border-slate-200 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm">
                        <Music size={28} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h1 className="text-3xl font-black text-slate-900 leading-none mb-1.5 tracking-tight pdf-exact-text" style={{ lineHeight: '1' }}>Manage-Me</h1>
                        <h2 className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase leading-none pdf-exact-text" style={{ lineHeight: '1' }}>Professional Studio Manager</h2>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-center">
                      <h2 className="text-xl font-black text-slate-800 mb-2 pdf-exact-text" style={{ lineHeight: '1.2' }}>আর্থিক রিপোর্ট</h2>
                      <p className="text-xs font-bold text-slate-500 mb-1 pdf-exact-text" style={{ lineHeight: '1.2' }}>সময়কাল: {getReportPeriodText()}</p>
                      <p className="text-xs font-bold text-slate-500 pdf-exact-text" style={{ lineHeight: '1.2' }}>তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
                    </div>
                  </div>
                )}

                {/* Main Content Body */}
                <div className="p-6 space-y-6 relative z-10">
                    
                    {/* Compact Executive Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between h-24">
                            <div className="flex justify-between items-start">
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">মোট আয়</p>
                                 <Wallet size={16} className="text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800">{currency} {stats.totalIncome.toLocaleString('bn-BD')}</h3>
                        </div>
                        
                        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex flex-col justify-between h-24">
                             <div className="flex justify-between items-start">
                                 <p className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider">মোট খরচ</p>
                                 <Receipt size={16} className="text-rose-200" />
                             </div>
                             <h3 className="text-2xl font-black text-rose-600">{currency} {stats.totalExpenses.toLocaleString('bn-BD')}</h3>
                        </div>
                        
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between h-24">
                             <div className="flex justify-between items-start">
                                <p className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-wider">নিট লাভ</p>
                                <TrendingUp size={16} className="text-indigo-200" />
                             </div>
                             <h3 className={`text-2xl font-black ${stats.profit >= 0 ? 'text-indigo-600' : 'text-rose-500'}`}>
                                {currency} {stats.profit.toLocaleString('bn-BD')}
                             </h3>
                        </div>
                        
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between h-24">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider">বকেয়া</p>
                                <Clock size={16} className="text-amber-200" />
                            </div>
                             <h3 className="text-2xl font-black text-amber-600">{currency} {stats.totalDue.toLocaleString('bn-BD')}</h3>
                        </div>
                    </div>

                    {/* Charts Area */}
                    {!isMounted ? null : !hasData ? (
                        <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Hexagon size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-medium">কোনো ডাটা পাওয়া যায়নি</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Income Chart */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                    <h3 className="font-bold text-sm text-slate-800">মাসিক আয় ও ব্যয়ের বিবরণ</h3>
                                </div>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} dy={5} />
                                        <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            cursor={{fill: '#f8fafc', radius: 4}}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '6px 10px', fontSize: '11px' }}
                                            formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                                        />
                                        <Bar dataKey="income" name="আয়" fill="#4f46e5" stackId="a" radius={[0, 0, 0, 0]} barSize={16} />
                                        <Bar dataKey="expense" name="খরচ" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Combined Stats & Pie Chart Block */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                                    <h3 className="font-bold text-sm text-slate-800">আয় বনাম খরচ বিশ্লেষণ</h3>
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    {/* Chart */}
                                    <div className="h-56 w-full md:w-1/2 relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                            <PieChart>
                                            <Pie 
                                                data={financialData} 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={50} 
                                                outerRadius={70} 
                                                paddingAngle={5} 
                                                dataKey="value"
                                            >
                                                {financialData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                                formatter={(value: number) => [`${currency} ${value.toLocaleString('bn-BD')}`, '']}
                                            />
                                            <Legend 
                                                verticalAlign="bottom" 
                                                height={36} 
                                                iconType="circle" 
                                                wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                                            />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Stats Text */}
                                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                                        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase">প্রফিট মার্জিন</p>
                                                <p className="text-xs text-indigo-400/80 mt-0.5">মোট আয়ের লাভ অংশ</p>
                                            </div>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-2xl font-black text-indigo-600">
                                                    {stats.totalIncome > 0 ? Math.round((stats.profit / stats.totalIncome) * 100) : 0}
                                                </span>
                                                <span className="text-sm font-bold text-indigo-400">%</span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-rose-400 uppercase">খরচের অনুপাত</p>
                                                <p className="text-xs text-rose-400/80 mt-0.5">মোট আয়ের ব্যয় অংশ</p>
                                            </div>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-2xl font-black text-rose-500">
                                                    {stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0}
                                                </span>
                                                <span className="text-sm font-bold text-rose-400">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
          </div>
        </div>
      )}

      {/* VIEW: DOWNLOAD CONFIGURATION PAGE */}
      {viewState === 'download' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewState('main')}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-800">রিপোর্ট ডাউনলোড</h1>
              <p className="text-xs text-slate-500">আয় এবং ব্যয়ের পিডিএফ তৈরি করার অপশনসমূহ</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            {/* Field 1: Report Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">রিপোর্টের খাত ও ধরণ</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfReportType('all')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === 'all' 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  আয় ও ব্যয়
                </button>
                <button
                  type="button"
                  onClick={() => setPdfReportType('income')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === 'income' 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  শুধুমাত্র আয়
                </button>
                <button
                  type="button"
                  onClick={() => setPdfReportType('expense')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === 'expense' 
                      ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  শুধুমাত্র ব্যয়
                </button>
              </div>
            </div>

            {/* Field 2: Quick date range preset selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">সময়সীমা নির্বাচন</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfQuickRange('current_month')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === 'current_month' 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  চলতি মাস
                </button>
                <button
                  type="button"
                  onClick={() => setPdfQuickRange('last_month')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === 'last_month' 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  গত মাস
                </button>
                <button
                  type="button"
                  onClick={() => setPdfQuickRange('current_year')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === 'current_year' 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  চলতি বছর
                </button>
                <button
                  type="button"
                  onClick={() => setPdfQuickRange('custom')}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === 'custom' 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  কাস্টম নির্বাচন
                </button>
              </div>
            </div>

            {/* Custom Datepicker panel */}
            {pdfQuickRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <DatePicker 
                  label="শুরু তারিখ"
                  value={pdfStartDate}
                  onChange={setPdfStartDate}
                  placeholder="শুরু তারিখ"
                />
                <DatePicker 
                  label="শেষ তারিখ"
                  value={pdfEndDate}
                  onChange={setPdfEndDate}
                  placeholder="শেষ তারিখ"
                  align="right"
                />
              </div>
            )}

            {/* Field 3: Report Owner Customization */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">অফিশিয়াল কাস্টমাইজেশন</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">প্রশাসকের নাম (স্বাক্ষর)</label>
                  <input
                    type="text"
                    value={pdfAdminName}
                    onChange={(e) => setPdfAdminName(e.target.value)}
                    placeholder="হাতে লেখা স্বাক্ষর স্ক্রিপ্ট"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">যোগাযোগের ফোন নম্বর</label>
                  <input
                    type="text"
                    value={pdfContactPhone}
                    onChange={(e) => setPdfContactPhone(e.target.value)}
                    placeholder="নম্বর লিখুন"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    value={pdfContactEmail}
                    onChange={(e) => setPdfContactEmail(e.target.value)}
                    placeholder="ইমেইল"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">ঠিকানা (অবস্থান)</label>
                  <input
                    type="text"
                    value={pdfContactLocation}
                    onChange={(e) => setPdfContactLocation(e.target.value)}
                    placeholder="শহর, দেশ"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            
            {/* Next Action button to generate the Preview */}
            <button
              onClick={() => setViewState('preview')}
              className="w-full bg-indigo-600 border border-indigo-600 text-white font-black py-4 px-6 rounded-2xl text-xs shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <FileText size={16} />
              রিপোর্ট প্রিভিউ পৃষ্ঠা খুলুন
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: REPORT PREVIEW SHEET & PDF MAKER */}
      {viewState === 'preview' && (
        <div className="min-h-screen bg-slate-100/70 -mx-4 px-4 py-6 flex flex-col space-y-6 relative select-none animate-in fade-in duration-300">
          
          {/* Header Controller */}
          <div className="flex flex-col space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewState('download')}
                  className="p-1 text-slate-800 hover:text-slate-950 active:scale-90 transition-all"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-black text-slate-800 font-sans">প্রিভিউ</h1>
              </div>

              {/* Transactions / Page count state pill exactly like screenshot */}
              <div className="bg-slate-100 hover:bg-slate-200/80 px-4 py-2 rounded-full border border-slate-200/50 text-slate-800 shadow-sm text-xs font-bold font-sans">
                লেনদেন: {pdfTransactions.length} &nbsp;|&nbsp; পৃষ্ঠা: 1
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold pl-1">পৃষ্ঠা 1 এর 1</p>
          </div>

          {/* Central A4 Document Frame wrapper styled with dynamic scaling */}
          <div 
            ref={containerRef}
            className="w-full pb-24 overflow-hidden relative"
            style={{ height: `${sheetHeight * scale}px` }}
          >
            <div 
              ref={sheetRef}
              id="pdf-report-document-sheet"
              className="bg-white text-slate-800 p-10 font-sans shadow-lg border border-slate-200/60 rounded-3xl flex flex-col justify-between absolute animate-in zoom-in-95 duration-300"
              style={{ 
                width: '794px', 
                minHeight: '1100px',
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                left: '50%',
                marginLeft: '-397px', // center the 794px div cleanly
              }}
            >
              {/* Document Inner Area */}
              <div className="space-y-8">
                {/* 1. Header Banner of Document */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                  {/* Left Logo Side */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                    <div style={{ width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ReportAppLogo size={48} variant="color" />
                    </div>
                    <div className="pdf-header-left-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left' }}>
                      <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, padding: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.1 }} className="text-slate-900 tracking-tight">Audio Balance</h1>
                      <p style={{ fontSize: '10px', fontWeight: 700, margin: '3px 0 0 0', padding: 0, lineHeight: 1 }} className="text-slate-400 tracking-wide font-sans">Keep track of every day</p>
                    </div>
                  </div>

                  {/* Right Meta Side */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', justifyContent: 'center' }}>
                    <h1 className="text-2xl font-black text-indigo-600 tracking-widest font-sans" style={{ margin: 0, padding: 0, marginBottom: '6px', lineHeight: 1 }}>REPORT</h1>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px', lineHeight: 1, marginTop: '6px' }}>
                      <span className="text-[9px] font-black tracking-widest text-slate-400 font-sans" style={{ marginRight: '6px' }}>
                        POWERED BY
                      </span>
                      <div style={{ width: '11px', height: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px' }}>
                        <ReportAppLogo size={11} variant="transparent-color" />
                      </div>
                      <span className="pdf-header-right-name text-[9px] text-slate-600 font-extrabold tracking-normal" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Audio Balance
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Document Transaction Table Section */}
                <div className="space-y-4">
                  <div className="overflow-hidden border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold tracking-wider">
                          <th className="py-3 px-4 font-bold">DATE</th>
                          <th className="py-3 px-4 font-bold">TIME</th>
                          <th className="py-3 px-4 font-bold">DESCRIPTION</th>
                          <th className="py-3 px-4 font-bold">CATEGORY</th>
                          <th className="py-3 px-4 text-right font-bold">AMOUNT (TK)</th>
                        </tr>
                      </thead>
                      <tbody className="text-[12px] font-medium text-slate-700 divide-y divide-slate-50">
                        {pdfTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 bg-slate-50/50">
                              <Calendar size={24} className="mx-auto text-slate-300 mb-2" />
                              <p className="text-xs font-bold">কোনো লেনদেনের তথ্য পাওয়া যায়নি</p>
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            let lastMonthHeader = '';
                            return pdfTransactions.map((tx) => {
                              const monthHeader = formatPdfMonthGroupHeader(tx.date);
                              const renderHeader = lastMonthHeader !== monthHeader;
                              lastMonthHeader = monthHeader;

                              return (
                                <React.Fragment key={tx.id}>
                                  {renderHeader && (
                                    <tr className="bg-[#f0f4ff]/50">
                                      <td colSpan={5} className="py-2.5 px-4">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 font-sans">
                                          <span>📅</span>
                                          <span>{monthHeader}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] font-bold">
                                      {formatPdfRowDate(tx.date)}
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] font-bold">
                                      {tx.time ? formatReportTime(tx.time) : '--:--'}
                                    </td>
                                    <td className="py-3 px-4 font-normal text-slate-850">
                                      {tx.description}
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 font-semibold">
                                      {tx.category && tx.category !== 'অন্যান্য' ? tx.category : ''}
                                    </td>
                                    <td className={`py-3 px-4 text-right font-bold font-mono text-[13px] ${
                                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                      {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('en-US')}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            });
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Under table summary bar row exactly like photo */}
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 flex items-center justify-between text-xs text-slate-600 font-bold font-sans">
                    <span className="text-slate-850">মাসিক মোট:</span>
                    <div className="flex items-center gap-4">
                      <span>আয়: <span className="text-emerald-600">{pdfStats.totalIncome} Tk</span></span>
                      <span>ব্যয়: <span className="text-rose-600">{pdfStats.totalExpense} Tk</span></span>
                      <span>ব্যালেন্স: <span className="text-blue-600">{pdfStats.balance} Tk</span></span>
                    </div>
                  </div>
                </div>

                {/* 3. Executive Metrics Blocks */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Income */}
                  <div className="bg-[#f0fdf4] border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between h-20 shadow-xs">
                    <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Total Income:</p>
                    <p className="text-[18px] font-black text-emerald-600 font-mono mt-1">
                      {pdfStats.totalIncome.toLocaleString('en-US')} Tk
                    </p>
                  </div>

                  {/* Total Expense */}
                  <div className="bg-[#fdf2f2] border border-rose-100 rounded-2xl p-4 flex flex-col justify-between h-20 shadow-xs">
                    <p className="text-[9px] font-black text-rose-800 uppercase tracking-widest">Total Expense:</p>
                    <p className="text-[18px] font-black text-rose-600 font-mono mt-1">
                      {pdfStats.totalExpense.toLocaleString('en-US')} Tk
                    </p>
                  </div>

                  {/* Total Balance */}
                  <div className="bg-[#f0f9ff] border border-blue-100 rounded-2xl p-4 flex flex-col justify-between h-20 shadow-xs">
                    <p className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Total Balance:</p>
                    <p className="text-[18px] font-black text-indigo-600 font-mono mt-1">
                      {pdfStats.balance.toLocaleString('en-US')} Tk
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Document Footer coordinates */}
              <div className="mt-12 border-t border-slate-100 pt-6 flex items-end justify-between text-[11px] text-slate-400 font-semibold font-sans">
                {/* Coordinates Left */}
                <div className="space-y-1.5 leading-none">
                  {pdfContactPhone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-440">📞</span>
                      <span>{pdfContactPhone}</span>
                    </div>
                  )}
                  {pdfContactEmail && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-440">✉</span>
                      <span>{pdfContactEmail}</span>
                    </div>
                  )}
                  {pdfContactLocation && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-440">📍</span>
                      <span>{pdfContactLocation}</span>
                    </div>
                  )}
                </div>

                {/* Page Numbering Middle */}
                <div className="text-center text-[10px] text-slate-400">
                  পৃষ্ঠা 1 এর 1
                </div>

                {/* Signature Right */}
                <div className="text-right w-44">
                  {/* Handwritten dynamic cursive signature block */}
                  <div className="pb-1 text-center font-serif italic text-lg leading-tight text-indigo-700 tracking-wider">
                    {pdfAdminName || 'Administrator'}
                  </div>
                  <div className="border-t border-slate-200 pt-1 mt-0.5 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Your Name
                  </div>
                  <div className="text-center text-[8px] font-semibold text-slate-400 leading-none">
                    Administrator
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Sticky Solid Blue PDF Download Button exactly as screenshot */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/60 z-50 flex justify-center">
            <button
              onClick={handleDownloadCustomPDF}
              className="w-full max-w-lg bg-[#1a73e8] hover:bg-[#155fc0] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all text-sm font-sans"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              PDF তৈরি করুন - 1 পৃষ্ঠার PDF তৈরি হয়েছে!
            </button>
          </div>

        </div>
      )}

      {/* Image Preview Modal (Fallback for Android WebView) */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                        <Hexagon size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">রিপোর্ট প্রিভিউ</h3>
                 </div>
                 <button 
                  onClick={() => {
                    setPreviewImage(null);
                    setPublicUrl(null);
                  }} 
                  className="w-8 h-8 bg-slate-200 rounded-full text-slate-600 flex items-center justify-center active:scale-90 transition-transform"
                 >
                    <X size={20} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center items-center">
                 <img src={previewImage} alt="Report Preview" className="max-w-full h-auto shadow-lg rounded-2xl object-contain" />
              </div>

              <div className="p-6 border-t bg-white space-y-4">
                 <div className="flex flex-col gap-3">
                    {publicUrl ? (
                      <button 
                        onClick={() => window.open(publicUrl, '_blank')}
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                      >
                         <ExternalLink size={18} />
                         ব্রাউজারে ওপেন করুন
                      </button>
                    ) : (
                      <a 
                        href={previewImage} 
                        download={`ManageMe_Report_${new Date().toISOString().split('T')[0]}.png`}
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                      >
                         <Download size={18} />
                         ডাউনলোড করুন
                      </a>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={async () => {
                              try {
                                const blob = await (await fetch(previewImage)).blob();
                                const file = new File([blob], `Report-${Date.now()}.png`, { type: 'image/png' });
                                if (navigator.share) {
                                  await navigator.share({
                                    files: [file],
                                    title: 'Manage-Me Report',
                                    text: 'Financial Report'
                                  });
                                }
                              } catch (e) {
                                alert('শেয়ার করা সম্ভব হচ্ছে না');
                              }
                          }}
                          className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                        >
                            <Share2 size={18} />
                            শেয়ার
                        </button>

                        <button 
                          onClick={() => {
                            const urlToCopy = publicUrl || previewImage;
                            if (urlToCopy) {
                              navigator.clipboard.writeText(urlToCopy);
                              alert('লিংক কপি করা হয়েছে');
                            }
                          }}
                          className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                        >
                            <Copy size={18} />
                            লিংক কপি
                        </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
