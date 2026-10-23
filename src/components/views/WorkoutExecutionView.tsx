import React, { useState } from 'react';
import {
  Play,
  Flame,
  Award,
  Activity,
  Dumbbell,
  Clock,
  CheckCircle2,
  TrendingUp,
  History,
  Sliders,
  ArrowRight,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  WorkoutDay,
  Exercise,
  TrainingCycleCatalog,
  MesocyclePhase,
  WorkoutLogEntry,
  ExerciseUnit,
  ExercisePlannedSet
} from '../../types/hyrox';
import { ExerciseChartModal } from '../modals/ExerciseChartModal';
import { PreviousWorkoutModal } from '../modals/PreviousWorkoutModal';
import { ExerciseDetailModal } from '../modals/ExerciseDetailModal';

interface WorkoutExecutionViewProps {
  activeCycle: TrainingCycleCatalog;
  currentWeek: number;
  weeksList: MesocyclePhase[];
  currentWeekDays: WorkoutDay[];
  selectedDayId: string;
  onSelectDayId: (dayId: string) => void;
  onStartWorkout: (day: WorkoutDay) => void;
  onOpenSimulator: () => void;
  onOpenRecovery: () => void;
  onUpdateDay: (day: WorkoutDay) => void;
  workoutLogs: WorkoutLogEntry[];
  onSaveLogs?: (newEntries: WorkoutLogEntry[]) => void;
  onWeekChange: (week: number) => void;
  activeOngoingWorkoutDay?: WorkoutDay | null;
  isWorkoutMinimized?: boolean;
  onMaximizeWorkout?: () => void;
}

