import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  TrainingCycleCatalog,
  WorkoutLogEntry,
  DailyRecoveryData
} from '../types/hyrox';
import { sanitizeAndDeduplicateLogs } from '../utils/dateUtils';
import { DEFAULT_TRAINING_CYCLES } from '../data/defaultCycles';

// Local Storage Keys
export const LOCAL_STORAGE_CYCLES_KEY = 'hyrox_training_cycles_list';
export const LOCAL_STORAGE_ACTIVE_CYCLE_KEY = 'hyrox_active_cycle_id';
export const LOCAL_STORAGE_LOGS_KEY = 'hyrox_workout_logs';
export const LOCAL_STORAGE_RECOVERY_KEY = 'hyrox_recovery_history';

export interface CloudSyncStatus {
  hasCloudData: boolean;
  cloudCyclesCount: number;
  cloudLogsCount: number;
  cloudCycles: TrainingCycleCatalog[];
  cloudActiveCycleId: string;
  cloudLogs: WorkoutLogEntry[];
  cloudRecovery: DailyRecoveryData[];
  hasLocalData: boolean;
  localCyclesCount: number;
  localLogsCount: number;
}

/**
 * Check whether cloud contains data and whether local storage has data,
 * without silently modifying or deleting any local storage entries.
 */
export async function checkCloudSyncStatus(userId: string): Promise<CloudSyncStatus> {
  const cyclesColRef = collection(db, 'users', userId, 'cycles');
  const userDocRef = doc(db, 'users', userId);
  const logsColRef = collection(db, 'users', userId, 'workout_logs');
  const recoveryColRef = collection(db, 'users', userId, 'recovery');

  try {
    const [cyclesSnap, userDocSnap, logsSnap, recoverySnap] = await Promise.all([
      getDocs(cyclesColRef),
      getDoc(userDocRef),
      getDocs(logsColRef),
      getDocs(recoveryColRef),
    ]);

    const cloudCycles: TrainingCycleCatalog[] = cyclesSnap.docs.map(
      (d) => d.data() as TrainingCycleCatalog
    );
    const cloudLogs: WorkoutLogEntry[] = logsSnap.docs.map(
      (d) => d.data() as WorkoutLogEntry
    );
    const cloudRecovery: DailyRecoveryData[] = recoverySnap.docs.map(
      (d) => d.data() as DailyRecoveryData
    );

    const hasCloudData = !cyclesSnap.empty || !logsSnap.empty;
    const activeCycleId =
      userDocSnap.exists() && userDocSnap.data()?.activeCycleId
        ? userDocSnap.data().activeCycleId
        : cloudCycles[0]?.id || DEFAULT_TRAINING_CYCLES[0].id;

    // Check localStorage safely
    let localCyclesCount = 0;
    let localLogsCount = 0;
    try {
      const rawCycles = localStorage.getItem(LOCAL_STORAGE_CYCLES_KEY);
      if (rawCycles) {
        const parsed = JSON.parse(rawCycles);
        localCyclesCount = Array.isArray(parsed) ? parsed.length : 0;
      }
      const rawLogs = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        localLogsCount = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch {
      // ignore
    }

    const hasLocalData = localLogsCount > 0 || localCyclesCount > 0;

    return {
      hasCloudData,
      cloudCyclesCount: cloudCycles.length,
      cloudLogsCount: cloudLogs.length,
      cloudCycles,
      cloudActiveCycleId: activeCycleId,
      cloudLogs: sanitizeAndDeduplicateLogs(cloudLogs),
      cloudRecovery,
      hasLocalData,
      localCyclesCount,
      localLogsCount,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}

/**
 * Upload local data to Cloud Firestore (Option 1: "Zachowaj i wyślij do chmury")
 * Merges/overwrites Firestore with the current local state.
 */
export async function uploadLocalDataToCloud(
  userId: string,
  localData: {
    cycles: TrainingCycleCatalog[];
    activeCycleId: string;
    logs: WorkoutLogEntry[];
    recovery: DailyRecoveryData[];
  }
): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  try {
    // 1. Update user document
    await setDoc(
      userDocRef,
      {
        userId,
        activeCycleId: localData.activeCycleId,
        isMigrated: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Save cycles
    for (const cycle of localData.cycles) {
      await setDoc(doc(db, 'users', userId, 'cycles', cycle.id), cycle, { merge: true });
    }

    // 3. Save logs in chunks
    const deduplicated = sanitizeAndDeduplicateLogs(localData.logs);
    const chunkSize = 400;
    for (let i = 0; i < deduplicated.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = deduplicated.slice(i, i + chunkSize);
      chunk.forEach((log: WorkoutLogEntry) => {
        const logRef = doc(db, 'users', userId, 'workout_logs', log.id);
        batch.set(logRef, log, { merge: true });
      });
      await batch.commit();
    }

    // 4. Save recovery
    if (localData.recovery.length > 0) {
      const batch = writeBatch(db);
      localData.recovery.forEach((rec: DailyRecoveryData) => {
        const recRef = doc(db, 'users', userId, 'recovery', rec.date);
        batch.set(recRef, rec, { merge: true });
      });
      await batch.commit();
    }

    console.log('[Firestore] Dane lokalne pomyślnie wysłane do chmury.');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Overwrite local data with Cloud Firestore (Option 2: "Pobierz stan z chmury")
 * Writes cloud data to localStorage so offline and local caches stay up to date.
 */
export function applyCloudDataToLocalStorage(data: {
  cycles: TrainingCycleCatalog[];
  activeCycleId: string;
  logs: WorkoutLogEntry[];
  recovery: DailyRecoveryData[];
}): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(data.cycles));
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY, data.activeCycleId);
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(data.logs));
    localStorage.setItem(LOCAL_STORAGE_RECOVERY_KEY, JSON.stringify(data.recovery));
  } catch (err) {
    console.warn('Błąd zapisu do localStorage podczas synchronizacji:', err);
  }
}

/**
 * Subscribe to Training Cycles in realtime
 */
export function subscribeToCycles(
  userId: string,
  onUpdate: (cycles: TrainingCycleCatalog[]) => void
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'cycles');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const cycles: TrainingCycleCatalog[] = snapshot.docs.map(
        (d) => d.data() as TrainingCycleCatalog
      );
      if (cycles.length > 0) {
        onUpdate(cycles);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/cycles`);
    }
  );
}

/**
 * Save single cycle in Firestore
 */
export async function saveCycleToFirestore(
  userId: string,
  cycle: TrainingCycleCatalog
): Promise<void> {
  const cycleRef = doc(db, 'users', userId, 'cycles', cycle.id);
  try {
    await setDoc(cycleRef, cycle, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/cycles/${cycle.id}`);
  }
}

