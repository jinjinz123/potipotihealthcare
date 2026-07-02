import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  HelpCircle, 
  Clock, 
  Download,
  Smartphone,
  CheckCircle2,
  Info,
  Upload,
  Copy,
  AlertCircle,
  Cloud,
  RefreshCw,
  LogOut,
  Lock,
  Save,
  Check,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { DailyRecords, StampConfig, MentalRow } from '../types';
import { shiftDateString, createBlankRecord, getEffectiveSymbol } from '../utils';
import { 
  CSVExportModal, 
  CSVImportModal, 
  GoogleDriveBackupsModal,
} from './SidebarModals';
import {
  googleSignIn,
  logoutGoogle,
  initAuthListener,
  listBackupFiles,
  downloadBackupFile,
  uploadBackupFile,
  getOrAcquireToken,
  getJSTReadableTime,
  DriveBackupFile,
  BackupDataPayload,
  isFirebaseConfigured
} from '../services/googleDriveService';
import { User } from 'firebase/auth';
import { exportAllToJSONFile } from '../services/jsonService';

interface OtherSettingsProps {
  selectedDate: string;
  records: DailyRecords;
  hourRep: '1-24' | '0-23';
  setHourRep: (val: '1-24' | '0-23') => void;
  onClearAllRecords: () => void;
  deferredPrompt: any;
  onInstall: () => void;
  isInstalled: boolean;
  onImportCSV: (records: DailyRecords) => void;
  onAnyCSVImport: (csvText: string, onHourRepChange?: (val: '1-24' | '0-23') => void) => boolean;
  showToast: (msg: string) => void;
  customColCount: number;
  customColNames: string[];
  setCustomColCount: (count: number) => void;
  stamps: StampConfig[];
  onImportBackup: (backup: any) => void;
  inputMethod: 'stamp' | 'paint';
  mentalRecords?: DailyRecords;
  mentalStamps?: StampConfig[];
  customMentalColCount?: number;
  customMentalColNames?: string[];
  mentalRows?: MentalRow[];
  onSave?: () => void;
  displayMode: 'vivid' | 'soft' | 'dark';
  onDisplayModeChange: (mode: 'vivid' | 'soft' | 'dark') => void;
  actualSleepRecords?: DailyRecords;
  actualSleepStamps?: StampConfig[];
  customActualSleepColCount?: number;
  customActualSleepColNames?: string[];
  onImportActualSleepBackup?: (backup: any) => void;
  customColCategories?: string[];
  activityCategories?: string[];
  chartScaleFactor?: number;
  onChartScaleFactorChange?: (scale: number) => void;
}

