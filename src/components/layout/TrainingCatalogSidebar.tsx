import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Dumbbell,
  Zap,
  Activity,
  Award,
  Plus,
  Trash2,
  Edit2,
  Copy,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  Save,
  Check,
  Flame,
  CheckCircle2,
  Calendar,
  Target
} from 'lucide-react';
import {
  TrainingCycleCatalog,
  TrainingCycleGoal,
  WorkoutDay
} from '../../types/hyrox';

interface TrainingCatalogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cyclesList: TrainingCycleCatalog[];
  activeCycleId: string;
  onSelectCycle: (cycleId: string) => void;
  onCreateCycle: (newCycle: TrainingCycleCatalog) => void;
  onUpdateCycle: (updatedCycle: TrainingCycleCatalog) => void;
  onDeleteCycle: (cycleId: string) => void;
}

export const TrainingCatalogSidebar: React.FC<TrainingCatalogSidebarProps> = ({
  isOpen,
  onClose,
  cyclesList,
  activeCycleId,
  onSelectCycle,
  onCreateCycle,
  onUpdateCycle,
  onDeleteCycle,
}) => {
  // New cycle creation modal state
  const [isCreatingCycle, setIsCreatingCycle] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleGoal, setNewCycleGoal] = useState<TrainingCycleGoal>('MASA');
  const [newCycleDesc, setNewCycleDesc] = useState('');
  const [newCycleColor, setNewCycleColor] = useState<'amber' | 'emerald' | 'purple' | 'blue' | 'rose'>('emerald');

  // Inline editing cycle
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (!isOpen) return null;

  const getGoalBadge = (goal: TrainingCycleGoal) => {
    switch (goal) {
      case 'HYROX':
        return { label: 'HYROX PREP', color: 'bg-amber-400 text-black font-black' };
      case 'MASA':
        return { label: 'MASA (HIPERTROFIA)', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' };
      case 'REDUKCJA':
        return { label: 'REDUKCJA & KONDYCJA', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' };
      case 'SILA':
        return { label: 'SIŁA MAKSYMALNA', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold' };
      case 'BIEG_WYTRZYMALOSC':
        return { label: 'BIEG & WYTRZYMAŁOŚĆ', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold' };
      default:
        return { label: 'WŁASNY CYKL', color: 'bg-neutral-800 text-neutral-300 font-bold' };
    }
  };

  const handleCreateCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleName.trim()) return;

    // A newly created cycle is completely clean and empty as requested:
    // User will manually add each week, day, and exercise!
    const newCycle: TrainingCycleCatalog = {
      id: `cycle-${Date.now()}`,
      name: newCycleName.trim(),
      goal: newCycleGoal,
      description: newCycleDesc.trim() || 'Własny zaplanowany cykl treningowy — dodaj własne tygodnie i ćwiczenia.',
      colorTag: newCycleColor,
      currentWeek: 1,
      weeksList: [], // Starts completely empty!
      weeksPlansMap: {}, // Empty plan
      createdAt: new Date().toISOString().split('T')[0],
    };

    onCreateCycle(newCycle);
    onSelectCycle(newCycle.id);
    setIsCreatingCycle(false);
    setNewCycleName('');
    setNewCycleDesc('');
    onClose();
  };

  const handleStartEditing = (cycle: TrainingCycleCatalog) => {
    setEditingCycleId(cycle.id);
    setEditName(cycle.name);
    setEditDesc(cycle.description);
  };

  const handleSaveEditing = (cycle: TrainingCycleCatalog) => {
    onUpdateCycle({
      ...cycle,
      name: editName.trim() || cycle.name,
      description: editDesc.trim() || cycle.description,
    });
    setEditingCycleId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
      {/* Sidebar Drawer Container with full mobile support */}
      <div className="w-full max-w-2xl bg-neutral-900 border-r border-neutral-700/80 shadow-2xl h-[100dvh] flex flex-col relative z-20 text-left overflow-hidden">
        {/* Header (Fixed) */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white font-heading uppercase tracking-wider">
                  Katalog Cykli Treningowych
                </h3>
              </div>
              <p className="text-xs text-neutral-400">
                Wybierz cel (Hyrox, Masa, Redukcja) lub stwórz własny pusty cykl
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Action Bar (Fixed) */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Cykle ({cyclesList.length}):
          </span>

          <button
            onClick={() => setIsCreatingCycle(!isCreatingCycle)}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nowy Czysty Cykl</span>
          </button>
        </div>

        {/* Content Body (Scrollable on Mobile) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain touch-pan-y">
          {/* New Clean Cycle Form */}
          {isCreatingCycle && (
            <form
              onSubmit={handleCreateCycleSubmit}
              className="p-4 sm:p-5 rounded-3xl bg-neutral-950 border border-amber-400 shadow-2xl space-y-4 text-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4" /> Utwórz Nowy Pusty Cykl Treningowy
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingCycle(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
                ℹ️ Cykl zostanie utworzony jako <strong>czysty (pusty)</strong> — ręcznie dodasz do niego każdy tydzień, dzień i ćwiczenie wg własnego planu.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                    Nazwa Cyklu:
                  </label>
                  <input
                    type="text"
                    placeholder="np. Masa 2026, Siła Trójbój, Redukcja..."
                    value={newCycleName}
                    onChange={(e) => setNewCycleName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                    Główny Cel:
                  </label>
                  <select
                    value={newCycleGoal}
                    onChange={(e) => setNewCycleGoal(e.target.value as TrainingCycleGoal)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs font-bold cursor-pointer focus:outline-none focus:border-amber-400"
                  >
                    <option value="MASA">Masa (Hipertrofia)</option>
                    <option value="HYROX">Przygotowania pod HYROX</option>
                    <option value="REDUKCJA">Redukcja & Spalanie</option>
                    <option value="SILA">Siła Maksymalna</option>
                    <option value="BIEG_WYTRZYMALOSC">Bieg & Wydolność</option>
                    <option value="CUSTOM">Własny Cel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                  Opis i Założenia:
                </label>
                <input
                  type="text"
                  placeholder="np. Własny split 4-dniowy z naciskiem na ramiona..."
                  value={newCycleDesc}
                  onChange={(e) => setNewCycleDesc(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCycle(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-wider shadow-lg shadow-amber-400/20 cursor-pointer"
                >
                  Utwórz Czysty Cykl
                </button>
              </div>
            </form>
          )}

          {/* List of Available Cycles */}
          <div className="space-y-4">
            {cyclesList.map((cycle) => {
              const isActive = cycle.id === activeCycleId;
              const badge = getGoalBadge(cycle.goal);
              const isEditingThis = editingCycleId === cycle.id;
              const totalWeeks = cycle.weeksList?.length || 0;
              const daysInWeekOne = cycle.weeksPlansMap?.[1]?.length || 0;

              return (
                <div
                  key={cycle.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all text-left relative overflow-hidden ${
                    isActive
                      ? 'bg-neutral-900 border-amber-400 shadow-xl shadow-amber-400/10 ring-1 ring-amber-400'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  {/* Top Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${badge.color}`}>
                        {badge.label}
                      </span>
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Wyświetlany na Głównej</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!isEditingThis ? (
                        <button
                          onClick={() => handleStartEditing(cycle)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800"
                          title="Edytuj nazwę i opis"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      ) : null}

                      {cyclesList.length > 1 && (
                        <button
                          onClick={() => {
                            const conf = window.confirm(`Czy na pewno chcesz usunąć cykl "${cycle.name}"?`);
                            if (conf) onDeleteCycle(cycle.id);
                          }}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                          title="Usuń cykl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="my-3">
                    {isEditingThis ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-white font-bold text-sm"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1 text-neutral-300 text-xs"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingCycleId(null)}
                            className="px-3 py-1 text-xs text-neutral-400 hover:text-white"
                          >
                            Anuluj
                          </button>
                          <button
                            onClick={() => handleSaveEditing(cycle)}
                            className="px-3 py-1 rounded bg-amber-400 text-black text-xs font-bold"
                          >
                            Zapisz
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-base sm:text-lg font-black text-white font-heading">
                          {cycle.name}
                        </h4>
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                          {cycle.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cycle Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 text-center text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Tygodnie</span>
                      <span className="font-bold text-white font-mono-numbers">
                        {totalWeeks > 0 ? `${totalWeeks} tyg.` : 'Pusty'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Dni w tyg.</span>
                      <span className="font-bold text-amber-400 font-mono-numbers">
                        {daysInWeekOne > 0 ? `${daysInWeekOne} dni` : 'Brak'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Tydzień bieżący</span>
                      <span className="font-bold text-emerald-400 font-mono-numbers">Tydzień {cycle.currentWeek || 1}</span>
                    </div>
                  </div>

                  {/* Select / Activate Button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-neutral-500">
                      {totalWeeks === 0 ? 'Pusty cykl — wymaga dodania tygodni' : 'Wszystkie edycje zapisują się w tym cyklu'}
                    </span>

                    {isActive ? (
                      <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>Aktywny</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectCycle(cycle.id);
                          onClose();
                        }}
                        className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 cursor-pointer flex items-center gap-1.5"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Wybierz Ten Cykl</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dismiss backdrop */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />
    </div>
  );
};
