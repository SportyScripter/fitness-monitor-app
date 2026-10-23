import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Dumbbell,
  Calendar,
  Award,
  BarChart3,
  Flame,
  ArrowUpRight,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WorkoutLogEntry } from '../../types/hyrox';

interface ExerciseChartModalProps {
  exerciseName: string;
  workoutLogs: WorkoutLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseChartModal: React.FC<ExerciseChartModalProps> = ({
  exerciseName,
  workoutLogs,
  isOpen,
  onClose,
}) => {
  const [metric, setMetric] = useState<'weight' | 'tonnage' | 'estimated1rm'>('weight');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  if (!isOpen) return null;

  // Filter logs for this specific exercise
  const exerciseLogs = workoutLogs.filter(
    (l) => l.exerciseName.trim().toLowerCase() === exerciseName.trim().toLowerCase()
  );

  // Group logs by date / session
  const sessionsMap: Record<
    string,
    {
      dateStr: string;
      sets: WorkoutLogEntry[];
      maxWeight: number;
      totalTonnage: number;
      max1RM: number;
      avgRpe: number;
    }
  > = {};

  exerciseLogs.forEach((l) => {
    const key = l.dateStr || l.timestamp.split('T')[0];
    if (!sessionsMap[key]) {
      sessionsMap[key] = {
        dateStr: key,
        sets: [],
        maxWeight: 0,
        totalTonnage: 0,
        max1RM: 0,
        avgRpe: 0,
      };
    }
    sessionsMap[key].sets.push(l);
    if (l.weightKg > sessionsMap[key].maxWeight) {
      sessionsMap[key].maxWeight = l.weightKg;
    }
    sessionsMap[key].totalTonnage += l.tonnageKg || l.weightKg * l.reps;

    // Estimated 1RM using Epley formula
    const epley = Math.round(l.weightKg * (1 + l.reps / 30));
    if (epley > sessionsMap[key].max1RM) {
      sessionsMap[key].max1RM = epley;
    }
  });

  const sessionHistory = Object.values(sessionsMap).sort(
    (a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()
  );

  // Calculate Personal Records
  const allTimeMaxWeight = Math.max(...exerciseLogs.map((l) => l.weightKg), 0);
  const allTimeMax1RM = Math.max(...sessionHistory.map((s) => s.max1RM), 0);
  const allTimeTotalTonnage = exerciseLogs.reduce((sum, l) => sum + (l.tonnageKg || 0), 0);

  // Chart data values
  const chartValues = sessionHistory.map((s) => {
    if (metric === 'tonnage') return s.totalTonnage;
    if (metric === 'estimated1rm') return s.max1RM;
    return s.maxWeight;
  });

  const maxVal = Math.max(...chartValues, 10);
  const minVal = Math.min(...chartValues, 0);

  // Group sets by date for "SZCZEGÓŁY WYKONANYCH SERII" (Accordion / Dropdown)
  interface DailyGroup {
    dateStr: string;
    sets: WorkoutLogEntry[];
    totalVolume: number;
    avgRir: string;
    rirRange: string;
    avgRpe: string;
    rpeRange: string;
  }

  const groupedByDate = exerciseLogs.reduce<Record<string, DailyGroup>>((acc, log) => {
    const key = log.dateStr || (log.timestamp ? log.timestamp.split('T')[0] : 'Sesja');
    if (!acc[key]) {
      acc[key] = {
        dateStr: key,
        sets: [],
        totalVolume: 0,
        avgRir: '-',
        rirRange: '-',
        avgRpe: '-',
        rpeRange: '-',
      };
    }
    acc[key].sets.push(log);
    acc[key].totalVolume += log.tonnageKg || (log.weightKg * log.reps);
    return acc;
  }, {});

  const dailyHistoryList = Object.values(groupedByDate)
    .map((group) => {
      const sortedSets = [...group.sets].sort((a, b) => (a.setNumber || 1) - (b.setNumber || 1));
      const rirs = sortedSets
        .map((s) => (typeof s.rir === 'number' ? s.rir : null))
        .filter((v): v is number => v !== null);
      const rpes = sortedSets
        .map((s) => (typeof s.rpe === 'number' ? s.rpe : null))
        .filter((v): v is number => v !== null);

      const rirMin = rirs.length > 0 ? Math.min(...rirs) : null;
      const rirMax = rirs.length > 0 ? Math.max(...rirs) : null;
      const rirRange = rirMin !== null ? (rirMin === rirMax ? `${rirMin}` : `${rirMin}-${rirMax}`) : '-';
      const avgRir = rirs.length > 0 ? (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1) : '-';

      const rpeMin = rpes.length > 0 ? Math.min(...rpes) : null;
      const rpeMax = rpes.length > 0 ? Math.max(...rpes) : null;
      const rpeRange = rpeMin !== null ? (rpeMin === rpeMax ? `${rpeMin}` : `${rpeMin}-${rpeMax}`) : '-';
      const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '-';

      return {
        ...group,
        sets: sortedSets,
        totalVolume: Math.round(group.totalVolume),
        avgRir,
        rirRange,
        avgRpe,
        rpeRange,
      };
    })
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] shadow-2xl text-left relative flex flex-col mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Wykres Progresu Ćwiczenia
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-heading mt-0.5">
                {exerciseName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Scrollable Modal Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-4 sm:space-y-5 pb-24 overscroll-contain">
          {/* PR Highlights */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                Rekord Ciężaru (PR)
              </span>
              <div className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono-numbers">
                {allTimeMaxWeight} <span className="text-xs text-neutral-400">kg</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                Szacowane 1RM
              </span>
              <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono-numbers">
                {allTimeMax1RM} <span className="text-xs text-neutral-400">kg</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                Łączny Tonaż
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-numbers mt-0.5">
                {allTimeTotalTonnage.toLocaleString()} <span className="text-xs text-neutral-400">kg</span>
              </div>
            </div>
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center justify-between gap-2 shrink-0 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setMetric('weight')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                metric === 'weight'
                  ? 'bg-amber-400 text-black shadow font-black'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Ciężar Max (kg)
            </button>
            <button
              onClick={() => setMetric('estimated1rm')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                metric === 'estimated1rm'
                  ? 'bg-amber-400 text-black shadow font-black'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Szacowane 1RM (kg)
            </button>
            <button
              onClick={() => setMetric('tonnage')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                metric === 'tonnage'
                  ? 'bg-amber-400 text-black shadow font-black'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Tonaż Sesji (kg)
            </button>
          </div>

          {/* Visual Chart */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shrink-0">
            {sessionHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                <p>Brak zapisanych logów dla tego ćwiczenia.</p>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  Wykonaj serie w trakcie treningu i zapisz sesję, aby zobaczyć wykres progresu!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Historia {sessionHistory.length} sesji treningowych</span>
                  <span className="font-mono-numbers text-amber-600 dark:text-amber-400 font-bold">
                    Najnowszy: {chartValues[chartValues.length - 1]} kg
                  </span>
                </div>

                {/* Bar / Column Chart */}
                <div className="h-44 flex items-end gap-2 pt-4 px-2 overflow-x-auto scrollbar-none">
                  {sessionHistory.map((s, idx) => {
                    const val =
                      metric === 'tonnage'
                        ? s.totalTonnage
                        : metric === 'estimated1rm'
                        ? s.max1RM
                        : s.maxWeight;
                    const heightPct = Math.max(15, Math.round((val / maxVal) * 100));
                    const isLatest = idx === sessionHistory.length - 1;

                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[42px] max-w-[64px] flex flex-col items-center justify-end h-full group"
                      >
                        <span className="text-[10px] font-mono-numbers font-bold text-neutral-500 dark:text-neutral-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {val}kg
                        </span>

                        <div className="w-full bg-neutral-200 dark:bg-neutral-900 rounded-xl overflow-hidden p-1 flex flex-col justify-end h-32 border border-neutral-300 dark:border-neutral-800">
                          <div
                            className={`w-full rounded-lg transition-all duration-500 ${
                              isLatest
                                ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-md shadow-amber-400/20'
                                : 'bg-neutral-400 dark:bg-neutral-700 group-hover:bg-amber-400/70'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>

                        <span className="text-[9px] text-neutral-500 mt-1.5 block truncate max-w-[50px]">
                          {s.dateStr.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detailed Logs List - Grouped by Date (Accordion / Dropdown) */}
          <div className="h-auto overflow-visible space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
              Szczegóły Wykonanych Serii ({exerciseLogs.length} w {dailyHistoryList.length} dniach):
            </span>

            {dailyHistoryList.length === 0 ? (
              <p className="text-neutral-500 text-xs italic">Brak wpisów.</p>
            ) : (
              <div className="space-y-2">
                {dailyHistoryList.map((dayGroup) => {
                  const isExpanded = !!expandedDates[dayGroup.dateStr];
                  return (
                    <div
                      key={dayGroup.dateStr}
                      className="rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all shadow-sm"
                    >
                      {/* Accordion Header Tile */}
                      <button
                        type="button"
                        onClick={() => toggleDateExpand(dayGroup.dateStr)}
                        className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition-colors gap-2 select-none"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white text-xs">
                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{dayGroup.dateStr}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25">
                            {dayGroup.sets.length} {dayGroup.sets.length === 1 ? 'seria' : dayGroup.sets.length < 5 ? 'serie' : 'serii'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[11px] shrink-0">
                          <span className="font-mono-numbers font-bold text-neutral-700 dark:text-neutral-300">
                            {dayGroup.totalVolume.toLocaleString()} kg
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                            RIR {dayGroup.rirRange}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                            RPE {dayGroup.rpeRange}
                          </span>
                          <div className="p-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Accordion Body - Detailed Sets */}
                      {isExpanded && (
                        <div className="p-3 pt-0 border-t border-neutral-200 dark:border-neutral-800/80 mt-1 space-y-1.5 animate-in fade-in duration-150">
                          <div className="pt-2 space-y-1.5">
                            {dayGroup.sets.map((set, sIdx) => (
                              <div
                                key={set.id || sIdx}
                                className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 font-bold flex items-center justify-center text-[10px]">
                                    #{set.setNumber || sIdx + 1}
                                  </span>
                                  <span className="font-mono-numbers font-bold text-amber-600 dark:text-amber-400">
                                    {set.weightKg} {set.unit || 'kg'} × {set.reps} powt.
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                    RIR {set.rir !== undefined ? set.rir : '-'} | RPE {set.rpe !== undefined ? set.rpe : '-'}
                                  </span>
                                  <span className="font-mono-numbers text-neutral-600 dark:text-neutral-400 text-[10px]">
                                    {(set.tonnageKg || set.weightKg * set.reps).toLocaleString()} kg
                                  </span>
                                  {set.notes && (
                                    <span
                                      className="italic text-neutral-500 truncate max-w-[120px] text-[10px]"
                                      title={set.notes}
                                    >
                                      &quot;{set.notes}&quot;
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer inside unified scroll container */}
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-right">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
