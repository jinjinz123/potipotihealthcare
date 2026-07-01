import React, { useState } from 'react';
import { 
  Calendar, 
  Info, 
  ChevronRight, 
  Sparkles, 
  FileText, 
  Smile, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  ZoomIn,
  TrendingUp
} from 'lucide-react';
import { DailyRecords, MentalRow } from '../types';
import { loadMentalRowsFromStorage, loadMentalRecordsFromStorage } from '../utils';

interface BipolarReportProps {
  displayMode?: 'vivid' | 'soft' | 'dark';
  mentalRows?: MentalRow[];
  mentalRecords?: DailyRecords;
  selectedDate?: string;
  chartScaleFactor?: number;
}

interface Point {
  x: number;
  y: number;
}

// Cubic Bezier interpolation with horizontal control tangents
// to ensure curves are smooth and never overshoot the graph bounds.
function getSmoothBezierPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Smooth S-curve control points (mid-point horizontal control tangents)
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

// Generate an elegant, compassionate narrative summary in Japanese based on monthly stats.
const generateSummaryMemo = (
  avg: number,
  max: number,
  min: number,
  loggedDays: number,
  stableDays: number,
  manicDays: number,
  depressedDays: number,
  mixedDays: number,
  viewYear: number,
  viewMonth: number
): string => {
  if (loggedDays === 0) {
    return 'この月の記録がありません。メンタルタブから日々の気分を記録してください。';
  }
  
  let text = `${viewYear}年${viewMonth}月は、合計${loggedDays}日間の気分記録がありました。`;
  
  if (avg > 0.5) {
    text += `平均気分は+${avg.toFixed(1)}と、全体的にやや高揚（軽躁〜躁状態）傾向にありました。`;
  } else if (avg < -0.5) {
    text += `平均気分は${avg.toFixed(1)}と、全体的にやや停滞（軽うつ〜うつ状態）が長引いていました。`;
  } else {
    text += `平均気分は${avg >= 0 ? '+' : ''}${avg.toFixed(1)}と、全体として比較的安定域（0）に近い平穏な推移でした。`;
  }
  
  if (stableDays > loggedDays * 0.4) {
    text += `特に、気分の波が安定した日（0）が${stableDays}日間あり、穏やかに過ごせた時間が多い一月でした。`;
  } else {
    text += `安定域（0）で過ごせた日は${stableDays}日間であり、気分の起伏や感情の波が生じやすいデリケートな期間でした。`;
  }
  
  text += `気分の最高値は${max > 0 ? '+' : ''}${max}、最低値は${min > 0 ? '+' : ''}${min}（全体の変動幅は${(max - min).toFixed(1)}）でした。`;
  
  const details = [];
  if (manicDays > 0) details.push(`躁・軽躁状態の日が${manicDays}日間`);
  if (depressedDays > 0) details.push(`うつ・軽うつ状態の日が${depressedDays}日間`);
  if (mixedDays > 0) details.push(`混合状態（M）の兆候が${mixedDays}日間`);
  
  if (details.length > 0) {
    text += `期間中、${details.join('、')}見られました。`;
  }
  
  if (mixedDays > 0) {
    text += `混合状態（M）が検知された日は、焦燥感やイライラ、不眠などの衝動性が生じやすいため、無理な活動を避けて静かな環境で心身を休めることを最優先にしてください。`;
  } else if (depressedDays > manicDays && depressedDays >= 5) {
    text += `うつの停滞期がやや長めであったため、少しでもできているご自身を褒めつつ、睡眠時間をしっかり確保し、まずは心身の回復を第一にお過ごしください。`;
  } else if (manicDays > depressedDays && manicDays >= 5) {
    text += `軽躁の活動期であったため、ペースを意図的に落とし、睡眠不足にならないようコントロールすることを推奨します。`;
  } else {
    text += `全体的に安定したバランスを保てておりますので、この良好なペースと治療リズムを継続していきましょう。`;
  }
  
  return text;
};

// Return professional, high-contrast, MD3 Dark Theme compatible colors for each Mixed State severity level
function getMixedBadgeColors(severity: number, isDark: boolean) {
  if (severity === 5) {
    // Severe / 重度 (MD3 On Error & Error container palette)
    return {
      fill: isDark ? '#4F0000' : '#FEE2E2',
      stroke: isDark ? '#F2B8B5' : '#EF4444',
      text: isDark ? '#F2B8B5' : '#B91C1C'
    };
  } else if (severity === 3 || severity === 4) {
    // Moderate / 中等度 (MD3 Warning Orange palette)
    return {
      fill: isDark ? '#3D1C00' : '#FFEDD5',
      stroke: isDark ? '#FFB74D' : '#F97316',
      text: isDark ? '#FFB74D' : '#C2410C'
    };
  } else {
    // Mild / 軽度 (MD3 Slate Neutral palette)
    return {
      fill: isDark ? '#2D2D30' : '#F1F5F9',
      stroke: isDark ? '#94A3B8' : '#64748B',
      text: isDark ? '#CAC4D0' : '#334155'
    };
  }
}

