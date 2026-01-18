# Plan implementacji widoku Podsumowania Wyników

## 1. Przegląd

Widok Podsumowania Wyników jest kluczowym elementem pętli nauki w aplikacji. Jego głównym celem jest przedstawienie użytkownikowi szczegółowego raportu po ukończeniu quizu. Widok wyświetla ogólny wynik procentowy oraz szczegółową listę wszystkich pytań, z wyraźnym zaznaczeniem odpowiedzi poprawnej, odpowiedzi udzielonej przez użytkownika oraz pozostałych błędnych opcji. Umożliwia to użytkownikowi szybką analizę pomyłek i efektywną naukę.

## 2. Routing widoku

Widok będzie renderowany jako strona Astro, dostępna pod dynamiczną ścieżką URL.

- **Ścieżka:** `/quizzes/:id/results`
- **Renderowanie:** Strona będzie renderowana po stronie serwera (SSR). Dane quizu (pytania i poprawne odpowiedzi) zostaną pobrane na serwerze, a dane sesji (odpowiedzi użytkownika) zostaną pobrane po stronie klienta z `sessionStorage`.

## 3. Struktura komponentów

Hierarchia komponentów zostanie zaimplementowana w React, wykorzystując bibliotekę Shadcn do budowy UI.

```
- src/pages/quizzes/[id]/results.astro (SSR)
  - src/components/QuizResultsView.tsx (client:load)
    - src/components/ScoreSummary.tsx
    - h2 ("Szczegółowe wyniki")
    - src/components/ResultsList.tsx
      - src/components/ResultQuestionCard.tsx[]
        - p (Treść pytania)
        - div (Lista odpowiedzi z ikonami statusu)
    - div (Kontener na przyciski akcji)
      - components/ui/Button ("Rozwiąż ponownie")
      - components/ui/Button ("Powróć do listy quizów")
```

## 4. Szczegóły komponentów

### `QuizResultsView.tsx`

- **Opis komponentu:** Główny komponent widoku po stronie klienta. Jest odpowiedzialny za orkiestrację całego widoku: pobiera odpowiedzi użytkownika z `sessionStorage`, inicjalizuje logikę obliczania wyników za pomocą hooka `useQuizResults` i renderuje odpowiednie komponenty podrzędne.
- **Główne elementy:** `ScoreSummary`, `ResultsList`, przyciski akcji.
- **Obsługiwane interakcje:** Obsługuje nawigację po kliknięciu przycisków "Rozwiąż ponownie" i "Powróć do listy quizów".
- **Obsługiwana walidacja:** Sprawdza, czy dane sesji (odpowiedzi użytkownika) istnieją w `sessionStorage`. W przypadku ich braku, wyświetla stosowny komunikat.
- **Typy:** `QuizDetailDTO`.
- **Propsy:**
  ```typescript
  interface QuizResultsViewProps {
    initialQuiz: QuizDetailDTO;
  }
  ```

### `ScoreSummary.tsx`

- **Opis komponentu:** Komponent prezentacyjny wyświetlający finalny wynik procentowy w czytelnej i atrakcyjnej wizualnie formie, np. za pomocą okrągłego paska postępu.
- **Główne elementy:** Komponent UI do wizualizacji (np. z biblioteki zewnętrznej), `div` z tekstem wyniku.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `number`.
- **Propsy:**
  ```typescript
  interface ScoreSummaryProps {
    score: number; // Wynik w procentach (0-100)
  }
  ```

### `ResultsList.tsx`

- **Opis komponentu:** Renderuje listę wszystkich pytań z quizu za pomocą komponentu `ResultQuestionCard`.
- **Główne elementy:** `div` (kontener listy), iteracja po `ResultQuestionCard`.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `ResultQuestionViewModel[]`.
- **Propsy:**
  ```typescript
  interface ResultsListProps {
    results: ResultQuestionViewModel[];
  }
  ```

### `ResultQuestionCard.tsx`

