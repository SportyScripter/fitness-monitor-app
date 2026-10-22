import React, { useState, useMemo } from 'react';
import {
  Flame,
  Award,
  Calendar,
  Activity,
  CheckCircle2,
  TrendingUp,
  Dumbbell,
  Sparkles,
  Info,
  Clock,
  Zap
} from 'lucide-react';
import { WorkoutLogEntry, DailyRecoveryData } from '../../types/hyrox';

interface ContributionHeatmapProps {
  workoutLogs: WorkoutLogEntry[];
  recoveryHistory: DailyRecoveryData[];
}

interface DayCellData {
  date: Date;
  dateStr: string; // e.g. "15.10.2026"
  isoStr: string; // e.g. "2026-10-15"
  dayNameShort: string;
  isToday: boolean;
  isFuture: boolean;
  workoutCount: number;
  totalTonnage: number;
  exercises: string[];
  recovery?: DailyRecoveryData;
  activityLevel: 0 | 1 | 2 | 3 | 4; // 0=None, 1=High Recovery Only, 2=Workout Only, 3=Workout+Mod Recovery, 4=Super Day (Workout + High Recovery)
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  workoutLogs,
  recoveryHistory,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayCellData | null>(null);
  const [viewWeeks, setViewWeeks] = useState<number>(10); // default 10 weeks

  // Normalize date comparison string
  const normalizeDate = (d: Date) => d.toLocaleDateString('pl-PL');

