import React, { useState, useEffect } from 'react';
import {
  X,
  Dumbbell,
  History,
  TrendingUp,
  Check,
  Plus,
  Minus,
  Trash2,
  Clock,
  Target,
  Flame,
  Activity,
  Award,
  Save,
  Calendar,
  Info,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Copy
} from 'lucide-react';
import { Exercise, WorkoutDay, WorkoutLogEntry, ExerciseSet, ExerciseUnit } from '../../types/hyrox';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  day: WorkoutDay;
  currentWeek: number;
  isOpen: boolean;
  onClose: () => void;
  workoutLogs: WorkoutLogEntry[];
  onUpdateExercisePlan: (updatedExercise: Exercise) => void;
  onSaveExercisePerformance: (
    sets: {
      setNumber: number;
      weightKg: number;
      reps: number;
      completed: boolean;
      unit: string;
      notes?: string;
    }[],
    exerciseNotes?: string,
    targetDate?: string,
    rpe?: number,
    rir?: number
  ) => void;
  onOpenChart?: (exerciseName: string) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  day,
  currentWeek,
  isOpen,
  onClose,
  workoutLogs = [],
  onUpdateExercisePlan,
  onSaveExercisePerformance,
  onOpenChart,
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'settings'>('log');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedLogDate, setSelectedLogDate] = useState<string>(todayStr);

  // 1. All historical logs for this exercise name
  const exerciseLogs = (workoutLogs || [])
    .filter(
      (l) => l.exerciseName && l.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
    )
    .sort((a, b) => (b.timestamp || b.dateStr).localeCompare(a.timestamp || a.dateStr));

  // Group all logs by date for the history tab
  const dateMap: Record<string, WorkoutLogEntry[]> = {};
  exerciseLogs.forEach((l) => {
    const d = l.dateStr || (l.timestamp ? l.timestamp.split('T')[0] : todayStr);
    if (!dateMap[d]) dateMap[d] = [];
    dateMap[d].push(l);
  });
  const pastDates = Object.keys(dateMap).sort().reverse();

  // 2. Previous completed session for this exercise from EARLIER DAYS / WEEKS (l.dayId !== day.id)
  const pastLogsExcludingThisDay = exerciseLogs.filter((l) => l.dayId !== day.id);
  const latestPrevDate =
    pastLogsExcludingThisDay[0]?.dateStr ||
    pastLogsExcludingThisDay[0]?.timestamp?.split('T')[0] ||
    pastDates[0];

  const rawPrevSets = latestPrevDate
    ? (dateMap[latestPrevDate] || pastLogsExcludingThisDay.filter((l) => (l.dateStr || l.timestamp?.split('T')[0]) === latestPrevDate))
    : [];
  const latestMap = new Map<number, WorkoutLogEntry>();
  rawPrevSets
    .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
    .forEach((s) => latestMap.set(s.setNumber || 1, s));
  const latestSets = Array.from(latestMap.values()).sort((a, b) => a.setNumber - b.setNumber);

  // 3. Check if there are sets already logged for THIS SPECIFIC DAY (day.id) on selectedLogDate
  const getThisDayLogs = (targetDate: string) => {
    return (workoutLogs || [])
      .filter(
        (l) =>
          l.dayId === day.id &&
          (l.dateStr === targetDate || (l.timestamp && l.timestamp.startsWith(targetDate))) &&
          l.exerciseName &&
          l.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
      )
      .sort((a, b) => a.setNumber - b.setNumber);
  };

  const baseWeight = typeof exercise.defaultWeightKg === 'number' ? exercise.defaultWeightKg : 0;
  const prevFirstWeight = latestSets[0]?.weightKg || 0;
  const progressionDelta =
    baseWeight > 0 && prevFirstWeight > 0 && baseWeight > prevFirstWeight
      ? Number((baseWeight - prevFirstWeight).toFixed(1))
      : 0;

  const exUnit = exercise.unit || 'kg';