- **Opis komponentu:** Wyświetla pojedyncze pytanie, jego treść oraz listę wszystkich odpowiedzi. Każda odpowiedź jest wizualnie oznaczona zgodnie z jej statusem (poprawna, błędna odpowiedź użytkownika, neutralna), używając zarówno kolorów, jak i ikon (np. "check" i "x") dla zapewnienia dostępności.
- **Główne elementy:** `Card` (Shadcn), `CardHeader`, `CardContent`, `p` (treść pytania), lista `div` (odpowiedzi).
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `ResultQuestionViewModel`.
- **Propsy:**
  ```typescript
  interface ResultQuestionCardProps {
    result: ResultQuestionViewModel;
  }
  ```

## 5. Typy

Do prawidłowego zarządzania danymi w widoku wyników, potrzebne będą dedykowane `ViewModel`.

- **`AnswerStatus`**: Typ wyliczeniowy określający status odpowiedzi na liście wyników.

  ```typescript
  export type AnswerStatus = "correct" | "user_incorrect" | "neutral";
  ```

- **`ResultAnswerViewModel`**: Rozszerza `AnswerDTO` o status odpowiedzi, ułatwiając renderowanie.

  ```typescript
  export interface ResultAnswerViewModel extends AnswerDTO {
    status: AnswerStatus;
  }
  ```

- **`ResultQuestionViewModel`**: Agreguje dane o pytaniu, jego odpowiedziach (z określonym statusem) oraz ID odpowiedzi udzielonej przez użytkownika.
  ```typescript
  export interface ResultQuestionViewModel extends QuestionDetailDTO {
    userAnswerId: string | null;
    answers: ResultAnswerViewModel[];
  }
  ```
- **`UserAnswer`**: Istniejący typ, który będzie pobierany z `sessionStorage`.
  ```typescript
  export interface UserAnswer {
    questionId: string;
    answerId: string;
  }
  ```

## 6. Zarządzanie stanem

Logika biznesowa zostanie wyizolowana w customowym hooku `useQuizResults`, aby utrzymać komponenty czystymi i zorientowanymi na UI.

- **Hook `useQuizResults(initialQuiz: QuizDetailDTO)`:**
  - **Cel:** Zarządzanie sesją wyników quizu. Jego zadaniem jest pobranie odpowiedzi użytkownika, przetworzenie ich, obliczenie wyniku oraz przygotowanie danych do wyświetlenia.
  - **Zarządzany stan:**
    - `viewState: 'loading' | 'ready' | 'error'` - Aktualny stan widoku.
    - `score: number | null` - Obliczony wynik procentowy.
    - `results: ResultQuestionViewModel[]` - Przetworzona lista pytań i odpowiedzi.
  - **Logika:**
    - W `useEffect` przy pierwszym montowaniu, hook próbuje odczytać `UserAnswer[]` z `sessionStorage` (klucz np. `quiz_session_${quizId}`).
    - Jeśli dane zostaną znalezione, hook oblicza wynik i transformuje `initialQuiz` do `ResultQuestionViewModel[]`, oznaczając statusy każdej odpowiedzi.
    - Jeśli dane nie zostaną znalezione, ustawia `viewState` na `'error'`.
    - Po przetworzeniu danych, ustawia `viewState` na `'ready'`.
  - **Zwracane wartości:** `viewState`, `score`, `results`, oraz funkcje do obsługi nawigacji (`handlePlayAgain`, `handleGoToDashboard`).

## 7. Integracja API

Widok będzie korzystał z jednego endpointu API do pobrania struktury quizu.

- **`GET /api/quizzes/:id`**
  - **Cel:** Pobranie pełnych danych quizu, w tym wszystkich pytań i odpowiedzi, aby zweryfikować poprawność odpowiedzi użytkownika.
  - **Wywołanie:** Po stronie serwera w pliku `src/pages/quizzes/[id]/results.astro`.
  - **Typ odpowiedzi:** `QuizDetailDTO`.
  - **Integracja:** Pobrane dane zostaną przekazane jako `initialQuiz` prop do komponentu `QuizResultsView`.

## 8. Interakcje użytkownika

