import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Dumbbell,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Info,
  Calendar,
  Filter,
  Clock,
  ChevronDown,
  Flame,
  Coffee,
  Activity,
  Eye
} from 'lucide-react';
import {
  MuscleGroup,
  WorkoutLogEntry,
  WorkoutDay,
  normalizeMuscleGroup,
  MesocyclePhase,
  TrainingCycleCatalog,
  Exercise
} from '../../types/hyrox';
import {
  MUSCLE_GROUP_VOLUME_TARGETS,
  MASTER_HYROX_WEEK_PLAN,
  MESOCYCLE_WEEKS
} from '../../data/hyroxPlanData';
import { MASA_WEEK_PLAN, REDUKCJA_WEEK_PLAN } from '../../data/defaultCycles';
import {
  ExerciseDetailsModal,
  ExerciseDetailsModalData,
  DetailedSetComparison
} from '../modals/ExerciseDetailsModal';

interface VolumeMatrixViewProps {
  currentWeek: number;
  workoutLogs: WorkoutLogEntry[];
  onOpenSheetsModal: () => void;
  weekPlan?: WorkoutDay[];
  weeksList?: MesocyclePhase[];
  activeCycle?: TrainingCycleCatalog;
  onWeekChange?: (week: number) => void;
}

export interface MuscleGroupExerciseItem {
  id: string;
  name: string;
  dayId: string;
  dayTitle: string;
  dayNamePolish?: string;
  summaryText: string;
  isCompleted: boolean;
  completedSetsCount: number;
  totalPlannedSets: number;
  category?: 'strength' | 'cardio';
  muscleGroup?: string;
  exerciseRef?: Exercise;
  dayRef?: WorkoutDay;
  matchingLogs: WorkoutLogEntry[];
}

// Special volume target for Cardio / Endurance
export const CARDIO_VOLUME_TARGET = {
  muscleGroup: 'Cardio / Wytrzymałość' as any,
  weeklySets: 4,
  minRecommendedSets: 2,
  maxRecommendedSets: 8,
  notes: '',
};

// Helper to determine if an exercise is cardio/running
export const isCardioExercise = (
  item?: { category?: string; exerciseType?: string; muscleGroup?: string; name?: string } | null
): boolean => {
  if (!item) return false;
  if (item.category === 'cardio') return true;
  if (item.exerciseType === 'RUNNING' || item.exerciseType === 'INTERVAL_CARDIO') return true;
  const mg = (item.muscleGroup || '').toLowerCase();
  if (mg.includes('cardio') || mg.includes('bieg') || mg.includes('running') || mg.includes('wytrzymałość')) return true;
  const name = (item.name || '').toLowerCase();
  if (
    name.includes('bieganie') ||
    name.includes('easy run') ||
    name.includes('long run') ||
    name.includes('tempo run') ||
    name.includes('intervals') ||
    name.includes('fartlek') ||
    name.includes('hill repeats') ||
    name.includes('recovery run') ||
    name.includes('treadmill') ||
    name.includes('bieżn')
  ) {
    return true;
  }
  return false;
};

// Helper to determine if a log is cardio/running
export const isCardioLog = (log?: WorkoutLogEntry | null): boolean => {
  if (!log) return false;
  if (log.activityType === 'RUNNING') return true;
  const mg = (log.muscleGroup || '').toLowerCase();
  if (mg.includes('cardio') || mg.includes('bieg') || mg.includes('running') || mg.includes('wytrzymałość')) return true;
  const name = (log.exerciseName || '').toLowerCase();
  if (
    name.includes('bieganie') ||
    name.includes('easy run') ||
    name.includes('long run') ||
    name.includes('tempo run') ||
    name.includes('intervals') ||
    name.includes('fartlek') ||
    name.includes('hill repeats') ||
    name.includes('recovery run') ||
    name.includes('treadmill') ||
    name.includes('bieżn')
  ) {
    return true;
  }
  return false;
};

// Helper to safely resolve muscle group for strength exercises without defaulting cardio or empty to 'Klatka piersiowa'
export const resolveStrengthMuscleGroup = (raw?: string | null): MuscleGroup | null => {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean.includes('cardio') || clean.includes('bieg') || clean.includes('running') || clean.includes('wytrzymałość')) {
    return null;
  }
  if (clean.includes('klatk') || clean.includes('chest')) return 'Klatka piersiowa';
  if (clean.includes('plec') || clean.includes('grzbiet') || clean.includes('back') || clean.includes('lats')) return 'Plecy';
  if (clean.includes('bark') || clean.includes('ramion') || clean.includes('shoulder') || clean.includes('delts')) return 'Barki';
  if (clean.includes('biceps')) return 'Biceps';
  if (clean.includes('triceps')) return 'Triceps';
  if (clean.includes('czworo') || clean.includes('quad')) return 'Czworogłowe uda';
  if (clean.includes('dwugłow') || clean.includes('kulsz') || clean.includes('hamstring') || clean.includes('glute') || clean.includes('poślad')) return 'Dwugłowe uda';
  if (clean.includes('łydk') || clean.includes('calf') || clean.includes('calves')) return 'Łydki';
  if (clean.includes('brzuch') || clean.includes('core') || clean.includes('abs')) return 'Brzuch';
  return null;
};

// Helper to format seconds into a human-readable duration
const formatDuration = (totalSec: number): string => {
  if (!totalSec || totalSec <= 0) return '0 min';
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.round(totalSec % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
  }
  return `${seconds}s`;
};

