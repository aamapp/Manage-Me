import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectMode, setSelectMode] = useState<'hours' | 'minutes'>('hours');
  
  const getParsedTime = (timeVal: string) => {
    let initialH = 12;
    let initialM = 0;
    let initialP: 'AM' | 'PM' = 'AM';
    
    if (timeVal) {
      const [h, m] = timeVal.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        initialP = h >= 12 ? 'PM' : 'AM';
        initialH = h % 12 === 0 ? 12 : h % 12;
        initialM = m;
      }
    } else {
      const d = new Date();
      const h = d.getHours();
      initialP = h >= 12 ? 'PM' : 'AM';
      initialH = h % 12 === 0 ? 12 : h % 12;
      initialM = d.getMinutes();
    }
    return { hours: initialH, minutes: initialM, period: initialP };
  };

  const initialData = getParsedTime(value);
  const [hours, setHours] = useState(initialData.hours);
  const [minutes, setMinutes] = useState(initialData.minutes);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialData.period);
  const [isDragging, setIsDragging] = useState(false);

  // Sync state if value prop changes from parent
  useEffect(() => {
    if (value) {
      const data = getParsedTime(value);
      setHours(data.hours);
      setMinutes(data.minutes);
      setPeriod(data.period);
    }
  }, [value]);

  const openPicker = () => {
    const data = getParsedTime(value);
    setHours(data.hours);
    setMinutes(data.minutes);
    setPeriod(data.period);
    setSelectMode('hours');
    setIsOpen(true);
  };

  const handleConfirm = () => {
    let h24 = hours;
    if (period === 'PM' && hours < 12) h24 += 12;
    if (period === 'AM' && hours === 12) h24 = 0;
    
    onChange(`${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder || '';
    const [h, m] = value.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return placeholder || '';
    const p = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${p}`;
  };

  const toBnDigits = (num: number | string) => {
    const e2b = {'0':'০', '1':'১', '2':'২', '3':'৩', '4':'৪', '5':'৫', '6':'৬', '7':'৭', '8':'৮', '9':'৯'};
    return String(num).replace(/[0-9]/g, m => e2b[m as keyof typeof e2b]);
  };

  const bgStyles = {
    clockRadius: 104,
    numberRadius: 82,
  };

  const handleClockClickOrDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left - 104; // center is at 104
    const y = clientY - rect.top - 104;
    
    let angleRad = Math.atan2(y, x); // -PI to PI
    let angleDeg = (angleRad * 180) / Math.PI + 90; // offset so 12 o'clock is 0
    if (angleDeg < 0) angleDeg += 360;
    
    if (selectMode === 'hours') {
      let calculatedHour = Math.round(angleDeg / 30);
      if (calculatedHour === 0) calculatedHour = 12;
      if (calculatedHour > 12) calculatedHour = 12;
      setHours(calculatedHour);
    } else {
      let calculatedMinute = Math.round(angleDeg / 6);
      if (calculatedMinute >= 60) calculatedMinute = 0;
      setMinutes(calculatedMinute);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleClockClickOrDrag(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleClockClickOrDrag(e);
    }
  };

  const handleMouseUpOrTouchEnd = () => {
    setIsDragging(false);
    if (selectMode === 'hours') {
      setTimeout(() => setSelectMode('minutes'), 300);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleClockClickOrDrag(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleClockClickOrDrag(e);
    }
  };

  const renderClockFace = () => {
    const items = [];
    const isHours = selectMode === 'hours';
    const total = isHours ? 12 : 60;
    const step = isHours ? 1 : 5;
    
    const activeValue = isHours ? hours : minutes;
    
    for (let i = 0; i < total; i += step) {
      let val = i;
      if (isHours && i === 0) val = 12;

      const angle = (i * (360 / total) - 90) * (Math.PI / 180);
      const x = bgStyles.clockRadius + bgStyles.numberRadius * Math.cos(angle);
      const y = bgStyles.clockRadius + bgStyles.numberRadius * Math.sin(angle);
      
      const isActive = activeValue === val;

      items.push(
        <div
          key={i}
          className={`absolute flex items-center justify-center text-sm rounded-full cursor-pointer select-none
            ${isActive ? 'bg-[#1a73e8] text-white font-medium' : 'text-slate-800 hover:bg-slate-250/20'}`}
          style={{
            width: '32px',
            height: '32px',
            left: `${x - 16}px`,
            top: `${y - 16}px`,
            transition: 'all 0.2s',
            zIndex: isActive ? 10 : 1
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isHours) {
              setHours(val);
              setTimeout(() => setSelectMode('minutes'), 300);
            } else {
              setMinutes(val);
            }
          }}
        >
          {val === 0 && !isHours ? '00' : val}
        </div>
      );
    }
    
    const angle = ((activeValue * (360 / total)) - 90) * (Math.PI / 180);
    const lineX = bgStyles.clockRadius + (bgStyles.numberRadius - 16) * Math.cos(angle);
    const lineY = bgStyles.clockRadius + (bgStyles.numberRadius - 16) * Math.sin(angle);

    return (
      <div 
        className="relative w-[208px] h-[208px] bg-[#f5f6f8] rounded-full mx-auto mt-8 select-none cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrTouchEnd}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrTouchEnd}
      >
        <div className="absolute w-[6px] h-[6px] bg-[#1a73e8] rounded-full left-[101px] top-[101px] z-20 pointer-events-none"></div>
        
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <line
            x1="104"
            y1="104"
            x2={lineX}
            y2={lineY}
            stroke="#1a73e8"
            strokeWidth="2"
          />
          <circle
            cx={lineX}
            cy={lineY}
            r="4"
            fill="#1a73e8"
          />
        </svg>

        {items}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <div 
        onClick={openPicker}
        className={`w-full px-4 py-[13.5px] bg-transparent border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-[14px] text-[#1a73e8] outline-none focus:ring-2 focus:ring-[#1a73e8]/20 flex items-center justify-center gap-2 cursor-pointer transition-all ${isOpen ? 'ring-2 ring-[#1a73e8]/20 border-[#1a73e8]' : ''}`}
        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
      >
        <Clock size={16} strokeWidth={2.5} />
        <span className="truncate">
          {value ? toBnDigits(getDisplayValue()) : placeholder || ''}
        </span>
      </div>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
          <div className="bg-white rounded-[28px] shadow-2xl overflow-hidden w-full max-w-[340px] relative z-10 flex flex-col pt-6 pb-4 px-6 animate-in zoom-in-95 duration-200">
            
            <h3 className="text-[13px] text-slate-800 font-bold mb-6 text-left" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>সময় নির্ধারণ করুন</h3>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <div 
                className={`w-[84px] h-[80px] rounded-xl flex items-center justify-center text-[40px] font-medium cursor-pointer transition-colors
                  ${selectMode === 'hours' ? 'bg-[#1a73e8] text-white' : 'bg-slate-100/70 text-slate-800 hover:bg-slate-200/70'}
                `}
                onClick={() => setSelectMode('hours')}
              >
                {hours}
              </div>
              
              <div className="text-4xl text-slate-800 pb-2 font-light">:</div>
              
              <div 
                className={`w-[84px] h-[80px] rounded-xl flex items-center justify-center text-[40px] font-medium cursor-pointer transition-colors
                  ${selectMode === 'minutes' ? 'bg-[#1a73e8] text-white' : 'bg-slate-100/70 text-slate-800 hover:bg-slate-200/70'}
                `}
                onClick={() => setSelectMode('minutes')}
              >
                {String(minutes).padStart(2, '0')}
              </div>
              
              <div className="flex flex-col ml-3 border border-slate-300 rounded-lg overflow-hidden shrink-0">
                <div 
                  className={`px-3.5 py-2.5 text-[15px] font-bold cursor-pointer text-center select-none transition-colors
                    ${period === 'AM' ? 'bg-[#1a73e8]/10 text-[#1a73e8]' : 'bg-transparent text-slate-600 hover:bg-slate-50'}
                  `}
                  onClick={() => setPeriod('AM')}
                >
                  AM
                </div>
                <div className="h-[1px] bg-slate-250 w-full"></div>
                <div 
                  className={`px-3.5 py-2.5 text-[15px] font-bold cursor-pointer text-center select-none transition-colors
                    ${period === 'PM' ? 'bg-[#1a73e8]/10 text-[#1a73e8]' : 'bg-transparent text-slate-600 hover:bg-slate-50'}
                  `}
                  onClick={() => setPeriod('PM')}
                >
                  PM
                </div>
              </div>
            </div>

            {renderClockFace()}

            <div className="mt-8 flex items-center justify-end">
              <div className="flex items-center gap-1 font-bold" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-[#1a73e8] hover:bg-blue-50/50 active:bg-blue-50 rounded-full transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2.5 text-sm font-bold text-[#1a73e8] hover:bg-blue-50/50 active:bg-blue-50 rounded-full transition-colors"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
