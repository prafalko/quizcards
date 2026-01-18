# Plan implementacji widoku Rozwiązywania Quizu

## 1. Przegląd

Widok Rozwiązywania Quizu stanowi interaktywny interfejs, który przeprowadza użytkownika przez proces odpowiadania na pytania. Jego głównym celem jest zapewnienie skoncentrowanego i wolnego od rozpraszaczy środowiska do nauki. Po udzieleniu odpowiedzi na ostatnie pytanie, użytkownik zostanie automatycznie przekierowany do osobnego widoku z podsumowaniem wyników.

## 2. Routing widoku

Widok będzie renderowany na stronie Astro i dostępny pod dynamiczną ścieżką:

- **Ścieżka:** `/quizzes/:id/play`
- **Renderowanie:** Strona będzie renderowana po stronie serwera (SSR). Dane quizu zostaną pobrane na serwerze i przekazane jako początkowy stan do interaktywnego komponentu React.

## 3. Struktura komponentów

Hierarchia komponentów zostanie zaimplementowana w React, z wykorzystaniem komponentów UI z biblioteki Shadcn.

```
- src/pages/quizzes/[id]/play.astro (SSR)
  - src/components/QuizPlayView.tsx
    - components/ui/Progress (Pasek postępu)
    - h2 (Wskaźnik postępu "Pytanie X/Y")
    - src/components/QuestionDisplay.tsx
    - src/components/AnswerOptions.tsx
      - components/ui/Button[] (Przyciski odpowiedzi)
```

## 4. Szczegóły komponentów

### `QuizPlayView.tsx`

- **Opis komponentu:** Główny kontener widoku po stronie klienta. Inicjalizuje logikę zarządzania stanem za pomocą customowego hooka `useQuizPlay`. Renderuje interfejs aktywnej sesji quizu, w tym wskaźnik postępu, treść bieżącego pytania oraz zestaw przycisków z odpowiedziami.
- **Główne elementy:** Komponent `Progress` z Shadcn, `h2` ("Pytanie 5/20"), `QuestionDisplay`, `AnswerOptions`.
- **Obsługiwane interakcje:** Obsługuje wybór odpowiedzi i zarządza przejściem do kolejnego pytania lub przekierowaniem po zakończeniu quizu.
- **Obsługiwana walidacja:** Sprawdza, czy quiz zawiera pytania przed rozpoczęciem.
- **Typy:** `QuizDetailDTO`.
- **Propsy:**
  ```typescript
  interface QuizPlayViewProps {
    initialQuiz: QuizDetailDTO;
  }
  ```

### `QuestionDisplay.tsx`

- **Opis komponentu:** Prosty komponent, którego jedynym zadaniem jest wyświetlenie tekstu bieżącego pytania.
- **Główne elementy:** `div` (kontener), `p` (tekst pytania).
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `string`.
- **Propsy:**
  ```typescript
  interface QuestionDisplayProps {
    questionText: string;
  }
  ```

### `AnswerOptions.tsx`

- **Opis komponentu:** Renderuje listę odpowiedzi dla bieżącego pytania jako klikalne przyciski. Kolejność odpowiedzi jest losowa.
- **Główne elementy:** `div` (kontener w układzie siatki), `Button[]` (Shadcn).
- **Obsługiwane interakcje:** Kliknięcie na przycisk odpowiedzi wywołuje `onSelect` z ID wybranej odpowiedzi.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `QuizAnswerViewModel[]`.
- **Propsy:**
  ```typescript
  interface AnswerOptionsProps {
    answers: QuizAnswerViewModel[];
    onSelect: (answerId: string) => void;
  }
  ```

## 5. Typy

Do zarządzania stanem interfejsu potrzebne będą nowe, uproszczone typy `ViewModel`.

- **`QuizAnswerViewModel`**: Reprezentuje pojedynczą odpowiedź w UI.

  ```typescript
  type QuizAnswerViewModel = AnswerDTO;
  ```

- **`QuizQuestionViewModel`**: Reprezentuje pytanie z losowo ułożonymi odpowiedziami.

  ```typescript
  type QuizQuestionViewModel = Omit<QuestionDetailDTO, "answers"> & {
    answers: QuizAnswerViewModel[]; // Odpowiedzi w losowej kolejności
  };
  ```

- **`UserAnswer`**: Przechowuje informację o odpowiedzi udzielonej przez użytkownika.
  ```typescript
  interface UserAnswer {
    questionId: string;
    answerId: string;
  }
  ```

## 6. Zarządzanie stanem

Logika biznesowa zostanie zamknięta w customowym hooku `useQuizPlay`, aby utrzymać komponenty czystymi i skoncentrowanymi na renderowaniu.

