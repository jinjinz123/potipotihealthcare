import React, { useState, useRef, useEffect } from 'react';
import { MentalRow } from '../types';
import { 
  Heart, 
  ThumbsUp, 
  BedDouble, 
  Zap, 
  Brain, 
  Plus, 
  Settings, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Check, 
  ChevronRight,
  AlertTriangle,
  Smile
} from 'lucide-react';

export interface MentalGridProps {
  mentalRows: MentalRow[];
  records: any;
  selectedDate: string;
  onToggleScore: (rowId: string, score: number) => void;
  onAddRow: (name: string, description: string, icon: string, scaleType: 'bipolar' | 'severity') => void;
  onUpdateRow: (rowId: string, name: string, description: string, icon: string, customLabels?: { [score: number]: string }, scaleType?: 'bipolar' | 'severity') => void;
  onDeleteRow: (rowId: string, destinationRowId?: string) => void;
  onMoveRow: (rowId: string, direction: 'up' | 'down') => void;
  displayMode: 'vivid' | 'soft' | 'dark';
  activeRowId: string | null;
  onSetActiveRow: (rowId: string) => void;
}

// Evaluation levels configuration
export const SCORE_LEVELS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

// Score description labels generator based on the item type and evaluation scaleType
export const getSubLabel = (
  rowId: string, 
  score: number, 
  rowName?: string, 
  customLabels?: { [score: number]: string },
  scaleType: 'bipolar' | 'severity' = 'bipolar'
): string => {
  // If user configured a custom customized label, prioritize it
  if (customLabels && customLabels[score] && customLabels[score].trim() !== '') {
    return customLabels[score].trim();
  }

  // 1. 一方向評価 (severity)
  if (scaleType === 'severity') {
    switch (score) {
      case 1: return 'なし';
      case 2: return '少しある';
      case 3: return 'ある';
      case 4: return '強くある';
      case 5: return '非常に強くある';
      default: return 'なし';
    }
  }

  // 2. 双方向評価 (bipolar) のデフォルト
  // +5 極めて高い, +4 非常に高い, +3 高い, +2 やや高い, +1 少し高い, 0 ニュートラル, -1 少し低い, -2 やや低い, -3 低い, -4 非常に低い, -5 極めて低い
  switch (score) {
    case 5: return '極めて高い';
    case 4: return '非常に高い';
    case 3: return '高い';
    case 2: return 'やや高い';
    case 1: return '少し高い';
    case 0: return 'ニュートラル';
    case -1: return '少し低い';
    case -2: return 'やや低い';
    case -3: return '低い';
    case -4: return '非常に低い';
    case -5: return '極めて低い';
    default: return 'ニュートラル';
  }
};

