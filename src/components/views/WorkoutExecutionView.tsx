import React, { useState, useMemo } from 'react';
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
  ChevronUp,
  Check,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Plus,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableExerciseCardWrapperProps {
  id: string;
  isReorderMode: boolean;
  children: (sortable: {
    setNodeRef: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
    attributes: any;
    listeners: any;
  }) => React.ReactNode;
}

const SortableExerciseCardWrapper: React.FC<SortableExerciseCardWrapperProps> = ({
  id,
  isReorderMode,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isReorderMode,
  });

  const style: React.CSSProperties = isReorderMode
    ? {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
      }
    : {};

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full rounded-3xl p-4 border-2 border-dashed border-amber-400/50 bg-neutral-900/30 opacity-40 min-h-[140px] transition-all"
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {children({
        setNodeRef,
        style,
        isDragging,
        attributes,
        listeners,
      })}
    </>
  );
};
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
import { EditWeekParamsModal } from '../modals/EditWeekParamsModal';
import { DaySettingsModal } from '../modals/DaySettingsModal';
import { ExerciseEditModal } from '../modals/ExerciseEditModal';
import { CopyWorkoutModal } from '../modals/CopyWorkoutModal';
import { calculateDayPlannedTonnage } from '../../utils/tonnageUtils';

interface SortableWorkoutDayTileProps {
  day: WorkoutDay;
  index: number;
  isSelected: boolean;
  isEditMode: boolean;
  status: 'completed' | 'in_progress' | 'not_started';
  onSelect: () => void;
  onEdit: () => void;
}

const SortableWorkoutDayTile: React.FC<SortableWorkoutDayTileProps> = ({
  day,
  index,
  isSelected,
  isEditMode,
  status,
  onSelect,
  onEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: day.id,
    disabled: !isEditMode,
  });

  const style: React.CSSProperties = isEditMode
    ? {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
      }
    : {};

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-max min-w-[110px] shrink-0 p-2.5 rounded-2xl border-2 border-dashed border-amber-400/50 bg-neutral-900/30 opacity-35 min-h-[64px]"
        aria-hidden="true"
      />
    );
  }

  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const dynamicWorkoutNumber = index + 1;
  const dayLabel = ((day as any).dayLabel || day.dayNamePolish || `Trening ${dynamicWorkoutNumber}`).replace(/^Dzień\s*(\d+)/i, 'Trening $1');

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      {...(isEditMode ? attributes : {})}
      {...(isEditMode ? listeners : {})}
      onClick={() => {
        if (isEditMode) {
          onEdit();
        } else {
          onSelect();
        }
      }}
      className={`w-max min-w-[110px] shrink-0 p-2.5 rounded-2xl border text-left transition-all min-h-[64px] flex flex-col justify-between relative overflow-hidden select-none whitespace-nowrap ${
        isEditMode
          ? `touch-none cursor-grab active:cursor-grabbing ${
              isSelected
                ? 'bg-amber-400 text-black border-amber-300 ring-2 ring-dashed ring-black shadow-md font-black scale-[1.02]'
                : 'bg-neutral-950/90 text-amber-200 border-amber-500/50 hover:border-amber-400'
            }`
          : `cursor-pointer touch-manipulation ${
              isSelected
                ? isCompleted
                  ? 'bg-amber-400 text-black border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-600 dark:ring-emerald-500 shadow-md shadow-amber-400/20 font-black scale-[1.02]'
                  : 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/20 font-black ring-2 ring-amber-300 scale-[1.02]'
                : isCompleted
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-600/70 dark:ring-emerald-500/50 shadow-sm shadow-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                : isInProgress
                ? 'bg-amber-500/10 dark:bg-amber-950/20 text-neutral-800 dark:text-neutral-200 border-amber-500/70 dark:border-amber-500/60 ring-1 ring-amber-500/40 hover:bg-amber-500/15'
                : 'bg-neutral-950/80 text-neutral-300 border-neutral-800 hover:border-neutral-700'
            }`
      }`}
      title={isEditMode ? `Przeciągnij, aby zmienić kolejność lub kliknij, aby dostosować Trening ${dynamicWorkoutNumber}` : day.title}
    >
      {/* Top Row: Dynamic Workout indicator (e.g. Trening 1) with completion status + colored type badge */}
      <div className="flex items-center justify-between w-full gap-2 mb-1 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          {isEditMode && <GripVertical className="w-3 h-3 text-amber-400 shrink-0" />}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
              isSelected
                ? 'text-black'
                : isCompleted
                ? 'text-emerald-800 dark:text-emerald-300 font-extrabold'
                : isInProgress
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-neutral-400'
            }`}
          >
            Trening {dynamicWorkoutNumber}
          </span>
          {!isEditMode && isCompleted && (
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm shrink-0 ${
                isSelected
                  ? 'bg-black text-emerald-400 ring-1 ring-black'
                  : 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950'
              }`}
              title="Trening w 100% zrealizowany"
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          {!isEditMode && isInProgress && !isCompleted && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 shadow-sm"
              title="Trening w trakcie realizacji"
            />
          )}
        </div>

        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-tight leading-none shrink-0 ${
            isSelected
              ? 'bg-black text-amber-400 shadow-sm'
              : day.type === 'FBW'
              ? 'bg-amber-400 text-black'
              : day.type === 'RUNNING_HIIT'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : day.type === 'WEEKEND_HYROX'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : day.type === 'REST_RECOVERY'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}
        >
          {day.type === 'FBW'
            ? 'FBW'
            : day.type === 'RUNNING_HIIT'
            ? 'Running'
            : day.type === 'WEEKEND_HYROX'
            ? 'Hyrox'
            : day.type === 'REST_RECOVERY'
            ? 'Rest'
            : 'Custom'}
        </span>
      </div>

      {/* Main Text: Full dayLabel (e.g. "Poniedziałek", "Wtorek") */}
      <div
        className={`text-xs sm:text-[13px] font-extrabold whitespace-nowrap w-full text-left pt-0.5 ${
          isSelected
            ? 'text-black font-black'
            : isCompleted
            ? 'text-emerald-950 dark:text-white font-extrabold'
            : 'text-white'
        }`}
      >
        {dayLabel}
      </div>
    </button>
  );
};

