import { DailyRecords, DayRecord, SleepSymbol, StampConfig, MentalRow } from './types';

/**
 * Format a Date object or date-string into "YYYY年M月D日 (W)" format
 */
export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  const dayName = daysOfWeek[date.getDay()];
  
  return `${year}年${month}月${day}日 (${dayName})`;
}

/**
 * Format Date object into "YYYY-MM-DD" local date string
 */
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get date string shifted by delta days from a base date string
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return getLocalDateString(d);
}

/**
 * Generate a blank 24-hour sleep record map with 48 half-hour slots
 */
export function createBlankRecord(): DayRecord {
  const record: DayRecord = {};
  for (let s = 0; s < 48; s++) {
    record[s] = null;
  }
  return record;
}

/**
 * LocalStorage Helpers
 */
const STORAGE_KEY = 'sleep_records_data';
const HOUR_REP_KEY = 'sleep_hour_rep';

export function loadRecordsFromStorage(): DailyRecords {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading sleep records from localStorage:', e);
    return {};
  }
}

export function saveRecordsToStorage(records: DailyRecords): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving sleep records to localStorage:', e);
  }
}

export function loadHourRep(): '1-24' | '0-23' {
  return '0-23';
}

export function saveHourRep(val: '1-24' | '0-23'): void {
  localStorage.setItem(HOUR_REP_KEY, '0-23');
}

const STAMPS_STORAGE_KEY = 'sleep_app_stamps_v3';

export const DEFAULT_STAMPS: StampConfig[] = [
  { id: '★', name: '就寝', symbol: '★', color: 'purple' },
  { id: 'S', name: '睡眠', symbol: 'S', color: 'sky' },
  { id: '×', name: '覚醒', symbol: '×', color: 'orange' },
  { id: '○', name: '起床', symbol: '○', color: 'yellow' },
  { id: '－', name: '横寝', symbol: '－', color: 'green' }
];

export const DEFAULT_CATEGORY_STAMPS: StampConfig[] = [
  { id: 'cat_hygiene', name: '衛生', symbol: '1', color: 'sky' },
  { id: 'cat_meals', name: '食事', symbol: '2', color: 'orange' },
  { id: 'cat_illness', name: '病気', symbol: '3', color: 'rose' },
  { id: 'cat_outing', name: '外出', symbol: '4', color: 'green' },
  { id: 'cat_cleaning', name: '掃除', symbol: '5', color: 'purple' },
  { id: 'cat_other', name: 'その他', symbol: '6', color: 'slate' }
];

export interface ColorTheme {
  bgColor: string;
  hoverColor: string;
  textColor: string;
  borderColor: string;
  rawHex: string;
}

