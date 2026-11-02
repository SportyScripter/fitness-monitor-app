import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  TrainingCycleCatalog,
  WorkoutLogEntry,
  DailyRecoveryData
} from '../types/hyrox';
import { DEFAULT_TRAINING_CYCLES } from '../data/defaultCycles';
import { sanitizeAndDeduplicateLogs } from '../utils/dateUtils';

// LocalStorage Keys for Legacy Data
const LOCAL_STORAGE_CYCLES_KEY = 'hyrox_training_cycles_list';
const LOCAL_STORAGE_ACTIVE_CYCLE_KEY = 'hyrox_active_cycle_id';
const LOCAL_STORAGE_LOGS_KEY = 'hyrox_workout_logs';
const LOCAL_STORAGE_RECOVERY_KEY = 'hyrox_recovery_history';
const getMigrationFlagKey = (userId: string) => `hyrox_is_migrated_${userId}`;

export interface UserInitialData {
  cycles: TrainingCycleCatalog[];
  activeCycleId: string;
  workoutLogs: WorkoutLogEntry[];
  recoveryHistory: DailyRecoveryData[];
}

/**
 * Clean local storage legacy keys after migration or when cloud data exists
 */
export const purgeLocalLegacyStorage = (userId: string) => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_CYCLES_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_RECOVERY_KEY);
    localStorage.setItem(getMigrationFlagKey(userId), 'true');
  } catch (err) {
    console.warn('Nie udało się wyczyścić localStorage:', err);
  }
};

/**
 * Initialize user data on login with Cloud-First strategy and automatic migration
 */
export async function initializeUserData(userId: string): Promise<UserInitialData> {
  const cyclesColRef = collection(db, 'users', userId, 'cycles');
  const userDocRef = doc(db, 'users', userId);
  const logsColRef = collection(db, 'users', userId, 'workout_logs');
  const recoveryColRef = collection(db, 'users', userId, 'recovery');

  try {
    // Step 1: Check existing data in Firestore
    const [cyclesSnap, userDocSnap, logsSnap, recoverySnap] = await Promise.all([
      getDocs(cyclesColRef),
      getDoc(userDocRef),
      getDocs(logsColRef),
      getDocs(recoveryColRef),
    ]);

    // STRATEGY: CLOUD FIRST
    // If cloud contains cycles or logs, cloud is the absolute single source of truth.
    if (!cyclesSnap.empty) {
      console.log('[Firestore] Znaleziono istniejące dane w chmurze (Cloud First).');
      // Purge any unauthenticated clicks from localStorage
      purgeLocalLegacyStorage(userId);

      const cloudCycles: TrainingCycleCatalog[] = cyclesSnap.docs.map(
        (d) => d.data() as TrainingCycleCatalog
      );
      const cloudLogs: WorkoutLogEntry[] = logsSnap.docs.map(
        (d) => d.data() as WorkoutLogEntry
      );
      const cloudRecovery: DailyRecoveryData[] = recoverySnap.docs.map(
        (d) => d.data() as DailyRecoveryData
      );

      const activeCycleId =
        userDocSnap.exists() && userDocSnap.data()?.activeCycleId
          ? userDocSnap.data().activeCycleId
          : cloudCycles[0]?.id || DEFAULT_TRAINING_CYCLES[0].id;

      return {
        cycles: cloudCycles,
        activeCycleId,
        workoutLogs: sanitizeAndDeduplicateLogs(cloudLogs),
        recoveryHistory: cloudRecovery,
      };
    }

    // Step 2: Cloud is empty. Check if there are local legacy data to migrate.
    const isAlreadyMigrated = localStorage.getItem(getMigrationFlagKey(userId)) === 'true';
    let localCycles: TrainingCycleCatalog[] | null = null;
    let localActiveCycleId: string | null = null;
    let localLogs: WorkoutLogEntry[] | null = null;
    let localRecovery: DailyRecoveryData[] | null = null;

    try {
      const rawCycles = localStorage.getItem(LOCAL_STORAGE_CYCLES_KEY);
      if (rawCycles) localCycles = JSON.parse(rawCycles);

      localActiveCycleId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY);

      const rawLogs = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (rawLogs) localLogs = JSON.parse(rawLogs);

      const rawRec = localStorage.getItem(LOCAL_STORAGE_RECOVERY_KEY);
      if (rawRec) localRecovery = JSON.parse(rawRec);
    } catch (e) {
      console.warn('Błąd odczytu localStorage podczas próby migracji:', e);
    }

    const hasLocalData =
      (localCycles && localCycles.length > 0) ||
      (localLogs && localLogs.length > 0);

    if (hasLocalData && !isAlreadyMigrated) {
      console.log('[Firestore] Migracja danych z localStorage do chmury użytkownika...');
      const targetCycles = localCycles && localCycles.length > 0 ? localCycles : DEFAULT_TRAINING_CYCLES;
      const targetActiveCycleId = localActiveCycleId || targetCycles[0].id;
      const targetLogs = sanitizeAndDeduplicateLogs(localLogs || []);
      const targetRecovery = localRecovery || [];

      // Save user doc
      await setDoc(userDocRef, {
        userId,
        activeCycleId: targetActiveCycleId,
        isMigrated: true,
        updatedAt: new Date().toISOString(),
      });

      // Save cycles to Firestore
      for (const cycle of targetCycles) {
        await setDoc(doc(db, 'users', userId, 'cycles', cycle.id), cycle);
      }

      // Save logs in batch chunks (max 450 per batch)
      if (targetLogs.length > 0) {
        const chunkSize = 400;
        for (let i = 0; i < targetLogs.length; i += chunkSize) {
          const batch = writeBatch(db);
          const chunk = targetLogs.slice(i, i + chunkSize);
          chunk.forEach((log: WorkoutLogEntry) => {
            const logRef = doc(db, 'users', userId, 'workout_logs', log.id);
            batch.set(logRef, log);
          });
          await batch.commit();
        }
      }

      // Save recovery
      if (targetRecovery.length > 0) {
        const batch = writeBatch(db);
        targetRecovery.forEach((rec: DailyRecoveryData) => {
          const recRef = doc(db, 'users', userId, 'recovery', rec.date);
          batch.set(recRef, rec);
        });
        await batch.commit();
      }

      // Purge and flag
      purgeLocalLegacyStorage(userId);

      return {
        cycles: targetCycles,
        activeCycleId: targetActiveCycleId,
        workoutLogs: targetLogs,
        recoveryHistory: targetRecovery,
      };
    }

    // Step 3: Brand new user with no cloud data and no local data
    console.log('[Firestore] Nowy użytkownik – inicjalizacja domyślnego szablonu cykli.');
    const initialCycles = DEFAULT_TRAINING_CYCLES;
    const initialActiveCycleId = initialCycles[0].id;

    await setDoc(userDocRef, {
      userId,
      activeCycleId: initialActiveCycleId,
      isMigrated: true,
      updatedAt: new Date().toISOString(),
    });

    for (const cycle of initialCycles) {
      await setDoc(doc(db, 'users', userId, 'cycles', cycle.id), cycle);
    }

    purgeLocalLegacyStorage(userId);

    return {
      cycles: initialCycles,
      activeCycleId: initialActiveCycleId,
      workoutLogs: [],
      recoveryHistory: [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
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
 * Save or update single cycle in Firestore
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
 * Fetch all workout logs directly from Firestore (e.g. for Excel/CSV export)
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
