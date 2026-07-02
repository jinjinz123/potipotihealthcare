import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Type, 
  Bold, 
  AlignLeft, 
  AlignCenter, 
  AlignRight 
} from 'lucide-react';
import { motion } from 'motion/react';

interface BlockEditorProps {
  blockId: string;
  blockNum: number;
  initialText: string;
  initialFontSize?: 'sm' | 'md' | 'lg';
  initialFontFamily?: string;
  initialAlign?: 'left' | 'center' | 'right';
  initialBold?: boolean;
  onChange: (updates: {
    text: string;
    fontSize?: 'sm' | 'md' | 'lg';
    fontFamily?: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
  }) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function BlockEditor({
  blockId,
  blockNum,
  initialText,
  initialFontSize = 'sm',
  initialFontFamily = 'NotoSansJP',
  initialAlign = 'left',
  initialBold = false,
  onChange,
  onSave,
  onClose,
}: BlockEditorProps) {
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(initialFontSize);
  const [fontFamily, setFontFamily] = useState<string>(initialFontFamily);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>(initialAlign);
  const [bold, setBold] = useState<boolean>(initialBold);

  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea on mount and position cursor at the end
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  // リアルタイム連動用の共通トリガー
  const triggerChange = (
    newText: string,
    newSize: 'sm' | 'md' | 'lg',
    newFont: string,
    newAlign: 'left' | 'center' | 'right',
    newBold: boolean
  ) => {
    onChange({
      text: newText,
      fontSize: newSize,
      fontFamily: newFont,
      align: newAlign,
      bold: newBold,
    });
  };

  const handleTextChange = (val: string) => {
    setText(val);
    triggerChange(val, fontSize, fontFamily, align, bold);
  };

  const handleSetFontSize = (size: 'sm' | 'md' | 'lg') => {
    setFontSize(size);
    triggerChange(text, size, fontFamily, align, bold);
  };

  const handleSetFontFamily = (font: string) => {
    setFontFamily(font);
    triggerChange(text, fontSize, font, align, bold);
  };

  const handleSetAlign = (newAlign: 'left' | 'center' | 'right') => {
    setAlign(newAlign);
    triggerChange(text, fontSize, fontFamily, newAlign, bold);
  };

  const handleToggleBold = () => {
    const newBold = !bold;
    setBold(newBold);
    triggerChange(text, fontSize, fontFamily, align, newBold);
  };

  const handleSave = () => {
    onSave();
  };

  const charCount = text.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="fixed inset-0 z-[99999] flex flex-col bg-[#121212] text-[#e6e1e5] font-sans select-none"
      id="block-editor-container"
    >
      {/* AppBar (MD3 Style Dark Header with integrated decoration toolbar) */}
      <header className="flex items-center justify-between h-16 px-4 bg-[#1c1b1f] border-b border-[#2d2c30] shrink-0 shadow-md">
        {/* Left: Close/Back Button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-12 h-12 rounded-full text-[#cac4d0] hover:bg-[#2d2c30] hover:text-[#e6e1e5] active:scale-95 transition-all cursor-pointer"
          title="保存せずに戻る"
          id="editor-back-btn"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        {/* Center: Title / Block Name (Slightly left-aligned to allow workspace for Excel buttons on right) */}
        <h1 className="text-sm sm:text-base font-black tracking-wide text-[#e6e1e5] select-none truncate max-w-[100px] sm:max-w-none" id="editor-title">
          ブロック {blockNum} 編集
        </h1>

        {/* Right: Excel-Style Formatter and Save controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* 【太字ボタン】 */}
          <button
            onClick={handleToggleBold}
            className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg border transition-all cursor-pointer ${
              bold 
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-400 font-extrabold shadow-sm' 
                : 'bg-[#2d2c30]/40 border-[#2d2c30] text-[#cac4d0] hover:bg-[#2d2c30]'
            }`}
            title="太字 (B)"
          >
            <Bold className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* 【配置ボタン群 (Excel風3連並び)】 */}
          <div className="flex items-center bg-[#2d2c30]/30 rounded-lg border border-[#2d2c30] p-0.5">
            <button
              onClick={() => handleSetAlign('left')}
              className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-all cursor-pointer ${
                align === 'left'
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                  : 'text-[#cac4d0] hover:bg-[#2d2c30]/50'
              }`}
              title="左揃え"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleSetAlign('center')}
              className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-all cursor-pointer ${
                align === 'center'
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                  : 'text-[#cac4d0] hover:bg-[#2d2c30]/50'
              }`}
              title="中央揃え"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleSetAlign('right')}
              className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md transition-all cursor-pointer ${
                align === 'right'
                  ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                  : 'text-[#cac4d0] hover:bg-[#2d2c30]/50'
              }`}
              title="右揃え"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 h-8 sm:h-10 px-3.5 sm:px-5 rounded-full bg-indigo-600 text-white font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-md cursor-pointer text-xs sm:text-sm"
            title="保存して閉じる"
            id="editor-save-btn"
          >
            <Save className="h-3.5 w-3.5" />
            <span>保存</span>
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto max-w-3xl mx-auto w-full select-text">
        {/* Text Area (Spacious with Real-Time formatting representation for WYSIWYG editing) */}
        <div className="flex-1 flex flex-col bg-[#1c1b1f] border border-[#2d2c30] rounded-2xl p-4 shadow-inner relative group">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{
              textAlign: align,
              fontFamily: fontFamily === 'monospace' ? 'JetBrains Mono, monospace' : fontFamily === 'serif' ? 'Georgia, "Playfair Display", serif' : 'inherit',
              fontWeight: bold ? 'bold' : 'normal',
              fontSize: fontSize === 'sm' ? '14px' : fontSize === 'md' ? '18px' : '24px',
            }}
            className="flex-1 w-full bg-transparent text-[#e6e1e5] focus:outline-hidden resize-none leading-relaxed placeholder-[#cac4d0]/40 transition-all duration-150"
            placeholder="ここに自由にテキストを入力できます。入力した内容は親ブロックへリアルタイムに同期されます。"
            id="editor-textarea"
          />
          
          {/* Character Counter (MD3 standard representation) */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-xs font-mono text-[#cac4d0] bg-[#121212]/85 px-2.5 py-1 rounded-full border border-[#2d2c30] select-none shadow-xs">
            <span>文字数:</span>
            <span className="font-bold text-indigo-400">{charCount}</span>
            <span>文字</span>
          </div>
        </div>

        {/* ACTIVE EDITING TOOLS (Unified formatting drawer synced with Excel controls) */}
        <div className="mt-4 p-4 bg-[#1c1b1f] border border-[#2d2c30] rounded-2xl flex flex-col gap-3 select-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#cac4d0] tracking-wider uppercase">装飾ツール</span>
            <span className="text-[10px] bg-indigo-950/40 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-900/30 font-black">
              リアルタイム連動
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {/* 文字サイズ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSizeDropdown(!showSizeDropdown);
                  setShowFontDropdown(false);
                }}
                className="w-full flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-[#2d2c30] hover:bg-[#2d2c30] transition-all cursor-pointer h-16"
              >
                <Type className="h-5 w-5 mb-1 text-indigo-400" />
                <span className="text-[9px] text-[#cac4d0] text-center font-bold truncate w-full">
                  サイズ: {fontSize === 'sm' ? '小' : fontSize === 'md' ? '中' : '大'}
                </span>
              </button>
              {/* 文字サイズ ドロップダウン */}
              {showSizeDropdown && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1c1b1f] border border-[#403f44] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                  {(['sm', 'md', 'lg'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        handleSetFontSize(size);
                        setShowSizeDropdown(false);
                      }}
                      className={`px-3 py-2 text-xs font-bold text-center transition-all hover:bg-[#2d2c30] ${
                        fontSize === size ? 'bg-indigo-600/30 text-indigo-400' : 'text-[#e6e1e5]'
                      }`}
                    >
                      {size === 'sm' ? '小 (12px)' : size === 'md' ? '中 (16px)' : '大 (24px)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* フォントファミリー */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowFontDropdown(!showFontDropdown);
                  setShowSizeDropdown(false);
                }}
                className="w-full flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-[#2d2c30] hover:bg-[#2d2c30] transition-all cursor-pointer h-16"
              >
                <Type className="h-5 w-5 mb-1 text-indigo-400" />
                <span className="text-[9px] text-[#cac4d0] text-center font-bold truncate w-full">
                  フォント: {fontFamily === 'NotoSansJP' ? 'ゴシック' : fontFamily === 'serif' ? '明朝' : '等幅'}
                </span>
              </button>
              {/* フォント ドロップダウン */}
              {showFontDropdown && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1c1b1f] border border-[#403f44] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                  {[
                    { id: 'NotoSansJP', name: '日本語ゴシック' },
                    { id: 'serif', name: '日本語明朝' },
                    { id: 'monospace', name: '等幅フォント' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        handleSetFontFamily(f.id);
                        setShowFontDropdown(false);
                      }}
                      className={`px-3 py-2 text-xs font-bold text-center transition-all hover:bg-[#2d2c30] ${
                        fontFamily === f.id ? 'bg-indigo-600/30 text-indigo-400' : 'text-[#e6e1e5]'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 太字トグル (下段) */}
            <button
              type="button"
              onClick={handleToggleBold}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer h-16 ${
                bold 
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-400' 
                  : 'bg-[#2d2c30]/50 border-[#2d2c30] text-[#cac4d0] hover:bg-[#2d2c30]'
              }`}
              title="太字トグル"
            >
              <Bold className="h-5 w-5 mb-1 text-indigo-400" />
              <span className="text-[9px] text-center font-bold w-full">
                太字: {bold ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 配置トグル (下段) */}
            <button
              type="button"
              onClick={() => {
                const nextAlign = align === 'left' ? 'center' : align === 'center' ? 'right' : 'left';
                handleSetAlign(nextAlign);
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-[#2d2c30] text-[#cac4d0] hover:bg-[#2d2c30] transition-all cursor-pointer h-16"
              title="配置を順に切り替え"
            >
              {align === 'left' && <AlignLeft className="h-5 w-5 mb-1 text-indigo-400" />}
              {align === 'center' && <AlignCenter className="h-5 w-5 mb-1 text-indigo-400" />}
              {align === 'right' && <AlignRight className="h-5 w-5 mb-1 text-indigo-400" />}
              <span className="text-[9px] text-center font-bold truncate w-full">
                揃え: {align === 'left' ? '左' : align === 'center' ? '中央' : '右'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

