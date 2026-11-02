# Pełna migracja na Firebase Auth, Cloud Firestore oraz Eksport Treningów (CSV/Excel)

Kompleksowy plan przejścia z lokalnego magazynu przeglądarki (`localStorage`) na bezpieczną, zsynchronizowaną chmurę Firebase (Google Auth + Firestore) z obsługą trybu offline, automatyczną migracją danych istniejącego użytkownika, strategią "Cloud First" oraz narzędziem do eksportu historii treningów do pliku CSV/Excel (gotowe do wdrożenia na Vercel).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Zgodnie z zaakceptowanymi wytycznymi wdrożono 3 kluczowe zasady bezpieczeństwa i spójności danych:
> 1. **Bezpieczne czyszczenie po migracji (`isMigrated`)**: Po pomyślnym przesłaniu danych lokalnych do Firestore, `localStorage` zostaje oczyszczony z surowych danych i oznaczony flagą `hyrox_is_migrated_${userId}: true`. Eliminuje to jakiekolwiek ryzyko ponownego importu lub duplikacji wpisów przy kolejnych sesjach.
> 2. **Strategia "Cloud First" (Rozwiązywanie konfliktów)**: Jeśli w chmurze Firebase pod kontem danego użytkownika istnieją już jakiekolwiek cykle lub logi (np. zalogowanie na nowym telefonie, na którym użytkownik wstępnie coś klikał), lokalne dane z `localStorage` są bezwzględnie ignorowane i czyszczone. Dane w chmurze Firestore stanowią bezwzględne i jedyne źródło prawdy. Migracja z `localStorage` następuje WYŁĄCZNIE wtedy, gdy konto użytkownika w chmurze jest w 100% puste.
> 3. **Gotowość produkcyjna pod Vercel (`.env.example`)**: Utworzenie kompletnego pliku `.env.example` z prefiksem `VITE_FIREBASE_*` (API Key, Auth Domain, Project ID, Storage Bucket, Messaging Sender ID, App ID). Kod w `src/firebase.ts` będzie obsługiwał hybrydowo zmienne środowiskowe `import.meta.env` z bezpiecznym fallbackiem na `firebase-applet-config.json`.

---

### 1. Overview & Core Concept

- **Cel**: Zastąpienie nietrwałego magazynu `localStorage` wieloplatformową chmurą Firebase Firestore powiązaną z kontem Google użytkownika, zapewniając synchronizację między urządzeniami (telefon, tablet, komputer), pełne bezpieczeństwo danych oraz eksport analityczny.
- **Dla kogo**: Sportowcy dyscyplin siłowo-wytrzymałościowych (hybrydowi, Hyrox, trójbój/kulturystyka), dla których utrata historii tonażu, szacowanych 1RM i czasów biegu jest niedopuszczalna.
- **Kluczowa wartość**: Niezawodność danych, automatyczny backup w chmurze Google, możliwość przełączania urządzeń w trakcie treningu oraz suwerenność danych (eksport do arkusza kalkulacyjnego w dowolnym momencie).

---

### 2. User Experience & Visual Design

- **Ekran logowania (Auth Wall)**:
  - Gdy użytkownik nie jest zalogowany (`user === null` po zakończeniu inicjalizacji Firebase Auth), aplikacja wyświetla estetyczny, pełnoekranowy widok powitalny.
  - Spójny z ciemnym motywem aplikacji (`bg-neutral-950`, akcenty `amber-400`, głębokie szarości `neutral-900/80` i obramowania `border-neutral-800`).
  - Wyraziste logo marki treningowej, krótki podpis informujący o funkcjach (hybrydowy trening, RIR/RPE, analityka MEV/MAV, Hyrox).
  - Wygodny przycisk logowania jednym kliknięciem: *"Zaloguj się przez Google"* z oficjalną ikoną Google SVG i stanem ładowania (`spinner`).
- **Płynne przejście po zalogowaniu & Strategia "Cloud First"**:
  - Aplikacja weryfikuje stan chmury:
    - Jeśli konto w chmurze ma dane -> wczytanie chmury, wyczyszczenie lokalnego śmiecia.
    - Jeśli konto w chmurze jest puste, a w `localStorage` są dane i brak flagi migracji -> jednorazowy zapis do chmury, wyczyszczenie `localStorage` i ustawienie flagi migracji.
  - Po zalogowaniu natychmiastowe wyświetlenie aktywnego treningu.
- **Profil i Wylogowanie w widoku "Więcej"**:
  - Karta konta użytkownika: zdjęcie profilowe (Google avatar), imię/nazwisko, adres e-mail oraz przycisk wylogowania (`Wyloguj się`).
- **Przycisk i modal Eksportu (CSV/Excel)**:
  - W widoku *"Więcej"* -> sekcja Dane i Kopia zapasowa.
  - Przycisk *"Eksportuj historię treningów (Excel/CSV)"* z ikoną pobierania.
  - Natychmiastowe wygenerowanie pliku o nazwie np. `treningi_hyrox_eksport_YYYY-MM-DD.csv` zawierającego kolumny:
    `Data; Tydzień; Dzień; Ćwiczenie; Kategoria; Partia mięśniowa; Seria; Ciężar [kg]; Powtórzenia; Tonaż [kg]; RIR; RPE; Tempo/Dystans; Tętno [bpm]; Czas przerwy [s]; Notatka`.

---

### 3. Key Product Decisions & Trade-Offs

