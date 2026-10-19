# Garmin-Style Set/Rest Timer, Hybrid Workout Engine & Advanced Progression

System rozszerzenia platformy treningowej o profesjonalny stoper serii i przerw w stylu Garmin z powiadomieniami dźwiękowymi, hybrydowy silnik ćwiczeń (biegi, stacje Hyrox, interwały z jednostkami kg/lb/km/m, tempo, tętno HR) oraz rozszerzoną analitykę progresji.

## User Review & Critical Decisions

> [!IMPORTANT] Podsumowanie decyzji projektowych potwierdzonych w fazie pytań i odpowiedzi:

- **Struktura ćwiczeń hybrydowych**: Elastyczny typ ćwiczenia w ramach jednej jednostki (`STRENGTH`, `RUNNING`, `HYROX_STATION`, `INTERVAL_CARDIO`), umożliwiający dowolne przeplatanie np. 8x 1km biegu z 8 stacjami Hyrox lub ćwiczeniami siłowymi CrossFit.
- **Działanie stopera serii (Garmin Lap Engine)**: Jeden duży, ergonomiczny przycisk "Lap / Następna seria". W trakcie serii tło/licznik świeci na biało (wysoki kontrast aktywnej pracy), w trakcie przerwy przełącza się na głęboką czerń z odliczaniem zaplanowanego odpoczynku.
- **Alert odpoczynku**: Po osiągnięciu zdefiniowanego czasu przerwy aplikacja emituje wyraźny wizualny alert oraz sygnał dźwiękowy (syntezowany Web Audio API) informujący o gotowości do kolejnej serii, z możliwością wcześniejszego rozpoczęcia.
- **Jednostki i parametry kondycyjne**: Pełne wsparcie dla wyboru jednostek (`kg`, `lb`, `km`, `m`), z polami na docelowe tempo (np. `4:20 min/km`), docelowe tętno HR (bpm / strefa) oraz czas pracy.

---

## 1. Overview & Core Concept

Aplikacja przekształca modal aktywnego treningu w profesjonalny pulpit sportowy:
1. **Garmin Dual-Timer Experience**: Obok nadrzędnego zegara całej sesji, aktywny jest dynamiczny stoper serii/odpoczynku. Po kliknięciu "Lap" zatwierdzana jest seria, licznik natychmiast zeruje się i przechodzi w tryb przerwy (czarny ekran, odliczanie). Po upłynięciu zadanego czasu odpoczynku odzywa się sygnał dźwiękowy (beep) i alert ekranowy.
2. **Hybrydowy edytor stacji & jednostek**: Przy tworzeniu i edycji ćwiczeń użytkownik wybiera dyscyplinę: siła (kg/lb, powtórzenia, RIR/RPE), bieg lub kardio (km/m, tempo, tętno HR, czas) oraz czas odpoczynku (między seriami i przed kolejnym ćwiczeniem).
3. **Szczegółowa analityka i progresja**: Każda seria zapisuje dokładny czas trwania (Time-under-Tension) oraz czas odpoczynku, zasilając wykresy w zakładce Podsumowanie i Statystyki.

---

## 2. User Experience & Visual Design

### Ergonomia pulpitu treningowego (Mobile & Desktop)
- **Garmin Lap Deck**:
  - **Faza Serii (Active Work)**: Wyświetlacz o wysokim kontraście (`bg-white text-zinc-950 shadow-inner`), duży cyfrowy zegar `00:34`, etykieta `"SERIA 2 / 4 - W TOKU"`.
  - **Faza Przerwy (Rest Interval)**: Głęboka czerń (`bg-zinc-950 text-amber-400 border border-zinc-800`), zegar odliczający do zera lub liczący w górę po przekroczeniu celu, wskaźnik zaplanowanego odpoczynku (np. `Cel: 90s`).
  - **Przycisk Główny Lap**: Wielki, dotykowy przycisk o wysokości min. 56px (`min-h-[56px] w-full text-base font-bold active:scale-[0.98]`), intuicyjny do tapnięcia spoconym kciukiem.
- **Audio & Visual Alerts**:
  - Dwu-tonowy czysty sygnał Web Audio API (`880Hz -> 1320Hz`) nie wymagający ładowania zewnętrznych plików mp3.
  - Pulsująca subtelna ramka ostrzegawcza z napisem `"Koniec przerwy! Czas na serię"`.
