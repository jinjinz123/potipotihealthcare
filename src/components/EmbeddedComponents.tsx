import React from 'react';
import { DailyRecords, DayRecord, SleepSymbol, StampConfig, MentalRow } from '../types';

// Convert Sleep Records symbols to micro viewer color blocks (mimicking SleepViewer.tsx)
const getViewerColor = (symbol: SleepSymbol, actualSleepStamps: StampConfig[], displayMode: 'vivid' | 'soft' | 'dark' = 'vivid') => {
  if (!symbol) return displayMode === 'dark' ? 'bg-[#1C1B1F]/80' : 'bg-slate-100';
  const stamp = actualSleepStamps.find(s => s.id === symbol || s.symbol === symbol);
  if (stamp) {
    switch (stamp.color) {
      case 'purple': return 'bg-purple-500';
      case 'sky': return 'bg-sky-400';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-400';
      case 'green': return 'bg-green-500';
      case 'pink': return 'bg-pink-500';
      case 'indigo': return 'bg-indigo-500';
      case 'teal': return 'bg-teal-500';
      case 'rose': return 'bg-rose-500';
      case 'slate': return 'bg-slate-500';
      default: return 'bg-purple-500';
    }
  }
  return displayMode === 'dark' ? 'bg-[#1C1B1F]/80' : 'bg-slate-100';
};

// Colors for mixed badges
function getMixedBadgeColorsHex(severity: number) {
  if (severity === 5) {
    return { fill: '#FEE2E2', stroke: '#EF4444', text: '#B91C1C' }; // Severe
  } else if (severity === 3 || severity === 4) {
    return { fill: '#FFEDD5', stroke: '#F97316', text: '#C2410C' }; // Moderate
  } else {
    return { fill: '#F1F5F9', stroke: '#64748B', text: '#334155' }; // Mild
  }
}

interface CommonEmbeddedProps {
  mentalRecords: DailyRecords;
  mentalRows: MentalRow[];
  records: DailyRecords;
  actualSleepRecords: DailyRecords;
  actualSleepStamps: StampConfig[];
  selectedDate: string;
}

/**
 * 1. MoodTrendGraph (気分変動推移グラフ)
 */
