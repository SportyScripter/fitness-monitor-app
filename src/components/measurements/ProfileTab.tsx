import React, { useState } from 'react';
import { User, Activity, Check, ShieldCheck, Sparkles, Scale } from 'lucide-react';
import { UserProfile, PAL_OPTIONS } from '../../types/measurements';

interface ProfileTabProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  latestWeightKg?: number;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  onUpdateProfile,
  latestWeightKg,
}) => {
  const [age, setAge] = useState<number>(profile.age);
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender);
  const [heightCm, setHeightCm] = useState<number>(profile.heightCm);
  const [pal, setPal] = useState<number>(profile.pal);
  const [targetWeightKg, setTargetWeightKg] = useState<number | undefined>(profile.targetWeightKg);
  const [savedBadge, setSavedBadge] = useState<boolean>(false);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateProfile({
      age: Number(age) || 25,
      gender,
      heightCm: Number(heightCm) || 175,
      pal: Number(pal) || 1.6,
      targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
    });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* Intro Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white font-heading uppercase tracking-wide">
                Profil Biometryczny
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Dane bazowe wykorzystywane do wzorów BMR, TDEE i Jackson-Pollock
              </p>
            </div>
          </div>

          {savedBadge && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
              <Check className="w-3.5 h-3.5" />
              Zapisano
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic Metrics Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Parametry Podstawowe
          </h3>

          {/* Gender Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">Płeć biologiczna</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-3 px-4 rounded-2xl border text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'male'
                    ? 'bg-amber-400 text-black border-amber-300 shadow-md font-heading'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>Mężczyzna</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-3 px-4 rounded-2xl border text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'female'
                    ? 'bg-amber-400 text-black border-amber-300 shadow-md font-heading'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>Kobieta</span>
              </button>
            </div>
          </div>

          {/* Age & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">Wiek (lata)</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="12"
                max="100"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl px-4 py-3 text-white text-base font-bold outline-none transition-colors"
                placeholder="28"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">Wzrost (cm)</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="100"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl px-4 py-3 text-white text-base font-bold outline-none transition-colors"
                placeholder="182"
                required
              />
            </div>
          </div>

          {/* Target Weight (Optional) */}
          <div className="pt-2 border-t border-neutral-800/80">
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>Waga docelowa (kg)</span>
              {latestWeightKg && (
                <span className="text-[11px] text-neutral-500 font-normal">
                  Aktualna: <strong className="text-amber-400">{latestWeightKg} kg</strong>
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={targetWeightKg || ''}
                onChange={(e) => setTargetWeightKg(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-2xl px-4 py-3 text-white text-base font-bold outline-none transition-colors"
                placeholder="np. 80.0"
              />
              <span className="absolute right-4 top-3.5 text-xs text-neutral-500 font-bold">kg</span>
            </div>
          </div>
        </div>

        {/* Physical Activity Level (PAL) Cards */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Poziom Aktywności Fizycznej (PAL)
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 font-black border border-amber-400/20">
              PAL = {pal}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Współczynnik PAL określa całkowity wydatek energetyczny względem metabolizmu spoczynkowego.
          </p>

          <div className="space-y-2.5 pt-1">
            {PAL_OPTIONS.map((opt) => {
              const isSelected = Math.abs(pal - opt.value) < 0.05;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPal(opt.value)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 touch-manipulation ${
                    isSelected
                      ? 'bg-amber-400/15 border-amber-400/60 shadow-md'
                      : 'bg-neutral-950 border-neutral-800/90 hover:border-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-neutral-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black uppercase font-heading ${
                          isSelected ? 'text-amber-300' : 'text-white'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-black font-black text-sm uppercase tracking-wider font-heading transition-all shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2 min-h-[52px]"
        >
          <Check className="w-4 h-4" />
          <span>Zapisz Zmiany w Profilu</span>
        </button>
      </form>
    </div>
  );
};