/**
 * Delete cycle from Firestore
 */
export async function deleteCycleFromFirestore(
  userId: string,
  cycleId: string
): Promise<void> {
  const cycleRef = doc(db, 'users', userId, 'cycles', cycleId);
  try {
    await deleteDoc(cycleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/cycles/${cycleId}`);
  }
}

/**
 * Save active cycle ID to user document
 */
export async function saveActiveCycleId(
  userId: string,
  activeCycleId: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await setDoc(
      userRef,
      { activeCycleId, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Subscribe to Workout Logs in realtime
 */
export function subscribeToWorkoutLogs(
  userId: string,
  onUpdate: (logs: WorkoutLogEntry[]) => void
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'workout_logs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const logs: WorkoutLogEntry[] = snapshot.docs.map(
        (d) => d.data() as WorkoutLogEntry
      );
      onUpdate(sanitizeAndDeduplicateLogs(logs));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/workout_logs`);
    }
  );
}

/**
 * Save batch of workout log entries
 */
export async function saveWorkoutLogsBatch(
  userId: string,
  entries: WorkoutLogEntry[]
): Promise<void> {
  if (!entries || entries.length === 0) return;
  try {
    const batch = writeBatch(db);
    entries.forEach((log) => {
      const logRef = doc(db, 'users', userId, 'workout_logs', log.id);
      batch.set(logRef, log, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/workout_logs`);
  }
}

/**
 * Delete single workout log entry
 */
export async function deleteWorkoutLogEntry(
  userId: string,
  logId: string
): Promise<void> {
  const logRef = doc(db, 'users', userId, 'workout_logs', logId);
  try {
    await deleteDoc(logRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/workout_logs/${logId}`);
  }
}

/**
 * Delete entire workout session logs
 */
export async function deleteWorkoutSessionLogs(
  userId: string,
  sessionId: string,
  dateStr: string,
  currentLogs: WorkoutLogEntry[]
): Promise<void> {
  const matching = currentLogs.filter((l) => {
    const matchSession = l.sessionId === sessionId;
    const matchFallback =
      !l.sessionId &&
      (l.dateStr || l.timestamp?.split('T')[0]) === dateStr &&
      l.dayId === sessionId;
    return matchSession || matchFallback;
  });

  if (matching.length === 0) return;

  try {
    const batch = writeBatch(db);
    matching.forEach((log) => {
      const logRef = doc(db, 'users', userId, 'workout_logs', log.id);
      batch.delete(logRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/workout_logs`);
  }
}

/**
 * Fetch all workout logs directly from Firestore
 */
export async function fetchAllWorkoutLogsForExport(
  userId: string
): Promise<WorkoutLogEntry[]> {
  const logsColRef = collection(db, 'users', userId, 'workout_logs');
  try {
    const snap = await getDocs(logsColRef);
    const logs = snap.docs.map((d) => d.data() as WorkoutLogEntry);
    return sanitizeAndDeduplicateLogs(logs);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/workout_logs`);
  }
}

/**
 * Subscribe to Recovery data in realtime
 */
export function subscribeToRecovery(
  userId: string,
  onUpdate: (recovery: DailyRecoveryData[]) => void
): Unsubscribe {
  const colRef = collection(db, 'users', userId, 'recovery');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DailyRecoveryData[] = snapshot.docs.map(
        (d) => d.data() as DailyRecoveryData
      );
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/recovery`);
    }
  );
}

/**
 * Save daily recovery data
 */
export async function saveRecoveryEntry(
  userId: string,
  entry: DailyRecoveryData
): Promise<void> {
  const docId = entry.date;
  const recRef = doc(db, 'users', userId, 'recovery', docId);
  try {
    await setDoc(recRef, entry, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/recovery/${docId}`);
  }
}
