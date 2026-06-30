import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatDateLabel, shiftDateString } from '../utils';

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (dateStr: string) => void;
}

export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const handlePrevDay = () => {
    onDateChange(shiftDateString(selectedDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(shiftDateString(selectedDate, 1));
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(e.target.value);
    }
  };

  const fullLabel = formatDateLabel(selectedDate);
  const parts = fullLabel.split(' ');
  const datePart = parts[0] || '';
  const dayPart = parts[1] || '';

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/85 border-b border-gray-100" id="date-navigator">
      {/* Previous Day Button */}
      <button
        onClick={handlePrevDay}
        className="text-2xl font-extrabold text-blue-600 p-2 hover:scale-110 active:scale-95 transition-all select-none cursor-pointer"
        aria-label="前日の記録へ"
        id="prev-day-btn"
      >
        ◀
      </button>

      {/* Date Native Input Picker Wrapped Elegantly */}
      <div className="relative flex-1 mx-2 text-center" id="date-display-wrapper">
        <div className="flex flex-col items-center justify-center cursor-pointer select-none">
          <div className="text-xl font-black text-gray-900 font-sans tracking-tight">
            {datePart}
          </div>
          {dayPart && (
            <div className="text-xs text-gray-500 font-bold tracking-wide mt-0.5">
              {dayPart}
            </div>
          )}
        </div>
        {/* Full-width transparent native HTML5 calendar picker on mobile overlay */}
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateInput}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          aria-label="日付を選択"
          id="native-date-picker"
        />
      </div>

      {/* Next Day Button */}
      <button
        onClick={handleNextDay}
        className="text-2xl font-extrabold text-blue-600 p-2 hover:scale-110 active:scale-95 transition-all select-none cursor-pointer"
        aria-label="翌日の記録へ"
        id="next-day-btn"
      >
        ▶
      </button>
    </div>
  );
}