interface WorkoutExecutionViewProps {
  activeCycle: TrainingCycleCatalog | null;
  currentWeek: number;
  weeksList: MesocyclePhase[];
  currentWeekDays: WorkoutDay[];
  selectedDayId: string;
  onSelectDayId: (dayId: string) => void;
  onStartWorkout: (day: WorkoutDay) => void;
  onOpenSimulator: () => void;
  onOpenRecovery: () => void;
  onUpdateDay: (day: WorkoutDay) => void;
  onReorderDays?: (reorderedDays: WorkoutDay[]) => void;
  workoutLogs: WorkoutLogEntry[];
  onSaveLogs?: (newEntries: WorkoutLogEntry[]) => void;
  onWeekChange: (week: number) => void;
  activeOngoingWorkoutDay?: WorkoutDay | null;
  isWorkoutMinimized?: boolean;
  onMaximizeWorkout?: () => void;
  onOpenAddWeekModal?: () => void;
  onDeleteWeek?: (weekNumber: number) => void;
  onUpdatePhase?: (updatedPhase: MesocyclePhase) => void;
  onAddDay?: (dayData?: Partial<WorkoutDay>) => void;
  onDeleteDay?: (dayId: string) => void;
  onCopyDayToWeek?: (
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
  onReorderDays,
  workoutLogs = [],
  onSaveLogs,
  onWeekChange,
  activeOngoingWorkoutDay,
  isWorkoutMinimized,
  onMaximizeWorkout,
  onOpenAddWeekModal,
  onDeleteWeek,
  onUpdatePhase,
  onAddDay,
  onDeleteDay,
  onCopyDayToWeek,
  onCopyEntireWeekTo,
}) => {
  const [chartExerciseName, setChartExerciseName] = useState<string | null>(null);
  const [isPreviousWorkoutModalOpen, setIsPreviousWorkoutModalOpen] = useState(false);
  const [activeDetailExercise, setActiveDetailExercise] = useState<Exercise | null>(null);
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});

  // Edit Mode & Modals State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditWeekModalOpen, setIsEditWeekModalOpen] = useState(false);
  const [selectedWeekToEdit, setSelectedWeekToEdit] = useState<MesocyclePhase | null>(null);
  const [isDaySettingsModalOpen, setIsDaySettingsModalOpen] = useState(false);
  const [selectedDayToEdit, setSelectedDayToEdit] = useState<WorkoutDay | null>(null);
  const [isCopyWorkoutModalOpen, setIsCopyWorkoutModalOpen] = useState(false);
  const [isExerciseEditModalOpen, setIsExerciseEditModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [openKebabExerciseId, setOpenKebabExerciseId] = useState<string | null>(null);

  // Exercise Reorder State with Wiggle Effect
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderExercises, setReorderExercises] = useState<Exercise[]>([]);

  if (!activeCycle) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">Brak aktywnego cyklu treningowego</h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto">
          Twój katalog cykli jest pusty. Otwórz przycisk „Zarządzaj cyklami” u góry, aby utworzyć swój pierwszy cykl od zera.
        </p>
      </div>
    );
  }

  const toggleExerciseExpand = (exerciseId: string) => {
    setExpandedExerciseIds((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const selectedDay =
    currentWeekDays.find((d) => d && d.id === selectedDayId) || currentWeekDays[0] || null;

  // Session Progress Calculation: total planned sets vs completed sets in active session / logs
  const { totalPlannedSets, completedSetsCount, completionPercentage } = useMemo(() => {
    if (!selectedDay || !Array.isArray(selectedDay.exercises) || selectedDay.exercises.length === 0) {
      return { totalPlannedSets: 0, completedSetsCount: 0, completionPercentage: 0 };
    }

    const totalPlanned = selectedDay.exercises.reduce((sum, ex) => {
      const setsCount = Array.isArray(ex.plannedSetsDetails) && ex.plannedSetsDetails.length > 0
        ? ex.plannedSetsDetails.length
        : typeof ex.plannedSets === 'number' && ex.plannedSets > 0
        ? ex.plannedSets
        : 3;
      return sum + setsCount;
    }, 0);

    const completedSetKeys = new Set<string>();

    // 1. Completed sets from workoutLogs for selectedDay
    const dayLogs = workoutLogs.filter((l) =>
      (l.dayId && l.dayId === selectedDay.id) ||
      (l.dayTitle === selectedDay.title && (l.dayId?.startsWith(`w${currentWeek}-`) || !l.dayId))
    );
    dayLogs.forEach((log) => {
      const exKey = (log.exerciseName || log.exerciseId || 'ex').trim().toLowerCase();
      completedSetKeys.add(`${exKey}_set_${log.setNumber}`);
    });

    // 2. Completed sets from activeOngoingWorkoutDay (live ongoing session)
    if (
      activeOngoingWorkoutDay &&
      (activeOngoingWorkoutDay.id === selectedDay.id || activeOngoingWorkoutDay.title === selectedDay.title) &&
      Array.isArray(activeOngoingWorkoutDay.exercises)
    ) {
      activeOngoingWorkoutDay.exercises.forEach((ex) => {
        const exKey = ex.name.trim().toLowerCase();
        if (Array.isArray(ex.plannedSetsDetails)) {
          ex.plannedSetsDetails.forEach((s) => {
            if (s.completed || s.isCompleted) {
              completedSetKeys.add(`${exKey}_set_${s.setNumber}`);
            }
          });
        }
        if (Array.isArray(ex.completedSets)) {
          ex.completedSets.forEach((s: any) => {
            completedSetKeys.add(`${exKey}_set_${s.setNumber}`);
          });
        }
      });
    }

    // 3. Completed sets marked directly in selectedDay.exercises
    selectedDay.exercises.forEach((ex) => {
      const exKey = ex.name.trim().toLowerCase();
      if (Array.isArray(ex.plannedSetsDetails)) {
        ex.plannedSetsDetails.forEach((s) => {
          if (s.completed || s.isCompleted) {
            completedSetKeys.add(`${exKey}_set_${s.setNumber}`);
          }
        });
      }
      if (Array.isArray(ex.completedSets)) {
        ex.completedSets.forEach((s: any) => {
          completedSetKeys.add(`${exKey}_set_${s.setNumber}`);
        });
      }
    });

    const completedCount = completedSetKeys.size;
    const percentage = totalPlanned > 0
      ? Math.min(100, Math.round((completedCount / totalPlanned) * 100))
      : 0;

    return {
      totalPlannedSets: totalPlanned,
      completedSetsCount: completedCount,
      completionPercentage: percentage,
    };
  }, [selectedDay, workoutLogs, activeOngoingWorkoutDay, currentWeek]);

  const currentPhase = weeksList.find((w) => w.week === currentWeek) || {
    week: currentWeek,
    name: `Tydzień ${currentWeek}: Plan Indywidualny`,
    volumeMultiplier: 1.0,
    targetRIR: 2,
    targetRPE: 8.0,
    progressionNote: 'Dostosuj obciążenie i tempo w każdym ćwiczeniu.',
    isDeload: false,
  };

  // Helper to check day status: 'completed' | 'in_progress' | 'not_started'
  const getDayStatus = (day: WorkoutDay): 'completed' | 'in_progress' | 'not_started' => {
    if (!day || day.type === 'REST_RECOVERY') return 'not_started';
    const exercises = day.exercises || [];
    if (exercises.length === 0) return 'not_started';

    const dayLogs = workoutLogs.filter(
      (l) => l.dayId === day.id || (l.dayId && l.dayId.startsWith(`w${currentWeek}-`) && l.dayTitle === day.title)
    );

    if (dayLogs.length === 0) return 'not_started';

    // 1. Twarda flaga ukończenia całej sesji treningowej (np. z głównego timera "Zakończ i Zapisz")
    const hasCompletedSessionFlag = dayLogs.some((l) => l.completed === true && (l.totalWorkoutDurationSec || 0) > 0);

    // 2. Weryfikacja, czy KAŻDE zaplanowane ćwiczenie ma w 100% zrealizowane wszystkie zaplanowane serie
    const areAllExercisesFullyCompleted = exercises.every((ex) => {
      const exLogs = dayLogs.filter(
        (l) =>
          (l.exerciseId && l.exerciseId === ex.id) ||
          (l.exerciseName && l.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase())
      );
      const plannedSetsCount = Math.max(
        ex.plannedSets || 0,
        ex.plannedSetsDetails?.length || 0,
        1
      );
      return exLogs.length >= plannedSetsCount;
    });

    if (hasCompletedSessionFlag || areAllExercisesFullyCompleted) {
      return 'completed';
    }

    return 'in_progress';
  };

  const isDayCompleted = (day: WorkoutDay) => getDayStatus(day) === 'completed';

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

  const calculateDayPlannedTonnageValue = (day: WorkoutDay) => {
    return calculateDayPlannedTonnage(day, currentPhase?.volumeMultiplier ?? 1.0);
  };

  // Exercise plan edit & reorder actions
  const handleSaveExercise = (savedExercise: Exercise) => {
    if (!selectedDay) return;
    const exists = selectedDay.exercises?.some((e) => e.id === savedExercise.id);
    let updatedExercises: Exercise[];
    if (exists) {
      updatedExercises = (selectedDay.exercises || []).map((e) =>
        e.id === savedExercise.id ? savedExercise : e
      );
    } else {
      updatedExercises = [...(selectedDay.exercises || []), savedExercise];
    }
    onUpdateDay({
      ...selectedDay,
      exercises: updatedExercises,
    });
  };

  const handleDeleteExerciseFromPlan = (exerciseId: string) => {
    if (!selectedDay) return;
    const exerciseToDelete = selectedDay.exercises?.find((e) => e.id === exerciseId);
    const exName = exerciseToDelete?.name || 'to ćwiczenie';
    if (window.confirm(`Czy na pewno chcesz usunąć ćwiczenie "${exName}" z planu treningu?`)) {
      const updatedExercises = (selectedDay.exercises || []).filter((e) => e.id !== exerciseId);
      onUpdateDay({
        ...selectedDay,
        exercises: updatedExercises,
      });
    }
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (!selectedDay || !selectedDay.exercises) return;
    if (toIndex < 0 || toIndex >= selectedDay.exercises.length) return;
    const updated = arrayMove(selectedDay.exercises, fromIndex, toIndex);
    onUpdateDay({
      ...selectedDay,
      exercises: updated,
    });
  };

  const handleStartReorderMode = () => {
    if (!selectedDay || !selectedDay.exercises) return;
    setReorderExercises([...selectedDay.exercises]);
    setIsReorderMode(true);
  };

  const handleReorderMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= reorderExercises.length) return;
    setReorderExercises((prev) => arrayMove(prev, fromIndex, toIndex));
  };

  const handleSaveReorder = () => {
    if (!selectedDay) return;
    onUpdateDay({
      ...selectedDay,
      exercises: reorderExercises,
    });
    setIsReorderMode(false);
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setReorderExercises([]);
  };

  // DND-Kit Sensors for exercise reordering:
  // - MouseSensor: Distance 8px for immediate desktop mouse drag
  // - TouchSensor & PointerSensor: Delay 200ms, tolerance 5px to avoid accidental drags during mobile scrolling
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // DND-Kit Sensors for horizontal workout day reordering:
  // - Mouse: 8px distance for snappy desktop drag
  // - Touch / Pointer: 200ms delay & 5px tolerance to allow normal swipe-scroll without accidental drag
  const daySensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const [activeDraggingDayId, setActiveDraggingDayId] = useState<string | null>(null);

  const handleDayDragStart = (event: DragStartEvent) => {
    setActiveDraggingDayId(String(event.active.id));
  };

  const handleDayDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDraggingDayId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = currentWeekDays.findIndex((d) => d.id === active.id);
    const newIndex = currentWeekDays.findIndex((d) => d.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(currentWeekDays, oldIndex, newIndex);
      if (onReorderDays) {
        onReorderDays(reordered);
      }
    }
  };

  const handleDayDragCancel = () => {
    setActiveDraggingDayId(null);
  };

  const activeDraggingDay = activeDraggingDayId
    ? currentWeekDays.find((d) => d.id === activeDraggingDayId) || null
    : null;
  const activeDraggingDayIndex = activeDraggingDay
    ? currentWeekDays.findIndex((d) => d.id === activeDraggingDay.id)
    : -1;

  const [activeDraggingExerciseId, setActiveDraggingExerciseId] = useState<string | null>(null);

  const handleExerciseDragStart = (event: DragStartEvent) => {
    setActiveDraggingExerciseId(String(event.active.id));
  };

  const handleExerciseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDraggingExerciseId(null);
    if (!over || active.id === over.id) return;

    setReorderExercises((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        return arrayMove(items, oldIndex, newIndex);
      }
      return items;
    });
  };

  const handleExerciseDragCancel = () => {
    setActiveDraggingExerciseId(null);
  };

  const exercisesToDisplay = isReorderMode ? reorderExercises : (selectedDay?.exercises || []);

  const activeDraggingExercise = activeDraggingExerciseId
    ? exercisesToDisplay.find((e) => e.id === activeDraggingExerciseId) || null
    : null;
  const activeDraggingIndex = activeDraggingExercise
    ? exercisesToDisplay.findIndex((e) => e.id === activeDraggingExercise.id)
    : -1;
  const shouldWiggle = isReorderMode && !activeDraggingExerciseId;

  return (
    <div
      className="space-y-4 pb-24 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0"
      onClick={() => {
        if (openKebabExerciseId) setOpenKebabExerciseId(null);
      }}
    >
      {/* Week Header info with quick change */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 border border-neutral-800 rounded-3xl p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-400 text-black shadow-sm">
              Tydzień {currentWeek}
            </span>
            <span className="text-xs font-bold text-white font-heading truncate max-w-[150px] sm:max-w-xs">
              {currentPhase.name.replace(/^Tydzień\s*\d+:\s*/i, '')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentPhase.isDeload && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Deload
              </span>
            )}

            {/* Tryb Edycji Przełącznik */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                isEditMode
                  ? 'bg-amber-400 text-black font-black ring-2 ring-amber-300 shadow-amber-400/30'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700'
              }`}
              title={isEditMode ? 'Tryb edycji aktywny - kliknij kafelek tygodnia lub treningu, aby go edytować' : 'Włącz tryb edycji'}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edytuj</span>
              {isEditMode && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
              {isEditMode ? 'Kliknij tydzień, aby edytować parametry' : 'Wybierz tydzień'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {weeksList.map((week) => {
              const isCurrent = week.week === currentWeek;
              return (
                <button
                  key={week.week}
                  onClick={() => {
                    if (isEditMode) {
                      setSelectedWeekToEdit(week);
                      setIsEditWeekModalOpen(true);
                    } else {
                      onWeekChange(week.week);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[42px] ${
                    isCurrent
                      ? isEditMode
                        ? 'bg-amber-400 text-black font-black ring-2 ring-dashed ring-black shadow-md'
                        : 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20 ring-2 ring-amber-300'
                      : isEditMode
                      ? 'bg-neutral-950 text-amber-300 border border-amber-500/40 hover:bg-neutral-800'
                      : 'bg-neutral-950 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                  title={isEditMode ? `Edytuj parametry Tygodnia ${week.week}` : `Przejdź do Tygodnia ${week.week}`}
                >
                  {isEditMode && <Edit2 className="w-3 h-3 text-amber-400 shrink-0" />}
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

            {/* Ostatni kafelek na liście: + Dodaj tydzień */}
            {onOpenAddWeekModal && (
              <button
                type="button"
                onClick={onOpenAddWeekModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[42px] border-2 border-dashed border-neutral-700 hover:border-amber-400 bg-neutral-950/40 text-neutral-400 hover:text-amber-400"
                title="Dodaj nowy tydzień do cyklu"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Dodaj tydzień</span>
              </button>
            )}
          </div>
        </div>

        {/* Day Selector Strip - Big tactile buttons with completion status and edit mode */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none pt-1">
          <DndContext
            sensors={daySensors}
            collisionDetection={closestCenter}
            onDragStart={handleDayDragStart}
            onDragEnd={handleDayDragEnd}
            onDragCancel={handleDayDragCancel}
            autoScroll={{
              threshold: { x: 0.15, y: 0.15 },
              acceleration: 8,
            }}
          >
            <SortableContext
              items={currentWeekDays.map((d) => d.id)}
              strategy={horizontalListSortingStrategy}
            >
              {currentWeekDays.map((day, index) => {
                const isSelected = selectedDay && selectedDay.id === day.id;
                const status = getDayStatus(day);

                return (
                  <SortableWorkoutDayTile
                    key={day.id}
                    day={day}
                    index={index}
                    isSelected={isSelected}
                    isEditMode={isEditMode}
                    status={status}
                    onSelect={() => onSelectDayId(day.id)}
                    onEdit={() => {
                      setSelectedDayToEdit(day);
                      setIsDaySettingsModalOpen(true);
                    }}
                  />
                );
              })}
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeDraggingDay ? (
                <div className="w-max min-w-[110px] shrink-0 p-2.5 rounded-2xl border-2 border-amber-400 bg-neutral-900 text-left min-h-[64px] flex flex-col justify-between relative overflow-hidden select-none whitespace-nowrap shadow-2xl z-50 ring-2 ring-amber-400/50">
                  <div className="flex items-center justify-between w-full gap-2 mb-1 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <GripVertical className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 text-amber-300">
                        Trening {activeDraggingDayIndex + 1}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-tight leading-none shrink-0 ${
                        activeDraggingDay.type === 'FBW'
                          ? 'bg-amber-400 text-black'
                          : activeDraggingDay.type === 'RUNNING_HIIT'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : activeDraggingDay.type === 'WEEKEND_HYROX'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : activeDraggingDay.type === 'REST_RECOVERY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {activeDraggingDay.type === 'FBW'
                        ? 'FBW'
                        : activeDraggingDay.type === 'RUNNING_HIIT'
                        ? 'Running'
                        : activeDraggingDay.type === 'WEEKEND_HYROX'
                        ? 'Hyrox'
                        : activeDraggingDay.type === 'REST_RECOVERY'
                        ? 'Rest'
                        : 'Custom'}
                    </span>
                  </div>

                  <div className="text-xs sm:text-[13px] font-extrabold whitespace-nowrap w-full text-left pt-0.5 text-white">
                    {((activeDraggingDay as any).dayLabel || activeDraggingDay.dayNamePolish || `Trening ${activeDraggingDayIndex + 1}`).replace(/^Dzień\s*(\d+)/i, 'Trening $1')}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Przedostatni kafelek: Kopiuj trening */}
          {selectedDay && onCopyDayToWeek && (
            <button
              type="button"
              onClick={() => setIsCopyWorkoutModalOpen(true)}
              className="w-max min-w-[100px] shrink-0 p-2.5 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-amber-400 bg-neutral-950/40 text-neutral-400 hover:text-amber-400 transition-all cursor-pointer touch-manipulation min-h-[64px] flex flex-col justify-center items-center gap-1 select-none whitespace-nowrap"
              title="Kopiuj aktywny trening do innego tygodnia"
            >
              <Copy className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold">Kopiuj trening</span>
            </button>
          )}

          {/* Ostatni kafelek: + Dodaj trening */}
          {onAddDay && (
            <button
              type="button"
              onClick={() => onAddDay()}
              className="w-max min-w-[100px] shrink-0 p-2.5 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-amber-400 bg-neutral-950/40 text-neutral-400 hover:text-amber-400 transition-all cursor-pointer touch-manipulation min-h-[64px] flex flex-col justify-center items-center gap-1 select-none whitespace-nowrap"
              title="Dodaj nowy trening do tego tygodnia"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold">+ Dodaj trening</span>
            </button>
          )}
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

            {/* SESSION PROGRESS BAR (Bieżący postęp sesji) */}
            {totalPlannedSets > 0 && (
              <div className="p-3.5 rounded-2xl bg-neutral-950/90 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    Postęp sesji:
                  </span>
                  <span className="font-extrabold text-amber-400 font-mono-numbers">
                    Wykonano {completedSetsCount} z {totalPlannedSets} serii ({completionPercentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      completionPercentage === 100
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                    }`}
                    style={{ width: `${Math.max(completedSetsCount > 0 ? 4 : 0, completionPercentage)}%` }}
                  />
                </div>
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
                Tonaż: <strong className="text-amber-400 font-mono-numbers">~{calculateDayPlannedTonnageValue(selectedDay).toLocaleString()} kg</strong>
              </span>
            </div>

            {(!selectedDay.exercises || selectedDay.exercises.length === 0) ? (
              <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-900 rounded-3xl border border-neutral-800">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p>Brak zaplanowanych ćwiczeń na ten trening.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleExerciseDragStart}
                onDragEnd={handleExerciseDragEnd}
                onDragCancel={handleExerciseDragCancel}
                autoScroll={{
                  threshold: {
                    x: 0.1,
                    y: 0.15,
                  },
                  acceleration: 4,
                  interval: 10,
                }}
              >
                <SortableContext
                  items={exercisesToDisplay.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {exercisesToDisplay.map((exercise, index) => (
                      <SortableExerciseCardWrapper
                        key={exercise.id}
                        id={exercise.id}
                        isReorderMode={isReorderMode}
                      >
                        {({ setNodeRef, style, isDragging, attributes, listeners }) => {
                          const isExpanded = !!expandedExerciseIds[exercise.id];

                    // Active sets for this exercise (strictly scoped to this selected day)
                    const currentSessionLogs = (workoutLogs || [])
                      .filter(
                        (l) =>
                          l.exerciseName &&
                          l.exerciseName.trim().toLowerCase() === exercise.name.trim().toLowerCase() &&
                          (l.dayId ? l.dayId === selectedDay.id : (l.dayTitle === selectedDay.title && l.dayId?.startsWith(`w${currentWeek}-`)))
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
                        weightKg: parseFloat(String(s.weightKg ?? s.weight ?? exercise.defaultWeightKg ?? 0)) || 0,
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

                    // Warunek sprawdzający, czy wszystkie serie tego ćwiczenia zostały oznaczone jako wykonane
                    const isExerciseCompleted =
                      (detailedSets.length > 0 && detailedSets.every((s) => s.completed)) ||
                      (currentSessionLogs.length > 0 && currentSessionLogs.length >= (exercise.plannedSets || 1));

                          return (
                            <div
                              ref={setNodeRef}
                              style={style}
                              className={`rounded-3xl p-4 shadow-md space-y-3 transition-all relative ${
                                isReorderMode
                                  ? isDragging
                                    ? 'ring-2 ring-amber-400 bg-neutral-900 shadow-2xl opacity-75 z-50'
                                    : shouldWiggle
                                    ? index % 2 === 0
                                      ? 'animate-wiggle ring-2 ring-amber-400 bg-neutral-900 shadow-xl'
                                      : 'animate-wiggle-delayed ring-2 ring-amber-400 bg-neutral-900 shadow-xl'
                                    : 'ring-2 ring-amber-400/60 bg-neutral-900 shadow-xl'
                                  : isExerciseCompleted
                                  ? 'border-2 border-emerald-600 dark:border-emerald-500 bg-neutral-900/90 opacity-80 shadow-emerald-950/20'
                                  : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              {/* Tryb zmiany kolejności - pasek sterowania pozycją na karcie z uchwytem Drag & Drop */}
                              {isReorderMode && (
                                <div
                                  {...attributes}
                                  {...listeners}
                                  className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-950 border border-amber-400/50 text-xs touch-none select-none cursor-grab active:cursor-grabbing hover:border-amber-400 transition-colors shadow-sm"
                                  title="Chwyć za ten pasek, aby przeciągnąć i zmienić kolejność"
                                >
                                  <div className="flex items-center gap-2 pointer-events-none">
                                    <GripVertical className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="font-extrabold text-amber-300">Pozycja #{index + 1}</span>
                                    <span className="text-[10px] text-neutral-500 hidden sm:inline">(przeciągnij)</span>
                                  </div>
                                  <div
                                    className="flex items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderMove(index, index - 1);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white font-bold cursor-pointer flex items-center gap-1 touch-manipulation active:scale-95 transition-all"
                                      title="Przesuń wyżej"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                      <span>Góra</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === exercisesToDisplay.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderMove(index, index + 1);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white font-bold cursor-pointer flex items-center gap-1 touch-manipulation active:scale-95 transition-all"
                                      title="Przesuń niżej"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                      <span>Dół</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                                #{index + 1} • {exercise.muscleGroup?.split('(')[0]?.trim() || (isCardio ? 'Cardio / Bieg' : 'Ogólne')}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-950 text-neutral-400 border border-neutral-800">
                                {isCardio ? (exercise.distanceUnit || 'm') : (exercise.unit || 'kg')}
                              </span>
                              {!isReorderMode && isExerciseCompleted && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800 inline-flex items-center gap-1 shadow-sm">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Wykonane</span>
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold text-white font-heading">
                              {exercise.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setChartExerciseName(exercise.name)}
                              className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 text-xs transition-colors cursor-pointer touch-manipulation"
                              title="Wykres progresu"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>

                            {/* Menu Kebab (Trzy kropki) z 5 akcjami */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenKebabExerciseId(openKebabExerciseId === exercise.id ? null : exercise.id);
                                }}
                                className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer touch-manipulation ${
                                  openKebabExerciseId === exercise.id
                                    ? 'bg-amber-400 text-black border-amber-300'
                                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-800'
                                }`}
                                title="Więcej opcji ćwiczenia"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openKebabExerciseId === exercise.id && (
                                <div
                                  className="absolute right-0 top-full mt-1.5 w-44 bg-neutral-950 border border-neutral-700 rounded-2xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 text-xs text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenKebabExerciseId(null);
                                      setExerciseToEdit(exercise);
                                      setIsExerciseEditModalOpen(true);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-neutral-800 text-neutral-200 flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Edytuj</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => {
                                      setOpenKebabExerciseId(null);
                                      handleMoveExercise(index, index - 1);
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-neutral-800 flex items-center gap-2 font-medium cursor-pointer ${
                                      index === 0 ? 'opacity-30 cursor-not-allowed' : 'text-neutral-200'
                                    }`}
                                  >
                                    <ArrowUp className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Przesuń w górę</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={index === exercisesToDisplay.length - 1}
                                    onClick={() => {
                                      setOpenKebabExerciseId(null);
                                      handleMoveExercise(index, index + 1);
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-neutral-800 flex items-center gap-2 font-medium cursor-pointer ${
                                      index === exercisesToDisplay.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-neutral-200'
                                    }`}
                                  >
                                    <ArrowDown className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Przesuń w dół</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenKebabExerciseId(null);
                                      handleStartReorderMode();
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-neutral-800 text-amber-400 flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <GripVertical className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Zmień kolejność</span>
                                  </button>

                                  <div className="border-t border-neutral-800 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenKebabExerciseId(null);
                                      handleDeleteExerciseFromPlan(exercise.id);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-red-500/20 text-red-400 flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Usuń</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
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
                      {isExerciseCompleted ? (
                        <button
                          onClick={() => setActiveDetailExercise(exercise)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[44px] shadow-md shadow-emerald-950/30 border border-emerald-600 dark:border-emerald-500"
                          title="Wszystkie serie ukończone! Kliknij, aby przejrzeć lub edytować"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Ukończone</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveDetailExercise(exercise)}
                          className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 border border-neutral-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[44px]"
                        >
                          <Sliders className="w-3.5 h-3.5 text-amber-400" />
                          <span>Szczegóły & Odhacz Serie</span>
                        </button>
                      )}
                            </div>
                          );
                        }}
                      </SortableExerciseCardWrapper>
                    ))}

                    {/* Dodaj nowe ćwiczenie do treningu */}
                    {!isReorderMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setExerciseToEdit(null);
                          setIsExerciseEditModalOpen(true);
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-neutral-700 hover:border-amber-400 bg-neutral-900/50 hover:bg-neutral-900 text-neutral-400 hover:text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-[48px] shadow-sm"
                      >
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span>+ Dodaj ćwiczenie do treningu</span>
                      </button>
                    )}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeDraggingExercise ? (
                    <div className="w-full bg-neutral-900 border-2 border-amber-400 rounded-3xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-2 ring-amber-400/60 z-50 cursor-grabbing pointer-events-none select-none touch-none text-left space-y-3 opacity-100">
                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-950 border border-amber-400/60 text-xs">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="font-extrabold text-amber-300">
                            Pozycja #{activeDraggingIndex + 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                          Przenoszenie...
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                              #{activeDraggingIndex + 1} • {activeDraggingExercise.muscleGroup?.split('(')[0]?.trim() || (activeDraggingExercise.category === 'cardio' || activeDraggingExercise.exerciseType === 'RUNNING' ? 'Cardio / Bieg' : 'Ogólne')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-950 text-neutral-400 border border-neutral-800">
                              {activeDraggingExercise.unit || 'kg'}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white font-heading">
                            {activeDraggingExercise.name}
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Serie</span>
                          <span className="font-extrabold text-white font-mono-numbers text-sm">
                            {activeDraggingExercise.plannedSets || activeDraggingExercise.plannedSetsDetails?.length || 3}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Powtórzenia</span>
                          <span className="font-extrabold text-white font-mono-numbers text-sm">
                            {activeDraggingExercise.targetRepsRange || '8'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Ciężar</span>
                          <span className="font-black text-amber-400 font-mono-numbers text-sm">
                            {activeDraggingExercise.defaultWeightKg ? `${activeDraggingExercise.defaultWeightKg} ${activeDraggingExercise.unit || 'kg'}` : 'Ciało'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      ) : null}

      {/* Tryb Reorganizacji - Dolny Panel Zatwierdzenia */}
      {isReorderMode && (
        <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-auto sm:w-[480px] z-50 bg-neutral-950/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0">
              <GripVertical className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-black text-white truncate">Tryb zmiany kolejności</div>
              <div className="text-[10px] text-neutral-400 truncate">Użyj przycisków Góra/Dół na kartach</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancelReorder}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSaveReorder}
              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 cursor-pointer"
            >
              Zatwierdź
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* 1. Edit Week Parameters Modal */}
      {isEditWeekModalOpen && selectedWeekToEdit && (
        <EditWeekParamsModal
          isOpen={isEditWeekModalOpen}
          onClose={() => {
            setIsEditWeekModalOpen(false);
            setSelectedWeekToEdit(null);
          }}
          week={selectedWeekToEdit}
          canDelete={weeksList.length > 1}
          onSave={(updatedPhase: MesocyclePhase) => {
            if (onUpdatePhase) onUpdatePhase(updatedPhase);
            setIsEditWeekModalOpen(false);
            setSelectedWeekToEdit(null);
          }}
          onDeleteWeek={onDeleteWeek}
        />
      )}

      {/* 2. Day Settings Modal */}
      {isDaySettingsModalOpen && selectedDayToEdit && (
        <DaySettingsModal
          day={selectedDayToEdit}
          isOpen={isDaySettingsModalOpen}
          onClose={() => {
            setIsDaySettingsModalOpen(false);
            setSelectedDayToEdit(null);
          }}
          onSaveDaySettings={(updatedDay) => {
            onUpdateDay(updatedDay);
            setIsDaySettingsModalOpen(false);
            setSelectedDayToEdit(null);
          }}
          onDeleteDay={onDeleteDay}
        />
      )}

      {/* 3. Copy Workout Modal */}
      {isCopyWorkoutModalOpen && selectedDay && onCopyDayToWeek && (
        <CopyWorkoutModal
          isOpen={isCopyWorkoutModalOpen}
          onClose={() => setIsCopyWorkoutModalOpen(false)}
          sourceDay={selectedDay}
          currentWeek={currentWeek}
          totalWeeksCount={weeksList.length}
          onCopyDayToWeek={onCopyDayToWeek}
          onCopyEntireWeekTo={onCopyEntireWeekTo}
        />
      )}

      {/* 4. Exercise Edit / Add Modal */}
      {isExerciseEditModalOpen && selectedDay && (
        <ExerciseEditModal
          isOpen={isExerciseEditModalOpen}
          onClose={() => {
            setIsExerciseEditModalOpen(false);
            setExerciseToEdit(null);
          }}
          exerciseToEdit={exerciseToEdit}
          onSaveExercise={(savedExercise) => {
            handleSaveExercise(savedExercise);
            setIsExerciseEditModalOpen(false);
            setExerciseToEdit(null);
          }}
          onDeleteExercise={(exerciseId) => {
            handleDeleteExerciseFromPlan(exerciseId);
            setIsExerciseEditModalOpen(false);
            setExerciseToEdit(null);
          }}
        />
      )}

      {/* 5. Detail & Logging Modal */}
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

      {/* 6. Exercise Progress Chart Modal */}
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

      {/* 7. Previous Workout Modal */}
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
