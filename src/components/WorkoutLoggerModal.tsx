import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Dumbbell,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  MessageSquare,
  FileText,
  Activity,
  Flame,
  Check,
  History,
  BarChart3,
  Calendar,
  ArrowRight,
  MoveRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Play,
  Pause,
  BellRing,
  Gauge,
  HeartPulse,
  Award
} from 'lucide-react';
import {
  WorkoutDay,
  Exercise,
  WorkoutLogEntry,
  ExerciseSet,
  MuscleGroup,
  MesocyclePhase,
  SessionActivityType,
  ExerciseType,
  ExerciseUnit
} from '../types/hyrox';
import { MESOCYCLE_WEEKS } from '../data/hyroxPlanData';
import { EXERCISE_CATALOG, CatalogExerciseItem } from '../data/exerciseCatalog';
import { ExerciseChartModal } from './ExerciseChartModal';
import { WorkoutSummaryStatsModal } from './WorkoutSummaryStatsModal';
import { PreviousWorkoutModal } from './PreviousWorkoutModal';
import { playGarminRestFinishBeep, playGarminLapClick } from '../utils/audioAlert';
import { getLocalDateString, extractLogDate, compareLogsDescending } from '../utils/dateUtils';

interface WorkoutLoggerModalProps {
  day: WorkoutDay;
  currentWeek: number;
  isOpen: boolean;
  onClose: () => void;
  onSaveLogs: (entries: WorkoutLogEntry[]) => void;
  onStartRestTimer: (seconds: number) => void;
  isSheetsConnected: boolean;
  onUpdateDayExercises?: (exercises: Exercise[]) => void;
  workoutLogs?: WorkoutLogEntry[];
  allWeeksPlans?: Record<number, WorkoutDay[]>;
  weeksList?: MesocyclePhase[];
  onSwitchDay?: (targetWeek: number, targetDay: WorkoutDay) => void;
  onMoveDay?: (fromWeek: number, fromDayNumber: number, toWeek: number, toDayNumber: number) => void;
  isMinimized?: boolean;
  onToggleMinimize?: (minimized: boolean) => void;
}

interface ActiveExerciseState {
  exercise: Exercise;
  exerciseRpe: number;
  exerciseRir: number;
  exerciseNotes: string;
  sets: ExerciseSet[];
}

