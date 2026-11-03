import { Exercise, WorkoutDay, ExercisePlannedSet } from '../types/hyrox';

/**
 * Checks if an exercise is cardio / running where tonnage is not applicable.
 */
export function isCardioExerciseItem(
  item?: { category?: string; exerciseType?: string; muscleGroup?: string; name?: string } | null
): boolean {
  if (!item) return false;
  if (item.category === 'cardio') return true;
  if (item.exerciseType === 'RUNNING' || item.exerciseType === 'INTERVAL_CARDIO') return true;
  const mg = (item.muscleGroup || '').toLowerCase();
  if (mg.includes('cardio') || mg.includes('bieg') || mg.includes('running') || mg.includes('wytrzymałość')) return true;
  const name = (item.name || '').toLowerCase();
  if (
    name.includes('bieganie') ||
    name.includes('easy run') ||
    name.includes('long run') ||
    name.includes('tempo run') ||
    name.includes('intervals') ||
    name.includes('fartlek') ||
    name.includes('hill repeats') ||
    name.includes('recovery run') ||
    name.includes('treadmill') ||
    name.includes('bieżn')
  ) {
    return true;
  }
  return false;
}

/**
 * Calculates the planned tonnage for a single exercise.
 * Iterates through the exercise's specific planned sets (`plannedSetsDetails` or `sets`).
 * For each set, executes `set.weight * set.reps` (or equivalents) and adds it to the sum.
 * If specific sets details are not defined, falls back gracefully to:
 * `fallbackWeight * fallbackReps * plannedSetsCount`.
 *
 * @param exercise The Exercise object
 * @param volumeMultiplier Optional volume / mesocycle multiplier (e.g. 0.9 for deload, defaults to 1.0)
 */
export function calculateExercisePlannedTonnage(
  exercise: Exercise | any,
  volumeMultiplier: number = 1.0
): number {
  if (!exercise || isCardioExerciseItem(exercise)) return 0;

  // Base fallback values from exercise header
  const headerWeight =
    typeof exercise.defaultWeightKg === 'number'
      ? exercise.defaultWeightKg
      : typeof exercise.weightKg === 'number'
      ? exercise.weightKg
      : typeof exercise.weight === 'number'
      ? exercise.weight
      : typeof exercise.targetWeight === 'number'
      ? exercise.targetWeight
      : parseFloat(String(exercise.defaultWeightKg || exercise.weightKg || exercise.weight || 0)) || 0;

  const mult = typeof volumeMultiplier === 'number' && !isNaN(volumeMultiplier) ? volumeMultiplier : 1.0;
  const defaultBaseReps =
    parseInt(String(exercise.targetRepsRange || '8').split('-')[0]) || 8;

  // Check for explicit planned sets array (plannedSetsDetails or sets)
  const setsArray: ExercisePlannedSet[] | any[] =
    Array.isArray(exercise.plannedSetsDetails) && exercise.plannedSetsDetails.length > 0
      ? exercise.plannedSetsDetails
      : Array.isArray(exercise.sets) && exercise.sets.length > 0
      ? exercise.sets
      : [];

  if (setsArray.length > 0) {
    return setsArray.reduce((setSum: number, s: any) => {
      if (!s) return setSum;

      // Extract set-specific weight with fallback to header weight
      const rawWeight =
        typeof s.weightKg === 'number'
          ? s.weightKg
          : typeof s.weight === 'number'
          ? s.weight
          : typeof s.targetWeight === 'number'
          ? s.targetWeight
          : s.weightKg !== undefined && s.weightKg !== null && s.weightKg !== ''
          ? parseFloat(String(s.weightKg))
          : s.weight !== undefined && s.weight !== null && s.weight !== ''
          ? parseFloat(String(s.weight))
          : headerWeight;

      const setWeight = (isNaN(rawWeight) ? headerWeight : rawWeight) * (mult !== 1.0 ? mult : 1.0);

      // Extract set-specific reps with fallback to header reps
      let setReps = defaultBaseReps;
      if (typeof s.reps === 'number' && !isNaN(s.reps)) {
        setReps = s.reps;
      } else if (typeof s.reps === 'string' && s.reps.trim() !== '') {
        const parsed = parseInt(s.reps.split('-')[0].trim());
        if (!isNaN(parsed) && parsed > 0) {
          setReps = parsed;
        }
      }

      return setSum + Math.max(0, setWeight) * Math.max(0, setReps);
    }, 0);
  }

  // Fallback when detailed sets array is absent
  const totalSets = typeof exercise.plannedSets === 'number' && exercise.plannedSets > 0 ? exercise.plannedSets : 3;
  const adjustedWeight = headerWeight * mult;
  return Math.max(0, adjustedWeight) * defaultBaseReps * totalSets;
}

/**
 * Calculates total planned tonnage for an entire workout day by iterating
 * through its exercises and through each exercise's planned sets.
 *
 * @param day The WorkoutDay object containing exercises
 * @param volumeMultiplier Optional volume / mesocycle multiplier
 */
export function calculateDayPlannedTonnage(
  day?: WorkoutDay | null,
  volumeMultiplier: number = 1.0
): number {
  if (!day || !Array.isArray(day.exercises) || day.exercises.length === 0) return 0;
  return day.exercises.reduce((sum, ex) => {
    return sum + calculateExercisePlannedTonnage(ex, volumeMultiplier);
  }, 0);
}
