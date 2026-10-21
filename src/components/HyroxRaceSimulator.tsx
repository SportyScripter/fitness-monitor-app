import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Award,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Flame,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { HYROX_OFFICIAL_STATIONS } from '../data/hyroxPlanData';
import { HyroxRaceTrial, HyroxRaceTrialSplit } from '../types/hyrox';

interface HyroxRaceSimulatorProps {
  onSaveTrial: (trial: HyroxRaceTrial) => void;
  isSheetsConnected: boolean;
  onOpenSheetsModal: () => void;
}

type CategoryType = 'openMen' | 'openWomen' | 'proMen' | 'proWomen' | 'doublesMen' | 'doublesWomen';
type SimulationMode = 'FULL_HYROX' | 'HALF_HYROX' | 'STATIONS_ONLY';

interface StageDefinition {
  key: string;
  name: string;
  type: 'RUN' | 'STATION';
  stationIndex?: number;
  targetSeconds: number;
}

export const HyroxRaceSimulator: React.FC<HyroxRaceSimulatorProps> = ({
  onSaveTrial,
  isSheetsConnected,
  onOpenSheetsModal,
}) => {
  const [category, setCategory] = useState<CategoryType>('openMen');
  const [mode, setMode] = useState<SimulationMode>('FULL_HYROX');

  // Timer State
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [splits, setSplits] = useState<HyroxRaceTrialSplit[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [trialHistory, setTrialHistory] = useState<HyroxRaceTrial[]>(() => {
    try {
      const saved = localStorage.getItem('hyrox_trials_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const timerRef = useRef<any>(null);
  const stageStartTimeRef = useRef<number>(0);

  // Generate stages based on mode
  const buildStages = (): StageDefinition[] => {
    if (mode === 'FULL_HYROX') {
      const list: StageDefinition[] = [];
      for (let i = 0; i < 8; i++) {
        list.push({
          key: `run_${i + 1}`,
          name: `Bieg 1 km #${i + 1}`,
          type: 'RUN',
          targetSeconds: 270, // 4:30 min
        });
        const st = HYROX_OFFICIAL_STATIONS[i];
        list.push({
          key: st.id,
          name: `Stacja ${st.stationNumber}: ${st.name} (${st.officialDistanceOrReps})`,
          type: 'STATION',
          stationIndex: i,
          targetSeconds: 240, // 4:00 min
        });
      }
      return list;
    } else if (mode === 'HALF_HYROX') {
      return [
        { key: 'run_1', name: 'Bieg 1 km #1', type: 'RUN', targetSeconds: 270 },
        { key: 'skierg', name: 'Stacja 1: SkiErg (1000m)', type: 'STATION', stationIndex: 0, targetSeconds: 240 },
        { key: 'run_2', name: 'Bieg 1 km #2', type: 'RUN', targetSeconds: 270 },
        { key: 'sled_push', name: 'Stacja 2: Sled Push (50m)', type: 'STATION', stationIndex: 1, targetSeconds: 180 },
        { key: 'run_3', name: 'Bieg 1 km #3', type: 'RUN', targetSeconds: 270 },
        { key: 'burpees', name: 'Stacja 4: Burpee Broad Jumps (80m)', type: 'STATION', stationIndex: 3, targetSeconds: 260 },
        { key: 'run_4', name: 'Bieg 1 km #4', type: 'RUN', targetSeconds: 270 },
        { key: 'wall_balls', name: 'Stacja 8: Wall Balls (100 powt.)', type: 'STATION', stationIndex: 7, targetSeconds: 300 },
      ];
    } else {
      // Stations only
      return HYROX_OFFICIAL_STATIONS.map((st, i) => ({
        key: st.id,
        name: `Stacja ${st.stationNumber}: ${st.name} (${st.officialDistanceOrReps})`,
        type: 'STATION',
        stationIndex: i,
        targetSeconds: 240,
      }));
    }
  };

  const stages = buildStages();

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (!isRunning && elapsedSeconds === 0) {
      stageStartTimeRef.current = 0;
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setCurrentStageIndex(0);
    setSplits([]);
    setIsFinished(false);
    stageStartTimeRef.current = 0;
  };

  const handleSplit = () => {
    if (isFinished || currentStageIndex >= stages.length) return;

    const currentStage = stages[currentStageIndex];
    const stageDuration = elapsedSeconds - stageStartTimeRef.current;
    stageStartTimeRef.current = elapsedSeconds;

    const newSplit: HyroxRaceTrialSplit = {
      stationKey: currentStage.key,
      stationName: currentStage.name,
      type: currentStage.type,
      timeSeconds: stageDuration,
      formattedTime: formatTime(stageDuration),
      targetSeconds: currentStage.targetSeconds,
    };

    const nextSplits = [...splits, newSplit];
    setSplits(nextSplits);

    if (currentStageIndex + 1 >= stages.length) {
      // Finished trial!
      setIsRunning(false);
      setIsFinished(true);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      // Prepare trial object
      const trial: HyroxRaceTrial = {
        id: `trial-${Date.now()}`,
        date: new Date().toLocaleDateString('pl-PL'),
        category,
        mode,
        totalTimeSeconds: elapsedSeconds,
        formattedTotalTime: formatTime(elapsedSeconds),
        splits: nextSplits,
        notes: `Ukończono w trybie ${mode} z czasem ${formatTime(elapsedSeconds)}`,
      };

      const updatedHistory = [trial, ...trialHistory];
      setTrialHistory(updatedHistory);
      try {
        localStorage.setItem('hyrox_trials_history', JSON.stringify(updatedHistory));
      } catch (e) {
        console.warn(e);
      }

      onSaveTrial(trial);
    } else {
      setCurrentStageIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category & Mode Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white">
                Weekend Simulator
              </span>
              <h2 className="text-lg font-black text-white font-heading">
                Oficjalny Symulator Wyścigu Hyrox ze Splitami Czasowymi
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Wybierz swoją kategorię startową oraz tryb sprawdzianu, aby dopasować oficjalne obciążenia sań, hantli i wall balls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Kategoria:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                disabled={isRunning || elapsedSeconds > 0}
                className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 cursor-pointer disabled:opacity-50"
              >
                <option value="openMen">Mężczyźni Open (152kg Sled / 2x24kg FC / 6kg WB)</option>
                <option value="openWomen">Kobiety Open (102kg Sled / 2x16kg FC / 4kg WB)</option>
                <option value="proMen">Mężczyźni Pro (202kg Sled / 2x32kg FC / 9kg WB)</option>
                <option value="proWomen">Kobiety Pro (152kg Sled / 2x24kg FC / 6kg WB)</option>
                <option value="doublesMen">Pary Mężczyzn Doubles</option>
                <option value="doublesWomen">Pary Kobiet Doubles</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Tryb Próby:</label>
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as SimulationMode);
                  handleReset();
                }}
                disabled={isRunning || elapsedSeconds > 0}
                className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400 cursor-pointer disabled:opacity-50"
              >
                <option value="FULL_HYROX">Pełny Hyrox (8x 1km Bieg + 8 Stacji)</option>
                <option value="HALF_HYROX">Pół-Hyrox (4x 1km Bieg + 4 Stacje)</option>
                <option value="STATIONS_ONLY">Tylko 8 Stacji Hyrox (Bez Biegów)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stopwatch Console */}
      <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-xs text-neutral-300 mb-4">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}`} />
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {isRunning ? 'Czasomierz aktywny' : isFinished ? 'Wyścig Ukończony!' : 'Gotowy do startu'}
            </span>
          </div>

          {/* Big Digital Display */}
          <div className="text-5xl sm:text-7xl lg:text-8xl font-black font-mono-numbers tracking-tight text-white my-2">
            {formatTime(elapsedSeconds)}
          </div>

          {/* Current Stage Indicator */}
          <div className="w-full max-w-xl mx-auto my-6 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 shadow-lg text-left lg:max-w-none">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span className="uppercase font-bold text-amber-400">
                Aktualny Segment ({Math.min(currentStageIndex + 1, stages.length)} / {stages.length})
              </span>
              <span>
                Cel segmentu: ~{formatTime(stages[Math.min(currentStageIndex, stages.length - 1)]?.targetSeconds || 0)}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-white font-heading">
              {isFinished ? 'Meta osiągnięta! Gratulacje!' : stages[currentStageIndex]?.name}
            </div>

            {/* If station, show official category weight */}
            {!isFinished && stages[currentStageIndex]?.stationIndex !== undefined && (
              <div className="mt-2 text-xs text-neutral-300 flex items-center gap-2 p-2 rounded bg-neutral-950 border border-neutral-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Ciężar dla Twojej kategorii ({category}):</strong>{' '}
                  {HYROX_OFFICIAL_STATIONS[stages[currentStageIndex].stationIndex!].categoryWeights[category]}
                </span>
              </div>
            )}
          </div>

          {/* Controls Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6">
            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
              title="Resetuj stoper"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleStartStop}
              className={`px-8 sm:px-12 py-4 rounded-2xl text-base font-black uppercase tracking-wider transition-all shadow-xl flex items-center gap-3 cursor-pointer ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
                  : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20 font-black'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" /> Pauza
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" /> {elapsedSeconds > 0 ? 'Wznów' : 'Start Wyścigu'}
                </>
              )}
            </button>

            <button
              onClick={handleSplit}
              disabled={!isRunning || isFinished}
              className="px-6 sm:px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              <span>Oznacz Split / Następna Stacja</span>
            </button>
          </div>
        </div>
      </div>

      {/* Splits Table & Benchmark Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Splits History */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                Międzyczasy (Splits) Bieżącej Próby ({splits.length} / {stages.length})
              </h3>
              <p className="text-xs text-neutral-400">
                Dokładna analiza tempa każdego kilometra i stacji siłowej
              </p>
            </div>
          </div>

          {splits.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              Uruchom stoper i klikaj &quot;Oznacz Split&quot; po ukończeniu każdego kilometra i stacji.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider border-b border-neutral-800">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Segment</th>
                    <th className="py-2 px-2">Typ</th>
                    <th className="py-2 px-2 text-right">Czas Splitu</th>
                    <th className="py-2 px-2 text-right">Cel</th>
                    <th className="py-2 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {splits.map((s, idx) => {
                    const isAhead = s.timeSeconds <= s.targetSeconds;
                    return (
                      <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-2 font-mono-numbers text-neutral-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-semibold text-white">{s.stationName}</td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              s.type === 'RUN'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            }`}
                          >
                            {s.type === 'RUN' ? 'BIEG' : 'STACJA'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono-numbers font-black text-right text-white">
                          {s.formattedTime}
                        </td>
                        <td className="py-2.5 px-2 font-mono-numbers text-right text-neutral-400">
                          {formatTime(s.targetSeconds)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isAhead ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {isAhead ? 'Poniżej celu' : 'Powyżej celu'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Official Hyrox Benchmarks */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-heading mb-1">
              Standardy Czasowe Hyrox
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Porównaj swój wynik do oficjalnych progów Hyrox:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-400">Rekord Świata / Elite 15</span>
                  <span className="text-white font-mono-numbers">~53 - 56 min</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Średnie tempo biegu 3:25-3:40/km + błyskawiczne stacje
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-amber-400">Poziom Mistrzostw Świata</span>
                  <span className="text-white font-mono-numbers">&lt; 1:05:00</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Kwalifikacja do Mistrzostw Świata w poszczególnych kategoriach
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-blue-400">Zaawansowany Zawodnik</span>
                  <span className="text-white font-mono-numbers">&lt; 1:15:00</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Świetny czas, równe tempo biegu ok. 4:30/km
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-400">Solidny Hyrox Finisher</span>
                  <span className="text-white font-mono-numbers">1:15:00 - 1:35:00</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Standardowy średni czas większości startujących w kategorii Open
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-800">
            <button
              onClick={onOpenSheetsModal}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Zsynchronizuj próby do Google Sheets</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
