import React, { useEffect } from 'react';
import { ActiveTool, SleepSymbol } from '../types';
import { shiftDateString } from '../utils';

interface KeyboardShortcutsParams {
  gridMode: 'standard' | 'viewer' | 'mental';
  isSleepTabActive: boolean;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setActiveTool: (tool: ActiveTool) => void;
  setActiveSymbol: (symbol: SleepSymbol) => void;
  handleJumpToToday: () => void;
  showToast: (msg: string) => void;
}

export function useKeyboardShortcuts({
  gridMode,
  isSleepTabActive,
  setSelectedDate,
  setActiveTool,
  setActiveSymbol,
  handleJumpToToday,
  showToast
}: KeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          if (gridMode === 'standard') {
            break;
          }
          setSelectedDate((prev) => {
            const next = shiftDateString(prev, -1);
            showToast('◀ 前日の記録へ移動しました');
            return next;
          });
          break;
        case 'arrowright':
        case 'd':
          if (gridMode === 'standard') {
            break;
          }
          setSelectedDate((prev) => {
            const next = shiftDateString(prev, 1);
            showToast('▶ 翌日の記録へ移動しました');
            return next;
          });
          break;
        case 't':
          handleJumpToToday();
          break;
        case '1':
          if (!isSleepTabActive) break;
          setActiveTool('stamp');
          setActiveSymbol('★');
          showToast('🕒 就寝スタンプ (★) を選択しました');
          break;
        case '2':
          if (!isSleepTabActive) break;
          setActiveTool('stamp');
          setActiveSymbol('S');
          showToast('💤 睡眠スタンプ (S) を選択しました');
          break;
        case '3':
          if (!isSleepTabActive) break;
          setActiveTool('stamp');
          setActiveSymbol('×');
          showToast('⚡ 覚醒スタンプ (×) を選択しました');
          break;
        case '4':
          if (!isSleepTabActive) break;
          setActiveTool('stamp');
          setActiveSymbol('○');
          showToast('☀️ 起床スタンプ (○) を選択しました');
          break;
        case '5':
          if (!isSleepTabActive) break;
          setActiveTool('stamp');
          setActiveSymbol('－');
          showToast('🛌 横寝スタンプ (－) を選択しました');
          break;
        case '6':
        case 'e':
          if (!isSleepTabActive) break;
          setActiveTool('eraser');
          showToast('🧽 消しゴムツールを選択しました');
          break;
        case 'm':
          e.preventDefault();
          const memoArea = document.getElementById('memo-textarea');
          if (memoArea) {
            memoArea.focus();
            (memoArea as HTMLTextAreaElement).select();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridMode, isSleepTabActive, setSelectedDate, setActiveTool, setActiveSymbol, handleJumpToToday, showToast]);
}
