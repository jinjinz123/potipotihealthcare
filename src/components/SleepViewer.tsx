import React, { useState } from 'react';
import { DailyRecords, DayRecord, SleepSymbol, HourRepresentation, StampConfig, MentalRow } from '../types';
import { 
  createBlankRecord, 
  calculateSleepStats, 
  calculateOnsetLatency,
  getLocalDateString,
  shiftDateString
} from '../utils';
import { 
  Droplet, 
  MapPin, 
  Utensils, 
  Bath, 
  Pill, 
  Smile, 
  Activity, 
  MessageSquare,
  Folder 
} from 'lucide-react';
import BipolarReport from './BipolarReport';
import BipolarPdfReport from './BipolarPdfReport';

interface SleepViewerProps {
  records: DailyRecords;
  actualSleepRecords: DailyRecords;
  onSelectDate: (dateStr: string) => void;
  hourRep: HourRepresentation;
  stamps: StampConfig[];
  actualSleepStamps: StampConfig[];
  displayMode?: 'vivid' | 'soft' | 'dark';
  customColCount: number;
  customColNames: string[];
  selectedDate: string;
  setSelectedDate: (dateStr: string) => void;
  categories: string[];
  customColCategories: string[];
  mentalRows?: MentalRow[];
  mentalRecords?: DailyRecords;
  chartScaleFactor?: number;
  showToast?: (msg: string) => void;
}

const isDefaultColName = (name: string): boolean => {
  return /^列\d+$/.test(name.trim());
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplet,
  MapPin,
  Utensils,
  Bath,
  Pill,
  Smile,
  Activity,
  MessageSquare,
  Folder
};

// Count checked slots (events) in a given custom column for a daily record
function countActiveSlots(record: DayRecord, colIdx: number): number {
  if (!record.customCols || !record.customCols[colIdx]) return 0;
  let count = 0;
  const colObj = record.customCols[colIdx];
  for (let s = 0; s < 48; s++) {
    if (colObj[s]) {
      count++;
    }
  }
  return count;
}

// Calculate the number of calendar days since the previous check for a custom column
function getDaysSinceLastCheck(
  targetDateStr: string,
  colIdx: number,
  records: DailyRecords
): { label: string; isZero: boolean; isNoRecord: boolean } {
  const targetDate = new Date(targetDateStr);
  if (isNaN(targetDate.getTime())) {
    return { label: '記録なし', isZero: false, isNoRecord: true };
  }

  let foundDateStr: string | null = null;

  // Search backwards for up to 365 days starting from today (0 days before)
  for (let i = 0; i <= 365; i++) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() - i);
    const prevStr = getLocalDateString(d);
    const record = records[prevStr];
    if (record && record.customCols && record.customCols[colIdx]) {
      let hasCheck = false;
      const colObj = record.customCols[colIdx];
      for (let s = 0; s < 48; s++) {
        if (colObj[s]) {
          hasCheck = true;
          break;
        }
      }
      if (hasCheck) {
        foundDateStr = prevStr;
        break;
      }
    }
  }

  if (!foundDateStr) {
    return { label: '記録なし', isZero: false, isNoRecord: true };
  }

  const foundDate = new Date(foundDateStr);
  const d1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const d2 = new Date(foundDate.getFullYear(), foundDate.getMonth(), foundDate.getDate());
  
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: '当日', isZero: true, isNoRecord: false };
  }
  return { label: `${diffDays}日前`, isZero: false, isNoRecord: false };
}

// Map custom column names to appropriate Lucide icons and colors matching the mockup
function getCustomColVisuals(name: string) {
  const norm = name.toLowerCase().trim();
  
  if (norm.includes('トイレ') || norm.includes('排泄') || norm.includes('排便') || norm.includes('便') || norm.includes('尿')) {
    return {
      icon: 'Droplet',
      iconColor: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-150',
    };
  }
  if (norm.includes('外出') || norm.includes('散歩') || norm.includes('お出かけ') || norm.includes('出社') || norm.includes('登校') || norm.includes('外')) {
    return {
      icon: 'MapPin',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-150',
    };
  }
  if (norm.includes('食事') || norm.includes('朝食') || norm.includes('昼食') || norm.includes('夕食') || norm.includes('飯') || norm.includes('ご飯')) {
    return {
      icon: 'Utensils',
      iconColor: 'text-orange-500 dark:text-orange-400',
      bgColor: 'bg-orange-50/70',
      borderColor: 'border-orange-150',
    };
  }
  if (norm.includes('入浴') || norm.includes('風呂') || norm.includes('シャワー') || norm.includes('湯')) {
    return {
      icon: 'Bath',
      iconColor: 'text-purple-500 dark:text-purple-400',
      bgColor: 'bg-purple-50/70',
      borderColor: 'border-purple-150',
    };
  }
  if (norm.includes('薬') || norm.includes('服薬') || norm.includes('サプリ') || norm.includes('頓服')) {
    return {
      icon: 'Pill',
      iconColor: 'text-rose-500 dark:text-rose-400',
      bgColor: 'bg-rose-50/70',
      borderColor: 'border-rose-150',
    };
  }
  if (norm.includes('洗顔') || norm.includes('歯磨き') || norm.includes('はみがき') || norm.includes('洗顔・歯磨き')) {
    return {
      icon: 'Smile',
      iconColor: 'text-cyan-500 dark:text-cyan-400',
      bgColor: 'bg-cyan-50/70',
      borderColor: 'border-cyan-150',
    };
  }
  if (norm.includes('運動') || norm.includes('ストレッチ') || norm.includes('ジム') || norm.includes('筋トレ') || norm.includes('ワークアウト') || norm.includes('ヨガ')) {
    return {
      icon: 'Activity',
      iconColor: 'text-red-500 dark:text-red-400',
      bgColor: 'bg-red-50/70',
      borderColor: 'border-red-150',
    };
  }
  
  // Default fallback for other custom columns
  return {
    icon: 'MessageSquare',
    iconColor: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-50/80',
    borderColor: 'border-slate-150',
  };
}