export default function OtherSettings({
  selectedDate,
  records,
  hourRep,
  setHourRep,
  onClearAllRecords,
  deferredPrompt,
  onInstall,
  isInstalled,
  onImportCSV,
  onAnyCSVImport,
  showToast,
  customColCount,
  customColNames,
  setCustomColCount,
  stamps,
  onImportBackup,
  inputMethod,
  mentalRecords = {},
  mentalStamps = [],
  customMentalColCount = 1,
  customMentalColNames = [],
  mentalRows = [],
  onSave,
  displayMode,
  onDisplayModeChange,
  actualSleepRecords = {},
  actualSleepStamps = [],
  customActualSleepColCount = 1,
  customActualSleepColNames = [],
  onImportActualSleepBackup,
  customColCategories = [],
  activityCategories = [],
  chartScaleFactor = 0.6,
  onChartScaleFactorChange
}: OtherSettingsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedCSV, setPastedCSV] = useState('');

  // Clipboard transfer states
  const [showClipboardOverwriteModal, setShowClipboardOverwriteModal] = useState(false);
  const [showClipboardPasteModal, setShowClipboardPasteModal] = useState(false);
  const [manualPasteText, setManualPasteText] = useState('');
  const [pendingClipboardData, setPendingClipboardData] = useState<any>(null);

  // Manage last backups using localStorage
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('last_csv_backup_time') || '未バックアップ';
  });

  const [settingsAlert, setSettingsAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const triggerSettingsAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setSettingsAlert({ type, message });
    showToast(message);
    if (type !== 'error') {
      setTimeout(() => {
        setSettingsAlert(prev => prev?.message === message ? null : prev);
      }, 8000);
    }
  };

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Google Drive states
  const [gdriveUser, setGdriveUser] = useState<User | null>(null);
  const [isGDriveLoading, setIsGDriveLoading] = useState(false);
  const [lastGDriveSyncTime, setLastGDriveSyncTime] = useState<string>(() => {
    return localStorage.getItem('last_google_drive_sync_time') || '未同期';
  });
  const [isGDriveModalOpen, setIsGDriveModalOpen] = useState(false);
  const [gdriveBackups, setGdriveBackups] = useState<DriveBackupFile[]>([]);
  const [isFetchingBackups, setIsFetchingBackups] = useState(false);
  
  // Custom dialog state for "Latest backup confirm"
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);
  const [pendingBackups, setPendingBackups] = useState<DriveBackupFile[]>([]);

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = initAuthListener(
      (user, token) => {
        setGdriveUser(user);
      },
      () => {
        setGdriveUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGDriveLogin = async () => {
    setIsGDriveLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGdriveUser(res.user);
        triggerSettingsAlert('success', `☁ Googleアカウント ${res.user.displayName || ''} でサインインしました。`);
      }
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `Google認証に失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };

  const handleGDriveLogout = async () => {
    setIsGDriveLoading(true);
    try {
      await logoutGoogle();
      setGdriveUser(null);
      triggerSettingsAlert('info', 'Googleドライブとの連携を解除し、サインアウトしました。');
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `Googleサインアウトに失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };

  const handleGDriveBackup = async () => {
    setIsGDriveLoading(true);
    try {
      const token = await getOrAcquireToken();
      
      const payload: BackupDataPayload = {
        records,
        hourRep,
        customColCount,
        customColNames,
        stamps,
        customColCategories,
        activityCategories,
        inputMethod,
        mentalRecords,
        mentalStamps,
        customMentalColCount,
        customMentalColNames,
        mentalRows,
        actualSleepRecords,
        actualSleepStamps,
        customActualSleepColCount,
        customActualSleepColNames,
        lastBackupAt: new Date().toISOString()
      };

      const fileName = await uploadBackupFile(token, payload);
      
      // Save last sync time
      const timeStr = getJSTReadableTime();
      setLastGDriveSyncTime(timeStr);
      localStorage.setItem('last_google_drive_sync_time', timeStr);
      
      triggerSettingsAlert('success', `☁ Googleドライブに正常にバックアップしました: ${fileName}`);
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `Googleドライブへのバックアップに失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };

  const handleGDriveRestoreInitiate = async () => {
    setIsGDriveLoading(true);
    setIsFetchingBackups(true);
    try {
      const token = await getOrAcquireToken();
      const files = await listBackupFiles(token);
      setGdriveBackups(files);
      setPendingBackups(files);

      if (files.length === 0) {
        triggerSettingsAlert('info', 'Googleドライブ内にバックアップファイルが見つかりません。');
        return;
      }

      // Check with the user about restoring from the latest backup or custom choose
      setShowConfirmRestoreModal(true);
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `バックアップ情報の取得に失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
      setIsFetchingBackups(false);
    }
  };

  const handleGDriveRestoreConfirmYes = async () => {
    setShowConfirmRestoreModal(false);
    if (pendingBackups.length === 0) return;
    
    const latestFile = pendingBackups[0];
    await handleSelectBackup(latestFile.id, latestFile.name);
  };

  const handleGDriveRestoreConfirmNo = () => {
    setShowConfirmRestoreModal(false);
    setIsGDriveModalOpen(true);
  };

  const handleSelectBackup = async (fileId: string, fileName: string) => {
    setIsGDriveModalOpen(false);
    setIsGDriveLoading(true);
    try {
      const token = await getOrAcquireToken();
      const payload = await downloadBackupFile(token, fileId);
      
      // Perform restoration logic
      onImportBackup({
        records: payload.records,
        hourRep: payload.hourRep,
        customColCount: payload.customColCount,
        customColNames: payload.customColNames,
        stamps: payload.stamps,
        inputMethod: payload.inputMethod,
        mentalRecords: payload.mentalRecords,
        mentalStamps: payload.mentalStamps,
        customMentalColCount: payload.customMentalColCount,
        customMentalColNames: payload.customMentalColNames,
        mentalRows: payload.mentalRows,
        actualSleepRecords: payload.actualSleepRecords,
        actualSleepStamps: payload.actualSleepStamps,
        customActualSleepColCount: payload.customActualSleepColCount,
        customActualSleepColNames: payload.customActualSleepColNames,
        customColCategories: payload.customColCategories,
        activityCategories: payload.activityCategories
      });

      // Update hour representation if present in backup configuration
      if (payload.hourRep) {
        setHourRep(payload.hourRep);
      }

      // Update last sync time
      const timeStr = getJSTReadableTime();
      setLastGDriveSyncTime(timeStr);
      localStorage.setItem('last_google_drive_sync_time', timeStr);

      // Verify that CSV backup time matches
      localStorage.setItem('last_csv_backup_time', timeStr);
      setLastBackupTime(timeStr);

      triggerSettingsAlert('success', `☁ Googleドライブからデータを復元しました。前回のアプリ状態が完全再現されました！`);
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `データの読み込み・復元に失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };

  const handleSaveJSONBackup = async () => {
    try {
      const updatedTime = await exportAllToJSONFile(
        records,
        stamps,
        hourRep,
        customColNames,
        customColCount,
        inputMethod,
        mentalRecords,
        mentalStamps,
        customMentalColCount,
        customMentalColNames,
        mentalRows,
        actualSleepRecords,
        actualSleepStamps,
        customActualSleepColCount,
        customActualSleepColNames,
        customColCategories,
        activityCategories
      );
      setLastBackupTime(updatedTime);
      localStorage.setItem('last_csv_backup_time', updatedTime);
      triggerSettingsAlert('success', '💾 アプリ全設定・全睡眠記録を完全JSONバックアップ保存しました！');
    } catch (err: any) {
      if (err.message === 'USER_CANCELLED') {
        return;
      }
      console.error(err);
      triggerSettingsAlert('error', '⚠️ 完全JSONバックアップの保存に失敗しました。');
    }
  };

  const [isConverting, setIsConverting] = useState(false);
  const oldBackupInputRef = useRef<HTMLInputElement>(null);

  const handleOldBackupConvert = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsConverting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            const oldRecords = parsed.records;
            const oldStamps = parsed.stamps;
            const oldColCount = parsed.customColCount;
            const oldColNames = parsed.customColNames;

            if (!oldRecords) {
              triggerSettingsAlert('error', '⚠️ 選択されたファイルに睡眠記録データ(records)が見つかりません。正しい旧バックアップファイルかご確認ください。');
              setIsConverting(false);
              return;
            }

            const convertedBackup = {
              actualSleepRecords: oldRecords,
              actualSleepStamps: oldStamps,
              customActualSleepColCount: oldColCount,
              customActualSleepColNames: oldColNames,
            };

            if (onImportActualSleepBackup) {
              onImportActualSleepBackup(convertedBackup);
            }

            const updatedTime = await exportAllToJSONFile(
              records,
              stamps,
              hourRep,
              customColNames,
              customColCount,
              inputMethod,
              mentalRecords,
              mentalStamps,
              customMentalColCount,
              customMentalColNames,
              mentalRows,
              oldRecords,
              oldStamps,
              oldColCount,
              oldColNames
            );

            setLastBackupTime(updatedTime);
            localStorage.setItem('last_csv_backup_time', updatedTime);

            triggerSettingsAlert('success', '♻️ 旧バックアップから「睡眠タブ」へのデータ移行・コンバートが成功しました！新しい形式の統合バックアップをダウンロードしました。');
            if (onSave) {
              onSave();
            }
          } else {
            triggerSettingsAlert('error', '⚠️ 正しいJSONファイル形式ではありません。');
          }
        } catch (err: any) {
          console.error(err);
          triggerSettingsAlert('error', `⚠️ コンバート中にエラーが発生しました: ${err.message || err}`);
        }
      }
      setIsConverting(false);
      if (oldBackupInputRef.current) {
        oldBackupInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadGDriveBackupDirectly = async (fileId: string, fileName: string) => {
    setIsGDriveLoading(true);
    try {
      const token = await getOrAcquireToken();
      const payload = await downloadBackupFile(token, fileId);
      
      const jsonContent = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      triggerSettingsAlert('success', `☁ Googleドライブからローカル端末へファイル「${fileName}」を直接ダウンロード保存しました！`);
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `ファイルのバックアップダウンロードに失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };





  const handleCSVImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const success = onAnyCSVImport(text, setHourRep);
        if (success) {
          setIsImportModalOpen(false);
        } else {
          triggerSettingsAlert('error', '⚠️ CSVの解析に失敗しました。正しいフォーマットかご確認ください。');
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pastedCSV.trim()) {
      triggerSettingsAlert('error', '⚠️ CSVテキストを入力してください。');
      return;
    }
    const success = onAnyCSVImport(pastedCSV, setHourRep);
    if (success) {
      setPastedCSV('');
      setIsImportModalOpen(false);
    } else {
      triggerSettingsAlert('error', '⚠️ CSVの解析に失敗しました。正しいフォーマットかご確認ください。');
    }
  };

  // --- Clipboard Day Transfer Features ---
  const copyToClipboardSafe = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.warn("navigator.clipboard.writeText failed, using fallback", e);
      }
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed', err);
      if (document.body.contains(textArea)) {
        document.body.removeChild(textArea);
      }
      return false;
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const copyData = {
        version: 'POTILOG_DAY_V1',
        date: selectedDate,
        record: records[selectedDate] || null,
        mentalRecord: (mentalRecords && mentalRecords[selectedDate]) || null,
        settings: {
          hourRep,
          customColCount,
          customColNames,
          stamps,
          mentalStamps: mentalStamps || [],
          customMentalColCount: customMentalColCount || 0,
          customMentalColNames: customMentalColNames || [],
          mentalRows: mentalRows || [],
          inputMethod
        }
      };
      const clipboardText = `POTILOG_DAY_V1\n${JSON.stringify(copyData, null, 2)}`;
      const success = await copyToClipboardSafe(clipboardText);
      
      if (success) {
        const formattedDate = selectedDate.replace(/-/g, '/');
        triggerSettingsAlert('success', `✅ ${formattedDate} の記録をクリップボードへコピーしました`);
      } else {
        triggerSettingsAlert('error', '⚠️ クリップボードへの書き込みに失敗しました。');
      }
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `コピー中にエラーが発生しました: ${err.message || err}`);
    }
  };

  const checkDataExistsForDate = (targetDate: string): boolean => {
    const sleepRec = records[targetDate];
    if (sleepRec) {
      for (let i = 0; i <= 47; i++) {
        if (sleepRec[i] !== undefined && sleepRec[i] !== null) {
          return true;
        }
      }
      if (sleepRec.memo && sleepRec.memo.trim() !== '') {
        return true;
      }
      if (sleepRec.customCols) {
        for (const colKey of Object.keys(sleepRec.customCols)) {
          const colData = sleepRec.customCols[colKey];
          if (colData) {
            for (const slotKey of Object.keys(colData)) {
              if (colData[slotKey] !== undefined && colData[slotKey] !== null) {
                return true;
              }
            }
          }
        }
      }
    }

    const mentalRec = mentalRecords && mentalRecords[targetDate];
    if (mentalRec) {
      for (let i = 0; i <= 47; i++) {
        if (mentalRec[i] !== undefined && mentalRec[i] !== null) {
          return true;
        }
      }
      if (mentalRec.memo && mentalRec.memo.trim() !== '') {
        return true;
      }
      if (mentalRec.customCols) {
        for (const colKey of Object.keys(mentalRec.customCols)) {
          const colData = mentalRec.customCols[colKey];
          if (colData) {
            for (const slotKey of Object.keys(colData)) {
              if (colData[slotKey] !== undefined && colData[slotKey] !== null) {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  };

  const executeClipboardRestore = (data: any) => {
    try {
      const targetDate = data.date;
      
      const mergedRecords = { ...records };
      if (data.record) {
        mergedRecords[targetDate] = data.record;
      } else {
        delete mergedRecords[targetDate];
      }
      
      const mergedMentalRecords = { ...mentalRecords };
      if (data.mentalRecord) {
        mergedMentalRecords[targetDate] = data.mentalRecord;
      } else {
        delete mergedMentalRecords[targetDate];
      }
      
      onImportBackup({
        records: mergedRecords,
        hourRep: data.settings.hourRep,
        customColCount: data.settings.customColCount,
        customColNames: data.settings.customColNames,
        stamps: data.settings.stamps,
        inputMethod: data.settings.inputMethod,
        mentalRecords: mergedMentalRecords,
        mentalStamps: data.settings.mentalStamps,
        customMentalColCount: data.settings.customMentalColCount,
        customMentalColNames: data.settings.customMentalColNames,
        mentalRows: data.settings.mentalRows
      });
      
      if (data.settings.hourRep) {
        setHourRep(data.settings.hourRep);
      }
      
      const formattedDate = targetDate.replace(/-/g, '/');
      triggerSettingsAlert('success', `✅ ${formattedDate} の記録を復元しました`);
      
      setShowClipboardPasteModal(false);
      setPendingClipboardData(null);
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', `データの復元中にエラーが発生しました: ${err.message || err}`);
    }
  };

  const parseAndRestoreData = (text: string) => {
    if (!text || !text.trim()) {
      triggerSettingsAlert('error', '⚠️ クリップボードが空です。');
      return;
    }
    
    const trimmed = text.trim();
    if (!trimmed.startsWith('POTILOG_DAY_V1')) {
      triggerSettingsAlert('error', '⚠️ クリップボードに「今日の記録」のデータが見つかりません。');
      return;
    }
    
    try {
      const jsonStr = trimmed.substring('POTILOG_DAY_V1'.length).trim();
      const data = JSON.parse(jsonStr);
      
      if (data.version !== 'POTILOG_DAY_V1' || !data.date) {
        triggerSettingsAlert('error', '⚠️ データ形式が壊れているか、必要な項目が不足しています。');
        return;
      }
      
      setPendingClipboardData(data);
      
      const hasExistingData = checkDataExistsForDate(data.date);
      if (hasExistingData) {
        setShowClipboardOverwriteModal(true);
      } else {
        executeClipboardRestore(data);
      }
    } catch (err: any) {
      console.error(err);
      triggerSettingsAlert('error', '⚠️ データの解析に失敗しました。データが壊れている可能性があります。');
    }
  };

  const handleRestoreFromClipboard = async () => {
    try {
      let text = '';
      if (navigator.clipboard && window.isSecureContext) {
        try {
          text = await navigator.clipboard.readText();
        } catch (e) {
          console.warn("navigator.clipboard.readText failed, using manual paste modal", e);
        }
      }
      
      if (text && text.trim().startsWith('POTILOG_DAY_V1')) {
        parseAndRestoreData(text);
      } else {
        setManualPasteText('');
        setShowClipboardPasteModal(true);
        showToast('📋 手動貼り付け画面を表示します（セキュリティ制限時も安心です）');
      }
    } catch (err: any) {
      console.error(err);
      setManualPasteText('');
      setShowClipboardPasteModal(true);
    }
  };



  return (
    <div className={`p-4 sm:p-6 space-y-6 overflow-y-auto max-h-full font-sans pb-16 transition-colors duration-300 ${
      displayMode === 'dark' ? 'bg-[#121212] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`} id="other-settings-inline-panel">
      
      {/* Settings Top Alert Banner */}
      <AnimatePresence>
        {settingsAlert && (
          <motion.div
            key="settings-banner-alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md text-xs font-bold leading-normal relative overflow-hidden ${
              settingsAlert.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : settingsAlert.type === 'success'
                ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
            id="settings-top-alert"
          >
            {settingsAlert.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            ) : settingsAlert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 pr-6 whitespace-pre-wrap">{settingsAlert.message}</div>
            <button
              onClick={() => setSettingsAlert(null)}
              className="absolute top-3 right-3 rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💾 PRIMARY SAVE & BACKUP CONTROLS LAYER */}
      <div className="space-y-4">
        {/* Manual JSON Copy Restore Backups Section */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          displayMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`} id="json-backup-restore-card">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <Download className="h-6 w-6" />
            <h3 className="font-extrabold text-sm md:text-base text-emerald-700 dark:text-emerald-400 font-sans">バックアップ・復元 (JSON形式)</h3>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            アプリの全設定と記録をローカルファイル（JSON）として保存・復元し、安全にデータを移行できます。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={handleSaveJSONBackup}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer h-14"
              id="settings-json-backup-save-btn"
            >
              <Download className="h-4.5 w-4.5 shrink-0" />
              <div className="text-left font-sans leading-snug">
                <div className="font-black text-xs sm:text-sm">💻 この端末へ完全保存</div>
                <div className="text-[9.5px] opacity-90 font-normal mt-0.5">ファイル拡張子「.json」で保存</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer h-14"
              id="settings-json-backup-restore-btn"
            >
              <Upload className="h-4.5 w-4.5" />
              <div className="text-left font-sans leading-snug">
                <div className="font-black text-xs sm:text-sm">📂 保存したファイルから復元する</div>
                <div className="text-[9.5px] opacity-90 font-normal mt-0.5">ファイルを読み込む</div>
              </div>
            </button>
          </div>

          {/* Old backup converter */}
          <div className={`mt-4 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 ${
            displayMode === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-black text-amber-550 dark:text-amber-400 flex items-center justify-center md:justify-start gap-1">
                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                <span>旧バックアップの睡眠データを復元（コンバート）</span>
              </span>
              <p className="text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-md">
                旧バージョンのバックアップファイルを読み込み、現在の「睡眠タブ」用のデータへ自動変換して移行します。
              </p>
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              <input
                type="file"
                ref={oldBackupInputRef}
                onChange={handleOldBackupConvert}
                accept=".json"
                className="hidden"
                id="old-backup-convert-file-input"
              />
              <button
                type="button"
                disabled={isConverting}
                onClick={() => oldBackupInputRef.current?.click()}
                className="w-full md:w-auto py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-55 active:scale-[0.98] transition-all text-[#e3e2e6] text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer h-10"
              >
                {isConverting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>旧バックアップを移行する</span>
              </button>
            </div>
          </div>

          <div className={`p-3 rounded-xl flex flex-col gap-1 items-center justify-center text-center shadow-3xs mt-3 ${
            displayMode === 'dark' ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-200'
          }`}>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1 font-sans">📋 最近の完全バックアップ更新履歴</span>
            <span className="text-xs font-mono font-bold text-slate-600">{lastBackupTime}</span>
          </div>
        </div>

        {/* 📋 PHONE LINK / CLIPBOARD QUICK SYNC CARD */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#2d2c30]' : 'bg-white border-slate-200 shadow-sm'
        }`} id="clipboard-transfer-card">
          <div className="flex items-center gap-2 text-indigo-400 dark:text-indigo-400 pb-3 border-b border-slate-150 dark:border-[#2d2c30]">
            <Copy className="h-6 w-6 text-indigo-500" />
            <h3 className="font-extrabold text-sm md:text-base text-indigo-750 dark:text-indigo-400 font-sans">1日分のクイック送受信 (クリップボード)</h3>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            クリップボード共有機能を使い、<b>表示中の日付（1日分）の記録と設定</b>をPC・スマホ間で瞬時に送受信・反映します。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer h-14"
              id="clipboard-copy-today-btn"
            >
              <Copy className="h-4.5 w-4.5 shrink-0" />
              <div className="text-left font-sans leading-snug">
                <div className="font-black text-xs sm:text-sm">📋 今日の記録をクリップボードにコピー</div>
                <div className="text-[9.5px] opacity-90 font-normal mt-0.5">{selectedDate.replace(/-/g, '/')} の記録＋設定をコピー</div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleRestoreFromClipboard}
              className="py-3 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer h-14"
              id="clipboard-restore-today-btn"
            >
              <Upload className="h-4.5 w-4.5 shrink-0" />
              <div className="text-left font-sans leading-snug">
                <div className="font-black text-xs sm:text-sm">📥 クリップボードから今日の記録を復元</div>
                <div className="text-[9.5px] opacity-90 font-normal mt-0.5">クリップボードの記録を復元する</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of basic parameters (Display Mode, Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Colors / Display Mode Card */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#2d2c30]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <label className="block text-xs font-black uppercase tracking-wider mb-2.5 text-slate-400">
            🎨 画面テーマ
          </label>
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-2xl shrink-0">🌙</span>
            <div className="space-y-1">
              <span className="text-xs font-black text-yellow-300 block">Material Design 3 ダークテーマ</span>
              <span className="text-[10.5px] text-slate-400 block leading-normal">
                視認性を高め、目に優しいGoogle「Material Design 3」の標準ダークテーマに固定されています。
              </span>
            </div>
          </div>
        </div>

        {/* Custom activity columns count */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          displayMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-400">
            🏃‍♂️ 活動記録の行数 (カスタム列)
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
            睡眠記録の後ろに表示する活動スタンプの行数（カスタム列）を設定します。
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 font-sans">表示列数:</span>
            <select
              value={customColCount}
              onChange={(e) => {
                setCustomColCount(Number(e.target.value));
                showToast(`🏃‍♂️ 活動記録枠の段数を ${e.target.value} 列に拡張しました`);
              }}
              style={{ fontSize: '15px' }}
              className={`flex-1 font-black px-4 py-2.5 rounded-xl border focus:outline-none cursor-pointer transition-colors ${
                displayMode === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-sky-450 focus:border-sky-500' 
                  : 'bg-slate-50 border-slate-250 text-blue-700 focus:bg-white focus:border-blue-500'
              }`}
            >
              {(() => {
                const colOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
                if (!colOptions.includes(customColCount)) {
                  colOptions.push(customColCount);
                  colOptions.sort((a, b) => a - b);
                }
                return colOptions.map((num) => (
                  <option key={num} value={num} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>
                    {num}列を表示
                  </option>
                ));
              })()}
            </select>
          </div>
        </div>

        {/* Chart Scale Factor Settings */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          displayMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-400">
            📊 気分グラフの表示密度 (横幅倍率)
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mb-3.5">
            レポート画面などに表示されるグラフの1日あたりの横幅（X軸の間隔）を一括調整します。
            倍率を下げる（0.6等）ことで横スクロール距離を短縮し、1画面あたりの情報密度を高められます。
          </p>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                現在の横幅倍率:
              </span>
              <span className="text-sm font-black text-sky-400 dark:text-[#FFD835] font-mono">
                {chartScaleFactor.toFixed(2)}倍
                {Math.abs(chartScaleFactor - 0.6) < 0.01 && " (推奨・高密度)"}
                {Math.abs(chartScaleFactor - 1.0) < 0.01 && " (標準)"}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500">高密度 (0.3)</span>
              <input
                type="range"
                min="0.30"
                max="1.20"
                step="0.05"
                value={chartScaleFactor}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (onChartScaleFactorChange) {
                    onChartScaleFactorChange(val);
                  }
                }}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 dark:accent-[#FFD835]"
              />
              <span className="text-[10px] font-black text-slate-500">標準・広め (1.2)</span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 self-center mr-1">
                プリセット:
              </span>
              {[0.4, 0.6, 0.8, 1.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    if (onChartScaleFactorChange) {
                      onChartScaleFactorChange(preset);
                      showToast(`📊 グラフの横幅倍率を ${preset.toFixed(1)}倍 に変更しました`);
                    }
                  }}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    Math.abs(chartScaleFactor - preset) < 0.01
                      ? (displayMode === 'dark' ? 'bg-[#FFD835] text-slate-950 font-black' : 'bg-blue-600 text-white')
                      : (displayMode === 'dark' ? 'bg-slate-850 text-slate-300 hover:bg-slate-750' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }`}
                >
                  {preset.toFixed(1)}倍{preset === 0.6 ? ' (推奨)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* PWA Phone installation area */}
      {deferredPrompt && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-250 p-5 space-y-3.5 shadow-sm">
          <div className="flex gap-3 text-amber-800 dark:text-amber-200">
            <Smartphone className="h-6 w-6 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <h3 className="font-extrabold text-sm md:text-base leading-none">スマホのホーム画面に1タップで追加</h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-1.5 leading-relaxed">
                ホーム画面にアプリを追加することで、アドレスバー非表示のフルスクリーン健康記録アプリとして素早く起動できます。
              </p>
            </div>
          </div>
          <button
            onClick={onInstall}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all text-[#e3e2e6] text-sm font-black rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer h-12"
            id="pwa-install-settings-btn"
          >
            ホーム画面に追加してカンタン起動
          </button>
        </div>
      )}

      {isInstalled && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-4.5 flex gap-3 items-center text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-5.5 w-5.5 text-emerald-600 shrink-0" />
          <p className="text-xs leading-relaxed">
            ホーム画面への追加が完了しています。アプリアイコンから快適にご利用いただけます（PWA対応済）。
          </p>
        </div>
      )}

      {/* Google Drive and Cloud Backups Synchronization Card */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 ${
        displayMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`} id="gdrive-sync-main-card">
        <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <Cloud className="h-6 w-6" />
          <h3 className="font-extrabold text-sm md:text-base text-blue-750 dark:text-sky-300">Googleドライブ 雲の上クラウド保存・同期(AppData)</h3>
        </div>

        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
          Googleアカウントを使用して、全設定と記録をGoogleドライブへバックアップし、複数端末間で自動同期・共有します。
        </p>

        <div className="mt-4">
          {!isFirebaseConfigured() && (
            <div className={`p-3.5 mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-xs leading-relaxed font-semibold ${
              displayMode === 'dark' ? 'text-amber-300' : 'text-amber-800'
            }`}>
              <div className="flex gap-2 items-center mb-1 font-black text-xs">
                <AlertCircle className="h-4.5 w-4.5 text-amber-550 shrink-0" />
                <span>クラウド同期は現在オフライン（ローカル保存中）です</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                環境設定がないためGoogleドライブ連携は無効です。
                <strong className="block mt-1 text-slate-700 dark:text-slate-300">
                  💡 代わりに、上部の「バックアップ・復元 (JSON形式)」をご利用ください。データは端末に安全に保存されています。
                </strong>
              </p>
            </div>
          )}

          {gdriveUser ? (
            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-semibold leading-relaxed shadow-3xs ${
                displayMode === 'dark' ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-150'
              }`}>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-405 block font-normal">接続中のGoogleアカウント:</span>
                  <span className="text-slate-700 dark:text-slate-205 font-black text-sm truncate block max-w-sm" title={gdriveUser.email || ''}>
                    {gdriveUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGDriveLogout}
                  disabled={isGDriveLoading}
                  className="py-2.5 px-3.5 text-xs font-bold border border-slate-200 hover:border-rose-200 bg-white dark:bg-slate-850 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 active:scale-95 transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <LogOut className="h-4 w-4" />
                  <span>ログアウト</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGDriveBackup}
                  disabled={isGDriveLoading}
                  className="py-4 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex flex-col items-center justify-center gap-2 shadow-xs cursor-pointer text-center h-20"
                  id="settings-gdrive-backup-btn"
                >
                  {isGDriveLoading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Cloud className="h-5.5 w-5.5" />
                  )}
                  <span className="text-sm font-black">☁ データをクラウドに同期・保存</span>
                </button>

                <button
                  type="button"
                  onClick={handleGDriveRestoreInitiate}
                  disabled={isGDriveLoading}
                  className={`py-4 px-3 border disabled:opacity-50 disabled:pointer-events-none transition-all text-xs font-black rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer text-center h-20 ${
                    displayMode === 'dark' 
                      ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 text-sky-400' 
                      : 'border-blue-200 bg-blue-50/20 hover:bg-blue-50 hover:border-blue-300 text-blue-700'
                  }`}
                  id="settings-gdrive-restore-btn"
                >
                  {isGDriveLoading ? (
                    <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <RefreshCw className="h-5.5 w-5.5 text-blue-500" />
                  )}
                  <span className="text-sm font-black">☁ クラウドからデータを引き継ぐ・復元</span>
                </button>
              </div>

              <div className={`p-4 rounded-xl flex flex-col gap-1 items-center justify-center text-center shadow-3xs ${
                displayMode === 'dark' ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-200'
              }`}>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-sans">
                  ☁ クラウド同期完了時の日付
                </span>
                <span className="text-sm font-mono font-black text-blue-600 dark:text-sky-350">{lastGDriveSyncTime}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isInsideIframe && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs leading-relaxed space-y-3 font-sans text-left">
                  <div className="flex gap-2 items-center font-bold text-amber-500 text-xs">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>⚠️ プレビュー環境によるサインイン制限</span>
                  </div>
                  <p className="text-slate-400 dark:text-slate-300 text-[11px] leading-relaxed">
                    現在、AI Studio の開発プレビュー（枠内）で表示しています。ブラウザのセキュリティ制限により、この枠内からの Google サインイン（ポップアップ）は完全にブロックされてしまいます。
                  </p>
                  <p className="text-emerald-500 dark:text-emerald-400 font-bold text-[11px]">
                    ✅ 解決方法：以下のボタンから「別のタブ」で直接アプリを開いてください。セキュリティ制限が解除され、1タップで安全に Google 同期が可能になります！
                  </p>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md border-b-2 border-amber-700 text-center cursor-pointer"
                  >
                    🚀 別タブで直接アプリを開く（安全・推奨）
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={handleGDriveLogin}
                disabled={isGDriveLoading || isInsideIframe}
                className={`w-full py-4 px-4 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[#e3e2e6] rounded-xl text-sm font-black flex items-center justify-center gap-2.5 shadow-sm cursor-pointer h-14 ${
                  isInsideIframe 
                    ? 'bg-slate-800 text-slate-500 border border-slate-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                id="settings-gdrive-login-btn"
                title={isInsideIframe ? 'プレビュー画面内からは制限されています。別タブから実行してください。' : 'Googleアカウントでサインイン'}
              >
                {isGDriveLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Lock className="h-5 w-5" />
                )}
                <span>1タップでGoogleサインインしてクラウド同期</span>
              </button>
              
              <div className={`p-3.5 rounded-xl border flex gap-3 text-xs leading-relaxed font-semibold ${
                displayMode === 'dark' ? 'bg-slate-950/60 border-slate-800/80 text-slate-400' : 'bg-blue-50/50 border-blue-100 text-slate-605'
              }`}>
                <Lock className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  データはGoogleドライブの専用アプリデータ領域に暗号化保存され、安全に保護されます。
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CRITICAL ERASE DANGEROUS SWITCH */}
      <div className={`p-5 rounded-2xl border border-red-200/50 dark:border-red-900/50 transition-colors ${
        displayMode === 'dark' ? 'bg-red-950/10' : 'bg-red-50/20'
      }`}>
        <div className="flex items-center gap-2 text-rose-600 mb-2">
          <Trash2 className="h-5.5 w-5.5" />
          <h4 className="font-black text-sm">アプリデータ初期化とお手入れ</h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          端末に保存されているすべての睡眠・体調記録、カスタム列の設定を消去し、アプリを初期状態に戻します。
        </p>
        
        {showDeleteConfirm ? (
          <div className="mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
            <span className="text-xs font-black text-rose-700 leading-none">⚠️ 本当に全てのデータを空にしてもよろしいですか？（取り消せません）</span>
            <div className="flex gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClearAllRecords();
                  setShowDeleteConfirm(false);
                  triggerSettingsAlert('success', '🗑️ 全ての睡眠記録・メンタル記録および環境設定を完全初期化しました。');
                }}
                className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-[#e3e2e6] rounded-lg text-xs font-black select-none cursor-pointer"
              >
                ゴミ箱を空にする
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-1.5 px-3 border border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-black select-none cursor-pointer"
              >
                やめる
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 py-2.5 px-4 rounded-xl border border-rose-200 bg-white dark:bg-slate-850 hover:bg-rose-50 text-red-600 hover:text-rose-700 text-xs font-black transition-all cursor-pointer"
          >
            この端末のカレンダーデータを完全消去（初期化）する
          </button>
        )}
      </div>



      <AnimatePresence>
        <CSVImportModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          pastedCSV={pastedCSV}
          setPastedCSV={setPastedCSV}
          handleCSVImport={handleCSVImport}
          handlePasteImport={handlePasteImport}
        />
      </AnimatePresence>

      <AnimatePresence>
        <GoogleDriveBackupsModal 
          isOpen={isGDriveModalOpen}
          onClose={() => setIsGDriveModalOpen(false)}
          backups={gdriveBackups.map(b => ({
            id: b.id,
            name: b.name,
            createdTime: b.modifiedTime
          }))}
          isLoading={isFetchingBackups || isGDriveLoading}
          onSelectBackup={handleSelectBackup}
          onDownloadBackup={handleDownloadGDriveBackupDirectly}
        />
      </AnimatePresence>

      {/* New Confirm dialog for "Direct Latest backup restore confirm" */}
      <AnimatePresence>
        {showConfirmRestoreModal && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-3xs" id="confirm-restore-modal-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-2xl border border-slate-150 p-5 space-y-4 text-slate-800 shadow-xl"
              id="confirm-restore-modal"
            >
              <div className="text-indigo-650 flex items-center gap-1.5">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-indigo-700">クラウド引き継ぎ・復元のご確認</h3>
              </div>
              <p className="text-xs sm:text-[13px] font-semibold leading-relaxed text-slate-600">
                Googleドライブに保存されている<b>最新のデータバックアップ情報</b>を読み込んで自動復元しますか？
              </p>
              
              {pendingBackups.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-slate-50 p-2.5 font-mono text-[10px] space-y-1">
                  <div className="font-semibold text-slate-400">最新のクラウドファイル:</div>
                  <div className="font-black text-indigo-700 tracking-tight text-ellipsis truncate">{pendingBackups[0].name}</div>
                  <div className="text-slate-505 font-bold">更新日時: {pendingBackups[0].modifiedTime}</div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleGDriveRestoreConfirmYes}
                  className="flex-1 py-3 text-xs font-black bg-blue-600 text-[#e3e2e6] rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  はい（最新データを復元）
                </button>
                <button
                  type="button"
                  onClick={handleGDriveRestoreConfirmNo}
                  className="flex-1 py-3 text-xs font-black border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  一覧から選ぶ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overwrite Confirm Modal */}
      <AnimatePresence>
        {showClipboardOverwriteModal && pendingClipboardData && (
          <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/75 backdrop-blur-3xs" id="clipboard-overwrite-confirm-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#1c1b1f] border border-[#2d2c30] rounded-2xl p-5 space-y-4 text-slate-100 shadow-xl"
              id="clipboard-overwrite-confirm-modal"
            >
              <div className="text-rose-455 flex items-center gap-1.5 border-b border-[#2d2c30] pb-2.5">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#e3e2e6]">上書き確認</h3>
              </div>
              <p className="text-xs sm:text-[13px] font-semibold leading-relaxed text-slate-300">
                <span className="text-amber-400 font-bold">{pendingClipboardData.date.replace(/-/g, '/')}</span> の記録が既にあります。
                <br /><br />
                上書きしますか？
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowClipboardOverwriteModal(false);
                    executeClipboardRestore(pendingClipboardData);
                  }}
                  className="flex-1 py-3 text-xs font-black bg-rose-600 text-[#e3e2e6] rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  はい
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClipboardOverwriteModal(false);
                    setPendingClipboardData(null);
                  }}
                  className="flex-1 py-3 text-xs font-black border border-[#2d2c30] bg-slate-800 text-slate-300 rounded-xl hover:bg-[#2d2c30] active:scale-95 transition-all cursor-pointer"
                >
                  いいえ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clipboard Paste Modal */}
      <AnimatePresence>
        {showClipboardPasteModal && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-3xs" id="clipboard-paste-modal-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md max-h-[90vh] bg-[#1c1b1f] rounded-2xl shadow-xl flex flex-col border border-[#2d2c30] overflow-hidden text-slate-100"
              id="clipboard-paste-modal-content"
            >
              <div className="flex items-center justify-between border-b border-[#2d2c30] bg-[#121212] px-5 py-4 shrink-0">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Upload className="h-5 w-5" />
                  <h3 className="font-extrabold text-sm text-[#e3e2e6]">クリップボードから復元（手動貼り付け）</h3>
                </div>
                <button
                  onClick={() => setShowClipboardPasteModal(false)}
                  className="rounded-full p-1 text-slate-450 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-95 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs font-semibold leading-relaxed text-slate-300">
                <div className="rounded-xl bg-indigo-950/20 border border-indigo-900/40 p-3.5 flex gap-2.5 text-indigo-200">
                  <HelpCircle className="h-5 w-5 shrink-0 text-indigo-400 self-start mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm text-indigo-100">データの貼り付け方法</p>
                    <p className="leading-relaxed text-[11px]">
                      コピーした「POTILOG_DAY_V1」から始まるテキスト全体を下の入力エリアに貼り付け、「復元を実行」ボタンを押してください。
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">
                      コピーされたデータをここに貼り付け
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (navigator.clipboard && window.isSecureContext) {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              setManualPasteText(text);
                              showToast('📋 クリップボードの内容を自動取得しました！');
                            } else {
                              showToast('⚠️ クリップボードが空です');
                            }
                          } else {
                            showToast('⚠️ ブラウザの制限により自動取得できません。手動貼り付けをしてください。');
                          }
                        } catch (err) {
                          showToast('⚠️ 権限制限により、貼り付けボタン(Ctrl+V)または手動貼り付けを使用してください。');
                        }
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-indigo-950/40 hover:bg-indigo-950/60 active:scale-95 text-indigo-300 border border-indigo-800/50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      クリップボードから自動取得
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={manualPasteText}
                    onChange={(e) => setManualPasteText(e.target.value)}
                    placeholder="POTILOG_DAY_V1..."
                    className="w-full font-mono text-xs p-3 bg-[#121212] border border-[#2d2c30] focus:border-indigo-500 focus:outline-none rounded-xl text-slate-200 placeholder:text-slate-600 resize-none leading-normal h-40"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      parseAndRestoreData(manualPasteText);
                    }}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-[#e3e2e6] font-black rounded-xl text-center cursor-pointer shadow-xs text-xs"
                  >
                    復元を実行
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClipboardPasteModal(false)}
                    className="py-3 px-4 border border-[#2d2c30] bg-slate-800 text-slate-300 font-black rounded-xl text-center cursor-pointer text-xs"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