export const STAMP_COLORS: { [key: string]: ColorTheme } = {
  purple: {
    bgColor: 'bg-[#f3e8ff]',
    hoverColor: 'hover:bg-[#ebdbff]',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    rawHex: '#a855f7'
  },
  sky: {
    bgColor: 'bg-[#e0f2fe]',
    hoverColor: 'hover:bg-[#bae6fd]',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    rawHex: '#0284c7'
  },
  orange: {
    bgColor: 'bg-[#ffedd5]',
    hoverColor: 'hover:bg-[#fed7aa]',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    rawHex: '#ea580c'
  },
  yellow: {
    bgColor: 'bg-[#fef9c3]',
    hoverColor: 'hover:bg-[#fef08a]',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    rawHex: '#eab308'
  },
  green: {
    bgColor: 'bg-[#dcfce7]',
    hoverColor: 'hover:bg-[#bbf7d0]',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    rawHex: '#16a34a'
  },
  pink: {
    bgColor: 'bg-pink-100',
    hoverColor: 'hover:bg-pink-200',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    rawHex: '#db2777'
  },
  indigo: {
    bgColor: 'bg-indigo-100',
    hoverColor: 'hover:bg-indigo-200',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    rawHex: '#4f46e5'
  },
  teal: {
    bgColor: 'bg-teal-100',
    hoverColor: 'hover:bg-teal-200',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
    rawHex: '#0d9488'
  },
  rose: {
    bgColor: 'bg-rose-100',
    hoverColor: 'hover:bg-rose-200',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    rawHex: '#e11d48'
  },
  slate: {
    bgColor: 'bg-slate-100',
    hoverColor: 'hover:bg-slate-200',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    rawHex: '#475569'
  },
  purple_inv: {
    bgColor: 'bg-[#7e22ce]',
    hoverColor: 'hover:bg-[#6b21a8]',
    textColor: 'text-[#f3e8ff]',
    borderColor: 'border-purple-300',
    rawHex: '#7e22ce'
  },
  sky_inv: {
    bgColor: 'bg-[#0369a1]',
    hoverColor: 'hover:bg-[#075985]',
    textColor: 'text-[#e0f2fe]',
    borderColor: 'border-sky-350',
    rawHex: '#0369a1'
  },
  orange_inv: {
    bgColor: 'bg-[#c2410c]',
    hoverColor: 'hover:bg-[#9a3412]',
    textColor: 'text-[#ffedd5]',
    borderColor: 'border-orange-350',
    rawHex: '#c2410c'
  },
  yellow_inv: {
    bgColor: 'bg-[#a16207]',
    hoverColor: 'hover:bg-[#854d0e]',
    textColor: 'text-[#fef9c3]',
    borderColor: 'border-yellow-350',
    rawHex: '#a16207'
  },
  green_inv: {
    bgColor: 'bg-[#15803d]',
    hoverColor: 'hover:bg-[#166534]',
    textColor: 'text-[#dcfce7]',
    borderColor: 'border-green-350',
    rawHex: '#15803d'
  },
  pink_inv: {
    bgColor: 'bg-[#be185d]',
    hoverColor: 'hover:bg-[#9d174d]',
    textColor: 'text-[#fce7f3]',
    borderColor: 'border-pink-300',
    rawHex: '#be185d'
  },
  indigo_inv: {
    bgColor: 'bg-[#4338ca]',
    hoverColor: 'hover:bg-[#3730a3]',
    textColor: 'text-[#e0e7ff]',
    borderColor: 'border-indigo-300',
    rawHex: '#4338ca'
  },
  teal_inv: {
    bgColor: 'bg-[#0f766e]',
    hoverColor: 'hover:bg-[#115e59]',
    textColor: 'text-[#ccfbf1]',
    borderColor: 'border-teal-300',
    rawHex: '#0f766e'
  },
  rose_inv: {
    bgColor: 'bg-[#be123c]',
    hoverColor: 'hover:bg-[#9f1239]',
    textColor: 'text-[#ffe4e6]',
    borderColor: 'border-rose-300',
    rawHex: '#be123c'
  },
  slate_inv: {
    bgColor: 'bg-[#334155]',
    hoverColor: 'hover:bg-[#1e293b]',
    textColor: 'text-[#f1f5f9]',
    borderColor: 'border-slate-300',
    rawHex: '#334155'
  }
};

