import { DailyRecords, StampConfig, MentalRow } from '../types';
import { 
  loadRecordsFromStorage, 
  saveRecordsToStorage,
  loadHourRep,
  saveHourRep,
  loadCustomColCount,
  saveCustomColCount,
  loadCustomColNames,
  saveCustomColNames,
  loadStampsFromStorage,
  saveStampsToStorage,
  loadMentalRecordsFromStorage,
  saveMentalRecordsToStorage,
  loadMentalStampsFromStorage,
  saveMentalStampsToStorage,
  loadMentalCustomColCount,
  saveMentalCustomColCount,
  loadMentalCustomColNames,
  saveMentalCustomColNames,
  loadMentalRowsFromStorage,
  saveMentalRowsToStorage,
  loadActualSleepRecordsFromStorage,
  saveActualSleepRecordsToStorage,
  loadActualSleepStampsFromStorage,
  saveActualSleepStampsToStorage,
  loadActualSleepCustomColCount,
  saveActualSleepCustomColCount,
  loadActualSleepCustomColNames,
  saveActualSleepCustomColNames,
  loadCustomColCategories,
  saveCustomColCategories,
  loadActivityCategoriesFromStorage,
  saveActivityCategoriesToStorage
} from '../utils';

export interface BackupData {
  version: number;
  records: DailyRecords;
  hourRep: '1-24' | '0-23';
  customColCount: number;
  customColNames: string[];
  stamps: StampConfig[];
  customColCategories?: string[];
  activityCategories?: string[];
  lastBackupAt?: string; // YYYY/MM/DD HH:mm
  mentalRecords?: DailyRecords;
  mentalStamps?: StampConfig[];
  customMentalColCount?: number;
  customMentalColNames?: string[];
  mentalRows?: MentalRow[];
  actualSleepRecords?: DailyRecords;
  actualSleepStamps?: StampConfig[];
  customActualSleepColCount?: number;
  customActualSleepColNames?: string[];
}

const LAST_BACKUP_TIME_KEY = 'sleep_app_last_backup_at';

/**
 * Format date to YYYY/MM/DD HH:mm
 */
