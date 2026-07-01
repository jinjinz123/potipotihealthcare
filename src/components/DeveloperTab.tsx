import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import encoding from 'encoding-japanese';
import { 
  Copy, 
  HelpCircle, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  X,
  Check,
  Code,
  Upload,
  Plus,
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { DailyRecords, StampConfig, MentalRow } from '../types';
import { 
  shiftDateString, 
  createBlankRecord, 
  getEffectiveSymbol,
  saveMentalRecordsToStorage,
  saveMentalRowsToStorage,
  saveRecordsToStorage,
  STAMP_COLORS
} from '../utils';
import { CSVExportModal } from './SidebarModals';

// Excel列アルファベットをインデックスに変換する関数 (A->0, B->1, Z->25, AA->26)
function excelColToIdx(colStr: string): number {
  const s = colStr.toUpperCase().trim();
  if (!s || !/^[A-Z]+$/.test(s)) return -1;
  let idx = 0;
  for (let i = 0; i < s.length; i++) {
    idx = idx * 26 + (s.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// インデックスをExcel列アルファベットに変換する関数 (0->A, 1->B, 25->Z, 26->AA)
function idxToExcelCol(idx: number): string {
  let s = "";
  let temp = idx;
  while (temp >= 0) {
    s = String.fromCharCode((temp % 26) + 65) + s;
    temp = Math.floor(temp / 26) - 1;
  }
  return s;
}

interface DeveloperTabProps {
  selectedDate: string;
  records: DailyRecords;
  setRecords: (records: DailyRecords) => void;
  stamps: StampConfig[];
  customColNames: string[];
  displayMode: 'vivid' | 'soft' | 'dark';
  showToast: (msg: string) => void;
  mentalRows: MentalRow[];
  mentalRecords: DailyRecords;
  setMentalRows: (rows: MentalRow[]) => void;
  setMentalRecords: (records: DailyRecords) => void;
}

export default function DeveloperTab({
  selectedDate,
  records,
  setRecords,
  stamps,
  customColNames,
  displayMode,
  showToast,
  mentalRows,
  mentalRecords,
  setMentalRows,
  setMentalRecords,
}: DeveloperTabProps) {
  const [copyDays, setCopyDays] = useState<number>(7);
  const [exportModalData, setExportModalData] = useState<{
    csvText: string;
    fileName: string;
    forSingleDate?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [alertState, setAlertState] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // --- 動的列マッピング機能の State & Effect ---
  const [totalCols, setTotalCols] = useState<number>(() => {
    const saved = localStorage.getItem('mental_excel_total_cols');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [mappingDays, setMappingDays] = useState<number>(1);

  const [mappingConfig, setMappingConfig] = useState<{ [rowId: string]: string }>(() => {
    const saved = localStorage.getItem('mental_excel_mapping_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.date === undefined) {
            parsed.date = 'A';
          }
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return { date: 'A' };
  });

  useEffect(() => {
    localStorage.setItem('mental_excel_total_cols', String(totalCols));
  }, [totalCols]);

  useEffect(() => {
    localStorage.setItem('mental_excel_mapping_config', JSON.stringify(mappingConfig));
  }, [mappingConfig]);

  // すべての日付をユニークにマージしてソート
  const getAllDates = (): string[] => {
    const datesSet = new Set<string>();
    Object.keys(records).forEach(d => datesSet.add(d));
    Object.keys(mentalRecords).forEach(d => datesSet.add(d));
    return Array.from(datesSet).sort();
  };

  // マッピングされたCSVデータを生成
  const generateMappingRows = (dates: string[]): string[][] => {
    const resultRows: string[][] = [];

    dates.forEach(d => {
      // 指定された総列数で空文字の配列を作成
      const rowData = Array(totalCols).fill("");

      // 1. 日付列のマッピングを適用（設定されている場合）
      const dateColLetter = mappingConfig['date'];
      if (dateColLetter) {
        const colIdx = excelColToIdx(dateColLetter);
        if (colIdx >= 0 && colIdx < totalCols) {
          rowData[colIdx] = d.replace(/-/g, '/');
        }
      }

      // 2. 登録されている各メンタル項目をマッピング
      const dayMental = mentalRecords[d] || {};
      mentalRows.forEach(mRow => {
        const colLetter = mappingConfig[mRow.id];
        if (colLetter) {
          const colIdx = excelColToIdx(colLetter);
          // インデックスが有効範囲（0 〜 totalCols-1）の場合のみ代入
          if (colIdx >= 0 && colIdx < totalCols) {
            const score = dayMental[mRow.id];
            if (score !== undefined && score !== null) {
              rowData[colIdx] = String(score);
            }
          }
        }
      });

      resultRows.push(rowData);
    });

    return resultRows;
  };

  // Shift_JISでCSVをダウンロード
  const downloadCSVShiftJIS = (csvText: string, filename: string) => {
    // 文字列をUnicodeコードポイント配列に変換
    const unicodeArray = encoding.stringToCode(csvText);
    // Shift_JISに変換
    const sjisCodeList = encoding.convert(unicodeArray, {
      to: 'SJIS',
      from: 'UNICODE'
    });
    const sjisUint8Array = new Uint8Array(sjisCodeList);
    const blob = new Blob([sjisUint8Array], { type: 'text/csv;charset=shift_jis;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 動的列マッピングCSV出力の実行ハンドラー
  const handleExportMappedCSV = (isSingleDate: boolean) => {
    let targetDates: string[] = [];
    if (isSingleDate) {
      for (let delta = -(mappingDays - 1); delta <= 0; delta++) {
        targetDates.push(shiftDateString(selectedDate, delta));
      }
    } else {
      targetDates = getAllDates();
    }
    
    if (targetDates.length === 0) {
      triggerAlert('error', '⚠️ 出力対象のデータが存在しません。');
      return;
    }

    // 少なくとも1つのマッピングが設定されているか確認
    const hasAnyMapping = Object.values(mappingConfig).some(val => {
      const s = val as string;
      return s && s.trim() !== "";
    });
    if (!hasAnyMapping) {
      triggerAlert('error', '⚠️ 項目が1つもマッピングされていません。列のアルファベット（A, B, Cなど）を指定してください。');
      return;
    }

    // 列数の検証
    if (totalCols <= 0) {
      triggerAlert('error', '⚠️ 総列数は1以上に指定してください。');
      return;
    }

    try {
      const rows = generateMappingRows(targetDates);
      const csvContent = rows.map(r => r.join(',')).join('\r\n');
      const fileName = isSingleDate 
        ? `体調記録マッピング_${mappingDays}日分_${selectedDate}.csv` 
        : `体調記録マッピング_全期間.csv`;
      
      downloadCSVShiftJIS(csvContent, fileName);
      triggerAlert('success', `💾 ${fileName} をShift_JIS文字コードで出力しました。`);
    } catch (error) {
      console.error(error);
      triggerAlert('error', '⚠️ CSV出力中にエラーが発生しました。');
    }
  };

  // --- CSV Import State Variables ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [dateColIdx, setDateColIdx] = useState<number>(0);
  const [sleepStartIndex, setSleepStartIndex] = useState<number>(-1);
  const [sleepMappings, setSleepMappings] = useState<{ [stampId: string]: string }>(() => {
    const saved = localStorage.getItem('sleep_mappings_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    const initial: { [stampId: string]: string } = {};
    stamps.forEach(s => {
      if (s.name === '就寝' || s.id === '★') {
        initial[s.id] = '★,×';
      } else if (s.name === '睡眠' || s.id === 'S') {
        initial[s.id] = 'S,1';
      } else if (s.name === '覚醒' || s.id === '×') {
        initial[s.id] = '×,覚醒';
      } else if (s.name === '起床' || s.id === '○') {
        initial[s.id] = '○,起床';
      } else if (s.name === '横寝' || s.id === '－') {
        initial[s.id] = '－,-';
      } else {
        initial[s.id] = s.symbol;
      }
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('sleep_mappings_config', JSON.stringify(sleepMappings));
  }, [sleepMappings]);
  const [columnMappings, setColumnMappings] = useState<{
    [colIdx: number]: {
      type: 'ignore' | 'create_new' | 'existing';
      targetRowId?: string;
      scaleType?: '11' | '5';
    };
  }>({});
  const [importStep, setImportStep] = useState<'idle' | 'mapping' | 'confirm' | 'success'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    updatedDates: string[];
    newRowsCreatedCount: number;
    autoMappedCount: number;
    manuallyMappedCount: number;
    ignoredCount: number;
  } | null>(null);

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);

  const triggerAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertState({ type, message });
    showToast(message);
    if (type !== 'error') {
      setTimeout(() => {
        setAlertState(prev => prev?.message === message ? null : prev);
      }, 8000);
    }
  };

  const handleExport = async (forSingleDate?: string) => {
    const { generateCSVText } = await import('../services/csvService');
    const csvText = generateCSVText(records, forSingleDate, customColNames, stamps);
    const fileName = forSingleDate 
      ? `睡眠記録_${forSingleDate}.csv` 
      : `睡眠記録_全期間.csv`;
    setExportModalData({
      csvText,
      fileName,
      forSingleDate
    });
  };

  const handleCopyCSV = () => {
    if (!exportModalData) return;
    navigator.clipboard.writeText(exportModalData.csvText)
      .then(() => {
        setIsCopied(true);
        triggerAlert('success', '📋 クリップボードにCSVをコピーしました！');
        setTimeout(() => setIsCopied(false), 2500);
      })
      .catch((err) => {
        console.error('Failed to copy CSV:', err);
        triggerAlert('error', '⚠️ コピーに失敗しました。');
      });
  };

  const handleSaveAsFile = async (forceDownload: boolean) => {
    if (!exportModalData) return;
    try {
      const { exportToCSV } = await import('../services/csvService');
      await exportToCSV(records, exportModalData.forSingleDate, forceDownload, customColNames, stamps);
      triggerAlert('success', '💾 CSVフォーマットでデータを保存しました。');
    } catch (e) {
      console.error(e);
      triggerAlert('error', '⚠️ 保存失敗。コピーをお試しください。');
    }
  };

  const handleDeveloperCopy = () => {
    const rows: string[] = [];

    const sleepStamp = stamps.find(s => s.name === '睡眠');
    const sleepSym = sleepStamp ? sleepStamp.symbol : 'S';
    
    const bedtimeStamp = stamps.find(s => s.name === '就寝');
    const bedtimeSym = bedtimeStamp ? bedtimeStamp.symbol : '★';
    
    const wakeupStamp = stamps.find(s => s.name === '起床');
    const wakeupSym = wakeupStamp ? wakeupStamp.symbol : '○';

    for (let delta = -(copyDays - 1); delta <= 0; delta++) {
      const currentDateString = shiftDateString(selectedDate, delta);
      const record = records[currentDateString] || createBlankRecord();
      const formattedDate = currentDateString.replace(/-/g, '/');
      
      const parts: string[] = [];
      parts.push(formattedDate);
      
      for (let i = 0; i < 10; i++) {
        parts.push('');
      }
      
      let bedtimeStr = '';
      let bedtimeIdx = -1;
      for (let i = 0; i < 48; i++) {
        const mappedSym = getEffectiveSymbol(record[i], stamps);
        if (mappedSym === bedtimeSym) {
          bedtimeIdx = i;
          const hour = Math.floor(i / 2);
          bedtimeStr = String(hour);
          break;
        }
      }
      parts.push(bedtimeStr);
      
      let wakeupStr = '';
      for (let i = 0; i < 48; i++) {
        const mappedSym = getEffectiveSymbol(record[i], stamps);
        if (mappedSym === wakeupSym) {
          const hour = Math.floor(i / 2);
          wakeupStr = String(hour);
          break;
        }
      }
      parts.push(wakeupStr);
      
      let onsetStr = '';
      if (bedtimeIdx !== -1) {
        let sleepIdx = -1;
        for (let i = bedtimeIdx + 1; i < 48; i++) {
          const mappedSym = getEffectiveSymbol(record[i], stamps);
          if (mappedSym === sleepSym) {
            sleepIdx = i;
            break;
          }
        }
        if (sleepIdx !== -1) {
          const hours = (sleepIdx - bedtimeIdx) * 0.5;
          onsetStr = String(hours);
        }
      }
      parts.push(onsetStr);
      
      let sleepHours = 0;
      for (let i = 0; i < 48; i++) {
        const mappedSym = getEffectiveSymbol(record[i], stamps);
        if (mappedSym === sleepSym) {
          sleepHours += 0.5;
        }
      }
      const sleepHoursStr = sleepHours > 0 ? String(sleepHours) : '';
      parts.push(sleepHoursStr);
      parts.push('');
      
      for (let i = 0; i < 48; i++) {
        parts.push(getEffectiveSymbol(record[i], stamps) || '');
      }
      
      rows.push(parts.join('\t'));
    }

    const tsvText = rows.join('\r\n');
    navigator.clipboard.writeText(tsvText)
      .then(() => {
        triggerAlert('success', `📋 過去 ${copyDays} 日分のExcel貼り付け用データをコピーしました！`);
      })
      .catch((err) => {
        console.error(err);
        triggerAlert('error', '⚠️ コピーに失敗しました。');
      });
  };

  // --- CSV Import Helper Functions ---
  const parseFullCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // double double-quote is raw quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim().replace(/^"|"$/g, '').trim());
        current = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(current.trim().replace(/^"|"$/g, '').trim());
        result.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }

    if (row.length > 0 || current !== '') {
      row.push(current.trim().replace(/^"|"$/g, '').trim());
      result.push(row);
    }

    // Filter out completely empty or blank lines
    return result.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  };

  const parseExcelDate = (dateVal: string): string | null => {
    if (!dateVal) return null;
    const clean = dateVal.trim();
    
    const standardMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (standardMatch) {
      const y = standardMatch[1];
      const m = standardMatch[2].padStart(2, '0');
      const d = standardMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    
    const jpMatch = clean.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (jpMatch) {
      const y = jpMatch[1];
      const m = jpMatch[2].padStart(2, '0');
      const d = jpMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Support Excel serial number dates (e.g. June 22, 2026 is 46195)
    const num = Number(clean);
    if (!isNaN(num) && num >= 30000 && num <= 70000) {
      // Offset for UNIX timestamp epoch (25569 days since Jan 1, 1900)
      // Multiply by 86400000 ms to convert days to milliseconds
      const date = new Date((num - 25569) * 86400000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return null;
  };

  const isBlankOrNumber = (val: string): boolean => {
    if (!val) return true;
    const trimmed = val.trim();
    if (trimmed === '') return true;
    return !isNaN(Number(trimmed));
  };

  const handleCSVFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;

      let text = '';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        text = decoder.decode(buffer);
      } catch (err) {
        // UTF-8デコード中に壊れたエンコード(Shift_JISなどの不正バイト)を検知した場合
        try {
          const decoder = new TextDecoder('shift-jis');
          text = decoder.decode(buffer);
        } catch (sjisErr) {
          triggerAlert('error', '⚠️ 文字エンコーディングの解析に失敗しました。UTF-8かShift-JISで保存されたCSVを使用してください。');
          return;
        }
      }

      const parsedLines = parseFullCSV(text);

      if (parsedLines.length < 1) {
        triggerAlert('error', '⚠️ CSVファイルの中身が空、または正しく読み取れませんでした。');
        return;
      }

      const headers = parsedLines[0];
      const dataRows = parsedLines.slice(1);

      let foundDateIdx = headers.findIndex(h => 
        ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => h.includes(p))
      );
      if (foundDateIdx === -1) {
        foundDateIdx = 0;
      }

      // 列データの数値範囲から11段階か5段階かを推測するヘルパー
      const guessColumnScaleType = (colIdx: number): '11' | '5' => {
        let hasNegativeOrZeroOrSixPlus = false;
        let hasOneToFive = false;
        for (const rStr of dataRows) {
          const valStr = rStr[colIdx];
          if (valStr !== undefined && valStr !== null && valStr.trim() !== '') {
            const num = Number(valStr.trim());
            if (!isNaN(num)) {
              if (num < 1 || num > 5) {
                hasNegativeOrZeroOrSixPlus = true;
                break;
              }
              if (num >= 1 && num <= 5) {
                hasOneToFive = true;
              }
            }
          }
        }
        if (hasNegativeOrZeroOrSixPlus) return '11';
        if (hasOneToFive) return '5';
        return '11'; // デフォルト
      };

      setDateColIdx(foundDateIdx);

      // Detect 48-column sleep grid starting index
      let sleepGridStart = -1;
      let bestScore = 0;
      for (let s = 0; s <= headers.length - 48; s++) {
        let score = 0;
        for (let h = 0; h < 24; h++) {
          const val = headers[s + 2 * h]?.trim() || '';
          const matchesHour = 
            val === String(h) || 
            val === `${h}時` || 
            val === `${h}:00` ||
            val === `0${h}`.slice(-2) ||
            val === `${`0${h}`.slice(-2)}:00`;
          if (matchesHour) {
            score++;
          }
        }
        if (score > bestScore && score >= 12) {
          bestScore = score;
          sleepGridStart = s;
        }
      }
      setSleepStartIndex(sleepGridStart);

      const initialMappings: typeof columnMappings = {};
      headers.forEach((h, idx) => {
        if (idx === foundDateIdx) return;

        const isSleepCol = sleepGridStart !== -1 && idx >= sleepGridStart && idx < sleepGridStart + 48;
        const hTrim = h.trim();
        const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== foundDateIdx;
        const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

        if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) {
          initialMappings[idx] = {
            type: 'ignore'
          };
          return;
        }

        const predictedScale = guessColumnScaleType(idx);

        const match = mentalRows.find(r => r.name === h);
        if (match) {
          initialMappings[idx] = {
            type: 'existing',
            targetRowId: match.id,
            scaleType: predictedScale
          };
        } else {
          initialMappings[idx] = {
            type: 'ignore',
            scaleType: predictedScale
          };
        }
      });

      setCsvFile(file);
      setCsvHeaders(headers);
      setCsvRows(dataRows);
      setColumnMappings(initialMappings);
      setImportStep('mapping');
      triggerAlert('info', '📋 CSVデータを読み込みました。項目（列）の対応関係を設定してください。');
    };
    reader.readAsArrayBuffer(file);
  };

  const updateMappingAction = (colIdx: number, actionType: 'ignore' | 'create_new' | 'existing') => {
    setColumnMappings(prev => ({
      ...prev,
      [colIdx]: {
        ...prev[colIdx],
        type: actionType,
        targetRowId: actionType === 'existing' ? (prev[colIdx]?.targetRowId || mentalRows[0]?.id || '') : undefined,
        scaleType: prev[colIdx]?.scaleType || '11'
      }
    }));
  };

  const updateMappingTarget = (colIdx: number, targetId: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [colIdx]: {
        ...prev[colIdx],
        targetRowId: targetId
      }
    }));
  };

  const updateMappingScaleType = (colIdx: number, scaleType: '11' | '5') => {
    setColumnMappings(prev => ({
      ...prev,
      [colIdx]: {
        ...prev[colIdx],
        scaleType
      }
    }));
  };

  const cancelAutoMapping = (colIdx: number) => {
    setColumnMappings(prev => ({
      ...prev,
      [colIdx]: {
        type: 'ignore',
        targetRowId: undefined,
        scaleType: prev[colIdx]?.scaleType || '11'
      }
    }));
  };

  const handleProceedToConfirm = () => {
    let validDateCount = 0;
    const dates: string[] = [];
    
    csvRows.forEach(row => {
      const dateVal = row[dateColIdx];
      if (dateVal) {
        const parsedDate = parseExcelDate(dateVal);
        if (parsedDate) {
          validDateCount++;
          if (!dates.includes(parsedDate)) {
            dates.push(parsedDate);
          }
        }
      }
    });

    if (validDateCount === 0) {
      triggerAlert('error', '⚠️ CSVに有効な「日付」列データ（例: 2026/6/22）が見つかりません。');
      return;
    }

    dates.sort();
    
    let autoMappedCount = 0;
    let manuallyMappedCount = 0;
    let newRowsCreatedCount = 0;
    let ignoredCount = 0;

    csvHeaders.forEach((h, idx) => {
      if (idx === dateColIdx) return;
      
      const isSleepCol = sleepStartIndex !== -1 && idx >= sleepStartIndex && idx < sleepStartIndex + 48;
      const hTrim = h.trim();
      const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== dateColIdx;
      const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

      if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) return;

      const mapping = columnMappings[idx];
      if (!mapping || mapping.type === 'ignore') {
        ignoredCount++;
      } else if (mapping.type === 'create_new') {
        newRowsCreatedCount++;
      } else if (mapping.type === 'existing') {
        const perfectMatch = mentalRows.some(r => r.name === h);
        if (perfectMatch && mapping.targetRowId === mentalRows.find(r => r.name === h)?.id) {
          autoMappedCount++;
        } else {
          manuallyMappedCount++;
        }
      }
    });

    setImportSummary({
      totalRows: csvRows.length,
      updatedDates: dates,
      newRowsCreatedCount,
      autoMappedCount,
      manuallyMappedCount,
      ignoredCount
    });
    setImportStep('confirm');
  };

  const executeImport = () => {
    const newRowsAdded: MentalRow[] = [];
    const mappingsCopy = { ...columnMappings };

    csvHeaders.forEach((h, idx) => {
      if (idx === dateColIdx) return;
      
      const isSleepCol = sleepStartIndex !== -1 && idx >= sleepStartIndex && idx < sleepStartIndex + 48;
      const hTrim = h.trim();
      const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== dateColIdx;
      const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

      if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) return;

      const mapping = mappingsCopy[idx];
      if (mapping && mapping.type === 'create_new') {
        const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newRow: MentalRow = {
          id: newId,
          name: h,
          description: `${h}（CSVから移行）`,
          icon: 'heart',
          scaleType: mapping.scaleType === '5' ? 'severity' : 'bipolar'
        };
        newRowsAdded.push(newRow);
        
        mappingsCopy[idx] = {
          ...mapping,
          targetRowId: newId
        };
      }
    });

    const updatedRecords = { ...mentalRecords };
    const updatedSleepRecords = { ...records };

    csvRows.forEach(row => {
      const dateVal = row[dateColIdx];
      if (!dateVal) return;
      
      const parsedDate = parseExcelDate(dateVal);
      if (!parsedDate) return;

      // 1. Process mental health ratings
      if (!updatedRecords[parsedDate]) {
        updatedRecords[parsedDate] = {};
      }
      
      const dayRecord = { ...updatedRecords[parsedDate] };

      csvHeaders.forEach((h, idx) => {
        if (idx === dateColIdx) return;
        
        const isSleepCol = sleepStartIndex !== -1 && idx >= sleepStartIndex && idx < sleepStartIndex + 48;
        const hTrim = h.trim();
        const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== dateColIdx;
        const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

        if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) return;

        const mapping = mappingsCopy[idx];
        if (!mapping || mapping.type === 'ignore' || !mapping.targetRowId) return;

        const cellValue = row[idx];
        if (cellValue !== undefined && cellValue !== null && cellValue.trim() !== '') {
          const rawScore = parseInt(cellValue, 10);
          if (!isNaN(rawScore)) {
            const scaleType = mapping.scaleType || '11';
            let finalScore: number | null = null;

            if (scaleType === '11') {
              // 11段階: Excel上の -5 〜 +5 をそのままアプリにマッピング（範囲チェックあり）
              if (rawScore >= -5 && rawScore <= 5) {
                finalScore = rawScore;
              }
            } else if (scaleType === '5') {
              // 5段階: Excel上の 1 〜 5 をそのままアプリにマッピング（反転させない）
              if (rawScore >= 1 && rawScore <= 5) {
                finalScore = rawScore;
              }
            }

            if (finalScore !== null) {
              (dayRecord as any)[mapping.targetRowId] = finalScore;
            }
          }
        }
      });

      updatedRecords[parsedDate] = dayRecord;

      // 2. Process sleep grid records if detected
      if (sleepStartIndex !== -1) {
        if (!updatedSleepRecords[parsedDate]) {
          updatedSleepRecords[parsedDate] = createBlankRecord();
        }
        const sleepDayRecord = { ...updatedSleepRecords[parsedDate] };

        // Helper to match string representation of symbol to actual stamp ID
        const getStampIdFromCellVal = (cellVal: string): string | null => {
          const trimmed = cellVal.trim();
          if (!trimmed) return null;

          for (const [stampId, val] of Object.entries(sleepMappings)) {
            const mappedStr = (val || '') as string;
            const acceptedValues = mappedStr.split(',').map(v => v.trim()).filter(Boolean);
            if (acceptedValues.includes(trimmed)) {
              return stampId;
            }
          }
          const matchedStamp = stamps.find(s => s.id === trimmed || s.symbol === trimmed);
          if (matchedStamp) {
            return matchedStamp.id;
          }
          return null;
        };

        for (let slotIdx = 0; slotIdx < 48; slotIdx++) {
          if (sleepStartIndex + slotIdx >= row.length) break;
          const cellVal = row[sleepStartIndex + slotIdx];
          if (cellVal !== undefined && cellVal !== null) {
            const stampId = getStampIdFromCellVal(cellVal);
            sleepDayRecord[slotIdx] = stampId;
          }
        }
        updatedSleepRecords[parsedDate] = sleepDayRecord;
      }
    });

    if (newRowsAdded.length > 0) {
      const finalRows = [...mentalRows, ...newRowsAdded];
      setMentalRows(finalRows);
      saveMentalRowsToStorage(finalRows);
    }

    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);

    if (sleepStartIndex !== -1) {
      setRecords(updatedSleepRecords);
      saveRecordsToStorage(updatedSleepRecords);
    }

    setImportStep('success');
    let toastMsg = `🎉 ${importSummary?.totalRows}件の体調記録を正しくインポートしました！`;
    if (sleepStartIndex !== -1) {
      toastMsg = `🎉 ${importSummary?.totalRows}件の体調記録と睡眠記録を正しくインポートしました！`;
    }
    showToast(toastMsg);
  };

  const resetImportWizard = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMappings({});
    setImportSummary(null);
    setImportStep('idle');
    setSleepStartIndex(-1);
  };

  return (
    <div className={`flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-full font-sans pb-16 transition-colors duration-300 ${
      displayMode === 'dark' ? 'bg-[#121212] text-[#e6e1e5]' : 'bg-slate-50 text-slate-800'
    }`} id="developer-tab-main-panel">
      
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#49454F]">
        <Code className="h-5 w-5 text-[#D0BCFF]" />
        <h2 className="text-sm font-black tracking-tight text-slate-700 dark:text-[#E6E1E5]">
          開発者・データ出力ツール一覧
        </h2>
      </div>

      {/* Top Banner Alerts */}
      <AnimatePresence>
        {alertState && (
          <motion.div
            key="developer-banner-alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md text-xs font-bold leading-normal relative overflow-hidden ${
              alertState.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-[#8C1D18]/25 dark:border-[#F2B8B5] dark:text-[#F2B8B5]'
                : alertState.type === 'success'
                ? 'bg-emerald-50 border-emerald-250 text-emerald-800 dark:bg-[#0f3d1b]/25 dark:border-[#A9F5A9] dark:text-[#A9F5A9]'
                : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-[#062E6F]/25 dark:border-[#A8C7FA] dark:text-[#A8C7FA]'
            }`}
            id="developer-top-alert"
          >
            {alertState.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-[#F2B8B5] shrink-0 mt-0.5" />
            ) : alertState.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-[#A9F5A9] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-[#A8C7FA] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 pr-6 whitespace-pre-wrap">{alertState.message}</div>
            <button
              onClick={() => setAlertState(null)}
              className="absolute top-3 right-3 rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Excel Copy Tool Card */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 ${
        displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200 shadow-sm'
      }`} id="excel-and-clipboard-copy-card">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 pb-3 border-b border-slate-100 dark:border-[#49454F]">
          <Copy className="h-5 w-5" />
          <h3 className="font-extrabold text-sm md:text-base text-amber-700 dark:text-amber-400">パソコンのExcel(エクセル)・メモ用コピペツール</h3>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-550 dark:text-[#CAC4D0] leading-relaxed font-semibold mt-3">
          カレンダーの選択中の日（<b>{selectedDate}</b>）から、指定日数分のカレンダーを<strong>古い日〜時系列順に並び替え</strong>にして、エクセルに綺麗に貼り付く専用文字データに変換＆コピーします。パソコンに記録を送りたい際などに便利です。
        </p>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-[#332D41] space-y-3.5 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <span className="text-xs font-black text-slate-600 dark:text-[#CAC4D0] font-sans">抽出コピーするカレンダー期間分:</span>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCopyDays(prev => Math.max(1, prev - 1))}
                className="h-9 w-9 text-base font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none cursor-pointer text-black font-sans shadow-2xs"
              >
                －
              </button>
              <input
                type="number"
                value={copyDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCopyDays(isNaN(val) ? 1 : Math.max(1, val));
                }}
                className="h-9 w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-sans font-extrabold text-center focus:outline-none text-slate-850 dark:text-[#e3e2e6]"
              />
              <button
                type="button"
                onClick={() => setCopyDays(prev => prev + 1)}
                className="h-9 w-9 text-base font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none cursor-pointer text-black font-sans shadow-2xs"
              >
                ＋
              </button>
              <span className="text-xs font-bold text-slate-505 ml-1 font-sans">日分</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[7, 14, 30, 90].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCopyDays(preset)}
                className={`py-2 text-[11px] font-sans font-extrabold rounded-lg border transition-all cursor-pointer ${
                  copyDays === preset
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 shadow-3xs'
                    : 'bg-white dark:bg-slate-850 text-slate-550 dark:text-slate-400 border-slate-205 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {preset}日間
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDeveloperCopy}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-[#e3e2e6] text-xs font-sans font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer h-12"
            id="settings-developer-copy-trigger-btn"
          >
            <Copy className="h-4 w-4" />
            過去 {copyDays} 日分をExcel用にコピー
          </button>
        </div>

        {/* Selected Date CSV download */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleExport(selectedDate)}
            className={`flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-[#36343B] active:bg-slate-100 transition-all text-left shadow-3xs cursor-pointer ${
              displayMode === 'dark' ? 'border-[#49454F] bg-[#25232A]' : 'border-gray-150 bg-[#fafafa]'
            }`}
            id="settings-export-day-btn"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-[#062E6F]/40 text-blue-600 dark:text-[#A8C7FA]">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-[#E6E1E5]">選択日 ({selectedDate}) のみ出力</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight dark:text-[#CAC4D0]">1日分CSV保存</p>
            </div>
          </button>

          <button
            onClick={() => handleExport()}
            className={`flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-[#36343B] active:bg-slate-100 transition-all text-left shadow-3xs cursor-pointer ${
              displayMode === 'dark' ? 'border-[#49454F] bg-[#25232A]' : 'border-gray-150 bg-[#fafafa]'
            }`}
            id="settings-export-all-btn"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-[#381E72]/40 text-indigo-600 dark:text-[#D0BCFF]">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-[#E6E1E5]">全期間まとめてCSV出力</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight dark:text-[#CAC4D0]">全活動記録をCSVに保存</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. メンタルデータの動的Excel列マッピング（CSV出力） */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 ${
        displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200 shadow-sm'
      }`} id="mental-excel-dynamic-mapping-card">
        <div className={`flex items-center gap-2 pb-3 border-b ${
          displayMode === 'dark' ? 'text-[#A9F5A9] border-[#49454F]' : 'text-emerald-600 border-slate-100'
        }`}>
          <FileSpreadsheet className="h-5 w-5" />
          <h3 className={`font-extrabold text-sm md:text-base ${
            displayMode === 'dark' ? 'text-[#A9F5A9]' : 'text-emerald-700'
          }`}>
            🎯 メンタルデータの動的Excel列マッピング（CSV出力）
          </h3>
        </div>

        <p className={`text-[11px] sm:text-xs leading-relaxed font-semibold mt-3 ${
          displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-655 text-slate-700'
        }`}>
          お持ちのExcelファイルの日付列や、アプリに登録されているすべてのメンタル（体調）項目を、それぞれ「どの列（A, B, C...）」に出力するかを自由にマッピングして、CSVをエクスポートできます。
        </p>

        {/* 総列数・抽出期間指定 */}
        <div className="p-4 rounded-xl border border-emerald-250/30 bg-emerald-50/10 dark:bg-emerald-950/10 space-y-4 mt-4">
          {/* 総列数 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3.5 border-b border-emerald-250/20">
            <span className="text-xs font-black text-slate-600 dark:text-slate-350 font-sans flex items-center gap-1.5 flex-wrap">
              <span>📊 Excelの総列数:</span>
              <span className="text-[10px] text-slate-400 font-bold">（日付やメンタル項目を含むエクセル全体の列数）</span>
            </span>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTotalCols(prev => Math.max(1, prev - 1))}
                className="h-9 w-9 text-base font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none cursor-pointer text-black font-sans shadow-2xs"
              >
                －
              </button>
              <input
                type="number"
                value={totalCols}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTotalCols(isNaN(val) ? 1 : Math.max(1, val));
                }}
                className="h-9 w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-sans font-extrabold text-center focus:outline-none text-slate-850 dark:text-[#e3e2e6]"
              />
              <button
                type="button"
                onClick={() => setTotalCols(prev => prev + 1)}
                className="h-9 w-9 text-base font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none cursor-pointer text-black font-sans shadow-2xs"
              >
                ＋
              </button>
              <span className="text-xs font-bold text-slate-505 ml-1 font-sans">列</span>
            </div>
          </div>

          {/* 抽出日数 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <span className="text-xs font-black text-slate-600 dark:text-slate-350 font-sans flex items-center gap-1.5 flex-wrap">
                <span>📅 抽出出力する期間分:</span>
                <span className="text-[10px] text-slate-400 font-bold">（選択日 {selectedDate} から何日分遡ってマッピングCSV出力するか）</span>
              </span>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMappingDays(prev => Math.max(1, prev - 1))}
                  className="h-9 w-9 text-base font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none cursor-pointer text-black font-sans shadow-2xs"
                >
                  －
                </button>
                <input
                  type="number"
                  value={mappingDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMappingDays(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="h-9 w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-sans font-extrabold text-center focus:outline-none text-slate-850 dark:text-[#e3e2e6]"
                />
                <button
                  type="button"
                  onClick={() => setMappingDays(prev => prev + 1)}
                  className="h-9 w-9 text-base font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none cursor-pointer text-black font-sans shadow-2xs"
                >
                  ＋
                </button>
                <span className="text-xs font-bold text-slate-505 ml-1 font-sans">日分</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[1, 7, 14, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMappingDays(preset)}
                  className={`py-2 text-[11px] font-sans font-extrabold rounded-lg border transition-all cursor-pointer ${
                    mappingDays === preset
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-[#004d40] dark:text-[#80cbc4] dark:border-[#004d40] shadow-3xs'
                      : 'bg-white dark:bg-slate-850 text-slate-550 dark:text-slate-400 border-slate-205 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {preset}日間
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 項目別マッピング */}
        <div className="mt-5 space-y-3">
          <label className="text-xs font-black text-slate-650 dark:text-slate-300 block">
            📋 項目ごとのエクセル列マッピング設定
          </label>

          <div className={`border rounded-xl divide-y overflow-hidden ${
            displayMode === 'dark' ? 'border-slate-800 divide-slate-800' : 'border-slate-200 divide-slate-150'
          }`}>
            {(() => {
              const allItems = [
                { id: 'date', name: '日付 (YYYY/MM/DD)', isDate: true },
                ...mentalRows.map(r => ({ id: r.id, name: r.name, isDate: false }))
              ];

              return allItems.map(item => {
                const currentVal = mappingConfig[item.id] || "";
                const idx = excelColToIdx(currentVal);
                const isOutOfRange = currentVal !== "" && (idx < 0 || idx >= totalCols);

                return (
                  <div key={item.id} className={`p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${
                    displayMode === 'dark' ? 'hover:bg-slate-850/35 bg-slate-900/25' : 'hover:bg-slate-50/50 bg-white'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {item.isDate ? (
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/45 text-amber-500 text-xs shrink-0 font-bold">
                          📅
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/45 text-indigo-500 text-xs shrink-0 font-bold">
                          {item.id.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className={`font-extrabold text-xs sm:text-sm ${displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-800'}`}>
                          {item.name}
                        </p>
                        {isOutOfRange && (
                          <p className="text-[10px] text-rose-500 font-bold mt-0.5">
                            ⚠️ 指定された列は設定範囲外 (A〜{idxToExcelCol(totalCols - 1)}) です
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold ${displayMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Excel列記号:
                      </span>
                      <input
                        type="text"
                        value={currentVal}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                          setMappingConfig(prev => ({
                            ...prev,
                            [item.id]: val
                          }));
                        }}
                        placeholder={item.isDate ? "例: A" : "例: B"}
                        className={`w-20 px-2 py-1 text-xs text-center font-extrabold rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                          displayMode === 'dark'
                            ? 'bg-slate-900 border-slate-700 text-[#e3e2e6] placeholder-slate-600'
                            : 'bg-white border-slate-300 text-slate-800 placeholder-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {mentalRows.length === 0 && (
            <p className="text-[10px] text-slate-400 italic pl-1 font-semibold">
              ※ メンタル項目が登録されていません。「体調」タブから項目を追加してください。
            </p>
          )}
        </div>

        {/* 実行ボタン */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <button
            onClick={() => handleExportMappedCSV(true)}
            className={`flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-[#36343B] active:bg-slate-100 transition-all text-left shadow-3xs cursor-pointer ${
              displayMode === 'dark' ? 'border-[#49454F] bg-[#25232A]' : 'border-gray-150 bg-[#fafafa]'
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-[#0f3d1b]/40 text-emerald-600 dark:text-[#A9F5A9] font-sans">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-[#E6E1E5] font-sans">選択日から {mappingDays} 日分をマッピング出力</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans dark:text-[#CAC4D0]">選択日 ({selectedDate}) を含む指定期間 ({mappingDays}日分) をCSV保存</p>
            </div>
          </button>

          <button
            onClick={() => handleExportMappedCSV(false)}
            className={`flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-[#36343B] active:bg-slate-100 transition-all text-left shadow-3xs cursor-pointer ${
              displayMode === 'dark' ? 'border-[#49454F] bg-[#25232A]' : 'border-gray-150 bg-[#fafafa]'
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-[#004d40]/40 text-teal-600 dark:text-[#80cbc4] font-sans">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-[#E6E1E5] font-sans">全期間まとめてマッピング出力</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-sans font-bold dark:text-[#CAC4D0]">全期間のデータをマッピングしてCSV保存</p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. 体調・メンタル記録のCSVインポートカード */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 ${
        displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-slate-200 shadow-sm'
      }`} id="csv-mental-importer-box">
        <div className={`flex items-center gap-2 pb-3 border-b ${
          displayMode === 'dark' ? 'text-[#D0BCFF] border-[#49454F]' : 'text-indigo-600 border-slate-100'
        }`}>
          <FileSpreadsheet className="h-5 w-5" />
          <h3 className={`font-extrabold text-sm md:text-base ${
            displayMode === 'dark' ? 'text-[#D0BCFF]' : 'text-indigo-700'
          }`}>
            体調・メンタルデータのCSVインポート（Excel移行）
          </h3>
        </div>

        <p className={`text-[11px] sm:text-xs leading-relaxed font-semibold mt-3 ${
          displayMode === 'dark' ? 'text-slate-300' : 'text-slate-650 text-slate-700'
        }`}>
          Excel等で記録していた過去の健康データをアプリに移管します。ヘッダー（1行目）から自動で項目を判定しマージするため、列の順番が違っても正しく取り込めます。
        </p>

        {importStep === 'idle' && (
          <div className="mt-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleCSVFileRead(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                isDragOver 
                  ? 'border-sky-500 bg-sky-50/10' 
                  : (displayMode === 'dark' ? 'border-slate-700 hover:bg-slate-800 bg-slate-900/40' : 'border-slate-300 hover:bg-slate-50 bg-white')
              }`}
            >
              <Upload className="h-8 w-8 text-indigo-500 animate-bounce" />
              <div className="text-center">
                <p className={`text-xs font-extrabold ${displayMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  CSVファイルをドロップするか、クリックして選択
                </p>
                <p className={`text-[10px] mt-1 font-bold ${displayMode === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  （拡張子が .csv のファイルを指定してください）
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCSVFileRead(file);
                }}
                className="hidden"
              />
            </div>
            <div className={`mt-3.5 border rounded-xl p-4 text-xs leading-relaxed font-medium shadow-xs ${
              displayMode === 'dark'
                ? 'bg-indigo-950/20 border-indigo-900/60 text-slate-205 text-slate-200'
                : 'bg-indigo-50/50 border-indigo-150 text-indigo-950'
            }`}>
              <span className={`font-black block mb-1 ${
                displayMode === 'dark' ? 'text-indigo-300' : 'text-indigo-805 text-indigo-800'
              }`}>💡 Excel/CSV作成の注意点:</span>
              <ul className="list-disc list-inside mt-1.5 space-y-1.5 pl-1">
                <li>「日付」列（例: 2026/6/22）を必ず含めてください。</li>
                <li>「気分」「不安」など、インポートしたい項目を1行目の列見出し（ヘッダー名）に記述してください。</li>
                <li>データ値はアプリと同様の段階的な数値（例: -5, -3, -1, 0, 1, 3, 5）が含まれている必要があります。</li>
              </ul>
            </div>
          </div>
        )}

        {importStep === 'mapping' && (
          <div className="mt-4 space-y-4">
            <div className={`border rounded-xl p-4 shadow-xs ${
              displayMode === 'dark' 
                ? 'border-indigo-900/60 bg-indigo-950/20 text-indigo-200' 
                : 'border-indigo-200 bg-indigo-50/70 text-indigo-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="font-black leading-normal flex items-center gap-2">
                  <AlertCircle className={`h-5 w-5 shrink-0 ${
                    displayMode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                  <span>日付判定列:</span>
                </p>
                <select
                  value={dateColIdx}
                  onChange={(e) => {
                    const idxVal = parseInt(e.target.value, 10);
                    setDateColIdx(idxVal);
                    // Reset this column's metric mapping so it's not mapped as a score/comment column
                    setColumnMappings(prev => {
                      const updated = { ...prev };
                      delete updated[idxVal];
                      return updated;
                    });
                  }}
                  className={`text-[11px] rounded-lg p-1.5 font-bold outline-none border transition-colors ${
                    displayMode === 'dark'
                      ? 'bg-slate-850 border-slate-705 text-[#e3e2e6] focus:border-indigo-500'
                      : 'bg-white border-slate-250 text-slate-900 focus:border-indigo-600'
                  }`}
                >
                  {csvHeaders.map((h, idx) => (
                    <option key={idx} value={idx}>
                      列 {idx + 1}: {h || `(無題の列 ${idx + 1})`}
                    </option>
                  ))}
                </select>
              </div>
              <p className={`text-xs font-bold mt-2 pl-7 leading-relaxed ${
                displayMode === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                ※ CSVの日付が入っている列（通常は「日付」など）を選択してください。日付判定列に選ばれた列は評価項目のマッピングから除外されます。
              </p>
            </div>

            {sleepStartIndex !== -1 && (
              <div className={`border rounded-xl p-4 shadow-xs ${
                displayMode === 'dark' 
                  ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' 
                  : 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
              }`}>
                <p className="font-black text-xs leading-normal flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 shrink-0 ${
                    displayMode === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`} />
                  <span>睡眠データグリッドを自動検出しました（列 {sleepStartIndex + 1} 〜 {sleepStartIndex + 48}）</span>
                </p>
                <p className={`text-[11px] font-bold mt-1.5 pl-7 leading-relaxed ${
                  displayMode === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  30分間隔（24時間・計48列）の睡眠記録を同時にインポートします。
                </p>

                {/* 睡眠記号マッピングパネル */}
                <div className={`mt-3.5 pt-3.5 border-t ${
                  displayMode === 'dark' ? 'border-emerald-900/60' : 'border-emerald-200'
                }`}>
                  <label className="text-xs font-black block mb-2 text-indigo-750 text-indigo-700 dark:text-indigo-400">
                    🛏️ 睡眠記号の変換設定（Excelでの記述をアプリのスタンプに変換）
                  </label>
                  <p className={`text-[10px] font-bold mb-3 leading-normal ${
                    displayMode === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    CSV上の文字と、本アプリのスタンプを対応させます。複数ある場合は半角カンマ（,）で区切ってください。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stamps.map(stamp => {
                      const colorTheme = STAMP_COLORS[stamp.color] || STAMP_COLORS.purple;
                      return (
                        <div key={stamp.id} className={`flex items-center gap-2.5 p-2 rounded-lg border ${
                          displayMode === 'dark' ? 'bg-slate-900/80 border-slate-800 text-[#e3e2e6]' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          <div className={`h-7 w-7 flex items-center justify-center rounded-md font-sans font-black text-xs shrink-0 ${colorTheme.bgColor} ${colorTheme.textColor}`}>
                            {stamp.symbol}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black block truncate">{stamp.name}</span>
                            <input
                              type="text"
                              value={sleepMappings[stamp.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSleepMappings(prev => ({
                                  ...prev,
                                  [stamp.id]: val
                                }));
                              }}
                              placeholder="例: S, 1"
                              className={`w-full text-xs font-bold px-2 py-1 rounded-md border mt-1 focus:outline-hidden ${
                                displayMode === 'dark'
                                  ? 'bg-slate-950 border-slate-800 text-[#e3e2e6] focus:border-indigo-500'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-500'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Auto Mapped Section */}
            <div className="space-y-2">
              <h4 className={`text-xs font-black flex items-center gap-1.5 font-sans ${
                displayMode === 'dark' ? 'text-emerald-400' : 'text-emerald-805 text-emerald-800'
              }`}>
                <Check className="h-4 w-4 stroke-[3]" />
                自動対応した項目（ヘッダー名が完全一致）
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {csvHeaders.map((h, idx) => {
                  if (idx === dateColIdx) return null;
                  
                  const isSleepCol = sleepStartIndex !== -1 && idx >= sleepStartIndex && idx < sleepStartIndex + 48;
                  const hTrim = h.trim();
                  const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== dateColIdx;
                  const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

                  if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) return null;

                  const mapping = columnMappings[idx];
                  if (mapping?.type !== 'existing' || !mapping.targetRowId) return null;
                  const targetRow = mentalRows.find(r => r.id === mapping.targetRowId);
                  if (!targetRow) return null;
                  return (
                    <div key={idx} className={`p-3 rounded-xl border text-xs font-extrabold font-sans shadow-xs space-y-2.5 relative ${
                      displayMode === 'dark' 
                        ? 'bg-emerald-950/20 border-emerald-900 text-emerald-300' 
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    }`}>
                      <button
                        type="button"
                        onClick={() => cancelAutoMapping(idx)}
                        className={`absolute top-2.5 right-2.5 p-1 rounded-full border transition-all cursor-pointer z-10 ${
                          displayMode === 'dark'
                            ? 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300'
                        }`}
                        title="自動対応を解除して不一致に戻す"
                      >
                        <X className="h-3.5 w-3.5 stroke-[3.5]" />
                      </button>
                      <div className="flex flex-col pr-7">
                        <span className={displayMode === 'dark' ? 'text-slate-200' : 'text-slate-805 font-extrabold text-sm'}>{h}</span>
                        <span className={`font-sans truncate font-black mt-1 ${
                          displayMode === 'dark' ? 'text-emerald-400' : 'text-emerald-800'
                        }`}>➔ {targetRow.name} （自動）</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1.5 border-t border-emerald-250/20 dark:border-emerald-900/60 pr-7">
                        <span className={`text-[10px] shrink-0 ${displayMode === 'dark' ? 'text-emerald-400/85' : 'text-emerald-805 font-extrabold'}`}>評価段階:</span>
                        <select
                          value={mapping?.scaleType || '11'}
                          onChange={(e) => updateMappingScaleType(idx, e.target.value as '11' | '5')}
                          className={`flex-1 text-[11px] rounded-lg p-1.5 font-bold outline-none border transition-colors ${
                            displayMode === 'dark'
                              ? 'bg-slate-850 border-slate-700 text-slate-200 focus:border-emerald-500'
                              : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-600'
                          }`}
                        >
                          <option value="11">11段階 ( -5 〜 +5 )</option>
                          <option value="5">5段階 ( 1 〜 5 )</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                {csvHeaders.filter((h, idx) => {
                  if (idx === dateColIdx) return false;
                  
                  const isSleepCol = sleepStartIndex !== -1 && idx >= sleepStartIndex && idx < sleepStartIndex + 48;
                  const hTrim = h.trim();
                  const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== dateColIdx;
                  const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

                  if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) return false;

                  return columnMappings[idx]?.type === 'existing' && columnMappings[idx]?.targetRowId;
                }).length === 0 && (
                  <p className={`text-xs font-extrabold italic py-1 pl-1 ${
                    displayMode === 'dark' ? 'text-slate-500' : 'text-slate-600'
                  }`}>
                    （名称が完全一致した項目はありません。以下で個別に設定できます）
                  </p>
                )}
              </div>
            </div>

            {/* Unmapped Section */}
            <div className={`space-y-2.5 pt-3.5 border-t ${
              displayMode === 'dark' ? 'border-slate-805' : 'border-slate-200'
            }`}>
              <h4 className={`text-xs font-black flex items-center gap-1.5 ${
                displayMode === 'dark' ? 'text-slate-200' : 'text-slate-805 text-slate-800'
              }`}>
                <AlertCircle className={`h-4 w-4 shrink-0 ${
                  displayMode === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`} />
                不一致の項目（処理方法をそれぞれ選択してください）
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                 {csvHeaders.map((h, idx) => {
                  if (idx === dateColIdx) return null;
                  
                  const isSleepCol = sleepStartIndex !== -1 && idx >= sleepStartIndex && idx < sleepStartIndex + 48;
                  const hTrim = h.trim();
                  const isDupDate = ['日付', 'date', 'Date', '年月日', 'DAY', 'day'].some(p => hTrim === p) && idx !== dateColIdx;
                  const isCalcol = ['睡眠判定', '入眠時間', '総睡眠', '就寝', '起床'].includes(hTrim);

                  if (isSleepCol || isDupDate || isCalcol || isBlankOrNumber(h)) return null;

                  const mapping = columnMappings[idx];
                  if (mapping?.type === 'existing' && mapping.targetRowId && mentalRows.some(r => r.id === mapping.targetRowId && r.name === h)) return null;

                  return (
                    <div key={idx} className={`p-4 rounded-xl border shadow-xs space-y-3.5 text-xs ${
                      displayMode === 'dark' 
                        ? 'border-slate-800 bg-slate-900/80 text-[#e3e2e6]' 
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-extrabold text-sm ${
                          displayMode === 'dark' ? 'text-slate-100' : 'text-slate-900'
                        }`}>{h}</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${
                          displayMode === 'dark' 
                            ? 'text-amber-300 bg-amber-950/20 border-amber-900' 
                            : 'text-amber-800 bg-amber-100 border-amber-200'
                        }`}>
                          未設定
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => updateMappingAction(idx, 'ignore')}
                          className={`py-2 rounded-lg border text-xs font-sans font-black transition-all cursor-pointer shadow-xs ${
                            mapping?.type === 'ignore'
                              ? (displayMode === 'dark'
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-900'
                                  : 'bg-rose-100/80 text-rose-800 border-rose-300 font-extrabold')
                              : (displayMode === 'dark'
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900')
                          }`}
                        >
                          対象外
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMappingAction(idx, 'create_new')}
                          className={`py-2 rounded-lg border text-xs font-sans font-black transition-all cursor-pointer shadow-xs ${
                            mapping?.type === 'create_new'
                              ? (displayMode === 'dark'
                                  ? 'bg-sky-950/60 text-sky-300 border-sky-900'
                                  : 'bg-sky-100 text-sky-800 border-sky-300 font-extrabold')
                              : (displayMode === 'dark'
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900')
                          }`}
                        >
                          新規作成
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMappingAction(idx, 'existing')}
                          className={`py-2 rounded-lg border text-xs font-sans font-black transition-all cursor-pointer shadow-xs ${
                            mapping?.type === 'existing'
                              ? (displayMode === 'dark'
                                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-900'
                                  : 'bg-indigo-100 text-indigo-800 border-indigo-300 font-extrabold')
                              : (displayMode === 'dark'
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900')
                          }`}
                        >
                          既存割当
                        </button>
                      </div>

                      {mapping?.type === 'existing' && (
                        <div className={`mt-2.5 text-left border-t pt-2 px-1 ${
                          displayMode === 'dark' ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                          <label className={`text-[10px] font-black block mb-1 ${
                            displayMode === 'dark' ? 'text-indigo-300' : 'text-indigo-800'
                          }`}>
                            割り当てる既存項目:
                          </label>
                          <select
                            value={mapping.targetRowId || ''}
                            onChange={(e) => updateMappingTarget(idx, e.target.value)}
                            className={`w-full text-xs rounded-lg p-2 font-bold outline-none border transition-colors ${
                              displayMode === 'dark'
                                ? 'bg-slate-850 border-slate-700 text-[#e3e2e6] focus:border-indigo-500'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
                            }`}
                          >
                            <option value="" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-900'}>
                              -- 項目から選ぶ --
                            </option>
                            {mentalRows.map(row => (
                              <option 
                                key={row.id} 
                                value={row.id} 
                                className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6] font-bold' : 'bg-white text-slate-900 font-bold'}
                              >
                                {row.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {mapping?.type && mapping.type !== 'ignore' && (
                        <div className={`mt-2 text-left border-t pt-2 px-1 ${
                          displayMode === 'dark' ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                          <label className={`text-[10px] font-black block mb-1 ${
                            displayMode === 'dark' ? 'text-indigo-300' : 'text-indigo-800'
                          }`}>
                            評価段階:
                          </label>
                          <select
                            value={mapping.scaleType || '11'}
                            onChange={(e) => updateMappingScaleType(idx, e.target.value as '11' | '5')}
                            className={`w-full text-xs rounded-lg p-2 font-bold outline-none border transition-colors ${
                              displayMode === 'dark'
                                ? 'bg-slate-850 border-slate-700 text-slate-200 focus:border-indigo-500'
                                : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-600'
                            }`}
                          >
                            <option value="11">11段階 ( -5 〜 +5 )</option>
                            <option value="5">5段階 ( 1 〜 5 )</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`flex gap-2.5 pt-3 border-t ${
              displayMode === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={resetImportWizard}
                className={`flex-1 py-3 text-xs rounded-xl font-bold transition-all cursor-pointer text-center border ${
                  displayMode === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-705 text-slate-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                やり直す
              </button>
              <button
                type="button"
                onClick={handleProceedToConfirm}
                className={`flex-[2] py-3 text-xs text-[#e3e2e6] rounded-xl font-black transition-all shadow-md cursor-pointer text-center ${
                  displayMode === 'dark'
                    ? 'bg-indigo-600 hover:bg-indigo-550'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                確認画面へ進む
              </button>
            </div>
          </div>
        )}

        {importStep === 'confirm' && (
          <div className="mt-4 space-y-4 font-sans text-left">
            <h4 className={`text-sm font-black ${
              displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-900'
            }`}>
               インポート設定の確認
            </h4>

            {/* Statistics details overview card */}
            <div className={`p-4 rounded-xl border shadow-sm space-y-2.5 text-xs ${
              displayMode === 'dark' 
                ? 'border-slate-800 bg-slate-900 text-slate-350' 
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className={displayMode === 'dark' ? 'text-slate-300' : 'text-slate-600 font-bold'}>合計件数（行数）:</span>
                <span className={`font-extrabold font-mono text-xs ${displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-900'}`}>{importSummary?.totalRows}件（行）</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={displayMode === 'dark' ? 'text-slate-300' : 'text-slate-600 font-bold'}>対象日数:</span>
                <span className={`font-extrabold font-mono text-xs ${displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-900'}`}>{importSummary?.updatedDates.length}日間</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={displayMode === 'dark' ? 'text-slate-300' : 'text-slate-600 font-bold'}>インポート日付範囲:</span>
                <span className={`font-extrabold font-mono text-xs ${displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-900'}`}>
                  {importSummary?.updatedDates[0]} 〜 {importSummary?.updatedDates[(importSummary?.updatedDates.length || 1) - 1]}
                </span>
              </div>
            </div>

            {/* Mapping configuration overview */}
            <div className={`space-y-2 p-4 rounded-xl text-xs font-semibold leading-relaxed shadow-xs border ${
              displayMode === 'dark' 
                ? 'bg-indigo-950/20 border-indigo-900/60' 
                : 'bg-indigo-50/50 border-indigo-150'
            }`}>
              <span className={`font-black block pb-1.5 border-b mb-2 font-sans text-xs ${
                displayMode === 'dark' ? 'border-indigo-900 text-indigo-300' : 'border-indigo-100 text-indigo-900'
              }`}>
                📊 インポート列マッピングの内訳
              </span>
              <ul className={`space-y-2 font-bold ${
                displayMode === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                <li className="flex items-center justify-between text-[11px]">
                  <span>・自動対応（そのままマージします）:</span>
                  <span className={`font-extrabold ${displayMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>{importSummary?.autoMappedCount}項目</span>
                </li>
                {importSummary?.manuallyMappedCount !== undefined && importSummary.manuallyMappedCount > 0 && (
                  <li className="flex items-center justify-between text-[11px]">
                    <span>・手動対応（既存項目へ割り当てマージ）:</span>
                    <span className={`font-extrabold ${displayMode === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>{importSummary?.manuallyMappedCount}項目</span>
                  </li>
                )}
                {importSummary?.newRowsCreatedCount !== undefined && importSummary.newRowsCreatedCount > 0 && (
                  <li className="flex items-center justify-between text-[11px]">
                    <span>・新規作成されてマージ（項目を追加します）:</span>
                    <span className={`font-extrabold ${displayMode === 'dark' ? 'text-sky-300' : 'text-sky-700'}`}>{importSummary?.newRowsCreatedCount}項目</span>
                  </li>
                )}
                <li className="flex items-center justify-between text-[11px]">
                  <span>・対象外（インポートを行いません）:</span>
                  <span className={`font-extrabold ${displayMode === 'dark' ? 'text-slate-450' : 'text-slate-500'}`}>{importSummary?.ignoredCount}項目</span>
                </li>
              </ul>
            </div>

            <div className={`p-3 border rounded-xl ${
              displayMode === 'dark'
                ? 'bg-amber-950/15 border-amber-900/40'
                : 'bg-amber-50/40 border-amber-200'
            }`}>
              <p className={`text-[10px] font-extrabold leading-relaxed flex items-start gap-1.5 ${
                displayMode === 'dark' ? 'text-amber-400' : 'text-amber-800'
              }`}>
                <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  【警告】インポートを実行すると、重複する日（同じ日付）の体調スコアはCSV側の最新の数値で上書き・更新されます。CSVに含まれていない日付・項目（睡眠データ等含む）については、既存の記録がそのまま維持されます。
                </span>
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setImportStep('mapping')}
                className={`flex-1 py-3 text-xs rounded-xl font-bold transition-all cursor-pointer text-center ${
                  displayMode === 'dark'
                    ? 'bg-slate-805 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                戻る
              </button>
              <button
                type="button"
                onClick={executeImport}
                className={`flex-[2] py-3 text-xs text-[#e3e2e6] rounded-xl font-black transition-all shadow-sm cursor-pointer text-center ${
                  displayMode === 'dark'
                    ? 'bg-indigo-600 hover:bg-indigo-550'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                インポートを実行する
              </button>
            </div>
          </div>
        )}

        {importStep === 'success' && (
          <div className="mt-4 p-5 text-center space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Check className="h-6 w-6 stroke-[3]" />
            </div>
            
            <div className="space-y-1">
              <p className={`font-black text-sm ${displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-800'}`}>Excel移行・インポートが成功しました！</p>
              <p className={`text-[11px] font-bold ${displayMode === 'dark' ? 'text-slate-450' : 'text-slate-400'}`}>
                合計 {importSummary?.totalRows}件のデータ統合およびマージが完全に完了しました。
              </p>
            </div>

            <button
              type="button"
              onClick={resetImportWizard}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-[#e3e2e6] rounded-xl font-black transition-all cursor-pointer text-xs"
            >
              OK（戻る）
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {exportModalData && (
          <CSVExportModal 
            exportModalData={exportModalData}
            onClose={() => setExportModalData(null)}
            isMobile={isMobile}
            handleCopyCSV={handleCopyCSV}
            handleSaveAsFile={handleSaveAsFile}
            isCopied={isCopied}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
