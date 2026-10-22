import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Scale,
  Ruler,
  Percent,
  Check,
  Save,
  Info,
  Flame,
  Copy,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import {
  UserProfile,
  BodyMeasurement,
  calculateJacksonPollock3Site,
} from '../../types/measurements';

interface MeasurementsTabProps {
  profile: UserProfile;
  latestMeasurement: BodyMeasurement | null;
  onSaveMeasurement: (measurement: Omit<BodyMeasurement, 'id'>) => void;
  onSwitchToHistory?: () => void;
}

export const MeasurementsTab: React.FC<MeasurementsTabProps> = ({
  profile,
  latestMeasurement,
  onSaveMeasurement,
  onSwitchToHistory,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [weightKg, setWeightKg] = useState<string>(
    latestMeasurement ? String(latestMeasurement.weightKg) : '80.0'
  );

  // Circumferences (cm)
  const [calf, setCalf] = useState<string>('');
  const [thigh, setThigh] = useState<string>('');
  const [hip, setHip] = useState<string>('');
  const [abdomen, setAbdomen] = useState<string>('');
  const [waist, setWaist] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [biceps, setBiceps] = useState<string>('');
  const [forearm, setForearm] = useState<string>('');

  // Skinfolds (mm)
  const [skinfoldChest, setSkinfoldChest] = useState<string>('');
  const [skinfoldAbdomen, setSkinfoldAbdomen] = useState<string>('');
  const [skinfoldThigh, setSkinfoldThigh] = useState<string>('');

  // Manual Body Fat override (optional if user has DEXA / InBody)
  const [manualBf, setManualBf] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Live calculation of Jackson-Pollock 3-site
  const numChest = parseFloat(skinfoldChest);
  const numAbdomen = parseFloat(skinfoldAbdomen);
  const numThigh = parseFloat(skinfoldThigh);

  const calculatedBf =
    !isNaN(numChest) && !isNaN(numAbdomen) && !isNaN(numThigh) && numChest > 0 && numAbdomen > 0 && numThigh > 0
      ? calculateJacksonPollock3Site(
          { chest: numChest, abdomen: numAbdomen, thigh: numThigh },
          profile.age,
          profile.gender
        )
      : null;

  const activeBf = manualBf ? parseFloat(manualBf) : calculatedBf;
  const numWeight = parseFloat(weightKg);

  const fatMassKg =
    activeBf !== null && !isNaN(activeBf) && !isNaN(numWeight) && numWeight > 0
      ? Math.round((numWeight * (activeBf / 100)) * 10) / 10
      : null;

  const leanMassKg =
    fatMassKg !== null && !isNaN(numWeight) && numWeight > 0
      ? Math.round((numWeight - fatMassKg) * 10) / 10
      : null;

  // Prefill with previous measurement data
  const handleCopyFromLatest = () => {
    if (!latestMeasurement) return;
    if (latestMeasurement.weightKg) setWeightKg(String(latestMeasurement.weightKg));
    const c = latestMeasurement.circumferences;
    if (c.calf) setCalf(String(c.calf));
    if (c.thigh) setThigh(String(c.thigh));
    if (c.hip) setHip(String(c.hip));
    if (c.abdomen) setAbdomen(String(c.abdomen));
    if (c.waist) setWaist(String(c.waist));
    if (c.chest) setChest(String(c.chest));
    if (c.biceps) setBiceps(String(c.biceps));
    if (c.forearm) setForearm(String(c.forearm));

    const s = latestMeasurement.skinfolds;
    if (s.chest) setSkinfoldChest(String(s.chest));
    if (s.abdomen) setSkinfoldAbdomen(String(s.abdomen));
    if (s.thigh) setSkinfoldThigh(String(s.thigh));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalWeight = parseFloat(weightKg);
    if (isNaN(finalWeight) || finalWeight <= 0) {
      alert('Wprowadź prawidłową wagę ciała!');
      return;
    }

    const circumferences = {
      calf: calf ? parseFloat(calf) : undefined,
      thigh: thigh ? parseFloat(thigh) : undefined,
      hip: hip ? parseFloat(hip) : undefined,
      abdomen: abdomen ? parseFloat(abdomen) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
      chest: chest ? parseFloat(chest) : undefined,
      biceps: biceps ? parseFloat(biceps) : undefined,
      forearm: forearm ? parseFloat(forearm) : undefined,
    };

    const skinfolds = {
      chest: skinfoldChest ? parseFloat(skinfoldChest) : undefined,
      abdomen: skinfoldAbdomen ? parseFloat(skinfoldAbdomen) : undefined,
      thigh: skinfoldThigh ? parseFloat(skinfoldThigh) : undefined,
    };

    onSaveMeasurement({
      date,
      weightKg: finalWeight,
      circumferences,
      skinfolds,
      bodyFatPct: activeBf !== null ? activeBf : undefined,
      fatMassKg: fatMassKg !== null ? fatMassKg : undefined,
      leanMassKg: leanMassKg !== null ? leanMassKg : undefined,
      notes: notes.trim() || undefined,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSwitchToHistory) onSwitchToHistory();
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* Top Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white font-heading uppercase tracking-wide">
              Wprowadź Pomiary
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Waga, obwody ciała oraz fałdy skórne fałdomierzem
            </p>
          </div>
        </div>

        {latestMeasurement && (
          <button
            type="button"
            onClick={handleCopyFromLatest}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-amber-400 text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95"
            title="Wypełnij ostatnimi wartościami"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kopiuj ostatnie</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date & Weight Primary Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date input */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Data pomiaru
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl px-4 py-3 text-white text-base font-bold outline-none transition-colors"
                required
              />
            </div>

            {/* Weight input */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                Waga ciała (kg) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl px-4 py-3 text-amber-400 text-xl font-black outline-none transition-colors"
                  placeholder="80.0"
                  required
                />
                <span className="absolute right-4 top-3.5 text-xs text-neutral-500 font-black">
                  KG
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Skinfolds & Jackson-Pollock 3-Site Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Fałdy Skóry (Jackson-Pollock 3-Site)
            </h3>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-full border border-neutral-800">
              Fałdomierz w mm
            </span>
          </div>

          <p className="text-xs text-neutral-400">
            Wprowadź grubość trzech fałdów skórnych. Algorytm wyliczy poziom tkanki tłuszczowej (BF%)
            oraz masę beztłuszczową.
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 mb-1 truncate">
                Klatka piersiowa
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={skinfoldChest}
                  onChange={(e) => setSkinfoldChest(e.target.value)}
                  placeholder="np. 12"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-2.5 top-3 text-[10px] text-neutral-500 font-bold">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-300 mb-1 truncate">
                Brzuch
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={skinfoldAbdomen}
                  onChange={(e) => setSkinfoldAbdomen(e.target.value)}
                  placeholder="np. 16"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-2.5 top-3 text-[10px] text-neutral-500 font-bold">
                  mm
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-300 mb-1 truncate">
                Udo
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={skinfoldThigh}
                  onChange={(e) => setSkinfoldThigh(e.target.value)}
                  placeholder="np. 14"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-2.5 top-3 text-[10px] text-neutral-500 font-bold">
                  mm
                </span>
              </div>
            </div>
          </div>

          {/* Live Jackson-Pollock Result Preview */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                Wyliczony Body Fat (BF%)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-amber-400 font-heading">
                  {calculatedBf !== null ? `${calculatedBf}%` : '---'}
                </span>
                {fatMassKg !== null && leanMassKg !== null && (
                  <span className="text-xs text-neutral-400">
                    (Tłuszcz: <strong className="text-white">{fatMassKg} kg</strong> | Sucha masa:{' '}
                    <strong className="text-emerald-400">{leanMassKg} kg</strong>)
                  </span>
                )}
              </div>
            </div>

            {/* Optional manual override for DEXA / InBody */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-neutral-500 shrink-0">Wpisz ręcznie:</span>
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={manualBf}
                  onChange={(e) => setManualBf(e.target.value)}
                  placeholder="BF %"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-400"
                />
                <span className="absolute right-2 top-2 text-[10px] text-neutral-500 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Circumferences (Obwody ciała w cm) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Obwody Ciała (cm)
            </h3>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-full border border-neutral-800">
              Centymetry (cm)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Klatka piersiowa */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Klatka piersiowa</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  placeholder="np. 106.5"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Talia */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Talia (wcięcie)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder="np. 82.0"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Brzuch */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Brzuch (pępek)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={abdomen}
                  onChange={(e) => setAbdomen(e.target.value)}
                  placeholder="np. 86.0"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Biodro */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Biodro / Pośladki</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  placeholder="np. 102.0"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Biceps */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Biceps (napięty)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={biceps}
                  onChange={(e) => setBiceps(e.target.value)}
                  placeholder="np. 38.5"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Przedramię */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Przedramię</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={forearm}
                  onChange={(e) => setForearm(e.target.value)}
                  placeholder="np. 31.0"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Udo */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Udo (najszersze)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={thigh}
                  onChange={(e) => setThigh(e.target.value)}
                  placeholder="np. 61.5"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>

            {/* Łydka */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Łydka</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={calf}
                  onChange={(e) => setCalf(e.target.value)}
                  placeholder="np. 39.0"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl px-3.5 py-2.5 text-white text-sm font-bold outline-none"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-bold">cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes (Optional) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-2">
          <label className="block text-xs font-bold text-neutral-300">Notatki z pomiaru (opcjonalnie)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-2xl p-3 text-sm text-white placeholder-neutral-600 outline-none resize-none"
            placeholder="np. Rano na czczo, po 8h snu, nawodnienie standardowe..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-black font-black text-sm uppercase tracking-wider font-heading transition-all shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2 min-h-[52px]"
        >
          {savedSuccess ? (
            <>
              <Check className="w-5 h-5 text-black" />
              <span>Zapisano Pomyślnie!</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5 text-black" />
              <span>Zapisz Pomiar Sylwetki</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