// Helper to retrieve color configs for tag backgrounds and dynamic color temperatures
export const getRatingColorInfo = (
  score: number, 
  displayMode: 'vivid' | 'soft' | 'dark' = 'vivid',
  scaleType: 'bipolar' | 'severity' = 'bipolar'
) => {
  // -5や1は静かな濃い青を基調とし、+5や5は火山のような濃い赤を基調として、数値に合わせてグラデーションをつけていく。
  
  if (scaleType === 'severity') {
    switch (score) {
      case 1: // 良好・正常（緑）
        return {
          bg: 'bg-[#22c55e] text-white font-black',
          textColor: 'text-white',
          borderColor: 'border-[#22c55e]',
          faceBg: '#22c55e',
          faceStroke: '#000000',
          activeGlow: 'ring-4 ring-[#22c55e]/50 shadow-[#22c55e]/30'
        };
      case 2: // 薄い青・青緑
        return {
          bg: 'bg-[#4c84eb] text-white font-bold',
          textColor: 'text-white',
          borderColor: 'border-[#4c84eb]',
          faceBg: '#4c84eb',
          faceStroke: '#000000',
          activeGlow: 'ring-4 ring-[#4c84eb]/50 shadow-[#4c84eb]/30'
        };
      case 3: // 黄色
        return {
          bg: 'bg-[#eab308] text-white font-bold',
          textColor: 'text-white',
          borderColor: 'border-[#eab308]',
          faceBg: '#eab308',
          faceStroke: '#000000',
          activeGlow: 'ring-4 ring-[#eab308]/50 shadow-[#eab308]/30'
        };
      case 4: // 明るいオレンジ
        return {
          bg: 'bg-[#ea580c] text-white font-bold',
          textColor: 'text-white',
          borderColor: 'border-[#ea580c]',
          faceBg: '#ea580c',
          faceStroke: '#000000',
          activeGlow: 'ring-4 ring-[#ea580c]/50 shadow-[#ea580c]/30'
        };
      case 5: // 火山のような濃い赤
        return {
          bg: 'bg-[#850d0d] text-white font-black',
          textColor: 'text-white',
          borderColor: 'border-[#850d0d]',
          faceBg: '#850d0d',
          faceStroke: '#000000',
          activeGlow: 'ring-4 ring-[#850d0d]/50 shadow-[#850d0d]/30'
        };
      default:
        return {
          bg: 'bg-zinc-800 text-slate-300',
          textColor: 'text-slate-400',
          borderColor: 'border-zinc-700',
          faceBg: '#27272a',
          faceStroke: '#000000',
          activeGlow: ''
        };
    }
  }

  // 双方向 (bipolar) -5 〜 +5
  switch (score) {
    case -5: // 静かな濃い青
      return {
        bg: 'bg-[#1a306c] text-white font-black',
        textColor: 'text-white',
        borderColor: 'border-[#1a306c]',
        faceBg: '#1a306c',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#1a306c]/50 shadow-[#1a306c]/30'
      };
    case -4: // やや濃い青
      return {
        bg: 'bg-[#20408c] text-white font-black',
        textColor: 'text-white',
        borderColor: 'border-[#20408c]',
        faceBg: '#20408c',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#20408c]/50 shadow-[#20408c]/30'
      };
    case -3: // 黄色
      return {
        bg: 'bg-[#eab308] text-white font-bold',
        textColor: 'text-white',
        borderColor: 'border-[#eab308]',
        faceBg: '#eab308',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#eab308]/50 shadow-[#eab308]/30'
      };
    case -2: // やや明るい青
      return {
        bg: 'bg-[#3b6cd8] text-white font-bold',
        textColor: 'text-white',
        borderColor: 'border-[#3b6cd8]',
        faceBg: '#3b6cd8',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#3b6cd8]/50 shadow-[#3b6cd8]/30'
      };
    case -1: // 薄い青・青緑
      return {
        bg: 'bg-[#4c84eb] text-white font-bold',
        textColor: 'text-white',
        borderColor: 'border-[#4c84eb]',
        faceBg: '#4c84eb',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#4c84eb]/50 shadow-[#4c84eb]/30'
      };
    case 0: // ニュートラル（緑）
      return {
        bg: 'bg-[#22c55e] text-white font-medium',
        textColor: 'text-white',
        borderColor: 'border-[#22c55e]',
        faceBg: '#22c55e',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#22c55e]/50 shadow-[#22c55e]/30'
      };
    case 1: // 少し高い (黄橙)
      return {
        bg: 'bg-[#d97706] text-white font-bold',
        textColor: 'text-white',
        borderColor: 'border-[#d97706]',
        faceBg: '#d97706',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#d97706]/50 shadow-[#d97706]/30'
      };
    case 2: // やや高い (明るいオレンジ)
      return {
        bg: 'bg-[#ea580c] text-white font-bold',
        textColor: 'text-white',
        borderColor: 'border-[#ea580c]',
        faceBg: '#ea580c',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#ea580c]/50 shadow-[#ea580c]/30'
      };
    case 3: // 黄色
      return {
        bg: 'bg-[#eab308] text-white font-bold',
        textColor: 'text-white',
        borderColor: 'border-[#eab308]',
        faceBg: '#eab308',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#eab308]/50 shadow-[#eab308]/30'
      };
    case 4: // 非常に高い (赤)
      return {
        bg: 'bg-[#b91c1c] text-white font-black',
        textColor: 'text-white',
        borderColor: 'border-[#b91c1c]',
        faceBg: '#b91c1c',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#b91c1c]/50 shadow-[#b91c1c]/30'
      };
    case 5: // 極めて高い (火山のような濃い赤)
      return {
        bg: 'bg-[#850d0d] text-white font-black',
        textColor: 'text-white',
        borderColor: 'border-[#850d0d]',
        faceBg: '#850d0d',
        faceStroke: '#000000',
        activeGlow: 'ring-4 ring-[#850d0d]/50 shadow-[#850d0d]/30'
      };
    default:
      return {
        bg: 'bg-zinc-800 text-slate-350',
        textColor: 'text-slate-400',
        borderColor: 'border-zinc-750',
        faceBg: '#27272a',
        faceStroke: '#000000',
        activeGlow: ''
      };
  }
};

