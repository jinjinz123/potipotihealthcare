import { DailyRecords, StampConfig, MentalRow } from '../types';
import { getBackupTimestamp } from '../utils';

/**
 * Downloads or Shares the unified JSON backup file containing all records, settings, and stamps
 */
export async function exportAllToJSONFile(
  records: DailyRecords,
  stamps: StampConfig[],
  hourRep: '1-24' | '0-23',
  customColNames: string[],
  customColCount: number,
  inputMethod?: 'stamp' | 'paint',
  mentalRecords?: DailyRecords,
  mentalStamps?: StampConfig[],
  customMentalColCount?: number,
  customMentalColNames?: string[],
  mentalRows?: MentalRow[],
  actualSleepRecords?: DailyRecords,
  actualSleepStamps?: StampConfig[],
  customActualSleepColCount?: number,
  customActualSleepColNames?: string[],
  customColCategories?: string[],
  activityCategories?: string[],
): Promise<string> {
  const payload = {
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
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

  const ts = getBackupTimestamp();
  const fileName = `backup_${ts}.json`;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');


  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: '睡眠記録の完全JSONバックアップデータです。'
        });
        return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
      }
    } catch (shareErr) {
      if (shareErr instanceof Error && shareErr.name === 'AbortError') {
        throw new Error('USER_CANCELLED');
      }
      console.warn('Share API failed, falling back to local download:', shareErr);
    }
  }

  // Local Browser download fallback
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);

  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}