export const WorkoutExecutionView: React.FC<WorkoutExecutionViewProps> = ({
  activeCycle,
  currentWeek,
  weeksList,
  currentWeekDays,
  selectedDayId,
  onSelectDayId,
  onStartWorkout,
  onOpenSimulator,
  onOpenRecovery,
  onUpdateDay,
  workoutLogs = [],
  onSaveLogs,
  onWeekChange,
  activeOngoingWorkoutDay,
  isWorkoutMinimized,
  onMaximizeWorkout,
}) => {
  const [chartExerciseName, setChartExerciseName] = useState<string | null>(null);
  const [isPreviousWorkoutModalOpen, setIsPreviousWorkoutModalOpen] = useState(false);
  const [activeDetailExercise, setActiveDetailExercise] = useState<Exercise | null>(null);
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});

  const toggleExerciseExpand = (exerciseId: string) => {
    setExpandedExerciseIds((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const selectedDay =
    currentWeekDays.find((d) => d && d.id === selectedDayId) || currentWeekDays[0] || null;

  const currentPhase = weeksList.find((w) => w.week === currentWeek) || {
    week: currentWeek,
    name: `Tydzień ${currentWeek}: Plan Indywidualny`,
    volumeMultiplier: 1.0,
    targetRIR: 2,
    targetRPE: 8.0,
    progressionNote: 'Dostosuj obciążenie i tempo w każdym ćwiczeniu.',
    isDeload: false,
  };

  // Helper to check if day has logged workouts
  const isDayCompleted = (day: WorkoutDay) => {
    if (!day) return false;
    return workoutLogs.some(
      (l) => l.dayId === day.id || (l.dayTitle === day.title && l.dayId?.startsWith(`w${currentWeek}-`))
    );
  };

  // Previous logs for selected day
  const previousWorkoutLogs = selectedDay
    ? workoutLogs.filter(
        (l) => l.dayTitle === selectedDay.title || l.dayId === selectedDay.id
      )
    : [];
  const prevDates = Array.from(
    new Set(previousWorkoutLogs.map((l) => l.dateStr || l.timestamp?.split('T')[0]))
  )
    .filter(Boolean)
    .sort()
    .reverse();
  const latestPrevDate = prevDates[0];
  const latestPreviousSessionLogs = latestPrevDate
    ? previousWorkoutLogs.filter(
        (l) => (l.dateStr || l.timestamp?.split('T')[0]) === latestPrevDate
      )
    : [];

  const handleUpdateExerciseInPlan = (updatedExercise: Exercise) => {
    if (!selectedDay) return;
    const updatedExercises = selectedDay.exercises.map((ex) =>
      ex.id === updatedExercise.id ? updatedExercise : ex
    );
    const updatedDay: WorkoutDay = {
      ...selectedDay,
      exercises: updatedExercises,
    };
    onUpdateDay(updatedDay);
    setActiveDetailExercise(updatedExercise);
  };

  const handleSaveExercisePerformance = (
    sets: {
      setNumber: number;
      weightKg: number;
      reps: number;
      completed: boolean;
      unit: string;
      notes?: string;
      rir?: number;
      rpe?: number;
      distance?: number;
      distanceUnit?: 'm' | 'km';
      pace?: string;
      targetHr?: number;
    }[],
    exerciseNotes?: string,
    targetDate?: string,
    rpe?: number,
    rir?: number
  ) => {
    if (!selectedDay || !activeDetailExercise) return;
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const sessionId = `manual-session-${dateStr}-${selectedDay.id}`;
    const isExCardio = activeDetailExercise.category === 'cardio' || activeDetailExercise.exerciseType === 'RUNNING';

    const newEntries: WorkoutLogEntry[] = sets
      .filter((s) => s.completed)
      .map((s) => ({
        id: `log-${Date.now()}-${s.setNumber}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        dateStr,
        dayId: selectedDay.id,
        dayTitle: selectedDay.title,
        exerciseId: activeDetailExercise.id,
        exerciseName: activeDetailExercise.name,
        muscleGroup: activeDetailExercise.muscleGroup,
        setNumber: s.setNumber,
        weightKg: Number(s.weightKg) || 0,
        reps: Number(s.reps) || 0,
        tonnageKg: isExCardio ? 0 : (Number(s.weightKg) || 0) * (Number(s.reps) || 0),
        rpe: typeof s.rpe === 'number' ? s.rpe : (typeof rpe === 'number' ? rpe : (activeDetailExercise.targetRPE || 8)),
        rir: typeof s.rir === 'number' ? s.rir : (typeof rir === 'number' ? rir : (activeDetailExercise.targetRIR ?? 2)),
        notes: s.notes || exerciseNotes || undefined,
        sessionId,
        sessionTitle: `${selectedDay.dayNamePolish ? selectedDay.dayNamePolish + ': ' : ''}${selectedDay.title}`,
        activityType: isExCardio ? 'RUNNING' : 'STRENGTH',
        unit: (s.unit as ExerciseUnit) || activeDetailExercise.unit || (isExCardio ? 'm' : 'kg'),
        targetDistance: s.distance || activeDetailExercise.targetDistance,
        distanceUnit: s.distanceUnit || activeDetailExercise.distanceUnit || 'm',
        targetPace: s.pace || activeDetailExercise.targetPace,
        actualPace: s.pace || activeDetailExercise.targetPace,
        targetHR: s.targetHr || activeDetailExercise.targetHR,
        actualHR: s.targetHr || activeDetailExercise.targetHR,
      }));

    if (newEntries.length > 0 && onSaveLogs) {
      onSaveLogs(newEntries);
    }

    // Also sync the updated sets into the exercise state for this day
    const updatedPlannedDetails: ExercisePlannedSet[] = sets.map((s) => ({
      setNumber: s.setNumber,
      reps: s.reps,
      weightKg: Number(s.weightKg) || 0,
      rir: typeof s.rir === 'number' ? s.rir : (typeof rir === 'number' ? rir : (activeDetailExercise.targetRIR ?? 2)),
      rpe: typeof s.rpe === 'number' ? s.rpe : (typeof rpe === 'number' ? rpe : (activeDetailExercise.targetRPE || 8)),
      distance: s.distance,
      distanceUnit: s.distanceUnit,
      pace: s.pace,
      targetHr: s.targetHr,
    }));
    handleUpdateExerciseInPlan({
      ...activeDetailExercise,
      plannedSets: sets.length,
      plannedSetsDetails: updatedPlannedDetails,
    });
  };

  const calculateDayPlannedTonnage = (day: WorkoutDay) => {
    if (!day || !Array.isArray(day.exercises) || day.exercises.length === 0) return 0;
    return day.exercises.reduce((sum, ex) => {
      if (!ex) return sum;
      const baseWeight = typeof ex.defaultWeightKg === 'number' ? ex.defaultWeightKg : 0;
      const repsRange = ex.targetRepsRange ? String(ex.targetRepsRange) : '8';
      const reps = parseInt(repsRange.split('-')[0]) || 8;
      const sets = typeof ex.plannedSets === 'number' ? ex.plannedSets : 3;
      return sum + baseWeight * reps * sets;
    }, 0);
  };

  return (
    <div className="space-y-4 pb-24 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Week Header info with quick change */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 border border-neutral-800 rounded-3xl p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-400 text-black shadow-sm">
              Tydzień {currentWeek}
            </span>
            <span className="text-xs font-bold text-white font-heading truncate max-w-[180px] sm:max-w-xs">
              {currentPhase.name.replace(/^Tydzień\s*\d+:\s*/i, '')}
            </span>
          </div>

          {currentPhase.isDeload && (
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Deload
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
              Wybierz tydzień
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {weeksList.map((week) => {
              const isCurrent = week.week === currentWeek;
              return (
                <button
                  key={week.week}
                  onClick={() => onWeekChange(week.week)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[42px] ${
                    isCurrent
                      ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20 ring-2 ring-amber-300'
                      : 'bg-neutral-950 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <span>Tydzień {week.week}</span>
                  {week.isDeload && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-black ${
                        isCurrent ? 'bg-black text-amber-400' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      Deload
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Selector Strip - Big tactile buttons with completion status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {currentWeekDays.map((day) => {
            const isSelected = selectedDay && selectedDay.id === day.id;
            const completed = isDayCompleted(day);

            return (
              <button
                key={day.id}
                onClick={() => onSelectDayId(day.id)}
                className={`flex-1 min-w-[70px] p-2 rounded-2xl border text-center transition-all cursor-pointer touch-manipulation min-h-[58px] flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/20 font-black ring-2 ring-amber-300 scale-[1.02]'
                    : completed
                    ? 'bg-neutral-900/90 text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-950/80 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
                title={day.title}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? 'text-black' : 'text-neutral-400'
                    }`}
                  >
                    D{day.dayNumber}
                  </span>
                  {completed && (
                    <CheckCircle2
                      className={`w-3 h-3 ${isSelected ? 'text-black' : 'text-emerald-400'}`}
                    />
                  )}
                </div>

                <span
                  className={`text-[11px] font-extrabold truncate max-w-[65px] ${
                    isSelected ? 'text-black font-black' : 'text-white'
                  }`}
                >
                  {day.dayNamePolish?.slice(0, 3) || `D${day.dayNumber}`}
                </span>

                <span
                  className={`text-[8px] uppercase font-bold tracking-tight mt-0.5 ${
                    isSelected ? 'text-neutral-900' : 'text-neutral-500'
                  }`}
                >
                  {day.type === 'RUNNING_HIIT' ? 'Bieg' : day.type === 'WEEKEND_HYROX' ? 'Hyrox' : day.type === 'REST_RECOVERY' ? 'Rest' : 'Siła'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <div className="space-y-4">
          {/* Day Hero Card & MAIN CTA */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    selectedDay.type === 'FBW'
                      ? 'bg-amber-400 text-black'
                      : selectedDay.type === 'RUNNING_HIIT'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : selectedDay.type === 'WEEKEND_HYROX'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : selectedDay.type === 'REST_RECOVERY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {selectedDay.type.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-500" /> ~{selectedDay.durationMinutes} min
                </span>
                <span className="text-[11px] text-neutral-400">
                  RPE <strong className="text-white">{selectedDay.targetRpeRange}</strong> • RIR <strong className="text-white">{selectedDay.targetRirRange}</strong>
                </span>
              </div>

              <h2 className="text-xl font-black text-white font-heading leading-tight">
                {selectedDay.dayNamePolish}: {selectedDay.title}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {selectedDay.subtitle}
              </p>
            </div>

            {/* PREVIOUS SESSION RECAP (if available) */}
            {latestPreviousSessionLogs.length > 0 && (
              <div
                onClick={() => setIsPreviousWorkoutModalOpen(true)}
                className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-300 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-400/15 transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <History className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Poprzednio ({latestPrevDate}):{' '}
                    <strong className="text-white font-mono-numbers font-semibold">
                      {latestPreviousSessionLogs.length} serii ukończonych
                    </strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 underline shrink-0">
                  Zobacz wyniki
                </span>
              </div>
            )}

            {/* PRIMARY ACTION BUTTON (Large touch target for gym usage) */}
            <div className="pt-2">
              {activeOngoingWorkoutDay && isWorkoutMinimized ? (
                <button
                  onClick={() => {
                    if (onMaximizeWorkout) onMaximizeWorkout();
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-amber-400/30 flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[58px] active:scale-[0.98] ring-2 ring-amber-300 animate-pulse"
                  aria-label="Wznów trwający trening"
                >
                  <Play className="w-5 h-5 fill-current stroke-[2.5]" />
                  <span>Wznów Trening w Toku ({activeOngoingWorkoutDay.dayNamePolish || activeOngoingWorkoutDay.title})</span>
                </button>
              ) : (
                <>
                  {(selectedDay.type === 'FBW' || selectedDay.type === 'CUSTOM') && (
                    <button
                      onClick={() => onStartWorkout(selectedDay)}
                      className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-amber-400/25 flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[58px] active:scale-[0.98]"
                      aria-label="Rozpocznij trening na żywo"
                    >
                      <Play className="w-5 h-5 fill-current stroke-[2.5]" />
                      <span>Rozpocznij Trening (Na Żywo)</span>
                    </button>
                  )}

              {selectedDay.type === 'RUNNING_HIIT' && (
                <button
                  onClick={() => onStartWorkout(selectedDay)}
                  className="w-full py-4 px-6 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-red-500/25 flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[58px] active:scale-[0.98]"
                  aria-label="Otwórz dziennik biegu HIIT"
                >
                  <Flame className="w-5 h-5 fill-current" />
                  <span>Otwórz Dziennik Biegu HIIT</span>
                </button>
              )}

              {selectedDay.type === 'WEEKEND_HYROX' && (
                <button
                  onClick={onOpenSimulator}
                  className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-purple-600/25 flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[58px] active:scale-[0.98]"
                  aria-label="Uruchom symulator Hyrox i stoper"
                >
                  <Award className="w-5 h-5" />
                  <span>Symulator Hyrox & Stoper</span>
                </button>
              )}

              {selectedDay.type === 'REST_RECOVERY' && (
                <button
                  onClick={onOpenRecovery}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 cursor-pointer touch-manipulation min-h-[58px] active:scale-[0.98]"
                  aria-label="Oceń gotowość i regenerację"
                >
                  <Activity className="w-5 h-5" />
                  <span>Oceń Gotowość & Sen</span>
                </button>
              )}
                </>
              )}
            </div>
          </div>

          {/* Exercises To Complete Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-black uppercase text-neutral-300 font-heading tracking-wider">
                Ćwiczenia do wykonania ({selectedDay.exercises?.length || 0})
              </span>
              <span className="text-neutral-400">
                Tonaż: <strong className="text-amber-400 font-mono-numbers">~{calculateDayPlannedTonnage(selectedDay).toLocaleString()} kg</strong>
              </span>
            </div>

            {(!selectedDay.exercises || selectedDay.exercises.length === 0) ? (
              <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-900 rounded-3xl border border-neutral-800">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p>Brak zaplanowanych ćwiczeń na ten dzień.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDay.exercises.map((exercise, index) => {
                  const isExpanded = !!expandedExerciseIds[exercise.id];

                  // Active sets for this exercise (including newly added during workout / logged today)
                  const todayStr = new Date().toISOString().split('T')[0];
                  const currentSessionLogs = (workoutLogs || [])
                    .filter(
                      (l) =>
                        l.exerciseName &&
                        l.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase() &&
                        (l.dayId === selectedDay.id || l.dateStr === todayStr || (l.timestamp && l.timestamp.startsWith(todayStr)))
                    )
                    .sort((a, b) => a.setNumber - b.setNumber);

                  const activeOngoingEx = activeOngoingWorkoutDay?.exercises?.find(
                    (e) => e.id === exercise.id || e.name.trim().toLowerCase() === exercise.name.trim().toLowerCase()
                  );

                  const isCardio =
                    exercise.category === 'cardio' ||
                    exercise.exerciseType === 'RUNNING';

                  let detailedSets: {
                    setNumber: number;
                    reps: number | string;
                    weightKg: number;
                    rir: number;
                    rpe: number;
                    completed?: boolean;
                    distance?: number;
                    distanceUnit?: 'm' | 'km';
                    pace?: string;
                    targetHr?: number;
                  }[] = [];

                  if (currentSessionLogs.length > 0) {
                    detailedSets = currentSessionLogs.map((l) => ({
                      setNumber: l.setNumber,
                      reps: l.reps,
                      weightKg: l.weightKg,
                      rir: l.rir !== undefined ? l.rir : (exercise.targetRIR ?? 2),
                      rpe: l.rpe !== undefined ? l.rpe : (exercise.targetRPE || 8),
                      completed: true,
                      distance: l.targetDistance ?? exercise.targetDistance ?? 800,
                      distanceUnit: (l.distanceUnit || exercise.distanceUnit || 'm') as 'm' | 'km',
                      pace: l.actualPace || l.targetPace || exercise.targetPace || '4:20',
                      targetHr: l.actualHR || l.targetHR || exercise.targetHR || 165,
                    }));

                    const plannedTotal = Math.max(
                      exercise.plannedSets || 0,
                      exercise.plannedSetsDetails?.length || 0,
                      activeOngoingEx?.plannedSets || 0,
                      activeOngoingEx?.plannedSetsDetails?.length || 0
                    );
                    for (let i = detailedSets.length + 1; i <= plannedTotal; i++) {
                      const plannedItem =
                        exercise.plannedSetsDetails?.find((p) => p.setNumber === i) ||
                        activeOngoingEx?.plannedSetsDetails?.find((p) => p.setNumber === i);
                      const baseReps = (plannedItem && plannedItem.reps !== undefined)
                        ? plannedItem.reps
                        : parseInt(String(exercise.targetRepsRange || '8').split('-')[0]) || 8;
                      const baseW = (plannedItem && plannedItem.weightKg !== undefined) ? plannedItem.weightKg : exercise.defaultWeightKg || 0;
                      detailedSets.push({
                        setNumber: i,
                        reps: baseReps,
                        weightKg: baseW,
                        rir: plannedItem?.rir ?? exercise.targetRIR ?? 2,
                        rpe: plannedItem?.rpe ?? exercise.targetRPE ?? 8,
                        distance: plannedItem?.distance ?? exercise.targetDistance ?? 800,
                        distanceUnit: (plannedItem?.distanceUnit || exercise.distanceUnit || 'm') as 'm' | 'km',
                        pace: plannedItem?.pace || exercise.targetPace || '4:20',
                        targetHr: plannedItem?.targetHr || plannedItem?.targetHR || exercise.targetHR || 165,
                        completed: false,
                      });
                    }
                  } else if (activeOngoingEx?.plannedSetsDetails && activeOngoingEx.plannedSetsDetails.length > 0) {
                    detailedSets = activeOngoingEx.plannedSetsDetails.map((s, idx) => ({
                      setNumber: s.setNumber || idx + 1,
                      reps: s.reps ?? 8,
                      weightKg: s.weightKg ?? 0,
                      rir: s.rir !== undefined ? s.rir : (activeOngoingEx.targetRIR ?? 2),
                      rpe: s.rpe !== undefined ? s.rpe : (activeOngoingEx.targetRPE || 8),
                      distance: s.distance ?? exercise.targetDistance ?? 800,
                      distanceUnit: (s.distanceUnit || exercise.distanceUnit || 'm') as 'm' | 'km',
                      pace: s.pace || exercise.targetPace || '4:20',
                      targetHr: s.targetHr || s.targetHR || exercise.targetHR || 165,
                      completed: false,
                    }));
                  } else if (exercise.plannedSetsDetails && exercise.plannedSetsDetails.length > 0) {
                    detailedSets = exercise.plannedSetsDetails.map((s, idx) => ({
                      setNumber: s.setNumber || idx + 1,
                      reps: s.reps ?? 8,
                      weightKg: s.weightKg ?? 0,
                      rir: s.rir !== undefined ? s.rir : (exercise.targetRIR ?? 2),
                      rpe: s.rpe !== undefined ? s.rpe : (exercise.targetRPE || 8),
                      distance: s.distance ?? exercise.targetDistance ?? 800,
                      distanceUnit: (s.distanceUnit || exercise.distanceUnit || 'm') as 'm' | 'km',
                      pace: s.pace || exercise.targetPace || '4:20',
                      targetHr: s.targetHr || s.targetHR || exercise.targetHR || 165,
                      completed: false,
                    }));
                  } else {
                    const count = Math.max(exercise.plannedSets || 1, activeOngoingEx?.plannedSets || 1);
                    detailedSets = Array.from({ length: count }, (_, i) => {
                      const baseReps = parseInt(String(exercise.targetRepsRange || '8').split('-')[0]) || 8;
                      return {
                        setNumber: i + 1,
                        reps: baseReps,
                        weightKg: exercise.defaultWeightKg || 0,
                        rir: exercise.targetRIR ?? 2,
                        rpe: exercise.targetRPE || 8,
                        distance: exercise.targetDistance || 800,
                        distanceUnit: (exercise.distanceUnit || 'm') as 'm' | 'km',
                        pace: exercise.targetPace || '4:20',
                        targetHr: exercise.targetHR || 165,
                        completed: false,
                      };
                    });
                  }

                  // Dynamic Reps Display: e.g. "2-6" if different, or "6" if all equal
                  const repsList = detailedSets
                    .map((s) => (typeof s.reps === 'number' ? s.reps : parseInt(String(s.reps)) || 0))
                    .filter((n) => n > 0);
                  let displayReps = exercise.targetRepsRange || '8';
                  if (repsList.length > 0) {
                    const minReps = Math.min(...repsList);
                    const maxReps = Math.max(...repsList);
                    displayReps = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;
                  }

                  // Dynamic Weight Display: e.g. "85 kg" if constant, "80-90 kg" if variable, "Ciało" if 0
                  const weightList = detailedSets.map((s) => Number(s.weightKg) || 0);
                  let displayWeightDynamic = 'Ciało';
                  if (weightList.length > 0 && Math.max(...weightList) > 0) {
                    const minW = Math.min(...weightList);
                    const maxW = Math.max(...weightList);
                    const minWStr = minW % 1 === 0 ? String(minW) : minW.toFixed(1);
                    const maxWStr = maxW % 1 === 0 ? String(maxW) : maxW.toFixed(1);
                    displayWeightDynamic =
                      minW === maxW
                        ? `${minWStr} ${exercise.unit || 'kg'}`
                        : `${minWStr}-${maxWStr} ${exercise.unit || 'kg'}`;
                  }

                  // Historical comparison for this specific exercise
                  const pastLogsForEx = workoutLogs
                    .filter(
                      (l) =>
                        l.exerciseName &&
                        l.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
                    )
                    .sort((a, b) => (b.timestamp || b.dateStr).localeCompare(a.timestamp || a.dateStr));
                  const lastExDate = pastLogsForEx[0]?.dateStr || pastLogsForEx[0]?.timestamp?.split('T')[0];
                  const lastSets = lastExDate
                    ? pastLogsForEx.filter(
                        (l) => (l.dateStr || l.timestamp?.split('T')[0]) === lastExDate
                      )
                    : [];

                  return (
                    <div
                      key={exercise.id}
                      className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-3xl p-4 shadow-md space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                              #{index + 1} • {exercise.muscleGroup?.split('(')[0]?.trim() || (isCardio ? 'Cardio / Bieg' : 'Ogólne')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-950 text-neutral-400 border border-neutral-800">
                              {isCardio ? (exercise.distanceUnit || 'm') : (exercise.unit || 'kg')}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white font-heading">
                            {exercise.name}
                          </h3>
                        </div>

                        <button
                          onClick={() => setChartExerciseName(exercise.name)}
                          className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 text-xs transition-colors cursor-pointer touch-manipulation"
                          title="Wykres progresu"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Previous result tag */}
                      {lastSets.length > 0 && (
                        <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] text-amber-300 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">
                            Ostatnio ({lastExDate}):{' '}
                            <strong className="text-white font-mono-numbers">
                              {isCardio
                                ? lastSets.map((s) => `${s.targetDistance || 800}${s.distanceUnit || 'm'} @ ${s.actualPace || s.targetPace || '4:20'}`).join(' | ')
                                : lastSets.map((s) => `${s.weightKg}${s.unit || 'kg'}×${s.reps}`).join(' | ')}
                            </strong>
                          </span>
                        </div>
                      )}

                      {/* Numeric summary grid with Chevron toggle next to Przerwa */}
                      <div className="grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Serie</span>
                          <span className="font-extrabold text-white font-mono-numbers text-sm">
                            {detailedSets.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">
                            {isCardio ? 'Dystans' : 'Powtórzenia'}
                          </span>
                          <span className="font-extrabold text-white font-mono-numbers text-sm">
                            {isCardio
                              ? `${detailedSets[0]?.distance || exercise.targetDistance || 800} ${detailedSets[0]?.distanceUnit || exercise.distanceUnit || 'm'}`
                              : displayReps}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">
                            {isCardio ? 'Tempo' : 'Ciężar'}
                          </span>
                          <span className="font-black text-amber-400 font-mono-numbers text-sm">
                            {isCardio
                              ? (detailedSets[0]?.pace || exercise.targetPace || '4:20')
                              : displayWeightDynamic}
                          </span>
                        </div>
                        <div
                          onClick={() => toggleExerciseExpand(exercise.id)}
                          className="flex items-center justify-center gap-1 cursor-pointer select-none group"
                          title="Rozwiń / zwiń listę serii"
                        >
                          <div>
                            <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Przerwa</span>
                            <span className="font-bold text-neutral-300 font-mono-numbers text-sm">
                              {exercise.restSeconds || exercise.restBetweenSetsSec || 90}s
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExerciseExpand(exercise.id);
                            }}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-amber-400 text-black shadow-sm'
                                : 'bg-neutral-900 text-amber-400 group-hover:bg-neutral-800'
                            }`}
                            aria-label="Rozwiń listę serii"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Sets List (Rozwijana lista serii indeksowana od 1) */}
                      {isExpanded && (
                        <div className="p-3 bg-neutral-950/90 rounded-2xl border border-neutral-800 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 pb-1.5 border-b border-neutral-900">
                            <span className="uppercase tracking-wider text-amber-400">
                              Rozpiska serii ({detailedSets.length})
                            </span>
                            <span className="text-neutral-500 font-mono-numbers text-[10px]">
                              Przerwa po serii: {exercise.restSeconds || exercise.restBetweenSetsSec || 90}s
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono-numbers">
                            {detailedSets.map((set, sIdx) => {
                              if (isCardio) {
                                const sDist = set.distance ?? exercise.targetDistance ?? 800;
                                const sUnit = set.distanceUnit || exercise.distanceUnit || 'm';
                                const sPace = set.pace || exercise.targetPace || '4:20';
                                const sHr = set.targetHr || exercise.targetHR || 165;
                                return (
                                  <div
                                    key={sIdx}
                                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/90 border border-neutral-800/80 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-neutral-700 font-bold flex items-center justify-center text-[10px]">
                                        #{set.setNumber || sIdx + 1}
                                      </span>
                                      <span className="text-white font-black">
                                        {sDist} {sUnit}
                                      </span>
                                      <span className="text-neutral-500">•</span>
                                      <span className="text-amber-300 font-black">
                                        {sPace} min/km
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                                        {sHr} bpm
                                      </span>
                                      {set.rpe !== undefined && (
                                        <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium">
                                          RPE {set.rpe}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              const sWeight = Number(set.weightKg) || 0;
                              return (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/90 border border-neutral-800/80 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-neutral-700 font-bold flex items-center justify-center text-[10px]">
                                      #{set.setNumber || sIdx + 1}
                                    </span>
                                    <span className="text-white font-black">
                                      {sWeight > 0 ? `${sWeight} ${exercise.unit || 'kg'}` : 'Ciało'}
                                    </span>
                                    <span className="text-neutral-500">×</span>
                                    <span className="text-amber-300 font-black">
                                      {set.reps} powt
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium">
                                      RIR {set.rir !== undefined ? set.rir : (exercise.targetRIR ?? 2)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium">
                                      RPE {set.rpe !== undefined ? set.rpe : (exercise.targetRPE || 8)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Target Pace and HR if present */}
                      {(exercise.targetPace || exercise.targetHR) && (
                        <div className="flex items-center gap-2 text-[11px]">
                          {exercise.targetPace && (
                            <span className="text-emerald-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-medium">
                              Tempo: <strong>{exercise.targetPace}</strong>
                            </span>
                          )}
                          {exercise.targetHR && (
                            <span className="text-rose-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-medium">
                              HR: <strong>{exercise.targetHR} bpm</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {exercise.techniqueNotes && (
                        <p className="text-[11px] text-neutral-400 leading-relaxed italic bg-neutral-950/40 p-2 rounded-xl">
                          <span className="text-neutral-300 not-italic font-semibold">Wskazówka:</span> {exercise.techniqueNotes}
                        </p>
                      )}

                      {/* Check off button */}
                      <button
                        onClick={() => setActiveDetailExercise(exercise)}
                        className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 border border-neutral-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[44px]"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span>Szczegóły & Odhacz Serie</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {activeDetailExercise && selectedDay && (
        <ExerciseDetailModal
          isOpen={!!activeDetailExercise}
          onClose={() => setActiveDetailExercise(null)}
          exercise={activeDetailExercise}
          day={selectedDay}
          currentWeek={currentWeek}
          workoutLogs={workoutLogs}
          onUpdateExercisePlan={handleUpdateExerciseInPlan}
          onSaveExercisePerformance={handleSaveExercisePerformance}
          onOpenChart={(exName) => setChartExerciseName(exName)}
        />
      )}

      {chartExerciseName && (
        <ExerciseChartModal
          isOpen={!!chartExerciseName}
          onClose={() => setChartExerciseName(null)}
          exerciseName={chartExerciseName}
          workoutLogs={workoutLogs}
          category={selectedDay?.exercises?.find((e) => e.name.trim().toLowerCase() === chartExerciseName.trim().toLowerCase())?.category}
          exercise={selectedDay?.exercises?.find((e) => e.name.trim().toLowerCase() === chartExerciseName.trim().toLowerCase())}
        />
      )}

      {selectedDay && isPreviousWorkoutModalOpen && (
        <PreviousWorkoutModal
          isOpen={isPreviousWorkoutModalOpen}
          onClose={() => setIsPreviousWorkoutModalOpen(false)}
          workoutTitle={`${selectedDay.dayNamePolish}: ${selectedDay.title}`}
          previousLogs={previousWorkoutLogs}
        />
      )}
    </div>
  );
};
