import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Dumbbell,
  Clock,
  RotateCcw,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Info,
  GripVertical,
  Check
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  WorkoutDay,
  Exercise,
  TrainingCycleCatalog,
  MesocyclePhase,
  WorkoutLogEntry
} from '../../types/hyrox';
import { DaySettingsModal } from '../modals/DaySettingsModal';
import { ExerciseEditModal } from '../modals/ExerciseEditModal';
import { CopyWorkoutModal } from '../modals/CopyWorkoutModal';
import { ExerciseChartModal } from '../modals/ExerciseChartModal';

interface CycleEditViewProps {
  activeCycle: TrainingCycleCatalog;
  currentWeek: number;
  weeksList: MesocyclePhase[];
  currentWeekDays: WorkoutDay[];
  selectedDayId: string;
  onSelectDayId: (dayId: string) => void;
  onWeekChange: (week: number) => void;
  onOpenAddWeekModal: () => void;
  onDeleteWeek: (week: number) => void;
  onUpdateDay: (updatedDay: WorkoutDay) => void;
  onAddDay: (dayData?: Partial<WorkoutDay>) => void;
  onDeleteDay: (dayId: string) => void;
  onResetPlanToDefault: () => void;
  onCopyDayToWeek: (
    sourceDay: WorkoutDay,
    targetWeek: number,
    targetDayNumber: number,
    progressionDeltaKg: number
  ) => void;
  onCopyEntireWeekTo?: (
    sourceWeek: number,
    targetWeek: number,
    progressionDeltaKg: number
  ) => void;
  onUpdatePhase?: (updatedPhase: MesocyclePhase) => void;
  workoutLogs?: WorkoutLogEntry[];
}

interface SortableExerciseCardProps {
  exercise: Exercise;
  index: number;
  totalCount: number;
  onEdit: () => void;
  onChart: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const SortableExerciseCard: React.FC<SortableExerciseCardProps> = ({
  exercise,
  index,
  totalCount,
  onEdit,
  onChart,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.75 : 1,
  };

  const baseWeight = typeof exercise.defaultWeightKg === 'number' ? exercise.defaultWeightKg : 0;
  const displayWeight =
    baseWeight > 0
      ? baseWeight % 1 === 0
        ? String(baseWeight)
        : baseWeight.toFixed(1)
      : 'Ciało';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3.5 rounded-2xl bg-neutral-950/90 border transition-all space-y-2.5 ${
        isDragging
          ? 'border-amber-400 shadow-xl shadow-amber-400/20 ring-2 ring-amber-400/40 bg-neutral-900 scale-[1.01]'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Dedicated Touch Drag Handle + Exercise Details */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* GripVertical Handle with Touch/Mouse Listeners */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-2 -ml-1 text-neutral-400 hover:text-amber-400 active:text-amber-300 touch-none cursor-grab active:cursor-grabbing rounded-lg hover:bg-neutral-900 transition-colors shrink-0"
            title="Przeciągnij, aby zmienić kolejność ćwiczenia"
            aria-label="Uchwyt zmiany kolejności ćwiczenia"
          >
            <GripVertical className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                #{index + 1} • {exercise.muscleGroup?.split('(')[0]?.trim()}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-900 text-neutral-400">
                {exercise.unit || 'kg'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white truncate">
              {exercise.name}
            </h3>
          </div>
        </div>

        {/* Card action buttons with fallback Up/Down chevron buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Fallback Move Up Button */}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs cursor-pointer touch-manipulation disabled:opacity-25 disabled:cursor-not-allowed"
            title="Przesuń ćwiczenie w górę"
            aria-label="Przesuń w górę"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Fallback Move Down Button */}
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalCount - 1}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs cursor-pointer touch-manipulation disabled:opacity-25 disabled:cursor-not-allowed"
            title="Przesuń ćwiczenie w dół"
            aria-label="Przesuń w dół"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Edit Exercise Modal Trigger */}
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 text-xs cursor-pointer touch-manipulation"
            title="Edytuj ćwiczenie i serie"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Progress Chart Modal Trigger */}
          <button
            type="button"
            onClick={onChart}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 text-xs cursor-pointer touch-manipulation"
            title="Wykres progresu"
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>

          {/* Delete Exercise Button */}
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 border border-neutral-800 text-xs cursor-pointer touch-manipulation"
            title="Usuń ćwiczenie"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Numeric parameters grid */}
      <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-center text-xs">
        <div>
          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Serie</span>
          <span className="font-bold text-white font-mono-numbers">{exercise.plannedSets}</span>
        </div>
        <div>
          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Powt / Dyst</span>
          <span className="font-bold text-white font-mono-numbers">{exercise.targetRepsRange}</span>
        </div>
        <div>
          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Ciężar</span>
          <span className="font-bold text-amber-400 font-mono-numbers">
            {exercise.defaultWeightKg > 0 ? `${displayWeight} ${exercise.unit || 'kg'}` : 'Ciało'}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Przerwa</span>
          <span className="font-bold text-neutral-300 font-mono-numbers">{exercise.restSeconds}s</span>
        </div>
      </div>

      {exercise.techniqueNotes && (
        <p className="text-[11px] text-neutral-400 line-clamp-2 italic">
          {exercise.techniqueNotes}
        </p>
      )}
    </div>
  );
};

