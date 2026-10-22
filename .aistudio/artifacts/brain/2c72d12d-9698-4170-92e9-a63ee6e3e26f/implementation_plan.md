# Plan Wdrożenia: Mobilne Usprawnienia UX/UI i Ergonomia iOS

Kompleksowy plan wdrożenia 7 kluczowych poprawek interfejsu i ergonomii w mobilnej aplikacji treningowej, eliminujący specyficzne problemy systemu iOS (auto-zoom, obsługa klawiatury numerycznej z przecinkiem, overscroll paska nawigacji) oraz wprowadzający profesjonalne nazewnictwo partii mięśniowych i zaawansowaną zmianę kolejności ćwiczeń drag & drop.

## Decyzje z Użytkownikiem (Potwierdzone)

> [!IMPORTANT]
> - **Aktywacja Drag & Drop ćwiczeń**: Dedykowany uchwyt chwytu (`GripVertical`) umieszczony po lewej stronie karty ćwiczenia, zapobiegający konfliktom z pionowym przewijaniem strony na ekranach dotykowych.
> - **Sygnalizacja błędu mnożnika**: Wyraźny czerwony komunikat błędu pod polem tekstowym oraz zablokowany przycisk zatwierdzający formularz (`disabled={!isValidMultiplier}`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHITEKTURA ROZWIĄZANIA                        │
└────────────────────────────────────────────────────────────────────────┘

    index.html
        └── <meta name="viewport" ... maximum-scale=1, user-scalable=0>
               │
               ▼
    useScrollDirection Hook
        └── Warunek overscrollu: window.innerHeight + scrollY >= scrollHeight - 10
               │
               ▼
    CycleEditView (Edycja Planu)
        ├── DndContext + SortableContext (uchwyt dotykowy GripVertical)
        ├── Fallback: Przyciski strzałek góra/dół (przestawianie w tablicy)
        └── Edycja Tygodnia (inputMode="decimal", przecinek -> kropka, walidacja 1.0 - 1.5)
               │
               ▼
    Modale (ExerciseEditModal, AddWeekModal, DaySettingsModal, WorkoutLoggerModal)
        ├── pb-24 / pb-28 na przewijanych kontenerach (dostępność przycisków nad BottomNav)
        ├── Inputy tekstowe z inputMode="decimal" i stanem dopuszczającym pusty string ""
        └── Profesjonalna lista 9 partii mięśniowych
```

---

## 1. Zakres Zmian w Podziale na Zadania

### Zadanie 1: Edycja kolejności ćwiczeń w planie (Drag & Drop + Fallback)
- **Instalacja bibliotek**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Wdrożenie w `CycleEditView.tsx`**:
  - Konfiguracja `DndContext` z sensorami `TouchSensor` (z `activationConstraint: { delay: 100, tolerance: 5 }` lub aktywacją przez dedykowany uchwyt) oraz `PointerSensor`.
  - Stworzenie dedykowanego sortowalnego kafelka `SortableExerciseItem` z hookiem `useSortable({ id: exercise.id })`.
  - Dodanie uchwytu chwytu `GripVertical` z atrybutami `{...listeners}` i `{...attributes}` zoptymalizowanymi pod dotyk (`touch-none`).
  - Dodanie przycisków strzałek (góra/dół) jako bezdotykowego fallbacku, zmieniających indeksy ćwiczenia w tablicy `selectedDay.exercises` za pomocą `onUpdateDay`.

### Zadanie 2: Edycja tygodnia – obsługa liczb po przecinku na mobile
- Zmiana inputów w `AddWeekModal.tsx` i w sekcji parametrów tygodnia `CycleEditView.tsx`:
  - Zastąpienie `<input type="number">` formatem:
    ```tsx
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      ...
    />
    ```
  - W obsłudze zdarzenia `onChange`:
    - Normalizacja znaków: `const normalized = e.target.value.replace(',', '.');`
    - Walidacja regex dopuszczająca stan przejściowy (pusty ciąg `""`, pojedyncza kropka `.` lub częściowo wpisana liczba).
    - Bezpieczne parsowanie wartości bez wymuszania natychmiastowego resetowania do 0 przy czyszczeniu pola.

### Zadanie 3: Poprawa widoku scrollowanych modali (Padding dolny)
- Dodanie klas Tailwind `pb-28` lub `pb-24` (oraz uwzględnienie `env(safe-area-inset-bottom)`) do głównych przewijanych kontenerów w modalach:
  - `ExerciseEditModal.tsx`
  - `AddWeekModal.tsx`
  - `DaySettingsModal.tsx`
  - `DayEditorModal.tsx`
  - `CopyWorkoutModal.tsx`
  - `WorkoutLoggerModal.tsx`
- Zapewnienie, że przyciski zapisu oraz ostatnie pola formularzy wysuwają się całkowicie ponad przypięty dolny pasek nawigacyjny (`BottomNavBar` z `z-50`).

### Zadanie 4: Blokada auto-zoomu na urządzeniach iOS
- Aktualizacja pliku `index.html`:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
  ```
- Zapobieganie przybliżaniu widoku w mobilnym Safari podczas focusowania pól input o rozmiarze tekstu poniżej 16px.

### Zadanie 5: Szczegółowy wybór partii mięśniowej (Profesjonalne nazewnictwo)
- Aktualizacja typu TypeScript `MuscleGroup` w `src/types/hyrox.ts`:
  ```typescript
  export type MuscleGroup =
    | 'Klatka piersiowa'
    | 'Plecy'
    | 'Barki'
    | 'Biceps'
    | 'Triceps'
    | 'Czworogłowe uda'
    | 'Dwugłowe uda'
    | 'Łydki'
    | 'Brzuch';
  ```
- Zaktualizowanie stałej `MUSCLE_GROUPS` i selectów w `ExerciseEditModal.tsx` oraz `exerciseCatalog.ts`.
- Dodanie warstwy kompatybilności wstecznej (mapper mapujący stare nazwy, np. `'Klatka Piersiowa (Chest)'` -> `'Klatka piersiowa'`), aby historyczne plany i logi nie generowały błędów.
- Aktualizacja celów objętościowych w `src/data/hyroxPlanData.ts` i `VolumeMatrixView.tsx`.

### Zadanie 6: Ergonomia wpisywania wartości i walidacja mnożnika
- Implementacja stringowego stanu pośredniego (`string | number`) w formularzach, aby użytkownik mógł precyzyjnie postawić kursor i skasować konkretną cyfrę (np. "1.01" -> "1.0" -> "1.05") bez resetu do zera lub utraty kursora.
- Dodanie dedykowanej walidacji dla pola mnożnika objętości:
  - Zakres dopuszczalny: od `1.0` do `1.5`.
  - Wyświetlanie czytelnego czerwonego komunikatu błędu pod polem (`text-red-400 text-xs mt-1`).
  - Blokada przycisku zatwierdzania zapisu (`disabled={!isMultiplierValid}` ze stylami wizualnej nieaktywności `opacity-50 cursor-not-allowed`).

### Zadanie 7: Fix zachowania dolnego paska nawigacji na dole strony (Overscroll / Bounce)
- Aktualizacja hooka `useScrollDirection.ts`:
  - W kalkulacji przewijania: sprawdzenie, czy użytkownik dotarł do krawędzi dołu dokumentu:
    ```typescript
    const isAtBottom =
      window.innerHeight + scrollY >= (document.documentElement.scrollHeight || document.body.offsetHeight) - 15;
    ```
  - Jeśli `isAtBottom === true`, funkcja wstrzymuje automatyczne przełączanie na stan `'up'`, eliminując irytujące rozwijanie paska przy odbiciu elastycznym (bounce) w iOS Safari.

---

## 2. Kolejność Wykonania (Execution Steps)

1. **Krok 1**: Instalacja paczek `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
2. **Krok 2**: Modyfikacja `index.html` (blokada zoomu iOS).
3. **Krok 3**: Aktualizacja `src/hooks/useScrollDirection.ts` (naprawa overscrollu).
4. **Krok 4**: Aktualizacja typów `src/types/hyrox.ts` i katalogu ćwiczeń pod 9 partii mięśniowych z kompatybilnością wsteczną.
5. **Krok 5**: Wdrożenie w `AddWeekModal.tsx` i `CycleEditView.tsx` ergonomicznych pól liczbowych, walidacji mnożnika (1.0 - 1.5) i komunikatów.
6. **Krok 6**: Implementacja drag & drop oraz przycisków góra/dół dla ćwiczeń w `CycleEditView.tsx`.
7. **Krok 7**: Dodanie klas `pb-28` do kontenerów modali (`ExerciseEditModal.tsx`, `AddWeekModal.tsx`, `DaySettingsModal.tsx`, `WorkoutLoggerModal.tsx`).
8. **Krok 8**: Weryfikacja kompilacji i typów (`compile_applet`).
