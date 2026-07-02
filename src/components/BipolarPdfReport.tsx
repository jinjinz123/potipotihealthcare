import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Calendar, 
  Info, 
  Sparkles, 
  FileText, 
  Smile, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { DailyRecords, MentalRow } from '../types';
import { loadMentalRowsFromStorage, loadMentalRecordsFromStorage } from '../utils';
import { MoodTrendGraph, ActivityEnergyGraph, ClinicalDataTable } from './EmbeddedComponents';
import ReportBlockItem from './ReportBlockItem';

interface BipolarPdfReportProps {
  displayMode?: 'vivid' | 'soft' | 'dark';
  mentalRows?: MentalRow[];
  mentalRecords?: DailyRecords;
  selectedDate?: string;
  chartScaleFactor?: number;
  showToast?: (msg: string) => void;
  onBack?: () => void;
  isManualMode?: boolean;
  manualBlocks?: any[];
  records?: DailyRecords;
  actualSleepRecords?: DailyRecords;
  actualSleepStamps?: any[];
  transitionSource?: 'editor' | 'viewer';
}

interface Point {
  x: number;
  y: number;
}

// 3次ベジェ曲線の補間点を計算するヘルパー（PDF描画用）
// 点のリストをなめらかに補間した100個の点の配列にして返す
function interpolateBezierPoints(points: Point[], stepsPerSegment: number = 20): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0]];

  const result: Point[] = [points[0]];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Smooth S-curve control points
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    
    for (let step = 1; step <= stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      const mt = 1 - t;
      
      // Bezier formula
      const x = mt * mt * mt * p0.x + 
                3 * mt * mt * t * cpX1 + 
                3 * mt * t * t * cpX2 + 
                t * t * t * p1.x;
                
      const y = mt * mt * mt * p0.y + 
                3 * mt * mt * t * cpY1 + 
                3 * mt * t * t * cpY2 + 
                t * t * t * p1.y;
                
      result.push({ x, y });
    }
  }
  
  return result;
}

