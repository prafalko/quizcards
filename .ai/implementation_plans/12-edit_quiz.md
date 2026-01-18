# Plan implementacji widoku Edycji Quizu

## 1. Przegląd

Widok Edycji Quizu jest kluczowym interfejsem dla użytkownika, umożliwiającym pełną kontrolę nad treścią quizu po jego wygenerowaniu. Użytkownik może tutaj modyfikować tytuł quizu, edytować tekst każdego pytania i odpowiedzi, usuwać niechciane pytania oraz ponownie generować niepoprawne odpowiedzi przy użyciu AI. Zmiany są zapisywane w sposób wsadowy, co optymalizuje komunikację z serwerem i poprawia doświadczenie użytkownika.

## 2. Routing widoku

Widok będzie renderowany na stronie Astro i dostępny pod dynamiczną ścieżką:

- **Ścieżka:** `/quizzes/:id/edit`
- **Renderowanie:** Strona będzie renderowana po stronie serwera (SSR), pobierając dane quizu i przekazując je do interaktywnego komponentu React.

## 3. Struktura komponentów

Hierarchia komponentów zostanie zaimplementowana w React, wykorzystując komponenty UI z biblioteki Shadcn.

```
- src/pages/quizzes/[id]/edit.astro
  - src/components/QuizEditView.tsx
    - src/components/ui/SaveChangesBar.tsx
      - components/ui/Button (Zapisz)
      - components/ui/Button (Odrzuć zmiany)
    - src/components/EditableTitle.tsx
      - h1 / components/ui/Input
    - src/components/QuestionList.tsx
      - src/components/QuestionEditForm.tsx[]
        - components/ui/Textarea (Pytanie)
        - components/ui/Input (Odpowiedź 1 - Poprawna)
        - components/ui/Input (Odpowiedź 2)
        - components/ui/Input (Odpowiedź 3)
        - components/ui/Input (Odpowiedź 4)
        - components/ui/Button (Generuj odpowiedzi ponownie)
        - components/ui/Button (Usuń pytanie)
    - src/components/ui/ConfirmationDialog.tsx
      - components/ui/AlertDialog
```

## 4. Szczegóły komponentów

### `QuizEditView.tsx`

- **Opis komponentu:** Główny kontener widoku. Inicjalizuje logikę zarządzania stanem za pomocą customowego hooka `useQuizEdit`, odbiera początkowe dane quizu jako `prop` i renderuje wszystkie podkomponenty (`SaveChangesBar`, `EditableTitle`, `QuestionList`).
- **Główne elementy:** Komponenty-dzieci.
- **Obsługiwane interakcje:** Przekazuje logikę i stan z hooka `useQuizEdit` do komponentów-dzieci.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `QuizDetailDTO`.
- **Propsy:**
  ```typescript
  interface QuizEditViewProps {
    initialQuiz: QuizDetailDTO;
  }
  ```

### `SaveChangesBar.tsx`

- **Opis komponentu:** Pasek narzędzi, który jest widoczny tylko wtedy, gdy w quizie są niezapisane zmiany. Zawiera przyciski do zapisywania lub odrzucania zmian.
- **Główne elementy:** `div` (kontener), `Button` (Shadcn) "Zapisz", `Button` (Shadcn) "Odrzuć zmiany".
- **Obsługiwane interakcje:** Kliknięcie przycisku "Zapisz" (wywołuje `onSave`), kliknięcie "Odrzuć" (wywołuje `onDiscard`).
- **Obsługiwana walidacja:** Przycisk "Zapisz" jest nieaktywny, gdy trwa proces zapisywania.
- **Typy:** Brak.
- **Propsy:**
  ```typescript
  interface SaveChangesBarProps {
    isVisible: boolean;
    isSaving: boolean;
    onSave: () => void;
    onDiscard: () => void;
  }
  ```

### `EditableTitle.tsx`

- **Opis komponentu:** Wyświetla tytuł quizu jako `h1`. Po kliknięciu zamienia się w pole `input`, umożliwiając edycję.
- **Główne elementy:** `h1` lub `Input` (Shadcn) w zależności od trybu edycji.
- **Obsługiwane interakcje:** Kliknięcie na `h1` włącza tryb edycji. Zmiana wartości w `input` i utrata fokusa (onBlur) lub wciśnięcie "Enter" zatwierdza zmianę.
- **Obsługiwana walidacja:** Tytuł nie może być pusty.
- **Typy:** `string`.
- **Propsy:**
  ```typescript
  interface EditableTitleProps {
    initialTitle: string;
    onChange: (newTitle: string) => void;
  }
  ```

### `QuestionList.tsx`

