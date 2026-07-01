import { useState } from 'react';
import { DailyRecords, ActiveTool, SleepSymbol, StampConfig } from '../types';
import { 
  getLocalDateString,
  loadRecordsFromStorage, 
  saveRecordsToStorage,
  loadStampsFromStorage,
  saveStampsToStorage,
  loadCustomColCount,
  saveCustomColCount,
  loadCustomColNames,
  saveCustomColNames,
  createBlankRecord,
  shiftDateString,
  saveMentalRecordsToStorage,
  saveMentalStampsToStorage,
  saveMentalCustomColCount,
  saveMentalCustomColNames,
  saveMentalRowsToStorage,
  DEFAULT_CATEGORY_STAMPS,
  loadCustomColCategories,
  saveCustomColCategories,
  loadActivityCategoriesFromStorage,
  saveActivityCategoriesToStorage,
  saveActualSleepRecordsToStorage,
  saveActualSleepStampsToStorage,
  saveActualSleepCustomColCount,
  saveActualSleepCustomColNames
} from '../utils';
// Backup imports are exclusively handled via JSON (JOIN) files

export function useSleepRecords(showToast: (msg: string) => void) {
  // Main states
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(new Date()));
  const [records, setRecords] = useState<DailyRecords>(() => loadRecordsFromStorage());
  
  const [stamps, setStamps] = useState<StampConfig[]>(() => loadStampsFromStorage());
  const [activeSymbol, setActiveSymbol] = useState<SleepSymbol>(() => {
    const s = loadStampsFromStorage();
    return s.length > 0 ? s[0].id : 'S';
  });

  const [activeTool, setActiveTool] = useState<ActiveTool>('stamp');
  const [inputMethod, setInputMethod] = useState<'stamp' | 'paint'>('stamp');
  const [isDirty, setIsDirty] = useState(false);

  const handleSetInputMethod = (val: 'stamp' | 'paint') => {
    setInputMethod('stamp');
  };

  const [customColCount, setCustomColCount] = useState<number>(() => loadCustomColCount());
  const [customColNames, setCustomColNames] = useState<string[]>(() => loadCustomColNames(loadCustomColCount()));
  const [customColCategories, setCustomColCategories] = useState<string[]>(() => loadCustomColCategories(loadCustomColCount()));
  const [categories, setCategories] = useState<string[]>(() => loadActivityCategoriesFromStorage());

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast(`⚠️ 「${trimmed}」は既に存在します`);
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    saveActivityCategoriesToStorage(updated);
    showToast(`✨ カテゴリー「${trimmed}」を追加しました`);
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast(`⚠️ 「${trimmed}」は既に存在します`);
      return;
    }
    const updatedCats = categories.map(c => c === oldName ? trimmed : c);
    setCategories(updatedCats);
    saveActivityCategoriesToStorage(updatedCats);

    const updatedColCats = customColCategories.map(cat => cat === oldName ? trimmed : cat);
    setCustomColCategories(updatedColCats);
    saveCustomColCategories(updatedColCats);
    showToast(`✨ カテゴリー名を「${oldName}」から「${trimmed}」に変更しました`);
  };

  const handleDeleteCategory = (catName: string) => {
    const updatedCats = categories.filter(c => c !== catName);
    setCategories(updatedCats);
    saveActivityCategoriesToStorage(updatedCats);

    const updatedColCats = customColCategories.map(cat => cat === catName ? 'その他' : cat);
    setCustomColCategories(updatedColCats);
    saveCustomColCategories(updatedColCats);
    showToast(`🗑️ カテゴリー「${catName}」を削除しました。該当項目のカテゴリーは「その他」に変更されました。`);
  };

  const handleSwapCategories = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= categories.length || indexB < 0 || indexB >= categories.length) return;
    const updated = [...categories];
    const temp = updated[indexA];
    updated[indexA] = updated[indexB];
    updated[indexB] = temp;
    setCategories(updated);
    saveActivityCategoriesToStorage(updated);
    showToast(`🔄 カテゴリーの並び順を入れ替えました`);
  };

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
    setIsDirty(true);
  };

  const setCustomValuesAndSync = (
    updatedRecords: DailyRecords, 
    updatedNames: string[], 
    colCount: number,
    updatedCategories?: string[]
  ) => {
    setRecords(updatedRecords);
    saveRecordsToStorage(updatedRecords);
    
    setCustomColNames(updatedNames);
    saveCustomColNames(updatedNames);
    
    setCustomColCount(colCount);
    saveCustomColCount(colCount);

    const finalCats = updatedCategories || loadCustomColCategories(colCount);
    setCustomColCategories(finalCats);
    saveCustomColCategories(finalCats);
    
    setIsDirty(true);
  };

  const handleSetCustomColCount = (val: number) => {
    setCustomColCount(val);
    saveCustomColCount(val);
    const updatedNames = loadCustomColNames(val);
    setCustomColNames(updatedNames);
    saveCustomColNames(updatedNames);

    const updatedCategories = loadCustomColCategories(val);
    setCustomColCategories(updatedCategories);
    saveCustomColCategories(updatedCategories);
    
    showToast(`📊 活動記録列を${val}列に設定しました`);
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

    const updatedCategories = [...customColCategories];
    for (let i = customColCategories.length; i < nextColCount; i++) {
      updatedCategories.push('その他');
    }
    setCustomColCategories(updatedCategories);
    saveCustomColCategories(updatedCategories);

    showToast(`➕ 新しく${count}列の記録項目を追加しました`);
  };

  const handleUpdateColConfig = (
    colIdx: number, 
    newName: string, 
    dataAction: 'keep' | 'clear' | 'archive',
    category: string = 'その他'
  ) => {
    const oldName = customColNames[colIdx] || `列${colIdx + 2}`;
    
    let updatedNames = [...customColNames];
    let updatedRecords = { ...records };
    let finalColCount = customColCount;
    let updatedCategories = [...customColCategories];
    
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
      updatedCategories[colIdx] = category;
      showToast(`項目名を「${newName}」に変更し、過去の記録を消去しました`);
    } else if (dataAction === 'archive') {
      const archiveColIdx = customColCount;
      finalColCount = customColCount + 1;
      
      updatedNames.push(oldName);
      updatedNames[colIdx] = newName;

      updatedCategories.push(customColCategories[colIdx] || 'その他');
      updatedCategories[colIdx] = category;
      
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
      updatedCategories[colIdx] = category;
      showToast(`項目名を「${newName}」に変更しました（データは引き継がれます）`);
    }
    
    setCustomValuesAndSync(updatedRecords, updatedNames, finalColCount, updatedCategories);
  };

  const handleSwapCustomCols = (colIdxA: number, colIdxB: number) => {
    if (colIdxA < 0 || colIdxA >= customColCount || colIdxB < 0 || colIdxB >= customColCount) {
      return;
    }
    
    const updatedNames = [...customColNames];
    const nameA = updatedNames[colIdxA];
    updatedNames[colIdxA] = updatedNames[colIdxB];
    updatedNames[colIdxB] = nameA;

    const updatedCategories = [...customColCategories];
    const catA = updatedCategories[colIdxA];
    updatedCategories[colIdxA] = updatedCategories[colIdxB];
    updatedCategories[colIdxB] = catA;
    
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
    
    setCustomValuesAndSync(updatedRecords, updatedNames, customColCount, updatedCategories);
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

    const updatedCategories = [...customColCategories];
    updatedCategories.splice(colIdx, 1);
    
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

    setCustomValuesAndSync(updatedRecords, updatedNames, newColCount, updatedCategories);
    showToast(`🗑️ 記録項目「${oldName}」を完全に削除しました（全期間のデータも消去されました）`);
  };

  const handleImportBackup = (backup: {
    records: DailyRecords;
    hourRep: '1-24' | '0-23';
    customColCount: number;
    customColNames: string[];
    stamps: StampConfig[];
    inputMethod?: 'stamp' | 'paint';
    customColCategories?: string[];
    activityCategories?: string[];
  }) => {
    setRecords(backup.records);
    saveRecordsToStorage(backup.records);

    const uniqueStamps: StampConfig[] = [];
    const seen = new Set<string>();
    (backup.stamps || []).forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        uniqueStamps.push(s);
      }
    });

    const finalStamps = uniqueStamps.length > 0 ? uniqueStamps : DEFAULT_CATEGORY_STAMPS;

    setStamps(finalStamps);
    saveStampsToStorage(finalStamps);

    const finalNames = backup.customColNames || finalStamps.map(s => s.name);
    setCustomColNames(finalNames);
    saveCustomColNames(finalNames);

    const finalCount = backup.customColCount !== undefined ? backup.customColCount : finalStamps.length;
    setCustomColCount(finalCount);
    saveCustomColCount(finalCount);

    if (backup.customColCategories && Array.isArray(backup.customColCategories)) {
      setCustomColCategories(backup.customColCategories);
      saveCustomColCategories(backup.customColCategories);
    } else {
      const defaultCats = loadCustomColCategories(finalCount);
      setCustomColCategories(defaultCats);
      saveCustomColCategories(defaultCats);
    }

    if (backup.activityCategories && Array.isArray(backup.activityCategories)) {
      setCategories(backup.activityCategories);
      saveActivityCategoriesToStorage(backup.activityCategories);
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
      if (parsed && typeof parsed === 'object' && parsed.records) {
        setRecords(parsed.records);
        saveRecordsToStorage(parsed.records);

        if (parsed.customColCount !== undefined) {
          setCustomColCount(parsed.customColCount);
          saveCustomColCount(parsed.customColCount);
        }

        if (parsed.customColNames && parsed.customColNames.length > 0) {
          setCustomColNames(parsed.customColNames);
          saveCustomColNames(parsed.customColNames);
        }

        if (parsed.stamps && parsed.stamps.length > 0) {
          const uniqueStamps: StampConfig[] = [];
          const seen = new Set<string>();
          parsed.stamps.forEach((s: StampConfig) => {
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

        if (parsed.customColCategories && Array.isArray(parsed.customColCategories)) {
          setCustomColCategories(parsed.customColCategories);
          saveCustomColCategories(parsed.customColCategories);
        } else {
          const finalCount = parsed.customColCount !== undefined ? parsed.customColCount : (parsed.stamps ? parsed.stamps.length : 1);
          const defaultCats = loadCustomColCategories(finalCount);
          setCustomColCategories(defaultCats);
          saveCustomColCategories(defaultCats);
        }

        if (parsed.activityCategories && Array.isArray(parsed.activityCategories)) {
          setCategories(parsed.activityCategories);
          saveActivityCategoriesToStorage(parsed.activityCategories);
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

        // Apply actual sleep data if available
        if (parsed.actualSleepRecords) {
          saveActualSleepRecordsToStorage(parsed.actualSleepRecords);
        }
        if (parsed.actualSleepStamps) {
          saveActualSleepStampsToStorage(parsed.actualSleepStamps);
        }
        if (parsed.customActualSleepColCount !== undefined) {
          saveActualSleepCustomColCount(parsed.customActualSleepColCount);
        }
        if (parsed.customActualSleepColNames) {
          saveActualSleepCustomColNames(parsed.customActualSleepColNames);
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
      
      const baseIdx = slotIdx * 2;
      const idx1 = baseIdx;
      const idx2 = baseIdx + 1;
      
      const existingVal1 = currentDayRecord.customCols[colIdx][idx1];
      const existingVal2 = currentDayRecord.customCols[colIdx][idx2];
      
      if (existingVal1 || existingVal2) {
        currentDayRecord.customCols[colIdx][idx1] = null;
        currentDayRecord.customCols[colIdx][idx2] = null;
      } else {
        currentDayRecord.customCols[colIdx][idx1] = 'S'; // Active check value
        currentDayRecord.customCols[colIdx][idx2] = 'S'; // Active check value
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
    customColCategories,
    categories,
    handleAddCategory,
    handleRenameCategory,
    handleDeleteCategory,
    handleSwapCategories,
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
