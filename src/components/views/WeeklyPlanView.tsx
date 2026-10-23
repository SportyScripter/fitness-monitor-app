import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Dumbbell,
  Zap,
  Activity,
  Flame,
  Clock,
  Play,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  HeartPulse,
  Award,
  Edit2,
  Plus,
  Trash2,
  RotateCcw,
  Sliders,
  Copy,
  Folder,
  ArrowRight,
  PlusCircle,
  History,
  BarChart3,
  Target
} from 'lucide-react';
import { WorkoutDay, DayType, Exercise, WorkoutLogEntry, TrainingCycleCatalog, ExerciseUnit } from '../../types/hyrox';
import { MESOCYCLE_WEEKS } from '../../data/hyroxPlanData';
import { DayEditorModal } from '../modals/DayEditorModal';
import { CopyWorkoutModal } from '../modals/CopyWorkoutModal';
import { ExerciseChartModal } from '../modals/ExerciseChartModal';
import { PreviousWorkoutModal } from '../modals/PreviousWorkoutModal';
import { ExerciseDetailModal } from '../modals/ExerciseDetailModal';

interface WeeklyPlanViewProps {
  activeCycle: TrainingCycleCatalog;
  currentWeek: number;
  totalWeeksCount: number;
  weekPlan: WorkoutDay[];
  onStartWorkout: (day: WorkoutDay) => void;
  onOpenSimulator: () => void;
  onOpenRecovery: () => void;
  onUpdateDay: (updatedDay: WorkoutDay) => void;
  onResetPlanToDefault: () => void;
  onOpenCatalog: () => void;
  onOpenAddWeekModal: () => void;
  onCopyDayToWeek: (
    sourceDay: WorkoutDay,
    targetWeek: number,
    targetDayNumber: number,
    progressionDeltaKg: number
  ) => void;
  onCopyEntireWeekTo?: (
    sourceWeek: number,
    targetWeek: number,
    progressionDeltaKg: number
  ) => void;
  onAddDay?: (dayData?: Partial<WorkoutDay>) => void;
  onDeleteDay?: (dayId: string) => void;
  onDeleteWeek?: (weekNum: number) => void;
  onWeekChange?: (week: number) => void;
  workoutLogs?: WorkoutLogEntry[];
  onSaveLogs?: (newEntries: WorkoutLogEntry[]) => void;
}

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  activeCycle,
  currentWeek,
  totalWeeksCount,
  weekPlan = [],
  onStartWorkout,
  onOpenSimulator,
  onOpenRecovery,
  onUpdateDay,
  onResetPlanToDefault,
  onOpenCatalog,
  onOpenAddWeekModal,
  onCopyDayToWeek,
  onCopyEntireWeekTo,
  onAddDay,
  onDeleteDay,
  onDeleteWeek,
  onWeekChange,
  workoutLogs = [],
  onSaveLogs,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(weekPlan[0]?.id || 'day-1-fbw-a');
  const [isDayEditorOpen, setIsDayEditorOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Synchronize selectedDayId whenever week or weekPlan changes
  useEffect(() => {
    if (weekPlan && weekPlan.length > 0) {
      const exists = weekPlan.some((d) => d && d.id === selectedDayId);
      if (!exists) {
        setSelectedDayId(weekPlan[0].id);
      }
    }
  }, [currentWeek, weekPlan, selectedDayId]);

  // Modals for individual exercise charts & previous workout preview
  const [chartExerciseName, setChartExerciseName] = useState<string | null>(null);
  const [isPreviousWorkoutModalOpen, setIsPreviousWorkoutModalOpen] = useState(false);
  const [activeDetailExercise, setActiveDetailExercise] = useState<Exercise | null>(null);

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
    }[],
    exerciseNotes?: string,
    targetDate?: string,
    rpe?: number,
    rir?: number
  ) => {
    if (!selectedDay || !activeDetailExercise) return;
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const sessionId = `manual-session-${dateStr}-${selectedDay.id}`;

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
        tonnageKg: (Number(s.weightKg) || 0) * (Number(s.reps) || 0),
        rpe: typeof rpe === 'number' ? rpe : (activeDetailExercise.targetRPE || 8),
        rir: typeof rir === 'number' ? rir : (activeDetailExercise.targetRIR ?? 2),
        notes: s.notes || exerciseNotes || undefined,
        sessionId,
        sessionTitle: `${selectedDay.dayNamePolish ? selectedDay.dayNamePolish + ': ' : ''}${selectedDay.title}`,
        activityType: 'STRENGTH',
        unit: (s.unit as ExerciseUnit) || activeDetailExercise.unit || 'kg',
        targetDistance: activeDetailExercise.targetDistance,
        distanceUnit: activeDetailExercise.distanceUnit,
        targetPace: activeDetailExercise.targetPace,
        targetHR: activeDetailExercise.targetHR,
      }));

    if (newEntries.length > 0 && onSaveLogs) {
      onSaveLogs(newEntries);
    }
  };

  const currentPhase = activeCycle.weeksList?.find((w) => w.week === currentWeek) || {
    week: currentWeek,
    name: `Tydzień ${currentWeek}: Plan Indywidualny`,
    volumeMultiplier: 1.0,
    targetRIR: 2,
    targetRPE: 8.0,
    progressionNote: 'Dostosuj obciążenie i tempo w każdym ćwiczeniu.',
    isDeload: false,
  };

  const selectedDay =
    weekPlan.find((d) => d && d.id === selectedDayId) || weekPlan[0];

  // Find next uncompleted workout in this week
  const selectedDayIndex = weekPlan.findIndex((d) => d.id === selectedDay?.id);
  let nextUpDay: WorkoutDay | null = null;
  for (let i = selectedDayIndex + 1; i < weekPlan.length; i++) {
    if (weekPlan[i].type !== 'REST_RECOVERY') {
      nextUpDay = weekPlan[i];
      break;
    }
  }
  if (!nextUpDay) {
    nextUpDay = weekPlan.find((d) => d.id !== selectedDay?.id && d.type !== 'REST_RECOVERY') || null;
  }

  // Previous logs for selected day
  const previousWorkoutLogs = workoutLogs.filter(
    (l) => l.dayTitle === selectedDay?.title || l.dayId === selectedDay?.id
  );
  const prevDates = Array.from(
    new Set(previousWorkoutLogs.map((l) => l.dateStr || l.timestamp.split('T')[0]))
  ).sort().reverse();
  const latestPrevDate = prevDates[0];
  const latestPreviousSessionLogs = latestPrevDate
    ? previousWorkoutLogs.filter((l) => (l.dateStr || l.timestamp.split('T')[0]) === latestPrevDate)
    : [];

  const getDayTypeBadge = (type: DayType) => {
    switch (type) {
      case 'FBW':
        return {
          label: 'FBW (Full Body)',
          classes: 'bg-amber-400 text-black font-extrabold',
          icon: Dumbbell,
        };
      case 'RUNNING_HIIT':
        return {
          label: 'BIEG HIIT (High Intensity)',
          classes: 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold',
          icon: Zap,
        };
      case 'REST_RECOVERY':
        return {
          label: 'REGENERACJA AKTYWNA',
          classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold',
          icon: Activity,
        };
      case 'WEEKEND_HYROX':
        return {
          label: 'WEEKEND HYROX SPECIFIC',
          classes: 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold',
          icon: Award,
        };
      case 'CUSTOM':
      default:
        return {
          label: 'WŁASNY TRENING (CUSTOM)',
          classes: 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold',
          icon: Sliders,
        };
    }
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

  const handleQuickDeleteExercise = (exId: string) => {
    if (!selectedDay) return;
    const updatedExercises = selectedDay.exercises.filter((ex) => ex.id !== exId);
    onUpdateDay({
      ...selectedDay,
      exercises: updatedExercises,
    });
  };

  if (!selectedDay) {
    return (
      <div className="space-y-6">
        {/* Week Navigation Tabs */}
        <div className="flex items-center justify-between gap-2 bg-neutral-900/90 border border-neutral-800 p-2 sm:p-2.5 rounded-2xl overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-neutral-400 px-2 shrink-0 hidden sm:inline">
              Tygodnie:
            </span>
            {(activeCycle.weeksList || []).map((w) => {
              const isCurrent = w.week === currentWeek;
              return (
                <button
                  key={w.week}
                  onClick={() => onWeekChange?.(w.week)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    isCurrent
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black ring-1 ring-amber-300'
                      : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  <span>Tydzień {w.week}</span>
                  {w.isDeload && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                      Deload
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={onOpenAddWeekModal}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
            title="Dodaj kolejny tydzień do tego cyklu"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tydzień</span>
          </button>
        </div>

        {/* Top Banner: Cycle Identification & Week Overview */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-400 text-black shadow-md shadow-amber-400/20">
                  Cykl: {activeCycle.name}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-neutral-800 text-amber-300 border border-neutral-700">
                  Tydzień {currentWeek} z {totalWeeksCount}
                </span>
                <span className="text-sm font-bold text-white font-heading">
                  {currentPhase.name}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl leading-relaxed">
                {activeCycle.description} • {currentPhase.progressionNote}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={onOpenCatalog}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-amber-400/10"
              >
                <Folder className="w-4 h-4 text-amber-400" />
                <span>Zmień Cykl</span>
              </button>

              <button
                onClick={onOpenAddWeekModal}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj Tydzień</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty Week State */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <PlusCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white font-heading uppercase tracking-wider mb-2">
            Tydzień {currentWeek}: Brak Zaplanowanych Dni
          </h3>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Ten tydzień w cyklu <span className="text-amber-300 font-bold">{activeCycle.name}</span> nie posiada jeszcze treningów. Możesz dodać pierwszy dzień treningowy ręcznie lub wczytać plan bazowy.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onAddDay?.()}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Dodaj Dzień Treningowy</span>
            </button>
            <button
              onClick={onResetPlanToDefault}
              className="px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer border border-neutral-700"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Wczytaj Dni Bazowe</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation Tabs */}
      <div className="flex items-center justify-between gap-2 bg-neutral-900/90 border border-neutral-800 p-2 sm:p-2.5 rounded-2xl overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] uppercase font-bold text-neutral-400 px-2 shrink-0 hidden sm:inline">
            Tygodnie:
          </span>
          {(activeCycle.weeksList || []).map((w) => {
            const isCurrent = w.week === currentWeek;
            return (
              <button
                key={w.week}
                onClick={() => onWeekChange?.(w.week)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  isCurrent
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black ring-1 ring-amber-300'
                    : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <span>Tydzień {w.week}</span>
                {w.isDeload && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                    Deload
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenAddWeekModal}
          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
          title="Dodaj kolejny tydzień do tego cyklu"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Tydzień</span>
        </button>
      </div>

      {/* Top Banner: Cycle Identification & Week Overview */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-400 text-black shadow-md shadow-amber-400/20">
                Cykl: {activeCycle.name}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-neutral-800 text-amber-300 border border-neutral-700">
                Tydzień {currentWeek} z {totalWeeksCount}
              </span>
              <span className="text-sm font-bold text-white font-heading">
                {currentPhase.name}
              </span>
              {currentPhase.isDeload && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Deload (Odciążenie)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl leading-relaxed">
              {activeCycle.description} • {currentPhase.progressionNote}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenCatalog}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-amber-400/10"
              title="Przełącz lub utwórz inny cykl treningowy (np. Masa, Hyrox, Redukcja)"
            >
              <Folder className="w-4 h-4 text-amber-400" />
              <span>Zmień Cykl</span>
            </button>

            <button
              onClick={onOpenAddWeekModal}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
              title="Dodaj kolejny tydzień do tego cyklu"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nowy Tydzień</span>
            </button>

            <button
              onClick={onResetPlanToDefault}
              className="p-2.5 rounded-xl text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
              title="Przywróć domyślny plan dla tego tygodnia"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Next up queue alert strip */}
        {nextUpDay && (
          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Kolejny Trening w Cyklu:
              </span>
              <span className="font-bold text-white">
                {nextUpDay.dayNamePolish} — {nextUpDay.title} ({nextUpDay.type})
              </span>
            </div>

            <button
              onClick={() => setSelectedDayId(nextUpDay!.id)}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Zobacz ten trening</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 7-Day Navigation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {weekPlan.map((day) => {
          const isSelected = day.id === selectedDayId;
          const badge = getDayTypeBadge(day.type);
          const Icon = badge.icon;

          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 border-amber-400 shadow-lg shadow-amber-400/10 ring-1 ring-amber-400'
                  : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Dzień {day.dayNumber}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
              </div>

              <div className="text-xs font-bold text-white truncate font-heading">
                {day.dayNamePolish}
              </div>

              <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                {day.title.length > 20 ? day.title.slice(0, 20) + '...' : day.title}
              </div>

              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
              )}
            </button>
          );
        })}

        {onAddDay && (
          <button
            onClick={() => onAddDay()}
            className="p-3 rounded-2xl border border-dashed border-amber-400/40 hover:border-amber-400 bg-amber-400/5 hover:bg-amber-400/10 text-amber-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group min-h-[72px]"
            title="Dodaj kolejny dzień treningowy do tego tygodnia"
          >
            <Plus className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Dodaj Dzień</span>
          </button>
        )}
      </div>

      {/* Selected Day Detailed Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Day Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-md text-xs ${getDayTypeBadge(selectedDay.type).classes}`}>
                {getDayTypeBadge(selectedDay.type).label}
              </span>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-500" /> ~{selectedDay.durationMinutes} minut
              </span>
              <span className="text-xs text-neutral-400">
                Cel: <strong className="text-white">RPE {selectedDay.targetRpeRange}</strong> • Zapas: <strong className="text-white">RIR {selectedDay.targetRirRange}</strong>
              </span>
              {selectedDay.tempo && (
                <span className="text-xs text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  Tempo: <strong className="text-amber-400">{selectedDay.tempo}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                {selectedDay.dayNamePolish}: {selectedDay.title}
              </h2>
              <button
                onClick={() => setIsDayEditorOpen(true)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 transition-colors cursor-pointer"
                title="Zmień nazwę treningu, etykietę lub ćwiczenia"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1">
              {selectedDay.subtitle}
            </p>

            {/* Quick Day Label Preset Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-neutral-800/60 text-xs">
              <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">
                Etykieta dnia:
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-400 text-black shadow-sm">
                {selectedDay.dayNamePolish}
              </span>

              <div className="flex items-center gap-1 pl-1">
                <button
                  type="button"
                  onClick={() => {
                    const polishDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
                    const dayName = polishDays[(selectedDay.dayNumber - 1) % 7] || 'Poniedziałek';
                    onUpdateDay({ ...selectedDay, dayNamePolish: dayName });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'].includes(selectedDay.dayNamePolish)
                      ? 'bg-neutral-800 text-amber-300 border-amber-400/40'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Przypisz ten dzień do dnia tygodnia"
                >
                  Dzień Tygodnia
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateDay({ ...selectedDay, dayNamePolish: `Trening ${selectedDay.dayNumber}` });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    selectedDay.dayNamePolish.startsWith('Trening')
                      ? 'bg-neutral-800 text-amber-300 border-amber-400/40'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Nazwij jako 'Trening X'"
                >
                  Trening {selectedDay.dayNumber}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const letter = String.fromCharCode(64 + Math.min(selectedDay.dayNumber, 26));
                    onUpdateDay({ ...selectedDay, dayNamePolish: `Plan ${letter}` });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                    selectedDay.dayNamePolish.startsWith('Plan')
                      ? 'bg-neutral-800 text-amber-300 border-amber-400/40'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Nazwij jako 'Plan A', 'Plan B'"
                >
                  Plan {String.fromCharCode(64 + Math.min(selectedDay.dayNumber, 26))}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDayEditorOpen(true)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer"
                  title="Wpisz dowolną własną nazwę"
                >
                  Własna...
                </button>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="shrink-0 flex flex-wrap items-center gap-2.5">
            {/* View Previous Session Button */}
            {latestPreviousSessionLogs.length > 0 && (
              <button
                onClick={() => setIsPreviousWorkoutModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
                title="Zobacz ile kg i powtórzeń robiłeś na poprzednim treningu"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Poprzedni Trening</span>
              </button>
            )}

            {/* Copy workout button */}
            <button
              onClick={() => setIsCopyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
              title="Kopiuj ten trening do następnego tygodnia"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>Kopiuj do Następnego Tygodnia</span>
            </button>

            <button
              onClick={() => setIsDayEditorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Dostosuj Dzień</span>
            </button>

            {(selectedDay.type === 'FBW' || selectedDay.type === 'CUSTOM') && (
              <button
                onClick={() => onStartWorkout(selectedDay)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Rozpocznij Trening (Na Żywo)</span>
              </button>
            )}

            {selectedDay.type === 'RUNNING_HIIT' && (
              <button
                onClick={() => onStartWorkout(selectedDay)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-500 hover:bg-red-400 text-white transition-all shadow-lg shadow-red-500/20 cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>Dziennik Biegu HIIT</span>
              </button>
            )}

            {selectedDay.type === 'WEEKEND_HYROX' && (
              <button
                onClick={onOpenSimulator}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Symulator Hyrox & Stoper</span>
              </button>
            )}

            {selectedDay.type === 'REST_RECOVERY' && (
              <button
                onClick={onOpenRecovery}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>Oceń Gotowość & Sen</span>
              </button>
            )}
          </div>
        </div>

        {/* Day Content based on Type */}
        <div>
          {(selectedDay.type === 'FBW' || selectedDay.type === 'CUSTOM') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>Zaplanowane ćwiczenia ({selectedDay.exercises.length})</span>
                <span>
                  Szacowany tonaż: <strong className="text-amber-400 font-mono-numbers">~{calculateDayPlannedTonnage(selectedDay).toLocaleString()} kg</strong>
                </span>
              </div>

              {selectedDay.exercises.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-950/60 rounded-2xl border border-neutral-800">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                  <p>Brak ćwiczeń w tym dniu.</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <button
                      onClick={() => setIsDayEditorOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Dodaj ćwiczenie
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDay.exercises.map((exercise, index) => {
                    const baseWeight = typeof exercise.defaultWeightKg === 'number' ? exercise.defaultWeightKg : 0;
                    const displayWeight = baseWeight > 0 ? (baseWeight % 1 === 0 ? String(baseWeight) : baseWeight.toFixed(1)) : 'Ciało';
                    const baseReps = parseInt(String(exercise.targetRepsRange || '8').split('-')[0]) || 8;
                    const plannedTonnage = baseWeight * baseReps * (exercise.plannedSets || 3);

                    // Find historical logs for this exercise, picking only the latest distinct session
                    const pastLogsForEx = workoutLogs
                      .filter(
                        (l) =>
                          l.exerciseName && l.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase()
                      )
                      .sort((a, b) => (b.timestamp || b.dateStr).localeCompare(a.timestamp || a.dateStr));
                    const latestSessionId = pastLogsForEx[0]?.sessionId;
                    const lastDate = pastLogsForEx[0]?.dateStr || pastLogsForEx[0]?.timestamp?.split('T')[0];
                    const rawLastSets = pastLogsForEx
                      .filter((l) => (latestSessionId ? l.sessionId === latestSessionId : (l.dateStr || l.timestamp.split('T')[0]) === lastDate))
                      .sort((a, b) => a.setNumber - b.setNumber);
                    // Deduplicate by setNumber so multiple starts of the same workout don't multiply sets
                    const lastSetsMap = new Map<number, WorkoutLogEntry>();
                    rawLastSets.forEach((s) => lastSetsMap.set(s.setNumber || 1, s));
                    const lastSets = Array.from(lastSetsMap.values()).sort((a, b) => a.setNumber - b.setNumber);

                    return (
                      <div
                        key={exercise.id}
                        onClick={() => setActiveDetailExercise(exercise)}
                        className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 hover:border-amber-400/50 hover:bg-neutral-900/60 transition-all flex flex-col justify-between group shadow-sm space-y-3 cursor-pointer relative"
                        title="Kliknij, aby otworzyć szczegóły, edytować serie lub sprawdzić historię tego ćwiczenia"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                                  #{index + 1} • {exercise.muscleGroup?.split('(')[0]?.trim() || (exercise.category === 'cardio' ? 'Cardio / Bieg' : 'Ogólne')}
                                </span>
                                {exercise.exerciseType && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                                    {exercise.exerciseType === 'RUNNING' ? 'Bieg' : exercise.exerciseType === 'HYROX_STATION' ? 'Hyrox' : exercise.exerciseType === 'INTERVAL_CARDIO' ? 'Kardio' : 'Siła'}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-900 text-neutral-400">
                                  {exercise.unit || 'kg'}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                                {exercise.name}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setActiveDetailExercise(exercise)}
                                className="px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Zobacz szczegóły, edytuj wykonanie lub parametry w planie"
                              >
                                <Sliders className="w-3 h-3 text-amber-400" />
                                <span>Szczegóły</span>
                              </button>

                              <button
                                onClick={() => setChartExerciseName(exercise.name)}
                                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 hover:border-amber-400/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Zobacz wykres progresu, 1RM i historię tego ćwiczenia"
                              >
                                <TrendingUp className="w-3 h-3" />
                                <span>Wykres</span>
                              </button>

                              <button
                                onClick={() => handleQuickDeleteExercise(exercise.id)}
                                className="text-neutral-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Usuń ćwiczenie z tego dnia"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Historical comparison */}
                          {lastSets.length > 0 && (
                            <div className="mb-2 p-1.5 px-2.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>
                                Poprzednio ({lastDate}):{' '}
                                <strong className="text-white font-mono-numbers">
                                  {lastSets.map((s) => `${s.weightKg}${s.unit || 'kg'}×${s.reps}`).join(' | ')}
                                </strong>
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-4 gap-2 my-2.5 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/60 text-center text-xs">
                            <div>
                              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Serie</span>
                              <span className="font-bold text-white font-mono-numbers">{exercise.plannedSets}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Powt / Dyst.</span>
                              <span className="font-bold text-white font-mono-numbers">{exercise.targetRepsRange}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Ciężar ({exercise.unit || 'kg'})</span>
                              <span className="font-bold text-amber-400 font-mono-numbers">
                                {exercise.defaultWeightKg > 0 ? `${displayWeight} ${exercise.unit || 'kg'}` : 'Ciało'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Przerwa</span>
                              <span className="font-bold text-neutral-300 font-mono-numbers" title={exercise.restAfterExerciseSec ? `Przerwa między seriami: ${exercise.restSeconds}s, po ćwiczeniu: ${exercise.restAfterExerciseSec}s` : undefined}>
                                {exercise.restSeconds}s {exercise.restAfterExerciseSec ? `(+${exercise.restAfterExerciseSec}s)` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Pace and HR indicators if set */}
                          {(exercise.targetPace || exercise.targetHR) && (
                            <div className="flex items-center gap-2 text-[11px] mb-1">
                              {exercise.targetPace && (
                                <span className="text-emerald-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 font-medium">
                                  Tempo: <strong>{exercise.targetPace}</strong>
                                </span>
                              )}
                              {exercise.targetHR && (
                                <span className="text-rose-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 font-medium">
                                  HR: <strong>{exercise.targetHR} bpm</strong>
                                </span>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5 text-xs">
                            {exercise.tempo && (
                              <div className="text-neutral-300 text-[11px]">
                                <span className="text-neutral-400 font-semibold">Tempo ruchu:</span>{' '}
                                <strong className="text-amber-400">{exercise.tempo}</strong>
                              </div>
                            )}
                            <div className="text-neutral-400 text-[11px] leading-relaxed">
                              <span className="text-neutral-300 font-semibold">Wskazówka:</span> {exercise.techniqueNotes}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-400">
                          <span>
                            RPE: <strong className="text-white">{exercise.targetRPE}</strong> | RIR: <strong className="text-white">{exercise.targetRIR}</strong>
                          </span>
                          <span className="font-mono-numbers text-amber-400 font-semibold group-hover:text-amber-300 flex items-center gap-1 transition-colors">
                            <span>Szczegóły & Serie</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedDay.type === 'RUNNING_HIIT' && selectedDay.runningSession && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                  <span className="text-xs text-neutral-400 uppercase font-bold block mb-1">Dystans Całkowity</span>
                  <div className="text-2xl font-black text-white font-mono-numbers">
                    {selectedDay.runningSession.totalDistanceKm} km
                  </div>
                  <span className="text-xs text-red-400 font-medium">Bieg progowy VO2max</span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                  <span className="text-xs text-neutral-400 uppercase font-bold block mb-1">Docelowe Tempo</span>
                  <div className="text-2xl font-black text-amber-400 font-mono-numbers">
                    {selectedDay.runningSession.tempoPace || '4:15 - 4:30'}
                  </div>
                  <span className="text-xs text-neutral-400">min/km (RPE 8.5)</span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                  <span className="text-xs text-neutral-400 uppercase font-bold block mb-1">Pauza między powt.</span>
                  <div className="text-2xl font-black text-white font-mono-numbers">
                    {selectedDay.runningSession.restIntervalSeconds || 90}s
                  </div>
                  <span className="text-xs text-neutral-400">Marsz lub trucht</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-400" />
                  <span>Struktura Interwałów ({selectedDay.runningSession.intervals.length} powtórzeń)</span>
                </h4>

                <div className="space-y-2.5">
                  {selectedDay.runningSession.intervals.map((inv, idx) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{inv.stepName}</div>
                          <p className="text-xs text-amber-400 font-semibold mt-0.5">
                            {inv.targetIntensity}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-1">
                            {inv.hyroxSpecifics}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-left md:text-right text-xs">
                        <span className="text-neutral-400 text-[10px] uppercase font-bold block">Odpoczynek</span>
                        <span className="font-semibold text-neutral-200">{inv.recovery}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedDay.type === 'REST_RECOVERY' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4" /> Protokoły Regeneracji Aktywnej
                  </h4>
                  <ul className="space-y-2.5 text-xs text-neutral-300">
                    {selectedDay.recoveryProtocols?.map((proto, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{proto}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2">Dzień Odciążenia</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Zadbaj o pełną odnowę biologiczną. Jeśli chcesz zamienić ten dzień w trening siłowy lub biegowy, kliknij &quot;Dostosuj Dzień&quot; i wybierz inny typ jednostki.
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-800 flex gap-2">
                    <button
                      onClick={() => setIsDayEditorOpen(true)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                    >
                      Zmień w trening
                    </button>
                    <button
                      onClick={onOpenRecovery}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer"
                    >
                      Oceń gotowość
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedDay.type === 'WEEKEND_HYROX' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-neutral-950 to-neutral-950 border border-purple-500/30">
                <div className="max-w-2xl">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white">
                    Format Zawodów HYROX
                  </span>
                  <h3 className="text-xl font-black text-white mt-2 font-heading">
                    8 x 1km Bieg + 8 Oficjalnych Stacji Wyścigowych
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                    Możesz wykonać pełną próbę, pół-Hyrox lub stacje techniczne. Możesz także dodać do tego dnia własne ćwiczenia pomocnicze.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={onOpenSimulator}
                      className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      <span>Uruchom Oficjalny Stoper ze Splitami</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day Customizer Modal */}
      {isDayEditorOpen && (
        <DayEditorModal
          day={selectedDay}
          isOpen={isDayEditorOpen}
          onClose={() => setIsDayEditorOpen(false)}
          onSaveDay={(updatedDay) => onUpdateDay(updatedDay)}
        />
      )}

      {/* Copy Workout to Next Week Modal */}
      {isCopyModalOpen && (
        <CopyWorkoutModal
          sourceDay={selectedDay}
          currentWeek={currentWeek}
          totalWeeksCount={totalWeeksCount}
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          onCopyDayToWeek={onCopyDayToWeek}
          onCopyEntireWeekTo={onCopyEntireWeekTo}
        />
      )}

      {/* Individual Exercise Progression Chart Modal */}
      {chartExerciseName && (
        <ExerciseChartModal
          exerciseName={chartExerciseName}
          workoutLogs={workoutLogs}
          isOpen={!!chartExerciseName}
          onClose={() => setChartExerciseName(null)}
        />
      )}

      {/* Previous Workout Details Modal */}
      {isPreviousWorkoutModalOpen && (
        <PreviousWorkoutModal
          workoutTitle={selectedDay.title}
          previousLogs={latestPreviousSessionLogs}
          isOpen={isPreviousWorkoutModalOpen}
          onClose={() => setIsPreviousWorkoutModalOpen(false)}
        />
      )}

      {/* Exercise Detail & Manual Performance Modal */}
      {activeDetailExercise && (
        <ExerciseDetailModal
          exercise={activeDetailExercise}
          day={selectedDay}
          currentWeek={currentWeek}
          isOpen={!!activeDetailExercise}
          onClose={() => setActiveDetailExercise(null)}
          workoutLogs={workoutLogs}
          onUpdateExercisePlan={handleUpdateExerciseInPlan}
          onSaveExercisePerformance={handleSaveExercisePerformance}
          onOpenChart={(name) => setChartExerciseName(name)}
        />
      )}
    </div>
  );
};
