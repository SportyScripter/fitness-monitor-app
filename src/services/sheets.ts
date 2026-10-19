import { getAccessToken, googleSignIn } from './auth';
import { WorkoutLogEntry, HyroxRaceTrial, DailyRecoveryData } from '../types/hyrox';
import { MASTER_HYROX_WEEK_PLAN, MUSCLE_GROUP_VOLUME_TARGETS } from '../data/hyroxPlanData';

export interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Ensure we have a valid access token. If missing, prompt user to re-authenticate with Google.
 */
async function ensureToken(): Promise<string> {
  let token = await getAccessToken();
  if (!token) {
    const res = await googleSignIn();
    if (!res || !res.accessToken) {
      throw new Error('Wymagane zalogowanie na konto Google, aby połączyć się z Google Sheets.');
    }
    token = res.accessToken;
  }
  return token;
}

/**
 * Creates a master structured HYROX Google Spreadsheet with pre-formatted sheets:
 * 1. Plan_Tygodniowy
 * 2. Dziennik_Serii_i_Tonażu
 * 3. Symulator_Hyrox_Próby
 * 4. Regeneracja_i_HRV
 */
export async function createHyroxMasterSpreadsheet(
  customTitle?: string
): Promise<CreateSpreadsheetResponse> {
  const token = await ensureToken();
  const title = customTitle || `HYROX Master Plan & Dziennik Treningowy (${new Date().toLocaleDateString('pl-PL')})`;

  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Plan_Tygodniowy',
          gridProperties: { rowCount: 100, columnCount: 15 },
        },
      },
      {
        properties: {
          title: 'Dziennik_Treningowy',
          gridProperties: { rowCount: 200, columnCount: 12 },
        },
      },
      {
        properties: {
          title: 'Hyrox_Symulator_Próby',
          gridProperties: { rowCount: 100, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'Rozkład_Partii_i_Objętość',
          gridProperties: { rowCount: 50, columnCount: 8 },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Błąd tworzenia arkusza Google Sheets: ${errText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Populate Initial Template Data
  await populateInitialTemplateData(spreadsheetId, token);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Populates header styling and initial reference data to the created sheets.
 */
async function populateInitialTemplateData(spreadsheetId: string, token: string) {
  // 1. Data for 'Plan_Tygodniowy'
  const planRows: any[][] = [
    ['HYROX 5-DNIOWY PROGRAM TRENINGOWY (3x FBW + 2x BIEGI HIIT + WEEKEND HYROX)', '', '', '', '', '', '', ''],
    ['Wygenerowano przez system HYROX Pro Engine. Śledź objętość (tonaż), RPE i RIR.'],
    [],
    ['Dzień', 'Typ Treningu', 'Główny Cel', 'Ćwiczenie / Segment', 'Partia Główna', 'Serie', 'Powtórzenia', 'RPE Cel', 'RIR Cel', 'Znaczenie pod HYROX'],
  ];

  MASTER_HYROX_WEEK_PLAN.forEach((day) => {
    if (day.type === 'FBW') {
      day.exercises.forEach((ex, idx) => {
        planRows.push([
          idx === 0 ? `${day.dayNamePolish} - ${day.title}` : '',
          idx === 0 ? day.type : '',
          idx === 0 ? day.subtitle : '',
          ex.name,
          ex.muscleGroup,
          ex.plannedSets,
          ex.targetRepsRange,
          ex.targetRPE,
          ex.targetRIR,
          ex.hyroxRelevance,
        ]);
      });
    } else if (day.type === 'RUNNING_HIIT' && day.runningSession) {
      planRows.push([
        `${day.dayNamePolish} - ${day.title}`,
        'BIEG HIIT',
        day.subtitle,
        `Rozgrzewka: ${day.runningSession.warmup}`,
        'Cardio / Płuca',
        '1',
        '-',
        '7',
        '3',
        day.runningSession.keyCoachingCue,
      ]);
      day.runningSession.intervals.forEach((inv) => {
        planRows.push([
          '',
          '',
          '',
          `Interwał: ${inv.stepName} (${inv.distanceOrTime})`,
          'Cardio / Próg',
          'Serie interwałowe',
          inv.targetIntensity,
          '9',
          '1',
          inv.hyroxSpecifics,
        ]);
      });
    } else if (day.type === 'WEEKEND_HYROX') {
      planRows.push([
        `${day.dayNamePolish} - ${day.title}`,
        'HYROX SPECIFIC',
        day.subtitle,
        'Symulacja zawodów: 8x 1km Bieg + 8 Oficjalnych Stacji Hyrox lub Trening Stacji',
        'Całe Ciało / Silnik Hyrox',
        '8 stacji',
        'Pełen dystans',
        '9.5',
        '0-1',
        'Sprawdzenie tempa, przejść Roxzone i ekonomii poruszania na zawodach',
      ]);
    } else {
      planRows.push([
        `${day.dayNamePolish} - ${day.title}`,
        'REGENERACJA',
        day.subtitle,
        'Mobility, Spacer Zone 1, Foam rolling, Sauna, Regeneracja OUN',
        'Odnowa biologiczna',
        '-',
        '-',
        '4-5',
        '5+',
        'Adaptacja superkompensacyjna i odbudowa glikogenu',
      ]);
    }
  });

  // 2. Data for 'Rozkład_Partii_i_Objętość'
  const volumeRows: any[][] = [
    ['TYGODNIOWY ROZKŁAD SERII NA KAŻDĄ PARTIĘ MIĘŚNIOWĄ (HYROX MEZOCYKL)', '', '', ''],
    [],
    ['Partia Mięśniowa', 'Tygodniowa Liczba Serii Roboczych', 'Rekomendowany Zakres (MEV-MAV)', 'Kluczowe Przełożenie na Hyrox'],
  ];

  MUSCLE_GROUP_VOLUME_TARGETS.forEach((target) => {
    volumeRows.push([
      target.muscleGroup,
      target.weeklySets,
      `${target.minRecommendedSets} - ${target.maxRecommendedSets} serii`,
      target.notes,
    ]);
  });

  // 3. Header for 'Dziennik_Treningowy'
  const logHeaderRows: any[][] = [
    ['Data', 'Dzień Planu', 'Nazwa Ćwiczenia', 'Partia Mięśniowa', 'Nr Serii', 'Ciężar (kg)', 'Powtórzenia', 'Tonaż Objętości (kg)', 'RPE (6-10)', 'RIR (0-4)', 'Notatki & Odczucia'],
  ];

  // 4. Header for 'Hyrox_Symulator_Próby'
  const simHeaderRows: any[][] = [
    ['Data Próby', 'Kategoria', 'Tryb', 'Całkowity Czas', '1km Bieg 1', 'SkiErg 1000m', '1km Bieg 2', 'Sled Push 50m', '1km Bieg 3', 'Sled Pull 50m', '1km Bieg 4', 'Burpee Broad Jumps 80m', '1km Bieg 5', 'Row 1000m', '1km Bieg 6', 'Farmers Carry 200m', '1km Bieg 7', 'Sandbag Lunges 100m', '1km Bieg 8', 'Wall Balls 100/75', 'Roxzone (Strefa Zmian)', 'Notatki'],
  ];

  // Batch update values
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Plan_Tygodniowy!A1',
          values: planRows,
        },
        {
          range: 'Rozkład_Partii_i_Objętość!A1',
          values: volumeRows,
        },
        {
          range: 'Dziennik_Treningowy!A1',
          values: logHeaderRows,
        },
        {
          range: 'Hyrox_Symulator_Próby!A1',
          values: simHeaderRows,
        },
      ],
    }),
  });
}

