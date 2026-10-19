import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  Zap,
  Target,
  Shield,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  Award,
  Flame,
  BarChart3,
  Sparkles,
  Trophy,
  Activity,
  Dumbbell
} from 'lucide-react';
import { RPE_RIR_SCALE_REFERENCE, MESOCYCLE_WEEKS } from '../data/hyroxPlanData';
import { WorkoutLogEntry, MesocyclePhase, WorkoutDay, MuscleGroup } from '../types/hyrox';

interface Progression1RMViewProps {
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  workoutLogs?: WorkoutLogEntry[];
  totalWeeksCount?: number;
  weeksList?: MesocyclePhase[];
  allWeeksPlans?: Record<number, WorkoutDay[]>;
}

export const Progression1RMView: React.FC<Progression1RMViewProps> = ({
  currentWeek,
  onSelectWeek,
  workoutLogs = [],
  totalWeeksCount = 8,
  weeksList = MESOCYCLE_WEEKS,
  allWeeksPlans = {},
}) => {
  const [liftWeight, setLiftWeight] = useState<number>(100);
  const [liftReps, setLiftReps] = useState<number>(5);

  // Exercise Progression calculation based on distinct sessions
  const exerciseProgressionList = useMemo(() => {
    const exMap: Record<string, WorkoutLogEntry[]> = {};
    workoutLogs.forEach((l) => {
      if (!l.exerciseName) return;
      const key = l.exerciseName.trim();
      if (!exMap[key]) exMap[key] = [];
      exMap[key].push(l);
    });

    return Object.entries(exMap)
      .map(([name, logs]) => {
        // Group by distinct calendar date to properly compare with previous workout day
        const sessionMap: Record<string, WorkoutLogEntry[]> = {};
        logs.forEach((l) => {
          const sKey = l.dateStr || (l.timestamp ? l.timestamp.split('T')[0] : 'session');
          if (!sessionMap[sKey]) sessionMap[sKey] = [];
          sessionMap[sKey].push(l);
        });

        // Sort sessions by date descending
        const sortedSessions = Object.values(sessionMap)
          .map((sessionLogs) => {
            // Deduplicate sets within session by setNumber (keeping latest)
            const mapBySet = new Map<number, WorkoutLogEntry>();
            sessionLogs
              .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
              .forEach((l) => mapBySet.set(l.setNumber || 1, l));
            return Array.from(mapBySet.values()).sort((a, b) => a.setNumber - b.setNumber);
          })
          .sort((a, b) => {
            const tA = a[0]?.dateStr || a[0]?.timestamp || '';
            const tB = b[0]?.dateStr || b[0]?.timestamp || '';
            return tB.localeCompare(tA);
          });

        const latestSession = sortedSessions[0] || [];
        const previousSession = sortedSessions[1] || [];

        const latestTopWeight = Math.max(...latestSession.map((s) => s.weightKg || 0), 0);
        const previousTopWeight =
          previousSession.length > 0 ? Math.max(...previousSession.map((s) => s.weightKg || 0), 0) : null;

        const latestBestSet = latestSession.reduce(
          (best, cur) =>
            (cur.weightKg || 0) * (1 + (cur.reps || 1) / 30) > (best.weightKg || 0) * (1 + (best.reps || 1) / 30)
              ? cur
              : best,
          latestSession[0] || { weightKg: 0, reps: 0 }
        );
        const estimated1RM = Math.round((latestBestSet.weightKg || 0) * (1 + (latestBestSet.reps || 0) / 30));

        const deltaKg = previousTopWeight !== null ? latestTopWeight - previousTopWeight : 0;
        const deltaPct =
          previousTopWeight && previousTopWeight > 0 ? Math.round((deltaKg / previousTopWeight) * 100) : 0;

        // Total unique completed sets across all sessions
        const totalSets = sortedSessions.reduce((sum, s) => sum + s.length, 0);
        const totalTonnage = sortedSessions.reduce(
          (sum, s) => sum + s.reduce((sSum, l) => sSum + (l.tonnageKg || (l.weightKg || 0) * (l.reps || 0)), 0),
          0
        );
        const unit = logs[0]?.unit || 'kg';
        const muscleGroup = logs[0]?.muscleGroup;

        return {
          name,
          muscleGroup,
          unit,
          totalSets,
          totalTonnage,
          latestDate: latestSession[0]?.dateStr || latestSession[0]?.timestamp?.split('T')[0],
          latestTopWeight,
          latestReps: latestBestSet.reps,
          previousTopWeight,
          previousDate: previousSession[0]?.dateStr || previousSession[0]?.timestamp?.split('T')[0],
          deltaKg,
          deltaPct,
          estimated1RM,
        };
      })
      .sort((a, b) => b.totalTonnage - a.totalTonnage);
  }, [workoutLogs]);

  // 1RM Formulas
  const epley1RM = Math.round(liftWeight * (1 + liftReps / 30));
  const brzycki1RM = liftReps < 37 ? Math.round(liftWeight * (36 / (37 - liftReps))) : liftWeight;
  const estimated1RM = Math.round((epley1RM + brzycki1RM) / 2);

  const percentageTable = [
    { percent: 95, repsEstimate: '1-2', rpe: '9.5-10', targetRir: '0-1', role: 'Maksymalna siła bezwzględna' },
    { percent: 90, repsEstimate: '3-4', rpe: '9.0', targetRir: '1', role: 'Intensyfikacja siłowa (Peak Overload)' },
    { percent: 85, repsEstimate: '5-6', rpe: '8.5', targetRir: '1-2', role: 'Główne serie robocze wielostawowe' },
    { percent: 80, repsEstimate: '7-8', rpe: '8.0', targetRir: '2', role: 'Sweet spot akumulacji (FBW baza)' },
    { percent: 75, repsEstimate: '9-10', rpe: '7.5', targetRir: '2-3', role: 'Hipertrofia i wytrzymałość pod Hyrox' },
    { percent: 70, repsEstimate: '11-12', rpe: '7.0', targetRir: '3', role: 'Faza wprowadzająca / objętościowa' },
    { percent: 65, repsEstimate: '13-15', rpe: '6.5', targetRir: '3-4', role: 'Serie dynamiczne i techniczne' },
    { percent: 60, repsEstimate: '15+', rpe: '6.0', targetRir: '4+', role: 'Deload regeneracyjny (Odciążenie)' },
  ];

  // Calculate actual logged metrics
  const totalTonnageLogged = workoutLogs.reduce((sum, l) => sum + (l.tonnageKg || 0), 0);
  const totalCompletedSets = workoutLogs.length;
  const sessionDates = Array.from(new Set(workoutLogs.map((l) => l.dateStr)));

  // Hyrox Athlete Score formula:
  // 1 pt per 100kg tonnage + 40 pts per completed workout day + 5 pts per logged set
  const tonnagePoints = Math.round(totalTonnageLogged / 100);
  const consistencyPoints = sessionDates.length * 40;
  const setPoints = totalCompletedSets * 5;
  const totalHyroxPoints = tonnagePoints + consistencyPoints + setPoints;

  // Rank determination
  const getRank = (pts: number) => {
    if (pts >= 1200) {
      return {
        title: 'HYROX PRO CHAMPION',
        badge: 'Poziom Mistrzowski (Tier 4)',
        color: 'text-amber-400 bg-amber-400/10 border-amber-400/40',
        nextMilestone: 'Osiągnięto najwyższy stopień Hyrox Pro!',
        progressPercent: 100,
      };
    } else if (pts >= 700) {
      return {
        title: 'HYROX ELITE COMPETITOR',
        badge: 'Poziom Zaawansowany (Tier 3)',
        color: 'text-purple-400 bg-purple-400/10 border-purple-400/40',
        nextMilestone: `Pozostało ${1200 - pts} pkt do rangi Champion`,
        progressPercent: Math.round(((pts - 700) / 500) * 100),
      };
    } else if (pts >= 300) {
      return {
        title: 'HYROX CHALLENGER',
        badge: 'Poziom Średniozaawansowany (Tier 2)',
        color: 'text-blue-400 bg-blue-400/10 border-blue-400/40',
        nextMilestone: `Pozostało ${700 - pts} pkt do rangi Elite`,
        progressPercent: Math.round(((pts - 300) / 400) * 100),
      };
    } else {
      return {
        title: 'HYROX ROOKIE ENGINE',
        badge: 'Poziom Początkowy (Tier 1)',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
        nextMilestone: `Pozostało ${300 - pts} pkt do rangi Challenger`,
        progressPercent: Math.round((pts / 300) * 100),
      };
    }
  };

  const rank = getRank(totalHyroxPoints);

  // Generate chart data for weeks tonnage comparison
  const weeksTonnageData = weeksList.map((phase) => {
    const wNum = phase.week;
    const multiplier = phase.volumeMultiplier || 1.0;

    // Calculate planned tonnage for this week based on days if customized
    const weekDays = allWeeksPlans[wNum];
    let plannedTonnage = 0;
    if (weekDays && weekDays.length > 0) {
      plannedTonnage = weekDays.reduce((sum, d) => {
        if (!d.exercises) return sum;
        return (
          sum +
          d.exercises.reduce((exSum, ex) => {
            const w = Math.round(ex.defaultWeightKg * multiplier);
            const r = parseInt(ex.targetRepsRange.split('-')[0]) || 8;
            return exSum + w * r * ex.plannedSets;
          }, 0)
        );
      }, 0);
    } else {
      plannedTonnage = Math.round(18500 * multiplier);
    }

    return {
      week: wNum,
      multiplier,
      name: phase.name.split(':')[1]?.trim() || phase.name,
      isDeload: phase.isDeload,
      plannedTonnage,
      isCurrent: wNum === currentWeek,
    };
  });

  const maxChartTonnage = Math.max(...weeksTonnageData.map((w) => w.plannedTonnage), 25000);

  // Tonnage by muscle group from logged data
  const muscleTonnageMap: Record<string, number> = {};
  workoutLogs.forEach((l) => {
    if (l.muscleGroup) {
      const shortName = l.muscleGroup.split('(')[0].trim();
      muscleTonnageMap[shortName] = (muscleTonnageMap[shortName] || 0) + (l.tonnageKg || 0);
    }
  });

  const muscleTonnageEntries = Object.entries(muscleTonnageMap).sort((a, b) => b[1] - a[1]);
  const maxMuscleTonnage = Math.max(...muscleTonnageEntries.map((e) => e[1]), 1000);

  return (
    <div className="space-y-6">
      {/* Hyrox Athlete Score & Level Hero */}
      <div className="p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${rank.color}`}>
                {rank.badge}
              </span>
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Punkty Progresji Hyrox
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-heading uppercase">
              {rank.title}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-xl">
              Zdobywaj punkty za każdą ukończoną serię na żywo, podniesione kilogramy tonażu oraz regularne logowanie sesji biegowych i FBW.
            </p>

            <div className="w-full max-w-md bg-neutral-950 h-2.5 rounded-full mt-4 overflow-hidden border border-neutral-800">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(5, rank.progressPercent)}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-400 mt-1.5 block">
              {rank.nextMilestone}
            </span>
          </div>

          {/* Points Breakdown Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Punkty Hyrox
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono-numbers">
                {totalHyroxPoints}
              </div>
              <span className="text-[10px] text-neutral-500">Łączny wynik</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Tonaż Podniesiony
              </span>
              <div className="text-xl font-black text-white font-mono-numbers mt-1">
                {totalTonnageLogged.toLocaleString()} kg
              </div>
              <span className="text-[10px] text-neutral-500">+{tonnagePoints} pkt</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Ukończone Serie
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono-numbers mt-1">
                {totalCompletedSets} serii
              </div>
              <span className="text-[10px] text-neutral-500">+{setPoints} pkt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week-over-Week Progressive Overload Chart */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white font-heading">
                Falowanie Objętości i Tonażu w Mezocyklu ({weeksList.length} Tygodni)
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kliknij dowolny słupek na wykresie, aby natychmiast przejść do tego tygodnia treningu.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">Wybrany:</span>
            <span className="px-3 py-1 rounded-xl bg-amber-400 text-black font-black">
              Tydzień {currentWeek}
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="min-w-[650px] flex items-end justify-between gap-3 h-48 px-2">
            {weeksTonnageData.map((item) => {
              const heightPercent = Math.max(15, Math.round((item.plannedTonnage / maxChartTonnage) * 100));
              const isSelected = item.isCurrent;

              return (
                <button
                  key={item.week}
                  onClick={() => onSelectWeek(item.week)}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                >
                  <div className="text-[10px] font-mono-numbers font-bold text-neutral-400 opacity-80 group-hover:opacity-100 group-hover:text-amber-400 transition-all">
                    {(item.plannedTonnage / 1000).toFixed(1)}t
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[44px] bg-neutral-950 rounded-xl overflow-hidden p-1 flex flex-col justify-end h-36 border border-neutral-800 group-hover:border-neutral-700 transition-colors">
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isSelected
                          ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-lg shadow-amber-400/30'
                          : item.isDeload
                          ? 'bg-blue-500/40 border border-blue-400/60'
                          : 'bg-neutral-800 group-hover:bg-neutral-700'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <div className="text-center">
                    <span className={`text-[11px] font-bold block ${isSelected ? 'text-amber-400 font-black' : 'text-neutral-400'}`}>
                      T{item.week}
                    </span>
                    <span className="text-[9px] text-neutral-500 block truncate max-w-[60px]">
                      {item.isDeload ? 'Deload' : `${item.multiplier}x`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Muscle Group Tonnage Breakdown (Logged data) */}
      {muscleTonnageEntries.length > 0 && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white font-heading">
                Rozkład Podniesionego Tonażu według Partii Mięśniowych
              </h3>
            </div>
            <span className="text-xs text-neutral-400">
              Łącznie: <strong className="text-amber-400 font-mono-numbers">{totalTonnageLogged.toLocaleString()} kg</strong>
            </span>
          </div>

          <div className="space-y-3">
            {muscleTonnageEntries.map(([muscleName, kg]) => {
              const pct = Math.round((kg / maxMuscleTonnage) * 100);
              return (
                <div key={muscleName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">{muscleName}</span>
                    <span className="font-mono-numbers text-neutral-300">
                      <strong>{kg.toLocaleString()} kg</strong> ({Math.round((kg / totalTonnageLogged) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise by Exercise Progression Table */}
      {exerciseProgressionList.length > 0 && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-black text-white font-heading">
                  Rzeczywista Progresja w Ćwiczeniach ({exerciseProgressionList.length} ćwiczeń)
                </h3>
                <p className="text-xs text-neutral-400">
                  Porównanie ostatniego treningu z poprzednim — rzeczywiste obciążenia, serie i estymowane 1RM
                </p>
              </div>
            </div>

            <span className="text-xs text-neutral-400">
              Ukończone: <strong className="text-amber-400 font-mono-numbers">{totalCompletedSets}</strong> serii
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-semibold text-[11px] pb-2">
                  <th className="pb-2.5">Ćwiczenie / Partia</th>
                  <th className="pb-2.5">Ostatni Ciężar & Powt.</th>
                  <th className="pb-2.5">Poprzedni Ciężar</th>
                  <th className="pb-2.5 text-center">Progresja</th>
                  <th className="pb-2.5 text-center">Szac. 1RM</th>
                  <th className="pb-2.5 text-right">Serie & Tonaż</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono-numbers">
                {exerciseProgressionList.map((item) => {
                  const hasProgression = item.deltaKg > 0;
                  const isDecline = item.deltaKg < 0;
                  const isFirst = item.previousTopWeight === null;

                  return (
                    <tr key={item.name} className="hover:bg-neutral-950/40 transition-colors">
                      <td className="py-3">
                        <span className="font-bold text-white block text-sm font-sans">{item.name}</span>
                        {item.muscleGroup && (
                          <span className="text-[10px] text-neutral-400 font-sans block">
                            {item.muscleGroup.split('(')[0].trim()}
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        <div className="font-bold text-white text-sm">
                          {item.latestTopWeight} {item.unit}
                          {item.latestReps > 0 && <span className="text-neutral-400 text-xs font-normal"> × {item.latestReps}</span>}
                        </div>
                        {item.latestDate && (
                          <span className="text-[10px] text-neutral-500 font-sans block">
                            {item.latestDate}
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        {item.previousTopWeight !== null ? (
                          <div>
                            <span className="text-neutral-300 font-semibold">
                              {item.previousTopWeight} {item.unit}
                            </span>
                            {item.previousDate && (
                              <span className="text-[10px] text-neutral-500 font-sans block">
                                {item.previousDate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic text-[11px] font-sans">Pierwszy zapis</span>
                        )}
                      </td>

                      <td className="py-3 text-center">
                        {isFirst ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 font-sans">
                            Baza odniesienia
                          </span>
                        ) : hasProgression ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 font-sans">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{item.deltaKg} {item.unit} (+{item.deltaPct}%)</span>
                          </span>
                        ) : isDecline ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 font-sans">
                            {item.deltaKg} {item.unit}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 font-sans">
                            Utrzymanie
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-center font-bold text-amber-400">
                        {item.estimated1RM > 0 ? `${item.estimated1RM} ${item.unit}` : '-'}
                      </td>

                      <td className="py-3 text-right">
                        <span className="text-white font-bold block">{item.totalTonnage.toLocaleString()} {item.unit}</span>
                        <span className="text-[10px] text-neutral-500 font-sans block">{item.totalSets} serii</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1RM Calculator & Intensity Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Widget */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white font-heading">
              Kalkulator 1RM (Siły Maksymalnej)
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-neutral-300 font-bold mb-1">
                <span>Ciężar podniesiony (kg):</span>
                <span className="text-amber-400 font-mono-numbers text-sm">{liftWeight} kg</span>
              </div>
              <input
                type="range"
                min="20"
                max="260"
                step="2.5"
                value={liftWeight}
                onChange={(e) => setLiftWeight(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-neutral-950 rounded-lg cursor-pointer h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-300 font-bold mb-1">
                <span>Liczba powtórzeń wykonanych:</span>
                <span className="text-amber-400 font-mono-numbers text-sm">{liftReps} powt.</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={liftReps}
                onChange={(e) => setLiftReps(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 bg-neutral-950 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Calculated 1RM Result */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-1">
              <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                Szacowane 1RM (One Rep Max)
              </span>
              <div className="text-3xl font-black text-white font-mono-numbers">
                {estimated1RM} <span className="text-sm text-amber-400 font-normal">kg</span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Epley: {epley1RM} kg • Brzycki: {brzycki1RM} kg
              </div>
            </div>
          </div>
        </div>

        {/* 1RM Percentage Progression Breakdown */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-white font-heading">
                Rozpiska Ciężarów Roboczych w oparciu o 1RM ({estimated1RM}kg)
              </h3>
            </div>
            <span className="text-xs text-neutral-400 hidden sm:inline">
              Dopasowanie pod RPE i RIR
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-semibold text-[11px]">
                  <th className="pb-2">% 1RM</th>
                  <th className="pb-2">Ciężar Roboczy</th>
                  <th className="pb-2">Szac. Powt.</th>
                  <th className="pb-2">RPE / RIR</th>
                  <th className="pb-2">Zastosowanie w Hyrox</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono-numbers">
                {percentageTable.map((row) => {
                  const targetLoad = Math.round((estimated1RM * row.percent) / 100);
                  return (
                    <tr key={row.percent} className="hover:bg-neutral-950/40 transition-colors">
                      <td className="py-2.5 font-bold text-amber-400">{row.percent}%</td>
                      <td className="py-2.5 font-bold text-white text-sm">{targetLoad} kg</td>
                      <td className="py-2.5 text-neutral-300">{row.repsEstimate}</td>
                      <td className="py-2.5 text-neutral-300">
                        RPE {row.rpe} <span className="text-neutral-500 font-sans">| RIR {row.targetRir}</span>
                      </td>
                      <td className="py-2.5 text-neutral-400 font-sans text-[11px]">{row.role}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
