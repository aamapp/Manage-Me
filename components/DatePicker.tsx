
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  align?: 'left' | 'right';
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder, label, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthNames = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];

  const dayNames = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // Format as YYYY-MM-DD in local time
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const date = String(selectedDate.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${date}`);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const today = new Date().toISOString().split('T')[0];
    const selected = value;

    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const isSelected = dateStr === selected;

      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateClick(d)}
          className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center
            ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 
              isToday ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 
              'text-slate-600 hover:bg-slate-100'}`}
        >
          {d.toLocaleString('bn-BD')}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer"
      >
        <span>{value ? new Date(value).toLocaleDateString('bn-BD') : (placeholder || 'তারিখ')}</span>
        <CalendarIcon size={14} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in-95 duration-200 origin-top ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-black text-slate-800">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear().toLocaleString('bn-BD', { useGrouping: false })}
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => (
              <div key={d} className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
            >
              মুছুন
            </button>
            <button 
              type="button"
              onClick={() => {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onChange(dateStr);
                setIsOpen(false);
              }}
              className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
            >
              আজ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
