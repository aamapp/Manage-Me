
import React, { useEffect, useState } from 'react';
import { Delete, ChevronDown } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      const val = initialValue === 0 ? '' : String(initialValue);
      setBuffer(val);
    }
  }, [isOpen, initialValue]);

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
      // Keep as is if invalid
    }
  };

  const handleDone = () => {
    handleCalculate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end">
      {/* 1. Backdrop Layer: Covers the whole screen behind the keypad */}
      <div 
        className="absolute inset-0 bg-transparent" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDone();
        }} 
      />

      {/* 2. Content Layer: The actual keypad */}
      <div 
        className="relative bg-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-slate-200 pb-safe z-10"
        onClick={(e) => {
          // Critical: Stop clicks inside keypad from bubbling to backdrop
          e.stopPropagation();
        }}
      >
        
        {/* Top Control Bar */}
        <div className="h-10 bg-slate-200/50 flex items-center justify-between px-4 border-b border-slate-300/50">
           <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {/* Optional chips can go here */}
           </div>
           <button 
             type="button"
             onClick={handleDone}
             className="ml-auto text-indigo-600 font-bold text-sm bg-transparent px-2 py-1 flex items-center gap-1"
           >
             <ChevronDown size={20} />
           </button>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-[1px] bg-slate-300 p-[1px]">
            {/* Row 1 */}
            <KeyBtn label="C" onClick={handleClear} className="text-rose-500 font-bold" />
            <KeyBtn label="÷" onClick={() => handlePress('/')} className="text-indigo-600 text-xl" />
            <KeyBtn label="×" onClick={() => handlePress('*')} className="text-indigo-600 text-xl" />
            <KeyBtn label="⌫" onClick={handleBackspace} className="text-slate-600" icon={<Delete size={20} />} />

            {/* Row 2 */}
            <KeyBtn label="7" onClick={() => handlePress('7')} />
            <KeyBtn label="8" onClick={() => handlePress('8')} />
            <KeyBtn label="9" onClick={() => handlePress('9')} />
            <KeyBtn label="-" onClick={() => handlePress('-')} className="text-indigo-600 text-3xl pb-1" />

            {/* Row 3 */}
            <KeyBtn label="4" onClick={() => handlePress('4')} />
            <KeyBtn label="5" onClick={() => handlePress('5')} />
            <KeyBtn label="6" onClick={() => handlePress('6')} />
            <KeyBtn label="+" onClick={() => handlePress('+')} className="text-indigo-600 text-2xl" />

            {/* Row 4 */}
            <div className="col-span-3 grid grid-cols-3 gap-[1px]">
                <KeyBtn label="1" onClick={() => handlePress('1')} />
                <KeyBtn label="2" onClick={() => handlePress('2')} />
                <KeyBtn label="3" onClick={() => handlePress('3')} />
                
                <KeyBtn label="." onClick={() => handlePress('.')} className="text-xl font-bold" />
                <KeyBtn label="0" onClick={() => handlePress('0')} />
                <KeyBtn label="00" onClick={() => handlePress('00')} />
            </div>
            
            {/* Equal / Done Button - Spans 2 rows height equivalent */}
            <button 
              type="button"
              onClick={handleDone}
              className="bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center h-full min-h-[108px] transition-colors"
            >
              <div className="flex flex-col items-center">
                 <span className="text-2xl font-bold">=</span>
                 <span className="text-[10px] font-medium uppercase mt-1">Done</span>
              </div>
            </button>
        </div>
      </div>
    </div>
  );
};

const KeyBtn = ({ label, onClick, className = "", icon }: any) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }}
    className={`
      bg-white active:bg-slate-200 h-14 flex items-center justify-center
      text-slate-800 text-xl font-semibold transition-colors
      ${className}
    `}
  >
    {icon || label}
  </button>
);
