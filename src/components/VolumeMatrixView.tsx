import React, { useState } from 'react';
import {
  Layers,
  Dumbbell,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Calendar
} from 'lucide-react';
import { MuscleGroup, WorkoutLogEntry, WorkoutDay } from '../types/hyrox';
import { MUSCLE_GROUP_VOLUME_TARGETS, MASTER_HYROX_WEEK_PLAN, MESOCYCLE_WEEKS } from '../data/hyroxPlanData';

interface VolumeMatrixViewProps {
  currentWeek: number;
  workoutLogs: WorkoutLogEntry[];
  onOpenSheetsModal: () => void;
  weekPlan?: WorkoutDay[];
}

export const VolumeMatrixView: React.FC<VolumeMatrixViewProps> = ({
  currentWeek,
  workoutLogs,
  onOpenSheetsModal,
  weekPlan = MASTER_HYROX_WEEK_PLAN,
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'ALL'>('ALL');
  const currentPhase = MESOCYCLE_WEEKS.find((w) => w.week === currentWeek) || MESOCYCLE_WEEKS[0];

  // Calculate planned sets per muscle group dynamically from active user weekPlan
  const plannedSetsPerGroup: Record<MuscleGroup, number> = {} as any;
  MUSCLE_GROUP_VOLUME_TARGETS.forEach((t) => {
    plannedSetsPerGroup[t.muscleGroup] = 0;
  });

  weekPlan.forEach((day) => {
    if (day && Array.isArray(day.exercises) && day.exercises.length > 0) {
      day.exercises.forEach((ex) => {
        if (!ex) return;
        const sets = typeof ex.plannedSets === 'number' ? ex.plannedSets : 3;
        if (ex.muscleGroup) {
          plannedSetsPerGroup[ex.muscleGroup] = (plannedSetsPerGroup[ex.muscleGroup] || 0) + sets;
        }
        if (ex.secondaryMuscleGroup) {
          plannedSetsPerGroup[ex.secondaryMuscleGroup] =
            (plannedSetsPerGroup[ex.secondaryMuscleGroup] || 0) + Math.round(sets * 0.5);
        }
      });
    }
  });

  // Calculate actual logged sets and tonnage from workoutLogs
  const loggedSetsPerGroup: Record<string, { sets: number; tonnage: number }> = {};
  let totalLoggedTonnage = 0;
  let totalLoggedSets = 0;

  workoutLogs.forEach((log) => {
    if (!log) return;
    const mg = log.muscleGroup || 'Inne';
    if (!loggedSetsPerGroup[mg]) {
      loggedSetsPerGroup[mg] = { sets: 0, tonnage: 0 };
    }
    const tonnage = typeof log.tonnageKg === 'number' ? log.tonnageKg : 0;
    loggedSetsPerGroup[mg].sets += 1;
    loggedSetsPerGroup[mg].tonnage += tonnage;
    totalLoggedTonnage += tonnage;
    totalLoggedSets += 1;
  });

  // Calculate total planned tonnage across the week from active user weekPlan
  const totalPlannedTonnage = weekPlan.reduce((daySum, day) => {
    if (!day || !Array.isArray(day.exercises)) return daySum;
    return (
      daySum +
      day.exercises.reduce((exSum, ex) => {
        if (!ex) return exSum;
        const weight = typeof ex.defaultWeightKg === 'number' ? ex.defaultWeightKg : 0;
        const mult = typeof currentPhase?.volumeMultiplier === 'number' ? currentPhase.volumeMultiplier : 1.0;
        const adjustedWeight = Math.round(weight * mult);
        const repsRange = ex.targetRepsRange ? String(ex.targetRepsRange) : '8';
        const reps = parseInt(repsRange.split('-')[0]) || 8;
        const sets = typeof ex.plannedSets === 'number' ? ex.plannedSets : 3;
        return exSum + adjustedWeight * reps * sets;
      }, 0)
    );
  }, 0);

  return (
    <div className="space-y-6">
      {/* Volume Summary Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider">Tygodniowy Tonaż Zapisany</span>
            <Dumbbell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono-numbers">
            {totalLoggedTonnage.toLocaleString()} kg
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Z wykonanych {totalLoggedSets} serii roboczych w dzienniku
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider">Planowany Tonaż Bazowy</span>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono-numbers">
            ~{totalPlannedTonnage.toLocaleString()} kg
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Mnożnik Tygodnia {currentWeek}: {Math.round(currentPhase.volumeMultiplier * 100)}%
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider">Średni Zapas Sił (RIR)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono-numbers">
            RIR {currentPhase.targetRIR}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Docelowa skala RPE: {currentPhase.targetRPE} / 10
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider">Synchronizacja Arkusza</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <button
            onClick={onOpenSheetsModal}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Otwórz panel Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Muscle Group Weekly Sets Matrix */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-black text-white font-heading">
              Tygodniowy Rozkład Serii na Każdą Partię Mięśniową
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Optymalna periodyzacja pod Hyrox: minimum efektywne (MEV) vs adaptacyjne (MAV: 10-18 serii/tydz.)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Filtr partii:</span>
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">Wszystkie partie ({MUSCLE_GROUP_VOLUME_TARGETS.length})</option>
              {MUSCLE_GROUP_VOLUME_TARGETS.map((t) => (
                <option key={t.muscleGroup} value={t.muscleGroup}>
                  {t.muscleGroup}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Volume Bars */}
        <div className="mt-6 space-y-5">
          {MUSCLE_GROUP_VOLUME_TARGETS.filter(
            (t) => selectedMuscle === 'ALL' || t.muscleGroup === selectedMuscle
          ).map((target) => {
            const planned = plannedSetsPerGroup[target.muscleGroup] || target.weeklySets;
            const logged = loggedSetsPerGroup[target.muscleGroup]?.sets || 0;
            const loggedTonnage = loggedSetsPerGroup[target.muscleGroup]?.tonnage || 0;

            const percentage = Math.min(100, Math.round((planned / target.maxRecommendedSets) * 100));
            const isOptimal = planned >= target.minRecommendedSets && planned <= target.maxRecommendedSets;

            return (
              <div
                key={target.muscleGroup}
                className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-heading">
                      {target.muscleGroup}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOptimal
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isOptimal ? 'Optymalna objętość (MAV)' : 'Wysoki bodziec'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-neutral-400">
                      Planowane serie: <strong className="text-amber-400 font-mono-numbers">{planned} serii</strong> / tydz.
                    </span>
                    <span className="text-neutral-400">
                      Wykonane serie: <strong className="text-white font-mono-numbers">{logged}</strong>
                    </span>
                    {loggedTonnage > 0 && (
                      <span className="text-emerald-400 font-mono-numbers font-semibold">
                        {loggedTonnage.toLocaleString()} kg
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden relative">
                  {/* Recommended zone indicator */}
                  <div
                    className="absolute top-0 bottom-0 bg-neutral-800"
                    style={{
                      left: `${(target.minRecommendedSets / target.maxRecommendedSets) * 80}%`,
                      width: `${((target.maxRecommendedSets - target.minRecommendedSets) / target.maxRecommendedSets) * 80}%`,
                    }}
                  />
                  {/* Filled progress */}
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out relative z-10"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Footer notes */}
                <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-400 gap-1">
                  <span>
                    Rekomendowany zakres: <strong className="text-neutral-300">{target.minRecommendedSets} - {target.maxRecommendedSets} serii</strong>
                  </span>
                  <span className="italic text-neutral-400">
                    {target.notes}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Workout Logs Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              Ostatnio Wykonane Serie w Dzienniku ({workoutLogs.length})
            </h3>
            <p className="text-xs text-neutral-400">
              Każde powtórzenie ma automatycznie przeliczony tonaż (kg) oraz zarejestrowane RPE/RIR
            </p>
          </div>
        </div>

        {workoutLogs.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-xs">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
            <p>Nie zapisano jeszcze żadnych serii w tym tygodniu.</p>
            <p className="text-neutral-500 mt-1">
              Przejdź do zakładki Trening i kliknij &quot;Rozpocznij Trening&quot; aby wprowadzić pierwsze serie.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {/* Mobile Cards (Visible below md) */}
            <div className="space-y-2.5 md:hidden">
              {workoutLogs.slice(-15).reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-400 font-mono-numbers">
                          {entry.dateStr}
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold">
                          • {entry.muscleGroup?.split('(')[0]}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-0.5">
                        {entry.exerciseName}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono-numbers text-[11px]">
                      Seria #{entry.setNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-neutral-900/60 text-center font-mono-numbers">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Ciężar × Powt</span>
                      <span className="font-bold text-white">
                        {entry.weightKg}kg × {entry.reps}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">Tonaż</span>
                      <span className="font-black text-amber-400">
                        {entry.tonnageKg.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">RPE / RIR</span>
                      <span className="font-bold text-neutral-300">
                        @{entry.rpe} <span className="text-[9px] text-neutral-500">({entry.rir})</span>
                      </span>
                    </div>
                  </div>

                  {entry.notes && (
                    <p className="text-[11px] text-neutral-400 italic">
                      {entry.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (Hidden below md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider border-b border-neutral-800">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Ćwiczenie</th>
                    <th className="py-2.5 px-3">Partia</th>
                    <th className="py-2.5 px-3">Seria</th>
                    <th className="py-2.5 px-3">Ciężar</th>
                    <th className="py-2.5 px-3">Powt.</th>
                    <th className="py-2.5 px-3 text-amber-400">Tonaż (kg)</th>
                    <th className="py-2.5 px-3">RPE / RIR</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Notatki</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {workoutLogs.slice(-20).reverse().map((entry) => (
                    <tr key={entry.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-400 font-mono-numbers">{entry.dateStr}</td>
                      <td className="py-2.5 px-3 font-semibold text-white">{entry.exerciseName}</td>
                      <td className="py-2.5 px-3 text-neutral-400">{entry.muscleGroup.split('(')[0]}</td>
                      <td className="py-2.5 px-3 font-mono-numbers text-neutral-400">#{entry.setNumber}</td>
                      <td className="py-2.5 px-3 font-mono-numbers font-bold text-white">{entry.weightKg} kg</td>
                      <td className="py-2.5 px-3 font-mono-numbers text-white">{entry.reps}</td>
                      <td className="py-2.5 px-3 font-mono-numbers font-bold text-amber-400">
                        {entry.tonnageKg.toLocaleString()} kg
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-200">
                        @{entry.rpe} <span className="text-neutral-400 text-[10px] font-normal">(RIR {entry.rir})</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 text-[11px]">
                        {entry.notes && (
                          <span className="text-white block font-medium">{entry.notes}</span>
                        )}
                        {entry.sessionNotes && (
                          <span className="text-neutral-500 italic block text-[10px]">
                            Sesja: {entry.sessionNotes}
                          </span>
                        )}
                        {!entry.notes && !entry.sessionNotes && (
                          <span className="text-neutral-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
