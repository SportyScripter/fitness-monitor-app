import React, { useState } from 'react';
import {
  Activity,
  Moon,
  Droplets,
  Heart,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Zap,
  Info,
  Calendar
} from 'lucide-react';
import { DailyRecoveryData, WorkoutLogEntry } from '../../types/hyrox';
import { ContributionHeatmap } from '../features/ContributionHeatmap';

interface RecoveryTrackerViewProps {
  workoutLogs: WorkoutLogEntry[];
  recoveryHistory: DailyRecoveryData[];
  onSaveRecovery: (data: DailyRecoveryData) => void;
}

export const RecoveryTrackerView: React.FC<RecoveryTrackerViewProps> = ({
  workoutLogs,
  recoveryHistory,
  onSaveRecovery,
}) => {
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [sleepQuality, setSleepQuality] = useState<number>(8);
  const [muscleFreshness, setMuscleFreshness] = useState<number>(7);
  const [hydrationScore, setHydrationScore] = useState<number>(8);
  const [stressScore, setStressScore] = useState<number>(8); // 10 = low stress
  const [notes, setNotes] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local state to immediately update heatmap upon saving
  const [localHistory, setLocalHistory] = useState<DailyRecoveryData[]>(recoveryHistory);

  // Calculate readiness score (0 - 100)
  // Weighted: Sleep (35%), Muscle freshness (30%), Hydration (15%), Stress (20%)
  const sleepFactor = Math.min(10, (sleepHours / 8) * 10);
  const calculatedReadiness = Math.round(
    ((sleepFactor * 0.2 + sleepQuality * 0.15 + muscleFreshness * 0.3 + hydrationScore * 0.15 + stressScore * 0.2) /
      10) *
      100
  );

  const getReadinessZone = (score: number) => {
    if (score >= 80) {
      return {
        title: 'STREFA ZIELONA: Pełna Gotowość Startowa',
        description: 'Twój układ nerwowy i mięśniowy są w optymalnym stanie superkompensacji. Możesz realizować pełne obciążenie i mocne interwały biegowe!',
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        badge: 'Zielone Światło',
      };
    } else if (score >= 65) {
      return {
        title: 'STREFA ŻÓŁTA: Gotowość Umiarkowana',
        description: 'Organizm jest w stanie przetrenować zaplanowaną sesję, lecz pilnuj zaleceń RIR (nie schodź poniżej RIR 2). Zadbaj o dobre nawodnienie w trakcie sesji.',
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        badge: 'Kontrola Intensywności',
      };
    } else {
      return {
        title: 'STREFA CZERWONA: Ostrzeżenie o Przeciążeniu',
        description: 'Wysoki poziom zmęczenia OUN lub obolałość nóg. Rekomendacja: dodaj +1 do docelowego RIR, zmniejsz liczbę serii o 1 na ćwiczenie lub zamień bieg na marszobieg.',
        colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',
        badge: 'Wymagana Regeneracja',
      };
    }
  };

  const zone = getReadinessZone(calculatedReadiness);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: DailyRecoveryData = {
      date: new Date().toLocaleDateString('pl-PL'),
      sleepHours,
      sleepQualityScore: sleepQuality,
      muscleSorenessScore: muscleFreshness,
      hydrationScore,
      stressScore,
      readinessScore: calculatedReadiness,
      notes,
    };
    onSaveRecovery(data);
    setLocalHistory((prev) => [data, ...prev.filter((x) => x.date !== data.date)]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Readiness Gauge Hero */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${zone.colorClass} shadow-2xl relative overflow-hidden transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-black/40 text-white">
                Hyrox Readiness Score
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">{zone.badge}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
              {zone.title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-2xl leading-relaxed">
              {zone.description}
            </p>
          </div>

          <div className="text-center md:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
              Wskaźnik Gotowości
            </span>
            <div className="text-5xl sm:text-6xl font-black font-mono-numbers text-white">
              {calculatedReadiness}<span className="text-2xl text-neutral-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Contribution Heatmap */}
      <ContributionHeatmap
        workoutLogs={workoutLogs}
        recoveryHistory={localHistory}
      />

      {/* Daily Input Form & Recovery Protocols */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5"
        >
          <div className="pb-4 border-b border-neutral-800">
            <h3 className="text-base font-bold text-white font-heading">
              Codzienny Monitor Regeneracji & Gotowości
            </h3>
            <p className="text-xs text-neutral-400">
              Oceń swój stan przed rozpoczęciem dzisiejszego treningu FBW lub biegu
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sleep Hours */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <label className="text-xs text-neutral-300 font-bold uppercase tracking-wider flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-blue-400" /> Czas Snu (godziny)
                </span>
                <span className="text-amber-400 font-mono-numbers font-black">{sleepHours}h</span>
              </label>
              <input
                type="range"
                min="4"
                max="11"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>4h</span>
                <span>8h (Optimum)</span>
                <span>11h</span>
              </div>
            </div>

            {/* Sleep Quality */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <label className="text-xs text-neutral-300 font-bold uppercase tracking-wider flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-purple-400" /> Jakość Snu (Głębokość)
                </span>
                <span className="text-amber-400 font-mono-numbers font-black">{sleepQuality}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>Płytki / Wybudzenia</span>
                <span>Głęboki / Regenerujący</span>
              </div>
            </div>

            {/* Muscle Freshness / DOMS */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <label className="text-xs text-neutral-300 font-bold uppercase tracking-wider flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Świeżość Nóg (Brak DOMS)
                </span>
                <span className="text-amber-400 font-mono-numbers font-black">{muscleFreshness}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={muscleFreshness}
                onChange={(e) => setMuscleFreshness(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>Ciężkie / Zakwaszone</span>
                <span>Świeże / Sprężyste</span>
              </div>
            </div>

            {/* Hydration */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <label className="text-xs text-neutral-300 font-bold uppercase tracking-wider flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Nawodnienie & Elektrolity
                </span>
                <span className="text-amber-400 font-mono-numbers font-black">{hydrationScore}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={hydrationScore}
                onChange={(e) => setHydrationScore(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>Sucho / Za mało płynów</span>
                <span>&gt; 3L z elektrolitami</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-300 font-bold uppercase tracking-wider block mb-1.5">
              Notatki i Odczucia (opcjonalnie)
            </label>
            <input
              type="text"
              placeholder="np. lekki ból w prawym paśmie biodrowym po wtorkowych 800-tkach..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Zapisano ocenę gotowości!
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
            >
              Zapisz Ocenę Gotowości
            </button>
          </div>
        </form>

        {/* Practical Recovery Protocols */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading mb-1">
              Protokoły Regeneracyjne Hyrox
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Zasady, które chronią przed przetrenowaniem i kontuzją:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <strong className="text-amber-400 block mb-0.5">Nawodnienie pod Sled & Wall Balls</strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Przed i po sesji biegowej wypij min. 500ml wody z 1g soli kłodawskiej / himalajskiej oraz magnezem, aby uniknąć bolesnych skurczów łydek w trakcie 100m Sandbag Lunges.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <strong className="text-emerald-400 block mb-0.5">Mobilność Stawu Skokowego (Ankle Flow)</strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Ograniczone zgięcie grzbietowe stopy zmusza tułów do pochylenia w Wall Balls, co powoduje zmęczenie prostowników grzbietu. 5 minut rozciągania łydek przed przysiadami to konieczność.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <strong className="text-blue-400 block mb-0.5">Zarządzanie OUN i Snem</strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Biegi HIIT połączone z 3 sesjami FBW wymagają 7.5 - 9 godzin snu. Utrzymuj temperaturę w sypialni na poziomie 18-19°C.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
