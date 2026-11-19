/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/layout/Header';
import { BottomNavBar, MainNavTab } from './components/layout/BottomNavBar';
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
  replaceCloudWithLocalData,
  pullCloudDataAndOverwriteLocal,
  applyCloudDataToLocalStorage,
  fetchCloudLastUpdated,
  readLocalLastUpdated,
  readLocalTrainingData,
  writeLocalLastUpdated,
  markDeviceMigrated,
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
import { DEFAULT_TRAINING_CYCLES } from './data/defaultCycles';
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

// Helper to safely resolve workout days for a given week of a training cycle.
// Never falls back to hardcoded/preset templates when a cycle has 0 weeks or a week is empty.
export const getDaysForCycleWeek = (cycle: TrainingCycleCatalog, weekNum: number): WorkoutDay[] => {
  if (!cycle || !weekNum) return [];

  const cycleWeeks = Array.isArray(cycle.weeksList) ? cycle.weeksList : [];
  if (cycleWeeks.length === 0) return [];
  if (!cycleWeeks.some((w) => w && w.week === weekNum)) return [];

  // Return only the explicitly stored workouts for this week (empty array [] if week has 0 workouts)
  if (cycle.weeksPlansMap && Array.isArray(cycle.weeksPlansMap[weekNum])) {
    return cycle.weeksPlansMap[weekNum].filter(Boolean).map((d, idx) => {
      const expectedPrefix = `w${weekNum}-`;
      const fixedId =
        d.id && d.id.startsWith(expectedPrefix)
          ? d.id
          : `w${weekNum}-${d.dayNumber || idx + 1}-${d.id || 'day'}`;
      return {
        ...d,
        id: fixedId,
      };
    });
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
      return [];
    } catch {
      return [];
    }
  });

  // Active Selected Cycle ID
  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hyrox_active_cycle_id');
      if (saved) return saved;
      const rawCycles = localStorage.getItem('hyrox_training_cycles_list');
      if (rawCycles) {
        const parsed = JSON.parse(rawCycles);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
      return '';
    } catch {
      return '';
    }
  });

  const activeCycle: TrainingCycleCatalog | null =
    cyclesList.find((c) => c.id === activeCycleId) ||
    cyclesList[0] ||
    null;
  const weeksList = activeCycle
    ? (activeCycle.weeksList !== undefined
        ? (Array.isArray(activeCycle.weeksList) ? activeCycle.weeksList : [])
        : (activeCycle.id?.includes('hyrox') ? MESOCYCLE_WEEKS : []))
    : [];
  const activeWeekPhase = weeksList.length > 0
    ? (weeksList.find((w) => w && w.week === activeCycle?.currentWeek) || weeksList[0] || null)
    : null;
  const currentWeek = activeWeekPhase ? activeWeekPhase.week : 0;
  const currentWeekDays: WorkoutDay[] =
    activeCycle && activeWeekPhase
      ? getDaysForCycleWeek(activeCycle, activeWeekPhase.week)
      : [];

  // 4 Bottom Navigation tabs: 'edit' | 'workout' | 'calendar' | 'more'
  const [activeTab, setActiveTab] = useState<MainNavTab>('workout');
  const [moreSubView, setMoreSubView] = useState<MoreSubView>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  // Scroll positions per tab to guarantee zero scroll jumping on tab switch
  const tabScrollPositions = useRef<Record<MainNavTab, number>>({
    edit: 0,
    workout: 0,
    calendar: 0,
    more: 0,
  });

  // Restore scroll position when activeTab changes
  useEffect(() => {
    const savedY = tabScrollPositions.current[activeTab] || 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedY, behavior: 'instant' });
    });
  }, [activeTab]);

  // Tab switch & double-click / active-tab click reset
  const handleTabChange = (tab: MainNavTab) => {
    if (activeTab === tab) {
      handleTabReset(tab);
    } else {
      tabScrollPositions.current[activeTab] = window.scrollY;
      setActiveTab(tab);
      // Keep-alive: preserve subviews across tabs
    }
  };

  const handleTabReset = (tab: MainNavTab) => {
    if (tab === 'more') {
      setMoreSubView(null);
    }
    tabScrollPositions.current[tab] = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Timestamp-based Manual Sync State
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => readLocalLastUpdated());
  const [cloudLastUpdated, setCloudLastUpdated] = useState<number | null>(null);
  const [syncActionState, setSyncActionState] = useState<{
    isLoading: boolean;
    action: 'pull' | 'push' | 'refresh' | null;
    message: string | null;
    error: string | null;
  }>({
    isLoading: false,
    action: null,
    message: null,
    error: null,
  });

  const touchLocalLastUpdated = (explicitTs?: number): number => {
    const ts = explicitTs ?? Date.now();
    setLastUpdated(ts);
    writeLocalLastUpdated(ts);
    return ts;
  };

  // Sync lastUpdated React state when measurements or other modules update localStorage
  useEffect(() => {
    const handleLocalUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ ts?: number }>;
      const ts = customEvent.detail?.ts ?? readLocalLastUpdated();
      if (ts) setLastUpdated(ts);
    };
    window.addEventListener('hyrox-local-updated', handleLocalUpdated);
    return () => window.removeEventListener('hyrox-local-updated', handleLocalUpdated);
  }, []);

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

  // Initial Login Sync (Smart Sync for empty devices only; otherwise preserve local state & fetch cloud timestamp)
  useEffect(() => {
    if (!user?.uid) {
      syncedUserRef.current = null;
      setIsSyncInitialized(false);
      setHasDataConflict(false);
      setCloudLastUpdated(null);
      setConflictModal({ isOpen: false, cloudStatus: null, isLoading: false });
      setSyncActionState({ isLoading: false, action: null, message: null, error: null });
      return;
    }

    if (syncedUserRef.current === user.uid) return;

    let isMounted = true;
    setIsDataLoading(true);

    checkCloudSyncStatus(user.uid)
      .then(async (status) => {
        if (!isMounted || !status) return;

        const { hasCloudData, localData, localLastUpdated } = status;
        const hasLocalData = localData.hasAnyData;
        const isFreshEmptyDevice = !hasLocalData && localLastUpdated === null;

        setCloudLastUpdated(status.cloudLastUpdated);

        // 4. Puste urządzenie (Smart Sync):
        // Jeśli localStorage jest puste i nie ma lastUpdated, pobierz cicho dokument z Firestore jako stan startowy
        if (isFreshEmptyDevice) {
          if (hasCloudData) {
            console.log('[Smart Sync] Puste urządzenie — pobieranie stanu startowego z chmury...');
            const syncedTs = status.cloudLastUpdated ?? Date.now();
            setCyclesList(status.cloudCycles);
            setActiveCycleId(status.cloudActiveCycleId);
            setWorkoutLogs(status.cloudLogs);
            setRecoveryHistory(status.cloudRecovery);
            setLastUpdated(syncedTs);
            setCloudLastUpdated(status.cloudLastUpdated ?? syncedTs);
            applyCloudDataToLocalStorage({
              cycles: status.cloudCycles,
              activeCycleId: status.cloudActiveCycleId,
              logs: status.cloudLogs,
              recovery: status.cloudRecovery,
              measurements: status.cloudMeasurements,
              lastUpdated: syncedTs,
            });
            markDeviceMigrated(user.uid);
            syncedUserRef.current = user.uid;
            setIsSyncInitialized(true);
            setIsDataLoading(false);
            return;
          }

          if (!status.isCloudAccountInitialized && !status.isCloudMigrated) {
            console.log('[Smart Sync] Całkowicie nowe konto — inicjalizacja planu startowego...');
            const initTs = Date.now();
            const defaultCycles = DEFAULT_TRAINING_CYCLES.map((c) => ({ ...c, lastUpdated: initTs }));
            const defaultActive = defaultCycles[0].id;
            setCyclesList(defaultCycles);
            setActiveCycleId(defaultActive);
            setLastUpdated(initTs);
            applyCloudDataToLocalStorage({
              cycles: defaultCycles,
              activeCycleId: defaultActive,
              logs: [],
              recovery: [],
              lastUpdated: initTs,
            });
            await replaceCloudWithLocalData(user.uid, {
              cycles: defaultCycles,
              activeCycleId: defaultActive,
              logs: [],
              recovery: [],
              lastUpdated: initTs,
            });
            setCloudLastUpdated(initTs);
            syncedUserRef.current = user.uid;
            setIsSyncInitialized(true);
            setIsDataLoading(false);
            return;
          }

          // Existing cloud account with 0 items on fresh device
          if (status.cloudLastUpdated) {
            setLastUpdated(status.cloudLastUpdated);
            writeLocalLastUpdated(status.cloudLastUpdated);
          }
          markDeviceMigrated(user.uid);
          syncedUserRef.current = user.uid;
          setIsSyncInitialized(true);
          setIsDataLoading(false);
          return;
        }

        // Device already has local data or local lastUpdated:
        // Never overwrite or auto-merge! User decides manually via "Więcej -> Synchronizacja danych".
        syncedUserRef.current = user.uid;
        setIsSyncInitialized(true);
        setIsDataLoading(false);
      })
      .catch((err) => {
        console.warn('Błąd sprawdzania statusu chmury:', err);
        setIsDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Refresh cloud timestamp whenever user visits "Więcej" tab
  useEffect(() => {
    if (activeTab === 'more' && user?.uid) {
      fetchCloudLastUpdated(user.uid)
        .then((ts) => {
          setCloudLastUpdated(ts);
        })
        .catch((err) => {
          console.warn('Nie udało się odświeżyć daty chmury:', err);
        });
    }
  }, [activeTab, user?.uid]);

  // Manual Sync Action: Refresh cloud timestamp on demand
  const handleRefreshCloudTimestamp = async () => {
    if (!user?.uid) return;
    setSyncActionState({ isLoading: true, action: 'refresh', message: null, error: null });
    try {
      const ts = await fetchCloudLastUpdated(user.uid);
      setCloudLastUpdated(ts);
      setSyncActionState({
        isLoading: false,
        action: null,
        message: 'Sprawdzono aktualny stan chmury.',
        error: null,
      });
    } catch (err) {
      console.error('Błąd odświeżania statusu chmury:', err);
      setSyncActionState({
        isLoading: false,
        action: null,
        message: null,
        error: 'Nie udało się odczytać znacznika czasu z Firestore.',
      });
    }
  };

  // Manual Hard Pull: "Pobierz z chmury (Nadpisz to urządzenie)"
  const handleManualPullFromCloud = async () => {
    if (!user?.uid) return;
    const confirmed = window.confirm(
      'Uwaga: Obecne dane na tym urządzeniu zostaną bezpowrotnie zastąpione danymi z chmury. Czy na pewno?'
    );
    if (!confirmed) return;

    setSyncActionState({ isLoading: true, action: 'pull', message: null, error: null });
    try {
      const pulled = await pullCloudDataAndOverwriteLocal(user.uid);
      setCyclesList(pulled.cycles);
      setActiveCycleId(pulled.activeCycleId);
      setWorkoutLogs(pulled.logs);
      setRecoveryHistory(pulled.recovery);
      setLastUpdated(pulled.lastUpdated);
      setCloudLastUpdated(pulled.lastUpdated);
      setActiveWorkoutDay(null);
      setIsWorkoutMinimized(false);
      setSyncActionState({
        isLoading: false,
        action: null,
        message: 'Pobrano dane z chmury i zastąpiono stan tego urządzenia.',
        error: null,
      });
    } catch (err) {
      console.error('Błąd pobierania danych z chmury:', err);
      setSyncActionState({
        isLoading: false,
        action: null,
        message: null,
        error: 'Nie udało się pobrać danych z chmury. Sprawdź połączenie z internetem.',
      });
    }
  };

  // Manual Hard Push: "Wyślij do chmury (Nadpisz chmurę)"
  const handleManualPushToCloud = async () => {
    if (!user?.uid) return;
    const confirmed = window.confirm(
      'Uwaga: Dane w chmurze zostaną zastąpione stanem z tego urządzenia.'
    );
    if (!confirmed) return;

    setSyncActionState({ isLoading: true, action: 'push', message: null, error: null });
    try {
      const syncTs = lastUpdated ?? touchLocalLastUpdated();
      const localMeasurements = readLocalTrainingData().measurements;
      const savedTs = await replaceCloudWithLocalData(user.uid, {
        cycles: cyclesList,
        activeCycleId,
        logs: workoutLogs,
        recovery: recoveryHistory,
        measurements: localMeasurements,
        lastUpdated: syncTs,
      });
      setLastUpdated(savedTs);
      setCloudLastUpdated(savedTs);
      setSyncActionState({
        isLoading: false,
        action: null,
        message: 'Wysłano stan z tego urządzenia i nadpisano dane w chmurze.',
        error: null,
      });
    } catch (err) {
      console.error('Błąd wysyłania danych do chmury:', err);
      setSyncActionState({
        isLoading: false,
        action: null,
        message: null,
        error: 'Nie udało się zapisać danych w chmurze. Spróbuj ponownie.',
      });
    }
  };

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
      const syncTs = lastUpdated ?? touchLocalLastUpdated();

      await replaceCloudWithLocalData(user.uid, {
        cycles: cyclesToUpload,
        activeCycleId: activeIdToUpload,
        logs: logsToUpload,
        recovery: recoveryToUpload,
        measurements: localData.measurements,
        lastUpdated: syncTs,
      });

      setCloudLastUpdated(syncTs);
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
      const cloudTs = status.cloudLastUpdated ?? Date.now();
      setCyclesList(status.cloudCycles);
      setActiveCycleId(status.cloudActiveCycleId);
      setWorkoutLogs(status.cloudLogs);
      setRecoveryHistory(status.cloudRecovery);
      setLastUpdated(cloudTs);
      setCloudLastUpdated(status.cloudLastUpdated ?? cloudTs);
      applyCloudDataToLocalStorage({
        cycles: status.cloudCycles,
        activeCycleId: status.cloudActiveCycleId,
        logs: status.cloudLogs,
        recovery: status.cloudRecovery,
        measurements: status.cloudMeasurements,
        lastUpdated: cloudTs,
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
  const [isTrainingActive, setIsTrainingActive] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(90);
  const [isCatalogSidebarOpen, setIsCatalogSidebarOpen] = useState(false);
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);

  // Helper to persist updated cycles locally and bump lastUpdated
  const persistCycles = (updatedCycles: TrainingCycleCatalog[]) => {
    const ts = touchLocalLastUpdated();
    const stamped = updatedCycles.map((c) => ({ ...c, lastUpdated: ts }));
    setCyclesList(stamped);
    try {
      localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(stamped));
    } catch (e) {
      console.warn(e);
    }
  };

  // Select another cycle as active - immediately switches to "Trening" and finds next uncompleted day
  const handleSelectCycle = (cycleId: string, listOverride?: TrainingCycleCatalog[]) => {
    const changed = cycleId !== activeCycleId;
    setActiveCycleId(cycleId);
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY, cycleId);
    } catch (e) {
      console.warn(e);
    }
    if (changed) {
      touchLocalLastUpdated();
    }

    const currentList = listOverride || cyclesList;
    const selectedCycle = currentList.find((c) => c.id === cycleId) || currentList[0] || null;
    if (!selectedCycle) {
      setActiveTab('workout');
      setMoreSubView(null);
      return;
    }

    const selectedWeeks = Array.isArray(selectedCycle.weeksList) ? selectedCycle.weeksList : [];
    const targetPhase = selectedWeeks.length > 0
      ? (selectedWeeks.find((w) => w && w.week === selectedCycle.currentWeek) || selectedWeeks[0] || null)
      : null;
    const targetWeek = targetPhase ? targetPhase.week : 0;
    const days = targetPhase ? getDaysForCycleWeek(selectedCycle, targetWeek) : [];

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

    setSelectedDayId(targetDay ? targetDay.id : '');

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
    } else if (selectedDayId !== '') {
      setSelectedDayId('');
    }
  }, [currentWeek, activeCycleId, currentWeekDays, selectedDayId, workoutLogs]);

  // Create new cycle - saves locally and updates lastUpdated
  const handleCreateCycle = (newCycle: TrainingCycleCatalog) => {
    const ts = touchLocalLastUpdated();
    const stampedCycle: TrainingCycleCatalog = { ...newCycle, lastUpdated: ts };
    const updated = [...cyclesList.filter((c) => c.id !== stampedCycle.id), stampedCycle];
    setCyclesList(updated);
    setActiveCycleId(stampedCycle.id);

    try {
      localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(updated));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY, stampedCycle.id);
    } catch (e) {
      console.warn('Błąd zapisu do localStorage:', e);
    }

    handleSelectCycle(stampedCycle.id, updated);
  };

  // Update existing cycle - saves locally and updates lastUpdated
  const handleUpdateCycle = (updatedCycle: TrainingCycleCatalog) => {
    const ts = touchLocalLastUpdated();
    const stampedCycle: TrainingCycleCatalog = { ...updatedCycle, lastUpdated: ts };
    const updated = cyclesList.map((c) => (c.id === stampedCycle.id ? stampedCycle : c));
    setCyclesList(updated);

    try {
      localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Błąd zapisu do localStorage:', e);
    }
  };

  // Delete cycle - allows deleting all cycles locally and updates lastUpdated
  const handleDeleteCycle = (cycleId: string) => {
    touchLocalLastUpdated();
    const updated = cyclesList.filter((c) => c.id !== cycleId);
    setCyclesList(updated);

    try {
      localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Błąd zapisu do localStorage:', e);
    }

    if (activeCycleId === cycleId) {
      const nextId = updated[0]?.id || '';
      handleSelectCycle(nextId, updated);
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

    const rawSourceDays = activeCycle.weeksPlansMap?.[sourceWeek] || currentWeekDays;
    const sourceDays: WorkoutDay[] =
      typeof structuredClone === 'function'
        ? structuredClone(rawSourceDays)
        : JSON.parse(JSON.stringify(rawSourceDays));

    const clonedDays: WorkoutDay[] = sourceDays.map((d, dIdx) => ({
      ...d,
      id: `w${targetWeek}-day-${d.dayNumber || dIdx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      isCompleted: false,
      completed: false,
      loggedSets: [],
      completedSets: [],
      exercises: (d.exercises || []).map((ex) => {
        const { sets: _legacySets, ...cleanEx } = ex as any;
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
          ...cleanEx,
          id: `ex-w${targetWeek}-${(ex.name || 'ex').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
          muscleGroup: ex.muscleGroup ? normalizeMuscleGroup(ex.muscleGroup) : undefined,
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
        [sourceWeek]: activeCycle.weeksPlansMap?.[sourceWeek] || rawSourceDays,
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

    // Deep-clone initialDays so no exercise/set references are shared with source weeks
    const clonedInitialDays: WorkoutDay[] = Array.isArray(initialDays)
      ? (typeof structuredClone === 'function'
          ? structuredClone(initialDays)
          : JSON.parse(JSON.stringify(initialDays)))
      : [];

    // Sanitize clonedInitialDays to ensure well-formed WorkoutDay objects and reset all completion flags
    const sanitizedDays: WorkoutDay[] = clonedInitialDays.map((d, idx) => ({
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
            const { sets: _legacySets, ...cleanEx } = (ex || {}) as any;
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
              ...cleanEx,
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
    }));

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

  // Reorder days in active cycle's current week with dynamic day numbering
  const handleReorderDays = (reorderedDays: WorkoutDay[]) => {
    const updatedDays = reorderedDays.map((d, idx) => ({
      ...d,
      dayNumber: idx + 1,
    }));

    const updatedCycle: TrainingCycleCatalog = {
      ...activeCycle,
      weeksPlansMap: {
        ...(activeCycle.weeksPlansMap || {}),
        [currentWeek]: updatedDays,
      },
    };
    handleUpdateCycle(updatedCycle);
  };

  // Delete week from active cycle
  const handleDeleteWeek = (weekNumber: number) => {
    const updatedWeeksList = weeksList.filter((w) => w.week !== weekNumber);
    const updatedPlansMap = { ...(activeCycle.weeksPlansMap || {}) };
    delete updatedPlansMap[weekNumber];

    const nextWeek = updatedWeeksList.length > 0 ? updatedWeeksList[0].week : 0;

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

  // Save workout logs with deduplication locally and bump lastUpdated
  const handleSaveLogs = (newEntries: WorkoutLogEntry[]) => {
    if (!newEntries || newEntries.length === 0) return;
    const combined = [...workoutLogs, ...newEntries];
    const updated = deduplicateWorkoutLogs(combined);
    setWorkoutLogs(updated);
    touchLocalLastUpdated();
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Replace logs for a specific exercise, dayId, and dateStr (supports unchecking/deleting sets cleanly)
  const handleReplaceExerciseDateLogs = (
    dayId: string,
    dateStr: string,
    exerciseName: string,
    newEntries: WorkoutLogEntry[]
  ) => {
    const normalizedEx = exerciseName.trim().toLowerCase();
    const filtered = workoutLogs.filter((l) => {
      const logDate = extractLogDate(l);
      const logEx = (l.exerciseName || '').trim().toLowerCase();
      return !(l.dayId === dayId && logDate === dateStr && logEx === normalizedEx);
    });
    const combined = newEntries.length > 0 ? [...filtered, ...newEntries] : filtered;
    const updated = deduplicateWorkoutLogs(combined);
    setWorkoutLogs(updated);
    touchLocalLastUpdated();
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete single workout log entry locally and bump lastUpdated
  const handleDeleteWorkoutLogEntry = (logId: string) => {
    const updated = workoutLogs.filter((l) => l.id !== logId);
    setWorkoutLogs(updated);
    touchLocalLastUpdated();
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Delete entire workout session locally and bump lastUpdated
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
    touchLocalLastUpdated();
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
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

  // Save recovery data locally and bump lastUpdated
  const handleSaveRecovery = (data: DailyRecoveryData) => {
    const updated = [data, ...recoveryHistory.filter((x) => x.date !== data.date)];
    setRecoveryHistory(updated);
    touchLocalLastUpdated();
    try {
      localStorage.setItem(LOCAL_STORAGE_RECOVERY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
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

          {/* Main Content Area - All main views remain mounted in DOM to guarantee ZERO state loss on tab switch */}
          <main className="flex-1 w-full mx-auto px-3 py-4 lg:px-5 lg:py-5 lg:max-w-[1800px]">
            {/* 1. Trening (Główna akcja): Ekran realizacji treningu i pełnego zarządzania cyklem */}
            <div className={activeTab === 'workout' ? 'block' : 'hidden'}>
              <WorkoutExecutionView
                activeCycle={activeCycle}
                currentWeek={currentWeek}
                weeksList={weeksList}
                currentWeekDays={currentWeekDays}
                selectedDayId={selectedDayId}
                onSelectDayId={setSelectedDayId}
                onStartWorkout={(day) => {
                  if (activeWorkoutDay?.id === day.id && isTrainingActive) {
                    setIsWorkoutMinimized(false);
                  } else {
                    setIsTrainingActive(false);
                    setActiveWorkoutDay(day);
                    setIsWorkoutMinimized(false);
                  }
                }}
                activeOngoingWorkoutDay={activeWorkoutDay}
                isWorkoutMinimized={isWorkoutMinimized}
                isTrainingActive={isTrainingActive}
                onMaximizeWorkout={() => setIsWorkoutMinimized(false)}
                onCancelWorkout={() => {
                  setIsTrainingActive(false);
                  setActiveWorkoutDay(null);
                  setIsWorkoutMinimized(false);
                }}
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
                onReplaceExerciseDateLogs={handleReplaceExerciseDateLogs}
                onWeekChange={handleWeekChange}
                onOpenAddWeekModal={() => setIsAddWeekModalOpen(true)}
                onDeleteWeek={handleDeleteWeek}
                onUpdatePhase={(updatedPhase) => {
                  const updatedWeeks = weeksList.map((w) => (w.week === updatedPhase.week ? updatedPhase : w));
                  handleUpdateCycle({
                    ...activeCycle,
                    weeksList: updatedWeeks,
                  });
                }}
                onAddDay={handleAddDay}
                onDeleteDay={handleDeleteDay}
                onReorderDays={handleReorderDays}
                onCopyDayToWeek={handleCopyDayToWeek}
                onCopyEntireWeekTo={handleCopyEntireWeekTo}
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

            {/* 4. Więcej (Menu): Moduły analityczne (Strava, Tonaż, Hyrox, Progresja, Regeneracja) & Synchronizacja */}
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
                localLastUpdated={lastUpdated}
                cloudLastUpdated={cloudLastUpdated}
                syncActionState={syncActionState}
                onPullFromCloud={handleManualPullFromCloud}
                onPushToCloud={handleManualPushToCloud}
                onRefreshCloudTimestamp={handleRefreshCloudTimestamp}
              />
            </div>
          </main>

          {/* Sticky Bottom Navigation - 4 Touch-friendly Large Actions */}
          <BottomNavBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onTabReset={handleTabReset}
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
                setIsTrainingActive(false);
                setActiveWorkoutDay(null);
                setIsWorkoutMinimized(false);
              }}
              isMinimized={isWorkoutMinimized}
              onToggleMinimize={(min) => setIsWorkoutMinimized(min)}
              onTrainingActiveChange={setIsTrainingActive}
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
