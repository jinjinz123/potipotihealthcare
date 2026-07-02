import React, { useState, useRef } from 'react';
import { ReportBlock, DailyRecords, StampConfig, MentalRow } from '../types';
import { MoodTrendGraph, ActivityEnergyGraph, ClinicalDataTable } from './EmbeddedComponents';

interface ReportBlockItemProps {
  key?: string;
  block: ReportBlock;
  blocks: ReportBlock[];
  editingBlockId: string | null;
  viewerSubScreen: 'menu' | 'viewer' | 'report' | 'report_preview';
  zoomRate: number;
  setEditingBlockId: (id: string | null) => void;
  setTextEditingBlockId: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  setBlocks: any;
  setUndoStackBlocks: any;
  records?: DailyRecords;
  actualSleepRecords?: DailyRecords;
  mentalRecords?: DailyRecords;
  mentalRows?: MentalRow[];
  actualSleepStamps?: StampConfig[];
  selectedDate?: string;
  paddingTopBottom?: number;
  paddingLeftRight?: number;
}

export default function ReportBlockItem({
  block,
  blocks,
  editingBlockId,
  viewerSubScreen,
  zoomRate,
  setEditingBlockId,
  setTextEditingBlockId,
  onDeleteBlock,
  setBlocks,
  setUndoStackBlocks,
  records,
  actualSleepRecords,
  mentalRecords,
  mentalRows,
  actualSleepStamps,
  selectedDate,
  paddingTopBottom = 15,
  paddingLeftRight = 15,
}: ReportBlockItemProps) {
  // Local implementation of getFontSizeClass to prevent strict Prop variance issues
  const getFontSizeClass = (fontSize?: 'sm' | 'md' | 'lg') => {
    if (fontSize === 'md') return 'text-[16px] sm:text-[16px]';
    if (fontSize === 'lg') return 'text-[24px] sm:text-[24px]';
    return 'text-[12px] sm:text-[12px]';
  };
  // Move / Drag state & refs
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const dragStartPointer = useRef({ x: 0, y: 0 });
  const dragStartCoords = useRef({ startCol: 0, startRow: 0, endCol: 0, endRow: 0 });
  const hasPushedUndoDrag = useRef(false);

  // Resize state & refs
  const [isResizingBlock, setIsResizingBlock] = useState(false);
  const resizeStartPointer = useRef({ x: 0, y: 0 });
  const resizeStartCoords = useRef({ endCol: 0, endRow: 0 });
  const hasPushedUndoResize = useRef(false);

  // Block Pointer Move / Drag Handler
  const handleBlockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewerSubScreen !== 'report') return;
    
    // Do not initiate drag if pointer down is on interactive components
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.resize-handle')) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingBlock(true);
    hasPushedUndoDrag.current = false;

    dragStartPointer.current = { x: e.clientX, y: e.clientY };
    dragStartCoords.current = {
      startCol: block.startCol,
      startRow: block.startRow,
      endCol: block.endCol,
      endRow: block.endRow,
    };

    e.stopPropagation();
  };

  const handleBlockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBlock) return;

    const deltaX = (e.clientX - dragStartPointer.current.x) / zoomRate;
    const deltaY = (e.clientY - dragStartPointer.current.y) / zoomRate;

    // Grid size is 20px
    const deltaCol = Math.round(deltaX / 20);
    const deltaRow = Math.round(deltaY / 20);

    if (deltaCol === 0 && deltaRow === 0) return;

    const widthCols = dragStartCoords.current.endCol - dragStartCoords.current.startCol;
    const heightRows = dragStartCoords.current.endRow - dragStartCoords.current.startRow;

    let newStartCol = dragStartCoords.current.startCol + deltaCol;
    let newStartRow = dragStartCoords.current.startRow + deltaRow;

    // Boundaries are 0 to 38 for columns, 0 to 54 for rows
    newStartCol = Math.max(0, Math.min(38 - widthCols, newStartCol));
    newStartRow = Math.max(0, Math.min(54 - heightRows, newStartRow));

    const newEndCol = newStartCol + widthCols;
    const newEndRow = newStartRow + heightRows;

    // Check if anything actually changed from current block position
    if (
      newStartCol === block.startCol &&
      newStartRow === block.startRow &&
      newEndCol === block.endCol &&
      newEndRow === block.endRow
    ) {
      return;
    }

    // Push to undo stack once per drag action
    if (!hasPushedUndoDrag.current) {
      setUndoStackBlocks(prev => [...prev, blocks]);
      hasPushedUndoDrag.current = true;
    }

    const updated = blocks.map(b =>
      b.id === block.id
        ? {
            ...b,
            startCol: newStartCol,
            startRow: newStartRow,
            endCol: newEndCol,
            endRow: newEndRow,
          }
        : b
    );
    setBlocks(updated);
  };

  const handleBlockPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBlock) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDraggingBlock(false);

    // If movement is very small, treat as a direct selection tap/click
    const deltaX = Math.abs(e.clientX - dragStartPointer.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPointer.current.y);
    if (deltaX < 5 && deltaY < 5) {
      if (isReportMode) {
        setEditingBlockId(block.id);
      }
    }

    if (hasPushedUndoDrag.current) {
      localStorage.setItem('pochilog_report_blocks', JSON.stringify(blocks));
    }
  };

  // Resize Handler
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingBlock(true);
    hasPushedUndoResize.current = false;

    resizeStartPointer.current = { x: e.clientX, y: e.clientY };
    resizeStartCoords.current = {
      endCol: block.endCol,
      endRow: block.endRow,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingBlock) return;
    e.stopPropagation();

    const deltaX = (e.clientX - resizeStartPointer.current.x) / zoomRate;
    const deltaY = (e.clientY - resizeStartPointer.current.y) / zoomRate;

    const deltaCol = Math.round(deltaX / 20);
    const deltaRow = Math.round(deltaY / 20);

    let newEndCol = resizeStartCoords.current.endCol + deltaCol;
    let newEndRow = resizeStartCoords.current.endRow + deltaRow;

    // Width and height must be at least 1 cell, ends must be within boundaries
    newEndCol = Math.max(block.startCol, Math.min(38, newEndCol));
    newEndRow = Math.max(block.startRow, Math.min(54, newEndRow));

    if (newEndCol === block.endCol && newEndRow === block.endRow) {
      return;
    }

    // Push to undo stack once per resize action
    if (!hasPushedUndoResize.current) {
      setUndoStackBlocks(prev => [...prev, blocks]);
      hasPushedUndoResize.current = true;
    }

    const updated = blocks.map(b =>
      b.id === block.id
        ? {
            ...b,
            endCol: newEndCol,
            endRow: newEndRow,
          }
        : b
    );
    setBlocks(updated);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingBlock) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingBlock(false);

    if (hasPushedUndoResize.current) {
      localStorage.setItem('pochilog_report_blocks', JSON.stringify(blocks));
    }
  };

  const isEditing = editingBlockId === block.id;
  const isReportMode = viewerSubScreen === 'report';
  const isPreview = viewerSubScreen === 'report_preview';

  // 基本座標
  const sCol = typeof block.startCol === 'number' ? block.startCol : (parseInt(block.startCol, 10) || 0);
  const eCol = typeof block.endCol === 'number' ? block.endCol : (parseInt(block.endCol, 10) || 0);
  const sRow = typeof block.startRow === 'number' ? block.startRow : (parseInt(block.startRow, 10) || 0);
  const eRow = typeof block.endRow === 'number' ? block.endRow : (parseInt(block.endRow, 10) || 0);

  let leftPx = sCol * 20;
  let topPx = sRow * 20;
  let widthPx = (eCol - sCol + 1) * 20;
  let heightPx = (eRow - sRow + 1) * 20;

  const safePaddingLr = (typeof paddingLeftRight === 'number' && !isNaN(paddingLeftRight)) ? paddingLeftRight : 15;
  const safePaddingTb = (typeof paddingTopBottom === 'number' && !isNaN(paddingTopBottom)) ? paddingTopBottom : 15;

  if (isPreview) {
    const marginLeftPx = safePaddingLr * (780 / 210);
    const marginTopPx = safePaddingTb * (1100 / 297);

    const contentWidthPx = 780 - marginLeftPx * 2;
    const contentHeightPx = 1100 - marginTopPx * 2;

    leftPx = marginLeftPx + leftPx * (contentWidthPx / 780);
    topPx = marginTopPx + topPx * (contentHeightPx / 1100);
    widthPx = widthPx * (contentWidthPx / 780);
    heightPx = heightPx * (contentHeightPx / 1100);
  }

  return (
    <div
      onPointerDown={handleBlockPointerDown}
      onPointerMove={handleBlockPointerMove}
      onPointerUp={handleBlockPointerUp}
      className={`absolute ${
        isEditing
          ? 'border-2 border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-md z-30'
          : isReportMode
            ? isDraggingBlock
              ? 'border-2 border-orange-600 bg-orange-50/40 shadow-lg z-30 cursor-grabbing'
              : 'border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-slate-50/40 bg-white/80 hover:bg-white hover:shadow-md cursor-grab'
            : 'border border-slate-200 bg-white hover:shadow-md'
      } flex flex-col p-0 group transition-all select-none touch-none`}
      style={{
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        zIndex: isDraggingBlock || isResizingBlock ? 40 : 10,
        alignItems: 'stretch',
      }}
    >
      {/* Label and delete button positioned OUTSIDE above the top edge */}
      {isReportMode && (
        <div
          className="absolute bottom-full left-0 right-0 flex justify-between items-end pb-1 pointer-events-none"
          style={{ zIndex: 9999 }}
        >
          <div className="flex gap-1 pointer-events-auto">
            <span
              className={`font-bold px-1.5 py-0.5 rounded border shadow-xs leading-none text-[10px] select-none whitespace-nowrap transition-colors ${
                isEditing
                  ? 'bg-orange-600 text-white border-orange-500'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Block {block.num}
            </span>
            {isEditing && block.type !== 'component' && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setTextEditingBlockId(block.id);
                }}
                className="bg-orange-500 text-white hover:bg-orange-655 border border-orange-400 rounded leading-none transition-all cursor-pointer font-bold flex items-center justify-center h-5 px-1.5 text-[10px] select-none shadow-xs"
                title="文字を入力"
              >
                ✏️ 文字入力
              </button>
            )}
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteBlock(block.id);
            }}
            className="text-rose-600 bg-white hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded leading-none transition-all cursor-pointer font-bold flex items-center justify-center w-5 h-5 text-xs pointer-events-auto select-none shadow-xs"
            title="この枠を削除"
          >
            ✕
          </button>
        </div>
      )}

      {/* Text display mode or Embedded component mode */}
      <div
        onClick={(e) => {
          if (isReportMode) {
            e.stopPropagation();
            setEditingBlockId(block.id);
          }
        }}
        onDoubleClick={(e) => {
          if (isReportMode && block.type !== 'component') {
            e.stopPropagation();
            setEditingBlockId(block.id);
            setTextEditingBlockId(block.id);
          }
        }}
        className={`w-full h-full text-slate-900 font-sans p-0 leading-normal whitespace-pre-wrap overflow-y-auto break-words flex flex-col justify-center relative ${
          isReportMode ? 'cursor-pointer hover:bg-slate-100/40 rounded transition-colors' : ''
        }`}
        style={{
          alignItems: 'stretch',
          textAlign: block.align || 'left',
          fontFamily: block.fontFamily === 'monospace' ? '"JetBrains Mono", monospace' : block.fontFamily === 'serif' ? 'Georgia, serif' : 'inherit',
          fontWeight: block.bold ? 'bold' : 'normal',
        }}
      >
        {block.type === 'component' ? (
          <div className="w-full h-full relative overflow-hidden flex items-stretch">
            {/* The Embedded Component itself */}
            <div className="w-full h-full">
              {block.componentType === 'mood' && (
                <MoodTrendGraph
                  mentalRecords={mentalRecords || {}}
                  mentalRows={mentalRows || []}
                  records={records || {}}
                  actualSleepRecords={actualSleepRecords || {}}
                  actualSleepStamps={actualSleepStamps || []}
                  selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
                />
              )}
              {block.componentType === 'activity' && (
                <ActivityEnergyGraph
                  mentalRecords={mentalRecords || {}}
                  mentalRows={mentalRows || []}
                  records={records || {}}
                  actualSleepRecords={actualSleepRecords || {}}
                  actualSleepStamps={actualSleepStamps || []}
                  selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
                />
              )}
              {block.componentType === 'stats' && (
                <ClinicalDataTable
                  mentalRecords={mentalRecords || {}}
                  mentalRows={mentalRows || []}
                  records={records || {}}
                  actualSleepRecords={actualSleepRecords || {}}
                  actualSleepStamps={actualSleepStamps || []}
                  selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
                />
              )}
            </div>

            {/* Protect and guard the embedded component from pointer events in edit mode */}
            {isReportMode && (
              <div className="absolute inset-0 bg-transparent cursor-pointer z-20" />
            )}
          </div>
        ) : (
          <div 
            className={`w-full min-w-0 font-medium ${getFontSizeClass(block.fontSize)}`}
            style={{
              width: '100%',
              textAlign: block.align || 'left',
              fontFamily: block.fontFamily === 'monospace' ? '"JetBrains Mono", monospace' : block.fontFamily === 'serif' ? 'Georgia, serif' : 'inherit',
              fontWeight: block.bold ? 'bold' : 'normal',
            }}
          >
            {block.text ||
              (isReportMode ? (
                isEditing ? (
                  <span className="text-orange-500 font-bold text-[10px] block text-center animate-pulse">
                    ダブルクリックまたは上のボタンで文字入力
                  </span>
                ) : (
                  <span className="text-slate-400 italic text-[10px] block text-center">
                    クリックして選択（文字/グラフ設定）
                  </span>
                )
              ) : (
                ''
              ))}
          </div>
        )}
      </div>

      {/* Resize Handle at the bottom-right corner */}
      {isReportMode && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          className="resize-handle absolute bottom-1 right-1 w-4 h-4 rounded-sm bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all cursor-se-resize flex items-center justify-center shadow-md select-none z-30 touch-none"
          title="サイズを変更"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="6" y1="1" x2="1" y2="6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="7" y1="4" x2="4" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
