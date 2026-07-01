import { useState } from 'react';
import { RotateCcw, Copy, AlertTriangle } from 'lucide-react';

interface ActionControlsProps {
  onClearToday: () => void;
  onCopyPreviousDay?: () => void;
  displayMode?: 'light' | 'dark';
}

export default function ActionControls({
  onClearToday,
  onCopyPreviousDay,
  displayMode = 'dark',
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

  const isDark = displayMode === 'dark';

  return (
    <div className="w-full relative flex flex-row gap-1.5" id="action-buttons-horizontal">
      {/* 1. Copy Previous Day (Optional) */}
      {onCopyPreviousDay && (
        <button
          onClick={onCopyPreviousDay}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer select-none border font-bold text-[9px] sm:text-[10px] flex-1 h-[50px] ${
            isDark
              ? 'bg-indigo-950/45 hover:bg-indigo-900/40 text-indigo-300 border-indigo-800/80 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)]'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]'
          }`}
          id="copy-previous-day-btn"
          title="前日の記録をコピー"
        >
          <Copy className={`h-3.5 w-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <span className="leading-tight font-black">前日コピー</span>
        </button>
      )}

      {/* 2. Reset/Clear Today's Records */}
      <button
        onClick={handleClearClick}
        className={`flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer select-none border font-bold text-[9px] sm:text-[10px] flex-1 h-[50px] ${
          isDark
            ? 'bg-[#1C1B1F] hover:bg-slate-800 text-slate-200 border-[#49454F] shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)]'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]'
        }`}
        id="clear-today-btn"
        title="本日クリア"
      >
        <RotateCcw className={`h-3.5 w-3.5 ${isDark ? 'text-[#CAC4D0]' : 'text-slate-650'}`} />
        <span className="leading-tight font-black">全クリア</span>
      </button>

      {/* Confirmation overlay styled perfectly for small widths */}
      {showClearConfirm && (
        <div 
          className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center p-1 z-25 animate-fade-in ${
            isDark
              ? 'bg-[#1C1B1F] border-rose-900/50'
              : 'bg-white border-rose-250'
          }`} 
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
              className={`py-1 font-bold text-[9px] rounded-lg transition-all cursor-pointer select-none flex-1 border ${
                isDark
                  ? 'bg-[#121212] text-slate-300 border-[#49454F] hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
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
