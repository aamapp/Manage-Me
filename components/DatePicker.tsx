
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  align?: 'left' | 'right';
  onOpenChange?: (open: boolean) => void;
  openDirection?: 'up' | 'down';
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  align = 'left', 
  onOpenChange,
  openDirection = 'down'
}) => {
  const [isOpen, setIsOpenState] = useState(false);
  
  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
    if (open) {
      setTempSelectedDate(value ? new Date(value) : new Date());
      setViewDate(value ? new Date(value) : new Date());
    }
  };

  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(value ? new Date(value) : new Date());
  
  const containerRef = useRef<HTMLDivElement>(null);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthNames = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];

  const dayNames = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
  const dayNamesFull = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

  useEffect(() => {
    // If we want to handle outside click when modal is open
    // We don't really need to close on click outside for date pickers in modal, but we can.
  }, []);

  const handleDateClick = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setTempSelectedDate(selected);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      const year = tempSelectedDate.getFullYear();
      const month = String(tempSelectedDate.getMonth() + 1).padStart(2, '0');
      const date = String(tempSelectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${date}`);
    }
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    // Create UTC string comparisons
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const selectedStr = tempSelectedDate ? `${tempSelectedDate.getFullYear()}-${String(tempSelectedDate.getMonth() + 1).padStart(2, '0')}-${String(tempSelectedDate.getDate()).padStart(2, '0')}` : '';

    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10 sm:h-12 sm:w-12"></div>);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;

      days.push(
        <div key={d} className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12">
          <button
            type="button"
            onClick={() => handleDateClick(d)}
            className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full text-sm font-semibold transition-all flex items-center justify-center
              ${isSelected ? 'bg-[#1a73e8] text-white shadow-md' : 
                isToday ? 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' : 
                'text-slate-700 hover:bg-slate-100'}`}
          >
            {d.toLocaleString('bn-BD', { useGrouping: false })}
          </button>
        </div>
      );
    }

    return days;
  };

  const getDayMonthText = (date: Date | null) => {
    if (!date) return 'তারিখ নির্বাচন করুন';
    const dName = dayNamesShortEnglishToBangla(date.getDay());
    const mName = monthNames[date.getMonth()];
    const dNum = date.getDate().toLocaleString('bn-BD', { useGrouping: false });
    return `${dName}, ${mName} ${dNum}`;
  };

  const dayNamesShortEnglishToBangla = (dayIdx: number) => {
    return ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"][dayIdx];
  };

  const formatDateToLongBn = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toLocaleString('bn-BD', { useGrouping: false });
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toLocaleString('bn-BD', { useGrouping: false });
    return `${day} ${month}, ${year}`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(true)}
        className={`w-full px-4 py-[13px] bg-[#f5f6f8] hover:bg-slate-100 rounded-2xl font-normal text-sm text-[#1a73e8] outline-none flex items-center justify-center gap-2 cursor-pointer transition-all ${isOpen ? 'ring-2 ring-[#1a73e8]/10' : ''}`}
        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
      >
        <CalendarIcon size={18} className="text-[#1a73e8] shrink-0" strokeWidth={1.8} />
        <span className="text-[15px] truncate text-[#1a73e8] font-normal">
          {value ? formatDateToLongBn(value) : (!label ? (placeholder || '') : '')}
        </span>
      </div>
      {label && <label className={`absolute max-w-[calc(100%-3rem)] truncate text-sm font-bold duration-300 transform z-10 origin-[0] left-3 px-1 pointer-events-none transition-all ${(value || isOpen) ? 'top-0 -translate-y-1/2 scale-[0.80] bg-white' : 'top-1/2 -translate-y-1/2 scale-100 bg-transparent'} ${isOpen ? 'text-[#1a73e8]' : 'text-slate-500'}`} style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{label}</label>}

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-[28px] shadow-2xl overflow-hidden w-full max-w-[340px] relative z-10 flex flex-col pt-4 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 pb-4 pt-2 border-b border-slate-100">
              <span className="text-sm text-slate-600 font-medium mb-4 block">তারিখ নির্বাচন করুন</span>
              <div className="flex items-center justify-between">
                <h2 className="text-[32px] leading-none font-bold text-slate-800">
                  {getDayMonthText(tempSelectedDate)}
                </h2>
                <button 
                  type="button" 
                  onClick={() => {
                    const today = new Date();
                    setTempSelectedDate(today);
                    setViewDate(today);
                  }}
                  className="px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors text-[#1a73e8] text-sm font-bold shrink-0 mt-1"
                >
                  আজ
                </button>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-bold text-slate-800 flex items-center gap-1.5 pl-2">
                  <span>{monthNames[viewDate.getMonth()]}</span>
                  <span>{viewDate.getFullYear().toLocaleString('bn-BD', { useGrouping: false })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronLeft size={20} strokeWidth={2.5} />
                  </button>
                  <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((d, i) => (
                  <div key={i} className="h-8 flex items-center justify-center text-[12px] font-bold text-slate-500">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex items-center justify-end gap-2">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 text-sm font-bold text-[#1a73e8] hover:bg-blue-50 rounded-full transition-colors"
              >
                বাতিল
              </button>
              <button 
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2.5 text-sm font-bold text-[#1a73e8] hover:bg-blue-50 rounded-full transition-colors"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