- **Opis komponentu:** Iteruje po liście pytań i dla każdego z nich renderuje komponent `QuestionEditForm`.
- **Główne elementy:** `div` (kontener), `QuestionEditForm[]`.
- **Obsługiwane interakcje:** Przekazuje zdarzenia z poszczególnych `QuestionEditForm` do głównego komponentu.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `QuestionDetailDTO[]`.
- **Propsy:**
  ```typescript
  interface QuestionListProps {
    questions: QuestionDetailDTO[];
    onQuestionChange: (questionId: string, newText: string) => void;
    onAnswerChange: (questionId: string, answerId: string, newText: string) => void;
    onDeleteRequest: (questionId: string) => void;
    onRegenerate: (questionId: string) => void;
  }
  ```

### `QuestionEditForm.tsx`

- **Opis komponentu:** Formularz do edycji pojedynczego pytania. Zawiera pole na treść pytania, cztery pola na odpowiedzi (pierwsze oznaczone jako poprawne) oraz przyciski akcji.
- **Główne elementy:** `Card` (Shadcn), `Textarea` (Shadcn), `Input` (Shadcn), `Button` (Shadcn). Etykieta "Poprawna odpowiedź" przy pierwszym polu.
- **Obsługiwane interakcje:** Zmiana treści pytania lub odpowiedzi. Kliknięcie "Generuj odpowiedzi ponownie" lub "Usuń pytanie".
- **Obsługiwana walidacja:** Pola tekstowe pytania i odpowiedzi nie mogą być puste.
- **Typy:** `QuestionDetailDTO`.
- **Propsy:**
  ```typescript
  interface QuestionEditFormProps {
    question: QuestionDetailDTO;
    onQuestionChange: (questionId: string, newText: string) => void;
    onAnswerChange: (questionId: string, answerId: string, newText: string) => void;
    onDeleteRequest: (questionId: string) => void;
    onRegenerate: (questionId: string) => void;
  }
  ```

## 5. Typy

Widok będzie operował na istniejącym typie `QuizDetailDTO` z `src/types.ts`. Nie ma potrzeby tworzenia nowych, złożonych typów ViewModel, ponieważ cała logika będzie zarządzana przez porównywanie stanu początkowego i bieżącego wewnątrz customowego hooka.

- **`QuizDetailDTO`**: Główna struktura danych, zawierająca wszystkie informacje o quizie, jego pytaniach i odpowiedziach.

## 6. Zarządzanie stanem

Cała logika biznesowa zostanie zamknięta w customowym hooku `useQuizEdit`, aby utrzymać komponent `QuizEditView` czystym i skoncentrowanym na renderowaniu.

- **Hook `useQuizEdit(initialQuiz: QuizDetailDTO)`:**
  - **Cel:** Zarządzanie stanem formularza edycji, śledzenie niezapisanych zmian (`isDirty`), obsługa wsadowego zapisywania, usuwania pytań i regeneracji odpowiedzi.
  - **Zarządzany stan:**
    - `quiz: QuizDetailDTO` - Bieżący, edytowany stan quizu.
    - `originalQuiz: QuizDetailDTO` - Niezmieniona kopia początkowego stanu, do porównań.
    - `isDirty: boolean` - Flaga informująca, czy istnieją niezapisane zmiany.
    - `isSaving: boolean` - Flaga informująca o trwającym procesie zapisu.
    - `questionToDeleteId: string | null` - ID pytania przeznaczonego do usunięcia, steruje dialogiem potwierdzającym.
  - **Zwracane funkcje i wartości:** Stan `quiz`, flagi `isDirty` i `isSaving` oraz funkcje obsługujące wszystkie akcje użytkownika (`updateTitle`, `updateQuestion`, `updateAnswer`, `handleSaveChanges`, `handleDeleteQuestionRequest` itd.).

## 7. Integracja API

Komponent będzie integrował się z kilkoma endpointami API w celu odczytu i modyfikacji danych.

- **`GET /api/quizzes/:id`**
  - **Cel:** Pobranie pełnych danych quizu przy ładowaniu strony.
  - **Wywołanie:** Po stronie serwera w `src/pages/quizzes/[id]/edit.astro`.
  - **Typ odpowiedzi:** `QuizDetailDTO`.

- **Operacja "Zapisz" (wsadowa):**
  - **Cel:** Persystencja wszystkich zmian dokonanych przez użytkownika.
  - **Wywołanie:** W hooku `useQuizEdit` po kliknięciu przycisku zapisu. Hook porówna stan `quiz` i `originalQuiz`, a następnie wywoła odpowiednie endpointy:
    - **`PATCH /api/quizzes/:id`** dla zmiany tytułu i/lub statusu.
    - **`DELETE /api/questions/:id`** dla każdego usuniętego pytania.
    - **`PATCH /api/questions/:id`** dla każdego zmienionego pytania.
    - **`PATCH /api/answers/:id`** dla każdej zmienionej odpowiedzi.
  - **Typy żądań:** `UpdateQuizCommand`, `UpdateQuestionCommand`, `UpdateAnswerCommand`.

