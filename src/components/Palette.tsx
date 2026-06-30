import React, { useState, useRef } from 'react';
import { SleepSymbol, ActiveTool, StampConfig } from '../types';
import { STAMP_COLORS, getStampStyleForMode } from '../utils';
import { Trash2, Plus, Check, X, Info, Columns } from 'lucide-react';

interface PaletteProps {
  activeSymbol: SleepSymbol;
  setActiveSymbol: (sym: SleepSymbol) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  stamps: StampConfig[];
  onStampsChange: (stamps: StampConfig[]) => void;
  showToast: (msg: string) => void;
  displayMode: 'vivid' | 'soft' | 'dark';
  onDisplayModeChange: (mode: 'vivid' | 'soft' | 'dark') => void;
  showModeSwitcher?: boolean;
  isSlim?: boolean;
  onToggleSlim?: () => void;
  isNowActive?: boolean;
  onNowActiveChange?: (val: boolean) => void;
  isSleepTab?: boolean;
}

export default function Palette({
  activeSymbol,
  setActiveSymbol,
  activeTool,
  setActiveTool,
  stamps,
  onStampsChange,
  showToast,
  displayMode,
  onDisplayModeChange,
  showModeSwitcher = true,
  isSlim = false,
  onToggleSlim,
  isNowActive = false,
  onNowActiveChange,
  isSleepTab = false,
}: PaletteProps) {
  
  // Timers for long press detection
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  // Modal screen states
  const [editingStamp, setEditingStamp] = useState<StampConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

  // Form states for modal
  const [formName, setFormName] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [formColor, setFormColor] = useState('purple');

  const handleSelect = (item: any) => {
    if (item.type === 'eraser') {
      setActiveTool('eraser');
    } else {
      setActiveTool('stamp');
      setActiveSymbol(item.id);
    }
  };

  // Start gesture timer for long press
  const handlePressStart = (item: any) => {
    if (item.type === 'eraser') return;
    isLongPressTriggered.current = false;
    
    pressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      openConfigScreen(item);
    }, 600); // 600ms hold to configure
  };

  // End gesture timer
  const handlePressEnd = (item: any) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    if (!isLongPressTriggered.current) {
      handleSelect(item);
    }
  };

  const openConfigScreen = (stampObj: StampConfig) => {
    setEditingStamp(stampObj);
    setIsAddingNew(false);
    setIsDeleteConfirm(false);
    setFormName(stampObj.name);
    setFormSymbol(stampObj.symbol);
    setFormColor(stampObj.color);
  };

  const openAddScreen = () => {
    if (stamps.length >= 10) {
      showToast('⚠️ 登録できるスタンプは最大10個までです');
      return;
    }
    setEditingStamp(null);
    setIsAddingNew(true);
    setIsDeleteConfirm(false);
    setFormName('');
    setFormSymbol('S');
    setFormColor('sky');
  };

  const handleSaveStamp = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      showToast('⚠️ スタンプ名を入力してください');
      return;
    }

    const trimmedSymbol = formSymbol.trim();
    if (!trimmedSymbol) {
      showToast('⚠️ 対応させる記号を1文字入力してください');
      return;
    }

    if (trimmedSymbol.length !== 1) {
      showToast('⚠️ 1文字のみ入力してください');
      return;
    }

    if (isAddingNew) {
      const newStamp: StampConfig = {
        id: 'stamp_' + Date.now(),
        name: trimmedName.slice(0, 5), // Keep it compact to fit layout nicely
        symbol: trimmedSymbol,
        color: formColor,
      };
      const updated = [...stamps, newStamp];
      onStampsChange(updated);
      setIsAddingNew(false);
      setActiveTool('stamp');
      setActiveSymbol(newStamp.id);
      showToast(`✨ 新規スタンプ「${newStamp.name}」を追加しました`);
    } else if (editingStamp) {
      const updated = stamps.map((s) => {
        if (s.id === editingStamp.id) {
          return {
            ...s,
            name: trimmedName.slice(0, 5),
            symbol: trimmedSymbol,
            color: formColor,
          };
        }
        return s;
      });
      onStampsChange(updated);
      setEditingStamp(null);
      showToast(`✏️ スタンプ「${trimmedName.slice(0, 5)}」の設定を保存しました`);
    }
  };

  const handleDeleteStamp = (stampId: string) => {
    if (stamps.length <= 1) {
      showToast('⚠️ 最後の1つは削除できません');
      return;
    }

    const stampToDelete = stamps.find(s => s.id === stampId);
    const updated = stamps.filter((s) => s.id !== stampId);
    onStampsChange(updated);
    
    // If deleted stamp was active, reset to another one
    if (activeSymbol === stampId) {
      setActiveSymbol(updated[0].id);
    }

    setEditingStamp(null);
    setIsDeleteConfirm(false);
    showToast(`🗑️ スタンプ「${stampToDelete?.name || ''}」を削除しました`);
  };

  const getSymbolExplanation = (sym: string) => {
    switch (sym) {
      case '★': return '💡 【特別記号：就寝】就寝時間として記録され、睡眠開始時刻や入眠潜時の基準になります';
      case 'S': return '💡 【特別記号：睡眠】睡眠中の時間として、合計睡眠時間（自動集計）に加算されます';
      case '×': return '💡 【特別記号：覚醒】夜間の途中覚醒として、中途覚醒回数（自動集計）にカウントされます';
      case '○': return '💡 【特別記号：起床】起床時間として、睡眠の終了時刻に記録されます';
      case '－': return '💡 【特別記号：横寝】布団に入って横になっている時間として記録されます';
      case '': return '💡 自動集計やグラフ表示に連動する記号を1文字入力してください。';
      default: return `💡 【一般記号：「${sym}」】カレンダー表示やCSV書き出しへの記録に対応します。自動集計（睡眠時間や覚醒回数の計算）からは除外されます。`;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3.5" id="stamp-palette-container">
      {/* Display Mode Switcher */}
      {showModeSwitcher && (
        <>
          <div className="mt-1 font-sans" id="display-mode-selector-palette-top">
            <div className={`text-[11px] font-black uppercase tracking-wider mb-2 ml-0.5 select-none text-left flex items-center gap-1 ${
              displayMode === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span>🌈 表示モードの選択</span>
            </div>
            <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
              displayMode === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => onDisplayModeChange('vivid')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer font-black text-xs ${
                  displayMode === 'vivid'
                    ? 'bg-white text-blue-600 shadow-md ring-1 ring-blue-500/10'
                    : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60' : 'text-slate-600 hover:text-slate-805 hover:bg-white/40')
                }`}
              >
                <span className="text-base leading-none">🌈</span>
                <span className="text-[10px] sm:text-[11px] font-black mt-1">はっきり</span>
              </button>

              <button
                type="button"
                onClick={() => onDisplayModeChange('soft')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer font-black text-xs ${
                  displayMode === 'soft'
                    ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-500/10'
                    : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60' : 'text-slate-600 hover:text-slate-805 hover:bg-white/40')
                }`}
              >
                <span className="text-base leading-none">🌷</span>
                <span className="text-[10px] sm:text-[11px] font-black mt-1">やさしい</span>
              </button>

              <button
                type="button"
                onClick={() => onDisplayModeChange('dark')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer font-black text-xs ${
                  displayMode === 'dark'
                    ? 'bg-zinc-800 text-yellow-300 shadow-md ring-1 ring-yellow-400/20'
                    : 'text-slate-600 hover:text-slate-805 hover:bg-white/40'
                }`}
              >
                <span className="text-base leading-none">🌙</span>
                <span className="text-[10px] sm:text-[11px] font-black mt-1">ダーク</span>
              </button>
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-850 select-none my-1"></div>
        </>
      )}

      {/* Main Grid Palette list */}
      <div className={`grid ${isSlim ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-1.5 sm:gap-2'} w-full`} id="symbol-palette-grid">
        {stamps.map((stamp, index) => {
          const isSelected = activeTool === 'stamp' && activeSymbol === stamp.id;
          const modeStyle = getStampStyleForMode(stamp.color, displayMode);

          return (
            <button
              key={`${stamp.id || 'stamp'}-${index}`}
              onMouseDown={() => handlePressStart(stamp)}
              onMouseUp={() => handlePressEnd(stamp)}
              onMouseLeave={() => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); }}
              onTouchStart={() => handlePressStart(stamp)}
              onTouchEnd={() => handlePressEnd(stamp)}
              className={`w-full flex flex-col items-center ${isSlim ? 'p-0.5 rounded-lg' : 'p-1 rounded-xl'} border transition-all active:scale-[0.98] cursor-pointer select-none justify-center ${
                isSelected 
                  ? (displayMode === 'dark'
                      ? 'bg-blue-950/20 border-sky-400 border-4 shadow-md ring-4 ring-sky-400/50'
                      : 'bg-blue-50/30 border-blue-600 border-4 shadow-md ring-4 ring-blue-600/40 font-black')
                  : (displayMode === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-200'
                      : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-800')
              }`}
              id={`palette-btn-${stamp.id}`}
              title={`${stamp.name} (長押しで編集)`}
            >
              <div className={`w-full ${isSlim ? 'h-8 sm:h-9 rounded-md' : 'h-11 sm:h-13 rounded-lg'} flex items-center justify-center py-1 px-1 shrink-0 ${
                displayMode === 'dark' ? 'border border-transparent' : 'border'
              } ${modeStyle.bgColor} ${modeStyle.borderColor}`}>
                <span 
                  className={`${modeStyle.textClass} tracking-wider leading-none truncate max-w-full text-center`}
                  style={{
                    color: modeStyle.textColor,
                    textShadow: modeStyle.textShadow !== 'none' ? modeStyle.textShadow : undefined,
                    WebkitTextStroke: modeStyle.textStroke !== 'none' ? modeStyle.textStroke : undefined
                  }}
                >
                  {stamp.name}
                </span>
              </div>
            </button>
          );
        })}

        {/* Plus additional slot (only if count < 10) */}
        {stamps.length < 10 && (
          <button
            type="button"
            onClick={openAddScreen}
            className={`w-full flex flex-col items-center ${isSlim ? 'p-0.5 rounded-lg' : 'p-1 rounded-xl'} border border-dashed transition-all active:scale-95 cursor-pointer justify-center ${
              displayMode === 'dark'
                ? 'border-slate-800 hover:border-sky-500 bg-slate-950/40 hover:bg-slate-900/50 text-slate-400 hover:text-sky-400'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50/40 hover:bg-slate-100/50 text-slate-600 hover:text-blue-600'
            }`}
            id="palette-btn-add-stamp"
            title="スタンプを新しく追加"
          >
            <div className={`w-full ${isSlim ? 'h-8 sm:h-9 rounded-md' : 'h-11 sm:h-13 rounded-lg'} flex items-center justify-center py-1 px-1 shrink-0 border border-dashed ${
              displayMode === 'dark' ? 'border-slate-800' : 'border-slate-350'
            }`}>
              <span className={`${isSlim ? 'text-[10px]' : 'text-xs sm:text-sm'} font-extrabold tracking-wider leading-none flex items-center gap-1`}>
                <Plus className={`${isSlim ? 'w-3 h-3' : 'w-4 h-4'} stroke-[2.5]`} />
                {isSlim ? '追加' : '追加する'}
              </span>
            </div>
          </button>
        )}

        {/* Static Eraser tool */}
        <button
          onClick={() => handleSelect({ type: 'eraser' })}
          className={`w-full flex flex-col items-center ${isSlim ? 'p-0.5 rounded-lg' : 'p-1 rounded-xl'} border transition-all active:scale-[0.98] cursor-pointer select-none justify-center ${
            activeTool === 'eraser' 
              ? (displayMode === 'dark'
                  ? 'bg-blue-950/20 border-sky-400 border-4 shadow-md ring-4 ring-sky-400/50'
                  : 'bg-blue-50/30 border-blue-600 border-4 shadow-md ring-4 ring-blue-600/40')
              : (displayMode === 'dark'
                  ? 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-205'
                  : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-800')
          }`}
          id="palette-btn-eraser"
          title="消しゴム"
        >
          <div className={`w-full ${isSlim ? 'h-8 sm:h-9 rounded-md gap-0' : 'h-11 sm:h-13 rounded-lg gap-0.5'} flex flex-col items-center justify-center py-0.5 px-1 shrink-0 border ${
            displayMode === 'dark'
              ? 'bg-slate-900 text-sky-300 border-slate-800'
              : 'bg-gray-100 text-slate-700 border-gray-200'
          }`}>
            <span className={`leading-none ${isSlim ? 'text-[15px]' : 'text-[20px] sm:text-[23px]'}`}>🧽</span>
            <span className={`${isSlim ? 'text-[9.5px] tracking-tight font-black' : 'text-[11.5px] sm:text-[13px] font-black tracking-tight'} leading-none opacity-90`}>
              消しゴム
            </span>
          </div>
        </button>
      </div>

      {/* "いま" Auto Scroll Toggle Switch - Highly intuitive, tactically friendly for senior users */}
      <div 
        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
          isNowActive 
            ? (displayMode === 'dark' ? 'bg-sky-950/20 border-sky-500/50' : 'bg-sky-50 border-sky-200')
            : (displayMode === 'dark' ? 'bg-slate-950 border-slate-850 hover:bg-slate-900/40' : 'bg-white border-slate-150 hover:bg-slate-50')
        }`}
        id="now-toggle-container"
        title="現在時刻付近へ自動的にスクロールして表示します"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[13px] shrink-0 ${isNowActive ? 'animate-pulse' : ''}`}>🕒</span>
          {!isSlim && (
            <span className={`text-[11px] font-black truncate ${
              displayMode === 'dark' ? 'text-slate-200' : 'text-slate-800'
            }`}>
              いま移動
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const nextVal = !isNowActive;
            onNowActiveChange?.(nextVal);
            showToast(nextVal ? '🕒 現在時刻への自動スクロールを有効にしました' : '🕒 自動スクロールを無効にしました');
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
            isNowActive ? 'bg-sky-500' : (displayMode === 'dark' ? 'bg-slate-850' : 'bg-slate-250')
          }`}
          role="switch"
          aria-checked={isNowActive}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
              isNowActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Width Slim Button - Configured to have the exact style as the Top Hide button */}
      {onToggleSlim && (
        <button
          type="button"
          onClick={onToggleSlim}
          className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border font-black text-[11px] sm:text-xs transition-all cursor-pointer select-none shrink-0 ${
            displayMode === 'dark'
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:text-white'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="サイドバーの幅を切り替える"
          id="palette-toggle-slim-sidebar-btn"
        >
          <Columns className="h-4 w-4 shrink-0" />
          {isSlim ? (
            <>
              <span className="hidden xs:inline">標準幅に戻す</span>
              <span className="xs:hidden">標準</span>
            </>
          ) : (
            <>
              <span className="hidden xs:inline">幅スリムにする</span>
              <span className="xs:hidden">スリム</span>
            </>
          )}
        </button>
      )}

      {/* Informative hint (moved to bottom, hidden on mobile sized screens) */}
      {!isSlim && (
        <span className={`text-[10px] font-semibold px-1 tracking-wider uppercase select-none text-left flex items-center gap-1 ${
          displayMode === 'dark' ? 'text-slate-500' : 'text-slate-400'
        } hidden md:flex`}>
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          スタンプ長押しで 追加・削除・編集 ができます
        </span>
      )}

      {/* DETAILED DIALOG OVERLAY: ADD / DELETE / EDIT SCREEN */}
      {(editingStamp !== null || isAddingNew) && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans animate-in fade-in duration-150 select-none">
          <div className="bg-[#1c1b1f] text-white rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-[#2d2c30] flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-base font-black text-[#e3e2e6] flex items-center gap-2">
                <span>{isAddingNew ? '✨ 新規スタンプの作成' : '✏️ スタンプ設定'}</span>
              </h3>
              <button 
                onClick={() => { setEditingStamp(null); setIsAddingNew(false); setIsDeleteConfirm(false); }}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-[#e3e2e6] transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-2">
              {/* 1. Name Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left block">
                  スタンプ表示名 (全角5文字以内)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="二度寝"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black text-black focus:outline-hidden focus:border-blue-500 transition-all shadow-6xs placeholder:text-slate-400"
                />
              </div>

              {/* 2. Underlying Symbol Mapping */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left block">
                  対応させる記号・分類（一文字だけ入力）
                </label>
                <div className="pt-1">
                  <input
                    type="text"
                    maxLength={1}
                    value={formSymbol}
                    placeholder="S"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 1) {
                        setFormSymbol(val);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black text-black focus:outline-hidden focus:border-blue-500 transition-all shadow-6xs placeholder:text-slate-450"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    （例：睡眠は「S」、覚醒は「×」などを指定してください）
                  </div>
                </div>
                <div className="bg-blue-950/40 rounded-xl p-2.5 border border-[#2d2c30] text-[9.5px] text-sky-300 leading-normal font-medium text-left mt-2">
                  {getSymbolExplanation(formSymbol)}
                </div>
              </div>

              {/* 3. Color Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left block">
                  スタンプのカラー
                </label>
                <div className="grid grid-cols-5 gap-2.5 pt-1 bg-[#121212] p-3 rounded-2xl border border-[#2d2c30]">
                  {Object.keys(STAMP_COLORS).map((colorKey) => {
                    const theme = STAMP_COLORS[colorKey];
                    const isSelected = formColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormColor(colorKey)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center relative shadow-6xs border transition-all hover:scale-105 active:scale-90 cursor-pointer ${theme.bgColor} ${theme.borderColor} ${
                          isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                        }`}
                        title={colorKey}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full`} style={{ backgroundColor: theme.rawHex }}></span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white absolute inset-auto stroke-[3]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-3 border-t border-[#2d2c30] pt-4 mt-2 shrink-0">
              {isDeleteConfirm ? (
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-150">
                  <span className="text-xs font-extrabold text-rose-300 text-center leading-tight">
                    本当にスタンプ「{editingStamp?.name}」を削除しますか？<br />
                    この操作は元に戻せません。
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirm(false)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#2d2c30] text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-[#e3e2e6] transition-colors cursor-pointer text-center"
                    >
                      戻る
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingStamp) {
                          handleDeleteStamp(editingStamp.id);
                        }
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-[#e3e2e6] font-black text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      削除を確定する
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 justify-between w-full">
                  {/* Leftmost Delete option (only if editing existing and have multiple) */}
                  {!isAddingNew && editingStamp && stamps.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirm(true)}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold text-rose-400 bg-rose-950/40 hover:bg-rose-950/65 border border-rose-900/50 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-1 active:scale-95 animate-in fade-in duration-100"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      削除する
                    </button>
                  ) : (
                    <div /> // placeholder spacer
                  )}

                  {/* Rightmost Controls */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setEditingStamp(null); setIsAddingNew(false); setIsDeleteConfirm(false); }}
                      className="px-3.5 py-2 rounded-xl border border-slate-750 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-[#e3e2e6] transition-colors cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStamp}
                      className="bg-blue-600 hover:bg-blue-700 text-[#e3e2e6] font-black text-xs py-2 px-4 rounded-xl shadow-md active:shadow-xs hover:scale-102 active:scale-98 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      {isAddingNew ? '作成する' : '保存する'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
