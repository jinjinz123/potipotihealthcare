import { DailyRecords, StampConfig } from '../types';
import { formatDateLabel, calculateSleepStats } from '../utils';
import { Calendar, Inbox, Clock, Zap } from 'lucide-react';

interface HistorySummaryProps {
  records: DailyRecords;
  stamps: StampConfig[];
  displayMode?: 'vivid' | 'soft' | 'dark';
}

export default function HistorySummary({ records, stamps, displayMode = 'vivid' }: HistorySummaryProps) {
  // Sort dates decreasing
  const sortedDates = Object.keys(records).sort((a, b) => b.localeCompare(a)).slice(0, 7);

  return (
    <div className={`flex flex-col flex-1 overflow-y-auto p-4 space-y-4 ${
      displayMode === 'dark' ? 'bg-[#121212]' : 'bg-slate-50'
    }`} id="history-summary-tab">
      
      {/* Intro info box */}
      <div className="bg-indigo-900 rounded-xl p-4 text-[#e3e2e6] shadow-xs space-y-1.5" id="history-intro">
        <h2 className="text-sm font-bold flex items-center gap-1.5 font-sans uppercase tracking-wider">
          <Clock className="h-4.5 w-4.5 text-orange-350" />
          簡易ログ確認（直近7日間）
        </h2>
        <p className="text-xs text-blue-100 leading-relaxed font-medium">
          記録したデータはCSV形式でいつでも出力し、PCのExcelへインポートして長期保存・グラフ分析できます。
        </p>
      </div>

      {/* History Grid List */}
      {sortedDates.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-xl border text-center space-y-3 shadow-3xs ${
          displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F]' : 'bg-white border-gray-150'
        }`} id="history-empty">
          <div className={`p-3.5 rounded-full border ${
            displayMode === 'dark' ? 'bg-[#121212] border-[#49454F] text-sky-400' : 'bg-slate-50 border-gray-150 text-slate-550'
          }`}>
            <Inbox className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className={`font-bold text-sm ${displayMode === 'dark' ? 'text-yellow-405 text-yellow-400' : 'text-slate-700'}`}>記録が見つかりません</h3>
            <p className={`text-xs mt-1 max-w-[200px] mx-auto leading-relaxed ${
              displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-400'
            }`}>
              記録画面で睡眠スタンプをタップして入力してください。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3" id="history-items-container">
          {sortedDates.map((dateStr) => {
            const dayRecord = records[dateStr];
            const { sleepHours, inBedHours, wakeupCount } = calculateSleepStats(dayRecord, stamps);
            
            return (
              <div 
                key={dateStr}
                className={`rounded-xl border p-4 flex flex-col space-y-3 shadow-3xs transition-all ${
                  displayMode === 'dark' 
                    ? 'bg-[#1C1B1F] border-[#49454F] text-[#E6E1E5] hover:border-[#CAC4D0] shadow-md' 
                    : 'bg-white border-gray-200 text-gray-800 hover:border-indigo-200 shadow-3xs'
                }`}
                id={`history-card-${dateStr}`}
              >
                {/* Date header */}
                <div className={`flex justify-between items-center border-b pb-2 ${
                  displayMode === 'dark' ? 'border-[#49454F]' : 'border-gray-100'
                }`}>
                  <div className={`flex items-center gap-1.5 font-extrabold text-sm ${
                    displayMode === 'dark' ? 'text-yellow-400' : 'text-slate-800'
                  }`}>
                    <Calendar className={`h-4 w-4 ${displayMode === 'dark' ? 'text-yellow-400' : 'text-indigo-800'}`} />
                    <span>{formatDateLabel(dateStr)}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-sm ${
                    displayMode === 'dark' ? 'bg-[#121212] text-sky-300 border border-[#49454F]' : 'bg-slate-100 text-gray-500'
                  }`}>
                    {dateStr}
                  </span>
                </div>

                {/* Values row */}
                <div className="grid grid-cols-3 gap-2 text-center" id={`stats-grid-${dateStr}`}>
                  <div className={`border rounded-xl p-2 flex flex-col justify-center ${
                    displayMode === 'dark' ? 'bg-[#121212] border-[#49454F]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] font-bold ${displayMode === 'dark' ? 'text-sky-300' : 'text-slate-500'}`}>睡眠時間 (S)</span>
                    <span className={`text-base font-black mt-0.5 ${displayMode === 'dark' ? 'text-yellow-400' : 'text-indigo-900'}`}>
                      {sleepHours} <span className="text-xs font-bold">時間</span>
                    </span>
                  </div>
                  
                  <div className={`border rounded-xl p-2 flex flex-col justify-center ${
                    displayMode === 'dark' ? 'bg-[#121212] border-[#49454F]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] font-bold ${displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-500'}`}>横寝</span>
                    <span className={`text-base font-black mt-0.5 ${displayMode === 'dark' ? 'text-[#E6E1E5]' : 'text-slate-700'}`}>
                      {inBedHours} <span className="text-xs font-bold">時間</span>
                    </span>
                  </div>

                  <div className={`border rounded-xl p-2 flex flex-col justify-center ${
                    displayMode === 'dark' ? 'bg-[#121212] border-[#49454F]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] font-bold ${displayMode === 'dark' ? 'text-amber-400' : 'text-slate-500'}`}>中途覚醒 (×)</span>
                    <span className={`text-base font-black mt-0.5 ${displayMode === 'dark' ? 'text-rose-400' : 'text-orange-600'}`}>
                      {wakeupCount} <span className="text-xs font-bold font-sans">回</span>
                    </span>
                  </div>
                </div>

                {/* Smaller 48-slot Indicator Timeline Block */}
                <div className="flex flex-col space-y-1">
                  <span className={`text-[9px] uppercase tracking-wide select-none ${
                    displayMode === 'dark' ? 'text-sky-300 font-extrabold' : 'text-gray-400 font-black'
                  }`}>
                    タイムライン（30分刻み）
                  </span>
                  <div className={`h-3.5 w-full rounded-lg overflow-hidden flex border ${
                    displayMode === 'dark' ? 'bg-[#121212] border-[#49454F]' : 'bg-slate-100 border-gray-200'
                  }`} id={`timeline-${dateStr}`}>
                    {Array.from({ length: 48 }).map((_, idx) => {
                      const symb = dayRecord ? dayRecord[idx] : null;
                      let col = displayMode === 'dark' ? 'bg-slate-900/40' : 'bg-slate-50';
                      
                      if (symb) {
                        const stamp = stamps.find(s => s.id === symb || s.symbol === symb);
                        if (stamp) {
                          switch (stamp.color) {
                            case 'purple': col = 'bg-purple-300'; break;
                            case 'sky': col = 'bg-sky-400'; break;
                            case 'orange': col = 'bg-orange-400'; break;
                            case 'yellow': col = 'bg-yellow-350'; break;
                            case 'green': col = 'bg-green-450'; break;
                            case 'pink': col = 'bg-pink-400'; break;
                            case 'indigo': col = 'bg-indigo-300'; break;
                            case 'teal': col = 'bg-teal-400'; break;
                            case 'rose': col = 'bg-rose-400'; break;
                            case 'slate': col = 'bg-slate-400'; break;
                          }
                        }
                      }
                      
                      return (
                        <div 
                          key={idx} 
                          className={`flex-1 h-full border-r last:border-0 ${col} ${
                            displayMode === 'dark' ? 'border-r-[#1C1B1F]' : 'border-r-gray-300/30'
                          }`}
                          title={`${Math.floor(idx / 2)}時${idx % 2 === 0 ? '00分' : '30分'}: ${symb || '記録なし'}`}
                          id={`timeline-slot-${dateStr}-${idx}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Developer notice on bottom */}
      <div className={`border rounded-xl p-4 flex gap-2.5 items-start text-xs leading-relaxed shadow-xs ${
        displayMode === 'dark' ? 'bg-[#1C1B1F] border-[#49454F] text-[#CAC4D0]' : 'bg-white border-gray-200 text-slate-500'
      }`} id="history-tip">
        <Zap className="h-5 w-5 text-[#f59e0b] shrink-0 mt-0.5" />
        <div>
          <span className={`font-bold ${displayMode === 'dark' ? 'text-yellow-400' : 'text-slate-700'}`}>Excelインポートのコツ:</span>
          <p className={`mt-1 ${displayMode === 'dark' ? 'text-[#CAC4D0]' : 'text-slate-500'}`}>
            本アプリからダウンロードしたCSVファイルは、Excelの「データ」→「テキストまたはCSVから」を選択して読み込むだけで、日付・時間枠ごとの詳細な記号が綺麗なテーブルに並びます。
          </p>
        </div>
      </div>
    </div>
  );
}
