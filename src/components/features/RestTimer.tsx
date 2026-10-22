import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Timer as TimerIcon, X, Plus } from 'lucide-react';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
}) => {
  const [targetSeconds, setTargetSeconds] = useState(initialSeconds);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setTimeLeft(targetSeconds);
  }, [targetSeconds]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (soundEnabled) {
        playBeep();
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, soundEnabled]);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = Math.max(0, Math.min(100, ((targetSeconds - timeLeft) / targetSeconds) * 100));

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-2xl shadow-2xl p-4 text-white animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
            <TimerIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Rest Timer</h4>
            <span className="text-sm font-semibold text-white">Przerwa między seriami</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              soundEnabled ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title={soundEnabled ? 'Dźwięk włączony' : 'Dźwięk wyłączony'}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timer display */}
      <div className="my-4 text-center">
        <div className="text-4xl font-black font-mono-numbers tracking-tight text-white">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-amber-400 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[45, 60, 90, 120].map((sec) => (
          <button
            key={sec}
            onClick={() => {
              setTargetSeconds(sec);
              setTimeLeft(sec);
              setIsActive(true);
            }}
            className={`py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
              targetSeconds === sec
                ? 'bg-amber-400 text-black border-amber-400 font-bold'
                : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            {sec}s
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={() => {
            setTimeLeft((prev) => prev + 15);
            setTargetSeconds((prev) => prev + 15);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
        >
          <Plus className="w-3 h-3" /> 15s
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTimeLeft(targetSeconds);
              setIsActive(false);
            }}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isActive
                ? 'bg-red-500 hover:bg-red-400 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-black font-extrabold'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pauza
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
