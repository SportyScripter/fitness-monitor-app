import React, { useState } from 'react';
import {
  X,
  Calendar,
  Plus,
  Copy,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  FilePlus2,
  Dumbbell
} from 'lucide-react';
import { MesocyclePhase, WorkoutDay, MuscleGroup, normalizeMuscleGroup, ExercisePlannedSet } from '../../types/hyrox';
import { MASTER_HYROX_WEEK_PLAN } from '../../data/hyroxPlanData';

interface AddWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingWeeks?: MesocyclePhase[];
  currentWeekDays?: WorkoutDay[];
  onAddWeek: (newPhase: MesocyclePhase, initialDays: WorkoutDay[]) => void;
}

export const AddWeekModal: React.FC<AddWeekModalProps> = ({
  isOpen,
  onClose,
  existingWeeks = [],
  currentWeekDays = [],
  onAddWeek,
}) => {
  const safeWeeks = Array.isArray(existingWeeks) ? existingWeeks.filter(Boolean) : [];
  const nextWeekNumber = safeWeeks.length > 0 ? Math.max(...safeWeeks.map((w) => w?.week || 0)) + 1 : 1;
  const lastPhase = safeWeeks.length > 0 ? safeWeeks[safeWeeks.length - 1] : null;

  const lastVolMult = typeof lastPhase?.volumeMultiplier === 'number' && !isNaN(lastPhase.volumeMultiplier) ? lastPhase.volumeMultiplier : 1.0;
  const lastTargetRPE = typeof lastPhase?.targetRPE === 'number' && !isNaN(lastPhase.targetRPE) ? lastPhase.targetRPE : 8.0;
  const lastTargetRIR = typeof lastPhase?.targetRIR === 'number' && !isNaN(lastPhase.targetRIR) ? lastPhase.targetRIR : 2;

  const [weekNumber, setWeekNumber] = useState(nextWeekNumber);
  const [weekName, setWeekName] = useState(`Tydzień ${nextWeekNumber}: Faza Indywidualna`);
  const [volumeMultiplier, setVolumeMultiplier] = useState<string>(
    lastPhase ? String(Math.min(1.3, Number((lastVolMult + 0.05).toFixed(2)))) : '1.05'
  );
  const [targetRPE, setTargetRPE] = useState<string>(
    lastPhase ? String(Math.min(9.5, Number((lastTargetRPE + 0.2).toFixed(1)))) : '8.0'
  );
  const [targetRIR, setTargetRIR] = useState<string>(
    lastPhase ? String(Math.max(1, lastTargetRIR)) : '2'
  );
  const [isDeload, setIsDeload] = useState(false);
  const [focusNote, setFocusNote] = useState('');

  // Initialization strategy:
  // 'empty' = completely empty week (0 days, user adds manually)
  // 'clean_template' = 7 clean empty days (Pon-Niedz)
  // 'clone_previous' = copy structure from last week
  // 'hyrox_default' = prefilled 6-day Hyrox prep
  const safeDays = Array.isArray(currentWeekDays) ? currentWeekDays.filter(Boolean) : [];
  const hasExistingDays = safeDays.length > 0;
  const [initStrategy, setInitStrategy] = useState<'empty' | 'clean_template' | 'clone_previous' | 'hyrox_default'>('empty');
  const [progressionDeltaKg, setProgressionDeltaKg] = useState<string>('2.5');
  const [applyWeightDelta, setApplyWeightDelta] = useState(true);

  // Walidacja mnożnika: zakres 1.0 - 1.5 (lub dowolny przy deloadzie)
  const numMultiplier = parseFloat(String(volumeMultiplier).replace(',', '.'));
  const isMultiplierValid = isDeload || (!isNaN(numMultiplier) && numMultiplier >= 1.0 && numMultiplier <= 1.5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMultiplierValid) return;

    const parsedVol = parseFloat(String(volumeMultiplier).replace(',', '.'));
    const parsedRPE = parseFloat(String(targetRPE).replace(',', '.'));
    const parsedRIR = parseFloat(String(targetRIR).replace(',', '.'));
    const parsedDelta = parseFloat(String(progressionDeltaKg).replace(',', '.'));

    const newPhase: MesocyclePhase = {
      week: weekNumber,
      name: weekName.trim() || `Tydzień ${weekNumber}`,
      volumeMultiplier: isDeload ? 0.6 : (!isNaN(parsedVol) ? parsedVol : 1.0),
      targetRPE: !isNaN(parsedRPE) ? parsedRPE : 8.0,
      targetRIR: !isNaN(parsedRIR) ? parsedRIR : 2,
      progressionNote: focusNote.trim() || (isDeload ? 'Tydzień deloadu - regeneracja' : 'Standardowy tydzień treningowy'),
      isDeload,
    };

    let generatedDays: WorkoutDay[] = [];

    if (initStrategy === 'empty') {
      // 100% empty week: user will add each day manually!
      generatedDays = [];
    } else if (initStrategy === 'clone_previous' && hasExistingDays) {
      // Oblicz efektywny mnożnik objętości (np. 1.25):
      const multiplier = isDeload
        ? 0.6
        : (!isNaN(parsedVol) && parsedVol > 0 ? parsedVol : 1.0);

      // Oblicz wartość progresji ciężaru (+ kg):
      const deltaWeight = (applyWeightDelta && !isDeload && !isNaN(parsedDelta))
        ? parsedDelta
        : 0;

      // Kopiowanie głębokie (deep copy) dni i ćwiczeń ze skalowaniem serii i progresją ciężaru:
      generatedDays = safeDays.map((d) => ({
        ...d,
        id: `w${weekNumber}-${d.dayNumber ?? 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dayNumber: d.dayNumber ?? 1,
        dayNamePolish: d.dayNamePolish || 'Dzień 1',
        title: d.title || 'Trening',
        subtitle: d.subtitle || '',
        type: d.type || 'FBW',
        durationMinutes: d.durationMinutes || 60,
        summary: d.summary || '',
        targetRpeRange: d.targetRpeRange || `${targetRPE}`,
        targetRirRange: d.targetRirRange || `${targetRIR}`,
        exercises: Array.isArray(d.exercises)
          ? d.exercises.filter(Boolean).map((ex) => {
              const isCardio = ex.category === 'cardio' || ex.exerciseType === 'RUNNING';

              // 1. Ustal bazową tablicę zaplanowanych serii (stareSerie)
              let stareSerie: ExercisePlannedSet[] = [];
              if (Array.isArray(ex.plannedSetsDetails) && ex.plannedSetsDetails.length > 0) {
                stareSerie = ex.plannedSetsDetails.map((s, idx) => ({
                  setNumber: s.setNumber || idx + 1,
                  reps: s.reps ?? (parseInt(String(ex.targetRepsRange || '8').split('-')[0]) || 8),
                  weightKg: typeof s.weightKg === 'number' ? s.weightKg : (typeof s.weight === 'number' ? s.weight : (Number(ex.defaultWeightKg) || 0)),
                  weight: typeof s.weight === 'number' ? s.weight : (typeof s.weightKg === 'number' ? s.weightKg : (Number(ex.defaultWeightKg) || 0)),
                  rir: typeof s.rir === 'number' ? s.rir : (!isNaN(parsedRIR) ? parsedRIR : (ex.targetRIR ?? 2)),
                  rpe: typeof s.rpe === 'number' ? s.rpe : (!isNaN(parsedRPE) ? parsedRPE : (ex.targetRPE ?? 8.0)),
                  distance: s.distance ?? ex.targetDistance,
                  distanceUnit: s.distanceUnit || ex.distanceUnit,
                  pace: s.pace || ex.targetPace,
                  targetHr: s.targetHr || s.targetHR || ex.targetHR,
                  targetHR: s.targetHR || s.targetHr || ex.targetHR,
                }));
              } else {
                const count = Math.max(Number(ex.plannedSets) || 3, 1);
                const defaultReps = parseInt(String(ex.targetRepsRange || '8').split('-')[0]) || 8;
                const baseW = Number(ex.defaultWeightKg) || 0;
                stareSerie = Array.from({ length: count }, (_, i) => ({
                  setNumber: i + 1,
                  reps: defaultReps,
                  weightKg: baseW,
                  weight: baseW,
                  rir: !isNaN(parsedRIR) ? parsedRIR : (ex.targetRIR ?? 2),
                  rpe: !isNaN(parsedRPE) ? parsedRPE : (ex.targetRPE ?? 8.0),
                  distance: ex.targetDistance,
                  distanceUnit: ex.distanceUnit,
                  pace: ex.targetPace,
                  targetHr: ex.targetHR,
                  targetHR: ex.targetHR,
                }));
              }

              // 2. Mnożnik objętości (Sety):
              // Dla każdego ćwiczenia pomnóż dotychczasową ilość zaplanowanych serii przez mnożnik i zaokrąglij do liczby całkowitej
              const targetSetsCount = Math.max(1, Math.round(stareSerie.length * multiplier));
              let nowaListaSerii: ExercisePlannedSet[] = [...stareSerie];

              if (targetSetsCount > stareSerie.length) {
                // Jeśli nowa liczba serii jest większa, dodaj do tablicy odpowiednią ilość nowych serii (kopiując parametry z ostatniej istniejącej serii)
                const lastExistingSet = stareSerie[stareSerie.length - 1];
                const setsToAdd = targetSetsCount - stareSerie.length;
                for (let i = 0; i < setsToAdd; i++) {
                  nowaListaSerii.push({
                    ...lastExistingSet,
                    setNumber: nowaListaSerii.length + 1,
                  });
                }
              } else if (targetSetsCount < stareSerie.length) {
                // Jeśli nowa liczba jest mniejsza, przytnij tablicę serii (.slice)
                nowaListaSerii = nowaListaSerii.slice(0, targetSetsCount);
              }

              // 3. Progresja ciężaru (+ kg):
              // Jeśli użytkownik wpisał wartość w pole progresji (np. 2.5), przeiteruj przez wszystkie serie każdego ćwiczenia.
              // Jeśli ćwiczenie nie jest biegiem (category !== 'cardio'), dodaj wpisaną wartość do atrybutu weight każdej serii.
              const shouldApplyProgression = deltaWeight !== 0 && !isCardio;
              nowaListaSerii = nowaListaSerii.map((s, idx) => {
                const currentW = typeof s.weight === 'number' ? s.weight : (typeof s.weightKg === 'number' ? s.weightKg : (Number(ex.defaultWeightKg) || 0));
                const finalWeight = shouldApplyProgression
                  ? Number((currentW + deltaWeight).toFixed(2))
                  : currentW;
                return {
                  ...s,
                  setNumber: idx + 1,
                  weight: finalWeight,
                  weightKg: finalWeight,
                };
              });

              const updatedDefaultWeightKg = shouldApplyProgression
                ? Number(((Number(ex.defaultWeightKg) || 0) + deltaWeight).toFixed(2))
                : (Number(ex.defaultWeightKg) || 0);

              return {
                ...ex,
                id: `ex-w${weekNumber}-${(ex.name || 'cwiczenie').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
                name: ex.name || 'Ćwiczenie',
                muscleGroup: normalizeMuscleGroup(ex.muscleGroup),
                plannedSets: nowaListaSerii.length,
                plannedSetsDetails: nowaListaSerii,
                targetRepsRange: ex.targetRepsRange || '8-10',
                defaultWeightKg: updatedDefaultWeightKg,
                targetRIR: typeof ex.targetRIR === 'number' ? ex.targetRIR : (!isNaN(parsedRIR) ? parsedRIR : 2),
                targetRPE: typeof ex.targetRPE === 'number' ? ex.targetRPE : (!isNaN(parsedRPE) ? parsedRPE : 8.0),
                restSeconds: Number(ex.restSeconds) || 90,
                hyroxRelevance: ex.hyroxRelevance || '',
                techniqueNotes: ex.techniqueNotes || '',
              };
            })
          : [],
        runningSession: d.runningSession ? JSON.parse(JSON.stringify(d.runningSession)) : undefined,
      }));
    } else if (initStrategy === 'hyrox_default') {
      generatedDays = MASTER_HYROX_WEEK_PLAN.map((d) => ({
        ...d,
        id: `w${weekNumber}-${d.dayNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        exercises: (d.exercises || []).map((ex) => ({
          ...ex,
          id: `ex-w${weekNumber}-${(ex.name || 'cwiczenie').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
        })),
      }));
    } else {
      // 7 clean empty days (Poniedziałek - Niedziela)
      const polishDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
      generatedDays = polishDays.map((name, idx) => ({
        id: `w${weekNumber}-${idx + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dayNumber: idx + 1,
        dayNamePolish: name,
        title: `Dzień ${idx + 1} (${name})`,
        subtitle: 'Czysty dzień — dodaj własne ćwiczenia lub bieg',
        type: idx === 6 ? 'REST_RECOVERY' : 'FBW',
        durationMinutes: 60,
        summary: 'Własny dzień treningowy',
        targetRpeRange: `${targetRPE}`,
        targetRirRange: `${targetRIR}`,
        exercises: [],
      }));
    }

    onAddWeek(newPhase, generatedDays);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[95dvh] max-h-[95dvh] mx-auto overflow-hidden text-left relative animate-in fade-in zoom-in-95">
        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading uppercase tracking-wider">
                Dodaj Tydzień Treningowy
              </h3>
              <p className="text-xs text-neutral-400">
                Zaplanuj Tydzień {weekNumber}: cel, progresję tonażu oraz szablony dni
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="add-week-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-12 space-y-4 text-xs overscroll-contain touch-pan-y"
        >
          {/* Week Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                Numer Tygodnia:
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                Nazwa Tygodnia / Faza:
              </label>
              <input
                type="text"
                placeholder="np. Tydzień 1: Baza Siłowa, Masa Tydzień 2..."
                value={weekName}
                onChange={(e) => setWeekName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {/* Deload Checkbox */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-xs flex items-center gap-2">
                <span>Tydzień Roztrenowania (Deload)</span>
                {isDeload && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    Aktywny
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Obniża planowaną objętość o ~40% dla optymalnej superkompensacji
              </p>
            </div>
            <input
              type="checkbox"
              checked={isDeload}
              onChange={(e) => setIsDeload(e.target.checked)}
              className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
            />
          </div>

          {/* RPE, RIR & Multiplier Controls */}
          {!isDeload && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Mnożnik Objętości (1.0 - 1.5):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={volumeMultiplier}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        setVolumeMultiplier(val);
                      }
                    }}
                    placeholder="np. 1.05"
                    className={`w-full bg-neutral-900 border rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none font-mono-numbers ${
                      !isMultiplierValid
                        ? 'border-red-500 text-red-300 focus:border-red-500'
                        : 'border-neutral-700 focus:border-amber-400'
                    }`}
                  />
                  <span className="text-neutral-400 font-bold">x</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Skaluje ilość serii roboczych. Np. 1.25 zwiększy objętość o 25%, dodając dodatkowe serie do ćwiczeń.
                </p>
                {!isMultiplierValid && (
                  <p className="text-[11px] text-red-400 font-semibold mt-1">
                    Mnożnik musi mieścić się w zakresie 1.0 - 1.5
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Średnie Celowe RPE:
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={targetRPE}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setTargetRPE(val);
                    }
                  }}
                  placeholder="np. 8.0"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Docelowy Zapas (RIR):
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={targetRIR}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                      setTargetRIR(val);
                    }
                  }}
                  placeholder="np. 2"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
              Główny Nacisk / Notatka Tygodnia:
            </label>
            <input
              type="text"
              placeholder="np. Skupienie na kontroli tempa 3-1-1-0, zwiększenie ciężaru w przysiadzie..."
              value={focusNote}
              onChange={(e) => setFocusNote(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Initial Days Mode Selector */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="text-[10px] text-neutral-400 uppercase font-bold block">
              Jak chcesz rozpocząć ten tydzień?
            </label>

            <div className="space-y-2">
              {/* Option 1: Completely empty week */}
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  initStrategy === 'empty'
                    ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="initStrategy"
                    value="empty"
                    checked={initStrategy === 'empty'}
                    onChange={() => setInitStrategy('empty')}
                    className="accent-amber-400"
                  />
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <FilePlus2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pusty tydzień (0 dni — dodam własne dni ręcznie)</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Zalecane dla nowych, własnych cykli treningowych
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-amber-300">
                  Czysty start
                </span>
              </label>

              {/* Option 2: Clone from previous */}
              {hasExistingDays && (
                <label
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    initStrategy === 'clone_previous'
                      ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="initStrategy"
                      value="clone_previous"
                      checked={initStrategy === 'clone_previous'}
                      onChange={() => setInitStrategy('clone_previous')}
                      className="accent-amber-400"
                    />
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Skopiuj strukturę z obecnego tygodnia ({currentWeekDays.length} dni)</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Przenosi ćwiczenia, serie i powtórzenia z możliwością mikro-progresji kg
                      </div>
                    </div>
                  </div>
                </label>
              )}

              {/* Option 3: 7 Clean Template Days */}
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  initStrategy === 'clean_template'
                    ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="initStrategy"
                    value="clean_template"
                    checked={initStrategy === 'clean_template'}
                    onChange={() => setInitStrategy('clean_template')}
                    className="accent-amber-400"
                  />
                  <div>
                    <div className="font-bold text-xs text-white">
                      7 pustych dni (Poniedziałek – Niedziela)
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Tworzy 7 dni tygodnia bez ćwiczeń, gotowych do wypełnienia
                    </div>
                  </div>
                </div>
              </label>

              {/* Option 4: Default Hyrox */}
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  initStrategy === 'hyrox_default'
                    ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="initStrategy"
                    value="hyrox_default"
                    checked={initStrategy === 'hyrox_default'}
                    onChange={() => setInitStrategy('hyrox_default')}
                    className="accent-amber-400"
                  />
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gotowy plan HYROX (3x FBW, 2x Bieg, 1x Weekend Hyrox)</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Kompletny sprawdzony plan hybrydowy
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {/* If clone selected, offer progressive overload option */}
            {initStrategy === 'clone_previous' && !isDeload && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-300 font-bold">
                    Zastosuj progresję ciężaru (+kg w ćwiczeniach siłowych):
                  </span>
                  <input
                    type="checkbox"
                    checked={applyWeightDelta}
                    onChange={(e) => setApplyWeightDelta(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>
                {applyWeightDelta && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">Dodaj do każdego ćwiczenia:</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={progressionDeltaKg}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                          setProgressionDeltaKg(val);
                        }
                      }}
                      className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-bold text-xs font-mono-numbers focus:border-amber-400"
                    />
                    <span className="text-[10px] text-neutral-400 font-bold">kg</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer inside scrollable form */}
          <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!isMultiplierValid}
              className={`px-5 py-2.5 rounded-xl text-black text-xs font-black transition-all flex items-center gap-2 shadow-lg ${
                isMultiplierValid
                  ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20 cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj Tydzień {weekNumber}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
