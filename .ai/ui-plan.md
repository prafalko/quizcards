# Architektura UI dla QuizCards

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji QuizCards została zaprojektowana w celu zapewnienia płynnego i intuicyjnego doświadczenia, od generowania quizu po analizę wyników. Aplikacja opiera się na pięciu głównych widokach: uwierzytelniania, panelu głównego z listą quizów, edycji quizu, rozwiązywania quizu oraz podsumowania wyników.

Struktura ta prowadzi użytkownika krok po kroku przez główny proces: import fiszek z Quizlet, weryfikację i dostosowanie treści wygenerowanej przez AI, a następnie naukę poprzez rozwiązywanie quizu. Architektura jest w pełni zgodna z zaplanowanym REST API, a jej komponentowa natura, oparta na Shadcn/ui, zapewni spójność wizualną i funkcjonalną oraz ułatwi przyszły rozwój. Obsługa stanów ładowania i błędów zapewnia użytkownikowi czytelną informację zwrotną na każdym etapie interakcji.

## 2. Lista widoków

### Widok 1: Logowanie / Rejestracja
- **Nazwa widoku:** Logowanie / Rejestracja (Login / Register View)
- **Ścieżka widoku:** `/login`, `/register`
- **Główny cel:** Uwierzytelnienie użytkownika, umożliwienie dostępu do jego prywatnych quizów.
- **Kluczowe informacje do wyświetlenia:** Formularz logowania (login, hasło), formularz rejestracji (login, hasło), komunikaty o błędach (np. "Użytkownik już istnieje", "Nieprawidłowe dane logowania").
- **Kluczowe komponenty widoku:**
  - Formularz rejestracji/logowania: Uniwersalny komponent zawierający pola `input` dla loginu i hasła, przyciski akcji oraz link do przełączania się między logowaniem a rejestracją.
  - Komponent walidacji: Komponent do wyświetlania błędów walidacji lub odpowiedzi z API.
- **UX, dostępność i względy bezpieczeństwa:**
  - **UX:** Jasne rozróżnienie między logowaniem a rejestracją. Automatyczne przekierowanie do panelu głównego po pomyślnym uwierzytelnieniu.
  - **Dostępność:** Poprawne etykiety dla pól formularza (`<label>`), obsługa nawigacji klawiaturą, odpowiedni kontrast kolorów.
  - **Bezpieczeństwo:** Komunikacja z API przez HTTPS. Hasła nie są przechowywane w stanie aplikacji.

### Widok 2: Panel Główny / Lista Quizów
- **Nazwa widoku:** Panel Główny (Dashboard / Quiz List View)
- **Ścieżka widoku:** `/` lub `/dashboard`
- **Główny cel:** Wyświetlenie wszystkich quizów użytkownika, umożliwienie generowania nowych oraz zarządzanie istniejącymi.
- **Kluczowe informacje do wyświetlenia:** Formularz do generowania quizu z linku Quizlet, lista istniejących quizów (tytuł, liczba pytań), komunikaty o stanie (np. ładowanie, błąd generowania).
- **Kluczowe komponenty widoku:**
  - `QuizGenerationForm`: Pole `input` na adres URL Quizlet, przycisk "Generuj", wskaźnik ładowania.
  - `QuizList`: Kontener na listę quizów. W przypadku braku quizów wyświetla komunikat zachęcający do stworzenia pierwszego.
  - `QuizCard`: Karta reprezentująca pojedynczy quiz, zawierająca jego tytuł, liczbę pytań oraz przyciski akcji: "Rozwiąż", "Edytuj", "Usuń".
  - `ConfirmationDialog`: Okno modalne z prośbą o potwierdzenie przed usunięciem quizu.
- **UX, dostępność i względy bezpieczeństwa:**
  - **UX:** Centralny punkt aplikacji. Szybki dostęp do kluczowych akcji. Jasna informacja zwrotna podczas generowania quizu.
  - **Dostępność:** Przyciski i linki mają zrozumiałe etykiety. Fokus jest zarządzany poprawnie przy otwieraniu okien modalnych.
  - **Bezpieczeństwo:** Wszystkie akcje (pobieranie listy, usuwanie) wymagają uwierzytelnienia i są autoryzowane po stronie serwera.