- **`POST /api/questions/:id/regenerate`**
  - **Cel:** Ponowne wygenerowanie niepoprawnych odpowiedzi dla pytania.
  - **Wywołanie:** W hooku `useQuizEdit`, natychmiast po kliknięciu przycisku "Generuj odpowiedzi ponownie".
  - **Typ żądania:** `RegenerateAnswersCommand`.
  - **Typ odpowiedzi:** `QuestionDetailDTO`.

## 8. Interakcje użytkownika

- **Edycja treści:** Kliknięcie na tytuł lub wpisanie tekstu w polach pytań/odpowiedzi aktualizuje stan w hooku i aktywuje `SaveChangesBar`.
- **Usuwanie pytania:** Kliknięcie "Usuń pytanie" otwiera `ConfirmationDialog`. Po potwierdzeniu, pytanie jest usuwane ze stanu (UI), a zmiana jest oznaczana do zapisu.
- **Regeneracja odpowiedzi:** Kliknięcie "Generuj..." wywołuje API. Przycisk jest blokowany na czas operacji. Po sukcesie, nowe odpowiedzi pojawiają się w formularzu, a zmiana jest oznaczana do zapisu.
- **Zapisywanie zmian:** Kliknięcie "Zapisz" blokuje przycisk, uruchamia proces wysyłania wszystkich zmian do API. Po pomyślnym zapisie, `SaveChangesBar` znika.
- **Odrzucanie zmian:** Kliknięcie "Odrzuć zmiany" przywraca stan quizu do ostatniej zapisanej wersji i ukrywa `SaveChangesBar`.

## 9. Warunki i walidacja

- **Po stronie klienta:**
  - Wszystkie pola tekstowe (tytuł, pytania, odpowiedzi) nie mogą być puste.
  - Przycisk "Zapisz" będzie nieaktywny, jeśli którekolwiek z pól jest puste. Komunikaty o błędach walidacji będą wyświetlane przy odpowiednich polach.
- **Po stronie serwera:**
  - API waliduje długość i format danych. Frontend powinien zapobiegać wysyłaniu nieprawidłowych danych, ale musi być przygotowany na obsługę błędów walidacji z API.

## 10. Obsługa błędów

- **Błąd pobierania danych:** Jeśli `GET /api/quizzes/:id` zawiedzie po stronie serwera, Astro powinno zwrócić stronę błędu (np. 404 lub 500).
- **Błąd zapisu:** W przypadku niepowodzenia którejkolwiek z operacji w procesie wsadowego zapisu, cały proces jest uznawany za nieudany. Użytkownik otrzymuje powiadomienie "toast" z informacją o błędzie, a interfejs pozostaje w stanie edycji, umożliwiając ponowną próbę zapisu.
- **Błąd regeneracji odpowiedzi:** W przypadku niepowodzenia, użytkownik zobaczy powiadomienie "toast" informujące o problemie, a odpowiedzi w formularzu pozostaną niezmienione.

## 11. Kroki implementacji

1.  **Struktura plików:** Utworzenie plików `.tsx` dla `QuizEditView`, `SaveChangesBar`, `EditableTitle`, `QuestionList`, `QuestionEditForm` w `src/components/`.
2.  **Strona Astro:** Stworzenie pliku `src/pages/quizzes/[id]/edit.astro`, który będzie pobierał dane quizu po stronie serwera i renderował komponent `QuizEditView` z `client:load`.
3.  **Komponenty "liście":** Implementacja `EditableTitle` i `QuestionEditForm` jako w pełni kontrolowanych komponentów, które przyjmują dane i emitują zdarzenia `onChange`.
4.  **Komponent `QuestionList`:** Implementacja logiki renderowania listy formularzy pytań.
5.  **Komponent `SaveChangesBar`:** Implementacja paska narzędzi, którego widoczność zależy od propsa `isVisible`.
6.  **Hook `useQuizEdit`:** Implementacja całej logiki zarządzania stanem: śledzenie zmian, obsługa aktualizacji, usuwania, regeneracji oraz centralna funkcja `handleSaveChanges` do komunikacji z API. Zalecane użycie biblioteki `immer` do uproszczenia niemutowalnych aktualizacji stanu.
7.  **Komponent `QuizEditView`:** Zintegrowanie hooka `useQuizEdit` i połączenie wszystkich komponentów w funkcjonalną całość.
8.  **Dialog potwierdzający:** Zintegrowanie istniejącego komponentu `ConfirmationDialog` do obsługi usuwania pytań.
9.  **Stylowanie:** Dopracowanie wyglądu wszystkich komponentów za pomocą klas Tailwind CSS, zapewniając spójność z resztą aplikacji.
10. **Testowanie manualne:** Dokładne przetestowanie wszystkich ścieżek interakcji, w tym edycji, usuwania, regeneracji, zapisywania, odrzucania zmian oraz obsługi błędów API.
