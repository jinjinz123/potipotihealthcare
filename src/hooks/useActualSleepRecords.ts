import { useState } from 'react';
import { DailyRecords, ActiveTool, SleepSymbol, StampConfig } from '../types';
import { 
  getLocalDateString,
  loadActualSleepRecordsFromStorage as loadRecordsFromStorage, 
  saveActualSleepRecordsToStorage as saveRecordsToStorage,
  loadActualSleepStampsFromStorage as loadStampsFromStorage,
  saveActualSleepStampsToStorage as saveStampsToStorage,
  loadActualSleepCustomColCount as loadCustomColCount,
  saveActualSleepCustomColCount as saveCustomColCount,
  loadActualSleepCustomColNames as loadCustomColNames,
  saveActualSleepCustomColNames as saveCustomColNames,
  createBlankRecord,
  shiftDateString,
  saveMentalRecordsToStorage,
  saveMentalStampsToStorage,
  saveMentalCustomColCount,
  saveMentalCustomColNames,
  saveMentalRowsToStorage
} from '../utils';

export function useActualSleepRecords(selectedDate: string, showToast: (msg: string) => void) {
  // Main states
  const [records, setRecords] = useState<DailyRecords>(() => loadRecordsOnStartup());
  
  function loadRecordsOnStartup() {
    return loadRecordsOfStorageAndClearDuplicates();
  }

  function loadRecordsOfStorageAndClearDuplicates() {
    return loadRecordsFromStorage();
  }

  const setSelectedDate = () => {};
  
  const [stamps, setStamps] = useState<StampConfig[]>(() => loadStampsFromStorage());
  const [activeSymbol, setActiveSymbol] = useState<SleepSymbol>(() => {
    const s = loadStampsFromStorage();
    return s.length > 0 ? s[0].id : 'S';
  });

  const [activeTool, setActiveTool] = useState<ActiveTool>('stamp');
  const [inputMethod, setInputMethod] = useState<'stamp' | 'paint'>(() => {
    return (localStorage.getItem('actual_sleep_input_method') as 'stamp' | 'paint') || 'stamp';
  });
  const [isDirty, setIsDirty] = useState(false);

  const handleSetInputMethod = (val: 'stamp' | 'paint') => {
    setInputMethod(val);
    localStorage.setItem('actual_sleep_input_method', val);
  };

  const [customColCount, setCustomColCount] = useState<number>(() => loadCustomColCount());
  const [customColNames, setCustomColNames] = useState<string[]>(() => loadCustomColNames(loadCustomColCount()));

  const handleStampsChange = (newStamps: StampConfig[]) => {
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    newStamps.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    setStamps(unique);
    saveStampsToStorage(unique);
  };

  const setCustomValuesAndSync = (updatedRecords: DailyRecords, updatedNames: string[], colCount: number) => {
    setRecords(updatedRecords);
    saveRecordsToStorage(updatedRecords);
    
    setCustomColNames(updatedNames);
    saveCustomColNames(updatedNames);
    
    setCustomColCount(colCount);
    saveCustomColCount(colCount);
    
    setIsDirty(true);
  };

  const handleSetCustomColCount = (val: number) => {
    setCustomColCount(val);
    saveCustomColCount(val);
    const updatedNames = loadCustomColNames(val);
    setCustomColNames(updatedNames);
    saveCustomColNames(updatedNames);
    showToast(`📊 睡眠記録列を${val}列に設定しました`);
  };

  const handleAddCustomCols = (count: number) => {
    if (count <= 0) return;
    const nextColCount = customColCount + count;
    setCustomColCount(nextColCount);
    saveCustomColCount(nextColCount);

    const updatedNames = [...customColNames];
    for (let i = customColNames.length; i < nextColCount; i++) {
      updatedNames.push(`列${i + 2}`);
    }
    setCustomColNames(updatedNames);
    saveCustomColNames(updatedNames);

    showToast(`➕ 新しく${count}列の記録項目を追加しました`);
  };

  const handleUpdateColConfig = (
    colIdx: number, 
    newName: string, 
    dataAction: 'keep' | 'clear' | 'archive'
  ) => {
    const oldName = customColNames[colIdx] || `列${colIdx + 2}`;
    
    let updatedNames = [...customColNames];
    let updatedRecords = { ...records };
    let finalColCount = customColCount;
    
    if (dataAction === 'clear') {
      Object.keys(updatedRecords).forEach(dateStr => {
        const record = { ...updatedRecords[dateStr] };
        if (record.customCols) {
          record.customCols = { ...record.customCols };
          delete record.customCols[colIdx];
        }
        updatedRecords[dateStr] = record;
      });
      updatedNames[colIdx] = newName;
      showToast(`項目名を「${newName}」に変更し、過去の記録を消去しました`);
    } else if (dataAction === 'archive') {
      const archiveColIdx = customColCount;
      finalColCount = customColCount + 1;
      
      updatedNames.push(oldName);
      updatedNames[colIdx] = newName;
      
      Object.keys(updatedRecords).forEach(dateStr => {
        const record = { ...updatedRecords[dateStr] };
        if (record.customCols) {
          record.customCols = { ...record.customCols };
          const dataToMove = record.customCols[colIdx];
          
          if (dataToMove) {
            record.customCols[archiveColIdx] = { ...dataToMove };
            delete record.customCols[colIdx];
          }
        }
        updatedRecords[dateStr] = record;
      });
      
      showToast(`項目「${oldName}」のデータを末尾列に退避し、第${colIdx + 2}列を「${newName}」として開始しました`);
    } else {
      updatedNames[colIdx] = newName;
      showToast(`項目名を「${newName}」に変更しました（データは引き継がれます）`);
    }
    
    setCustomValuesAndSync(updatedRecords, updatedNames, finalColCount);
  };

  const handleSwapCustomCols = (colIdxA: number, colIdxB: number) => {
    if (colIdxA < 0 || colIdxA >= customColCount || colIdxB < 0 || colIdxB >= customColCount) {
      return;
    }
    
    const updatedNames = [...customColNames];
    const nameA = updatedNames[colIdxA];
    updatedNames[colIdxA] = updatedNames[colIdxB];
    updatedNames[colIdxB] = nameA;
    
    const updatedRecords = { ...records };
    Object.keys(updatedRecords).forEach(dateStr => {
      const record = { ...updatedRecords[dateStr] };
      if (record.customCols) {
        record.customCols = { ...record.customCols };
        const dataA = record.customCols[colIdxA];
        const dataB = record.customCols[colIdxB];
        
        if (dataA) {
          record.customCols[colIdxB] = { ...dataA };
        } else {
          delete record.customCols[colIdxB];
        }
        
        if (dataB) {
          record.customCols[colIdxA] = { ...dataB };
        } else {
          delete record.customCols[colIdxA];
        }
      }
      updatedRecords[dateStr] = record;
    });
    
    setCustomValuesAndSync(updatedRecords, updatedNames, customColCount);
    showToast(`🔄 「${updatedNames[colIdxB]}」と「${updatedNames[colIdxA]}」の並びを入れ替えました`);
  };

  const handleDeleteCustomCol = (colIdx: number) => {
    if (colIdx < 0 || colIdx >= customColCount) {
      return;
    }
    const oldName = customColNames[colIdx] || `列${colIdx + 2}`;
    
    const newColCount = customColCount - 1;
    const updatedNames = [...customColNames];
    updatedNames.splice(colIdx, 1);
    
    const updatedRecords = { ...records };
    Object.keys(updatedRecords).forEach(dateStr => {
      const record = { ...updatedRecords[dateStr] };
      if (record.customCols) {
        const newCustomCols: { [key: number]: any } = {};
        Object.keys(record.customCols).forEach(k => {
          const otherColIdx = parseInt(k, 10);
          if (otherColIdx < colIdx) {
            newCustomCols[otherColIdx] = record.customCols![otherColIdx];
          } else if (otherColIdx > colIdx) {
            newCustomCols[otherColIdx - 1] = record.customCols![otherColIdx];
          }
        });
        record.customCols = newCustomCols;
      }
      updatedRecords[dateStr] = record;
    });

    setCustomValuesAndSync(updatedRecords, updatedNames, newColCount);
    showToast(`🗑️ 記録項目「${oldName}」を完全に削除しました（全期間のデータも消去されました）`);
  };

  const handleImportBackup = (backup: {
    actualSleepRecords?: DailyRecords;
    actualSleepStamps?: StampConfig[];
    customActualSleepColCount?: number;
    customActualSleepColNames?: string[];
    inputMethod?: 'stamp' | 'paint';
    records?: DailyRecords;
    stamps?: StampConfig[];
    customColCount?: number;
    customColNames?: string[];
  }) => {
    const sleepRecords = backup.actualSleepRecords || backup.records;
    if (sleepRecords) {
      setRecords(sleepRecords);
      saveRecordsToStorage(sleepRecords);
    }

    const colCount = backup.customActualSleepColCount !== undefined ? backup.customActualSleepColCount : backup.customColCount;
    if (colCount !== undefined) {
      setCustomColCount(colCount);
      saveCustomColCount(colCount);
    }

    const colNames = (backup.customActualSleepColNames && backup.customActualSleepColNames.length > 0) ? backup.customActualSleepColNames : backup.customColNames;
    if (colNames && colNames.length > 0) {
      setCustomColNames(colNames);
      saveCustomColNames(colNames);
    }

    const stampsData = (backup.actualSleepStamps && backup.actualSleepStamps.length > 0) ? backup.actualSleepStamps : backup.stamps;
    if (stampsData && stampsData.length > 0) {
      const uniqueStamps: StampConfig[] = [];
      const seen = new Set<string>();
      stampsData.forEach(s => {
        if (s && s.id && !seen.has(s.id)) {
          seen.add(s.id);
          uniqueStamps.push(s);
        }
      });

      setStamps(uniqueStamps);
      saveStampsToStorage(uniqueStamps);
    }

    if (backup.inputMethod) {
      handleSetInputMethod(backup.inputMethod);
    }

    setIsDirty(true);
  };

  const handleImportCSVRecords = async (importedRecords: DailyRecords) => {
    const merged = { ...records, ...importedRecords };
    setRecords(merged);
    saveRecordsToStorage(merged);
    setIsDirty(true);
    showToast(`📂 ${Object.keys(importedRecords).length}日分の睡眠記録をインポートしました！`);
  };

  const handleAnyCSVImportText = (csvText: string, onHourRepChange?: (val: '1-24' | '0-23') => void): boolean => {
    // 0. Try to parse as JSON backup format
    try {
      const parsed = JSON.parse(csvText);
      if (parsed && typeof parsed === 'object') {
        const sleepData = parsed.actualSleepRecords || parsed.records;
        if (sleepData) {
          setRecords(sleepData);
          saveRecordsToStorage(sleepData);
        }

        const colCount = parsed.customActualSleepColCount !== undefined ? parsed.customActualSleepColCount : parsed.customColCount;
        if (colCount !== undefined) {
          setCustomColCount(colCount);
          saveCustomColCount(colCount);
        }

        const colNames = parsed.customActualSleepColNames && parsed.customActualSleepColNames.length > 0 ? parsed.customActualSleepColNames : parsed.customColNames;
        if (colNames && colNames.length > 0) {
          setCustomColNames(colNames);
          saveCustomColNames(colNames);
        }

        const stampsData = parsed.actualSleepStamps && parsed.actualSleepStamps.length > 0 ? parsed.actualSleepStamps : parsed.stamps;
        if (stampsData && stampsData.length > 0) {
          const uniqueStamps: StampConfig[] = [];
          const seen = new Set<string>();
          stampsData.forEach((s: StampConfig) => {
            if (s && s.id && !seen.has(s.id)) {
              seen.add(s.id);
              uniqueStamps.push(s);
            }
          });
          setStamps(uniqueStamps);
          saveStampsToStorage(uniqueStamps);
          if (uniqueStamps.length > 0) {
            setActiveSymbol(uniqueStamps[0].id);
          }
        }

        if (parsed.hourRep && onHourRepChange) {
          onHourRepChange(parsed.hourRep);
        }

        if (parsed.inputMethod !== undefined) {
          handleSetInputMethod(parsed.inputMethod);
        }

        // Apply mental data if available
        if (parsed.mentalRecords) {
          saveMentalRecordsToStorage(parsed.mentalRecords);
        }
        if (parsed.mentalStamps) {
          saveMentalStampsToStorage(parsed.mentalStamps);
        }
        if (parsed.customMentalColCount !== undefined) {
          saveMentalCustomColCount(parsed.customMentalColCount);
        }
        if (parsed.customMentalColNames) {
          saveMentalCustomColNames(parsed.customMentalColNames);
        }
        if (parsed.mentalRows && Array.isArray(parsed.mentalRows)) {
          saveMentalRowsToStorage(parsed.mentalRows);
        }

        setIsDirty(true);
        showToast('📂 完全JSONバックアップよりすべてのデータと設定を復元しました！');
        return true;
      }
    } catch (e) {
      // Not a JSON string
    }

    return false;
  };

  const handleCellTap = (slotIdx: number, colIdx?: number) => {
    const currentDayRecord = { ...(records[selectedDate] || createBlankRecord()) };
    
    if (colIdx !== undefined) {
      if (!currentDayRecord.customCols) {
        currentDayRecord.customCols = {};
      }
      if (!currentDayRecord.customCols[colIdx]) {
        currentDayRecord.customCols[colIdx] = {};
      }
      const existingVal = currentDayRecord.customCols[colIdx][slotIdx];
      if (existingVal) {
        currentDayRecord.customCols[colIdx][slotIdx] = null;
      } else {
        currentDayRecord.customCols[colIdx][slotIdx] = 'S'; // Active check value
      }
    } else {
      if (activeTool === 'eraser') {
        currentDayRecord[slotIdx] = null;
      } else {
        currentDayRecord[slotIdx] = activeSymbol;
      }
    }

    const updatedRecords = {
      ...records,
      [selectedDate]: currentDayRecord,
    };

    setRecords(updatedRecords);
    saveRecordsToStorage(updatedRecords);
    setIsDirty(true);
  };

  const handleCopyPreviousDay = () => {
    const prevDateStr = shiftDateString(selectedDate, -1);
    const prevRecord = records[prevDateStr];
    
    if (prevRecord) {
      const updatedRecords = {
        ...records,
        [selectedDate]: { ...prevRecord },
      };
      setRecords(updatedRecords);
      saveRecordsToStorage(updatedRecords);
      setIsDirty(true);
      showToast('📋 前日の記録をコピーしました！');
    } else {
      showToast('⚠️ 前日の記録データがありません');
    }
  };

  const handleUpdateMemo = (text: string) => {
    const currentDayRecord = { ...(records[selectedDate] || createBlankRecord()) };
    currentDayRecord.memo = text;

    const updatedRecords = {
      ...records,
      [selectedDate]: currentDayRecord,
    };

    setRecords(updatedRecords);
    saveRecordsToStorage(updatedRecords);
    setIsDirty(true);
  };

  const handleClearToday = () => {
    const updatedRecords = {
      ...records,
      [selectedDate]: createBlankRecord(),
    };
    setRecords(updatedRecords);
    saveRecordsToStorage(updatedRecords);
    setIsDirty(true);
    showToast('🧹 本日の入力内容をクリアしました');
  };

  const handleClearAllRecords = () => {
    setRecords({});
    saveRecordsToStorage({});
    setIsDirty(true);
    showToast('⚠️ すべての記録履歴をリセットしました');
  };

  return {
    selectedDate,
    setSelectedDate,
    records,
    setRecords,
    stamps,
    setStamps,
    activeSymbol,
    setActiveSymbol,
    activeTool,
    setActiveTool,
    isDirty,
    setIsDirty,
    customColCount,
    setCustomColCount,
    customColNames,
    setCustomColNames,
    inputMethod,
    handleSetInputMethod,
    handleStampsChange,
    handleSetCustomColCount,
    handleAddCustomCols,
    handleUpdateColConfig,
    handleSwapCustomCols,
    handleDeleteCustomCol,
    handleImportBackup,
    handleImportCSVRecords,
    handleAnyCSVImportText,
    handleCellTap,
    handleCopyPreviousDay,
    handleUpdateMemo,
    handleClearToday,
    handleClearAllRecords,
  };
}