interface ExerciseDetailSetItem {
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number;
  completed: boolean;
  unit: ExerciseUnit;
  notes?: string;
}

  // Helper to construct sets for selectedLogDate
  const buildInitialSets = (targetDate: string): ExerciseDetailSetItem[] => {
    const existing = getThisDayLogs(targetDate);
    if (existing.length > 0) {
      // If this specific day was already logged on that date, load completed sets
      return existing.map((l) => ({
        setNumber: l.setNumber,
        weightKg: l.weightKg,
        reps: l.reps,
        rir: l.rir !== undefined ? l.rir : (exercise.targetRIR ?? 2),
        completed: true,
        unit: (l.unit as ExerciseUnit) || exUnit,
        notes: l.notes || '',
      }));
    }

    // Fresh session: compute target weights with progression applied
    const plannedCount = Math.max(exercise.plannedSets || 3, latestSets.length);
    const defaultReps = parseInt(String(exercise.targetRepsRange || '8').split('-')[0]) || 8;

    return Array.from({ length: plannedCount }, (_, i) => {
      const prevSet = latestSets[i];
      let setWeight = baseWeight;

      if (prevSet && typeof prevSet.weightKg === 'number') {
        // Adjust previously performed set weight by progression delta (e.g. 80+2.5=82.5, 90+2.5=92.5, 100+2.5=102.5)
        setWeight = Number((prevSet.weightKg + progressionDelta).toFixed(1));
      } else if (latestSets.length > 0) {
        const lastW = latestSets[latestSets.length - 1]?.weightKg || baseWeight;
        setWeight = Number((lastW + progressionDelta).toFixed(1));
      }

      const setReps = prevSet?.reps || defaultReps;
      const setRir = prevSet?.rir !== undefined ? prevSet.rir : (exercise.targetRIR ?? 2);

      return {
        setNumber: i + 1,
        weightKg: setWeight,
        reps: setReps,
        rir: setRir,
        completed: false, // Fresh session: UNCOMPLETED
        unit: (prevSet?.unit as ExerciseUnit) || exUnit,
        notes: '',
      };
    });
  };

  const [setsToLog, setSetsToLog] = useState<ExerciseDetailSetItem[]>(() => buildInitialSets(selectedLogDate));
  const [exerciseNotes, setExerciseNotes] = useState<string>(() => getThisDayLogs(selectedLogDate)[0]?.notes || '');
  const [exerciseRpe, setExerciseRpe] = useState<number>(() => getThisDayLogs(selectedLogDate)[0]?.rpe || exercise.targetRPE || 8);
  const [exerciseRir, setExerciseRir] = useState<number>(() => getThisDayLogs(selectedLogDate)[0]?.rir ?? exercise.targetRIR ?? 2);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 4. State for plan settings
  const [planPlannedSets, setPlanPlannedSets] = useState(exercise.plannedSets || 3);
  const [planTargetReps, setPlanTargetReps] = useState(exercise.targetRepsRange || '8-10');
  const [planWeight, setPlanWeight] = useState(exercise.defaultWeightKg || 0);
  const [planUnit, setPlanUnit] = useState<ExerciseUnit>(exercise.unit || 'kg');
  const [planRestSec, setPlanRestSec] = useState(exercise.restSeconds || 90);
  const [planRestAfterExSec, setPlanRestAfterExSec] = useState(exercise.restAfterExerciseSec || 120);
  const [planTempo, setPlanTempo] = useState(exercise.tempo || '');
  const [planTargetPace, setPlanTargetPace] = useState(exercise.targetPace || '');
  const [planTargetHR, setPlanTargetHR] = useState(exercise.targetHR || '');
  const [planTechnique, setPlanTechnique] = useState(exercise.techniqueNotes || '');
  const [planRelevance, setPlanRelevance] = useState(exercise.hyroxRelevance || '');

  // Synchronize state whenever exercise or selectedLogDate changes
  useEffect(() => {
    setSetsToLog(buildInitialSets(selectedLogDate));
    const thisDay = getThisDayLogs(selectedLogDate);
    setExerciseNotes(thisDay[0]?.notes || '');
    setExerciseRpe(thisDay[0]?.rpe || exercise.targetRPE || 8);
    setExerciseRir(thisDay[0]?.rir ?? exercise.targetRIR ?? 2);

    setPlanPlannedSets(exercise.plannedSets || 3);
    setPlanTargetReps(exercise.targetRepsRange || '8-10');
    setPlanWeight(exercise.defaultWeightKg || 0);
    setPlanUnit(exercise.unit || 'kg');
    setPlanRestSec(exercise.restSeconds || 90);
    setPlanRestAfterExSec(exercise.restAfterExerciseSec || 120);
    setPlanTempo(exercise.tempo || '');
    setPlanTargetPace(exercise.targetPace || '');
    setPlanTargetHR(exercise.targetHR || '');
    setPlanTechnique(exercise.techniqueNotes || '');
    setPlanRelevance(exercise.hyroxRelevance || '');
  }, [exercise.id, selectedLogDate, day.id]);

  if (!isOpen) return null;

  const updateSetField = (index: number, field: string, val: any) => {
    setSetsToLog((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const toggleSetComplete = (index: number) => {
    setSetsToLog((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], completed: !next[index].completed };
      return next;
    });
  };

  const addSet = () => {
    setSetsToLog((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          setNumber: prev.length + 1,
          weightKg: last ? last.weightKg : exercise.defaultWeightKg || 0,
          reps: last ? last.reps : 8,
          rir: last ? last.rir : (exercise.targetRIR ?? 2),
          completed: false,
          unit: exUnit,
          notes: '',
        },
      ];
    });
  };

  const removeSet = (index: number) => {
    if (setsToLog.length <= 1) return;
    setSetsToLog((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
    );
  };

  const handleCopyPastSetsToCurrent = (pastSets: WorkoutLogEntry[]) => {
    if (!pastSets || pastSets.length === 0) return;
    setSetsToLog(
      pastSets.map((s, idx) => ({
        setNumber: idx + 1,
        weightKg: s.weightKg,
        reps: s.reps,
        rir: s.rir !== undefined ? s.rir : (exercise.targetRIR ?? 2),
        completed: true,
        unit: s.unit || exUnit,
        notes: s.notes,
      }))
    );
    setActiveTab('log');
    setSaveSuccessMsg(`Skopiowano ${pastSets.length} serii z poprzedniego treningu!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSavePerformance = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveExercisePerformance(setsToLog, exerciseNotes, selectedLogDate);
    setSaveSuccessMsg(`Zapisano wykonanie serii dla daty ${selectedLogDate}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSavePlanSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Exercise = {
      ...exercise,
      plannedSets: Number(planPlannedSets) || 3,
      targetRepsRange: String(planTargetReps).trim() || '8-10',
      defaultWeightKg: Number(planWeight) || 0,
      unit: planUnit,
      restSeconds: Number(planRestSec) || 90,
      restBetweenSetsSec: Number(planRestSec) || 90,
      restAfterExerciseSec: Number(planRestAfterExSec) || 120,
      tempo: planTempo.trim() || undefined,
      targetPace: planTargetPace.trim() || undefined,
      targetHR: Number(planTargetHR) > 0 ? Number(planTargetHR) : undefined,
      techniqueNotes: planTechnique.trim() || exercise.techniqueNotes,
      hyroxRelevance: planRelevance.trim() || exercise.hyroxRelevance,
    };
    onUpdateExercisePlan(updated);
    setSaveSuccessMsg('Zapisano nowe parametry w planie!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Last session quick stats
  const latestTonnage = latestSets.reduce((sum, s) => sum + (s.tonnageKg || s.weightKg * s.reps), 0);
  const latestMaxWeight = Math.max(...latestSets.map((s) => s.weightKg), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-3xl h-[95dvh] max-h-[95dvh] shadow-2xl p-4 sm:p-6 text-left relative space-y-4 mx-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
                  {exercise.muscleGroup.split('(')[0].trim()}
                </span>
                {exercise.exerciseType && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    {exercise.exerciseType === 'RUNNING'
                      ? 'Bieg'
                      : exercise.exerciseType === 'HYROX_STATION'
                      ? 'Stacja Hyrox'
                      : exercise.exerciseType === 'INTERVAL_CARDIO'
                      ? 'Kardio'
                      : 'Siła'}
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  {day.dayNamePolish} • Tydzień {currentWeek}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white font-heading mt-0.5">
                {exercise.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChart && (
              <button
                onClick={() => onOpenChart(exercise.name)}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Wykres progresu i 1RM"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Wykres</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'log'
                ? 'bg-amber-400 text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Zapisz / Edytuj Serie (Dziś)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-400 text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Poprzednie Treningi ({pastDates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parametry w Planie</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 overscroll-contain">
          {/* TAB 1: QUICK LOGGING / EDIT PERFORMANCE TODAY */}
          {activeTab === 'log' && (
            <div className="space-y-4">
              {/* Previous Performance Reference Card */}
              {latestSets.length > 0 ? (
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-amber-400/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                      <History className="w-3 h-3 text-amber-400" />
                      Wynik z poprzedniego treningu ({latestPrevDate}):
                    </span>
                    <div className="font-mono-numbers font-bold text-white text-sm">
                      {latestSets.map((s) => `${s.weightKg}${s.unit || 'kg'} × ${s.reps}`).join(' | ')}
                    </div>
                  </div>
                  <div className="text-right sm:text-right shrink-0">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Tonaż poprz.:</span>
                    <span className="text-amber-300 font-mono-numbers font-black text-sm">
                      {latestTonnage.toLocaleString()} kg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span>To ćwiczenie nie było jeszcze wcześniej rejestrowane w historii.</span>
                </div>
              )}

              {/* Sets Table */}
              <form onSubmit={handleSavePerformance} className="space-y-3">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-900">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span>Wykonane serie dla daty:</span>
                      </span>
                      <input
                        type="date"
                        value={selectedLogDate}
                        onChange={(e) => setSelectedLogDate(e.target.value)}
                        className="bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {latestSets.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCopyPastSetsToCurrent(latestSets)}
                          className="px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Wypełnij tabelę ciężarami z poprzedniego treningu"
                        >
                          <Copy className="w-3 h-3 text-amber-400" />
                          <span>Kopiuj z poprz. ({latestPrevDate})</span>
                        </button>
                      )}
                      <span className="text-[11px] text-neutral-400">
                        Cel: <strong className="text-amber-400">{exercise.plannedSets} × {exercise.targetRepsRange}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="w-full">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-400 font-semibold text-[10px] border-b border-neutral-900 pb-2">
                          <th className="w-10 pb-1.5">Seria</th>
                          <th className="pb-1.5 px-1">Ciężar ({exUnit})</th>
                          <th className="pb-1.5 px-1">Powtórzenia</th>
                          <th className="w-16 pb-1.5 px-1 text-center">RIR</th>
                          <th className="w-12 pb-1.5 text-center">Status</th>
                          <th className="w-8 pb-1.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900 font-mono-numbers">
                        {setsToLog.map((set, idx) => (
                          <tr key={idx} className="hover:bg-neutral-900/40">
                            <td className="py-2 text-neutral-400 font-bold">#{set.setNumber}</td>

                            {/* Weight */}
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                step="any"
                                min="0"
                                value={set.weightKg}
                                onChange={(e) => updateSetField(idx, 'weightKg', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded-lg px-2 py-1.5 text-center font-bold text-xs font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </td>

                            {/* Reps */}
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="1"
                                value={set.reps}
                                onChange={(e) => updateSetField(idx, 'reps', parseInt(e.target.value, 10) || 1)}
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded-lg px-2 py-1.5 text-center font-bold text-xs font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </td>

                            {/* Editable RIR */}
                            <td className="py-2 px-1 text-center">
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="0"
                                max="10"
                                value={set.rir !== undefined ? set.rir : 2}
                                onChange={(e) => updateSetField(idx, 'rir', parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-white text-amber-600 dark:text-amber-300 border border-gray-300 dark:bg-gray-800 dark:border-gray-700 rounded-lg px-1.5 py-1.5 text-center font-bold text-xs font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </td>

                            {/* Completed Toggle */}
                            <td className="py-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleSetComplete(idx)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer mx-auto ${
                                  set.completed
                                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                    : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-700'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                            </td>

                            {/* Delete */}
                            <td className="py-2 text-right">
                              {setsToLog.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSet(idx)}
                                  className="text-neutral-600 hover:text-red-400 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={addSet}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dodaj kolejną serię</span>
                  </button>
                </div>

                {/* Session / Exercise Notes */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Notatka do tego ćwiczenia (np. czucie mięśniowe, technika):
                  </label>
                  <input
                    type="text"
                    value={exerciseNotes}
                    onChange={(e) => setExerciseNotes(e.target.value)}
                    placeholder="np. Poszło lekko z zapasem 2 RIR, za tydzień +2.5kg"
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
                  />
                </div>

                {/* Save CTA */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-neutral-400">
                    Łączny tonaż serii:{' '}
                    <strong className="text-amber-400 font-mono-numbers">
                      {setsToLog
                        .reduce((sum, s) => sum + (s.completed ? s.weightKg * s.reps : 0), 0)
                        .toLocaleString()}{' '}
                      {exUnit}
                    </strong>
                  </span>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-wider cursor-pointer shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Zapisz Wykonane Serie</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: HISTORY TIMELINE OF PAST SESSIONS */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {pastDates.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl border border-neutral-800">
                  <History className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                  <p>Brak wcześniejszych zapisów dla tego ćwiczenia.</p>
                  <p className="mt-1 text-neutral-400">
                    Zapisz dzisiejszą serię w zakładce &quot;Zapisz / Edytuj Serie&quot;, aby rozpocząć śledzenie historii.
                  </p>
                </div>
              ) : (
                pastDates.map((dateStr) => {
                  const dayEntries = dateMap[dateStr];
                  const dayTonnage = dayEntries.reduce(
                    (sum, e) => sum + (e.tonnageKg || e.weightKg * e.reps),
                    0
                  );
                  const dayMaxWeight = Math.max(...dayEntries.map((e) => e.weightKg), 0);

                  return (
                    <div
                      key={dateStr}
                      className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-white text-xs">{dateStr}</span>
                          {dateStr === todayStr && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-black">
                              DZISIAJ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-[11px] font-mono-numbers text-right">
                            <span className="text-neutral-400 mr-2">
                              Max: <strong className="text-white">{dayMaxWeight} {exUnit}</strong>
                            </span>
                            <span className="text-amber-400 font-bold">
                              Tonaż: {dayTonnage.toLocaleString()} {exUnit}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyPastSetsToCurrent(dayEntries)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-amber-400 hover:text-black text-amber-400 border border-neutral-800 hover:border-amber-400 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            title="Wstaw te ciężary i powtórzenia do formularza zapisu"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Użyj tych serii</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono-numbers text-xs">
                        {dayEntries.map((entry, eIdx) => (
                          <div
                            key={entry.id || eIdx}
                            className="p-2 rounded-lg bg-neutral-900 border border-neutral-850 flex items-center justify-between"
                          >
                            <span className="text-neutral-400 text-[11px]">S{entry.setNumber}:</span>
                            <span className="font-bold text-white">
                              {entry.weightKg > 0 ? `${entry.weightKg}${entry.unit || exUnit} × ` : ''}
                              {entry.reps} powt
                            </span>
                          </div>
                        ))}
                      </div>

                      {dayEntries[0]?.notes && (
                        <div className="text-[11px] text-neutral-400 bg-neutral-900/60 p-2 rounded-lg italic">
                          &quot;{dayEntries[0].notes}&quot;
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: PLAN SETTINGS / TARGETS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSavePlanSettings} className="space-y-3 text-xs bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <span className="text-xs font-bold text-white block mb-2">
                Dostosuj domyślne parametry tego ćwiczenia w Twoim planie:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Serie w planie:</label>
                  <input
                    type="number"
                    value={planPlannedSets}
                    onChange={(e) => setPlanPlannedSets(parseInt(e.target.value) || 1)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Powtórzenia:</label>
                  <input
                    type="text"
                    value={planTargetReps}
                    onChange={(e) => setPlanTargetReps(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Ciężar bazowy:</label>
                  <input
                    type="number"
                    step="2.5"
                    value={planWeight}
                    onChange={(e) => setPlanWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Jednostka:</label>
                  <select
                    value={planUnit}
                    onChange={(e) => setPlanUnit(e.target.value as ExerciseUnit)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                    <option value="km">km</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-900">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Przerwa między seriami (s):</label>
                  <input
                    type="number"
                    value={planRestSec}
                    onChange={(e) => setPlanRestSec(parseInt(e.target.value) || 90)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Przerwa po ćwiczeniu (s):</label>
                  <input
                    type="number"
                    value={planRestAfterExSec}
                    onChange={(e) => setPlanRestAfterExSec(parseInt(e.target.value) || 120)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Tempo ruchu (np. 3-0-1-0):</label>
                  <input
                    type="text"
                    value={planTempo}
                    onChange={(e) => setPlanTempo(e.target.value)}
                    placeholder="Opcjonalne"
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>

              {(exercise.exerciseType === 'RUNNING' || exercise.exerciseType === 'HYROX_STATION' || exercise.exerciseType === 'INTERVAL_CARDIO') && (
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-900">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">Tempo celowe (opcjonalne):</label>
                    <input
                      type="text"
                      value={planTargetPace}
                      onChange={(e) => setPlanTargetPace(e.target.value)}
                      placeholder="np. 4:30 min/km"
                      className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">Tętno HR (bpm, opcjonalne):</label>
                    <input
                      type="number"
                      value={planTargetHR}
                      onChange={(e) => setPlanTargetHR(e.target.value)}
                      placeholder="np. 165"
                      className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1.5 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Wskazówki techniczne:</label>
                  <textarea
                    rows={2}
                    value={planTechnique}
                    onChange={(e) => setPlanTechnique(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Cel / Zastosowanie w Hyrox:</label>
                  <input
                    type="text"
                    value={planRelevance}
                    onChange={(e) => setPlanRelevance(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs cursor-pointer shadow-md"
                >
                  Zapisz Zmiany w Planie
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
