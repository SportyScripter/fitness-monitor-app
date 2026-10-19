import React, { useState } from 'react';
import {
  X,
  Copy,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { WorkoutDay, Exercise } from '../types/hyrox';

interface CopyWorkoutModalProps {
  sourceDay: WorkoutDay;
  currentWeek: number;
  totalWeeksCount: number;
  isOpen: boolean;
  onClose: () => void;
  onCopyDayToWeek: (sourceDay: WorkoutDay, targetWeek: number, targetDayNumber: number, progressionDeltaKg: number) => void;
  onCopyEntireWeekTo?: (sourceWeek: number, targetWeek: number, progressionDeltaKg: number) => void;
}

export const CopyWorkoutModal: React.FC<CopyWorkoutModalProps> = ({
  sourceDay,
  currentWeek,
  totalWeeksCount,
  isOpen,
  onClose,
  onCopyDayToWeek,
  onCopyEntireWeekTo,
}) => {
  const [copyScope, setCopyScope] = useState<'single_day' | 'entire_week'>('single_day');
  const [targetWeek, setTargetWeek] = useState<number>(currentWeek + 1);
  const [targetDayNumber, setTargetDayNumber] = useState<number>(sourceDay.dayNumber);
  const [progressionDeltaKg, setProgressionDeltaKg] = useState<number>(2.5);
  const [applyProgression, setApplyProgression] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const delta = applyProgression ? progressionDeltaKg : 0;
    if (copyScope === 'entire_week' && onCopyEntireWeekTo) {
      onCopyEntireWeekTo(currentWeek, targetWeek, delta);
    } else {
      onCopyDayToWeek(
        sourceDay,
        targetWeek,
        targetDayNumber,
        delta
      );
    }
    onClose();
  };

  const daysOfWeek = [
    { num: 1, name: 'Dzień 1: Poniedziałek' },
    { num: 2, name: 'Dzień 2: Wtorek' },
    { num: 3, name: 'Dzień 3: Środa' },
    { num: 4, name: 'Dzień 4: Czwartek' },
    { num: 5, name: 'Dzień 5: Piątek' },
    { num: 6, name: 'Dzień 6: Sobota' },
    { num: 7, name: 'Dzień 7: Niedziela' },
  ];

  const maxSelectableWeek = Math.max(totalWeeksCount + 2, currentWeek + 2);
  const availableWeeks = Array.from({ length: maxSelectableWeek }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overscroll-contain">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 text-left relative space-y-4 my-auto overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading">
                Kopiuj Trening do Innego Tygodnia
              </h3>
              <p className="text-xs text-neutral-400">
                Tydzień i dzień zostaną automatycznie utworzone, jeśli jeszcze nie istnieją
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope selector: Single Day vs Entire Week */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setCopyScope('single_day')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer ${
              copyScope === 'single_day'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ten Dzień ({sourceDay.dayNamePolish})
          </button>
          <button
            type="button"
            onClick={() => setCopyScope('entire_week')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer ${
              copyScope === 'entire_week'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cały Tydzień {currentWeek} (Wszystkie dni)
          </button>
        </div>

        {/* Source Summary */}
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
            Kopiowane Źródło:
          </span>
          {copyScope === 'single_day' ? (
            <>
              <div className="font-bold text-white text-sm font-heading">
                {sourceDay.dayNamePolish} (Tydzień {currentWeek}): {sourceDay.title}
              </div>
              <div className="text-neutral-400 mt-0.5">
                {sourceDay.exercises.length} ćwiczeń • Typ: <span className="text-amber-400">{sourceDay.type}</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-white text-sm font-heading">
                Wszystkie treningi z Tygodnia {currentWeek}
              </div>
              <div className="text-neutral-400 mt-0.5">
                Kompletny plan tygodniowy z ćwiczeniami, seriami i przerwami
              </div>
            </>
          )}
        </div>

        {/* Destination Target */}
        <div className={`grid ${copyScope === 'single_day' ? 'grid-cols-2' : 'grid-cols-1'} gap-3 text-xs`}>
          <div>
            <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
              Docelowy Tydzień:
            </label>
            <select
              value={targetWeek}
              onChange={(e) => setTargetWeek(Number(e.target.value))}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-bold cursor-pointer focus:outline-none focus:border-amber-400"
            >
              {availableWeeks.map((wNum) => {
                const isNext = wNum === currentWeek + 1;
                const isNew = wNum > totalWeeksCount;
                return (
                  <option key={wNum} value={wNum}>
                    Tydzień {wNum} {isNext ? '(Następny Tydzień)' : isNew ? '(Nowy Tydzień — Utwórz)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {copyScope === 'single_day' && (
            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                Docelowy Dzień w Tygodniu:
              </label>
              <select
                value={targetDayNumber}
                onChange={(e) => setTargetDayNumber(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-bold cursor-pointer focus:outline-none focus:border-amber-400"
              >
                {daysOfWeek.map((d) => (
                  <option key={d.num} value={d.num}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Auto creation reassurance note */}
        <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Jeśli Tydzień {targetWeek} lub wybrany dzień jeszcze nie istnieją w Twoim cyklu, zostaną automatycznie utworzone i skonfigurowane!
          </span>
        </div>

        {/* Optional Progression */}
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-white">
            <input
              type="checkbox"
              checked={applyProgression}
              onChange={(e) => setApplyProgression(e.target.checked)}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
            <span>Zastosuj progresję obciążeń (+kg)</span>
          </label>

          {applyProgression && (
            <div className="flex items-center justify-between pt-1 text-neutral-300">
              <span className="text-[11px] text-neutral-400">
                Dodaj do ciężarów roboczych w nowym tygodniu:
              </span>
              <div className="flex items-center gap-1.5 font-bold">
                {[1.0, 2.5, 5.0, 7.5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setProgressionDeltaKg(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      progressionDeltaKg === val
                        ? 'bg-amber-400 text-black font-black'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    +{val}kg
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-amber-400/20 cursor-pointer flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>
              {copyScope === 'entire_week'
                ? `Skopiuj Cały Tydzień do T${targetWeek}`
                : `Skopiuj Trening do T${targetWeek}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