// Format date to local Japanese format. Simple M/D(W) formatting for maximum space / legibility.
function formatViewerDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  const dayName = daysOfWeek[date.getDay()];
  return `${month}/${day}(${dayName})`;
}

// Convert sleep onset latency text into a short, space-saving format (e.g. 1.5時間 -> 1.5h, 30分 -> 30m)
function formatLatencyShort(record: DayRecord, stamps: StampConfig[]): string {
  const latency = calculateOnsetLatency(record, stamps);
  if (!latency || latency === '－') return '－';
  return latency.replace('時間', 'h').replace('分', 'm');
}

export default function SleepViewer({ 
  records, 
  actualSleepRecords,
  onSelectDate, 
  hourRep, 
  stamps, 
  actualSleepStamps,
  displayMode = 'vivid',
  customColCount,
  customColNames,
  selectedDate,
  setSelectedDate,
  categories,
  customColCategories,
  mentalRows,
  mentalRecords,
  chartScaleFactor,
  showToast
}: SleepViewerProps) {
  // Use persistent viewMode (defaults to month)
  const [viewMode, setViewMode] = useState<'week' | 'month'>(() => {
    const saved = localStorage.getItem('viewer_view_mode');
    return (saved === 'week' || saved === 'month') ? saved : 'month';
  });

  const [activeTab, setActiveTab] = useState<'all' | 'sleep' | 'activity' | 'summary' | 'report'>(() => {
    const saved = localStorage.getItem('viewer_active_tab');
    return (saved === 'all' || saved === 'sleep' || saved === 'activity' || saved === 'summary' || saved === 'report') ? saved : 'all';
  });

  const [bipolarPdfPreview, setBipolarPdfPreview] = useState<boolean>(false);

  const handleSetActiveTab = (tab: 'all' | 'sleep' | 'activity' | 'summary' | 'report') => {
    setActiveTab(tab);
    localStorage.setItem('viewer_active_tab', tab);
    setBipolarPdfPreview(false);
  };

  const handleSetViewMode = (mode: 'week' | 'month') => {
    setViewMode(mode);
    localStorage.setItem('viewer_view_mode', mode);
  };

  const isMonth = viewMode === 'month';

  // Generate date list spanning the last 7 or 30 days depending on the selected mode
  const getDatesToDisplay = () => {
    const dates = new Set<string>();
    const baseDate = new Date();
    
    // Cap maxDate at baseDate (today) so that future dates (tomorrow, etc.) are never displayed
    const maxDate = baseDate;

    const count = isMonth ? 30 : 7;
    for (let i = 0; i < count; i++) {
      const d = new Date(maxDate);
      d.setDate(maxDate.getDate() - i);
      dates.add(getLocalDateString(d));
    }
    
    // Sort descending (newest date at the top)
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  };

  const datesToDisplay = getDatesToDisplay();
  const hourIndices = Array.from({ length: 24 }, (_, i) => i);

  // Compact marker indicator labels over the 24-hour visual bar column
  const getHourLabel = (i: number) => {
    let hr = i;
    if (hourRep === '1-24') {
      hr = i + 1;
    }
    
    if (hourRep === '1-24') {
      if (hr === 1 || hr === 6 || hr === 12 || hr === 18 || hr === 24) return hr;
    } else {
      if (hr === 0 || hr === 6 || hr === 12 || hr === 18 || hr === 23) return hr;
    }
    return '';
  };

  // Convert Sleep Records symbols to micro viewer color blocks
  const getViewerColor = (symbol: SleepSymbol) => {
    if (!symbol) return displayMode === 'dark' ? 'bg-[#1C1B1F]/80' : 'bg-slate-100';
    const stamp = actualSleepStamps.find(s => s.id === symbol || s.symbol === symbol);
    if (stamp) {
      switch (stamp.color) {
        case 'purple': return 'bg-purple-500';
        case 'sky': return 'bg-sky-400';
        case 'orange': return 'bg-orange-500';
        case 'yellow': return 'bg-yellow-400';
        case 'green': return 'bg-green-500';
        case 'pink': return 'bg-pink-500';
        case 'indigo': return 'bg-indigo-500';
        case 'teal': return 'bg-teal-500';
        case 'rose': return 'bg-rose-500';
        case 'slate': return 'bg-slate-500';
        default: return 'bg-purple-500';
      }
    }
    return displayMode === 'dark' ? 'bg-[#1C1B1F]/80' : 'bg-slate-100';
  };

  return (
    <div className={`flex flex-col flex-1 border rounded-2xl overflow-hidden shadow-xs shrink-0 select-none h-full ${
      displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F] text-[#E6E1E5]' : 'bg-white border-gray-200 text-slate-800'
    }`} id="sleep-viewer-root">
      
      {/* 1. Header: Table title & Dynamic display mode toggles */}
      <div className={`flex flex-col xs:flex-row xs:items-center justify-between px-3 py-1.5 gap-2 border-b shrink-0 select-none ${
        displayMode === 'dark' ? 'bg-[#25232A]/90 border-[#49454F] text-yellow-400' : 'bg-slate-50/90 border-slate-200/50 text-slate-800'
      }`} id="viewer-top-selector-bar">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap py-0.5" id="viewer-tab-buttons-container">
          <button
            type="button"
            onClick={() => handleSetActiveTab('all')}
            className={`px-3 py-0.5 text-[10px] sm:text-[11.5px] font-black tracking-tight rounded-full transition-all duration-200 active:scale-95 outline-none cursor-pointer ${
              activeTab === 'all'
                ? displayMode === 'dark'
                  ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#25232A] shadow-[0_0_8px_rgba(250,204,21,0.5)] font-black'
                  : 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 ring-offset-white shadow-sm font-black'
                : displayMode === 'dark'
                  ? 'bg-[#1C1B1F] text-[#CAC4D0] border border-[#49454F] hover:bg-[#25232A]'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            aria-label="すべて表示に切り替え"
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => handleSetActiveTab('sleep')}
            className={`px-3 py-0.5 text-[10px] sm:text-[11.5px] font-black tracking-tight rounded-full transition-all duration-200 active:scale-95 outline-none cursor-pointer ${
              activeTab === 'sleep'
                ? displayMode === 'dark'
                  ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#25232A] shadow-[0_0_8px_rgba(250,204,21,0.5)] font-black'
                  : 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 ring-offset-white shadow-sm font-black'
                : displayMode === 'dark'
                  ? 'bg-[#1C1B1F] text-[#CAC4D0] border border-[#49454F] hover:bg-[#25232A]'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            aria-label="睡眠表示に切り替え"
          >
            睡眠
          </button>
          <button
            type="button"
            onClick={() => handleSetActiveTab('activity')}
            className={`px-3 py-0.5 text-[10px] sm:text-[11.5px] font-black tracking-tight rounded-full transition-all duration-200 active:scale-95 outline-none cursor-pointer ${
              activeTab === 'activity'
                ? displayMode === 'dark'
                  ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#25232A] shadow-[0_0_8px_rgba(250,204,21,0.5)] font-black'
                  : 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 ring-offset-white shadow-sm font-black'
                : displayMode === 'dark'
                  ? 'bg-[#1C1B1F] text-[#CAC4D0] border border-[#49454F] hover:bg-[#25232A]'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            aria-label="活動表示に切り替え"
          >
            活動
          </button>
          <button
            type="button"
            onClick={() => handleSetActiveTab('summary')}
            className={`px-3 py-0.5 text-[10px] sm:text-[11.5px] font-black tracking-tight rounded-full transition-all duration-200 active:scale-95 outline-none cursor-pointer ${
              activeTab === 'summary'
                ? displayMode === 'dark'
                  ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#25232A] shadow-[0_0_8px_rgba(250,204,21,0.5)] font-black'
                  : 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 ring-offset-white shadow-sm font-black'
                : displayMode === 'dark'
                  ? 'bg-[#1C1B1F] text-[#CAC4D0] border border-[#49454F] hover:bg-[#25232A]'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            aria-label="サマリー表示に切り替え"
          >
            サマリー
          </button>
          <button
            type="button"
            onClick={() => handleSetActiveTab('report')}
            className={`px-3 py-0.5 text-[10px] sm:text-[11.5px] font-black tracking-tight rounded-full transition-all duration-200 active:scale-95 outline-none cursor-pointer ${
              activeTab === 'report'
                ? displayMode === 'dark'
                  ? 'bg-yellow-400 text-slate-950 ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#25232A] shadow-[0_0_8px_rgba(250,204,21,0.5)] font-black'
                  : 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1 ring-offset-white shadow-sm font-black'
                : displayMode === 'dark'
                  ? 'bg-[#1C1B1F] text-[#CAC4D0] border border-[#49454F] hover:bg-[#25232A]'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
            aria-label="レポート表示に切り替え"
          >
            レポート
          </button>
        </div>
        {activeTab !== 'summary' && activeTab !== 'report' && (
          <div className={`flex items-center rounded-md p-0.5 border ${
            displayMode === 'dark' ? 'bg-[#121212] border-[#49454F]' : 'bg-slate-100 border-slate-200/30'
          }`}>
            <button 
              type="button"
              onClick={() => handleSetViewMode('week')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-sm cursor-pointer transition-all duration-150 ${
                !isMonth 
                  ? (displayMode === 'dark' ? 'bg-slate-800 text-sky-300 shadow-xs font-black' : 'bg-white text-blue-600 shadow-xs font-black')
                  : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              一週間 (7日)
            </button>
            <button 
              type="button"
              onClick={() => handleSetViewMode('month')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded-sm cursor-pointer transition-all duration-150 ${
                isMonth 
                  ? (displayMode === 'dark' ? 'bg-slate-800 text-sky-300 shadow-xs font-black' : 'bg-white text-blue-600 shadow-xs font-black')
                  : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
              }`}
            >
              一か月 (30日)
            </button>
          </div>
        )}
      </div>

      {/* 2. Summary Date Navigator (Shown ONLY for Summary Mode) */}
      {activeTab === 'summary' && (
        <div className={`flex items-center justify-center gap-6 py-2.5 border-b shrink-0 select-none ${
          displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-slate-50 border-slate-200/50'
        }`} id="summary-date-navigator">
          <button 
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
            className={`p-1.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-sky-400 cursor-pointer`}
            aria-label="前日へ移動"
          >
            <span className="text-base font-black">◀</span>
          </button>
          <span 
            onClick={() => setSelectedDate(getLocalDateString(new Date()))}
            className={`text-[13.5px] sm:text-[15px] font-black tracking-wide cursor-pointer hover:opacity-90 px-3.5 py-1.5 rounded-full transition-all active:scale-95 select-none shadow-xs ${
              displayMode === 'dark' ? 'bg-[#25232A] border border-[#49454F] text-[#e3e2e6]' : 'bg-[#1A2F4C] text-white'
            }`}
            title="今日の日付へ移動"
          >
            {(() => {
              const d = new Date(selectedDate);
              if (isNaN(d.getTime())) return selectedDate;
              const year = d.getFullYear();
              const month = d.getMonth() + 1;
              const date = d.getDate();
              const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
              const dayName = daysOfWeek[d.getDay()];
              return `${year}年${month}月${date}日(${dayName})`;
            })()}
          </span>
          <button 
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
            className={`p-1.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-sky-400 cursor-pointer`}
            aria-label="翌日へ移動"
          >
            <span className="text-base font-black">▶</span>
          </button>
        </div>
      )}

      {/* 2. Grid Columns subtitle indicators mapping */}
      {activeTab !== 'summary' && activeTab !== 'report' && (
        <div 
          className={`${isMonth ? 'grid grid-cols-[66px_1fr] h-7 text-[10px]' : 'grid grid-cols-[74px_1fr] h-8 text-[11px]'} ${displayMode === 'dark' ? 'bg-slate-900 border-b-slate-800 text-sky-300' : 'bg-slate-100/70 border-b-gray-200 text-slate-700'} border-b select-none text-center font-black items-center justify-items-stretch`}
          id="viewer-header"
        >
          <div className={`text-left pl-1.5 font-black text-[11.5px] sm:text-[13px] ${displayMode === 'dark' ? 'text-yellow-400' : 'text-black'}`}>日付</div>
          
          {/* Timeline top headers */}
          {activeTab !== 'activity' ? (
            <div className="grid grid-cols-24 h-full items-center px-1" id="viewer-header-timeline">
              {hourIndices.map((i) => (
                <div key={i} className={`${isMonth ? 'text-[7.5px]' : 'text-[9px]'} font-extrabold text-center select-none font-mono ${
                  displayMode === 'dark' ? 'text-yellow-400 font-bold' : 'text-slate-400'
                }`}>
                  {getHourLabel(i)}
                </div>
              ))}
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* 3. Scrollable Body: Table records for each date */}
      <div 
        className={`flex-1 overflow-y-auto select-none touch-pan-y animate-fade-in ${
          activeTab === 'summary' || activeTab === 'report'
            ? displayMode === 'dark' ? 'bg-[#121212]' : 'bg-slate-50'
            : 'divide-y divide-gray-200 dark:divide-slate-800'
        }`}
        id="viewer-rows-container"
      >
        {activeTab === 'report' ? (
          bipolarPdfPreview ? (
            <BipolarPdfReport 
              displayMode={displayMode} 
              mentalRows={mentalRows} 
              mentalRecords={mentalRecords} 
              selectedDate={selectedDate}
              chartScaleFactor={chartScaleFactor}
              showToast={showToast}
              onBack={() => setBipolarPdfPreview(false)}
            />
          ) : (
            <BipolarReport 
              displayMode={displayMode} 
              mentalRows={mentalRows} 
              mentalRecords={mentalRecords} 
              selectedDate={selectedDate}
              chartScaleFactor={chartScaleFactor}
              showToast={showToast}
              onOpenPdfPreview={() => setBipolarPdfPreview(true)}
            />
          )
        ) : activeTab === 'summary' ? (
          <div className="p-4 space-y-6" id="summary-content">
            {categories.map((cat) => {
              // "すべて" のタグは除外
              if (cat === 'すべて') return null;

              // このカテゴリに紐づいた記録項目（カスタムカラム）を抽出、デフォルト名は除外
              const associatedCols = Array.from({ length: customColCount })
                .map((_, cIdx) => {
                  const colName = customColNames[cIdx] || `列${cIdx + 2}`;
                  const colCat = customColCategories[cIdx] || 'その他';
                  return { cIdx, colName, colCat };
                })
                .filter(col => col.colCat === cat && !isDefaultColName(col.colName));

              // 紐づく項目が一つもなければ、表示しない
              if (associatedCols.length === 0) return null;

              const getCategoryIcon = (category: string) => {
                switch (category) {
                  case '衛生':
                    return '🛀';
                  case '食事':
                    return '🍚';
                  case '病気':
                    return '🤒';
                  case '外出':
                    return '🚗';
                  case '掃除':
                    return '🧹';
                  case 'その他':
                    return '🏷️';
                  default:
                    if (category.includes('衛生') || category.includes('風呂') || category.includes('健康') || category.includes('清潔')) return '🛀';
                    if (category.includes('食') || category.includes('飲')) return '🍚';
                    if (category.includes('病') || category.includes('薬') || category.includes('医')) return '🤒';
                    if (category.includes('外') || category.includes('行') || category.includes('散歩')) return '🚗';
                    if (category.includes('掃') || category.includes('片') || category.includes('クリーン')) return '🧹';
                    if (category.includes('運動') || category.includes('スポーツ') || category.includes('ジム')) return '🏃';
                    if (category.includes('仕事') || category.includes('勉強') || category.includes('作業')) return '💻';
                    if (category.includes('睡眠') || category.includes('夢')) return '😴';
                    if (category.includes('趣味') || category.includes('ゲーム') || category.includes('読書')) return '🎮';
                    return '🏷️';
                }
              };

              return (
                <div key={cat} className="space-y-3" id={`summary-category-${cat}`}>
                  {/* カテゴリヘッダー（背景がダークネイビー、薄いグレー文字） */}
                  <div className="bg-[#1A2F4C] px-3.5 py-1.5 rounded flex items-center gap-2 shadow-xs">
                    <span className="text-base select-none" role="img" aria-label={cat}>
                      {getCategoryIcon(cat)}
                    </span>
                    <span className="text-[#e3e2e6] font-extrabold text-[14.5px] tracking-wide">
                      {cat}
                    </span>
                  </div>

                  {/* 記録項目の並び（4列のグリッドで折り返し、画面に収める） */}
                  <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-1" id={`summary-cols-${cat}`}>
                    {associatedCols.map(({ cIdx, colName }) => {
                      const dayRecord = records[selectedDate] || createBlankRecord();
                      const colObj = dayRecord.customCols?.[cIdx] || {};

                      // 当日チェックされた時刻（複数）の抽出
                      const times: string[] = [];
                      for (let h = 0; h < 24; h++) {
                        const s0 = h * 2;
                        const s1 = h * 2 + 1;
                        if (colObj[s0] || colObj[s1]) {
                          times.push(`${h}:00`);
                        }
                      }

                      // 「何日前」の計算
                      const daysSinceInfo = getDaysSinceLastCheck(selectedDate, cIdx, records);
                      const daysLabel = daysSinceInfo.isNoRecord ? '記録なし' : daysSinceInfo.label;

                      return (
                        <div 
                          key={cIdx} 
                          className="flex flex-col items-start text-left min-w-0"
                          id={`summary-item-${cIdx}`}
                        >
                          {/* 項目名 */}
                          <span className={`text-[12px] xs:text-[13px] sm:text-[14px] font-black tracking-tight truncate w-full ${
                            displayMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                          }`}>
                            {colName}
                          </span>

                          {/* 何日前 */}
                          <span className="text-[#ff7a00] text-[10.5px] sm:text-[11.5px] font-black leading-none mt-0.5">
                            {daysLabel}
                          </span>

                          {/* 記録時刻（縦並び） */}
                          {times.map((t, tIdx) => (
                            <span 
                              key={tIdx} 
                              className={`text-[10.5px] sm:text-[11.5px] font-black font-mono leading-none mt-1 ${
                                displayMode === 'dark' ? 'text-[#E4FF00]' : 'text-blue-700 bg-blue-50 px-1 rounded-xs border border-blue-100'
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          datesToDisplay.map((dateStr) => {
            const actRecord = records[dateStr] || createBlankRecord();
            const sleepRecord = actualSleepRecords[dateStr] || createBlankRecord();
            const stats = calculateSleepStats(sleepRecord, actualSleepStamps);
            const latencyShort = formatLatencyShort(sleepRecord, actualSleepStamps);
            const dateLabelFormatted = formatViewerDateLabel(dateStr);

            // 文字は真っ黒、ダークモードは黄色
            const dayClass = displayMode === 'dark' ? 'text-yellow-400' : 'text-black';

            // Format Awakening Duration
            const wakeHours = stats.wakeupCount * 0.5;
            const wakeLabel = wakeHours === 0.5 ? '30m' : wakeHours > 0 ? `${wakeHours}h` : '－';

            // Grid class representing standard columns columns (used for Row 1 and Row 2)
            const gridClass = isMonth 
              ? 'grid grid-cols-[74px_1fr] items-stretch divide-x'
              : 'grid grid-cols-[86px_1fr] items-stretch divide-x';

            // Font and sizing classes matching standards
            const dateFontClass = isMonth 
              ? `text-[12.5px] xs:text-[13.5px] pl-1 font-black tracking-tighter ${displayMode === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50/30'}`
              : `text-[14px] xs:text-[15.5px] pl-1 sm:pl-1.5 font-black tracking-tighter ${displayMode === 'dark' ? 'bg-slate-900/40' : 'bg-slate-50/40'}`;

            const statsFontClass = isMonth
              ? `text-[9px] font-black font-mono ${displayMode === 'dark' ? 'text-sky-300' : 'text-slate-600'}`
              : `text-[10px] sm:text-[11px] font-black font-mono ${displayMode === 'dark' ? 'text-sky-300' : 'text-slate-700'}`;

            const gridPaddingClass = isMonth
              ? `grid grid-cols-24 h-full items-stretch py-1 px-[2px] ${displayMode === 'dark' ? 'bg-slate-950/25' : 'bg-white/70'}`
              : `grid grid-cols-24 h-full items-stretch py-1.5 px-1 ${displayMode === 'dark' ? 'bg-slate-950/25' : 'bg-white/70'}`;

            // Extract only active items that have 1 or more checked slots today (consolidated to hourly slot per user request)
            const activeLifeItems = Array.from({ length: customColCount })
              .map((_, cIdx) => {
                const colName = customColNames[cIdx] || `列${cIdx + 2}`;
                const colObj = actRecord.customCols?.[cIdx] || {};
                
                const times: string[] = [];
                // Check hourly: if either s0 (00 min) or s1 (30 min) is checked, display as h:00 only once
                for (let h = 0; h < 24; h++) {
                  const s0 = h * 2;
                  const s1 = h * 2 + 1;
                  if (colObj[s0] || colObj[s1]) {
                    const timeStr = `${String(h).padStart(2, '0')}:00`;
                    times.push(timeStr);
                  }
                }
                
                return {
                  cIdx,
                  colName,
                  times,
                  visuals: getCustomColVisuals(colName)
                };
              })
              .filter(item => item.times.length > 0);

            return (
              <div 
                key={dateStr}
                className="flex flex-col divide-y divide-slate-100 dark:divide-slate-850/60 transition-colors duration-150 hover:bg-slate-50/30 dark:hover:bg-slate-900/10"
                id={`viewer-row-container-${dateStr}`}
              >
                {/* Row 1: Sleep Records & Timeline */}
                {(activeTab === 'all' || activeTab === 'sleep') && (
                  <div 
                    className={`${gridClass} h-[24px] sm:h-[26px] ${
                      displayMode === 'dark' ? 'divide-slate-800' : 'divide-slate-100'
                    }`}
                    id={`viewer-row-1-${dateStr}`}
                  >
                    {/* Column 1: Date */}
                    <div 
                      onClick={() => onSelectDate(dateStr)}
                      className={`flex items-center cursor-pointer hover:underline select-none ${dateFontClass} ${dayClass}`}
                      title="タップしてこの日の通常モードにする"
                    >
                      {dateLabelFormatted}
                    </div>

                    {/* Column 2: Compressed Microgrid colors */}
                    <div className={`${gridPaddingClass}`}>
                      {hourIndices.map((i) => {
                        const slotIdx0 = i * 2;
                        const slotIdx1 = i * 2 + 1;
                        const val0 = sleepRecord[slotIdx0] || null;
                        const val1 = sleepRecord[slotIdx1] || null;

                        return (
                          <div key={i} className="flex h-full w-full gap-[1px] px-[0.5px]">
                            <div 
                              className={`flex-1 h-full rounded-[1px] ${getViewerColor(val0)} transition-colors`}
                              title={`${i}:00`}
                            />
                            <div 
                              className={`flex-1 h-full rounded-[1px] ${getViewerColor(val1)} transition-colors`}
                              title={`${i}:30`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Row 2: Daily Life & custom times (Vertical stacking, left-aligned dynamic cards) */}
                {(activeTab === 'all' || activeTab === 'activity') && (
                  <div 
                    className={`w-full min-h-[52px] flex items-stretch overflow-x-auto select-none ${
                      displayMode === 'dark' ? 'bg-[#1D1B20]' : 'bg-slate-300'
                    }`}
                    id={`viewer-row-2-${dateStr}`}
                  >
                    {/* Column 1: Daily life title label or clickable date label */}
                    {activeTab === 'activity' ? (
                      <div 
                        onClick={() => onSelectDate(dateStr)}
                        className={`flex items-center justify-center text-center shrink-0 cursor-pointer hover:underline select-none border-r tracking-tight h-auto ${
                          isMonth ? 'text-[12.5px] sm:text-[14px] w-[74px] bg-slate-900/60' : 'text-[13.5px] sm:text-[15.5px] w-[86px] bg-slate-900/40'
                        } ${dayClass} font-black`}
                        title="タップしてこの日の通常モードにする"
                      >
                        {dateLabelFormatted}
                      </div>
                    ) : (
                      <div className={`flex items-center justify-center font-black leading-tight text-center shrink-0 ${
                        isMonth ? 'text-[12.5px] sm:text-[14px] w-[74px]' : 'text-[13.5px] sm:text-[15.5px] w-[86px]'
                      } tracking-tight border-r ${
                        displayMode === 'dark' 
                          ? 'text-[#E6E1E5] bg-[#121212]/50 border-[#49454F]' 
                          : 'text-[#1C1B1F] bg-slate-400/90 border-slate-400'
                      }`}>
                        日常生活
                      </div>
                    )}

                    {/* Column 2: Spans remaining slots with dynamic left-aligned checked times */}
                    <div className="flex items-center gap-3 sm:gap-4 px-3 py-1.5 shrink-0 select-none">
                      
                      {/* 睡眠、中途、入眠、横寝の4行縦表示 */}
                      <div className={`flex flex-col text-[11px] sm:text-[13px] font-sans font-black leading-snug shrink-0 select-none py-0.5 space-y-0.5 w-auto ${
                        displayMode === 'dark' ? 'text-[#E6E1E5]' : 'text-slate-800'
                      }`}>
                        <div className="flex items-center gap-1 justify-start">
                          <span className={`text-[11.5px] sm:text-[13.5px] font-black ${displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-800'}`}>睡眠</span>
                          <span 
                            className="text-[#38bdf8] font-mono text-[14px] sm:text-[16.5px] font-black" 
                            style={{ textShadow: '1.2px 1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px -1.2px 0 #000, 0 1.2px 0 #000, 0 -1.2px 0 #000, 1.2px 0 0 #000, -1.2px 0 0 #000' }}
                          >
                            {stats.sleepHours > 0 ? `${stats.sleepHours}h` : '－'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 justify-start">
                          <span className={`text-[11.5px] sm:text-[13.5px] font-black ${displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-800'}`}>中途</span>
                          <span 
                            className="text-[#facc15] font-mono text-[14px] sm:text-[16.5px] font-black" 
                            style={{ textShadow: '1.2px 1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px -1.2px 0 #000, 0 1.2px 0 #000, 0 -1.2px 0 #000, 1.2px 0 0 #000, -1.2px 0 0 #000' }}
                          >
                            {wakeLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 justify-start">
                          <span className={`text-[11.5px] sm:text-[13.5px] font-black ${displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-800'}`}>入眠</span>
                          <span 
                            className="text-[#a78bfa] font-mono text-[14px] sm:text-[16.5px] font-black" 
                            style={{ textShadow: '1.2px 1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px -1.2px 0 #000, 0 1.2px 0 #000, 0 -1.2px 0 #000, 1.2px 0 0 #000, -1.2px 0 0 #000' }}
                          >
                            {latencyShort}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 justify-start">
                          <span className={`text-[11.5px] sm:text-[13.5px] font-black ${displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-800'}`}>横寝</span>
                          <span 
                            className="text-[#f43f5e] font-mono text-[14px] sm:text-[16.5px] font-black" 
                            style={{ textShadow: '1.2px 1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px -1.2px 0 #000, 0 1.2px 0 #000, 0 -1.2px 0 #000, 1.2px 0 0 #000, -1.2px 0 0 #000' }}
                          >
                            {stats.inBedHours > 0 ? `${stats.inBedHours}h` : '－'}
                          </span>
                        </div>
                      </div>

                      {/* 薄い縦ラインの区切り */}
                      <div className={`w-[1.5px] self-stretch shrink-0 my-0.5 ${
                        displayMode === 'dark' ? 'bg-[#49454F]' : 'bg-slate-500'
                      }`} />

                      {/* 既存の日常生活スタンプのレンダリング */}
                      <div className="flex items-start gap-2.5 sm:gap-3.5 overflow-x-auto py-0.5">
                        {activeLifeItems.length === 0 ? (
                          <span className={`text-[12px] sm:text-[14px] font-black self-center ${
                            displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-500'
                          }`}>
                            －
                          </span>
                        ) : (
                          activeLifeItems.map((item) => {
                            const IconComponent = ICON_MAP[item.visuals.icon] || Folder;
                            const lastCheckInfo = getDaysSinceLastCheck(dateStr, item.cIdx, records);
                            const isMuted = lastCheckInfo.isNoRecord;

                            return (
                              <div key={item.cIdx} className="flex flex-col items-center shrink-0 min-w-[56px]" id={`row-life-wrap-${dateStr}-${item.cIdx}`}>
                                {/* Days since last check notation */}
                                <span className={`text-[10.5px] sm:text-[11px] leading-tight mb-1 ${
                                  isMuted 
                                    ? displayMode === 'dark' 
                                      ? 'text-slate-500 font-normal' 
                                      : 'text-slate-400/80 font-normal'
                                    : 'text-orange-500 dark:text-orange-400 font-black'
                                }`}>
                                  {lastCheckInfo.label}
                                </span>

                                {/* Mini item icon identifying custom category */}
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded border mb-1.5 ${
                                  displayMode === 'dark' 
                                    ? 'bg-[#25232A] text-[#D0BCFF] border-[#49454F]' 
                                    : `${item.visuals.bgColor} ${item.visuals.iconColor} border-slate-400`
                                } border shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0`}>
                                  <IconComponent className="h-4 w-4 shrink-0" />
                                  <span className={`text-[12px] sm:text-[13.5px] font-black truncate max-w-[50px] sm:max-w-[70px] leading-none ${
                                    displayMode === 'dark' ? 'text-yellow-400' : 'text-slate-950'
                                  }}`}>
                                    {item.colName}
                                  </span>
                                </div>
                                {/* Checked slot time intervals layered in a clear column */}
                                <div className="flex flex-col gap-[2px] items-center">
                                  {item.times.map((t, tIdx) => (
                                    <span 
                                      key={`${t}-${tIdx}`} 
                                      className={`text-[12px] sm:text-[13.5px] font-mono font-black leading-tight ${
                                        displayMode === 'dark' ? 'text-yellow-300' : 'text-slate-950 bg-white/50 px-1 rounded-sm shadow-[0_1px_1px_rgba(0,0,0,0.05)] border border-slate-300/30'
                                      }`}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer Legend section */}
      {(activeTab === 'all' || activeTab === 'sleep') && (
        <div 
          className={`py-1.5 px-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 select-none text-[10px] font-extrabold tracking-wider shrink-0 border-t ${
            displayMode === 'dark' ? 'bg-slate-900 border-t-slate-800 text-yellow-400' : 'bg-slate-50 border-t-gray-200 text-slate-500'
          }`}
          id="viewer-footer-legend"
        >
          {stamps.map((stamp, index) => {
            let bgDot = 'bg-slate-550';
            switch (stamp.color) {
              case 'purple': bgDot = 'bg-purple-500'; break;
              case 'sky': bgDot = 'bg-sky-400'; break;
              case 'orange': bgDot = 'bg-orange-500'; break;
              case 'yellow': bgDot = 'bg-yellow-400'; break;
              case 'green': bgDot = 'bg-green-500'; break;
              case 'pink': bgDot = 'bg-pink-500'; break;
              case 'indigo': bgDot = 'bg-indigo-500'; break;
              case 'teal': bgDot = 'bg-teal-500'; break;
              case 'rose': bgDot = 'bg-rose-500'; break;
              case 'slate': bgDot = 'bg-slate-550'; break;
            }
            return (
              <div key={`${stamp.id || 'stamp'}-${index}`} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${bgDot}`}></span>
                <span>{stamp.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
