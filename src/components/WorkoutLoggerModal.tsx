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
}) => {
  const currentPhase = weeksList.find((w) => w.week === currentWeek) || MESOCYCLE_WEEKS[0];

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overscroll-contain">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[94dvh] sm:max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 text-left">
        {/* Top Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/90 shrink-0 space-y-3">
          {/* Main Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black font-heading">
                    Tydzień {currentWeek} • {day.dayNamePolish}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {day.type}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white font-heading mt-0.5">
                  {day.title}
                </h2>
              </div>
            </div>

            {/* Quick Actions: Timer + Previous Workout + Workout Stats + Close */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Global Session Timer Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-400 font-mono-numbers text-xs font-bold" title="Całkowity czas od startu treningu">
                <Clock className="w-3.5 h-3.5" />
                <span>Sesja: {formatSessionTime(sessionSeconds)}</span>
              </div>

              {/* View Previous Workout Button */}
              <button
                onClick={() => setIsPreviousModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
                title="Podgląd poprzedniego treningu"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Poprzedni</span>
              </button>

              {/* Workout Statistics Button */}
              <button
                onClick={() => setIsStatsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-400/30 transition-colors cursor-pointer"
                title="Statystyki czasów serii, odpoczynku i tonażu"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Dane & Czasy</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Bar: Next Workout Preview & Fast Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-neutral-900 text-xs">
            {nextUncompletedDay ? (
              <div className="flex items-center gap-2 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-300">
                <span className="text-[10px] uppercase font-bold text-neutral-400">
                  Następny w kolejce:
                </span>
                <span className="font-bold text-white truncate max-w-[220px]">
                  {nextUncompletedDay.dayNamePolish} - {nextUncompletedDay.title}
                </span>
                {onSwitchDay && (
                  <button
                    onClick={() => onSwitchDay(currentWeek, nextUncompletedDay!)}
                    className="ml-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer underline"
                  >
                    Przejdź <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <span className="text-neutral-500 text-[11px]">Dni z tego tygodnia zrealizowane!</span>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-neutral-400 uppercase font-bold shrink-0">
                Dni:
              </span>
              {weekDays.map((d) => {
                const isCurrent = d.id === day.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => onSwitchDay && onSwitchDay(currentWeek, d)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-400 text-black font-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    D{d.dayNumber}
                  </button>
                );
              })}

              <button
                onClick={() => setIsMoveDayOpen(!isMoveDayOpen)}
                className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer ml-1"
                title="Przesuń ten trening na inny termin"
              >
                <MoveRight className="w-3 h-3 text-amber-400" />
                <span>Przesuń</span>
              </button>
            </div>
          </div>

          {/* Today Re-run notification */}
          {existingTodayLogs.length > 0 && (
            <div className="p-2.5 px-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Wykonałeś już ten trening dzisiaj ({existingTodayLogs.length} zapisanych serii). Wyświetlono Twoje serie z możliwością edycji lub dopisania kolejnych — ponowne zapisanie zaktualizuje dzisiejszy trening bez duplikatów.
                </span>
              </div>
            </div>
          )}

          {/* Move Day Inline Dialog */}
          {isMoveDayOpen && (
            <div className="p-3 rounded-2xl bg-neutral-900 border border-amber-400/50 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">
                  Przesuń ten trening ({day.dayNamePolish}) na inny termin:
                </span>
                <button onClick={() => setIsMoveDayOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Docelowy Tydzień:</label>
                  <select
                    value={shiftTargetWeek}
                    onChange={(e) => setShiftTargetWeek(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white font-bold cursor-pointer"
                  >
                    {weeksList.map((w) => (
                      <option key={w.week} value={w.week}>
                        Tydzień {w.week}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Docelowy Dzień:</label>
                  <select
                    value={shiftTargetDayNum}
                    onChange={(e) => setShiftTargetDayNum(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white font-bold cursor-pointer"
                  >
                    <option value={1}>Dzień 1 (Poniedziałek)</option>
                    <option value={2}>Dzień 2 (Wtorek)</option>
                    <option value={3}>Dzień 3 (Środa)</option>
                    <option value={4}>Dzień 4 (Czwartek)</option>
                    <option value={5}>Dzień 5 (Piątek)</option>
                    <option value={6}>Dzień 6 (Sobota)</option>
                    <option value={7}>Dzień 7 (Niedziela)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsMoveDayOpen(false)}
                  className="px-3 py-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleConfirmShiftDay}
                  className="px-4 py-1 rounded-lg bg-amber-400 text-black font-black uppercase text-[11px]"
                >
                  Przenieś Trening
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* GARMIN DUAL-TIMER DECK (STOPER SERII I PRZERWY W STYLU GARMINA)          */}
          {/* ========================================================================= */}
          <div className="pt-1">
            {/* Rest Alert Banner */}
            {isRestAlertActive && (
              <div className="mb-2 p-3 rounded-2xl bg-amber-400 text-black font-black flex items-center justify-between gap-3 shadow-xl animate-bounce">
                <div className="flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-black shrink-0 animate-spin" />
                  <span className="text-xs sm:text-sm">
                    CZAS NA SERIĘ! Zaplanowana przerwa ({targetRestSeconds}s) minęła. Kliknij LAP i zacznij ćwiczyć!
                  </span>
                </div>
                <button
                  onClick={handleGarminLap}
                  className="px-4 py-1.5 rounded-xl bg-black text-amber-400 uppercase text-xs font-black shrink-0 cursor-pointer hover:bg-neutral-900"
                >
                  Start Serii
                </button>
              </div>
            )}

            {/* Deck Frame: White for WORK, Black for REST */}
            <div
              className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-2xl relative overflow-hidden ${
                garminPhase === 'WORK'
                  ? 'bg-white text-zinc-950 border-4 border-neutral-300 ring-4 ring-white/20'
                  : 'bg-black text-amber-400 border-2 border-neutral-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Mode Indicator, Active Exercise, Digital Clock */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
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

                  <h3
                    className={`text-base sm:text-lg font-black font-heading truncate max-w-[340px] sm:max-w-lg ${
                      garminPhase === 'WORK' ? 'text-zinc-950' : 'text-white'
                    }`}
                  >
                    {currentActiveEx?.name || 'Ćwiczenie'}
                  </h3>

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
                <div className="flex flex-col items-start sm:items-end justify-center gap-1.5">
                  <div className="flex items-baseline gap-2 font-mono-numbers">
                    <span
                      className={`text-4xl sm:text-5xl font-black tracking-tight ${
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
                    <span className="text-[11px] text-zinc-500 font-sans">
                      Czas trwania aktywnej serii (Time-Under-Tension)
                    </span>
                  )}
                </div>
              </div>

              {/* Big Garmin LAP Button */}
              <div className="mt-4 pt-3 border-t border-neutral-200/40 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleGarminLap}
                  className={`w-full min-h-[52px] sm:min-h-[56px] rounded-xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer active:scale-[0.98] ${
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
        </div>

        {/* Scrollable Exercise Logging List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs overscroll-contain touch-pan-y">
          {exercisesState.map((exItem, exIdx) => {
            const isCurrentEx = exIdx === activeExerciseIdx;
            const exUnit = exItem.exercise.unit || 'kg';
            const isEndurance =
              exItem.exercise.exerciseType === 'RUNNING' ||
              exItem.exercise.exerciseType === 'HYROX_STATION' ||
              exItem.exercise.exerciseType === 'INTERVAL_CARDIO';

            // Find past logs for this exercise to show previous performance
            const pastLogsForEx = workoutLogs
              .filter(
                (l) =>
                  l.exerciseName.trim().toLowerCase() === exItem.exercise.name.trim().toLowerCase()
              )
              .sort((a, b) => compareLogsDescending(a, b));

            const lastDate = pastLogsForEx[0] ? extractLogDate(pastLogsForEx[0]) : '';
            const rawLastSessionSets = lastDate
              ? pastLogsForEx.filter((l) => extractLogDate(l) === lastDate)
              : [];
            const lastSessionMap = new Map<number, WorkoutLogEntry>();
            rawLastSessionSets.forEach((s) => lastSessionMap.set(s.setNumber || 1, s));
            const lastSessionSets = Array.from(lastSessionMap.values()).sort((a, b) => a.setNumber - b.setNumber);

            return (
              <div
                key={exItem.exercise.id}
                className={`p-4 sm:p-5 rounded-2xl bg-neutral-950 border transition-all shadow-md space-y-4 ${
                  isCurrentEx
                    ? 'border-amber-400/60 ring-1 ring-amber-400/20'
                    : 'border-neutral-800'
                }`}
              >
                {/* Exercise Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
                        #{exIdx + 1}
                      </span>
                      <h3 className="text-base font-bold text-white font-heading">
                        {exItem.exercise.name}
                      </h3>

                      {exItem.exercise.exerciseType && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {exItem.exercise.exerciseType === 'RUNNING'
                            ? 'Bieg'
                            : exItem.exercise.exerciseType === 'HYROX_STATION'
                            ? 'Stacja Hyrox'
                            : exItem.exercise.exerciseType === 'INTERVAL_CARDIO'
                            ? 'Kardio'
                            : 'Siła'}
                        </span>
                      )}

                      <span className="text-xs text-neutral-400">
                        ({exItem.exercise.muscleGroup.split('(')[0].trim()})
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-numbers font-bold bg-neutral-900 text-neutral-300">
                        {exUnit}
                      </span>
                    </div>

                    {/* Previous performance & pacing */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {lastSessionSets.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                          <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Poprzednio ({lastDate}):{' '}
                            <strong className="text-white font-mono-numbers">
                              {lastSessionSets.map((s) => `${s.weightKg}${s.unit || 'kg'}×${s.reps}`).join(' | ')}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 italic">
                          Pierwsza rejestracja tego ćwiczenia
                        </span>
                      )}

                      {exItem.exercise.targetPace &&
                      exItem.exercise.targetPace.trim() !== '' &&
                      exItem.exercise.targetPace.trim() !== '0' && (
                        <span className="text-[11px] text-emerald-400 bg-neutral-900 px-2 py-0.5 rounded">
                          Tempo cel: <strong className="text-white">{exItem.exercise.targetPace}</strong>
                        </span>
                      )}

                      {exItem.exercise.targetHR && Number(exItem.exercise.targetHR) > 0 && (
                        <span className="text-[11px] text-rose-400 bg-neutral-900 px-2 py-0.5 rounded">
                          Tętno HR: <strong className="text-white">{exItem.exercise.targetHR} bpm</strong>
                        </span>
                      )}

                      {exItem.exercise.tempo && (
                        <span className="text-[11px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">
                          Tempo ruchu: <strong className="text-neutral-200">{exItem.exercise.tempo}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for this exercise: View Chart + Remove */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedChartExerciseName(exItem.exercise.name)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 hover:border-amber-400/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Zobacz wykres progresu i historię"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Wykres</span>
                    </button>

                    <button
                      onClick={() => removeExerciseFromSession(exIdx)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Usuń ćwiczenie z tej sesji"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead>
                      <tr className="text-neutral-400 font-semibold text-[11px] border-b border-neutral-900 pb-2">
                        <th className="w-12 pb-2">Seria</th>
                        <th className="w-36 pb-2">Ciężar ({exUnit})</th>
                        <th className="w-36 pb-2">Powtórzenia / Dystans</th>
                        <th className="w-24 pb-2 text-right">Tonaż</th>
                        <th className="w-32 pb-2 text-center">Czas Serii & Przerwa</th>
                        <th className="w-20 pb-2 text-center">Zalicz</th>
                        <th className="w-10 pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 font-mono-numbers">
                      {exItem.sets.map((set, setIdx) => {
                        const isActiveSet = isCurrentEx && setIdx === activeSetIdx;

                        return (
                          <tr
                            key={set.setNumber}
                            onClick={() => handleSelectActiveSet(exIdx, setIdx)}
                            className={`transition-colors cursor-pointer ${
                              isActiveSet
                                ? 'bg-amber-400/10 font-bold'
                                : set.completed
                                ? 'bg-emerald-500/5'
                                : 'hover:bg-neutral-900/40'
                            }`}
                          >
                            <td className="py-2.5 text-neutral-400 font-bold">
                              <span className="flex items-center gap-1">
                                {isActiveSet && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                #{set.setNumber}
                              </span>
                            </td>

                            {/* Weight control with quick +/- buttons */}
                            <td className="py-2.5 pr-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => adjustWeight(exIdx, setIdx, -2.5)}
                                  className="w-6 h-6 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="2.5"
                                  value={set.weightKg}
                                  onChange={(e) => updateSet(exIdx, setIdx, 'weightKg', parseFloat(e.target.value) || 0)}
                                  className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-center font-bold text-white text-xs"
                                />
                                <button
                                  onClick={() => adjustWeight(exIdx, setIdx, 2.5)}
                                  className="w-6 h-6 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Reps / Distance control */}
                            <td className="py-2.5 pr-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => adjustReps(exIdx, setIdx, -1)}
                                  className="w-6 h-6 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={set.reps}
                                  onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value, 10) || 0)}
                                  className="w-14 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-center font-bold text-white text-xs"
                                />
                                <button
                                  onClick={() => adjustReps(exIdx, setIdx, 1)}
                                  className="w-6 h-6 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Tonnage */}
                            <td className="py-2.5 text-right font-bold text-amber-400 pr-3">
                              {set.tonnage.toLocaleString()} kg
                            </td>

                            {/* Garmin Recorded Timing for this set */}
                            <td className="py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                {set.setDurationSec ? (
                                  <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold" title="Czas trwania serii (Time-Under-Tension)">
                                    ⏱️ {set.setDurationSec}s
                                  </span>
                                ) : (
                                  <span className="text-neutral-600">-</span>
                                )}

                                {set.restDurationSec ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30" title="Czas odpoczynku po serii">
                                    ☕ {set.restDurationSec}s
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Completion Toggle */}
                            <td className="py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleSetComplete(exIdx, setIdx)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer mx-auto ${
                                  set.completed
                                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-105'
                                    : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-700'
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            </td>

                            {/* Delete Set */}
                            <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              {exItem.sets.length > 1 && (
                                <button
                                  onClick={() => removeSetFromExercise(exIdx, setIdx)}
                                  className="text-neutral-600 hover:text-red-400 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Set button + RPE/RIR for this exercise */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-900">
                  <button
                    onClick={() => addSetToExercise(exIdx)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5 self-start cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>+ Dodaj Serię</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">RPE:</span>
                      <select
                        value={exItem.exerciseRpe}
                        onChange={(e) => updateExerciseRpe(exIdx, parseFloat(e.target.value))}
                        className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white font-bold cursor-pointer"
                      >
                        {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">RIR:</span>
                      <select
                        value={exItem.exerciseRir}
                        onChange={(e) => updateExerciseRir(exIdx, parseInt(e.target.value, 10))}
                        className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-white font-bold cursor-pointer"
                      >
                        {[0, 1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Notatka do tego ćwiczenia..."
                      value={exItem.exerciseNotes}
                      onChange={(e) => updateExerciseNotes(exIdx, e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 min-w-[180px]"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Exercise Live to this session */}
          <div className="pt-2">
            {!isAddingExerciseLive ? (
              <button
                onClick={() => setIsAddingExerciseLive(true)}
                className="w-full py-3 rounded-2xl bg-neutral-950 border border-dashed border-neutral-800 hover:border-amber-400/50 text-neutral-400 hover:text-white transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ Dodaj kolejne ćwiczenie / stację hybrydową w trakcie treningu</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-400 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="font-bold text-amber-400 uppercase text-xs">
                    Dodaj Ćwiczenie lub Stację do Trwającej Sesji
                  </span>
                  <button onClick={() => setIsAddingExerciseLive(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form for custom live exercise with units */}
                <form onSubmit={handleAddLiveCustom} className="space-y-3 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Typ:</label>
                      <select
                        value={liveExerciseType}
                        onChange={(e) => setLiveExerciseType(e.target.value as ExerciseType)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-bold"
                      >
                        <option value="STRENGTH">🏋️ Siłowe</option>
                        <option value="RUNNING">🏃 Biegowe</option>
                        <option value="HYROX_STATION">⚡ Stacja Hyrox</option>
                        <option value="INTERVAL_CARDIO">🔥 Kardio</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Jednostka:</label>
                      <select
                        value={liveUnit}
                        onChange={(e) => setLiveUnit(e.target.value as ExerciseUnit)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-bold"
                      >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                        <option value="km">km</option>
                        <option value="m">m</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Nazwa ćwiczenia:</label>
                      <input
                        type="text"
                        placeholder="np. 1km Bieg tempowy / Podciąganie"
                        value={customExerciseName}
                        onChange={(e) => setCustomExerciseName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Serie:</label>
                      <input
                        type="number"
                        value={customSets}
                        onChange={(e) => setCustomSets(parseInt(e.target.value) || 1)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Powt / Dystans:</label>
                      <input
                        type="text"
                        value={customReps}
                        onChange={(e) => setCustomReps(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-0.5">Ciężar ({liveUnit}):</label>
                      <input
                        type="number"
                        value={customWeight}
                        onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 0)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-400 text-black font-black uppercase text-xs cursor-pointer hover:bg-amber-300"
                    >
                      + Wstaw do Sesji
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Szybki wybór z katalogu:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {EXERCISE_CATALOG.slice(0, 12).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddLiveFromCatalog(item)}
                        className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-400 text-left text-xs text-white truncate cursor-pointer"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overall Session Notes */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Notatka Ogólna do Całego Treningu:</span>
            </span>
            <textarea
              rows={2}
              placeholder="np. Dobra regeneracja, czasy przerw dotrzymane, wysoka moc na saniach..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/50"
            />
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
  );
};
