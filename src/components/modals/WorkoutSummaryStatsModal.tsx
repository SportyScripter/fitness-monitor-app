import React from 'react';
import {
  X,
  BarChart3,
  Dumbbell,
  TrendingUp,
  Clock,
  Layers,
  Award,
  Zap,
  CheckCircle2,
  FileSpreadsheet,
  Activity,
  Flame,
  HeartPulse
} from 'lucide-react';
import { WorkoutDay, ExerciseSet } from '../../types/hyrox';

interface ActiveExerciseStats {
  exerciseName: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  exerciseRpe: number;
  exerciseRir: number;
  exerciseNotes: string;
}

interface WorkoutSummaryStatsModalProps {
  day: WorkoutDay;
  currentWeek: number;
  exercisesState: ActiveExerciseStats[];
  sessionSeconds: number;
  sessionNotes: string;
  previousSessionTonnage?: number;
  totalWorkDurationSec?: number;
  totalRestDurationSec?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkoutSummaryStatsModal: React.FC<WorkoutSummaryStatsModalProps> = ({
  day,
  currentWeek,
  exercisesState,
  sessionSeconds,
  sessionNotes,
  previousSessionTonnage = 0,
  totalWorkDurationSec = 0,
  totalRestDurationSec = 0,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    if (mins === 0) return `${s}s`;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Calculations
  let totalTonnage = 0;
  let totalSetsCompleted = 0;
  let totalSetsPlanned = 0;
  let totalRepsCompleted = 0;
  let sumWorkSeconds = totalWorkDurationSec;
  let sumRestSeconds = totalRestDurationSec;
  let completedSetsWithWorkTime = 0;
  let completedSetsWithRestTime = 0;

  const muscleTonnageMap: Record<string, number> = {};

  exercisesState.forEach((ex) => {
    ex.sets.forEach((set) => {
      totalSetsPlanned++;
      if (set.completed) {
        totalSetsCompleted++;
        const t = (set.weightKg || 0) * (set.reps || 0);
        totalTonnage += t;
        totalRepsCompleted += set.reps || 0;
        const mg = ex.muscleGroup.split('(')[0].trim();
        muscleTonnageMap[mg] = (muscleTonnageMap[mg] || 0) + t;

        if (set.setDurationSec && set.setDurationSec > 0) {
          sumWorkSeconds += set.setDurationSec;
          completedSetsWithWorkTime++;
        }
        if (set.restDurationSec && set.restDurationSec > 0) {
          sumRestSeconds += set.restDurationSec;
          completedSetsWithRestTime++;
        }
      }
    });
  });

  const avgWorkSec = completedSetsWithWorkTime > 0 ? Math.round(sumWorkSeconds / completedSetsWithWorkTime) : 0;
  const avgRestSec = completedSetsWithRestTime > 0 ? Math.round(sumRestSeconds / completedSetsWithRestTime) : 0;
  const totalMeasuredTime = sumWorkSeconds + sumRestSeconds;
  const workPercent = totalMeasuredTime > 0 ? Math.round((sumWorkSeconds / totalMeasuredTime) * 100) : 50;
  const restPercent = 100 - workPercent;

  const tonnageDelta = previousSessionTonnage > 0 ? totalTonnage - previousSessionTonnage : 0;
  const tonnageDeltaPercent =
    previousSessionTonnage > 0 ? Math.round((tonnageDelta / previousSessionTonnage) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-3xl h-[95dvh] max-h-[95dvh] shadow-2xl p-4 sm:p-6 text-left relative space-y-4 sm:space-y-5 flex flex-col mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Podsumowanie & Statystyki Sesji
                </span>
                <span className="text-xs text-neutral-400">Tydzień {currentWeek}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white font-heading mt-0.5">
                {day.dayNamePolish}: {day.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 overscroll-contain touch-pan-y">
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Łączny Tonaż
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono-numbers">
                {totalTonnage.toLocaleString()} <span className="text-xs text-neutral-400">kg</span>
              </div>
              {tonnageDeltaPercent !== null && (
                <span
                  className={`text-[10px] font-bold block mt-0.5 ${
                    tonnageDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tonnageDelta >= 0 ? `+${tonnageDelta} kg (${tonnageDeltaPercent}%)` : `${tonnageDelta} kg (${tonnageDeltaPercent}%)`}
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Serie Ukończone
              </span>
              <div className="text-2xl font-black text-white font-mono-numbers">
                {totalSetsCompleted} <span className="text-xs text-neutral-500">/ {totalSetsPlanned}</span>
              </div>
              <span className="text-[10px] text-neutral-400">
                {totalSetsPlanned > 0 ? `${Math.round((totalSetsCompleted / totalSetsPlanned) * 100)}% zrealizowano` : '0%'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Powtórzenia
              </span>
              <div className="text-2xl font-black text-white font-mono-numbers">
                {totalRepsCompleted}
              </div>
              <span className="text-[10px] text-neutral-500">Suma powtórzeń</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Całkowity Czas
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono-numbers mt-0.5">
                {formatTime(sessionSeconds)}
              </div>
              <span className="text-[10px] text-neutral-500">Główny zegar sesji</span>
            </div>
          </div>

          {/* Garmin Timing Analytics (Work vs Rest) */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Analiza Pracy i Odpoczynku (Garmin Lap Engine)</span>
              </span>
              <span className="text-[11px] font-mono-numbers text-neutral-400">
                Stosunek: <strong className="text-white">{workPercent}% praca</strong> / <strong className="text-amber-400">{restPercent}% odpoczynek</strong>
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-900">
              <div
                className="bg-white h-full transition-all"
                style={{ width: `${workPercent}%` }}
                title={`Czas pracy w serii: ${workPercent}%`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${restPercent}%` }}
                title={`Czas odpoczynku: ${restPercent}%`}
              />
            </div>

            {/* Sub Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block mb-0.5">Czas Pracy (Serii):</span>
                <span className="text-base font-black text-white font-mono-numbers">
                  {formatTime(sumWorkSeconds)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block mb-0.5">Czas Przerw:</span>
                <span className="text-base font-black text-amber-400 font-mono-numbers">
                  {formatTime(sumRestSeconds)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block mb-0.5">Śr. Czas Serii:</span>
                <span className="text-base font-black text-white font-mono-numbers">
                  {avgWorkSec > 0 ? `${avgWorkSec}s` : '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block mb-0.5">Śr. Odpoczynek:</span>
                <span className="text-base font-black text-amber-400 font-mono-numbers">
                  {avgRestSec > 0 ? `${avgRestSec}s` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Sets Breakdown Table with Garmin Timing */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Szczegółowy Zapis Serii, Ciężarów i Czasów</span>
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 font-semibold text-[10px] border-b border-neutral-900 pb-1">
                    <th className="py-1">Ćwiczenie</th>
                    <th className="py-1 text-center">Seria</th>
                    <th className="py-1 text-right">Obciążenie / Wynik</th>
                    <th className="py-1 text-center">Czas Pracy</th>
                    <th className="py-1 text-center">Przerwa</th>
                    <th className="py-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/80 font-mono-numbers text-[11px]">
                  {exercisesState.map((ex) =>
                    ex.sets.map((set) => {
                      const exUnit = set.unit || 'kg';
                      return (
                        <tr key={`${ex.exerciseName}-${set.setNumber}`} className="hover:bg-neutral-900/40">
                          <td className="py-1.5 font-sans font-medium text-white truncate max-w-[180px]">
                            {ex.exerciseName}
                          </td>
                          <td className="py-1.5 text-center text-neutral-400">
                            #{set.setNumber}
                          </td>
                          <td className="py-1.5 text-right font-bold text-amber-300">
                            {set.weightKg > 0 ? `${set.weightKg} ${exUnit} × ${set.reps}` : `${set.reps} powt`}
                          </td>
                          <td className="py-1.5 text-center text-white">
                            {set.setDurationSec ? `${set.setDurationSec}s` : '-'}
                          </td>
                          <td className="py-1.5 text-center text-amber-400">
                            {set.restDurationSec ? `${set.restDurationSec}s` : '-'}
                          </td>
                          <td className="py-1.5 text-right">
                            {set.completed ? (
                              <span className="text-[10px] text-emerald-400 font-bold">Zaliczona</span>
                            ) : (
                              <span className="text-[10px] text-neutral-500">Pominięta</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Muscle Tonnage Distribution */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 shrink-0">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Rozkład Objętości na Partie Mięśniowe</span>
            </span>

            {Object.keys(muscleTonnageMap).length === 0 ? (
              <p className="text-neutral-500 text-xs italic">
                Zaznacz ukończenie serii (zielony ptaszek), aby zobaczyć rozkład tonażu.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(muscleTonnageMap).map(([muscle, kg]) => {
                  const pct = totalTonnage > 0 ? Math.round((kg / totalTonnage) * 100) : 0;
                  return (
                    <div key={muscle} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-200 font-semibold">{muscle}</span>
                        <span className="font-mono-numbers text-amber-400 font-bold">
                          {kg.toLocaleString()} kg ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Notes */}
          {sessionNotes && (
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs shrink-0">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Notatki do Treningu:
              </span>
              <p className="text-neutral-300 italic">&quot;{sessionNotes}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-400 text-black font-black uppercase text-xs tracking-wider cursor-pointer shadow-md shadow-amber-400/20 hover:bg-amber-300 transition-colors"
          >
            Zamknij Podsumowanie
          </button>
        </div>
      </div>
    </div>
  );
};
