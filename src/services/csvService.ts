import { DailyRecords, SleepSymbol, StampConfig } from '../types';
import { 
  createBlankRecord, 
  loadCustomColCount, 
  loadCustomColNames,
  getEffectiveSymbol,
  saveCustomColCount,
  saveCustomColNames,
  getBackupTimestamp
} from '../utils';

/**
 * Escapes a raw value to be safely stored in a CSV cell (with standard RFC 4180 escape rules)
 */
export function escapeCSVValue(val: string | null | undefined): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Perfectly parses a CSV line supporting quoted cells with embedded commas or escaped double quotes.
 * Highly robust on any smartphone environment (iOS/Android).
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip second quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Generates the raw CSV content as a string, including custom columns
 */
export function generateCSVText(
  records: DailyRecords, 
  forSingleDate?: string, 
  customColNames?: string[], 
  stamps: StampConfig[] = []
): string {
  const finalNames = customColNames || loadCustomColNames(loadCustomColCount());
  
  // Column definitions
  const headers = ['日付', '曜日', '時間枠', '記号', '意味', ...finalNames];
  const lines: string[] = [headers.map(h => `"${h}"`).join(',')];
  
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  
  // Decide which dates to export (sorted chronologically)
  const datesToExport = forSingleDate 
    ? [forSingleDate] 
    : Object.keys(records).sort((a, b) => a.localeCompare(b));
    
  datesToExport.forEach((dateStr) => {
    const record = records[dateStr] || createBlankRecord();
    const dateObj = new Date(dateStr);
    const dayOfWeek = isNaN(dateObj.getTime()) ? '' : daysOfWeek[dateObj.getDay()];
    
    // Write 48 rows for each day
    for (let h = 0; h < 24; h++) {
      const hourLabel = String(h).padStart(2, '0');
      
      const getSymbolMeaning = (symbolVal: SleepSymbol) => {
        if (!symbolVal) return '';
        const stamp = stamps.find(s => s.id === symbolVal);
        if (stamp) return stamp.name;
        if (symbolVal === '★') return '就寝';
        if (symbolVal === 'S') return '睡眠';
        if (symbolVal === '×') return '覚醒';
        if (symbolVal === '○') return '起床';
        if (symbolVal === '－') return '横寝';
        return '';
      };
      
      // 00分
      const symbol0 = record[h * 2];
      const effSym0 = getEffectiveSymbol(symbol0, stamps) || '';
      const meaning0 = getSymbolMeaning(symbol0);
      const labelValue0 = symbol0 || '';
      
      const customCells0 = finalNames.map((_, cIdx) => {
        const val = record.customCols?.[cIdx]?.[h * 2] || '';
        return `"${val}"`;
      });
      
      lines.push([
        `"${dateStr}"`,
        `"${dayOfWeek}"`,
        `"${hourLabel}時00分"`,
        `"${effSym0 || labelValue0}"`,
        `"${meaning0}"`,
        ...customCells0
      ].join(','));
      
      // 30分
      const symbol30 = record[h * 2 + 1];
      const effSym30 = getEffectiveSymbol(symbol30, stamps) || '';
      const meaning30 = getSymbolMeaning(symbol30);
      const labelValue30 = symbol30 || '';
      
      const customCells30 = finalNames.map((_, cIdx) => {
        const val = record.customCols?.[cIdx]?.[h * 2 + 1] || '';
        return `"${val}"`;
      });
      
      lines.push([
        `"${dateStr}"`,
        `"${dayOfWeek}"`,
        `"${hourLabel}時30分"`,
        `"${effSym30 || labelValue30}"`,
        `"${meaning30}"`,
        ...customCells30
      ].join(','));
    }
  });

  return lines.join('\r\n');
}

/**
 * Generates and downloads a CSV of the sleep record for Japanese Microsoft Excel (UTF-8 with BOM)
 */
export async function exportToCSV(
  records: DailyRecords, 
  forSingleDate?: string, 
  forceDownload: boolean = true, 
  customColNames?: string[], 
  stamps: StampConfig[] = []
): Promise<void> {
  const csvContentRaw = generateCSVText(records, forSingleDate, customColNames, stamps);
  
  // Create download link with BOM to prevent Microsoft Excel Japanese letter garbling
  const csvContent = '\uFEFF' + csvContentRaw;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const fileName = forSingleDate 
    ? `睡眠記録_${forSingleDate}.csv` 
    : `睡眠記録_全期間.csv`;
    
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (!forceDownload && isMobile && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'text/csv' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: '睡眠記録データのCSVバックアップです。'
        });
        return;
      }
    } catch (shareErr) {
      if (shareErr instanceof Error && shareErr.name === 'AbortError') {
        console.log('CSV sharing aborted by user');
        return;
      }
      console.warn('Web Share API failed, falling back to traditional download:', shareErr);
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
}

/**
 * csvService.ts
 * Handled only standard single-date CSV downloads.
 * Full backups are handled exclusively via the JSON format (on local download and Google Drive).
 */