### Widok 3: Edycja Quizu
- **Nazwa widoku:** Edycja Quizu (Quiz Edit View)
- **Ścieżka widoku:** `/quizzes/:id/edit`
- **Główny cel:** Umożliwienie użytkownikowi przeglądu, modyfikacji i weryfikacji pytań oraz odpowiedzi wygenerowanych przez AI.
- **Kluczowe informacje do wyświetlenia:** Edytowalny tytuł quizu, lista wszystkich pytań z edytowalnymi polami tekstowymi dla pytania i czterech odpowiedzi.
- **Kluczowe komponenty widoku:**
  - `EditableTitle`: Nagłówek `h1`, który po kliknięciu zmienia się w pole `input` do edycji tytułu.
  - `QuestionEditList`: Lista formularzy do edycji poszczególnych pytań.
  - `QuestionEditForm`: Formularz dla jednego pytania, zawierający pole `textarea` dla pytania, cztery pola `input` dla odpowiedzi oraz przyciski: "Generuj odpowiedzi ponownie" i "Usuń pytanie".
  - `SaveChangesBar`: Pasek na górze lub dole strony z przyciskiem "Zapisz", informujący o niezapisanych zmianach.
- **UX, dostępność i względy bezpieczeństwa:**
  - **UX:** Zmiany są zapisywane w sposób wsadowy, co minimalizuje liczbę zapytań do API.
  - **Dostępność:** Wszystkie pola formularzy mają etykiety. Akcje są dostępne z klawiatury.
  - **Bezpieczeństwo:** Użytkownik może edytować tylko swoje quizy (autoryzacja po stronie API). Dane wejściowe są walidowane.

### Widok 4: Rozwiązywanie Quizu
- **Nazwa widoku:** Rozwiązywanie Quizu (Quiz Solving View)
- **Ścieżka widoku:** `/quizzes/:id/play`
- **Główny cel:** Przeprowadzenie użytkownika przez proces odpowiadania na pytania w quizie.
- **Kluczowe informacje do wyświetlenia:** Treść aktualnego pytania, cztery losowo ułożone odpowiedzi do wyboru, wskaźnik postępu (np. "Pytanie 5/20").
- **Kluczowe komponenty widoku:**
  - `QuestionDisplay`: Komponent wyświetlający tekst bieżącego pytania.
  - `AnswerOptions`: Grupa czterech przycisków, z których użytkownik wybiera jedną odpowiedź.
  - `ProgressBar`: Pasek postępu pokazujący, na którym etapie quizu jest użytkownik.
- **UX, dostępność i względy bezpieczeństwa:**
  - **UX:** Interfejs skupiony na zadaniu (odpowiedzi na pytanie), wolny od rozpraszaczy. Płynne przejścia między pytaniami.
  - **Dostępność:** Możliwość wyboru odpowiedzi za pomocą klawiatury (strzałki, spacja).
  - **Bezpieczeństwo:** Identyfikator quizu w URL jest weryfikowany, aby upewnić się, że użytkownik ma do niego dostęp.

### Widok 5: Podsumowanie Wyników
- **Nazwa widoku:** Podsumowanie Wyników (Quiz Results View)
- **Ścieżka widoku:** `/quizzes/:id/results`
- **Główny cel:** Prezentacja wyników po zakończeniu quizu, umożliwiająca analizę błędów.
- **Kluczowe informacje do wyświetlenia:** Wynik procentowy, lista wszystkich pytań z wizualnym oznaczeniem poprawnej odpowiedzi, odpowiedzi udzielonej przez użytkownika oraz odpowiedzi błędnych.
- **Kluczowe komponenty widoku:**
  - `ScoreSummary`: Wyraźnie widoczny komponent z wynikiem procentowym.
  - `ResultsList`: Lista kart z pytaniami i odpowiedziami.
  - `ResultQuestionCard`: Karta dla pojedynczego pytania, pokazująca jego treść oraz wszystkie odpowiedzi z odpowiednim oznaczeniem (np. zielony dla poprawnej, czerwony dla błędnej odpowiedzi użytkownika).
  - `CallToActionButton`: Przycisk zachęcający do powrotu do listy quizów lub rozwiązania quizu ponownie.
