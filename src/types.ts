/**
 * Sleep Record App Type Definitions
 */

export type SleepSymbol = string | null; // Support legacy single character symbols or dynamic stamp ids

export interface StampConfig {
  id: string;
  name: string;
  symbol: string; // Underling symbol for calculations & stats, user enters 1 character
  color: string; // Theme color key
}

export interface SymbolConfig {
  symbol: SleepSymbol;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

export interface DayRecord {
  [slotIndex: number]: SleepSymbol; // 0 to 47 represent 30-minute slots
  memo?: string;
  customCols?: {
    [colIdx: string]: {
      [slotIndex: string]: SleepSymbol;
    };
  };
}

export interface DailyRecords {
  [dateStr: string]: DayRecord; // keys are ISO date strings YYYY-MM-DD
}

export type ActiveTool = 'stamp' | 'eraser';

export type HourRepresentation = '1-24' | '0-23';

export interface MentalRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  scaleType?: 'bipolar' | 'severity';
  customLabels?: { [score: number]: string };
  category?: string;
}

export interface ReportBlock {
  id: string;
  num: number;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  text: string;
  fontSize?: 'sm' | 'md' | 'lg';
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  type?: 'text' | 'component';
  componentType?: 'mood' | 'activity' | 'stats';
}


