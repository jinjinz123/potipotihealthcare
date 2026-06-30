import { useState } from 'react';
import { DailyRecords, ActiveTool, SleepSymbol, StampConfig, MentalRow } from '../types';
import { 
  loadMentalRecordsFromStorage,
  saveMentalRecordsToStorage,
  loadMentalStampsFromStorage,
  saveMentalStampsToStorage,
  loadMentalCustomColCount,
  saveMentalCustomColCount,
  loadMentalCustomColNames,
  saveMentalCustomColNames,
  createBlankRecord,
  shiftDateString,
  loadMentalRowsFromStorage,
  saveMentalRowsToStorage,
  loadMentalCategoriesFromStorage,
  saveMentalCategoriesToStorage
} from '../utils';

export function useMentalRecords(selectedDate: string, showToast: (msg: string) => void) {
  // Independent States
  const [mentalRecords, setMentalRecords] = useState<DailyRecords>(() => loadMentalRecordsFromStorage());
  const [mentalStamps, setMentalStamps] = useState<StampConfig[]>(() => loadMentalStampsFromStorage());
  
  const [activeMentalSymbol, setActiveMentalSymbol] = useState<SleepSymbol>(() => {
    const s = loadMentalStampsFromStorage();
    return s.length > 0 ? s[0].id : '😀';
  });

  const [activeMentalTool, setActiveMentalTool] = useState<ActiveTool>('stamp');
  const [customMentalColCount, setCustomMentalColCount] = useState<number>(() => loadMentalCustomColCount());
  const [customMentalColNames, setCustomMentalColNames] = useState<string[]>(() => loadMentalCustomColNames(loadMentalCustomColCount()));

  // Spreadsheet Mental Mode Rows
  const [mentalRows, setMentalRows] = useState<MentalRow[]>(() => loadMentalRowsFromStorage());
  const [categories, setCategories] = useState<string[]>(() => loadMentalCategoriesFromStorage());

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast(`⚠️ 「${trimmed}」は既に存在します`);
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    saveMentalCategoriesToStorage(updated);
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
    saveMentalCategoriesToStorage(updatedCats);
    showToast(`✨ カテゴリー名を「${oldName}」から「${trimmed}」に変更しました`);
  };

  const handleDeleteCategory = (catName: string) => {
    const updatedCats = categories.filter(c => c !== catName);
    setCategories(updatedCats);
    saveMentalCategoriesToStorage(updatedCats);
    showToast(`🗑️ カテゴリー「${catName}」を削除しました`);
  };

  const handleSwapCategories = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= categories.length || indexB < 0 || indexB >= categories.length) return;
    const updated = [...categories];
    const temp = updated[indexA];
    updated[indexA] = updated[indexB];
    updated[indexB] = temp;
    setCategories(updated);
    saveMentalCategoriesToStorage(updated);
    showToast(`🔄 カテゴリーの並び順を入れ替えました`);
  };

  const handleUpdateMentalRows = (updated: MentalRow[]) => {
    setMentalRows(updated);
    saveMentalRowsToStorage(updated);
  };

  const handleAddMentalRow = (
    name: string, 
    description: string, 
    icon: string, 
    scaleType: 'bipolar' | 'severity' = 'bipolar'
  ) => {
    const id = `custom_${Date.now()}`;
    const newRow: MentalRow = { id, name, description, icon, scaleType };
    const updated = [...mentalRows, newRow];
    handleUpdateMentalRows(updated);
    showToast(`📝 新しい項目「${name}」を追加しました`);
  };

  const handleUpdateMentalRow = (
    rowId: string, 
    updatedName: string, 
    updatedSub: string, 
    updatedIcon: string, 
    customLabels?: { [score: number]: string },
    scaleType: 'bipolar' | 'severity' = 'bipolar'
  ) => {
    const updated = mentalRows.map(r => r.id === rowId ? { 
      ...r, 
      name: updatedName, 
      description: updatedSub, 
      icon: updatedIcon, 
      customLabels, 
      scaleType
    } : r);
    handleUpdateMentalRows(updated);
    showToast(`✨ 項目「${updatedName}」の設定を更新しました`);
  };

  const handleDeleteMentalRow = (rowId: string, destinationRowId?: string) => {
    const oldRow = mentalRows.find(r => r.id === rowId);
    if (!oldRow) return;

    const updated = mentalRows.filter(r => r.id !== rowId);
    handleUpdateMentalRows(updated);

    // Clean up or move record data
    const updatedRecords = { ...mentalRecords };
    Object.keys(updatedRecords).forEach(dateStr => {
      const rec = { ...updatedRecords[dateStr] };
      const sourceVal = rec[rowId as any];
      if (sourceVal !== undefined) {
        if (destinationRowId) {
          // パターン①（移動元のデータで上書きする）
          rec[destinationRowId as any] = sourceVal;
        }
        delete rec[rowId as any];
      }
      updatedRecords[dateStr] = rec;
    });
    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);

    if (destinationRowId) {
      const destRow = mentalRows.find(r => r.id === destinationRowId);
      const destName = destRow ? destRow.name : '別の項目';
      showToast(`🗑️ 項目「${oldRow.name}」を削除し、データを「${destName}」へ移動しました`);
    } else {
      showToast(`🗑️ 項目「${oldRow.name}」を削除しました`);
    }
  };

  const handleMoveMentalRow = (rowId: string, direction: 'up' | 'down') => {
    const index = mentalRows.findIndex(r => r.id === rowId);
    if (index === -1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= mentalRows.length) return;

    const updated = [...mentalRows];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    handleUpdateMentalRows(updated);
  };

  const handleToggleMentalScore = (rowId: string, score: number) => {
    const currentDayRecord = { ...(mentalRecords[selectedDate] || {}) };
    
    if (currentDayRecord[rowId as any] === score) {
      delete currentDayRecord[rowId as any];
    } else {
      currentDayRecord[rowId as any] = score;
    }

    const updatedRecords = {
      ...mentalRecords,
      [selectedDate]: currentDayRecord,
    };

    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);
  };

  const handleMentalStampsChange = (newStamps: StampConfig[]) => {
    const unique: StampConfig[] = [];
    const seen = new Set<string>();
    newStamps.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        seen.add(s.id);
        unique.push(s);
      }
    });
    setMentalStamps(unique);
    saveMentalStampsToStorage(unique);
  };

  const setMentalCustomValuesAndSync = (updatedRecords: DailyRecords, updatedNames: string[], colCount: number) => {
    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);
    
    setCustomMentalColNames(updatedNames);
    saveMentalCustomColNames(updatedNames);
    
    setCustomMentalColCount(colCount);
    saveMentalCustomColCount(colCount);
  };

  const handleSetCustomMentalColCount = (val: number) => {
    setCustomMentalColCount(val);
    saveMentalCustomColCount(val);
    const updatedNames = loadMentalCustomColNames(val);
    setCustomMentalColNames(updatedNames);
    saveMentalCustomColNames(updatedNames);
    showToast(`📊 メンタル記録列を${val}列に設定しました`);
  };

  const handleUpdateMentalColConfig = (
    colIdx: number, 
    newName: string, 
    dataAction: 'keep' | 'clear' | 'archive'
  ) => {
    const oldName = customMentalColNames[colIdx] || `項目${colIdx + 2}`;
    
    let updatedNames = [...customMentalColNames];
    let updatedRecords = { ...mentalRecords };
    let finalColCount = customMentalColCount;
    
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
      const archiveColIdx = customMentalColCount;
      finalColCount = customMentalColCount + 1;
      
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
    
    setMentalCustomValuesAndSync(updatedRecords, updatedNames, finalColCount);
  };

  const handleSwapMentalCustomCols = (colIdxA: number, colIdxB: number) => {
    if (colIdxA < 0 || colIdxA >= customMentalColCount || colIdxB < 0 || colIdxB >= customMentalColCount) {
      return;
    }
    
    const updatedNames = [...customMentalColNames];
    const nameA = updatedNames[colIdxA];
    updatedNames[colIdxA] = updatedNames[colIdxB];
    updatedNames[colIdxB] = nameA;
    
    const updatedRecords = { ...mentalRecords };
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
    
    setMentalCustomValuesAndSync(updatedRecords, updatedNames, customMentalColCount);
    showToast(`🔄 「${updatedNames[colIdxB]}」と「${updatedNames[colIdxA]}」の並びを入れ替えました`);
  };

  const handleDeleteMentalCustomCol = (colIdx: number) => {
    if (colIdx < 0 || colIdx >= customMentalColCount) {
      return;
    }
    const oldName = customMentalColNames[colIdx] || `項目${colIdx + 2}`;
    
    const newColCount = customMentalColCount - 1;
    const updatedNames = [...customMentalColNames];
    updatedNames.splice(colIdx, 1);
    
    const updatedRecords = { ...mentalRecords };
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

    setMentalCustomValuesAndSync(updatedRecords, updatedNames, newColCount);
    showToast(`🗑️ 記録項目「${oldName}」を完全に削除しました（全期間のデータも消去されました）`);
  };

  const handleMentalCellTap = (slotIdx: number, colIdx?: number) => {
    const currentDayRecord = { ...(mentalRecords[selectedDate] || createBlankRecord()) };
    
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
      if (activeMentalTool === 'eraser') {
        currentDayRecord[slotIdx] = null;
      } else {
        currentDayRecord[slotIdx] = activeMentalSymbol;
      }
    }

    const updatedRecords = {
      ...mentalRecords,
      [selectedDate]: currentDayRecord,
    };

    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);
  };

  const handleCopyMentalPreviousDay = () => {
    const prevDateStr = shiftDateString(selectedDate, -1);
    const prevRecord = mentalRecords[prevDateStr];
    
    if (prevRecord) {
      const updatedRecords = {
        ...mentalRecords,
        [selectedDate]: { ...prevRecord },
      };
      setMentalRecords(updatedRecords);
      saveMentalRecordsToStorage(updatedRecords);
      showToast('📋 前日のメンタル記録をコピーしました！');
    } else {
      showToast('⚠️ 前日の記録データがありません');
    }
  };

  const handleUpdateMentalMemo = (text: string) => {
    const currentDayRecord = { ...(mentalRecords[selectedDate] || createBlankRecord()) };
    currentDayRecord.memo = text;

    const updatedRecords = {
      ...mentalRecords,
      [selectedDate]: currentDayRecord,
    };

    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);
  };

  const handleClearMentalToday = () => {
    const updatedRecords = {
      ...mentalRecords,
      [selectedDate]: createBlankRecord(),
    };
    setMentalRecords(updatedRecords);
    saveMentalRecordsToStorage(updatedRecords);
    showToast('🧹 本日の入力内容をクリアしました');
  };

  const handleClearAllMentalRecords = () => {
    setMentalRecords({});
    saveMentalRecordsToStorage({});
    showToast('⚠️ すべてのメンタル記録履歴をリセットしました');
  };

  const handleImportMentalBackup = (backup: {
    mentalRecords?: DailyRecords;
    mentalStamps?: StampConfig[];
    customMentalColCount?: number;
    customMentalColNames?: string[];
    mentalRows?: MentalRow[];
  }) => {
    if (backup.mentalRecords) {
      setMentalRecords(backup.mentalRecords);
      saveMentalRecordsToStorage(backup.mentalRecords);
    }
    if (backup.mentalStamps && backup.mentalStamps.length > 0) {
      const uniqueStamps: StampConfig[] = [];
      const seen = new Set<string>();
      backup.mentalStamps.forEach(s => {
        if (s && s.id && !seen.has(s.id)) {
          seen.add(s.id);
          uniqueStamps.push(s);
        }
      });
      setMentalStamps(uniqueStamps);
      saveMentalStampsToStorage(uniqueStamps);
      if (uniqueStamps.length > 0) {
        setActiveMentalSymbol(uniqueStamps[0].id);
      }
    }
    if (backup.customMentalColCount !== undefined) {
      setCustomMentalColCount(backup.customMentalColCount);
      saveMentalCustomColCount(backup.customMentalColCount);
    }
    if (backup.customMentalColNames && backup.customMentalColNames.length > 0) {
      setCustomMentalColNames(backup.customMentalColNames);
      saveMentalCustomColNames(backup.customMentalColNames);
    }
    if (backup.mentalRows && Array.isArray(backup.mentalRows) && backup.mentalRows.length > 0) {
      setMentalRows(backup.mentalRows);
      saveMentalRowsToStorage(backup.mentalRows);
    }
  };

  return {
    mentalRecords,
    setMentalRecords,
    mentalStamps,
    setMentalStamps,
    activeMentalSymbol,
    setActiveMentalSymbol,
    activeMentalTool,
    setActiveMentalTool,
    customMentalColCount,
    setCustomMentalColCount,
    customMentalColNames,
    setCustomMentalColNames,
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
    // Spreadsheet items rows
    mentalRows,
    setMentalRows,
    handleAddMentalRow,
    handleUpdateMentalRow,
    handleDeleteMentalRow,
    handleMoveMentalRow,
    handleToggleMentalScore,
    // Mental categories
    mentalCategories: categories,
    handleAddMentalCategory: handleAddCategory,
    handleRenameMentalCategory: handleRenameCategory,
    handleDeleteMentalCategory: handleDeleteCategory,
    handleSwapMentalCategories: handleSwapCategories,
  };
}