export function formatBackupAt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${h}:${min}`;
}

/**
 * Get the last backup time from localStorage
 */
export function getLastBackupTime(): string {
  return localStorage.getItem(LAST_BACKUP_TIME_KEY) || '－';
}

/**
 * Save the last backup time to localStorage
 */
export function saveLastBackupTime(timeStr: string): void {
  localStorage.setItem(LAST_BACKUP_TIME_KEY, timeStr);
}

/**
 * Create a fresh BackupData object from current local states
 */
export function generateBackupData(): BackupData {
  const records = loadRecordsFromStorage();
  const hourRep = loadHourRep();
  const customColCount = loadCustomColCount();
  const customColNames = loadCustomColNames(customColCount);
  const stamps = loadStampsFromStorage();
  
  const customColCategories = loadCustomColCategories(customColCount);
  const activityCategories = loadActivityCategoriesFromStorage();

  // Load mental data for backup
  const mentalRecords = loadMentalRecordsFromStorage();
  const mentalStamps = loadMentalStampsFromStorage();
  const customMentalColCount = loadMentalCustomColCount();
  const customMentalColNames = loadMentalCustomColNames(customMentalColCount);
  const mentalRows = loadMentalRowsFromStorage();

  // Load actual sleep data for backup
  const actualSleepRecords = loadActualSleepRecordsFromStorage();
  const actualSleepStamps = loadActualSleepStampsFromStorage();
  const customActualSleepColCount = loadActualSleepCustomColCount();
  const customActualSleepColNames = loadActualSleepCustomColNames(customActualSleepColCount);
  
  const lastBackupAt = formatBackupAt(new Date());

  return {
    version: 1,
    records,
    hourRep,
    customColCount,
    customColNames,
    stamps,
    customColCategories,
    activityCategories,
    mentalRecords,
    mentalStamps,
    customMentalColCount,
    customMentalColNames,
    mentalRows,
    actualSleepRecords,
    actualSleepStamps,
    customActualSleepColCount,
    customActualSleepColNames,
    lastBackupAt
  };
}

/**
 * Execute save/export backup action.
 * Leverages Web Share API for mobile/Android where available, or triggers direct local browser download.
 */
export async function executeExportBackup(customFileName: string = '睡眠記録_バックアップ.json'): Promise<string> {
  const backup = generateBackupData();
  const jsonText = JSON.stringify(backup, null, 2);
  const nowStr = backup.lastBackupAt || formatBackupAt(new Date());
  
  const blob = new Blob([jsonText], { type: 'application/json' });
  const fileName = customFileName;

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '睡眠・体調記録バックアップ',
          text: '睡眠・体調記録アプリのバックアップデータです。'
        });
        saveLastBackupTime(nowStr);
        return nowStr;
      }
    } catch (shareErr) {
      if (shareErr instanceof Error && shareErr.name === 'AbortError') {
        throw new Error('USER_CANCELLED');
      }
      console.warn('Web Share API failed, falling back to download:', shareErr);
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

  saveLastBackupTime(nowStr);
  return nowStr;
}

/**
 * Validates the loaded file and returns parse result if valid, else throws Error with user-friendly messages.
 */
export function parseAndValidateBackup(jsonText: string): BackupData {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('コピーしたデータの形式が不正であるか、ファイルが破損しています。正しいJSON形式ではありません。');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('バックアップデータの内容が空であるか、オブジェクト形式ではありません。');
  }

  if (parsed.version === undefined) {
    throw new Error('バックアップデータのバージョン情報が見つかりません。非対応のファイルです。');
  }

  if (typeof parsed.version !== 'number' || parsed.version < 1) {
    throw new Error(`非対応のバージョン (${parsed.version}) のデータです。`);
  }

  if (!parsed.records || typeof parsed.records !== 'object') {
    throw new Error('睡眠記録データ（records）が含まれていないか、不完全な形式です。');
  }

  return parsed as BackupData;
}

/**
 * Apply valid BackupData into the local application state and storage
 */
export function applyBackupData(
  backup: BackupData,
  onStateUpdate: (data: {
    records: DailyRecords;
    hourRep: '1-24' | '0-23';
    customColCount: number;
    customColNames: string[];
    stamps: StampConfig[];
    customColCategories?: string[];
    activityCategories?: string[];
    mentalRecords?: DailyRecords;
    mentalStamps?: StampConfig[];
    customMentalColCount?: number;
    customMentalColNames?: string[];
    mentalRows?: MentalRow[];
    actualSleepRecords?: DailyRecords;
    actualSleepStamps?: StampConfig[];
    customActualSleepColCount?: number;
    customActualSleepColNames?: string[];
  }) => void
): void {
  saveRecordsToStorage(backup.records);
  saveHourRep(backup.hourRep);
  saveCustomColCount(backup.customColCount);
  saveCustomColNames(backup.customColNames);
  if (backup.stamps && Array.isArray(backup.stamps)) {
    saveStampsToStorage(backup.stamps);
  }
  if (backup.customColCategories && Array.isArray(backup.customColCategories)) {
    saveCustomColCategories(backup.customColCategories);
  }
  if (backup.activityCategories && Array.isArray(backup.activityCategories)) {
    saveActivityCategoriesToStorage(backup.activityCategories);
  }

  // Restore mental data if present in backup
  if (backup.mentalRecords) {
    saveMentalRecordsToStorage(backup.mentalRecords);
  }
  if (backup.mentalStamps && Array.isArray(backup.mentalStamps)) {
    saveMentalStampsToStorage(backup.mentalStamps);
  }
  if (backup.customMentalColCount !== undefined) {
    saveMentalCustomColCount(backup.customMentalColCount);
  }
  if (backup.customMentalColNames && Array.isArray(backup.customMentalColNames)) {
    saveMentalCustomColNames(backup.customMentalColNames);
  }
  if (backup.mentalRows && Array.isArray(backup.mentalRows)) {
    saveMentalRowsToStorage(backup.mentalRows);
  }

  // Restore actual sleep data if present in backup, otherwise fallback to records/stamps for old backups
  if (backup.actualSleepRecords) {
    saveActualSleepRecordsToStorage(backup.actualSleepRecords);
  } else if (backup.records) {
    saveActualSleepRecordsToStorage(backup.records);
  }

  if (backup.actualSleepStamps && Array.isArray(backup.actualSleepStamps)) {
    saveActualSleepStampsToStorage(backup.actualSleepStamps);
  } else if (backup.stamps && Array.isArray(backup.stamps)) {
    saveActualSleepStampsToStorage(backup.stamps);
  }

  if (backup.customActualSleepColCount !== undefined) {
    saveActualSleepCustomColCount(backup.customActualSleepColCount);
  } else if (backup.customColCount !== undefined) {
    saveActualSleepCustomColCount(backup.customColCount);
  }

  if (backup.customActualSleepColNames && Array.isArray(backup.customActualSleepColNames)) {
    saveActualSleepCustomColNames(backup.customActualSleepColNames);
  } else if (backup.customColNames && Array.isArray(backup.customColNames)) {
    saveActualSleepCustomColNames(backup.customColNames);
  }

  if (backup.lastBackupAt) {
    saveLastBackupTime(backup.lastBackupAt);
  }

  onStateUpdate({
    records: backup.records,
    hourRep: backup.hourRep,
    customColCount: backup.customColCount,
    customColNames: backup.customColNames,
    stamps: backup.stamps || [],
    customColCategories: backup.customColCategories,
    activityCategories: backup.activityCategories,
    mentalRecords: backup.mentalRecords,
    mentalStamps: backup.mentalStamps,
    customMentalColCount: backup.customMentalColCount,
    customMentalColNames: backup.customMentalColNames,
    mentalRows: backup.mentalRows,
    actualSleepRecords: backup.actualSleepRecords || backup.records,
    actualSleepStamps: (backup.actualSleepStamps && backup.actualSleepStamps.length > 0) ? backup.actualSleepStamps : backup.stamps,
    customActualSleepColCount: backup.customActualSleepColCount !== undefined ? backup.customActualSleepColCount : backup.customColCount,
    customActualSleepColNames: (backup.customActualSleepColNames && backup.customActualSleepColNames.length > 0) ? backup.customActualSleepColNames : backup.customColNames
  });
}
