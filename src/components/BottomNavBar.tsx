import React from 'react';
import { Sliders, Dumbbell, Calendar, LayoutGrid } from 'lucide-react';
import { useScrollDirection } from '../hooks/useScrollDirection';

export type MainNavTab = 'edit' | 'workout' | 'calendar' | 'more';

interface BottomNavBarProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  unreadCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const scrollDirection = useScrollDirection({ threshold: 10 });
  const isMinimized = scrollDirection === 'down';

  const tabs: {
    id: MainNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isPrimary?: boolean;
    badge?: string;
  }[] = [
    {
      id: 'edit',
      label: 'Edycja',
      icon: Sliders,
    },
    {
      id: 'workout',
      label: 'Trening',
      icon: Dumbbell,
      isPrimary: true,
      badge: 'Start',
    },
    {
      id: 'calendar',
      label: 'Kalendarz',
      icon: Calendar,
    },
    {
      id: 'more',
      label: 'Więcej',
      icon: LayoutGrid,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] transition-all duration-300"
      style={{
        paddingBottom: isMinimized
          ? 'max(env(safe-area-inset-bottom, 0px), 4px)'
          : 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
      aria-label="Dolna nawigacja mobilna"
    >
      <div
        className={`w-full max-w-[1600px] mx-auto px-2 flex items-center justify-around gap-1 transition-all duration-300 ${
          isMinimized ? 'py-1' : 'pt-1.5'
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 px-2 rounded-2xl transition-all duration-300 cursor-pointer group touch-manipulation ${
                  isMinimized ? 'min-h-[36px] py-1' : 'min-h-[58px] py-1.5'
                }`}
                aria-label="Trening - Główna akcja"
              >
                {/* Primary Action Icon container - smoothly hides on scroll down */}
                <div
                  className={`flex items-center justify-center rounded-xl transition-all duration-300 shadow-md ${
                    isMinimized
                      ? 'h-0 opacity-0 overflow-hidden pointer-events-none'
                      : 'w-12 h-10 mb-1 opacity-100'
                  } ${
                    isActive
                      ? 'bg-amber-400 text-black shadow-amber-400/30 scale-105 ring-2 ring-amber-300'
                      : 'bg-neutral-800 text-amber-400 group-hover:bg-neutral-700'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2.4]" />
                </div>

                <span
                  className={`text-[11px] font-black uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'text-amber-400 font-extrabold'
                      : 'text-neutral-400 group-hover:text-neutral-200'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Subtle active glow dot (visible when expanded) */}
                {isActive && !isMinimized && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 animate-pulse" />
                )}
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 px-2 rounded-xl transition-all duration-300 cursor-pointer group touch-manipulation ${
                isMinimized ? 'min-h-[36px] py-1' : 'min-h-[58px] py-1.5'
              }`}
              aria-label={tab.label}
            >
              {/* Regular Tab Icon container - smoothly hides on scroll down */}
              <div
                className={`rounded-xl transition-all duration-300 ${
                  isMinimized
                    ? 'h-0 opacity-0 overflow-hidden pointer-events-none'
                    : 'p-1.5 mb-0.5 opacity-100'
                } ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-400 scale-105'
                    : 'text-neutral-400 group-hover:text-neutral-200 group-hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.1]" />
              </div>

              <span
                className={`text-[11px] font-bold tracking-tight transition-colors ${
                  isActive
                    ? 'text-amber-400 font-extrabold'
                    : 'text-neutral-400 group-hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </span>

              {isActive && !isMinimized && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
