/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { WeeklyPlanView } from './components/WeeklyPlanView';
import { VolumeMatrixView } from './components/VolumeMatrixView';
import { HyroxRaceSimulator } from './components/HyroxRaceSimulator';
import { Progression1RMView } from './components/Progression1RMView';
import { RecoveryTrackerView } from './components/RecoveryTrackerView';
import { WorkoutLoggerModal } from './components/WorkoutLoggerModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { RestTimer } from './components/RestTimer';
import { TrainingCatalogSidebar } from './components/TrainingCatalogSidebar';
import { AddWeekModal } from './components/AddWeekModal';
import { SummaryCalendarView } from './components/SummaryCalendarView';
import { initAuth, googleSignIn, logout } from './services/auth';
import { appendHyroxTrialToSheet } from './services/sheets';
import {
  WorkoutDay,
  WorkoutLogEntry,
  HyroxRaceTrial,
  DailyRecoveryData,
  MesocyclePhase,
  TrainingCycleCatalog,
  Exercise,
  DayType
} from './types/hyrox';
import { MASTER_HYROX_WEEK_PLAN, MESOCYCLE_WEEKS } from './data/hyroxPlanData';
import { DEFAULT_TRAINING_CYCLES, MASA_WEEK_PLAN, REDUKCJA_WEEK_PLAN } from './data/defaultCycles';
import { getLocalDateString, extractLogDate, compareLogsDescending } from './utils/dateUtils';

