import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  X,
  TrendingUp,
  Dumbbell,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Activity,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { WorkoutLogEntry, Exercise } from '../../types/hyrox';
import { EXERCISE_CATALOG } from '../../data/exerciseCatalog';

type ChartDragZone = 'y-left' | 'x' | 'pan';

interface ChartDragSnapshot {
  zone: ChartDragZone;
  pointerId: number;
  startX: number;
  startY: number;
  plotWidth: number;
  plotHeight: number;
  initXDomain: [number, number];
  initYDomain: [number, number];
}

const CHART_LEFT_AXIS_WIDTH = 52;
const CHART_X_AXIS_HEIGHT = 34;

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

// Helper to extract speed in km/h from log entry, falling back to pace if speed is absent
export const getSetSpeedKmh = (set: WorkoutLogEntry): number => {
  if (typeof set.speed === 'number' && Number.isFinite(set.speed) && set.speed > 0) {
    return set.speed;
  }
  const rawSpeed = (set as any).speed;
  if (rawSpeed !== undefined && rawSpeed !== null && String(rawSpeed).trim() !== '') {
    const parsed = parseFloat(String(rawSpeed).replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const rawPace = set.actualPace || set.targetPace || (set as any).pace;
  const paceSec = parsePaceToSeconds(rawPace);
  if (paceSec > 0) {
    return 3600 / paceSec;
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
  const [cardioMetric, setCardioMetric] = useState<'distance' | 'pace' | 'hr' | 'load'>('distance');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // TradingView-style zoom & pan state
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<ChartDragSnapshot | null>(null);
  const [activeDragZone, setActiveDragZone] = useState<ChartDragZone | null>(null);
  const [hoverZone, setHoverZone] = useState<ChartDragZone | null>(null);
  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [yDomain, setYDomain] = useState<[number, number] | null>(null);

  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Resolve category safely
  const catalogMatch =
    !category && !exercise?.category
      ? EXERCISE_CATALOG.find(
          (c) => c.name.trim().toLowerCase() === exerciseName.trim().toLowerCase()
        )
      : undefined;

  const resolvedCategory = exercise?.category || category || catalogMatch?.category;
  const isCardio = resolvedCategory === 'cardio';
  const isPaceMetric = isCardio && cardioMetric === 'pace';

  // Filter logs for this specific exercise
  const exerciseLogs = useMemo(
    () =>
      workoutLogs.filter(
        (l) => l.exerciseName && l.exerciseName.trim().toLowerCase() === exerciseName.trim().toLowerCase()
      ),
    [workoutLogs, exerciseName]
  );

  // Group logs by date / session
  interface SessionSummary {
    dateStr: string;
    sets: WorkoutLogEntry[];
    maxWeight: number;
    totalTonnage: number;
    max1RM: number;
    avgRpe: number;
    totalDistanceKm: number;
    bestPaceSeconds: number;
    bestPaceFormatted: string;
    avgHr: number;
    loadIndex: number;
  }

  const sessionHistory = useMemo(() => {
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
          loadIndex: 0,
        };
      }
      const session = sessionsMap[key];
      session.sets.push(l);

      if (l.weightKg > session.maxWeight) {
        session.maxWeight = l.weightKg;
      }
      session.totalTonnage += l.tonnageKg || l.weightKg * l.reps;

      const epley = Math.round(l.weightKg * (1 + l.reps / 30));
      if (epley > session.max1RM) {
        session.max1RM = epley;
      }

      const distMeters = getSetDistanceInMeters(l);
      const distKm = distMeters / 1000;
      session.totalDistanceKm += distKm;

      const speedKmh = getSetSpeedKmh(l);
      if (distKm > 0 && speedKmh > 0) {
        session.loadIndex += distKm * speedKmh;
      }

      const rawPace = l.actualPace || l.targetPace || (l as any).pace;
      const paceSec = parsePaceToSeconds(rawPace);
      if (paceSec > 0 && paceSec < session.bestPaceSeconds) {
        session.bestPaceSeconds = paceSec;
        session.bestPaceFormatted = formatSecondsToPace(paceSec);
      }
    });

    return Object.values(sessionsMap)
      .map((s) => {
        const validHrs = s.sets
          .map((set) => set.actualHR || set.targetHR || (set as any).targetHr)
          .filter((hr): hr is number => typeof hr === 'number' && hr > 0);
        const avgHr =
          validHrs.length > 0 ? Math.round(validHrs.reduce((a, b) => a + b, 0) / validHrs.length) : 0;

        return {
          ...s,
          bestPaceSeconds: s.bestPaceSeconds === Infinity ? 0 : s.bestPaceSeconds,
          avgHr,
          loadIndex: Math.round(s.loadIndex * 10) / 10,
        };
      })
      .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());
  }, [exerciseLogs]);

  // === 1. TOP CARDS CALCULATIONS ===
  const allTimeMaxWeight = Math.max(...exerciseLogs.map((l) => l.weightKg || 0), 0);
  const allTimeMax1RM = Math.max(...sessionHistory.map((s) => s.max1RM), 0);
  const allTimeTotalTonnage = exerciseLogs.reduce(
    (sum, l) => sum + (l.tonnageKg || l.weightKg * l.reps || 0),
    0
  );

  const maxSessionDistanceKm = Math.max(...sessionHistory.map((s) => s.totalDistanceKm), 0);
  const maxSessionDistanceFormatted =
    maxSessionDistanceKm >= 1
      ? `${maxSessionDistanceKm.toFixed(maxSessionDistanceKm % 1 === 0 ? 0 : 2)} km`
      : maxSessionDistanceKm > 0
      ? `${Math.round(maxSessionDistanceKm * 1000)} m`
      : '-';

  const allValidPacesSec = exerciseLogs
    .map((l) => parsePaceToSeconds(l.actualPace || l.targetPace || (l as any).pace))
    .filter((sec) => sec > 0);
  const allTimeBestPaceSec = allValidPacesSec.length > 0 ? Math.min(...allValidPacesSec) : 0;
  const allTimeBestPaceFormatted =
    allTimeBestPaceSec > 0 ? `${formatSecondsToPace(allTimeBestPaceSec)} min/km` : '-';

  const allTimeTotalDistanceKm =
    exerciseLogs.reduce((sum, l) => sum + getSetDistanceInMeters(l), 0) / 1000;
  const allTimeTotalDistanceFormatted =
    allTimeTotalDistanceKm >= 1
      ? `${allTimeTotalDistanceKm.toFixed(allTimeTotalDistanceKm % 1 === 0 ? 0 : 2)} km`
      : allTimeTotalDistanceKm > 0
      ? `${Math.round(allTimeTotalDistanceKm * 1000)} m`
      : '0 km';

  // === 2. CHART DATA & TRADINGVIEW INTERACTIVITY ===
  const chartData = useMemo(() => {
    return sessionHistory.map((s, idx) => {
      let value: number | null = 0;
      if (isCardio) {
        if (cardioMetric === 'distance') {
          value = Number(s.totalDistanceKm.toFixed(2));
        } else if (cardioMetric === 'pace') {
          value = s.bestPaceSeconds > 0 ? s.bestPaceSeconds : null;
        } else if (cardioMetric === 'hr') {
          value = s.avgHr > 0 ? s.avgHr : null;
        } else {
          value = s.loadIndex > 0 ? s.loadIndex : null;
        }
      } else {
        if (strengthMetric === 'tonnage') value = Math.round(s.totalTonnage);
        else if (strengthMetric === 'estimated1rm') value = s.max1RM;
        else value = s.maxWeight;
      }

      return {
        idx,
        dateStr: s.dateStr,
        displayDate: s.dateStr.length >= 10 ? s.dateStr.slice(5) : s.dateStr,
        value,
        setsCount: s.sets.length,
        maxWeight: s.maxWeight,
        max1RM: s.max1RM,
        totalTonnage: Math.round(s.totalTonnage),
        totalDistanceKm: Number(s.totalDistanceKm.toFixed(2)),
        bestPaceFormatted: s.bestPaceFormatted,
        avgHr: s.avgHr,
        loadIndex: s.loadIndex,
      };
    });
  }, [sessionHistory, isCardio, cardioMetric, strengthMetric]);

  const latestDisplayValue = useMemo(() => {
    if (chartData.length === 0) return '-';
    const latestPoint = [...chartData].reverse().find((d) => d.value !== null) || chartData[chartData.length - 1];
    const latest = latestPoint?.value ?? 0;
    if (isCardio) {
      if (cardioMetric === 'distance') return `${Number(latest).toFixed(1)} km`;
      if (cardioMetric === 'pace') return latest > 0 ? `${formatSecondsToPace(Number(latest))} min/km` : '-';
      if (cardioMetric === 'hr') return latest > 0 ? `${Math.round(Number(latest))} bpm` : '-';
      return latest > 0 ? `${Number(latest).toFixed(1)} pkt` : '-';
    }
    return `${Number(latest).toLocaleString()} kg`;
  }, [chartData, isCardio, cardioMetric]);

  const defaultXDomain = useMemo<[number, number]>(() => {
    const n = chartData.length;
    if (n <= 1) return [-0.5, 0.5];
    return [-0.25, n - 1 + 0.25];
  }, [chartData.length]);

  const effectiveXDomain = xDomain ?? defaultXDomain;

  const autoYDomain = useMemo<[number, number]>(() => {
    const n = chartData.length;
    if (n === 0) return [0, 100];
    const startIdx = Math.max(0, Math.floor(effectiveXDomain[0]) - 1);
    const endIdx = Math.min(n - 1, Math.ceil(effectiveXDomain[1]) + 1);
    const slice = chartData.slice(startIdx, endIdx + 1);
    const pool = slice.length > 0 ? slice : chartData;

    const vals = pool
      .map((d) => d.value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (vals.length === 0) return isPaceMetric ? [200, 360] : [0, 100];

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min;

    if (chartType === 'bar' && !isPaceMetric) {
      const topPad = span > 0 ? Math.max(1, span * 0.16) : Math.max(2, max * 0.18);
      const bottom = min >= 0 ? Math.max(0, Number((min - topPad * 0.5).toFixed(1))) : 0;
      return [bottom, Number((max + topPad).toFixed(1))];
    }

    const pad = span > 0 ? Math.max(isPaceMetric ? 5 : 1.5, span * 0.18) : isPaceMetric ? 15 : 5;
    return [Math.max(0, Number((min - pad).toFixed(1))), Number((max + pad).toFixed(1))];
  }, [chartData, effectiveXDomain, chartType, isPaceMetric]);

  const effectiveYDomain = yDomain ?? autoYDomain;

  const xTicks = useMemo(() => {
    const n = chartData.length;
    if (n === 0) return [];
    const minIdx = Math.max(0, Math.ceil(effectiveXDomain[0]));
    const maxIdx = Math.min(n - 1, Math.floor(effectiveXDomain[1]));
    if (minIdx > maxIdx) return [];
    const count = maxIdx - minIdx + 1;
    const step = Math.max(1, Math.ceil(count / 7));
    const ticks: number[] = [];
    for (let i = minIdx; i <= maxIdx; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [chartData.length, effectiveXDomain]);

  const visibleBarData = useMemo(() => {
    const n = chartData.length;
    if (n === 0) return [];
    const startIdx = Math.max(0, Math.floor(effectiveXDomain[0]));
    const endIdx = Math.min(n - 1, Math.ceil(effectiveXDomain[1]));
    if (startIdx > endIdx) return chartData;
    return chartData.slice(startIdx, endIdx + 1);
  }, [chartData, effectiveXDomain]);

  const isChartAdjusted = Boolean(xDomain || yDomain);
  const reverseYAxis = isPaceMetric && chartType === 'line';

  const handleResetZoom = useCallback(() => {
    setXDomain(null);
    setYDomain(null);
  }, []);

  // Reset zoom when modal opens, exercise changes, or active metric / chart type changes
  useEffect(() => {
    setXDomain(null);
    setYDomain(null);
  }, [exerciseName, isOpen, strengthMetric, cardioMetric, chartType]);

  const detectZone = useCallback((relX: number, relY: number, height: number): ChartDragZone => {
    if (relX <= CHART_LEFT_AXIS_WIDTH) return 'y-left';
    if (relY >= height - CHART_X_AXIS_HEIGHT) return 'x';
    return 'pan';
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (chartData.length === 0) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = chartContainerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const zone = detectZone(relX, relY, rect.height);

    const plotWidth = Math.max(40, rect.width - CHART_LEFT_AXIS_WIDTH - 14);
    const plotHeight = Math.max(40, rect.height - CHART_X_AXIS_HEIGHT - 10);

    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }

    dragRef.current = {
      zone,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      plotWidth,
      plotHeight,
      initXDomain: [...effectiveXDomain] as [number, number],
      initYDomain: [...effectiveYDomain] as [number, number],
    };
    setActiveDragZone(zone);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = chartContainerRef.current;
    if (!el || chartData.length === 0) return;

    const snap = dragRef.current;
    if (!snap) {
      if (e.pointerType === 'mouse') {
        const rect = el.getBoundingClientRect();
        const zone = detectZone(e.clientX - rect.left, e.clientY - rect.top, rect.height);
        setHoverZone(zone);
      }
      return;
    }

    const dx = e.clientX - snap.startX;
    const dy = e.clientY - snap.startY;
    const n = chartData.length;

    if (snap.zone === 'y-left') {
      const [initMin, initMax] = snap.initYDomain;
      const initSpan = Math.max(0.5, initMax - initMin);
      const center = (initMin + initMax) / 2;
      const factor = Math.exp(dy * 0.0085);
      const maxSpan = Math.max(500, initSpan * 8);
      const newSpan = Math.min(maxSpan, Math.max(0.5, initSpan * factor));
      let nextMin = center - newSpan / 2;
      let nextMax = center + newSpan / 2;
      if (nextMin < 0) {
        nextMin = 0;
        nextMax = newSpan;
      }
      setYDomain([Number(nextMin.toFixed(2)), Number(nextMax.toFixed(2))]);
    } else if (snap.zone === 'x') {
      const [initMin, initMax] = snap.initXDomain;
      const initSpan = Math.max(0.4, initMax - initMin);
      const center = (initMin + initMax) / 2;
      const factor = Math.exp(-dx * 0.0085);
      const minSpan = n <= 1 ? 0.4 : 0.65;
      const maxSpan = Math.max(n + 2, 6);
      const newSpan = Math.min(maxSpan, Math.max(minSpan, initSpan * factor));
      let nextMin = center - newSpan / 2;
      let nextMax = center + newSpan / 2;
      const minBound = -newSpan * 0.5;
      const maxBound = Math.max(0, n - 1) + newSpan * 0.5;
      if (nextMin < minBound) {
        nextMin = minBound;
        nextMax = nextMin + newSpan;
      }
      if (nextMax > maxBound) {
        nextMax = maxBound;
        nextMin = nextMax - newSpan;
      }
      setXDomain([nextMin, nextMax]);
    } else {
      // Pan X and Y without changing scale
      const [initXMin, initXMax] = snap.initXDomain;
      const xSpan = Math.max(0.4, initXMax - initXMin);
      const shiftX = -(dx / snap.plotWidth) * xSpan;
      let nextXMin = initXMin + shiftX;
      let nextXMax = initXMax + shiftX;
      const minAllowedX = -xSpan * 0.65;
      const maxAllowedX = Math.max(0, n - 1) + xSpan * 0.65;
      if (nextXMin < minAllowedX) {
        nextXMin = minAllowedX;
        nextMaxClamp();
      }
      function nextMaxClamp() {
        nextXMax = nextXMin + xSpan;
      }
      if (nextXMax > maxAllowedX) {
        nextXMax = maxAllowedX;
        nextXMin = nextXMax - xSpan;
      }
      setXDomain([nextXMin, nextXMax]);

      const [initYMin, initYMax] = snap.initYDomain;
      const ySpan = Math.max(0.5, initYMax - initYMin);
      const shiftY = (reverseYAxis ? -1 : 1) * (dy / snap.plotHeight) * ySpan;
      let nextYMin = initYMin + shiftY;
      let nextYMax = initYMax + shiftY;
      if (nextYMin < 0) {
        nextYMin = 0;
        nextYMax = ySpan;
      }
      setYDomain([Number(nextYMin.toFixed(2)), Number(nextYMax.toFixed(2))]);
    }
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e && chartContainerRef.current && dragRef.current) {
      try {
        if (chartContainerRef.current.hasPointerCapture(e.pointerId)) {
          chartContainerRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    }
    dragRef.current = null;
    setActiveDragZone(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = chartContainerRef.current;
    if (!el || chartData.length === 0) return;
    const rect = el.getBoundingClientRect();
    const zone = detectZone(e.clientX - rect.left, e.clientY - rect.top, rect.height);
    if (zone === 'y-left') {
      setYDomain(null);
    } else if (zone === 'x') {
      setXDomain(null);
    } else {
      handleResetZoom();
    }
  };

  // Smooth wheel zoom on X or Y axis
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!isOpen || !el || chartData.length === 0) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const zone = detectZone(e.clientX - rect.left, e.clientY - rect.top, rect.height);
      const factor = Math.exp(e.deltaY * 0.0018);

      if (zone === 'y-left') {
        const [min, max] = effectiveYDomain;
        const span = Math.max(0.5, max - min);
        const center = (min + max) / 2;
        const maxSpan = Math.max(500, span * 8);
        const nextSpan = Math.min(maxSpan, Math.max(0.5, span * factor));
        const nextMin = Math.max(0, center - nextSpan / 2);
        setYDomain([Number(nextMin.toFixed(2)), Number((nextMin + nextSpan).toFixed(2))]);
      } else {
        const n = chartData.length;
        const [min, max] = effectiveXDomain;
        const span = Math.max(0.4, max - min);
        const plotW = Math.max(40, rect.width - CHART_LEFT_AXIS_WIDTH - 14);
        const anchorRatio = Math.min(
          1,
          Math.max(0, (e.clientX - rect.left - CHART_LEFT_AXIS_WIDTH) / plotW)
        );
        const anchorVal = min + anchorRatio * span;
        const minSpan = n <= 1 ? 0.4 : 0.65;
        const maxSpan = Math.max(n + 2, 6);
        const nextSpan = Math.min(maxSpan, Math.max(minSpan, span * factor));
        const nextMin = anchorVal - anchorRatio * nextSpan;
        setXDomain([nextMin, nextMin + nextSpan]);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, chartData.length, detectZone, effectiveYDomain, effectiveXDomain]);

  const currentZone = activeDragZone ?? hoverZone;
  const chartCursorClass =
    currentZone === 'y-left'
      ? 'cursor-ns-resize'
      : currentZone === 'x'
      ? 'cursor-ew-resize'
      : activeDragZone === 'pan'
      ? 'cursor-grabbing'
      : 'cursor-grab';

  if (!isOpen) return null;

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
          <div
            className={`shrink-0 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 ${
              isCardio ? 'grid grid-cols-2 sm:grid-cols-4 gap-1' : 'flex items-center justify-between gap-2'
            }`}
          >
            {isCardio ? (
              <>
                <button
                  type="button"
                  onClick={() => setCardioMetric('distance')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    cardioMetric === 'hr'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Średnie HR (bpm)
                </button>
                <button
                  type="button"
                  onClick={() => setCardioMetric('load')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    cardioMetric === 'load'
                      ? 'bg-amber-400 text-black shadow font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Obciążenie (Indeks)
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

          {/* Interactive Recharts Visualization (Line / Bar + TradingView Zoom & Pan) */}
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
                {/* Header row with session count, latest value, reset button, and Line/Bar Toggle */}
                <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-600 dark:text-neutral-400">
                      <span>Historia {sessionHistory.length} sesji</span>
                      <span className="font-mono-numbers text-amber-600 dark:text-amber-400 font-bold">
                        • Najnowszy: {latestDisplayValue}
                      </span>
                    </div>
                    {isPaceMetric && (
                      <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-medium">
                        {chartType === 'line'
                          ? 'Oś odwrócona (wyżej = szybsze tempo)'
                          : 'Niższy słupek = szybsze tempo'}
                      </span>
                    )}
                  </div>

                  {/* Top-right controls: Reset Zoom + Chart Type Toggle ("Liniowy" / "Słupkowy") */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {isChartAdjusted && (
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-600 dark:text-amber-400 border border-amber-400/30 text-[10px] font-bold transition-all cursor-pointer"
                        title="Resetuj powiększenie i przesunięcie osi"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}

                    <div
                      className="inline-flex items-center p-0.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800"
                      role="group"
                      aria-label="Typ wykresu"
                    >
                      <button
                        type="button"
                        onClick={() => setChartType('line')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          chartType === 'line'
                            ? 'bg-amber-400 text-black font-black shadow-sm'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>Liniowy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartType('bar')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          chartType === 'bar'
                            ? 'bg-amber-400 text-black font-black shadow-sm'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>Słupkowy</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* TradingView Interactive Recharts Area */}
                <div
                  ref={chartContainerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onPointerLeave={() => {
                    if (!dragRef.current) setHoverZone(null);
                  }}
                  onDoubleClick={handleDoubleClick}
                  style={{ touchAction: 'none' }}
                  className={`relative h-56 sm:h-64 w-full pt-1 select-none ${chartCursorClass}`}
                >
                  {/* Axis hover/drag highlight strips */}
                  <div
                    className={`pointer-events-none absolute top-1 bottom-[34px] left-0 w-[52px] rounded-l-xl transition-colors ${
                      currentZone === 'y-left' ? 'bg-amber-400/10 border-r border-amber-400/30' : ''
                    }`}
                  />
                  <div
                    className={`pointer-events-none absolute bottom-0 left-[52px] right-3 h-[34px] rounded-b-xl transition-colors ${
                      currentZone === 'x' ? 'bg-amber-400/10 border-t border-amber-400/30' : ''
                    }`}
                  />

                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 12, left: 2, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(115, 115, 115, 0.22)" />
                        <XAxis
                          type="number"
                          dataKey="idx"
                          domain={effectiveXDomain}
                          ticks={xTicks}
                          allowDataOverflow
                          stroke="#737373"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          tickFormatter={(val) => chartData[Math.round(Number(val))]?.displayDate || ''}
                          height={30}
                        />
                        <YAxis
                          stroke="#737373"
                          domain={effectiveYDomain}
                          reversed={reverseYAxis}
                          allowDataOverflow
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          width={48}
                          tickFormatter={(val) => {
                            if (!Number.isFinite(val)) return '';
                            if (isPaceMetric) return formatSecondsToPace(Math.round(Number(val)));
                            if (isCardio && (cardioMetric === 'distance' || cardioMetric === 'load')) {
                              return `${Math.round(Number(val) * 10) / 10}`;
                            }
                            return `${Math.round(Number(val))}`;
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            let metricLabel = '';
                            if (isCardio) {
                              if (cardioMetric === 'distance') {
                                metricLabel =
                                  d.value !== null
                                    ? `Dystans: ${
                                        d.value >= 1
                                          ? `${Number(d.value).toFixed(2)} km`
                                          : `${Math.round(Number(d.value) * 1000)} m`
                                      }`
                                    : 'Dystans: -';
                              } else if (cardioMetric === 'pace') {
                                metricLabel =
                                  d.value !== null && d.value > 0
                                    ? `Najlepsze Tempo: ${formatSecondsToPace(Number(d.value))} min/km`
                                    : 'Tempo: -';
                              } else if (cardioMetric === 'hr') {
                                metricLabel =
                                  d.value !== null && d.value > 0
                                    ? `Średnie HR: ${Math.round(Number(d.value))} bpm`
                                    : 'Tętno: -';
                              } else {
                                metricLabel =
                                  d.value !== null && d.value > 0
                                    ? `Obciążenie: ${Number(d.value).toFixed(1)} pkt`
                                    : 'Obciążenie: -';
                              }
                            } else {
                              if (strengthMetric === 'tonnage') {
                                metricLabel = `Tonaż Sesji: ${Number(d.value).toLocaleString()} kg`;
                              } else if (strengthMetric === 'estimated1rm') {
                                metricLabel = `Szacowane 1RM: ${d.value} kg`;
                              } else {
                                metricLabel = `Ciężar Max: ${d.value} kg`;
                              }
                            }

                            return (
                              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl text-xs space-y-1">
                                <div className="text-[10px] text-neutral-400 font-bold">
                                  {d.dateStr}
                                </div>
                                <div className="text-amber-400 font-mono-numbers font-black text-sm">
                                  {metricLabel}
                                </div>
                                <div className="text-[11px] text-neutral-400">
                                  {isCardio
                                    ? `${d.setsCount} ${d.setsCount === 1 ? 'odcinek' : 'odcinków'}`
                                    : `Ciężar max: ${d.maxWeight} kg • ${d.setsCount} serii`}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          dot={{ fill: '#f59e0b', r: 4, stroke: '#18181b', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#fbbf24' }}
                          connectNulls
                          isAnimationActive={false}
                        />
                      </LineChart>
                    ) : (
                      <BarChart
                        data={visibleBarData}
                        margin={{ top: 10, right: 12, left: 2, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(115, 115, 115, 0.22)" vertical={false} />
                        <XAxis
                          dataKey="displayDate"
                          stroke="#737373"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          height={30}
                        />
                        <YAxis
                          stroke="#737373"
                          domain={effectiveYDomain}
                          allowDataOverflow
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          width={48}
                          tickFormatter={(val) => {
                            if (!Number.isFinite(val)) return '';
                            if (isPaceMetric) return formatSecondsToPace(Math.round(Number(val)));
                            if (isCardio && (cardioMetric === 'distance' || cardioMetric === 'load')) {
                              return `${Math.round(Number(val) * 10) / 10}`;
                            }
                            return `${Math.round(Number(val))}`;
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            let metricLabel = '';
                            if (isCardio) {
                              if (cardioMetric === 'distance') {
                                metricLabel =
                                  d.value !== null
                                    ? `Dystans: ${
                                        d.value >= 1
                                          ? `${Number(d.value).toFixed(2)} km`
                                          : `${Math.round(Number(d.value) * 1000)} m`
                                      }`
                                    : 'Dystans: -';
                              } else if (cardioMetric === 'pace') {
                                metricLabel =
                                  d.value !== null && d.value > 0
                                    ? `Najlepsze Tempo: ${formatSecondsToPace(Number(d.value))} min/km`
                                    : 'Tempo: -';
                              } else if (cardioMetric === 'hr') {
                                metricLabel =
                                  d.value !== null && d.value > 0
                                    ? `Średnie HR: ${Math.round(Number(d.value))} bpm`
                                    : 'Tętno: -';
                              } else {
                                metricLabel =
                                  d.value !== null && d.value > 0
                                    ? `Obciążenie: ${Number(d.value).toFixed(1)} pkt`
                                    : 'Obciążenie: -';
                              }
                            } else {
                              if (strengthMetric === 'tonnage') {
                                metricLabel = `Tonaż Sesji: ${Number(d.value).toLocaleString()} kg`;
                              } else if (strengthMetric === 'estimated1rm') {
                                metricLabel = `Szacowane 1RM: ${d.value} kg`;
                              } else {
                                metricLabel = `Ciężar Max: ${d.value} kg`;
                              }
                            }

                            return (
                              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl text-xs space-y-1">
                                <div className="text-[10px] text-neutral-400 font-bold">
                                  {d.dateStr}
                                </div>
                                <div className="text-amber-400 font-mono-numbers font-black text-sm">
                                  {metricLabel}
                                </div>
                                <div className="text-[11px] text-neutral-400">
                                  {isCardio
                                    ? `${d.setsCount} ${d.setsCount === 1 ? 'odcinek' : 'odcinków'}`
                                    : `Ciężar max: ${d.maxWeight} kg • ${d.setsCount} serii`}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={44}
                          isAnimationActive={false}
                        >
                          {visibleBarData.map((entry) => (
                            <Cell
                              key={entry.idx}
                              fill={entry.idx === chartData.length - 1 ? '#f59e0b' : '#737373'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                <p className="text-[10px] text-neutral-500 text-center">
                  Przeciągnij oś Y / X aby skalować • Przeciągnij siatkę aby przesuwać • Dwuklik resetuje
                </p>
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
