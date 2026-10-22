import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { createHyroxMasterSpreadsheet, appendWorkoutLogsToSheet } from '../../services/sheets';
import { WorkoutLogEntry } from '../../types/hyrox';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  spreadsheetId: string | null;
  onSpreadsheetLinked: (id: string) => void;
  onGoogleSignIn: () => void;
  workoutLogs: WorkoutLogEntry[];
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  user,
  spreadsheetId,
  onSpreadsheetLinked,
  onGoogleSignIn,
  workoutLogs,
}) => {
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [manualIdInput, setManualIdInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Confirmation modal states
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);

  if (!isOpen) return null;

  const spreadsheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  const handleCreateSheetConfirmed = async () => {
    setConfirmCreateOpen(false);
    setIsCreatingSheet(true);
    setStatusMessage(null);

    try {
      const result = await createHyroxMasterSpreadsheet();
      onSpreadsheetLinked(result.spreadsheetId);
      setStatusMessage({
        text: `Pomyślnie utworzono i sformatowano 4 arkusze w nowym pliku Google Sheets!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `Błąd podczas tworzenia arkusza: ${err.message || err}`,
        type: 'error',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSyncLogsConfirmed = async () => {
    if (!spreadsheetId) return;
    setConfirmSyncOpen(false);
    setIsSyncing(true);
    setStatusMessage(null);

    try {
      await appendWorkoutLogsToSheet(spreadsheetId, workoutLogs);
      setStatusMessage({
        text: `Pomyślnie dopisano ${workoutLogs.length} serii treningowych do zakładki 'Dziennik_Treningowy'!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `Błąd podczas synchronizacji do Google Sheets: ${err.message || err}`,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLinkManual = () => {
    let cleanId = manualIdInput.trim();
    // if full url was pasted, extract ID
    if (cleanId.includes('/d/')) {
      const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }
    }
    if (cleanId) {
      onSpreadsheetLinked(cleanId);
      setStatusMessage({
        text: `Połączono z arkuszem o identyfikatorze: ${cleanId}`,
        type: 'success',
      });
      setManualIdInput('');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Dzien',
      'Cwiczenie',
      'Partia',
      'Seria',
      'Ciezar_kg',
      'Powtorzenia',
      'Tonaz_kg',
      'RPE',
      'RIR',
      'Notatki',
    ];
    const rows = workoutLogs.map((l) => [
      `"${l.dateStr}"`,
      `"${l.dayTitle}"`,
      `"${l.exerciseName}"`,
      `"${l.muscleGroup}"`,
      l.setNumber,
      l.weightKg,
      l.reps,
      l.tonnageKg,
      l.rpe,
      l.rir,
      `"${[l.notes, l.sessionNotes ? `[Ogólne: ${l.sessionNotes}]` : ''].filter(Boolean).join(' | ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hyrox-dziennik-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyUrlToClipboard = () => {
    if (!spreadsheetUrl) return;
    navigator.clipboard.writeText(spreadsheetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative text-left">
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-heading">
                  Integracja Google Sheets
                </h3>
                <p className="text-xs text-neutral-400">
                  Automatyczny eksport i synchronizacja planu, tonażu oraz prób czasowych
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

          <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Status message */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* User auth state */}
            {!user ? (
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
                <p className="text-xs text-neutral-300 max-w-md mx-auto">
                  Aby tworzyć i synchronizować arkusze bezpośrednio na swoim Dysku Google, zaloguj się za pomocą konta Google.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    className="gsi-material-button"
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents font-semibold">
                        Zaloguj się z Google
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Linked Sheet Status */}
                {spreadsheetUrl ? (
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Arkusz Google jest aktywny i połączony
                      </span>
                      <a
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 underline"
                      >
                        Otwórz arkusz <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs">
                      <span className="font-mono-numbers text-neutral-400 truncate flex-1">
                        {spreadsheetUrl}
                      </span>
                      <button
                        onClick={copyUrlToClipboard}
                        className="p-1 text-neutral-400 hover:text-white transition-colors"
                        title="Skopiuj link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {copiedLink && (
                      <span className="text-[10px] text-emerald-400 block font-semibold">
                        Skopiowano link do schowka!
                      </span>
                    )}

                    {/* Sync button */}
                    <div className="pt-2">
                      <button
                        onClick={() => setConfirmSyncOpen(true)}
                        disabled={isSyncing || workoutLogs.length === 0}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Trwa synchronizacja...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Zsynchronizuj {workoutLogs.length} serii do arkusza</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
                    <p className="text-xs text-neutral-300">
                      Nie masz jeszcze połączonego arkusza Google Sheets dla tego planu.
                    </p>
                    <button
                      onClick={() => setConfirmCreateOpen(true)}
                      disabled={isCreatingSheet}
                      className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {isCreatingSheet ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Tworzenie arkusza...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Utwórz Nowy Arkusz Treningowy HYROX</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Option to create a new sheet anyway */}
                {spreadsheetUrl && (
                  <div className="text-right">
                    <button
                      onClick={() => setConfirmCreateOpen(true)}
                      disabled={isCreatingSheet}
                      className="text-xs text-neutral-400 hover:text-amber-400 transition-colors underline cursor-pointer"
                    >
                      Utwórz nowy osobny arkusz Google Sheets
                    </button>
                  </div>
                )}

                {/* Link existing ID */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <span className="text-xs font-bold text-neutral-300 block">
                    Połącz z istniejącym arkuszem (wklej URL lub ID):
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/1A2B3C..."
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleLinkManual}
                      className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
                    >
                      Połącz
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Offline CSV Export Backup */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                Pobierz kopię zapasową w formacie CSV (np. do Excela)
              </span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksportuj CSV ({workoutLogs.length} wpisów)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Creating Sheet */}
      <ConfirmationModal
        isOpen={confirmCreateOpen}
        title="Utworzyć nowy arkusz w Google Sheets?"
        message="Aplikacja utworzy na Twoim Dysku Google nowy arkusz kalkulacyjny 'HYROX Master Plan & Dziennik Treningowy' z 4 sformatowanymi zakładkami: Plan Tygodniowy, Dziennik Treningowy, Symulator Hyrox oraz Rozkład Partii."
        confirmLabel="Tak, utwórz arkusz"
        cancelLabel="Anuluj"
        onConfirm={handleCreateSheetConfirmed}
        onCancel={() => setConfirmCreateOpen(false)}
      />

      {/* Confirmation Modal for Appending / Mutating Data */}
      <ConfirmationModal
        isOpen={confirmSyncOpen}
        title={`Zapisać ${workoutLogs.length} serii w Google Sheets?`}
        message={`Dopiszesz ${workoutLogs.length} serii treningowych do zakładki 'Dziennik_Treningowy' w Twoim połączonym arkuszu. Żadne dotychczasowe wiersze nie zostaną usunięte.`}
        confirmLabel="Zsynchronizuj dane"
        cancelLabel="Anuluj"
        onConfirm={handleSyncLogsConfirmed}
        onCancel={() => setConfirmSyncOpen(false)}
      />
    </>
  );
};