export const WorkoutLoggerModal: React.FC<WorkoutLoggerModalProps> = ({
  day,
  currentWeek,
  isOpen,
  onClose,
  onSaveLogs,
  onStartRestTimer,
  isSheetsConnected,
  onUpdateDayExercises,
  workoutLogs = [],
  allWeeksPlans = {},
  weeksList = MESOCYCLE_WEEKS,
  onSwitchDay,
  onMoveDay,
  isMinimized,
  onToggleMinimize,
}) => {
  const currentPhase = weeksList.find((w) => w.week === currentWeek) || MESOCYCLE_WEEKS[0];

  // Internal minimization state if uncontrolled
  const [internalMinimized, setInternalMinimized] = useState<boolean>(false);
  const isMin = isMinimized !== undefined ? isMinimized : internalMinimized;
  const handleMinimize = (minVal: boolean) => {
    if (onToggleMinimize) {
      onToggleMinimize(minVal);
    } else {
      setInternalMinimized(minVal);
    }
  };

  // Expandable exercise title in Garmin stoper card
  const [isExerciseNameExpanded, setIsExerciseNameExpanded] = useState<boolean>(false);

  // Overall workout session notes
  const [sessionNotes, setSessionNotes] = useState<string>('');

  const todayStr = getLocalDateString();
  // Match logs only for THIS EXACT DAY ID executed today, so next week or other days don't get pre-marked as completed
  const existingTodayLogs = (workoutLogs || []).filter(
    (l) =>
      (extractLogDate(l) === todayStr) &&
      (l.dayId === day.id)
  );

  const buildInitialExerciseState = (): ActiveExerciseState[] => {
    return day.exercises.map((ex) => {
      const baseWeight = typeof ex.defaultWeightKg === 'number' ? ex.defaultWeightKg : 0;
      const exUnit = ex.unit || 'kg';

      // 1. Logs completed TODAY for this exact day (day.id)
      const logsForThisEx = existingTodayLogs
        .filter((l) => l.exerciseName && l.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase())
        .sort((a, b) => a.setNumber - b.setNumber);

      let sets: ExerciseSet[] = [];
      if (logsForThisEx.length > 0) {
        // If today's workout for this day was already performed, allow editing today's completed sets
        sets = logsForThisEx.map((l) => ({
          setNumber: l.setNumber,
          weightKg: l.weightKg,
          reps: l.reps,
          completed: true,
          tonnage: l.tonnageKg || l.weightKg * l.reps,
          unit: (l.unit as ExerciseUnit) || exUnit,
          setDurationSec: l.setDurationSec,
          restDurationSec: l.restDurationSec,
          targetDistance: l.targetDistance || ex.targetDistance,
          distanceUnit: l.distanceUnit || ex.distanceUnit || 'm',
          targetPace: l.targetPace || ex.targetPace,
          actualPace: l.actualPace || ex.targetPace,
          targetHR: l.targetHR || ex.targetHR,
          actualHR: l.actualHR,
        }));

        const plannedCount = ex.plannedSets || 3;
        for (let i = sets.length + 1; i <= plannedCount; i++) {
          const reps = parseInt(String(ex.targetRepsRange || '8').split('-')[0]) || 8;
          sets.push({
            setNumber: i,
            weightKg: baseWeight,
            reps,
            completed: false,
            tonnage: baseWeight * reps,
            unit: exUnit,
            targetDistance: ex.targetDistance,
            distanceUnit: ex.distanceUnit || 'm',
            targetPace: ex.targetPace,
            targetHR: ex.targetHR,
          });
        }
      } else {
        // 2. Fresh workout session (e.g. starting a new week or starting today's session for the first time):
        // Query the most recent completed performance for this exercise from previous workouts/weeks
        const pastLogsForEx = (workoutLogs || [])
          .filter(
            (l) =>
              l.exerciseName &&
              l.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase() &&
              l.dayId !== day.id
          )
          .sort((a, b) => compareLogsDescending(a, b));

        const lastPrevDate = pastLogsForEx[0] ? extractLogDate(pastLogsForEx[0]) : '';
        const rawPrevSets = lastPrevDate
          ? pastLogsForEx
              .filter((l) => extractLogDate(l) === lastPrevDate)
              .sort((a, b) => a.setNumber - b.setNumber)
          : [];

        const prevSetMap = new Map<number, WorkoutLogEntry>();
        rawPrevSets.forEach((s) => prevSetMap.set(s.setNumber || 1, s));
        const distinctPrevSets = Array.from(prevSetMap.values()).sort((a, b) => a.setNumber - b.setNumber);

        // Calculate progression delta if planned baseWeight is higher than the previous session's weight
        const prevFirstWeight = distinctPrevSets[0]?.weightKg || 0;
        let progressionDelta = 0;
        if (baseWeight > 0 && prevFirstWeight > 0 && baseWeight > prevFirstWeight) {
          progressionDelta = Number((baseWeight - prevFirstWeight).toFixed(1));
        }

        const plannedCount = Math.max(ex.plannedSets || 3, distinctPrevSets.length);
        const defaultReps = parseInt(String(ex.targetRepsRange || '8').split('-')[0]) || 8;

        sets = Array.from({ length: plannedCount }, (_, i) => {
          const prevSet = distinctPrevSets[i];
          let setWeight = baseWeight;

          if (prevSet && typeof prevSet.weightKg === 'number') {
            if (progressionDelta > 0) {
              setWeight = Number((prevSet.weightKg + progressionDelta).toFixed(1));
            } else if (baseWeight > 0) {
              setWeight = Math.max(baseWeight, prevSet.weightKg);
            } else {
              setWeight = prevSet.weightKg;
            }
          } else if (distinctPrevSets.length > 0) {
            const lastW = distinctPrevSets[distinctPrevSets.length - 1]?.weightKg || baseWeight;
            setWeight = progressionDelta > 0 ? Number((lastW + progressionDelta).toFixed(1)) : Math.max(baseWeight, lastW);
          }

          const setReps = prevSet?.reps || defaultReps;

          return {
            setNumber: i + 1,
            weightKg: setWeight,
            reps: setReps,
            completed: false, // Must be uncompleted for a fresh session!
            tonnage: setWeight * setReps,
            unit: (prevSet?.unit as ExerciseUnit) || exUnit,
            targetDistance: ex.targetDistance,
            distanceUnit: ex.distanceUnit || 'm',
            targetPace: ex.targetPace,
            targetHR: ex.targetHR,
          };
        });
      }

      return {
        exercise: ex,
        exerciseRpe: logsForThisEx[0]?.rpe || currentPhase.targetRPE || ex.targetRPE || 8,
        exerciseRir: logsForThisEx[0]?.rir || currentPhase.targetRIR || ex.targetRIR || 2,
        exerciseNotes: logsForThisEx[0]?.notes || '',
        sets,
      };
    });
  };

  // Active exercises state with independent sets
  const [exercisesState, setExercisesState] = useState<ActiveExerciseState[]>(() => buildInitialExerciseState());

  // Re-sync if day changes while open
  useEffect(() => {
    setExercisesState(buildInitialExerciseState());
  }, [day.id, currentWeek]);

  // Global Session Timer
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    const prevSecs = existingTodayLogs[0]?.totalWorkoutDurationSec;
    return typeof prevSecs === 'number' && prevSecs > 0 ? prevSecs : 0;
  });

  // Garmin Lap & Rest Engine State
  const [garminPhase, setGarminPhase] = useState<'WORK' | 'REST'>('WORK');
  const [lapSeconds, setLapSeconds] = useState(0);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [isRestAlertActive, setIsRestAlertActive] = useState(false);
  const alertedLapRef = useRef<boolean>(false);

  // Modals state
  const [selectedChartExerciseName, setSelectedChartExerciseName] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isPreviousModalOpen, setIsPreviousModalOpen] = useState(false);
  const [isMoveDayOpen, setIsMoveDayOpen] = useState(false);

  // In-session exercise adder modal/popover
  const [isAddingExerciseLive, setIsAddingExerciseLive] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [liveExerciseType, setLiveExerciseType] = useState<ExerciseType>('STRENGTH');
  const [liveUnit, setLiveUnit] = useState<ExerciseUnit>('kg');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Czworogłowe (Quads)');
  const [customSets, setCustomSets] = useState(3);
  const [customReps, setCustomReps] = useState('8-10');
  const [customWeight, setCustomWeight] = useState(50);
  const [customRest, setCustomRest] = useState(90);

  // Move / Shift Day target states
  const [shiftTargetWeek, setShiftTargetWeek] = useState<number>(currentWeek);
  const [shiftTargetDayNum, setShiftTargetDayNum] = useState<number>(day.dayNumber);

  // Running tick for both global session timer and active Garmin lap timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
      setLapSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Determine current active exercise and set
  const currentActiveEx = exercisesState[activeExerciseIdx]?.exercise;
  const currentActiveSet = exercisesState[activeExerciseIdx]?.sets[activeSetIdx];
  const targetRestSeconds = currentActiveEx?.restSeconds || currentActiveEx?.restBetweenSetsSec || 90;

  // Watch for Rest timer reaching target and alert
  useEffect(() => {
    if (garminPhase === 'REST') {
      if (lapSeconds >= targetRestSeconds && !alertedLapRef.current) {
        alertedLapRef.current = true;
        setIsRestAlertActive(true);
        playGarminRestFinishBeep();
      }
    } else {
      alertedLapRef.current = false;
      setIsRestAlertActive(false);
    }
  }, [garminPhase, lapSeconds, targetRestSeconds]);

  // Garmin LAP Button Click Handler
  const handleGarminLap = () => {
    playGarminLapClick();

    if (garminPhase === 'WORK') {
      // Complete current set and record duration
      setExercisesState((prev) => {
        const next = [...prev];
        if (next[activeExerciseIdx]?.sets[activeSetIdx]) {
          const s = { ...next[activeExerciseIdx].sets[activeSetIdx] };
          s.completed = true;
          s.setDurationSec = lapSeconds;
          next[activeExerciseIdx].sets[activeSetIdx] = s;
        }
        return next;
      });

      // Switch to REST mode (black display)
      setGarminPhase('REST');
      setLapSeconds(0);
      setIsRestAlertActive(false);
      alertedLapRef.current = false;
    } else {
      // Ending REST mode, record rest time and advance to next set
      setExercisesState((prev) => {
        const next = [...prev];
        if (next[activeExerciseIdx]?.sets[activeSetIdx]) {
          const s = { ...next[activeExerciseIdx].sets[activeSetIdx] };
          s.restDurationSec = lapSeconds;
          next[activeExerciseIdx].sets[activeSetIdx] = s;
        }
        return next;
      });

      // Move to next set or next exercise
      const exSets = exercisesState[activeExerciseIdx]?.sets || [];
      if (activeSetIdx + 1 < exSets.length) {
        setActiveSetIdx((prev) => prev + 1);
      } else if (activeExerciseIdx + 1 < exercisesState.length) {
        setActiveExerciseIdx((prev) => prev + 1);
        setActiveSetIdx(0);
      }

      // Switch to WORK mode (white display)
      setGarminPhase('WORK');
      setLapSeconds(0);
      setIsRestAlertActive(false);
      alertedLapRef.current = false;
    }
  };

  // Jump/Focus directly on a specific set
  const handleSelectActiveSet = (exIdx: number, sIdx: number) => {
    setActiveExerciseIdx(exIdx);
    setActiveSetIdx(sIdx);
    setLapSeconds(0);
    setGarminPhase('WORK');
    setIsRestAlertActive(false);
    alertedLapRef.current = false;
  };

  if (!isOpen) return null;

  // Find next uncompleted workout in current week or adjacent weeks
  const weekDays = allWeeksPlans[currentWeek] || [];
  const currentDayIndex = weekDays.findIndex((d) => d.id === day.id);
  let nextUncompletedDay: WorkoutDay | null = null;

  for (let i = currentDayIndex + 1; i < weekDays.length; i++) {
    if (weekDays[i].type !== 'REST_RECOVERY') {
      nextUncompletedDay = weekDays[i];
      break;
    }
  }
  if (!nextUncompletedDay) {
    nextUncompletedDay = weekDays.find((d) => d.id !== day.id && d.type !== 'REST_RECOVERY') || null;
  }

  // Find previous logs for this workout day
  const previousWorkoutLogs = workoutLogs.filter(
    (l) => l.dayTitle === day.title || l.dayId === day.id
  );
  const prevDates = Array.from(
    new Set(previousWorkoutLogs.map((l) => l.dateStr || l.timestamp.split('T')[0]))
  ).sort().reverse();
  const latestPrevDate = prevDates[0];
  const latestPreviousSessionLogs = latestPrevDate
    ? previousWorkoutLogs.filter((l) => (l.dateStr || l.timestamp.split('T')[0]) === latestPrevDate)
    : [];
  const previousSessionTonnage = latestPreviousSessionLogs.reduce(
    (sum, l) => sum + (l.tonnageKg || 0),
    0
  );

  // Update specific set in an exercise
  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: any
  ) => {
    setExercisesState((prev) => {
      const next = [...prev];
      const targetSet = { ...next[exerciseIndex].sets[setIndex], [field]: value };
      targetSet.tonnage = Math.round((Number(targetSet.weightKg) || 0) * (Number(targetSet.reps) || 0));
      next[exerciseIndex].sets[setIndex] = targetSet;
      return next;
    });
  };

  const adjustWeight = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      const currentW = Number(next[exerciseIndex].sets[setIndex].weightKg) || 0;
      const newW = Math.max(0, currentW + delta);
      const reps = Number(next[exerciseIndex].sets[setIndex].reps) || 0;
      next[exerciseIndex].sets[setIndex].weightKg = newW;
      next[exerciseIndex].sets[setIndex].tonnage = Math.round(newW * reps);
      return next;
    });
  };

  const adjustReps = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      const currentR = Number(next[exerciseIndex].sets[setIndex].reps) || 0;
      const newR = Math.max(1, currentR + delta);
      const weight = Number(next[exerciseIndex].sets[setIndex].weightKg) || 0;
      next[exerciseIndex].sets[setIndex].reps = newR;
      next[exerciseIndex].sets[setIndex].tonnage = Math.round(weight * newR);
      return next;
    });
  };

  const updateExerciseRpe = (exerciseIndex: number, val: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      next[exerciseIndex].exerciseRpe = val;
      return next;
    });
  };

  const updateExerciseRir = (exerciseIndex: number, val: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      next[exerciseIndex].exerciseRir = val;
      return next;
    });
  };

  const updateExerciseNotes = (exerciseIndex: number, text: string) => {
    setExercisesState((prev) => {
      const next = [...prev];
      next[exerciseIndex].exerciseNotes = text;
      return next;
    });
  };

  const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      const currentVal = next[exerciseIndex].sets[setIndex].completed;
      next[exerciseIndex].sets[setIndex].completed = !currentVal;

      if (!currentVal) {
        // If completing, record lap time if this is the active set
        if (exerciseIndex === activeExerciseIdx && setIndex === activeSetIdx) {
          next[exerciseIndex].sets[setIndex].setDurationSec = lapSeconds;
          setGarminPhase('REST');
          setLapSeconds(0);
          setIsRestAlertActive(false);
          alertedLapRef.current = false;
        }
        onStartRestTimer(next[exerciseIndex].exercise.restSeconds || 90);
      }
      return next;
    });
  };

  const addSetToExercise = (exerciseIndex: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      const lastSet = next[exerciseIndex].sets[next[exerciseIndex].sets.length - 1];
      const initialWeight = lastSet ? lastSet.weightKg : next[exerciseIndex].exercise.defaultWeightKg || 60;
      const initialReps = lastSet ? lastSet.reps : 8;
      const exUnit = next[exerciseIndex].exercise.unit || 'kg';

      const newSet: ExerciseSet = {
        setNumber: next[exerciseIndex].sets.length + 1,
        weightKg: initialWeight,
        reps: initialReps,
        completed: false,
        tonnage: initialWeight * initialReps,
        unit: exUnit,
        targetDistance: next[exerciseIndex].exercise.targetDistance,
        distanceUnit: next[exerciseIndex].exercise.distanceUnit,
        targetPace: next[exerciseIndex].exercise.targetPace,
        targetHR: next[exerciseIndex].exercise.targetHR,
      };
      next[exerciseIndex].sets.push(newSet);
      return next;
    });
  };

  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    setExercisesState((prev) => {
      const next = [...prev];
      if (next[exerciseIndex].sets.length > 1) {
        next[exerciseIndex].sets.splice(setIndex, 1);
        next[exerciseIndex].sets.forEach((s, idx) => {
          s.setNumber = idx + 1;
        });
      }
      return next;
    });
  };

  const removeExerciseFromSession = (exerciseIndex: number) => {
    setExercisesState((prev) => prev.filter((_, idx) => idx !== exerciseIndex));
    if (activeExerciseIdx >= exerciseIndex && activeExerciseIdx > 0) {
      setActiveExerciseIdx((prev) => prev - 1);
    }
  };

  const handleAddLiveFromCatalog = (catItem: CatalogExerciseItem) => {
    const newEx: Exercise = {
      id: `ex-live-${Date.now()}`,
      name: catItem.name,
      muscleGroup: catItem.muscleGroup,
      plannedSets: catItem.defaultSets,
      targetRepsRange: catItem.defaultReps,
      defaultWeightKg: catItem.defaultWeight,
      targetRIR: catItem.defaultRIR,
      targetRPE: catItem.defaultRPE,
      restSeconds: catItem.restSeconds,
      hyroxRelevance: catItem.hyroxRelevance,
      techniqueNotes: catItem.techniqueNotes,
      unit: 'kg',
      exerciseType: 'STRENGTH',
    };

    const initialReps = parseInt(catItem.defaultReps.split('-')[0]) || 8;
    const sets: ExerciseSet[] = Array.from({ length: catItem.defaultSets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: catItem.defaultWeight,
      reps: initialReps,
      completed: false,
      tonnage: catItem.defaultWeight * initialReps,
      unit: 'kg',
    }));

    setExercisesState((prev) => [
      ...prev,
      {
        exercise: newEx,
        exerciseRpe: catItem.defaultRPE,
        exerciseRir: catItem.defaultRIR,
        exerciseNotes: '',
        sets,
      },
    ]);
    setIsAddingExerciseLive(false);
  };

  const handleAddLiveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExerciseName.trim()) return;

    const newEx: Exercise = {
      id: `ex-live-${Date.now()}`,
      name: customExerciseName.trim(),
      muscleGroup: customMuscle,
      plannedSets: Number(customSets) || 3,
      targetRepsRange: customReps || '8-10',
      defaultWeightKg: Number(customWeight) || 0,
      targetRIR: 2,
      targetRPE: 8,
      restSeconds: Number(customRest) || 90,
      hyroxRelevance: 'Dodane w trakcie trwania sesji treningowej.',
      techniqueNotes: 'Płynna kontrola tempa.',
      unit: liveUnit,
      exerciseType: liveExerciseType,
    };

    const sets: ExerciseSet[] = Array.from({ length: Number(customSets) || 3 }, (_, i) => ({
      setNumber: i + 1,
      weightKg: Number(customWeight) || 0,
      reps: parseInt(customReps) || 8,
      completed: false,
      tonnage: (Number(customWeight) || 0) * (parseInt(customReps) || 8),
      unit: liveUnit,
    }));

    setExercisesState((prev) => [
      ...prev,
      {
        exercise: newEx,
        exerciseRpe: 8,
        exerciseRir: 2,
        exerciseNotes: '',
        sets,
      },
    ]);
    setCustomExerciseName('');
    setIsAddingExerciseLive(false);
  };

  // Aggregated session statistics
  const totalCompletedSets = exercisesState.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalPlannedSets = exercisesState.reduce((acc, ex) => acc + ex.sets.length, 0);

  const totalSessionTonnage = exercisesState.reduce((acc, ex) => {
    return (
      acc +
      ex.sets.reduce((sAcc, s) => {
        return sAcc + s.tonnage;
      }, 0)
    );
  }, 0);

  const totalWorkDurationSec = exercisesState.reduce((acc, ex) => {
    return acc + ex.sets.filter((s) => s.completed).reduce((sAcc, s) => sAcc + (s.setDurationSec || 0), 0);
  }, 0);

  const totalRestDurationSec = exercisesState.reduce((acc, ex) => {
    return acc + ex.sets.filter((s) => s.completed).reduce((sAcc, s) => sAcc + (s.restDurationSec || 0), 0);
  }, 0);

  // Save session
  const handleFinishAndSave = () => {
    const todayStr = getLocalDateString();
    const sessionId =
      existingTodayLogs[0]?.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newLogEntries: WorkoutLogEntry[] = [];

    const activityType: SessionActivityType =
      day.type === 'RUNNING_HIIT'
        ? 'RUNNING'
        : day.type === 'WEEKEND_HYROX'
        ? 'HYROX'
        : day.type === 'REST_RECOVERY'
        ? 'RECOVERY'
        : 'STRENGTH';

    const fullSessionTitle = `${day.dayNamePolish ? day.dayNamePolish + ': ' : ''}${day.title}`;

    exercisesState.forEach((exItem) => {
      exItem.sets.forEach((set) => {
        if (set.completed) {
          newLogEntries.push({
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            dateStr: todayStr,
            dayId: day.id,
            dayTitle: day.title,
            exerciseId: exItem.exercise.id,
            exerciseName: exItem.exercise.name,
            muscleGroup: exItem.exercise.muscleGroup,
            setNumber: set.setNumber,
            weightKg: set.weightKg,
            reps: set.reps,
            tonnageKg: set.tonnage,
            rpe: exItem.exerciseRpe,
            rir: exItem.exerciseRir,
            notes: exItem.exerciseNotes || undefined,
            sessionNotes: sessionNotes || undefined,
            sessionId,
            sessionTitle: fullSessionTitle,
            activityType,
            durationMinutes: Math.max(1, Math.round(sessionSeconds / 60)) || day.durationMinutes || 60,
            unit: set.unit || exItem.exercise.unit || 'kg',
            setDurationSec: set.setDurationSec,
            restDurationSec: set.restDurationSec,
            targetDistance: set.targetDistance || exItem.exercise.targetDistance,
            distanceUnit: set.distanceUnit || exItem.exercise.distanceUnit,
            targetPace: set.targetPace || exItem.exercise.targetPace,
            actualPace: set.actualPace || exItem.exercise.targetPace,
            targetHR: set.targetHR || exItem.exercise.targetHR,
            totalWorkoutDurationSec: sessionSeconds,
            totalWorkDurationSec,
            totalRestDurationSec,
          });
        }
      });
    });

    if (newLogEntries.length === 0) {
      const confirmSaveEmpty = window.confirm(
        'Nie zaznaczono żadnej ukończonej serii (zielony ptaszek). Czy mimo to chcesz zamknąć okno bez zapisu?'
      );
      if (confirmSaveEmpty) {
        onClose();
      }
      return;
    }

    onSaveLogs(newLogEntries);

    if (onUpdateDayExercises) {
      const updatedExercises: Exercise[] = exercisesState.map((exItem) => ({
        ...exItem.exercise,
        plannedSets: exItem.sets.length,
        defaultWeightKg: exItem.sets[0]?.weightKg || exItem.exercise.defaultWeightKg,
        targetRPE: exItem.exerciseRpe,
        targetRIR: exItem.exerciseRir,
      }));
      onUpdateDayExercises(updatedExercises);
    }

    onClose();
  };

  // Handle moving / shifting workout to another day/week
  const handleConfirmShiftDay = () => {
    if (onMoveDay) {
      onMoveDay(currentWeek, day.dayNumber, shiftTargetWeek, shiftTargetDayNum);
    }
    setIsMoveDayOpen(false);
  };

  // Rest progress percentage for Garmin timer deck
  const restProgressPct = Math.min(100, Math.round((lapSeconds / Math.max(1, targetRestSeconds)) * 100));

  // Current active set and exercise details for flat mobile view
  const currentExTotalSets = exercisesState[activeExerciseIdx]?.sets.length || currentActiveEx?.plannedSets || 3;
  const currentExUnit = currentActiveSet?.unit || currentActiveEx?.unit || 'kg';
  const currentSetWeight = currentActiveSet?.weightKg ?? currentActiveEx?.defaultWeightKg ?? 0;
  const currentSetReps = currentActiveSet?.reps ?? (parseInt(String(currentActiveEx?.targetRepsRange || '8').split('-')[0]) || 8);
  const currentSetRpe = currentActiveSet?.rpe ?? exercisesState[activeExerciseIdx]?.exerciseRpe ?? currentActiveEx?.targetRPE ?? 8;
  const currentSetRir = currentActiveSet?.rir ?? exercisesState[activeExerciseIdx]?.exerciseRir ?? currentActiveEx?.targetRIR ?? 2;
  const currentSetTempo = currentActiveEx?.tempo || 'Standard';

  // Next set calculation
  let nextSetInfo: {
    setNumber: number;
    totalSets: number;
    weightKg: number;
    reps: number | string;
    rpe: number;
    rir: number;
    tempo: string;
    unit: string;
    exerciseName: string;
    isNextExercise: boolean;
  } | null = null;

  if (activeSetIdx + 1 < currentExTotalSets) {
    const nextSet = exercisesState[activeExerciseIdx]?.sets[activeSetIdx + 1];
    nextSetInfo = {
      setNumber: activeSetIdx + 2,
      totalSets: currentExTotalSets,
      weightKg: nextSet?.weightKg ?? currentSetWeight,
      reps: nextSet?.reps ?? currentSetReps,
      rpe: nextSet?.rpe ?? currentSetRpe,
      rir: nextSet?.rir ?? currentSetRir,
      tempo: currentSetTempo,
      unit: nextSet?.unit || currentExUnit,
      exerciseName: currentActiveEx?.name || '',
      isNextExercise: false,
    };
  } else if (activeExerciseIdx + 1 < exercisesState.length) {
    const nextExState = exercisesState[activeExerciseIdx + 1];
    const nextSet = nextExState?.sets[0];
    nextSetInfo = {
      setNumber: 1,
      totalSets: nextExState?.sets.length || 3,
      weightKg: nextSet?.weightKg ?? nextExState?.exercise.defaultWeightKg ?? 0,
      reps: nextSet?.reps ?? nextExState?.exercise.targetRepsRange ?? 8,
      rpe: nextSet?.rpe ?? nextExState?.exerciseRpe ?? nextExState?.exercise.targetRPE ?? 8,
      rir: nextSet?.rir ?? nextExState?.exerciseRir ?? nextExState?.exercise.targetRIR ?? 2,
      tempo: nextExState?.exercise.tempo || 'Standard',
      unit: nextSet?.unit || nextExState?.exercise.unit || 'kg',
      exerciseName: nextExState?.exercise.name || '',
      isNextExercise: true,
    };
  }

  // Next exercise in queue
  const nextExerciseInQueue = exercisesState[activeExerciseIdx + 1]?.exercise || null;

  return (
    <>
      {/* 1. Global Sticky Mini-Player (When workout runs in background) */}
      {isMin && (
        <div
          onClick={() => handleMinimize(false)}
          className="fixed top-[92px] sm:top-[96px] left-0 right-0 z-40 px-3 max-w-xl mx-auto cursor-pointer animate-in slide-in-from-top-2 duration-200"
          title="Kliknij, aby otworzyć pełny ekran treningu"
          role="button"
          tabIndex={0}
        >
          <div className="bg-neutral-900/95 backdrop-blur-xl border-2 border-amber-400/90 hover:border-amber-400 rounded-2xl p-2.5 shadow-2xl shadow-amber-400/15 flex items-center justify-between gap-2.5 transition-all active:scale-[0.99]">
            {/* Left: Status Badge & Exercise info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm ${
                  garminPhase === 'WORK'
                    ? 'bg-amber-400 text-black animate-pulse'
                    : 'bg-emerald-500 text-black'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                <span>{garminPhase === 'WORK' ? 'Seria' : 'Przerwa'}</span>
              </div>

              <div className="min-w-0">
                <h4 className="text-xs font-black text-white truncate font-heading leading-tight">
                  {currentActiveEx?.name || 'Ćwiczenie'}
                </h4>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono-numbers">
                  {currentActiveSet?.weightKg ? `${currentActiveSet.weightKg} ${currentActiveSet.unit || 'kg'} × ` : ''}
                  {currentActiveEx?.targetRepsRange || '8'} powt • #{activeSetIdx + 1}/{currentActiveEx?.plannedSets || 3}
                </p>
              </div>
            </div>

            {/* Right: Digital Timer & Compact Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span
                  className={`text-base font-black font-mono-numbers tracking-tight block leading-none ${
                    garminPhase === 'WORK' ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {formatSessionTime(lapSeconds)}
                </span>
                <span className="text-[9px] text-neutral-500 uppercase font-bold block mt-0.5">
                  {garminPhase === 'WORK' ? 'Czas serii' : `z ${targetRestSeconds}s`}
                </span>
              </div>

              {/* Single Compact Action Button (Tick) - finishes set / rest with ONE tap */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGarminLap();
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black transition-all cursor-pointer shadow-md touch-manipulation active:scale-95 ${
                  garminPhase === 'WORK'
                    ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/25 ring-2 ring-amber-300'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25 ring-2 ring-emerald-300'
                }`}
                title={garminPhase === 'WORK' ? "Zakończ serię i zacznij przerwę" : "Rozpocznij kolejną serię"}
                aria-label="Zalicz serię / Zmień status timera"
              >
                <Check className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Full Active Workout Modal Container (Hidden when minimized, preserving all timers & state) */}
      <div
        className={
          isMin
            ? 'hidden'
            : 'fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overscroll-contain'
        }
      >
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[94dvh] sm:max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 text-left">
          {/* Top Sticky Header */}
          <div className="p-3.5 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 shrink-0 space-y-2.5">
            {/* Row 1: Title & Close 'X' Button in Top Right */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black font-heading">
                      Tydzień {currentWeek} • {day.dayNamePolish}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {day.type}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white font-heading mt-0.5 truncate">
                    {day.title}
                  </h2>
                </div>
              </div>

              {/* Close "X" Button in the Top Right Corner - hides to background without terminating session */}
              <button
                type="button"
                onClick={() => handleMinimize(true)}
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer shrink-0 touch-manipulation"
                title="Ukryj do tła (trening trwa dalej)"
                aria-label="Ukryj do tła"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Row 2: "Sesja: MM:SS", History, and "Dane & Czasy" in a single compact row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {/* Global Session Timer Badge */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-400 font-mono-numbers text-xs font-bold shrink-0"
                title="Całkowity czas od startu treningu"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Sesja: {formatSessionTime(sessionSeconds)}</span>
              </div>

              {/* View Previous Workout Button */}
              <button
                type="button"
                onClick={() => setIsPreviousModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition-colors cursor-pointer shrink-0"
                title="Podgląd poprzedniego treningu"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline sm:inline">Poprzedni</span>
              </button>

              {/* Workout Statistics Button ("Dane & Czasy") */}
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer shrink-0"
                title="Statystyki czasów serii, odpoczynku i tonażu"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Dane & Czasy</span>
              </button>
            </div>

            {/* Today Re-run notification if existing logs */}
            {existingTodayLogs.length > 0 && (
              <div className="p-2.5 px-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] leading-tight">
                    Trening wykonany dzisiaj ({existingTodayLogs.length} serii). Możesz edytować lub dopisać kolejne.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* GARMIN DUAL-TIMER DECK (STOPER SERII I PRZERWY W STYLU GARMINA)          */}
          {/* ========================================================================= */}
          <div className="p-3 sm:p-5 border-b border-neutral-800/80 bg-neutral-950/40 shrink-0">
            {/* Rest Alert Banner */}
            {isRestAlertActive && (
              <div className="mb-2.5 p-3 rounded-2xl bg-amber-400 text-black font-black flex items-center justify-between gap-3 shadow-xl animate-bounce">
                <div className="flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-black shrink-0 animate-spin" />
                  <span className="text-xs sm:text-sm">
                    CZAS NA SERIĘ! Przerwa ({targetRestSeconds}s) minęła. Kliknij LAP!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGarminLap}
                  className="px-4 py-1.5 rounded-xl bg-black text-amber-400 uppercase text-xs font-black shrink-0 cursor-pointer hover:bg-neutral-900"
                >
                  Start Serii
                </button>
              </div>
            )}

            {/* Deck Frame: White for WORK, Black for REST */}
            <div
              className={`rounded-2xl p-3.5 sm:p-5 transition-all duration-300 shadow-2xl relative overflow-hidden ${
                garminPhase === 'WORK'
                  ? 'bg-white text-zinc-950 border-4 border-neutral-300 ring-4 ring-white/20'
                  : 'bg-black text-amber-400 border-2 border-neutral-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Mode Indicator, Expandable Exercise Title, Metrics */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        garminPhase === 'WORK'
                          ? 'bg-black text-white'
                          : 'bg-amber-400 text-black'
                      }`}
                    >
                      {garminPhase === 'WORK' ? '🔥 SERIA W TOKU (LAP)' : '☕ PRZERWA / ODPOCZYNEK'}
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        garminPhase === 'WORK' ? 'text-zinc-700' : 'text-neutral-400'
                      }`}
                    >
                      Ćwiczenie #{activeExerciseIdx + 1} z {exercisesState.length}
                    </span>
                  </div>

                  {/* Expandable Exercise Title with Chevron or click */}
                  <div className="flex items-start gap-1.5 pt-0.5">
                    <h3
                      onClick={() => setIsExerciseNameExpanded(!isExerciseNameExpanded)}
                      className={`text-base sm:text-lg font-black font-heading cursor-pointer leading-snug select-none transition-all ${
                        isExerciseNameExpanded ? 'break-words' : 'truncate max-w-[280px] sm:max-w-lg'
                      } ${
                        garminPhase === 'WORK' ? 'text-zinc-950 hover:text-amber-600' : 'text-white hover:text-amber-400'
                      }`}
                      title="Kliknij, aby rozwinąć/zwinąć pełną nazwę ćwiczenia"
                    >
                      {currentActiveEx?.name || 'Ćwiczenie'}
                    </h3>

                    <button
                      type="button"
                      onClick={() => setIsExerciseNameExpanded(!isExerciseNameExpanded)}
                      className={`p-0.5 rounded transition-transform cursor-pointer shrink-0 mt-0.5 ${
                        garminPhase === 'WORK' ? 'text-zinc-700 hover:text-black' : 'text-neutral-400 hover:text-white'
                      }`}
                      title={isExerciseNameExpanded ? "Zwiń nazwę" : "Rozwiń pełną nazwę"}
                      aria-label="Rozwiń pełną nazwę ćwiczenia"
                    >
                      {isExerciseNameExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div
                    className={`text-xs font-medium ${
                      garminPhase === 'WORK' ? 'text-zinc-600' : 'text-neutral-400'
                    }`}
                  >
                    Seria #{activeSetIdx + 1} z {currentActiveEx?.plannedSets || 3} • Cel:{' '}
                    <strong className={garminPhase === 'WORK' ? 'text-zinc-950' : 'text-amber-300'}>
                      {currentActiveSet?.weightKg ? `${currentActiveSet.weightKg} ${currentActiveSet.unit || 'kg'} × ` : ''}
                      {currentActiveEx?.targetRepsRange || '8'} powt
                    </strong>
                    {currentActiveEx?.targetDistance && Number(currentActiveEx.targetDistance) > 0 ? (
                      <span> • Dystans: {currentActiveEx.targetDistance} {currentActiveEx.distanceUnit || 'm'}</span>
                    ) : null}
                    {currentActiveEx?.targetPace && currentActiveEx.targetPace.trim() !== '' && currentActiveEx.targetPace.trim() !== '0' ? (
                      <span> • Tempo: {currentActiveEx.targetPace}</span>
                    ) : null}
                    {currentActiveEx?.targetHR && Number(currentActiveEx.targetHR) > 0 ? (
                      <span> • HR: {currentActiveEx.targetHR} bpm</span>
                    ) : null}
                  </div>
                </div>

                {/* Center / Right: Big Digital Timer & Rest Bar */}
                <div className="flex flex-col items-start sm:items-end justify-center gap-1 shrink-0">
                  <div className="flex items-baseline gap-2 font-mono-numbers">
                    <span
                      className={`text-3xl sm:text-5xl font-black tracking-tight ${
                        garminPhase === 'WORK' ? 'text-black' : 'text-amber-400'
                      }`}
                    >
                      {formatSessionTime(lapSeconds)}
                    </span>
                    {garminPhase === 'REST' && (
                      <span className="text-xs text-neutral-400 font-sans">
                        / {formatSessionTime(targetRestSeconds)}
                      </span>
                    )}
                  </div>

                  {garminPhase === 'REST' ? (
                    <div className="w-full sm:w-48 space-y-1">
                      <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                        <div
                          className={`h-full transition-all duration-300 ${
                            lapSeconds >= targetRestSeconds ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${restProgressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>Odpoczynek</span>
                        <span>
                          {lapSeconds >= targetRestSeconds
                            ? 'Gotowy do serii!'
                            : `Zostało: ${Math.max(0, targetRestSeconds - lapSeconds)}s`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] text-zinc-500 font-sans">
                      Czas trwania aktywnej serii (Time-Under-Tension)
                    </span>
                  )}
                </div>
              </div>

              {/* Big Garmin LAP Button */}
              <div className="mt-3 pt-2.5 border-t border-neutral-200/40 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleGarminLap}
                  className={`w-full min-h-[48px] sm:min-h-[52px] rounded-xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer active:scale-[0.98] ${
                    garminPhase === 'WORK'
                      ? 'bg-black text-white hover:bg-neutral-800 shadow-black/30'
                      : 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/20'
                  }`}
                >
                  <RotateCcw className="w-5 h-5 shrink-0" />
                  <span>
                    {garminPhase === 'WORK'
                      ? 'Zakończ Serię (LAP) & Start Przerwy'
                      : 'Rozpocznij Serię (Wcześniej / LAP)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

        {/* Flat View for Current and Next Set + Next Exercise in Queue */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3.5 text-xs overscroll-contain">
          {/* Exercise Stepper / Navigation Strip */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <button
              type="button"
              disabled={activeExerciseIdx === 0}
              onClick={() => {
                setActiveExerciseIdx((prev) => Math.max(0, prev - 1));
                setActiveSetIdx(0);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              ← Poprzednie ćw.
            </button>

            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 font-heading">
              Ćw. {activeExerciseIdx + 1} z {exercisesState.length}
            </span>

            <button
              type="button"
              disabled={activeExerciseIdx >= exercisesState.length - 1}
              onClick={() => {
                setActiveExerciseIdx((prev) => Math.min(exercisesState.length - 1, prev + 1));
                setActiveSetIdx(0);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Następne ćw. →
            </button>
          </div>

          {/* 1. OBECNA SERIA (Current Active Set Card) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-950 border border-amber-400/50 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-black font-black uppercase text-[10px] tracking-wider">
                  Obecna Seria #{activeSetIdx + 1} z {currentExTotalSets}
                </span>
                <span className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                  {currentActiveEx?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSetComplete(activeExerciseIdx, activeSetIdx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  currentActiveSet?.completed
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{currentActiveSet?.completed ? 'Zaliczona' : 'Zalicz'}</span>
              </button>
            </div>

            {/* 4 Parametry Obecnej Serii: Ciężar, RPE, RIR, Tempo */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {/* Ciężar */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-1">
                  Ciężar ({currentExUnit})
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  step="any"
                  min="0"
                  value={currentSetWeight}
                  onChange={(e) =>
                    updateSet(activeExerciseIdx, activeSetIdx, 'weightKg', parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-400 rounded-lg py-1 text-center font-black text-amber-400 text-sm font-mono-numbers focus:outline-none"
                />
              </div>

              {/* RPE */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-1">
                  RPE
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  step="0.5"
                  min="1"
                  max="10"
                  value={currentSetRpe}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 8;
                    updateSet(activeExerciseIdx, activeSetIdx, 'rpe', val);
                    updateExerciseRpe(activeExerciseIdx, val);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-400 rounded-lg py-1 text-center font-black text-white text-sm font-mono-numbers focus:outline-none"
                />
              </div>

              {/* RIR */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-1">
                  RIR
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="10"
                  value={currentSetRir}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    updateSet(activeExerciseIdx, activeSetIdx, 'rir', val);
                    updateExerciseRir(activeExerciseIdx, val);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-400 rounded-lg py-1 text-center font-black text-amber-300 text-sm font-mono-numbers focus:outline-none"
                />
              </div>

              {/* Tempo */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block mb-1">
                  Tempo
                </span>
                <div className="py-1 px-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-black text-neutral-200 truncate font-mono-numbers">
                  {currentSetTempo}
                </div>
              </div>
            </div>
          </div>

          {/* 2. NASTĘPNA SERIA (Next Set Card) */}
          {nextSetInfo ? (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/90 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-900">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-neutral-900 text-neutral-400 border border-neutral-800">
                    Następna Seria #{nextSetInfo.setNumber} {nextSetInfo.isNextExercise ? `• ${nextSetInfo.exerciseName}` : ''}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono-numbers">
                  Cel: <strong className="text-white">{nextSetInfo.reps} powt</strong>
                </span>
              </div>

              {/* 4 Parametry Następnej Serii: Ciężar, RPE, RIR, Tempo */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-2">
                  <span className="text-[9px] text-neutral-500 uppercase block font-semibold mb-0.5">Ciężar</span>
                  <span className="font-extrabold text-white font-mono-numbers text-sm">
                    {nextSetInfo.weightKg > 0 ? `${nextSetInfo.weightKg} ${nextSetInfo.unit}` : 'Ciało'}
                  </span>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-2">
                  <span className="text-[9px] text-neutral-500 uppercase block font-semibold mb-0.5">RPE</span>
                  <span className="font-extrabold text-white font-mono-numbers text-sm">
                    {nextSetInfo.rpe}
                  </span>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-2">
                  <span className="text-[9px] text-neutral-500 uppercase block font-semibold mb-0.5">RIR</span>
                  <span className="font-extrabold text-amber-300 font-mono-numbers text-sm">
                    {nextSetInfo.rir}
                  </span>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-2">
                  <span className="text-[9px] text-neutral-500 uppercase block font-semibold mb-0.5">Tempo</span>
                  <span className="font-bold text-neutral-300 text-xs truncate block font-mono-numbers">
                    {nextSetInfo.tempo}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold">
              🔥 To ostatnia zaplanowana seria tego treningu! Daj z siebie wszystko!
            </div>
          )}

          {/* 3. POD SPODEM: Mały tekst z nazwą następnego ćwiczenia */}
          <div className="pt-2 px-1 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-900">
            <div className="flex items-center gap-1.5 truncate">
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-neutral-500 uppercase text-[10px] font-bold tracking-wider shrink-0">
                Następne ćwiczenie:
              </span>
              <span className="text-neutral-200 font-semibold truncate">
                {nextExerciseInQueue ? nextExerciseInQueue.name : 'Brak (to ostatnie ćwiczenie w sesji)'}
              </span>
            </div>
            {nextExerciseInQueue && (
              <span className="text-[10px] text-amber-400 font-mono-numbers shrink-0 font-bold ml-2">
                {nextExerciseInQueue.plannedSets} serie
              </span>
            )}
          </div>
        </div>

        {/* Bottom Bar: Action finish */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/90 rounded-b-3xl shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            Zaliczono <strong>{totalCompletedSets}</strong> z <strong>{totalPlannedSets}</strong> serii •
            Tonaż: <strong className="text-amber-400 font-mono-numbers">{totalSessionTonnage.toLocaleString()} kg</strong> •
            Praca/Odpoczynek: <strong className="text-white font-mono-numbers">{formatSessionTime(totalWorkDurationSec)}</strong> / <strong className="text-amber-400 font-mono-numbers">{formatSessionTime(totalRestDurationSec)}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsStatsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Statystyki Treningu
            </button>

            <button
              onClick={handleFinishAndSave}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Zakończ i Zapisz Trening</span>
            </button>
          </div>
        </div>
      </div>

      {/* Individual Exercise Chart Modal */}
      {selectedChartExerciseName && (
        <ExerciseChartModal
          exerciseName={selectedChartExerciseName}
          workoutLogs={workoutLogs}
          isOpen={!!selectedChartExerciseName}
          onClose={() => setSelectedChartExerciseName(null)}
        />
      )}

      {/* Overall Workout Summary Stats Modal with Garmin Timing */}
      {isStatsModalOpen && (
        <WorkoutSummaryStatsModal
          day={day}
          currentWeek={currentWeek}
          exercisesState={exercisesState.map((ex) => ({
            exerciseName: ex.exercise.name,
            muscleGroup: ex.exercise.muscleGroup,
            sets: ex.sets,
            exerciseRpe: ex.exerciseRpe,
            exerciseRir: ex.exerciseRir,
            exerciseNotes: ex.exerciseNotes,
          }))}
          sessionSeconds={sessionSeconds}
          sessionNotes={sessionNotes}
          previousSessionTonnage={previousSessionTonnage}
          totalWorkDurationSec={totalWorkDurationSec}
          totalRestDurationSec={totalRestDurationSec}
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      {/* Previous Workout Details Modal */}
      {isPreviousModalOpen && (
        <PreviousWorkoutModal
          workoutTitle={day.title}
          previousLogs={latestPreviousSessionLogs}
          isOpen={isPreviousModalOpen}
          onClose={() => setIsPreviousModalOpen(false)}
        />
      )}
      </div>
    </>
  );
};