  // Build the grid data for the last `viewWeeks` weeks
  const { weeksData, stats } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the end of current week (Sunday)
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + daysUntilSunday);

    // Total days to display: viewWeeks * 7
    const totalDays = viewWeeks * 7;
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - totalDays + 1);

    // Pre-organize workout logs by date string
    const logsByDate: Record<string, WorkoutLogEntry[]> = {};
    workoutLogs.forEach((log) => {
      const key = log.dateStr;
      if (!logsByDate[key]) logsByDate[key] = [];
      logsByDate[key].push(log);
    });

    // Pre-organize recovery by date string
    const recoveryByDate: Record<string, DailyRecoveryData> = {};
    recoveryHistory.forEach((rec) => {
      recoveryByDate[rec.date] = rec;
    });

    // Generate sample baseline consistency if user is new, so they immediately see the benefit
    // We check if history is completely empty
    const isBrandNew = workoutLogs.length === 0 && recoveryHistory.length === 0;

    const days: DayCellData[] = [];
    let curDate = new Date(startDate);

    let totalActiveDays = 0;
    let highReadinessCount = 0;
    let totalWorkoutsCount = 0;
    let superDaysCount = 0;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(curDate);
      d.setHours(0, 0, 0, 0);
      const dateStr = normalizeDate(d);
      const isToday = d.getTime() === today.getTime();
      const isFuture = d.getTime() > today.getTime();

      let dayLogs = logsByDate[dateStr] || [];
      let dayRec = recoveryByDate[dateStr];

      // If user is brand new, provide a realistic 3-week trailing sample so the heatmap shines
      if (isBrandNew && !isFuture) {
        const dayDiff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff > 0 && dayDiff <= 21) {
          const dayNum = d.getDay();
          // FBW on Mon (1), Wed (3), Fri (5), Run on Tue (2), Sat (6)
          if ([1, 2, 3, 5, 6].includes(dayNum)) {
            dayLogs = [
              {
                id: `mock-${i}`,
                timestamp: d.toISOString(),
                dateStr,
                dayId: 'sample',
                dayTitle: dayNum === 2 || dayNum === 6 ? 'Bieg HIIT' : 'FBW Siła',
                exerciseId: 'mock-ex',
                exerciseName: dayNum === 2 ? 'Bieg 6x800m' : 'Przysiad + Bench',
                muscleGroup: 'Czworogłowe (Quads)',
                setNumber: 4,
                weightKg: 80,
                reps: 8,
                tonnageKg: 2560,
                rpe: 8,
                rir: 2,
              },
            ];
          }
          if (dayNum !== 4) {
            dayRec = {
              date: dateStr,
              sleepHours: 7.5 + (i % 2 === 0 ? 0.5 : -0.5),
              sleepQualityScore: 8,
              muscleSorenessScore: 8,
              hydrationScore: 9,
              stressScore: 8,
              readinessScore: 75 + (i % 5) * 4,
              notes: 'Dobre samopoczucie przed sesją',
            };
          }
        }
      }

      const hasWorkout = dayLogs.length > 0;
      const tonnage = dayLogs.reduce((sum, l) => sum + l.tonnageKg, 0);
      const exercises = Array.from(new Set(dayLogs.map((l) => l.exerciseName)));
      const hasHighRecovery = dayRec && dayRec.readinessScore >= 80;

      let activityLevel: 0 | 1 | 2 | 3 | 4 = 0;
      if (hasWorkout && hasHighRecovery) {
        activityLevel = 4; // Super Day
        superDaysCount++;
        totalActiveDays++;
      } else if (hasWorkout) {
        activityLevel = dayRec && dayRec.readinessScore >= 65 ? 3 : 2;
        totalActiveDays++;
      } else if (hasHighRecovery) {
        activityLevel = 1; // High Recovery Only (Good rest day!)
        highReadinessCount++;
      }

      if (hasWorkout) totalWorkoutsCount++;

      days.push({
        date: d,
        dateStr,
        isoStr: d.toISOString().slice(0, 10),
        dayNameShort: ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'][d.getDay()],
        isToday,
        isFuture,
        workoutCount: dayLogs.length,
        totalTonnage: tonnage,
        exercises,
        recovery: dayRec,
        activityLevel,
      });

      curDate.setDate(curDate.getDate() + 1);
    }

    // Split into weeks (columns)
    const weeks: DayCellData[][] = [];
    for (let w = 0; w < viewWeeks; w++) {
      weeks.push(days.slice(w * 7, (w + 1) * 7));
    }

    // Calculate current streak
    let streak = 0;
    const pastDaysRev = [...days.filter((x) => !x.isFuture)].reverse();
    for (const d of pastDaysRev) {
      if (d.workoutCount > 0 || (d.recovery && d.recovery.readinessScore >= 70)) {
        streak++;
      } else {
        break;
      }
    }

    const pastDaysCount = days.filter((x) => !x.isFuture).length;
    const consistencyRate = pastDaysCount > 0 ? Math.round((totalActiveDays / pastDaysCount) * 100) : 0;

    return {
      weeksData: weeks,
      stats: {
        totalActiveDays,
        totalWorkoutsCount,
        superDaysCount,
        streak,
        consistencyRate,
      },
    };
  }, [workoutLogs, recoveryHistory, viewWeeks]);

  const getCellColor = (day: DayCellData) => {
    if (day.isFuture) return 'bg-neutral-950/40 border-neutral-900/60 opacity-30 cursor-not-allowed';

    switch (day.activityLevel) {
      case 4: // Super Day: Workout + High Readiness
        return 'bg-gradient-to-br from-amber-400 via-amber-300 to-emerald-400 border-amber-300 shadow-sm shadow-amber-400/40 text-black hover:scale-110';
      case 3: // Workout + Moderate Readiness
        return 'bg-amber-400 border-amber-500 text-black shadow-sm shadow-amber-400/20 hover:scale-110';
      case 2: // Workout only
        return 'bg-amber-500/80 border-amber-600/70 text-black hover:scale-110';
      case 1: // High Recovery Only (Optimal Rest day)
        return 'bg-emerald-500/60 border-emerald-400/80 text-white hover:scale-110';
      default:
        return 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80';
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header & Consistency Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" /> Heatmapa Spójności
            </span>
            <h3 className="text-lg font-black text-white font-heading">
              Trening & Regeneracja (Visual Contribution Map)
            </h3>
          </div>
          <p className="text-xs text-neutral-400">
            Wizualizacja regularności: podświetlenie dni z ukończonymi treningami oraz wysokim wynikiem regeneracji (Readiness &ge; 80%).
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Widok:</span>
          <div className="inline-flex rounded-lg bg-neutral-950 p-1 border border-neutral-800 text-xs">
            {[6, 8, 10, 12].map((w) => (
              <button
                key={w}
                onClick={() => setViewWeeks(w)}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  viewWeeks === w
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {w} tyg.
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Consistency Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Aktualna Seria</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono-numbers">
            {stats.streak} <span className="text-xs font-normal text-neutral-400">dni z rzędu</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Złote Dni (Peak Days)</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono-numbers">
            {stats.superDaysCount} <span className="text-xs font-normal text-neutral-400">dni</span>
          </div>
          <span className="text-[10px] text-neutral-500">Trening + Gotowość &ge;80%</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Wszystkie Treningi</span>
            <Dumbbell className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono-numbers">
            {stats.totalWorkoutsCount}
          </div>
          <span className="text-[10px] text-neutral-500">Sesje w dzienniku</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] uppercase font-bold">Wskaźnik Spójności</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono-numbers">
            {stats.consistencyRate}%
          </div>
          <span className="text-[10px] text-neutral-500">Zrealizowany plan</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[650px] space-y-2">
          {/* Day of Week Rows: Pon (Mon) to Niedz (Sun) */}
          <div className="flex items-start gap-2">
            {/* Row labels */}
            <div className="flex flex-col justify-between py-1 text-[10px] font-bold text-neutral-500 h-[190px] w-8 shrink-0">
              <span>Pon</span>
              <span>Wt</span>
              <span>Śr</span>
              <span>Czw</span>
              <span>Pt</span>
              <span>Sob</span>
              <span>Nie</span>
            </div>

            {/* Weeks Columns */}
            <div className="flex-1 flex gap-2">
              {weeksData.map((week, wIdx) => (
                <div key={wIdx} className="flex-1 flex flex-col gap-2">
                  {week.map((day) => {
                    const isSelected = selectedDay?.dateStr === day.dateStr;
                    return (
                      <button
                        key={day.isoStr}
                        onClick={() => setSelectedDay(day)}
                        className={`h-5 w-full rounded-md border transition-all duration-150 relative cursor-pointer ${getCellColor(
                          day
                        )} ${isSelected ? 'ring-2 ring-white scale-110 z-10' : ''}`}
                        title={`${day.dateStr} - ${
                          day.workoutCount > 0
                            ? `${day.workoutCount} serii (${day.totalTonnage} kg)`
                            : 'Brak treningu'
                        }${
                          day.recovery
                            ? ` | Gotowość: ${day.recovery.readinessScore}%`
                            : ''
                        }`}
                      >
                        {day.isToday && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 pt-3 border-t border-neutral-800 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold text-neutral-300">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-neutral-900 border border-neutral-800" />
            <span className="text-[11px]">Brak danych / Odpoczynek</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/60 border border-emerald-400/80" />
            <span className="text-[11px]">Wysoka regeneracja (80%+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500" />
            <span className="text-[11px]">Trening ukończony</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-gradient-to-br from-amber-400 to-emerald-400 border border-amber-300" />
            <span className="text-[11px] font-bold text-white">Złoty Dzień (Trening + Gotowość &ge;80%)</span>
          </div>
        </div>

        <div className="text-[11px] text-neutral-500">
          Kliknij dowolny kwadrat, aby zobaczyć szczegóły dnia
        </div>
      </div>

      {/* Selected Day Detailed Card (Inspector) */}
      {selectedDay && (
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white font-heading">
                Szczegóły: {selectedDay.dayNameShort}, {selectedDay.dateStr}
              </h4>
              {selectedDay.isToday && (
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                  DZISIAJ
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {selectedDay.activityLevel === 4 && (
                <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-400/20 to-emerald-400/20 text-amber-300 border border-amber-400/30 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Złoty Dzień Hyrox
                </span>
              )}
              {selectedDay.activityLevel === 1 && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  Dzień Pełnej Regeneracji
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
            {/* Workout Information */}
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-2">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                <Dumbbell className="w-3.5 h-3.5" /> Aktywność Treningowa
              </span>
              {selectedDay.workoutCount > 0 ? (
                <div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">Wykonane serie:</span>
                    <strong className="text-white font-mono-numbers">{selectedDay.workoutCount}</strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">Łączny tonaż sesji:</span>
                    <strong className="text-amber-400 font-mono-numbers">{selectedDay.totalTonnage.toLocaleString()} kg</strong>
                  </div>
                  <div className="pt-2">
                    <span className="text-neutral-400 block mb-1">Ćwiczenia w sesji:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedDay.exercises.map((ex, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px]">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400 py-2">
                  Brak zapisanych serii treningowych w tym dniu.
                </p>
              )}
            </div>

            {/* Recovery Information */}
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                <Activity className="w-3.5 h-3.5" /> Stan Regeneracji & Gotowości
              </span>
              {selectedDay.recovery ? (
                <div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">Readiness Score:</span>
                    <strong className="text-emerald-400 font-mono-numbers text-sm">
                      {selectedDay.recovery.readinessScore}%
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">Sen:</span>
                    <strong className="text-white font-mono-numbers">
                      {selectedDay.recovery.sleepHours}h (Jakość: {selectedDay.recovery.sleepQualityScore}/10)
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-neutral-800">
                    <span className="text-neutral-400">Świeżość nóg (Brak DOMS):</span>
                    <strong className="text-white font-mono-numbers">{selectedDay.recovery.muscleSorenessScore}/10</strong>
                  </div>
                  {selectedDay.recovery.notes && (
                    <div className="pt-1.5 text-neutral-400 italic">
                      &quot;{selectedDay.recovery.notes}&quot;
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-neutral-400 py-2">
                  Brak zapisanego pomiaru gotowości w tym dniu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
