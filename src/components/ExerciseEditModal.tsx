import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Search,
  Dumbbell,
  Clock,
  Sparkles,
  Flame,
  Activity,
  HeartPulse
} from 'lucide-react';
import {
  Exercise,
  MuscleGroup,
  ExerciseType,
  ExerciseUnit,
  ExercisePlannedSet
} from '../types/hyrox';
import { EXERCISE_CATALOG, CatalogExerciseItem } from '../data/exerciseCatalog';

interface ExerciseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseToEdit?: Exercise | null;
  onSaveExercise: (exercise: Exercise) => void;
  onDeleteExercise?: (exerciseId: string) => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Czworogłowe (Quads)',
  'Kulszowo-Goleniowe & Pośladki (Hamstrings/Glutes)',
  'Klatka Piersiowa (Chest)',
  'Grzbiet & Plecy (Back/Lats)',
  'Barki & Ramiona (Shoulders/Arms)',
  'Brzuch & Core',
  'Przedramiona & Chwyt (Grip)',
  'Silnik Biegowy & Wydolność (Cardio/Engine)',
];

export const ExerciseEditModal: React.FC<ExerciseEditModalProps> = ({
  isOpen,
  onClose,
  exerciseToEdit,
  onSaveExercise,
  onDeleteExercise,
}) => {
  const isEditing = !!exerciseToEdit;

  // Basic Info
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Klatka Piersiowa (Chest)');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('STRENGTH');
  const [unit, setUnit] = useState<ExerciseUnit>('kg');

  // Rows of Planned Sets (Columns: Seria #, Powtórzenia, Ciężar, RIR, RPE)
  const [sets, setSets] = useState<ExercisePlannedSet[]>([
    { setNumber: 1, reps: 8, weightKg: 60, rir: 2, rpe: 8 },
    { setNumber: 2, reps: 8, weightKg: 60, rir: 2, rpe: 8 },
    { setNumber: 3, reps: 8, weightKg: 60, rir: 2, rpe: 8 },
  ]);

  // Bottom Toggles & Settings
  const [restBetweenSetsSec, setRestBetweenSetsSec] = useState<number>(90);
  const [restAfterExerciseSec, setRestAfterExerciseSec] = useState<number>(120);
  const [enableRunningMetrics, setEnableRunningMetrics] = useState<boolean>(false);
  const [targetDistance, setTargetDistance] = useState<number | ''>('');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm'>('m');
  const [targetPace, setTargetPace] = useState<string>('');
  const [targetHR, setTargetHR] = useState<number | ''>('');
  const [tempo, setTempo] = useState<string>('');
  const [techniqueNotes, setTechniqueNotes] = useState<string>('');

  // Catalog Picker Helpers
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  // Initialize or reset state when modal opens or exerciseToEdit changes
  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setMuscleGroup(exerciseToEdit.muscleGroup);
      setExerciseType(exerciseToEdit.exerciseType || 'STRENGTH');
      setUnit(exerciseToEdit.unit || 'kg');

      // Populate sets from plannedSetsDetails or fallback to plannedSets
      if (exerciseToEdit.plannedSetsDetails && exerciseToEdit.plannedSetsDetails.length > 0) {
        setSets(exerciseToEdit.plannedSetsDetails.map((s, idx) => ({ ...s, setNumber: idx + 1 })));
      } else {
        const count = exerciseToEdit.plannedSets || 3;
        const defaultReps = parseInt(String(exerciseToEdit.targetRepsRange).split('-')[0]) || 8;
        const initialSets: ExercisePlannedSet[] = Array.from({ length: count }, (_, i) => ({
          setNumber: i + 1,
          reps: defaultReps,
          weightKg: exerciseToEdit.defaultWeightKg || 0,
          rir: exerciseToEdit.targetRIR ?? 2,
          rpe: exerciseToEdit.targetRPE || 8,
        }));
        setSets(initialSets);
      }

      setRestBetweenSetsSec(exerciseToEdit.restBetweenSetsSec || exerciseToEdit.restSeconds || 90);
      setRestAfterExerciseSec(exerciseToEdit.restAfterExerciseSec || 120);
      const hasRunning = !!(
        exerciseToEdit.targetDistance ||
        exerciseToEdit.targetPace ||
        exerciseToEdit.targetHR ||
        exerciseToEdit.exerciseType === 'RUNNING' ||
        exerciseToEdit.exerciseType === 'INTERVAL_CARDIO'
      );
      setEnableRunningMetrics(hasRunning);
      setTargetDistance(exerciseToEdit.targetDistance || '');
      setDistanceUnit(exerciseToEdit.distanceUnit || 'm');
      setTargetPace(exerciseToEdit.targetPace || '');
      setTargetHR(exerciseToEdit.targetHR || '');
      setTempo(exerciseToEdit.tempo || '');
      setTechniqueNotes(exerciseToEdit.techniqueNotes || '');
      setShowCatalog(false);
    } else {
      // New Exercise Defaults
      setName('');
      setMuscleGroup('Klatka Piersiowa (Chest)');
      setExerciseType('STRENGTH');
      setUnit('kg');
      setSets([
        { setNumber: 1, reps: 8, weightKg: 60, rir: 2, rpe: 8 },
        { setNumber: 2, reps: 8, weightKg: 60, rir: 2, rpe: 8 },
        { setNumber: 3, reps: 8, weightKg: 60, rir: 2, rpe: 8 },
      ]);
      setRestBetweenSetsSec(90);
      setRestAfterExerciseSec(120);
      setEnableRunningMetrics(false);
      setTargetDistance('');
      setDistanceUnit('m');
      setTargetPace('');
      setTargetHR('');
      setTempo('');
      setTechniqueNotes('');
      setShowCatalog(true);
    }
  }, [exerciseToEdit, isOpen]);

  if (!isOpen) return null;

  // Catalog item selected
  const handleSelectCatalogItem = (catItem: CatalogExerciseItem) => {
    setName(catItem.name);
    setMuscleGroup(catItem.muscleGroup);
    const initialReps = parseInt(catItem.defaultReps.split('-')[0]) || 8;
    const newSets: ExercisePlannedSet[] = Array.from({ length: catItem.defaultSets || 3 }, (_, i) => ({
      setNumber: i + 1,
      reps: initialReps,
      weightKg: catItem.defaultWeight || 0,
      rir: catItem.defaultRIR ?? 2,
      rpe: catItem.defaultRPE || 8,
    }));
    setSets(newSets);
    setRestBetweenSetsSec(catItem.restSeconds || 90);
    setTechniqueNotes(catItem.techniqueNotes || '');
    setShowCatalog(false);
  };

  // Add Set button handler: copies previous row values automatically!
  const handleAddSet = () => {
    const last = sets[sets.length - 1];
    const newSet: ExercisePlannedSet = {
      setNumber: sets.length + 1,
      reps: last ? last.reps : 8,
      weightKg: last ? last.weightKg : 50,
      rir: last ? last.rir : 2,
      rpe: last ? last.rpe : 8,
    };
    setSets([...sets, newSet]);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length <= 1) return;
    const updated = sets.filter((_, i) => i !== index).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setSets(updated);
  };

  const handleUpdateSet = (index: number, field: keyof ExercisePlannedSet, val: any) => {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Calculate aggregated defaults for summary views
    const repsArr = sets.map((s) => (typeof s.reps === 'number' ? s.reps : parseInt(String(s.reps)) || 0)).filter((n) => n > 0);
    const minReps = repsArr.length > 0 ? Math.min(...repsArr) : 8;
    const maxReps = repsArr.length > 0 ? Math.max(...repsArr) : 8;
    const targetRepsRange = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;

    const weightsArr = sets.map((s) => Number(s.weightKg) || 0);
    const defaultWeightKg = weightsArr[0] !== undefined ? weightsArr[0] : 0;
    const targetRIR = sets[0]?.rir ?? 2;
    const targetRPE = sets[0]?.rpe ?? 8;

    const savedExercise: Exercise = {
      id: exerciseToEdit?.id || `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      muscleGroup,
      secondaryMuscleGroup: exerciseToEdit?.secondaryMuscleGroup,
      plannedSets: sets.length,
      targetRepsRange,
      defaultWeightKg,
      targetRIR,
      targetRPE,
      restSeconds: restBetweenSetsSec,
      restBetweenSetsSec,
      restAfterExerciseSec,
      tempo: tempo.trim() || undefined,
      hyroxRelevance: exerciseToEdit?.hyroxRelevance || 'Trening uzupełniający',
      techniqueNotes: techniqueNotes.trim(),
      exerciseType: enableRunningMetrics ? (exerciseType === 'STRENGTH' ? 'INTERVAL_CARDIO' : exerciseType) : exerciseType,
      unit,
      targetDistance: enableRunningMetrics && targetDistance !== '' ? Number(targetDistance) : undefined,
      distanceUnit: enableRunningMetrics ? distanceUnit : undefined,
      targetPace: enableRunningMetrics && targetPace.trim() !== '' ? targetPace.trim() : undefined,
      targetHR: enableRunningMetrics && targetHR !== '' ? Number(targetHR) : undefined,
      plannedSetsDetails: sets,
    };

    onSaveExercise(savedExercise);
    onClose();
  };

  const filteredCatalog = EXERCISE_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.muscleGroup.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center items-center p-2.5 sm:p-4 overscroll-contain">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-950/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-md shadow-amber-400/20 shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white font-heading truncate">
                {isEditing ? `Edytuj: ${exerciseToEdit.name}` : 'Dodaj Nowe Ćwiczenie'}
              </h3>
              <p className="text-[11px] text-neutral-400 truncate">
                Konfiguracja serii, ciężaru, RIR, RPE i przerw
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditing && onDeleteExercise && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Czy na pewno usunąć ćwiczenie "${exerciseToEdit.name}"?`)) {
                    onDeleteExercise(exerciseToEdit.id);
                    onClose();
                  }
                }}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-800 transition-colors cursor-pointer"
                title="Usuń ćwiczenie"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs overscroll-contain">
          {/* Quick Catalog Search / Accordion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase font-bold text-neutral-300">
                Wyszukaj z bazy ćwiczeń:
              </label>
              <button
                type="button"
                onClick={() => setShowCatalog(!showCatalog)}
                className="text-[11px] text-amber-400 font-bold hover:underline cursor-pointer"
              >
                {showCatalog ? 'Ukryj bazę' : 'Pokaż bazę ćwiczeń'}
              </button>
            </div>

            {showCatalog && (
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Wyszukaj np. Wyciskanie, Przysiad, Podciąganie..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {filteredCatalog.slice(0, 10).map((catItem, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCatalogItem(catItem)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400 text-left text-xs text-white truncate cursor-pointer transition-all"
                    >
                      <span className="font-bold block truncate">{catItem.name}</span>
                      <span className="text-[10px] text-neutral-400 truncate block">
                        {catItem.muscleGroup.split('(')[0]} • {catItem.defaultSets}s × {catItem.defaultReps}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Exercise Name & Muscle Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] uppercase font-bold text-neutral-300 block">
                Nazwa Ćwiczenia:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Wyciskanie sztangi leżąc na ławce poziomej"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-neutral-300 block">
                Partia Mięśniowa:
              </label>
              <select
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                {MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>
                    {mg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STRUKTURA DODAWANIA SERII (Wiersze: Seria #, Powtórzenia, Ciężar, RIR, RPE) */}
          {/* ========================================================================= */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider font-heading">
                Zaplanowane Serie ({sets.length})
              </span>
              <span className="text-[11px] text-neutral-400">
                Wartości powtórzeń, ciężaru, RIR i RPE dla każdej serii
              </span>
            </div>

            {/* Table of Sets */}
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-1.5 text-[10px] uppercase font-bold text-neutral-400 px-1">
                <div className="col-span-2">Seria</div>
                <div className="col-span-3">Powtórzenia</div>
                <div className="col-span-3">Ciężar ({unit})</div>
                <div className="col-span-2">RIR</div>
                <div className="col-span-1">RPE</div>
                <div className="col-span-1 text-right"></div>
              </div>

              {/* Rows */}
              {sets.map((set, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-xl bg-neutral-900 border border-neutral-800"
                >
                  {/* Set Index */}
                  <div className="col-span-2 font-black text-amber-400 text-xs px-1">
                    #{set.setNumber}
                  </div>

                  {/* Reps input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      value={set.reps}
                      onChange={(e) => handleUpdateSet(idx, 'reps', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Weight input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step="any"
                      min="0"
                      value={set.weightKg}
                      onChange={(e) => handleUpdateSet(idx, 'weightKg', parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* RIR input */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      max="10"
                      value={set.rir}
                      onChange={(e) => handleUpdateSet(idx, 'rir', parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-1.5 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* RPE input */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="10"
                      value={set.rpe}
                      onChange={(e) => handleUpdateSet(idx, 'rpe', parseInt(e.target.value, 10) || 8)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-1 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Delete row */}
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveSet(idx)}
                      disabled={sets.length <= 1}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Usuń serię"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* "+ Dodaj serię" Button (Copies previous row automatically) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleAddSet}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-dashed border-amber-400/40 hover:border-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ Dodaj serię (kopiuj z poprzedniej)</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRZEŁĄCZNIKI: Przerwa między seriami, Przerwa po ćwiczeniu, Biegowe       */}
          {/* ========================================================================= */}
          <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] uppercase font-bold text-neutral-300 block">
              Przerwy i Parametry Uzupełniające:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Przerwa między seriami */}
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Przerwa między seriami:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    step="5"
                    value={restBetweenSetsSec}
                    onChange={(e) => setRestBetweenSetsSec(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-neutral-400 text-xs font-bold">sekund</span>
                </div>
                {/* Presets */}
                <div className="flex gap-1 pt-0.5">
                  {[60, 90, 120, 150].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRestBetweenSetsSec(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        restBetweenSetsSec === s
                          ? 'bg-amber-400 text-black'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Przerwa po ćwiczeniu */}
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Przerwa po ćwiczeniu (przejście):</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    step="10"
                    value={restAfterExerciseSec}
                    onChange={(e) => setRestAfterExerciseSec(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-neutral-400 text-xs font-bold">sekund</span>
                </div>
                {/* Presets */}
                <div className="flex gap-1 pt-0.5">
                  {[120, 180, 240].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRestAfterExerciseSec(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        restAfterExerciseSec === s
                          ? 'bg-amber-400 text-black'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tempo ruchu */}
            <div className="space-y-1 pt-1">
              <label className="text-[10px] text-neutral-400 uppercase font-semibold block">
                Tempo Ruchu (opcjonalne):
              </label>
              <input
                type="text"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="np. 3-0-1-0 lub Ekscentryka 3s, pauza 1s"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Toggle: Włącz parametry biegowe */}
            <div className="pt-2 border-t border-neutral-900">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableRunningMetrics}
                  onChange={(e) => setEnableRunningMetrics(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 bg-neutral-900 border-neutral-700 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-200">
                  Włącz parametry biegowe / cardio (Dystans, Tempo, Docelowe HR)
                </span>
              </label>

              {enableRunningMetrics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">Dystans:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={targetDistance}
                        onChange={(e) => setTargetDistance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs font-mono-numbers"
                        placeholder="np. 800"
                      />
                      <select
                        value={distanceUnit}
                        onChange={(e) => setDistanceUnit(e.target.value as 'km' | 'm')}
                        className="bg-neutral-950 border border-neutral-700 rounded-lg px-1.5 py-1 text-white text-xs"
                      >
                        <option value="m">m</option>
                        <option value="km">km</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">Tempo docelowe:</label>
                    <input
                      type="text"
                      value={targetPace}
                      onChange={(e) => setTargetPace(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs font-mono-numbers"
                      placeholder="np. 4:15 min/km"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">Docelowe HR (bpm):</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={targetHR}
                      onChange={(e) => setTargetHR(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs font-mono-numbers"
                      placeholder="np. 165"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Wskazówki techniczne */}
            <div className="space-y-1 pt-1">
              <label className="text-[10px] text-neutral-400 uppercase font-semibold block">
                Wskazówki techniczne / notatki:
              </label>
              <textarea
                rows={2}
                value={techniqueNotes}
                onChange={(e) => setTechniqueNotes(e.target.value)}
                placeholder="np. Pauza na klatce, stabilne łopatki w retrakcji i depresji..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-white text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Sticky Form Footer */}
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
              <span>{isEditing ? 'Zapisz Zmiany Ćwiczenia' : 'Wstaw Ćwiczenie do Planu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