// Render SVG Face representations of score
export const renderEvaluationFace = (score: number, isSelected: boolean, displayMode: 'vivid' | 'soft' | 'dark' = 'vivid') => {
  return null;
  // @ts-ignore
  const info = getRatingColorInfo(score, displayMode);
  const fillHex = info.faceBg;
  const strokeHex = info.faceStroke;

  switch (score) {
    case -5:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Sad / Crying Eyebrows in White */}
          <path d="M10,13.5 L14,11.5" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22,13.5 L18,11.5" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
          
          {/* Eyes (Black Dots) */}
          <circle cx="11.5" cy="16.5" r="2" fill="#000000" />
          <circle cx="20.5" cy="16.5" r="2" fill="#000000" />
          
          {/* White Tears with Black Border */}
          <path d="M10,17.5 C8.5,19 8.5,22.5 10,23 C11.5,23.5 11.5,20 10,17.5" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
          <path d="M22,17.5 C23.5,19 23.5,22.5 22,23 C20.5,23.5 20.5,20 22,17.5" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
          
          {/* Downward Sad Curved Mouth */}
          <path d="M11,23.5 Q16,19 21,23.5" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case -3:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Sad Slanted Eyebrows */}
          <path d="M9.5,13.5 L13.5,11.5" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <path d="M22.5,13.5 L18.5,11.5" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          
          {/* Eyes */}
          <circle cx="11.5" cy="16.5" r="2" fill="#000000" />
          <circle cx="20.5" cy="16.5" r="2" fill="#000000" />
          
          {/* Sad downward Mouth */}
          <path d="M11.5,23 Q16,18.5 20.5,23" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case -1:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Sad Slanted Eyebrows, smaller & subtle */}
          <path d="M10,14 L13,12.5" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22,14 L19,12.5" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
          
          {/* Eyes */}
          <circle cx="11.5" cy="17" r="2" fill="#000000" />
          <circle cx="20.5" cy="17" r="2" fill="#000000" />
          
          {/* Slight downward/unhappy Mouth */}
          <path d="M12.5,22.5 Q16,19.5 19.5,22.5" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 0:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Eyes */}
          <circle cx="11.5" cy="16.5" r="2" fill="#000000" />
          <circle cx="20.5" cy="16.5" r="2" fill="#000000" />
          
          {/* Straight Flat Mouth */}
          <path d="M12,22 H20" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Eyes */}
          <circle cx="11.5" cy="16.5" r="2" fill="#000000" />
          <circle cx="20.5" cy="16.5" r="2" fill="#000000" />
          
          {/* Gentle Smile Mouth */}
          <path d="M12,21 Q16,24.5 20,21" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Eyes */}
          <circle cx="11.5" cy="16" r="2" fill="#000000" />
          <circle cx="20.5" cy="16" r="2" fill="#000000" />
          
          {/* Smiling Opened Mouth (filled black) */}
          <path d="M11,18.5 Q16,25 21,18.5 Z" fill="#000000" stroke="#000000" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case 5:
      return (
        <svg viewBox="0 0 32 32" className="w-10 h-10 transition-transform duration-150 shrink-0" shapeRendering="geometricPrecision">
          {/* Face Circle */}
          <circle cx="16" cy="16" r="14" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          
          {/* Eyes */}
          <circle cx="11.5" cy="16" r="2" fill="#000000" />
          <circle cx="20.5" cy="16" r="2" fill="#000000" />
          
          {/* Big Open Laughing Mouth with teeth (filled with white, outline black) */}
          <path d="M10,18.5 Q16,26 22,18.5 Z" fill="#ffffff" stroke="#000000" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};