- **Wyświetlenie wyników:** Użytkownik jest automatycznie przekierowywany na stronę po odpowiedzi na ostatnie pytanie. Widok ładuje się, oblicza wyniki i wyświetla je.
- **Analiza wyników:** Użytkownik może przewijać listę pytań, aby przeanalizować swoje błędy.
- **Kliknięcie "Rozwiąż ponownie":** Użytkownik jest przekierowywany z powrotem do widoku rozwiązywania quizu (`/quizzes/:id/play`), rozpoczynając nową sesję.
- **Kliknięcie "Powróć do listy quizów":** Użytkownik jest przekierowywany do głównego panelu aplikacji (`/`).

## 9. Warunki i walidacja

- **Po stronie serwera:** Strona `results.astro` musi obsłużyć sytuację, gdy quiz o podanym `:id` nie istnieje (API zwróci 404). W takim przypadku Astro powinno wyrenderować standardową stronę błędu 404.
- **Po stronie klienta:**
  - Hook `useQuizResults` musi zweryfikować obecność i poprawność danych sesji w `sessionStorage`.
  - Jeśli klucz `quiz_session_${quizId}` nie istnieje lub jego wartość jest nieprawidłowa, komponent `QuizResultsView` powinien wyświetlić komunikat o błędzie, uniemożliwiając wyświetlenie wyników, których nie można obliczyć.

## 10. Obsługa błędów

- **Brak danych quizu (404):** Obsługiwane przez Astro po stronie serwera poprzez renderowanie strony błędu.
- **Brak sesji użytkownika w `sessionStorage`:** Hook `useQuizResults` ustawia `viewState` na `'error'`. Komponent `QuizResultsView` na tej podstawie renderuje komunikat, np. "Nie można wczytać wyników. Sesja wygasła lub nie została znaleziona." wraz z przyciskiem umożliwiającym powrót do listy quizów.
- **Quiz bez pytań:** Logika obliczająca wyniki powinna obsłużyć ten przypadek, np. pokazując wynik 0% i komunikat "Ten quiz nie zawiera żadnych pytań."

## 11. Kroki implementacji

1.  **Struktura plików:** Utworzenie pliku `src/pages/quizzes/[id]/results.astro` oraz plików dla komponentów React: `QuizResultsView.tsx`, `ScoreSummary.tsx`, `ResultsList.tsx` i `ResultQuestionCard.tsx`.
2.  **Strona Astro:** Zaimplementowanie logiki w `results.astro` do pobierania danych quizu z `GET /api/quizzes/:id` (SSR) i przekazania ich jako props do komponentu `QuizResultsView` renderowanego z dyrektywą `client:load`.
3.  **Typy:** Zdefiniowanie nowych typów `ViewModel` (`AnswerStatus`, `ResultAnswerViewModel`, `ResultQuestionViewModel`) w pliku `src/types.ts`.
4.  **Hook `useQuizResults`:** Stworzenie hooka, który będzie zawierał całą logikę kliencką: pobieranie danych z `sessionStorage`, obliczanie wyniku, transformację danych i obsługę stanów (loading, ready, error).
5.  **Komponenty UI:** Zbudowanie komponentów `QuizResultsView`, `ScoreSummary`, `ResultsList` i `ResultQuestionCard`, łącząc je z danymi i funkcjami dostarczonymi przez hook `useQuizResults`.
6.  **Stylowanie:** Zastosowanie klas Tailwind CSS do ostylowania komponentów, ze szczególnym uwzględnieniem wizualnego rozróżnienia statusów odpowiedzi (kolory i ikony).
7.  **Obsługa błędów:** Implementacja renderowania warunkowego w `QuizResultsView` w zależności od `viewState` z hooka.
8.  **Aktualizacja logiki `useQuizPlay`:** Upewnienie się, że po ostatniej odpowiedzi hook `useQuizPlay` zapisuje `UserAnswer[]` w `sessionStorage` pod kluczem `quiz_session_${quizId}` i przekierowuje na stronę wyników.
9.  **Testowanie manualne:** Gruntowne przetestowanie całego przepływu: od rozwiązania quizu, przez poprawne zapisanie sesji, po wyświetlenie wyników i działanie przycisków akcji. Należy również przetestować ścieżki błędów (np. bezpośrednie wejście na URL wyników w nowej karcie).
