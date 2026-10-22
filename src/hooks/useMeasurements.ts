import { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  BodyMeasurement,
  DietSettings,
  calculateJacksonPollock3Site,
} from '../types/measurements';

const PROFILE_STORAGE_KEY = 'training_app_body_profile';
const MEASUREMENTS_STORAGE_KEY = 'training_app_body_measurements';
const DIET_STORAGE_KEY = 'training_app_body_diet';
const WEBHOOK_STORAGE_KEY = 'training_app_sheets_webhook_url';

export const DEFAULT_PROFILE: UserProfile = {
  age: 28,
  gender: 'male',
  heightCm: 182,
  pal: 1.6,
  targetWeightKg: 80.0,
};

export const DEFAULT_DIET_SETTINGS: DietSettings = {
  weeklyGoalKg: -0.5,
  proteinPerKg: 2.0,
  fatPerKg: 1.0,
};

// Start with realistic initial demo measurements so the user immediately sees charts and history
const INITIAL_DEMO_MEASUREMENTS: BodyMeasurement[] = [
  {
    id: 'meas-demo-1',
    date: '2026-09-01',
    weightKg: 85.4,
    circumferences: {
      calf: 39.5,
      thigh: 62.0,
      hip: 104.0,
      abdomen: 89.5,
      waist: 86.0,
      chest: 107.0,
      biceps: 38.5,
      forearm: 31.0,
    },
    skinfolds: {
      chest: 14,
      abdomen: 20,
      thigh: 16,
    },
    bodyFatPct: 17.8,
    fatMassKg: 15.2,
    leanMassKg: 70.2,
    notes: 'Pomiary startowe przed nowym blokiem treningowym',
  },
  {
    id: 'meas-demo-2',
    date: '2026-09-15',
    weightKg: 84.6,
    circumferences: {
      calf: 39.4,
      thigh: 61.5,
      hip: 103.0,
      abdomen: 88.0,
      waist: 85.0,
      chest: 107.0,
      biceps: 38.5,
      forearm: 31.0,
    },
    skinfolds: {
      chest: 13,
      abdomen: 18,
      thigh: 15,
    },
    bodyFatPct: 16.5,
    fatMassKg: 14.0,
    leanMassKg: 70.6,
    notes: 'Wyraźny spadek na brzuchu, siła na przysiadzie rośnie',
  },
  {
    id: 'meas-demo-3',
    date: '2026-10-01',
    weightKg: 83.8,
    circumferences: {
      calf: 39.2,
      thigh: 61.0,
      hip: 102.0,
      abdomen: 86.5,
      waist: 83.8,
      chest: 107.5,
      biceps: 38.8,
      forearm: 31.2,
    },
    skinfolds: {
      chest: 12,
      abdomen: 16,
      thigh: 14,
    },
    bodyFatPct: 15.3,
    fatMassKg: 12.8,
    leanMassKg: 71.0,
    notes: 'Dobre tempo redukcji, obwód ramion zachowany',
  },
  {
    id: 'meas-demo-4',
    date: '2026-10-15',
    weightKg: 83.0,
    circumferences: {
      calf: 39.2,
      thigh: 60.8,
      hip: 101.5,
      abdomen: 85.0,
      waist: 82.5,
      chest: 108.0,
      biceps: 39.0,
      forearm: 31.3,
    },
    skinfolds: {
      chest: 11,
      abdomen: 14,
      thigh: 13,
    },
    bodyFatPct: 14.1,
    fatMassKg: 11.7,
    leanMassKg: 71.3,
    notes: 'Krata na brzuchu coraz bardziej widoczna, świetne samopoczucie',
  },
];

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
  lastSynced?: string;
}