export default function MentalGrid({
  mentalRows,
  records,
  selectedDate,
  onToggleScore,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onMoveRow,
  displayMode,
  activeRowId,
  onSetActiveRow,
}: MentalGridProps) {
  // Config Modal State
  const [selectedRow, setSelectedRow] = useState<MentalRow | null>(null);
  const [typedName, setTypedName] = useState('');
  const [typedDesc, setTypedDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('heart');
  const [typedScaleType, setTypedScaleType] = useState<'bipolar' | 'severity'>('bipolar');
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'move'>('all');
  const [selectedDestRowId, setSelectedDestRowId] = useState<string>('');
  const [customLabelsState, setCustomLabelsState] = useState<{ [score: number]: string }>({});
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(false);

  // Add Item Modal State
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('heart');
  const [newScaleType, setNewScaleType] = useState<'bipolar' | 'severity'>('bipolar');

  // Long press detection for seniors / touch users
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Rendering row icon based on row meta icon string
  const renderRowIcon = (iconName: string) => {
    switch (iconName) {
      case 'heart':
        return <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 fill-rose-500 shrink-0" />;
      case 'anxiety':
        return (
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0 border border-orange-200/50 text-sm sm:text-base leading-none">
            <span role="img" aria-label="不安・緊張">😟</span>
          </div>
        );
      case 'motivation':
        return <ThumbsUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 fill-emerald-500 shrink-0" />;
      case 'bed':
        return <BedDouble className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 shrink-0" />;
      case 'energy':
        return <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500 shrink-0" />;
      case 'thought_state':
        return <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500 shrink-0" />;
      default:
        // custom icons
        switch (iconName) {
          case 'star':
            return <span className="text-base sm:text-lg leading-none">⭐</span>;
          case 'check':
            return <div className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-[8px] sm:text-[10px]">✓</div>;
          case 'pill':
            return <span className="text-base sm:text-lg leading-none">💊</span>;
          case 'alert':
            return <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />;
          case 'plus':
            return <span className="text-base sm:text-lg leading-none">➕</span>;
          default:
            return <span className="text-base sm:text-lg leading-none">📝</span>;
        }
    }
  };

  // Open config dialog for custom/general rows settings editing
  const openRowConfigDialog = (row: MentalRow) => {
    setSelectedRow(row);
    setTypedName(row.name);
    setTypedDesc(row.description);
    setSelectedIcon(row.icon || 'heart');
    setTypedScaleType(row.scaleType || 'bipolar');
    setIsDeleteConfirm(false);
    setDeleteMode('all');
    const otherRows = mentalRows.filter(r => r.id !== row.id);
    setSelectedDestRowId(otherRows.length > 0 ? otherRows[0].id : '');
    
    // Initialize custom labels state
    setCustomLabelsState(row.customLabels || {
      '-5': '', '-4': '', '-3': '', '-2': '', '-1': '', '0': '', '1': '', '2': '', '3': '', '4': '', '5': ''
    });
    setIsLabelsExpanded(false);
  };

  // Touch and Long Press Handlers for Column 1 (supports both Touch and Mouse)
  const startLongPress = (row: MentalRow) => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      openRowConfigDialog(row);
      longPressTimeoutRef.current = null;
    }, 600); // 600ms hold represents deep/long press
  };

  const endLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleTouchMove = () => {
    endLongPress();
  };

  // Prevent default scroll behavior on prolonged touch triggers
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="flex flex-1 p-2 bg-[#f8f9fa] dark:bg-[#121212] overflow-hidden min-h-0 relative select-none font-sans" 
      id="mental-grid-root"
    >
      <style>{`
        @keyframes activeOutlineBlink {
          0%, 100% {
            box-shadow: inset 0 0 0 2px #4f46e5, 0 0 0 4px rgba(79, 70, 229, 0.9);
            z-index: 20;
          }
          50% {
            box-shadow: inset 0 0 0 2.5px #fbbf24, 0 0 0 4.5px rgba(251, 191, 36, 0.95);
            z-index: 20;
          }
        }
        .active-mental-row-pulse {
          animation: activeOutlineBlink 1.1s infinite ease-in-out;
          border-color: transparent !important;
        }
      `}</style>
      <div className={`w-full flex flex-col border rounded-3xl overflow-hidden shadow-xs shrink-0 select-none relative transition-colors duration-300 ${
        displayMode === 'dark' ? 'border-[#49454F] bg-[#1C1B1F] text-[#e3e2e6]' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden select-none relative">
          
          {/* Main scroll plane along with right shadow indicator to visually note scrollability */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin select-none touch-auto relative">
            {/* Grid Container styled as a tidy two-column list, responsive on smartphone as well */}
            <div className="w-full flex flex-col divide-y divide-slate-100 dark:divide-[#49454F]">
              
              {/* Table Headline Row */}
              <div className={`flex flex-row items-stretch select-none text-center text-xs font-black h-12 sticky top-0 z-30 transition-colors duration-300 ${
                displayMode === 'dark' 
                  ? 'bg-[#1C1B1F] border-b border-[#49454F] text-[#e6e1e5]' 
                  : 'bg-slate-100 border-b border-gray-200 text-slate-600'
              }`}>
                {/* Column 1 header: 質問項目 */}
                <div className={`w-[55%] sm:w-[60%] px-3 text-left flex items-center font-black text-xs sm:text-sm tracking-wide shrink-0 border-r transition-colors duration-300 ${
                  displayMode === 'dark' 
                    ? 'bg-[#1C1B1F] border-[#49454F] text-[#e6e1e5]' 
                    : 'bg-slate-100 border-gray-200 text-slate-700'
                }`}>
                  質問項目 (タップ選択 / 長押し設定)
                </div>
                {/* Column 2 header: 現在の評価説明 */}
                <div className={`flex-1 px-3 text-left flex items-center justify-start pl-4 sm:pl-10 font-black text-xs sm:text-sm tracking-wide shrink-0 transition-colors duration-300 ${
                  displayMode === 'dark' 
                    ? 'bg-[#1c1b1f] text-[#e6e1e5]' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  今日の状態（評価）
                </div>
              </div>
              
              {/* Items / Rows Body Loop */}
              <div className="flex flex-col flex-1 divide-y divide-slate-150 dark:divide-slate-800/60">
                {mentalRows.map((row) => {
                  const todayScore = records[selectedDate]?.[row.id] ?? null;
                  const hasAnySelection = todayScore !== null && todayScore !== undefined;
                  const isRowActive = activeRowId === row.id;

                  // Get color styling if selected
                  const ratingColor = hasAnySelection ? getRatingColorInfo(todayScore, displayMode, row.scaleType) : null;

                  return (
                    <div 
                      key={row.id} 
                      onClick={() => onSetActiveRow(row.id)}
                      style={{
                        backgroundColor: displayMode === 'dark' ? '#111827' : '#ffffff',
                      }}
                      className={`flex flex-row items-stretch transition-all duration-155 cursor-pointer relative ${
                        isRowActive 
                          ? (displayMode === 'dark' 
                              ? 'active-mental-row-pulse bg-slate-900/40 z-10 font-extrabold' 
                              : 'active-mental-row-pulse bg-indigo-50/25 z-10 font-bold')
                          : (displayMode === 'dark' 
                              ? 'hover:bg-slate-900/30' 
                              : 'hover:bg-slate-50/70')
                      }`}
                    >
                      {/* Active focusing left indicator bar */}
                      {isRowActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 z-30" />
                      )}

                      {/* COLUMN 1: Item descriptions with touch and long-press support */}
                      <div 
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          startLongPress(row);
                        }}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={endLongPress}
                        onTouchCancel={endLongPress}
                        onMouseDown={(e) => {
                          if (e.button === 0) { // Only Left Click
                            e.stopPropagation();
                            startLongPress(row);
                          }
                        }}
                        onMouseUp={endLongPress}
                        onMouseLeave={endLongPress}
                        className={`w-[55%] sm:w-[60%] px-3 py-3 flex flex-row items-center gap-2 sm:gap-3.5 border-r shrink-0 select-none ${
                          displayMode === 'dark' 
                            ? 'border-slate-800/50' 
                            : 'border-slate-100'
                        }`}
                        title="長押しで項目設定画面を表示"
                      >
                        {/* Selector/Focus Indicator or Row Index, plus render Row Icon */}
                        <div className="hidden sm:flex shrink-0 items-center justify-center relative touch-none">
                          {renderRowIcon(row.icon)}
                        </div>
                        
                        <div className="flex flex-col min-w-0 pr-1 select-none">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="text-[12.5px] sm:text-[14px] font-extrabold leading-tight truncate">
                              {row.name}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-normal truncate max-w-[130px] sm:max-w-[240px] mt-0.5">
                            {row.description || '詳細事項なし'}
                          </span>
                        </div>
                      </div>

                      {/* COLUMN 2: Score Badge & State Text Description (No face, dynamic color gradient background) */}
                      <div className="flex-1 flex flex-row items-center justify-start pl-4 sm:pl-10 gap-2 sm:gap-3 px-3 select-none">
                        {hasAnySelection ? (
                          <div className="flex items-center gap-1.5 sm:gap-3">
                            {/* Score badge with dynamic background */}
                            <div 
                              className={`px-2.5 py-1 rounded-xl flex items-center justify-center shrink-0 text-center text-xs font-black shadow-xs border transition-transform duration-100 ${ratingColor?.bg}`}
                              style={{
                                backgroundColor: ratingColor?.faceBg,
                                borderColor: ratingColor?.faceBg,
                              }}
                            >
                              <span className="text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.5)] text-[12.5px] font-black leading-none">
                                {row.scaleType === 'severity' ? todayScore : (todayScore > 0 ? `+${todayScore}` : todayScore)}
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              {/* Evaluation Label */}
                              <span className={`text-[12.5px] sm:text-[14px] font-black tracking-wide leading-tight truncate ${
                                displayMode === 'dark' ? 'text-[#e3e2e6]' : 'text-slate-900'
                              }`}>
                                {getSubLabel(row.id, todayScore, row.name, row.customLabels, row.scaleType)}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500/80 mt-0.5 leading-none">
                                {row.scaleType === 'severity' ? '範囲: 1〜5' : '範囲: -5〜+5'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-left flex flex-col items-start pl-0.5">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 italic">
                              未選択
                            </span>
                            {isRowActive && (
                              <span className="text-[9px] font-extrabold text-indigo-500 mt-0.5 tracking-tight animate-pulse leading-none">
                                右パレットでポチ入力
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Row action: Add Custom Row trigger button */}
              <div className="p-3.5 flex items-center justify-center font-sans w-full">
                <button
                  type="button"
                  onClick={() => {
                    setNewName('');
                    setNewDesc('');
                    setNewIcon('heart');
                    setNewScaleType('bipolar');
                    setIsAddingRow(true);
                  }}
                  className={`w-full max-w-md py-2.5 px-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 font-black text-xs sm:text-sm active:scale-98 transition-all hover:scale-101 cursor-pointer shadow-3xs ${
                    displayMode === 'dark'
                      ? 'bg-slate-900 border-slate-700/80 text-indigo-400 hover:bg-slate-800 hover:text-indigo-300'
                      : 'bg-indigo-50/50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-850'
                  }`}
                  id="excel-add-row-btn"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span className="truncate">項目（行）を追加する</span>
                </button>
              </div>

            </div>
          </div>

          {/* Smooth Right-Side Scroll Fade indicator */}
          <div className="absolute right-0 top-12 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-black/10 dark:from-black/40 to-transparent z-10" />

        </div>
      </div>

      {/* RATING ITEM SETTING OVERLAY MODAL */}
      {selectedRow && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[9990] p-4 font-sans border-none outline-hidden">
          <div className="bg-[#1C1B1F] text-[#E6E1E5] rounded-3xl w-full max-w-md shadow-2xl p-6 pb-8 border border-[#49454F] animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto scrollbar-thin">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#49454F]">
              <h3 className="text-base font-black text-[#e3e2e6] flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <span>健康項目「{selectedRow.name}」の設定</span>
              </h3>
              <div className="flex items-center gap-2">
                {!isDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirm(true)}
                    className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/45 text-red-400 transition-colors cursor-pointer flex items-center gap-1 active:scale-95 duration-100"
                    title="この項目を削除"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2]" />
                    <span className="text-[10px] font-black mr-0.5">削除</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedRow(null);
                    setIsDeleteConfirm(false);
                  }}
                  className="p-1 px-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-[#e3e2e6] transition-colors cursor-pointer"
                  title="閉じる"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>
            </div>

            {isDeleteConfirm ? (
              <div className="py-1 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 rounded-xl flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-red-600 dark:text-red-400">
                      項目「{selectedRow.name}」の削除確認
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5">
                      削除方法を選択してください
                    </p>
                  </div>
                </div>

                {/* 削除モード切り替え */}
                <div className="space-y-3 mb-6">
                  {/* オプション１：完全に削除 */}
                  <div 
                    onClick={() => setDeleteMode('all')}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      deleteMode === 'all'
                        ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input 
                        type="radio" 
                        name="deleteMode" 
                        checked={deleteMode === 'all'}
                        onChange={() => setDeleteMode('all')}
                        className="mt-1 accent-red-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                          1. 項目と記録データを完全に削除
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                          項目「{selectedRow.name}」と、これまでに記録された過去のすべてのデータが完全に消去されます。
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* オプション２：他項目へ移動 */}
                  {mentalRows.filter(r => r.id !== selectedRow.id).length > 0 ? (
                    <div 
                      onClick={() => setDeleteMode('move')}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        deleteMode === 'move'
                          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input 
                          type="radio" 
                          name="deleteMode" 
                          checked={deleteMode === 'move'}
                          onChange={() => setDeleteMode('move')}
                          className="mt-1 accent-indigo-500 cursor-pointer"
                        />
                        <div className="w-full">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                            2. 項目を削除し、データを別項目へ移動
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                            この項目は削除されますが、過去のデータは選んだ項目に引き継がれます（同日データは移動元を優先）。
                          </span>

                          {/* 移動先セレクター */}
                          {deleteMode === 'move' && (
                            <div className="mt-3 leading-none" onClick={(e) => e.stopPropagation()}>
                              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-wider">
                                移動先の項目を選択：
                              </label>
                              <select
                                value={selectedDestRowId}
                                onChange={(e) => setSelectedDestRowId(e.target.value)}
                                className="w-full bg-white border border-slate-300 text-black rounded-xl px-2.5 py-1.5 text-xs font-black focus:outline-hidden transition-all focus:border-indigo-500"
                              >
                                {mentalRows
                                  .filter(r => r.id !== selectedRow.id)
                                  .map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-60">
                      <span className="text-[10px] text-slate-450 block italic text-center">
                        移動できる他の項目がないため、データ移動は選択できません
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirm(false)}
                    className="flex-1 px-5 py-2 border border-slate-250 dark:border-slate-700 text-xs font-extrabold text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-95 transition-all text-center"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteRow(selectedRow.id, deleteMode === 'move' ? selectedDestRowId : undefined);
                      setSelectedRow(null);
                      setIsDeleteConfirm(false);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-[#e3e2e6] font-extrabold text-xs py-2 px-5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>本当に削除する</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. Item description preset */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-2 uppercase tracking-wider">
                    おすすめの健康タグから選択
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['焦燥感', '希死念慮', '幻聴', '食欲', '集中力', 'イライラ', '頭痛有り', '疲労感', '読書時間', '散歩した', '服薬完了', '適度な運動'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setTypedName(preset);
                          // Guess some description & scale settings
                          if (preset === '焦燥感') {
                            setTypedDesc('イライラや焦りは？');
                            setTypedScaleType('severity');
                          } else if (preset === '希死念慮') {
                            setTypedDesc('希死念慮の強さは？');
                            setTypedScaleType('severity');
                          } else if (preset === '幻聴') {
                            setTypedDesc('幻聴の多さは？');
                            setTypedScaleType('severity');
                          } else if (preset === '食欲') {
                            setTypedDesc('ご飯は食べられましたか？');
                            setTypedScaleType('bipolar');
                          } else if (preset === '集中力') {
                            setTypedDesc('物事への熱中は？');
                            setTypedScaleType('bipolar');
                          } else if (preset === '疲労感') {
                            setTypedDesc('体の疲れは？');
                            setTypedScaleType('severity');
                          } else if (preset === '服薬完了') {
                            setTypedDesc('薬は飲みましたか？');
                            setTypedScaleType('severity');
                          } else {
                            setTypedDesc(`${preset}の状況は？`);
                            setTypedScaleType('bipolar');
                          }
                        }}
                        className={`py-1.5 px-1 bg-white dark:bg-slate-900 border text-[11px] font-black rounded-lg transition-all text-center truncate cursor-pointer ${
                          typedName === preset 
                            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/45 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Text Input fields */}
                <div>
                  <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-slate-400">
                    項目名（最大8文字）
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-black dark:text-[#e3e2e6] rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="焦燥感"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-slate-400">
                    説明・質問文（最大24文字）
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-black dark:text-[#e3e2e6] rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="焦りやイライラはどれくらい？"
                    value={typedDesc}
                    onChange={(e) => setTypedDesc(e.target.value)}
                  />
                </div>

                {/* 2.5 Scale Selection Toggle */}
                <div>
                  <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-[#98949f] dark:text-slate-400">
                    評価方式（スケール）
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-1 bg-[#121212] p-2 rounded-2xl border border-[#49454f]/55">
                    <button
                      type="button"
                      onClick={() => setTypedScaleType('bipolar')}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        typedScaleType === 'bipolar'
                          ? 'bg-indigo-650/40 border-indigo-400 text-indigo-300 ring-1 ring-indigo-400'
                          : 'bg-[#1c1b1f] border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-black">双方向評価</span>
                      <span className="text-[8.5px] font-bold opacity-80">-5 〜 +5 (11段階)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypedScaleType('severity')}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        typedScaleType === 'severity'
                          ? 'bg-indigo-650/40 border-indigo-400 text-indigo-300 ring-1 ring-indigo-400'
                          : 'bg-[#1c1b1f] border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-black">一方向評価</span>
                      <span className="text-[8.5px] font-bold opacity-80">1 〜 5 (5段階)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Icon Selection */}
                <div>
                  <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 block mb-1.5 uppercase tracking-wider">
                    項目のアイコン
                  </label>
                  <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                    {[
                      { key: 'heart', display: '❤️' },
                      { key: 'anxiety', display: '😟' },
                      { key: 'motivation', display: '👍' },
                      { key: 'bed', display: '🛌' },
                      { key: 'energy', display: '⚡' },
                      { key: 'thought_state', display: '🧠' },
                      { key: 'star', display: '⭐' },
                      { key: 'pill', display: '💊' },
                      { key: 'alert', display: '⚠️' },
                    ].map((ico) => (
                      <button
                        key={ico.key}
                        type="button"
                        onClick={() => setSelectedIcon(ico.key)}
                        className={`flex-1 text-center py-2 text-base rounded-lg transition-all cursor-pointer ${
                          selectedIcon === ico.key 
                            ? 'bg-indigo-600 text-[#e3e2e6] shadow-md font-bold' 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {ico.display}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3.5 Custom Evaluation Labels Accordion */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsLabelsExpanded(!isLabelsExpanded)}
                    className="w-full flex items-center justify-between py-2 px-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-85 transition-opacity cursor-pointer text-left focus:outline-hidden"
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      🏷️ 評価ラベルをさらに細かくカスタマイズする
                    </span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full text-indigo-600 dark:text-indigo-300 font-black">
                      {isLabelsExpanded ? '▲ 閉じる' : '▼ 展開する'}
                    </span>
                  </button>
                  
                  {isLabelsExpanded && (
                    <div className="mt-2 space-y-3 p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800 max-h-[220px] overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                        各評価レベル（スコア）のときに画面に表示したい言葉を自由に設定できます。<br />※空欄のまま保存すれば、これまで通りアプリの標準評価テキストが自動で適用されます。
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(typedScaleType === 'severity' ? [5, 4, 3, 2, 1] : [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5]).map((score) => {
                          const scoreLabel = typedScaleType === 'severity' ? `${score}` : (score > 0 ? `+${score}` : `${score}`);
                          const defaultText = getSubLabel(selectedRow.id, score, typedName, undefined, typedScaleType);
                          return (
                            <div key={score} className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 flex items-center gap-1 leading-none">
                                スコア {scoreLabel} のときの表現
                              </span>
                              <input
                                type="text"
                                placeholder={`自動: ${defaultText}`}
                                value={customLabelsState[score] || ''}
                                onChange={(e) => {
                                  setCustomLabelsState(prev => ({
                                    ...prev,
                                    [score]: e.target.value
                                  }));
                                }}
                                className={`w-full rounded-lg px-2.5 py-1.5 text-[11px] font-bold focus:outline-hidden transition-all ${
                                  displayMode === 'dark'
                                    ? 'bg-slate-900 border border-slate-800 text-[#e3e2e6] focus:border-indigo-500'
                                    : 'bg-white border border-slate-200 text-slate-700'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Swapping Row Position */}
                <div className="border-t border-slate-150 dark:border-slate-800 pt-3 flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 block uppercase tracking-wider text-left">
                    順番の移動（エクセル的な行移動）
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onMoveRow(selectedRow.id, 'up');
                        setSelectedRow(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-all bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      <span>1つ上へ移動</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMoveRow(selectedRow.id, 'down');
                        setSelectedRow(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-all bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                      <span>1つ下へ移動</span>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex justify-between gap-2.5 items-center">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirm(true)}
                    className="px-3 py-2 border border-rose-200 text-xs font-black text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-650 flex items-center gap-1 cursor-pointer active:scale-95 duration-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>削除する</span>
                  </button>

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRow(null);
                        setIsDeleteConfirm(false);
                      }}
                      className="px-5 py-2 border border-slate-250 dark:border-slate-700 text-xs font-extrabold text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-95 Transition-all"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!typedName.trim()) return;
                        const slicedLabels: { [score: number]: string } = {};
                        Object.keys(customLabelsState).forEach(k => {
                          const num = Number(k);
                          if (customLabelsState[num] !== undefined) {
                            slicedLabels[num] = customLabelsState[num].slice(0, 10);
                          }
                        });
                        onUpdateRow(selectedRow.id, typedName.trim().slice(0, 8), typedDesc.trim().slice(0, 24), selectedIcon, slicedLabels, typedScaleType);
                        setSelectedRow(null);
                        setIsDeleteConfirm(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-[#e3e2e6] font-extrabold text-xs py-2 px-6 rounded-xl shadow-md cursor-pointer flex items-center gap-1 active:scale-95 transition-all text-center justify-center min-w-[120px]"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>変更を保存する (OK)</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* NEW RATING ITEM CREATION MODAL */}
      {isAddingRow && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[9990] p-4 font-sans border-none outline-hidden">
          <div className="bg-[#1C1B1F] text-[#E6E1E5] rounded-3xl w-full max-w-md shadow-2xl p-6 border border-[#49454F] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#49454F]">
              <h3 className="text-base font-black text-[#e3e2e6] flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400 stroke-[2.5]" />
                <span>新しい健康項目の追加（行の追加）</span>
              </h3>
              <button 
                onClick={() => setIsAddingRow(false)}
                className="p-1 px-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-[#e3e2e6] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Preset selectors for row creation */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-2 uppercase tracking-wider">
                  おすすめのテンプレート
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: '焦燥感', desc: 'イライラや焦りは？', ico: 'anxiety' },
                    { key: '希死念慮', desc: '希死念慮の強さは？', ico: 'alert' },
                    { key: '幻聴', desc: '幻聴の多さは？', ico: 'alert' },
                    { key: '食欲', desc: 'ご飯は食べられましたか？', ico: 'heart' },
                    { key: '集中力', desc: '物事への熱中は？', ico: 'thought_state' },
                    { key: '疲労感', desc: '体の疲れやだるさは？', ico: 'energy' },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setNewName(preset.key);
                        setNewDesc(preset.desc);
                        setNewIcon(preset.ico);
                        // Auto-detect recommended scale type based on key keyword
                        if (preset.key === '焦燥感' || preset.key === '希死念慮' || preset.key === '幻聴' || preset.key === '倦怠感' || preset.key === '不安') {
                          setNewScaleType('severity');
                        } else {
                          setNewScaleType('bipolar');
                        }
                      }}
                      className="py-2 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-extrabold rounded-lg transition-all text-center truncate hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer text-slate-700 dark:text-slate-300 active:scale-95"
                    >
                      {preset.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Entry inputs */}
              <div>
                <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-slate-400">
                  項目名（最大8文字、必須）
                </label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-black dark:text-[#e3e2e6] rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="例：希死念慮、焦燥感 など"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-slate-400">
                  説明文・状態の問いかけ（最大24文字）
                </label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-black dark:text-[#e3e2e6] rounded-xl px-3 py-2 text-xs font-black focus:outline-hidden focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  placeholder="例：今日一日の焦りやイライラは？"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              {/* Scale Selection Toggle */}
              <div>
                <label className="text-[10px] font-black block mb-1 uppercase tracking-wider text-[#98949f] dark:text-slate-400">
                  評価方式（スケール）
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1 bg-[#121212] p-2 rounded-2xl border border-[#49454f]/55">
                  <button
                    type="button"
                    onClick={() => setNewScaleType('bipolar')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      newScaleType === 'bipolar'
                        ? 'bg-indigo-650/40 border-indigo-400 text-indigo-300 ring-1 ring-indigo-400'
                        : 'bg-[#1c1b1f] border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-black">双方向評価</span>
                    <span className="text-[8.5px] font-bold opacity-80">-5 〜 +5 (11段階)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewScaleType('severity')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      newScaleType === 'severity'
                        ? 'bg-indigo-650/40 border-indigo-400 text-indigo-300 ring-1 ring-indigo-400'
                        : 'bg-[#1c1b1f] border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-black">一方向評価</span>
                    <span className="text-[8.5px] font-bold opacity-80">1 〜 5 (5段階)</span>
                  </button>
                </div>
              </div>

              {/* Icon selectors */}
              <div>
                <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 block mb-1.5 uppercase tracking-wider">
                  表示するアイコン
                </label>
                <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                  {[
                    { key: 'heart', display: '❤️' },
                    { key: 'anxiety', display: '😟' },
                    { key: 'motivation', display: '👍' },
                    { key: 'bed', display: '🛌' },
                    { key: 'energy', display: '⚡' },
                    { key: 'thought_state', display: '🧠' },
                    { key: 'star', display: '⭐' },
                    { key: 'pill', display: '💊' },
                    { key: 'alert', display: '⚠️' },
                  ].map((ico) => (
                    <button
                      key={ico.key}
                      type="button"
                      onClick={() => setNewIcon(ico.key)}
                      className={`flex-1 text-center py-2 text-base rounded-lg transition-all cursor-pointer ${
                        newIcon === ico.key 
                          ? 'bg-indigo-600 text-[#e3e2e6] shadow-md font-bold' 
                          : 'bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {ico.display}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="border-t border-slate-150 dark:border-slate-800 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddingRow(false)}
                  className="px-4.5 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={!newName.trim()}
                  onClick={() => {
                    if (!newName.trim()) return;
                    onAddRow(newName.trim().slice(0, 8), newDesc.trim().slice(0, 24) || `${newName.trim().slice(0, 8)}の状態は？`, newIcon, newScaleType);
                    setIsAddingRow(false);
                  }}
                  className={`font-extrabold text-xs py-2 px-5 rounded-xl shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    newName.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-[#e3e2e6] hover:scale-101'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-zinc-700 text-slate-350 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>この内容で追加する</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
