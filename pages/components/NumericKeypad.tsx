
import React, { useEffect, useState, useRef } from 'react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onValueChange: (value: string | number) => void;
  initialValue?: number | string;
  title?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, 
  onClose, 
  onValueChange, 
  initialValue = ''
}) => {
  const [buffer, setBuffer] = useState('');
  const keypadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const stringVal = String(initialValue);
      const val = stringVal === '0' ? '' : stringVal;
      setBuffer(val);
    }
  }, [isOpen, initialValue]);

  // Handle click outside to close (simulating backdrop behavior but allowing interactions with specific triggers)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      
      // If click is inside keypad, ignore
      if (keypadRef.current && keypadRef.current.contains(target)) {
        return;
      }

      // If click is on a trigger button (e.g. input field that opens keypad), ignore to allow context switch
      if (target.closest('.keypad-trigger')) {
        return;
      }

      // Otherwise calculate and close
      handleDone();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, buffer]); // Depend on buffer to ensure handleDone uses latest value

  if (!isOpen) return null;

  const updateParent = (newVal: string) => {
    setBuffer(newVal);
    onValueChange(newVal);
  };

  const handlePress = (val: string) => {
    let newVal = buffer;
    if (buffer === '0' && val !== '.') {
        newVal = val;
    } else {
        newVal = buffer + val;
    }
    updateParent(newVal);
  };

  const handleClear = () => {
    updateParent('');
  };

  const handleBackspace = () => {
    const newVal = buffer.length > 0 ? buffer.slice(0, -1) : '';
    updateParent(newVal);
  };

  const handleCalculate = () => {
    try {
      // Safe evaluation
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + (buffer || '0'))();
      const formattedResult = String(Math.round(result * 100) / 100);
      updateParent(formattedResult);
    } catch (e) {
      // Ignore
    }
  };

  const handleDone = () => {
    handleCalculate();
    onClose();
  };

  // Ultra Compact Key Button Component
  const KeyBtn = ({ label, onClick, className = "", icon, spanRow }: any) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`
        relative flex items-center justify-center
        text-base font-bold transition-all duration-75
        rounded-md shadow-[0_1px_0_0_rgba(0,0,0,0.05)] border-b border-transparent
        active:border-none active:translate-y-[1px] active:shadow-none
        ${spanRow ? 'row-span-2 h-full' : 'h-9'} 
        ${className}
      `}
    >
      {icon || label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end pointer-events-none">
      {/* Keypad Content */}
      <div 
        ref={keypadRef}
        className="relative bg-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-200 rounded-t-2xl overflow-hidden pointer-events-auto pb-safe border-t border-slate-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Very Compact Drag Handle */}
        <div className="h-4 flex items-center justify-center cursor-pointer active:opacity-50" onClick={handleDone}>
           <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
        </div>

        {/* Tighter Grid Container */}
        <div className="grid grid-cols-4 gap-0.5 p-1 pb-1.5">
            
            {/* Row 1 */}
            <KeyBtn label="AC" onClick={handleClear} className="bg-slate-200 text-slate-600 border-slate-300 text-xs" />
            <KeyBtn label="%" onClick={() => handlePress('%')} className="bg-slate-200 text-slate-600 border-slate-300 text-xs" />
            <KeyBtn label="÷" onClick={() => handlePress('/')} className="bg-indigo-50 text-indigo-600 text-lg font-medium border-indigo-100" />
            <KeyBtn label="×" onClick={() => handlePress('*')} className="bg-indigo-50 text-indigo-600 text-lg font-medium border-indigo-100" />

            {/* Row 2 */}
            <KeyBtn label="7" onClick={() => handlePress('7')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="8" onClick={() => handlePress('8')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="9" onClick={() => handlePress('9')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="-" onClick={() => handlePress('-')} className="bg-indigo-50 text-indigo-600 text-lg font-medium border-indigo-100" />

            {/* Row 3 */}
            <KeyBtn label="4" onClick={() => handlePress('4')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="5" onClick={() => handlePress('5')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="6" onClick={() => handlePress('6')} className="bg-white text-slate-800 border-slate-200" />
            
            {/* Plus Button - Spans 2 Rows */}
            <KeyBtn 
              label="+" 
              onClick={() => handlePress('+')} 
              spanRow 
              className="bg-indigo-50 text-indigo-600 text-lg font-medium border-indigo-100" 
            />

            {/* Row 4 */}
            <KeyBtn label="1" onClick={() => handlePress('1')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="2" onClick={() => handlePress('2')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="3" onClick={() => handlePress('3')} className="bg-white text-slate-800 border-slate-200" />

            {/* Row 5 */}
            <KeyBtn 
              icon={<Delete size={16} strokeWidth={2.5}/>} 
              onClick={handleBackspace} 
              className="bg-slate-200 text-rose-500 border-slate-300" 
            />
            <KeyBtn label="0" onClick={() => handlePress('0')} className="bg-white text-slate-800 border-slate-200" />
            <KeyBtn label="." onClick={() => handlePress('.')} className="bg-white text-slate-800 text-lg pb-1 border-slate-200" />
            
            {/* Equal Button */}
            <KeyBtn 
              label="=" 
              onClick={handleDone} 
              className="bg-indigo-600 text-white text-lg font-medium border-indigo-800 shadow-indigo-200" 
            />
        </div>
      </div>
    </div>
  );
};
