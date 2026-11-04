import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Calendar, Sliders } from 'lucide-react';
import { MesocyclePhase } from '../../types/hyrox';

interface EditWeekParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: MesocyclePhase;
  onSave: (updatedWeek: MesocyclePhase) => void;
  onDeleteWeek?: (weekNumber: number) => void;
  canDelete?: boolean;
}

export const EditWeekParamsModal: React.FC<EditWeekParamsModalProps> = ({
  isOpen,
  onClose,
  week,
  onSave,
  onDeleteWeek,
  canDelete = false,
}) => {
  const [name, setName] = useState(week.name);
  const [multiplier, setMultiplier] = useState(String(week.volumeMultiplier || 1.0));
  const [rpe, setRpe] = useState(String(week.targetRPE || 8.0));
  const [rir, setRir] = useState(String(week.targetRIR ?? 2));
  const [progressionNote, setProgressionNote] = useState(week.progressionNote || '');

  useEffect(() => {
    setName(week.name);
    setMultiplier(String(week.volumeMultiplier || 1.0));
    setRpe(String(week.targetRPE || 8.0));
    setRir(String(week.targetRIR ?? 2));
    setProgressionNote(week.progressionNote || '');
  }, [week, isOpen]);

  if (!isOpen) return null;

  const numMultiplier = parseFloat(multiplier.replace(',', '.'));
  const isMultiplierValid =
    week.isDeload || (!isNaN(numMultiplier) && numMultiplier >= 1.0 && numMultiplier <= 1.5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMultiplierValid) return;

    const parsedVol = parseFloat(multiplier.replace(',', '.'));
    const parsedRpe = parseFloat(rpe.replace(',', '.'));
    const parsedRir = parseFloat(rir.replace(',', '.'));

    onSave({
      ...week,
      name: name.trim() || `Tydzień ${week.week}`,
      volumeMultiplier: week.isDeload ? 0.6 : !isNaN(parsedVol) ? parsedVol : 1.0,
      targetRPE: !isNaN(parsedRpe) ? parsedRpe : 8.0,
      targetRIR: !isNaN(parsedRir) ? parsedRir : 2,
      progressionNote: progressionNote.trim(),
    });
    onClose();
  };

  const handleDelete = () => {
    if (!onDeleteWeek) return;
    if (window.confirm(`Czy na pewno chcesz usunąć Tydzień ${week.week} (${week.name})?`)) {
      onDeleteWeek(week.week);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden text-left">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shadow-amber-400/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading">
                Edytuj Parametry Tygodnia
              </h3>
              <p className="text-[11px] text-neutral-400">
                Tydzień {week.week} • Objętość, RPE, RIR i wskazówki
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1">
          <div>
            <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
              Nazwa fazy / tygodnia:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
              placeholder={`np. Tydzień ${week.week}: Akumulacja`}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                Mnożnik objętości (1.0 - 1.5):
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={multiplier}
                disabled={week.isDeload}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    setMultiplier(val);
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                Docelowe RPE (np. 8.0):
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={rpe}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    setRpe(val);
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
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
                value={rir}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    setRir(val);
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
              Wskazówka / notatka progresji:
            </label>
            <textarea
              rows={3}
              value={progressionNote}
              onChange={(e) => setProgressionNote(e.target.value)}
              placeholder="np. Zwiększ ciężar w głównych bojach o 2.5 kg..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-2">
            {canDelete && onDeleteWeek ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usuń tydzień</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={!isMultiplierValid}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isMultiplierValid
                    ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-md cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Zapisz parametry</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
