import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Percent,
  Trash2,
  Calendar,
  CloudUpload,
  RefreshCw,
  SlidersHorizontal,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BodyMeasurement } from '../../types/measurements';
import { SyncStatus } from '../../hooks/useMeasurements';
import { getLocalDateString } from '../../utils/dateUtils';

interface HistoryTabProps {
  measurements: BodyMeasurement[];
  onDeleteMeasurement: (id: string) => void;
  syncStatus: SyncStatus;
  onSyncWithGoogleSheets: () => Promise<{ success: boolean; message: string }>;
  webhookUrl: string;
  onUpdateWebhookUrl: (url: string) => void;
}

type DateRangePreset = '1M' | '3M' | '1Y' | 'ALL' | 'CUSTOM';
type DragZone = 'y-left' | 'y-right' | 'x' | 'pan';

interface DragSnapshot {
  zone: DragZone;
  pointerId: number;
  startX: number;
  startY: number;
  plotWidth: number;
  plotHeight: number;
  initXDomain: [number, number];
  initLeftYDomain: [number, number];
  initRightYDomain: [number, number];
}

const LEFT_AXIS_HIT_WIDTH = 48;
const RIGHT_AXIS_HIT_WIDTH = 48;
const X_AXIS_HIT_HEIGHT = 36;