- **UX, dostępność i względy bezpieczeństwa:**
  - **UX:** Czytelne i motywujące podsumowanie. Umożliwia szybką naukę na błędach.
  - **Dostępność:** Użycie nie tylko kolorów, ale także ikon lub tekstu do oznaczenia statusu odpowiedzi.
  - **Bezpieczeństwo:** Dostęp do strony wyników jest możliwy tylko po zakończeniu sesji quizu dla danego użytkownika.

## 3. Mapa podróży użytkownika

Główna ścieżka użytkownika (happy path) wygląda następująco:

1.  **Uwierzytelnienie:** Użytkownik loguje się lub rejestruje (`Widok Logowania / Rejestracji`), po czym zostaje przekierowany do `Panelu Głównego`.
2.  **Generowanie:** W `Panelu Głównym` wkleja link do Quizlet i klika "Generuj". Aplikacja pokazuje stan ładowania.
3.  **Weryfikacja i Edycja:** Po pomyślnym utworzeniu quizu, użytkownik jest automatycznie przenoszony do `Widoku Edycji Quizu` (`/quizzes/:id/edit`). Tutaj przegląda i modyfikuje pytania, a na koniec klika "Zapisz".
4.  **Powrót do Panelu:** Po zapisaniu zmian, jest przekierowywany z powrotem do `Panelu Głównego`, gdzie nowy quiz jest widoczny na liście.
5.  **Rozpoczęcie:** Użytkownik klika "Rozpocznij" na karcie wybranego quizu.
6.  **Rozwiązywanie:** Zostaje przeniesiony do `Widoku Rozwiązywania Quizu` (`/quizzes/:id/play`) i odpowiada na wszystkie pytania.
7.  **Wyniki:** Po ostatnim pytaniu następuje automatyczne przekierowanie do `Widoku Podsumowania Wyników` (`/quizzes/:id/results`).
8.  **Zakończenie:** Z widoku wyników użytkownik może wrócić do `Panelu Głównego`.

## 4. Układ i struktura nawigacji

- **Układ ogólny:** Prosty układ. Główna treść będzie zajmować centralną część ekranu.
- **Pasek nawigacyjny:** Po zalogowaniu, na górze strony znajduje się stały, minimalistyczny pasek nawigacyjny zawierający logo aplikacji (działające jako link do `Panelu Głównego`) oraz przycisk "Wyloguj".
- **Nawigacja kontekstowa:** Nawigacja odbywa się głównie poprzez akcje w obrębie widoków (np. przycisk "Edytuj" prowadzi do widoku edycji). W widokach podrzędnych (edycja, wyniki) znajduje się przycisk "Wróć do listy quizów", aby zapewnić łatwy powrót.
- **Brak złożonej nawigacji:** Ze względu na specyfikę aplikacji, skomplikowane menu czy podstrony nie są potrzebne w wersji MVP. Przepływ jest liniowy i zorientowany na zadania.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów, które będą stanowić podstawę interfejsu:

- **`Button`:** Standardowy komponent przycisku (z wariantami: główny, drugorzędny, destrukcyjny) używany do wszystkich akcji.
- **`Card`:** Komponent do wyświetlania treści w ramce (np. `QuizCard`, `ResultQuestionCard`).
- **`Input` / `Textarea`:** Pola formularzy do wprowadzania tekstu.
- **`Dialog` / `Modal`:** Okna dialogowe używane do potwierdzania akcji (np. usunięcia) lub wyświetlania dodatkowych informacji.
- **`Spinner` / `Loader`:** Wskaźnik ładowania używany podczas operacji asynchronicznych.
- **`Toast` / `Notification`:** Komponent do wyświetlania globalnych powiadomień o sukcesie lub błędzie (np. "Quiz został usunięty", "Błąd sieci").
- **`ProgressBar`:** Wizualny wskaźnik postępu w trakcie rozwiązywania quizu.
