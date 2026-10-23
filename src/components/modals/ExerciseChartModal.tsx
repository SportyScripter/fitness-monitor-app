import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Dumbbell,
  Calendar,
  Award,
  BarChart3,
  Flame,
  ArrowUpRight,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Timer,
  HeartPulse,
  Navigation
} from 'lucide-react';
import { WorkoutLogEntry, Exercise, RUNNING_TYPES, RunningType } from '../../types/hyrox';

interface ExerciseChartModalProps {
  exerciseName: string;
  workoutLogs: WorkoutLogEntry[];
  isOpen: boolean;
  onClose: () => void;
  category?: 'strength' | 'cardio';
  exercise?: Exercise;
}

// Helper to parse pace strings like "4:15", "4:15 min/km", or "4.25" to total seconds
export const parsePaceToSeconds = (paceStr?: string): number => {
  if (!paceStr) return 0;
  const match = paceStr.match(/(\d+):(\d{2})/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    return mins * 60 + secs;
  }
  const num = parseFloat(paceStr.replace(',', '.'));
  if (!isNaN(num) && num > 0) {
    const mins = Math.floor(num);
    const secs = Math.round((num - mins) * 60);
    return mins * 60 + secs;
  }
  return 0;
};

// Helper to format total seconds into M:SS pace string
export const formatSecondsToPace = (totalSeconds: number): string => {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '-';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Helper to extract distance from log entry in meters
export const getSetDistanceInMeters = (set: WorkoutLogEntry): number => {
  if (typeof set.targetDistance === 'number' && set.targetDistance > 0) {
    if (set.distanceUnit === 'km') return set.targetDistance * 1000;
    return set.targetDistance;
  }
  if (typeof set.distanceKm === 'number' && set.distanceKm > 0) {
    return set.distanceKm * 1000;
  }
  const rawDist = (set as any).distance;
  if (typeof rawDist === 'number' && rawDist > 0) {
    if ((set as any).distanceUnit === 'km') return rawDist * 1000;
    return rawDist;
  }
  return 0;
};

export const ExerciseChartModal: React.FC<ExerciseChartModalProps> = ({
  exerciseName,
  workoutLogs,
  isOpen,
  onClose,
  category,
  exercise,
}) => {
  const [strengthMetric, setStrengthMetric] = useState<'weight' | 'estimated1rm' | 'tonnage'>('weight');
  const [cardioMetric, setCardioMetric] = useState<'distance' | 'pace' | 'hr'>('distance');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  if (!isOpen) return null;

  // Filter logs for this specific exercise
  const exerciseLogs = workoutLogs.filter(
    (l) => l.exerciseName && l.exerciseName.trim().toLowerCase() === exerciseName.trim().toLowerCase()
  );

  // Determine if this is a cardio exercise
  const isCardio =
    category === 'cardio' ||
    exercise?.category === 'cardio' ||
    exercise?.exerciseType === 'RUNNING' ||
    RUNNING_TYPES.includes(exerciseName as RunningType) ||
    exerciseLogs.some(
      (l) =>
        l.activityType === 'RUNNING' ||
        (l.targetDistance !== undefined && l.targetDistance > 0) ||
        !!l.distanceUnit ||
        !!l.targetPace ||
        !!l.actualPace
    );

  // Group logs by date / session
  interface SessionSummary {
    dateStr: string;
    sets: WorkoutLogEntry[];
    // Strength metrics
    maxWeight: number;
    totalTonnage: number;
    max1RM: number;
    avgRpe: number;
    // Cardio metrics
    totalDistanceKm: number;
    bestPaceSeconds: number;
    bestPaceFormatted: string;
    avgHr: number;
  }

  const sessionsMap: Record<string, SessionSummary> = {};

  exerciseLogs.forEach((l) => {
    const key = l.dateStr || (l.timestamp ? l.timestamp.split('T')[0] : 'Bieżąca sesja');
    if (!sessionsMap[key]) {
      sessionsMap[key] = {
        dateStr: key,
        sets: [],
        maxWeight: 0,
        totalTonnage: 0,
        max1RM: 0,
        avgRpe: 0,
        totalDistanceKm: 0,
        bestPaceSeconds: Infinity,
        bestPaceFormatted: '-',
        avgHr: 0,
      };
    }
    const session = sessionsMap[key];
    session.sets.push(l);

    // Strength computations
    if (l.weightKg > session.maxWeight) {
      session.maxWeight = l.weightKg;
    }
    session.totalTonnage += l.tonnageKg || l.weightKg * l.reps;

    const epley = Math.round(l.weightKg * (1 + l.reps / 30));
    if (epley > session.max1RM) {
      session.max1RM = epley;
    }

    // Cardio computations
    const distMeters = getSetDistanceInMeters(l);
    session.totalDistanceKm += distMeters / 1000;

    const rawPace = l.actualPace || l.targetPace || (l as any).pace;
    const paceSec = parsePaceToSeconds(rawPace);
    if (paceSec > 0 && paceSec < session.bestPaceSeconds) {
      session.bestPaceSeconds = paceSec;
      session.bestPaceFormatted = formatSecondsToPace(paceSec);
    }
  });

  const sessionHistory = Object.values(sessionsMap)
    .map((s) => {
      // Calculate avg HR for the session
      const validHrs = s.sets
        .map((set) => set.actualHR || set.targetHR || (set as any).targetHr)
        .filter((hr): hr is number => typeof hr === 'number' && hr > 0);
      const avgHr = validHrs.length > 0 ? Math.round(validHrs.reduce((a, b) => a + b, 0) / validHrs.length) : 0;

      return {
        ...s,
        bestPaceSeconds: s.bestPaceSeconds === Infinity ? 0 : s.bestPaceSeconds,
        avgHr,
      };
    })
    .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

  // === 1. TOP CARDS CALCULATIONS ===
  // Strength Top Cards:
  const allTimeMaxWeight = Math.max(...exerciseLogs.map((l) => l.weightKg || 0), 0);
  const allTimeMax1RM = Math.max(...sessionHistory.map((s) => s.max1RM), 0);
  const allTimeTotalTonnage = exerciseLogs.reduce((sum, l) => sum + (l.tonnageKg || l.weightKg * l.reps || 0), 0);

  // Cardio Top Cards:
  // "Najdłuższy Dystans": max distance from a single session
  const maxSessionDistanceKm = Math.max(...sessionHistory.map((s) => s.totalDistanceKm), 0);
  const maxSessionDistanceFormatted =
    maxSessionDistanceKm >= 1
      ? `${maxSessionDistanceKm.toFixed(maxSessionDistanceKm % 1 === 0 ? 0 : 2)} km`
      : maxSessionDistanceKm > 0
      ? `${Math.round(maxSessionDistanceKm * 1000)} m`
      : '-';

  // "Najlepsze Tempo": lowest time per km across all logged sets
  const allValidPacesSec = exerciseLogs
    .map((l) => parsePaceToSeconds(l.actualPace || l.targetPace || (l as any).pace))
    .filter((sec) => sec > 0);
  const allTimeBestPaceSec = allValidPacesSec.length > 0 ? Math.min(...allValidPacesSec) : 0;
  const allTimeBestPaceFormatted = allTimeBestPaceSec > 0 ? `${formatSecondsToPace(allTimeBestPaceSec)} min/km` : '-';

  // "Łączny Dystans": sum of all distances across all sessions in km
  const allTimeTotalDistanceKm = exerciseLogs.reduce((sum, l) => sum + getSetDistanceInMeters(l), 0) / 1000;
  const allTimeTotalDistanceFormatted =
    allTimeTotalDistanceKm >= 1
      ? `${allTimeTotalDistanceKm.toFixed(allTimeTotalDistanceKm % 1 === 0 ? 0 : 2)} km`
      : allTimeTotalDistanceKm > 0
      ? `${Math.round(allTimeTotalDistanceKm * 1000)} m`
      : '0 km';

  // === 2. CHART VALUES & MAPPING ===
  let chartValues: number[] = [];
  let chartMaxVal = 10;
  let chartMinVal = 0;
  let latestDisplayValue = '-';

  if (isCardio) {
    if (cardioMetric === 'distance') {
      chartValues = sessionHistory.map((s) => s.totalDistanceKm);
      chartMaxVal = Math.max(...chartValues, 1);
      chartMinVal = 0;
      const latest = chartValues[chartValues.length - 1] || 0;
      latestDisplayValue = `${latest.toFixed(1)} km`;
    } else if (cardioMetric === 'pace') {
      chartValues = sessionHistory.map((s) => s.bestPaceSeconds);
      const positivePaces = chartValues.filter((v) => v > 0);
      chartMaxVal = positivePaces.length > 0 ? Math.max(...positivePaces) : 360;
      chartMinVal = positivePaces.length > 0 ? Math.min(...positivePaces) : 240;
      const latest = chartValues[chartValues.length - 1] || 0;
      latestDisplayValue = latest > 0 ? `${formatSecondsToPace(latest)} min/km` : '-';
    } else {
      // 'hr'
      chartValues = sessionHistory.map((s) => s.avgHr);
      chartMaxVal = Math.max(...chartValues, 100);
      chartMinVal = 0;
      const latest = chartValues[chartValues.length - 1] || 0;
      latestDisplayValue = latest > 0 ? `${Math.round(latest)} bpm` : '-';
    }
  } else {
    chartValues = sessionHistory.map((s) => {
      if (strengthMetric === 'tonnage') return s.totalTonnage;
      if (strengthMetric === 'estimated1rm') return s.max1RM;
      return s.maxWeight;
    });
    chartMaxVal = Math.max(...chartValues, 10);
    chartMinVal = 0;
    const latest = chartValues[chartValues.length - 1] || 0;
    latestDisplayValue = `${latest} kg`;
  }

  // === 3. GROUPED HISTORY LIST (ACCORDION) ===
  interface DailyGroup {
    dateStr: string;
    sets: WorkoutLogEntry[];
    // Strength
    totalVolume: number;
    avgRir: string;
    rirRange: string;
    avgRpe: string;
    rpeRange: string;
    // Cardio
    totalDistKm: number;
    avgPaceFormatted: string;
    avgHrFormatted: string;
  }

  const groupedByDate = exerciseLogs.reduce<Record<string, DailyGroup>>((acc, log) => {
    const key = log.dateStr || (log.timestamp ? log.timestamp.split('T')[0] : 'Sesja');
    if (!acc[key]) {
      acc[key] = {
        dateStr: key,
        sets: [],
        totalVolume: 0,
        avgRir: '-',
        rirRange: '-',
        avgRpe: '-',
        rpeRange: '-',
        totalDistKm: 0,
        avgPaceFormatted: '-',
        avgHrFormatted: '-',
      };
    }
    acc[key].sets.push(log);
    acc[key].totalVolume += log.tonnageKg || log.weightKg * log.reps;
    acc[key].totalDistKm += getSetDistanceInMeters(log) / 1000;
    return acc;
  }, {});

  const dailyHistoryList = Object.values(groupedByDate)
    .map((group) => {
      const sortedSets = [...group.sets].sort((a, b) => (a.setNumber || 1) - (b.setNumber || 1));

      // Strength RIR & RPE calculations
      const rirs = sortedSets
        .map((s) => (typeof s.rir === 'number' ? s.rir : null))
        .filter((v): v is number => v !== null);
      const rpes = sortedSets
        .map((s) => (typeof s.rpe === 'number' ? s.rpe : null))
        .filter((v): v is number => v !== null);

      const rirMin = rirs.length > 0 ? Math.min(...rirs) : null;
      const rirMax = rirs.length > 0 ? Math.max(...rirs) : null;
      const rirRange = rirMin !== null ? (rirMin === rirMax ? `${rirMin}` : `${rirMin}-${rirMax}`) : '-';
      const avgRir = rirs.length > 0 ? (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1) : '-';

      const rpeMin = rpes.length > 0 ? Math.min(...rpes) : null;
      const rpeMax = rpes.length > 0 ? Math.max(...rpes) : null;
      const rpeRange = rpeMin !== null ? (rpeMin === rpeMax ? `${rpeMin}` : `${rpeMin}-${rpeMax}`) : '-';
      const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '-';

      // Cardio Pace & HR calculations
      const pacesSec = sortedSets
        .map((s) => parsePaceToSeconds(s.actualPace || s.targetPace || (s as any).pace))
        .filter((p) => p > 0);
      const avgPaceSec = pacesSec.length > 0 ? Math.round(pacesSec.reduce((a, b) => a + b, 0) / pacesSec.length) : 0;
      const avgPaceFormatted = avgPaceSec > 0 ? `${formatSecondsToPace(avgPaceSec)} min/km` : '-';

      const hrs = sortedSets
        .map((s) => s.actualHR || s.targetHR || (s as any).targetHr)
        .filter((h): h is number => typeof h === 'number' && h > 0);
      const avgHrFormatted = hrs.length > 0 ? `${Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)} bpm` : '-';

      return {
        ...group,
        sets: sortedSets,
        totalVolume: Math.round(group.totalVolume),
        avgRir,
        rirRange,
        avgRpe,
        rpeRange,
        avgPaceFormatted,
        avgHrFormatted,
      };
    })
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] shadow-2xl text-left relative flex flex-col mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
              {isCardio ? <Activity className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {isCardio ? 'Wykres Progresu Cardio / Bieg' : 'Wykres Progresu Ćwiczenia'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white font-heading mt-0.5">
                {exerciseName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Scrollable Modal Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-4 sm:space-y-5 pb-24 overscroll-contain">
          {/* 1. TOP CARDS (KAFELKI PODSUMOWUJĄCE) */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {isCardio ? (
              /* CARDIO: Najdłuższy Dystans, Najlepsze Tempo, Łączny Dystans */
              <>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Najdłuższy Dystans
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-500 dark:text-amber-400 font-mono-numbers">
                    {maxSessionDistanceFormatted}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Najlepsze Tempo
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono-numbers">
                    {allTimeBestPaceFormatted}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Łączny Dystans
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono-numbers mt-0.5">
                    {allTimeTotalDistanceFormatted}
                  </div>
                </div>
              </>
            ) : (
              /* STRENGTH: Rekord Ciężaru, Szacowane 1RM, Łączny Tonaż */
              <>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Rekord Ciężaru (PR)
                  </span>
                  <div className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono-numbers">
                    {allTimeMaxWeight} <span className="text-xs text-neutral-400">kg</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Szacowane 1RM
                  </span>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono-numbers">
                    {allTimeMax1RM} <span className="text-xs text-neutral-400">kg</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Łączny Tonaż
                  </span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-numbers mt-0.5">
                    {allTimeTotalTonnage.toLocaleString()} <span className="text-xs text-neutral-400">kg</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. CHART TOGGLES (PRZEŁĄCZNIKI WYKRESU) */}
          <div className="flex items-center justify-between gap-2 shrink-0 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
            {isCardio ? (
              <>
                <button
                  type="button"
                  onClick={() => setCardioMetric('distance')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cardioMetric === 'distance'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Dystans (km)
                </button>
                <button
                  type="button"
                  onClick={() => setCardioMetric('pace')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cardioMetric === 'pace'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Tempo (min/km)
                </button>
                <button
                  type="button"
                  onClick={() => setCardioMetric('hr')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cardioMetric === 'hr'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Średnie HR (bpm)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStrengthMetric('weight')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    strengthMetric === 'weight'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Ciężar Max (kg)
                </button>
                <button
                  type="button"
                  onClick={() => setStrengthMetric('estimated1rm')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    strengthMetric === 'estimated1rm'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Szacowane 1RM (kg)
                </button>
                <button
                  type="button"
                  onClick={() => setStrengthMetric('tonnage')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    strengthMetric === 'tonnage'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Tonaż Sesji (kg)
                </button>
              </>
            )}
          </div>

          {/* Visual Chart */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shrink-0">
            {sessionHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                {isCardio ? (
                  <Activity className="w-8 h-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                ) : (
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-400 dark:text-neutral-600" />
                )}
                <p>Brak zapisanych logów dla tego ćwiczenia.</p>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  Wykonaj serie w trakcie treningu i zapisz sesję, aby zobaczyć wykres progresu!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 flex-wrap gap-1">
                  <span>Historia {sessionHistory.length} sesji treningowych</span>
                  <div className="flex items-center gap-2">
                    {isCardio && cardioMetric === 'pace' && (
                      <span className="text-[10px] text-amber-500 dark:text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-medium">
                        Oś odwrócona (wyższy słupek = szybsze tempo)
                      </span>
                    )}
                    <span className="font-mono-numbers text-amber-600 dark:text-amber-400 font-bold">
                      Najnowszy: {latestDisplayValue}
                    </span>
                  </div>
                </div>

                {/* Bar / Column Chart */}
                <div className="h-44 flex items-end gap-2 pt-4 px-2 overflow-x-auto scrollbar-none">
                  {sessionHistory.map((s, idx) => {
                    let val = 0;
                    let displayValStr = '';
                    let heightPct = 50;

                    if (isCardio) {
                      if (cardioMetric === 'distance') {
                        val = s.totalDistanceKm;
                        displayValStr = `${val.toFixed(1)}km`;
                        heightPct = chartMaxVal > 0 ? Math.max(15, Math.round((val / chartMaxVal) * 100)) : 15;
                      } else if (cardioMetric === 'pace') {
                        val = s.bestPaceSeconds;
                        displayValStr = val > 0 ? `${formatSecondsToPace(val)}` : '-';
                        // Inverted Y-axis for pace: lower time in seconds = better result = HIGHER bar
                        if (val <= 0) {
                          heightPct = 15;
                        } else if (chartMaxVal === chartMinVal) {
                          heightPct = 70;
                        } else {
                          // Scale inverted: val == chartMinVal (fastest) -> 95%, val == chartMaxVal (slowest) -> 20%
                          const ratio = (chartMaxVal - val) / (chartMaxVal - chartMinVal || 1);
                          heightPct = Math.max(20, Math.min(95, Math.round(20 + ratio * 75)));
                        }
                      } else {
                        // 'hr'
                        val = s.avgHr;
                        displayValStr = val > 0 ? `${Math.round(val)} bpm` : '-';
                        heightPct = chartMaxVal > 0 ? Math.max(15, Math.round((val / chartMaxVal) * 100)) : 15;
                      }
                    } else {
                      val =
                        strengthMetric === 'tonnage'
                          ? s.totalTonnage
                          : strengthMetric === 'estimated1rm'
                          ? s.max1RM
                          : s.maxWeight;
                      displayValStr = `${val}kg`;
                      heightPct = chartMaxVal > 0 ? Math.max(15, Math.round((val / chartMaxVal) * 100)) : 15;
                    }

                    const isLatest = idx === sessionHistory.length - 1;

                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[42px] max-w-[64px] flex flex-col items-center justify-end h-full group"
                      >
                        <span className="text-[10px] font-mono-numbers font-bold text-neutral-500 dark:text-neutral-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {displayValStr}
                        </span>

                        <div className="w-full bg-neutral-200 dark:bg-neutral-900 rounded-xl overflow-hidden p-1 flex flex-col justify-end h-32 border border-neutral-300 dark:border-neutral-800">
                          <div
                            className={`w-full rounded-lg transition-all duration-500 ${
                              isLatest
                                ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-md shadow-amber-400/20'
                                : 'bg-neutral-400 dark:bg-neutral-700 group-hover:bg-amber-400/70'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>

                        <span className="text-[9px] text-neutral-500 mt-1.5 block truncate max-w-[50px]">
                          {s.dateStr.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. GROUPED HISTORY LIST (SZCZEGÓŁY WYKONANYCH SERII - ACCORDION) */}
          <div className="h-auto overflow-visible space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
              Szczegóły Wykonanych Serii ({exerciseLogs.length} w {dailyHistoryList.length} dniach):
            </span>

            {dailyHistoryList.length === 0 ? (
              <p className="text-neutral-500 text-xs italic">Brak wpisów.</p>
            ) : (
              <div className="space-y-2">
                {dailyHistoryList.map((dayGroup) => {
                  const isExpanded = !!expandedDates[dayGroup.dateStr];
                  return (
                    <div
                      key={dayGroup.dateStr}
                      className="rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all shadow-sm"
                    >
                      {/* Accordion Header Tile */}
                      <button
                        type="button"
                        onClick={() => toggleDateExpand(dayGroup.dateStr)}
                        className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900/60 transition-colors gap-2 select-none"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white text-xs">
                            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{dayGroup.dateStr}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25">
                            {dayGroup.sets.length}{' '}
                            {isCardio
                              ? dayGroup.sets.length === 1
                                ? 'odcinek'
                                : dayGroup.sets.length < 5
                                ? 'odcinki'
                                : 'odcinków'
                              : dayGroup.sets.length === 1
                              ? 'seria'
                              : dayGroup.sets.length < 5
                              ? 'serie'
                              : 'serii'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[11px] shrink-0">
                          {isCardio ? (
                            <>
                              <span className="font-mono-numbers font-bold text-neutral-700 dark:text-neutral-300">
                                {dayGroup.totalDistKm >= 1
                                  ? `${dayGroup.totalDistKm.toFixed(2)} km`
                                  : `${Math.round(dayGroup.totalDistKm * 1000)} m`}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                Tempo: {dayGroup.avgPaceFormatted}
                              </span>
                              {dayGroup.avgHrFormatted !== '-' && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium text-[10px]">
                                  {dayGroup.avgHrFormatted}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-mono-numbers font-bold text-neutral-700 dark:text-neutral-300">
                                {dayGroup.totalVolume.toLocaleString()} kg
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                RIR {dayGroup.rirRange}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                RPE {dayGroup.rpeRange}
                              </span>
                            </>
                          )}
                          <div className="p-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Accordion Body - Detailed Sets */}
                      {isExpanded && (
                        <div className="p-3 pt-0 border-t border-neutral-200 dark:border-neutral-800/80 mt-1 space-y-1.5 animate-in fade-in duration-150">
                          <div className="pt-2 space-y-1.5">
                            {dayGroup.sets.map((set, sIdx) => {
                              if (isCardio) {
                                const dist = set.targetDistance || (set as any).distance || 800;
                                const unit = set.distanceUnit || (set as any).distanceUnit || 'm';
                                const pace = set.actualPace || set.targetPace || (set as any).pace || '-';
                                const hr = set.actualHR || set.targetHR || (set as any).targetHr;

                                return (
                                  <div
                                    key={set.id || sIdx}
                                    className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 font-bold flex items-center justify-center text-[10px]">
                                        #{set.setNumber || sIdx + 1}
                                      </span>
                                      <span className="font-mono-numbers font-bold text-amber-600 dark:text-amber-400">
                                        {dist} {unit}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                        Tempo: <strong className="font-mono-numbers">{pace}</strong>
                                      </span>
                                      {hr !== undefined && hr > 0 && (
                                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-bold text-[10px]">
                                          HR: {hr} bpm
                                        </span>
                                      )}
                                      {set.rpe !== undefined && (
                                        <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                          RPE {set.rpe}
                                        </span>
                                      )}
                                      {set.notes && (
                                        <span
                                          className="italic text-neutral-500 truncate max-w-[120px] text-[10px]"
                                          title={set.notes}
                                        >
                                          &quot;{set.notes}&quot;
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={set.id || sIdx}
                                  className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 font-bold flex items-center justify-center text-[10px]">
                                      #{set.setNumber || sIdx + 1}
                                    </span>
                                    <span className="font-mono-numbers font-bold text-amber-600 dark:text-amber-400">
                                      {set.weightKg} {set.unit || 'kg'} × {set.reps} powt.
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium text-[10px]">
                                      RIR {set.rir !== undefined ? set.rir : '-'} | RPE {set.rpe !== undefined ? set.rpe : '-'}
                                    </span>
                                    <span className="font-mono-numbers text-neutral-600 dark:text-neutral-400 text-[10px]">
                                      {(set.tonnageKg || set.weightKg * set.reps).toLocaleString()} kg
                                    </span>
                                    {set.notes && (
                                      <span
                                        className="italic text-neutral-500 truncate max-w-[120px] text-[10px]"
                                        title={set.notes}
                                      >
                                        &quot;{set.notes}&quot;
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer inside unified scroll container */}
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-right">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