- **Hook `useQuizPlay(initialQuiz: QuizDetailDTO)`:**
  - **Cel:** Zarządzanie aktywną sesją quizu: inicjalizacja, śledzenie postępu, zbieranie odpowiedzi użytkownika i przekierowanie do strony wyników.
  - **Zarządzany stan:**
    - `quizPhase: 'loading' | 'playing' | 'finished'` - Aktualny etap quizu.
    - `shuffledQuestions: QuizQuestionViewModel[]` - Przygotowana jednorazowo, losowa lista pytań.
    - `currentQuestionIndex: number` - Indeks bieżącego pytania.
    - `userAnswers: UserAnswer[]` - Tablica z odpowiedziami użytkownika.
  - **Logika:**
    - Przy pierwszym montowaniu komponentu hook tasuje pytania i odpowiedzi oraz wysyła żądanie `PATCH` w celu zmiany statusu quizu z `draft` na `published`, jeśli jest to wymagane.
    - Funkcja `handleAnswerSelect` zapisuje odpowiedź użytkownika i przechodzi do następnego pytania.
    - Po ostatnim pytaniu hook zapisuje odpowiedzi użytkownika (np. w `sessionStorage`) i programowo przekierowuje na stronę `/quizzes/:id/results`.
  - **Zwracane wartości:** Wszystkie stany i funkcje potrzebne komponentom do renderowania UI i obsługi interakcji.

## 7. Integracja API

Widok będzie integrował się z dwoma endpointami API.

- **`GET /api/quizzes/:id`**
  - **Cel:** Pobranie pełnych danych quizu przy ładowaniu strony.
  - **Wywołanie:** Po stronie serwera w pliku `src/pages/quizzes/[id]/play.astro`.
  - **Typ odpowiedzi:** `QuizDetailDTO`.

- **`PATCH /api/quizzes/:id`**
  - **Cel:** Zmiana statusu quizu z `draft` na `published` przy pierwszym uruchomieniu.
  - **Wywołanie:** Po stronie klienta z hooka `useQuizPlay`, jeśli `initialQuiz.status === 'draft'`.
  - **Typ żądania:** `UpdateQuizCommand` (z polem `status: 'published'`).
  - **Typ odpowiedzi:** `QuizSummaryDTO` (odpowiedź może zostać zignorowana).

## 8. Interakcje użytkownika

- **Start quizu:** Użytkownik nawiguje na stronę. Dane są ładowane, a interfejs quizu jest natychmiast wyświetlany z pierwszym pytaniem.
- **Wybór odpowiedzi:** Użytkownik klika jeden z czterech przycisków odpowiedzi.
- **Przejście do kolejnego pytania:** Po kliknięciu odpowiedzi, interfejs automatycznie, bez dodatkowej akcji, przechodzi do następnego pytania. Nie jest pokazywana informacja zwrotna o poprawności.
- **Zakończenie quizu:** Po udzieleniu odpowiedzi na ostatnie pytanie, aplikacja zapisuje sesję i automatycznie przekierowuje użytkownika na dedykowaną stronę wyników pod adresem `/quizzes/:id/results`.

## 9. Warunki i walidacja

- **Po stronie klienta:**
  - Przed rozpoczęciem quizu, w hooku `useQuizPlay` nastąpi sprawdzenie, czy pobrany quiz zawiera jakiekolwiek pytania. Jeśli nie, zostanie wyświetlony odpowiedni komunikat.
  - Nie ma pól do walidacji wprowadzanych przez użytkownika.

## 10. Obsługa błędów

- **Błąd pobierania danych:** Jeśli `GET /api/quizzes/:id` na serwerze zwróci błąd (np. 404 Not Found), strona Astro powinna wyrenderować odpowiednią stronę błędu.
- **Błąd aktualizacji statusu:** Ewentualny błąd przy żądaniu `PATCH` nie powinien przerywać quizu. Błąd zostanie zarejestrowany w konsoli, ale użytkownik będzie mógł kontynuować rozwiązywanie.
- **Quiz bez pytań:** Jeśli pobrany quiz ma pustą listę pytań, komponent `QuizPlayView` wyświetli komunikat "Ten quiz nie zawiera żadnych pytań" z przyciskiem do powrotu.

## 11. Kroki implementacji

1.  **Struktura plików:** Utworzenie pliku `.astro` dla strony oraz plików `.tsx` dla komponentów `QuizPlayView`, `QuestionDisplay` i `AnswerOptions` w odpowiednich katalogach.
2.  **Strona Astro:** Implementacja `src/pages/quizzes/[id]/play.astro` w celu pobrania danych quizu po stronie serwera (SSR) i przekazania ich jako props do komponentu `QuizPlayView` renderowanego z dyrektywą `client:load`.
3.  **Typy:** Zdefiniowanie typów `ViewModel` (`QuizQuestionViewModel`, `QuizAnswerViewModel`) oraz `UserAnswer`.
4.  **Hook `useQuizPlay`:** Implementacja całej logiki zarządzania stanem: tasowanie pytań/odpowiedzi, śledzenie postępu, obsługa `PATCH` API oraz logika przekierowania po ostatniej odpowiedzi.
5.  **Komponenty UI:** Implementacja komponentów `QuizPlayView`, `QuestionDisplay` i `AnswerOptions`, łącząc je z danymi i funkcjami dostarczanymi przez hook `useQuizPlay`.
6.  **Stylowanie:** Dopracowanie wyglądu interfejsu za pomocą klas Tailwind CSS, aby zapewnić czytelność i skupienie na zadaniu.
7.  **Obsługa błędów:** Zaimplementowanie logiki obsługi pustego quizu oraz cichej obsługi błędu aktualizacji statusu.
8.  **Testowanie manualne:** Dokładne przetestowanie całego przepływu: start quizu, losowość pytań/odpowiedzi, przechodzenie między pytaniami oraz poprawne przekierowanie po ostatniej odpowiedzi.
