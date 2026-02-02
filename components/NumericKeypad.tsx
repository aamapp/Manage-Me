
import React, { useEffect, useState } from 'react';
import { X, Check, Delete, Calculator, Equal } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onValueChange: (value: number) => void;
  initialValue?: number | string;
  title?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ 
  isOpen, 
  onClose, 
  onValueChange, 
  initialValue = '',
  title = 'পরিমাণ লিখুন'
}) => {
  const [display, setDisplay] = useState('0');
  const [isResult, setIsResult] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplay(initialValue ? String(initialValue) : '0');
      setIsResult(true); // Treat initial value as a result so next type overwrites it
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handlePress = (val: string) => {
    if (isResult) {
      if (['+', '-', '*', '/'].includes(val)) {
        // Continue calculating with previous result
        setDisplay(display + val);
        setIsResult(false);
      } else {
        // Start new number
        setDisplay(val);
        setIsResult(false);
      }
    } else {
      if (display === '0' && !['+', '-', '*', '/', '.'].includes(val)) {
        setDisplay(val);
      } else {
        setDisplay(display + val);
      }
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setIsResult(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleCalculate = () => {
    try {
      // Safe evaluation of the math expression
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + display)();
      const formattedResult = String(Math.round(result * 100) / 100); // 2 decimal places
      setDisplay(formattedResult);
      setIsResult(true);
      return formattedResult;
    } catch (e) {
      return display;
    }
  };

  const handleSubmit = () => {
    const finalVal = handleCalculate();
    onValueChange(parseFloat(finalVal) || 0);
    onClose();
  };

  const buttons = [
    { label: 'AC', action: handleClear, style: 'text-rose-500 font-bold bg-rose-50' },
    { label: '⌫', action: handleBackspace, style: 'text-slate-600 bg-slate-50' },
    { label: '/', action: () => handlePress('/'), style: 'text-indigo-600 bg-indigo-50 font-bold text-xl' },
    { label: '×', action: () => handlePress('*'), style: 'text-indigo-600 bg-indigo-50 font-bold text-xl' },
    { label: '7', action: () => handlePress('7'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '8', action: () => handlePress('8'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '9', action: () => handlePress('9'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '-', action: () => handlePress('-'), style: 'text-indigo-600 bg-indigo-50 font-bold text-xl' },
    { label: '4', action: () => handlePress('4'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '5', action: () => handlePress('5'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '6', action: () => handlePress('6'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '+', action: () => handlePress('+'), style: 'text-indigo-600 bg-indigo-50 font-bold text-xl' },
    { label: '1', action: () => handlePress('1'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '2', action: () => handlePress('2'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '3', action: () => handlePress('3'), style: 'text-slate-800 bg-white font-bold text-xl' },
    { label: '=', action: handleCalculate, style: 'row-span-2 bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center' },
    { label: '0', action: () => handlePress('0'), style: 'col-span-2 text-slate-800 bg-white font-bold text-xl' },
    { label: '.', action: () => handlePress('.'), style: 'text-slate-800 bg-white font-bold text-xl' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleSubmit} // Closing by clicking outside saves the value
      />

      {/* Keypad Container */}
      <div className="relative bg-slate-100 rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        
        {/* Header / Display Area */}
        <div className="bg-white px-6 py-5 border-b border-slate-100 flex flex-col items-end justify-center min-h-[100px] relative">
           
           {/* Top Controls */}
           <div className="absolute top-4 left-6 flex items-center gap-2">
             <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
               <Calculator size={16} />
             </div>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</span>
           </div>

           <button 
              onClick={handleSubmit}
              className="absolute top-4 right-6 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 active:scale-90 transition-transform shadow-lg shadow-indigo-200"
           >
              <Check size={20} strokeWidth={3} />
           </button>

           {/* The Result Display */}
           <div className="w-full text-right mt-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span className="text-4xl font-black text-slate-800 tracking-tight">{display}</span>
           </div>
        </div>

        {/* Buttons Grid */}
        <div className="p-4 grid grid-cols-4 gap-3 h-[380px] pb-8">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                btn.action();
              }}
              className={`
                ${btn.style} 
                rounded-2xl shadow-sm border-b-[3px] border-slate-200 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center select-none h-full w-full
              `}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