// Helper to safely resolve or derive workout days for any week of a training cycle
export const getDaysForCycleWeek = (cycle: TrainingCycleCatalog, weekNum: number): WorkoutDay[] => {
  if (!cycle) return [];

  // 1. If explicit plan exists for this week (even if empty array []), return it with healed unique day IDs
  if (cycle.weeksPlansMap && cycle.weeksPlansMap[weekNum] !== undefined) {
    const rawDays = Array.isArray(cycle.weeksPlansMap[weekNum]) ? cycle.weeksPlansMap[weekNum] : [];
    return rawDays.map((d, idx) => {
      const expectedPrefix = `w${weekNum}-`;
      const fixedId = d.id && d.id.startsWith(expectedPrefix) ? d.id : `w${weekNum}-${d.dayNumber || idx + 1}-${d.id || 'day'}`;
      return {
        ...d,
        id: fixedId,
      };
    });
  }

  // 2. Derive from week 1 or preset template if not yet explicitly saved
  const baseDays =
    cycle.weeksPlansMap?.[1] ||
    (cycle.id?.includes('hyrox') || cycle.goal === 'HYROX'
      ? MASTER_HYROX_WEEK_PLAN
      : cycle.id?.includes('masa') || cycle.goal === 'MASA'
      ? MASA_WEEK_PLAN
      : cycle.id?.includes('redukcja') || cycle.goal === 'REDUKCJA'
      ? REDUKCJA_WEEK_PLAN
      : null);

  if (baseDays && Array.isArray(baseDays) && baseDays.length > 0) {
    const phase = cycle.weeksList?.find((w) => w && w.week === weekNum);
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

  return [];
};

// Helper to deduplicate and heal workout logs by unique set identity
// Normalizes date, exercise name, and set number.
// When duplicates exist (e.g. starting the same workout multiple times on the same day),
// keeps the latest completed entry so sets don't multiply (e.g. 3 sets x 4 attempts != 12 sets).
export const sanitizeAndDeduplicateLogs = (logs: WorkoutLogEntry[]): WorkoutLogEntry[] => {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  // Sort logs by timestamp ascending so later entries overwrite earlier attempts
  const sorted = [...logs].sort((a, b) => {
    const tA = a.timestamp || a.dateStr || '';
    const tB = b.timestamp || b.dateStr || '';
    return tA.localeCompare(tB);
  });

  const map = new Map<string, WorkoutLogEntry>();

  sorted.forEach((log) => {
    const date = extractLogDate(log);
    const exNorm = (log.exerciseName || '').trim().toLowerCase();
    const setNum = log.setNumber || 1;

    // Use date, exercise name, and set number to ensure an exercise only has 1 instance of set 1, set 2, etc. per date
    const key = `${date}___${exNorm}___set${setNum}`;
    map.set(key, { ...log, dateStr: date });
  });

  return Array.from(map.values());
};

// Export alias for backward compatibility
export const deduplicateWorkoutLogs = sanitizeAndDeduplicateLogs;

export default function App() {
  // Training Cycles List (Masa 2026, Przygotowania pod HYROX, Redukcja, etc.)
  const [cyclesList, setCyclesList] = useState<TrainingCycleCatalog[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_training_cycles_list');
      if (saved) {
        const parsed: TrainingCycleCatalog[] = JSON.parse(saved);
        // Heal preset cycles with missing weeks in weeksPlansMap, and heal day IDs per week
        return parsed.map((cycle) => {
          const defaultPreset = DEFAULT_TRAINING_CYCLES.find((d) => d.id === cycle.id);
          const rawMap = defaultPreset && defaultPreset.weeksPlansMap
            ? { ...defaultPreset.weeksPlansMap, ...(cycle.weeksPlansMap || {}) }
            : (cycle.weeksPlansMap || {});

          const healedMap: Record<number, WorkoutDay[]> = {};
          Object.entries(rawMap).forEach(([wStr, days]) => {
            const wNum = parseInt(wStr, 10);
            if (Array.isArray(days)) {
              healedMap[wNum] = days.map((d, idx) => ({
                ...d,
                id: d.id && d.id.startsWith(`w${wNum}-`) ? d.id : `w${wNum}-${d.dayNumber || idx + 1}-${d.id || 'day'}`,
              }));
            }
          });

          return {
            ...cycle,
            weeksPlansMap: healedMap,
          };
        });
      }
      return DEFAULT_TRAINING_CYCLES;
    } catch {
      return DEFAULT_TRAINING_CYCLES;
    }
  });

  // Active Selected Cycle ID
  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hyrox_active_cycle_id');
      return saved || DEFAULT_TRAINING_CYCLES[0].id;
    } catch {
      return DEFAULT_TRAINING_CYCLES[0].id;
    }
  });

  const activeCycle = cyclesList.find((c) => c.id === activeCycleId) || cyclesList[0] || DEFAULT_TRAINING_CYCLES[0];
  const currentWeek = activeCycle.currentWeek || 1;
  const weeksList = activeCycle.weeksList !== undefined ? activeCycle.weeksList : (activeCycle.id.includes('hyrox') ? MESOCYCLE_WEEKS : []);
  const currentWeekDays: WorkoutDay[] = getDaysForCycleWeek(activeCycle, currentWeek);

  const [activeTab, setActiveTab] = useState<string>('plan');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('hyrox_spreadsheet_id');
    } catch {
      return null;
    }
  });

  // Local workout logs with automatic healing of duplicates
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_workout_logs');
      if (!saved) return [];
      const parsed: WorkoutLogEntry[] = JSON.parse(saved);
      const deduplicated = sanitizeAndDeduplicateLogs(parsed);
      if (deduplicated.length !== parsed.length) {
        localStorage.setItem('hyrox_workout_logs', JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch {
      return [];
    }
  });

  // Recovery logs
  const [recoveryHistory, setRecoveryHistory] = useState<DailyRecoveryData[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_recovery_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<WorkoutDay | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(90);
  const [isCatalogSidebarOpen, setIsCatalogSidebarOpen] = useState(false);
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);

  // Helper to persist updated cycles
  const persistCycles = (updatedCycles: TrainingCycleCatalog[]) => {
    setCyclesList(updatedCycles);
    try {
      localStorage.setItem('hyrox_training_cycles_list', JSON.stringify(updatedCycles));
    } catch (e) {
      console.warn(e);
    }
  };

  // Select another cycle as active
  const handleSelectCycle = (cycleId: string) => {
    setActiveCycleId(cycleId);
    try {
      localStorage.setItem('hyrox_active_cycle_id', cycleId);
    } catch (e) {
      console.warn(e);
    }
  };

  // Create new cycle
  const handleCreateCycle = (newCycle: TrainingCycleCatalog) => {
    const updated = [...cyclesList, newCycle];
    persistCycles(updated);
    handleSelectCycle(newCycle.id);
  };

  // Update existing cycle
  const handleUpdateCycle = (updatedCycle: TrainingCycleCatalog) => {
    const updated = cyclesList.map((c) => (c.id === updatedCycle.id ? updatedCycle : c));
    persistCycles(updated);
  };

  // Delete cycle
  const handleDeleteCycle = (cycleId: string) => {
    if (cyclesList.length <= 1) return;
    const updated = cyclesList.filter((c) => c.id !== cycleId);
    persistCycles(updated);
    if (activeCycleId === cycleId) {
      handleSelectCycle(updated[0].id);
    }
  };

  // Switch week within active cycle
  const handleWeekChange = (week: number) => {
    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: week,
    };
    handleUpdateCycle(updatedCycle);
  };

  // Update day in active cycle's current week
  const handleUpdateDay = (updatedDay: WorkoutDay) => {
    const currentDays = currentWeekDays.map((d) => (d.id === updatedDay.id ? updatedDay : d));
    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [currentWeek]: currentDays,
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Reset plan for current week back to base
  const handleResetPlanToDefault = () => {
    const confirmed = window.confirm(
      `Czy na pewno chcesz przywrócić domyślny plan dla Tygodnia ${currentWeek} w cyklu "${activeCycle.name}"?`
    );
    if (!confirmed) return;

    const baseDays = activeCycle.weeksPlansMap?.[1] || MASTER_HYROX_WEEK_PLAN;
    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [currentWeek]: baseDays,
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Update exercises from active workout logger session
  const handleUpdateDayExercises = (dayId: string, exercises: Exercise[]) => {
    const currentDays = currentWeekDays.map((d) => (d.id === dayId ? { ...d, exercises } : d));
    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [currentWeek]: currentDays,
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Copy day to next week or target week in active cycle (auto-creates week & day if missing)
  const handleCopyDayToWeek = (
    sourceDay: WorkoutDay,
    targetWeek: number,
    targetDayNumber: number,
    progressionDeltaKg: number
  ) => {
    // 1. Ensure targetWeek exists in weeksList - fill all intermediate weeks if jumping ahead
    let updatedWeeksList = [...(activeCycle.weeksList || (activeCycle.id.includes('hyrox') ? MESOCYCLE_WEEKS : []))];
    const maxExistingWeek = updatedWeeksList.length > 0 ? Math.max(...updatedWeeksList.map((w) => w?.week || 0)) : 0;
    if (targetWeek > maxExistingWeek) {
      for (let w = maxExistingWeek + 1; w <= targetWeek; w++) {
        const isTarget = w === targetWeek;
        updatedWeeksList.push({
          week: w,
          name: `Tydzień ${w}: Plan Kopiowany`,
          volumeMultiplier: 1.0,
          targetRPE: 8.0,
          targetRIR: 2,
          progressionNote: isTarget
            ? `Skopiowano z Tygodnia ${currentWeek} z progresją +${progressionDeltaKg}kg`
            : 'Faza cyklu',
          isDeload: false,
        });
      }
      updatedWeeksList.sort((a, b) => a.week - b.week);
    } else if (!updatedWeeksList.some((w) => w && w.week === targetWeek)) {
      updatedWeeksList.push({
        week: targetWeek,
        name: `Tydzień ${targetWeek}: Plan Kopiowany`,
        volumeMultiplier: 1.0,
        targetRPE: 8.0,
        targetRIR: 2,
        progressionNote: `Skopiowano z Tygodnia ${currentWeek} (+${progressionDeltaKg}kg)`,
        isDeload: false,
      });
      updatedWeeksList.sort((a, b) => a.week - b.week);
    }

    // 2. Resolve or build target days for this week
    const polishDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
    let baseTargetDays = activeCycle.weeksPlansMap?.[targetWeek] ? [...activeCycle.weeksPlansMap[targetWeek]] : [];

    // If target week does not have days yet, generate structure matching current week or 7 days
    if (baseTargetDays.length === 0) {
      const neededDaysCount = Math.max(currentWeekDays.length || 7, targetDayNumber);
      baseTargetDays = Array.from({ length: neededDaysCount }, (_, idx) => {
        const dNum = idx + 1;
        const fallbackName = polishDays[(dNum - 1) % 7] || `Dzień ${dNum}`;
        const sourceMatchingDay = currentWeekDays.find((d) => d.dayNumber === dNum);
        return {
          id: `w${targetWeek}-day-${dNum}-${Date.now()}-${idx}`,
          dayNumber: dNum,
          dayNamePolish: sourceMatchingDay?.dayNamePolish || fallbackName,
          title: sourceMatchingDay ? sourceMatchingDay.title : `Trening ${dNum} (${fallbackName})`,
          subtitle: sourceMatchingDay?.subtitle || 'Dzień treningowy',
          type: (sourceMatchingDay?.type || 'FBW') as DayType,
          durationMinutes: sourceMatchingDay?.durationMinutes || 60,
          summary: '',
          targetRpeRange: '8.0',
          targetRirRange: '2',
          exercises: [],
        };
      });
    }

    const existingTargetDay = baseTargetDays.find((d) => d && d.dayNumber === targetDayNumber);
    const targetDayName =
      existingTargetDay?.dayNamePolish ||
      polishDays[(targetDayNumber - 1) % 7] ||
      sourceDay.dayNamePolish ||
      `Dzień ${targetDayNumber}`;

    const copiedExercises: Exercise[] = (sourceDay.exercises || []).map((ex) => {
      const pastLogsForEx = (workoutLogs || [])
        .filter(
          (l) =>
            l.exerciseName &&
            l.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase() &&
            (l.dayId === sourceDay.id || l.dayTitle === sourceDay.title)
        )
        .sort((a, b) => compareLogsDescending(a, b));

      const lastDate = pastLogsForEx[0] ? extractLogDate(pastLogsForEx[0]) : '';
      const lastSets = lastDate
        ? pastLogsForEx.filter((l) => extractLogDate(l) === lastDate)
        : [];

      // Determine highest working weight performed in that previous session, or fallback to defaultWeightKg
      const maxLoggedWeight = lastSets.length > 0 ? Math.max(...lastSets.map((s) => s.weightKg || 0)) : 0;
      const baseW = maxLoggedWeight > 0 ? maxLoggedWeight : (ex.defaultWeightKg || 0);

      const progressedWeight =
        progressionDeltaKg > 0 && baseW > 0
          ? Number((baseW + progressionDeltaKg).toFixed(1))
          : (ex.defaultWeightKg || baseW);

      return {
        ...ex,
        id: `ex-w${targetWeek}-${(ex.name || 'ex').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
        defaultWeightKg: progressedWeight,
      };
    });

    const newDay: WorkoutDay = {
      ...sourceDay,
      id: `w${targetWeek}-day-${targetDayNumber}-${Date.now()}`,
      dayNumber: targetDayNumber,
      dayNamePolish: targetDayName,
      title: sourceDay.title,
      exercises: copiedExercises,
      runningSession: sourceDay.runningSession ? JSON.parse(JSON.stringify(sourceDay.runningSession)) : undefined,
    };

    let updatedTargetDays: WorkoutDay[];
    if (baseTargetDays.some((d) => d && d.dayNumber === targetDayNumber)) {
      updatedTargetDays = baseTargetDays.map((d) => (d.dayNumber === targetDayNumber ? newDay : d));
    } else {
      updatedTargetDays = [...baseTargetDays, newDay].sort((a, b) => a.dayNumber - b.dayNumber);
    }

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: targetWeek,
      weeksList: updatedWeeksList,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [currentWeek]: currentWeekDays,
        [targetWeek]: updatedTargetDays,
      },
    };

    handleUpdateCycle(updatedCycle);
  };

  // Copy entire week to target week with progression
  const handleCopyEntireWeekTo = (
    sourceWeek: number,
    targetWeek: number,
    progressionDeltaKg: number
  ) => {
    let updatedWeeksList = [...(activeCycle.weeksList || (activeCycle.id.includes('hyrox') ? MESOCYCLE_WEEKS : []))];
    const maxExistingWeek = updatedWeeksList.length > 0 ? Math.max(...updatedWeeksList.map((w) => w?.week || 0)) : 0;
    if (targetWeek > maxExistingWeek) {
      for (let w = maxExistingWeek + 1; w <= targetWeek; w++) {
        updatedWeeksList.push({
          week: w,
          name: `Tydzień ${w}: Plan Kopiowany`,
          volumeMultiplier: 1.0,
          targetRPE: 8.0,
          targetRIR: 2,
          progressionNote: w === targetWeek ? `Skopiowano cały Tydzień ${sourceWeek} (+${progressionDeltaKg}kg)` : 'Faza cyklu',
          isDeload: false,
        });
      }
      updatedWeeksList.sort((a, b) => a.week - b.week);
    }

    const sourceDays = activeCycle.weeksPlansMap?.[sourceWeek] || currentWeekDays;
    const clonedDays: WorkoutDay[] = sourceDays.map((d, dIdx) => ({
      ...d,
      id: `w${targetWeek}-day-${d.dayNumber || dIdx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exercises: (d.exercises || []).map((ex) => ({
        ...ex,
        id: `ex-w${targetWeek}-${(ex.name || 'ex').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
        defaultWeightKg:
          progressionDeltaKg > 0 && (ex.defaultWeightKg || 0) > 0
            ? Number(((ex.defaultWeightKg || 0) + progressionDeltaKg).toFixed(1))
            : ex.defaultWeightKg,
      })),
    }));

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: targetWeek,
      weeksList: updatedWeeksList,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [sourceWeek]: currentWeekDays,
        [targetWeek]: clonedDays,
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Move / Shift Day within active cycle
  const handleMoveDay = (
    fromWeek: number,
    fromDayNumber: number,
    toWeek: number,
    toDayNumber: number
  ) => {
    const sourceDays = activeCycle.weeksPlansMap?.[fromWeek] || currentWeekDays;
    const targetDays = activeCycle.weeksPlansMap?.[toWeek] || currentWeekDays;

    const sourceDay = sourceDays.find((d) => d.dayNumber === fromDayNumber);
    if (!sourceDay) return;

    const targetDayObj = targetDays.find((d) => d.dayNumber === toDayNumber) || targetDays[0];

    let newPlansMap = { ...(activeCycle.weeksPlansMap || {}) };

    if (fromWeek === toWeek) {
      const updatedDays = sourceDays.map((d) => {
        if (d.dayNumber === toDayNumber) {
          return {
            ...sourceDay,
            dayNumber: toDayNumber,
            dayNamePolish: d.dayNamePolish,
          };
        }
        if (d.dayNumber === fromDayNumber) {
          return {
            ...targetDayObj,
            dayNumber: fromDayNumber,
            dayNamePolish: d.dayNamePolish,
          };
        }
        return d;
      });
      newPlansMap[fromWeek] = updatedDays;
      setActiveWorkoutDay(updatedDays.find((d) => d.dayNumber === toDayNumber) || null);
    } else {
      const updatedTargetDays = targetDays.map((d) => {
        if (d.dayNumber === toDayNumber) {
          return {
            ...sourceDay,
            dayNumber: toDayNumber,
            dayNamePolish: d.dayNamePolish,
          };
        }
        return d;
      });
      newPlansMap[toWeek] = updatedTargetDays;
      setActiveWorkoutDay(updatedTargetDays.find((d) => d.dayNumber === toDayNumber) || null);
    }

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: toWeek,
      weeksPlansMap: newPlansMap,
    };
    handleUpdateCycle(updatedCycle);
  };

  // Add next week to active cycle
  const handleAddWeek = (newPhase: MesocyclePhase, initialDays: WorkoutDay[]) => {
    const updatedWeeksList = [...weeksList, newPhase].sort((a, b) => a.week - b.week);

    // Sanitize initialDays to ensure well-formed WorkoutDay objects and prevent runtime crashes
    const sanitizedDays: WorkoutDay[] = Array.isArray(initialDays)
      ? initialDays.map((d, idx) => ({
          ...d,
          id: d?.id || `w${newPhase.week}-day-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          dayNumber: d?.dayNumber ?? (idx + 1),
          dayNamePolish: d?.dayNamePolish || `Dzień ${idx + 1}`,
          title: d?.title || `Trening ${idx + 1}`,
          subtitle: d?.subtitle || 'Dzień treningowy',
          type: d?.type || 'FBW',
          durationMinutes: d?.durationMinutes ?? 60,
          summary: d?.summary || '',
          targetRpeRange: d?.targetRpeRange || `${newPhase.targetRPE || 8.0}`,
          targetRirRange: d?.targetRirRange || `${newPhase.targetRIR ?? 2}`,
          exercises: Array.isArray(d?.exercises)
            ? d.exercises.map((ex, exIdx) => ({
                ...ex,
                id: ex?.id || `ex-w${newPhase.week}-${exIdx + 1}-${Date.now()}`,
                name: ex?.name || `Ćwiczenie ${exIdx + 1}`,
                muscleGroup: ex?.muscleGroup || 'Inne',
                plannedSets: ex?.plannedSets ?? 3,
                targetRepsRange: ex?.targetRepsRange || '8-10',
                defaultWeightKg: ex?.defaultWeightKg ?? 20,
                targetRIR: ex?.targetRIR ?? (newPhase.targetRIR ?? 2),
                targetRPE: ex?.targetRPE ?? (newPhase.targetRPE ?? 8),
                restSeconds: ex?.restSeconds ?? 90,
                hyroxRelevance: ex?.hyroxRelevance || '',
                techniqueNotes: ex?.techniqueNotes || '',
              }))
            : [],
          runningSession: d?.runningSession,
          recoveryProtocols: Array.isArray(d?.recoveryProtocols) ? d.recoveryProtocols : [],
          sessionNotes: d?.sessionNotes || '',
        }))
      : [];

    const existingPlans = activeCycle.weeksPlansMap || {};
    const newPlansMap: Record<number, WorkoutDay[]> = {
      ...existingPlans,
      [newPhase.week]: sanitizedDays,
    };

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: newPhase.week,
      weeksList: updatedWeeksList,
      weeksPlansMap: newPlansMap,
    };
    handleUpdateCycle(updatedCycle);
  };

  // Add new day to active cycle's current week
  const handleAddDay = (dayData?: Partial<WorkoutDay>) => {
    let targetWeek = currentWeek;
    let targetWeeksList = [...weeksList];

    if (targetWeeksList.length === 0) {
      targetWeek = 1;
      const initialPhase: MesocyclePhase = {
        week: 1,
        name: 'Tydzień 1: Wprowadzenie',
        volumeMultiplier: 1.0,
        targetRPE: 8.0,
        targetRIR: 2,
        progressionNote: 'Pierwszy tydzień cyklu — zaplanuj pierwsze treningi.',
        isDeload: false,
      };
      targetWeeksList = [initialPhase];
    }

    const currentDays = getDaysForCycleWeek(activeCycle, targetWeek);
    const newDayNum = currentDays.length + 1;
    const polishDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
    const dayName = polishDays[(newDayNum - 1) % 7] || `Dzień ${newDayNum}`;

    const newDay: WorkoutDay = {
      id: `w${targetWeek}-day-${newDayNum}-${Date.now()}`,
      dayNumber: newDayNum,
      dayNamePolish: dayData?.dayNamePolish || dayName,
      title: dayData?.title || `Trening ${newDayNum} (${dayName})`,
      subtitle: dayData?.subtitle || 'Własny trening — dostosuj ćwiczenia, serie i obciążenia',
      type: dayData?.type || 'FBW',
      durationMinutes: dayData?.durationMinutes || 60,
      summary: dayData?.summary || 'Własny dzień treningowy',
      targetRpeRange: dayData?.targetRpeRange || '8.0',
      targetRirRange: dayData?.targetRirRange || '2',
      exercises: dayData?.exercises || [],
      runningSession: dayData?.runningSession,
      sessionNotes: dayData?.sessionNotes || '',
    };

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: targetWeek,
      weeksList: targetWeeksList,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [targetWeek]: [...currentDays, newDay],
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Delete day from active cycle's current week
  const handleDeleteDay = (dayId: string) => {
    const remainingDays = currentWeekDays
      .filter((d) => d.id !== dayId)
      .map((d, idx) => ({
        ...d,
        dayNumber: idx + 1,
      }));

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [currentWeek]: remainingDays,
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Delete week from active cycle
  const handleDeleteWeek = (weekNumber: number) => {
    const updatedWeeksList = weeksList.filter((w) => w.week !== weekNumber);
    const updatedPlansMap = { ...(activeCycle.weeksPlansMap || {}) };
    delete updatedPlansMap[weekNumber];

    const nextWeek = updatedWeeksList.length > 0 ? updatedWeeksList[0].week : 1;

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      currentWeek: nextWeek,
      weeksList: updatedWeeksList,
      weeksPlansMap: updatedPlansMap,
    };
    handleUpdateCycle(updatedCycle);
  };

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser) => {
        setUser(authenticatedUser);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setIsAuthLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Google sign in / sign out
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
      }
    } catch (err: any) {
      console.error('Błąd logowania Google:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err: any) {
      console.error('Błąd wylogowania:', err);
    }
  };

  // Link spreadsheet
  const handleSpreadsheetLinked = (id: string) => {
    setSpreadsheetId(id);
    try {
      localStorage.setItem('hyrox_spreadsheet_id', id);
    } catch (e) {
      console.warn(e);
    }
  };

  // Save workout logs with deduplication to prevent set explosion on re-runs
  const handleSaveLogs = (newEntries: WorkoutLogEntry[]) => {
    if (!newEntries || newEntries.length === 0) return;
    const combined = [...workoutLogs, ...newEntries];
    const updated = deduplicateWorkoutLogs(combined);
    setWorkoutLogs(updated);
    try {
      localStorage.setItem('hyrox_workout_logs', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete single workout log entry
  const handleDeleteWorkoutLogEntry = (logId: string) => {
    const updated = workoutLogs.filter((l) => l.id !== logId);
    setWorkoutLogs(updated);
    try {
      localStorage.setItem('hyrox_workout_logs', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete entire workout session
  const handleDeleteWorkoutSession = (sessionId: string, dateStr: string) => {
    const updated = workoutLogs.filter((l) => {
      const matchSession = l.sessionId === sessionId;
      const matchFallback =
        !l.sessionId &&
        (l.dateStr || l.timestamp?.split('T')[0]) === dateStr &&
        l.dayId === sessionId;
      return !matchSession && !matchFallback;
    });
    setWorkoutLogs(updated);
    try {
      localStorage.setItem('hyrox_workout_logs', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Start rest timer
  const handleStartRestTimer = (seconds: number) => {
    setTimerInitialSeconds(seconds);
    setIsTimerOpen(true);
  };

  // Save Hyrox race trial
  const handleSaveHyroxTrial = async (trial: HyroxRaceTrial) => {
    if (spreadsheetId) {
      try {
        await appendHyroxTrialToSheet(spreadsheetId, trial);
      } catch (err) {
        console.warn('Nie udało się automatycznie zsynchronizować próby do Sheets:', err);
      }
    }
  };

  // Save recovery data
  const handleSaveRecovery = (data: DailyRecoveryData) => {
    const updated = [data, ...recoveryHistory.filter((x) => x.date !== data.date)];
    setRecoveryHistory(updated);
    try {
      localStorage.setItem('hyrox_recovery_history', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Header with Active Cycle Switcher & Controls */}
      <Header
        activeCycle={activeCycle}
        cyclesList={cyclesList}
        onSelectCycle={handleSelectCycle}
        currentWeek={currentWeek}
        totalWeeksCount={weeksList.length}
        weeksList={weeksList}
        onWeekChange={handleWeekChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        spreadsheetId={spreadsheetId}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onToggleTimer={() => setIsTimerOpen(!isTimerOpen)}
        isTimerOpen={isTimerOpen}
        onOpenCatalog={() => setIsCatalogSidebarOpen(true)}
        onOpenAddWeekModal={() => setIsAddWeekModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'plan' && (
          <WeeklyPlanView
            activeCycle={activeCycle}
            currentWeek={currentWeek}
            totalWeeksCount={weeksList.length}
            weekPlan={currentWeekDays}
            onStartWorkout={(day) => setActiveWorkoutDay(day)}
            onOpenSimulator={() => setActiveTab('hyrox-sim')}
            onOpenRecovery={() => setActiveTab('recovery')}
            onUpdateDay={handleUpdateDay}
            onResetPlanToDefault={handleResetPlanToDefault}
            onOpenCatalog={() => setIsCatalogSidebarOpen(true)}
            onOpenAddWeekModal={() => setIsAddWeekModalOpen(true)}
            onCopyDayToWeek={handleCopyDayToWeek}
            onCopyEntireWeekTo={handleCopyEntireWeekTo}
            onAddDay={handleAddDay}
            onDeleteDay={handleDeleteDay}
            onDeleteWeek={handleDeleteWeek}
            onWeekChange={handleWeekChange}
            workoutLogs={workoutLogs}
            onSaveLogs={handleSaveLogs}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryCalendarView
            workoutLogs={workoutLogs}
            onAddWorkoutLogs={handleSaveLogs}
            onDeleteWorkoutLogEntry={handleDeleteWorkoutLogEntry}
            onDeleteWorkoutSession={handleDeleteWorkoutSession}
          />
        )}

        {activeTab === 'volume' && (
          <VolumeMatrixView
            currentWeek={currentWeek}
            workoutLogs={workoutLogs}
            weekPlan={currentWeekDays}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        )}

        {activeTab === 'hyrox-sim' && (
          <HyroxRaceSimulator
            onSaveTrial={handleSaveHyroxTrial}
            isSheetsConnected={!!spreadsheetId}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        )}

        {activeTab === 'progression' && (
          <Progression1RMView
            currentWeek={currentWeek}
            onSelectWeek={handleWeekChange}
            workoutLogs={workoutLogs}
            totalWeeksCount={weeksList.length}
            weeksList={weeksList}
            allWeeksPlans={activeCycle.weeksPlansMap || {}}
          />
        )}

        {activeTab === 'recovery' && (
          <RecoveryTrackerView
            workoutLogs={workoutLogs}
            recoveryHistory={recoveryHistory}
            onSaveRecovery={handleSaveRecovery}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-bold text-neutral-400 font-heading">
              AKTYWNY CYKL: {activeCycle.name.toUpperCase()}
            </span>
            <span>• Zarządzanie Cyklami Treningowymi (Hyrox / Masa / Redukcja)</span>
          </div>
          <div>
            Niezależne Mezocykle • Kopiowanie Tygodni • Wykresy Progresu • Google Sheets
          </div>
        </div>
      </footer>

      {/* Left Slide-out Catalog Drawer (Training Cycles Manager) */}
      <TrainingCatalogSidebar
        isOpen={isCatalogSidebarOpen}
        onClose={() => setIsCatalogSidebarOpen(false)}
        cyclesList={cyclesList}
        activeCycleId={activeCycleId}
        onSelectCycle={handleSelectCycle}
        onCreateCycle={handleCreateCycle}
        onUpdateCycle={handleUpdateCycle}
        onDeleteCycle={handleDeleteCycle}
      />

      {/* Add New Week Modal */}
      {isAddWeekModalOpen && (
        <AddWeekModal
          isOpen={isAddWeekModalOpen}
          onClose={() => setIsAddWeekModalOpen(false)}
          existingWeeks={weeksList || []}
          currentWeekDays={currentWeekDays || []}
          onAddWeek={handleAddWeek}
        />
      )}

      {/* Active Workout Logger Modal */}
      {activeWorkoutDay && (
        <WorkoutLoggerModal
          day={activeWorkoutDay}
          currentWeek={currentWeek}
          isOpen={!!activeWorkoutDay}
          onClose={() => setActiveWorkoutDay(null)}
          onSaveLogs={handleSaveLogs}
          onStartRestTimer={handleStartRestTimer}
          isSheetsConnected={!!spreadsheetId}
          onUpdateDayExercises={(exs) => handleUpdateDayExercises(activeWorkoutDay.id, exs)}
          workoutLogs={workoutLogs}
          allWeeksPlans={activeCycle.weeksPlansMap || {}}
          weeksList={weeksList}
          onSwitchDay={(targetWeek, targetDay) => {
            handleWeekChange(targetWeek);
            setActiveWorkoutDay(targetDay);
          }}
          onMoveDay={handleMoveDay}
        />
      )}

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        user={user}
        spreadsheetId={spreadsheetId}
        onSpreadsheetLinked={handleSpreadsheetLinked}
        onGoogleSignIn={handleGoogleSignIn}
        workoutLogs={workoutLogs}
      />

      {/* Floating Rest Timer */}
      <RestTimer
        initialSeconds={timerInitialSeconds}
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
      />
    </div>
  );
}