- **Struktura bazy danych (Ścieżka `users/{userId}/...`)**:
  - *Wybrane podejście*: Hierarchiczna struktura kolekcji w Cloud Firestore:
    - `users/{uid}` – metadane użytkownika, aktywny identyfikator cyklu (`activeCycleId`), ustawienia motywu, data ostatniej synchronizacji.
    - `users/{uid}/cycles/{cycleId}` – poszczególne cykle treningowe (np. Masa 2026, Hyrox, Redukcja) z pełnymi mapami tygodni i ćwiczeniami.
    - `users/{uid}/workout_logs/{logId}` – poszczególne zrealizowane serie/treningi (zapobiega przekroczeniu limitu 1MB na dokument w miarę lat treningu).
    - `users/{uid}/recovery/{dateStr}` – codzienne wskaźniki regeneracji.
  - *Dlaczego*: Skalowalność bez limitu 1MB, izolacja danych na poziomie reguł bezpieczeństwa Firestore (`request.auth.uid == userId`), szybkie kwerendy i stronicowanie.
- **Offline Persistence w Firestore**:
  - *Wybrane podejście*: Konfiguracja `initializeFirestore(app, { localCache: persistentLocalCache(...) })`.
  - *Dlaczego*: Treningi na siłowniach w piwnicach lub halach bez zasięgu nie ulegną przerwaniu. Aplikacja zapisze serie w lokalnej bazie IndexedDB i prześle je do chmury w tle po odzyskaniu sygnału.
- **Generowanie CSV vs XLSX**:
  - *Wybrane podejście*: Czysty standard CSV z kodowaniem UTF-8 BOM (`\uFEFF`) i średnikami jako separatorami.
  - *Dlaczego*: Zerowy narzut na wagę bundle'a aplikacji (brak 500 KB biblioteki SheetJS), natychmiastowe otwarcie w Microsoft Excel, Apple Numbers i Google Sheets z prawidłowymi polskimi znakami.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          REACT APPLICATION                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐               ┌──────────────────────────┐   │
│   │   AuthContext.tsx   │               │   Firestore Data Hooks   │   │
│   │  (Google Sign-In)   │               │   & Real-time Listeners  │   │
│   └──────────┬──────────┘               └────────────┬─────────────┘   │
│              │                                       │                 │
│              ▼                                       ▼                 │
│   ┌─────────────────────┐               ┌──────────────────────────┐   │
│   │   LoginGate / App   │               │ Firestore Service Layer  │   │
│   │  (Protected Views)  │               │   (Cloud-First Engine)   │   │
│   └─────────────────────┘               └────────────┬─────────────┘   │
│                                                      │                 │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │
                                                       ▼
                                          ┌──────────────────────────┐
                                          │     CLOUD FIRESTORE      │
                                          │   (users/{uid}/...)      │
                                          │   + IndexedDB Cache      │
                                          └──────────────────────────┘
```

#### Plan kroków wdrożeniowych:

1. **Plik środowiskowy `.env.example` & konfiguracja Firebase (`src/firebase.ts`)**:
   - Wygenerowanie `.env.example` ze wszystkimi zmiennymi dla Vercela:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
   - W `src/firebase.ts`: pobieranie zmiennych z `import.meta.env` z fallbackiem na `firebase-applet-config.json`.
   - Inicjalizacja `auth` i `db` z obsługą `persistentLocalCache()`.
   - Implementacja standardowego `handleFirestoreError`.

2. **Kontekst autoryzacji (`src/context/AuthContext.tsx`)**:
   - `AuthProvider`, `useAuth` hook: stan `user`, `loading`, metody `signInWithGoogle` i `signOutUser`.

3. **Ekran logowania (`src/components/auth/LoginView.tsx`)**:
   - Estetyczny interfejs blokujący dostęp niezalogowanym użytkownikom.
   - Informacje o korzyściach synchronizacji, przycisk Google Sign-In.

4. **Serwis Firestore z logiką "Cloud First" i bezpieczną migracją (`src/services/firestoreService.ts`)**:
   - `initUserData(userId)`:
     - Krok 1: Sprawdź czy użytkownik ma cykle w Firestore.
     - Krok 2: Jeśli MA dane w Firestore -> wyczyść `localStorage`, oznacz `hyrox_is_migrated_${userId} = true`, załaduj dane z Firestore.
     - Krok 3: Jeśli NIE MA danych w Firestore -> sprawdź `localStorage`. Jeśli są lokalne dane i brak flagi migracji -> przenieś je do Firestore, po sukcesie wyczyść dane lokalne i zapisz flagę migracji. Jeśli w `localStorage` też pusto -> załaduj `DEFAULT_TRAINING_CYCLES`.
   - Subskrypcje i metody zapisu: `subscribeToCycles`, `saveCycle`, `deleteCycle`, `subscribeToWorkoutLogs`, `saveWorkoutLogsBatch`, `deleteWorkoutLogEntry`, `subscribeToRecovery`, `saveRecoveryEntry`.

5. **Integracja w `src/App.tsx`**:
   - Podpięcie `useAuth()` i opakowanie w `LoginView` gdy brak zalogowanego użytkownika.
   - Zastąpienie bezpośrednich odczytów `localStorage` asynchroniczną synchronizacją z Firestore.
   - Dodanie wskaźnika synchronizacji w nagłówku/profilu.

6. **Eksport do CSV (`src/utils/exportUtils.ts`) i UI w `MoreMenuView.tsx`**:
   - Funkcja `exportWorkoutLogsToCSV(workoutLogs)`.
   - Obsługa kodowania UTF-8 z BOM (`\uFEFF`), separator średnik `;`.
   - Dodanie kafelka / przycisku w zakładce "Więcej".

7. **Reguły Firestore (`firebase-blueprint.json` i `firestore.rules`)**:
   - Definicja schematu w `firebase-blueprint.json`.
   - Reguły `firestore.rules` zabezpieczające kolekcje użytkownika (`request.auth.uid == userId`).
   - Weryfikacja poprawności reguł i kodu (`compile_applet`, `lint_applet`).