export const HistoryTab: React.FC<HistoryTabProps> = ({
  measurements,
  onDeleteMeasurement,
  syncStatus,
  onSyncWithGoogleSheets,
  webhookUrl,
  onUpdateWebhookUrl,
}) => {
  // Date range picker state (default: 'ALL' = "Wszystko")
  const [datePreset, setDatePreset] = useState<DateRangePreset>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleSelectPreset = useCallback((preset: Exclude<DateRangePreset, 'CUSTOM'>) => {
    setDatePreset(preset);
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date(end);
    if (preset === '1M') {
      start.setMonth(start.getMonth() - 1);
    } else if (preset === '3M') {
      start.setMonth(start.getMonth() - 3);
    } else if (preset === '1Y') {
      start.setFullYear(start.getFullYear() - 1);
    }
    setStartDate(getLocalDateString(start));
    setEndDate(getLocalDateString(end));
  }, []);

  const filteredMeasurements = useMemo(() => {
    return measurements.filter((m) => {
      const d = (m.date || '').slice(0, 10);
      if (!d) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [measurements, startDate, endDate]);

  // Line visibility toggles
  const [showWeight, setShowWeight] = useState<boolean>(true);
  const [showBf, setShowBf] = useState<boolean>(true);
  const [showWaist, setShowWaist] = useState<boolean>(false);
  const [showAbdomen, setShowAbdomen] = useState<boolean>(false);
  const [showChest, setShowChest] = useState<boolean>(false);
  const [showBiceps, setShowBiceps] = useState<boolean>(false);
  const [showThigh, setShowThigh] = useState<boolean>(false);

  // Webhook settings accordion
  const [isWebhookOpen, setIsWebhookOpen] = useState<boolean>(false);
  const [tempWebhookUrl, setTempWebhookUrl] = useState<string>(webhookUrl);

  // Sort chronological for chart (oldest first) using filteredMeasurements
  const chartData = useMemo(() => {
    return [...filteredMeasurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m, idx) => ({
        idx,
        date: m.date.slice(5), // MM-DD
        fullDate: m.date,
        weight: m.weightKg,
        bf: m.bodyFatPct,
        waist: m.circumferences.waist,
        abdomen: m.circumferences.abdomen,
        chest: m.circumferences.chest,
        biceps: m.circumferences.biceps,
        thigh: m.circumferences.thigh,
        leanMass: m.leanMassKg,
        fatMass: m.fatMassKg,
      }));
  }, [filteredMeasurements]);

  // TradingView-style independent Axis Scaling & Pan state
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSnapshot | null>(null);
  const [activeDragZone, setActiveDragZone] = useState<DragZone | null>(null);
  const [hoverZone, setHoverZone] = useState<DragZone | null>(null);

  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [leftYDomain, setLeftYDomain] = useState<[number, number] | null>(null);
  const [rightYDomain, setRightYDomain] = useState<[number, number] | null>(null);

  const defaultXDomain = useMemo<[number, number]>(() => {
    const n = chartData.length;
    if (n <= 1) return [-0.5, 0.5];
    return [-0.25, n - 1 + 0.25];
  }, [chartData.length]);

  const effectiveXDomain = xDomain ?? defaultXDomain;

  // Dynamic Y domains based on currently visible X slice
  const autoLeftYDomain = useMemo<[number, number]>(() => {
    const n = chartData.length;
    if (n === 0) return [0, 100];
    const startIdx = Math.max(0, Math.floor(effectiveXDomain[0]) - 1);
    const endIdx = Math.min(n - 1, Math.ceil(effectiveXDomain[1]) + 1);
    const slice = chartData.slice(startIdx, endIdx + 1);
    const pool = slice.length > 0 ? slice : chartData;

    const vals: number[] = [];
    pool.forEach((d) => {
      if (showWeight && typeof d.weight === 'number' && Number.isFinite(d.weight)) vals.push(d.weight);
      if (showWaist && typeof d.waist === 'number' && Number.isFinite(d.waist)) vals.push(d.waist);
      if (showAbdomen && typeof d.abdomen === 'number' && Number.isFinite(d.abdomen)) vals.push(d.abdomen);
      if (showChest && typeof d.chest === 'number' && Number.isFinite(d.chest)) vals.push(d.chest);
      if (showBiceps && typeof d.biceps === 'number' && Number.isFinite(d.biceps)) vals.push(d.biceps);
      if (showThigh && typeof d.thigh === 'number' && Number.isFinite(d.thigh)) vals.push(d.thigh);
    });

    if (vals.length === 0) return [0, 120];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min;
    const pad = span > 0 ? Math.max(1.5, span * 0.16) : 3;
    return [Math.max(0, Number((min - pad).toFixed(1))), Number((max + pad).toFixed(1))];
  }, [
    chartData,
    effectiveXDomain,
    showWeight,
    showWaist,
    showAbdomen,
    showChest,
    showBiceps,
    showThigh,
  ]);

  const autoRightYDomain = useMemo<[number, number]>(() => {
    const n = chartData.length;
    if (n === 0) return [5, 35];
    const startIdx = Math.max(0, Math.floor(effectiveXDomain[0]) - 1);
    const endIdx = Math.min(n - 1, Math.ceil(effectiveXDomain[1]) + 1);
    const slice = chartData.slice(startIdx, endIdx + 1);
    const pool = slice.length > 0 ? slice : chartData;

    const vals: number[] = [];
    pool.forEach((d) => {
      if (typeof d.bf === 'number' && Number.isFinite(d.bf)) vals.push(d.bf);
    });

    if (vals.length === 0) return [5, 35];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min;
    const pad = span > 0 ? Math.max(1, span * 0.18) : 2.5;
    return [Math.max(0, Number((min - pad).toFixed(1))), Math.min(100, Number((max + pad).toFixed(1)))];
  }, [chartData, effectiveXDomain]);

  const effectiveLeftYDomain = leftYDomain ?? autoLeftYDomain;
  const effectiveRightYDomain = rightYDomain ?? autoRightYDomain;

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

  const isChartAdjusted = Boolean(xDomain || leftYDomain || rightYDomain);

  const handleResetZoom = useCallback(() => {
    setXDomain(null);
    setLeftYDomain(null);
    setRightYDomain(null);
  }, []);

  // Re-fit chart domains whenever the filtered date window changes
  useEffect(() => {
    setXDomain(null);
    setLeftYDomain(null);
    setRightYDomain(null);
  }, [startDate, endDate]);

  const detectZone = useCallback(
    (relX: number, relY: number, width: number, height: number): DragZone => {
      if (relX <= LEFT_AXIS_HIT_WIDTH) return 'y-left';
      if (showBf && relX >= width - RIGHT_AXIS_HIT_WIDTH) return 'y-right';
      if (relY >= height - X_AXIS_HIT_HEIGHT) return 'x';
      return 'pan';
    },
    [showBf]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (chartData.length === 0) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = chartContainerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const zone = detectZone(relX, relY, rect.width, rect.height);

    const plotWidth = Math.max(
      40,
      rect.width - LEFT_AXIS_HIT_WIDTH - (showBf ? RIGHT_AXIS_HIT_WIDTH : 14)
    );
    const plotHeight = Math.max(40, rect.height - X_AXIS_HIT_HEIGHT - 10);

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
      initLeftYDomain: [...effectiveLeftYDomain] as [number, number],
      initRightYDomain: [...effectiveRightYDomain] as [number, number],
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
        const zone = detectZone(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
        setHoverZone(zone);
      }
      return;
    }

    const dx = e.clientX - snap.startX;
    const dy = e.clientY - snap.startY;
    const n = chartData.length;

    if (snap.zone === 'y-left') {
      const [initMin, initMax] = snap.initLeftYDomain;
      const initSpan = Math.max(0.5, initMax - initMin);
      const center = (initMin + initMax) / 2;
      // TradingView: drag UP (dy < 0) stretches axis (zoom in / smaller range), drag DOWN (dy > 0) compresses (zoom out)
      const factor = Math.exp(dy * 0.0085);
      const newSpan = Math.min(400, Math.max(0.5, initSpan * factor));
      let nextMin = center - newSpan / 2;
      let nextMax = center + newSpan / 2;
      if (nextMin < 0) {
        nextMin = 0;
        nextMax = newSpan;
      }
      setLeftYDomain([Number(nextMin.toFixed(2)), Number(nextMax.toFixed(2))]);
    } else if (snap.zone === 'y-right') {
      const [initMin, initMax] = snap.initRightYDomain;
      const initSpan = Math.max(0.5, initMax - initMin);
      const center = (initMin + initMax) / 2;
      const factor = Math.exp(dy * 0.0085);
      const newSpan = Math.min(100, Math.max(0.5, initSpan * factor));
      let nextMin = center - newSpan / 2;
      let nextMax = center + newSpan / 2;
      if (nextMin < 0) {
        nextMin = 0;
        nextMax = Math.min(100, newSpan);
      }
      if (nextMax > 100) {
        nextMax = 100;
        nextMin = Math.max(0, 100 - newSpan);
      }
      setRightYDomain([Number(nextMin.toFixed(2)), Number(nextMax.toFixed(2))]);
    } else if (snap.zone === 'x') {
      const [initMin, initMax] = snap.initXDomain;
      const initSpan = Math.max(0.4, initMax - initMin);
      const center = (initMin + initMax) / 2;
      // TradingView: drag RIGHT (dx > 0) zooms IN on time axis, drag LEFT (dx < 0) zooms OUT
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
      // Pan grid without changing current X or Y scale
      const [initXMin, initXMax] = snap.initXDomain;
      const xSpan = Math.max(0.4, initXMax - initXMin);
      const shiftX = -(dx / snap.plotWidth) * xSpan;
      let nextXMin = initXMin + shiftX;
      let nextXMax = initXMax + shiftX;
      const minAllowedX = -xSpan * 0.65;
      const maxAllowedX = Math.max(0, n - 1) + xSpan * 0.65;
      if (nextXMin < minAllowedX) {
        nextXMin = minAllowedX;
        nextXMax = nextXMin + xSpan;
      }
      if (nextXMax > maxAllowedX) {
        nextXMax = maxAllowedX;
        nextXMin = nextXMax - xSpan;
      }
      setXDomain([nextXMin, nextXMax]);

      const [initLMin, initLMax] = snap.initLeftYDomain;
      const lSpan = Math.max(0.5, initLMax - initLMin);
      const shiftLeftY = (dy / snap.plotHeight) * lSpan;
      let nextLMin = initLMin + shiftLeftY;
      let nextLMax = initLMax + shiftLeftY;
      if (nextLMin < 0) {
        nextLMin = 0;
        nextLMax = lSpan;
      }
      setLeftYDomain([Number(nextLMin.toFixed(2)), Number(nextLMax.toFixed(2))]);

      if (showBf) {
        const [initRMin, initRMax] = snap.initRightYDomain;
        const rSpan = Math.max(0.5, initRMax - initRMin);
        const shiftRightY = (dy / snap.plotHeight) * rSpan;
        let nextRMin = initRMin + shiftRightY;
        let nextRMax = initRMax + shiftRightY;
        if (nextRMin < 0) {
          nextRMin = 0;
          nextRMax = Math.min(100, rSpan);
        }
        if (nextRMax > 100) {
          nextRMax = 100;
          nextRMin = Math.max(0, 100 - rSpan);
        }
        setRightYDomain([Number(nextRMin.toFixed(2)), Number(nextRMax.toFixed(2))]);
      }
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
    const zone = detectZone(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (zone === 'y-left') {
      setLeftYDomain(null);
    } else if (zone === 'y-right') {
      setRightYDomain(null);
    } else if (zone === 'x') {
      setXDomain(null);
    } else {
      handleResetZoom();
    }
  };

  // Smooth wheel zoom on X-axis (or over Y-axes when hovering an axis) without scrolling the page
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el || chartData.length === 0) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const zone = detectZone(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      const factor = Math.exp(e.deltaY * 0.0018);

      if (zone === 'y-left') {
        const [min, max] = effectiveLeftYDomain;
        const span = Math.max(0.5, max - min);
        const center = (min + max) / 2;
        const nextSpan = Math.min(400, Math.max(0.5, span * factor));
        const nextMin = Math.max(0, center - nextSpan / 2);
        setLeftYDomain([Number(nextMin.toFixed(2)), Number((nextMin + nextSpan).toFixed(2))]);
      } else if (zone === 'y-right') {
        const [min, max] = effectiveRightYDomain;
        const span = Math.max(0.5, max - min);
        const center = (min + max) / 2;
        const nextSpan = Math.min(100, Math.max(0.5, span * factor));
        const nextMin = Math.max(0, center - nextSpan / 2);
        const nextMax = Math.min(100, nextMin + nextSpan);
        setRightYDomain([Number(nextMin.toFixed(2)), Number(nextMax.toFixed(2))]);
      } else {
        const n = chartData.length;
        const [min, max] = effectiveXDomain;
        const span = Math.max(0.4, max - min);
        const plotW = Math.max(
          40,
          rect.width - LEFT_AXIS_HIT_WIDTH - (showBf ? RIGHT_AXIS_HIT_WIDTH : 14)
        );
        const anchorRatio = Math.min(
          1,
          Math.max(0, (e.clientX - rect.left - LEFT_AXIS_HIT_WIDTH) / plotW)
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
  }, [
    chartData.length,
    detectZone,
    effectiveLeftYDomain,
    effectiveRightYDomain,
    effectiveXDomain,
    showBf,
  ]);

  const currentZone = activeDragZone ?? hoverZone;
  const chartCursorClass =
    currentZone === 'y-left' || currentZone === 'y-right'
      ? 'cursor-ns-resize'
      : currentZone === 'x'
      ? 'cursor-ew-resize'
      : activeDragZone === 'pan'
      ? 'cursor-grabbing'
      : 'cursor-grab';

  // Statistics Summary Cards — computed dynamically ONLY from filteredMeasurements
  const stats = useMemo(() => {
    if (filteredMeasurements.length === 0) {
      return {
        hasData: false,
        lowestWeight: 0,
        lowestWeightDate: '',
        lowestBf: 0,
        lowestBfDate: '',
        highestBf: 0,
        highestBfDate: '',
        avgWeeklyRate: 0,
        totalDeltaKg: 0,
        daysSpan: 0,
      };
    }

    let minW = filteredMeasurements[0].weightKg;
    let minWDate = filteredMeasurements[0].date;
    let maxBf = 0;
    let maxBfDate = '';
    let minBf = Infinity;
    let minBfDate = '';

    filteredMeasurements.forEach((m) => {
      if (m.weightKg < minW) {
        minW = m.weightKg;
        minWDate = m.date;
      }
      if (typeof m.bodyFatPct === 'number' && Number.isFinite(m.bodyFatPct) && m.bodyFatPct > 0) {
        if (m.bodyFatPct > maxBf) {
          maxBf = m.bodyFatPct;
          maxBfDate = m.date;
        }
        if (m.bodyFatPct < minBf) {
          minBf = m.bodyFatPct;
          minBfDate = m.date;
        }
      }
    });

    const chrono = [...filteredMeasurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let totalDeltaKg = 0;
    let daysSpan = 0;
    let avgWeeklyRate = 0;

    if (chrono.length >= 2) {
      const first = chrono[0];
      const last = chrono[chrono.length - 1];
      totalDeltaKg = Math.round((last.weightKg - first.weightKg) * 10) / 10;
      const msDiff = new Date(last.date).getTime() - new Date(first.date).getTime();
      daysSpan = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));
      const weeksSpan = daysSpan / 7;
      avgWeeklyRate =
        weeksSpan >= 0.5 ? Math.round((totalDeltaKg / weeksSpan) * 10) / 10 : totalDeltaKg;
    }

    return {
      hasData: true,
      lowestWeight: minW,
      lowestWeightDate: minWDate,
      lowestBf: minBf === Infinity ? 0 : minBf,
      lowestBfDate: minBfDate,
      highestBf: maxBf,
      highestBfDate: maxBfDate,
      avgWeeklyRate,
      totalDeltaKg,
      daysSpan,
    };
  }, [filteredMeasurements]);

  const presetButtons: { id: Exclude<DateRangePreset, 'CUSTOM'>; label: string }[] = [
    { id: '1M', label: 'Ostatni miesiąc' },
    { id: '3M', label: 'Ostatnie 3 miesiące' },
    { id: '1Y', label: 'Ostatni rok' },
    { id: 'ALL', label: 'Wszystko' },
  ];

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      {/* Date Range Picker & Quick Presets */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-black uppercase text-white tracking-wider font-heading">
              Zakres Dat
            </span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 font-mono-numbers">
            {filteredMeasurements.length} z {measurements.length} pomiarów
          </span>
        </div>

        {/* Preset Quick Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {presetButtons.map((btn) => {
            const isActive = datePreset === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleSelectPreset(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-black border-amber-300 shadow-sm shadow-amber-400/20'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Start & End Date Inputs */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">
              Od
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                setDatePreset(!val && !endDate ? 'ALL' : 'CUSTOM');
              }}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none font-mono-numbers"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">
              Do
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setEndDate(val);
                setDatePreset(!startDate && !val ? 'ALL' : 'CUSTOM');
              }}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none font-mono-numbers"
            />
          </div>
        </div>
      </div>

      {/* 4 Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Lowest weight card */}
        <div className="p-3.5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading leading-tight">
              Najniższa Waga
            </span>
            <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-amber-400 font-heading">
              {stats.hasData ? `${stats.lowestWeight} kg` : '---'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 truncate">
            {stats.lowestWeightDate || 'Brak wpisów'}
          </span>
        </div>

        {/* Lowest BF% card (NEW) */}
        <div className="p-3.5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading leading-tight">
              Najniższy BF%
            </span>
            <Percent className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-heading">
              {stats.lowestBf ? `${stats.lowestBf}%` : '---'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 truncate">
            {stats.lowestBfDate || 'Fałdomierz'}
          </span>
        </div>

        {/* Highest BF% card */}
        <div className="p-3.5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading leading-tight">
              Najwyższy BF%
            </span>
            <Percent className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-purple-400 font-heading">
              {stats.highestBf ? `${stats.highestBf}%` : '---'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 truncate">
            {stats.highestBfDate || 'Fałdomierz'}
          </span>
        </div>

        {/* Average Weekly Rate */}
        <div className="p-3.5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading leading-tight">
              Średnie Tempo
            </span>
            {stats.avgWeeklyRate < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            )}
          </div>
          <div>
            <span
              className={`text-lg sm:text-xl font-black font-heading ${
                stats.avgWeeklyRate < 0 ? 'text-amber-400' : 'text-purple-400'
              }`}
            >
              {stats.avgWeeklyRate > 0 ? `+${stats.avgWeeklyRate}` : stats.avgWeeklyRate} kg
            </span>
            <span className="text-[10px] text-neutral-400 ml-1">/ tydz</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 truncate">
            Łącznie: {stats.totalDeltaKg > 0 ? `+${stats.totalDeltaKg}` : stats.totalDeltaKg} kg ({stats.daysSpan} dni)
          </span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading">
              Wykres Zmian w Czasie
            </h3>
            <p className="text-[11px] text-neutral-400">
              Trend wagi, tkanki tłuszczowej oraz obwodów ciała
            </p>
          </div>

          {isChartAdjusted && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 border border-amber-400/30 text-xs font-bold transition-all cursor-pointer animate-in fade-in"
              title="Resetuj powiększenie i przesunięcie osi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetuj skalę</span>
            </button>
          )}
        </div>

        {/* Interactive Line Filters */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setShowWeight(!showWeight)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showWeight
                ? 'bg-amber-400/20 text-amber-300 border-amber-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● Waga (kg)
          </button>
          <button
            type="button"
            onClick={() => setShowBf(!showBf)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showBf
                ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● BF (%)
          </button>
          <button
            type="button"
            onClick={() => setShowWaist(!showWaist)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showWaist
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● Talia (cm)
          </button>
          <button
            type="button"
            onClick={() => setShowAbdomen(!showAbdomen)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showAbdomen
                ? 'bg-orange-500/20 text-orange-300 border-orange-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● Brzuch (cm)
          </button>
          <button
            type="button"
            onClick={() => setShowChest(!showChest)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showChest
                ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● Klatka (cm)
          </button>
          <button
            type="button"
            onClick={() => setShowBiceps(!showBiceps)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showBiceps
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● Biceps (cm)
          </button>
          <button
            type="button"
            onClick={() => setShowThigh(!showThigh)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              showThigh
                ? 'bg-lime-500/20 text-lime-300 border-lime-400'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 line-through'
            }`}
          >
            ● Udo (cm)
          </button>
        </div>

        {/* Recharts Container with TradingView-style Click & Drag Axis Scaling + Grid Pan */}
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
          className={`relative h-72 sm:h-80 w-full pt-2 select-none ${chartCursorClass}`}
        >
          {/* Subtle visual affordances on hovered/active axis strips (pointer-events-none so tooltips remain active) */}
          {chartData.length > 0 && (
            <>
              <div
                className={`pointer-events-none absolute top-2 bottom-[36px] left-0 w-[48px] rounded-l-xl transition-colors ${
                  currentZone === 'y-left' ? 'bg-amber-400/10 border-r border-amber-400/30' : ''
                }`}
              />
              {showBf && (
                <div
                  className={`pointer-events-none absolute top-2 bottom-[36px] right-0 w-[48px] rounded-r-xl transition-colors ${
                    currentZone === 'y-right' ? 'bg-purple-400/10 border-l border-purple-400/30' : ''
                  }`}
                />
              )}
              <div
                className={`pointer-events-none absolute bottom-0 left-[48px] ${
                  showBf ? 'right-[48px]' : 'right-3'
                } h-[36px] rounded-b-xl transition-colors ${
                  currentZone === 'x' ? 'bg-amber-400/10 border-t border-amber-400/30' : ''
                }`}
              />
            </>
          )}

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: showBf ? 4 : 14, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  type="number"
                  dataKey="idx"
                  domain={effectiveXDomain}
                  ticks={xTicks}
                  allowDataOverflow
                  stroke="#737373"
                  tick={{ fontSize: 11, fill: '#a3a3a3' }}
                  tickFormatter={(val) => chartData[Math.round(Number(val))]?.date || ''}
                  height={32}
                />

                {/* Lewa oś Y: Waga i obwody (kg / cm) z niezależnym skalowaniem */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#737373"
                  tick={{ fontSize: 10, fill: '#a3a3a3' }}
                  domain={effectiveLeftYDomain}
                  allowDataOverflow
                  tickFormatter={(val) =>
                    Number.isFinite(val) ? `${Math.round(Number(val) * 10) / 10}` : ''
                  }
                  width={44}
                />

                {/* Prawa oś Y: Procent tkanki tłuszczowej BF (%) z niezależnym skalowaniem */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#a855f7"
                  tick={{ fontSize: 10, fill: '#c084fc' }}
                  domain={effectiveRightYDomain}
                  allowDataOverflow
                  tickFormatter={(val) =>
                    Number.isFinite(val) ? `${Math.round(Number(val) * 10) / 10}%` : ''
                  }
                  hide={!showBf}
                  width={44}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #404040',
                    borderRadius: '1rem',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  labelFormatter={(lbl, items) => {
                    const row = items?.[0]?.payload;
                    return row ? `Data: ${row.fullDate}` : String(lbl);
                  }}
                  formatter={(value: any, name: any) => {
                    if (value === undefined || value === null) return ['--', name];
                    if (name?.toString().includes('Body Fat') || name?.toString().includes('BF')) {
                      return [`${value}%`, name];
                    }
                    if (name?.toString().includes('Waga')) {
                      return [`${value} kg`, name];
                    }
                    return [`${value} cm`, name];
                  }}
                />

                {showWeight && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    name="Waga (kg)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 3.5 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                )}
                {showBf && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bf"
                    name="Body Fat (%)"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={{ fill: '#a855f7', r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                )}
                {showWaist && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="waist"
                    name="Talia (cm)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 2.5 }}
                    isAnimationActive={false}
                  />
                )}
                {showAbdomen && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="abdomen"
                    name="Brzuch (cm)"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 2.5 }}
                    isAnimationActive={false}
                  />
                )}
                {showChest && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="chest"
                    name="Klatka (cm)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ fill: '#0284c7', r: 2.5 }}
                    isAnimationActive={false}
                  />
                )}
                {showBiceps && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="biceps"
                    name="Biceps (cm)"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ fill: '#eab308', r: 2.5 }}
                    isAnimationActive={false}
                  />
                )}
                {showThigh && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="thigh"
                    name="Udo (cm)"
                    stroke="#84cc16"
                    strokeWidth={2}
                    dot={{ fill: '#84cc16', r: 2.5 }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-neutral-500">
              Brak danych do wygenerowania wykresu.
            </div>
          )}
        </div>

        {chartData.length > 0 && (
          <p className="text-[10px] text-neutral-500 text-center">
            Przeciągnij oś Y / X aby skalować • Przeciągnij siatkę aby przesuwać • Dwuklik resetuje
          </p>
        )}
      </div>

      {/* Google Sheets Sync Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CloudUpload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white font-heading">
                Eksport do Google Sheets
              </h3>
              <p className="text-[10px] text-neutral-400">
                Wysyłka historii pomiarów do arkusza (Webhook / Apps Script)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSyncWithGoogleSheets()}
            disabled={syncStatus.state === 'syncing'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`}
            />
            <span>{syncStatus.state === 'syncing' ? 'Wysyłanie...' : 'Synchronizuj'}</span>
          </button>
        </div>

        {/* Sync Status Banner */}
        {syncStatus.message && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
              syncStatus.state === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : syncStatus.state === 'error'
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800'
            }`}
          >
            {syncStatus.state === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncStatus.state === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className="flex-1 text-[11px]">{syncStatus.message}</span>
          </div>
        )}

        {/* Config Webhook Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsWebhookOpen(!isWebhookOpen)}
            className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Konfiguracja endpointu Webhooka Google Sheets</span>
            {isWebhookOpen ? (
              <ChevronUp className="w-3 h-3 ml-auto" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-auto" />
            )}
          </button>

          {isWebhookOpen && (
            <div className="mt-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="block text-[11px] font-bold text-neutral-300">
                URL Google Apps Script Webhook (POST)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={tempWebhookUrl}
                  onChange={(e) => setTempWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateWebhookUrl(tempWebhookUrl);
                    alert('Zapisano URL Webhooka!');
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs cursor-pointer"
                >
                  Zapisz
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">
                Jeśli pole jest puste, funkcja przygotowuje pełny payload lokalnie bez zewnętrznych błędów CORS.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Table / Entries List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Dziennik Pomiarów ({filteredMeasurements.length}
            {filteredMeasurements.length !== measurements.length ? ` z ${measurements.length}` : ''})
          </h3>
          <span className="text-[10px] text-neutral-500">Od najnowszych</span>
        </div>

        {filteredMeasurements.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs space-y-3">
            {measurements.length === 0 ? (
              <p>Brak zarejestrowanych pomiarów. Przejdź do zakładki &quot;POMIARY&quot;, aby dodać pierwszy wpis.</p>
            ) : (
              <>
                <p>Brak pomiarów w wybranym zakresie dat.</p>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('ALL')}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 border border-amber-400/30 text-xs font-bold transition-all cursor-pointer"
                >
                  Pokaż wszystkie pomiary
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMeasurements.map((m) => {
              const c = m.circumferences;
              const s = m.skinfolds;
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/90 hover:border-neutral-700 transition-colors space-y-2.5"
                >
                  {/* Row Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white font-heading">{m.date}</span>
                      {m.bodyFatPct && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          BF: {m.bodyFatPct}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-amber-400 font-heading">
                        {m.weightKg} kg
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Czy na pewno usunąć pomiar z dnia ${m.date}?`)) {
                            onDeleteMeasurement(m.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-neutral-900 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Usuń wpis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Composition Summary */}
                  {(m.fatMassKg || m.leanMassKg) && (
                    <div className="text-[11px] text-neutral-400 flex gap-3">
                      {m.fatMassKg && (
                        <span>
                          Tłuszcz: <strong className="text-white">{m.fatMassKg} kg</strong>
                        </span>
                      )}
                      {m.leanMassKg && (
                        <span>
                          Sucha masa: <strong className="text-emerald-400">{m.leanMassKg} kg</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Circumferences preview chips */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-neutral-400">
                    {c.waist && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        Talia: {c.waist} cm
                      </span>
                    )}
                    {c.abdomen && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        Brzuch: {c.abdomen} cm
                      </span>
                    )}
                    {c.chest && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        Klatka: {c.chest} cm
                      </span>
                    )}
                    {c.biceps && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        Biceps: {c.biceps} cm
                      </span>
                    )}
                    {c.thigh && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        Udo: {c.thigh} cm
                      </span>
                    )}
                    {c.calf && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                        Łydka: {c.calf} cm
                      </span>
                    )}
                  </div>

                  {/* Skinfolds preview */}
                  {(s.chest || s.abdomen || s.thigh) && (
                    <div className="text-[10px] text-neutral-500 pt-0.5 flex gap-2">
                      <span>Fałdy (mm):</span>
                      {s.chest && <span>Klatka: {s.chest}</span>}
                      {s.abdomen && <span>Brzuch: {s.abdomen}</span>}
                      {s.thigh && <span>Udo: {s.thigh}</span>}
                    </div>
                  )}

                  {/* Notes */}
                  {m.notes && (
                    <p className="text-[11px] text-neutral-400 italic bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/60">
                      &quot;{m.notes}&quot;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