export function MoodTrendGraph({
  mentalRecords,
  mentalRows,
  selectedDate,
}: CommonEmbeddedProps) {
  // Navigation Year & Month extracted safely from selectedDate
  const parts = selectedDate.split('-');
  const viewYear = parseInt(parts[0], 10) || 2026;
  const viewMonth = parseInt(parts[1], 10) || 7;
  const viewDay = parseInt(parts[2], 10) || 1;

  const moodRow = mentalRows?.find(r => r.id === 'mood' || r.name.includes('気分'));
  const moodRowId = moodRow ? moodRow.id : 'mood';

  const mixedRow = mentalRows?.find(r => r.name.includes('混合状態') || r.id === 'mixed' || r.id === 'mixed_state');
  const mixedRowId = mixedRow ? mixedRow.id : null;

  const energyRow = mentalRows?.find(r => r.id === 'energy' || r.name.includes('エネルギー'));
  const energyRowId = energyRow ? energyRow.id : 'energy';

  const motivationRow = mentalRows?.find(r => r.id === 'motivation' || r.name.includes('意欲') || r.name.includes('やる気'));
  const motivationRowId = motivationRow ? motivationRow.id : 'motivation';

  const anxietyRow = mentalRows?.find(r => r.id === 'anxiety' || r.name.includes('不安') || r.name.includes('緊張'));
  const anxietyRowId = anxietyRow ? anxietyRow.id : 'anxiety';

  // Build 30-day view array trailing from the viewYear/viewMonth/viewDay
  const daysArray: { dateStr: string; displayLabel: string; rawDay: number; month: number }[] = [];
  const baseDate = new Date(viewYear, viewMonth - 1, viewDay);

  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const dayNum = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    daysArray.push({
      dateStr,
      displayLabel: `${month}/${dayNum}`,
      rawDay: dayNum,
      month: month
    });
  }

  const rawMonthDays = daysArray.map((dayInfo, index) => {
    const dayRecord = mentalRecords?.[dayInfo.dateStr];
    let isMixed = false;
    let mixedSeverity = 1;
    let moodVal: number | undefined = undefined;

    if (dayRecord) {
      const rawMood = dayRecord[moodRowId as any];
      if (rawMood !== undefined && rawMood !== null && typeof rawMood === 'number') {
        moodVal = rawMood;
      }
      if (mixedRowId && dayRecord[mixedRowId as any] !== undefined && dayRecord[mixedRowId as any] !== null) {
        const rawVal = Number(dayRecord[mixedRowId as any]);
        if (rawVal >= 1 && rawVal <= 5) {
          isMixed = true;
          mixedSeverity = rawVal;
        }
      }
      // Auto mixed detection logic
      if (!isMixed && moodVal !== undefined && moodVal < 0) {
        const rawEnergy = dayRecord[energyRowId as any];
        const rawMot = dayRecord[motivationRowId as any];
        const rawAnx = dayRecord[anxietyRowId as any];
        const eVal = (rawEnergy !== undefined && rawEnergy !== null && typeof rawEnergy === 'number') ? rawEnergy : 0;
        const mVal = (rawMot !== undefined && rawMot !== null && typeof rawMot === 'number') ? rawMot : 0;
        const aVal = (rawAnx !== undefined && rawAnx !== null && typeof rawAnx === 'number') ? rawAnx : 0;
        const isConflict = eVal > 0 || mVal > 0 || aVal >= 3;
        if (isConflict) {
          isMixed = true;
          mixedSeverity = Math.min(5, Math.max(1, Math.round((eVal + mVal + aVal + Math.abs(moodVal)) / 3)));
        }
      }
    }

    return {
      index,
      day: dayInfo.rawDay,
      dateStr: dayInfo.dateStr,
      displayLabel: dayInfo.displayLabel,
      month: dayInfo.month,
      value: moodVal,
      isMixed,
      mixedSeverity
    };
  });

  // Shift to avoid badge collision
  let shiftActive = false;
  const currentDataWithMixed = rawMonthDays.map(d => {
    if (!d.isMixed) {
      shiftActive = false;
      return { ...d, isShifted: false };
    }
    const isShifted = shiftActive;
    shiftActive = !shiftActive;
    return { ...d, isShifted };
  });

  const registeredDays = currentDataWithMixed.filter(d => d.value !== undefined && d.value !== null) as { index: number; day: number; value: number }[];
  const hasData = registeredDays.length > 0;

  const svgWidth = 500;
  const svgHeight = 220;
  const paddingLeft = 26;
  const paddingRight = 12;
  const paddingTop = 20;
  const paddingBottom = 25;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + idx * (plotWidth / 29);
  const getY = (val: number) => paddingTop + (5 - val) * (plotHeight / 10);

  const points = registeredDays.map(d => ({
    x: getX(d.index),
    y: getY(d.value)
  }));

  let splinePath = '';
  if (points.length > 0) {
    splinePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      splinePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const yTicks = [5, 3, 0, -3, -5];
  const xTicks = currentDataWithMixed.filter((_, i) => i % 5 === 0);

  return (
    <div className="w-full h-full bg-white flex flex-col items-stretch overflow-hidden select-none p-1">
      {/* Mini Legend Title */}
      <div className="text-[10px] font-extrabold text-[#1A2F4C] border-b pb-0.5 mb-1 flex justify-between items-center leading-none">
        <span className="flex items-center gap-1">📈 気分変動推移グラフ <span className="text-[9px] font-normal text-slate-500">({viewMonth}月)</span></span>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-[10px] italic border border-dashed rounded bg-slate-50/50">
          気分記録がありません
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Background Bands */}
            <rect x={paddingLeft} y={getY(5)} width={svgWidth - paddingLeft - paddingRight} height={getY(3) - getY(5)} fill="rgba(186, 26, 26, 0.04)" />
            <rect x={paddingLeft} y={getY(3)} width={svgWidth - paddingLeft - paddingRight} height={getY(1) - getY(3)} fill="rgba(224, 102, 0, 0.03)" />
            <rect x={paddingLeft} y={getY(1)} width={svgWidth - paddingLeft - paddingRight} height={getY(-1) - getY(1)} fill="rgba(56, 107, 72, 0.03)" />
            <rect x={paddingLeft} y={getY(-1)} width={svgWidth - paddingLeft - paddingRight} height={getY(-3) - getY(-1)} fill="rgba(0, 102, 139, 0.03)" />
            <rect x={paddingLeft} y={getY(-3)} width={svgWidth - paddingLeft - paddingRight} height={getY(-5) - getY(-3)} fill="rgba(81, 47, 186, 0.04)" />

            {/* Horizontal Grid Lines */}
            {yTicks.map((tick) => {
              const yPos = getY(tick);
              const isZero = tick === 0;
              return (
                <g key={`grid-y-${tick}`}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={svgWidth - paddingRight}
                    y2={yPos}
                    stroke={isZero ? '#1E293B' : '#E2E8F0'}
                    strokeWidth={isZero ? 1 : 0.5}
                    strokeDasharray={isZero ? undefined : '2,2'}
                  />
                  <text
                    x={paddingLeft - 4}
                    y={yPos + 3}
                    textAnchor="end"
                    fontSize="9px"
                    fontWeight="bold"
                    fill="#64748B"
                    className="font-mono"
                  >
                    {tick > 0 ? `+${tick}` : tick}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Grid Ticks */}
            {xTicks.map((tick, idx) => {
              const xPos = getX(tick.index);
              return (
                <g key={`xtick-${idx}`}>
                  <line x1={xPos} y1={paddingTop} x2={xPos} y2={svgHeight - paddingBottom} stroke="#F1F5F9" strokeWidth={0.5} />
                  <text
                    x={xPos}
                    y={svgHeight - paddingBottom + 12}
                    textAnchor="middle"
                    fontSize="9px"
                    fontWeight="bold"
                    fill="#64748B"
                    className="font-mono"
                  >
                    {tick.displayLabel}
                  </text>
                </g>
              );
            })}

            {/* Spline Path */}
            <path
              d={splinePath}
              fill="none"
              stroke="#2563EB"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Points */}
            {points.map((pt, idx) => (
              <circle
                key={`pt-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={3}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth={1}
              />
            ))}

            {/* Mixed M Badges */}
            {currentDataWithMixed.map((d, idx) => {
              if (!d.isMixed) return null;
              const ptX = getX(d.index);
              const ptY = getY(d.value !== undefined ? d.value : 0);
              const colors = getMixedBadgeColorsHex(d.mixedSeverity);
              const yRectTop = d.isShifted ? ptY - 26 : ptY - 15;
              const yText = d.isShifted ? ptY - 18 : ptY - 7;
              return (
                <g key={`mbadge-${idx}`}>
                  <rect
                    x={ptX - 6}
                    y={yRectTop}
                    width={12}
                    height={10}
                    rx={1.5}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={0.5}
                  />
                  <text
                    x={ptX}
                    y={yText}
                    textAnchor="middle"
                    fontSize="7px"
                    fontWeight="bold"
                    fill={colors.text}
                  >
                    M
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * 2. ActivityEnergyGraph (活動エネルギーグラフ / 睡眠・活動タイムラインヒートマップ)
 */
export function ActivityEnergyGraph({
  actualSleepRecords,
  actualSleepStamps,
  selectedDate,
}: CommonEmbeddedProps) {
  // Let's display the last 7 days of sleep and energy patterns for neat grid fitting
  const dates = Array.from({ length: 7 }).map((_, i) => {
    const parts = (selectedDate || new Date().toISOString().split('T')[0]).split('-');
    const viewYear = parseInt(parts[0], 10) || 2026;
    const viewMonth = parseInt(parts[1], 10) || 7;
    const viewDay = parseInt(parts[2], 10) || 1;
    const d = new Date(viewYear, viewMonth - 1, viewDay);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  const hourIndices = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="w-full h-full bg-white flex flex-col items-stretch overflow-hidden select-none p-1">
      <div className="text-[10px] font-extrabold text-[#1A2F4C] border-b pb-0.5 mb-1 flex justify-between items-center leading-none">
        <span>🌙 活動エネルギーグラフ <span className="text-[8.5px] font-normal text-slate-500">(直近7日間)</span></span>
        <div className="flex gap-1.5 text-[8px] font-normal text-slate-500 scale-90 origin-right">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />睡眠</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />うたた寝</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />活動</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between py-1 gap-[2px]">
        {/* Hours Label Indicator */}
        <div className="grid grid-cols-[38px_1fr] items-center text-[7px] font-mono font-bold text-slate-400 text-center leading-none">
          <div />
          <div className="grid grid-cols-24">
            {hourIndices.map(h => (
              <div key={h} className="text-center">{h % 4 === 0 ? h : ''}</div>
            ))}
          </div>
        </div>

        {dates.map((dateStr) => {
          const sleepRecord = actualSleepRecords[dateStr] || {};
          const dObj = new Date(dateStr);
          const formattedLabel = isNaN(dObj.getTime()) ? dateStr : `${dObj.getMonth() + 1}/${dObj.getDate()}`;

          return (
            <div key={dateStr} className="grid grid-cols-[38px_1fr] items-stretch h-full gap-1">
              {/* Date Label */}
              <div className="text-[8.5px] font-black text-slate-600 flex items-center pl-0.5 leading-none bg-slate-50 border border-slate-100 rounded">
                {formattedLabel}
              </div>

              {/* timeline 24-hours subslots bar */}
              <div className="grid grid-cols-24 border border-slate-100/50 bg-slate-50/30 rounded-[2px] p-[1px] items-stretch gap-[1px]">
                {hourIndices.map((h) => {
                  const s0 = h * 2;
                  const s1 = h * 2 + 1;
                  const val0 = sleepRecord[s0] || null;
                  const val1 = sleepRecord[s1] || null;

                  return (
                    <div key={h} className="flex gap-[0.5px]">
                      <div className={`flex-1 h-full rounded-[1px] ${getViewerColor(val0, actualSleepStamps)}`} />
                      <div className={`flex-1 h-full rounded-[1px] ${getViewerColor(val1, actualSleepStamps)}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 3. ClinicalDataTable (臨床用統計データ表)
 */
export function ClinicalDataTable({
  mentalRecords,
  mentalRows,
}: CommonEmbeddedProps) {
  const moodRow = mentalRows?.find(r => r.id === 'mood' || r.name.includes('気分'));
  const moodRowId = moodRow ? moodRow.id : 'mood';

  const mixedRow = mentalRows?.find(r => r.name.includes('混合状態') || r.id === 'mixed' || r.id === 'mixed_state');
  const mixedRowId = mixedRow ? mixedRow.id : null;

  // Gather records to compute clinical stats
  const keys = Object.keys(mentalRecords || {});
  let totalDays = keys.length;
  let loggedDays = 0;
  let sumMood = 0;
  let maxMood = -99;
  let minMood = 99;
  let stableDays = 0;
  let manicDays = 0;
  let depressedDays = 0;
  let mixedDays = 0;

  keys.forEach(k => {
    const r = mentalRecords[k];
    if (r) {
      const moodVal = r[moodRowId as any];
      if (moodVal !== undefined && moodVal !== null && typeof moodVal === 'number') {
        loggedDays++;
        sumMood += moodVal;
        if (moodVal > maxMood) maxMood = moodVal;
        if (moodVal < minMood) minMood = moodVal;
        if (moodVal === 0) stableDays++;
        if (moodVal > 0) manicDays++;
        if (moodVal < 0) depressedDays++;
      }

      // Mixed Days counting
      let isMixed = false;
      if (mixedRowId && r[mixedRowId as any] !== undefined && r[mixedRowId as any] !== null) {
        const val = Number(r[mixedRowId as any]);
        if (val >= 1 && val <= 5) isMixed = true;
      }
      if (isMixed) mixedDays++;
    }
  });

  const avgMoodStr = loggedDays > 0 ? `${(sumMood / loggedDays) >= 0 ? '+' : ''}${(sumMood / loggedDays).toFixed(2)}` : '---';
  const maxMoodStr = loggedDays > 0 ? `${maxMood >= 0 ? '+' : ''}${maxMood}` : '---';
  const minMoodStr = loggedDays > 0 ? `${minMood >= 0 ? '+' : ''}${minMood}` : '---';
  const rangeMoodStr = loggedDays > 0 ? (maxMood - minMood).toFixed(1) : '---';
  const rateStr = totalDays > 0 ? `${Math.round((loggedDays / 30) * 100)}%` : '---'; // normalized to 30 days scale

  const stats = [
    { label: "平均気分", value: avgMoodStr },
    { label: "最高値", value: maxMoodStr },
    { label: "最低値", value: minMoodStr },
    { label: "変動幅", value: rangeMoodStr },
    { label: "安定(0)", value: `${stableDays}日` },
    { label: "活動(＞0)", value: `${manicDays}日` },
    { label: "停滞(＜0)", value: `${depressedDays}日` },
    { label: "混合(M)", value: `${mixedDays}日` },
  ];

  return (
    <div className="w-full h-full bg-white flex flex-col items-stretch overflow-hidden select-none p-1">
      <div className="text-[10px] font-extrabold text-[#1A2F4C] border-b pb-0.5 mb-1.5">
        📊 臨床用統計データ表
      </div>

      <div className="flex-1 grid grid-cols-2 gap-x-1.5 gap-y-1 items-stretch min-h-0">
        {stats.map((item, idx) => (
          <div
            key={idx}
            className="border border-slate-100 rounded p-1 bg-slate-50/50 flex justify-between items-center text-[10px]"
          >
            <span className="font-bold text-slate-500">{item.label}</span>
            <span className="font-mono font-black text-slate-900 pr-1">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
