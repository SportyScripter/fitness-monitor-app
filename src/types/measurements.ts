export type Gender = 'male' | 'female';

export interface UserProfile {
  age: number;
  gender: Gender;
  heightCm: number;
  pal: number; // Physical Activity Level (e.g., 1.2 - 2.0)
  targetWeightKg?: number;
}

export interface Circumferences {
  calf?: number; // Łydka (cm)
  thigh?: number; // Udo (cm)
  hip?: number; // Biodro (cm)
  abdomen?: number; // Brzuch (cm)
  waist?: number; // Talia (cm)
  chest?: number; // Klatka piersiowa (cm)
  biceps?: number; // Biceps (cm)
  forearm?: number; // Przedramię (cm)
}

export interface Skinfolds {
  thigh?: number; // Udo (mm)
  abdomen?: number; // Brzuch (mm)
  chest?: number; // Klatka piersiowa (mm)
}

export interface BodyMeasurement {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  circumferences: Circumferences;
  skinfolds: Skinfolds;
  bodyFatPct?: number; // Obliczone automatycznie wzorem Jackson-Pollock 3-site
  fatMassKg?: number;
  leanMassKg?: number;
  notes?: string;
}

export interface DietSettings {
  weeklyGoalKg: number; // e.g. -0.5 kg/tydzień (zakres od -2.0 do +2.0)
  proteinPerKg: number; // domyślnie 2.0 g / kg
  fatPerKg: number; // domyślnie 1.0 g / kg
}

export interface PALOption {
  value: number;
  label: string;
  description: string;
}

export const PAL_OPTIONS: PALOption[] = [
  {
    value: 1.2,
    label: '1.2 - Siedzący tryb życia',
    description: 'Brak aktywności, praca biurowa, znikomy ruch w ciągu dnia',
  },
  {
    value: 1.4,
    label: '1.4 - Niska aktywność',
    description: 'Lekka aktywność, spacery lub 1-2 lekkie treningi w tygodniu',
  },
  {
    value: 1.6,
    label: '1.6 - Umiarkowana aktywność',
    description: '3-4 regularne treningi siłowe/hyrox, praca o umiarkowanym ruchu',
  },
  {
    value: 1.8,
    label: '1.8 - Wysoka aktywność',
    description: 'Ciężkie treningi 5-6 razy w tygodniu lub praca fizyczna + treningi',
  },
  {
    value: 2.0,
    label: '2.0 - Bardzo wysoka / Zawodowa',
    description: 'Codzienne wyczerpujące podwójne sesje treningowe lub ciężka praca fizyczna',
  },
];

/**
 * Oblicza poziom tkanki tłuszczowej (Body Fat %) metodą Jackson-Pollock 3-site:
 * Fałdy (mm): Klatka piersiowa (Chest), Brzuch (Abdomen), Udo (Thigh).
 */
export function calculateJacksonPollock3Site(
  skinfolds: Skinfolds,
  age: number,
  gender: Gender
): number | null {
  const { chest, abdomen, thigh } = skinfolds;
  if (
    chest === undefined ||
    abdomen === undefined ||
    thigh === undefined ||
    chest <= 0 ||
    abdomen <= 0 ||
    thigh <= 0
  ) {
    return null;
  }

  const sum = chest + abdomen + thigh;
  let bodyDensity: number;

  if (gender === 'male') {
    // Jackson & Pollock formula for Men (3-site: Chest, Abdomen, Thigh)
    bodyDensity =
      1.10938 -
      0.0008267 * sum +
      0.0000016 * Math.pow(sum, 2) -
      0.0002574 * age;
  } else {
    // Jackson & Pollock formula for Women (3-site generalized)
    bodyDensity =
      1.0994921 -
      0.0009929 * sum +
      0.0000023 * Math.pow(sum, 2) -
      0.0001392 * age;
  }

  if (bodyDensity <= 0) return null;

  // Równanie Siri: BF% = ((4.95 / BD) - 4.50) * 100
  const bf = (4.95 / bodyDensity - 4.5) * 100;
  if (bf < 2 || bf > 65) return null;

  return Math.round(bf * 10) / 10;
}

/**
 * Oblicza Podstawową Przemianę Materii (BMR) wzorem Mifflina-St Jeor:
 * Mężczyźni: 10 * waga + 6.25 * wzrost - 5 * wiek + 5
 * Kobiety: 10 * waga + 6.25 * wzrost - 5 * wiek - 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = gender === 'male' ? base + 5 : base - 161;
  return Math.round(bmr);
}

/**
 * Oblicza Całkowitą Przemianę Materii (TDEE = BMR * PAL)
 */
export function calculateTDEE(bmr: number, pal: number): number {
  return Math.round(bmr * pal);
}

/**
 * Oblicza cel kaloryczny na podstawie tygodniowej zmiany wagi (1 kg = 7700 kcal).
 * weeklyGoalKg > 0: nadwyżka
 * weeklyGoalKg < 0: deficyt
 */
export function calculateTargetCalories(
  tdee: number,
  weeklyGoalKg: number
): { targetCalories: number; dailySurplusDeficit: number } {
  // 1 kg = 7700 kcal -> dzienna zmiana = (weeklyGoalKg * 7700) / 7 = weeklyGoalKg * 1100
  const dailySurplusDeficit = Math.round(weeklyGoalKg * 1100);
  const targetCalories = Math.max(1000, Math.round(tdee + dailySurplusDeficit));
  return { targetCalories, dailySurplusDeficit };
}