export const CycleEditView: React.FC<CycleEditViewProps> = ({
  activeCycle,
  currentWeek,
  weeksList,
  currentWeekDays,
  selectedDayId,
  onSelectDayId,
  onWeekChange,
  onOpenAddWeekModal,
  onDeleteWeek,
  onUpdateDay,
  onAddDay,
  onDeleteDay,
  onResetPlanToDefault,
  onCopyDayToWeek,
  onCopyEntireWeekTo,
  onUpdatePhase,
  workoutLogs = [],
}) => {
  // Local modals
  const [isDaySettingsOpen, setIsDaySettingsOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseBeingEdited, setExerciseBeingEdited] = useState<Exercise | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [chartExerciseName, setChartExerciseName] = useState<string | null>(null);
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);

  const selectedDay =
    currentWeekDays.find((d) => d && d.id === selectedDayId) || currentWeekDays[0] || null;

  const currentPhase = weeksList.find((w) => w.week === currentWeek) || {
    week: currentWeek,
    name: `Tydzień ${currentWeek}: Plan Indywidualny`,
    volumeMultiplier: 1.0,
    targetRIR: 2,
    targetRPE: 8.0,
    progressionNote: 'Dostosuj obciążenie, tempo i ćwiczenia pod swoje cele.',
    isDeload: false,
  };

  // Week editing state with decimal string support and validation
  const [isEditingWeekParams, setIsEditingWeekParams] = useState(false);
  const [editPhaseName, setEditPhaseName] = useState(currentPhase.name);
  const [editMultiplier, setEditMultiplier] = useState(String(currentPhase.volumeMultiplier || 1.0));
  const [editRpe, setEditRpe] = useState(String(currentPhase.targetRPE || 8.0));
  const [editRir, setEditRir] = useState(String(currentPhase.targetRIR ?? 2));
  const [editProgressionNote, setEditProgressionNote] = useState(currentPhase.progressionNote || '');

  useEffect(() => {
    setEditPhaseName(currentPhase.name);
    setEditMultiplier(String(currentPhase.volumeMultiplier || 1.0));
    setEditRpe(String(currentPhase.targetRPE || 8.0));
    setEditRir(String(currentPhase.targetRIR ?? 2));
    setEditProgressionNote(currentPhase.progressionNote || '');
    setIsEditingWeekParams(false);
  }, [currentWeek, currentPhase.name, currentPhase.volumeMultiplier, currentPhase.targetRPE, currentPhase.targetRIR, currentPhase.progressionNote]);

  const numMultiplier = parseFloat(editMultiplier.replace(',', '.'));
  const isMultiplierValid = currentPhase.isDeload || (!isNaN(numMultiplier) && numMultiplier >= 1.0 && numMultiplier <= 1.5);

  const handleSaveWeekParams = () => {
    if (!isMultiplierValid || !onUpdatePhase) return;
    const parsedVol = parseFloat(editMultiplier.replace(',', '.'));
    const parsedRpe = parseFloat(editRpe.replace(',', '.'));
    const parsedRir = parseFloat(editRir.replace(',', '.'));

    onUpdatePhase({
      ...currentPhase,
      name: editPhaseName.trim() || `Tydzień ${currentWeek}`,
      volumeMultiplier: currentPhase.isDeload ? 0.6 : (!isNaN(parsedVol) ? parsedVol : 1.0),
      targetRPE: !isNaN(parsedRpe) ? parsedRpe : 8.0,
      targetRIR: !isNaN(parsedRir) ? parsedRir : 2,
      progressionNote: editProgressionNote.trim(),
    });
    setIsEditingWeekParams(false);
  };

  // DND-Kit Sensors for touch and mouse
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedDay || !selectedDay.exercises) return;

    const oldIndex = selectedDay.exercises.findIndex((e) => e.id === active.id);
    const newIndex = selectedDay.exercises.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(selectedDay.exercises, oldIndex, newIndex);
      onUpdateDay({
        ...selectedDay,
        exercises: reordered,
      });
    }
  };

  const handleMoveExercise = (fromIndex: number, direction: 'up' | 'down') => {
    if (!selectedDay || !selectedDay.exercises) return;
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= selectedDay.exercises.length) return;
    const reordered = arrayMove(selectedDay.exercises, fromIndex, toIndex);
    onUpdateDay({
      ...selectedDay,
      exercises: reordered,
    });
  };

  const handleDeleteExercise = (exId: string) => {
    if (!selectedDay) return;
    const updatedExercises = selectedDay.exercises.filter((ex) => ex.id !== exId);
    onUpdateDay({
      ...selectedDay,
      exercises: updatedExercises,
    });
  };

  const handleSaveExercise = (savedExercise: Exercise) => {
    if (!selectedDay) return;
    const exists = selectedDay.exercises.some((e) => e.id === savedExercise.id);
    let updatedExercises: Exercise[];
    if (exists) {
      updatedExercises = selectedDay.exercises.map((e) =>
        e.id === savedExercise.id ? savedExercise : e
      );
    } else {
      updatedExercises = [...(selectedDay.exercises || []), savedExercise];
    }
    onUpdateDay({
      ...selectedDay,
      exercises: updatedExercises,
    });
  };

  const exercisesList = selectedDay?.exercises || [];

  return (
    <div className="space-y-4 pb-28 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* View Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-white font-heading uppercase tracking-wide">
                Edycja Cyklu
              </h1>
              <p className="text-xs text-neutral-400 truncate max-w-[200px] sm:max-w-xs">
                {activeCycle.name} ({activeCycle.goal})
              </p>
            </div>
          </div>

          <button
            onClick={onResetPlanToDefault}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-amber-400 border border-neutral-700 transition-colors cursor-pointer"
            title="Wczytaj domyślny plan bazowy dla tego tygodnia"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Week Selector Bar */}
        <div className="mt-4 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
              Wybierz Tydzień ({weeksList.length}):
            </span>
            <button
              onClick={onOpenAddWeekModal}
              className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj Tydzień</span>
            </button>
          </div>

          {/* Horizontal scroll of week pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {weeksList.map((w) => {
              const isCurrent = w.week === currentWeek;
              return (
                <button
                  key={w.week}
                  onClick={() => onWeekChange(w.week)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[42px] ${
                    isCurrent
                      ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20 ring-2 ring-amber-300'
                      : 'bg-neutral-950 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  <span>Tydzień {w.week}</span>
                  {w.isDeload && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-black ${
                        isCurrent ? 'bg-black text-amber-400' : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      Deload
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Week Parameters Accordion */}
        <div className="mt-3 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3">
          <button
            onClick={() => setIsParamsExpanded(!isParamsExpanded)}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-neutral-300 cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-amber-400 font-extrabold font-heading">
                Tydzień {currentWeek}:
              </span>
              <span className="truncate">{currentPhase.name.replace(/^Tydzień\s*\d+:\s*/i, '')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
              <span className="text-[11px] font-mono-numbers">
                RPE {currentPhase.targetRPE || 8} • RIR {currentPhase.targetRIR ?? 2}
              </span>
              {isParamsExpanded ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </div>
          </button>

          {isParamsExpanded && (
            <div className="mt-3 pt-3 border-t border-neutral-800/80 text-xs space-y-3">
              {!isEditingWeekParams ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{currentPhase.name}</span>
                    <button
                      onClick={() => setIsEditingWeekParams(true)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edytuj parametry</span>
                    </button>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-[11px]">
                    {currentPhase.progressionNote || 'Brak dodatkowych notatek dla tego tygodnia.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Mnożnik:</span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-amber-300 font-mono-numbers text-[11px]">
                      {currentPhase.volumeMultiplier || 1.0}x
                    </span>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 ml-2">Cel RPE:</span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono-numbers text-[11px]">
                      {currentPhase.targetRPE || 8.0}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 ml-2">RIR:</span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono-numbers text-[11px]">
                      {currentPhase.targetRIR ?? 2}
                    </span>

                    {weeksList.length > 1 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Czy na pewno chcesz usunąć Tydzień ${currentWeek}?`)) {
                            onDeleteWeek(currentWeek);
                          }
                        }}
                        className="ml-auto text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Usuń ten tydzień</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3 bg-neutral-900/90 p-3.5 rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">
                      Edycja parametrów Tygodnia {currentWeek}
                    </span>
                    <button
                      onClick={() => setIsEditingWeekParams(false)}
                      className="text-neutral-400 hover:text-white text-xs"
                    >
                      Anuluj
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                      Nazwa fazy / tygodnia:
                    </label>
                    <input
                      type="text"
                      value={editPhaseName}
                      onChange={(e) => setEditPhaseName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
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
                        value={editMultiplier}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setEditMultiplier(val);
                          }
                        }}
                        placeholder="np. 1.05"
                        className={`w-full bg-neutral-950 border rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none font-mono-numbers ${
                          !isMultiplierValid
                            ? 'border-red-500 text-red-300 focus:border-red-500'
                            : 'border-neutral-700 focus:border-amber-400'
                        }`}
                      />
                      {!isMultiplierValid && (
                        <p className="text-[10px] text-red-400 font-semibold mt-1">
                          Mnożnik musi mieścić się w zakresie 1.0 - 1.5
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                        Docelowe RPE:
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={editRpe}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setEditRpe(val);
                          }
                        }}
                        placeholder="np. 8.0"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
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
                        value={editRir}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setEditRir(val);
                          }
                        }}
                        placeholder="np. 2"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-400 font-mono-numbers"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                      Wskazówka / notatka progresji:
                    </label>
                    <input
                      type="text"
                      value={editProgressionNote}
                      onChange={(e) => setEditProgressionNote(e.target.value)}
                      placeholder="np. Zwiększ obciążenie w ćwiczeniach głównych o 2.5kg..."
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingWeekParams(false)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700 cursor-pointer"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      disabled={!isMultiplierValid}
                      onClick={handleSaveWeekParams}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Days in Current Week Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase text-neutral-400 font-heading tracking-wider">
            Dni w Tygodniu {currentWeek} ({currentWeekDays.length})
          </span>
          <button
            onClick={() => onAddDay()}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Dodaj Dzień</span>
          </button>
        </div>

        {/* Horizontal Day Chips with touch-friendly size */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {currentWeekDays.map((day) => {
            const isSelected = selectedDay && selectedDay.id === day.id;
            return (
              <button
                key={day.id}
                onClick={() => onSelectDayId(day.id)}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation min-w-[120px] ${
                  isSelected
                    ? 'bg-neutral-900 border-amber-400 shadow-md ring-1 ring-amber-400'
                    : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    Dzień {day.dayNumber}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                      day.type === 'FBW'
                        ? 'bg-amber-400 text-black'
                        : day.type === 'RUNNING_HIIT'
                        ? 'bg-red-500/20 text-red-400'
                        : day.type === 'WEEKEND_HYROX'
                        ? 'bg-purple-500/20 text-purple-300'
                        : day.type === 'REST_RECOVERY'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {day.type.split('_')[0]}
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[110px]">
                  {day.dayNamePolish}
                </div>
                <div className="text-[10px] text-neutral-400 truncate max-w-[110px]">
                  {day.exercises?.length || 0} ćwiczeń
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Management & Exercises */}
      {selectedDay ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          {/* Day Header & Actions */}
          <div className="pb-3 border-b border-neutral-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                  Dzień {selectedDay.dayNumber} • {selectedDay.type}
                </span>
                <h2 className="text-lg font-black text-white font-heading mt-0.5">
                  {selectedDay.dayNamePolish}: {selectedDay.title}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                  {selectedDay.subtitle}
                </p>
              </div>
            </div>

            {/* Quick action buttons for selected day */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsDaySettingsOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all cursor-pointer shadow-sm touch-manipulation min-h-[44px]"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Dostosuj Dzień</span>
              </button>

              <button
                onClick={() => setIsCopyModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[44px]"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Kopiuj Dzień</span>
              </button>
            </div>
          </div>

          {/* Exercises Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-300">
                Zaplanowane ćwiczenia ({exercisesList.length})
              </span>
              <span className="text-[10px] text-neutral-500 hidden sm:inline">
                (Przeciągnij uchwyt lub użyj strzałek)
              </span>
            </div>

            <button
              onClick={() => {
                setExerciseBeingEdited(null);
                setIsExerciseModalOpen(true);
              }}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Dodaj ćwiczenie</span>
            </button>
          </div>

          {/* Vertical Exercise Cards with DND-Kit Sortable and Fallback Arrow Buttons */}
          {exercisesList.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-950/60 rounded-2xl border border-neutral-800 space-y-3">
              <Dumbbell className="w-8 h-8 mx-auto text-neutral-600" />
              <p>Brak ćwiczeń w tym dniu.</p>
              <button
                onClick={() => {
                  setExerciseBeingEdited(null);
                  setIsExerciseModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" /> Wybierz z Bazy Ćwiczeń
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={exercisesList.map((ex) => ex.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {exercisesList.map((exercise, index) => (
                    <SortableExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                      totalCount={exercisesList.length}
                      onEdit={() => {
                        setExerciseBeingEdited(exercise);
                        setIsExerciseModalOpen(true);
                      }}
                      onChart={() => setChartExerciseName(exercise.name)}
                      onDelete={() => handleDeleteExercise(exercise.id)}
                      onMoveUp={() => handleMoveExercise(index, 'up')}
                      onMoveDown={() => handleMoveExercise(index, 'down')}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Delete day button */}
          {currentWeekDays.length > 1 && (
            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  if (window.confirm(`Czy na pewno chcesz usunąć Dzień ${selectedDay.dayNumber} (${selectedDay.dayNamePolish})?`)) {
                    onDeleteDay(selectedDay.id);
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-bold inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usuń ten dzień treningowy</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Day Settings Modal */}
      {selectedDay && isDaySettingsOpen && (
        <DaySettingsModal
          day={selectedDay}
          isOpen={isDaySettingsOpen}
          onClose={() => setIsDaySettingsOpen(false)}
          onSaveDaySettings={(updatedDay) => {
            onUpdateDay(updatedDay);
            setIsDaySettingsOpen(false);
          }}
        />
      )}

      {/* Exercise Edit / Add Modal */}
      {selectedDay && isExerciseModalOpen && (
        <ExerciseEditModal
          isOpen={isExerciseModalOpen}
          onClose={() => {
            setIsExerciseModalOpen(false);
            setExerciseBeingEdited(null);
          }}
          exerciseToEdit={exerciseBeingEdited}
          onSaveExercise={(savedExercise) => {
            handleSaveExercise(savedExercise);
            setIsExerciseModalOpen(false);
            setExerciseBeingEdited(null);
          }}
          onDeleteExercise={handleDeleteExercise}
        />
      )}

      {/* Copy Day Modal */}
      {selectedDay && isCopyModalOpen && (
        <CopyWorkoutModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          sourceDay={selectedDay}
          currentWeek={currentWeek}
          totalWeeksCount={weeksList.length}
          onCopyDayToWeek={onCopyDayToWeek}
          onCopyEntireWeekTo={onCopyEntireWeekTo}
        />
      )}

      {/* Exercise Chart Modal */}
      {chartExerciseName && (
        <ExerciseChartModal
          isOpen={!!chartExerciseName}
          onClose={() => setChartExerciseName(null)}
          exerciseName={chartExerciseName}
          workoutLogs={workoutLogs}
          category={selectedDay?.exercises?.find((e) => e.name.trim().toLowerCase() === chartExerciseName.trim().toLowerCase())?.category}
          exercise={selectedDay?.exercises?.find((e) => e.name.trim().toLowerCase() === chartExerciseName.trim().toLowerCase())}
        />
      )}
    </div>
  );
};
