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
import { MesocyclePhase, WorkoutDay } from '../types/hyrox';
import { MASTER_HYROX_WEEK_PLAN } from '../data/hyroxPlanData';

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
  const [volumeMultiplier, setVolumeMultiplier] = useState(
    lastPhase ? Math.min(1.3, Number((lastVolMult + 0.05).toFixed(2))) : 1.0
  );
  const [targetRPE, setTargetRPE] = useState(lastPhase ? Math.min(9.5, Number((lastTargetRPE + 0.2).toFixed(1))) : 8.0);
  const [targetRIR, setTargetRIR] = useState(lastPhase ? Math.max(1, lastTargetRIR - 0) : 2);
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
  const [progressionDeltaKg, setProgressionDeltaKg] = useState(2.5);
  const [applyWeightDelta, setApplyWeightDelta] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPhase: MesocyclePhase = {
      week: weekNumber,
      name: weekName.trim() || `Tydzień ${weekNumber}`,
      volumeMultiplier: isDeload ? 0.6 : (Number(volumeMultiplier) || 1.0),
      targetRPE: Number(targetRPE) || 8.0,
      targetRIR: Number(targetRIR) || 2,
      progressionNote: focusNote.trim() || (isDeload ? 'Tydzień deloadu - regeneracja' : 'Standardowy tydzień treningowy'),
      isDeload,
    };

    let generatedDays: WorkoutDay[] = [];

    if (initStrategy === 'empty') {
      // 100% empty week: user will add each day manually!
      generatedDays = [];
    } else if (initStrategy === 'clone_previous' && hasExistingDays) {
      // Clone from current week: keeps exercise names, sets, reps, but resets logs
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
          ? d.exercises.filter(Boolean).map((ex) => ({
              ...ex,
              id: `ex-w${weekNumber}-${(ex.name || 'cwiczenie').replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
              name: ex.name || 'Ćwiczenie',
              muscleGroup: ex.muscleGroup || 'Czworogłowe (Quads)',
              plannedSets: ex.plannedSets || 3,
              targetRepsRange: ex.targetRepsRange || '8-10',
              defaultWeightKg: applyWeightDelta && !isDeload ? (ex.defaultWeightKg || 0) + progressionDeltaKg : (ex.defaultWeightKg || 0),
              targetRIR: ex.targetRIR || targetRIR,
              targetRPE: ex.targetRPE || targetRPE,
              restSeconds: ex.restSeconds || 90,
              hyroxRelevance: ex.hyroxRelevance || '',
              techniqueNotes: ex.techniqueNotes || '',
            }))
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overscroll-contain">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] my-auto overflow-hidden text-left relative animate-in fade-in zoom-in-95">
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

        {/* Scrollable Form Body (Smooth Mobile Scrolling with min-h-0 and touch-pan-y) */}
        <form
          id="add-week-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain touch-pan-y"
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
                  Mnożnik Objętości:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.5"
                    value={volumeMultiplier}
                    onChange={(e) => setVolumeMultiplier(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
                  />
                  <span className="text-neutral-400 font-bold">x</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Średnie Celowe RPE:
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="6"
                  max="10"
                  value={targetRPE}
                  onChange={(e) => setTargetRPE(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Docelowy Zapas (RIR):
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="4"
                  value={targetRIR}
                  onChange={(e) => setTargetRIR(Number(e.target.value))}
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
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={progressionDeltaKg}
                      onChange={(e) => setProgressionDeltaKg(Number(e.target.value))}
                      className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-bold text-xs font-mono-numbers focus:border-amber-400"
                    />
                    <span className="text-[10px] text-neutral-400 font-bold">kg</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer (Fixed at bottom) */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Anuluj
          </button>
          <button
            type="submit"
            form="add-week-form"
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj Tydzień {weekNumber}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
