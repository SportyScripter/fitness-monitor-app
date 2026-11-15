import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
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
export const LOCAL_STORAGE_LAST_UPDATED_KEY = 'hyrox_last_updated';
const LOCAL_STORAGE_MIGRATED_PREFIX = 'hyrox_device_migrated_';

export interface LocalTrainingData {
  cycles: TrainingCycleCatalog[];
  activeCycleId: string;
  logs: WorkoutLogEntry[];
  recovery: DailyRecoveryData[];
  lastUpdated: number | null;
  hasAnyData: boolean;
  hasLogs: boolean;
  hasCycles: boolean;
}

/**
 * Normalizes any numeric timestamp, ISO string, or Firestore Timestamp into epoch milliseconds.
 */
export function parseTimestampMillis(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
    return val;
  }
  if (val && typeof (val as any).toMillis === 'function') {
    const ms = (val as any).toMillis();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (typeof val === 'string' && val.trim()) {
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) return num;
    const parsed = Date.parse(val);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Reads local modification timestamp from localStorage without mutating storage.
 */
export function readLocalLastUpdated(): number | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LAST_UPDATED_KEY);
    return parseTimestampMillis(raw);
  } catch {
    return null;
  }
}

/**
 * Persists or clears the local modification timestamp in localStorage.
 */
export function writeLocalLastUpdated(ts: number | null): void {
  try {
    if (ts !== null && Number.isFinite(ts) && ts > 0) {
      localStorage.setItem(LOCAL_STORAGE_LAST_UPDATED_KEY, String(ts));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_LAST_UPDATED_KEY);
    }
  } catch (err) {
    console.warn('Błąd zapisu lastUpdated do localStorage:', err);
  }
}

/**
 * Safely inspects current localStorage contents without adding defaults or mutating storage.
 */
export function readLocalTrainingData(): LocalTrainingData {
  let cycles: TrainingCycleCatalog[] = [];
  let logs: WorkoutLogEntry[] = [];
  let recovery: DailyRecoveryData[] = [];
  let activeCycleId = '';

  try {
    const rawCycles = localStorage.getItem(LOCAL_STORAGE_CYCLES_KEY);
    if (rawCycles) {
      const parsed = JSON.parse(rawCycles);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cycles = parsed;
      }
    }
  } catch (err) {
    console.warn('Błąd odczytu cykli z localStorage:', err);
  }

  try {
    const rawActive = localStorage.getItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY);
    if (rawActive && typeof rawActive === 'string') {
      activeCycleId = rawActive;
    }
  } catch (err) {}

  try {
    const rawLogs = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    if (rawLogs) {
      const parsed = JSON.parse(rawLogs);
      if (Array.isArray(parsed) && parsed.length > 0) {
        logs = sanitizeAndDeduplicateLogs(parsed);
      }
    }
  } catch (err) {
    console.warn('Błąd odczytu logów z localStorage:', err);
  }

  try {
    const rawRecovery = localStorage.getItem(LOCAL_STORAGE_RECOVERY_KEY);
    if (rawRecovery) {
      const parsed = JSON.parse(rawRecovery);
      if (Array.isArray(parsed) && parsed.length > 0) {
        recovery = parsed;
      }
    }
  } catch (err) {}

  if (!activeCycleId && cycles.length > 0) {
    activeCycleId = cycles[0].id;
  }

  const lastUpdated = readLocalLastUpdated();
  const hasLogs = logs.length > 0;
  const hasCycles = cycles.length > 0;
  const hasRecovery = recovery.length > 0;
  const hasAnyData = hasLogs || hasCycles || hasRecovery;

  return {
    cycles,
    activeCycleId,
    logs,
    recovery,
    lastUpdated,
    hasAnyData,
    hasLogs,
    hasCycles,
  };
}

/**
 * Check if this specific device has already been migrated / synced for this user
 */
export function isDeviceMigrated(userId: string): boolean {
  try {
    return localStorage.getItem(`${LOCAL_STORAGE_MIGRATED_PREFIX}${userId}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark this specific device as migrated / synced for this user
 */
export function markDeviceMigrated(userId: string): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MIGRATED_PREFIX}${userId}`, 'true');
  } catch (err) {
    console.warn('Błąd zapisu flagi migracji na urządzeniu:', err);
  }
}

