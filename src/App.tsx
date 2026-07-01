import React, { useState, useEffect, useRef, useCallback, PointerEvent } from 'react';
import { 
  Menu, 
  ListTodo, 
  ArrowLeft,
  Eye,
  EyeOff,
  Moon,
  Smile,
  BarChart2,
  Settings,
  Undo2,
  Code,
  X,
  Plus,
  Printer,
  FileSpreadsheet,
  Eraser
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { ReportBlock } from './types';

// Import our custom types & utils
import { 
  formatDateLabel,
  createBlankRecord,
  shiftDateString,
  loadHourRep,
  saveHourRep,
  loadRecordsFromStorage,
  saveRecordsToStorage,
  saveMentalRecordsToStorage,
  migrateRecordsTo023,
  getBackupTimestamp,
  loadMentalRecordsFromStorage,
  loadMentalStampsFromStorage,
  loadMentalCustomColCount,
  loadMentalCustomColNames,
  loadMentalRowsFromStorage,
  loadActualSleepRecordsFromStorage,
  saveActualSleepRecordsToStorage,
  loadActualSleepStampsFromStorage,
  saveActualSleepStampsToStorage,
  loadActualSleepCustomColCount,
  saveActualSleepCustomColCount,
  loadActualSleepCustomColNames,
  saveActualSleepCustomColNames,
  loadActivityColWidth,
  saveActivityColWidth,
  loadActivityColFontWeight,
  saveActivityColFontWeight,
  loadChartScaleFactor,
  saveChartScaleFactor
} from './utils';

// Import individual modular components
import Sidebar from './components/Sidebar';
import SleepGrid from './components/SleepGrid';
import MentalGrid, {
  SCORE_LEVELS,
  getRatingColorInfo,
  getSubLabel
} from './components/MentalGrid';
import Palette from './components/Palette';
import ActionControls from './components/ActionControls';
import SleepViewer from './components/SleepViewer';
import OtherSettings from './components/OtherSettings';
import DeveloperTab from './components/DeveloperTab';
import BlockEditor from './components/BlockEditor';

// Import our custom hooks
import { useSleepRecords } from './hooks/useSleepRecords';
import { useActualSleepRecords } from './hooks/useActualSleepRecords';
import { useMentalRecords } from './hooks/useMentalRecords';
import { usePWA } from './hooks/usePWA';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  // 1. Toast notification helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // 2. Load custom sleep records state engine
  const {
    selectedDate,
    setSelectedDate,
    records,
    setRecords,
    stamps,
    activeSymbol,
    setActiveSymbol,
    activeTool,
    setActiveTool,
    customColCount,
    customColNames,
    handleStampsChange,
    handleSetCustomColCount,
    handleAddCustomCols,
    handleUpdateColConfig,
    handleSwapCustomCols,
    handleDeleteCustomCol,
    handleImportCSVRecords,
    handleAnyCSVImportText,
    handleCellTap,
    handleCopyPreviousDay,
    handleUpdateMemo,
    handleClearToday,
    handleClearAllRecords,
    handleImportBackup,
    inputMethod,
    handleSetInputMethod,
    customColCategories,
    categories,
    handleAddCategory,
    handleRenameCategory,
    handleDeleteCategory,
    handleSwapCategories,
  } = useSleepRecords(showToast);

  // 2.2. Load custom actual sleep records state engine (Sleep Tab)
  const {
    records: actualSleepRecords,
    setRecords: setActualSleepRecords,
    stamps: actualSleepStamps,
    setStamps: setActualSleepStamps,
    activeSymbol: activeActualSleepSymbol,
    setActiveSymbol: setActiveActualSleepSymbol,
    activeTool: activeActualSleepTool,
    setActiveTool: setActiveActualSleepTool,
    customColCount: customActualSleepColCount,
    setCustomColCount: setCustomActualSleepColCount,
    customColNames: customActualSleepColNames,
    setCustomColNames: setCustomActualSleepColNames,
    handleStampsChange: handleActualSleepStampsChange,
    handleSetCustomColCount: handleSetActualSleepCustomColCount,
    handleAddCustomCols: handleAddActualSleepCustomCols,
    handleUpdateColConfig: handleUpdateActualSleepColConfig,
    handleSwapCustomCols: handleSwapActualSleepCustomCols,
    handleDeleteCustomCol: handleDeleteActualSleepCustomCol,
    handleCellTap: handleActualSleepCellTap,
    handleCopyPreviousDay: handleCopyActualSleepPreviousDay,
    handleUpdateMemo: handleUpdateActualSleepMemo,
    handleClearToday: handleClearActualSleepToday,
    handleClearAllRecords: handleClearAllActualSleepRecords,
    handleImportBackup: handleImportActualSleepBackup,
    inputMethod: actualSleepInputMethod,
    handleSetInputMethod: handleSetActualSleepInputMethod,
  } = useActualSleepRecords(selectedDate, showToast);

  // 2.5. Load custom mental health records state engine
  const {
    mentalRecords,
    setMentalRecords,
    mentalStamps,
    activeMentalSymbol,
    setActiveMentalSymbol,
    activeMentalTool,
    setActiveMentalTool,
    customMentalColCount,
    customMentalColNames,
    handleMentalStampsChange,
    handleSetCustomMentalColCount,
    handleUpdateMentalColConfig,
    handleSwapMentalCustomCols,
    handleDeleteMentalCustomCol,
    handleMentalCellTap,
    handleCopyMentalPreviousDay,
    handleUpdateMentalMemo,
    handleClearMentalToday,
    handleClearAllMentalRecords,
    handleImportMentalBackup,
    setMentalStamps,
    setCustomMentalColCount,
    setCustomMentalColNames,
    // Spreadsheet rows helper destructure
    mentalRows,
    setMentalRows,
    handleAddMentalRow,
    handleUpdateMentalRow,
    handleDeleteMentalRow,
    handleMoveMentalRow,
    handleToggleMentalScore,
    // Mental categories
    mentalCategories,
    handleAddMentalCategory,
    handleRenameMentalCategory,
    handleDeleteMentalCategory,
    handleSwapMentalCategories,
  } = useMentalRecords(selectedDate, showToast);

  // States for tracking active focused rows inside the Mental health grid
  const [activeMentalRowId, setActiveMentalRowId] = useState<string | null>(null);

  // Category filter state
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTab, setCategoryModalTab] = useState<'activity' | 'mental'>('activity');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState('');

  // --- Undo (元に戻す) feature state and helpers ---
  const [undoStack, setUndoStack] = useState<{ records: any; mentalRecords: any; actualSleepRecords: any }[]>([]);
  const pendingSnapshotRef = useRef<{ records: any; mentalRecords: any; actualSleepRecords: any } | null>(null);

  const latestRecordsRef = useRef(records);
  const latestMentalRecordsRef = useRef(mentalRecords);
  const latestActualSleepRecordsRef = useRef(actualSleepRecords);

  useEffect(() => {
    latestRecordsRef.current = records;
  }, [records]);

  useEffect(() => {
    latestMentalRecordsRef.current = mentalRecords;
  }, [mentalRecords]);

  useEffect(() => {
    latestActualSleepRecordsRef.current = actualSleepRecords;
  }, [actualSleepRecords]);

  // Push previous state representation onto undo stack
  const pushUndo = (prevRecords: any, prevMentalRecords: any, prevActualSleepRecords: any) => {
    setUndoStack(prev => {
      const clonedRecords = JSON.parse(JSON.stringify(prevRecords));
      const clonedMentalRecords = JSON.parse(JSON.stringify(prevMentalRecords));
      const clonedActualSleepRecords = JSON.parse(JSON.stringify(prevActualSleepRecords));
      
      const next = [...prev, { 
        records: clonedRecords, 
        mentalRecords: clonedMentalRecords,
        actualSleepRecords: clonedActualSleepRecords
      }];
      if (next.length > 40) {
        next.shift(); // keep last 40 history entries
      }
      return next;
    });
  };

  // Push current snapshot immediately before single action
  const saveSnapshotBeforeAction = () => {
    pushUndo(latestRecordsRef.current, latestMentalRecordsRef.current, latestActualSleepRecordsRef.current);
  };

  // Detect state change and grab stable snapshot before change
  useEffect(() => {
    if (pendingSnapshotRef.current) {
      const snap = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null; // consume
      
      setUndoStack(prev => {
        const next = [...prev, snap];
        if (next.length > 40) {
          next.shift();
        }
        return next;
      });
    }
  }, [records, mentalRecords, actualSleepRecords]);

  // Interaction handlers for drag/swipe/touch events grouping
  const handleInteractionStart = () => {
    pendingSnapshotRef.current = {
      records: JSON.parse(JSON.stringify(latestRecordsRef.current)),
      mentalRecords: JSON.parse(JSON.stringify(latestMentalRecordsRef.current)),
      actualSleepRecords: JSON.parse(JSON.stringify(latestActualSleepRecordsRef.current))
    };
  };

  const handleInteractionEnd = () => {
    setTimeout(() => {
      pendingSnapshotRef.current = null;
    }, 100);
  };

  // Trigger actual Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const nextStack = [...undoStack];
    const lastEntry = nextStack.pop();
    if (lastEntry) {
      setRecords(lastEntry.records);
      saveRecordsToStorage(lastEntry.records);
      setMentalRecords(lastEntry.mentalRecords);
      saveMentalRecordsToStorage(lastEntry.mentalRecords);
      setActualSleepRecords(lastEntry.actualSleepRecords);
      saveActualSleepRecordsToStorage(lastEntry.actualSleepRecords);
      setUndoStack(nextStack);
      showToast('↩️ 操作を取り消しました（元に戻しました）');
    }
  };

  // Wrapped actions for single-click inputs to save snapshot
  const wrappedHandleClearToday = () => {
    saveSnapshotBeforeAction();
    handleClearToday();
  };

  const wrappedHandleCopyPreviousDay = () => {
    saveSnapshotBeforeAction();
    handleCopyPreviousDay();
  };

  const wrappedHandleClearActualSleepToday = () => {
    saveSnapshotBeforeAction();
    handleClearActualSleepToday();
  };

  const wrappedHandleCopyActualSleepPreviousDay = () => {
    saveSnapshotBeforeAction();
    handleCopyActualSleepPreviousDay();
  };

  const wrappedHandleClearMentalToday = () => {
    saveSnapshotBeforeAction();
    handleClearMentalToday();
  };

  const wrappedHandleCopyMentalPreviousDay = () => {
    saveSnapshotBeforeAction();
    handleCopyMentalPreviousDay();
  };

  const wrappedHandleToggleMentalScore = (rowId: string, score: number | null) => {
    saveSnapshotBeforeAction();
    handleToggleMentalScore(rowId, score);
  };

  // Auto-select the first mental row when the selection lists or current day changes
  useEffect(() => {
    if (mentalRows && mentalRows.length > 0) {
      const exists = mentalRows.some(row => row.id === activeMentalRowId);
      if (!activeMentalRowId || !exists) {
        setActiveMentalRowId(mentalRows[0].id);
      }
    } else {
      setActiveMentalRowId(null);
    }
  }, [mentalRows, selectedDate]);

  // Record key trigger with automated autofocus tracking (automatic advance)
  const handleSelectMentalScoreWithAdvance = (score: number) => {
    if (!activeMentalRowId) return;
    
    // 1. Record selected score using wrapped handler to preserve undo snapshot
    wrappedHandleToggleMentalScore(activeMentalRowId, score);
    
    // 2. Automated autofocus shifts immediately to the next row (auto-advance)
    const currentIndex = mentalRows.findIndex(row => row.id === activeMentalRowId);
    if (currentIndex !== -1 && currentIndex < mentalRows.length - 1) {
      setActiveMentalRowId(mentalRows[currentIndex + 1].id);
    }
    // No else branch; we stop/stay at the final item once reaching the bottom as requested.
  };

  // 3. Load UI modes & state configurations
  const [hourRep, setHourRep] = useState<'1-24' | '0-23'>(() => loadHourRep());
  const [activeTab, setActiveTab] = useState<'record' | 'developer'>('record');
  const [gridMode, setGridMode] = useState<'standard' | 'actual_sleep' | 'mental' | 'viewer' | 'settings' | 'settings_menu' | 'developer'>('standard');
  const [viewerSubScreen, setViewerSubScreen] = useState<'menu' | 'viewer' | 'report' | 'report_preview'>('menu');

  // --- Google Spreadsheet Test States ---
  const [showSpreadsheetModal, setShowSpreadsheetModal] = useState<boolean>(false);
  const [spreadsheetApiKey, setSpreadsheetApiKey] = useState<string>("AIzaSyBaHHPWTxMrwl1SRedu0IeEE9eHlnHvfrs");
  const [spreadsheetId, setSpreadsheetId] = useState<string>("1U_hH43F79EBh_vltwdj5wtbD3tezIDEfzGybXhrJ4es");
  const [spreadsheetCellRange, setSpreadsheetCellRange] = useState<string>("シート1!A1");
  const [spreadsheetWriteContent, setSpreadsheetWriteContent] = useState<string>("テスト");
  const [isTestingSpreadsheetWrite, setIsTestingSpreadsheetWrite] = useState<boolean>(false);
  const [spreadsheetTestResult, setSpreadsheetTestResult] = useState<{ success: boolean; message: string; code?: number } | null>(null);

  const runSpreadsheetWriteTest = async () => {
    setIsTestingSpreadsheetWrite(true);
    setSpreadsheetTestResult(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(spreadsheetCellRange)}?valueInputOption=USER_ENTERED&key=${spreadsheetApiKey}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[spreadsheetWriteContent]]
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSpreadsheetTestResult({
          success: true,
          message: "大成功！スプレッドシートを見てみてね！"
        });
        showToast("✨ 書き込みテストに成功しました！");
      } else {
        const errorMsg = data.error?.message || "不明なエラー";
        const code = response.status;
        setSpreadsheetTestResult({
          success: false,
          message: errorMsg,
          code: code
        });
        showToast("❌ 書き込みテストが失敗しました。");
      }
    } catch (err: any) {
      setSpreadsheetTestResult({
        success: false,
        message: err.message || "ネットワークに接続できないか、CORSポリシーによって遮断されました。"
      });
      showToast("❌ 通信エラーが発生しました。");
    } finally {
      setIsTestingSpreadsheetWrite(false);
    }
  };

  // --- Report Zoom Feature State & Touch Event Binding ---
  const [zoomRate, setZoomRate] = useState<number>(() => {
    const saved = localStorage.getItem('pochilog_report_zoom_rate');
    if (saved) {
      const val = parseFloat(saved);
      if ([0.5, 0.75, 1.0, 1.25, 1.5, 2.0].includes(val)) {
        return val;
      }
    }
    return 1.0;
  });

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // --- Report Designer Grid, Blocks, and Drag Selection State ---
  const [blocks, setBlocks] = useState<ReportBlock[]>(() => {
    const saved = localStorage.getItem('pochilog_report_blocks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to load blocks', e);
      }
    }
    return [];
  });
  const [undoStackBlocks, setUndoStackBlocks] = useState<ReportBlock[][]>([]);
  const [startCell, setStartCell] = useState<{ r: number; c: number } | null>(null);
  const [currentCell, setCurrentCell] = useState<{ r: number; c: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFontSizeClass = (fontSize?: 'sm' | 'md' | 'lg') => {
    if (fontSize === 'md') return 'text-[16px] sm:text-[16px]';
    if (fontSize === 'lg') return 'text-[24px] sm:text-[24px]';
    return 'text-[12px] sm:text-[12px]';
  };

  // 画面がレポート印刷のデザイン画面以外に切り替わったときに、ドラッグ選択中の破線枠を自動的にリセットする
  useEffect(() => {
    if (gridMode !== 'viewer' || viewerSubScreen !== 'report') {
      setStartCell(null);
      setCurrentCell(null);
      setEditingBlockId(null);
    }
  }, [gridMode, viewerSubScreen]);

  const handleCreateBlock = () => {
    if (!startCell || !currentCell) {
      showToast('⚠️ ドラッグしてセルを選択してから枠を作成してください');
      return;
    }
    const startRow = Math.min(startCell.r, currentCell.r);
    const endRow = Math.max(startCell.r, currentCell.r);
    const startCol = Math.min(startCell.c, currentCell.c);
    const endCol = Math.max(startCell.c, currentCell.c);

    // Save previous state to undo stack
    setUndoStackBlocks(prev => [...prev, blocks]);

    const nextNum = blocks.length > 0 ? Math.max(...blocks.map(b => b.num)) + 1 : 1;
    const newBlock: ReportBlock = {
      id: Math.random().toString(36).substring(2, 9),
      num: nextNum,
      startRow,
      startCol,
      endRow,
      endCol,
      text: ''
    };

    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    localStorage.setItem('pochilog_report_blocks', JSON.stringify(newBlocks));

    // Clear selection
    setStartCell(null);
    setCurrentCell(null);
    showToast(`⬜ ブロック ${nextNum} を作成しました！`);
  };

  const handleUpdateBlockText = (id: string, text: string) => {
    const updated = blocks.map(b => b.id === id ? { ...b, text } : b);
    setBlocks(updated);
    localStorage.setItem('pochilog_report_blocks', JSON.stringify(updated));
  };

  const handleUpdateBlockFontSize = (id: string, fontSize: 'sm' | 'md' | 'lg') => {
    const updated = blocks.map(b => b.id === id ? { ...b, fontSize } : b);
    setBlocks(updated);
    localStorage.setItem('pochilog_report_blocks', JSON.stringify(updated));
  };

  const handleDeleteBlock = (id: string) => {
    setUndoStackBlocks(prev => [...prev, blocks]);
    const filtered = blocks.filter(b => b.id !== id);
    // Re-index remaining blocks sequentially
    const reindexed = filtered.map((b, index) => ({
      ...b,
      num: index + 1
    }));
    setBlocks(reindexed);
    localStorage.setItem('pochilog_report_blocks', JSON.stringify(reindexed));
    showToast('🗑️ 枠を削除しました');
  };

  const handleUndoBlock = () => {
    if (undoStackBlocks.length === 0) {
      showToast('⚠️ これ以上元に戻せません');
      return;
    }
    const previous = undoStackBlocks[undoStackBlocks.length - 1];
    setUndoStackBlocks(prev => prev.slice(0, -1));
    setBlocks(previous);
    localStorage.setItem('pochilog_report_blocks', JSON.stringify(previous));
    showToast('↩️ 枠操作を取り消しました');
  };

  const handleClearAllBlocks = () => {
    if (blocks.length === 0) {
      showToast('🧹 すでに白紙です');
      return;
    }
    if (window.confirm('すべての枠線と文字をクリアして白紙に戻しますか？')) {
      setUndoStackBlocks(prev => [...prev, blocks]);
      setBlocks([]);
      localStorage.setItem('pochilog_report_blocks', JSON.stringify([]));
      showToast('🧹 白紙に戻しました');
    }
  };

  const handleSaveTemplate = () => {
    const dataStr = JSON.stringify(blocks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `pochilog_template_${year}${month}${day}_${hours}${minutes}.json`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`💾 テンプレートを保存しました: ${filename}`);
  };

  const handleLoadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const valid = parsed.every(item => 
            typeof item.id === 'string' &&
            typeof item.num === 'number' &&
            typeof item.startRow === 'number' &&
            typeof item.startCol === 'number' &&
            typeof item.endRow === 'number' &&
            typeof item.endCol === 'number' &&
            typeof item.text === 'string'
          );
          if (valid) {
            setUndoStackBlocks(prev => [...prev, blocks]);
            setBlocks(parsed);
            localStorage.setItem('pochilog_report_blocks', JSON.stringify(parsed));
            showToast('📂 テンプレートを読み込みました！');
          } else {
            showToast('⚠️ 無効なテンプレートファイル形式です');
          }
        } else {
          showToast('⚠️ 無効なテンプレートデータです');
        }
      } catch (err) {
        showToast('⚠️ ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Width of A4 is 210mm, height is 297mm
      // Canvas resolution is 780px wide and 1100px high
      blocks.forEach(block => {
        const mmX = (block.startCol * 20 / 780) * 210;
        const mmY = (block.startRow * 20 / 1100) * 297;
        const mmW = ((block.endCol - block.startCol + 1) * 20 / 780) * 210;
        const mmH = ((block.endRow - block.startRow + 1) * 20 / 1100) * 297;

        // Draw rectangle frame
        doc.setDrawColor(30, 41, 59); // slate-800
        doc.setLineWidth(0.4);
        doc.rect(mmX, mmY, mmW, mmH);

        // Write user content text centered horizontally and vertically with dynamic font sizes
        if (block.text) {
          const pdfFontSize = block.fontSize === 'lg' ? 19.0 : block.fontSize === 'md' ? 13.0 : 9.5;
          const lineHeight = block.fontSize === 'lg' ? 7.5 : block.fontSize === 'md' ? 5.5 : 4.2;
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(pdfFontSize);
          doc.setTextColor(30, 41, 59); // slate-800

          const lines = block.text.split('\n');
          const paddingLeft = 2;
          const maxWidthMM = mmW - (paddingLeft * 2);

          // Split lines to calculate heights
          const allSplitLines: string[] = [];
          for (const line of lines) {
            const split = doc.splitTextToSize(line, maxWidthMM);
            allSplitLines.push(...split);
          }

          const totalTextHeight = allSplitLines.length * lineHeight;
          // Vertically center text in the block
          let currentY = mmY + (mmH / 2) - (totalTextHeight / 2) + (lineHeight * 0.7);

          for (const sLine of allSplitLines) {
            // If the start goes above the box, clamp to the top padding area
            if (currentY - (lineHeight * 0.3) < mmY) {
              currentY = mmY + lineHeight;
            }
            if (currentY + 2.0 > mmY + mmH) break; // clamp bottom overflow

            const centerX = mmX + (mmW / 2);
            doc.text(sLine, centerX, currentY, { align: 'center' });
            currentY += lineHeight;
          }
        }
      });

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const pdfFilename = `pochilog_report_${year}${month}${day}_${hours}${minutes}.pdf`;

      doc.save(pdfFilename);
      showToast(`📄 PDFファイルを出力しました: ${pdfFilename}`);
    } catch (e) {
      console.error(e);
      showToast('⚠️ PDFの出力に失敗しました');
    }
  };

  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editingBlockId !== null) {
      setEditingBlockId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomRate;
    const y = (e.clientY - rect.top) / zoomRate;
    // Convert to cell coordinates
    const col = Math.max(0, Math.min(38, Math.floor(x / 20)));
    const row = Math.max(0, Math.min(54, Math.floor(y / 20)));

    setIsDragging(true);
    setStartCell({ r: row, c: col });
    setCurrentCell({ r: row, c: col });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !startCell) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomRate;
    const y = (e.clientY - rect.top) / zoomRate;
    const col = Math.max(0, Math.min(38, Math.floor(x / 20)));
    const row = Math.max(0, Math.min(54, Math.floor(y / 20)));

    setCurrentCell({ r: row, c: col });
  };

  const handleGridPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };


  useEffect(() => {
    const el = reportContainerRef.current;
    if (!el) return;

    let initialDist: number | null = null;
    let initialZoomVal = 1.0;

    const handleTouchStart = (e: TouchEvent) => {
      if (viewerSubScreen !== 'report') return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialDist = dist;
        initialZoomVal = zoomRate;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (viewerSubScreen !== 'report') return;
      if (e.touches.length === 2 && initialDist !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / initialDist;
        const targetZoom = initialZoomVal * ratio;
        
        const zoomOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const closest = zoomOptions.reduce((prev, curr) => {
          return Math.abs(curr - targetZoom) < Math.abs(prev - targetZoom) ? curr : prev;
        });
        
        if (closest !== zoomRate) {
          setZoomRate(closest);
          localStorage.setItem('pochilog_report_zoom_rate', closest.toString());
        }
      }
    };

    const handleTouchEnd = () => {
      initialDist = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoomRate, viewerSubScreen]);

  const isSleepTabActive = gridMode === 'actual_sleep';

  const [lastActiveRecordGrid, setLastActiveRecordGrid] = useState<'standard' | 'actual_sleep'>('standard');
  const [isNowActive, setIsNowActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isNowActive') === 'true';
    } catch {
      return false;
    }
  });

  const handleNowActiveChange = (val: boolean) => {
    setIsNowActive(val);
    try {
      localStorage.setItem('isNowActive', String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const formatButtonText = (text: string) => {
    if (text.length === 2 || text.length === 3) {
      return text.split('').join(' ');
    }
    return text;
  };
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSlimSidebar, setIsSlimSidebar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isSlimSidebar') === 'true';
    } catch {
      return false;
    }
  });

  const isSlimForLayout = isSlimSidebar || gridMode === 'standard';

  const handleSetSlimSidebar = (val: boolean) => {
    setIsSlimSidebar(val);
    try {
      localStorage.setItem('isSlimSidebar', String(val));
    } catch (e) {
      console.error(e);
    }
  };

  // 3.5. Load display mode (vivid = はっきり, soft = やさしい, dark = ダーク)
  const [displayMode, setDisplayMode] = useState<'vivid' | 'soft' | 'dark'>(() => {
    return 'dark'; // 常時「Material Design 3 の標準的なダークテーマ」で統一（固定）
  });

  const handleSetDisplayMode = (val: 'vivid' | 'soft' | 'dark') => {
    setDisplayMode('dark');
    localStorage.setItem('sleep_app_display_mode', 'dark');
  };

  // Activity column width state
  const [activityColWidth, setActivityColWidth] = useState<number>(() => loadActivityColWidth());

  const handleSetActivityColWidth = (width: number) => {
    setActivityColWidth(width);
    saveActivityColWidth(width);
  };

  // Activity column font weight state (font-light, font-normal, font-bold, font-black)
  const [activityColFontWeight, setActivityColFontWeight] = useState<string>(() => loadActivityColFontWeight());

  const handleSetActivityColFontWeight = (weight: string) => {
    setActivityColFontWeight(weight);
    saveActivityColFontWeight(weight);
  };

  // Chart horizontal scale factor (default: 0.6)
  const [chartScaleFactor, setChartScaleFactor] = useState<number>(() => loadChartScaleFactor());

  const handleSetChartScaleFactor = (scale: number) => {
    setChartScaleFactor(scale);
    saveChartScaleFactor(scale);
  };

  // 3.8. Baseline state checking & database comparison helper for SAVE
  const baselineStateRef = useRef<string>('');
  const triggerBaselineSyncRef = useRef<boolean>(true); // initially sync

  const getSaveStateObject = () => {
    return {
      records,
      stamps,
      customColCount,
      customColNames,
      inputMethod,
      displayMode,
      hourRep,
      mentalRecords,
      mentalStamps,
      customMentalColCount,
      customMentalColNames,
      mentalRows,
      // actual sleep state
      actualSleepRecords,
      actualSleepStamps,
      customActualSleepColCount,
      customActualSleepColNames,
      actualSleepInputMethod,
    };
  };

  const getSerializedState = (): string => {
    return JSON.stringify(getSaveStateObject());
  };

  useEffect(() => {
    if (triggerBaselineSyncRef.current) {
      baselineStateRef.current = getSerializedState();
      triggerBaselineSyncRef.current = false;
    }
  }, [
    records,
    stamps,
    customColCount,
    customColNames,
    inputMethod,
    displayMode,
    hourRep,
    mentalRecords,
    mentalStamps,
    customMentalColCount,
    customMentalColNames,
    mentalRows,
  ]);

  const fallbackDownload = (dataStr: string, fileName: string, currentSerialized: string) => {
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Lock baseline silently without showing success toast
    baselineStateRef.current = currentSerialized;
  };

  const handleSaveWithBaselineCheck = async () => {
    const currentSerialized = getSerializedState();
    
    // Check differences (anti-double saving)
    if (baselineStateRef.current === currentSerialized) {
      showToast('ℹ️ 変更はありません');
      return;
    }

    const saveData = getSaveStateObject();
    const dataStr = JSON.stringify(saveData, null, 2);
    
    const ts = getBackupTimestamp();
    const fileName = `backup_${ts}.json`;

    // 1. File System Access API (showSaveFilePicker) support check
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON Backup File',
            accept: {
              'application/json': ['.json']
            }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(dataStr);
        await writable.close();

        // Lock baseline silently without showing success toast
        baselineStateRef.current = currentSerialized;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User clicked "Cancel" on native OS save dialog.
          // Smartly dismiss without saving or showing toast.
          return;
        }
        console.warn('showSaveFilePicker failed or was not completed, shifting to browser fallback:', err);
        fallbackDownload(dataStr, fileName, currentSerialized);
      }
    } else {
      // 2. Normal classic fallback downloading
      fallbackDownload(dataStr, fileName, currentSerialized);
    }
  };

  // 4. Load PWA triggers
  const { deferredPrompt, isInstalled, handleInstallApp } = usePWA(showToast);

  // 5. Jump to Today calendar shortcut
  const handleJumpToToday = () => {
    const today = shiftDateString(selectedDate, 0); // fallback or recalculate
    const currentTodayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(currentTodayStr);
    showToast('🗓️ 今日の日付に移動しました');
  };

  // 6. Keyboard Shortcuts helper hook for PC / Desktop power users
  useKeyboardShortcuts({
    gridMode,
    isSleepTabActive,
    setSelectedDate,
    setActiveTool,
    setActiveSymbol,
    handleJumpToToday,
    showToast
  });

  // 7. Local database migration to 0-23 layout if not completed yet
  useEffect(() => {
    const isMigrated = localStorage.getItem('hour_rep_v2_migrated') === 'true';
    if (!isMigrated) {
      const localRecords = loadRecordsFromStorage();
      if (Object.keys(localRecords).length > 0) {
        const migrated = migrateRecordsTo023(localRecords);
        setRecords(migrated);
        saveRecordsToStorage(migrated);
        showToast('⏰ 0-23時表示へのデータ移行を完了しました');
      }
      localStorage.setItem('hour_rep_v2_migrated', 'true');
      setHourRep('0-23');
      saveHourRep('0-23');
    }
  }, [setRecords]);

  // 8. Keep Hour notation saved when committed
  const handleSetHourRep = (val: '1-24' | '0-23') => {
    setHourRep('0-23');
    saveHourRep('0-23');
  };

  // Get current day record or empty
  const currentRecord = records[selectedDate] || createBlankRecord();

  return (
    <div className="min-h-screen bg-[#121212] md:py-4 flex justify-center items-center overflow-y-auto font-sans" id="app-root-frame">
      
      <AnimatePresence>
        {editingBlockId !== null && (() => {
          const block = blocks.find(b => b.id === editingBlockId);
          if (!block) return null;
          return (
            <BlockEditor
              blockId={block.id}
              blockNum={block.num}
              initialText={block.text}
              onSave={(newText) => {
                handleUpdateBlockText(block.id, newText);
                setEditingBlockId(null);
                showToast(`Block ${block.num} を保存しました`);
              }}
              onClose={() => setEditingBlockId(null)}
            />
          );
        })()}
      </AnimatePresence>

      {/* Centered Device mockup block */}
      <div 
        className={`w-full max-w-[480px] md:max-w-[768px] lg:max-w-[1012px] xl:max-w-[1180px] h-[100dvh] md:h-[94vh] md:max-h-[900px] flex flex-col md:rounded-[36px] shadow-2xl relative overflow-hidden border transition-all duration-300 ${
          displayMode === 'dark' 
            ? 'bg-[#1a1c1e] text-[#e6e1e5] border-[#2d2c30]' 
            : 'bg-white text-slate-800 border-slate-750/10'
        }`} 
        id="device-mockup"
      >
        
        {/* TOP BAR / APP TITLE WITH INTEGRATED DATE NAVIGATOR & TABS */}
        {(gridMode !== 'viewer' || viewerSubScreen === 'menu' || viewerSubScreen === 'report' || viewerSubScreen === 'report_preview') && (
          <header className={`flex h-12 sm:h-14 items-center justify-between gap-x-2 px-3 border-b shrink-0 select-none md:rounded-t-[36px] transition-colors duration-300 ${
            displayMode === 'dark' 
              ? 'bg-[#1c1b1f] border-[#2d2c30] text-[#e6e1e5]' 
              : 'bg-white border-gray-250 text-slate-800'
          }`}>
            {/* Left Side: Small App Title & Back buttons */}
            {((gridMode === 'settings' || gridMode === 'developer' || gridMode === 'settings_menu' || gridMode === 'viewer') || activeTab === 'developer') ? (
              <div className="items-center gap-1.5 shrink-0 flex" id="header-left-section">
                <button 
                  onClick={() => {
                    if (gridMode === 'settings' || gridMode === 'developer') {
                      setGridMode('settings_menu');
                      showToast('その他メニューに戻りました');
                    } else if (gridMode === 'viewer') {
                      if (viewerSubScreen === 'report_preview') {
                        setViewerSubScreen('report');
                        showToast('デザイン画面に戻りました');
                      } else if (viewerSubScreen === 'viewer' || viewerSubScreen === 'report') {
                        setViewerSubScreen('menu');
                        showToast('選択画面に戻りました');
                      } else {
                        setGridMode(lastActiveRecordGrid);
                        setActiveTab('record');
                        showToast('🕒 記録画面に戻りました');
                      }
                    } else {
                      setGridMode(lastActiveRecordGrid);
                      setActiveTab('record');
                      showToast('🕒 記録画面に戻りました');
                    }
                  }}
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl border active:scale-90 transition-all cursor-pointer bg-slate-850 border-slate-700 hover:bg-slate-750 text-[#e3e2e6]`}
                  title="戻る"
                  aria-label="戻る"
                  id="close-viewer-btn"
                >
                  <ArrowLeft className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5 stroke-[2.5]" />
                </button>
                <h1 className={`text-xs sm:text-base font-black font-sans tracking-tight ${
                  gridMode === 'viewer' && viewerSubScreen === 'report' ? 'block' : 'hidden xs:block'
                } ${
                  gridMode === 'mental' || gridMode === 'standard' || gridMode === 'actual_sleep' ? 'hidden' : ''
                } ${
                  displayMode === 'dark' ? 'text-slate-100' : 'text-slate-800'
                }`}>
                  {gridMode === 'standard' && '活動記録'}
                  {gridMode === 'actual_sleep' && '睡眠記録'}
                  {gridMode === 'viewer' && (
                    viewerSubScreen === 'menu' ? '選択メニュー' :
                    viewerSubScreen === 'viewer' ? '履歴ビュアー' : 'レポート'
                  )}
                  {gridMode === 'settings' && '環境設定'}
                  {gridMode === 'developer' && '開発ツール'}
                  {gridMode === 'settings_menu' && 'その他設定'}
                </h1>
              </div>
            ) : null}
            
            {/* Center Side: Date Navigation or Viewer Title */}
            {activeTab === 'record' ? (
              gridMode === 'viewer' ? (
                viewerSubScreen === 'report' ? null : (
                  <div className="text-center flex-1 shrink-0 font-extrabold text-sm sm:text-base text-blue-500 tracking-tight" id="header-viewer-title">
                    {viewerSubScreen === 'menu' && '履歴・レポート選択'}
                    {viewerSubScreen === 'viewer' && '全履歴ビュアー'}
                    {viewerSubScreen === 'report_preview' && 'レポートプレビュー'}
                  </div>
                )
              ) : gridMode === 'settings' ? (
                <div className="text-center flex-1 shrink-0 font-extrabold text-sm sm:text-base text-sky-500 tracking-tight" id="header-settings-title">
                  設定とお手入れ
                </div>
              ) : gridMode === 'settings_menu' ? (
                <div className="text-center flex-1 shrink-0 font-extrabold text-sm sm:text-base text-slate-350 tracking-tight" id="header-other-title">
                  その他メニュー
                </div>
              ) : gridMode === 'developer' ? (
                <div className="text-center flex-1 shrink-0 font-extrabold text-sm sm:text-base text-purple-400 tracking-tight" id="header-dev-title">
                  開発者メニュー
                </div>
              ) : gridMode === 'mental' ? (
                <div className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 select-none" id="header-mental-title-container">
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1" id="header-mental-date-navigator">
                    <button
                      onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
                      className={`text-xl xs:text-2xl sm:text-3xl font-black px-1.5 xs:px-2 py-0.5 hover:scale-120 active:scale-90 transition-all select-none cursor-pointer font-sans ${
                        displayMode === 'dark' ? 'text-indigo-400 hover:text-indigo-305' : 'text-indigo-600 hover:text-indigo-800'
                      }`}
                      aria-label="前日の記録へ"
                      id="header-mental-prev-btn"
                    >
                      ◀
                    </button>

                    <div 
                      onClick={handleJumpToToday}
                      className={`text-center px-1.5 py-0.5 mx-0.5 shrink-0 cursor-pointer rounded-lg active:scale-95 transition-all select-none ${
                        displayMode === 'dark' 
                          ? 'hover:bg-slate-800 text-slate-200 hover:text-[#e3e2e6]' 
                          : 'hover:bg-gray-100 text-slate-900'
                      }`}
                      title="今日の日付へ移動"
                      id="header-mental-date-display-wrapper"
                    >
                      <div className="flex flex-row items-baseline justify-start gap-1 leading-none">
                        <span className={`text-base xs:text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight font-mono ${
                          displayMode === 'dark' ? 'text-slate-200' : 'text-slate-900'
                        }`}>
                          {formatDateLabel(selectedDate).split(' ')[0]}
                        </span>
                        <span className={`text-xs sm:text-sm font-extrabold tracking-wide ${
                          displayMode === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {formatDateLabel(selectedDate).split(' ')[1] || ''}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
                      className={`text-xl xs:text-2xl sm:text-3xl font-black px-1.5 xs:px-2 py-0.5 hover:scale-120 active:scale-90 transition-all select-none cursor-pointer font-sans ${
                        displayMode === 'dark' ? 'text-indigo-400 hover:text-indigo-305' : 'text-indigo-600 hover:text-indigo-800'
                      }`}
                      aria-label="翌日の記録へ"
                      id="header-mental-next-btn"
                    >
                      ▶
                    </button>

                    {undoStack.length > 0 && (
                      <button
                        onClick={handleUndo}
                        className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg active:scale-90 transition-all cursor-pointer ml-1.5 sm:ml-2.5 shrink-0 ${
                          displayMode === 'dark'
                            ? 'bg-emerald-950/40 border border-emerald-800/80 hover:bg-emerald-900/60 text-emerald-400'
                            : 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 shadow-3xs'
                        }`}
                        title="直前の操作を取り消す (元に戻す)"
                        id="header-mental-undo-btn"
                      >
                        <Undo2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2.5]" />
                      </button>
                    )}

                    {/* 操作盤を隠す/表示する */}
                    <button
                      onClick={() => {
                        setShowControls(prev => !prev);
                        showToast(showControls ? '🧽 操作盤を非表示にしました（広々使えます）' : '🎨 操作盤を表示しました');
                      }}
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg active:scale-90 transition-all cursor-pointer ml-1.5 sm:ml-2 shrink-0 ${
                        showControls
                          ? (displayMode === 'dark'
                              ? 'bg-slate-850 border border-slate-700 text-slate-200 hover:bg-slate-750'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 shadow-3xs')
                          : (displayMode === 'dark'
                              ? 'bg-indigo-95 border border-indigo-800 text-indigo-450 hover:bg-indigo-900'
                              : 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 shadow-3xs')
                      }`}
                      title={showControls ? "操作盤を非表示にして、記録エリアを広げます" : "操作盤を表示します"}
                      id="header-mental-toggle-btn"
                    >
                      {showControls ? <EyeOff className="h-4 w-4 stroke-[2.5]" /> : <Eye className="h-4 w-4 stroke-[2.5]" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 select-none" id="header-date-navigator">
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1" id="header-date-navigator-container">
                    <button
                      onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
                      className={`text-xl xs:text-2xl sm:text-3xl font-black px-1.5 xs:px-2 py-0.5 hover:scale-120 active:scale-90 transition-all select-none cursor-pointer font-sans ${
                        displayMode === 'dark' ? 'text-sky-400 hover:text-sky-305' : 'text-blue-600 hover:text-blue-800'
                      }`}
                      aria-label="前日の記録へ"
                      id="header-prev-btn"
                    >
                      ◀
                    </button>

                    <div 
                      onClick={handleJumpToToday}
                      className={`text-center px-1.5 py-0.5 mx-0.5 shrink-0 cursor-pointer rounded-lg active:scale-95 transition-all select-none ${
                        displayMode === 'dark' 
                          ? 'hover:bg-slate-800 text-slate-200 hover:text-[#e3e2e6]' 
                          : 'hover:bg-gray-100 text-slate-900'
                      }`}
                      title="今日の日付へ移動"
                      id="header-date-display-wrapper"
                    >
                      <div className="flex flex-row items-baseline justify-start gap-1 leading-none">
                        <span className={`text-base xs:text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight font-mono ${
                          displayMode === 'dark' ? 'text-slate-200' : 'text-slate-900'
                        }`}>
                          {formatDateLabel(selectedDate).split(' ')[0]}
                        </span>
                        <span className={`text-xs sm:text-sm font-extrabold tracking-wide ${
                          displayMode === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {formatDateLabel(selectedDate).split(' ')[1] || ''}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
                      className={`text-xl xs:text-2xl sm:text-3xl font-black px-1.5 xs:px-2 py-0.5 hover:scale-120 active:scale-90 transition-all select-none cursor-pointer font-sans ${
                        displayMode === 'dark' ? 'text-sky-400 hover:text-sky-305' : 'text-blue-600 hover:text-blue-800'
                      }`}
                      aria-label="翌日の記録へ"
                      id="header-next-btn"
                    >
                      ▶
                    </button>

                    {undoStack.length > 0 && (
                      <button
                        onClick={handleUndo}
                        className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg active:scale-90 transition-all cursor-pointer ml-1.5 sm:ml-2.5 shrink-0 ${
                          displayMode === 'dark'
                            ? 'bg-emerald-950/40 border border-emerald-800/80 hover:bg-emerald-900/60 text-emerald-400'
                            : 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 shadow-3xs'
                        }`}
                        title="直前の操作を取り消す (元に戻す)"
                        id="header-undo-btn"
                      >
                        <Undo2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2.5]" />
                      </button>
                    )}

                    {/* 操作盤を隠す/表示する */}
                    <button
                      onClick={() => {
                        setShowControls(prev => !prev);
                        showToast(showControls ? '🧽 操作盤を非表示にしました（広々使えます）' : '🎨 操作盤を表示しました');
                      }}
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg active:scale-90 transition-all cursor-pointer ml-1.5 sm:ml-2 shrink-0 ${
                        showControls
                          ? (displayMode === 'dark'
                              ? 'bg-slate-850 border border-slate-700 text-slate-200 hover:bg-slate-750'
                              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 shadow-3xs')
                          : (displayMode === 'dark'
                              ? 'bg-indigo-95 border border-indigo-800 text-indigo-450 hover:bg-indigo-900'
                              : 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 shadow-3xs')
                      }`}
                      title={showControls ? "操作盤を非表示にして、記録エリアを広げます" : "操作盤を表示します"}
                      id="header-toggle-btn"
                    >
                      {showControls ? <EyeOff className="h-4 w-4 stroke-[2.5]" /> : <Eye className="h-4 w-4 stroke-[2.5]" />}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className={`text-center flex-1 shrink-0 font-bold text-sm ${
                displayMode === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                活動履歴
              </div>
            )}
            
            {/* Right Side: Back to record or Today Calendar shortcut */}
            {activeTab === 'graph' ? (
              <div className="flex items-center select-none shrink-0 pl-1.5">
                <button 
                  onClick={() => {
                    setActiveTab('record');
                    showToast('📝 記録画面に戻りました');
                  }}
                  className={`flex items-center gap-1 cursor-pointer transition-all px-3 py-1 active:scale-95 text-[#e3e2e6] font-black text-xs h-9 rounded-xl shadow-xs ${
                    displayMode === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-750'
                  }`}
                  id="back-to-record-btn"
                >
                  <ListTodo className="h-4 w-4 stroke-[2.5]" />
                  <span>戻る</span>
                </button>
              </div>
            ) : gridMode === 'viewer' ? (
              <div className={`flex items-center select-none ${
                viewerSubScreen === 'report' 
                  ? 'flex-1 justify-center sm:justify-end min-w-0 w-full sm:w-auto pl-1 sm:pl-1.5' 
                  : 'shrink-0 pl-1.5'
              }`}>
                {viewerSubScreen === 'report' ? (
                  <div className="flex items-center gap-1.5 justify-end w-full max-w-full">
                    
                    {/* STANDARD TOOLBAR CONTROLS */}
                    <div className="items-center gap-1 sm:gap-1.5 justify-center sm:justify-end max-w-full w-full flex">
                      {/* Hidden template load file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLoadTemplate}
                        accept=".json"
                        className="hidden"
                      />

                      {/* 元に戻す (Undo) ボタン */}
                      <button
                        onClick={handleUndoBlock}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-indigo-500/30 bg-[#252429] text-[#e3e2e6] hover:bg-indigo-900/30 active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="直前の枠作成を元に戻す (↩️)"
                        id="report-undo-btn"
                      >
                        <Undo2 className="h-4 w-4 stroke-[2.5]" />
                      </button>

                      {/* ズームアウト (Zoom Out) ボタン */}
                      <button
                        onClick={() => {
                          const zoomOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                          const currentIndex = zoomOptions.indexOf(zoomRate);
                          if (currentIndex > 0) {
                            const nextZoom = zoomOptions[currentIndex - 1];
                            setZoomRate(nextZoom);
                            localStorage.setItem('pochilog_report_zoom_rate', nextZoom.toString());
                            showToast(`🔍 ズームアウト: ${nextZoom * 100}%`);
                          } else {
                            showToast('これ以上縮小できません (50%)');
                          }
                        }}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#2d2c30] bg-[#1c1b1f] text-[#e6e1e5] hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="縮小 (－)"
                        id="report-add-hline-btn"
                      >
                        <span className="text-sky-400 font-extrabold text-xs sm:text-sm">－</span>
                      </button>

                      {/* ズーム率表示 */}
                      <div 
                        className="flex items-center justify-center h-8 px-1 sm:px-1.5 sm:h-9 border border-[#2d2c30] bg-[#1c1b1f] text-sky-400 rounded-lg text-[9px] sm:text-xs font-mono font-black select-none shadow-sm min-w-[36px] sm:min-w-[48px]"
                        title={`現在のズーム率: ${zoomRate * 100}%`}
                      >
                        {zoomRate * 100}%
                      </div>

                      {/* ズームイン (Zoom In) ボタン */}
                      <button
                        onClick={() => {
                          const zoomOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
                          const currentIndex = zoomOptions.indexOf(zoomRate);
                          if (currentIndex < zoomOptions.length - 1) {
                            const nextZoom = zoomOptions[currentIndex + 1];
                            setZoomRate(nextZoom);
                            localStorage.setItem('pochilog_report_zoom_rate', nextZoom.toString());
                            showToast(`🔍 ズームイン: ${nextZoom * 100}%`);
                          } else {
                            showToast('これ以上拡大できません (200%)');
                          }
                        }}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#2d2c30] bg-[#1c1b1f] text-[#e6e1e5] hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="拡大 (＋)"
                        id="report-add-vline-btn"
                      >
                        <span className="text-sky-400 font-extrabold text-xs sm:text-sm">＋</span>
                      </button>

                      {/* 枠を作成 (Create Block) ボタン */}
                      <button
                        onClick={handleCreateBlock}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-emerald-500/30 bg-[#252429] text-emerald-400 hover:bg-emerald-950/30 active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="選択範囲に枠を作成 (⬜)"
                        id="report-create-block-btn"
                      >
                        <span className="text-xs sm:text-sm">⬜</span>
                      </button>

                      {/* テンプレートを保存 (Save Template) ボタン */}
                      <button
                        onClick={handleSaveTemplate}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#2d2c30] bg-[#1c1b1f] text-slate-300 hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="テンプレートを保存 (💾)"
                        id="report-save-template-btn"
                      >
                        <span className="text-xs sm:text-sm">💾</span>
                      </button>

                      {/* テンプレートを読み込む (Load Template) ボタン */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#2d2c30] bg-[#1c1b1f] text-slate-300 hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="テンプレートを読み込む (📂)"
                        id="report-load-template-btn"
                      >
                        <span className="text-xs sm:text-sm">📂</span>
                      </button>

                      {/* PDFとして出力 (Export PDF) ボタン */}
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#2d2c30] bg-[#1c1b1f] text-amber-400 hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="A4サイズPDFとして出力 (📄)"
                        id="report-export-pdf-btn"
                      >
                        <span className="text-xs sm:text-sm">📄</span>
                      </button>

                      {/* プレビュー表示ボタン */}
                      <button
                        onClick={() => {
                          setViewerSubScreen('report_preview');
                          showToast('👁️ プレビュー画面を表示しました');
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 h-8 sm:h-9 rounded-lg text-[10px] sm:text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="プレビューを表示 (👁️)"
                        id="report-preview-btn"
                      >
                        <span>👁️</span>
                      </button>

                      {/* クリア (Clear) ボタン */}
                      <button
                        onClick={handleClearAllBlocks}
                        className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-[#2d2c30] bg-[#1c1b1f] text-slate-300 hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="すべての枠線をクリア (🧹)"
                        id="report-clear-btn"
                      >
                        <span className="text-xs sm:text-sm">🧹</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="w-9 h-9" />
                )}
              </div>
            ) : null}
          </header>
        )}

        {/* MAIN BODY CONTENTS CHANGER */}
        <main className={`flex-1 flex flex-col min-h-0 relative overflow-hidden transition-colors duration-300 ${
          displayMode === 'dark' ? 'bg-[#121212]' : 'bg-[#f8f9fa]'
        }`} id="main-content-window">
          {activeTab === 'record' && (
            gridMode === 'settings' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden" id="settings-full-width-container">
                <OtherSettings 
                  selectedDate={selectedDate}
                  records={records}
                  hourRep={hourRep}
                  setHourRep={handleSetHourRep}
                  onClearAllRecords={() => {
                    handleClearAllRecords();
                    handleClearAllMentalRecords();
                    handleClearAllActualSleepRecords();
                  }}
                  deferredPrompt={deferredPrompt}
                  onInstall={handleInstallApp}
                  isInstalled={isInstalled}
                  onImportCSV={handleImportCSVRecords}
                  onAnyCSVImport={(csvText) => {
                    const success = handleAnyCSVImportText(csvText, handleSetHourRep);
                    if (success) {
                      setMentalRecords(loadMentalRecordsFromStorage());
                      setMentalStamps(loadMentalStampsFromStorage());
                      setCustomMentalColCount(loadMentalCustomColCount());
                      setCustomMentalColNames(loadMentalCustomColNames(loadMentalCustomColCount()));
                      setMentalRows(loadMentalRowsFromStorage());
                      // load actual sleep
                      setActualSleepRecords(loadActualSleepRecordsFromStorage());
                      setActualSleepStamps(loadActualSleepStampsFromStorage());
                      setCustomActualSleepColCount(loadActualSleepCustomColCount());
                      setCustomActualSleepColNames(loadActualSleepCustomColNames(loadActualSleepCustomColCount()));
                      triggerBaselineSyncRef.current = true;
                    }
                    return success;
                  }}
                  showToast={showToast}
                  customColCount={customColCount}
                  customColNames={customColNames}
                  setCustomColCount={handleSetCustomColCount}
                  stamps={stamps}
                  onImportBackup={(backup) => {
                    handleImportBackup(backup);
                    handleImportMentalBackup(backup);
                    handleImportActualSleepBackup(backup);
                    triggerBaselineSyncRef.current = true;
                  }}
                  inputMethod={inputMethod}
                  mentalRecords={mentalRecords}
                  mentalStamps={mentalStamps}
                  customMentalColCount={customMentalColCount}
                  customMentalColNames={customMentalColNames}
                  mentalRows={mentalRows}
                  onSave={handleSaveWithBaselineCheck}
                  displayMode={displayMode}
                  onDisplayModeChange={handleSetDisplayMode}
                  chartScaleFactor={chartScaleFactor}
                  onChartScaleFactorChange={handleSetChartScaleFactor}
                  actualSleepRecords={actualSleepRecords}
                  actualSleepStamps={actualSleepStamps}
                  customActualSleepColCount={customActualSleepColCount}
                  customActualSleepColNames={customActualSleepColNames}
                  customColCategories={customColCategories}
                  activityCategories={categories}
                />
              </div>
            ) : gridMode === 'settings_menu' ? (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto select-none" id="other-settings-menu-container">
                <div className="max-w-md mx-auto w-full flex flex-col gap-6 pt-4">
                  
                  {/* Header title inside the page */}
                  <div className="text-center mb-2">
                    <p className="text-xs text-indigo-400 uppercase tracking-widest font-mono">Other Options</p>
                    <h2 className="text-xl font-black text-[#e3e2e6] mt-1">その他メニュー</h2>
                    <p className="text-xs text-slate-400 mt-2">各種設定やデータのバックアップ、開発用のデバッグ機能にアクセスできます。</p>
                  </div>

                  {/* Menu Cards */}
                  <div className="flex flex-col gap-3.5">
                    
                    {/* Option 1: App Environment Config & Data Sync */}
                    <button
                      onClick={() => {
                        setGridMode('settings');
                        showToast('⚙️ アプリ環境設定と同期を開きました');
                      }}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#1C1B1F] hover:bg-[#252429] active:scale-[0.98] transition-all border border-[#2d2c30] text-left cursor-pointer group shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-sky-950/50 border border-sky-800/80 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                          <Settings className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-100 group-hover:text-[#e3e2e6] transition-colors">環境設定とデータ同期</h3>
                          <p className="text-[11px] sm:text-xs text-slate-450 mt-0.5">バックアップ、表示切替、記録項目(列)の設定</p>
                        </div>
                      </div>
                      <span className="text-slate-550 font-bold group-hover:translate-x-1 transition-transform">▶</span>
                    </button>

                    {/* Option 2: Developer Tool */}
                    <button
                      onClick={() => {
                        setGridMode('developer');
                        showToast('💻 開発者ツールを開きました');
                      }}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#1C1B1F] hover:bg-[#252429] active:scale-[0.98] transition-all border border-[#2d2c30] text-left cursor-pointer group shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-950/50 border border-purple-800/80 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                          <Code className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-100 group-hover:text-[#e3e2e6] transition-colors">開発者ツール (デバッグ用)</h3>
                          <p className="text-[11px] sm:text-xs text-slate-455 mt-0.5">動作デバッグ、レコード直接編集、初期化</p>
                        </div>
                      </div>
                      <span className="text-slate-550 font-bold group-hover:translate-x-1 transition-transform">▶</span>
                    </button>

                  </div>

                  {/* Aesthetic footnote */}
                  <div className="text-center mt-6 text-[10px] text-slate-550 font-mono">
                    生活記録ポチログ v1 • Mobile Responsive Layout
                  </div>
                </div>
              </div>
            ) : gridMode === 'developer' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden" id="developer-full-width-container">
                <DeveloperTab 
                  selectedDate={selectedDate}
                  records={records}
                  setRecords={setRecords}
                  stamps={stamps}
                  customColNames={customColNames}
                  displayMode={displayMode}
                  showToast={showToast}
                  mentalRows={mentalRows}
                  mentalRecords={mentalRecords}
                  setMentalRows={setMentalRows}
                  setMentalRecords={setMentalRecords}
                />
              </div>
            ) : (gridMode === 'viewer' && viewerSubScreen === 'menu') ? (
              <div className="flex-1 flex flex-col p-6 overflow-y-auto select-none" id="viewer-menu-container">
                <div className="max-w-md mx-auto w-full flex flex-col gap-6 pt-4">
                  
                  {/* Header title inside the page */}
                  <div className="text-center mb-2">
                    <p className="text-xs text-indigo-400 uppercase tracking-widest font-mono font-black">History &amp; Report</p>
                    <h2 className="text-xl font-black text-[#e3e2e6] mt-1">履歴とレポート選択</h2>
                    <p className="text-xs text-slate-400 mt-2">過去の睡眠・活動・体調記録の閲覧や、病院提出用レポートの印刷ができます。</p>
                  </div>

                  {/* Menu Cards */}
                  <div className="flex flex-col gap-3.5">
                    
                    {/* Option 1: Live Viewer */}
                    <button
                      onClick={() => {
                        setViewerSubScreen('viewer');
                        showToast('📈 全履歴ビュアーを開きました');
                      }}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#1C1B1F] hover:bg-[#252429] active:scale-[0.98] transition-all border border-[#2d2c30] text-left cursor-pointer group shadow-md"
                    >
                      <div className="flex items-center gap-4 font-sans">
                        <div className="h-12 w-12 rounded-xl bg-indigo-950/50 border border-indigo-800/80 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                          <Eye className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-100 group-hover:text-[#e3e2e6] transition-colors">全履歴ビュアー</h3>
                          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">カレンダー形式で睡眠・活動・体調の履歴を確認</p>
                        </div>
                      </div>
                      <span className="text-slate-550 font-bold group-hover:translate-x-1 transition-transform">▶</span>
                    </button>

                    {/* Option 2: Print Report */}
                    <button
                      onClick={() => {
                        setViewerSubScreen('report');
                        showToast('📄 レポート印刷画面を開きました');
                      }}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#1C1B1F] hover:bg-[#252429] active:scale-[0.98] transition-all border border-[#2d2c30] text-left cursor-pointer group shadow-md"
                    >
                      <div className="flex items-center gap-4 font-sans">
                        <div className="h-12 w-12 rounded-xl bg-sky-950/50 border border-sky-800/80 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                          <Printer className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-100 group-hover:text-[#e3e2e6] transition-colors">レポート印刷</h3>
                          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">病院提出用に、印刷・PDF保存ができるレポートを作成</p>
                        </div>
                      </div>
                      <span className="text-slate-550 font-bold group-hover:translate-x-1 transition-transform">▶</span>
                    </button>

                    {/* Option 3: Spreadsheet Test */}
                    <button
                      onClick={() => {
                        setShowSpreadsheetModal(true);
                        setSpreadsheetTestResult(null);
                        showToast('📊 スプレッドシートテスト画面を開きました');
                      }}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#1C1B1F] hover:bg-[#252429] active:scale-[0.98] transition-all border border-[#2d2c30] text-left cursor-pointer group shadow-md"
                    >
                      <div className="flex items-center gap-4 font-sans">
                        <div className="h-12 w-12 rounded-xl bg-emerald-950/50 border border-emerald-800/80 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-100 group-hover:text-[#e3e2e6] transition-colors">スプレッドシートテスト</h3>
                          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">自動転記テストを実行し、テスト用Pythonコードを表示します</p>
                        </div>
                      </div>
                      <span className="text-emerald-550 font-bold group-hover:translate-x-1 transition-transform">▶</span>
                    </button>

                  </div>

                  {/* Aesthetic footnote */}
                  <div className="text-center mt-6 text-[10px] text-slate-500 font-mono">
                    生活記録ポチログ v1 • Print Preparation Mode
                  </div>
                </div>
              </div>
            ) : (gridMode === 'viewer' && viewerSubScreen === 'viewer') ? (
              <div className="flex-1 flex flex-col min-h-0 p-2 overflow-hidden" id="viewer-full-width-container">
                <SleepViewer 
                  records={records}
                  actualSleepRecords={actualSleepRecords}
                  onSelectDate={(dateStr) => {
                    setSelectedDate(dateStr);
                    setGridMode(lastActiveRecordGrid);
                  }}
                  hourRep={hourRep}
                  stamps={stamps}
                  actualSleepStamps={actualSleepStamps}
                  displayMode={displayMode}
                  customColCount={customColCount}
                  customColNames={customColNames}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  categories={categories}
                  customColCategories={customColCategories}
                  mentalRows={mentalRows}
                  mentalRecords={mentalRecords}
                  chartScaleFactor={chartScaleFactor}
                />
              </div>
            ) : (gridMode === 'viewer' && (viewerSubScreen === 'report' || viewerSubScreen === 'report_preview')) ? (
              <div 
                ref={reportContainerRef}
                className="flex-1 flex flex-col min-h-0 bg-[#121212] overflow-y-auto overflow-x-auto p-4 sm:p-6 select-none" 
                id="report-view-container"
              >
                <div className="flex-1 flex flex-col items-center justify-start py-4">
                  
                  {/* Mode Indicator Banner */}
                  {viewerSubScreen === 'report_preview' && (
                    <div className="mb-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                        📄 印刷プレビューモード
                      </span>
                      <p className="text-[11px] text-slate-400 mt-2">
                        ヘッダー左上の「◀」ボタンを押すと、デザイン画面に戻って線の調整を再開できます。
                      </p>
                    </div>
                  )}

                  {/* A4 Paper Sheet representation */}
                  <div 
                    className="shrink-0 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.75)] border border-slate-200 flex flex-col relative text-slate-800 animate-in fade-in zoom-in-95 duration-200" 
                    id="report-paper-sheet"
                    style={{
                      transform: viewerSubScreen === 'report' ? `scale(${zoomRate})` : 'scale(1)',
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out',
                      width: '780px',
                      height: '1100px'
                    }}
                  >
                    {/* Design Edit Mode Badge pinned precisely at the top-right corner with 0 margin */}
                    {viewerSubScreen === 'report' && (
                      <div className="absolute top-0 right-0 bg-slate-900 text-[#e6e1e5] border-b border-l border-indigo-500/20 rounded-bl-xl px-3 py-1.5 text-[10px] font-black z-30 flex items-center gap-1 shadow-md select-none">
                        <span>🛠️</span>
                        <span>デザイン編集モード</span>
                      </div>
                    )}

                    {/* Grid Editor Base */}
                    <div 
                      onPointerDown={viewerSubScreen === 'report' ? handleGridPointerDown : undefined}
                      onPointerMove={viewerSubScreen === 'report' ? handleGridPointerMove : undefined}
                      onPointerUp={viewerSubScreen === 'report' ? handleGridPointerUp : undefined}
                      className={`w-full h-full relative select-none ${
                        viewerSubScreen === 'report' ? 'overflow-visible cursor-crosshair' : 'overflow-hidden'
                      }`}
                      style={{
                        touchAction: 'none',
                        backgroundSize: '20px 20px',
                        backgroundImage: viewerSubScreen === 'report' 
                          ? 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)' 
                          : 'none',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {/* Render All Report Blocks */}
                      {blocks.map((block) => (
                        <div 
                          key={block.id}
                          className={`absolute border-2 ${
                            editingBlockId === block.id
                              ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-md'
                              : viewerSubScreen === 'report'
                                ? 'border-[#FF8C00] hover:border-orange-600 bg-white/85 hover:bg-white hover:shadow-md'
                                : 'border-slate-800 hover:border-indigo-600 bg-white hover:shadow-md'
                          } flex flex-col p-1 group transition-all`}
                          style={{
                            left: `${block.startCol * 20}px`,
                            top: `${block.startRow * 20}px`,
                            width: `${(block.endCol - block.startCol + 1) * 20}px`,
                            height: `${(block.endRow - block.startRow + 1) * 20}px`,
                            zIndex: 10
                          }}
                          onPointerDown={(e) => {
                            // Stop propagation of pointer down events to prevent parent drag selection from starting
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            // Also stop mouse down events just in case
                            e.stopPropagation();
                          }}
                        >
                          {/* Label and delete button positioned OUTSIDE above the top edge */}
                          {viewerSubScreen === 'report' && (
                            <div 
                              className="absolute bottom-full left-0 right-0 flex justify-between items-end pb-1 pointer-events-none"
                              style={{ zIndex: 9999 }}
                            >
                              <span className={`font-bold px-1.5 py-0.5 rounded border shadow-xs leading-none text-[10px] pointer-events-auto select-none whitespace-nowrap ${
                                editingBlockId === block.id
                                  ? 'bg-orange-600 text-white border-orange-500'
                                  : 'bg-white text-orange-600 border-orange-200'
                              }`}>
                                Block {block.num}
                              </span>
                              <button
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeleteBlock(block.id);
                                }}
                                className="text-rose-600 bg-white hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded leading-none transition-all cursor-pointer font-bold flex items-center justify-center w-5 h-5 text-xs pointer-events-auto select-none shadow-xs"
                                title="この枠を削除"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          
                          {/* Text display mode (centered horizontally and vertically, wrap words, dynamic font size) */}
                          <div 
                            onClick={(e) => {
                              if (viewerSubScreen === 'report') {
                                e.stopPropagation();
                                setEditingBlockId(block.id);
                              }
                            }}
                            className={`w-full h-full text-slate-900 font-sans p-1.5 leading-normal whitespace-pre-wrap overflow-y-auto break-words flex flex-col justify-center items-center text-center ${
                              viewerSubScreen === 'report' ? 'cursor-pointer hover:bg-slate-100/40 rounded transition-colors' : ''
                            }`}
                          >
                            <div className={`w-full font-medium text-center ${getFontSizeClass(block.fontSize)}`}>
                              {block.text || (
                                viewerSubScreen === 'report' ? (
                                  <span className="text-slate-400 italic text-[10px] block text-center">クリックして入力</span>
                                ) : (
                                  ''
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Active drag-selection rectangle helper overlay */}
                      {startCell && currentCell && (
                        <div 
                          className={`absolute border-2 border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-none z-20 ${
                            isDragging ? 'animate-pulse' : ''
                          }`}
                          style={{
                            left: `${Math.min(startCell.c, currentCell.c) * 20}px`,
                            top: `${Math.min(startCell.r, currentCell.r) * 20}px`,
                            width: `${(Math.abs(startCell.c - currentCell.c) + 1) * 20}px`,
                            height: `${(Math.abs(startCell.r - currentCell.r) + 1) * 20}px`,
                          }}
                        />
                      )}
                    </div>

                  </div>

                </div>
              </div>
            ) : gridMode === 'mental' ? (
              <div className={`flex-1 flex flex-row min-h-0 divide-x transition-colors duration-300 ${
                displayMode === 'dark' ? 'divide-slate-850' : 'divide-gray-150'
              }`} id="app-mental-split-pane">
                
                {/* Left Column: MentalGrid Table */}
                <div 
                  className={`${
                    showControls 
                      ? 'w-[55%] xs:w-[58%] sm:w-[60%] md:w-[62%]' 
                      : 'w-full'
                  } flex flex-col min-h-0 transition-all duration-300`} 
                  id="mental-left-main-area"
                >
                  <MentalGrid 
                    mentalRows={mentalRows}
                    records={mentalRecords}
                    selectedDate={selectedDate}
                    onToggleScore={wrappedHandleToggleMentalScore}
                    onAddRow={handleAddMentalRow}
                    onUpdateRow={handleUpdateMentalRow}
                    onDeleteRow={handleDeleteMentalRow}
                    onMoveRow={handleMoveMentalRow}
                    displayMode={displayMode}
                    activeRowId={activeMentalRowId}
                    onSetActiveRow={setActiveMentalRowId}
                  />
                </div>

                {/* Right Column: Face Buttons, Memo & Actions Sidebar */}
                {showControls && (
                  <div 
                    className={`flex-1 min-w-[140px] flex flex-col shrink-0 p-2 select-none overflow-y-auto border-l transition-colors duration-300 ${
                      displayMode === 'dark' 
                        ? 'bg-[#1C1B1F] text-[#E6E1E5] border-[#49454F]' 
                        : 'bg-white border-slate-150 text-slate-800'
                    }`} 
                    id="mental-right-sidebar-area"
                  >
                    {/* -5 to +5 Emotional Evaluators Face Palette */}
                    <div className="shrink-0 flex flex-col min-h-0 mb-4 font-sans select-none">
                      <div className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-2 ml-0.5 select-none flex justify-between items-center ${
                        displayMode === 'dark' ? 'text-indigo-400' : 'text-indigo-650'
                      }`}>
                        <span>スコア入力 (ポチポチ)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryModalTab('mental');
                            setIsCategoryModalOpen(true);
                          }}
                          className="text-[9px] bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-slate-300 rounded-full font-black cursor-pointer active:scale-95 transition-all flex items-center justify-center px-2 py-0.5 gap-0.5"
                        >
                          タグ⚙️管理
                        </button>
                      </div>
                      
                      {/* Grid of Face Buttons in 2 columns */}
                      <div className="grid grid-cols-2 gap-1.5 font-sans">
                        {(() => {
                          const activeRow = mentalRows.find(r => r.id === activeMentalRowId);
                          const activeScaleType = activeRow?.scaleType || 'bipolar';
                          const currentLevels = activeScaleType === 'severity'
                            ? [5, 4, 3, 2, 1]
                            : SCORE_LEVELS;

                          return currentLevels.map((level) => {
                            const ratingColor = getRatingColorInfo(level, displayMode, activeScaleType);
                            const rowId = activeRow ? activeRow.id : 'mood';
                            const rowName = activeRow ? activeRow.name : '気分';
                            const descLabel = getSubLabel(rowId, level, rowName, activeRow?.customLabels, activeScaleType);

                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => {
                                  handleSelectMentalScoreWithAdvance(level);
                                  const formattedVal = activeScaleType === 'severity' ? level : (level > 0 ? `+${level}` : level);
                                  showToast(`📝 「${activeRow?.name || '項目'}」に ${formattedVal} (${descLabel}) を記録しました`);
                                }}
                                style={{
                                  backgroundColor: displayMode === 'dark' ? '#1C1B1F' : '#ffffff',
                                }}
                                className={`w-full h-16 rounded-xl border-2 flex flex-row items-center justify-between px-2 gap-1.5 select-none cursor-pointer transition-all duration-100 hover:scale-[1.02] active:scale-95 ${
                                  displayMode === 'dark'
                                    ? 'border-[#49454F] text-[#e3e2e6] shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]'
                                    : 'border-black text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                }`}
                              >
                                {/* Left: Score Number */}
                                <div className="shrink-0 w-11 h-12 flex items-center justify-center">
                                  <svg viewBox="0 0 48 40" className="w-full h-full" shapeRendering="geometricPrecision">
                                    <text
                                      x="24"
                                      y="31"
                                      textAnchor="middle"
                                      fontSize="32"
                                      fontWeight="900"
                                      fill={ratingColor.faceBg}
                                      stroke={displayMode === 'dark' ? '#71717a' : '#000000'}
                                      strokeWidth="4"
                                      strokeLinejoin="round"
                                      paintOrder="stroke fill"
                                      className="font-sans font-black"
                                      style={{ letterSpacing: '-0.06em' }}
                                    >
                                      {activeScaleType === 'severity' ? level : (level > 0 ? `+${level}` : level)}
                                    </text>
                                  </svg>
                                </div>

                                {/* Right: Description Label (No face stamp) */}
                                <div className="flex-1 flex items-center justify-center min-w-0 h-full leading-tight">
                                  <span className={`text-[10px] sm:text-[11.5px] font-black leading-tight text-center whitespace-normal break-all line-clamp-2 pr-0.5 ${
                                    displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-900'
                                  }`}>
                                    {descLabel}
                                  </span>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* 消しゴム (クリア) ボタン */}
                      {activeMentalRowId && (
                        <button
                          type="button"
                          onClick={() => {
                            const activeRow = mentalRows.find(r => r.id === activeMentalRowId);
                            if (activeRow) {
                              wrappedHandleToggleMentalScore(activeMentalRowId, null);
                              showToast(`🗑️ 「${activeRow.name}」の評価をクリアしました`);
                            }
                          }}
                          className={`w-full h-11 rounded-xl border-2 flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-95 transition-all duration-100 ${
                            displayMode === 'dark'
                              ? 'bg-rose-955/10 border-rose-800/80 text-rose-300 hover:bg-rose-950/30 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                              : 'bg-rose-50 border-rose-600 text-rose-700 hover:bg-rose-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          }`}
                        >
                          <Eraser className="h-4 w-4 shrink-0" />
                          <span className="text-[11.5px] font-black tracking-wide">
                            消しゴム (現在の項目をクリア)
                          </span>
                        </button>
                      )}
                    </div>

                    <div className={`h-px my-1 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                    {/* Mental Memo Column */}
                    <div className="shrink-0 flex flex-col mb-3 select-none font-sans">
                      <div className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5 ml-0.5 select-none text-center sm:text-left font-sans ${
                        displayMode === 'dark' ? 'text-indigo-400' : 'text-indigo-650'
                      }`}>
                        ココロのメモ
                      </div>
                      <textarea
                        value={(mentalRecords[selectedDate] || {}).memo || ''}
                        onChange={(e) => handleUpdateMentalMemo(e.target.value)}
                        placeholder="今日一日の気分、モヤモヤしたこと、嬉しかったことなどの詳細を記入できます..."
                        className={`w-full h-24 p-2 text-xs transition-all placeholder:text-slate-500 resize-none outline-none font-sans rounded-xl ${
                          displayMode === 'dark' 
                            ? 'bg-slate-950 border border-slate-800 text-[#e3e2e6] focus:border-indigo-550 focus:ring-1 focus:ring-indigo-550' 
                            : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        }`}
                        id="mental-memo-textarea"
                      />
                    </div>

                    <div className={`h-px my-1.5 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                    {/* Actions column */}
                    <div className="shrink-0 pb-1 mt-1">
                      <ActionControls 
                        onClearToday={wrappedHandleClearMentalToday}
                        onCopyPreviousDay={wrappedHandleCopyMentalPreviousDay}
                        displayMode={displayMode}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex-1 flex flex-row min-h-0 divide-x transition-colors duration-300 ${
                displayMode === 'dark' ? 'divide-slate-850' : 'divide-gray-150'
              }`} id="app-record-split-pane">
                
                {/* Left Column: spacious SleepGrid Table */}
                <div 
                  className={`${
                    showControls 
                      ? isSlimForLayout
                        ? 'w-[75%] xs:w-[77%] sm:w-[79%] md:w-[81%]'
                        : 'w-[50%] xs:w-[54%] sm:w-[58%] md:w-[62%]'
                      : 'w-full'
                  } flex flex-col min-h-0 transition-all duration-300`} 
                  id="record-left-main-area"
                >
                  <SleepGrid 
                    record={isSleepTabActive ? (actualSleepRecords[selectedDate] || createBlankRecord()) : currentRecord} 
                    onCellTap={isSleepTabActive ? handleActualSleepCellTap : handleCellTap}
                    activeSymbol={isSleepTabActive ? activeActualSleepSymbol : activeSymbol}
                    activeTool={isSleepTabActive ? activeActualSleepTool : activeTool}
                    hourRep={hourRep}
                    customColCount={isSleepTabActive ? 0 : customColCount}
                    customColNames={isSleepTabActive ? [] : customColNames}
                    onUpdateColConfig={isSleepTabActive ? handleUpdateActualSleepColConfig : handleUpdateColConfig}
                    onSwapCols={isSleepTabActive ? handleSwapActualSleepCustomCols : handleSwapCustomCols}
                    onDeleteCol={isSleepTabActive ? handleDeleteActualSleepCustomCol : handleDeleteCustomCol}
                    stamps={isSleepTabActive ? actualSleepStamps : stamps}
                    inputMethod={isSleepTabActive ? actualSleepInputMethod : inputMethod}
                    displayMode={displayMode}
                    onInteractionStart={handleInteractionStart}
                    onInteractionEnd={handleInteractionEnd}
                    isNowActive={isNowActive}
                    selectedDate={selectedDate}
                    isSleepTab={isSleepTabActive}
                    categories={categories}
                    customColCategories={customColCategories}
                    activeCategoryFilter={isSleepTabActive ? null : activeCategoryFilter}
                    activityColWidth={activityColWidth}
                    activityColFontWeight={activityColFontWeight}
                  />
                </div>

                {/* Right Column: Palette, Memo & Actions Sidebar (Unified) */}
                {showControls && (
                  <div 
                    className={`flex-1 ${
                      isSlimForLayout ? 'min-w-[75px] xs:min-w-[85px]' : 'min-w-[140px]'
                    } flex flex-col shrink-0 p-2 select-none overflow-y-auto border-l transition-all duration-300 ${
                      displayMode === 'dark' 
                        ? 'bg-[#1C1B1F] text-[#E6E1E5] border-[#49454F]' 
                        : 'bg-white border-slate-150 text-slate-800'
                    }`} 
                    id="record-right-sidebar-area"
                  >
                    {/* Activity Tab Categories Filter Panel */}
                    {gridMode === 'standard' && (
                      <div className="shrink-0 flex flex-col min-h-0 mb-3 font-sans select-none border-b border-dashed border-[#49454F]/40 pb-2.5">
                        <div className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5 ml-0.5 select-none flex ${isSlimForLayout ? 'flex-col items-center gap-1' : 'justify-between items-center'} ${
                          displayMode === 'dark' ? 'text-indigo-400' : 'text-indigo-650'
                        }`}>
                          {!isSlimForLayout && <span>タグ絞込</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryModalTab('activity');
                              setIsCategoryModalOpen(true);
                            }}
                            className={`text-[9px] bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-slate-300 rounded-full font-black cursor-pointer active:scale-95 transition-all flex items-center justify-center ${
                              isSlimForLayout ? 'px-1.5 py-0.5' : 'px-2 py-0.5 gap-0.5'
                            }`}
                          >
                            タグ⚙️{isSlimForLayout ? '' : '管理'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-1 w-full" id="category-filter-grid">
                          {/* すべて表示 */}
                          <button
                            type="button"
                            onClick={() => setActiveCategoryFilter(null)}
                            className={`w-full flex flex-col items-center p-0.5 rounded-lg border transition-all active:scale-[0.98] cursor-pointer select-none justify-center ${
                              activeCategoryFilter === null
                                ? (displayMode === 'dark'
                                    ? 'bg-blue-950/20 border-sky-400 border-2 shadow-sm ring-1 ring-sky-500/30'
                                    : 'bg-blue-50/30 border-blue-600 border-2 shadow-sm ring-1 ring-blue-600/30 font-black')
                                : (displayMode === 'dark'
                                    ? 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-200'
                                    : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-800')
                            }`}
                          >
                            <div className={`w-full h-8 sm:h-9 rounded-md flex items-center justify-center px-1 py-0 shrink-0 border ${
                              activeCategoryFilter === null
                                ? (displayMode === 'dark' ? 'bg-indigo-950/50 border-sky-500/50 text-sky-300' : 'bg-blue-100 border-blue-200 text-blue-700')
                                : (displayMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700')
                            }`}>
                              <span className="text-[18px] xs:text-[20px] sm:text-[22px] font-normal tracking-wide leading-none text-center max-w-full block overflow-hidden whitespace-nowrap">
                                {formatButtonText('全部')}
                              </span>
                            </div>
                          </button>

                          {/* 各カテゴリー */}
                          {categories.map((cat) => {
                            const isSelected = activeCategoryFilter === cat;

                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategoryFilter(cat)}
                                className={`w-full flex flex-col items-center p-0.5 rounded-lg border transition-all active:scale-[0.98] cursor-pointer select-none justify-center ${
                                  isSelected
                                    ? (displayMode === 'dark'
                                        ? 'bg-blue-950/20 border-sky-400 border-2 shadow-sm ring-1 ring-sky-500/30'
                                        : 'bg-blue-50/30 border-blue-600 border-2 shadow-sm ring-1 ring-blue-600/30 font-black')
                                    : (displayMode === 'dark'
                                        ? 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-200'
                                        : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-800')
                                }`}
                              >
                                <div className={`w-full h-8 sm:h-9 rounded-md flex items-center justify-center px-1 py-0 shrink-0 border ${
                                  isSelected
                                    ? (displayMode === 'dark' ? 'bg-indigo-950/50 border-sky-500/50 text-sky-300' : 'bg-blue-100 border-blue-200 text-blue-700')
                                    : (displayMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700')
                                }`}>
                                  <span className="text-[18px] xs:text-[20px] sm:text-[22px] font-normal tracking-wide leading-none text-center max-w-full block overflow-hidden whitespace-nowrap">
                                    {formatButtonText(cat === 'その他' ? '他' : cat)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                          {/* 新規カテゴリー追加ボタン */}
                          <button
                            type="button"
                            onClick={() => setIsAddCategoryOpen(true)}
                            className={`w-full flex flex-col items-center p-0.5 rounded-lg border border-dashed transition-all active:scale-95 cursor-pointer justify-center ${
                              displayMode === 'dark'
                                ? 'border-slate-800 hover:border-sky-500 bg-slate-950/40 hover:bg-slate-900/50 text-slate-400 hover:text-sky-400'
                                : 'border-slate-300 hover:border-blue-500 bg-slate-50/40 hover:bg-slate-100/50 text-slate-600 hover:text-blue-600'
                            }`}
                            title="新規カテゴリーを追加"
                          >
                            <div className={`w-full h-8 sm:h-9 rounded-md flex items-center justify-center px-1 py-0 shrink-0 border border-dashed ${
                              displayMode === 'dark' ? 'border-slate-800' : 'border-slate-350'
                            }`}>
                              <span className="text-[11px] sm:text-[12px] font-extrabold tracking-normal leading-none flex items-center gap-0.5">
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                {formatButtonText('追加')}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Group 1: Palette at the top of Sidebar (Only for Sleep tab) */}
                    {isSleepTabActive && (
                      <div className="shrink-0 flex flex-col min-h-0 mb-3">
                        <div className="flex items-center justify-between mb-1.5 ml-0.5 select-none font-sans">
                          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                            displayMode === 'dark' ? 'text-sky-400' : 'text-slate-400'
                          }`}>
                            スタンプ
                          </span>
                        </div>
                        <Palette 
                          activeSymbol={activeActualSleepSymbol}
                          setActiveSymbol={setActiveActualSleepSymbol}
                          activeTool={activeActualSleepTool}
                          setActiveTool={setActiveActualSleepTool}
                          stamps={actualSleepStamps}
                          onStampsChange={handleActualSleepStampsChange}
                          showToast={showToast}
                          displayMode={displayMode}
                          onDisplayModeChange={handleSetDisplayMode}
                          showModeSwitcher={false}
                          isSlim={isSlimSidebar}
                          onToggleSlim={() => {
                            const nextVal = !isSlimSidebar;
                            handleSetSlimSidebar(nextVal);
                            showToast(nextVal ? '📐 サイドバー幅をスリムにしました' : '📐 サイドバー幅を標準にしました');
                          }}
                          isNowActive={isNowActive}
                          onNowActiveChange={handleNowActiveChange}
                        />
                      </div>
                    )}
                    {isSleepTabActive && <div className={`h-px my-1 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />}

                     {/* Activities columns count drop-down setting */}
                     {!isSleepTabActive && (
                       <>
                         <div 
                           className="shrink-0 flex flex-col min-h-0 mb-3 font-sans" 
                           id="sidebar-custom-col-count-container"
                           title="指定の列数を新規に追加します"
                         >
                           <div className="flex items-center justify-between mb-1 ml-0.5 select-none font-sans">
                             <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                               displayMode === 'dark' ? 'text-sky-300' : 'text-slate-500'
                             }`}>{isSlimForLayout ? '追加' : '列追加'}:</span>
                             <select
                               value=""
                               onChange={(e) => {
                                 const num = Number(e.target.value);
                                 if (num > 0) {
                                   handleAddCustomCols(num);
                                 }
                               }}
                               title="指定の列数を新規に追加します"
                               className={`text-xs font-black px-2 py-1 rounded-lg focus:outline-hidden cursor-pointer ${isSlimForLayout ? 'w-full text-center text-[10px]' : ''} ${
                                 displayMode === 'dark' 
                                   ? 'bg-slate-900 border border-slate-700 text-sky-400' 
                                   : 'bg-white border border-slate-250 text-blue-700'
                               }`}
                             >
                               <option value="" disabled className={displayMode === 'dark' ? 'bg-slate-900 text-slate-450' : 'bg-white text-slate-400'}>
                                 {isSlimForLayout ? '選択' : '列数を選択...'}
                               </option>
                               {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                                 <option key={num} value={num} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>
                                   {num}列
                                 </option>
                               ))}
                             </select>
                           </div>
                         </div>
                         <div className={`h-px my-1 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                        {/* Activities columns width drop-down setting */}
                        <div className="shrink-0 flex flex-col min-h-0 mb-3 font-sans" id="sidebar-custom-col-width-container">
                          <div className="flex items-center justify-between mb-1 ml-0.5 select-none font-sans">
                            <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                              displayMode === 'dark' ? 'text-sky-300' : 'text-slate-500'
                            }`}>{isSlimForLayout ? '幅' : '列の幅'}:</span>
                            <select
                              value={activityColWidth}
                              onChange={(e) => {
                                handleSetActivityColWidth(Number(e.target.value));
                                showToast(`📐 列幅を${e.target.value}pxに変更しました`);
                              }}
                              className={`text-xs font-black px-2 py-1 rounded-lg focus:outline-hidden cursor-pointer ${isSlimForLayout ? 'w-full text-center text-[10px]' : ''} ${
                                displayMode === 'dark' 
                                  ? 'bg-slate-900 border border-slate-700 text-sky-400' 
                                  : 'bg-white border border-slate-250 text-blue-700'
                              }`}
                            >
                              <option value={24} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>極細 (24)</option>
                              <option value={28} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>細 (28)</option>
                              <option value={32} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>標準 (32)</option>
                              <option value={40} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>太 (40)</option>
                              <option value={48} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>極太 (48)</option>
                            </select>
                          </div>
                        </div>
                        <div className={`h-px my-1 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                        {/* Activities columns font weight drop-down setting */}
                        <div className="shrink-0 flex flex-col min-h-0 mb-3 font-sans" id="sidebar-custom-col-font-weight-container">
                          <div className="flex items-center justify-between mb-1 ml-0.5 select-none font-sans">
                            <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${
                              displayMode === 'dark' ? 'text-sky-300' : 'text-slate-500'
                            }`}>{isSlimForLayout ? '太さ' : '文字の太さ'}:</span>
                            <select
                              value={activityColFontWeight}
                              onChange={(e) => {
                                handleSetActivityColFontWeight(e.target.value);
                                showToast(`✍️ 文字の太さを変更しました`);
                              }}
                              className={`text-xs font-black px-2 py-1 rounded-lg focus:outline-hidden cursor-pointer ${isSlimForLayout ? 'w-full text-center text-[10px]' : ''} ${
                                displayMode === 'dark' 
                                  ? 'bg-slate-900 border border-slate-700 text-sky-400' 
                                  : 'bg-white border border-slate-250 text-blue-700'
                              }`}
                            >
                              <option value="font-light" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>細文字 (Light)</option>
                              <option value="font-normal" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>通常 (Normal)</option>
                              <option value="font-bold" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>太文字 (Bold)</option>
                              <option value="font-black" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>超極太 (Black)</option>
                            </select>
                          </div>
                        </div>
                        <div className={`h-px my-1 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                      </>
                    )}

                    {/* Group 1.2: Input Method Selection (Only for Sleep tab) */}
                    {isSleepTabActive && (
                      <>
                        <div className="shrink-0 flex flex-col min-h-0 mb-3 font-sans" id="sidebar-input-method-container">
                          <div className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5 ml-0.5 select-none text-center sm:text-left ${
                            displayMode === 'dark' ? 'text-sky-400' : 'text-slate-400'
                          }`}>
                            {isSlimForLayout ? '入力' : '入力方法'}
                          </div>
                          <div className={`flex flex-col sm:flex-row gap-1 p-1 rounded-xl border w-full select-none ${
                            displayMode === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200/60'
                          }`}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSetActualSleepInputMethod('stamp');
                                showToast('🎯 スタンプ方式およびタップ判定を適用しました');
                              }}
                              className={`w-full sm:flex-1 text-center py-1.5 sm:py-1 text-[11px] xs:text-xs font-black rounded-lg transition-all cursor-pointer truncate ${
                                actualSleepInputMethod === 'stamp' 
                                  ? (displayMode === 'dark' ? 'bg-slate-800 text-sky-400 shadow-3xs' : 'bg-white text-emerald-700 shadow-3xs')
                                  : (displayMode === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')
                              }`}
                              title="マスを指先でポチポチと押すスタンプ入力方式"
                            >
                              スタンプ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSetActualSleepInputMethod('paint');
                                showToast('🎨 ペイント（なぞり）入力方式を適用しました');
                              }}
                              className={`w-full sm:flex-1 text-center py-1.5 sm:py-1 text-[11px] xs:text-xs font-black rounded-lg transition-all cursor-pointer truncate ${
                                actualSleepInputMethod === 'paint' 
                                  ? (displayMode === 'dark' ? 'bg-slate-800 text-sky-400 shadow-3xs' : 'bg-white text-emerald-700 shadow-3xs')
                                  : (displayMode === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-800')
                              }`}
                              title="マスを指先でなぞって連続で塗るペイント入力方式"
                            >
                              ペイント
                            </button>
                          </div>
                        </div>
                        <div className={`h-px my-1 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                      </>
                    )}

                    {/* Group 2: Memo/Details input area with dynamic metrics */}
                    <div className="shrink-0 flex flex-col my-2 font-sans">
                      <div className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1.5 ml-0.5 select-none flex items-center justify-between ${
                        displayMode === 'dark' ? 'text-sky-400' : 'text-slate-400'
                      }`}>
                        <span>{isSlimForLayout ? 'メモ' : 'メモ / 詳細'}</span>
                        {(isSleepTabActive ? (actualSleepRecords[selectedDate] || createBlankRecord()) : currentRecord).memo && (
                          <button 
                            onClick={() => isSleepTabActive ? handleUpdateActualSleepMemo('') : handleUpdateMemo('')}
                            className="text-[9px] font-bold text-rose-500 hover:text-rose-700 active:scale-95 transition-all px-1 cursor-pointer select-none"
                            title="メモをクリア"
                          >
                            消去
                          </button>
                        )}
                      </div>
                      <textarea
                        value={(isSleepTabActive ? (actualSleepRecords[selectedDate] || createBlankRecord()) : currentRecord).memo || ''}
                        onChange={(e) => isSleepTabActive ? handleUpdateActualSleepMemo(e.target.value) : handleUpdateMemo(e.target.value)}
                        placeholder={isSlimForLayout ? "メモを入力..." : "今日の睡眠メモや、体調などの詳細を記入できます..."}
                        className={`w-full ${isSlimForLayout ? 'h-14 p-1.5 text-[10px]' : 'h-24 p-2 text-xs'} transition-all placeholder:text-slate-500 resize-none outline-none font-sans rounded-xl ${
                          displayMode === 'dark' 
                            ? 'bg-slate-950 border border-slate-800 text-[#e3e2e6] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-600' 
                            : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400'
                        }`}
                        id="memo-textarea"
                      />
                    </div>

                    <div className={`h-px my-1.5 shrink-0 ${displayMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                    {/* Group 3: Actions column */}
                    <div className="shrink-0 pb-1 mt-1">
                      <ActionControls 
                        onClearToday={isSleepTabActive ? wrappedHandleClearActualSleepToday : wrappedHandleClearToday}
                        onCopyPreviousDay={isSleepTabActive ? wrappedHandleCopyActualSleepPreviousDay : wrappedHandleCopyPreviousDay}
                        displayMode={displayMode}
                      />
                    </div>

                    {/* Shortcuts Guide Panel */}
                    <div className={`${
                      isSlimForLayout ? 'hidden' : 'hidden md:block'
                    } shrink-0 border rounded-xl p-2.5 mt-2.5 font-medium select-none space-y-1 shadow-3xs font-sans ${
                      displayMode === 'dark' 
                        ? 'bg-slate-950 border-slate-850 text-slate-400' 
                        : 'bg-slate-50 border-slate-200/60 text-slate-500'
                    }`} id="desktop-shortcuts-guide">
                      <div className={`font-extrabold text-[10px] mb-1 flex items-center gap-1 ${
                        displayMode === 'dark' ? 'text-slate-350' : 'text-slate-705'
                      }`}>
                        <span className={`flex h-1.5 w-1.5 rounded-full animate-pulse ${displayMode === 'dark' ? 'bg-sky-450' : 'bg-blue-600'}`}></span>
                        便利なPCキーボード操作
                      </div>
                      {isSleepTabActive ? (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-semibold leading-relaxed">
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>1</kbd>～<kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>5</kbd> : 各スタンプ</div>
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>E</kbd> : 消しゴム</div>
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>A</kbd> / <kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>D</kbd> : 前日 / 翌日</div>
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>M</kbd> : メモ入力へ</div>
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>T</kbd> : 今日の日付</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-y-1 text-[9px] font-semibold leading-relaxed">
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>A</kbd> / <kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>D</kbd> : 前日 / 翌日</div>
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>M</kbd> : メモ入力へ</div>
                          <div><kbd className={`px-1 py-0.5 border rounded shadow-3xs text-[8.5px] font-mono font-bold ${
                            displayMode === 'dark' ? 'bg-slate-900 border-slate-700 text-[#e3e2e6]' : 'bg-white border-slate-300 text-slate-800'
                          }`}>T</kbd> : 今日の日付</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === 'developer' && (
            <DeveloperTab
              selectedDate={selectedDate}
              records={records}
              setRecords={setRecords}
              stamps={stamps}
              customColNames={customColNames}
              displayMode={displayMode}
              showToast={showToast}
              mentalRows={mentalRows}
              mentalRecords={mentalRecords}
              setMentalRows={setMentalRows}
              setMentalRecords={setMentalRecords}
            />
          )}
        </main>

        {/* BOTTOM FIXED NAVIGATION TAB BAR WITH NATIVE RECEPTIVE TOUCH TARGETS */}
        <div 
          className={`h-[72px] shrink-0 border-t flex items-center justify-around select-none relative z-50 transition-colors duration-300 md:rounded-b-[36px] ${
            displayMode === 'dark' 
              ? 'bg-[#0b0f19] border-slate-850 text-[#e3e2e6] shadow-[0_-8px_24px_rgba(0,0,0,0.52)]' 
              : 'bg-white border-slate-200 text-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.07)]'
          }`} 
          id="app-bottom-tab-bar"
        >
          {/* TAB 1: 🕒 Activities */}
          <button
            onClick={() => {
              setActiveTab('record');
              setGridMode('standard');
              setLastActiveRecordGrid('standard');
              showToast('🕒 活動カレンダーを表示しました');
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all cursor-pointer ${
              activeTab === 'record' && gridMode === 'standard'
                ? (displayMode === 'dark' ? 'text-sky-400 font-black' : 'text-blue-600 font-black')
                : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-705')
            }`}
            id="tab-btn-activities"
            title="活動記録"
          >
            {activeTab === 'record' && gridMode === 'standard' && (
              <span className="w-8 h-1 rounded-full bg-blue-600 dark:bg-sky-400 absolute top-0" />
            )}
            <ListTodo className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[11px] sm:text-xs font-black tracking-tight mt-1 font-sans">活動</span>
          </button>

          {/* TAB 2: 💤 Sleep */}
          <button
            onClick={() => {
              setActiveTab('record');
              setGridMode('actual_sleep');
              setLastActiveRecordGrid('actual_sleep');
              showToast('💤 睡眠カレンダーを表示しました');
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all cursor-pointer ${
              activeTab === 'record' && gridMode === 'actual_sleep'
                ? (displayMode === 'dark' ? 'text-indigo-400 font-black' : 'text-indigo-600 font-black')
                : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-705')
            }`}
            id="tab-btn-sleep"
            title="睡眠記録"
          >
            {activeTab === 'record' && gridMode === 'actual_sleep' && (
              <span className="w-8 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 absolute top-0" />
            )}
            <Moon className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[11px] sm:text-xs font-black tracking-tight mt-1 font-sans">睡眠</span>
          </button>

          {/* TAB 3: 😊 Mental */}
          <button
            onClick={() => {
              setActiveTab('record');
              setGridMode('mental');
              showToast('😊 メンタル記録を表示しました');
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all cursor-pointer ${
              activeTab === 'record' && gridMode === 'mental'
                ? (displayMode === 'dark' ? 'text-emerald-400 font-black' : 'text-emerald-600 font-black')
                : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-705')
            }`}
            id="tab-btn-mental"
            title="メンタル記録"
          >
            {activeTab === 'record' && gridMode === 'mental' && (
              <span className="w-8 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 absolute top-0" />
            )}
            <Smile className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[11px] sm:text-xs font-black tracking-tight mt-1 font-sans">メンタル</span>
          </button>

          {/* TAB 4: 📈 Viewer */}
          <button
            onClick={() => {
              setActiveTab('record');
              setGridMode('viewer');
              setViewerSubScreen('menu');
              showToast('📈 履歴とレポートの選択画面を表示しました');
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all cursor-pointer ${
              activeTab === 'record' && gridMode === 'viewer'
                ? (displayMode === 'dark' ? 'text-indigo-400 font-black' : 'text-indigo-600 font-black')
                : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-705')
            }`}
            id="tab-btn-viewer"
            title="ビュアー"
          >
            {activeTab === 'record' && gridMode === 'viewer' && (
              <span className="w-8 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 absolute top-0" />
            )}
            <Eye className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[11px] sm:text-xs font-black tracking-tight mt-1 font-sans">ビュアー</span>
          </button>

          {/* TAB 5: ⚙️ Other */}
          <button
            onClick={() => {
              setActiveTab('record');
              setGridMode('settings_menu');
              showToast('⚙️ その他設定メニューを表示しました');
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all cursor-pointer ${
              activeTab === 'record' && (gridMode === 'settings_menu' || gridMode === 'settings' || gridMode === 'developer')
                ? (displayMode === 'dark' ? 'text-sky-400 font-black' : 'text-slate-850 font-black')
                : (displayMode === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-705')
            }`}
            id="tab-btn-other"
            title="その他 / 設定"
          >
            {activeTab === 'record' && (gridMode === 'settings_menu' || gridMode === 'settings' || gridMode === 'developer') && (
              <span className="w-8 h-1 rounded-full bg-slate-650 dark:bg-sky-400 absolute top-0" />
            )}
            <Menu className="h-5 w-5 stroke-[2.5]" />
            <span className="text-[11px] sm:text-xs font-black tracking-tight mt-1 font-sans">その他</span>
          </button>
        </div>

        {/* SLIDING SIDEBAR DRAWER */}
        <AnimatePresence>
          {isSidebarOpen && (
            <Sidebar 
              key="sidebar-drawer-component"
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              selectedDate={selectedDate}
              records={records}
              hourRep={hourRep}
              setHourRep={handleSetHourRep}
              onClearAllRecords={() => {
                handleClearAllRecords();
                handleClearAllMentalRecords();
                handleClearAllActualSleepRecords();
              }}
              deferredPrompt={deferredPrompt}
              onInstall={handleInstallApp}
              isInstalled={isInstalled}
              onImportCSV={handleImportCSVRecords}
              onAnyCSVImport={(csvText) => {
                const success = handleAnyCSVImportText(csvText, handleSetHourRep);
                if (success) {
                  setMentalRecords(loadMentalRecordsFromStorage());
                  setMentalStamps(loadMentalStampsFromStorage());
                  setCustomMentalColCount(loadMentalCustomColCount());
                  setCustomMentalColNames(loadMentalCustomColNames(loadMentalCustomColCount()));
                  setMentalRows(loadMentalRowsFromStorage());
                  // actual sleep
                  setActualSleepRecords(loadActualSleepRecordsFromStorage());
                  setActualSleepStamps(loadActualSleepStampsFromStorage());
                  setCustomActualSleepColCount(loadActualSleepCustomColCount());
                  setCustomActualSleepColNames(loadActualSleepCustomColNames(loadActualSleepCustomColCount()));
                  triggerBaselineSyncRef.current = true;
                }
                return success;
              }}
              showToast={showToast}
              customColCount={customColCount}
              customColNames={customColNames}
              stamps={stamps}
              onImportBackup={(backup) => {
                handleImportBackup(backup);
                handleImportMentalBackup(backup);
                handleImportActualSleepBackup(backup);
                triggerBaselineSyncRef.current = true;
              }}
              inputMethod={inputMethod}
              mentalRecords={mentalRecords}
              mentalStamps={mentalStamps}
              customMentalColCount={customMentalColCount}
              customMentalColNames={customMentalColNames}
              mentalRows={mentalRows}
              onSave={handleSaveWithBaselineCheck}
              displayMode={displayMode}
              onDisplayModeChange={handleSetDisplayMode}
              actualSleepRecords={actualSleepRecords}
              actualSleepStamps={actualSleepStamps}
              customActualSleepColCount={customActualSleepColCount}
              customActualSleepColNames={customActualSleepColNames}
              customColCategories={customColCategories}
              activityCategories={categories}
              activityColWidth={activityColWidth}
              onActivityColWidthChange={handleSetActivityColWidth}
              activityColFontWeight={activityColFontWeight}
              onActivityColFontWeightChange={handleSetActivityColFontWeight}
            />
          )}
        </AnimatePresence>



        {/* GLOBAL SENSORY TOAST NOTIFIER */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              key="toast-notification-panel"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="fixed bottom-[100px] right-4 sm:bottom-6 sm:right-6 bg-slate-900/95 text-[#e3e2e6] font-bold py-3 px-5 rounded-2xl shadow-xl border border-white/10 flex items-center justify-center gap-2 text-xs z-[9999] pointer-events-none backdrop-blur-lg max-w-[calc(100vw-32px)] sm:max-w-md animate-in fade-in"
              id="toast-notification"
            >
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CATEGORY MANAGEMENT MODAL */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[9990] p-4 font-sans">
            <div className="bg-[#1C1B1F] text-[#E6E1E5] rounded-3xl w-full max-w-md shadow-2xl p-6 border border-[#49454F] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#49454F] shrink-0">
                <h3 className="text-base font-black text-[#e3e2e6] flex items-center gap-2">
                  <span>🏷️ カテゴリーの管理</span>
                </h3>
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1 px-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-[#e3e2e6] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-slate-950/60 p-1 rounded-xl mb-4 gap-1 shrink-0 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCategoryModalTab('activity')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    categoryModalTab === 'activity'
                      ? 'bg-slate-850 text-[#e3e2e6] shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  活動（睡眠）
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryModalTab('mental')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    categoryModalTab === 'mental'
                      ? 'bg-slate-850 text-[#e3e2e6] shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ココロ（体調）
                </button>
              </div>

              {/* Add New Category */}
              <div className="mb-4 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800 shrink-0">
                <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-slate-400">
                  {categoryModalTab === 'activity' ? '活動カテゴリー追加' : 'ココロカテゴリー追加'}
                </label>
                <div className="flex gap-2">
                  <input
                    key={categoryModalTab}
                    type="text"
                    id="new-category-name-input"
                    placeholder="例：サプリ、散歩 など"
                    className="flex-1 bg-[#1C1B1F] border border-[#49454F] text-[#e3e2e6] rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-500 bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          if (categoryModalTab === 'activity') {
                            handleAddCategory(val);
                          } else {
                            handleAddMentalCategory(val);
                          }
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-category-name-input') as HTMLInputElement;
                      const val = input?.value.trim();
                      if (val) {
                        if (categoryModalTab === 'activity') {
                          handleAddCategory(val);
                        } else {
                          handleAddMentalCategory(val);
                        }
                        input.value = '';
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-[#e3e2e6] font-extrabold text-xs py-2 px-4 rounded-xl cursor-pointer active:scale-95 transition-all shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>追加</span>
                  </button>
                </div>
              </div>

              {/* List of categories */}
              <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2 mb-4">
                <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-slate-400">
                  既存カテゴリー一覧 (並び替え / 編集 / 削除)
                </label>
                {categoryModalTab === 'activity' ? (
                  categories.map((cat, idx) => (
                    <CategoryListItem 
                      key={cat}
                      categoryName={cat}
                      onRename={handleRenameCategory}
                      onDelete={handleDeleteCategory}
                      onMoveUp={idx > 0 ? () => handleSwapCategories(idx, idx - 1) : undefined}
                      onMoveDown={idx < categories.length - 1 ? () => handleSwapCategories(idx, idx + 1) : undefined}
                    />
                  ))
                ) : (
                  mentalCategories.map((cat, idx) => (
                    <CategoryListItem 
                      key={cat}
                      categoryName={cat}
                      onRename={handleRenameMentalCategory}
                      onDelete={handleDeleteMentalCategory}
                      onMoveUp={idx > 0 ? () => handleSwapMentalCategories(idx, idx - 1) : undefined}
                      onMoveDown={idx < mentalCategories.length - 1 ? () => handleSwapMentalCategories(idx, idx + 1) : undefined}
                    />
                  ))
                )}
              </div>

              {/* Actions Footer */}
              <div className="border-t border-[#49454F] pt-3 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-5 py-2 border border-[#49454F] text-xs font-extrabold text-slate-400 rounded-xl hover:bg-slate-800 cursor-pointer active:scale-95 transition-all"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUICK ADD CATEGORY MODAL - MATCHES RECORD ITEM SETTINGS DIALOG STYLE */}
        {isAddCategoryOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[9995] p-4 font-sans border-none outline-hidden">
            <div className={`rounded-2xl w-full max-w-sm shadow-2xl p-5 border animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto shadow-black/80 ${displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F] text-[#E6E1E5]' : 'bg-white border-slate-200 text-slate-800'}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-sm font-black ${displayMode === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                  🏷️ カテゴリーの新規追加
                </h3>
                <button 
                  onClick={() => {
                    setIsAddCategoryOpen(false);
                    setNewCategoryValue('');
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

              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
                  自由にカテゴリー名を入力 (最大10文字まで)
                </label>
                <input
                  type="text"
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(e.target.value)}
                  placeholder="例：サプリ、散歩 など"
                  id="add-category-inline-input"
                  autoFocus
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-black focus:outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-500 ${
                    displayMode === 'dark'
                      ? 'border-[#49454F] bg-[#1C1B1F] text-[#E6E1E5]'
                      : 'border-slate-300 bg-white text-black'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = newCategoryValue.trim();
                      if (val) {
                        handleAddCategory(val);
                        setIsAddCategoryOpen(false);
                        setNewCategoryValue('');
                      }
                    }
                  }}
                />
              </div>

              <div className="flex gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCategoryOpen(false);
                    setNewCategoryValue('');
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer active:scale-98 transition-transform ${
                    displayMode === 'dark'
                      ? 'border-[#49454F] bg-slate-850 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  戻る（キャンセル）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = newCategoryValue.trim();
                    if (val) {
                      handleAddCategory(val);
                      setIsAddCategoryOpen(false);
                      setNewCategoryValue('');
                    } else {
                      showToast('⚠️ カテゴリー名を入力してください');
                    }
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-[#e3e2e6] font-extrabold text-xs py-2 px-3 rounded-lg shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  カテゴリーを追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- GOOGLE SPREADSHEET TEST MODAL (Option 3) --- */}
        <AnimatePresence>
          {showSpreadsheetModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-[9990] p-4 font-sans"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className={`rounded-3xl w-full max-w-lg shadow-2xl p-6 border overflow-hidden max-h-[90vh] flex flex-col ${
                  displayMode === 'dark' 
                    ? 'bg-[#1C1B1F] border-[#49454F] text-[#E6E1E5]' 
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-[#49454F]/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      スプレッドシート自動転記テスト
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSpreadsheetModal(false)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      displayMode === 'dark'
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content Scroll Area */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
                  
                  {/* Explanation card */}
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-black border ${
                    displayMode === 'dark' 
                      ? 'bg-[#25232A] border-[#49454F]/50 text-slate-300' 
                      : 'bg-blue-50 border-blue-100 text-blue-900'
                  }`}>
                    Google Sheets API (v4) を利用して、ご指定のAPIキー、スプレッドシートID、書き込み位置、テキストを使って書き込みテストを行う画面です。
                  </div>

                  {/* Input fields Group (Prepared Data) */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      📝 テスト用の準備データ
                    </h4>
                    
                    {/* API Key */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400">APIキー</label>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(spreadsheetApiKey);
                            showToast("📋 APIキーをクリップボードにコピーしました");
                          }}
                          className="text-[9px] font-extrabold text-indigo-400 hover:underline cursor-pointer"
                        >
                          コピー
                        </button>
                      </div>
                      <input
                        type="text"
                        value={spreadsheetApiKey}
                        onChange={(e) => setSpreadsheetApiKey(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-black focus:outline-hidden ${
                          displayMode === 'dark'
                            ? 'border-[#49454F] bg-[#121212] text-[#E6E1E5] focus:border-indigo-500'
                            : 'border-slate-300 bg-slate-50 text-black focus:border-blue-500'
                        }`}
                      />
                    </div>

                    {/* Spreadsheet ID */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400">スプレッドシートID</label>
                        <div className="flex gap-2">
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-extrabold text-emerald-500 hover:underline cursor-pointer"
                          >
                            スプレッドシートを開く ↗
                          </a>
                          <span className="text-[9px] text-slate-500">|</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(spreadsheetId);
                              showToast("📋 スプレッドシートIDをコピーしました");
                            }}
                            className="text-[9px] font-extrabold text-indigo-400 hover:underline cursor-pointer"
                          >
                            コピー
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-black focus:outline-hidden ${
                          displayMode === 'dark'
                            ? 'border-[#49454F] bg-[#121212] text-[#E6E1E5] focus:border-indigo-500'
                            : 'border-slate-300 bg-slate-50 text-black focus:border-blue-500'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Cell Range */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">書き込むセル (範囲)</label>
                        <input
                          type="text"
                          value={spreadsheetCellRange}
                          onChange={(e) => setSpreadsheetCellRange(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden ${
                            displayMode === 'dark'
                              ? 'border-[#49454F] bg-[#121212] text-[#E6E1E5] focus:border-indigo-500'
                              : 'border-slate-300 bg-slate-50 text-black focus:border-blue-500'
                          }`}
                        />
                      </div>

                      {/* Write Content */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">書き込む内容</label>
                        <input
                          type="text"
                          value={spreadsheetWriteContent}
                          onChange={(e) => setSpreadsheetWriteContent(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden ${
                            displayMode === 'dark'
                              ? 'border-[#49454F] bg-[#121212] text-[#E6E1E5] focus:border-indigo-500'
                              : 'border-slate-300 bg-slate-50 text-black focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Browser Write Test Run Section */}
                  <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                    displayMode === 'dark' ? 'bg-[#1D1B20]/60 border-[#49454F]/70' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black">🌐 ① ブラウザで今すぐテスト</span>
                      <span className="text-[10px] text-slate-400 font-bold leading-normal">
                        ブラウザから直接Google APIへデータを送信し、スプレッドシートの書き換えをテストします。
                      </span>
                    </div>

                    <button
                      onClick={runSpreadsheetWriteTest}
                      disabled={isTestingSpreadsheetWrite}
                      className={`w-full font-extrabold text-xs py-3 px-4 rounded-xl cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2 ${
                        isTestingSpreadsheetWrite
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      }`}
                    >
                      {isTestingSpreadsheetWrite ? (
                        <>
                          <span className="animate-spin text-lg">⏳</span>
                          <span>スプレッドシートへ書き込み中...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>ブラウザで今すぐ書き込みテストをする</span>
                        </>
                      )}
                    </button>

                    {/* Result panel */}
                    {spreadsheetTestResult && (
                      <div className={`p-3.5 rounded-xl border text-xs font-black leading-relaxed flex flex-col gap-1.5 animate-in fade-in duration-150 ${
                        spreadsheetTestResult.success
                          ? 'bg-emerald-950/40 border-emerald-850 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-900 text-rose-300'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span>{spreadsheetTestResult.success ? "✅" : "⚠️"}</span>
                          <span className="font-extrabold text-sm">
                            {spreadsheetTestResult.success ? "大成功！スプレッドシートを見てみてね！" : "書き込みテストが失敗しました"}
                          </span>
                        </div>
                        
                        {!spreadsheetTestResult.success && (
                          <div className="space-y-2 mt-1 font-sans">
                            <p className="text-[11px] font-mono opacity-90 break-all bg-black/20 p-2 rounded-lg">
                              エラー内容: {spreadsheetTestResult.message} {spreadsheetTestResult.code && `(HTTP: ${spreadsheetTestResult.code})`}
                            </p>
                            <div className="text-[10.5px] font-bold opacity-85 leading-normal bg-black/45 p-2.5 rounded-lg text-slate-200">
                              💡 <strong>解説（セキュリティの仕組み）</strong>：<br />
                              Googleスプレッドシートに「文字を書き込む」のは非常に高い権限が必要なんだ！<br />
                              そのため、APIキー単体でのWebからの書き込みは、Google側で拒否されます（これが安全な証拠だよ！）。<br />
                              でも、下の<strong>「Pythonコード」</strong>をコピーして自分でパソコンで実行すれば、安全にスプレッドシートを書き換えるテストが実行できるよ！👇
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Python Code Block Section */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-baseline">
                      <div className="flex flex-col">
                        <span className="text-xs font-black">🐍 ② 自分でパソコンで動かすPythonコード</span>
                        <span className="text-[9.5px] text-slate-400 font-bold">「requests」ライブラリだけを使って動く、初心者向けの超シンプルなテストコードです。</span>
                      </div>
                      <button
                        onClick={() => {
                          const pythonCode = `# coding: utf-8
import requests
import json

# 1. ユーザー設定（準備データ）
API_KEY = "${spreadsheetApiKey}"
SPREADSHEET_ID = "${spreadsheetId}"
CELL_RANGE = "${spreadsheetCellRange}"
WRITE_TEXT = "${spreadsheetWriteContent}"

# 2. リクエスト用のURLとデータを準備する
url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{CELL_RANGE}?valueInputOption=USER_ENTERED&key={API_KEY}"
data = {
    "values": [
        [WRITE_TEXT]
    ]
}

print("スプレッドシートへの書き込みテストを開始します...")

try:
    # 3. HTTP PUTリクエストを送信してデータを書き込む
    response = requests.put(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(data)
    )
    
    # 4. 結果を判定する
    if response.status_code == 200:
        print("大成功！スプレッドシートを見てみてね！")
    else:
        print("書き込みに失敗しました。")
        print(f"ステータスコード: {response.status_code}")
        print("エラー内容:")
        print(response.text)
        print("\\n【ワンポイントアドバイス】")
        print("Googleスプレッドシートへの「書き込み」はセキュリティが厳しいため、")
        print("APIキーだけでは制限され、OAuth認証（ログイン）が必要になることがあります。")

except Exception as e:
    print("通信エラーが発生しました。インターネット接続やコードを確認してください。")
    print(f"エラー詳細: {e}")
`;
                          navigator.clipboard.writeText(pythonCode);
                          showToast("📋 Pythonコードをクリップボードにコピーしました！");
                        }}
                        className="text-[10px] font-extrabold text-indigo-400 hover:underline shrink-0 cursor-pointer"
                      >
                        コピー
                      </button>
                    </div>

                    {/* Dark syntax-like card containing the code */}
                    <div className="bg-[#121212] p-3.5 rounded-xl border border-[#49454F]/40 font-mono text-[10.5px] leading-relaxed text-[#CAC4D0] max-h-48 overflow-y-auto whitespace-pre-wrap select-text scrollbar-thin">
{`# coding: utf-8
import requests
import json

# 1. ユーザー設定（準備データ）
# Google APIキーを設定します
API_KEY = "${spreadsheetApiKey}"

# 操作したいスプレッドシートのIDを設定します
SPREADSHEET_ID = "${spreadsheetId}"

# 書き込みたい場所（セル）を設定します
CELL_RANGE = "${spreadsheetCellRange}"

# 書き込む内容（テキスト）を設定します
WRITE_TEXT = "${spreadsheetWriteContent}"

# 2. リクエスト用のURLとデータを準備する
# Sheets API用のURLを作成します
url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{CELL_RANGE}?valueInputOption=USER_ENTERED&key={API_KEY}"

# 送信するデータ（2次元リスト）を作成します
data = {
    "values": [
        [WRITE_TEXT]
    ]
}

print("スプレッドシートへの書き込みテストを開始します...")

try:
    # 3. HTTP PUTリクエストを送信してデータを書き込む
    response = requests.put(
        url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(data)
    )
    
    # 4. 結果を判定する
    if response.status_code == 200:
        print("大成功！スプレッドシートを見てみてね！")
    else:
        print("書き込みに失敗しました。")
        print(f"ステータスコード: {response.status_code}")
        print("エラー内容:")
        print(response.text)
        print("\\n【ワンポイントアドバイス】")
        print("Googleスプレッドシートへの「書き込み」はセキュリティが厳しいため、")
        print("APIキーだけでは制限され、OAuth認証（ログイン）が必要になることがあります。")

except Exception as e:
    print("通信エラーが発生しました。インターネット接続やコードを確認してください。")
    print(f"エラー詳細: {e}")`}
                    </div>

                    {/* Step-by-step instructions */}
                    <div className={`p-3.5 rounded-2xl text-[11px] font-black leading-relaxed space-y-1.5 border ${
                      displayMode === 'dark' ? 'bg-[#25232A]/40 border-[#49454F]/45 text-slate-350' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <p className="font-extrabold text-xs">🎒 パソコンでテストする３つの手順</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>パソコンの「コマンドプロンプト（Windows）」や「ターミナル（Mac）」を開いて、<code className="bg-black/30 px-1 py-0.5 rounded font-mono">pip install requests</code> と入力してエンターキーを押します。</li>
                        <li>上のコードを全部コピーして、パソコン上に <code className="bg-black/30 px-1 py-0.5 rounded font-mono">test.py</code> という名前で保存します。</li>
                        <li>ターミナル上で <code className="bg-black/30 px-1 py-0.5 rounded font-mono">python test.py</code> と実行して結果を確認します！</li>
                      </ol>
                    </div>

                  </div>

                </div>

                {/* Footer close button */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#49454F]/50 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSpreadsheetModal(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-[#e3e2e6] text-xs font-black rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    テスト画面を閉じる
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}

interface CategoryListItemProps {
  key?: string;
  categoryName: string;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function CategoryListItem({ categoryName, onRename, onDelete, onMoveUp, onMoveDown }: CategoryListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(categoryName);

  const handleSave = () => {
    const trimmed = editedName.trim();
    if (!trimmed) return;
    if (trimmed === categoryName) {
      setIsEditing(false);
      return;
    }
    onRename(categoryName, trimmed);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/20 hover:bg-slate-900/40 rounded-xl border border-slate-800/60 transition-colors animate-in fade-in duration-100">
      {isEditing ? (
        <div className="flex-1 flex gap-1.5 items-center">
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-[#e3e2e6] rounded-lg px-2 py-1 text-xs font-bold focus:outline-hidden focus:border-indigo-500 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditedName(categoryName);
                setIsEditing(false);
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition-all shrink-0"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setEditedName(categoryName);
              setIsEditing(false);
            }}
            className="bg-slate-800/80 hover:bg-slate-750 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition-all shrink-0"
          >
            戻る
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={!onMoveUp}
              onClick={onMoveUp}
              className={`w-6 h-6 rounded-md border text-[10px] flex items-center justify-center transition-all cursor-pointer ${
                onMoveUp
                  ? 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-[#e3e2e6] active:scale-90 shadow-sm'
                  : 'bg-slate-900/40 border-slate-850/60 text-slate-650 cursor-not-allowed opacity-30'
              }`}
              title="上に移動"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={!onMoveDown}
              onClick={onMoveDown}
              className={`w-6 h-6 rounded-md border text-[10px] flex items-center justify-center transition-all cursor-pointer ${
                onMoveDown
                  ? 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-[#e3e2e6] active:scale-90 shadow-sm'
                  : 'bg-slate-900/40 border-slate-850/60 text-slate-650 cursor-not-allowed opacity-30'
              }`}
              title="下に移動"
            >
              ▼
            </button>
          </div>
          <span className="flex-1 text-xs font-black text-slate-200 truncate pl-1">
            {categoryName}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1 px-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-350 hover:text-[#e3e2e6] rounded-lg text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
              title="名前を編集"
            >
              ✏️ 編集
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(categoryName);
              }}
              className="p-1 px-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 text-rose-400 transition-colors rounded-lg text-[10px] font-bold cursor-pointer active:scale-95"
              title="削除"
            >
              🗑️ 削除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
