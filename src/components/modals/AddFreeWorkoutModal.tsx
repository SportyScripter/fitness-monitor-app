import React, { useState } from 'react';
import {
  X,
  Plus,
  Dumbbell,
  Zap,
  Activity,
  Award,
  HeartPulse,
  Sliders,
  Check,
  Clock,
  MapPin,
  Calendar,
  Flame,
  FileText
} from 'lucide-react';
import {
  WorkoutLogEntry,
  SessionActivityType,
  MuscleGroup
} from '../../types/hyrox';

interface AddFreeWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string; // YYYY-MM-DD
  onSaveWorkout: (entries: WorkoutLogEntry[]) => void;
}

export const AddFreeWorkoutModal: React.FC<AddFreeWorkoutModalProps> = ({
  isOpen,
  onClose,
  defaultDate = new Date().toISOString().split('T')[0],
  onSaveWorkout,
}) => {
  const [dateStr, setDateStr] = useState<string>(defaultDate);
  const [timeStr, setTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [activityType, setActivityType] = useState<SessionActivityType>('RUNNING');
  const [sessionTitle, setSessionTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [distanceValue, setDistanceValue] = useState(5.0);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm'>('km');
  const [targetPace, setTargetPace] = useState('4:30 min/km');
  const [targetHR, setTargetHR] = useState(160);
  const [strengthUnit, setStrengthUnit] = useState<'kg' | 'lb'>('kg');
  const [estimatedTonnage, setEstimatedTonnage] = useState(0);
  const [rpe, setRpe] = useState(8);
  const [notes, setNotes] = useState('');

  // Quick strength exercises if logging strength
  const [quickExercises, setQuickExercises] = useState<
    { name: string; muscleGroup: MuscleGroup; sets: number; reps: number; weight: number; unit?: 'kg' | 'lb' }[]
  >([]);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState(10);
  const [newExWeight, setNewExWeight] = useState(50);
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('Czworogłowe uda');

  if (!isOpen) return null;

  const activities: { type: SessionActivityType; label: string; icon: any; color: string; defaultTitle: string }[] = [
    { type: 'RUNNING', label: 'Bieg / Interwały', icon: Zap, color: 'text-red-400 border-red-500/40 bg-red-500/10', defaultTitle: 'Bieg tlenowy / interwały' },
    { type: 'STRENGTH', label: 'Siła / FBW / Maszyny', icon: Dumbbell, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', defaultTitle: 'Dodatkowy trening siłowy' },
    { type: 'CYCLING', label: 'Rower / Cykloergometr', icon: Activity, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', defaultTitle: 'Jazda na rowerze' },
    { type: 'HYROX', label: 'Hyrox / Ergometry', icon: Award, color: 'text-purple-400 border-purple-500/40 bg-purple-500/10', defaultTitle: 'Trening stacyjny Hyrox' },
    { type: 'RECOVERY', label: 'Regeneracja / Mobility', icon: HeartPulse, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10', defaultTitle: 'Rozciąganie i regeneracja' },
    { type: 'FREE_WORKOUT', label: 'Inny wolny trening', icon: Sliders, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10', defaultTitle: 'Wolna jednostka treningowa' },
  ];

  const handleSelectActivity = (act: typeof activities[0]) => {
    setActivityType(act.type);
    if (!sessionTitle || activities.some((a) => a.defaultTitle === sessionTitle)) {
      setSessionTitle(act.defaultTitle);
    }
  };

  const handleAddQuickExercise = () => {
    if (!newExName.trim()) return;
    setQuickExercises((prev) => [
      ...prev,
      {
        name: newExName.trim(),
        muscleGroup: newExMuscle,
        sets: Number(newExSets) || 3,
        reps: Number(newExReps) || 10,
        weight: Number(newExWeight) || 0,
        unit: strengthUnit,
      },
    ]);
    setNewExName('');
  };

  const handleRemoveQuickExercise = (idx: number) => {
    setQuickExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timestamp = `${dateStr}T${timeStr || '12:00'}:00.000Z`;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const finalTitle = sessionTitle.trim() || activities.find((a) => a.type === activityType)?.defaultTitle || 'Wolny trening';

    const entries: WorkoutLogEntry[] = [];
    const effectiveKm = distanceUnit === 'm' ? distanceValue / 1000 : distanceValue;

    if (activityType === 'STRENGTH' && quickExercises.length > 0) {
      quickExercises.forEach((ex, exIdx) => {
        for (let s = 1; s <= ex.sets; s++) {
          entries.push({
            id: `log-${sessionId}-ex${exIdx}-s${s}`,
            timestamp,
            dateStr,
            dayId: `free-strength-${dateStr}`,
            dayTitle: finalTitle,
            exerciseId: `ex-${ex.name.toLowerCase().replace(/\s+/g, '-')}`,
            exerciseName: ex.name,
            muscleGroup: ex.muscleGroup,
            setNumber: s,
            weightKg: ex.weight,
            reps: ex.reps,
            tonnageKg: ex.weight * ex.reps,
            rpe,
            rir: Math.max(0, 10 - rpe),
            notes: notes.trim(),
            sessionNotes: notes.trim(),
            sessionId,
            sessionTitle: finalTitle,
            activityType: 'STRENGTH',
            durationMinutes,
            unit: ex.unit || strengthUnit,
          });
        }
      });
    } else {
      const muscleGroup: MuscleGroup =
        activityType === 'RUNNING' || activityType === 'CYCLING'
          ? 'Czworogłowe uda'
          : activityType === 'STRENGTH'
          ? 'Czworogłowe uda'
          : 'Brzuch';

      const tonnage = activityType === 'STRENGTH' ? estimatedTonnage : 0;

      entries.push({
        id: `log-${sessionId}-single`,
        timestamp,
        dateStr,
        dayId: `free-${activityType.toLowerCase()}-${dateStr}`,
        dayTitle: finalTitle,
        exerciseId: `ex-${activityType.toLowerCase()}`,
        exerciseName: finalTitle,
        muscleGroup,
        setNumber: 1,
        weightKg: tonnage > 0 ? tonnage : 0,
        reps: 1,
        tonnageKg: tonnage,
        rpe,
        rir: Math.max(0, 10 - rpe),
        notes: notes.trim(),
        sessionNotes: notes.trim(),
        sessionId,
        sessionTitle: finalTitle,
        activityType,
        durationMinutes,
        distanceKm: (activityType === 'RUNNING' || activityType === 'CYCLING' || activityType === 'HYROX') ? effectiveKm : undefined,
        targetDistance: (activityType === 'RUNNING' || activityType === 'CYCLING' || activityType === 'HYROX') ? distanceValue : undefined,
        distanceUnit: (activityType === 'RUNNING' || activityType === 'CYCLING' || activityType === 'HYROX') ? distanceUnit : undefined,
        targetPace: (activityType === 'RUNNING' || activityType === 'CYCLING') && targetPace && targetPace.trim() !== '' && targetPace.trim() !== '0' ? targetPace.trim() : undefined,
        actualPace: (activityType === 'RUNNING' || activityType === 'CYCLING') && targetPace && targetPace.trim() !== '' && targetPace.trim() !== '0' ? targetPace.trim() : undefined,
        targetHR: (activityType === 'RUNNING' || activityType === 'CYCLING' || activityType === 'HYROX') && Number(targetHR) > 0 ? Number(targetHR) : undefined,
        actualHR: (activityType === 'RUNNING' || activityType === 'CYCLING' || activityType === 'HYROX') && Number(targetHR) > 0 ? Number(targetHR) : undefined,
        unit: activityType === 'STRENGTH' ? strengthUnit : distanceUnit,
      });
    }

    onSaveWorkout(entries);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overscroll-contain">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] my-auto overflow-hidden text-left relative animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading uppercase tracking-wider">
                Dodaj Trening do Kalendarza
              </h3>
              <p className="text-xs text-neutral-400">
                Możesz zarejestrować kilka treningów w jednym dniu (np. siła rano, bieg wieczorem)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain touch-pan-y"
        >
          {/* Date & Time selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Data Treningu:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Godzina / Pora dnia:
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Activity Category Selection Grid */}
          <div>
            <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
              Rodzaj Aktywności:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activities.map((act) => {
                const Icon = act.icon;
                const isSelected = activityType === act.type;
                return (
                  <button
                    key={act.type}
                    type="button"
                    onClick={() => handleSelectActivity(act)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? `${act.color} ring-1 ring-amber-400 font-bold shadow-md`
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-xs">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Title */}
          <div>
            <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
              Nazwa Treningu (np. Poranny Bieg, Góra Ciała, Rower szosowy):
            </label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Wpisz nazwę jednostki..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Metrics based on activity */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Czas trwania (min):
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono-numbers focus:outline-none focus:border-amber-400"
              />
            </div>

            {(activityType === 'RUNNING' || activityType === 'CYCLING' || activityType === 'HYROX') && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-400">
                      Dystans:
                    </label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDistanceUnit('km')}
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          distanceUnit === 'km' ? 'bg-amber-400 text-black' : 'text-neutral-400 bg-neutral-900'
                        }`}
                      >
                        km
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistanceUnit('m')}
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          distanceUnit === 'm' ? 'bg-amber-400 text-black' : 'text-neutral-400 bg-neutral-900'
                        }`}
                      >
                        m
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step={distanceUnit === 'km' ? '0.1' : '50'}
                    min="1"
                    value={distanceValue}
                    onChange={(e) => setDistanceValue(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono-numbers focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Tempo:
                  </label>
                  <input
                    type="text"
                    value={targetPace}
                    onChange={(e) => setTargetPace(e.target.value)}
                    placeholder="np. 4:30 min/km"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Śr. Tętno HR (bpm):
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="220"
                    value={targetHR}
                    onChange={(e) => setTargetHR(Number(e.target.value))}
                    placeholder="np. 165"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono-numbers focus:outline-none focus:border-amber-400"
                  />
                </div>
              </>
            )}

            {activityType === 'STRENGTH' && quickExercises.length === 0 && (
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Szacowany tonaż ({strengthUnit}):
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={estimatedTonnage}
                  onChange={(e) => setEstimatedTonnage(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono-numbers focus:outline-none focus:border-amber-400"
                  placeholder="np. 8500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Intensywność RPE (1-10):
              </label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono-numbers focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* If Strength: option to log quick exercises */}
          {activityType === 'STRENGTH' && (
            <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  Wykonane Ćwiczenia (opcjonalnie):
                </span>
                <span className="text-[10px] text-neutral-400">
                  {quickExercises.length} dodanych
                </span>
              </div>

              {quickExercises.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {quickExercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs"
                    >
                      <div className="truncate pr-2">
                        <strong className="text-white">{ex.name}</strong> •{' '}
                        <span className="text-neutral-400">
                          {ex.sets}x{ex.reps} @ {ex.weight}kg = {ex.sets * ex.reps * ex.weight}kg
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuickExercise(idx)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add exercise inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 border-t border-neutral-800/60">
                <input
                  type="text"
                  placeholder="Nazwa ćwiczenia (np. Przysiad)"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white sm:col-span-2 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Serie"
                    value={newExSets}
                    onChange={(e) => setNewExSets(Number(e.target.value))}
                    className="w-1/2 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none"
                    title="Liczba serii"
                  />
                  <input
                    type="number"
                    placeholder="Powt."
                    value={newExReps}
                    onChange={(e) => setNewExReps(Number(e.target.value))}
                    className="w-1/2 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none"
                    title="Powtórzenia"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="kg"
                    value={newExWeight}
                    onChange={(e) => setNewExWeight(Number(e.target.value))}
                    className="w-2/3 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none"
                    title="Ciężar w kg"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickExercise}
                    className="w-1/3 bg-amber-400 hover:bg-amber-300 text-black font-black rounded-lg py-1.5 text-xs flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
              Notatki z treningu / samopoczucie:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Ranny rozruch, dobre tempo, lekki ból w łydce, świetne samopoczucie..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zapisz Trening w Kalendarzu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
