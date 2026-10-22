import React, { useState, useMemo } from 'react';
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
  Info,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

interface HistoryTabProps {
  measurements: BodyMeasurement[];
  onDeleteMeasurement: (id: string) => void;
  syncStatus: SyncStatus;
  onSyncWithGoogleSheets: () => Promise<{ success: boolean; message: string }>;
  webhookUrl: string;
  onUpdateWebhookUrl: (url: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  measurements,
  onDeleteMeasurement,
  syncStatus,
  onSyncWithGoogleSheets,
  webhookUrl,
  onUpdateWebhookUrl,
}) => {
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

  // Confirmation before deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sort chronological for chart (oldest first)
  const chartData = useMemo(() => {
    return [...measurements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
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
  }, [measurements]);

  // Statistics Summary Cards
  const stats = useMemo(() => {
    if (measurements.length === 0) {
      return {
        lowestWeight: 0,
        lowestWeightDate: '',
        highestBf: 0,
        highestBfDate: '',
        avgWeeklyRate: 0,
        totalDeltaKg: 0,
        daysSpan: 0,
      };
    }

    // Lowest weight
    let minW = measurements[0].weightKg;
    let minWDate = measurements[0].date;
    let maxBf = 0;
    let maxBfDate = '';

    measurements.forEach((m) => {
      if (m.weightKg < minW) {
        minW = m.weightKg;
        minWDate = m.date;
      }
      if (m.bodyFatPct && m.bodyFatPct > maxBf) {
        maxBf = m.bodyFatPct;
        maxBfDate = m.date;
      }
    });

    // Chronological order for delta
    const chrono = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const first = chrono[0];
    const last = chrono[chrono.length - 1];
    const totalDeltaKg = Math.round((last.weightKg - first.weightKg) * 10) / 10;

    const msDiff = new Date(last.date).getTime() - new Date(first.date).getTime();
    const daysSpan = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)));
    const weeksSpan = daysSpan / 7;

    const avgWeeklyRate =
      weeksSpan >= 0.5 ? Math.round((totalDeltaKg / weeksSpan) * 10) / 10 : totalDeltaKg;

    return {
      lowestWeight: minW,
      lowestWeightDate: minWDate,
      highestBf: maxBf,
      highestBfDate: maxBfDate,
      avgWeeklyRate,
      totalDeltaKg,
      daysSpan,
    };
  }, [measurements]);

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Lowest weight card */}
        <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading">
              Najniższa Waga
            </span>
            <Scale className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <span className="text-xl font-black text-amber-400 font-heading">
              {stats.lowestWeight} kg
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 truncate">
            {stats.lowestWeightDate || 'Brak wpisów'}
          </span>
        </div>

        {/* Highest BF% card */}
        <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading">
              Najwyższy BF%
            </span>
            <Percent className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <span className="text-xl font-black text-purple-400 font-heading">
              {stats.highestBf ? `${stats.highestBf}%` : '---'}
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 truncate">
            {stats.highestBfDate || 'Fałdomierz'}
          </span>
        </div>

        {/* Average Weekly Rate */}
        <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase text-neutral-400 font-heading">
              Średnie Tempo
            </span>
            {stats.avgWeeklyRate < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            )}
          </div>
          <div>
            <span
              className={`text-xl font-black font-heading ${
                stats.avgWeeklyRate < 0 ? 'text-amber-400' : 'text-purple-400'
              }`}
            >
              {stats.avgWeeklyRate > 0 ? `+${stats.avgWeeklyRate}` : stats.avgWeeklyRate} kg
            </span>
            <span className="text-[10px] text-neutral-400 ml-1">/ tydz</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">
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

        {/* Recharts Container */}
        <div className="h-64 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#737373" tick={{ fontSize: 11 }} />
                <YAxis stroke="#737373" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
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
                    return row ? `Data: ${row.fullDate}` : lbl;
                  }}
                />
                {showWeight && (
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name="Waga (kg)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showBf && (
                  <Line
                    type="monotone"
                    dataKey="bf"
                    name="Body Fat (%)"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 3 }}
                  />
                )}
                {showWaist && (
                  <Line
                    type="monotone"
                    dataKey="waist"
                    name="Talia (cm)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                )}
                {showAbdomen && (
                  <Line
                    type="monotone"
                    dataKey="abdomen"
                    name="Brzuch (cm)"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 3 }}
                  />
                )}
                {showChest && (
                  <Line
                    type="monotone"
                    dataKey="chest"
                    name="Klatka (cm)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ fill: '#0284c7', r: 3 }}
                  />
                )}
                {showBiceps && (
                  <Line
                    type="monotone"
                    dataKey="biceps"
                    name="Biceps (cm)"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ fill: '#eab308', r: 3 }}
                  />
                )}
                {showThigh && (
                  <Line
                    type="monotone"
                    dataKey="thigh"
                    name="Udo (cm)"
                    stroke="#84cc16"
                    strokeWidth={2}
                    dot={{ fill: '#84cc16', r: 3 }}
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
            Dziennik Pomiarów ({measurements.length})
          </h3>
          <span className="text-[10px] text-neutral-500">Od najnowszych</span>
        </div>

        {measurements.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs">
            Brak zarejestrowanych pomiarów. Przejdź do zakładki &quot;POMIARY&quot;, aby dodać pierwszy wpis.
          </div>
        ) : (
          <div className="space-y-3">
            {measurements.map((m) => {
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