// Helper to derive days for any week of a training cycle
const resolveCycleDaysForWeek = (
  cycle?: TrainingCycleCatalog,
  weekNum: number = 1,
  currentDays: WorkoutDay[] = []
): WorkoutDay[] => {
  if (cycle?.weeksPlansMap && cycle.weeksPlansMap[weekNum] !== undefined) {
    const rawDays = Array.isArray(cycle.weeksPlansMap[weekNum]) ? cycle.weeksPlansMap[weekNum] : [];
    if (rawDays.length > 0) {
      return rawDays.map((d, idx) => {
        const expectedPrefix = `w${weekNum}-`;
        const fixedId = d.id && d.id.startsWith(expectedPrefix) ? d.id : `w${weekNum}-${d.dayNumber || idx + 1}-${d.id || 'day'}`;
        return {
          ...d,
          id: fixedId,
        };
      });
    }
  }

  if (cycle && weekNum === cycle.currentWeek && currentDays.length > 0) {
    return currentDays;
  }

  // Derive from base days if available
  const baseDays =
    cycle?.weeksPlansMap?.[1] ||
    (cycle?.id?.includes('hyrox') || cycle?.goal === 'HYROX'
      ? MASTER_HYROX_WEEK_PLAN
      : cycle?.id?.includes('masa') || cycle?.goal === 'MASA'
      ? MASA_WEEK_PLAN
      : cycle?.id?.includes('redukcja') || cycle?.goal === 'REDUKCJA'
      ? REDUKCJA_WEEK_PLAN
      : null);

  if (baseDays && Array.isArray(baseDays) && baseDays.length > 0) {
    const phase = cycle?.weeksList?.find((w) => w && w.week === weekNum);
    const mult = typeof phase?.volumeMultiplier === 'number' ? phase.volumeMultiplier : 1.0;
    const isDeload = phase?.isDeload || false;

    return baseDays.filter(Boolean).map((d) => ({
      ...d,
      id: `w${weekNum}-${d.dayNumber}-${d.id}`,
      exercises: (d.exercises || []).filter(Boolean).map((ex) => ({
        ...ex,
        id: `ex-w${weekNum}-${(ex.name || 'cwiczenie').replace(/\s+/g, '-').toLowerCase()}`,
        defaultWeightKg: isDeload
          ? Math.round((ex.defaultWeightKg || 0) * 0.7)
          : (mult === 1.0 ? (ex.defaultWeightKg || 0) : Number(((ex.defaultWeightKg || 0) * (mult >= 0.5 ? mult : 1.0)).toFixed(1))),
      })),
      sessionNotes: phase?.progressionNote || d.sessionNotes,
    }));
  }

  return currentDays.length > 0 ? currentDays : MASTER_HYROX_WEEK_PLAN;
};