/**
 * Appends workout log entries to the 'Dziennik_Treningowy' sheet.
 */
export async function appendWorkoutLogsToSheet(
  spreadsheetId: string,
  entries: WorkoutLogEntry[]
): Promise<boolean> {
  if (entries.length === 0) return true;
  const token = await ensureToken();

  const rows = entries.map((e) => {
    const combinedNotes = [
      e.notes?.trim(),
      e.sessionNotes?.trim() ? `[Ogólne: ${e.sessionNotes.trim()}]` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    return [
      e.dateStr || new Date().toLocaleDateString('pl-PL'),
      e.dayTitle,
      e.exerciseName,
      e.muscleGroup,
      e.setNumber,
      e.weightKg,
      e.reps,
      e.tonnageKg,
      e.rpe,
      e.rir,
      combinedNotes,
    ];
  });

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dziennik_Treningowy!A:K:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Nie udało się zapisać serii w arkuszu: ${errText}`);
  }

  return true;
}

/**
 * Appends a completed Hyrox Trial split result to 'Hyrox_Symulator_Próby'
 */
export async function appendHyroxTrialToSheet(
  spreadsheetId: string,
  trial: HyroxRaceTrial
): Promise<boolean> {
  const token = await ensureToken();

  // Find splits by station
  const getSplitTime = (key: string) => {
    const s = trial.splits.find((x) => x.stationKey === key);
    return s ? s.formattedTime : '-';
  };

  const row = [
    trial.date,
    trial.category.toUpperCase(),
    trial.mode,
    trial.formattedTotalTime,
    getSplitTime('run_1'),
    getSplitTime('skierg'),
    getSplitTime('run_2'),
    getSplitTime('sled_push'),
    getSplitTime('run_3'),
    getSplitTime('sled_pull'),
    getSplitTime('run_4'),
    getSplitTime('burpees'),
    getSplitTime('run_5'),
    getSplitTime('rowing'),
    getSplitTime('run_6'),
    getSplitTime('farmers_carry'),
    getSplitTime('run_7'),
    getSplitTime('sandbag_lunges'),
    getSplitTime('run_8'),
    getSplitTime('wall_balls'),
    getSplitTime('roxzone'),
    trial.notes || 'Dobra próba startowa',
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Hyrox_Symulator_Próby!A:V:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Nie udało się zapisać próby Hyrox w arkuszu: ${errText}`);
  }

  return true;
}