export default function BipolarReport({ 
  displayMode = 'vivid',
  mentalRows: propMentalRows,
  mentalRecords: propMentalRecords,
  selectedDate: propSelectedDate,
  chartScaleFactor = 0.6
}: BipolarReportProps) {
  
  const isDark = displayMode === 'dark';

  // Fallback storage loaders if parent props are empty
  const [localMentalRecords] = useState<DailyRecords>(() => loadMentalRecordsFromStorage());
  const [localMentalRows] = useState<MentalRow[]>(() => loadMentalRowsFromStorage());

  const mentalRecords = propMentalRecords || localMentalRecords;
  const mentalRows = propMentalRows || localMentalRows;

  // Navigation Year & Month
  const selectedDateStr = propSelectedDate || new Date().toISOString().split('T')[0];
  const initialYear = parseInt(selectedDateStr.split('-')[0], 10) || 2026;
  const initialMonth = parseInt(selectedDateStr.split('-')[1], 10) || 6;

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  const [autoMixedEnabled, setAutoMixedEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('bipolar_auto_mixed_enabled');
    return saved !== 'false';
  });

  const handleToggleAutoMixed = (val: boolean) => {
    setAutoMixedEnabled(val);
    localStorage.setItem('bipolar_auto_mixed_enabled', String(val));
  };

  const [period, setPeriod] = useState<'1w' | '1m' | '3m' | '6m' | '1y'>(() => {
    const saved = localStorage.getItem('bipolar_view_period');
    return (saved as any) || '1m';
  });

  const handlePeriodChange = (newPeriod: '1w' | '1m' | '3m' | '6m' | '1y') => {
    setPeriod(newPeriod);
    localStorage.setItem('bipolar_view_period', newPeriod);
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Find dynamic column ids for indicators to support customized user items
  const moodRow = mentalRows?.find(r => r.id === 'mood' || r.name.includes('気分'));
  const moodRowId = moodRow ? moodRow.id : 'mood';

  const mixedRow = mentalRows?.find(r => r.name.includes('混合状態') || r.id === 'mixed' || r.id === 'mixed_state');
  const mixedRowId = mixedRow ? mixedRow.id : null;

  const anxietyRow = mentalRows?.find(r => r.id === 'anxiety' || r.name.includes('不安') || r.name.includes('緊張'));
  const anxietyRowId = anxietyRow ? anxietyRow.id : 'anxiety';

  const energyRow = mentalRows?.find(r => r.id === 'energy' || r.name.includes('エネルギー'));
  const energyRowId = energyRow ? energyRow.id : 'energy';

  const motivationRow = mentalRows?.find(r => r.id === 'motivation' || r.name.includes('意欲') || r.name.includes('やる気'));
  const motivationRowId = motivationRow ? motivationRow.id : 'motivation';

  // Generate dates array based on selected period with fixed-days logic to prevent "no data" message
  const daysArray: { dateStr: string; displayLabel: string; rawDay: number; month: number }[] = [];

  const getBaseDate = (): Date => {
    const parts = selectedDateStr.split('-');
    const selYear = parseInt(parts[0], 10) || 2026;
    const selMonth = parseInt(parts[1], 10) || 6;
    const selDay = parseInt(parts[2], 10) || 30;
    
    if (selYear === viewYear && selMonth === viewMonth) {
      return new Date(selYear, selMonth - 1, selDay);
    } else {
      return new Date(viewYear, viewMonth, 0);
    }
  };

  const baseDate = getBaseDate();
  let daysCountToInclude = 30;
  if (period === '1w') daysCountToInclude = 7;
  else if (period === '1m') daysCountToInclude = 30;
  else if (period === '3m') daysCountToInclude = 90;
  else if (period === '6m') daysCountToInclude = 180;
  else if (period === '1y') daysCountToInclude = 365;

  for (let i = daysCountToInclude - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const dayNum = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    daysArray.push({
      dateStr,
      displayLabel: `${month}/${dayNum}`,
      rawDay: dayNum,
      month: month
    });
  }

  const totalDaysCount = daysArray.length;

  // Parse actual records for the generated days array
  const rawMonthDays = daysArray.map((dayInfo, index) => {
    const dayRecord = mentalRecords?.[dayInfo.dateStr];
    
    let isMixed = false;
    let mixedSeverity = 1;
    let moodVal: number | undefined = undefined;

    if (dayRecord) {
      // 1. Mood Level
      const rawMood = dayRecord[moodRowId as any];
      if (rawMood !== undefined && rawMood !== null && typeof rawMood === 'number') {
        moodVal = rawMood;
      }

      // 2. Custom manual Mixed state score (priority)
      if (mixedRowId && dayRecord[mixedRowId as any] !== undefined && dayRecord[mixedRowId as any] !== null) {
        const rawVal = Number(dayRecord[mixedRowId as any]);
        if (rawVal >= 1 && rawVal <= 5) {
          isMixed = true;
          mixedSeverity = rawVal;
        }
      }

      // 3. Clinical Rule A Automatic Detection
      if (autoMixedEnabled && !isMixed && moodVal !== undefined && moodVal < 0) {
        const rawEnergy = dayRecord[energyRowId as any];
        const rawMot = dayRecord[motivationRowId as any];
        const rawAnx = dayRecord[anxietyRowId as any];

        const eVal = (rawEnergy !== undefined && rawEnergy !== null && typeof rawEnergy === 'number') ? rawEnergy : 0;
        const mVal = (rawMot !== undefined && rawMot !== null && typeof rawMot === 'number') ? rawMot : 0;
        const aVal = (rawAnx !== undefined && rawAnx !== null && typeof rawAnx === 'number') ? rawAnx : 0;

        const isConflict1 = eVal > 0 || mVal > 0;
        const isConflict2 = aVal >= 3;

        if (isConflict1 || isConflict2) {
          isMixed = true;
          
          if (isConflict1) {
            const activeVal = Math.max(eVal, mVal);
            const moodSev = Math.abs(moodVal);
            const sum = activeVal + moodSev;
            if (sum >= 9) mixedSeverity = 5;
            else if (sum >= 7) mixedSeverity = 4;
            else if (sum >= 5) mixedSeverity = 3;
            else if (sum >= 3) mixedSeverity = 2;
            else mixedSeverity = 1;
          } else {
            const moodSev = Math.abs(moodVal);
            const sum = aVal + moodSev;
            if (sum >= 9) mixedSeverity = 5;
            else if (sum >= 7) mixedSeverity = 4;
            else if (sum >= 5) mixedSeverity = 3;
            else mixedSeverity = 2;
          }
        }
      }
    }

    return {
      index,
      day: dayInfo.rawDay,
      dateStr: dayInfo.dateStr,
      displayLabel: dayInfo.displayLabel,
      month: dayInfo.month,
      value: moodVal,
      isMixed,
      mixedSeverity
    };
  });

  // Calculate shifting for consecutive mixed days to prevent overlay collisions
  let shiftActive = false;
  const currentDataWithMixed = rawMonthDays.map((d) => {
    if (!d.isMixed) {
      shiftActive = false;
      return { ...d, isShifted: false };
    }
    const isShifted = shiftActive;
    shiftActive = !shiftActive; // Alternate consecutive items
    return { ...d, isShifted };
  });

  // Filter actual registered days for plotting lines and points
  const registeredDays = currentDataWithMixed.filter(
    d => d.value !== undefined && d.value !== null
  ) as { index: number; day: number; value: number }[];

  const hasData = registeredDays.length > 0;

  // Dimensions for custom SVG chart
  // Dynamically set svgWidth based on the period and user-configured scale factor for perfect, comfortable, scrollable density
  let baseSvgWidth = 1400; // Default / 3 months
  if (period === '1w') {
    baseSvgWidth = 480; // Compact 1-week view
  } else if (period === '1m') {
    baseSvgWidth = 850; // Neat 1-month view
  } else if (period === '6m') {
    baseSvgWidth = 2400; // Readable 6-month view
  } else if (period === '1y') {
    baseSvgWidth = 4000; // Perfect 1-year view
  }
  const svgWidth = Math.max(300, Math.round(baseSvgWidth * chartScaleFactor));

  const svgHeight = 340;
  const paddingLeft = 6; // Set to extremely small value for maximum high-density, left-aligned layout
  const paddingRight = 6;
  const paddingTop = 25;
  const paddingBottom = 35;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // SVG Coordinates map functions
  const getX = (idx: number) => paddingLeft + idx * (plotWidth / (totalDaysCount - 1 || 1));
  const getY = (val: number) => paddingTop + (5 - val) * (plotHeight / 10);

  // Compute spline path from points
  const points = registeredDays.map(d => ({
    x: getX(d.index),
    y: getY(d.value)
  }));

  const smoothPath = getSmoothBezierPath(points);

  // Y-axis and X-axis ticks
  const yTicks = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];
  
  // Dynamic X Ticks
  const xTicks: { index: number; label: string; isMonthStart: boolean }[] = [];
  if (period === '1w') {
    currentDataWithMixed.forEach((d) => {
      xTicks.push({ index: d.index, label: d.displayLabel, isMonthStart: d.day === 1 });
    });
  } else if (period === '1m') {
    currentDataWithMixed.forEach((d) => {
      if (d.day === 1) {
        xTicks.push({ index: d.index, label: `${d.month}/1`, isMonthStart: true });
      } else if (d.day % 5 === 0) {
        xTicks.push({ index: d.index, label: String(d.day), isMonthStart: false });
      }
    });
  } else if (period === '3m') {
    const monthSet = new Set<number>();
    currentDataWithMixed.forEach((d) => {
      const dObj = new Date(d.dateStr);
      const m = dObj.getMonth() + 1;
      if (d.day === 1) {
        xTicks.push({ index: d.index, label: `${m}/1`, isMonthStart: true });
        monthSet.add(m);
      } else if (d.day === 10 || d.day === 20) {
        xTicks.push({ index: d.index, label: String(d.day), isMonthStart: false });
      }
    });
  } else if (period === '6m') {
    currentDataWithMixed.forEach((d) => {
      const dObj = new Date(d.dateStr);
      const m = dObj.getMonth() + 1;
      if (d.day === 1) {
        xTicks.push({ index: d.index, label: `${m}/1`, isMonthStart: true });
      } else if (d.day === 15) {
        xTicks.push({ index: d.index, label: '15', isMonthStart: false });
      }
    });
  } else if (period === '1y') {
    currentDataWithMixed.forEach((d) => {
      const dObj = new Date(d.dateStr);
      const m = dObj.getMonth() + 1;
      if (d.day === 1) {
        xTicks.push({ index: d.index, label: `${m}月`, isMonthStart: true });
      }
    });
  }

  // Statistics calculation
  let avgMoodStr = '---';
  let maxMoodStr = '---';
  let minMoodStr = '---';
  let rangeMoodStr = '---';
  let mixedDays = 0;
  let depressedDays = 0;
  let manicDays = 0;
  let stableDays = 0;
  const loggedDays = registeredDays.length;
  const rateStr = `${Math.round((loggedDays / totalDaysCount) * 100)}%`;

  if (hasData) {
    const values = registeredDays.map(d => d.value);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / loggedDays;
    avgMoodStr = `${avg >= 0 ? '+' : ''}${avg.toFixed(1)}`;
    
    const max = Math.max(...values);
    maxMoodStr = `${max >= 0 ? '+' : ''}${max}`;
    
    const min = Math.min(...values);
    minMoodStr = `${min >= 0 ? '+' : ''}${min}`;
    
    const range = max - min;
    rangeMoodStr = range.toFixed(1);
    
    stableDays = registeredDays.filter(d => d.value === 0).length;
    manicDays = registeredDays.filter(d => d.value > 0).length;
    depressedDays = registeredDays.filter(d => d.value < 0).length;
    mixedDays = currentDataWithMixed.filter(d => d.isMixed).length;
  }

  // Adjust summary generation message according to period
  const getPeriodLabelJP = () => {
    if (period === '1w') return '1週間';
    if (period === '1m') return '30日';
    if (period === '3m') return '90日';
    if (period === '6m') return '180日';
    return '365日';
  };

  const stats = {
    avg: avgMoodStr,
    max: maxMoodStr,
    min: minMoodStr,
    range: rangeMoodStr,
    mixedDays,
    depressedDays,
    manicDays,
    stableDays,
    loggedDays,
    rate: rateStr,
    memo: hasData 
      ? `表示期間（${getPeriodLabelJP()}）は、合計${loggedDays}日間の気分記録がありました。` +
        `平均気分は${avgMoodStr}（最高値: ${maxMoodStr} / 最低値: ${minMoodStr}）で、気分の変動幅は${rangeMoodStr}でした。` +
        `そのうち、安定域（0）は${stableDays}日間、躁・軽躁状態は${manicDays}日間、うつ・軽うつ状態は${depressedDays}日間でした。` +
        (mixedDays > 0 ? `また、混合状態（M）の兆候が${mixedDays}日間検知されました。混合状態の日は、無理を避けて心身を休めるよう心がけてください。` : '期間中、混合状態（M）の検知はありませんでした。非常に安定した状態が保てています。')
      : `表示期間（${getPeriodLabelJP()}）の記録がありません。メンタルタブから日々の気分を記録してください。`
  };

  return (
    <div className="flex flex-col gap-4 p-3 select-none overflow-y-auto max-w-full pb-8" id="bipolar-report-container">
      
      {/* A. Month Selector Navigation (Styled exactly like Summary Date Navigator) */}
      <div className={`p-4 rounded-2xl border ${
        isDark 
          ? 'bg-[#211F24] border-[#49454F] text-[#E6E1E5]' 
          : 'bg-slate-50 border-slate-200 text-slate-800'
      } flex items-center justify-center gap-6 py-2.5 shadow-xs`} id="report-title-card">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-sky-400 cursor-pointer"
          aria-label="前の月"
        >
          <span className="text-base font-black">◀</span>
        </button>
        
        <span
          className={`text-[13.5px] sm:text-[15px] font-black tracking-wide cursor-pointer hover:opacity-90 px-3.5 py-1.5 rounded-full transition-all active:scale-95 select-none shadow-xs ${
            isDark ? 'bg-[#25232A] border border-[#49454F] text-[#e3e2e6]' : 'bg-[#1A2F4C] text-white'
          }`}
        >
          {viewYear}年{viewMonth}月
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-sky-400 cursor-pointer"
          aria-label="次の月"
        >
          <span className="text-base font-black">▶</span>
        </button>
      </div>

      {/* B. Core Smooth Line Mood Chart Card */}
      <div className={`p-3.5 rounded-2xl border ${
        isDark ? 'bg-[#211F24] border-[#49454F]' : 'bg-white border-slate-200'
      } shadow-xs flex flex-col gap-3`} id="mood-chart-card">
        
        {/* 表示期間切替ボタン（グラフ上段に配置） */}
        <div className="flex flex-col gap-1 px-1 mb-1" id="report-period-selector-container">
          <span className={`text-[10.5px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            📅 表示期間
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {[
              { id: '1w', label: '1週間' },
              { id: '1m', label: '30日' },
              { id: '3m', label: '90日' },
              { id: '6m', label: '180日' },
              { id: '1y', label: '365日' }
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePeriodChange(p.id as any)}
                  className={`text-[11px] font-black px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    isActive
                      ? (isDark 
                        ? 'bg-[#FFD835] border-[#FFD835] text-slate-900 shadow-sm' 
                        : 'bg-blue-600 border-blue-600 text-white shadow-sm')
                      : (isDark 
                        ? 'bg-[#1C1B1F] border-[#49454F] text-[#CAC4D0] hover:bg-slate-800/50' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100')
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 border-t pt-2 border-slate-200/50 dark:border-[#49454F]/30">
          <div className="flex items-center gap-1.5">
            <Activity className={`h-4.5 w-4.5 ${isDark ? 'text-[#FFD835]' : 'text-blue-600'}`} />
            <span className={`text-[13.5px] font-black ${isDark ? 'text-[#E6E1E5]' : 'text-slate-800'}`}>
              気分の推移
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isDark ? 'bg-[#1C1B1F] text-[#FFD835]' : 'bg-slate-150 text-slate-700'
          }`}>
            {period === '1w' ? '1週間表示' : period === '1m' ? '30日表示' : period === '3m' ? '90日表示' : period === '6m' ? '180日表示' : '365日表示'}
          </span>
        </div>

        {/* If no data, render friendly placeholder screen */}
        {!hasData ? (
          <div className={`w-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed ${
            isDark ? 'bg-[#1C1B1F]/40 border-[#49454F]/60' : 'bg-slate-50 border-slate-200'
          }`} id="chart-no-data-placeholder">
            <Info className={`h-12 w-12 mb-3 animate-pulse ${isDark ? 'text-[#FFD835]/80' : 'text-blue-500/80'}`} />
            <p className={`text-sm sm:text-base font-black leading-relaxed max-w-sm ${
              isDark ? 'text-[#E6E1E5]' : 'text-slate-800'
            }`}>
              データがありません。
            </p>
            <p className={`text-xs mt-1 leading-relaxed max-w-sm ${
              isDark ? 'text-[#CAC4D0]' : 'text-slate-500'
            }`}>
              メンタルタブから毎日の気分を記録してください。
            </p>
          </div>
        ) : (
          <div className="w-full relative flex rounded-xl overflow-hidden" id="svg-chart-container-root">
            {/* 左側：固定Y軸カラム（スクロールしない、常に視認可能） */}
            <div className={`w-[32px] shrink-0 sticky left-0 z-10 border-r transition-colors duration-150 flex items-center justify-center ${
              isDark 
                ? 'bg-[#211F24] border-[#49454F]/40 shadow-[4px_0_8px_rgba(0,0,0,0.25)]' 
                : 'bg-white border-slate-200/60 shadow-[4px_0_8px_rgba(0,0,0,0.05)]'
            }`} id="fixed-y-axis-container">
              <svg viewBox="0 0 32 340" className="w-[32px] h-[340px] overflow-visible select-none">
                <line 
                  x1={32} 
                  y1={paddingTop} 
                  x2={32} 
                  y2={paddingTop + plotHeight} 
                  stroke={isDark ? 'rgba(73, 69, 79, 0.4)' : '#e2e8f0'} 
                  strokeWidth={1}
                />
                
                {/* Y-Axis Labels */}
                {yTicks.map((tick) => {
                  const yPos = getY(tick);
                  return (
                    <text 
                      key={`fixed-y-label-${tick}`}
                      x={25} 
                      y={yPos + 4} 
                      textAnchor="end" 
                      fontSize="11px" 
                      fontWeight="900"
                      className="font-mono"
                      fill={tick > 0 
                        ? (isDark ? '#F2B8B5' : '#b91c1c') 
                        : tick < 0 
                          ? (isDark ? '#94A3B8' : '#1e3a8a') 
                          : (isDark ? '#81C784' : '#15803d')
                      }
                    >
                      {tick > 0 ? `+${tick}` : tick}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* 右側：スクロールするメイングラフ（Y軸ラベルを省き、描画エリアを最大化） */}
            <div className="flex-1 overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-[#49454F]" id="svg-chart-scroll-wrapper">
              <div style={{ width: `${svgWidth}px` }} className="min-w-full">
                <svg 
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                  className="w-full h-auto overflow-visible select-none"
                  id="bipolar-mood-svg"
                >
                  {/* 1. Translucent Background Bands representing Mood States */}
                  {/* Band 1: +3 to +5: 躁状態 */}
                  <rect 
                    x={0} 
                    y={getY(5)} 
                    width={svgWidth} 
                    height={getY(3) - getY(5)} 
                    fill={isDark ? 'rgba(242, 184, 181, 0.08)' : 'rgba(186, 26, 26, 0.05)'} 
                  />

                  {/* Band 2: +1 to +2: 軽躁 */}
                  <rect 
                    x={0} 
                    y={getY(3)} 
                    width={svgWidth} 
                    height={getY(1) - getY(3)} 
                    fill={isDark ? 'rgba(255, 179, 124, 0.06)' : 'rgba(224, 102, 0, 0.04)'} 
                  />

                  {/* Band 3: 0: 安定 */}
                  <rect 
                    x={0} 
                    y={getY(1)} 
                    width={svgWidth} 
                    height={getY(-1) - getY(1)} 
                    fill={isDark ? 'rgba(115, 230, 160, 0.06)' : 'rgba(56, 107, 72, 0.04)'} 
                  />

                  {/* Band 4: -1 to -2: 軽うつ */}
                  <rect 
                    x={0} 
                    y={getY(-1)} 
                    width={svgWidth} 
                    height={getY(-3) - getY(-1)} 
                    fill={isDark ? 'rgba(168, 219, 255, 0.06)' : 'rgba(0, 102, 139, 0.04)'} 
                  />

                  {/* Band 5: -3 to -5: うつ */}
                  <rect 
                    x={0} 
                    y={getY(-3)} 
                    width={svgWidth} 
                    height={getY(-5) - getY(-3)} 
                    fill={isDark ? 'rgba(202, 196, 255, 0.08)' : 'rgba(81, 47, 186, 0.04)'} 
                  />

                  {/* 2. Horizontal Grid Lines */}
                  {yTicks.map((tick) => {
                    const yPos = getY(tick);
                    const isZero = tick === 0;
                    return (
                      <line 
                        key={`grid-y-${tick}`}
                        x1={0} 
                        y1={yPos} 
                        x2={svgWidth} 
                        y2={yPos} 
                        stroke={isZero 
                          ? (isDark ? '#e3e2e6' : '#334155') 
                          : (isDark ? '#49454F' : '#e2e8f0')
                        } 
                        strokeWidth={isZero ? 1.5 : 0.6}
                        strokeDasharray={isZero ? undefined : '3,3'}
                      />
                    );
                  })}

                  {/* 3. X-Axis Ticks & Labels */}
                  {xTicks.map((tick, tIdx) => {
                    const xPos = getX(tick.index);
                    return (
                      <g key={`tick-x-${tIdx}`}>
                        <line 
                          x1={xPos} 
                          y1={paddingTop + plotHeight} 
                          x2={xPos} 
                          y2={paddingTop + plotHeight + 4} 
                          stroke={isDark ? '#CAC4D0' : '#64748b'} 
                          strokeWidth={1}
                        />
                        <text 
                          x={xPos} 
                          y={paddingTop + plotHeight + 18} 
                          textAnchor="middle" 
                          fontSize="11.5px" 
                          fontWeight="900"
                          className="font-mono"
                          fill={isDark ? '#CAC4D0' : '#475569'}
                        >
                          {tick.label}
                        </text>
                      </g>
                    );
                  })}
                  {/* "日" Label */}
                  <text 
                    x={svgWidth - 12} 
                    y={paddingTop + plotHeight + 18} 
                    textAnchor="end" 
                    fontSize="11px" 
                    fontWeight="900"
                    fill={isDark ? '#CAC4D0' : '#475569'}
                  >
                    {period === '1m' ? '(30日分)' : ''}
                  </text>

                  {/* 4. Smooth Spline Path Line */}
                  <path 
                    d={smoothPath} 
                    fill="none" 
                    stroke={isDark ? '#90CAF9' : '#2563eb'} 
                    strokeWidth={3} 
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />

                  {/* 5. Data Points Circles */}
                  {points.map((pt, idx) => (
                    <circle 
                      key={`pt-${idx}`} 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={4} 
                      fill={isDark ? '#90CAF9' : '#2563eb'} 
                      stroke={isDark ? '#1C1B1F' : '#ffffff'} 
                      strokeWidth={1.5} 
                      className="transition-all duration-300"
                    />
                  ))}

                  {/* 6. Dynamic "Mixed State M" Badges with alternating height offsets */}
                  {currentDataWithMixed.map((d, idx) => {
                    if (!d.isMixed) return null;
                    
                    const badgeYVal = d.value !== undefined ? d.value : 0;
                    const ptX = getX(d.index);
                    const ptY = getY(badgeYVal);
                    
                    const colors = getMixedBadgeColors(d.mixedSeverity, isDark);
                    
                    // Use shifted heights to prevent overlap of adjacent text labels
                    const yLineEnd = d.isShifted ? ptY - 28 : ptY - 12;
                    const yRectTop = d.isShifted ? ptY - 43 : ptY - 27;
                    const yText = d.isShifted ? ptY - 32 : ptY - 16;
                    
                    return (
                      <g key={`m-badge-${idx}`} className="transition-all duration-300">
                        {/* Connecting line */}
                        <line 
                          x1={ptX} 
                          y1={ptY} 
                          x2={ptX} 
                          y2={yLineEnd} 
                          stroke={colors.stroke} 
                          strokeWidth={1.2} 
                        />
                        {/* Rounded badge block */}
                        <rect 
                          x={ptX - 11} 
                          y={yRectTop} 
                          width={22} 
                          height={15} 
                          rx={3} 
                          fill={colors.fill} 
                          stroke={colors.stroke} 
                          strokeWidth={1} 
                        />
                        {/* 'M' Letter + Severity level (M1-M5) inside */}
                        <text 
                          x={ptX} 
                          y={yText} 
                          textAnchor="middle" 
                          fontSize="9.5px" 
                          fontWeight="900" 
                          fill={colors.text}
                        >
                          M{d.mixedSeverity}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Switch for Auto-Detected Mixed States */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
          isDark ? 'bg-[#1D1B20] border-[#49454F]/70' : 'bg-slate-50 border-slate-200'
        }`} id="auto-mixed-toggle-container">
          <div className="flex flex-col gap-0.5 select-none">
            <span className={`text-xs font-black ${isDark ? 'text-[#E6E1E5]' : 'text-slate-800'}`}>
              混合状態
            </span>
            <span className={`text-[10px] font-bold ${isDark ? 'text-[#CAC4D0]' : 'text-slate-500'}`}>
              オン：自動検知を有効化 / オフ：手動登録のみ表示
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggleAutoMixed(!autoMixedEnabled)}
            className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoMixedEnabled 
                ? (isDark ? 'bg-[#FFD835]' : 'bg-blue-600') 
                : (isDark ? 'bg-[#49454F]' : 'bg-slate-300')
            }`}
            role="switch"
            aria-checked={autoMixedEnabled}
            id="mixed-state-auto-toggle-btn"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                autoMixedEnabled ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 7. Beautiful Legend section */}
        <div className={`mt-1 p-3 rounded-xl ${
          isDark ? 'bg-[#1C1B1F]/60' : 'bg-slate-50'
        } grid grid-cols-2 xs:grid-cols-3 gap-x-2 gap-y-2 select-none`} id="chart-legends">
          {/* 判定基準の数値目安（注記） */}
          <div className="col-span-2 xs:col-span-3 pb-2 mb-1 border-b border-slate-200 dark:border-[#49454F]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] font-black tracking-tight text-slate-500 dark:text-slate-400 gap-1">
            <span>📝 判定基準の数値目安：</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="w-3.5 h-3.5 rounded border border-red-400 bg-red-400/25 shrink-0" />
            <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>躁状態 (+3〜+5)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="w-3.5 h-3.5 rounded border border-orange-400 bg-orange-400/25 shrink-0" />
            <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>軽躁状態 (+1〜+2)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="w-3.5 h-3.5 rounded border border-green-400 bg-green-400/25 shrink-0" />
            <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>安定域 (0)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="w-3.5 h-3.5 rounded border border-sky-400 bg-sky-400/25 shrink-0" />
            <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>軽うつ状態 (-1〜-2)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="w-3.5 h-3.5 rounded border border-purple-400 bg-purple-400/25 shrink-0" />
            <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>うつ状態 (-3〜-5)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="w-3.5 h-3.5 rounded border border-[#94A3B8] bg-slate-400/20 flex items-center justify-center text-[8px] font-black text-[#CAC4D0] shrink-0">
              M
            </span>
            <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>混合状態 (M1〜M5)</span>
          </div>

          {/* M Badge color codes explaining severity levels (1 to 5) */}
          <div className="flex flex-col gap-1 col-span-2 xs:col-span-3 mt-1 pt-1.5 border-t border-slate-200 dark:border-[#49454F]/50">
            <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              混合状態 (M1〜M5) の強さ表示:
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className="w-3.5 h-3.5 rounded border border-[#94A3B8] bg-slate-400/20 flex items-center justify-center text-[8px] font-black text-[#94A3B8]" />
                <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>M1〜M2 (軽度)</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className="w-3.5 h-3.5 rounded border border-[#FFB74D] bg-orange-400/20 flex items-center justify-center text-[8px] font-black text-[#FFB74D]" />
                <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>M3〜M4 (中等度)</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className="w-3.5 h-3.5 rounded border border-[#F2B8B5] bg-red-400/20 flex items-center justify-center text-[8px] font-black text-[#F2B8B5]" />
                <span className={isDark ? 'text-[#CAC4D0]' : 'text-slate-700'}>M5 (重度)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* C. Monthly Summary Bento Cards Area */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#211F24] border-[#49454F]' : 'bg-slate-50 border-slate-200'
      } flex flex-col gap-3.5 shadow-xs`} id="monthly-summary-container">
        
        <div className="flex items-center gap-1.5 border-b border-slate-300 dark:border-[#49454F] pb-2">
          <Calendar className={`h-4.5 w-4.5 ${isDark ? 'text-[#FFD835]' : 'text-blue-600'}`} />
          <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-[#E6E1E5]' : 'text-slate-800'}`}>
            月間サマリー
          </h3>
        </div>

        {/* 2-Column Responsive Grid of Bento Cards */}
        <div className="grid grid-cols-2 gap-2.5" id="summary-bento-grid">
          
          {/* Average Mood Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              平均気分
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Smile className="h-5 w-5 text-sky-400" />
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-sky-400 leading-none">
                {stats.avg}
              </span>
            </div>
          </div>

          {/* Highest Mood Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              最高値
            </span>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-5 w-5 text-rose-400" />
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-rose-400 leading-none">
                {stats.max}
              </span>
            </div>
          </div>

          {/* Lowest Mood Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              最低値
            </span>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="h-5 w-5 text-indigo-400" />
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-indigo-400 leading-none">
                {stats.min}
              </span>
            </div>
          </div>

          {/* Fluctuation Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              変動幅
            </span>
            <div className="flex items-center gap-1 mt-1">
              <Activity className="h-5 w-5 text-purple-400" />
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-purple-400 leading-none">
                {stats.range}
              </span>
            </div>
          </div>

          {/* Mixed State Days Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              混合状態の日数
            </span>
            <div className="flex items-baseline mt-1 gap-0.5">
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-orange-400 leading-none">
                {stats.mixedDays}
              </span>
              <span className={`text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>日</span>
            </div>
          </div>

          {/* Depressive Days Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              うつ・軽うつ日数
            </span>
            <div className="flex items-baseline mt-1 gap-0.5">
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-blue-400 leading-none">
                {stats.depressedDays}
              </span>
              <span className={`text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>日</span>
            </div>
          </div>

          {/* Manic Days Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              躁・軽躁日数
            </span>
            <div className="flex items-baseline mt-1 gap-0.5">
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-rose-400 leading-none">
                {stats.manicDays}
              </span>
              <span className={`text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>日</span>
            </div>
          </div>

          {/* Stable Days Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              安定域の日数
            </span>
            <div className="flex items-baseline mt-1 gap-0.5">
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-emerald-400 leading-none">
                {stats.stableDays}
              </span>
              <span className={`text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>日</span>
            </div>
          </div>

          {/* Logged Days Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              記録日数
            </span>
            <div className="flex items-baseline mt-1 gap-0.5">
              <span className={`text-[20px] sm:text-[22px] font-mono font-black ${isDark ? 'text-[#FFD835]' : 'text-slate-800'} leading-none`}>
                {stats.loggedDays}
              </span>
              <span className={`text-[11px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>日</span>
            </div>
          </div>

          {/* Logging Rate Card */}
          <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-[11px] sm:text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              記録率
            </span>
            <div className="flex items-baseline mt-1 gap-0.5">
              <span className="text-[20px] sm:text-[22px] font-mono font-black text-teal-400 leading-none">
                {stats.rate}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* D. Memo Panel (Compassionate Dynamic Clinician Report Narrative) */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#211F24] border-[#49454F]' : 'bg-white border-slate-200'
      } flex flex-col gap-2.5 shadow-xs`} id="memo-container">
        <div className="flex items-center gap-1.5 border-b border-slate-300 dark:border-[#49454F] pb-1.5">
          <ChevronRight className={`h-4.5 w-4.5 ${isDark ? 'text-[#FFD835]' : 'text-blue-600'}`} />
          <h4 className={`text-sm sm:text-base font-black ${isDark ? 'text-[#E6E1E5]' : 'text-slate-800'}`}>
            医師診察用メモ・記録サマリー
          </h4>
        </div>
        <p className={`text-[12.5px] sm:text-[13.5px] leading-relaxed font-black ${
          isDark ? 'text-[#CAC4D0]' : 'text-slate-600'
        }`}>
          {stats.memo}
        </p>
        
        {/* Footnote on Mixed state */}
        <div className={`mt-2 p-2.5 rounded-xl border flex items-start gap-2 ${
          isDark ? 'bg-[#1D1B20] border-[#49454F]/70 text-[#CAC4D0]' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`} id="mixed-state-footnote">
          <AlertTriangle className="h-4.5 w-4.5 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-black">M : 混合状態 (Mixed State)</span>
            <span className="text-[10px] font-black opacity-85 leading-normal">
              気分が高揚する「躁状態」と、気分が沈み込む「うつ状態」の症状が同時に、または目まぐるしく入れ替わりながら現れる状態を示します。M1からM5の数値は症状の強さ（軽度から重度）を表しています。
            </span>
          </div>
        </div>
      </div>

      {/* E. Material Design 3 Printable / Future Features Section */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#211F24]/70 border-[#49454F]' : 'bg-slate-50 border-slate-200'
      } flex flex-col gap-3 shadow-xs`} id="future-extension-container">
        
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h4 className={`text-[13px] font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            レポート機能（今後の拡張）
          </h4>
        </div>

        {/* Disabled display duration selector */}
        <div className="flex flex-col gap-1 px-1">
          <span className={`text-[10.5px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            📅 表示期間切替
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {['1週間', '30日', '90日', '365日'].map((period, i) => (
              <span 
                key={i} 
                className={`text-[10.5px] font-black px-2.5 py-1 rounded border opacity-50 ${
                  isDark ? 'bg-[#1C1B1F] border-[#49454F] text-[#CAC4D0]' : 'bg-white border-slate-200 text-slate-500'
                } ${period === '30日' ? 'opacity-100 font-bold border-[#FFD835]' : ''}`}
              >
                {period}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className={`p-2.5 rounded-xl border flex flex-col gap-1 opacity-60 ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-1">
              <ZoomIn className="h-3.5 w-3.5 text-sky-400" />
              <span className={`text-[11.5px] font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                ピンチズーム機能
              </span>
            </div>
            <span className={`text-[9.5px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              スマホ画面でグラフを拡大縮小
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col gap-1 opacity-60 ${
            isDark ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              <span className={`text-[11.5px] font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                診察レポート PDF印刷
              </span>
            </div>
            <span className={`text-[9.5px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              持参して主治医に見せられる印刷機能
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
