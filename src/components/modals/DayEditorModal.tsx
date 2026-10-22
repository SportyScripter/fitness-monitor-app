import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Dumbbell,
  Clock,
  Target,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
  HelpCircle,
  Activity,
  HeartPulse,
  Flame,
  Zap
} from 'lucide-react';
import { WorkoutDay, Exercise, MuscleGroup, DayType, ExerciseType, ExerciseUnit } from '../../types/hyrox';
import { EXERCISE_CATALOG, CatalogExerciseItem } from '../../data/exerciseCatalog';

interface DayEditorModalProps {
  day: WorkoutDay;
  isOpen: boolean;
  onClose: () => void;
  onSaveDay: (updatedDay: WorkoutDay) => void;
  onResetDayToDefault?: () => void;
}

export const DayEditorModal: React.FC<DayEditorModalProps> = ({
  day,
  isOpen,
  onClose,
  onSaveDay,
  onResetDayToDefault,
}) => {
  const [dayType, setDayType] = useState<DayType>(day.type);
  const [dayNamePolish, setDayNamePolish] = useState(day.dayNamePolish || `Dzień ${day.dayNumber}`);
  const [title, setTitle] = useState(day.title);
  const [subtitle, setSubtitle] = useState(day.subtitle);
  const [durationMinutes, setDurationMinutes] = useState(day.durationMinutes);
  const [targetRpeRange, setTargetRpeRange] = useState(day.targetRpeRange);
  const [targetRirRange, setTargetRirRange] = useState(day.targetRirRange);
  const [exercises, setExercises] = useState<Exercise[]>(day.exercises);

  // Exercise Adder / Picker mode
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogMuscleFilter, setCatalogMuscleFilter] = useState<string>('ALL');

  // Custom exercise manual creation state
  const [customExerciseType, setCustomExerciseType] = useState<ExerciseType>('STRENGTH');
  const [customUnit, setCustomUnit] = useState<ExerciseUnit>('kg');
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Czworogłowe uda');
  const [customSets, setCustomSets] = useState(4);
  const [customReps, setCustomReps] = useState('8-10');
  const [customWeight, setCustomWeight] = useState(60);
  const [enableCardioMetrics, setEnableCardioMetrics] = useState(false);
  const [customDistance, setCustomDistance] = useState<number | ''>('');
  const [customDistanceUnit, setCustomDistanceUnit] = useState<'km' | 'm'>('m');
  const [customTargetPace, setCustomTargetPace] = useState('');
  const [customTargetHR, setCustomTargetHR] = useState<number | ''>('');
  const [customRPE, setCustomRPE] = useState(8);
  const [customRIR, setCustomRIR] = useState(2);
  const [customRest, setCustomRest] = useState(90);
  const [customRestAfterExercise, setCustomRestAfterExercise] = useState(120);
  const [customRelevance, setCustomRelevance] = useState('');

  // Editing existing exercise inline
  const [editingExId, setEditingExId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRemoveExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const newEx = [...exercises];
    const temp = newEx[index];
    newEx[index] = newEx[targetIndex];
    newEx[targetIndex] = temp;
    setExercises(newEx);
  };

  const handleAddFromCatalog = (catItem: CatalogExerciseItem) => {
    const newExercise: Exercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: catItem.name,
      muscleGroup: catItem.muscleGroup,
      secondaryMuscleGroup: catItem.secondaryMuscleGroup,
      plannedSets: catItem.defaultSets,
      targetRepsRange: catItem.defaultReps,
      defaultWeightKg: catItem.defaultWeight,
      targetRIR: catItem.defaultRIR,
      targetRPE: catItem.defaultRPE,
      restSeconds: catItem.restSeconds,
      hyroxRelevance: catItem.hyroxRelevance,
      techniqueNotes: catItem.techniqueNotes,
    };
    setExercises((prev) => [...prev, newExercise]);
    setIsAddingExercise(false);
  };

  const applyStationPreset = (presetKey: string) => {
    if (presetKey === 'RUN_1KM') {
      setCustomName('1 km Bieg (Hyrox Run)');
      setCustomExerciseType('RUNNING');
      setCustomUnit('km');
      setEnableCardioMetrics(true);
      setCustomDistance(1);
      setCustomDistanceUnit('km');
      setCustomTargetPace('4:45 min/km');
      setCustomTargetHR(165);
      setCustomSets(1);
      setCustomReps('1 km');
      setCustomWeight(0);
      setCustomRest(60);
      setCustomRestAfterExercise(90);
      setCustomMuscle('Czworogłowe uda');
      setCustomRelevance('Bieg 1km pomiędzy stacjami Hyrox.');
    } else if (presetKey === 'RUN_800M') {
      setCustomName('800 m Bieg Tempowy');
      setCustomExerciseType('RUNNING');
      setCustomUnit('m');
      setEnableCardioMetrics(true);
      setCustomDistance(800);
      setCustomDistanceUnit('m');
      setCustomTargetPace('4:15 min/km');
      setCustomTargetHR(170);
      setCustomSets(3);
      setCustomReps('800 m');
      setCustomWeight(0);
      setCustomRest(90);
      setCustomRestAfterExercise(120);
      setCustomMuscle('Czworogłowe uda');
      setCustomRelevance('Interwał biegowy pod VO2max i próg mleczanowy.');
    } else if (presetKey === 'SKIERG') {
      setCustomName('1000 m SkiErg');
      setCustomExerciseType('HYROX_STATION');
      setCustomUnit('m');
      setEnableCardioMetrics(true);
      setCustomDistance(1000);
      setCustomDistanceUnit('m');
      setCustomTargetPace('2:00 / 500m');
      setCustomTargetHR(160);
      setCustomSets(1);
      setCustomReps('1000 m');
      setCustomWeight(0);
      setCustomRest(60);
      setCustomRestAfterExercise(90);
      setCustomMuscle('Plecy');
      setCustomRelevance('Stacja 1 Hyrox: silnik górnych partii ciała i tętno.');
    } else if (presetKey === 'SLED_PUSH') {
      setCustomName('50 m Sled Push (Sanie)');
      setCustomExerciseType('HYROX_STATION');
      setCustomUnit('kg');
      setEnableCardioMetrics(false);
      setCustomDistance('');
      setCustomTargetPace('');
      setCustomTargetHR('');
      setCustomWeight(152);
      setCustomSets(1);
      setCustomReps('50 m');
      setCustomRest(90);
      setCustomRestAfterExercise(120);
      setCustomMuscle('Czworogłowe uda');
      setCustomRelevance('Stacja 2 Hyrox: maksymalna praca nóg.');
    } else if (presetKey === 'BURPEE_BROAD') {
      setCustomName('80 m Burpee Broad Jumps');
      setCustomExerciseType('HYROX_STATION');
      setCustomUnit('m');
      setEnableCardioMetrics(false);
      setCustomDistance('');
      setCustomTargetPace('');
      setCustomTargetHR('');
      setCustomWeight(0);
      setCustomSets(1);
      setCustomReps('80 m');
      setCustomRest(90);
      setCustomRestAfterExercise(120);
      setCustomMuscle('Czworogłowe uda');
      setCustomRelevance('Stacja 4 Hyrox: skoki i padnij-powstań.');
    } else if (presetKey === 'ROWING') {
      setCustomName('1000 m Wioślarz (Rowing)');
      setCustomExerciseType('HYROX_STATION');
      setCustomUnit('m');
      setEnableCardioMetrics(true);
      setCustomDistance(1000);
      setCustomDistanceUnit('m');
      setCustomTargetPace('2:02 / 500m');
      setCustomTargetHR('');
      setCustomSets(1);
      setCustomReps('1000 m');
      setCustomWeight(0);
      setCustomRest(60);
      setCustomRestAfterExercise(90);
      setCustomMuscle('Plecy');
      setCustomRelevance('Stacja 5 Hyrox: tlen i plecy.');
    } else if (presetKey === 'FARMERS') {
      setCustomName('200 m Farmers Carry (2x24kg)');
      setCustomExerciseType('HYROX_STATION');
      setCustomUnit('kg');
      setEnableCardioMetrics(false);
      setCustomDistance('');
      setCustomTargetPace('');
      setCustomTargetHR('');
      setCustomWeight(48);
      setCustomSets(1);
      setCustomReps('200 m');
      setCustomRest(90);
      setCustomRestAfterExercise(120);
      setCustomMuscle('Barki');
      setCustomRelevance('Stacja 6 Hyrox: potężna próba chwytu.');
    } else if (presetKey === 'WALL_BALLS') {
      setCustomName('100x Wall Balls (9kg)');
      setCustomExerciseType('HYROX_STATION');
      setCustomUnit('kg');
      setEnableCardioMetrics(false);
      setCustomDistance('');
      setCustomTargetPace('');
      setCustomTargetHR('');
      setCustomWeight(9);
      setCustomSets(1);
      setCustomReps('100');
      setCustomRest(90);
      setCustomRestAfterExercise(120);
      setCustomMuscle('Czworogłowe uda');
      setCustomRelevance('Stacja 8 Hyrox: finałowe rzuty piłką do celu.');
    } else if (presetKey === 'STRENGTH_DEFAULT') {
      setCustomName('Przysiad ze sztangą (Back Squat)');
      setCustomExerciseType('STRENGTH');
      setCustomUnit('kg');
      setEnableCardioMetrics(false);
      setCustomDistance('');
      setCustomTargetPace('');
      setCustomTargetHR('');
      setCustomWeight(80);
      setCustomSets(4);
      setCustomReps('6-8');
      setCustomRest(120);
      setCustomRestAfterExercise(180);
      setCustomMuscle('Czworogłowe uda');
      setCustomRelevance('Bazowe ćwiczenie budujące siłę i moc.');
    }
  };

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const hasValidPace = enableCardioMetrics && customTargetPace.trim() !== '' && customTargetPace.trim() !== '0';
    const hasValidHR = enableCardioMetrics && Number(customTargetHR) > 0;
    const hasValidDistance = enableCardioMetrics && Number(customDistance) > 0;

    const newExercise: Exercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: customName.trim(),
      muscleGroup: customMuscle,
      plannedSets: Number(customSets) || 3,
      targetRepsRange: customReps || '8-10',
      defaultWeightKg: Number(customWeight) || 0,
      targetRIR: Number(customRIR) || 2,
      targetRPE: Number(customRPE) || 8,
      restSeconds: Number(customRest) || 90,
      restBetweenSetsSec: Number(customRest) || 90,
      restAfterExerciseSec: Number(customRestAfterExercise) || 120,
      exerciseType: customExerciseType,
      unit: customUnit,
      targetDistance: hasValidDistance ? Number(customDistance) : undefined,
      distanceUnit: hasValidDistance ? customDistanceUnit : undefined,
      targetPace: hasValidPace ? customTargetPace.trim() : undefined,
      targetHR: hasValidHR ? Number(customTargetHR) : undefined,
      hyroxRelevance: customRelevance.trim() || 'Dostosowane ćwiczenie / stacja w Twoim planie.',
      techniqueNotes: 'Zachowaj nienaganną technikę, stałe tempo i kontrolę ruchu.',
    };

    setExercises((prev) => [...prev, newExercise]);
    // reset form
    setCustomName('');
    setCustomRelevance('');
    setEnableCardioMetrics(false);
    setCustomTargetPace('');
    setCustomTargetHR('');
    setCustomDistance('');
    setIsAddingExercise(false);
  };

  const handleUpdateExerciseField = (id: string, field: keyof Exercise, value: any) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  };

  const handleSaveAll = () => {
    const updated: WorkoutDay = {
      ...day,
      dayNamePolish: dayNamePolish.trim() || day.dayNamePolish,
      type: dayType,
      title: title.trim() || day.title,
      subtitle: subtitle.trim() || day.subtitle,
      durationMinutes: Number(durationMinutes) || 60,
      targetRpeRange: targetRpeRange.trim() || '8.0',
      targetRirRange: targetRirRange.trim() || '2',
      exercises,
    };
    onSaveDay(updated);
    onClose();
  };

  // Filtered catalog
  const filteredCatalog = EXERCISE_CATALOG.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.hyroxRelevance.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesMuscle =
      catalogMuscleFilter === 'ALL' || item.muscleGroup === catalogMuscleFilter;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-[95dvh] max-h-[95dvh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
                  {dayNamePolish} (Dzień {day.dayNumber})
                </span>
                <span className="text-xs text-neutral-400">Edytor i Planowanie Dnia</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white font-heading mt-0.5">
                Konfiguracja Treningu & Ćwiczeń
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body with pb-28 to clear mobile bottom navigation bar */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-28 space-y-6 overscroll-contain touch-pan-y">
          {/* Day Settings Bar */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Parametry i Nazewnictwo Dnia Treningowego
            </h3>

            {/* Flexible Naming Choice Section */}
            <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-[10px] uppercase font-bold text-amber-300 block">
                  Etykieta Dnia (Dzień Tygodnia / Trening 1 / Plan A / Własna):
                </label>
                <span className="text-[10px] text-neutral-400">
                  Wybierz szybki szablon lub wpisz dowolną nazwę:
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={dayNamePolish}
                  onChange={(e) => setDayNamePolish(e.target.value)}
                  placeholder="np. Poniedziałek, Trening 1, Plan A, Góra Ciała..."
                  className="w-full sm:w-1/2 bg-neutral-950 border border-amber-400/50 rounded-lg px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-amber-400"
                />

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1 sm:w-1/2">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 w-full mb-0.5">
                    Szybkie szablony:
                  </span>
                  {['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayNamePolish(d)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                        dayNamePolish === d
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                  {['Trening 1', 'Trening 2', 'Trening 3', 'Trening 4', 'Trening 5'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDayNamePolish(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                        dayNamePolish === t
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {['Plan A', 'Plan B', 'Plan C', 'Plan D'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDayNamePolish(p)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                        dayNamePolish === p
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {['Góra Ciała', 'Dół Ciała', 'Push', 'Pull', 'Legs'].map((split) => (
                    <button
                      key={split}
                      type="button"
                      onClick={() => setDayNamePolish(split)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                        dayNamePolish === split
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {split}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Typ Dnia:
                </label>
                <select
                  value={dayType}
                  onChange={(e) => setDayType(e.target.value as DayType)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="FBW">FBW (Siła / Hipertrofia)</option>
                  <option value="RUNNING_HIIT">Bieg HIIT (Wysoka Intensywność)</option>
                  <option value="WEEKEND_HYROX">Weekend Hyrox / Symulator</option>
                  <option value="REST_RECOVERY">Regeneracja & Odnowa</option>
                  <option value="CUSTOM">Własny Trening / Custom</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Nazwa Treningu (Tytuł):
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Podtytuł / Skupienie:
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Szacowany Czas (minuty):
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono-numbers text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Cel RPE:
                  </label>
                  <input
                    type="text"
                    value={targetRpeRange}
                    onChange={(e) => setTargetRpeRange(e.target.value)}
                    placeholder="7.5 - 8.5"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono-numbers text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Cel RIR:
                  </label>
                  <input
                    type="text"
                    value={targetRirRange}
                    onChange={(e) => setTargetRirRange(e.target.value)}
                    placeholder="2 - 3"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono-numbers text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Exercises Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Ćwiczenia w Tym Dniu ({exercises.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  Możesz swobodnie modyfikować serie, powtórzenia, ciężar oraz kolejność ćwiczeń
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingExercise(!isAddingExercise)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj Ćwiczenie do Dnia</span>
              </button>
            </div>

            {/* Modal / Card to Add Exercise (From catalog or custom) */}
            {isAddingExercise && (
              <div className="p-5 rounded-2xl bg-neutral-950 border border-amber-400/50 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Wybierz z Bazy Ćwiczeń Hyrox lub Utwórz Własne
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingExercise(false)}
                    className="p-1 rounded text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search & Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Szukaj (np. Sled, Przysiad, Wall Balls)..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <select
                    value={catalogMuscleFilter}
                    onChange={(e) => setCatalogMuscleFilter(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="ALL">Wszystkie partie mięśniowe</option>
                    <option value="Czworogłowe (Quads)">Czworogłowe (Quads)</option>
                    <option value="Kulszowo-Goleniowe & Pośladki (Hamstrings/Glutes)">Kulszowo-Goleniowe & Pośladki</option>
                    <option value="Grzbiet & Plecy (Back/Lats)">Grzbiet & Plecy</option>
                    <option value="Klatka Piersiowa (Chest)">Klatka Piersiowa</option>
                    <option value="Barki & Ramiona (Shoulders/Arms)">Barki & Ramiona</option>
                    <option value="Brzuch & Core">Brzuch & Core</option>
                    <option value="Przedramiona & Chwyt (Grip)">Przedramiona & Chwyt</option>
                    <option value="Silnik Biegowy & Wydolność (Cardio/Engine)">Silnik Hyrox & Cardio</option>
                  </select>
                </div>

                {/* Catalog List */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {filteredCatalog.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-neutral-400">
                          {item.muscleGroup} • {item.defaultSets} serie x {item.defaultReps} • {item.defaultWeight > 0 ? `${item.defaultWeight}kg` : 'Ciało'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddFromCatalog(item)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-400 hover:text-black font-bold text-neutral-300 transition-colors shrink-0 cursor-pointer"
                      >
                        + Dodaj
                      </button>
                    </div>
                  ))}
                </div>

                {/* Manual Exercise Creation */}
                <div className="pt-4 border-t border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                        Stwórz własne ćwiczenie lub stację hybrydową:
                      </h5>
                      <p className="text-[11px] text-neutral-400">
                        Wybierz jednostki (kg, lb, km, m), docelowe tempo i tętno HR oraz przerwy.
                      </p>
                    </div>

                    {/* Quick Station Presets Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold shrink-0">
                        Szybkie szablony:
                      </span>
                      <button
                        type="button"
                        onClick={() => applyStationPreset('RUN_1KM')}
                        className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-300 font-bold border border-amber-400/20 cursor-pointer"
                      >
                        1km Bieg
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStationPreset('RUN_800M')}
                        className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-300 font-bold border border-amber-400/20 cursor-pointer"
                      >
                        800m Bieg
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStationPreset('SKIERG')}
                        className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-300 font-bold border border-amber-400/20 cursor-pointer"
                      >
                        SkiErg
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStationPreset('SLED_PUSH')}
                        className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-300 font-bold border border-amber-400/20 cursor-pointer"
                      >
                        Sanie
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStationPreset('ROWING')}
                        className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-300 font-bold border border-amber-400/20 cursor-pointer"
                      >
                        Wioślarz
                      </button>
                      <button
                        type="button"
                        onClick={() => applyStationPreset('WALL_BALLS')}
                        className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-amber-300 font-bold border border-amber-400/20 cursor-pointer"
                      >
                        Wall Balls
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleCreateCustomExercise} className="space-y-3 text-xs bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
                    {/* Top Row: Type, Unit, Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                          Typ Ćwiczenia:
                        </label>
                        <select
                          value={customExerciseType}
                          onChange={(e) => {
                            const val = e.target.value as ExerciseType;
                            setCustomExerciseType(val);
                            if (val === 'RUNNING') {
                              setCustomUnit('km');
                              setCustomMuscle('Czworogłowe uda');
                            } else if (val === 'STRENGTH') {
                              setCustomUnit('kg');
                            }
                          }}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold cursor-pointer"
                        >
                          <option value="STRENGTH">🏋️ Siłowe</option>
                          <option value="RUNNING">🏃 Biegowe</option>
                          <option value="HYROX_STATION">⚡ Stacja Hyrox</option>
                          <option value="INTERVAL_CARDIO">🔥 Kardio / Interwał</option>
                          <option value="MOBILITY">🧘 Mobilność</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                          Główna Jednostka:
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['kg', 'lb', 'km', 'm'] as ExerciseUnit[]).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setCustomUnit(u)}
                              className={`py-1 rounded text-center font-bold text-xs cursor-pointer transition-colors ${
                                customUnit === u
                                  ? 'bg-amber-400 text-black font-black'
                                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                          Nazwa Ćwiczenia / Stacji:
                        </label>
                        <input
                          type="text"
                          placeholder="np. 1km Bieg tempowy / Wyciskanie leżąc"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-400 font-bold"
                          required
                        />
                      </div>
                    </div>

                    {/* Middle Row: Muscle Group, Relevance */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                          Partia Mięśniowa:
                        </label>
                        <select
                          value={customMuscle}
                          onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-200 cursor-pointer"
                        >
                          <option value="Czworogłowe (Quads)">Czworogłowe (Quads)</option>
                          <option value="Kulszowo-Goleniowe & Pośladki (Hamstrings/Glutes)">Kulszowo-Goleniowe & Pośladki</option>
                          <option value="Grzbiet & Plecy (Back/Lats)">Grzbiet & Plecy</option>
                          <option value="Klatka Piersiowa (Chest)">Klatka Piersiowa</option>
                          <option value="Barki & Ramiona (Shoulders/Arms)">Barki & Ramiona</option>
                          <option value="Brzuch & Core">Brzuch & Core</option>
                          <option value="Przedramiona & Chwyt (Grip)">Przedramiona & Chwyt</option>
                          <option value="Silnik Biegowy & Wydolność (Cardio/Engine)">Silnik Hyrox & Cardio</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                          Cel / Notatka Treningowa:
                        </label>
                        <input
                          type="text"
                          placeholder="np. Utrzymuj równe tempo, nie spal się przed saniami"
                          value={customRelevance}
                          onChange={(e) => setCustomRelevance(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-400 text-xs"
                        />
                      </div>
                    </div>

                    {/* Numerical Parameters Grid: Basic Strength / Sets / Reps / Weight */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-neutral-900">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Serie / Rundy:</label>
                        <input
                          type="number"
                          value={customSets}
                          onChange={(e) => setCustomSets(parseInt(e.target.value) || 1)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Powtórzenia / Zakres:</label>
                        <input
                          type="text"
                          value={customReps}
                          onChange={(e) => setCustomReps(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers"
                          placeholder="np. 8-10 lub 15"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">
                          Ciężar ({customUnit}):
                        </label>
                        <input
                          type="number"
                          value={customWeight}
                          onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 0)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">RPE / RIR:</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={customRPE}
                            onChange={(e) => setCustomRPE(parseFloat(e.target.value) || 8)}
                            className="w-1/2 bg-neutral-900 border border-neutral-700 rounded px-1 py-1 text-white font-mono-numbers text-xs"
                            placeholder="RPE"
                          />
                          <input
                            type="number"
                            value={customRIR}
                            onChange={(e) => setCustomRIR(parseInt(e.target.value) || 2)}
                            className="w-1/2 bg-neutral-900 border border-neutral-700 rounded px-1 py-1 text-white font-mono-numbers text-xs"
                            placeholder="RIR"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Optional Cardio / Running / Conditioning Parameters Section */}
                    <div className="pt-2 border-t border-neutral-900 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-300 font-semibold p-2 rounded-lg bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={enableCardioMetrics}
                          onChange={(e) => {
                            setEnableCardioMetrics(e.target.checked);
                            if (!e.target.checked) {
                              setCustomTargetPace('');
                              setCustomTargetHR('');
                              setCustomDistance('');
                            }
                          }}
                          className="w-4 h-4 rounded text-amber-400 focus:ring-0 bg-neutral-950 border-neutral-700 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                          <span>Włącz parametry biegowe / kondycyjne (Dystans, Tempo, Tętno HR)</span>
                        </span>
                        <span className="text-[10px] text-neutral-500 font-normal ml-auto">
                          {enableCardioMetrics ? 'Włączone (widoczne)' : 'Wyłączone dla ćwiczeń siłowych'}
                        </span>
                      </label>

                      {enableCardioMetrics && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-neutral-900/50 border border-amber-400/20 animate-in fade-in">
                          <div>
                            <label className="text-[10px] text-amber-300 block mb-0.5 font-bold">
                              Dystans ({customDistanceUnit}):
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={customDistance}
                                onChange={(e) => setCustomDistance(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                placeholder="np. 1 lub 800"
                                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers text-xs"
                              />
                              <select
                                value={customDistanceUnit}
                                onChange={(e) => setCustomDistanceUnit(e.target.value as 'km' | 'm')}
                                className="bg-neutral-950 border border-neutral-700 rounded px-1.5 py-1 text-white text-xs cursor-pointer font-bold"
                              >
                                <option value="km">km</option>
                                <option value="m">m</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-emerald-400 block mb-0.5 font-bold">
                              Tempo Docelowe:
                            </label>
                            <input
                              type="text"
                              value={customTargetPace}
                              onChange={(e) => setCustomTargetPace(e.target.value)}
                              placeholder="np. 4:30 min/km lub 2:05/500m"
                              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-rose-400 block mb-0.5 font-bold">
                              Docelowe Tętno HR (bpm):
                            </label>
                            <input
                              type="number"
                              value={customTargetHR}
                              onChange={(e) => setCustomTargetHR(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                              placeholder="np. 165"
                              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rest Timing Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1">
                          <label className="text-[10px] text-neutral-400 block">
                            Przerwa między seriami:
                          </label>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input
                              type="number"
                              step="5"
                              value={customRest}
                              onChange={(e) => setCustomRest(parseInt(e.target.value) || 90)}
                              className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers font-bold text-xs"
                            />
                            <span className="text-xs text-neutral-400">sekund ({Math.floor(customRest / 60)}m {customRest % 60}s)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <label className="text-[10px] text-neutral-400 block">
                            Przerwa po tym ćwiczeniu (przed kolejnym):
                          </label>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input
                              type="number"
                              step="5"
                              value={customRestAfterExercise}
                              onChange={(e) => setCustomRestAfterExercise(parseInt(e.target.value) || 120)}
                              className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers font-bold text-xs"
                            />
                            <span className="text-xs text-neutral-400">sekund ({Math.floor(customRestAfterExercise / 60)}m {customRestAfterExercise % 60}s)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right pt-2 border-t border-neutral-900">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-400 text-black font-black uppercase text-[11px] cursor-pointer hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/10"
                      >
                        + Zapisz & Wstaw do Dnia
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* List of current exercises */}
            {exercises.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-950/60 rounded-2xl border border-neutral-800">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p>Ten dzień nie zawiera jeszcze żadnych ćwiczeń.</p>
                <p className="text-neutral-400 mt-1">
                  Kliknij &quot;Dodaj Ćwiczenie do Dnia&quot; powyżej, aby zaplanować swój trening!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((ex, idx) => {
                  const isEditing = editingExId === ex.id;
                  const exUnit = ex.unit || 'kg';
                  const isEndurance = ex.exerciseType === 'RUNNING' || ex.exerciseType === 'HYROX_STATION' || ex.exerciseType === 'INTERVAL_CARDIO';

                  return (
                    <div
                      key={ex.id}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 hover:border-neutral-700 transition-all text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800/60">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-sm font-heading">{ex.name}</span>
                          
                          {/* Discipline tag */}
                          {ex.exerciseType && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                              {ex.exerciseType === 'RUNNING'
                                ? 'Bieg'
                                : ex.exerciseType === 'HYROX_STATION'
                                ? 'Stacja Hyrox'
                                : ex.exerciseType === 'INTERVAL_CARDIO'
                                ? 'Kardio'
                                : 'Siła'}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-400">
                            {ex.muscleGroup.split('(')[0]}
                          </span>

                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-numbers font-bold bg-neutral-800 text-neutral-300">
                            {exUnit}
                          </span>
                        </div>

                        {/* Order & Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleMoveExercise(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Przesuń w górę"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveExercise(idx, 'down')}
                            disabled={idx === exercises.length - 1}
                            className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Przesuń w dół"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingExId(isEditing ? null : ex.id)}
                            className={`p-1 rounded cursor-pointer ${isEditing ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-400 hover:text-amber-400'}`}
                            title="Edytuj parametry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            className="p-1 rounded text-neutral-400 hover:text-red-400 cursor-pointer"
                            title="Usuń ćwiczenie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Form vs Static Info */}
                      {isEditing ? (
                        <div className="space-y-3 mt-3 p-3.5 rounded-lg bg-neutral-900 border border-neutral-700">
                          {/* Row 1: Type, Unit, Sets, Reps/Dist, Weight */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Typ:</label>
                              <select
                                value={ex.exerciseType || 'STRENGTH'}
                                onChange={(e) =>
                                  handleUpdateExerciseField(ex.id, 'exerciseType', e.target.value as ExerciseType)
                                }
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              >
                                <option value="STRENGTH">Siłowe</option>
                                <option value="RUNNING">Biegowe</option>
                                <option value="HYROX_STATION">Stacja Hyrox</option>
                                <option value="INTERVAL_CARDIO">Kardio</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Jednostka:</label>
                              <select
                                value={ex.unit || 'kg'}
                                onChange={(e) =>
                                  handleUpdateExerciseField(ex.id, 'unit', e.target.value as ExerciseUnit)
                                }
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              >
                                <option value="kg">kg</option>
                                <option value="lb">lb</option>
                                <option value="km">km</option>
                                <option value="m">m</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Serie / Rundy:</label>
                              <input
                                type="number"
                                value={ex.plannedSets}
                                onChange={(e) =>
                                  handleUpdateExerciseField(ex.id, 'plannedSets', parseInt(e.target.value) || 1)
                                }
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Powt / Dystans:</label>
                              <input
                                type="text"
                                value={ex.targetRepsRange}
                                onChange={(e) =>
                                  handleUpdateExerciseField(ex.id, 'targetRepsRange', e.target.value)
                                }
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Ciężar ({exUnit}):</label>
                              <input
                                type="number"
                                step="1"
                                value={ex.defaultWeightKg}
                                onChange={(e) =>
                                  handleUpdateExerciseField(ex.id, 'defaultWeightKg', parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </div>
                          </div>

                          {/* Row 2: Pace, HR, RPE, RIR */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800">
                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Tempo Docelowe:</label>
                              <input
                                type="text"
                                value={ex.targetPace || ''}
                                placeholder="Opcjonalne (np. 4:30 min/km)"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateExerciseField(
                                    ex.id,
                                    'targetPace',
                                    val.trim() && val.trim() !== '0' ? val : undefined
                                  );
                                }}
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Tętno HR (bpm):</label>
                              <input
                                type="number"
                                value={ex.targetHR || ''}
                                placeholder="Opcjonalne (np. 165)"
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  handleUpdateExerciseField(ex.id, 'targetHR', val > 0 ? val : undefined);
                                }}
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">RPE / RIR:</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  value={ex.targetRPE}
                                  onChange={(e) =>
                                    handleUpdateExerciseField(ex.id, 'targetRPE', parseFloat(e.target.value) || 8)
                                  }
                                  className="w-1/2 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-1.5 py-1 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                                />
                                <input
                                  type="number"
                                  value={ex.targetRIR}
                                  onChange={(e) =>
                                    handleUpdateExerciseField(ex.id, 'targetRIR', parseInt(e.target.value) || 2)
                                  }
                                  className="w-1/2 bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-1.5 py-1 font-mono-numbers focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">Tempo Ruchu:</label>
                              <input
                                type="text"
                                value={ex.tempo || ''}
                                placeholder="np. 3-0-1-0"
                                onChange={(e) =>
                                  handleUpdateExerciseField(ex.id, 'tempo', e.target.value)
                                }
                                className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400"
                              />
                            </div>
                          </div>

                          {/* Row 3: Rest Configuration */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">
                                Przerwa między seriami / stacjami (s):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={ex.restSeconds || 90}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 90;
                                    handleUpdateExerciseField(ex.id, 'restSeconds', val);
                                    handleUpdateExerciseField(ex.id, 'restBetweenSetsSec', val);
                                  }}
                                  className="w-24 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers font-bold"
                                />
                                <span className="text-neutral-400 text-xs">
                                  ({Math.floor((ex.restSeconds || 90) / 60)}m {(ex.restSeconds || 90) % 60}s)
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-neutral-400 block mb-0.5">
                                Przerwa po całym ćwiczeniu (s):
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={ex.restAfterExerciseSec || 120}
                                  onChange={(e) =>
                                    handleUpdateExerciseField(ex.id, 'restAfterExerciseSec', parseInt(e.target.value) || 120)
                                  }
                                  className="w-24 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white font-mono-numbers font-bold"
                                />
                                <span className="text-neutral-400 text-xs">
                                  ({Math.floor((ex.restAfterExerciseSec || 120) / 60)}m {(ex.restAfterExerciseSec || 120) % 60}s)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between text-neutral-400 text-[11px] pt-2 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>
                              Plan: <strong className="text-white">{ex.plannedSets}s x {ex.targetRepsRange}</strong> @{ex.targetRPE} (RIR {ex.targetRIR})
                            </span>
                            {ex.defaultWeightKg > 0 && (
                              <span>
                                Obciążenie: <strong className="text-amber-400">{ex.defaultWeightKg} {exUnit}</strong>
                              </span>
                            )}
                            {ex.targetPace && ex.targetPace.trim() !== '' && ex.targetPace.trim() !== '0' && (
                              <span>
                                Tempo: <strong className="text-emerald-400">{ex.targetPace}</strong>
                              </span>
                            )}
                            {ex.targetHR && Number(ex.targetHR) > 0 && (
                              <span>
                                HR: <strong className="text-rose-400">{ex.targetHR} bpm</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono-numbers text-[11px]">
                            <span className="text-amber-400">
                              Przerwa s.: <strong>{ex.restSeconds || 90}s</strong>
                            </span>
                            {ex.restAfterExerciseSec && (
                              <span className="text-emerald-400">
                                Po ćw.: <strong>{ex.restAfterExerciseSec}s</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons inside scrollable body */}
          <div className="mt-8 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {onResetDayToDefault ? (
              <button
                type="button"
                onClick={onResetDayToDefault}
                className="text-xs text-neutral-400 hover:text-amber-400 underline cursor-pointer"
              >
                Przywróć domyślny plan dla tego dnia
              </button>
            ) : <span />}

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Anuluj
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
              >
                Zapisz Zmiany w Planie
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
