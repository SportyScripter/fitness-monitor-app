import React from 'react';
import {
  X,
  Dumbbell,
  CheckCircle2,
  Clock,
  Flame,
  FileText,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';

export interface DetailedSetComparison {
  setNumber: number;
  planned: {
    weightKg: number;
    reps: string | number;
    rir: number;
    rpe: number;
    distance?: number;
    distanceUnit?: 'm' | 'km';
    pace?: string;
    targetHr?: number;
  };
  actual?: {
    weightKg: number;
    reps: number;
    rir: number;
    rpe: number;
    distance?: number;
    distanceUnit?: 'm' | 'km';
    pace?: string;
    targetHr?: number;
    isCompleted: boolean;
    notes?: string;
  };
}

export interface ExerciseDetailsModalData {
  exerciseName: string;
  dayTitle: string;
  dayNamePolish?: string;
  category?: 'strength' | 'cardio';
  muscleGroup?: string;
  techniqueNotes?: string;
  userNotes?: string;
  sessionNotes?: string;
  sets: DetailedSetComparison[];
  totalPlannedSets: number;
  totalCompletedSets: number;
}

interface ExerciseDetailsModalProps {
  data: ExerciseDetailsModalData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseDetailsModal: React.FC<ExerciseDetailsModalProps> = ({
  data,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !data) return null;

  const isCardio = data.category === 'cardio';

  // Calculate actual tonnage or distance
  const totalActualTonnage = data.sets.reduce((sum, s) => {
    if (s.actual && s.actual.isCompleted) {
      return sum + (s.actual.weightKg || 0) * (s.actual.reps || 0);
    }
    return sum;
  }, 0);

  const totalActualDistance = data.sets.reduce((sum, s) => {
    if (s.actual && s.actual.isCompleted && s.actual.distance) {
      const inKm = s.actual.distanceUnit === 'm' ? s.actual.distance / 1000 : s.actual.distance;
      return sum + inKm;
    }
    return sum;
  }, 0);

  const completionPct = Math.round(
    (data.totalCompletedSets / Math.max(1, data.totalPlannedSets)) * 100
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              {isCardio ? <Flame className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
                  {isCardio ? 'Cardio / Bieg' : data.muscleGroup || 'Trening Siłowy'}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {data.dayNamePolish ? `${data.dayNamePolish} • ` : ''}{data.dayTitle}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-heading mt-0.5 truncate">
                {data.exerciseName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Zamknij"
            aria-label="Zamknij szczegóły"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 text-xs">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                Zrealizowane serie
              </span>
              <div className="text-lg font-black text-white font-mono-numbers mt-0.5">
                {data.totalCompletedSets} / {data.totalPlannedSets}
                <span className="text-xs text-amber-400 ml-1.5 font-sans font-bold">
                  ({completionPct}%)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                {isCardio ? 'Łączny dystans' : 'Wykonany tonaż'}
              </span>
              <div className="text-lg font-black text-amber-400 font-mono-numbers mt-0.5">
                {isCardio
                  ? `${totalActualDistance > 0 ? totalActualDistance.toFixed(2) : 0} km`
                  : `${totalActualTonnage.toLocaleString()} kg`}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                Status wykonania
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                {data.totalCompletedSets >= data.totalPlannedSets && data.totalCompletedSets > 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Kompletne
                  </span>
                ) : data.totalCompletedSets > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <Clock className="w-4 h-4" /> Częściowo ({data.totalCompletedSets}/{data.totalPlannedSets})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-neutral-400 font-medium">
                    <Clock className="w-4 h-4" /> Zaplanowane / Brak
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Sets Breakdown (Zaplanowane vs Wykonane) */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 overflow-hidden">
            <div className="p-3 sm:px-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Rozpiska Serii: Plan vs Wykonanie
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400">
                {data.sets.length} {data.sets.length === 1 ? 'seria' : 'serie'}
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800/80 text-[10px] uppercase font-bold text-neutral-400 tracking-wider bg-neutral-900/50">
                    <th className="py-2.5 px-3">Seria</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Wykonanie</th>
                    <th className="py-2.5 px-3">RPE / RIR</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono-numbers">
                  {data.sets.map((s) => {
                    const isDone = !!s.actual?.isCompleted;

                    return (
                      <tr key={s.setNumber} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">
                          #{s.setNumber}
                        </td>

                        {/* Plan */}
                        <td className="py-2.5 px-3 text-neutral-300">
                          {isCardio ? (
                            <span>
                              {s.planned.distance ? `${s.planned.distance} ${s.planned.distanceUnit || 'km'}` : 'Bieg'}
                              {s.planned.pace ? ` • tempo ${s.planned.pace}` : ''}
                              {s.planned.targetHr ? ` • HR ${s.planned.targetHr}` : ''}
                            </span>
                          ) : (
                            <span>
                              {s.planned.weightKg > 0 ? `${s.planned.weightKg} kg` : 'Ciało'} × {s.planned.reps} powt.
                            </span>
                          )}
                        </td>

                        {/* Wykonanie */}
                        <td className="py-2.5 px-3">
                          {isDone ? (
                            isCardio ? (
                              <span className="font-bold text-amber-400">
                                {s.actual?.distance ? `${s.actual.distance} ${s.actual.distanceUnit || 'km'}` : 'Zaliczono'}
                                {s.actual?.pace ? ` • ${s.actual.pace}` : ''}
                                {s.actual?.targetHr ? ` • ${s.actual.targetHr} bpm` : ''}
                              </span>
                            ) : (
                              <span className="font-bold text-amber-400">
                                {s.actual?.weightKg ? `${s.actual.weightKg} kg` : 'Ciało'} × {s.actual?.reps} powt.
                              </span>
                            )
                          ) : (
                            <span className="text-neutral-500 font-sans italic">
                              Brak wpisu
                            </span>
                          )}
                        </td>

                        {/* RPE / RIR */}
                        <td className="py-2.5 px-3">
                          {isDone ? (
                            <span className="text-neutral-200">
                              @{s.actual?.rpe ?? s.planned.rpe} <span className="text-neutral-500 text-[10px]">(RIR {s.actual?.rir ?? s.planned.rir})</span>
                            </span>
                          ) : (
                            <span className="text-neutral-500 text-[11px]">
                              Plan: @{s.planned.rpe} (RIR {s.planned.rir})
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-right font-sans">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Wykonana</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 text-[11px] font-medium">
                              <Clock className="w-3 h-3" />
                              <span>Niewykonana</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden divide-y divide-neutral-800/80">
              {data.sets.map((s) => {
                const isDone = !!s.actual?.isCompleted;

                return (
                  <div key={s.setNumber} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono-numbers">
                        Seria #{s.setNumber}
                      </span>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Wykonana
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-medium">
                          <Clock className="w-3 h-3" /> Niewykonana
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-[9px] text-neutral-500 uppercase font-bold block">Plan</span>
                        <div className="font-mono-numbers text-neutral-300 mt-0.5">
                          {isCardio ? (
                            <span>{s.planned.distance ? `${s.planned.distance} ${s.planned.distanceUnit || 'km'}` : 'Bieg'}</span>
                          ) : (
                            <span>{s.planned.weightKg > 0 ? `${s.planned.weightKg}kg` : 'Ciało'} × {s.planned.reps}</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                        <span className="text-[9px] text-neutral-500 uppercase font-bold block">Wykonanie</span>
                        <div className="font-mono-numbers text-amber-400 font-bold mt-0.5">
                          {isDone ? (
                            isCardio ? (
                              <span>{s.actual?.distance ? `${s.actual.distance} ${s.actual.distanceUnit || 'km'}` : 'Zrobione'}</span>
                            ) : (
                              <span>{s.actual?.weightKg ? `${s.actual.weightKg}kg` : 'Ciało'} × {s.actual?.reps}</span>
                            )
                          ) : (
                            <span className="text-neutral-500 font-normal italic">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isDone && (
                      <div className="text-[10px] text-neutral-400 font-mono-numbers flex items-center justify-between">
                        <span>RPE: @{s.actual?.rpe ?? s.planned.rpe}</span>
                        <span>RIR: {s.actual?.rir ?? s.planned.rir}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Notes Section */}
          <div className="space-y-2">
            {data.userNotes ? (
              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-neutral-200">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notatka dodana do ćwiczenia:</span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-100 italic">
                  &quot;{data.userNotes}&quot;
                </p>
              </div>
            ) : null}

            {data.techniqueNotes ? (
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300">
                <div className="flex items-center gap-2 text-neutral-400 font-bold text-xs mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wskazówki techniczne / zalecenia:</span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-300">
                  {data.techniqueNotes}
                </p>
              </div>
            ) : null}

            {!data.userNotes && !data.techniqueNotes ? (
              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center text-[11px] text-neutral-500">
                Brak zarejestrowanych notatek do tego ćwiczenia.
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
