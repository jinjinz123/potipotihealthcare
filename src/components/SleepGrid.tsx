import React, { useRef, useState } from 'react';
import { SleepSymbol, ActiveTool, HourRepresentation, DayRecord, StampConfig } from '../types';
import { X, Check, Trash2 } from 'lucide-react';
import { STAMP_COLORS, getStampStyleForMode } from '../utils';

interface SleepGridProps {
  record: DayRecord;
  onCellTap: (slotIdx: number, colIdx?: number) => void;
  activeSymbol: SleepSymbol;
  activeTool: ActiveTool;
  hourRep: HourRepresentation;
  customColCount: number;
  customColNames: string[];
  onUpdateColConfig: (colIdx: number, newName: string, dataAction: 'keep' | 'clear' | 'archive', category: string) => void;
  onSwapCols: (colIdxA: number, colIdxB: number) => void;
  onDeleteCol?: (colIdx: number) => void;
  stamps: StampConfig[];
  inputMethod: 'stamp' | 'paint';
  displayMode: 'vivid' | 'soft' | 'dark';
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  isNowActive?: boolean;
  selectedDate?: string;
  isSleepTab?: boolean;
  scrollToColIdx?: number | null;
  categories?: string[];
  customColCategories?: string[];
  activeCategoryFilter?: string | null;
  activityColWidth?: number;
  activityColFontWeight?: string;
}

