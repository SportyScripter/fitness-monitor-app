import React from 'react';
import {
  X,
  History,
  Dumbbell,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';
import { WorkoutLogEntry } from '../../types/hyrox';

interface PreviousWorkoutModalProps {
  workoutTitle: string;
  previousLogs: WorkoutLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const PreviousWorkoutModal: React.FC<PreviousWorkoutModalProps> = ({
  workoutTitle,
  previousLogs,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Group logs by exercise
  const exerciseMap: Record<
    string,
    {
      name: string;
      muscleGroup: string;
      sets: WorkoutLogEntry[];
      rpe: number;
      rir: number;
      notes: string;
    }
  > = {};

  previousLogs.forEach((l) => {
    if (!exerciseMap[l.exerciseName]) {
      exerciseMap[l.exerciseName] = {
        name: l.exerciseName,
        muscleGroup: l.muscleGroup,
        sets: [],
        rpe: l.rpe,
        rir: l.rir,
        notes: l.notes || '',
      };
    }
    exerciseMap[l.exerciseName].sets.push(l);
  });

  const exercises = Object.values(exerciseMap);
  const sessionDate = previousLogs[0]?.dateStr || 'Ostatnia sesja';
  const sessionTotalTonnage = previousLogs.reduce((sum, l) => sum + (l.tonnageKg || 0), 0);
  const sessionNote = previousLogs.find((l) => l.sessionNotes)?.sessionNotes;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overscroll-contain animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl p-4 sm:p-6 text-left relative space-y-4 sm:space-y-5 flex flex-col max-h-[92dvh] sm:max-h-[90vh] my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Podgląd Poprzedniej Sesji ({sessionDate})
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white font-heading mt-0.5">
                {workoutTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Previous Session Summary Card */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between shrink-0 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
              Łączny tonaż z poprzedniego treningu:
            </span>
            <span className="text-xl font-black text-amber-400 font-mono-numbers">
              {sessionTotalTonnage.toLocaleString()} kg
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
              Ćwiczenia wykonane:
            </span>
            <span className="text-sm font-bold text-white font-mono-numbers">
              {exercises.length} ćwiczeń ({previousLogs.length} serii)
            </span>
          </div>
        </div>

        {/* Session Note if present */}
        {sessionNote && (
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 italic shrink-0">
            <span className="font-bold text-amber-400 not-italic block text-[10px] uppercase mb-0.5">
              Notatka z tamtej sesji:
            </span>
            &quot;{sessionNote}&quot;
          </div>
        )}

        {/* Exercises List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 text-xs overscroll-contain touch-pan-y">
          {exercises.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
              <p>Brak historii poprzedniego treningu dla tego szablonu.</p>
              <p className="text-neutral-400 mt-1 text-[11px]">
                Po ukończeniu i zapisaniu bieżącego treningu jego wyniki pojawią się tutaj jako punkt odniesienia!
              </p>
            </div>
          ) : (
            exercises.map((ex, exIdx) => (
              <div
                key={exIdx}
                className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-900">
                  <div>
                    <span className="font-bold text-white text-sm">{ex.name}</span>
                    <span className="text-[10px] text-neutral-400 ml-2">
                      ({ex.muscleGroup.split('(')[0].trim()})
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold">
                    RPE {ex.rpe} • RIR {ex.rir}
                  </span>
                </div>

                {/* Sets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono-numbers text-xs">
                  {ex.sets.map((s) => (
                    <div
                      key={s.setNumber}
                      className="p-2 rounded-xl bg-neutral-900 border border-neutral-800"
                    >
                      <span className="text-[10px] text-neutral-500 block">Seria {s.setNumber}</span>
                      <span className="font-black text-white text-sm">
                        {s.weightKg} kg × {s.reps}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {s.tonnageKg} kg
                      </span>
                    </div>
                  ))}
                </div>

                {ex.notes && (
                  <p className="text-[11px] text-neutral-400 italic pt-1">
                    Wskazówka: &quot;{ex.notes}&quot;
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-400 text-black font-black uppercase text-xs tracking-wider cursor-pointer shadow-md shadow-amber-400/20"
          >
            Zamknij Podgląd
          </button>
        </div>
      </div>
    </div>
  );
};
