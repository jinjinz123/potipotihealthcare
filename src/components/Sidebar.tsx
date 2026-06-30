import { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
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

interface SidebarProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
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
  customColCategories?: string[];
  activityCategories?: string[];
  activityColWidth?: number;
  onActivityColWidthChange?: (width: number) => void;
  activityColFontWeight?: string;
  onActivityColFontWeightChange?: (weight: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
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
  stamps,
  onImportBackup,
  inputMethod,
  mentalRecords,
  mentalStamps,
  customMentalColCount,
  customMentalColNames,
  mentalRows = [],
  onSave,
  displayMode,
  onDisplayModeChange,
  actualSleepRecords = {},
  actualSleepStamps = [],
  customActualSleepColCount = 1,
  customActualSleepColNames = [],
  customColCategories = [],
  activityCategories = [],
  activityColWidth = 32,
  onActivityColWidthChange,
  activityColFontWeight = 'font-black',
  onActivityColFontWeightChange
}: SidebarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportModalData, setExportModalData] = useState<{
    csvText: string;
    fileName: string;
    forSingleDate?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedCSV, setPastedCSV] = useState('');

  // Manage last backups using localStorage
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('last_csv_backup_time') || '未バックアップ';
  });

  const [sidebarAlert, setSidebarAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const triggerSidebarAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setSidebarAlert({ type, message });
    showToast(message);
    if (type !== 'error') {
      setTimeout(() => {
        setSidebarAlert(prev => prev?.message === message ? null : prev);
      }, 8000);
    }
  };

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);

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
        triggerSidebarAlert('success', `☁ Googleアカウント ${res.user.displayName || ''} でサインインしました。`);
      }
    } catch (err: any) {
      console.error(err);
      triggerSidebarAlert('error', `Google認証に失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };

  const handleGDriveLogout = async () => {
    setIsGDriveLoading(true);
    try {
      await logoutGoogle();
      setGdriveUser(null);
      triggerSidebarAlert('info', 'Googleドライブとの連携を解除し、サインアウトしました。');
    } catch (err: any) {
      console.error(err);
      triggerSidebarAlert('error', `Googleサインアウトに失敗しました: ${err.message || err}`);
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
      
      triggerSidebarAlert('success', `☁ Googleドライブに正常にバックアップしました: ${fileName}`);
    } catch (err: any) {
      console.error(err);
      triggerSidebarAlert('error', `Googleドライブへのバックアップに失敗しました: ${err.message || err}`);
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
        triggerSidebarAlert('info', 'Googleドライブ内にバックアップファイルが見つかりません。');
        return;
      }

      // Check with the user about restoring from the latest backup or custom choose
      setShowConfirmRestoreModal(true);
    } catch (err: any) {
      console.error(err);
      triggerSidebarAlert('error', `バックアップ情報の取得に失敗しました: ${err.message || err}`);
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

      triggerSidebarAlert('success', `☁ Googleドライブからデータを復元しました。前回のアプリ状態が完全再現されました！`);
    } catch (err: any) {
      console.error(err);
      triggerSidebarAlert('error', `データの読み込み・復元に失敗しました: ${err.message || err}`);
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
      triggerSidebarAlert('success', '💾 アプリ全設定・全睡眠記録を完全JSONバックアップ保存しました！');
    } catch (err: any) {
      if (err.message === 'USER_CANCELLED') {
        return;
      }
      console.error(err);
      triggerSidebarAlert('error', '⚠️ 完全JSONバックアップの保存に失敗しました。');
    }
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

      triggerSidebarAlert('success', `☁ Googleドライブからローカル端末へファイル「${fileName}」を直接ダウンロード保存しました！`);
    } catch (err: any) {
      console.error(err);
      triggerSidebarAlert('error', `ファイルのバックアップダウンロードに失敗しました: ${err.message || err}`);
    } finally {
      setIsGDriveLoading(false);
    }
  };

  // CSV backup handling removed; backups are supported only in JOIN/JSON format

  const [copyDays, setCopyDays] = useState<number>(1);

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

  const handleSaveAsFile = async (forceDownload: boolean) => {
    if (!exportModalData) return;
    try {
      const { exportToCSV } = await import('../services/csvService');
      await exportToCSV(records, exportModalData.forSingleDate, forceDownload, customColNames, stamps);
      triggerSidebarAlert('success', '💾 CSVフォーマットでデータを保存しました。');
    } catch (e) {
      console.error(e);
      triggerSidebarAlert('error', '⚠️ 保存失敗。コピーをお試しください。');
    }
  };

  const handleCopyCSV = () => {
    if (!exportModalData) return;
    navigator.clipboard.writeText(exportModalData.csvText)
      .then(() => {
        setIsCopied(true);
        triggerSidebarAlert('success', '📋 クリップボードにCSVをコピーしました！');
        setTimeout(() => setIsCopied(false), 2500);
      })
      .catch((err) => {
        console.error('Failed to copy CSV:', err);
        triggerSidebarAlert('error', '⚠️ コピーに失敗しました。');
      });
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
          onClose();
        } else {
          triggerSidebarAlert('error', '⚠️ CSVの解析に失敗しました。正しいフォーマットかご確認ください。');
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pastedCSV.trim()) {
      triggerSidebarAlert('error', '⚠️ CSVテキストを入力してください。');
      return;
    }
    const success = onAnyCSVImport(pastedCSV, setHourRep);
    if (success) {
      setPastedCSV('');
      setIsImportModalOpen(false);
      onClose();
    } else {
      triggerSidebarAlert('error', '⚠️ CSVの解析に失敗しました。正しいフォーマットかご確認ください。');
    }
  };

  // Old CSV converting tools removed

  const handleDeveloperCopy = () => {
    const rows: string[] = [];

    // スタンプ設定から「就寝」「起床」「睡眠」の役割を持つ（nameが一致する）スタンプのsymbolを取得、なければデフォルト
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
        triggerSidebarAlert('success', `📋 過去 ${copyDays} 日分の開発者用TSVデータをコピーしました！ Excelの1行目A列を選択して貼り付けてください。`);
      })
      .catch((err) => {
        console.error('Failed to copy developer TSV:', err);
        triggerSidebarAlert('error', '⚠️ コピーに失敗しました。');
      });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex font-sans" id="sidebar-container">
        {/* Backdrop representing translucent layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          id="sidebar-backdrop"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className={`relative flex w-80 max-w-[85vw] flex-col h-full shadow-2xl z-10 transition-colors duration-300 ${
            displayMode === 'dark' ? 'bg-[#121212] text-[#e6e1e5]' : 'bg-white text-slate-800'
          }`}
          id="sidebar-drawer"
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b p-5 shrink-0 transition-colors duration-300 ${
            displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#49454F] text-[#e6e1e5]' : 'bg-[#1e3a8a] text-[#e3e2e6]'
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" className="h-6 w-6 text-orange-250 fill-current">
                   <path d="M125,120 C90,120 65,95 65,60 C65,50 68,40 73,32 C50,40 35,62 35,88 C35,121 62,148 95,148 C115,148 132,138 142,122 C137,121 131,120 125,120 Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-extrabold font-sans tracking-tight">設定メニュー</h2>
                <p className="text-xs text-blue-100 font-medium">Excel連携用・入力専用</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-white/10 active:scale-95 transition-all text-[#e3e2e6]/90 cursor-pointer"
              id="close-sidebar-btn"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Display Mode Selection */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">表示モード設定</h3>
              <div className={`rounded-xl border p-4 space-y-3 shadow-3xs transition-colors duration-300 ${
                displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#49454F] text-[#e6e1e5]' : 'bg-white border-gray-150'
              }`}>
                <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl transition-colors duration-300 ${
                  displayMode === 'dark' ? 'bg-[#121212]' : 'bg-slate-100'
                }`}>
                  <button
                    type="button"
                    onClick={() => onDisplayModeChange('vivid')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer font-black text-xs ${
                      displayMode === 'vivid'
                        ? 'bg-white text-blue-600 shadow-md ring-1 ring-blue-500/10'
                        : displayMode === 'dark'
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          : 'text-slate-600 hover:text-[#1e3a8a] hover:bg-white/40'
                    }`}
                  >
                    <span className="text-base leading-none">🌈</span>
                    <span className="text-[10px] sm:text-[11px] font-black mt-1">はっきり</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDisplayModeChange('soft')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer font-black text-xs ${
                      displayMode === 'soft'
                        ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-500/10'
                        : displayMode === 'dark'
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          : 'text-slate-600 hover:text-emerald-700 hover:bg-white/40'
                    }`}
                  >
                    <span className="text-base leading-none">🌷</span>
                    <span className="text-[10px] sm:text-[11px] font-black mt-1">やさしい</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDisplayModeChange('dark')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer font-black text-xs ${
                      displayMode === 'dark'
                        ? 'bg-[#1c1b1f] text-yellow-300 shadow-md ring-1 ring-yellow-400/20'
                        : 'text-slate-600 hover:text-amber-500 hover:bg-white/40'
                    }`}
                  >
                    <span className="text-base leading-none">🌙</span>
                    <span className="text-[10px] sm:text-[11px] font-black mt-1">ダーク</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column Width & Font Weight Settings */}
            <div className="space-y-2.5" id="sidebar-custom-col-settings-container">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">活動列の表示設定</h3>
              <div className={`rounded-xl border p-4 space-y-4 shadow-3xs transition-colors duration-300 ${
                displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#49454F] text-[#e6e1e5]' : 'bg-white border-gray-150'
              }`}>
                {/* Width Select */}
                <div className="flex items-center justify-between font-sans">
                  <span className="text-xs font-black">列の幅:</span>
                  <select
                    value={activityColWidth}
                    onChange={(e) => {
                      onActivityColWidthChange?.(Number(e.target.value));
                      showToast(`📐 列幅を${e.target.value}pxに変更しました`);
                    }}
                    className={`text-xs font-black px-2 py-1.5 rounded-lg focus:outline-hidden cursor-pointer ${
                      displayMode === 'dark' 
                        ? 'bg-slate-900 border border-slate-700 text-sky-400' 
                        : 'bg-slate-100 border border-slate-250 text-blue-700'
                    }`}
                  >
                    <option value={24} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>極細 (24)</option>
                    <option value={28} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>細 (28)</option>
                    <option value={32} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>標準 (32)</option>
                    <option value={40} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>太 (40)</option>
                    <option value={48} className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>極太 (48)</option>
                  </select>
                </div>

                {/* Font Weight Select */}
                <div className="flex items-center justify-between font-sans">
                  <span className="text-xs font-black">文字の太さ:</span>
                  <select
                    value={activityColFontWeight}
                    onChange={(e) => {
                      onActivityColFontWeightChange?.(e.target.value);
                      showToast(`✍️ 文字の太さを変更しました`);
                    }}
                    className={`text-xs font-black px-2 py-1.5 rounded-lg focus:outline-hidden cursor-pointer ${
                      displayMode === 'dark' 
                        ? 'bg-slate-900 border border-slate-700 text-sky-400' 
                        : 'bg-slate-100 border border-slate-250 text-blue-700'
                    }`}
                  >
                    <option value="font-light" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>細文字 (Light)</option>
                    <option value="font-normal" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>通常 (Normal)</option>
                    <option value="font-bold" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>太文字 (Bold)</option>
                    <option value="font-black" className={displayMode === 'dark' ? 'bg-slate-900 text-[#e3e2e6]' : 'bg-white text-slate-800'}>超極太 (Black)</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Top Sidebar Alert Banner */}
            <AnimatePresence>
              {sidebarAlert && (
                <motion.div
                  key="sidebar-banner-alert"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 shadow-sm text-xs font-bold leading-normal relative overflow-hidden ${
                    sidebarAlert.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : sidebarAlert.type === 'success'
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                      : 'bg-blue-50 border-blue-200 text-blue-805'
                  }`}
                  id="sidebar-top-alert"
                >
                  {sidebarAlert.type === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : sidebarAlert.type === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 pr-5 whitespace-pre-wrap">{sidebarAlert.message}</div>
                  <button
                    onClick={() => setSidebarAlert(null)}
                    className="absolute top-2 right-2 rounded-full p-0.5 text-slate-400 hover:bg-black/5 hover:text-slate-600 active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PWA Install Promo */}
            {deferredPrompt && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3 shadow-xs">
                <div className="flex gap-2 text-amber-800">
                  <Smartphone className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-sm">スマホ画面にアプリを追加</h3>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      ホーム画面にアプリアイコンを置いて、いつでも1秒で記録を起動できます。
                    </p>
                  </div>
                </div>
                <button
                  onClick={onInstall}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all text-[#e3e2e6] text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  id="pwa-install-sidebar-btn"
                >
                  ホーム画面に追加する
                </button>
              </div>
            )}

            {isInstalled && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex gap-2.5 items-center text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold">スマホにインストール済みです（PWA）</p>
              </div>
            )}

            {/* Complete Manual Save Overwrite */}
            {onSave && (
              <div className="space-y-2 bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-xs" id="sidebar-save-section">
                <div className="flex items-center gap-2 text-blue-705">
                  <Save className="h-5 w-5" />
                  <span className="font-extrabold text-xs text-blue-800">アプリ状態・設定の上書き保存</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  現在の活動のカスタム列、スタンプ設定、時間表記などの環境構成と入力された睡眠・メンタル記録の全状態を端末に即座に上書き保存します。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onSave();
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  id="sidebar-save-baseline-btn"
                >
                  <Save className="h-4 w-4" />
                  <span>状態・設定を上書き保存</span>
                </button>
              </div>
            )}

            {/* Googleドライブ バックアップ＆同期 Section */}
            <div className="space-y-2.5" id="gdrive-backup-sync-section">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Googleドライブ同期</h3>
              <div className={`rounded-xl border p-4 space-y-3.5 shadow-3xs transition-colors duration-300 ${
                displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#49454F] text-[#e6e1e5]' : 'bg-white border-blue-200 text-slate-800'
              }`}>
                <div className={`flex items-center gap-2 ${
                  displayMode === 'dark' ? 'text-sky-300' : 'text-blue-600'
                }`}>
                  <Cloud className="h-5 w-5" />
                  <span className={`font-bold text-xs ${
                    displayMode === 'dark' ? 'text-sky-300' : 'text-blue-700'
                  }`}>クラウドデータ同期 (AppData)</span>
                </div>
                
                <p className={`text-[11px] leading-relaxed font-semibold ${
                  displayMode === 'dark' ? 'text-slate-350' : 'text-slate-550'
                }`}>
                  アプリの設定（カスタム活動列、スタンプ、時間枠等）と睡眠記録を、Googleドライブの暗号化領域（アプリ専用フォルダ）に安全に保存・復元できます。スマホとPCでのデータ共有が簡単に行えます。
                </p>

                {!isFirebaseConfigured() && (
                  <div className={`p-3 rounded-lg border text-[10.5px] leading-relaxed font-semibold ${
                    displayMode === 'dark' 
                      ? 'bg-amber-950/40 border-amber-900 text-amber-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <div className="flex gap-1.5 items-center mb-0.5 font-bold text-[11px]">
                      <AlertCircle className={`h-4 w-4 shrink-0 ${displayMode === 'dark' ? 'text-amber-400' : 'text-amber-650'}`} />
                      <span>クラウド同期は現在オフラインです</span>
                    </div>
                    <p className={`font-medium text-[10px] ${displayMode === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      Firebaseの認証設定が未設定のため、クラウド保存は無効になっています。
                      <strong className={`block mt-0.5 ${displayMode === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                        💡 代わりに「バックアップ＆復元（JSON形式）」メニューから、ご自身のアプリデータを1秒で保存・復元していただけます。
                      </strong>
                    </p>
                  </div>
                )}

                {gdriveUser ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-150 p-3 flex justify-between items-center text-xs font-semibold leading-none shadow-7xs">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 block font-normal">連携アカウント:</span>
                        <span className="text-slate-700 font-extrabold truncate max-w-[120px] block" title={gdriveUser.email || ''}>
                          {gdriveUser.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGDriveLogout}
                        disabled={isGDriveLoading}
                        className="py-1 px-2 text-[10px] font-bold border border-slate-200 hover:border-rose-200 bg-white text-slate-500 hover:text-rose-600 active:scale-95 transition-all rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>ログアウト</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleGDriveBackup}
                        disabled={isGDriveLoading}
                        className="py-3 px-2 bg-blue-600 hover:bg-blue-750 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1.5 shadow-xs cursor-pointer text-center"
                        id="gdrive-backup-btn"
                      >
                        {isGDriveLoading ? (
                          <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Cloud className="h-4.5 w-4.5" />
                        )}
                        <span>☁ 同期保存</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGDriveRestoreInitiate}
                        disabled={isGDriveLoading}
                        className="py-3 px-2 border border-blue-200 bg-blue-50/20 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:pointer-events-none transition-all text-xs font-black text-blue-700 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center font-sans"
                        id="gdrive-restore-btn"
                      >
                        {isGDriveLoading ? (
                          <div className="h-4.5 w-4.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <RefreshCw className="h-4.5 w-4.5 text-blue-500 animate-none" />
                        )}
                        <span>☁ 同期復元</span>
                      </button>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1 items-center justify-center text-center shadow-7xs">
                      <span className="text-[10px] font-bold text-slate-405 tracking-wider flex items-center gap-1 font-sans">☁ 最終同期日時</span>
                      <span className="text-xs font-mono font-bold text-slate-650">{lastGDriveSyncTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGDriveLogin}
                      disabled={isGDriveLoading}
                      className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-750 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      id="gdrive-login-btn"
                    >
                      {isGDriveLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      <span>Googleサインインして同期を開始する</span>
                    </button>
                    <div className="p-2.5 rounded-lg bg-blue-50/40 border border-blue-105 flex gap-2 text-[10px] text-slate-550 font-semibold leading-relaxed">
                      <Lock className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        データはセキュリティ保護されたアプリ専用領域（AppData領域）内に保存されます。当サービスや第三者があなたのGoogleドライブ内の一般ファイルを覗き見たり、取得したりすることは一切ありません。
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* バックアップ＆復元（JSON形式） Section */}
            <div className="space-y-2.5" id="csv-backup-restore-section">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">バックアップ＆復元（JSON形式）</h3>
              <div className={`rounded-xl border p-4 space-y-3.5 shadow-3xs transition-colors duration-300 ${
                displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#49454F] text-[#e6e1e5]' : 'bg-white border-blue-200/80 text-slate-800'
              }`}>
                <p className={`text-[11px] leading-relaxed font-semibold ${
                  displayMode === 'dark' ? 'text-slate-350' : 'text-slate-550'
                }`}>
                  アプリに入力したすべての睡眠記録、カスタム活動列、時間枠の表示設定、スタンプ設定などの情報をまとめて1つの完全JSON（JOIN形式）として安全に保存・復元ができます。
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleSaveJSONBackup}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    id="json-backup-save-btn"
                    title="睡眠記録、活動、スタンプ構成が全て入った完全形式のJSONファイルをPC・スマホに直接保存します（最もおすすめ）"
                  >
                    <Download className="h-4.5 w-4.5 shrink-0" />
                    <span className="leading-tight">💾 完全JSON保存</span>
                    <span className="text-[9px] opacity-90 font-sans font-normal leading-tight">(全設定＆データを100%復元可能)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full py-3.5 px-4 bg-[#1e40af] hover:bg-blue-800 active:scale-[0.98] transition-all text-[#e3e2e6] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
                    id="csv-backup-restore-btn"
                  >
                    <Upload className="h-4.5 w-4.5" />
                    <span>📂 JSON形式ファイルの復元</span>
                  </button>
                </div>

                <div className={`rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center shadow-7xs ${
                  displayMode === 'dark' ? 'bg-[#121212] border border-[#49454F]' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold text-slate-405 tracking-wider flex items-center gap-1 font-sans">📋 最終バックアップ更新</span>
                  <span className={`text-xs font-mono font-bold ${displayMode === 'dark' ? 'text-sky-350' : 'text-slate-650'}`}>{lastBackupTime}</span>
                </div>
              </div>

              {/* Export Single Day */}
              <button
                onClick={() => handleExport(selectedDate)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left shadow-3xs cursor-pointer ${
                  displayMode === 'dark' ? 'border-[#49454F] bg-[#1c1b1f] hover:bg-slate-800 text-[#e3e2e6]' : 'border-gray-150 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                id="export-day-sidebar-btn"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  displayMode === 'dark' ? 'bg-sky-950/40 text-sky-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Download className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className={`font-extrabold text-sm ${displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-800'}`}>選択日 ({selectedDate}) のみ出力</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${displayMode === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>この日の記録のみをCSV形式で保存</p>
                </div>
              </button>

              {/* Developer Copy (CSV Section) */}
              <div className="w-full p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-3xs space-y-3" id="developer-copy-section">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 text-amber-800">
                    <Copy className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 leading-snug">開発者専用コピペ</h4>
                    <p className="text-[10px] text-slate-550 mt-0.5 leading-relaxed">
                      選択日から過去の範囲を<strong>古い順（時系列順）</strong>でCSV形式としてクリップボードへコピーします。
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-amber-100/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 font-sans">コピーする期間:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCopyDays(prev => Math.max(1, prev - 1))}
                        className="h-7 w-7 text-xs font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-md flex items-center justify-center select-none cursor-pointer text-slate-700 font-sans"
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
                        className="h-7 w-14 bg-white border border-slate-200 rounded-md text-xs font-sans font-extrabold text-center text-black focus:outline-hidden focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCopyDays(prev => prev + 1)}
                        className="h-7 w-7 text-xs font-black bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-md flex items-center justify-center select-none cursor-pointer text-slate-700 font-sans"
                      >
                        ＋
                      </button>
                      <span className="text-xs font-bold text-slate-600 ml-1 font-sans">日分</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {[7, 14, 30, 90].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCopyDays(preset)}
                        className={`py-1 text-[10px] font-sans font-extrabold rounded-md border transition-all cursor-pointer ${
                          copyDays === preset
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-3xs'
                            : 'bg-white text-slate-550 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {preset}日
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeveloperCopy}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-[#e3e2e6] text-xs font-sans font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="developer-copy-trigger-btn"
                >
                  <Copy className="h-3.5 w-3.5" />
                  過去 {copyDays} 日分をコピー
                </button>
              </div>
            </div>

            {/* PC of Excel integration guidelines */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-[#1e3a8a]" />
                PCのExcelへの取り込み手順
              </h3>
              <div className="rounded-xl border border-gray-150 p-4 bg-white space-y-2 text-xs text-slate-600 shadow-3xs leading-relaxed font-sans">
                <ol className="list-decimal list-inside space-y-1.5 pl-0.5">
                  <li>「エクスポート」をタップします。</li>
                  <li>ダウンロードされたファイルをPCへ転送。</li>
                  <li>PCでExcelを開き、新規シートを用意。</li>
                  <li>上部の「データ」タブ ＞「テキストまたはCSVから」を選択。</li>
                  <li>出力したCSVを選択すれば、文字化けなく完璧に取り込まれます。</li>
                </ol>
              </div>
            </div>

            {/* Danger section */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                データ管理（全リセット）
              </h3>

              {showDeleteConfirm ? (
                <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-100 space-y-3 shadow-3xs">
                  <p className="text-[11px] font-bold text-rose-800 leading-relaxed font-sans">
                    ⚠️ 警告: この操作は取り消せません。これまでスマホに入力したすべての月日が完全に初期化され、消去されます。
                  </p>
                  <div className="flex gap-2 font-bold select-none text-xs">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        onClearAllRecords();
                        setShowDeleteConfirm(false);
                        onClose();
                      }}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-[#e3e2e6] rounded-lg transition-all cursor-pointer shadow-3xs"
                    >
                      完全に消去
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] border border-rose-150 transition-all text-left text-rose-700 rounded-xl cursor-pointer"
                  id="clear-all-data-sidebar-btn"
                >
                  <Trash2 className="h-5 w-5 shrink-0 text-rose-500" />
                  <div>
                    <p className="font-extrabold text-xs">全記録データを完全消去</p>
                    <p className="text-[10px] text-rose-550 mt-0.5 leading-tight font-medium">スマホ内の全データを削除（元に戻せません）</p>
                  </div>
                </button>
              )}
            </div>

            {/* About App */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-500" />
                アプリのこだわり
              </h3>
              <div className={`rounded-xl border p-4 text-xs space-y-2 shadow-3xs leading-relaxed font-sans transition-colors duration-300 ${
                displayMode === 'dark' ? 'bg-[#1c1b1f] border-[#49454F] text-slate-300' : 'bg-white border-gray-150 text-slate-550'
              }`}>
                <p>本アプリは、<b>文字入力すら必要のないスタンプ帳感覚 of 睡眠記録専用サブ機</b>としてデザインされています。</p>
                <p>Excelで睡眠分析を行いたいけれど、スマホからの日々の入力がとにかく面倒…というお悩みを解決すべく、2秒で打ってポチッとCSVダウンロードできる簡潔さを極めました。</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-5 text-center text-[10px] space-y-1 select-none shrink-0 transition-colors duration-300 ${
            displayMode === 'dark' ? 'bg-[#1c1b1f] border-t border-[#49454F] text-slate-400' : 'bg-slate-50 p-5 border-t border-gray-100 text-slate-400'
          }`}>
            <p className={`font-bold ${displayMode === 'dark' ? 'text-slate-200' : 'text-slate-550'}`}>【ポチログ】 (入力専用)</p>
            <p>Version 1.0.0 (5年Excel対応) • PWA動作</p>
            <div className="flex justify-center items-center gap-1 mt-1 text-slate-400">
              <HelpCircle className="h-3 w-3" />
              <span>ブラウザメニューからインストールも可能</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Standalone Modals (conditionally loaded and rendered outside drawer) */}
      <AnimatePresence>
        {exportModalData && (
          <CSVExportModal
            key="csv-export-modal-panel"
            exportModalData={exportModalData}
            onClose={() => setExportModalData(null)}
            isMobile={isMobile}
            handleCopyCSV={handleCopyCSV}
            handleSaveAsFile={handleSaveAsFile}
            isCopied={isCopied}
          />
        )}
        
        {isImportModalOpen && (
          <CSVImportModal
            key="csv-import-modal-panel"
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            pastedCSV={pastedCSV}
            setPastedCSV={setPastedCSV}
            handleCSVImport={handleCSVImport}
            handlePasteImport={handlePasteImport}
          />
        )}

        {showConfirmRestoreModal && pendingBackups.length > 0 && (
          <div key="confirm-restore-modal-backdrop-panel" className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" id="confirm-restore-modal-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col border border-slate-150 overflow-hidden text-slate-800"
              id="confirm-restore-modal-content"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-5 py-4 shrink-0">
                <div className="flex items-center gap-2 text-blue-600">
                  <Cloud className="h-5 w-5" />
                  <h3 className="font-extrabold text-sm">復元ファイル確認</h3>
                </div>
                <button
                  onClick={() => setShowConfirmRestoreModal(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-semibold leading-relaxed text-slate-600">
                <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 flex gap-2.5 text-blue-900">
                  <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-[#1e3a8a] mb-1">最新のバックアップを検出</h4>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Googleドライブ内に <strong>{pendingBackups.length}件</strong> のバックアップが保存されています。
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-extrabold text-slate-705">最新のバックアップファイルで復元しますか？</p>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl leading-normal space-y-1">
                    <span className="text-[9px] text-slate-400 block font-normal leading-none mb-1">直近ファイル:</span>
                    <span className="font-extrabold text-xs text-slate-800 leading-tight block">
                      {(() => {
                        const name = pendingBackups[0].name;
                        const matchNew = name.match(/backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.(json|csv)/);
                        if (matchNew) return `${matchNew[1]}年${matchNew[2]}月${matchNew[3]}日 ${matchNew[4]}:${matchNew[5]}:${matchNew[6]}`;
                        const matchNewShort = name.match(/backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\.(json|csv)/);
                        if (matchNewShort) return `${matchNewShort[1]}年${matchNewShort[2]}月${matchNewShort[3]}日 ${matchNewShort[4]}:${matchNewShort[5]}`;
                        const matchOld = name.match(/バックアップ_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\.json/);
                        if (matchOld) return `${matchOld[1]}年${matchOld[2]}月${matchOld[3]}日 ${matchOld[4]}:${matchOld[5]}`;
                        return name;
                      })()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none block">
                      {pendingBackups[0].name}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleGDriveRestoreConfirmYes}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-[#e3e2e6] font-extrabold rounded-xl text-xs active:scale-[0.99] transition-all cursor-pointer text-center"
                  >
                    はい （最新のファイルでスグ復元する）
                  </button>
                  
                  <button
                    onClick={handleGDriveRestoreConfirmNo}
                    className="w-full py-3 px-4 border border-blue-200 hover:bg-blue-50/45 text-blue-700 font-extrabold rounded-xl text-xs active:scale-[0.99] transition-all cursor-pointer text-center"
                  >
                    いいえ （過去のバックアップ一覧から選ぶ）
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end shrink-0">
                <button
                  onClick={() => setShowConfirmRestoreModal(false)}
                  className="px-5 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350 active:scale-[0.98] transition-all font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs"
                >
                  キャンセル
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <GoogleDriveBackupsModal
          key="gdrive-backups-modal-panel"
          isOpen={isGDriveModalOpen}
          onClose={() => setIsGDriveModalOpen(false)}
          backups={gdriveBackups}
          isLoading={isFetchingBackups}
          onSelectBackup={handleSelectBackup}
          onDownloadBackup={handleDownloadGDriveBackupDirectly}
        />
      </AnimatePresence>
    </>
  );
}
