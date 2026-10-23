export type MuscleGroup =
  | 'Klatka piersiowa'
  | 'Plecy'
  | 'Barki'
  | 'Biceps'
  | 'Triceps'
  | 'Czworogłowe uda'
  | 'Dwugłowe uda'
  | 'Łydki'
  | 'Brzuch';

export const PROFESSIONAL_MUSCLE_GROUPS: MuscleGroup[] = [
  'Klatka piersiowa',
  'Plecy',
  'Barki',
  'Biceps',
  'Triceps',
  'Czworogłowe uda',
  'Dwugłowe uda',
  'Łydki',
  'Brzuch',
];

export const normalizeMuscleGroup = (raw?: string | null): MuscleGroup => {
  if (!raw) return 'Klatka piersiowa';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('klatk') || clean.includes('chest')) return 'Klatka piersiowa';
  if (clean.includes('plec') || clean.includes('grzbiet') || clean.includes('back') || clean.includes('lats')) return 'Plecy';
  if (clean.includes('bark') || clean.includes('ramion') || clean.includes('shoulder') || clean.includes('delts')) return 'Barki';
  if (clean.includes('biceps')) return 'Biceps';
  if (clean.includes('triceps')) return 'Triceps';
  if (clean.includes('czworo') || clean.includes('quad')) return 'Czworogłowe uda';
  if (clean.includes('dwugłow') || clean.includes('kulsz') || clean.includes('hamstring') || clean.includes('glute') || clean.includes('poślad')) return 'Dwugłowe uda';
  if (clean.includes('łydk') || clean.includes('calf') || clean.includes('calves')) return 'Łydki';
  if (clean.includes('brzuch') || clean.includes('core') || clean.includes('abs')) return 'Brzuch';
  return 'Klatka piersiowa';
};

export type DayType = 'FBW' | 'RUNNING_HIIT' | 'REST_RECOVERY' | 'WEEKEND_HYROX' | 'CUSTOM';

export type ExerciseType = 'STRENGTH' | 'RUNNING' | 'HYROX_STATION' | 'INTERVAL_CARDIO' | 'MOBILITY';
export type ExerciseCategory = 'strength' | 'cardio';
export type ExerciseUnit = 'kg' | 'lb' | 'km' | 'm';

export const RUNNING_TYPES = [
  'Easy Run',
  'Long Run',
  'Intervals',
  'Tempo Run',
  'Fartlek',
  'Recovery Run',
  'Hill Repeats',
] as const;
export type RunningType = (typeof RUNNING_TYPES)[number];

export interface ExerciseSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  tonnage: number; // weightKg * reps
  rpe?: number;
  rir?: number;
  unit?: ExerciseUnit;
  setDurationSec?: number;
  restDurationSec?: number;
  targetDistance?: number;
  distance?: number;
  distanceUnit?: 'km' | 'm';
  targetPace?: string;
  pace?: string;
  actualPace?: string;
  targetHR?: number;
  targetHr?: number;
  actualHR?: number;
}

export type WorkoutSet = ExerciseSet;

export interface ExercisePlannedSet {
  setNumber: number;
  reps?: number | string;
  weightKg?: number;
  rir?: number;
  rpe?: number;
  distance?: number;
  distanceUnit?: 'km' | 'm';
  pace?: string;
  targetHr?: number;
  targetHR?: number;
}

export interface Exercise {
  id: string;
  name: string;
  category?: ExerciseCategory;
  muscleGroup?: MuscleGroup;
  secondaryMuscleGroup?: MuscleGroup;
  plannedSets: number;
  targetRepsRange: string; // e.g. "6-8" or "10-12" or "20-25"
  defaultWeightKg: number;
  targetRIR: number; // e.g. 2
  targetRPE: number; // e.g. 8
  restSeconds: number;
  restBetweenSetsSec?: number;
  restAfterExerciseSec?: number;
  tempo?: string; // e.g. "3-0-1-0" or "Ekscentryka 3s"
  hyroxRelevance: string;
  techniqueNotes: string;
  exerciseType?: ExerciseType;
  unit?: ExerciseUnit;
  targetDistance?: number;
  distanceUnit?: 'km' | 'm';
  targetPace?: string;
  targetHR?: number;
  targetDurationSec?: number;
  plannedSetsDetails?: ExercisePlannedSet[];
}

export interface RunningInterval {
  id: string;
  stepName: string;
  distanceOrTime: string; // e.g. "800m" or "2:00 min"
  targetIntensity: string; // e.g. "Tempo 4:05/km (RPE 8.5)"
  recovery: string; // e.g. "90s marsz"
  paceSecondsPerKm?: number;
  hyroxSpecifics: string;
}

export interface RunningSession {
  title: string;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  warmup: string;
  intervals: RunningInterval[];
  cooldown: string;
  keyCoachingCue: string;
  tempoPace?: string; // e.g. "4:15 - 4:30 min/km"
  restIntervalSeconds?: number;
}