export default function BipolarPdfReport({ 
  displayMode = 'vivid',
  mentalRows: propMentalRows,
  mentalRecords: propMentalRecords,
  selectedDate: propSelectedDate,
  chartScaleFactor = 0.6,
  showToast,
  onBack,
  isManualMode = false,
  manualBlocks = [],
  records = {},
  actualSleepRecords = {},
  actualSleepStamps = [],
  transitionSource = 'viewer'
}: BipolarPdfReportProps) {
  
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

  const [period, setPeriod] = useState<'1w' | '1m' | '3m' | '6m' | '1y'>(() => {
    const saved = localStorage.getItem('bipolar_view_period');
    return (saved as any) || '1m';
  });

  const [patientName, setPatientName] = useState<string>(() => {
    return localStorage.getItem('pochilog_bipolar_patient_name') || '';
  });
  const [doctorName, setDoctorName] = useState<string>(() => {
    return localStorage.getItem('pochilog_bipolar_doctor_name') || '';
  });

  // 手動で編集・追記できるメモ
  const [customMemo, setCustomMemo] = useState<string>(() => {
    return localStorage.getItem(`pochilog_bipolar_custom_memo_${viewYear}_${viewMonth}`) || '';
  });

  // viewMonth や viewYear が変わったら該当月の保存メモをロード
  useEffect(() => {
    const key = `pochilog_bipolar_custom_memo_${viewYear}_${viewMonth}`;
    setCustomMemo(localStorage.getItem(key) || '');
  }, [viewYear, viewMonth]);

  const handleCustomMemoChange = (val: string) => {
    setCustomMemo(val);
    localStorage.setItem(`pochilog_bipolar_custom_memo_${viewYear}_${viewMonth}`, val);
  };

  const handlePatientNameChange = (val: string) => {
    setPatientName(val);
    localStorage.setItem('pochilog_bipolar_patient_name', val);
  };

  const handleDoctorNameChange = (val: string) => {
    setDoctorName(val);
    localStorage.setItem('pochilog_bipolar_doctor_name', val);
  };

  const handlePeriodChange = (newPeriod: '1w' | '1m' | '3m' | '6m' | '1y') => {
    setPeriod(newPeriod);
    localStorage.setItem('bipolar_view_period', newPeriod);
  };

  const [paddingTopBottom, setPaddingTopBottom] = useState<number>(() => {
    const saved = localStorage.getItem('bipolar_pdf_padding_tb');
    if (saved) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? 15 : parsed;
    }
    return 15;
  });
  const [paddingLeftRight, setPaddingLeftRight] = useState<number>(() => {
    const saved = localStorage.getItem('bipolar_pdf_padding_lr');
    if (saved) {
      const parsed = parseInt(saved, 10);
      return isNaN(parsed) ? 15 : parsed;
    }
    return 15;
  });

  const handlePaddingTbChange = (val: number) => {
    setPaddingTopBottom(val);
    localStorage.setItem('bipolar_pdf_padding_tb', String(val));
  };

  const handlePaddingLrChange = (val: number) => {
    setPaddingLeftRight(val);
    localStorage.setItem('bipolar_pdf_padding_lr', String(val));
  };

  const [pdfFileName, setPdfFileName] = useState<string>('pochilog_report.pdf');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [fontLoadingStatus, setFontLoadingStatus] = useState<string>('');

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

  // Generate dates array based on selected period
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

  // Calculate shifting for consecutive mixed days
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

  // UI (HTML/CSS) Preview Chart Sizing
  const svgWidth = 720;
  const svgHeight = 260;
  const paddingLeft = 15;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + idx * (plotWidth / (totalDaysCount - 1 || 1));
  const getY = (val: number) => paddingTop + (5 - val) * (plotHeight / 10);

  // Generate Bezier path string for HTML SVG Preview
  const points = registeredDays.map(d => ({
    x: getX(d.index),
    y: getY(d.value)
  }));

  // cubic bezier helper for UI preview SVG
  let splinePath = '';
  if (points.length > 0) {
    splinePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      splinePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Y-axis ticks
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
    currentDataWithMixed.forEach((d) => {
      const dObj = new Date(d.dateStr);
      const m = dObj.getMonth() + 1;
      if (d.day === 1) {
        xTicks.push({ index: d.index, label: `${m}/1`, isMonthStart: true });
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
      if (d.day === 1) {
        const dObj = new Date(d.dateStr);
        const m = dObj.getMonth() + 1;
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
  const rateStr = totalDaysCount > 0 ? `${Math.round((loggedDays / totalDaysCount) * 100)}%` : '0%';

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

  const getPeriodLabelJP = () => {
    if (period === '1w') return '1週間';
    if (period === '1m') return '30日';
    if (period === '3m') return '90日';
    if (period === '6m') return '180日';
    return '365日';
  };

  // 自動生成されるサマリーテキスト
  const autoSummaryText = hasData 
    ? `表示期間（${getPeriodLabelJP()}）は、合計${loggedDays}日間の気分記録がありました。` +
      `平均気分は${avgMoodStr}（最高値: ${maxMoodStr} / 最低値: ${minMoodStr}）で、気分の変動幅は${rangeMoodStr}でした。` +
      `そのうち、安定域（0）は${stableDays}日間、躁・軽躁状態は${manicDays}日間、うつ・軽うつ状態は${depressedDays}日間でした。` +
      (mixedDays > 0 ? `また、混合状態（M）の兆候が${mixedDays}日間検知されました。混合状態の日は、焦燥感や衝動性が生じやすいため、無理を避けて心身を休めるよう心がけてください。` : '期間中、混合状態（M）の検知はありませんでした。非常に安定したリズムが保てています。')
    : `表示期間（${getPeriodLabelJP()}）の記録がありません。メンタルタブから日々の気分を記録してください。`;

  const statsCards = [
    { title: "平均気分", value: avgMoodStr, unit: "レベル", desc: "期間中の加重平均値" },
    { title: "気分最高値", value: maxMoodStr, unit: "レベル", desc: "期間中の最高記録" },
    { title: "気分最低値", value: minMoodStr, unit: "レベル", desc: "期間中の最低記録" },
    { title: "気分の変動幅", value: rangeMoodStr, unit: "レベル", desc: "最高値と最低値の差" },
    { title: "記録率", value: rateStr, unit: "割合", desc: "日数に対する記録数" },
    { title: "安定域日数", value: String(stableDays), unit: "日", desc: "気分 0 (平穏) の日数" },
    { title: "躁・軽躁日数", value: String(manicDays), unit: "日", desc: "気分 +1 以上の活動日数" },
    { title: "うつ・軽うつ日数", value: String(depressedDays), unit: "日", desc: "気分 -1 以下の停滞日数" },
    { title: "混合状態日数", value: String(mixedDays), unit: "日", desc: "躁うつ混在・葛藤日数" },
    { title: "有効記録日数", value: `${loggedDays} / ${totalDaysCount}`, unit: "日", desc: "実際にポチポチした日数" }
  ];

  // Mバッジのカラー情報
  function getMixedBadgeColorsHex(severity: number) {
    if (severity === 5) {
      return { fill: '#FEE2E2', stroke: '#EF4444', text: '#B91C1C' }; // 重度
    } else if (severity === 3 || severity === 4) {
      return { fill: '#FFEDD5', stroke: '#F97316', text: '#C2410C' }; // 中等度
    } else {
      return { fill: '#F1F5F9', stroke: '#64748B', text: '#334155' }; // 軽度
    }
  }

  // ==========================================
  // 【最重要】jsPDFによる直接ベクターPDF出力
  // ==========================================
  const handleExportVectorPDF = async () => {
    setIsExporting(true);
    setFontLoadingStatus('⏳ Noto Sans JP フォントをダウンロードしています...');
    if (showToast) {
      showToast('⏳ 高精度ベクターPDFを生成しています。しばらくお待ちください...');
    }

    try {
      // 1. jsPDF インスタンスの生成 (A4: 210mm × 297mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 2. 日本語フォント (Noto Sans JP) の動的 fetch & 登録
      const fontUrl = "https://cdn.jsdelivr.net/npm/@bokuweb/zstd-wasm@0.0.20/tests/fonts/NotoSansJP-Regular.ttf";
      const fontRes = await fetch(fontUrl);
      if (!fontRes.ok) throw new Error("Font fetch failed");
      const arrayBuffer = await fontRes.arrayBuffer();
      
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const len = bytes.byteLength;
      // 効率的なチャンク処理でBase64化（巨大配列のStackOverflowを防止）
      const chunkSize = 65536;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk as any);
      }
      const fontBase64 = btoa(binary);

      doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64);
      doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
      doc.setFont("NotoSansJP");
      
      setFontLoadingStatus('📄 ベクター要素を描画しています...');

      // 3. A4 寸法の定義 (すべてミリメートル単位で正確に計算)
      const PAGE_WIDTH = 210;
      const PAGE_HEIGHT = 297;
      const MARGIN_LEFT = paddingLeftRight;
      const MARGIN_RIGHT = paddingLeftRight;
      const MARGIN_TOP = paddingTopBottom;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 動的計算

      // ヘルパー：線を描画
      const drawLine = (x1: number, y1: number, x2: number, y2: number, w = 0.2, r = 200, g = 200, b = 200) => {
        doc.setLineWidth(w);
        doc.setDrawColor(r, g, b);
        doc.line(x1, y1, x2, y2);
      };

      // ヘルパー：矩形を描画
      const drawRect = (x: number, y: number, w: number, h: number, fillR: number, fillG: number, fillB: number, borderR?: number, borderG?: number, borderB?: number, borderW = 0.2) => {
        doc.setFillColor(fillR, fillG, fillB);
        if (borderR !== undefined) {
          doc.setDrawColor(borderR, borderG, borderB);
          doc.setLineWidth(borderW);
          doc.rect(x, y, w, h, 'FD');
        } else {
          doc.rect(x, y, w, h, 'F');
        }
      };

      // ==========================================
      // ① ヘッダーセクション (Title, Names, Border)
      // ==========================================
      if (isManualMode) {
        // --- 手動デザインブロックのミリメートル換算高精度ベクター描画 ---
        const MM_PER_PX_X = 210 / 780;
        const MM_PER_PX_Y = 297 / 1100;

        const getBlockMM = (b: any) => {
          const sCol = typeof b.startCol === 'number' ? b.startCol : (parseInt(b.startCol, 10) || 0);
          const eCol = typeof b.endCol === 'number' ? b.endCol : (parseInt(b.endCol, 10) || 0);
          const sRow = typeof b.startRow === 'number' ? b.startRow : (parseInt(b.startRow, 10) || 0);
          const eRow = typeof b.endRow === 'number' ? b.endRow : (parseInt(b.endRow, 10) || 0);

          const leftPx = sCol * 20;
          const topPx = sRow * 20;
          const widthPx = (eCol - sCol + 1) * 20;
          const heightPx = (eRow - sRow + 1) * 20;

          const origLeftMm = leftPx * MM_PER_PX_X;
          const origTopMm = topPx * MM_PER_PX_Y;
          const origWidthMm = widthPx * MM_PER_PX_X;
          const origHeightMm = heightPx * MM_PER_PX_Y;

          const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP * 2;

          return {
            left: MARGIN_LEFT + origLeftMm * (CONTENT_WIDTH / PAGE_WIDTH),
            top: MARGIN_TOP + origTopMm * (CONTENT_HEIGHT / PAGE_HEIGHT),
            width: origWidthMm * (CONTENT_WIDTH / PAGE_WIDTH),
            height: origHeightMm * (CONTENT_HEIGHT / PAGE_HEIGHT)
          };
        };

        manualBlocks.forEach((block) => {
          const { left, top, width, height } = getBlockMM(block);

          // 背景（白）と極薄枠線（0.15mm）
          drawRect(left, top, width, height, 255, 255, 255, 226, 232, 240, 0.15);

          if (block.type === 'component') {
            if (block.componentType === 'mood') {
              // --- 気分変動推移グラフのミリメートル描画 ---
              const chartX = left;
              const chartY = top;
              const chartWidth = width;
              const chartHeight = height;

              const graphPaddingLeft = Math.max(4, chartWidth * 0.08);
              const graphPaddingRight = Math.max(4, chartWidth * 0.08);
              const graphPaddingTop = Math.max(4, chartHeight * 0.12);
              const graphPaddingBottom = Math.max(4, chartHeight * 0.15);

              const graphPlotWidth = chartWidth - graphPaddingLeft - graphPaddingRight;
              const graphPlotHeight = chartHeight - graphPaddingTop - graphPaddingBottom;

              const getPdfX = (idx: number) => chartX + graphPaddingLeft + idx * (graphPlotWidth / (totalDaysCount - 1 || 1));
              const getPdfY = (val: number) => chartY + graphPaddingTop + (5 - val) * (graphPlotHeight / 10);

              const drawBand = (yStartVal: number, yEndVal: number, r: number, g: number, b: number, a: number) => {
                const yStart = getPdfY(yStartVal);
                const yEnd = getPdfY(yEndVal);
                const mix = (c: number) => Math.round(c * a + 255 * (1 - a));
                doc.setFillColor(mix(r), mix(g), mix(b));
                doc.rect(chartX + graphPaddingLeft, yStart, graphPlotWidth, yEnd - yStart, 'F');
              };

              drawBand(5, 3, 186, 26, 26, 0.04);
              drawBand(3, 1, 224, 102, 0, 0.03);
              drawBand(1, -1, 56, 107, 72, 0.03);
              drawBand(-1, -3, 0, 102, 139, 0.03);
              drawBand(-3, -5, 81, 47, 186, 0.04);

              // Y軸補助線
              const moodYTicks = [5, 3, 0, -3, -5];
              moodYTicks.forEach((tick) => {
                const yCoord = getPdfY(tick);
                if (tick === 0) {
                  drawLine(chartX + graphPaddingLeft, yCoord, chartX + chartWidth - graphPaddingRight, yCoord, 0.3, 30, 41, 59);
                } else {
                  drawLine(chartX + graphPaddingLeft, yCoord, chartX + chartWidth - graphPaddingRight, yCoord, 0.1, 226, 232, 240);
                }

                doc.setFontSize(Math.max(4.0, chartHeight * 0.045));
                doc.setTextColor(100, 116, 139);
                const labelText = tick > 0 ? `+${tick}` : String(tick);
                doc.text(labelText, chartX + graphPaddingLeft - 2, yCoord + 0.8, { align: 'right' });
              });

              // X軸補助線
              const moodXTicks = currentDataWithMixed.filter((_, i) => i % 5 === 0);
              moodXTicks.forEach((tickInfo) => {
                const xCoord = getPdfX(tickInfo.index);
                drawLine(xCoord, chartY + graphPaddingTop, xCoord, chartY + chartHeight - graphPaddingBottom, 0.1, 226, 232, 240);

                doc.setFontSize(Math.max(4.0, chartHeight * 0.045));
                doc.setTextColor(100, 116, 139);
                doc.text(tickInfo.displayLabel, xCoord, chartY + chartHeight - graphPaddingBottom + (graphPaddingBottom * 0.5), { align: 'center' });
              });

              // 折れ線・ベジェ
              const moodPdfPoints = registeredDays.map(d => ({
                x: getPdfX(d.index),
                y: getPdfY(d.value)
              }));

              if (moodPdfPoints.length > 0) {
                const smoothPdfPoints = interpolateBezierPoints(moodPdfPoints, 20);
                doc.setLineWidth(Math.max(0.4, chartWidth * 0.003));
                doc.setDrawColor(37, 99, 235);
                
                for (let i = 0; i < smoothPdfPoints.length - 1; i++) {
                  doc.line(smoothPdfPoints[i].x, smoothPdfPoints[i].y, smoothPdfPoints[i + 1].x, smoothPdfPoints[i + 1].y);
                }

                doc.setFillColor(37, 99, 235);
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.15);
                moodPdfPoints.forEach((pt) => {
                  doc.ellipse(pt.x, pt.y, Math.max(0.6, chartWidth * 0.005), Math.max(0.6, chartWidth * 0.005), 'FD');
                });
              }

              // 混合バッジ
              currentDataWithMixed.forEach((dayData) => {
                if (dayData.isMixed && dayData.value !== undefined) {
                  const ptX = getPdfX(dayData.index);
                  const baseOffset = Math.max(1.5, chartHeight * 0.03);
                  const offset = dayData.isShifted ? baseOffset * 2.5 : baseOffset * 1.5;
                  const ptY = getPdfY(dayData.value) - offset;

                  const colors = getMixedBadgeColorsHex(dayData.mixedSeverity);
                  const hexToRgb = (hex: string) => [
                    parseInt(hex.slice(1, 3), 16),
                    parseInt(hex.slice(3, 5), 16),
                    parseInt(hex.slice(5, 7), 16)
                  ];
                  const [fillR, fillG, fillB] = hexToRgb(colors.fill);
                  const [strokeR, strokeG, strokeB] = hexToRgb(colors.stroke);
                  const [textR, textG, textB] = hexToRgb(colors.text);

                  const badgeW = Math.max(2.5, chartWidth * 0.025);
                  const badgeH = Math.max(2.0, chartHeight * 0.04);

                  drawRect(ptX - (badgeW / 2), ptY - (badgeH / 2), badgeW, badgeH, fillR, fillG, fillB, strokeR, strokeG, strokeB, 0.1);
                  doc.setFontSize(Math.max(3.5, chartHeight * 0.03));
                  doc.setTextColor(textR, textG, textB);
                  doc.text(`M`, ptX, ptY + (badgeH * 0.25), { align: 'center' });
                }
              });

              doc.setFontSize(Math.max(5.5, chartHeight * 0.05));
              doc.setTextColor(26, 47, 76);
              doc.text(`📈 気分変動推移グラフ (${viewMonth}月)`, chartX + 2, chartY + 3.5);

            } else if (block.componentType === 'activity') {
              // --- 活動エネルギーグラフのミリメートル描画 ---
              const chartX = left;
              const chartY = top;
              const chartWidth = width;
              const chartHeight = height;

              doc.setFontSize(Math.max(5.5, chartHeight * 0.05));
              doc.setTextColor(26, 47, 76);
              doc.text(`🌙 活動エネルギーグラフ (直近7日間)`, chartX + 2, chartY + 3.5);

              const dates = Array.from({ length: 7 }).map((_, i) => {
                const parts = selectedDateStr.split('-');
                const viewYear = parseInt(parts[0], 10) || 2026;
                const viewMonth = parseInt(parts[1], 10) || 7;
                const viewDay = parseInt(parts[2], 10) || 1;
                const d = new Date(viewYear, viewMonth - 1, viewDay);
                d.setDate(d.getDate() - i);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              });

              const labelW = Math.max(6, chartWidth * 0.1);
              const timelineW = chartWidth - labelW - 4;
              const rowH = (chartHeight - 6) / 8;

              doc.setFontSize(Math.max(3.5, chartHeight * 0.035));
              doc.setTextColor(148, 163, 184);
              for (let h = 0; h < 24; h += 4) {
                const xPos = chartX + labelW + 2 + (h * (timelineW / 24));
                doc.text(String(h), xPos, chartY + 7, { align: 'center' });
              }

              dates.forEach((dateStr, rIdx) => {
                const yRow = chartY + 8 + rIdx * rowH;
                const sleepRecord = actualSleepRecords?.[dateStr] || {};
                const dObj = new Date(dateStr);
                const formattedLabel = isNaN(dObj.getTime()) ? dateStr : `${dObj.getMonth() + 1}/${dObj.getDate()}`;

                drawRect(chartX + 1.5, yRow, labelW, rowH - 0.5, 248, 250, 252, 226, 232, 240, 0.1);
                doc.setFontSize(Math.max(4.0, chartHeight * 0.035));
                doc.setTextColor(71, 85, 105);
                doc.text(formattedLabel, chartX + 2, yRow + (rowH * 0.65));

                const slotW = timelineW / 24;
                const subSlotW = slotW / 2;

                for (let h = 0; h < 24; h++) {
                  const s0 = h * 2;
                  const s1 = h * 2 + 1;
                  const val0 = sleepRecord[s0] || null;
                  const val1 = sleepRecord[s1] || null;

                  const getColorRgb = (symbol: any) => {
                    if (!symbol) return [248, 250, 252];
                    const stamp = actualSleepStamps?.find(s => s.id === symbol || s.symbol === symbol);
                    if (stamp) {
                      switch (stamp.color) {
                        case 'purple': return [168, 85, 247];
                        case 'sky': return [56, 189, 248];
                        case 'orange': return [249, 115, 22];
                        case 'yellow': return [250, 204, 21];
                        case 'green': return [34, 197, 94];
                        case 'pink': return [236, 72, 153];
                        case 'indigo': return [99, 102, 241];
                        case 'teal': return [20, 184, 166];
                        case 'rose': return [244, 63, 94];
                        case 'slate': return [100, 116, 139];
                        default: return [168, 85, 247];
                      }
                    }
                    return [248, 250, 252];
                  };

                  const rgb0 = getColorRgb(val0);
                  const rgb1 = getColorRgb(val1);

                  const slotX = chartX + labelW + 2 + h * slotW;
                  drawRect(slotX, yRow, subSlotW - 0.1, rowH - 0.5, rgb0[0], rgb0[1], rgb0[2]);
                  drawRect(slotX + subSlotW, yRow, subSlotW - 0.1, rowH - 0.5, rgb1[0], rgb1[1], rgb1[2]);
                }
              });

            } else if (block.componentType === 'stats') {
              // --- 臨床用統計データ表のミリメートル描画 ---
              const chartX = left;
              const chartY = top;
              const chartWidth = width;
              const chartHeight = height;

              doc.setFontSize(Math.max(5.5, chartHeight * 0.05));
              doc.setTextColor(26, 47, 76);
              doc.text(`📊 臨床用統計データ表`, chartX + 2, chartY + 3.5);

              const moodRow = mentalRows?.find(r => r.id === 'mood' || r.name.includes('気分'));
              const moodRowId = moodRow ? moodRow.id : 'mood';
              const mixedRow = mentalRows?.find(r => r.name.includes('混合状態') || r.id === 'mixed' || r.id === 'mixed_state');
              const mixedRowId = mixedRow ? mixedRow.id : null;

              const keys = Object.keys(mentalRecords || {});
              let totalDays = keys.length;
              let loggedDays = 0;
              let sumMood = 0;
              let maxMood = -99;
              let minMood = 99;
              let stableDays = 0;
              let manicDays = 0;
              let depressedDays = 0;
              let mixedDays = 0;

              keys.forEach(k => {
                const r = mentalRecords[k];
                if (r) {
                  const moodVal = r[moodRowId as any];
                  if (moodVal !== undefined && moodVal !== null && typeof moodVal === 'number') {
                    loggedDays++;
                    sumMood += moodVal;
                    if (moodVal > maxMood) maxMood = moodVal;
                    if (moodVal < minMood) minMood = moodVal;
                    if (moodVal === 0) stableDays++;
                    if (moodVal > 0) manicDays++;
                    if (moodVal < 0) depressedDays++;
                  }
                  let isMixed = false;
                  if (mixedRowId && r[mixedRowId as any] !== undefined && r[mixedRowId as any] !== null) {
                    const val = Number(r[mixedRowId as any]);
                    if (val >= 1 && val <= 5) isMixed = true;
                  }
                  if (isMixed) mixedDays++;
                }
              });

              const avgMoodStr = loggedDays > 0 ? `${(sumMood / loggedDays) >= 0 ? '+' : ''}${(sumMood / loggedDays).toFixed(2)}` : '---';
              const maxMoodStr = loggedDays > 0 ? `${maxMood >= 0 ? '+' : ''}${maxMood}` : '---';
              const minMoodStr = loggedDays > 0 ? `${minMood >= 0 ? '+' : ''}${minMood}` : '---';
              const rangeMoodStr = loggedDays > 0 ? (maxMood - minMood).toFixed(1) : '---';

              const stats = [
                { label: "平均気分", value: avgMoodStr },
                { label: "最高値", value: maxMoodStr },
                { label: "最低値", value: minMoodStr },
                { label: "変動幅", value: rangeMoodStr },
                { label: "安定(0)", value: `${stableDays}日` },
                { label: "活動(＞0)", value: `${manicDays}日` },
                { label: "停滞(＜0)", value: `${depressedDays}日` },
                { label: "混合(M)", value: `${mixedDays}日` },
              ];

              const itemW = (chartWidth - 4) / 2;
              const itemH = (chartHeight - 6) / 4;

              stats.forEach((item, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const itemX = chartX + 1.5 + col * itemW;
                const itemY = chartY + 5.0 + row * itemH;

                drawRect(itemX, itemY, itemW - 0.5, itemH - 0.5, 248, 250, 252, 226, 232, 240, 0.1);

                doc.setFontSize(Math.max(4.0, chartHeight * 0.035));
                doc.setTextColor(100, 116, 139);
                doc.text(item.label, itemX + 1.2, itemY + (itemH * 0.65));

                doc.setFontSize(Math.max(4.5, chartHeight * 0.04));
                doc.setTextColor(15, 23, 42);
                doc.text(item.value, itemX + itemW - 1.8, itemY + (itemH * 0.65), { align: 'right' });
              });
            }
          } else {
            // --- テキストブロックのミリメートル描画 ---
            const textX = left + 2;
            let textY = top + 4;

            const fs = block.fontSize || 'sm';
            let pdfFontSize = 7.5;
            if (fs === 'md') pdfFontSize = 10.5;
            if (fs === 'lg') pdfFontSize = 15.5;

            doc.setFontSize(pdfFontSize);

            // フォントと太字の適用
            const ff = block.fontFamily === 'monospace' ? 'courier' : block.fontFamily === 'serif' ? 'times' : 'NotoSansJP';
            doc.setFont(ff, block.bold ? 'bold' : 'normal');

            const colorHex = block.color || '#0f172a';
            const hexToRgb = (hex: string) => [
              parseInt(hex.slice(1, 3), 16),
              parseInt(hex.slice(3, 5), 16),
              parseInt(hex.slice(5, 7), 16)
            ];
            try {
              const [r, g, b] = hexToRgb(colorHex);
              doc.setTextColor(r, g, b);
            } catch {
              doc.setTextColor(15, 23, 42);
            }

            const textContent = block.text || '';
            const foldedLines = doc.splitTextToSize(textContent, width - 4);
            
            // アライメントに応じたX座標とオプションの決定
            const align = block.align || 'left';
            let lineX = textX;
            if (align === 'center') {
              lineX = textX + (width - 4) / 2;
            } else if (align === 'right') {
              lineX = textX + width - 4;
            }

            foldedLines.forEach((line: string) => {
              if (textY < top + height - 2) {
                doc.text(line, lineX, textY, { align });
                textY += (pdfFontSize * 0.45);
              }
            });

            // 描画後は元のフォント・スタイルにリセット
            doc.setFont("NotoSansJP", "normal");
          }
        });

        // 保存して早期リターン
        let filename = pdfFileName.trim();
        if (!filename) {
          filename = 'pochilog_custom_report.pdf';
        }
        if (!filename.toLowerCase().endsWith('.pdf')) {
          filename += '.pdf';
        }
        doc.save(filename);
        setFontLoadingStatus('');
        if (showToast) showToast('🎉 カスタム高精度ベクターPDFを書き出しました！');
        return;
      }

      let currentY = MARGIN_TOP;

      // Pochilog サブタイトル
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text("Pochilog Mental Health Report", MARGIN_LEFT, currentY);
      currentY += 4;

      // メインタイトル
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("生活記録メンタル健康レポート", MARGIN_LEFT, currentY);

      // 日付・期間情報
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`期間: ${viewYear}年${viewMonth}月度 (${getPeriodLabelJP()}間記録)`, MARGIN_LEFT, currentY + 5.5);

      // 患者名 ＆ 主治医名 (右寄せ)
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const nameX = MARGIN_LEFT + CONTENT_WIDTH;
      doc.text(`氏名: ${patientName || "＿＿＿＿＿＿"} 殿`, nameX, currentY - 1, { align: 'right' });
      doc.text(`主治医: ${doctorName || "＿＿＿＿＿＿"} 先生`, nameX, currentY + 5.5, { align: 'right' });

      currentY += 11;

      // ヘッダー区切り太線
      drawLine(MARGIN_LEFT, currentY, MARGIN_LEFT + CONTENT_WIDTH, currentY, 0.6, 15, 23, 42);
      currentY += 6;

      // ==========================================
      // ② 気分変動グラフ (SVG Vector Rendering in PDF)
      // ==========================================
      const chartX = MARGIN_LEFT;
      const chartY = currentY;
      const chartWidth = CONTENT_WIDTH; // 180mm
      const chartHeight = 65; // 高さ 65mm

      // グラフ背景ボックス
      drawRect(chartX, chartY, chartWidth, chartHeight, 252, 254, 255, 226, 232, 240, 0.25);

      const graphPaddingLeft = 10;
      const graphPaddingRight = 10;
      const graphPaddingTop = 7;
      const graphPaddingBottom = 8;

      const graphPlotWidth = chartWidth - graphPaddingLeft - graphPaddingRight;
      const graphPlotHeight = chartHeight - graphPaddingTop - graphPaddingBottom;

      const getPdfX = (idx: number) => chartX + graphPaddingLeft + idx * (graphPlotWidth / (totalDaysCount - 1 || 1));
      const getPdfY = (val: number) => chartY + graphPaddingTop + (5 - val) * (graphPlotHeight / 10);

      // グリッド線 ＆ Y軸ラベルの描画
      yTicks.forEach((tick) => {
        const yCoord = getPdfY(tick);
        
        // 補助線（0は少し濃く、その他は極めて薄い灰色）
        if (tick === 0) {
          drawLine(chartX + graphPaddingLeft, yCoord, chartX + chartWidth - graphPaddingRight, yCoord, 0.35, 148, 163, 184);
        } else {
          drawLine(chartX + graphPaddingLeft, yCoord, chartX + chartWidth - graphPaddingRight, yCoord, 0.1, 226, 232, 240);
        }

        // Y軸テキストラベル (左側)
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        const labelText = tick > 0 ? `+${tick}` : String(tick);
        doc.text(labelText, chartX + 2, yCoord + 0.8);
      });

      // X軸グリッド線 ＆ ラベルの描画
      xTicks.forEach((tickInfo) => {
        const xCoord = getPdfX(tickInfo.index);
        
        // 縦補助線
        drawLine(xCoord, chartY + graphPaddingTop, xCoord, chartY + chartHeight - graphPaddingBottom, 0.1, 226, 232, 240);

        // X軸ラベル (下部)
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(tickInfo.label, xCoord, chartY + chartHeight - graphPaddingBottom + 4, { align: 'center' });
      });

      // 折れ線・ベジェ曲線のなめらかな描画
      const pdfPoints = registeredDays.map(d => ({
        x: getPdfX(d.index),
        y: getPdfY(d.value)
      }));

      if (pdfPoints.length > 0) {
        // ベジェ曲線を細かく直線で補間して描画（最も正確で互換性がある方法）
        const smoothPdfPoints = interpolateBezierPoints(pdfPoints, 20);
        
        doc.setLineWidth(0.65);
        doc.setDrawColor(79, 70, 229); // indigo-600
        
        for (let i = 0; i < smoothPdfPoints.length - 1; i++) {
          doc.line(
            smoothPdfPoints[i].x, 
            smoothPdfPoints[i].y, 
            smoothPdfPoints[i + 1].x, 
            smoothPdfPoints[i + 1].y
          );
        }

        // プロットされた個々の測定点をドット（円）として描画
        doc.setFillColor(79, 70, 229);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.2);
        pdfPoints.forEach((pt) => {
          doc.ellipse(pt.x, pt.y, 0.8, 0.8, 'FD');
        });
      }

      // 混合状態 (Mixed State Mバッジ) の描画
      currentDataWithMixed.forEach((dayData) => {
        if (dayData.isMixed && dayData.value !== undefined) {
          const ptX = getPdfX(dayData.index);
          // Mバッジの表示位置（点の少し上、シフトありの場合はさらに上へずらして重複回避）
          const offset = dayData.isShifted ? 7.5 : 4.5;
          const ptY = getPdfY(dayData.value) - offset;

          const colors = getMixedBadgeColorsHex(dayData.mixedSeverity);
          
          // RGBにパース
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
          };

          const [fillR, fillG, fillB] = hexToRgb(colors.fill);
          const [strokeR, strokeG, strokeB] = hexToRgb(colors.stroke);

          // バッジの矩形を描画 (幅 3.5mm × 高さ 2.5mm)
          drawRect(ptX - 1.75, ptY - 1.25, 3.5, 2.5, fillR, fillG, fillB, strokeR, strokeG, strokeB, 0.15);
          
          // バッジのテキスト "M" + 深刻度
          doc.setFontSize(4.5);
          const [textR, textG, textB] = hexToRgb(colors.text);
          doc.setTextColor(textR, textG, textB);
          doc.text(`M${dayData.mixedSeverity}`, ptX, ptY + 0.6, { align: 'center' });
        }
      });

      currentY += chartHeight + 6;

      // ==========================================
      // ③ 臨床用統計指標グリッド (10つのカード)
      // ==========================================
      const gridX = MARGIN_LEFT;
      const gridY = currentY;
      const cardGapX = 2.5;
      const cardGapY = 2.5;
      const cardWidth = (CONTENT_WIDTH - 4 * cardGapX) / 5; // 動的計算で完全に収まる！
      const cardHeight = 15; // 高さ 15mm

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("📊 臨床用統計指標要約", gridX, gridY - 1.5);

      statsCards.forEach((card, idx) => {
        const col = idx % 5;
        const row = Math.floor(idx / 5);

        const cx = gridX + col * (cardWidth + cardGapX);
        const cy = gridY + row * (cardHeight + cardGapY);

        // 各カードの白い背景ボックス
        drawRect(cx, cy, cardWidth, cardHeight, 255, 255, 255, 226, 232, 240, 0.2);

        // 左側のアクセント太線
        let accentR = 79, accentG = 70, accentB = 229; // デフォルト indigo
        if (card.title.includes("最高")) { accentR = 239; accentG = 68; accentB = 68; } // 赤
        else if (card.title.includes("最低")) { accentR = 59; accentG = 130; accentB = 246; } // 青
        else if (card.title.includes("混合")) { accentR = 249; accentG = 115; accentB = 22; } // オレンジ
        else if (card.title.includes("安定")) { accentR = 16; accentG = 185; accentB = 129; } // 緑

        drawLine(cx, cy, cx, cy + cardHeight, 0.55, accentR, accentG, accentB);

        // カードタイトル
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(card.title, cx + 1.8, cy + 3.2);

        // カード数値
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(card.value, cx + 1.8, cy + 9.8);

        // 単位
        doc.setFontSize(5);
        doc.setTextColor(148, 163, 184);
        const valWidth = doc.getTextWidth(card.value);
        doc.text(card.unit, cx + 1.8 + valWidth + 1, cy + 9.8);

        // 説明文
        doc.setFontSize(4.8);
        doc.setTextColor(148, 163, 184);
        doc.text(card.desc, cx + 1.8, cy + 13.4);
      });

      currentY += (cardHeight + cardGapY) * 2 + 5;

      // ==========================================
      // ④ サマリー ＆ 手動追記メモエリア
      // ==========================================
      const memoX = MARGIN_LEFT;
      const memoY = currentY;
      const memoWidth = CONTENT_WIDTH;
      const memoHeight = 85; // A4の下部に美しく収まる高さ

      // メモエリア全体の背景枠
      drawRect(memoX, memoY, memoWidth, memoHeight, 248, 250, 252, 226, 232, 240, 0.25);

      // 左側のアクセント飾り
      drawLine(memoX, memoY, memoX, memoY + memoHeight, 0.75, 79, 70, 229);

      // タイトル「自動生成サマリー ＆ 医療連携メモ」
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("📝 自動生成サマリー ＆ 医療連携メモ", memoX + 4, memoY + 5.5);

      let memoYCursor = memoY + 11;

      // 4.1. 自動生成テキスト
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600

      // jsPDFの便利なテキスト自動折り返し機能
      const foldedSummary = doc.splitTextToSize(autoSummaryText, memoWidth - 8);
      foldedSummary.forEach((line: string) => {
        if (memoYCursor < memoY + memoHeight - 5) {
          doc.text(line, memoX + 4, memoYCursor);
          memoYCursor += 3.8;
        }
      });

      memoYCursor += 1.5;

      // 4.2. 区切り点線
      drawLine(memoX + 4, memoYCursor, memoX + memoWidth - 4, memoYCursor, 0.1, 203, 213, 225);
      memoYCursor += 4.5;

      // 4.3. 手動メモセクションタイトル
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("✍️ 主治医への伝達事項・追記メモ", memoX + 4, memoYCursor);
      memoYCursor += 4;

      // 4.4. 手動追記メモテキストの描画
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const memoContent = (customMemo || "").trim() || "（ここに入力したメモはPDFに出力され、診察時のコミュニケーションに活用できます。上のテキストエリアからいつでも自由に追記・変更できます）";
      const foldedCustomMemo = doc.splitTextToSize(memoContent, memoWidth - 8);
      
      foldedCustomMemo.forEach((line: string) => {
        if (memoYCursor < memoY + memoHeight - 4) {
          doc.text(line, memoX + 4, memoYCursor);
          memoYCursor += 3.8;
        }
      });

      // ==========================================
      // ⑤ フッター (Pochilog branding & page number)
      // ==========================================
      const footerY = PAGE_HEIGHT - 10;
      drawLine(MARGIN_LEFT, footerY, MARGIN_LEFT + CONTENT_WIDTH, footerY, 0.15, 203, 213, 225);
      
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("生活記録ポチログ - 高精度ベクターPDF出力モジュール v5.2", MARGIN_LEFT, footerY + 3.5);
      doc.text("Page 1 of 1", MARGIN_LEFT + CONTENT_WIDTH, footerY + 3.5, { align: 'right' });

      // ==========================================
      // ⑥ PDFダウンロード実行
      // ==========================================
      let filename = pdfFileName.trim();
      if (!filename) {
        filename = 'pochilog_report.pdf';
      }
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      if (showToast) {
        showToast(`📄 高画質ベクターPDFを出力しました: ${filename}`);
      }

    } catch (err) {
      console.error('Vector PDF export failed:', err);
      if (showToast) {
        showToast('⚠️ PDFの直接出力に失敗しました。標準印刷機能をお試しください。');
      } else {
        alert('⚠️ PDFの出力に失敗しました');
      }
    } finally {
      setIsExporting(false);
      setFontLoadingStatus('');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] overflow-y-auto p-4 sm:p-6 select-none" id="bipolar-pdf-report-view-container">
      {/* 印刷専用のCSS定義 */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* A4用紙の余白を動的に連動 */
          @page {
            size: A4 portrait;
            margin: ${paddingTopBottom}mm ${paddingLeftRight}mm !important;
          }

          /* 背景色やテキスト色のリセット */
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 印刷に関係のない要素（ボタン、ヘッダー、サイドバーなど）を非表示 */
          body * {
            visibility: hidden !important;
          }

          /* 描画ツリー全体を通常表示化 */
          #root,
          #app-root-frame,
          #device-mockup,
          #main-content-window,
          #viewer-full-width-container,
          #sleep-viewer-root,
          #viewer-rows-container,
          #bipolar-pdf-report-view-container,
          #bipolar-pdf-report-view-container > div {
            visibility: visible !important;
            display: block !important;
            position: static !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            flex: none !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          header,
          #viewer-top-selector-bar,
          #preview-control-toolbar,
          #print-preview-header,
          #iframe-warning-banner,
          button,
          a,
          .preview-only-controls {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* 用紙部分のみ印刷対象にする */
          #bipolar-pdf-paper-sheet,
          #bipolar-pdf-paper-sheet * {
            visibility: visible !important;
            color: #000000 !important;
          }

          #bipolar-pdf-paper-sheet {
            visibility: visible !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: ${210 - 2 * paddingLeftRight}mm !important; /* 動的幅計算 */
            height: auto !important;
            min-height: ${297 - 2 * paddingTopBottom}mm !important; /* 動的最小高計算 */
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            transform: none !important;
          }

          /* テキストエリアのボーダーやリサイズつまみを消す */
          textarea {
            border: none !important;
            resize: none !important;
            background: transparent !important;
          }

          ::-webkit-scrollbar {
            display: none !important;
          }
        }
      `}} />

      <div className="flex-1 flex flex-col items-center justify-start py-4">
        
        {/* レポート画面ヘッダー */}
        <div className="mb-4 text-center preview-only-controls" id="print-preview-header">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-950/85 text-indigo-300 border border-indigo-800">
            📄 A4高精度ベクターPDF印刷プレビュー
          </span>
          <p className="text-[11px] text-slate-400 mt-2">
            ブラウザキャプチャ画像ではなく、テキストやグラフのベクター線を直接PDFとして書き出すため、文字が一切ぼやけません。
          </p>
        </div>

        {/* Iframe Sandbox Warning & Open-in-New-Tab Link */}
        <div className="w-full max-w-[780px] border border-amber-500/30 bg-amber-950/20 text-amber-200 rounded-xl p-4 mb-4 text-xs shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 preview-only-controls" id="iframe-warning-banner">
          <div className="flex-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5 mb-1 text-sm">
              <span>💡</span> ダウンロードがブロックされる場合
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              開発中のiframe内（枠内）ではブラウザのセキュリティ制限によりPDFが保存できない場合があります。
              <strong>「別タブで直接アプリを開く」をクリックして実行していただくと、100%確実にPDFダウンロードが可能です。</strong>
            </p>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95 transition-all text-xs font-black shadow-md border-b-2 border-amber-700"
          >
            🚀 別タブで直接アプリを開く
          </a>
        </div>

        {/* 操作ツールバー */}
        <div className="w-full max-w-[780px] flex flex-col gap-3 mb-4 px-2 preview-only-controls" id="preview-control-toolbar">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer text-xs font-black self-start"
            >
              ◀ 戻る
            </button>
            
            {/* 保存ファイル名 ＆ 期間切替 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100"
                  title="前月"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono font-bold text-slate-200">
                  {viewYear}年{viewMonth}月
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100"
                  title="翌月"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
                <span className="text-slate-400 font-bold">期間:</span>
                {(['1w', '1m', '3m', '6m', '1y'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                      period === p 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {p === '1w' ? '1週' : p === '1m' ? '1ヶ月' : p === '3m' ? '3ヶ月' : p === '6m' ? '6ヶ月' : '1年'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900">
                <span className="text-[10px] sm:text-xs font-black text-slate-400">PDFファイル名:</span>
                <input
                  type="text"
                  value={pdfFileName}
                  onChange={(e) => setPdfFileName(e.target.value)}
                  placeholder="pochilog_report.pdf"
                  className="bg-transparent text-slate-100 text-xs font-mono font-bold outline-none border-b border-transparent focus:border-indigo-500 w-32 px-1 text-right"
                />
              </div>

              {/* 余白設定ツール */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[11px] w-full sm:w-auto">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-bold whitespace-nowrap">↕ 上下余白:</span>
                  <span className="text-emerald-400 font-mono font-bold whitespace-nowrap w-9 text-right">{paddingTopBottom}mm</span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={paddingTopBottom}
                    onChange={(e) => handlePaddingTbChange(parseInt(e.target.value, 10))}
                    className="w-20 sm:w-24 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>
                <div className="hidden sm:block text-slate-700 font-light">|</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-bold whitespace-nowrap">↔ 左右余白:</span>
                  <span className="text-emerald-400 font-mono font-bold whitespace-nowrap w-9 text-right">{paddingLeftRight}mm</span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={paddingLeftRight}
                    onChange={(e) => handlePaddingLrChange(parseInt(e.target.value, 10))}
                    className="w-20 sm:w-24 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 出力実行ボタン */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportVectorPDF}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white active:scale-95 transition-all cursor-pointer text-xs font-black shadow-md border-b-2 border-indigo-800"
            >
              {isExporting ? (
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin">🌀</span> {fontLoadingStatus || 'PDF作成中...'}
                </span>
              ) : (
                '📄 高精度ベクターPDFを直接保存 (文字ボヤけ皆無)'
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white active:scale-95 transition-all cursor-pointer text-xs font-black shadow-md border-b-2 border-slate-800"
              title="ブラウザ標準の印刷機能を使って、紙への印刷やシステムのPDF保存を行います。"
            >
              <Printer className="w-4 h-4" /> ブラウザの標準印刷ダイアログを起動
            </button>
          </div>
        </div>

        {/* ==========================================
            A4 用紙プレビュー (Web表示)
            180mm × 267mm の印刷領域にきれいに収まる
            ========================================== */}
        {isManualMode ? (
          /* 手動ブロックデザインのミリメートル換算高精度ベクタープレビュー */
          <div 
            className="shrink-0 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.75)] border border-slate-200 relative text-slate-950 overflow-hidden" 
            id="bipolar-pdf-paper-sheet"
            style={{
              width: '780px',
              height: '1100px',
              backgroundColor: '#ffffff',
              fontFamily: 'Inter, "Noto Sans JP", sans-serif'
            }}
          >
            {manualBlocks.map((block) => (
              <ReportBlockItem
                key={block.id}
                block={block}
                blocks={manualBlocks}
                editingBlockId={null}
                viewerSubScreen="report_preview"
                zoomRate={1}
                setEditingBlockId={() => {}}
                setTextEditingBlockId={() => {}}
                onDeleteBlock={() => {}}
                setBlocks={() => {}}
                setUndoStackBlocks={() => {}}
                records={records}
                actualSleepRecords={actualSleepRecords}
                mentalRecords={mentalRecords}
                mentalRows={mentalRows}
                actualSleepStamps={actualSleepStamps}
                selectedDate={selectedDateStr}
                paddingTopBottom={paddingTopBottom}
                paddingLeftRight={paddingLeftRight}
              />
            ))}
          </div>
        ) : (
          <div 
            className="shrink-0 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.75)] border border-slate-200 flex flex-col relative text-slate-950 select-text" 
            id="bipolar-pdf-paper-sheet"
            style={{
              width: '780px',
              minHeight: '1100px',
              padding: `${paddingTopBottom}mm ${paddingLeftRight}mm`,
              fontFamily: 'Inter, "Noto Sans JP", sans-serif'
            }}
          >
            {/* ① ヘッダー */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <span className="text-[10px] text-indigo-700 font-mono font-black uppercase tracking-widest">Pochilog Mental Report</span>
                <h1 className="text-2xl font-black text-slate-950 mt-1">生活記録メンタル健康レポート</h1>
                <p className="text-xs text-slate-950 mt-1 font-bold">
                  期間: {viewYear}年{viewMonth}月度 ({getPeriodLabelJP()}間記録)
                </p>
              </div>
              <div className="flex flex-col gap-2 text-right text-xs preview-only-controls">
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-black text-slate-950">氏名:</span>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => handlePatientNameChange(e.target.value)}
                    placeholder="＿＿＿＿＿＿ 殿"
                    className="border-b border-slate-800 focus:border-indigo-600 outline-none text-right font-black text-slate-950 w-36 px-1 bg-transparent text-xs placeholder-slate-600"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-black text-slate-950">主治医:</span>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => handleDoctorNameChange(e.target.value)}
                    placeholder="＿＿＿＿＿＿ 先生"
                    className="border-b border-slate-800 focus:border-indigo-600 outline-none text-right font-black text-slate-950 w-36 px-1 bg-transparent text-xs placeholder-slate-600"
                  />
                </div>
              </div>

              {/* 印刷時のみ表示されるテキスト用のプレースホルダー */}
              <div className="hidden print:flex flex-col gap-1.5 text-right text-xs font-black text-black">
                <div>氏名: {patientName || '＿＿＿＿＿＿'} 殿</div>
                <div>主治医: {doctorName || '＿＿＿＿＿＿'} 先生</div>
              </div>
            </div>

            {/* ② 気分推移グラフ */}
            <div className="mb-4">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
                <span className="text-xs font-black text-slate-950 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" /> 気分変動推移グラフ
                </span>
                <span className="text-[10px] text-slate-950 font-bold">
                  (縦軸: 気分レベル -5〜+5、横軸: 日付)
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 relative">
                {hasData ? (
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                    {/* Y軸補助線 ＆ ラベル */}
                    {yTicks.map((tick) => {
                      const y = getY(tick);
                      return (
                        <g key={tick}>
                          <line 
                            x1={paddingLeft} 
                            y1={y} 
                            x2={svgWidth - paddingRight} 
                            y2={y} 
                            stroke={tick === 0 ? '#94a3b8' : '#e2e8f0'} 
                            strokeWidth={tick === 0 ? 1 : 0.5} 
                          />
                          <text 
                            x={paddingLeft - 4} 
                            y={y + 3} 
                            fontSize="9" 
                            fill="#94a3b8" 
                            textAnchor="end"
                            fontWeight="bold"
                          >
                            {tick > 0 ? `+${tick}` : tick}
                          </text>
                        </g>
                      );
                    })}

                    {/* X軸補助線 ＆ ラベル */}
                    {xTicks.map((tickInfo, i) => {
                      const x = getX(tickInfo.index);
                      return (
                        <g key={i}>
                          <line 
                            x1={x} 
                            y1={paddingTop} 
                            x2={x} 
                            y2={svgHeight - paddingBottom} 
                            stroke="#e2e8f0" 
                            strokeWidth={0.5} 
                          />
                          <text 
                            x={x} 
                            y={svgHeight - paddingBottom + 12} 
                            fontSize="9" 
                            fill="#94a3b8" 
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {tickInfo.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* 3次ベジェなめらか曲線 */}
                    {splinePath && (
                      <path 
                        d={splinePath} 
                        fill="none" 
                        stroke="#4f46e5" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                      />
                    )}

                    {/* プロット点（ドット） */}
                    {points.map((pt, i) => (
                      <circle 
                        key={i} 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="3.5" 
                        fill="#4f46e5" 
                        stroke="#ffffff" 
                        strokeWidth="1" 
                      />
                    ))}

                    {/* 混合状態（Mバッジ） */}
                    {currentDataWithMixed.map((dayData, i) => {
                      if (dayData.isMixed && dayData.value !== undefined) {
                        const x = getX(dayData.index);
                        const offset = dayData.isShifted ? 26 : 14;
                        const y = getY(dayData.value) - offset;
                        const colors = getMixedBadgeColorsHex(dayData.mixedSeverity);
                        
                        return (
                          <g key={i}>
                            {/* 引き出し線 */}
                            <line 
                              x1={x} 
                              y1={getY(dayData.value)} 
                              x2={x} 
                              y2={y + 4} 
                              stroke={colors.stroke} 
                              strokeWidth="0.5" 
                              strokeDasharray="1.5,1.5"
                            />
                            {/* Mバッジの背景ボックス */}
                            <rect 
                              x={x - 11} 
                              y={y - 7} 
                              width="22" 
                              height="14" 
                              rx="3" 
                              fill={colors.fill} 
                              stroke={colors.stroke} 
                              strokeWidth="1"
                            />
                            <text 
                              x={x} 
                              y={y + 3} 
                              fontSize="9" 
                              fontWeight="bold" 
                              fill={colors.text} 
                              textAnchor="middle"
                            >
                              M{dayData.mixedSeverity}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })}
                  </svg>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-bold">
                    📭 表示期間内のメンタル記録データがありません。
                  </div>
                )}
              </div>
            </div>

            {/* ③ 統計指標要約グリッド */}
            <div className="mb-4">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1 border-b border-slate-200 pb-1 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> 臨床用統計指標要約 (A4用紙横幅いっぱいに自動均等配置)
              </span>

              <div className="grid grid-cols-5 gap-2 text-slate-950">
                {statsCards.map((card, idx) => {
                  let borderCol = 'border-l-indigo-600';
                  if (card.title.includes("最高")) borderCol = 'border-l-red-500';
                  else if (card.title.includes("最低")) borderCol = 'border-l-blue-500';
                  else if (card.title.includes("混合")) borderCol = 'border-l-orange-500';
                  else if (card.title.includes("安定")) borderCol = 'border-l-emerald-500';

                  return (
                    <div key={idx} className={`bg-white border border-slate-300 border-l-3 ${borderCol} p-2 rounded flex flex-col justify-between min-h-[64px]`}>
                      <span className="text-[9.5px] text-slate-950 font-black tracking-tight block truncate">
                        {card.title}
                      </span>
                      <div className="flex items-baseline gap-0.5 my-0.5">
                        <span className="text-sm font-black text-slate-950">{card.value}</span>
                        <span className="text-[8px] text-slate-800 font-bold">{card.unit}</span>
                      </div>
                      <span className="text-[8.5px] text-slate-800 leading-tight block truncate font-bold">
                        {card.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ④ サマリー ＆ 手動追記メモエリア */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 border border-slate-300 border-l-4 border-l-indigo-600 rounded-lg p-4">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-950 border-b border-slate-300 pb-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> 自動生成サマリー ＆ 医療連携追記メモ
              </div>

              {/* 自動サマリー */}
              <div className="flex-none text-[11px] text-slate-950 leading-relaxed mb-3 font-bold bg-white p-3 rounded border border-slate-300 shadow-sm">
                {autoSummaryText}
              </div>

              {/* 区切り線 */}
              <div className="border-t border-dashed border-slate-300 my-2"></div>

              {/* 手動メモ */}
              <div className="flex-1 flex flex-col min-h-[140px] mt-1">
                <div className="text-xs font-black text-slate-950 mb-1 flex items-center justify-between">
                  <span>✍️ 主治医への伝達事項・追記メモ (こちらに直接入力・編集が可能です)</span>
                  {customMemo && (
                    <button 
                      onClick={() => handleCustomMemoChange('')}
                      className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-0.5 cursor-pointer preview-only-controls"
                      title="メモをクリア"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> クリア
                    </button>
                  )}
                </div>
                <textarea
                  value={customMemo}
                  onChange={(e) => handleCustomMemoChange(e.target.value)}
                  placeholder="（例：今月は中旬に気分の高揚（躁状態）があり、買い物が増えました。主治医の〇〇先生にご相談するために、こちらに詳細な睡眠・活動の気づきを記入します。入力した内容は自動保存され、PDF印刷時にこの領域に印字されます）"
                  className="flex-1 w-full bg-white border border-slate-200 rounded p-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* ⑤ フッター */}
            <div className="border-t border-slate-300 pt-2 mt-4 text-[9.5px] text-slate-700 font-bold flex justify-between">
              <span>生活記録ポチログ - 高精度ベクターPDF出力モジュール v5.3</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