export const VolumeMatrixView: React.FC<VolumeMatrixViewProps> = ({
  currentWeek,
  workoutLogs,
  onOpenSheetsModal,
  weekPlan = MASTER_HYROX_WEEK_PLAN,
  weeksList = MESOCYCLE_WEEKS,
  activeCycle,
  onWeekChange,
}) => {
  // 1. Scope filter states
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [selectedDayId, setSelectedDayId] = useState<string>('ALL');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('ALL');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 4. Modal state for exercise details
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<ExerciseDetailsModalData | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  // Sync selectedWeek when prop currentWeek changes
  useEffect(() => {
    setSelectedWeek(currentWeek);
  }, [currentWeek]);

  // Available weeks from cycle or fallback
  const availableWeeks = useMemo(() => {
    if (activeCycle?.weeksList && activeCycle.weeksList.length > 0) {
      return activeCycle.weeksList;
    }
    if (weeksList && weeksList.length > 0) {
      return weeksList;
    }
    return MESOCYCLE_WEEKS;
  }, [activeCycle, weeksList]);

  // Current phase info for selected week
  const currentPhase = useMemo(() => {
    return availableWeeks.find((w) => w.week === selectedWeek) || availableWeeks[0] || MESOCYCLE_WEEKS[0];
  }, [availableWeeks, selectedWeek]);

  // Resolve training days for the selected week
  const resolvedDaysForSelectedWeek = useMemo(() => {
    return resolveCycleDaysForWeek(activeCycle, selectedWeek, weekPlan);
  }, [activeCycle, selectedWeek, weekPlan]);

  // Handle week selection change
  const handleSelectWeek = (weekNum: number) => {
    setSelectedWeek(weekNum);
    setSelectedDayId('ALL'); // Reset day filter to 'ALL' on week change
    if (onWeekChange) {
      onWeekChange(weekNum);
    }
  };

  // Active days in current filter scope
  const activeDays = useMemo(() => {
    if (selectedDayId === 'ALL') {
      return resolvedDaysForSelectedWeek;
    }
    const found = resolvedDaysForSelectedWeek.find((d) => d.id === selectedDayId);
    return found ? [found] : resolvedDaysForSelectedWeek;
  }, [resolvedDaysForSelectedWeek, selectedDayId]);

  // Active workout logs matching the selected scope
  // Crucial fix for Issue #2: Only match logs that specifically belong to this week and day!
  const activeLogs = useMemo(() => {
    const dayIdsSet = new Set(resolvedDaysForSelectedWeek.map((d) => d.id));
    const dayTitlesSet = new Set(resolvedDaysForSelectedWeek.map((d) => (d.title || '').toLowerCase().trim()));
    const weekPrefix = `w${selectedWeek}-`;

    return workoutLogs.filter((log) => {
      if (!log) return false;
      const logDayId = log.dayId || '';
      const logDayTitle = (log.dayTitle || '').toLowerCase().trim();

      // If log has an explicit week prefix from another week (e.g. w2- when selectedWeek is 1), reject it
      if (logDayId.startsWith('w') && !logDayId.startsWith(weekPrefix) && !dayIdsSet.has(logDayId)) {
        return false;
      }

      if (selectedDayId !== 'ALL') {
        const targetDay = resolvedDaysForSelectedWeek.find((d) => d.id === selectedDayId);
        if (!targetDay) return false;
        const targetTitle = (targetDay.title || '').toLowerCase().trim();
        return (
          logDayId === selectedDayId ||
          (logDayId.startsWith(weekPrefix) && logDayTitle === targetTitle) ||
          logDayId.startsWith(`w${selectedWeek}-${targetDay.dayNumber}-`)
        );
      }

      // 'ALL' days for this week
      return (
        dayIdsSet.has(logDayId) ||
        logDayId.startsWith(weekPrefix) ||
        (dayTitlesSet.has(logDayTitle) && !logDayId.startsWith('w'))
      );
    });
  }, [workoutLogs, resolvedDaysForSelectedWeek, selectedWeek, selectedDayId]);

  // Combined targets: Standard strength muscle groups + Cardio / Wytrzymałość
  const allVolumeTargets = useMemo(() => {
    return [...MUSCLE_GROUP_VOLUME_TARGETS, CARDIO_VOLUME_TARGET];
  }, []);

  // Helper to find matching logs for an exercise in a given day
  const getMatchingLogsForExercise = (
    exName: string,
    exId: string,
    dayId: string,
    dayTitle: string
  ): WorkoutLogEntry[] => {
    const normExName = exName.trim().toLowerCase();
    const dayTitleNorm = dayTitle.trim().toLowerCase();

    return activeLogs.filter((log) => {
      if (!log) return false;
      const logNameNorm = (log.exerciseName || '').trim().toLowerCase();
      const isSameName = logNameNorm === normExName || (log.exerciseId && log.exerciseId === exId);
      if (!isSameName) return false;

      const logDayId = log.dayId || '';
      const logDayTitleNorm = (log.dayTitle || '').trim().toLowerCase();

      return logDayId === dayId || logDayTitleNorm === dayTitleNorm || activeDays.length === 1;
    });
  };

  // Helper to extract physically completed sets from logs
  const getPhysicallyCompletedSets = (matchingLogs: WorkoutLogEntry[]) => {
    const setMap = new Map<number, WorkoutLogEntry>();
    matchingLogs.forEach((l) => {
      const setNum = l.setNumber || 1;
      const isDone =
        l.completed !== false &&
        (l.reps > 0 || l.weightKg > 0 || l.tonnageKg > 0 || (l.distanceKm || 0) > 0 || (l.targetDistance || 0) > 0 || (l.setDurationSec || 0) > 0);
      if (isDone) {
        setMap.set(setNum, l);
      }
    });
    return Array.from(setMap.values());
  };

  // Helper to get exercises for a muscle group or cardio
  const getExercisesForMuscleGroup = (groupName: string): MuscleGroupExerciseItem[] => {
    const items: MuscleGroupExerciseItem[] = [];
    const seenKey = new Set<string>();
    const isCardioTarget = groupName === CARDIO_VOLUME_TARGET.muscleGroup;

    activeDays.forEach((day) => {
      (day.exercises || []).forEach((ex) => {
        const isExCardio = isCardioExercise(ex);

        let matchesGroup = false;
        if (isCardioTarget) {
          matchesGroup = isExCardio;
        } else {
          // Strength group: only match if NOT cardio
          if (!isExCardio) {
            const primaryNorm = resolveStrengthMuscleGroup(ex.muscleGroup);
            const secondaryNorm = resolveStrengthMuscleGroup(ex.secondaryMuscleGroup);
            matchesGroup = primaryNorm === groupName || secondaryNorm === groupName;
          }
        }

        if (matchesGroup) {
          const itemKey = `${day.id}___${ex.id || ex.name}`;
          if (!seenKey.has(itemKey)) {
            seenKey.add(itemKey);

            // Find matching logs in activeLogs
            const matchingLogs = getMatchingLogsForExercise(ex.name, ex.id, day.id, day.title);
            const physicallyCompleted = getPhysicallyCompletedSets(matchingLogs);
            const completedSetsCount = physicallyCompleted.length;
            const totalPlannedSets = ex.plannedSets || 3;
            const isCompleted = completedSetsCount > 0;

            let summaryText = '';
            if (isExCardio) {
              const dist = ex.targetDistance ? `${ex.targetDistance} ${ex.distanceUnit || 'km'}` : '';
              const pace = ex.targetPace ? `tempo ${ex.targetPace}` : '';
              const hr = ex.targetHR ? `HR ${ex.targetHR} bpm` : '';
              summaryText = `${totalPlannedSets} ${totalPlannedSets === 1 ? 'seria' : 'serie'}${dist ? ` • ${dist}` : ''}${pace ? ` • ${pace}` : ''}${hr ? ` • ${hr}` : ''}`;
            } else {
              const repsStr = ex.targetRepsRange ? `${ex.targetRepsRange} powt.` : '8-10 powt.';
              const weightStr = ex.defaultWeightKg && ex.defaultWeightKg > 0 ? `${ex.defaultWeightKg} kg` : 'Masa ciała';
              summaryText = `${totalPlannedSets} ${totalPlannedSets === 1 ? 'seria' : 'serie'} × ${repsStr} • ${weightStr}`;
            }

            items.push({
              id: ex.id || `${day.id}-${ex.name}`,
              name: ex.name,
              dayId: day.id,
              dayTitle: day.dayNamePolish ? `${day.dayNamePolish} (${day.title})` : day.title,
              dayNamePolish: day.dayNamePolish,
              summaryText,
              isCompleted,
              completedSetsCount,
              totalPlannedSets,
              category: isExCardio ? 'cardio' : 'strength',
              muscleGroup: isExCardio ? 'Cardio / Wytrzymałość' : ex.muscleGroup,
              exerciseRef: ex,
              dayRef: day,
              matchingLogs,
            });
          }
        }
      });
    });

    // Also include any extra logs in activeLogs not already present in preset exercises
    activeLogs.forEach((log) => {
      const isLogCardio = isCardioLog(log);
      let matchesGroup = false;

      if (isCardioTarget) {
        matchesGroup = isLogCardio;
      } else {
        if (!isLogCardio) {
          const logNorm = resolveStrengthMuscleGroup(log.muscleGroup);
          matchesGroup = logNorm === groupName;
        }
      }

      if (matchesGroup) {
        const logDayTitle = log.dayTitle || 'Trening';
        const itemKey = `${log.dayId || logDayTitle}___${log.exerciseId || log.exerciseName}`;
        if (!seenKey.has(itemKey)) {
          seenKey.add(itemKey);
          const matchingLogs = activeLogs.filter(
            (l) => l.exerciseName?.trim().toLowerCase() === log.exerciseName?.trim().toLowerCase()
          );
          const physicallyCompleted = getPhysicallyCompletedSets(matchingLogs);
          const completedSetsCount = physicallyCompleted.length;

          items.push({
            id: log.exerciseId || `log-${log.id}`,
            name: log.exerciseName,
            dayId: log.dayId || 'custom-day',
            dayTitle: logDayTitle,
            summaryText: `${completedSetsCount} ${completedSetsCount === 1 ? 'seria' : 'serie'} × ${log.reps || 8} powt. • ${log.weightKg || 0} kg`,
            isCompleted: true,
            completedSetsCount,
            totalPlannedSets: completedSetsCount,
            category: isLogCardio ? 'cardio' : 'strength',
            muscleGroup: isLogCardio ? 'Cardio / Wytrzymałość' : log.muscleGroup,
            matchingLogs,
          });
        }
      }
    });

    return items;
  };

  // Planned sets per group
  const plannedSetsPerGroup = useMemo(() => {
    const setsMap: Record<string, number> = {};
    allVolumeTargets.forEach((t) => {
      setsMap[t.muscleGroup] = 0;
    });

    activeDays.forEach((day) => {
      if (day && Array.isArray(day.exercises)) {
        day.exercises.forEach((ex) => {
          if (!ex) return;
          const sets = typeof ex.plannedSets === 'number' ? ex.plannedSets : 3;
          if (isCardioExercise(ex)) {
            setsMap[CARDIO_VOLUME_TARGET.muscleGroup] = (setsMap[CARDIO_VOLUME_TARGET.muscleGroup] || 0) + sets;
          } else {
            const mg = resolveStrengthMuscleGroup(ex.muscleGroup);
            if (mg) {
              setsMap[mg] = (setsMap[mg] || 0) + sets;
            }
            const secMg = resolveStrengthMuscleGroup(ex.secondaryMuscleGroup);
            if (secMg) {
              setsMap[secMg] = (setsMap[secMg] || 0) + Math.round(sets * 0.5);
            }
          }
        });
      }
    });

    return setsMap;
  }, [activeDays, allVolumeTargets]);

  // Actual logged tonnage and completed sets
  // Strictly counts unique physically completed sets from activeLogs!
  const { totalLoggedTonnage, totalLoggedSets } = useMemo(() => {
    let sumTonnage = 0;
    const completedSetKeys = new Set<string>();

    activeLogs.forEach((log) => {
      if (!log) return;
      const isDone =
        log.completed !== false &&
        (log.reps > 0 || log.weightKg > 0 || log.tonnageKg > 0 || (log.distanceKm || 0) > 0 || (log.setDurationSec || 0) > 0);

      if (isDone) {
        const uniqueKey = `${log.dateStr || ''}_${log.dayId || log.dayTitle || ''}_${log.exerciseName}_set${log.setNumber || 1}`;
        if (!completedSetKeys.has(uniqueKey)) {
          completedSetKeys.add(uniqueKey);
          sumTonnage += typeof log.tonnageKg === 'number' ? log.tonnageKg : 0;
        }
      }
    });

    return {
      totalLoggedTonnage: sumTonnage,
      totalLoggedSets: completedSetKeys.size,
    };
  }, [activeLogs]);

  // Total planned tonnage across activeDays (excluding cardio)
  const totalPlannedTonnage = useMemo(() => {
    return activeDays.reduce((daySum, day) => {
      if (!day || !Array.isArray(day.exercises)) return daySum;
      return (
        daySum +
        day.exercises.reduce((exSum, ex) => {
          if (!ex || isCardioExercise(ex)) return exSum;
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
  }, [activeDays, currentPhase]);

  // Time metrics calculations
  const timeMetrics = useMemo(() => {
    const isSingleWorkout = selectedDayId !== 'ALL';

    const sessionsMap = new Map<string, WorkoutLogEntry[]>();
    activeLogs.forEach((log) => {
      const sKey = log.sessionId || `${log.dateStr || 'dzis'}_${log.dayTitle || log.dayId || 'sesja'}`;
      if (!sessionsMap.has(sKey)) {
        sessionsMap.set(sKey, []);
      }
      sessionsMap.get(sKey)!.push(log);
    });

    const sessionCount = sessionsMap.size;
    let totalWorkoutSec = 0;
    let totalWorkSec = 0;
    let totalRestSec = 0;

    sessionsMap.forEach((logsInSession) => {
      const logWithWorkoutTime = logsInSession.find((l) => (l.totalWorkoutDurationSec || 0) > 0);
      const logWithWorkTime = logsInSession.find((l) => (l.totalWorkDurationSec || 0) > 0);
      const logWithRestTime = logsInSession.find((l) => (l.totalRestDurationSec || 0) > 0);

      let sessionSec = 0;
      if (logWithWorkoutTime?.totalWorkoutDurationSec) {
        sessionSec = logWithWorkoutTime.totalWorkoutDurationSec;
      } else {
        const sumSetsTime = logsInSession.reduce((acc, l) => {
          const w = l.setDurationSec || 45;
          const r = l.restDurationSec || 90;
          return acc + w + r;
        }, 0);
        sessionSec = sumSetsTime > 0 ? sumSetsTime : (logsInSession[0]?.durationMinutes ? logsInSession[0].durationMinutes * 60 : 50 * 60);
      }
      totalWorkoutSec += sessionSec;

      if (logWithWorkTime?.totalWorkDurationSec) {
        totalWorkSec += logWithWorkTime.totalWorkDurationSec;
      } else {
        totalWorkSec += logsInSession.reduce((acc, l) => acc + (l.setDurationSec || 45), 0);
      }

      if (logWithRestTime?.totalRestDurationSec) {
        totalRestSec += logWithRestTime.totalRestDurationSec;
      } else {
        totalRestSec += logsInSession.reduce((acc, l) => acc + (l.restDurationSec || 90), 0);
      }
    });

    const hasLogs = activeLogs.length > 0;
    const plannedTotalWorkoutSec = activeDays.reduce((acc, d) => acc + (d.durationMinutes || 60) * 60, 0);
    const totalPlannedSetsCount = Object.values(plannedSetsPerGroup).reduce((a, b) => a + b, 0);
    const plannedWorkSec = totalPlannedSetsCount * 45;
    const plannedRestSec = totalPlannedSetsCount * 90;

    const displayWorkoutDurationSec = hasLogs
      ? (isSingleWorkout ? totalWorkoutSec : Math.round(totalWorkoutSec / Math.max(1, sessionCount)))
      : (isSingleWorkout ? (activeDays[0]?.durationMinutes || 60) * 60 : Math.round(plannedTotalWorkoutSec / Math.max(1, activeDays.length)));

    const displayWorkDurationSec = hasLogs ? totalWorkSec : plannedWorkSec;
    const displayRestDurationSec = hasLogs ? totalRestSec : plannedRestSec;

    return {
      hasLogs,
      sessionCount,
      isSingleWorkout,
      displayWorkoutDurationSec,
      displayWorkDurationSec,
      displayRestDurationSec,
      totalPlannedSetsCount,
    };
  }, [activeLogs, selectedDayId, activeDays, plannedSetsPerGroup]);

  // Accordion toggle helper
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Open Exercise Details Modal for an item
  const handleOpenExerciseDetails = (item: MuscleGroupExerciseItem) => {
    const ex = item.exerciseRef;
    const isCardio = item.category === 'cardio';
    const totalPlanned = item.totalPlannedSets || 3;
    const physicallyDone = getPhysicallyCompletedSets(item.matchingLogs);
    const numSets = Math.max(totalPlanned, physicallyDone.length);

    const setsList: DetailedSetComparison[] = [];
    for (let i = 1; i <= numSets; i++) {
      const actualLog = physicallyDone.find((l) => l.setNumber === i) || item.matchingLogs.find((l) => l.setNumber === i);
      const isDone = !!actualLog && actualLog.completed !== false;

      // Extract planned parameters
      const plannedDetail = ex?.plannedSetsDetails?.find((p) => p.setNumber === i);
      const plannedWeight = plannedDetail?.weightKg ?? ex?.defaultWeightKg ?? 0;
      const plannedReps = plannedDetail?.reps ?? ex?.targetRepsRange ?? 8;
      const plannedRir = plannedDetail?.rir ?? ex?.targetRIR ?? currentPhase?.targetRIR ?? 2;
      const plannedRpe = plannedDetail?.rpe ?? ex?.targetRPE ?? currentPhase?.targetRPE ?? 8;
      const plannedDist = plannedDetail?.distance ?? ex?.targetDistance;
      const plannedDistUnit = plannedDetail?.distanceUnit ?? ex?.distanceUnit ?? 'km';
      const plannedPace = plannedDetail?.pace ?? ex?.targetPace;
      const plannedHr = plannedDetail?.targetHr ?? ex?.targetHR;

      setsList.push({
        setNumber: i,
        planned: {
          weightKg: plannedWeight,
          reps: plannedReps,
          rir: plannedRir,
          rpe: plannedRpe,
          distance: plannedDist,
          distanceUnit: plannedDistUnit,
          pace: plannedPace,
          targetHr: plannedHr,
        },
        actual: actualLog
          ? {
              weightKg: actualLog.weightKg || 0,
              reps: actualLog.reps || 0,
              rir: actualLog.rir ?? plannedRir,
              rpe: actualLog.rpe ?? plannedRpe,
              distance: actualLog.distanceKm || actualLog.targetDistance,
              distanceUnit: actualLog.distanceUnit || 'km',
              pace: actualLog.actualPace || actualLog.targetPace,
              targetHr: actualLog.actualHR || actualLog.targetHR,
              isCompleted: isDone,
              notes: actualLog.notes,
            }
          : undefined,
      });
    }

    // Combine notes
    const userNotesArr = item.matchingLogs
      .map((l) => l.notes)
      .filter((n): n is string => !!n && n.trim().length > 0);
    const uniqueUserNotes = Array.from(new Set(userNotesArr)).join('; ');

    const modalData: ExerciseDetailsModalData = {
      exerciseName: item.name,
      dayTitle: item.dayTitle,
      dayNamePolish: item.dayNamePolish,
      category: item.category,
      muscleGroup: item.muscleGroup,
      techniqueNotes: ex?.techniqueNotes,
      userNotes: uniqueUserNotes || undefined,
      sessionNotes: item.matchingLogs[0]?.sessionNotes || item.dayRef?.sessionNotes,
      sets: setsList,
      totalPlannedSets: totalPlanned,
      totalCompletedSets: physicallyDone.length,
    };

    setSelectedExerciseForModal(modalData);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Scope Filters: Wybór Tygodnia i Treningu */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shadow-md shadow-amber-400/20 shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-heading tracking-wide">
                Filtry Zakresu Danych
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Wybierz tydzień i konkretny dzień treningowy, aby przeanalizować tonaż, objętość i czasy
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Wybór tygodnia */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="volume-week-select"
              className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Tydzień:</span>
            </label>
            <select
              id="volume-week-select"
              value={selectedWeek}
              onChange={(e) => handleSelectWeek(Number(e.target.value))}
              className="bg-neutral-950 border border-neutral-700 text-white font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer min-w-[130px] shadow-sm"
            >
              {availableWeeks.map((w) => (
                <option key={w.week} value={w.week}>
                  Tydzień {w.week}{w.isDeload ? ' (Deload)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Wybór treningu */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="volume-workout-select"
              className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 shrink-0"
            >
              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
              <span>Trening:</span>
            </label>
            <select
              id="volume-workout-select"
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 text-white font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer min-w-[200px] max-w-[320px] truncate shadow-sm"
            >
              <option value="ALL">Cały tydzień (Wszystkie treningi)</option>
              {resolvedDaysForSelectedWeek.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.dayNamePolish ? `${day.dayNamePolish}: ` : ''}{day.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Volume & Time Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Card 1: Tonaż Zapisany */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">
                {timeMetrics.isSingleWorkout ? 'Tonaż Zapisany w Treningu' : 'Tygodniowy Tonaż Zapisany'}
              </span>
              <Dumbbell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono-numbers">
              {totalLoggedTonnage.toLocaleString()} kg
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Z wykonanych {totalLoggedSets} serii roboczych w wybranym zakresie
          </p>
        </div>

        {/* Card 2: Planowany Tonaż Bazowy */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">
                {timeMetrics.isSingleWorkout ? 'Planowany Tonaż Treningu' : 'Planowany Tonaż Bazowy'}
              </span>
              <TrendingUp className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              ~{totalPlannedTonnage.toLocaleString()} kg
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Tydzień {selectedWeek} • Mnożnik: {Math.round((currentPhase.volumeMultiplier || 1.0) * 100)}%
          </p>
        </div>

        {/* Card 3: Średni Zapas Sił (RIR / RPE) */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">Średni Zapas Sił (RIR)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              RIR {currentPhase.targetRIR ?? 2}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Docelowa skala RPE: {currentPhase.targetRPE ?? 8} / 10
          </p>
        </div>

        {/* Card 4: Średni lub całkowity czas trwania treningu */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">
                {timeMetrics.isSingleWorkout ? 'Całkowity Czas Treningu' : 'Średni Czas Treningu'}
              </span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              {formatDuration(timeMetrics.displayWorkoutDurationSec)}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {timeMetrics.hasLogs
              ? timeMetrics.isSingleWorkout
                ? 'Czas trwania zarejestrowanej sesji'
                : `Średnia z ${timeMetrics.sessionCount} ukończonych sesji`
              : 'Szacowany czas trwania sesji wg planu'}
          </p>
        </div>

        {/* Card 5: Sumaryczny czas pracy (aktywne serie) */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">Czas Pracy (Serie)</span>
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-orange-400 font-mono-numbers">
              {formatDuration(timeMetrics.displayWorkDurationSec)}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {timeMetrics.hasLogs
              ? `Łączny czas pod napięciem (TUT) dla ${totalLoggedSets} serii`
              : `Szacowany czas aktywnych serii (${timeMetrics.totalPlannedSetsCount} zaplanowanych)`}
          </p>
        </div>

        {/* Card 6: Sumaryczny czas przerw */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">Czas Przerw</span>
              <Coffee className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              {formatDuration(timeMetrics.displayRestDurationSec)}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {timeMetrics.hasLogs
              ? 'Łączny czas odpoczynku zarejestrowany w stoperze'
              : 'Planowany czas odpoczynku między seriami'}
          </p>
        </div>

        {/* Card 7: Synchronizacja Arkusza */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span className="font-bold uppercase tracking-wider">Synchronizacja Arkusza</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <button
            onClick={onOpenSheetsModal}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Otwórz panel Google Sheets</span>
          </button>
          <p className="text-[11px] text-neutral-400 mt-2">
            Eksport i podgląd w chmurze
          </p>
        </div>
      </div>

      {/* 3. Muscle Group Volume Matrix (Interactive Accordions with Cardio Separation & Fixed Counters) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-base sm:text-lg font-black text-white font-heading">
                Rozkład Serii na Partie Mięśniowe & Cardio
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kliknij w kartę partii, aby rozwinąć listę ćwiczeń lub kliknij &quot;Szczegóły&quot; aby porównać plan z wykonaniem
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Filtr partii:</span>
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
            >
              <option value="ALL">Wszystkie kategorie ({allVolumeTargets.length})</option>
              {allVolumeTargets.map((t) => (
                <option key={t.muscleGroup} value={t.muscleGroup}>
                  {t.muscleGroup}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Volume Bars & Accordions */}
        <div className="mt-6 space-y-4">
          {allVolumeTargets
            .filter((t) => selectedMuscle === 'ALL' || t.muscleGroup === selectedMuscle)
            .map((target) => {
              const isCardio = target.muscleGroup === CARDIO_VOLUME_TARGET.muscleGroup;
              const groupExercises = getExercisesForMuscleGroup(target.muscleGroup);

              // Planned sets: calculate dynamically from exercises in scope
              const plannedFromExercises = groupExercises.reduce((sum, item) => sum + item.totalPlannedSets, 0);
              const planned = plannedFromExercises > 0
                ? plannedFromExercises
                : (selectedDayId === 'ALL' ? target.weeklySets : 0);

              // Logged sets: EXACT sum of physically completed sets of exercises belonging to this group!
              // This strictly fixes the 6 vs 4 issue (Issue #2).
              const logged = groupExercises.reduce((sum, item) => sum + item.completedSetsCount, 0);

              const percentage = Math.min(100, Math.round((planned / Math.max(1, target.maxRecommendedSets)) * 100));
              const isOptimal = planned >= target.minRecommendedSets && planned <= target.maxRecommendedSets;
              const isExpanded = !!expandedGroups[target.muscleGroup];

              return (
                <div
                  key={target.muscleGroup}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-neutral-950 border-amber-400/50 shadow-lg shadow-amber-400/5'
                      : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-950'
                  }`}
                >
                  {/* Clickable Header for Accordion */}
                  <div
                    onClick={() => toggleGroup(target.muscleGroup)}
                    className="p-4 sm:p-5 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroup(target.muscleGroup);
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm sm:text-base font-bold text-white font-heading">
                          {target.muscleGroup}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCardio
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : isOptimal
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isCardio
                            ? 'Trening Tlenowy'
                            : isOptimal
                            ? 'Optymalna objętość (MAV)'
                            : planned > target.maxRecommendedSets
                            ? 'Wysoki bodziec'
                            : 'Niska / Regeneracja'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 text-xs">
                        <span className="text-neutral-400">
                          Plan: <strong className="text-amber-400 font-mono-numbers">{planned} {planned === 1 ? 'seria' : 'serii'}</strong>
                        </span>
                        <span className="text-neutral-400">
                          Wykonane: <strong className="text-white font-mono-numbers">{logged}</strong>
                        </span>

                        {/* Accordion indicator Chevron */}
                        <div
                          className={`p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180 text-amber-400 border-amber-400/40' : ''
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Progress bar visual */}
                    <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden relative my-2">
                      <div
                        className="absolute top-0 bottom-0 bg-neutral-800"
                        style={{
                          left: `${(target.minRecommendedSets / target.maxRecommendedSets) * 80}%`,
                          width: `${((target.maxRecommendedSets - target.minRecommendedSets) / target.maxRecommendedSets) * 80}%`,
                        }}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out relative z-10 ${
                          isCardio ? 'bg-orange-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Footer notes - CLEANED UP: All redundant contextual descriptions removed (Issue #3) */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>
                        Zalecany zakres: <strong className="text-neutral-300">{target.minRecommendedSets} - {target.maxRecommendedSets} serii / tydz.</strong>
                      </span>
                    </div>
                  </div>

                  {/* 4. Szczegóły ćwiczeń (Widok po rozwinięciu - Accordion Content) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-neutral-800/80 bg-neutral-900/30">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isCardio ? <Flame className="w-3.5 h-3.5 text-orange-400" /> : <Dumbbell className="w-3.5 h-3.5 text-amber-400" />}
                          <span>Ćwiczenia na tę partię ({groupExercises.length})</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          Zaliczono: <strong className="text-emerald-400 font-bold">{groupExercises.filter((e) => e.isCompleted).length}</strong> / {groupExercises.length}
                        </span>
                      </div>

                      {groupExercises.length === 0 ? (
                        <div className="py-4 px-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-400">
                          Brak zaplanowanych ćwiczeń na tę partię w wybranym zakresie ({selectedDayId === 'ALL' ? `Tydzień ${selectedWeek}` : 'Wybrany Trening'}).
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {groupExercises.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleOpenExerciseDetails(item)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-amber-400/50 hover:bg-neutral-900 transition-all cursor-pointer group"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleOpenExerciseDetails(item);
                                }
                              }}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-white font-heading group-hover:text-amber-400 transition-colors">
                                    {item.name}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-800 border border-neutral-700 text-neutral-300">
                                    {item.dayTitle}
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-400 mt-1 font-mono-numbers">
                                  {item.summaryText}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                                {item.isCompleted ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      Wykonane ({item.completedSetsCount} {item.completedSetsCount === 1 ? 'seria' : 'serii'})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-medium">
                                    <Clock className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                                    <span>Zaplanowane / Brak</span>
                                  </span>
                                )}

                                {/* Dedicated Button: "Szczegóły" (Issue #4) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenExerciseDetails(item);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title="Zobacz szczegółowe parametry serii i wykonania"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Szczegóły</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 5. Recent Workout Logs for Selected Scope */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              Wykonane Serie w Wybranym Zakresie ({activeLogs.length})
            </h3>
            <p className="text-xs text-neutral-400">
              Wpisy zarejestrowane dla: {selectedDayId === 'ALL' ? `Tydzień ${selectedWeek} (Wszystkie dni)` : resolvedDaysForSelectedWeek.find((d) => d.id === selectedDayId)?.title || 'Wybrany Trening'}
            </p>
          </div>
        </div>

        {activeLogs.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-xs">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
            <p>Brak zapisanych serii w wybranym zakresie danych.</p>
            <p className="text-neutral-500 mt-1">
              Przejdź do zakładki Trening i kliknij &quot;Rozpocznij Trening&quot; aby wprowadzić pierwsze serie.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {/* Mobile Cards (Visible below md) */}
            <div className="space-y-2.5 md:hidden">
              {activeLogs.slice(-15).reverse().map((entry) => (
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
                          • {isCardioLog(entry) ? 'Cardio / Bieg' : entry.muscleGroup?.split('(')[0] || 'Ogólne'}
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
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                        {isCardioLog(entry) ? 'Dystans' : 'Ciężar × Powt'}
                      </span>
                      <span className="font-bold text-white">
                        {isCardioLog(entry)
                          ? (entry.distanceKm ? `${entry.distanceKm} km` : `${entry.targetDistance || 0} ${entry.distanceUnit || 'km'}`)
                          : `${entry.weightKg}kg × ${entry.reps}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                        {isCardioLog(entry) ? 'Tempo' : 'Tonaż'}
                      </span>
                      <span className="font-black text-amber-400">
                        {isCardioLog(entry)
                          ? (entry.actualPace || entry.targetPace || '-')
                          : `${entry.tonnageKg.toLocaleString()} kg`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block">
                        {isCardioLog(entry) ? 'Tętno HR' : 'RPE / RIR'}
                      </span>
                      <span className="font-bold text-neutral-300">
                        {isCardioLog(entry)
                          ? (entry.actualHR || entry.targetHR ? `${entry.actualHR || entry.targetHR} bpm` : '-')
                          : `@${entry.rpe} (${entry.rir})`}
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
                    <th className="py-2.5 px-3">Kategoria / Partia</th>
                    <th className="py-2.5 px-3">Seria</th>
                    <th className="py-2.5 px-3">Wartość</th>
                    <th className="py-2.5 px-3">Jednostki / Powt.</th>
                    <th className="py-2.5 px-3 text-amber-400">Tonaż / Wynik</th>
                    <th className="py-2.5 px-3">RPE / RIR / HR</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Notatki</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {activeLogs.slice(-20).reverse().map((entry) => {
                    const isCardio = isCardioLog(entry);

                    return (
                      <tr key={entry.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-neutral-400 font-mono-numbers">{entry.dateStr}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{entry.exerciseName}</td>
                        <td className="py-2.5 px-3 text-neutral-400">
                          {isCardio ? (
                            <span className="text-amber-400 font-bold">Cardio / Bieg</span>
                          ) : (
                            entry.muscleGroup?.split('(')[0] || 'Trening Siłowy'
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono-numbers text-neutral-400">#{entry.setNumber}</td>
                        <td className="py-2.5 px-3 font-mono-numbers font-bold text-white">
                          {isCardio ? (entry.distanceKm ? `${entry.distanceKm} km` : '-') : `${entry.weightKg} kg`}
                        </td>
                        <td className="py-2.5 px-3 font-mono-numbers text-white">
                          {isCardio ? (entry.actualPace || entry.targetPace || '-') : `${entry.reps} powt`}
                        </td>
                        <td className="py-2.5 px-3 font-mono-numbers font-bold text-amber-400">
                          {isCardio ? 'Zaliczono' : `${entry.tonnageKg.toLocaleString()} kg`}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-200">
                          {isCardio ? (
                            entry.actualHR || entry.targetHR ? `${entry.actualHR || entry.targetHR} bpm` : '-'
                          ) : (
                            <>
                              @{entry.rpe} <span className="text-neutral-400 text-[10px] font-normal">(RIR {entry.rir})</span>
                            </>
                          )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Exercise Details Modal (Issue #4) */}
      <ExerciseDetailsModal
        isOpen={isDetailsModalOpen}
        data={selectedExerciseForModal}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedExerciseForModal(null);
        }}
      />
    </div>
  );
};