export interface HyroxStation {
  id: string;
  stationNumber: number;
  name: string;
  officialDistanceOrReps: string;
  categoryWeights: {
    openMen: string;
    openWomen: string;
    proMen: string;
    proWomen: string;
    doublesMen: string;
    doublesWomen: string;
  };
  pacingTip: string;
  targetSplitMinutes: string;
  compromisedRunAfter: string;
}

export interface WorkoutDay {
  id: string;
  dayNumber: number; // 1 to 7
  dayNamePolish: string; // Poniedziałek, Wtorek, etc.
  title: string;
  subtitle: string;
  type: DayType;
  durationMinutes: number;
  summary: string;
  targetRpeRange: string;
  targetRirRange: string;
  tempo?: string;
  exercises: Exercise[];
  runningSession?: RunningSession;
  recoveryProtocols?: string[];
  sessionNotes?: string;
}

export interface TemplateWorkout {
  id: string;
  name: string;
  type: DayType;
  subtitle: string;
  durationMinutes: number;
  targetRpeRange: string;
  targetRirRange: string;
  tempo?: string;
  exercises: Exercise[];
  runningSession?: RunningSession;
  recoveryProtocols?: string[];
  notes?: string;
}

export type TrainingCycleGoal =
  | 'HYROX'
  | 'MASA'
  | 'REDUKCJA'
  | 'SILA'
  | 'BIEG_WYTRZYMALOSC'
  | 'CUSTOM';

export type DayNamingScheme = 'WEEKDAYS' | 'TRAINING_NUMBERS' | 'PLAN_LETTERS' | 'CUSTOM';

export type SessionActivityType =
  | 'STRENGTH'
  | 'RUNNING'
  | 'CYCLING'
  | 'HYROX'
  | 'RECOVERY'
  | 'FREE_WORKOUT';

export interface TrainingCycleCatalog {
  id: string;
  name: string; // e.g. "Przygotowania pod HYROX", "Masa 2026", "Redukcja"
  goal: TrainingCycleGoal;
  description: string;
  colorTag: 'amber' | 'emerald' | 'purple' | 'blue' | 'rose' | 'red';
  currentWeek: number;
  weeksList: MesocyclePhase[];
  weeksPlansMap: Record<number, WorkoutDay[]>;
  namingScheme?: DayNamingScheme;
  createdAt?: string;
}

export interface TrainingProgramFolder {
  id: string;
  name: string;
  description: string;
  colorTag: 'amber' | 'emerald' | 'purple' | 'blue' | 'rose';
  workouts: TemplateWorkout[];
}

export interface WeekPlanDefinition {
  weekNumber: number;
  name: string;
  focus: string;
  isDeload: boolean;
  volumeMultiplier: number;
  targetRPE: number;
  targetRIR: number;
  days: WorkoutDay[];
}

export interface WorkoutLogEntry {
  id: string;
  timestamp: string;
  dateStr: string;
  dayId: string;
  dayTitle: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: MuscleGroup;
  setNumber: number;
  weightKg: number;
  reps: number;
  tonnageKg: number;
  rpe: number;
  rir: number;
  notes?: string; // exercise-specific note
  sessionNotes?: string; // overall session note
  sessionId?: string; // unique session identifier for grouping multiple workouts per day
  sessionTitle?: string; // e.g. "Trening Poranny: FBW" lub "Wieczorny Bieg 6km"
  activityType?: SessionActivityType;
  durationMinutes?: number;
  distanceKm?: number;
  unit?: ExerciseUnit;
  setDurationSec?: number;
  restDurationSec?: number;
  targetDistance?: number;
  distanceUnit?: 'km' | 'm';
  targetPace?: string;
  actualPace?: string;
  targetHR?: number;
  actualHR?: number;
  totalWorkoutDurationSec?: number;
  totalWorkDurationSec?: number;
  totalRestDurationSec?: number;
}

export interface HyroxRaceTrialSplit {
  stationKey: string;
  stationName: string;
  type: 'RUN' | 'STATION' | 'ROXZONE';
  timeSeconds: number;
  formattedTime: string;
  targetSeconds: number;
  notes?: string;
}

export interface HyroxRaceTrial {
  id: string;
  date: string;
  category: 'openMen' | 'openWomen' | 'proMen' | 'proWomen' | 'doublesMen' | 'doublesWomen';
  mode: 'FULL_HYROX' | 'HALF_HYROX' | 'STATIONS_ONLY';
  totalTimeSeconds: number;
  formattedTotalTime: string;
  splits: HyroxRaceTrialSplit[];
  notes: string;
}

export interface DailyRecoveryData {
  date: string;
  sleepHours: number;
  sleepQualityScore: number; // 1-10
  muscleSorenessScore: number; // 1-10 (10 = completely fresh, 1 = extreme soreness)
  hydrationScore: number; // 1-10
  stressScore: number; // 1-10 (10 = no stress, 1 = extreme stress)
  readinessScore: number; // 0-100 calculated
  notes: string;
}

export interface MesocyclePhase {
  week: number;
  name: string;
  volumeMultiplier: number;
  targetRIR: number;
  targetRPE: number;
  progressionNote: string;
  isDeload: boolean;
}