export function getStampStyleForMode(
  colorKey: string,
  mode: 'vivid' | 'soft' | 'dark',
  isOddHour: boolean = false
): {
  bgColor: string;
  hoverColor: string;
  textColor: string;
  borderColor: string;
  rawHex: string;
  textShadow: string;
  textStroke: string;
  textClass: string;
} {
  // 1. Determine size & text styling depending on mode
  // すべての表示モード（はっきり・やさしい・ダーク）において極大サイズのフォントで統一（シニア向けの視認性最優先）
  const textClass = 'font-black text-[18px] xs:text-[20px] sm:text-[22px] tracking-wide';
  let textShadow = 'none';
  let textStroke = 'none';

  if (mode === 'vivid' || mode === 'dark') {
    textShadow = colorKey === 'yellow' ? '1px 1px 1px rgba(255,255,255,0.8)' : '1px 1px 2px rgba(0,0,0,0.8)';
  }

  // 2. Resolve colors
  if (mode === 'vivid' || mode === 'dark') {
    switch (colorKey) {
      case 'purple':
        return {
          bgColor: 'bg-[#9333ea]',
          hoverColor: 'hover:bg-[#a855f7]',
          textColor: '#ffffff',
          borderColor: 'border-[#7c3aed]',
          rawHex: '#9333ea',
          textShadow,
          textStroke,
          textClass
        };
      case 'sky':
        return {
          bgColor: 'bg-[#2563eb]',
          hoverColor: 'hover:bg-[#3b82f6]',
          textColor: '#ffffff',
          borderColor: 'border-[#1d4ed8]',
          rawHex: '#2563eb',
          textShadow,
          textStroke,
          textClass
        };
      case 'orange':
        return {
          bgColor: 'bg-[#dc2626]',
          hoverColor: 'hover:bg-[#ef4444]',
          textColor: '#ffffff',
          borderColor: 'border-[#b91c1c]',
          rawHex: '#dc2626',
          textShadow,
          textStroke,
          textClass
        };
      case 'yellow':
        return {
          bgColor: 'bg-[#eab308]',
          hoverColor: 'hover:bg-[#facc15]',
          textColor: '#000000',
          borderColor: 'border-[#ca8a04]',
          rawHex: '#eab308',
          textShadow,
          textStroke,
          textClass
        };
      case 'green':
        return {
          bgColor: 'bg-[#16a34a]',
          hoverColor: 'hover:bg-[#22c55e]',
          textColor: '#ffffff',
          borderColor: 'border-[#15803d]',
          rawHex: '#16a34a',
          textShadow,
          textStroke,
          textClass
        };
      case 'pink':
        return {
          bgColor: 'bg-[#db2777]',
          hoverColor: 'hover:bg-[#ec4899]',
          textColor: '#ffffff',
          borderColor: 'border-[#be185d]',
          rawHex: '#db2777',
          textShadow,
          textStroke,
          textClass
        };
      case 'indigo':
        return {
          bgColor: 'bg-[#4f46e5]',
          hoverColor: 'hover:bg-[#6366f1]',
          textColor: '#ffffff',
          borderColor: 'border-[#4338ca]',
          rawHex: '#4f46e5',
          textShadow,
          textStroke,
          textClass
        };
      case 'teal':
        return {
          bgColor: 'bg-[#0d9488]',
          hoverColor: 'hover:bg-[#14b8a6]',
          textColor: '#ffffff',
          borderColor: 'border-[#0f766e]',
          rawHex: '#0d9488',
          textShadow,
          textStroke,
          textClass
        };
      case 'rose':
        return {
          bgColor: 'bg-[#e11d48]',
          hoverColor: 'hover:bg-[#f43f5e]',
          textColor: '#ffffff',
          borderColor: 'border-[#be123c]',
          rawHex: '#e11d48',
          textShadow,
          textStroke,
          textClass
        };
      case 'slate':
      default:
        return {
          bgColor: 'bg-[#475569]',
          hoverColor: 'hover:bg-[#64748b]',
          textColor: '#ffffff',
          borderColor: 'border-[#334155]',
          rawHex: '#475569',
          textShadow,
          textStroke,
          textClass
        };
    }
  }

  switch (colorKey) {
    case 'purple':
      return {
        bgColor: 'bg-[#f3e8ff]',
        hoverColor: 'hover:bg-[#ebdbff]',
        textColor: '#7e22ce',
        borderColor: 'border-purple-200',
        rawHex: '#a855f7',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'sky':
      return {
        bgColor: 'bg-[#e0f2fe]',
        hoverColor: 'hover:bg-[#bae6fd]',
        textColor: '#000000',
        borderColor: 'border-sky-200',
        rawHex: '#0284c7',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'orange':
      return {
        bgColor: 'bg-[#ffedd5]',
        hoverColor: 'hover:bg-[#fed7aa]',
        textColor: '#c2410c',
        borderColor: 'border-orange-200',
        rawHex: '#ea580c',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'yellow':
      return {
        bgColor: 'bg-[#fef9c3]',
        hoverColor: 'hover:bg-[#fef08a]',
        textColor: '#ca8a04',
        borderColor: 'border-yellow-200',
        rawHex: '#eab308',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'green':
      return {
        bgColor: 'bg-[#dcfce7]',
        hoverColor: 'hover:bg-[#bbf7d0]',
        textColor: '#15803d',
        borderColor: 'border-green-200',
        rawHex: '#16a34a',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'pink':
      return {
        bgColor: 'bg-pink-50',
        hoverColor: 'hover:bg-pink-100',
        textColor: '#be185d',
        borderColor: 'border-pink-200',
        rawHex: '#db2777',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'indigo':
      return {
        bgColor: 'bg-indigo-50',
        hoverColor: 'hover:bg-indigo-100',
        textColor: '#4338ca',
        borderColor: 'border-indigo-200',
        rawHex: '#4f46e5',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'teal':
      return {
        bgColor: 'bg-teal-50',
        hoverColor: 'hover:bg-teal-100',
        textColor: '#0f766e',
        borderColor: 'border-teal-200',
        rawHex: '#0d9488',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'rose':
      return {
        bgColor: 'bg-rose-50',
        hoverColor: 'hover:bg-rose-100',
        textColor: '#be123c',
        borderColor: 'border-rose-200',
        rawHex: '#e11d48',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
    case 'slate':
    default:
      return {
        bgColor: 'bg-slate-50',
        hoverColor: 'hover:bg-slate-100',
        textColor: '#334155',
        borderColor: 'border-slate-200',
        rawHex: '#475569',
        textShadow: 'none',
        textStroke: 'none',
        textClass
      };
  }
}

export function loadStampsFromStorage(): StampConfig[] {
  try {
    const raw = localStorage.getItem(STAMPS_STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORY_STAMPS;
    const parsed = JSON.parse(raw) as StampConfig[];
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    parsed.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    return unique.length > 0 ? unique : DEFAULT_CATEGORY_STAMPS;
  } catch (e) {
    const defaultVal = DEFAULT_CATEGORY_STAMPS;
    return defaultVal;
  }
}

export function saveStampsToStorage(stamps: StampConfig[]): void {
  try {
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    stamps.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    localStorage.setItem(STAMPS_STORAGE_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Error saving stamps to localStorage:', e);
  }
}

export function getEffectiveSymbol(val: SleepSymbol, stamps: StampConfig[] = DEFAULT_STAMPS): string | null {
  if (!val) return null;
  const stamp = stamps.find(s => s.id === val);
  if (stamp) return stamp.symbol;
  return val;
}

/**
 * Calculates continuous sleep hours (S count) and sleep status counts for a day
 */
export function calculateSleepStats(record: DayRecord, stamps: StampConfig[] = DEFAULT_STAMPS) {
  let sleepHours = 0;
  let inBedHours = 0;
  let wakeupCount = 0;
  
  if (record) {
    // Find the first index when sleep S starts
    let firstSleepIdx = -1;
    for (let i = 0; i < 48; i++) {
      if (getEffectiveSymbol(record[i], stamps) === 'S') {
        firstSleepIdx = i;
        break;
      }
    }

    // Only check the keys from 0 to 47 to avoid including dynamic properties like memo
    for (let i = 0; i < 48; i++) {
      const mappedSymbol = getEffectiveSymbol(record[i], stamps);
      if (mappedSymbol === 'S') sleepHours += 0.5;
      if (mappedSymbol === '★' || mappedSymbol === 'S' || mappedSymbol === '○' || mappedSymbol === '－') inBedHours += 0.5;
      if (mappedSymbol === '×') {
        // Only count awakenings (×) that occur after the first sleep S has started
        if (firstSleepIdx !== -1 && i > firstSleepIdx) {
          wakeupCount++;
        }
      }
    }
  }
  
  return {
    sleepHours,
    inBedHours,
    wakeupCount
  };
}

/**
 * Calculates sleep onset latency (入眠時間) for a day
 * Counts the number of 30-minute slots from the first '★' to the next 'S'.
 * Returns formatted string like "1.5時間", "30分", "－"
 */
export function calculateOnsetLatency(record: DayRecord, stamps: StampConfig[] = DEFAULT_STAMPS): string {
  if (!record) return '－';
  
  let bedtimeIdx = -1;
  for (let i = 0; i < 48; i++) {
    if (getEffectiveSymbol(record[i], stamps) === '★') {
      bedtimeIdx = i;
      break;
    }
  }

  if (bedtimeIdx === -1) {
    return '－';
  }

  let sleepIdx = -1;
  for (let i = bedtimeIdx + 1; i < 48; i++) {
    if (getEffectiveSymbol(record[i], stamps) === 'S') {
      sleepIdx = i;
      break;
    }
  }

  if (sleepIdx === -1) {
    return '－';
  }

  const slotCount = sleepIdx - bedtimeIdx;
  const hours = slotCount * 0.5;
  if (hours === 0.5) {
    return '30分';
  }
  return `${hours}時間`;
}

/**
 * Generates the raw CSV content as a string, including custom columns
 */
/**
 * Generates the raw CSV content as a string, including custom columns
 */
export function generateCSVText(records: DailyRecords, forSingleDate?: string, customColNames?: string[], stamps: StampConfig[] = DEFAULT_STAMPS): string {
  const finalNames = customColNames || loadCustomColNames(loadCustomColCount());
  
  // Column definitions
  const headers = ['日付', '曜日', '時間枠', '記号', '意味', ...finalNames];
  const lines: string[] = [headers.map(h => `"${h}"`).join(',')];
  
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  
  // Decide which dates to export (sorted chronologically)
  const datesToExport = forSingleDate 
    ? [forSingleDate] 
    : Object.keys(records).sort((a, b) => a.localeCompare(b));
    
  datesToExport.forEach((dateStr) => {
    const record = records[dateStr] || createBlankRecord();
    const dateObj = new Date(dateStr);
    const dayOfWeek = isNaN(dateObj.getTime()) ? '' : daysOfWeek[dateObj.getDay()];
    
    // Write 48 rows for each day
    for (let h = 0; h < 24; h++) {
      const hourLabel = String(h).padStart(2, '0');
      
      const getSymbolMeaning = (symbolVal: SleepSymbol) => {
        if (!symbolVal) return '';
        const stamp = stamps.find(s => s.id === symbolVal);
        if (stamp) return stamp.name;
        if (symbolVal === '★') return '就寝';
        if (symbolVal === 'S') return '睡眠';
        if (symbolVal === '×') return '覚醒';
        if (symbolVal === '○') return '起床';
        if (symbolVal === '－') return '横寝';
        return '';
      };
      
      // 00分
      const symbol0 = record[h * 2];
      const effSym0 = getEffectiveSymbol(symbol0, stamps) || '';
      const meaning0 = getSymbolMeaning(symbol0);
      const timeLabel0 = `${hourLabel}時05分`; // wait, wait! The original is hourLabel + "時00分", wait, let's keep exact original template logic
      
      // Let's replace the 00分 label and logic with exactly same as original but with stamps resolution
      const labelValue0 = symbol0 || '';
      
      const customCells0 = finalNames.map((_, cIdx) => {
        const val = record.customCols?.[cIdx]?.[h * 2] || '';
        return `"${val}"`;
      });
      
      lines.push([
        `"${dateStr}"`,
        `"${dayOfWeek}"`,
        `"${hourLabel}時00分"`,
        `"${effSym0 || labelValue0}"`,
        `"${meaning0}"`,
        ...customCells0
      ].join(','));
      
      // 30分
      const symbol30 = record[h * 2 + 1];
      const effSym30 = getEffectiveSymbol(symbol30, stamps) || '';
      const meaning30 = getSymbolMeaning(symbol30);
      const labelValue30 = symbol30 || '';
      
      const customCells30 = finalNames.map((_, cIdx) => {
        const val = record.customCols?.[cIdx]?.[h * 2 + 1] || '';
        return `"${val}"`;
      });
      
      lines.push([
        `"${dateStr}"`,
        `"${dayOfWeek}"`,
        `"${hourLabel}時30分"`,
        `"${effSym30 || labelValue30}"`,
        `"${meaning30}"`,
        ...customCells30
      ].join(','));
    }
  });

  return lines.join('\r\n');
}

/**
 * Generates and downloads a CSV of the sleep record for Japanese Microsoft Excel (UTF-8 with BOM)
 * @param records All recorded dates
 * @param forSingleDate Optional date string to export only that date, if omitted exports ALL history
 */
export async function exportToCSV(records: DailyRecords, forSingleDate?: string, forceDownload: boolean = true, customColNames?: string[], stamps: StampConfig[] = DEFAULT_STAMPS): Promise<void> {
  const csvContentRaw = generateCSVText(records, forSingleDate, customColNames, stamps);
  
  // Create download link with BOM to prevent Microsoft Excel Japanese letter garbling
  const csvContent = '\uFEFF' + csvContentRaw;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const fileName = forSingleDate 
    ? `睡眠記録_${forSingleDate}.csv` 
    : `睡眠記録_全期間.csv`;
    
  // Only use Web Share API if forceDownload is false AND we are on a mobile platform (avoiding PC share menus)
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (!forceDownload && isMobile && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'text/csv' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: '睡眠記録データのCSVバックアップです。'
        });
        return; // Success, shared/saved via native UI!
      }
    } catch (shareErr) {
      if (shareErr instanceof Error && shareErr.name === 'AbortError') {
        console.log('CSV sharing aborted by user');
        return;
      }
      console.warn('Web Share API failed, falling back to traditional download:', shareErr);
    }
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Parses a UTF-8 CSV string exported from this applet back into DailyRecords
 * @param csvText The content of the uploaded CSV file
 */
export function importFromCSV(csvText: string): DailyRecords | null {
  // Strip BOM or carriage return symbols
  const cleanCsv = csvText.replace(/^\uFEFF/, '');
  const lines = cleanCsv.split(/\r?\n/);
  if (lines.length < 2) return null;

  // Read header to parse custom columns if they exist
  const firstLine = lines[0].trim();
  const headers = firstLine.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
  const importedCustomColNames: string[] = [];
  if (headers.length > 5) {
    for (let c = 5; c < headers.length; c++) {
      importedCustomColNames.push(headers[c]);
    }
  }

  // Update storage if custom columns are present in the CSV
  if (importedCustomColNames.length > 0) {
    saveCustomColCount(importedCustomColNames.length);
    saveCustomColNames(importedCustomColNames);
  }

  const parsedRecords: DailyRecords = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma, handling potential double quotes
    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 4) continue;
    
    const [dateStr, , timeStr, symbol] = parts;
    
    // Check if dateStr format is valid YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      continue; // Skip header or invalid metadata rows
    }

    const timeMatch = timeStr.match(/(\d+)時(\d+)分/);
    if (!timeMatch) continue;

    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23) continue;

    const slotIdx = hour * 2 + (minute === 30 ? 1 : 0);
    
    if (!parsedRecords[dateStr]) {
      parsedRecords[dateStr] = { memo: '' };
    }
    
    // Check if the symbol is a valid SleepSymbol or empty
    const allowedSymbols = ['★', 'S', '×', '○', '－'];
    if (allowedSymbols.includes(symbol)) {
      parsedRecords[dateStr][slotIdx] = symbol as SleepSymbol;
    } else {
      parsedRecords[dateStr][slotIdx] = undefined;
    }

    // Parse values for custom columns
    if (importedCustomColNames.length > 0) {
      for (let c = 0; c < importedCustomColNames.length; c++) {
        const partIdx = 5 + c;
        if (partIdx < parts.length) {
          const colVal = parts[partIdx];
          if (colVal) {
            if (!parsedRecords[dateStr].customCols) {
              parsedRecords[dateStr].customCols = {};
            }
            if (!parsedRecords[dateStr].customCols[c]) {
              parsedRecords[dateStr].customCols[c] = {};
            }
            parsedRecords[dateStr].customCols[c][slotIdx] = colVal as SleepSymbol;
          }
        }
      }
    }
  }

  if (Object.keys(parsedRecords).length === 0) {
    return null;
  }
  
  return parsedRecords;
}

/**
 * Migrates sleep records from 1-24 representation (where slot 0 represents 01:00)
 * to 0-23 representation (where slot 2 represents 01:00, slot 0 is 00:00).
 * Shifts all sleep slot symbols forward by +2 slots (+1 hour).
 */
export function migrateRecordsTo023(records: DailyRecords): DailyRecords {
  const sortedDates = Object.keys(records).sort((a, b) => a.localeCompare(b));
  const newRecords: DailyRecords = {};
  
  // Initialize new records containing empty records for existing keys
  sortedDates.forEach(dateStr => {
    newRecords[dateStr] = {
      memo: records[dateStr].memo || '',
    };
    for (let s = 0; s < 48; s++) {
      newRecords[dateStr][s] = null;
    }
  });

  // Shift slots by +2 slots
  sortedDates.forEach(dateStr => {
    const oldRecord = records[dateStr];
    for (let s = 0; s < 48; s++) {
      const val = oldRecord[s];
      if (!val) continue;

      if (s < 46) {
        // Shift within current day
        newRecords[dateStr][s + 2] = val;
      } else {
        // Bleed into next day
        const nextDayStr = shiftDateString(dateStr, 1);
        if (!newRecords[nextDayStr]) {
          newRecords[nextDayStr] = createBlankRecord();
        }
        const nextDaySlot = s - 46; // s=46 -> 0, s=47 -> 1
        newRecords[nextDayStr][nextDaySlot] = val;
      }
    }
  });

  return newRecords;
}

/**
 * Custom columns settings LocalStorage Helpers
 */
export function loadCustomColCount(): number {
  const val = localStorage.getItem('sleep_custom_col_count');
  if (!val) return 3; // Default to 3 custom columns
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 3 : parsed;
}

export function saveCustomColCount(count: number): void {
  localStorage.setItem('sleep_custom_col_count', String(count));
}

export function loadCustomColNames(count: number): string[] {
  try {
    const raw = localStorage.getItem('sleep_custom_col_names');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const names = [...parsed];
        for (let i = names.length; i < count; i++) {
          names.push(`列${i + 2}`);
        }
        return names.slice(0, count);
      }
    }
  } catch (e) {
    console.error('Error loading custom column names:', e);
  }
  return Array.from({ length: count }, (_, i) => `列${i + 2}`);
}

export function saveCustomColNames(names: string[]): void {
  localStorage.setItem('sleep_custom_col_names', JSON.stringify(names));
}

export function loadCustomColCategories(count: number): string[] {
  try {
    const raw = localStorage.getItem('sleep_custom_col_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const categories = [...parsed];
        for (let i = categories.length; i < count; i++) {
          categories.push('その他');
        }
        return categories.slice(0, count);
      }
    }
  } catch (e) {
    console.error('Error loading custom column categories:', e);
  }
  return Array.from({ length: count }, () => 'その他');
}

export function saveCustomColCategories(categories: string[]): void {
  localStorage.setItem('sleep_custom_col_categories', JSON.stringify(categories));
}

/**
 * Mental health LocalStorage Helpers
 */
const MENTAL_RECORDS_KEY = 'mental_records_data';
const MENTAL_STAMPS_KEY = 'mental_app_stamps_v1';
const MENTAL_COL_COUNT_KEY = 'mental_custom_col_count';
const MENTAL_COL_NAMES_KEY = 'mental_custom_col_names';

export const DEFAULT_MENTAL_STAMPS: StampConfig[] = [
  { id: '😀', name: '快晴', symbol: '😀', color: 'orange' },
  { id: '🙂', name: '晴れ', symbol: '🙂', color: 'yellow' },
  { id: '😐', name: '曇り', symbol: '😐', color: 'green' },
  { id: '😕', name: '雨', symbol: '😕', color: 'sky' },
  { id: '😭', name: '大雨', symbol: '😭', color: 'rose' }
];

export function loadMentalRecordsFromStorage(): DailyRecords {
  try {
    const raw = localStorage.getItem(MENTAL_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading mental records from localStorage:', e);
    return {};
  }
}

export function saveMentalRecordsToStorage(records: DailyRecords): void {
  try {
    localStorage.setItem(MENTAL_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving mental records to localStorage:', e);
  }
}

export function loadMentalStampsFromStorage(): StampConfig[] {
  try {
    const raw = localStorage.getItem(MENTAL_STAMPS_KEY);
    if (!raw) return DEFAULT_MENTAL_STAMPS;
    const parsed = JSON.parse(raw) as StampConfig[];
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    parsed.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    return unique.length > 0 ? unique : DEFAULT_MENTAL_STAMPS;
  } catch (e) {
    return DEFAULT_MENTAL_STAMPS;
  }
}

export function saveMentalStampsToStorage(stamps: StampConfig[]): void {
  try {
    localStorage.setItem(MENTAL_STAMPS_KEY, JSON.stringify(stamps));
  } catch (e) {
    console.error('Error saving mental stamps to localStorage:', e);
  }
}

export function loadMentalCustomColCount(): number {
  const val = localStorage.getItem(MENTAL_COL_COUNT_KEY);
  if (!val) return 3; // Default to 3 custom columns
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 3 : parsed;
}

export function saveMentalCustomColCount(count: number): void {
  localStorage.setItem(MENTAL_COL_COUNT_KEY, String(count));
}

export function loadMentalCustomColNames(count: number): string[] {
  try {
    const raw = localStorage.getItem(MENTAL_COL_NAMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const names = [...parsed];
        for (let i = names.length; i < count; i++) {
          names.push(`項目${i + 2}`);
        }
        return names.slice(0, count);
      }
    }
  } catch (e) {
    console.error('Error loading custom mental column names:', e);
  }
  return Array.from({ length: count }, (_, i) => `項目${i + 2}`);
}

export function saveMentalCustomColNames(names: string[]): void {
  localStorage.setItem(MENTAL_COL_NAMES_KEY, JSON.stringify(names));
}

/**
 * Returns clean current JST/Local timestamp for backup filenames (YYYYMMDD_HHMMSS)
 */
export function getBackupTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

export const DEFAULT_MENTAL_ROWS: MentalRow[] = [
  { id: 'mood', name: '気分', description: '全体の気分は？', icon: 'heart', scaleType: 'bipolar', category: 'その他' },
  { id: 'anxiety', name: '不安・緊張', description: '不安や緊張の強さは？', icon: 'anxiety', scaleType: 'bipolar', category: 'その他' },
  { id: 'motivation', name: '意欲・やる気', description: 'やる気や意欲は？', icon: 'motivation', scaleType: 'bipolar', category: 'その他' },
  { id: 'sleep_quality', name: '睡眠の質', description: '睡眠の質は？', icon: 'bed', scaleType: 'bipolar', category: 'その他' },
  { id: 'energy', name: 'エネルギー', description: '体のエネルギーは？', icon: 'energy', scaleType: 'bipolar', category: 'その他' },
  { id: 'thought_state', name: '思考の状態', description: '考えのまとまりは？', icon: 'thought_state', scaleType: 'bipolar', category: 'その他' },
];

export function loadMentalRowsFromStorage(): MentalRow[] {
  try {
    const raw = localStorage.getItem('mental_row_list_v3');
    if (!raw) return DEFAULT_MENTAL_ROWS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((row: any) => ({
        ...row,
        scaleType: row.scaleType || 'bipolar',
        category: row.category || 'その他'
      }));
    }
  } catch (e) {
    console.error('Error loading mental rows from localStorage:', e);
  }
  return DEFAULT_MENTAL_ROWS;
}

export function saveMentalRowsToStorage(rows: MentalRow[]): void {
  try {
    localStorage.setItem('mental_row_list_v3', JSON.stringify(rows));
  } catch (e) {
    console.error('Error saving mental rows to localStorage:', e);
  }
}

/**
 * Actual Sleep Storage Helpers (Independent Sleep Tab Data)
 */
const ACTUAL_SLEEP_STORAGE_KEY = 'actual_sleep_records_data';
const ACTUAL_SLEEP_STAMPS_KEY = 'actual_sleep_app_stamps_v3';
const ACTUAL_SLEEP_COL_COUNT_KEY = 'actual_sleep_custom_col_count';
const ACTUAL_SLEEP_COL_NAMES_KEY = 'actual_sleep_custom_col_names';

export function loadActualSleepRecordsFromStorage(): DailyRecords {
  try {
    const raw = localStorage.getItem(ACTUAL_SLEEP_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading actual sleep records from localStorage:', e);
    return {};
  }
}

export function saveActualSleepRecordsToStorage(records: DailyRecords): void {
  try {
    localStorage.setItem(ACTUAL_SLEEP_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving actual sleep records to localStorage:', e);
  }
}

export function loadActualSleepStampsFromStorage(): StampConfig[] {
  try {
    const raw = localStorage.getItem(ACTUAL_SLEEP_STAMPS_KEY);
    if (!raw) return DEFAULT_STAMPS;
    const parsed = JSON.parse(raw) as StampConfig[];
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    parsed.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    return unique.length > 0 ? unique : DEFAULT_STAMPS;
  } catch (e) {
    return DEFAULT_STAMPS;
  }
}

export function saveActualSleepStampsToStorage(stamps: StampConfig[]): void {
  try {
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    stamps.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    localStorage.setItem(ACTUAL_SLEEP_STAMPS_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Error saving actual sleep stamps to localStorage:', e);
  }
}

export function loadActualSleepCustomColCount(): number {
  const val = localStorage.getItem(ACTUAL_SLEEP_COL_COUNT_KEY);
  if (!val) return 3; // Default to 3 custom columns
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 3 : parsed;
}

export function saveActualSleepCustomColCount(count: number): void {
  localStorage.setItem(ACTUAL_SLEEP_COL_COUNT_KEY, String(count));
}

export function loadActualSleepCustomColNames(count: number): string[] {
  try {
    const raw = localStorage.getItem(ACTUAL_SLEEP_COL_NAMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const names = [...parsed];
        for (let i = names.length; i < count; i++) {
          names.push(`列${i + 2}`);
        }
        return names.slice(0, count);
      }
    }
  } catch (e) {
    console.error('Error loading custom actual sleep column names:', e);
  }
  return Array.from({ length: count }, (_, i) => `列${i + 2}`);
}

export function saveActualSleepCustomColNames(names: string[]): void {
  localStorage.setItem(ACTUAL_SLEEP_COL_NAMES_KEY, JSON.stringify(names));
}

const MENTAL_CATEGORIES_KEY = 'mental_app_categories_v3';

export function loadMentalCategoriesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(MENTAL_CATEGORIES_KEY);
    if (!raw) return ['衛生', '食事', '病気', '外出', '掃除', 'その他'];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error loading mental categories:', e);
  }
  return ['衛生', '食事', '病気', '外出', '掃除', 'その他'];
}

export function saveMentalCategoriesToStorage(categories: string[]): void {
  try {
    localStorage.setItem(MENTAL_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving mental categories:', e);
  }
}

const ACTIVITY_CATEGORIES_KEY = 'activity_app_categories_v1';

export function loadActivityCategoriesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_CATEGORIES_KEY);
    if (!raw) return ['衛生', '食事', '病気', '外出', '掃除', 'その他'];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error loading activity categories:', e);
  }
  return ['衛生', '食事', '病気', '外出', '掃除', 'その他'];
}

