import { useState } from 'react';
import { RotateCcw, Copy, AlertTriangle } from 'lucide-react';

interface ActionControlsProps {
  onClearToday: () => void;
}

export default function ActionControls({
  onClearToday,
}: ActionControlsProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    onClearToday();
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="w-full relative flex flex-row gap-1.5" id="action-buttons-horizontal">
      
      {/* 2. Reset/Clear Today's Records (Gray/White) */}
      <button
        onClick={handleClearClick}
        className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1C1B1F] hover:bg-slate-800 text-slate-200 hover:text-[#e3e2e6] active:scale-[0.98] transition-all cursor-pointer select-none border border-[#49454F] font-bold text-[9px] sm:text-[10px] flex-1 h-[50px]"
        id="clear-today-btn"
        title="本日クリア"
      >
        <RotateCcw className="h-3.5 w-3.5 text-[#CAC4D0]" />
        <span className="leading-tight">全クリア</span>
      </button>

      {/* Confirmation overlay styled perfectly for small widths */}
      {showClearConfirm && (
        <div 
          className="absolute inset-0 bg-[#1C1B1F] rounded-xl border border-rose-900/50 flex flex-col items-center justify-center p-1 z-25 animate-fade-in" 
          id="clear-confirm-balloon"
        >
          <div className="flex flex-col items-center text-rose-500 mb-1 text-center">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-black leading-tight text-rose-400">全クリア？</span>
          </div>
          <div className="flex flex-row gap-1 w-full px-1">
            <button
              onClick={confirmClear}
              className="py-1 bg-rose-600 text-[#e3e2e6] font-bold text-[9px] rounded-lg hover:bg-rose-700 shadow-xs transition-with cursor-pointer select-none flex-1"
              id="confirm-clear-btn"
            >
              消す
            </button>
            <button
              onClick={cancelClear}
              className="py-1 bg-[#121212] text-slate-300 font-bold text-[9px] rounded-lg hover:bg-slate-800 transition-all cursor-pointer select-none flex-1 border border-[#49454F]"
              id="cancel-clear-btn"
            >
              戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
