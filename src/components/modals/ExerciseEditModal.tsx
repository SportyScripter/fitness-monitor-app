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
  ExercisePlannedSet,
  PROFESSIONAL_MUSCLE_GROUPS,
  normalizeMuscleGroup
} from '../../types/hyrox';
import { EXERCISE_CATALOG, CatalogExerciseItem } from '../../data/exerciseCatalog';

interface ExerciseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseToEdit?: Exercise | null;
  onSaveExercise: (exercise: Exercise) => void;
  onDeleteExercise?: (exerciseId: string) => void;
}

export interface FormPlannedSet {
  setNumber: number;
  reps: string;
  weightKg: string;
  rir: string;
  rpe: string;
}

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
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Klatka piersiowa');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('STRENGTH');
  const [unit, setUnit] = useState<ExerciseUnit>('kg');

  // Rows of Planned Sets with string values for ergonomic cursor & decimal typing
  const [sets, setSets] = useState<FormPlannedSet[]>([
    { setNumber: 1, reps: '8', weightKg: '60', rir: '2', rpe: '8' },
  ]);

  // Bottom Toggles & Settings
  const [restBetweenSetsSec, setRestBetweenSetsSec] = useState<string>('90');
  const [restAfterExerciseSec, setRestAfterExerciseSec] = useState<string>('120');
  const [enableRunningMetrics, setEnableRunningMetrics] = useState<boolean>(false);
  const [targetDistance, setTargetDistance] = useState<string>('');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm'>('m');
  const [targetPace, setTargetPace] = useState<string>('');
  const [targetHR, setTargetHR] = useState<string>('');
  const [tempo, setTempo] = useState<string>('');
  const [techniqueNotes, setTechniqueNotes] = useState<string>('');

  // Catalog Picker Helpers
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  // Initialize or reset state when modal opens or exerciseToEdit changes
  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setMuscleGroup(normalizeMuscleGroup(exerciseToEdit.muscleGroup));
      setExerciseType(exerciseToEdit.exerciseType || 'STRENGTH');
      setUnit(exerciseToEdit.unit || 'kg');

      // Populate sets from plannedSetsDetails or fallback to plannedSets
      if (exerciseToEdit.plannedSetsDetails && exerciseToEdit.plannedSetsDetails.length > 0) {
        setSets(
          exerciseToEdit.plannedSetsDetails.map((s, idx) => ({
            setNumber: idx + 1,
            reps: String(s.reps ?? '8'),
            weightKg: String(s.weightKg ?? '0'),
            rir: String(s.rir ?? '2'),
            rpe: String(s.rpe ?? '8'),
          }))
        );
      } else {
        const count = exerciseToEdit.plannedSets || 1;
        const defaultReps = parseInt(String(exerciseToEdit.targetRepsRange).split('-')[0]) || 8;
        const initialSets: FormPlannedSet[] = Array.from({ length: count }, (_, i) => ({
          setNumber: i + 1,
          reps: String(defaultReps),
          weightKg: String(exerciseToEdit.defaultWeightKg || 0),
          rir: String(exerciseToEdit.targetRIR ?? 2),
          rpe: String(exerciseToEdit.targetRPE || 8),
        }));
        setSets(initialSets);
      }

      setRestBetweenSetsSec(String(exerciseToEdit.restBetweenSetsSec || exerciseToEdit.restSeconds || 90));
      setRestAfterExerciseSec(String(exerciseToEdit.restAfterExerciseSec || 120));
      const hasRunning = !!(
        exerciseToEdit.targetDistance ||
        exerciseToEdit.targetPace ||
        exerciseToEdit.targetHR ||
        exerciseToEdit.exerciseType === 'RUNNING' ||
        exerciseToEdit.exerciseType === 'INTERVAL_CARDIO'
      );
      setEnableRunningMetrics(hasRunning);
      setTargetDistance(exerciseToEdit.targetDistance ? String(exerciseToEdit.targetDistance) : '');
      setDistanceUnit(exerciseToEdit.distanceUnit || 'm');
      setTargetPace(exerciseToEdit.targetPace || '');
      setTargetHR(exerciseToEdit.targetHR ? String(exerciseToEdit.targetHR) : '');
      setTempo(exerciseToEdit.tempo || '');
      setTechniqueNotes(exerciseToEdit.techniqueNotes || '');
    } else {
      setName('');
      setMuscleGroup('Klatka piersiowa');
      setExerciseType('STRENGTH');
      setUnit('kg');
      // Default to 1 set on clean creation
      setSets([{ setNumber: 1, reps: '8', weightKg: '60', rir: '2', rpe: '8' }]);
      setRestBetweenSetsSec('90');
      setRestAfterExerciseSec('120');
      setEnableRunningMetrics(false);
      setTargetDistance('');
      setDistanceUnit('m');
      setTargetPace('');
      setTargetHR('');
      setTempo('');
      setTechniqueNotes('');
    }
  }, [exerciseToEdit, isOpen]);

  if (!isOpen) return null;

  // Catalog items filtered by search
  const filteredCatalog = EXERCISE_CATALOG.filter((item) => {
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.muscleGroup.toLowerCase().includes(q) ||
      (item.hyroxRelevance && item.hyroxRelevance.toLowerCase().includes(q))
    );
  });

  // Pick an exercise from catalog
  const handleSelectCatalogItem = (catItem: CatalogExerciseItem) => {
    setName(catItem.name);
    setMuscleGroup(normalizeMuscleGroup(catItem.muscleGroup));
    setTempo(catItem.techniqueNotes.includes('tempo') ? '3-0-1-0' : '');

    const initialReps = parseInt(String(catItem.defaultReps).split('-')[0]) || 8;
    const newSets: FormPlannedSet[] = [
      {
        setNumber: 1,
        reps: String(initialReps),
        weightKg: String(catItem.defaultWeight || 0),
        rir: String(catItem.defaultRIR ?? 2),
        rpe: String(catItem.defaultRPE || 8),
      },
    ];
    setSets(newSets);
    setRestBetweenSetsSec(String(catItem.restSeconds || 90));
    setTechniqueNotes(catItem.techniqueNotes || '');
    setShowCatalog(false);
  };

  // Add Set button handler: copies previous row values automatically
  const handleAddSet = () => {
    setSets((prev) => {
      const last = prev[prev.length - 1];
      const newSet: FormPlannedSet = {
        setNumber: prev.length + 1,
        reps: last ? last.reps : '8',
        weightKg: last ? last.weightKg : '50',
        rir: last ? last.rir : '2',
        rpe: last ? last.rpe : '8',
      };
      return [...prev, newSet];
    });
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length <= 1) return;
    const updated = sets
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setSets(updated);
  };

  const handleUpdateSet = (index: number, field: keyof FormPlannedSet, val: string) => {
    const normalized = val.replace(',', '.');
    if (normalized === '' || /^[0-9]*\.?[0-9]*$/.test(normalized)) {
      setSets((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: normalized };
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const plannedSetsDetails: ExercisePlannedSet[] = sets.map((s, idx) => {
      const parsedReps = parseInt(s.reps, 10);
      const parsedWeight = parseFloat(s.weightKg);
      const parsedRir = parseFloat(s.rir);
      const parsedRpe = parseFloat(s.rpe);

      return {
        setNumber: idx + 1,
        reps: isNaN(parsedReps) ? (s.reps.trim() || 8) : parsedReps,
        weightKg: !isNaN(parsedWeight) ? parsedWeight : 0,
        rir: !isNaN(parsedRir) ? parsedRir : 2,
        rpe: !isNaN(parsedRpe) ? parsedRpe : 8,
      };
    });

    // Derive summary metrics from sets
    const plannedSetsCount = sets.length;
    const firstSet = plannedSetsDetails[0] || { reps: 8, weightKg: 0, rir: 2, rpe: 8 };
    const defaultWeightKg = firstSet.weightKg;
    const targetRIR = firstSet.rir;
    const targetRPE = firstSet.rpe;

    // Rep range representation
    const repsList = plannedSetsDetails.map((s) => s.reps);
    const minReps = Math.min(...repsList.map((r) => (typeof r === 'number' ? r : parseInt(String(r), 10) || 8)));
    const maxReps = Math.max(...repsList.map((r) => (typeof r === 'number' ? r : parseInt(String(r), 10) || 8)));
    const targetRepsRange = minReps === maxReps ? `${minReps}` : `${minReps}-${maxReps}`;

    const restSec = parseInt(restBetweenSetsSec, 10) || 90;
    const restAfterSec = parseInt(restAfterExerciseSec, 10) || 120;
    const parsedDist = targetDistance ? parseFloat(targetDistance.replace(',', '.')) : undefined;
    const parsedHR = targetHR ? parseInt(targetHR, 10) : undefined;

    const savedExercise: Exercise = {
      id: exerciseToEdit ? exerciseToEdit.id : `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      muscleGroup: normalizeMuscleGroup(muscleGroup),
      exerciseType,
      unit,
      plannedSets: plannedSetsCount,
      targetRepsRange,
      defaultWeightKg,
      targetRIR,
      targetRPE,
      restSeconds: restSec,
      restBetweenSetsSec: restSec,
      restAfterExerciseSec: restAfterSec,
      tempo: tempo.trim() || undefined,
      techniqueNotes: techniqueNotes.trim(),
      hyroxRelevance: exerciseToEdit?.hyroxRelevance || 'Dostosowane ćwiczenie w planie.',
      plannedSetsDetails,
      ...(enableRunningMetrics && {
        targetDistance: !isNaN(Number(parsedDist)) ? parsedDist : undefined,
        distanceUnit,
        targetPace: targetPace.trim() || undefined,
        targetHR: !isNaN(Number(parsedHR)) ? parsedHR : undefined,
      }),
    };

    onSaveExercise(savedExercise);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center items-center p-2.5 sm:p-4 pb-28 sm:pb-4 overscroll-contain">
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
                Konfiguracja serii, ciężaru, RIR, RPE i partii mięśniowej
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

        {/* Scrollable Form Body with pb-28 to clear mobile bottom navigation bar */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 pb-28 space-y-5 text-xs overscroll-contain">
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
                {showCatalog ? 'Ukryj bazę' : 'Rozwiń katalog (+50 ćwiczeń)'}
              </button>
            </div>

            {showCatalog && (
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2 animate-in fade-in">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtruj np. Przysiad, Wyciskanie, Lunges, SkiErg..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-8 pr-3 py-2 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {filteredCatalog.slice(0, 15).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCatalogItem(item)}
                      className="w-full text-left p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/80 hover:border-amber-400/50 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs group-hover:text-amber-400 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {item.muscleGroup} • {item.defaultSets} serie x {item.defaultReps} • {item.defaultWeight}kg
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-amber-400/10 text-amber-400 text-[10px] font-black shrink-0">
                        Wybierz
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nazwa i Partia Mięśniowa (Profesjonalne nazewnictwo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-neutral-300 block">
                Nazwa Ćwiczenia:
              </label>
              <input
                type="text"
                required
                placeholder="np. Wyciskanie sztangi leżąc"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-neutral-300 block">
                Partia Mięśniowa:
              </label>
              <select
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {PROFESSIONAL_MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>
                    {mg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STRUKTURA DODAWANIA SERII (Ergonomiczne pola decimal, edycja liczb bez kasowania wszystkiego) */}
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
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={set.reps}
                      onChange={(e) => handleUpdateSet(idx, 'reps', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Weight input */}
                  <div className="col-span-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={set.weightKg}
                      onChange={(e) => handleUpdateSet(idx, 'weightKg', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* RIR input */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={set.rir}
                      onChange={(e) => handleUpdateSet(idx, 'rir', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-1.5 py-1.5 text-center font-bold text-white text-xs font-mono-numbers focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* RPE input */}
                  <div className="col-span-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={set.rpe}
                      onChange={(e) => handleUpdateSet(idx, 'rpe', e.target.value)}
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

            {/* "+ Dodaj serię" Button */}
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

          {/* Typ ćwiczenia, jednostka i przerwy */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">
                  Typ ćwiczenia:
                </label>
                <select
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-xs"
                >
                  <option value="STRENGTH">Siłowe (FBW)</option>
                  <option value="RUNNING">Biegowe</option>
                  <option value="HYROX_STATION">Stacja Hyrox</option>
                  <option value="INTERVAL_CARDIO">Interwał / Cardio</option>
                  <option value="MOBILITY">Mobility</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">
                  Jednostka ciężaru:
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ExerciseUnit)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-xs"
                >
                  <option value="kg">kg (kilogramy)</option>
                  <option value="lb">lb (funty)</option>
                  <option value="m">m (metry)</option>
                  <option value="km">km (kilometry)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">
                  Przerwa między seriami:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={restBetweenSetsSec}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^[0-9]*$/.test(val)) setRestBetweenSetsSec(val);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-xs font-mono-numbers"
                  />
                  <span className="text-[10px] text-neutral-400 font-bold">s</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">
                  Przerwa po ćwiczeniu:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={restAfterExerciseSec}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^[0-9]*$/.test(val)) setRestAfterExerciseSec(val);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white text-xs font-mono-numbers"
                  />
                  <span className="text-[10px] text-neutral-400 font-bold">s</span>
                </div>
              </div>
            </div>

            {/* Tempo i Wskazówki */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">
                  Tempo (np. 3-0-1-0 lub 2s pauza):
                </label>
                <input
                  type="text"
                  placeholder="np. 3-1-1-0"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono-numbers"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-0.5">
                  Wskazówka techniczna:
                </label>
                <input
                  type="text"
                  placeholder="np. Retrakcja łopatek, pełny wyprost w biodrze..."
                  value={techniqueNotes}
                  onChange={(e) => setTechniqueNotes(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                />
              </div>
            </div>

            {/* Parametry Biegowe / Cardio Toggle */}
            <div className="pt-2 border-t border-neutral-800/80">
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
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={targetDistance}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) setTargetDistance(val);
                        }}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs font-mono-numbers"
                        placeholder="np. 800"
                      />
                      <select
                        value={distanceUnit}
                        onChange={(e) => setDistanceUnit(e.target.value as 'km' | 'm')}
                        className="bg-neutral-950 border border-neutral-700 rounded-lg px-1.5 py-1 text-white text-xs cursor-pointer"
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
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={targetHR}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^[0-9]*$/.test(val)) setTargetHR(val);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-white text-xs font-mono-numbers"
                      placeholder="np. 165"
                    />
                  </div>
                </div>
              )}
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