export function saveActivityCategoriesToStorage(categories: string[]): void {
  try {
    localStorage.setItem(ACTIVITY_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving activity categories:', e);
  }
}

export function loadActivityColWidth(): number {
  try {
    const raw = localStorage.getItem('activity_col_width');
    if (!raw) return 32;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 32 : parsed;
  } catch (e) {
    console.error('Error loading activity column width:', e);
    return 32;
  }
}

export function saveActivityColWidth(width: number): void {
  try {
    localStorage.setItem('activity_col_width', String(width));
  } catch (e) {
    console.error('Error saving activity column width:', e);
  }
}

export function loadActivityColFontWeight(): string {
  try {
    const raw = localStorage.getItem('activity_col_font_weight');
    return raw || 'font-black';
  } catch (e) {
    console.error('Error loading activity column font weight:', e);
    return 'font-black';
  }
}

export function saveActivityColFontWeight(weight: string): void {
  try {
    localStorage.setItem('activity_col_font_weight', weight);
  } catch (e) {
    console.error('Error saving activity column font weight:', e);
  }
}

export function loadChartScaleFactor(): number {
  try {
    const raw = localStorage.getItem('chart_scale_factor');
    if (!raw) return 0.6;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0.6 : parsed;
  } catch (e) {
    console.error('Error loading chart scale factor:', e);
    return 0.6;
  }
}

export function saveChartScaleFactor(scale: number): void {
  try {
    localStorage.setItem('chart_scale_factor', String(scale));
  } catch (e) {
    console.error('Error saving chart scale factor:', e);
  }
}






