import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  FileSpreadsheet, 
  Download,
  CheckCircle2,
  Upload,
  Copy,
  Check,
  AlertTriangle,
  Share2,
  HelpCircle,
  Cloud,
  Calendar,
} from 'lucide-react';

interface CSVExportModalProps {
  key?: string;
  exportModalData: { csvText: string; fileName: string; forSingleDate?: string; } | null;
  onClose: () => void;
  isMobile: boolean;
  handleCopyCSV: () => void;
  handleSaveAsFile: (classical: boolean) => void;
  isCopied: boolean;
}

export function CSVExportModal({
  exportModalData,
  onClose,
  isMobile,
  handleCopyCSV,
  handleSaveAsFile,
  isCopied
}: CSVExportModalProps) {
  if (!exportModalData) return null;
  
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" id="csv-export-modal-backdrop">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md max-h-[90vh] bg-[#1c1b1f] rounded-2xl shadow-xl flex flex-col border border-[#2d2c30] overflow-hidden text-slate-100"
        id="csv-export-modal-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d2c30] bg-[#121212] px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 text-sky-400">
            <FileSpreadsheet className="h-5 w-5" />
            <h3 className="font-extrabold text-sm text-[#e3e2e6]">書き出し方法の選択</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-450 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-95 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-semibold leading-relaxed text-slate-300">
          <div className="rounded-xl bg-amber-950/20 border border-amber-900/40 p-3.5 flex gap-2.5 text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 self-start mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-100">LINEアプリ等をお使いの方へ</p>
              <p className="leading-relaxed">
                LINEの内蔵ブラウザ制限により、<b>「ファイルを保存する」</b>をクリックしてもダウンロードできない場合があります。
              </p>
              <p className="leading-relaxed">
                その場合は、下の<b>「CSVテキストをコピー」</b>を押し, スマホのメモ帳やLINE等のメッセージに貼り付けて保存してください。
              </p>
              <p className="text-[10px] text-amber-400 font-bold mt-1">
                💡 画面右上のメニュー（…）から「デフォルトのブラウザで開く」（または SafariやChromeで開く）を選ぶと、通常通り直接ファイル保存が可能です！
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">方法1 : クリップボードへコピー（推奨）</span>
            <button
              onClick={handleCopyCSV}
              className="w-full py-3 px-4 bg-blue-650 hover:bg-blue-700 active:scale-[0.99] transition-all text-[#e3e2e6] font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs text-sm"
            >
              {isCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              <span>CSVテキストをコピーする</span>
            </button>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">方法2 : ファイルで保存する</span>
            
            <button
              onClick={() => handleSaveAsFile(true)}
              className="w-full py-2.5 px-4 border border-[#2d2c30] hover:border-slate-750 bg-[#121212] hover:bg-[#1c1b1f] active:scale-[0.99] transition-all text-slate-200 font-bold rounded-xl flex items-center gap-3 cursor-pointer text-sm"
            >
              <Download className="h-5 w-5 text-indigo-400 shrink-0" />
              <div className="text-left">
                <div className="font-extrabold text-slate-200">CSVファイルを直接保存する</div>
                <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                  ブラウザの標準ダウンロード機能。PCでフォルダを選択して保存したい場合におすすめです。
                </div>
              </div>
            </button>

            {isMobile && (
              <button
                onClick={() => handleSaveAsFile(false)}
                className="w-full py-2.5 px-4 border border-[#2d2c30] hover:border-slate-750 bg-[#121212] hover:bg-[#1c1b1f] active:scale-[0.99] transition-all text-slate-200 font-bold rounded-xl flex items-center gap-3 cursor-pointer text-sm"
              >
                <Share2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div className="font-extrabold text-slate-200">共有メニューを開いて保存する</div>
                  <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                    システム全体の共有メニューを開きます。スマホへ転送したい場合に便利です。
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2d2c30] p-4 bg-[#121212] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1c1b1f] border border-[#2d2c30] text-slate-300 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-[0.98] transition-all font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs"
          >
            キャンセル
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CSVImportModalProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
  pastedCSV: string;
  setPastedCSV: (val: string) => void;
  handleCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePasteImport: () => void;
}

export function CSVImportModal({
  isOpen,
  onClose,
  pastedCSV,
  setPastedCSV,
  handleCSVImport,
  handlePasteImport
}: CSVImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" id="csv-import-modal-backdrop">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md max-h-[90vh] bg-[#1c1b1f] rounded-2xl shadow-xl flex flex-col border border-[#2d2c30] overflow-hidden text-slate-100"
        id="csv-import-modal-content"
      >
        <div className="flex items-center justify-between border-b border-[#2d2c30] bg-[#121212] px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 text-sky-400">
            <Upload className="h-5 w-5" />
            <h3 className="font-extrabold text-sm text-[#e3e2e6]">睡眠記録・全設定の復元 （JSON形式）</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-450 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-95 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs font-semibold leading-relaxed text-slate-300">
          <div className="rounded-xl bg-blue-950/20 border border-blue-900/40 p-3.5 flex gap-2.5 text-blue-200">
            <HelpCircle className="h-5 w-5 shrink-0 text-blue-400 self-start mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-sm text-blue-100 font-sans">データ復元・上書きのご注意</p>
              <p className="leading-relaxed text-[11px]">
                JSONファイルを読み込むと、すべての睡眠記録やスタンプ設定が読み込んだ内容で上書きされます。
              </p>
              <p className="leading-relaxed text-[11px] text-amber-400 font-bold">
                ⚠️ LINE等の内蔵ブラウザではファイル選択が開かない場合があります。その場合はSafariやChrome等の「通常ブラウザ」で開くか、「方法2 (テキスト貼り付け)」をご利用ください。
              </p>
            </div>
          </div>

          {/* Method 1: Choose File */}
          <div className="space-y-2">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">方法1 : JSONファイルから復元する</span>
            <label className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all text-[#e3e2e6] font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs text-sm">
              <FileSpreadsheet className="h-5 w-5" />
              <span>バックアップファイルを選んで読み込む</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleCSVImport}
              />
            </label>
            <div className="text-[10px] text-center text-slate-450 font-bold">※ .json 形式に対応</div>
          </div>

          {/* Method 2: Paste CSV/JSON Text */}
          <div className="space-y-2 pt-2 border-t border-[#2d2c30]">
            <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">方法2 : JSONテキスト貼り付けから復元する</span>
            <textarea
              rows={4}
              value={pastedCSV}
              onChange={(e) => setPastedCSV(e.target.value)}
              placeholder="完全JSONバックアップデータの { ... } 部分をここへ貼り付けてください。"
              className="w-full p-3 font-mono text-[11px] font-bold bg-white border border-slate-300 text-black rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden leading-normal placeholder:text-slate-400"
            />
            <button
              onClick={handlePasteImport}
              className="w-full py-3 px-4 bg-blue-650 hover:bg-blue-700 active:scale-[0.99] transition-all text-[#e3e2e6] font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs text-sm"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>貼り付けたテキストからインポート</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2d2c30] p-4 bg-[#121212] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1c1b1f] border border-[#2d2c30] text-slate-300 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-[0.98] transition-all font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs"
          >
            キャンセル
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface GoogleDriveBackupsModalProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
  backups: { id: string; name: string; createdTime: string }[];
  isLoading: boolean;
  onSelectBackup: (fileId: string, fileName: string) => void;
  onDownloadBackup: (fileId: string, fileName: string) => void;
}

export function GoogleDriveBackupsModal({
  isOpen,
  onClose,
  backups,
  isLoading,
  onSelectBackup,
  onDownloadBackup
}: GoogleDriveBackupsModalProps) {
  if (!isOpen) return null;

  const formatBackupFilename = (name: string): string => {
    // 1. New backup filenames: backup_YYYYMMDD_HHMMSS.json / backup_YYYYMMDD_HHMMSS.csv
    const matchNew = name.match(/backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.(json|csv)/);
    if (matchNew) {
      return `${matchNew[1]}年${matchNew[2]}月${matchNew[3]}日 ${matchNew[4]}:${matchNew[5]}:${matchNew[6]}`;
    }
    // 1.5. New backup filenames without seconds: backup_YYYYMMDD_HHMM.json / csv
    const matchNewShort = name.match(/backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\.(json|csv)/);
    if (matchNewShort) {
      return `${matchNewShort[1]}年${matchNewShort[2]}月${matchNewShort[3]}日 ${matchNewShort[4]}:${matchNewShort[5]}`;
    }
    // 2. Traditional backup filename pattern
    const matchOld = name.match(/バックアップ_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\.json/);
    if (matchOld) {
      return `${matchOld[1]}年${matchOld[2]}月${matchOld[3]}日 ${matchOld[4]}:${matchOld[5]}`;
    }
    return name;
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" id="gdrive-backups-modal-backdrop">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md max-h-[80vh] bg-[#1c1b1f] rounded-2xl shadow-xl flex flex-col border border-[#2d2c30] overflow-hidden text-slate-100"
        id="gdrive-backups-modal-content"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d2c30] bg-[#121212] px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 text-sky-450 text-sky-400">
            <Cloud className="h-5 w-5" />
            <h3 className="font-extrabold text-sm text-[#e3e2e6]">Googleドライブ バックアップ履歴</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-450 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-95 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-5 overflow-y-auto flex-1 min-h-[250px] space-y-3 text-slate-300">
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Googleドライブのアプリ専用フォルダに保存されているバックアップファイルの一覧です。復元したいファイルを選択するか、ローカルPCやスマホにJSONファイルとして引き出して手動管理することができます。
          </p>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-450">バックアップを取得中...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
              <Cloud className="h-10 w-10 text-slate-700" />
              <div className="text-xs font-bold text-slate-400">バックアップファイルが見つかりません。</div>
              <div className="text-[10px] text-slate-500 font-medium">最初のバックアップをGoogleドライブに保存してください。</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {backups.map((bk, index) => (
                <div
                  key={`${bk.id || 'backup'}-${index}`}
                  className="w-full p-3.5 border border-[#2d2c30] bg-[#121212] hover:bg-[#1c1b1f] transition-all text-slate-200 font-bold rounded-xl flex items-center justify-between shadow-7xs gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-950 text-blue-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-100 leading-tight truncate">
                        {formatBackupFilename(bk.name)}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5 leading-none truncate">
                        {bk.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onSelectBackup(bk.id, bk.name)}
                      className="text-[10px] py-1.5 px-2 bg-blue-900 hover:bg-blue-600 text-blue-300 hover:text-[#e3e2e6] font-extrabold transition-all rounded-lg shrink-0 cursor-pointer"
                    >
                      選択復元
                    </button>
                    <button
                      onClick={() => onDownloadBackup(bk.id, bk.name)}
                      className="text-[10px] py-1.5 px-2 bg-slate-800 hover:bg-slate-600 text-slate-400 hover:text-[#e3e2e6] font-extrabold transition-all rounded-lg shrink-0 cursor-pointer flex items-center gap-0.5"
                      title="このファイルをローカルにダウンロード保存する"
                    >
                      <Download className="h-3 w-3" />
                      <span>JSON保存</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2d2c30] p-4 bg-[#121212] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1c1b1f] border border-[#2d2c30] text-slate-300 hover:bg-slate-800 hover:text-[#e3e2e6] active:scale-[0.98] transition-all font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs"
          >
            閉じる
          </button>
        </div>
      </motion.div>
    </div>
  );
}
