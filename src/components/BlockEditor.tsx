import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Type, Image as ImageIcon, Sparkles, Palette, Bold } from 'lucide-react';
import { motion } from 'motion/react';

interface BlockEditorProps {
  blockId: string;
  blockNum: number;
  initialText: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

export default function BlockEditor({
  blockId,
  blockNum,
  initialText,
  onSave,
  onClose,
}: BlockEditorProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea on mount and position cursor at the end
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Set selection to the end of the text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  const handleSave = () => {
    onSave(text);
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
      {/* AppBar (MD3 Style Dark Header) */}
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

        {/* Center: Title / Block Name */}
        <h1 className="text-lg font-bold tracking-wide text-[#e6e1e5] select-none" id="editor-title">
          Block {blockNum}
        </h1>

        {/* Right: Save Button */}
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md cursor-pointer"
          title="保存して閉じる"
          id="editor-save-btn"
        >
          <Save className="h-4 w-4" />
          <span>保存</span>
        </button>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto max-w-3xl mx-auto w-full select-text">
        {/* Text Area (Spacious & Comfortable for mobile long presses/taps) */}
        <div className="flex-1 flex flex-col bg-[#1c1b1f] border border-[#2d2c30] rounded-2xl p-4 shadow-inner relative group">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 w-full bg-transparent text-[#e6e1e5] text-base sm:text-lg focus:outline-hidden resize-none leading-relaxed font-sans placeholder-[#cac4d0]/40"
            placeholder="ここに自由にテキストを入力できます。長い文章でも全画面で見ながら快適に入力できます。"
            id="editor-textarea"
          />
          
          {/* Character Counter (MD3 standard representation) */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-xs font-mono text-[#cac4d0] bg-[#121212]/85 px-2.5 py-1 rounded-full border border-[#2d2c30] select-none shadow-xs">
            <span>文字数:</span>
            <span className="font-bold text-indigo-400">{charCount}</span>
            <span>文字</span>
          </div>
        </div>

        {/* FUTURE EXTENSION PLACEHOLDERS (Future-proof block formatting drawer) */}
        <div className="mt-4 p-4 bg-[#1c1b1f] border border-[#2d2c30] rounded-2xl flex flex-col gap-3 select-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#cac4d0] tracking-wider uppercase">将来の編集ツール（プレビュー）</span>
            <span className="text-[10px] bg-indigo-950/40 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900/30">
              COMING SOON
            </span>
          </div>
          
          <div className="grid grid-cols-5 gap-2 opacity-35 pointer-events-none">
            {/* Font Size Placeholder */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-transparent">
              <Type className="h-5 w-5 mb-1 text-[#e6e1e5]" />
              <span className="text-[9px] text-[#cac4d0] text-center">文字サイズ</span>
            </div>

            {/* Font Color Placeholder */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-transparent">
              <Palette className="h-5 w-5 mb-1 text-[#e6e1e5]" />
              <span className="text-[9px] text-[#cac4d0] text-center">文字色</span>
            </div>

            {/* Font Weight/Style Placeholder */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-transparent">
              <Bold className="h-5 w-5 mb-1 text-[#e6e1e5]" />
              <span className="text-[9px] text-[#cac4d0] text-center">太字</span>
            </div>

            {/* Image Placeholder */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-transparent">
              <ImageIcon className="h-5 w-5 mb-1 text-[#e6e1e5]" />
              <span className="text-[9px] text-[#cac4d0] text-center">画像挿入</span>
            </div>

            {/* AI Assistant Placeholder */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#2d2c30]/50 border border-transparent">
              <Sparkles className="h-5 w-5 mb-1 text-[#e6e1e5]" />
              <span className="text-[9px] text-[#cac4d0] text-center">AI文章作成</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