export interface CloudSyncStatus {
  hasCloudData: boolean;
  cloudCyclesCount: number;
  cloudLogsCount: number;
  cloudRecoveryCount: number;
  cloudCycles: TrainingCycleCatalog[];
  cloudActiveCycleId: string;
  cloudLogs: WorkoutLogEntry[];
  cloudRecovery: DailyRecoveryData[];
  cloudLastUpdated: number | null;
  localLastUpdated: number | null;
  isCloudMigrated: boolean;
  isCloudAccountInitialized: boolean;
  localData: LocalTrainingData;
  isDeviceMigrated: boolean;
}

/**
 * Fetches only the cloud user document timestamp from Firestore server (1 read).
 */
export async function fetchCloudLastUpdated(userId: string): Promise<number | null> {
  if (!userId) return null;
  const userDocRef = doc(db, 'users', userId);
  try {
    const snap = await getDocFromServer(userDocRef).catch(() => getDoc(userDocRef));
    if (!snap.exists()) return null;
    const data = snap.data();
    return parseTimestampMillis(data?.lastUpdated ?? data?.updatedAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

/**
 * Check whether cloud contains data and inspect local data snapshot.
 * Safe and read-only: does not modify or delete any local storage or cloud entries.
 */
export async function checkCloudSyncStatus(userId: string): Promise<CloudSyncStatus> {
  const cyclesColRef = collection(db, 'users', userId, 'cycles');
  const userDocRef = doc(db, 'users', userId);
  const logsColRef = collection(db, 'users', userId, 'workout_logs');
  const recoveryColRef = collection(db, 'users', userId, 'recovery');

  try {
    const [cyclesSnap, userDocSnap, logsSnap, recoverySnap] = await Promise.all([
      getDocsFromServer(cyclesColRef).catch(() => getDocs(cyclesColRef)),
      getDocFromServer(userDocRef).catch(() => getDoc(userDocRef)),
      getDocsFromServer(logsColRef).catch(() => getDocs(logsColRef)),
      getDocsFromServer(recoveryColRef).catch(() => getDocs(recoveryColRef)),
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

    const userData = userDocSnap.exists() ? userDocSnap.data() : null;
    const hasCloudData = cloudCycles.length > 0 || cloudLogs.length > 0 || cloudRecovery.length > 0;
    const isCloudAccountInitialized =
      Boolean(userData) &&
      (userData?.isInitialized === true || userData?.isMigrated === true);
    const isCloudMigrated = Boolean(userData) && userData?.isMigrated === true;
    const cloudLastUpdated = userData
      ? parseTimestampMillis(userData.lastUpdated ?? userData.updatedAt)
      : null;

    // Use saved active cycle, or first cycle in list, or empty string.
    const activeCycleId =
      userData?.activeCycleId
        ? userData.activeCycleId
        : cloudCycles[0]?.id || '';

    const localData = readLocalTrainingData();
    const migratedOnDevice = isDeviceMigrated(userId);

    return {
      hasCloudData,
      cloudCyclesCount: cloudCycles.length,
      cloudLogsCount: cloudLogs.length,
      cloudRecoveryCount: cloudRecovery.length,
      cloudCycles,
      cloudActiveCycleId: activeCycleId,
      cloudLogs: sanitizeAndDeduplicateLogs(cloudLogs),
      cloudRecovery,
      cloudLastUpdated,
      localLastUpdated: localData.lastUpdated,
      isCloudMigrated,
      isCloudAccountInitialized,
      localData,
      isDeviceMigrated: migratedOnDevice,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    const localData = readLocalTrainingData();
    return {
      hasCloudData: false,
      cloudCyclesCount: 0,
      cloudLogsCount: 0,
      cloudRecoveryCount: 0,
      cloudCycles: [],
      cloudActiveCycleId: '',
      cloudLogs: [],
      cloudRecovery: [],
      cloudLastUpdated: null,
      localLastUpdated: localData.lastUpdated,
      isCloudMigrated: false,
      isCloudAccountInitialized: false,
      localData,
      isDeviceMigrated: isDeviceMigrated(userId),
    };
  }
}

/**
 * Manual Hard Pull: Strictly reads live state from Firestore server and overwrites localStorage.
 */
export async function pullCloudDataAndOverwriteLocal(userId: string): Promise<{
  cycles: TrainingCycleCatalog[];
  activeCycleId: string;
  logs: WorkoutLogEntry[];
  recovery: DailyRecoveryData[];
  lastUpdated: number;
  hasCloudData: boolean;
}> {
  const cyclesColRef = collection(db, 'users', userId, 'cycles');
  const userDocRef = doc(db, 'users', userId);
  const logsColRef = collection(db, 'users', userId, 'workout_logs');
  const recoveryColRef = collection(db, 'users', userId, 'recovery');

  try {
    const [cyclesSnap, userDocSnap, logsSnap, recoverySnap] = await Promise.all([
      getDocsFromServer(cyclesColRef),
      getDocFromServer(userDocRef),
      getDocsFromServer(logsColRef),
      getDocsFromServer(recoveryColRef),
    ]);

    const cloudCycles: TrainingCycleCatalog[] = cyclesSnap.docs.map(
      (d) => d.data() as TrainingCycleCatalog
    );
    const cloudLogs = sanitizeAndDeduplicateLogs(
      logsSnap.docs.map((d) => d.data() as WorkoutLogEntry)
    );
    const cloudRecovery: DailyRecoveryData[] = recoverySnap.docs.map(
      (d) => d.data() as DailyRecoveryData
    );

    const userData = userDocSnap.exists() ? userDocSnap.data() : null;
    const activeCycleId = userData?.activeCycleId || cloudCycles[0]?.id || '';
    const cloudLastUpdated =
      parseTimestampMillis(userData?.lastUpdated ?? userData?.updatedAt) ?? Date.now();
    const hasCloudData =
      cloudCycles.length > 0 || cloudLogs.length > 0 || cloudRecovery.length > 0 || Boolean(userData);

    applyCloudDataToLocalStorage({
      cycles: cloudCycles,
      activeCycleId,
      logs: cloudLogs,
      recovery: cloudRecovery,
      lastUpdated: cloudLastUpdated,
    });
    markDeviceMigrated(userId);

    return {
      cycles: cloudCycles,
      activeCycleId,
      logs: cloudLogs,
      recovery: cloudRecovery,
      lastUpdated: cloudLastUpdated,
      hasCloudData,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    throw error;
  }
}

/**
 * Manual Hard Push (Hard Replace):
 * Replaces Cloud Firestore state completely with local device state, deleting stale cloud documents
 * and storing the exact same `lastUpdated` timestamp on Firestore.
 */
export async function replaceCloudWithLocalData(
  userId: string,
  localData: {
    cycles: TrainingCycleCatalog[];
    activeCycleId: string;
    logs: WorkoutLogEntry[];
    recovery: DailyRecoveryData[];
    lastUpdated: number;
  }
): Promise<number> {
  const userDocRef = doc(db, 'users', userId);
  const cyclesColRef = collection(db, 'users', userId, 'cycles');
  const logsColRef = collection(db, 'users', userId, 'workout_logs');
  const recoveryColRef = collection(db, 'users', userId, 'recovery');
  const syncTimestamp = localData.lastUpdated || Date.now();

  try {
    // 1. Inspect existing docs so stale deleted items are removed during hard replace
    const [existingCyclesSnap, existingLogsSnap, existingRecoverySnap] = await Promise.all([
      getDocsFromServer(cyclesColRef).catch(() => getDocs(cyclesColRef)),
      getDocsFromServer(logsColRef).catch(() => getDocs(logsColRef)),
      getDocsFromServer(recoveryColRef).catch(() => getDocs(recoveryColRef)),
    ]);

    const keepCycleIds = new Set((localData.cycles || []).map((c) => c.id));
    const deduplicatedLogs = sanitizeAndDeduplicateLogs(localData.logs || []);
    const keepLogIds = new Set(deduplicatedLogs.map((l) => l.id));
    const recoveryList = localData.recovery || [];
    const keepRecoveryIds = new Set(recoveryList.map((r) => r.date));

    const deleteRefs = [
      ...existingCyclesSnap.docs.filter((d) => !keepCycleIds.has(d.id)).map((d) => d.ref),
      ...existingLogsSnap.docs.filter((d) => !keepLogIds.has(d.id)).map((d) => d.ref),
      ...existingRecoverySnap.docs.filter((d) => !keepRecoveryIds.has(d.id)).map((d) => d.ref),
    ];

    const chunkSize = 400;
    for (let i = 0; i < deleteRefs.length; i += chunkSize) {
      const batch = writeBatch(db);
      deleteRefs.slice(i, i + chunkSize).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // 2. Hard-write current cycles (full document overwrite, no merge)
    for (const cycle of localData.cycles || []) {
      const cleanCycle = JSON.parse(JSON.stringify({ ...cycle, lastUpdated: syncTimestamp }));
      await setDoc(doc(db, 'users', userId, 'cycles', cycle.id), cleanCycle);
    }

    // 3. Hard-write current workout logs in chunks
    for (let i = 0; i < deduplicatedLogs.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = deduplicatedLogs.slice(i, i + chunkSize);
      chunk.forEach((log: WorkoutLogEntry) => {
        const logRef = doc(db, 'users', userId, 'workout_logs', log.id);
        batch.set(logRef, JSON.parse(JSON.stringify(log)));
      });
      await batch.commit();
    }

    // 4. Hard-write current recovery entries in chunks
    for (let i = 0; i < recoveryList.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = recoveryList.slice(i, i + chunkSize);
      chunk.forEach((rec: DailyRecoveryData) => {
        const recRef = doc(db, 'users', userId, 'recovery', rec.date);
        batch.set(recRef, JSON.parse(JSON.stringify(rec)));
      });
      await batch.commit();
    }

    // 5. Update user document with matching timestamp
    await setDoc(
      userDocRef,
      {
        userId,
        activeCycleId: localData.activeCycleId || localData.cycles[0]?.id || '',
        isMigrated: true,
        isInitialized: true,
        lastUpdated: syncTimestamp,
        updatedAt: new Date(syncTimestamp).toISOString(),
      },
      { merge: true }
    );

    writeLocalLastUpdated(syncTimestamp);
    markDeviceMigrated(userId);
    console.log('[Firestore] Zapisano pełny stan lokalny do chmury (Hard Replace).');
    return syncTimestamp;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    throw error;
  }
}

/**
 * Upload local data to Cloud Firestore (alias delegating to replaceCloudWithLocalData)
 */
export async function uploadLocalDataToCloud(
  userId: string,
  localData: {
    cycles: TrainingCycleCatalog[];
    activeCycleId: string;
    logs: WorkoutLogEntry[];
    recovery: DailyRecoveryData[];
    lastUpdated?: number;
  }
): Promise<void> {
  await replaceCloudWithLocalData(userId, {
    ...localData,
    lastUpdated: localData.lastUpdated ?? Date.now(),
  });
}

/**
 * Overwrite local data with Cloud Firestore
 * Writes cloud data and timestamp to localStorage so offline and local caches stay up to date.
 */
export function applyCloudDataToLocalStorage(data: {
  cycles: TrainingCycleCatalog[];
  activeCycleId: string;
  logs: WorkoutLogEntry[];
  recovery: DailyRecoveryData[];
  lastUpdated?: number | null;
}): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(data.cycles));
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_CYCLE_KEY, data.activeCycleId);
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(data.logs));
    localStorage.setItem(LOCAL_STORAGE_RECOVERY_KEY, JSON.stringify(data.recovery));
    if (data.lastUpdated !== undefined) {
      writeLocalLastUpdated(data.lastUpdated);
    }
  } catch (err) {
    console.warn('Błąd zapisu do localStorage podczas synchronizacji:', err);
  }
}

/**
 * Subscribe to Training Cycles in realtime (onSnapshot)
 * Reflects actual Firestore state, including empty list if user deleted/has 0 cycles.
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
      // Immediately reflect actual state from cloud (even when empty!)
      onUpdate(cycles);
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
  if (!userId || !cycle || !cycle.id) {
    console.error('[Firestore] Brak userId lub cycle.id!');
    return;
  }
  const cycleRef = doc(db, 'users', userId, 'cycles', cycle.id);
  try {
    const cleanCycle = JSON.parse(JSON.stringify(cycle));
    await setDoc(cycleRef, cleanCycle, { merge: true });
    console.log(`[Firestore] Cykl ${cycle.id} ("${cycle.name}") zapisany w chmurze.`);
  } catch (error) {
    console.error(`[Firestore] Błąd zapisu cyklu ${cycle.id}:`, error);
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/cycles/${cycle.id}`);
    throw error;
  }
}

/**
 * Delete cycle from Firestore
 */
export async function deleteCycleFromFirestore(
  userId: string,
  cycleId: string
): Promise<void> {
  if (!userId || !cycleId) return;
  const cycleRef = doc(db, 'users', userId, 'cycles', cycleId);
  try {
    await deleteDoc(cycleRef);
    console.log(`[Firestore] Cykl ${cycleId} usunięty z chmury.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/cycles/${cycleId}`);
    throw error;
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
    return [];
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