export function useMeasurements() {
  // 1. Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved profile:', e);
    }
    return DEFAULT_PROFILE;
  });

  // 2. Measurements State
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(() => {
    try {
      const saved = localStorage.getItem(MEASUREMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved measurements:', e);
    }
    return INITIAL_DEMO_MEASUREMENTS;
  });

  // 3. Diet Settings State
  const [dietSettings, setDietSettings] = useState<DietSettings>(() => {
    try {
      const saved = localStorage.getItem(DIET_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved diet settings:', e);
    }
    return DEFAULT_DIET_SETTINGS;
  });

  // 4. Webhook URL State
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    message: '',
  });

  // Save profile to localStorage
  const updateProfile = useCallback((updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  }, []);

  // Save diet settings
  const updateDietSettings = useCallback((updated: Partial<DietSettings>) => {
    setDietSettings((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  }, []);

  // Save webhook URL
  const updateWebhookUrl = useCallback((url: string) => {
    setWebhookUrl(url);
    try {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Helper to enrich measurement with Jackson-Pollock calculations if skinfolds exist
  const enrichMeasurement = useCallback(
    (item: Omit<BodyMeasurement, 'id'> & { id?: string }): BodyMeasurement => {
      let bf = item.bodyFatPct;
      if (bf === undefined || bf === null) {
        const calculated = calculateJacksonPollock3Site(
          item.skinfolds,
          profile.age,
          profile.gender
        );
        if (calculated !== null) {
          bf = calculated;
        }
      }

      let fatMassKg: number | undefined;
      let leanMassKg: number | undefined;

      if (bf !== undefined && item.weightKg > 0) {
        fatMassKg = Math.round((item.weightKg * (bf / 100)) * 10) / 10;
        leanMassKg = Math.round((item.weightKg - fatMassKg) * 10) / 10;
      }

      return {
        ...item,
        id: item.id || `meas-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bodyFatPct: bf,
        fatMassKg,
        leanMassKg,
      };
    },
    [profile.age, profile.gender]
  );

  // Add new measurement
  const addMeasurement = useCallback(
    (newMeas: Omit<BodyMeasurement, 'id'>) => {
      const enriched = enrichMeasurement(newMeas);
      setMeasurements((prev) => {
        // Sort descending by date (latest first)
        const updated = [enriched, ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        try {
          localStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn(e);
        }
        return updated;
      });
      return enriched;
    },
    [enrichMeasurement]
  );

  // Update existing measurement
  const updateMeasurement = useCallback(
    (id: string, updatedFields: Partial<BodyMeasurement>) => {
      setMeasurements((prev) => {
        const updated = prev.map((item) => {
          if (item.id !== id) return item;
          const merged = { ...item, ...updatedFields };
          return enrichMeasurement(merged);
        });
        try {
          localStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn(e);
        }
        return updated;
      });
    },
    [enrichMeasurement]
  );

  // Delete measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  // Asynchronous sync with Google Sheets (Webhook / Apps Script)
  const syncWithGoogleSheets = useCallback(
    async (targetData?: BodyMeasurement[]): Promise<{ success: boolean; message: string }> => {
      setSyncStatus({ state: 'syncing', message: 'Wysyłanie danych do arkusza Google...' });
      const payload = {
        action: 'SYNC_MEASUREMENTS',
        timestamp: new Date().toISOString(),
        profile,
        dietSettings,
        measurements: targetData || measurements,
      };

      try {
        if (webhookUrl && webhookUrl.trim().startsWith('http')) {
          // If a custom Webhook / Apps Script endpoint is provided, perform live POST fetch
          const response = await fetch(webhookUrl.trim(), {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Błąd HTTP ${response.status}: ${response.statusText}`);
          }

          const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          setSyncStatus({
            state: 'success',
            message: `Pomyślnie zsynchronizowano z Google Sheets (${now})`,
            lastSynced: now,
          });
          return { success: true, message: 'Dane zsynchronizowane z Google Sheets.' };
        } else {
          // Offline / Mock fallback structure: Simulates real network latency and prepares data payload
          await new Promise((resolve) => setTimeout(resolve, 800));
          const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          setSyncStatus({
            state: 'success',
            message: `Zapisano lokalnie i przygotowano paczkę do Google Sheets (${now})`,
            lastSynced: now,
          });
          return {
            success: true,
            message:
              'Paczka danych przygotowana pomyślnie. (Możesz podać URL Webhooka Apps Script, aby wysyłać bezpośrednio do arkusza).',
          };
        }
      } catch (error: any) {
        console.error('Błąd synchronizacji z Google Sheets:', error);
        setSyncStatus({
          state: 'error',
          message: error?.message || 'Błąd podczas łączenia z arkuszem Google.',
        });
        return {
          success: false,
          message: error?.message || 'Błąd podczas wysyłania do Google Sheets.',
        };
      }
    },
    [profile, dietSettings, measurements, webhookUrl]
  );

  // Latest measurement helper
  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;

  return {
    profile,
    updateProfile,
    measurements,
    latestMeasurement,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    dietSettings,
    updateDietSettings,
    webhookUrl,
    updateWebhookUrl,
    syncStatus,
    syncWithGoogleSheets,
  };
}
