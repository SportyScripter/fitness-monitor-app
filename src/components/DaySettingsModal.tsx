import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Clock, Layers, Sparkles } from 'lucide-react';
import { WorkoutDay, DayType } from '../types/hyrox';

interface DaySettingsModalProps {
  day: WorkoutDay;
  isOpen: boolean;
  onClose: () => void;
  onSaveDaySettings: (updatedDay: WorkoutDay) => void;
}

const DAY_LABELS = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
  'Dzień Treningowy'
];

const DAY_TYPES: { type: DayType; label: string; desc: string; badgeClasses: string }[] = [
  {
    type: 'FBW',
    label: 'FBW (Siła & Hipertrofia)',
    desc: 'Trening siłowy całego ciała, progresja ciężarów',
    badgeClasses: 'bg-amber-400 text-black',
  },
  {
    type: 'RUNNING_HIIT',
    label: 'Bieg Interwałowy (HIIT / VO2max)',
    desc: 'Interwały biegowe, strefy tętna i tempo',
    badgeClasses: 'bg-red-500 text-white',
  },
  {
    type: 'WEEKEND_HYROX',
    label: 'Symulator Hyrox / Objętość',
    desc: 'Stacje Hyrox (SkiErg, Sled, Burpees, Wall Balls)',
    badgeClasses: 'bg-purple-600 text-white',
  },
  {
    type: 'REST_RECOVERY',
    label: 'Rest / Regeneracja',
    desc: 'Dzień wolny, mobility, sen i HRV',
    badgeClasses: 'bg-emerald-500 text-black',
  },
  {
    type: 'CUSTOM',
    label: 'Własny / Mieszany',
    desc: 'Dowolna struktura ćwiczeń i obciążeń',
    badgeClasses: 'bg-blue-500 text-white',
  },
];

export const DaySettingsModal: React.FC<DaySettingsModalProps> = ({
  day,
  isOpen,
  onClose,
  onSaveDaySettings,
}) => {
  const [dayType, setDayType] = useState<DayType>(day.type);
  const [dayNamePolish, setDayNamePolish] = useState(day.dayNamePolish || `Dzień ${day.dayNumber}`);
  const [title, setTitle] = useState(day.title);
  const [subtitle, setSubtitle] = useState(day.subtitle);
  const [durationMinutes, setDurationMinutes] = useState(day.durationMinutes || 60);

  useEffect(() => {
    setDayType(day.type);
    setDayNamePolish(day.dayNamePolish || `Dzień ${day.dayNumber}`);
    setTitle(day.title);
    setSubtitle(day.subtitle);
    setDurationMinutes(day.durationMinutes || 60);
  }, [day, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WorkoutDay = {
      ...day,
      type: dayType,
      dayNamePolish: dayNamePolish.trim() || `Dzień ${day.dayNumber}`,
      title: title.trim() || 'Trening',
      subtitle: subtitle.trim() || '',
      durationMinutes: Number(durationMinutes) || 60,
    };
    onSaveDaySettings(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4 overscroll-contain">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading">
                Dostosuj Parametry Dnia
              </h3>
              <p className="text-[11px] text-neutral-400">
                Dzień {day.dayNumber} • Ogólne parametry sesji treningowej
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {/* 1. Etykieta Dnia (Dzień tygodnia) */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-neutral-300 block">
              Etykieta Dnia (Dzień Tygodnia):
            </label>
            <input
              type="text"
              value={dayNamePolish}
              onChange={(e) => setDayNamePolish(e.target.value)}
              placeholder="np. Poniedziałek, Dzień 1"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
              required
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DAY_LABELS.map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setDayNamePolish(lbl)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    dayNamePolish === lbl
                      ? 'bg-amber-400 text-black'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Typ Dnia */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-neutral-300 block">
              Typ Dnia Treningowego:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DAY_TYPES.map((t) => {
                const isSelected = dayType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setDayType(t.type)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-950 border-amber-400 ring-1 ring-amber-400/30'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${t.badgeClasses}`}>
                        {t.type}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-xs font-bold text-white block truncate font-heading">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-neutral-400 block line-clamp-1 mt-0.5">
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Nazwa Treningu (Tytuł) */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-neutral-300 block">
              Nazwa Treningu (Tytuł):
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Góra Ciała (Klatka, Plecy, Barki)"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* 4. Podtytuł / Skupienie */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-neutral-300 block">
              Podtytuł / Skupienie Treningowe:
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="np. Wyciskanie leżąc, podciąganie nachwytem, tempo 3-0-1-0"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* 5. Czas trwania */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-neutral-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Szacowany czas trwania (minuty):</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Zapisz Parametry Dnia</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
