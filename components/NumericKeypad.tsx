
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

  const KeyBtn = ({ label, onClick, className = "", icon, spanRow }: any) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`
        flex items-center justify-center
        transition-colors active:bg-slate-200 outline-none
        ${spanRow ? 'row-span-2 h-full' : 'h-[44px]'} 
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
        className="relative bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-200 pointer-events-auto pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-4 gap-[1px] bg-slate-100 border-t border-slate-100">
            {/* Row 1 */}
            <KeyBtn label="AC" onClick={handleClear} className="bg-[#f8f9fa] text-slate-800 text-[18px] font-medium" />
            <KeyBtn label="%" onClick={() => handlePress('%')} className="bg-[#f8f9fa] text-slate-800 text-[20px] font-medium" />
            <KeyBtn label="÷" onClick={() => handlePress('/')} className="bg-[#e6f0fd] text-[#1a73e8] text-[26px] font-medium pb-1" />
            <KeyBtn label="×" onClick={() => handlePress('*')} className="bg-[#e6f0fd] text-[#1a73e8] text-[26px] font-medium pb-1" />

            {/* Row 2 */}
            <KeyBtn label="1" onClick={() => handlePress('1')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="2" onClick={() => handlePress('2')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="3" onClick={() => handlePress('3')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="−" onClick={() => handlePress('-')} className="bg-[#e6f0fd] text-[#1a73e8] text-[26px] font-medium pb-1" />

            {/* Row 3 */}
            <KeyBtn label="4" onClick={() => handlePress('4')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="5" onClick={() => handlePress('5')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="6" onClick={() => handlePress('6')} className="bg-white text-slate-800 text-[24px] font-normal" />
            
            {/* Plus Button - Spans 2 Rows */}
            <KeyBtn 
              label="+" 
              onClick={() => handlePress('+')} 
              spanRow 
              className="bg-[#e6f0fd] text-[#1a73e8] text-[26px] font-medium pb-1" 
            />

            {/* Row 4 */}
            <KeyBtn label="7" onClick={() => handlePress('7')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="8" onClick={() => handlePress('8')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="9" onClick={() => handlePress('9')} className="bg-white text-slate-800 text-[24px] font-normal" />

            {/* Row 5 */}
            <KeyBtn 
              icon={<Delete size={24} strokeWidth={1.5} className="text-slate-800" />} 
              onClick={handleBackspace} 
              className="bg-white" 
            />
            <KeyBtn label="0" onClick={() => handlePress('0')} className="bg-white text-slate-800 text-[24px] font-normal" />
            <KeyBtn label="." onClick={() => handlePress('.')} className="bg-white text-slate-800 text-[24px] font-normal pb-2" />
            
            {/* Equal Button */}
            <KeyBtn 
              label="=" 
              onClick={handleDone} 
              className="bg-[#e6f0fd] text-[#1a73e8] text-[26px] font-medium pb-1" 
            />
        </div>
      </div>
    </div>
  );
};
