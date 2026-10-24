# ⚡ Fitness Monitor — Hybrid Athletic Performance & Volume Engine

<div align="center">

![Fitness Monitor](https://img.shields.io/badge/Fitness%20Monitor-v2.0-F59E0B?style=for-the-badge&logo=target&logoColor=black)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-10B981?style=for-the-badge&logo=pwa&logoColor=white)

**Zaawansowany system programowania, periodyzacji i monitoringu treningu hybrydowego w czasie rzeczywistym.**  
*Łączy autoregulację hipertroficzną (RPE/RIR, tonaż, MEV/MAV) z dyscypliną wytrzymałościową HYROX i biegami interwałowymi.*

[Funkcjonalności](#-kluczowe-funkcjonalności) • [Dla kogo](#-dla-kogo) • [Architektura & Tech Stack](#-tech-stack) • [Instalacja](#-instalacja-i-uruchomienie) • [Roadmap](#-roadmap)

</div>

---

## 📌 O projekcie

Większość dostępnych aplikacji fitnessowych zmusza sportowców do kompromisu: albo służą wyłącznie jako proste kalkulatory serii i powtórzeń na siłowni, albo koncentrują się na śledzeniu tras GPS dla biegaczy. **Fitness Monitor** rozwiązuje problem tzw. *zjawiska interferencji (concurrent training)* u sportowców hybrydowych.

Aplikacja przenosi koncepcje periodyzacji znane ze sportu zawodowego bezpośrednio na smartfon lub desktop:
- **Naukowe zarządzanie objętością:** Automatyczne przeliczanie serii bezpośrednich i pośrednich w odniesieniu do progów **MEV** (*Minimum Effective Volume*), **MAV** (*Maximum Adaptive Volume*) oraz **MRV** (*Maximum Recoverable Volume*).
- **Elastyczna autoregulacja:** Sterowanie obciążeniem przez pryzmat **RIR** (*Reps in Reserve*) i **RPE** (*Rate of Perceived Exertion*).
- **Jednolita integracja wytrzymałości:** Pełna analityka sesji biegowych, progów tętna (HR) i tempa interwałów obok tradycyjnego tonażu siłowego.

---

## 🚀 Kluczowe funkcjonalności

### ⏱️ 1. Tryb Live Workout & Ergonomia Stopera
* **Zintegrowany panel treningowy:** Stoper czasu łącznego, czasu trwania serii (Time Under Tension) oraz automatycznego odliczania przerw między seriami z sygnałami dźwiękowymi i haptycznymi.
* **Brak efektu Scroll Trap:** Zunifikowany kontener przewijania (`overscroll-contain`) zoptymalizowany pod ekrany mobilne, uniemożliwiający przypadkowe blokowanie gestów.
* **Minimalistyczny HUD:** Dynamiczne odhaczanie serii, podgląd poprzednich wyników z danego ćwiczenia oraz natychmiastowe przeliczanie tonażu bieżącej sesji.
* **Bezpieczna minimalizacja:** Możliwość zminimalizowania aktywnego treningu do podręcznego paska i jednoczesnego przeglądania historii lub kalendarza bez utraty danych stopera.

### 📈 2. Programowanie Mezocykli & Inteligentne Kopiowanie
* **Zarządzanie mikro- i mezocyklami:** Definiowanie faz treningowych (Baza, Akumulacja, Intensyfikacja, Peak, Deload) z docelowymi zakresami intensywności.
* **Mnożnik Objętości (1.0x – 1.5x):** Narzędzie automatycznie skalujące liczbę zaplanowanych serii roboczych dla każdego ćwiczenia (np. `1.25x` dodaje 25% serii roboczych z zachowaniem parametrów).
* **Automatyczna Progresja Ciężaru (+ kg):** Inteligentny algorytm aplikujący mikro-progresję liniową (np. `+2.5 kg`) do wszystkich serii ćwiczeń oporowych z automatycznym wykluczeniem segmentów biegowych/cardio.
* **Wizualna weryfikacja realizacji:** 3-stopniowy status ukończenia dnia (Nierozpoczęty / W trakcie / Ukończony) oparty na 100% zrealizowanych seriach.

### 🧬 3. Matryca Objętości Mięśniowej (Volume Matrix)
* **Precyzyjny podział anatomiczny:** Rozliczanie serii dla 10+ głównych partii mięśniowych z uwzględnieniem zaangażowania asystującego (serie pośrednie / secondary groups).
* **Wskaźniki stref adaptacji:** Graficzna prezentacja statusu regeneracji i bodźca w oparciu o modele periodyzacji hipertroficznej.
* **Statystyki czasowe sesji:** Monitorowanie proporcji czystej pracy do przerw wypoczynkowych oraz średniego tempa treningu.

### 🏃 4. Kategoryzacja Siła vs Cardio & Moduł HYROX
* **Klarowny podział w analityce:** Ćwiczenia biegowe i interwałowe są automatycznie separowane od tonażu siłowego i grupowane w dedykowanej sekcji Wytrzymałość/Cardio.
* **Specyficzne metryki dla biegaczy:** Zastąpienie RPE i kilogramów wskaźnikami tempa (`min/km`), dystansu (`m/km`) oraz stref tętna (`bpm`).
* **Kalkulator stacji Hyrox:** Moduł szacowania czasów i optymalizacji przejść dla konkurencji takich jak SkiErg, Sled Push/Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges i Wall Balls.

### 📊 5. Rzeczywista Progresja & Szacowanie 1RM
* **Wielowymiarowe wykresy Recharts:** Trendy maksymalnego ciężaru, szacowanego 1RM oraz objętości tonażowej w ujęciu tygodniowym i miesięcznym.
* **Naukowe wzory szacowania rekordu:** Wyliczanie 1RM oparte na sprawdzonych formułach (Brzycki, Epley, Lander).
* **Zaawansowane filtrowanie:** Szybka analiza z podziałem na partię mięśniową oraz okno czasowe (od 2 tygodni do całego cyklu rocznego).

### 📅 6. Kalendarz Aktywności w Stylu Strava & Chmura
* **Siatka aktywności (Activity Feed):** Czytelny przegląd zrealizowanych jednostek treningowych z kategoryzacją kolorystyczną dyscyplin.
* **Dwukierunkowa integracja z Google Sheets:** Eksport i import dziennika treningowego bezpośrednio do własnego arkusza kalkulacyjnego Google bez konieczności instalowania zewnętrznych baz danych.
* **Eksport i Import JSON:** Pełna suwerenność danych — lokalny backup całego planu, historii serii oraz szablonów treningowych.

---

## 🎯 Dla kogo

| Grupa docelowa | Kluczowa korzyść w aplikacji |
| :--- | :--- |
| **Zawodnicy HYROX & DEKA** | Monitorowanie obciążeń siłowych bez utraty świeżości biegowej i tempa progowego. |
| **Sportowcy Hybrydowi** | Równoległe rozwijanie siły absolutnej i wydolności tlenowej bez syndromu przetrenowania. |
| **Kulturyści & Trójboiści** | Autoregulacja RPE/RIR, pilnowanie progów MEV/MRV i precyzyjne odhaczanie serii w czasie rzeczywistym. |
| **Trenerzy Personalni** | Możliwość generowania szablonów mezocykli i szybkiego eksportu postępów podopiecznych do Google Sheets. |

---

## 🛠 Tech Stack

Aplikacja została zbudowana zgodnie z paradygmatem nowoczesnego, ultra-szybkiego frontendu bez narzutu ciężkich frameworków serwerowych:

* **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tooling:** [Vite 5](https://vitejs.dev/) (natywne moduły ESM, błyskawiczny build)
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (system motywów Dark/Light, zaawansowana ergonomia mobilna)
* **Wizualizacja Danych:** [Recharts 3](https://recharts.org/) (responsywne wykresy wektorowe SVG)
* **Interakcja & Drag-and-Drop:** [@dnd-kit](https://dndkit.com/) (przeciąganie i sortowanie ćwiczeń na urządzeniach dotykowych)
* **Ikony & UI Micro-interactions:** [Lucide React](https://lucide.dev/) + [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
* **PWA Engine:** Service Worker, Web App Manifest, instalowalność natywna na iOS & Android

---

## 💻 Instalacja i Uruchomienie

### Wymagania wstępne
* [Node.js](https://nodejs.org/) v18.0.0 lub nowszy
* Menedżer pakietów `npm` (lub `yarn` / `pnpm`)

### 1. Klonowanie repozytorium
```bash
git clone https://github.com/SportyScripter/fitness-monitor-app
cd fitness-monitor
```

### 2. Instalacja zależności
```bash
npm install
```

### 3. Uruchomienie środowiska deweloperskiego
```bash
npm run dev
```
Aplikacja uruchomi się pod adresem: `http://localhost:3000` (lub innym porcie wskazanym przez Vite).

### 4. Budowanie wersji produkcyjnej
```bash
npm run build
```
Zbudowane, zoptymalizowane pliki produkcyjne znajdą się w katalogu `/dist`.

---

## 🗺 Roadmap

Projekt jest stale rozwijany z naciskiem na funkcjonalności wspierające zaawansowany sport hybrydowy:

- [x] Tryb aktywnego stopera z obsługą sesji biegowych i siłowych
- [x] Matryca objętości partii mięśniowych z progami MEV/MAV/MRV
- [x] Inteligentny mnożnik objętości i progresja ciężaru w kreatorze tygodnia
- [x] Synchronizacja z Google Sheets v4 API
- [ ] **Strava API Integration:** Automatyczne pobieranie aktywności biegowych i interwałowych GPS
- [ ] **Wearable Sync:** Bezpośredni odczyt tętna z pasów Bluetooth (BLE Polar/Garmin)
- [ ] **Kalkulator Zmęczenia OUN:** Predyktor gotowości centralnego układu nerwowego na podstawie HRV
- [ ] **Eksport sesji do Garmin Connect (.FIT / .TCX)**

---

## 📄 Licencja

Projekt dystrybuowany na licencji MIT. Szczegółowe informacje w pliku [LICENSE](LICENSE).

<div align="center">
  <sub>Stworzone z pasją dla sportowców hybrydowych. 🏃‍♂️🏋️‍♂️</sub>
</div>
