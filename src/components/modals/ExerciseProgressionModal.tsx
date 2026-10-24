import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  Dumbbell,
  Award,
  Layers,
  History,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { WorkoutLogEntry } from '../../types/hyrox';

interface ExerciseProgressionModalProps {
  exerciseName: string | null;
  workoutLogs: WorkoutLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseProgressionModal: React.FC<ExerciseProgressionModalProps> = ({
  exerciseName,
  workoutLogs,
  isOpen,
  onClose,
}) => {
  // Navigation tabs: "Wykres" oraz "Historia Serii"
  const [activeTab, setActiveTab] = useState<'chart' | 'history'>('chart');
  // Chart toggle metric: "Szacowany 1RM" lub "Objętość (Tonaż)"
  const [chartMetric, setChartMetric] = useState<'1rm' | 'tonnage'>('1rm');

  // Filter all logs for this exercise name
  const filteredLogs = useMemo(() => {
    if (!exerciseName) return [];
    const norm = exerciseName.trim().toLowerCase();
    return workoutLogs.filter(
      (l) => l.exerciseName && l.exerciseName.trim().toLowerCase() === norm
    );
  }, [workoutLogs, exerciseName]);

  // Group by session (distinct date) sorted chronologically for chart
  const sessionChartData = useMemo(() => {
    const sessionMap: Record<string, WorkoutLogEntry[]> = {};
    filteredLogs.forEach((l) => {
      const sKey = l.dateStr || (l.timestamp ? l.timestamp.split('T')[0] : 'sesja');
      if (!sessionMap[sKey]) sessionMap[sKey] = [];
      sessionMap[sKey].push(l);
    });

    const entries = Object.entries(sessionMap)
      .map(([date, sets]) => {
        // Calculate max 1RM and total tonnage in this session
        let max1RM = 0;
        let totalTonnage = 0;
        let maxWeight = 0;

        sets.forEach((s) => {
          const w = s.weightKg || 0;
          const r = s.reps || 0;
          const cur1RM = Math.round(w * (1 + r / 30));
          if (cur1RM > max1RM) max1RM = cur1RM;
          if (w > maxWeight) maxWeight = w;
          totalTonnage += s.tonnageKg || w * r;
        });

        return {
          date,
          displayDate: date.length >= 10 ? date.slice(5) : date,
          max1RM,
          tonnage: totalTonnage,
          maxWeight,
          setsCount: sets.length,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return entries;
  }, [filteredLogs]);

  // Sorted sets descending for "Historia Serii" tab
  const sortedSetsDescending = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const tA = a.timestamp || a.dateStr || '';
      const tB = b.timestamp || b.dateStr || '';
      return tB.localeCompare(tA);
    });
  }, [filteredLogs]);

  // Overall stats
  const allTimeMax1RM = useMemo(() => {
    return sessionChartData.length > 0 ? Math.max(...sessionChartData.map((s) => s.max1RM)) : 0;
  }, [sessionChartData]);

  const allTimeMaxTonnage = useMemo(() => {
    return sessionChartData.length > 0 ? Math.max(...sessionChartData.map((s) => s.tonnage)) : 0;
  }, [sessionChartData]);

  const latestSession = sessionChartData[sessionChartData.length - 1];

