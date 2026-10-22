import React, { useState } from 'react';
import {
  Utensils,
  Flame,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Zap,
  Info,
  Scale,
  Activity,
  Check,
} from 'lucide-react';
import {
  UserProfile,
  DietSettings,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
} from '../../types/measurements';

interface DietTabProps {
  profile: UserProfile;
  latestWeightKg?: number;
  dietSettings: DietSettings;
  onUpdateDietSettings: (updated: Partial<DietSettings>) => void;
}

export const DietTab: React.FC<DietTabProps> = ({
  profile,
  latestWeightKg,
  dietSettings,
  onUpdateDietSettings,
}) => {
  const currentWeight = latestWeightKg || profile.targetWeightKg || 80.0;
  const [weeklyGoal, setWeeklyGoal] = useState<number>(dietSettings.weeklyGoalKg);
  const [proteinPerKg, setProteinPerKg] = useState<number>(dietSettings.proteinPerKg || 2.0);
  const [fatPerKg, setFatPerKg] = useState<number>(dietSettings.fatPerKg || 1.0);
  const [savedBadge, setSavedBadge] = useState<boolean>(false);

  // 1. Calculations: BMR via Mifflin-St Jeor
  const bmr = calculateBMR(currentWeight, profile.heightCm, profile.age, profile.gender);

  // 2. TDEE = BMR * PAL
  const tdee = calculateTDEE(bmr, profile.pal);

  // 3. Target daily calories based on 7700 kcal / kg rule
  const { targetCalories, dailySurplusDeficit } = calculateTargetCalories(tdee, weeklyGoal);

  // 4. Macro estimations
  const totalProteinG = Math.round(currentWeight * proteinPerKg);
  const proteinKcal = totalProteinG * 4;

  const totalFatG = Math.round(currentWeight * fatPerKg);
  const fatKcal = totalFatG * 9;

  const remainingKcalForCarbs = Math.max(0, targetCalories - (proteinKcal + fatKcal));
  const totalCarbsG = Math.round(remainingKcalForCarbs / 4);
  const carbsKcal = totalCarbsG * 4;

  const handleSliderChange = (newVal: number) => {
    const rounded = Math.round(newVal * 10) / 10;
    setWeeklyGoal(rounded);
    onUpdateDietSettings({ weeklyGoalKg: rounded });
  };

  const handleSaveSettings = () => {
    onUpdateDietSettings({
      weeklyGoalKg: weeklyGoal,
      proteinPerKg,
      fatPerKg,
    });
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const getGoalStatusLabel = () => {
    if (weeklyGoal < -0.1) {
      return {
        text: `Redukcja (${weeklyGoal > 0 ? `+${weeklyGoal}` : weeklyGoal} kg / tydzień)`,
        type: 'cut',
        color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
        icon: TrendingDown,
      };
    } else if (weeklyGoal > 0.1) {
      return {
        text: `Nadwyżka kaloryczna (+${weeklyGoal} kg / tydzień)`,
        type: 'bulk',
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        icon: TrendingUp,
      };
    }
    return {
      text: 'Utrzymanie wagi (Zero kaloryczne)',
      type: 'maintenance',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: Minus,
    };
  };

  const status = getGoalStatusLabel();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* Target Calories Hero Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase text-neutral-400 font-heading tracking-wider">
              Docelowa Podaż Kalorii
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${status.color}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{status.text}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-3 my-2">
          <span className="text-4xl sm:text-5xl font-black text-amber-400 font-heading tracking-tight">
            {targetCalories.toLocaleString('pl-PL')}
          </span>
          <span className="text-base sm:text-lg font-bold text-neutral-400 uppercase tracking-wide">
            kcal / dzień
          </span>
        </div>

        {/* Daily delta badge */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/80 mt-3 text-xs">
          <span className="text-neutral-400">Wpływ na bilans dobowy:</span>
          {dailySurplusDeficit === 0 ? (
            <span className="font-bold text-emerald-400">0 kcal (dokładnie TDEE)</span>
          ) : dailySurplusDeficit < 0 ? (
            <span className="font-black text-amber-400">
              {dailySurplusDeficit} kcal/dzień (deficyt)
            </span>
          ) : (
            <span className="font-black text-purple-400">
              +{dailySurplusDeficit} kcal/dzień (nadwyżka)
            </span>
          )}
          <span className="text-[11px] text-neutral-500 ml-auto">
            (Waga referencyjna: {currentWeight} kg)
          </span>
        </div>
      </div>

      {/* Live Formulas Grid: BMR & TDEE */}
      <div className="grid grid-cols-2 gap-3">
        {/* BMR Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-neutral-400 tracking-wider font-heading">
              BMR (Mifflin-St Jeor)
            </span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <span className="text-2xl font-black text-white font-heading">{bmr}</span>
            <span className="text-xs text-neutral-400 ml-1">kcal</span>
          </div>
          <p className="text-[10px] text-neutral-500 mt-2 leading-tight">
            Metabolizm spoczynkowy przy wadze {currentWeight} kg i {profile.heightCm} cm.
          </p>
        </div>

        {/* TDEE Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-neutral-400 tracking-wider font-heading">
              TDEE (BMR × PAL)
            </span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-2xl font-black text-amber-400 font-heading">{tdee}</span>
            <span className="text-xs text-neutral-400 ml-1">kcal</span>
          </div>
          <p className="text-[10px] text-neutral-500 mt-2 leading-tight">
            Całkowity wydatek energii ze współczynnikiem aktywności PAL = {profile.pal}.
          </p>
        </div>
      </div>

      {/* Goal Slider / Selector Card (-2.0 kg to +2.0 kg) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Tempo Zmiany Masy Ciała
          </h3>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-white font-heading">
            {weeklyGoal > 0 ? `+${weeklyGoal.toFixed(1)}` : weeklyGoal.toFixed(1)} kg / tydzień
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          Obliczane przy założeniu, że <strong>1 kg tkanki tłuszczowej to ok. 7700 kcal</strong>{' '}
          (np. cel -0.5 kg/tydzień generuje deficyt 550 kcal/dzień).
        </p>

        {/* Range Slider */}
        <div className="space-y-2 pt-2">
          <input
            type="range"
            min="-2.0"
            max="2.0"
            step="0.1"
            value={weeklyGoal}
            onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-neutral-950 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-bold px-1">
            <span>-2.0 kg (Ostra redukcja)</span>
            <span>0.0 kg (Zero)</span>
            <span>+2.0 kg (Ostra masa)</span>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSliderChange(-0.75)}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              weeklyGoal === -0.75
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            -0.75 kg (Szybka)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(-0.5)}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              weeklyGoal === -0.5
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            -0.5 kg (Optymalna)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(0.0)}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              weeklyGoal === 0.0
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            0.0 kg (Utrzymanie)
          </button>
          <button
            type="button"
            onClick={() => handleSliderChange(0.3)}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              weeklyGoal === 0.3
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            +0.3 kg (Lean Bulk)
          </button>
        </div>
      </div>

      {/* Suggested Macronutrient Breakdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Rekomendowany Podział Makroskładników
          </h3>
          <span className="text-[10px] text-neutral-400">Na masę {currentWeight} kg</span>
        </div>

        {/* Visual Macro Bar */}
        <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${(proteinKcal / targetCalories) * 100}%` }}
            className="bg-amber-400 h-full"
            title="Białko"
          />
          <div
            style={{ width: `${(fatKcal / targetCalories) * 100}%` }}
            className="bg-red-400 h-full"
            title="Tłuszcze"
          />
          <div
            style={{ width: `${(carbsKcal / targetCalories) * 100}%` }}
            className="bg-sky-400 h-full"
            title="Węglowodany"
          />
        </div>

        {/* 3 Macro Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Protein */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/90 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Białko</span>
            <div className="text-lg font-black text-white font-heading mt-0.5">{totalProteinG}g</div>
            <span className="text-[10px] text-neutral-500 block">
              {proteinPerKg}g/kg ({proteinKcal} kcal)
            </span>
          </div>

          {/* Fat */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/90 text-center">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Tłuszcze</span>
            <div className="text-lg font-black text-white font-heading mt-0.5">{totalFatG}g</div>
            <span className="text-[10px] text-neutral-500 block">
              {fatPerKg}g/kg ({fatKcal} kcal)
            </span>
          </div>

          {/* Carbs */}
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/90 text-center">
            <span className="text-[10px] uppercase font-bold text-sky-400 block">Węglowodany</span>
            <div className="text-lg font-black text-white font-heading mt-0.5">{totalCarbsG}g</div>
            <span className="text-[10px] text-neutral-500 block">Reszta ({carbsKcal} kcal)</span>
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <button
        type="button"
        onClick={handleSaveSettings}
        className="w-full py-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400 text-amber-400 font-black text-xs uppercase tracking-wider font-heading transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[50px]"
      >
        {savedBadge ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">Zapisano Ustawienia Diety!</span>
          </>
        ) : (
          <>
            <Utensils className="w-4 h-4" />
            <span>Zapisz Parametry Kaloryczne</span>
          </>
        )}
      </button>
    </div>
  );
};
