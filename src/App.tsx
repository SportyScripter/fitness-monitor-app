/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/layout/Header';
import { BottomNavBar, MainNavTab } from './components/layout/BottomNavBar';
import { CycleEditView } from './components/views/CycleEditView';
import { WorkoutExecutionView } from './components/views/WorkoutExecutionView';
import { MoreMenuView, MoreSubView } from './components/views/MoreMenuView';
import { WeeklyPlanView } from './components/views/WeeklyPlanView';
import { VolumeMatrixView } from './components/views/VolumeMatrixView';
import { HyroxRaceSimulator } from './components/features/HyroxRaceSimulator';
import { Progression1RMView } from './components/views/Progression1RMView';
import { RecoveryTrackerView } from './components/views/RecoveryTrackerView';
import { WorkoutLoggerModal } from './components/modals/WorkoutLoggerModal';
import { GoogleSheetsModal } from './components/modals/GoogleSheetsModal';
import { RestTimer } from './components/features/RestTimer';
import { TrainingCatalogSidebar } from './components/layout/TrainingCatalogSidebar';
import { AddWeekModal } from './components/modals/AddWeekModal';
import { SummaryCalendarView } from './components/views/SummaryCalendarView';
import { LoginView } from './components/auth/LoginView';
import { SyncConflictModal } from './components/modals/SyncConflictModal';
import { useAuth } from './context/AuthContext';
import {
  checkCloudSyncStatus,
  uploadLocalDataToCloud,
  applyCloudDataToLocalStorage,
  subscribeToCycles,
  subscribeToWorkoutLogs,
  subscribeToRecovery,
  saveCycleToFirestore,
  deleteCycleFromFirestore,
  saveActiveCycleId,
  saveWorkoutLogsBatch,
  deleteWorkoutLogEntry,
  deleteWorkoutSessionLogs,
  saveRecoveryEntry,
  markDeviceMigrated,
  isDeviceMigrated,
  readLocalTrainingData,
  LOCAL_STORAGE_CYCLES_KEY,
  LOCAL_STORAGE_ACTIVE_CYCLE_KEY,
  LOCAL_STORAGE_LOGS_KEY,
  LOCAL_STORAGE_RECOVERY_KEY,
  CloudSyncStatus
} from './services/firestoreService';
import { appendHyroxTrialToSheet } from './services/sheets';
import { Dumbbell } from 'lucide-react';
import {
  WorkoutDay,
  WorkoutLogEntry,
  HyroxRaceTrial,
  DailyRecoveryData,
  MesocyclePhase,
  TrainingCycleCatalog,
  Exercise,
  DayType,
  normalizeMuscleGroup
} from './types/hyrox';
import { MASTER_HYROX_WEEK_PLAN, MESOCYCLE_WEEKS } from './data/hyroxPlanData';
import { DEFAULT_TRAINING_CYCLES, MASA_WEEK_PLAN, REDUKCJA_WEEK_PLAN } from './data/defaultCycles';
import { getLocalDateString, extractLogDate, compareLogsDescending } from './utils/dateUtils';

type ThemeMode = 'dark' | 'light';
const THEME_STORAGE_KEY = 'training_app_theme';

const getInitialTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore localStorage access issues in private browsing / SSR-like environments
  }

  try {
    const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return preferredDark ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
};

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
  const { user, loading: isAuthLoading, signIn: handleGoogleSignIn, signOut: handleGoogleSignOut } = useAuth();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage issues
    }
  }, [theme]);

  // Training Cycles List - initialized from localStorage for offline/guest support
  const [cyclesList, setCyclesList] = useState<TrainingCycleCatalog[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_training_cycles_list');
      if (saved) {
        const parsed: TrainingCycleCatalog[] = JSON.parse(saved);
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

  // 4 Bottom Navigation tabs: 'edit' | 'workout' | 'calendar' | 'more'
  const [activeTab, setActiveTab] = useState<MainNavTab>('workout');
  const [moreSubView, setMoreSubView] = useState<MoreSubView>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('hyrox_spreadsheet_id');
    } catch {
      return null;
    }
  });

  // Workout logs initialized from local storage
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_workout_logs');
      if (!saved) return [];
      const parsed: WorkoutLogEntry[] = JSON.parse(saved);
      return sanitizeAndDeduplicateLogs(parsed);
    } catch {
      return [];
    }
  });

  // Recovery logs initialized from local storage
  const [recoveryHistory, setRecoveryHistory] = useState<DailyRecoveryData[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_recovery_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync Conflict & Initialization State
  const [hasDataConflict, setHasDataConflict] = useState<boolean>(false);
  const [isSyncInitialized, setIsSyncInitialized] = useState<boolean>(false);
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    cloudStatus: CloudSyncStatus | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    cloudStatus: null,
    isLoading: false,
  });

  const syncedUserRef = useRef<string | null>(null);

  // Initial Sync & Migration Orchestration
  // Enforces Rule 1 (local data priority when cloud is empty) and Rule 2 (hard stop on conflict)
  useEffect(() => {
    if (!user?.uid) {
      syncedUserRef.current = null;
      setIsSyncInitialized(false);
      setHasDataConflict(false);
      setConflictModal({ isOpen: false, cloudStatus: null, isLoading: false });
      return;
    }

    if (syncedUserRef.current === user.uid) return;

    let isMounted = true;
    setIsDataLoading(true);

    checkCloudSyncStatus(user.uid)
      .then(async (status) => {
        if (!isMounted || !status) return;

        const { hasCloudData, isDeviceMigrated: deviceMigrated, localData } = status;
        const hasLocalData = localData.hasAnyData;

        // RULE 2: Wymuszenie Modala przy konflikcie (Twardy Stop):
        // Jeśli chmura MA dane ORAZ localStorage MA dane (i brak flagi migracji na tym urządzeniu),
        // funkcja musi natychmiast przerwać inicjalizację i ustawić stan hasDataConflict: true.
        // Modal z wyborem MUSI fizycznie blokować interfejs. Aplikacja nie ma prawa dotknąć localStorage ani Firestore!
        if (hasCloudData && hasLocalData && !deviceMigrated) {
          console.warn('[Sync] Wykryto konflikt: dane na telefonie i w chmurze. Blokada interfejsu (Twardy Stop).');
          setHasDataConflict(true);
          setConflictModal({
            isOpen: true,
            cloudStatus: status,
            isLoading: false,
          });
          setIsDataLoading(false);
          return; // STOP! Do not touch storage, do not attach listeners.
        }

        // RULE 1: Zakaz nadpisywania lokalnych danych przy pierwszym logowaniu:
        // Jeśli Firestore jest pusty, a w localStorage znajdują się JAKIEKOLWIEK dane (cykle/logi),
        // funkcja inicjalizująca musi BEZWZGLĘDNIE zapisać je do chmury.
        // Wczytanie domyślnego planu (DEFAULT_TRAINING_CYCLES) może nastąpić TYLKO wtedy, gdy ZARÓWNO chmura, jak i localStorage są całkowicie puste.
        if (!hasCloudData && hasLocalData) {
          console.log('[Sync] Firestore pusty, wykryto dane lokalne. Zapisywanie danych z telefonu do chmury...');
          const cyclesToUpload = localData.cycles.length > 0 ? localData.cycles : (cyclesList.length > 0 ? cyclesList : DEFAULT_TRAINING_CYCLES);
          const activeIdToUpload = localData.activeCycleId || activeCycleId || cyclesToUpload[0].id;
          const logsToUpload = localData.logs.length > 0 ? localData.logs : workoutLogs;
          const recoveryToUpload = localData.recovery.length > 0 ? localData.recovery : recoveryHistory;

          await uploadLocalDataToCloud(user.uid, {
            cycles: cyclesToUpload,
            activeCycleId: activeIdToUpload,
            logs: logsToUpload,
            recovery: recoveryToUpload,
          });

          markDeviceMigrated(user.uid);
          syncedUserRef.current = user.uid;
          setIsSyncInitialized(true);
          setIsDataLoading(false);
          return;
        }

        // Case 3: Cloud has data, Local is empty (e.g. fresh phone/clean browser of existing user)
        if (hasCloudData && !hasLocalData) {
          console.log('[Sync] Pobieranie danych z konta chmurowego...');
          setCyclesList(status.cloudCycles);
          setActiveCycleId(status.cloudActiveCycleId);
          setWorkoutLogs(status.cloudLogs);
          setRecoveryHistory(status.cloudRecovery);
          applyCloudDataToLocalStorage({
            cycles: status.cloudCycles,
            activeCycleId: status.cloudActiveCycleId,
            logs: status.cloudLogs,
            recovery: status.cloudRecovery,
          });
          markDeviceMigrated(user.uid);
          syncedUserRef.current = user.uid;
          setIsSyncInitialized(true);
          setIsDataLoading(false);
          return;
        }

        // Case 4: BOTH cloud AND localStorage are completely empty!
        // TYLKO W TYM PRZYPADKU wczytujemy DEFAULT_TRAINING_CYCLES!
        if (!hasCloudData && !hasLocalData) {
          console.log('[Sync] Zarówno chmura jak i localStorage są puste. Wczytywanie domyślnego planu...');
          const defaultCycles = DEFAULT_TRAINING_CYCLES;
          const defaultActive = defaultCycles[0].id;
          setCyclesList(defaultCycles);
          setActiveCycleId(defaultActive);
          applyCloudDataToLocalStorage({
            cycles: defaultCycles,
            activeCycleId: defaultActive,
            logs: [],
            recovery: [],
          });
          await uploadLocalDataToCloud(user.uid, {
            cycles: defaultCycles,
            activeCycleId: defaultActive,
            logs: [],
            recovery: [],
          });
          markDeviceMigrated(user.uid);
          syncedUserRef.current = user.uid;
          setIsSyncInitialized(true);
          setIsDataLoading(false);
          return;
        }

        // Case 5: Already migrated on this device (deviceMigrated === true)
        if (deviceMigrated) {
          if (hasCloudData) {
            setCyclesList(status.cloudCycles);
            setActiveCycleId(status.cloudActiveCycleId);
            setWorkoutLogs(status.cloudLogs);
            setRecoveryHistory(status.cloudRecovery);
          }
          syncedUserRef.current = user.uid;
          setIsSyncInitialized(true);
          setIsDataLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Błąd sprawdzania statusu chmury:', err);
        setIsDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Firestore Realtime Subscriptions
  // Runs ONLY after initial sync / migration has completed and there is NO active conflict!
  useEffect(() => {
    if (!user?.uid || !isSyncInitialized || hasDataConflict) {
      return;
    }

    const unsubCycles = subscribeToCycles(user.uid, (cycles) => {
      if (cycles && cycles.length > 0) {
        setCyclesList(cycles);
        try {
          localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(cycles));
        } catch {}
      }
    });

    const unsubLogs = subscribeToWorkoutLogs(user.uid, (logs) => {
      setWorkoutLogs(logs);
      try {
        localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs));
      } catch {}
    });

    const unsubRecovery = subscribeToRecovery(user.uid, (rec) => {
      setRecoveryHistory(rec);
      try {
        localStorage.setItem(LOCAL_STORAGE_RECOVERY_KEY, JSON.stringify(rec));
      } catch {}
    });

    return () => {
      unsubCycles();
      unsubLogs();
      unsubRecovery();
    };
  }, [user?.uid, isSyncInitialized, hasDataConflict]);

  // Modal Action 1: "Wyślij dane z telefonu do chmury"
  const handleKeepLocalAndUpload = async () => {
    if (!user?.uid || !conflictModal.cloudStatus) return;
    try {
      setConflictModal((prev) => ({ ...prev, isLoading: true }));
      const localData = conflictModal.cloudStatus.localData;
      const cyclesToUpload = localData.cycles.length > 0 ? localData.cycles : cyclesList;
      const activeIdToUpload = localData.activeCycleId || activeCycleId || cyclesToUpload[0]?.id;
      const logsToUpload = localData.logs.length > 0 ? localData.logs : workoutLogs;
      const recoveryToUpload = localData.recovery.length > 0 ? localData.recovery : recoveryHistory;

      await uploadLocalDataToCloud(user.uid, {
        cycles: cyclesToUpload,
        activeCycleId: activeIdToUpload,
        logs: logsToUpload,
        recovery: recoveryToUpload,
      });

      markDeviceMigrated(user.uid);
      syncedUserRef.current = user.uid;
      setHasDataConflict(false);
      setConflictModal({ isOpen: false, cloudStatus: null, isLoading: false });
      setIsSyncInitialized(true);
    } catch (err) {
      console.error('Błąd wysyłania danych do chmury:', err);
      setConflictModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Modal Action 2: "Pobierz stan z chmury"
  const handleDownloadCloudAndOverwrite = async () => {
    if (!user?.uid || !conflictModal.cloudStatus) return;
    try {
      setConflictModal((prev) => ({ ...prev, isLoading: true }));
      const status = conflictModal.cloudStatus;
      setCyclesList(status.cloudCycles);
      setActiveCycleId(status.cloudActiveCycleId);
      setWorkoutLogs(status.cloudLogs);
      setRecoveryHistory(status.cloudRecovery);
      applyCloudDataToLocalStorage({
        cycles: status.cloudCycles,
        activeCycleId: status.cloudActiveCycleId,
        logs: status.cloudLogs,
        recovery: status.cloudRecovery,
      });
      markDeviceMigrated(user.uid);
      syncedUserRef.current = user.uid;
      setHasDataConflict(false);
      setConflictModal({ isOpen: false, cloudStatus: null, isLoading: false });
      setIsSyncInitialized(true);
    } catch (err) {
      console.error('Błąd pobierania danych z chmury:', err);
      setConflictModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Modals & Drawers
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<WorkoutDay | null>(null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(90);
  const [isCatalogSidebarOpen, setIsCatalogSidebarOpen] = useState(false);
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);

  // Helper to persist updated cycles (both localStorage and Firestore)
  const persistCycles = (updatedCycles: TrainingCycleCatalog[]) => {
    setCyclesList(updatedCycles);
    try {
      localStorage.setItem('hyrox_training_cycles_list', JSON.stringify(updatedCycles));
    } catch (e) {
      console.warn(e);
    }
    if (user?.uid) {
      updatedCycles.forEach((c) => {
        saveCycleToFirestore(user.uid, c).catch((err) =>
          console.warn('Błąd zapisu cyklu do Firestore:', err)
        );
      });
    }
  };

  // Select another cycle as active - immediately switches to "Trening" and finds next uncompleted day
  const handleSelectCycle = (cycleId: string) => {
    setActiveCycleId(cycleId);
    try {
      localStorage.setItem('hyrox_active_cycle_id', cycleId);
    } catch (e) {
      console.warn(e);
    }
    if (user?.uid) {
      saveActiveCycleId(user.uid, cycleId).catch((err) =>
        console.warn('Błąd zapisu aktywnego cyklu do Firestore:', err)
      );
    }

    const selectedCycle = cyclesList.find((c) => c.id === cycleId) || cyclesList[0];
    const targetWeek = selectedCycle.currentWeek || 1;
    const days = getDaysForCycleWeek(selectedCycle, targetWeek);

    // Find next uncompleted workout day in this cycle (non-rest day without completed logs)
    let targetDay = days.find((d) => {
      if (d.type === 'REST_RECOVERY') return false;
      const hasLogs = workoutLogs.some(
        (l) => l.dayId === d.id || (l.dayTitle === d.title && (l.dayId?.startsWith(`w${targetWeek}-`) || !l.dayId))
      );
      return !hasLogs;
    });

    if (!targetDay) {
      targetDay = days.find((d) => d.type !== 'REST_RECOVERY') || days[0];
    }

    if (targetDay) {
      setSelectedDayId(targetDay.id);
    }

    // Switch view to "Trening" (main action)
    setActiveTab('workout');
    setMoreSubView(null);
  };

  // Synchronize selectedDayId on week or cycle change
  useEffect(() => {
    if (currentWeekDays && currentWeekDays.length > 0) {
      const exists = currentWeekDays.some((d) => d && d.id === selectedDayId);
      if (!exists) {
        const nextUncompleted = currentWeekDays.find((d) => {
          if (d.type === 'REST_RECOVERY') return false;
          return !workoutLogs.some(
            (l) => l.dayId === d.id || (l.dayTitle === d.title && (l.dayId?.startsWith(`w${currentWeek}-`) || !l.dayId))
          );
        }) || currentWeekDays.find((d) => d.type !== 'REST_RECOVERY') || currentWeekDays[0];

        setSelectedDayId(nextUncompleted.id);
      }
    }
  }, [currentWeek, activeCycleId, currentWeekDays, selectedDayId, workoutLogs]);

  // Create new cycle
  const handleCreateCycle = (newCycle: TrainingCycleCatalog) => {
    const updated = [...cyclesList, newCycle];
    setCyclesList(updated);
    if (user?.uid) {
      saveCycleToFirestore(user.uid, newCycle).catch(console.warn);
      saveActiveCycleId(user.uid, newCycle.id).catch(console.warn);
    }
    handleSelectCycle(newCycle.id);
  };

  // Update existing cycle
  const handleUpdateCycle = (updatedCycle: TrainingCycleCatalog) => {
    const updated = cyclesList.map((c) => (c.id === updatedCycle.id ? updatedCycle : c));
    setCyclesList(updated);
    if (user?.uid) {
      saveCycleToFirestore(user.uid, updatedCycle).catch(console.warn);
    }
  };

  // Delete cycle
  const handleDeleteCycle = (cycleId: string) => {
    if (cyclesList.length <= 1) return;
    const updated = cyclesList.filter((c) => c.id !== cycleId);
    setCyclesList(updated);
    if (user?.uid) {
      deleteCycleFromFirestore(user.uid, cycleId).catch(console.warn);
    }
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
      const baseW = maxLoggedWeight > 0 ? maxLoggedWeight : (parseFloat(String(ex.defaultWeightKg ?? (ex as any).weight ?? 0)) || 0);

      const isCardio = ex.category === 'cardio' || ex.exerciseType === 'RUNNING';
      const hasDelta = progressionDeltaKg > 0 && !isCardio && baseW > 0;
      const progressedWeight = hasDelta
        ? Number((baseW + progressionDeltaKg).toFixed(1))
        : (parseFloat(String(ex.defaultWeightKg ?? (ex as any).weight ?? baseW)) || baseW);

      const updatedSetsDetails = Array.isArray(ex.plannedSetsDetails)
        ? ex.plannedSetsDetails.map((s, sIdx) => {
            const setW = parseFloat(String(s.weightKg ?? s.weight ?? baseW)) || 0;
            const finalW = hasDelta ? Number((setW + progressionDeltaKg).toFixed(1)) : setW;
            return {
              ...s,
              setNumber: s.setNumber || sIdx + 1,
              weightKg: finalW,
              weight: finalW,
              completed: false,
              isCompleted: false,
            };
          })
        : undefined;

      const primaryW = updatedSetsDetails && updatedSetsDetails.length > 0
        ? (updatedSetsDetails[0].weightKg ?? updatedSetsDetails[0].weight ?? progressedWeight)
        : progressedWeight;

      return {
        ...ex,
        id: `ex-w${targetWeek}-${(ex.name || 'ex').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
        defaultWeightKg: primaryW,
        weight: primaryW,
        weightKg: primaryW,
        targetWeight: primaryW,
        isCompleted: false,
        completed: false,
        loggedSets: [],
        completedSets: [],
        plannedSetsDetails: updatedSetsDetails,
      };
    });

    const newDay: WorkoutDay = {
      ...sourceDay,
      id: `w${targetWeek}-day-${targetDayNumber}-${Date.now()}`,
      dayNumber: targetDayNumber,
      dayNamePolish: targetDayName,
      title: sourceDay.title,
      isCompleted: false,
      completed: false,
      loggedSets: [],
      completedSets: [],
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
      isCompleted: false,
      completed: false,
      loggedSets: [],
      completedSets: [],
      exercises: (d.exercises || []).map((ex) => {
        const isCardio = ex.category === 'cardio' || ex.exerciseType === 'RUNNING';
        const hasDelta = progressionDeltaKg > 0 && !isCardio;
        const currentW = parseFloat(String(ex.defaultWeightKg ?? (ex as any).weight ?? 0).replace(',', '.')) || 0;
        const newWeight = hasDelta
          ? Number((currentW + progressionDeltaKg).toFixed(2))
          : currentW;
        const updatedDetails = Array.isArray(ex.plannedSetsDetails)
          ? ex.plannedSetsDetails.map((s, sIdx) => {
              const setW = parseFloat(String(s.weightKg ?? s.weight ?? currentW).replace(',', '.')) || 0;
              const finalSetW = hasDelta
                ? Number((setW + progressionDeltaKg).toFixed(2))
                : setW;
              return {
                ...s,
                setNumber: s.setNumber || sIdx + 1,
                weightKg: finalSetW,
                weight: finalSetW,
                completed: false,
                isCompleted: false,
              };
            })
          : undefined;

        const primaryW = updatedDetails && updatedDetails.length > 0 && (updatedDetails[0].weightKg !== undefined || updatedDetails[0].weight !== undefined)
          ? (updatedDetails[0].weightKg ?? updatedDetails[0].weight ?? newWeight)
          : newWeight;

        return {
          ...ex,
          id: `ex-w${targetWeek}-${(ex.name || 'ex').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
          defaultWeightKg: primaryW,
          weight: primaryW,
          weightKg: primaryW,
          targetWeight: primaryW,
          isCompleted: false,
          completed: false,
          loggedSets: [],
          completedSets: [],
          plannedSetsDetails: updatedDetails,
        };
      }),
      runningSession: d.runningSession ? JSON.parse(JSON.stringify(d.runningSession)) : undefined,
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
          isCompleted: false,
          completed: false,
          loggedSets: [],
          completedSets: [],
          exercises: Array.isArray(d?.exercises)
            ? d.exercises.map((ex, exIdx) => {
                const sets = Array.isArray(ex?.plannedSetsDetails)
                  ? ex.plannedSetsDetails.map((s, sIdx) => ({
                      ...s,
                      setNumber: s.setNumber || sIdx + 1,
                      completed: false,
                      isCompleted: false,
                    }))
                  : undefined;
                const primaryW = (sets && sets.length > 0 && (sets[0].weightKg !== undefined || sets[0].weight !== undefined))
                  ? (sets[0].weightKg ?? sets[0].weight ?? ex?.defaultWeightKg ?? 20)
                  : ((ex?.defaultWeightKg !== undefined) ? ex.defaultWeightKg : (ex?.weight ?? 20));

                return {
                  ...ex,
                  id: ex?.id || `ex-w${newPhase.week}-${exIdx + 1}-${Date.now()}`,
                  name: ex?.name || `Ćwiczenie ${exIdx + 1}`,
                  muscleGroup: ex?.muscleGroup ? normalizeMuscleGroup(ex.muscleGroup) : undefined,
                  plannedSets: sets ? sets.length : (ex?.plannedSets ?? 3),
                  targetRepsRange: ex?.targetRepsRange || '8-10',
                  defaultWeightKg: primaryW,
                  weight: primaryW,
                  weightKg: primaryW,
                  targetWeight: primaryW,
                  isCompleted: false,
                  completed: false,
                  loggedSets: [],
                  completedSets: [],
                  targetRIR: ex?.targetRIR ?? (newPhase.targetRIR ?? 2),
                  targetRPE: ex?.targetRPE ?? (newPhase.targetRPE ?? 8),
                  restSeconds: ex?.restSeconds ?? 90,
                  hyroxRelevance: ex?.hyroxRelevance || '',
                  techniqueNotes: ex?.techniqueNotes || '',
                  plannedSetsDetails: sets,
                };
              })
            : [],
          runningSession: d?.runningSession ? JSON.parse(JSON.stringify(d.runningSession)) : undefined,
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

  // Link spreadsheet
  const handleSpreadsheetLinked = (id: string) => {
    setSpreadsheetId(id);
    try {
      localStorage.setItem('hyrox_spreadsheet_id', id);
    } catch (e) {
      console.warn(e);
    }
  };

  // Save workout logs with deduplication and write to both localStorage and Firestore
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
    if (user?.uid) {
      saveWorkoutLogsBatch(user.uid, newEntries).catch(console.warn);
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
    if (user?.uid) {
      deleteWorkoutLogEntry(user.uid, logId).catch(console.warn);
    }
  };

  // Delete entire workout session
  const handleDeleteWorkoutSession = (sessionId: string, dateStr: string) => {
    const currentSnapshot = [...workoutLogs];
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
    if (user?.uid) {
      deleteWorkoutSessionLogs(user.uid, sessionId, dateStr, currentSnapshot).catch(console.warn);
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

  // Save recovery data to both localStorage and Firestore
  const handleSaveRecovery = (data: DailyRecoveryData) => {
    const updated = [data, ...recoveryHistory.filter((x) => x.date !== data.date)];
    setRecoveryHistory(updated);
    try {
      localStorage.setItem('hyrox_recovery_history', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    if (user?.uid) {
      saveRecoveryEntry(user.uid, data).catch(console.warn);
    }
  };

  return (
    <div
      className={`app-shell min-h-screen flex flex-col justify-start px-0 pt-0 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-[#f4efe8] text-neutral-900'
      }`}
    >
      <div className="mx-auto w-full max-w-[2200px] px-0 sm:px-2 lg:px-3 lg:py-3">
        <div
          className={`relative mx-auto w-full overflow-hidden border transition-colors duration-300 ${
            theme === 'dark'
              ? 'border-neutral-800 bg-neutral-950 shadow-[0_30px_80px_rgba(0,0,0,0.6)]'
              : 'border-[#e7dfd2] bg-[#f8f5f0] shadow-[0_25px_80px_rgba(92,71,39,0.12)] lg:rounded-[30px]'
          }`}
        >
          {/* Top Bar with "Zarządzaj cyklami", Quick Cycle Selector, Stoper & Sheets */}
          <Header
            activeCycle={activeCycle}
            cyclesList={cyclesList}
            onSelectCycle={handleSelectCycle}
            currentWeek={currentWeek}
            totalWeeksCount={weeksList.length}
            weeksList={weeksList}
            onWeekChange={handleWeekChange}
            user={user}
            spreadsheetId={spreadsheetId}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            onToggleTimer={() => setIsTimerOpen(!isTimerOpen)}
            isTimerOpen={isTimerOpen}
            onOpenCatalog={() => setIsCatalogSidebarOpen(true)}
            onOpenAddWeekModal={() => setIsAddWeekModalOpen(true)}
            theme={theme}
            onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          />

          {/* Main Content Area - All 4 main views remain mounted in DOM to guarantee ZERO state loss on tab switch */}
          <main className="flex-1 w-full mx-auto px-3 py-4 lg:px-5 lg:py-5 lg:max-w-[1800px]">
            {/* 1. Edycja: Zarządzanie strukturą wybranego cyklu, dodawanie ćwiczeń, tygodnie i parametry */}
            <div className={activeTab === 'edit' ? 'block' : 'hidden'}>
              <CycleEditView
                activeCycle={activeCycle}
                currentWeek={currentWeek}
                weeksList={weeksList}
                currentWeekDays={currentWeekDays}
                selectedDayId={selectedDayId}
                onSelectDayId={setSelectedDayId}
                onWeekChange={handleWeekChange}
                onOpenAddWeekModal={() => setIsAddWeekModalOpen(true)}
                onDeleteWeek={handleDeleteWeek}
                onUpdateDay={handleUpdateDay}
                onAddDay={handleAddDay}
                onDeleteDay={handleDeleteDay}
                onResetPlanToDefault={handleResetPlanToDefault}
                onCopyDayToWeek={handleCopyDayToWeek}
                onCopyEntireWeekTo={handleCopyEntireWeekTo}
                workoutLogs={workoutLogs}
                onUpdatePhase={(updatedPhase) => {
                  const updatedWeeks = weeksList.map((w) => (w.week === updatedPhase.week ? updatedPhase : w));
                  handleUpdateCycle({
                    ...activeCycle,
                    weeksList: updatedWeeks,
                  });
                }}
              />
            </div>

            {/* 2. Trening (Główna akcja): Ekran realizacji treningu, zestaw ćwiczeń do odhaczenia na dany dzień */}
            <div className={activeTab === 'workout' ? 'block' : 'hidden'}>
              <WorkoutExecutionView
                activeCycle={activeCycle}
                currentWeek={currentWeek}
                weeksList={weeksList}
                currentWeekDays={currentWeekDays}
                selectedDayId={selectedDayId}
                onSelectDayId={setSelectedDayId}
                onStartWorkout={(day) => {
                  setActiveWorkoutDay(day);
                  setIsWorkoutMinimized(false);
                }}
                activeOngoingWorkoutDay={activeWorkoutDay}
                isWorkoutMinimized={isWorkoutMinimized}
                onMaximizeWorkout={() => setIsWorkoutMinimized(false)}
                onOpenSimulator={() => {
                  setActiveTab('more');
                  setMoreSubView('hyrox');
                }}
                onOpenRecovery={() => {
                  setActiveTab('more');
                  setMoreSubView('recovery');
                }}
                onUpdateDay={handleUpdateDay}
                workoutLogs={workoutLogs}
                onSaveLogs={handleSaveLogs}
                onWeekChange={handleWeekChange}
              />
            </div>

            {/* 3. Kalendarz / Historia: Widok ukończonych treningów i historii cyklu w stylu Strava */}
            <div className={activeTab === 'calendar' ? 'block' : 'hidden'}>
              <SummaryCalendarView
                workoutLogs={workoutLogs}
                onAddWorkoutLogs={handleSaveLogs}
                onDeleteWorkoutLogEntry={handleDeleteWorkoutLogEntry}
                onDeleteWorkoutSession={handleDeleteWorkoutSession}
              />
            </div>

            {/* 4. Więcej (Menu): Moduły analityczne (Strava, Tonaż, Hyrox, Progresja, Regeneracja) */}
            <div className={activeTab === 'more' ? 'block' : 'hidden'}>
              <MoreMenuView
                currentWeek={currentWeek}
                onWeekChange={handleWeekChange}
                workoutLogs={workoutLogs}
                recoveryHistory={recoveryHistory}
                onSaveRecovery={handleSaveRecovery}
                onSaveHyroxTrial={handleSaveHyroxTrial}
                activeCycle={activeCycle}
                currentWeekDays={currentWeekDays}
                weeksList={weeksList}
                spreadsheetId={spreadsheetId}
                onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                onToggleTimer={() => setIsTimerOpen(!isTimerOpen)}
                isTimerOpen={isTimerOpen}
                user={user}
                onGoogleSignIn={handleGoogleSignIn}
                onGoogleSignOut={handleGoogleSignOut}
                onAddWorkoutLogs={handleSaveLogs}
                onDeleteWorkoutLogEntry={handleDeleteWorkoutLogEntry}
                onDeleteWorkoutSession={handleDeleteWorkoutSession}
                subView={moreSubView}
                onSubViewChange={setMoreSubView}
              />
            </div>
          </main>

          {/* Sticky Bottom Navigation - 4 Touch-friendly Large Actions */}
          <BottomNavBar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab !== 'more') {
                setMoreSubView(null);
              }
            }}
          />

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
              onClose={() => {
                setActiveWorkoutDay(null);
                setIsWorkoutMinimized(false);
              }}
              isMinimized={isWorkoutMinimized}
              onToggleMinimize={(min) => setIsWorkoutMinimized(min)}
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

          {/* Cloud Sync Conflict Resolution Modal - Physical UI Blocking */}
          {hasDataConflict && conflictModal.cloudStatus && (
            <SyncConflictModal
              isOpen={hasDataConflict}
              localStats={{
                cyclesCount: conflictModal.cloudStatus.localData.cycles.length,
                logsCount: conflictModal.cloudStatus.localData.logs.length,
              }}
              cloudStats={{
                cyclesCount: conflictModal.cloudStatus.cloudCyclesCount,
                logsCount: conflictModal.cloudStatus.cloudLogsCount,
              }}
              onKeepLocalAndUpload={handleKeepLocalAndUpload}
              onDownloadCloudAndOverwrite={handleDownloadCloudAndOverwrite}
              isLoading={conflictModal.isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