- **Karty ćwiczeń biegowych & stacji**:
  - Dedykowane pola dla biegów: Dystans z przełącznikiem `km` / `m`, tempo min/km, tętno docelowe bpm (np. 165 bpm).
  - Przejrzyste plakietki dyscyplin bez zbędnych static-pill badge sandwiches.

---

## 3. Key Product Decisions & Trade-Offs

- **Web Audio API zamiast plików MP3**:
  - *Dlaczego*: Zapewnia natychmiastowy, bezopóźnieniowy dźwięk bez ryzyka błędu 404 w hermetycznym środowisku i działa bezpośrednio w przeglądarce po pierwszej interakcji użytkownika.
- **Jednolita struktura ćwiczenia hybrydowego (`Exercise`)**:
  - *Dlaczego*: Rozszerzenie istniejącego interfejsu `Exercise` o opcjonalne pola (`exerciseType`, `unit`, `targetDistance`, `targetPace`, `targetHR`, `restBetweenSetsSec`, `restAfterExerciseSec`) pozwala na zachowanie wstecznej kompatybilności z dotychczasowymi planami i bazą ćwiczeń, jednocześnie odblokowując pełną swobodę w sesjach Hyrox/CrossFit.
- **Niezależne śledzenie serii**:
  - *Dlaczego*: Każda zakończona seria rejestruje metadane `{ setNumber, weightKg, reps, durationSec, restDurationSec, completedAt }`, co pozwala wygenerować zaawansowane wykresy tempa sesji.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APLIKACJA TRENINGOWA                          │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│    KREATOR / PLAN        │    WORKOUT LOGGER       │   PODSUMOWANIE    │
│  - Jednostki (kg/lb/km/m)│  - Główny stoper sesji  │  - Kalendarz Dni  │
│  - Typ: siła/bieg/hyrox  │  - Garmin Lap Timer     │  - Rozbicie serii │
│  - Konfiguracja przerw   │    * Biały tryb serii   │  - Czasy przerw   │
│  - Tempo i tętno HR      │    * Czarny tryb rest   │  - Analiza tempa  │
│                          │  - Sygnał Web Audio     │                   │
└────────────┬─────────────┴────────────┬────────────┴─────────┬─────────┘
             │                          │                      │
             ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        STAN I PERSYSTENCJA                             │
│   • types/hyrox.ts: Extended Exercise, SetLogDetail, RestTimerConfig   │
│   • components/WorkoutLoggerModal: Dual-timer Garmin Engine            │
│   • components/ExerciseEditorModal: Hybrid inputs (m/km/pace/HR/rest)  │
│   • components/SummaryCalendarView: Session breakdown & Time stats    │
└────────────────────────────────────────────────────────────────────────┘
```

### Plan Wdrożenia:
1. **Rozszerzenie typów (`src/types/hyrox.ts`)**:
   - `ExerciseType`: `'STRENGTH' | 'RUNNING' | 'HYROX_STATION' | 'INTERVAL_CARDIO' | 'MOBILITY'`
   - `ExerciseUnit`: `'kg' | 'lb' | 'km' | 'm'`
   - Pola w `Exercise`: `restBetweenSetsSec?: number`, `restAfterExerciseSec?: number`, `targetDistance?: number`, `distanceUnit?: 'km' | 'm'`, `targetPace?: string`, `targetHR?: number`, `exerciseType?: ExerciseType`.
   - Pola w `WorkoutLogSet`: `setDurationSec?: number`, `restDurationSec?: number`.
2. **Garmin Lap Timer & Audio Engine w `WorkoutLoggerModal.tsx`**:
   - Stan fazy: `'WORK'` (białe tło) vs `'REST'` (czarne tło).
   - Zegar serii i odpoczynku z przyciskiem `Lap`.
   - Moduł syntezy dźwięku Web Audio API uruchamiany przy osiągnięciu zaplanowanego czasu odpoczynku.
   - Płynny alert wizualny na ekranie.
3. **Edytor ćwiczeń i konfiguracja przerw**:
   - Umożliwienie definiowania przerw (sekundy/minuty) oraz parametrów biegowych (dystans, tempo, tętno HR) przy dodawaniu i edycji ćwiczeń w planie oraz w sesjach hybrydowych.
4. **Wizualizacja statystyk serii i odpoczynku**:
   - Wyświetlanie średniego czasu serii, sumy czasu przerw i tempa regeneracji w podsumowaniu treningu oraz w widoku kalendarza.
