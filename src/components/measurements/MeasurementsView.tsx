import React, { useState } from 'react';
import { ArrowLeft, User, Scale, Utensils, History } from 'lucide-react';
import { useMeasurements } from '../../hooks/useMeasurements';
import { ProfileTab } from './ProfileTab';
import { MeasurementsTab } from './MeasurementsTab';
import { DietTab } from './DietTab';
import { HistoryTab } from './HistoryTab';

export type MeasurementNavTab = 'PROFIL' | 'POMIARY' | 'DIETA' | 'HISTORIA';

interface MeasurementsViewProps {
  onBackToMenu: () => void;
}

export const MeasurementsView: React.FC<MeasurementsViewProps> = ({ onBackToMenu }) => {
  const [activeTab, setActiveTab] = useState<MeasurementNavTab>('POMIARY');

  const {
    profile,
    updateProfile,
    measurements,
    latestMeasurement,
    addMeasurement,
    deleteMeasurement,
    dietSettings,
    updateDietSettings,
    webhookUrl,
    updateWebhookUrl,
    syncStatus,
    syncWithGoogleSheets,
  } = useMeasurements();

  const tabs: { id: MeasurementNavTab; label: string; icon: React.ElementType }[] = [
    { id: 'PROFIL', label: 'PROFIL', icon: User },
    { id: 'POMIARY', label: 'POMIARY', icon: Scale },
    { id: 'DIETA', label: 'DIETA', icon: Utensils },
    { id: 'HISTORIA', label: 'HISTORIA', icon: History },
  ];

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* 
        Sticky Header: position: sticky; top: 0; z-index: 50; with backdrop-blur
      */}
      <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-3 py-2.5 sm:px-4 sm:py-3 transition-colors shadow-md">
        <div className="max-w-xl mx-auto flex flex-col gap-2.5">
          {/* Top Bar with Back Button and View Title */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToMenu}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs cursor-pointer border border-neutral-800 transition-colors touch-manipulation min-h-[42px] active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Wróć do menu</span>
            </button>

            <div className="text-right">
              <span className="text-xs font-black uppercase tracking-wider text-white font-heading block">
                Pomiary i Sylwetka
              </span>
              {latestMeasurement && (
                <span className="text-[10px] text-neutral-400">
                  Waga: <strong className="text-amber-400">{latestMeasurement.weightKg} kg</strong>
                  {latestMeasurement.bodyFatPct ? ` | BF: ${latestMeasurement.bodyFatPct}%` : ''}
                </span>
              )}
            </div>
          </div>

          {/* 4 Tabs Navigation Bar */}
          <nav className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider font-heading transition-all cursor-pointer touch-manipulation min-h-[44px] ${
                    isActive
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                  <span className="text-[10px] sm:text-xs truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 max-w-xl mx-auto w-full">
        {activeTab === 'PROFIL' && (
          <ProfileTab
            profile={profile}
            onUpdateProfile={updateProfile}
            latestWeightKg={latestMeasurement?.weightKg}
          />
        )}

        {activeTab === 'POMIARY' && (
          <MeasurementsTab
            profile={profile}
            latestMeasurement={latestMeasurement}
            onSaveMeasurement={addMeasurement}
            onSwitchToHistory={() => setActiveTab('HISTORIA')}
          />
        )}

        {activeTab === 'DIETA' && (
          <DietTab
            profile={profile}
            latestWeightKg={latestMeasurement?.weightKg}
            dietSettings={dietSettings}
            onUpdateDietSettings={updateDietSettings}
          />
        )}

        {activeTab === 'HISTORIA' && (
          <HistoryTab
            measurements={measurements}
            onDeleteMeasurement={deleteMeasurement}
            syncStatus={syncStatus}
            onSyncWithGoogleSheets={syncWithGoogleSheets}
            webhookUrl={webhookUrl}
            onUpdateWebhookUrl={updateWebhookUrl}
          />
        )}
      </main>
    </div>
  );
};