export default function SleepGrid({
  record,
  onCellTap,
  activeSymbol,
  activeTool,
  hourRep,
  customColCount,
  customColNames,
  onUpdateColConfig,
  onSwapCols,
  onDeleteCol,
  stamps,
  inputMethod,
  displayMode,
  onInteractionStart,
  onInteractionEnd,
  isNowActive = false,
  selectedDate,
  isSleepTab = false,
  scrollToColIdx = null,
  categories = ['衛生', '食事', '病気', '外出', '掃除', 'その他'],
  customColCategories = [],
  activeCategoryFilter = null,
  activityColWidth = 32,
  activityColFontWeight = 'font-black',
}: SleepGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const lastInteractedKeyRef = useRef<string | null>(null);

  const isColVisible = (cIdx: number) => {
    if (!activeCategoryFilter) return true;
    const colCat = customColCategories[cIdx] || 'その他';
    return colCat === activeCategoryFilter;
  };

  // Helper to calculate the current local time slot (0 - 47)
  const getCurrentTimeSlotIndex = (): number => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const slotIdx = hour * 2 + (minute >= 30 ? 1 : 0);
    return Math.min(Math.max(slotIdx, 0), 47);
  };

  // 最後にタップまたは「いま移動」で選択されたスロットインデックス
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  const scrollToCurrentTime = React.useCallback(() => {
    const slotIdx = getCurrentTimeSlotIndex();
    const targetIdx = isSleepTab ? slotIdx : Math.floor(slotIdx / 2);
    setActiveSlotIdx(targetIdx);
    const rowElement = document.getElementById(`hour-row-zoomed-${targetIdx}`);
    if (rowElement && containerRef.current) {
      const container = containerRef.current;
      const rowOffsetTop = rowElement.offsetTop;
      const rowHeight = rowElement.clientHeight;
      const containerHeight = container.clientHeight;

      // Calculate scroll target to vertically center the row inside the scroll view container
      const targetScrollTop = rowOffsetTop - (containerHeight / 2) + (rowHeight / 2);

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  }, [isSleepTab]);

  // Auto scroll effect to center the currently active hour row
  React.useEffect(() => {
    if (!isNowActive) return;

    // 「いま移動」がオンになったら、現在時刻のスロットをアクティブにする
    const currentSlot = getCurrentTimeSlotIndex();
    const targetIdx = isSleepTab ? currentSlot : Math.floor(currentSlot / 2);
    setActiveSlotIdx(targetIdx);

    // Small delay to ensure the DOM and container layouts have calculated correctly
    const timer = setTimeout(() => {
      scrollToCurrentTime();
    }, 120);

    return () => clearTimeout(timer);
  }, [isNowActive, selectedDate, scrollToCurrentTime, isSleepTab]);

  // Horizontal scroll and blinking effect for categories
  const [blinkColIdx, setBlinkColIdx] = useState<number | null>(null);

  // Dynamic snap page size calculation
  const [pageSize, setPageSize] = React.useState<number>(8);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          // Time label width is 64px (w-16 = 4rem = 64px)
          const availableWidth = width - 64;
          const colWidth = isSleepTab ? 32 : activityColWidth; // Dynamic based on activityColWidth
          // Maximum columns fitting in one screen. Minimum 1.
          const calculatedSize = Math.max(1, Math.floor(availableWidth / colWidth));
          setPageSize(calculatedSize);
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isSleepTab, activityColWidth]);

  React.useEffect(() => {
    if (scrollToColIdx === null || scrollToColIdx === undefined) return;

    const timer1 = setTimeout(() => {
      const headerElement = document.getElementById(`col-header-${scrollToColIdx}`);
      if (headerElement && containerRef.current) {
        const container = containerRef.current;
        const headerOffsetLeft = headerElement.offsetLeft;
        const headerWidth = headerElement.clientWidth;
        const containerWidth = container.clientWidth;

        // Smoothly scroll container horizontally to center the active category column
        const targetScrollLeft = headerOffsetLeft - (containerWidth / 2) + (headerWidth / 2);

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth'
        });

        // Set blinking active
        setBlinkColIdx(scrollToColIdx);
        const timer2 = setTimeout(() => {
          setBlinkColIdx(null);
        }, 1500); // Pulse for 1.5s

        return () => clearTimeout(timer2);
      }
    }, 100);

    return () => clearTimeout(timer1);
  }, [scrollToColIdx]);
  
  // Touch tracking refs for scroll safety in stamp (tap) input mode
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchCancelled = useRef<boolean>(false);

  // Scroll safety touch handlers for stamp mode
  const handleCellTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isTouchCancelled.current = false;
    onInteractionStart?.();
  };

  const handleCellTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    // Cancel the tap action if finger swiped/moved more than 10 pixels
    if (dx > 10 || dy > 10) {
      isTouchCancelled.current = true;
    }
  };

  const handleCellTouchEnd = (e: React.TouchEvent, slotIdx: number, colIdx?: number) => {
    if (!touchStartPos.current) return;
    if (!isTouchCancelled.current) {
      // Finger haven't moved much -> Pure intentional tap!
      e.preventDefault(); // crucial to prevent simulated mouse/pointer events
      setActiveSlotIdx(slotIdx);
      onCellTap(slotIdx, colIdx);
    }
    touchStartPos.current = null;
    onInteractionEnd?.();
  };

  const handlePointerDownAction = (e: React.PointerEvent, slotIdx: number, colIdx?: number) => {
    // If it's a touch source, ignore it here since touch handlers above have handled it with absolute precision
    if (e.pointerType === 'touch') return;
    onInteractionStart?.();
    setActiveSlotIdx(slotIdx);
    onCellTap(slotIdx, colIdx);
    onInteractionEnd?.();
  };
  
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [typedName, setTypedName] = useState<string>('');
  const [typedCategory, setTypedCategory] = useState<string>('その他');
  const [dataAction, setDataAction] = useState<'keep' | 'clear' | 'archive'>('keep');
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

  // Column reordering via long press
  const [sortingColIdx, setSortingColIdx] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleHeaderPointerDown = (e: React.PointerEvent, cIdx: number) => {
    pressStartPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressTriggeredRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSortingColIdx(cIdx);
      onInteractionStart?.();
    }, 600); // 0.6s hold
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!pressStartPosRef.current) return;
    const dx = Math.abs(e.clientX - pressStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pressStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent, cIdx: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressStartPosRef.current = null;

    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressTriggeredRef.current = false;
    } else {
      if (sortingColIdx === null) {
        openEditDialog(cIdx);
      }
    }
  };

  const openEditDialog = (cIdx: number) => {
    setEditingColIdx(cIdx);
    setTypedName(customColNames[cIdx] || `列${cIdx + 2}`);
    setTypedCategory(customColCategories[cIdx] || 'その他');
    setDataAction('keep');
    setIsDeleteConfirm(false);
  };

  // Generate row indexes (0 to 23 representing the 24 hours)
  const rowIndices = Array.from({ length: 24 }, (_, i) => i);

  // Get style configs for symbols (colors match the template beautifully and now render names)
  const getSymbolStyle = (symbol: SleepSymbol, isOddHour: boolean = false) => {
    if (!symbol) {
      return {
        bgColor: displayMode === 'dark'
          ? (isOddHour ? 'bg-[#13244a] hover:bg-[#1c3266]' : 'bg-slate-950 hover:bg-white/[0.03]')
          : (isOddHour ? 'bg-[#def2cc] hover:bg-[#cfebb9]' : 'bg-white hover:bg-gray-50/40'),
        textColor: 'text-transparent',
        label: '',
        textClass: '',
        style: {}
      };
    }

    const stamp = stamps.find(s => s.id === symbol || s.symbol === symbol);
    if (stamp) {
      const modeStyle = getStampStyleForMode(stamp.color, displayMode, isOddHour);
      return {
        bgColor: `${modeStyle.bgColor} ${modeStyle.hoverColor}`,
        textColor: modeStyle.textColor,
        label: stamp.name,
        textClass: `${modeStyle.textClass} leading-none select-none tracking-tighter text-center truncate max-w-full px-0.5`,
        style: {
          color: modeStyle.textColor,
          textShadow: modeStyle.textShadow !== 'none' ? modeStyle.textShadow : undefined,
          WebkitTextStroke: modeStyle.textStroke !== 'none' ? modeStyle.textStroke : undefined,
        }
      };
    }

    return {
      bgColor: displayMode === 'dark'
        ? (isOddHour ? 'bg-[#13244a] hover:bg-[#1c3266]' : 'bg-slate-950 hover:bg-white/[0.03]')
        : (isOddHour ? 'bg-[#def2cc] hover:bg-[#cfebb9]' : 'bg-white hover:bg-gray-50/40'),
      textColor: 'text-transparent',
      label: '',
      textClass: '',
      style: {}
    };
  };

  // Custom column simple checked style toggle using category custom colors
  const getCustomColStyle = (symbol: SleepSymbol, colIdx: number, isOddHour: boolean = false) => {
    if (symbol) {
      const stamp = stamps[colIdx];
      const stampColor = stamp ? stamp.color : 'slate';
      const modeStyle = getStampStyleForMode(stampColor, displayMode, isOddHour);
      
      let checkSizeClass = 'text-[25px] sm:text-[27px] md:text-[29px]';
      if (!isSleepTab) {
        if (activityColWidth === 24) {
          checkSizeClass = 'text-[16px]';
        } else if (activityColWidth === 28) {
          checkSizeClass = 'text-[19px]';
        } else if (activityColWidth === 32) {
          checkSizeClass = 'text-[22px] sm:text-[24px]';
        } else if (activityColWidth === 40) {
          checkSizeClass = 'text-[28px]';
        } else if (activityColWidth === 48) {
          checkSizeClass = 'text-[34px]';
        }
      }
      
      return {
        bgColor: `${modeStyle.bgColor} ${modeStyle.hoverColor}`,
        textColor: modeStyle.textColor,
        label: '☑',
        textClass: `${isSleepTab ? 'font-black' : activityColFontWeight} ${checkSizeClass} leading-none select-none selection:bg-transparent flex items-center justify-center h-full w-full`,
        style: {
          color: modeStyle.textColor,
          textShadow: modeStyle.textShadow !== 'none' ? modeStyle.textShadow : undefined,
          WebkitTextStroke: modeStyle.textStroke !== 'none' ? modeStyle.textStroke : undefined,
        }
      };
    } else {
      return {
        bgColor: displayMode === 'dark'
          ? (isOddHour ? 'bg-[#13244a] hover:bg-[#1c3266]' : 'bg-slate-950 hover:bg-white/[0.03]')
          : (isOddHour ? 'bg-[#def2cc] hover:bg-[#cfebb9]' : 'bg-white hover:bg-gray-50/40'),
        textColor: 'text-transparent',
        label: '',
        textClass: '',
        style: {}
      };
    }
  };

  // Touch move drag paint helper for Sleep column
  const handleTouchMove = (e: React.TouchEvent) => {
    if (inputMethod !== 'paint') return;
    if (!isPointerDown) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const cell = element.closest('[data-slot-idx]');
    if (cell) {
      const colAttr = cell.getAttribute('data-col-idx');
      if (colAttr !== null && colAttr !== undefined) {
        return; // Skip touch move drag for custom columns (keeps screen swipeable)
      }
      if (e.cancelable) {
        e.preventDefault();
      }
      const slotAttr = cell.getAttribute('data-slot-idx');
      if (slotAttr !== null) {
        const slotIdx = parseInt(slotAttr, 10);
        const key = `sleep_${slotIdx}`;
        if (lastInteractedKeyRef.current !== key) {
          lastInteractedKeyRef.current = key;
          setActiveSlotIdx(slotIdx);
          onCellTap(slotIdx);
        }
      }
    }
  };

  const handlePointerDown = (slotIdx: number, colIdx?: number) => {
    onInteractionStart?.();
    setActiveSlotIdx(slotIdx);
    if (colIdx !== undefined) {
      onCellTap(slotIdx, colIdx);
    } else {
      if (inputMethod === 'paint') {
        setIsPointerDown(true);
        const key = `sleep_${slotIdx}`;
        lastInteractedKeyRef.current = key;
      }
      onCellTap(slotIdx, colIdx);
    }
  };

  const handlePointerEnter = (slotIdx: number, colIdx?: number) => {
    if (colIdx !== undefined) {
      return; // Disable click-drag painting on custom activity columns
    }
    if (inputMethod === 'paint' && isPointerDown) {
      setActiveSlotIdx(slotIdx);
      const key = `sleep_${slotIdx}`;
      if (lastInteractedKeyRef.current !== key) {
        lastInteractedKeyRef.current = key;
        onCellTap(slotIdx, colIdx);
      }
    }
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
    lastInteractedKeyRef.current = null;
    onInteractionEnd?.();
  };

  return (
    <div 
      className={`flex flex-1 p-2 overflow-hidden min-h-0 relative select-none ${
        displayMode === 'dark' ? 'bg-[#121212]' : 'bg-[#f8f9fa]'
      }`} 
      id="sleep-grid-root"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      <div className={`w-full flex flex-col border rounded-2xl overflow-hidden shadow-xs shrink-0 select-none relative ${
        displayMode === 'dark' ? 'border-[#49454F] bg-[#1C1B1F] text-[#e3e2e6]' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden select-none relative font-sans">
          
          {/* Scrollable Container */}
          <div 
            ref={containerRef}
            className={`flex-1 overflow-y-auto scrollbar-thin select-none touch-auto ${
              isSleepTab ? 'overflow-x-hidden' : 'overflow-x-auto'
            }`}
            onTouchMove={handleTouchMove}
          >
            <div className={`${isSleepTab ? 'w-full' : 'min-w-max'} flex flex-col divide-y ${
              displayMode === 'dark' ? 'divide-[#49454F] border-[#49454F]' : 'divide-gray-200'
            }`}>
              {/* Header row */}
              <div 
                className={`flex select-none flex-nowrap sticky top-0 z-20 text-center text-xs font-black antialiased ${
                  displayMode === 'dark' 
                    ? 'bg-[#1C1B1F] border-b border-[#49454F] text-[#e6e1e5]' 
                    : 'bg-slate-50 border-b border-gray-200 text-slate-705'
                }`}
              >
                {/* Column 1: Time labels */}
                <button 
                  type="button"
                  onClick={scrollToCurrentTime}
                  title="現在時刻へ自動移動します"
                  className={`sticky left-0 z-30 w-16 min-w-[4rem] ${isSleepTab ? 'h-9' : 'h-24'} flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                    displayMode === 'dark'
                      ? 'bg-[#1C1B1F] border-r border-[#49454F] text-yellow-300'
                      : 'bg-slate-100 border-r border-gray-200 text-black'
                  }`}
                >
                  <div className={`flex items-center justify-center rounded-lg px-1.5 py-1.5 w-[85%] h-[85%] border transition-all shadow-xs ${
                    displayMode === 'dark'
                      ? 'bg-blue-950/40 border-blue-500/30 text-sky-300 hover:bg-blue-950/70 active:bg-blue-900/90 hover:border-blue-400'
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 active:bg-blue-200/80 hover:border-blue-300'
                  }`}>
                    <span 
                      className={`${isSleepTab ? 'text-[13px] font-black' : `${activityColFontWeight} text-[14px] leading-none tracking-tight`}`}
                      style={!isSleepTab ? { writingMode: 'vertical-rl', textOrientation: 'upright' } : undefined}
                    >
                      {isSleepTab ? '時間' : '現在時刻'}
                    </span>
                  </div>
                </button>
                {/* Column 2: Sleep paints */}
                {isSleepTab && (
                  <div 
                    className={`sticky left-16 z-25 ${isSleepTab ? 'h-9' : 'h-24'} flex items-center justify-center shrink-0 select-none text-[14px] sm:text-[15.5px] font-black flex-1 border-r-0 ${
                      displayMode === 'dark'
                        ? 'bg-[#25232A] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-[#49454F] text-[#e6e1e5]'
                        : 'bg-[#e0f2fe] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-gray-200 text-slate-700'
                    }`}
                  >
                    睡眠
                  </div>
                )}

                {/* Columns 3+: Custom activity items */}
                {(() => {
                  const visibleCols: number[] = [];
                  for (let i = 0; i < customColCount; i++) {
                    if (isColVisible(i)) {
                      visibleCols.push(i);
                    }
                  }

                  return !isSleepTab && Array.from({ length: customColCount }).map((_, cIdx) => {
                    if (!isColVisible(cIdx)) return null;
                    const name = customColNames[cIdx] || `列${cIdx + 2}`;
                    
                    const isSortingThis = sortingColIdx === cIdx;
                    const isBlinking = blinkColIdx === cIdx;
                    const hasAnyStamp = Array.from({ length: 48 }).some((_, slotIdx) => {
                      return !!(record.customCols?.[cIdx]?.[slotIdx]);
                    });

                    const visibleIdx = visibleCols.indexOf(cIdx);
                    const isSnapPoint = visibleIdx !== -1 && visibleIdx % pageSize === 0;

                    return (
                      <div
                        key={cIdx}
                        id={`col-header-${cIdx}`}
                        onPointerDown={(e) => handleHeaderPointerDown(e, cIdx)}
                        onPointerMove={handleHeaderPointerMove}
                        onPointerUp={(e) => handleHeaderPointerUp(e, cIdx)}
                        style={{
                          width: `${isSleepTab ? 32 : activityColWidth}px`,
                          minWidth: `${isSleepTab ? 32 : activityColWidth}px`
                        }}
                        className={`h-24 flex items-center justify-center cursor-pointer border-r transition-all select-none text-center shrink-0 relative ${
                          isBlinking
                            ? displayMode === 'dark'
                              ? 'bg-yellow-400 text-slate-950 font-black border-yellow-500 scale-105 shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-400 animate-pulse duration-300'
                              : 'bg-yellow-300 text-slate-900 font-black border-yellow-400 scale-105 shadow-lg shadow-yellow-300/30 ring-2 ring-yellow-300 animate-pulse duration-300'
                            : isSortingThis
                              ? 'bg-blue-600 text-[#e3e2e6]'
                              : displayMode === 'dark'
                                ? hasAnyStamp
                                  ? 'bg-sky-500 hover:bg-sky-600 text-black border-sky-600'
                                  : 'bg-[#1C1B1F] hover:bg-[#25232A] text-sky-300 hover:text-sky-100 border-[#49454F]'
                                : hasAnyStamp
                                  ? 'bg-slate-900 hover:bg-slate-950 text-white border-slate-950'
                                  : 'bg-white hover:bg-slate-100/90 text-slate-650 hover:text-slate-900 border-gray-200'
                        }`}
                      title={`${name} (長押しで並び替え / タップで設定)`}
                    >
                      {isSortingThis ? (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-blue-600 flex flex-col items-center justify-between py-2 px-1 text-[#e3e2e6] animate-in zoom-in-95 duration-150 rounded-lg shadow-2xl border border-blue-400 w-20 h-28">
                          <div className="flex w-full justify-between items-center px-0.5 h-7">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cIdx > 0) {
                                  onSwapCols(cIdx, cIdx - 1);
                                  setSortingColIdx(cIdx - 1);
                                }
                              }}
                              disabled={cIdx === 0}
                              className={`w-6 h-6 flex items-center justify-center rounded bg-white/20 hover:bg-white/35 active:scale-90 transition-all font-bold text-[11px] ${
                                cIdx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title="左に移動"
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSortingColIdx(null);
                                onInteractionEnd?.();
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded bg-emerald-500 hover:bg-emerald-600 active:scale-90 transition-all font-bold text-[11px] cursor-pointer"
                              title="完了"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cIdx < customColCount - 1) {
                                  onSwapCols(cIdx, cIdx + 1);
                                  setSortingColIdx(cIdx + 1);
                                }
                              }}
                              disabled={cIdx === customColCount - 1}
                              className={`w-6 h-6 flex items-center justify-center rounded bg-white/20 hover:bg-white/35 active:scale-90 transition-all font-bold text-[11px] ${
                                cIdx === customColCount - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title="右に移動"
                            >
                              ▶
                            </button>
                          </div>
                          <span 
                            className={`text-[10px] ${activityColFontWeight} truncate max-w-full text-center leading-none tracking-tighter pb-0.5 block`}
                            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                          >
                            {name}
                          </span>
                        </div>
                      ) : (() => {
                        let fontSizeClass = 'text-[18px]';
                        if (!isSleepTab) {
                          if (activityColWidth === 24) {
                            fontSizeClass = 'text-[13px]';
                          } else if (activityColWidth === 28) {
                            fontSizeClass = 'text-[15px]';
                          } else if (activityColWidth === 32) {
                            fontSizeClass = 'text-[18px]';
                          } else if (activityColWidth === 40) {
                            fontSizeClass = 'text-[22px]';
                          } else if (activityColWidth === 48) {
                            fontSizeClass = 'text-[26px]';
                          }
                        }

                        return (
                          <span 
                            className={`${activityColFontWeight} px-0.5 block select-none text-center tracking-tight overflow-hidden whitespace-nowrap max-h-[82px] leading-none ${fontSizeClass}`}
                            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                          >
                            {name}
                          </span>
                        );
                      })()}
                    </div>
                  );
                });
              })()}
              </div>

              {/* Data Rows */}
              {(() => {
                const rowCount = isSleepTab ? 48 : 24;
                return Array.from({ length: rowCount }, (_, rowIdx) => {
                  const slotIdx = rowIdx;
                  const rowIndex = isSleepTab ? Math.floor(rowIdx / 2) : rowIdx;
                  const is30Min = isSleepTab ? rowIdx % 2 !== 0 : false;
                  
                  let displayHourNum = rowIndex;
                  if (hourRep === '1-24') {
                    displayHourNum = rowIndex + 1;
                  }
                  const hourLabel = isSleepTab
                    ? `${String(displayHourNum).padStart(2, '0')}:${is30Min ? '30' : '00'}`
                    : `${String(displayHourNum).padStart(2, '0')}:00`;
                  const isOddHour = rowIndex % 2 !== 0;

                  const sleepVal = isSleepTab ? (record[slotIdx] || null) : null;
                  const sleepStyle = getSymbolStyle(sleepVal, isOddHour);

                  const isRowHighlighted = isNowActive 
                    ? (isSleepTab ? slotIdx === getCurrentTimeSlotIndex() : rowIndex === Math.floor(getCurrentTimeSlotIndex() / 2))
                    : (activeSlotIdx !== null && rowIdx === activeSlotIdx);
                  const highlightColor = displayMode === 'dark' ? '#38bdf8' : '#3b82f6';

                  return (
                    <div 
                      key={rowIdx}
                      className={`flex flex-nowrap h-7 items-stretch select-none transition-all duration-300 ${
                        isRowHighlighted
                          ? (displayMode === 'dark' 
                              ? 'bg-sky-500/10 z-10' 
                              : 'bg-blue-50/20 z-10')
                          : ''
                      }`}
                      id={`hour-row-zoomed-${rowIdx}`}
                    >
                      {/* Time Column (Sticky Left) */}
                      <div 
                        onClick={() => setActiveSlotIdx(rowIdx)}
                        style={isRowHighlighted ? {
                          boxShadow: `inset 2px 2px 0 0 ${highlightColor}, inset 0 -2px 0 0 ${highlightColor}`
                        } : undefined}
                        className={`sticky left-0 z-10 w-16 min-w-[4rem] h-full shrink-0 flex items-center justify-center text-[13px] xs:text-[14px] sm:text-[14.5px] ${isSleepTab ? 'font-black' : activityColFontWeight} font-sans tracking-tight leading-none cursor-pointer ${
                          displayMode === 'dark'
                            ? `border-r border-slate-805 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] text-yellow-400 ${isOddHour ? 'bg-[#13244a]' : 'bg-slate-950'}`
                            : `border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-black ${isOddHour ? 'bg-[#def2cc]' : 'bg-white'}`
                        }`}
                      >
                        {hourLabel}
                      </div>

                      {/* Sleep Column (Sticky Left Paint Area) */}
                      {isSleepTab && (
                        <div
                          data-slot-idx={slotIdx}
                          {...(inputMethod === 'paint' ? {
                            onPointerDown: () => handlePointerDown(slotIdx),
                            onPointerEnter: () => handlePointerEnter(slotIdx),
                            onTouchStart: (e) => {
                              onInteractionStart?.();
                              setIsPointerDown(true);
                              const key = `sleep_${slotIdx}`;
                              lastInteractedKeyRef.current = key;
                              setActiveSlotIdx(slotIdx);
                              onCellTap(slotIdx);
                            },
                            onTouchMove: (e) => {
                              if (e.cancelable) e.preventDefault();
                            },
                            onTouchEnd: () => {
                              handlePointerUp();
                            }
                          } : {
                            onPointerDown: (e) => handlePointerDownAction(e, slotIdx),
                            onTouchStart: handleCellTouchStart,
                            onTouchMove: handleCellTouchMove,
                            onTouchEnd: (e) => handleCellTouchEnd(e, slotIdx)
                          })}
                          style={{
                            ...sleepStyle.style,
                            ...(isRowHighlighted ? {
                              boxShadow: `inset 0 2px 0 0 ${highlightColor}, inset 0 -2px 0 0 ${highlightColor}`
                            } : {})
                          }}
                          className={`sticky left-16 z-10 h-full shrink-0 flex items-center justify-center cursor-pointer transition-colors duration-105 select-none ${
                            inputMethod === 'paint' ? 'touch-none' : 'touch-auto'
                          } flex-1 border-r-0 ${
                            displayMode === 'dark'
                              ? 'border-slate-805 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]'
                              : 'border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                          } ${sleepStyle.bgColor}`}
                        >
                          {sleepStyle.label ? (
                            <span className={`${sleepStyle.textColor} ${sleepStyle.textClass} font-black select-none leading-none text-center block w-full truncate px-4`} style={sleepStyle.style}>
                              {sleepStyle.label}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold select-none opacity-0 hover:opacity-40 transition-opacity ${
                              displayMode === 'dark' ? 'text-slate-750' : 'text-gray-300'
                            }`}>
                              +
                            </span>
                          )}
                        </div>
                      )}

                      {/* Columns 3+: Custom activities checklists */}
                      {!isSleepTab && Array.from({ length: customColCount }).map((_, cIdx) => {
                        if (!isColVisible(cIdx)) return null;
                        const val0 = record.customCols?.[cIdx]?.[rowIndex * 2] || null;
                        const val1 = record.customCols?.[cIdx]?.[rowIndex * 2 + 1] || null;
                        const customVal = val0 || val1;
                        const customStyle = getCustomColStyle(customVal, cIdx, isOddHour);
                        
                        const colWidth = isSleepTab ? 32 : activityColWidth;
                        const combinedStyle = {
                          ...(customStyle.style || {}),
                          width: `${colWidth}px`,
                          minWidth: `${colWidth}px`,
                          ...(isRowHighlighted ? {
                            boxShadow: cIdx === customColCount - 1
                              ? `inset 0 2px 0 0 ${highlightColor}, inset 0 -2px 0 0 ${highlightColor}, inset -2px 0 0 0 ${highlightColor}`
                              : `inset 0 2px 0 0 ${highlightColor}, inset 0 -2px 0 0 ${highlightColor}`
                          } : {})
                        };
                        
                        return (
                          <div
                            key={cIdx}
                            data-slot-idx={rowIdx}
                            data-col-idx={cIdx}
                            onPointerDown={(e) => handlePointerDownAction(e, rowIdx, cIdx)}
                            onTouchStart={handleCellTouchStart}
                            onTouchMove={handleCellTouchMove}
                            onTouchEnd={(e) => handleCellTouchEnd(e, rowIdx, cIdx)}
                            style={combinedStyle}
                            className={`h-full flex items-center justify-center cursor-pointer border-r shrink-0 transition-colors duration-105 select-none touch-auto ${
                              displayMode === 'dark' ? 'border-slate-805' : 'border-gray-200'
                            } ${customStyle.bgColor}`}
                          >
                            {customStyle.label ? (
                              <span className={`${customStyle.textColor} ${customStyle.textClass}`} style={customStyle.style}>
                                {customStyle.label}
                              </span>
                            ) : (
                              <span className={`text-[9px] font-bold select-none opacity-0 hover:opacity-35 transition-opacity ${
                                displayMode === 'dark' ? 'text-slate-800' : 'text-gray-200'
                              }`}>
                                .
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED CUSTOM ACTIVITY COLUMN CONFIGURATION DIALOG OVERLAY */}
      {editingColIdx !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[150] p-4 font-sans border-none outline-hidden">
          <div className={`rounded-2xl w-full max-w-sm shadow-2xl p-5 border animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto shadow-black/80 ${displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F] text-[#E6E1E5]' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-sm font-black ${displayMode === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {isDeleteConfirm ? '⚠️ 記録項目の削除確認' : `記録項目「${customColNames[editingColIdx] || `列${editingColIdx + 2}`}」の設定`}
              </h3>
              <button 
                onClick={() => {
                  setEditingColIdx(null);
                  setIsDeleteConfirm(false);
                }}
                className={`p-1 rounded-full transition-colors ${
                  displayMode === 'dark' 
                    ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' 
                    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                }`}
                title="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDeleteConfirm ? (
              <div className="py-2 flex flex-col items-center text-center font-sans">
                <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-3.5 animate-pulse">
                  <Trash2 className="w-6 h-6 stroke-[2] text-rose-500" />
                </div>
                <h4 className={`text-sm font-black mb-2 ${displayMode === 'dark' ? 'text-rose-405' : 'text-rose-600'}`}>
                  項目「{customColNames[editingColIdx] || `列${editingColIdx + 2}`}」を完全に削除しますか？
                </h4>
                <p className={`text-[12px] leading-relaxed mb-6 max-w-[280px] ${displayMode === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  <strong>【重要・警告】</strong><br />
                  列を削除すると、これまでの全期間に記録されたこの項目のデータも全て完全に消去されます。この操作は絶対に元に戻せません。
                </p>
                <div className="flex gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirm(false)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer active:scale-98 transition-transform ${
                      displayMode === 'dark'
                        ? 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    戻る（キャンセル）
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteCol) {
                        onDeleteCol(editingColIdx);
                      }
                      setEditingColIdx(null);
                      setIsDeleteConfirm(false);
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-[#e3e2e6] font-extrabold text-xs py-2 px-3 rounded-lg shadow-sm transition-all cursor-pointer active:scale-98"
                  >
                    はい、データを消して削除
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* B. Custom Entry Input */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                    自由に名前を入力 (最大8文字まで)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="トイレ"
                    id="custom-col-name-input"
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-black focus:outline-hidden focus:border-blue-500 border-slate-300 bg-white text-black placeholder:text-slate-400"
                  />
                </div>

                {/* Custom Category Selection */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                    カテゴリー分類
                  </label>
                  <select
                    value={typedCategory}
                    onChange={(e) => setTypedCategory(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs font-black focus:outline-hidden focus:border-blue-500 border-slate-300 bg-white text-black cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* C. Position Swap (Order preservation) */}
                <div className={`border-t pt-3.5 mb-4 ${
                  displayMode === 'dark' ? 'border-slate-800' : 'border-slate-150'
                }`}>
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">
                    表示順を並び替え（過去の記録も一緒に移動します）
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={editingColIdx === 0}
                      onClick={() => {
                        onSwapCols(editingColIdx!, editingColIdx! - 1);
                        setEditingColIdx(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                        editingColIdx === 0
                          ? displayMode === 'dark'
                            ? 'bg-slate-850 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                            : 'bg-slate-50 border-slate-150 text-slate-300 cursor-not-allowed opacity-50'
                          : displayMode === 'dark'
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-250 active:scale-95 cursor-pointer'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-95 cursor-pointer'
                      }`}
                    >
                      ◀ 左へ移動
                    </button>
                    <button
                      type="button"
                      disabled={editingColIdx === customColCount - 1}
                      onClick={() => {
                        onSwapCols(editingColIdx!, editingColIdx! + 1);
                        setEditingColIdx(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                        editingColIdx === customColCount - 1
                          ? displayMode === 'dark'
                            ? 'bg-slate-850 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                            : 'bg-slate-50 border-slate-150 text-slate-305 cursor-not-allowed opacity-50'
                          : displayMode === 'dark'
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-250 active:scale-95 cursor-pointer'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-95 cursor-pointer'
                      }`}
                    >
                      右へ移動 ▶
                    </button>
                  </div>
                </div>

                {/* D. Data Action Radio Buttons (Inherit v Reset v Backup/Archive column) */}
                <div className={`border-t pt-3.5 mb-4 font-sans ${
                  displayMode === 'dark' ? 'border-slate-800' : 'border-slate-150'
                }`}>
                  <label className="text-[10px] font-bold text-slate-405 block mb-2 uppercase tracking-wide text-left">
                    名前変更時のこれまでのデータの扱い
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      dataAction === 'keep' 
                        ? 'border-blue-400 bg-blue-50/20' 
                        : displayMode === 'dark'
                          ? 'border-slate-800 hover:bg-slate-800/40 text-slate-300'
                          : 'border-slate-200 hover:bg-slate-50/60'
                    }`}>
                      <input
                        type="radio"
                        name="data-action"
                        checked={dataAction === 'keep'}
                        onChange={() => setDataAction('keep')}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="text-left">
                        <div className={`text-xs font-black leading-tight ${displayMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>データを引き継ぐ</div>
                        <div className={`text-[9px] mt-0.5 leading-tight ${displayMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          現在の位置のまま、これまでの記録を全て新しい名前に引き継ぎます。
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      dataAction === 'clear' 
                        ? 'border-rose-450 bg-rose-50/10' 
                        : displayMode === 'dark'
                          ? 'border-slate-800 hover:bg-slate-800/40 text-slate-305'
                          : 'border-slate-200 hover:bg-slate-50/60'
                    }`}>
                      <input
                        type="radio"
                        name="data-action"
                        checked={dataAction === 'clear'}
                        onChange={() => setDataAction('clear')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="text-left">
                        <div className={`text-xs font-black leading-tight ${displayMode === 'dark' ? 'text-rose-400' : 'text-slate-800'}`}>データをクリアする</div>
                        <div className={`text-[9px] mt-0.5 leading-tight ${displayMode === 'dark' ? 'text-rose-400/80' : 'text-rose-500'}`}>
                          これまでのこの列のチェック記録をすべて完全に消去して、真っさらにします。
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                      dataAction === 'archive' 
                        ? 'border-teal-400 bg-teal-50/15' 
                        : displayMode === 'dark'
                          ? 'border-slate-800 hover:bg-slate-800/40 text-slate-305'
                          : 'border-slate-200 hover:bg-slate-50/60'
                    }`}>
                      <input
                        type="radio"
                        name="data-action"
                        checked={dataAction === 'archive'}
                        onChange={() => setDataAction('archive')}
                        className="mt-0.5 text-teal-650 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <div className="text-left">
                        <div className={`text-xs font-black leading-tight ${displayMode === 'dark' ? 'text-teal-400' : 'text-slate-800'}`}>新しい列に退避して残す</div>
                        <div className={`text-[9px] mt-0.5 leading-tight ${displayMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          これまでのデータを「(古い名前)」という別列として末尾に退避させ、この列は新記録用に空にします。
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* E. Action Buttons */}
                <div className={`flex gap-2 justify-between border-t pt-3.5 ${
                  displayMode === 'dark' ? 'border-slate-800' : 'border-slate-150'
                }`}>
                  {onDeleteCol && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirm(true)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 active:scale-95 transition-transform ${
                        displayMode === 'dark'
                          ? 'border-rose-950/40 text-rose-450 hover:bg-rose-950/60'
                          : 'border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      列を削除
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingColIdx(null);
                        setIsDeleteConfirm(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                        displayMode === 'dark'
                          ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const finalName = typedName.trim() || `列${editingColIdx! + 2}`;
                        onUpdateColConfig(editingColIdx!, finalName.slice(0, 8), dataAction, typedCategory);
                        setEditingColIdx(null);
                        setIsDeleteConfirm(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-[#e3e2e6] font-extrabold text-xs py-1.5 px-4 rounded-lg shadow-sm active:shadow-none hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      適 用
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
