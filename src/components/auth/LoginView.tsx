import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Dumbbell, ShieldCheck, Flame, Cloud, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signIn, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoggingIn(true);
      setLocalError(null);
      await signIn();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setLocalError('Nie udało się zalogować przez konto Google. Spróbuj ponownie.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between p-6 sm:p-10 selection:bg-amber-400 selection:text-black">
      {/* Top Header / Branding */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-neutral-950 shadow-lg shadow-amber-400/20">
            <Dumbbell className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white block uppercase">
              Hybrid Training
            </span>
            <span className="text-[11px] font-medium text-neutral-400 block -mt-0.5">
              Programowanie & Analityka Progresu
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chmura Cloud Firestore</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Twój kompletny dziennik treningowy online
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Zaloguj się, aby zsynchronizować swoje cykle treningowe, autoregulację RIR/RPE,
              szacowane 1RM oraz próby biegowe i Hyrox na wszystkich urządzeniach.
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-300">
                <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Automatyczna kopia zapasowa i synchronizacja na żywo</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-300">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Trening offline na siłowni bez utraty żadnej serii</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Prywatna przestrzeń zabezpieczona regułami Google Auth</span>
              </div>
            </div>

            {/* Error Message */}
            {(error || localError) && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-xs text-red-300">
                {localError || error}
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 active:scale-[0.99] text-neutral-900 font-bold text-sm shadow-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{isLoggingIn ? 'Logowanie...' : 'Zaloguj się przez Google'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-neutral-500">
        Bezpieczny dostęp • Dane zapisywane w Twojej prywatnej chmurze
      </footer>
    </div>
  );
};