  if (!isOpen || !exerciseName) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
                  Szczegóły Progresji
                </span>
                <span className="text-[11px] text-neutral-400">
                  {filteredLogs.length} zarejestrowanych serii w historii
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white font-heading mt-0.5 truncate">
                {exerciseName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Zamknij"
            aria-label="Zamknij modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Tabs Switcher: "Wykres" vs "Historia Serii" */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-neutral-800 bg-neutral-950/40 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'chart'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Wykres</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historia Serii ({filteredLogs.length})</span>
          </button>
        </div>

        {/* 3. Content Area - wspólny przewijany kontener bez scroll trapa */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4 text-xs">
          {/* TAB 1: WYKRES */}
          {activeTab === 'chart' && (
            <div className="space-y-4">
              {/* Toggles: "Szacowany 1RM" vs "Objętość (Tonaż)" */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center gap-2 p-1">
                  <button
                    type="button"
                    onClick={() => setChartMetric('1rm')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      chartMetric === '1rm'
                        ? 'bg-amber-400 text-black shadow-sm font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Szacowany 1RM (kg)
                  </button>

                  <button
                    type="button"
                    onClick={() => setChartMetric('tonnage')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      chartMetric === 'tonnage'
                        ? 'bg-amber-400 text-black shadow-sm font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Objętość (Tonaż)
                  </button>
                </div>

                <div className="px-3 py-1 text-[11px] text-neutral-400 font-mono-numbers flex items-center gap-2">
                  <span>
                    Rekord:{' '}
                    <strong className="text-amber-400">
                      {chartMetric === '1rm' ? `${allTimeMax1RM} kg` : `${allTimeMaxTonnage.toLocaleString()} kg`}
                    </strong>
                  </span>
                  {latestSession && (
                    <span>
                      • Ostatnio:{' '}
                      <strong className="text-white">
                        {chartMetric === '1rm'
                          ? `${latestSession.max1RM} kg`
                          : `${latestSession.tonnage.toLocaleString()} kg`}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Chart Container */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner">
                {sessionChartData.length === 0 ? (
                  <div className="py-16 text-center text-neutral-500">
                    <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                    <p className="text-sm">Brak zarejestrowanych sesji dla tego ćwiczenia.</p>
                  </div>
                ) : sessionChartData.length === 1 ? (
                  <div className="py-12 text-center space-y-2">
                    <Award className="w-8 h-8 mx-auto text-amber-400" />
                    <p className="text-sm font-bold text-white">
                      Zarejestrowano 1 sesję treningową ({sessionChartData[0].date})
                    </p>
                    <p className="text-neutral-400 font-mono-numbers">
                      {chartMetric === '1rm'
                        ? `Szacowany 1RM: ${sessionChartData[0].max1RM} kg`
                        : `Tonaż: ${sessionChartData[0].tonnage.toLocaleString()} kg`}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Kolejne zapisane treningi automatycznie utworzą linię wykresu progresji.
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={sessionChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                          dataKey="displayDate"
                          stroke="#71717a"
                          tick={{ fill: '#a1a1aa', fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#71717a"
                          domain={['auto', 'auto']}
                          tick={{ fill: '#a1a1aa', fontSize: 11 }}
                          tickLine={false}
                          tickFormatter={(val) => `${val}`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const dataPoint = payload[0].payload;
                              return (
                                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl text-xs space-y-1">
                                  <div className="text-[10px] text-neutral-400 font-bold">
                                    {dataPoint.date}
                                  </div>
                                  <div className="text-white font-mono-numbers font-black text-sm">
                                    {chartMetric === '1rm'
                                      ? `1RM: ${dataPoint.max1RM} kg`
                                      : `Tonaż: ${dataPoint.tonnage.toLocaleString()} kg`}
                                  </div>
                                  <div className="text-[11px] text-neutral-400">
                                    Ciężar max: {dataPoint.maxWeight} kg • {dataPoint.setsCount} serii
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={chartMetric === '1rm' ? 'max1RM' : 'tonnage'}
                          stroke="#f59e0b"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorMetric)"
                          dot={{ fill: '#f59e0b', r: 4, stroke: '#18181b', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#fbbf24' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIA SERII - Kompaktowa tabela bez poziomego scrolla */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>Wszystkie wykonane serie (od najnowszych):</span>
                <span className="font-mono-numbers font-bold text-white">
                  Łącznie: {sortedSetsDescending.length}
                </span>
              </div>

              {sortedSetsDescending.length === 0 ? (
                <div className="py-16 text-center text-neutral-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                  <p>Brak zapisanych serii dla tego ćwiczenia.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 border-b border-neutral-800">
                      <tr className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                        <th className="py-2.5 px-2">Data</th>
                        <th className="py-2.5 px-1 text-center w-12">Seria</th>
                        <th className="py-2.5 px-1.5 sm:px-2">Ciężar</th>
                        <th className="py-2.5 px-1.5 sm:px-2">Powt.</th>
                        <th className="py-2.5 px-2 text-right">RPE / RIR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono-numbers">
                      {sortedSetsDescending.map((entry) => (
                        <tr key={entry.id} className="hover:bg-neutral-900/50 transition-colors">
                          {/* Tylko sama data bez nazwy treningu */}
                          <td className="py-2.5 px-2 text-neutral-200 font-mono text-[11px] whitespace-nowrap">
                            {entry.dateStr || entry.timestamp?.split('T')[0] || '-'}
                          </td>
                          <td className="py-2.5 px-1 text-center text-neutral-400 font-bold">
                            #{entry.setNumber}
                          </td>
                          <td className="py-2.5 px-1.5 sm:px-2 font-bold text-white text-xs">
                            {entry.weightKg} <span className="text-[10px] text-neutral-400 font-normal">{entry.unit || 'kg'}</span>
                          </td>
                          <td className="py-2.5 px-1.5 sm:px-2 font-bold text-amber-400 text-xs">
                            {entry.reps} <span className="text-[10px] text-neutral-400 font-normal">powt.</span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-neutral-300 font-sans text-[11px]">
                            {entry.rpe ? (
                              <span>
                                @{entry.rpe} <span className="text-neutral-500 text-[10px]">(RIR {entry.rir})</span>
                              </span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Ostatni element na samym dole przewijanej listy - wyciągnięty ze sztywnego footera */}
          <div className="pt-3 pb-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer text-center"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
