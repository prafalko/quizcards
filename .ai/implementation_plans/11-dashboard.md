# Plan implementacji widoku Panelu Głównego

## 1. Przegląd
Panel Główny (Dashboard) jest centralnym widokiem aplikacji po zalogowaniu. Umożliwia użytkownikowi generowanie nowych quizów poprzez podanie linku do publicznego zestawu fiszek na Quizlet.com. Dodatkowo, widok ten wyświetla listę wszystkich istniejących quizów użytkownika, dając mu możliwość zarządzania nimi poprzez edycję, usuwanie oraz rozpoczynanie sesji quizu.

## 2. Routing widoku
Widok będzie dostępny pod główną ścieżką aplikacji dla zalogowanych użytkowników:
- **Ścieżka:** `/`

## 3. Struktura komponentów
Komponenty zostaną zaimplementowane w React i osadzone na stronie Astro. Hierarchia komponentów będzie następująca:

```
- src/pages/index.astro
  - src/components/Dashboard.tsx
    - src/components/QuizGenerationForm.tsx
      - components/ui/Input
      - components/ui/Button
    - src/components/QuizList.tsx
      - src/components/QuizCard.tsx
        - components/ui/Card
        - components/ui/Button
    - src/components/ui/ConfirmationDialog.tsx
      - components/ui/AlertDialog
```

## 4. Szczegóły komponentów

### `Dashboard.tsx`
- **Opis komponentu:** Główny, interaktywny komponent-kontener dla panelu głównego. Zarządza stanem całej strony, w tym listą quizów, procesem generowania nowego quizu oraz logiką usuwania. Otrzymuje początkową listę quizów jako `prop` od strony Astro.
- **Główne elementy:** `QuizGenerationForm`, `QuizList`, `ConfirmationDialog`.
- **Obsługiwane interakcje:**
  - Przesłanie formularza generowania quizu.
  - Inicjowanie usunięcia quizu (otwarcie modalu).
  - Potwierdzenie lub anulowanie usunięcia quizu.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `QuizzesListDTO`.
- **Propsy:**
  ```typescript
  interface DashboardProps {
    initialQuizzes: QuizzesListDTO;
  }
  ```

### `QuizGenerationForm.tsx`
- **Opis komponentu:** Formularz służący do generowania nowego quizu. Składa się z pola tekstowego na URL z Quizlet oraz przycisku do przesłania. Komponent zarządza swoim stanem wewnętrznym, w tym ładowaniem i błędami.
- **Główne elementy:** `Input` (Shadcn), `Button` (Shadcn), wskaźnik ładowania, kontener na komunikat błędu.
- **Obsługiwane interakcje:**
  - Wprowadzanie tekstu w polu `input`.
  - Kliknięcie przycisku "Generuj".
- **Obsługiwana walidacja:**
  - Pole `input` nie może być puste.
  - Wartość pola musi być poprawnym adresem URL (podstawowa walidacja po stronie klienta, np. `new URL()`).
  - Przycisk "Generuj" jest nieaktywny podczas procesu generowania.
- **Typy:** `CreateQuizCommand`.
- **Propsy:**
  ```typescript
  interface QuizGenerationFormProps {
    isGenerating: boolean;
    onSubmit: (url: string) => void;
    error: string | null;
  }
  ```

### `QuizList.tsx`
- **Opis komponentu:** Wyświetla listę quizów za pomocą komponentów `QuizCard`. Jeśli lista jest pusta, renderuje komunikat zachęcający do stworzenia pierwszego quizu.
- **Główne elementy:** Kontener `div`, mapowanie po liście quizów i renderowanie `QuizCard`, element z tekstem dla pustego stanu.
- **Obsługiwane interakcje:** Przekazuje zdarzenia z `QuizCard` do `Dashboard`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `QuizzesListDTO`.
- **Propsy:**
  ```typescript
  interface QuizListProps {
    quizzes: QuizzesListDTO;
    onDelete: (quizId: string) => void;
  }
  ```

### `QuizCard.tsx`
- **Opis komponentu:** Karta reprezentująca pojedynczy quiz na liście. Wyświetla jego tytuł, liczbę pytań oraz przyciski akcji.
- **Główne elementy:** `Card` (Shadcn), `CardHeader`, `CardContent`, `CardFooter` z komponentami `Button` (Shadcn) dla akcji "Rozwiąż", "Edytuj", "Usuń".
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku "Rozwiąż" (nawigacja do `/quizzes/:id/play`).
  - Kliknięcie przycisku "Edytuj" (nawigacja do `/quizzes/:id/edit`).
  - Kliknięcie przycisku "Usuń" (wywołanie `onDelete`).
- **Obsługiwana walidacja:** Brak.
- **Typy:** `QuizListItemDTO`.
- **Propsy:**
  ```typescript
  interface QuizCardProps {
    quiz: QuizListItemDTO;
    onDelete: (quizId: string) => void;
  }
  ```

### `ConfirmationDialog.tsx`
- **Opis komponentu:** Generyczne okno modalne do potwierdzania akcji, oparte na `AlertDialog` z Shadcn. Wyświetla tytuł, opis oraz przyciski "Anuluj" i "Potwierdź".
- **Główne elementy:** Komponenty `AlertDialog` z Shadcn.
- **Obsługiwane interakcje:**
  - Kliknięcie "Potwierdź" (`onConfirm`).
  - Kliknięcie "Anuluj" lub zamknięcie modalu (`onCancel`).
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:**
  ```typescript
  interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
  }
  ```

## 5. Typy
Widok będzie korzystał z istniejących typów DTO zdefiniowanych w `src/types.ts`. Nie ma potrzeby tworzenia nowych, złożonych typów ViewModel, ponieważ stan będzie zarządzany za pomocą prostszych typów i DTO.

- **`QuizzesListDTO`**: `QuizListItemDTO[]` - Typ dla listy quizów.
- **`QuizListItemDTO`**: `{ id, title, status, question_count, ... }` - Reprezentuje pojedynczy quiz na liście.
- **`CreateQuizCommand`**: `{ source_url: string; title?: string; }` - Typ dla ciała żądania generowania quizu.
- **`ErrorResponse`**: `{ error: { code, message, details? } }` - Standardowy format odpowiedzi błędu API.

## 6. Zarządzanie stanem
Stan będzie zarządzany lokalnie w komponencie `Dashboard.tsx`, z wykorzystaniem hooków React (`useState`, `useCallback`). W celu lepszej organizacji logiki, zostanie stworzony customowy hook `useDashboard`.

- **Hook `useDashboard(initialQuizzes: QuizzesListDTO)`:**
  - **Cel:** Enkapsulacja logiki biznesowej panelu głównego: zarządzanie listą quizów, obsługa generowania i usuwania.
  - **Zarządzany stan:**
    - `quizzes: QuizzesListDTO` - Aktualna lista quizów.
    - `generationState: 'idle' | 'loading' | 'error'` - Stan procesu generowania.
    - `generationError: string | null` - Komunikat błędu z API.
    - `quizToDelete: QuizListItemDTO | null` - Quiz wybrany do usunięcia, kontroluje wyświetlanie `ConfirmationDialog`.
  - **Zwracane funkcje:**
    - `handleGenerateQuiz(url: string)` - Obsługuje wysłanie żądania o utworzenie quizu.
    - `handleDeleteRequest(quizId: string)` - Inicjuje proces usuwania.
    - `handleConfirmDelete()` - Wysyła żądanie usunięcia.
    - `handleCancelDelete()` - Anuluje usuwanie.

## 7. Integracja API
Komponenty będą komunikować się z trzema endpointami API.

- **`GET /api/quizzes`**
  - **Cel:** Pobranie początkowej listy quizów.
  - **Wywołanie:** Po stronie serwera w `src/pages/index.astro`.
  - **Typ odpowiedzi:** `QuizzesListDTO`.

- **`POST /api/quizzes/generate`**
  - **Cel:** Utworzenie nowego quizu.
  - **Wywołanie:** W hooku `useDashboard` po przesłaniu formularza `QuizGenerationForm`.
  - **Typ żądania:** `CreateQuizCommand`.
  - **Typ odpowiedzi ( sukces, 201):** `QuizSummaryDTO`.
  - **Typ odpowiedzi (błąd):** `ErrorResponse`.

- **`DELETE /api/quizzes/:id`**
  - **Cel:** Usunięcie quizu.
  - **Wywołanie:** W hooku `useDashboard` po potwierdzeniu w `ConfirmationDialog`.
  - **Typ odpowiedzi (sukces, 204):** Brak.
  - **Typ odpowiedzi (błąd):** `ErrorResponse`.

## 8. Interakcje użytkownika
- **Generowanie quizu:** Użytkownik wkleja URL w `input` i klika "Generuj". Przycisk staje się nieaktywny, pojawia się wskaźnik ładowania. Po pomyślnym utworzeniu quizu, następuje przekierowanie na stronę edycji (`/quizzes/:id/edit`). W razie błędu, pod formularzem pojawia się stosowny komunikat.
- **Usuwanie quizu:** Użytkownik klika przycisk "Usuń" na karcie quizu. Otwiera się modal `ConfirmationDialog`. Po kliknięciu "Potwierdź", quiz jest usuwany z listy (zaimplementowane jako optimistic update), a modal się zamyka. Kliknięcie "Anuluj" zamyka modal bez żadnych zmian.
- **Nawigacja:** Kliknięcie "Rozwiąż" lub "Edytuj" przenosi użytkownika na odpowiednią podstronę (`/quizzes/:id/play` lub `/quizzes/:id/edit`).

## 9. Warunki i walidacja
- **Formularz generowania:**
  - Pole na URL nie może być puste.
  - Wprowadzona wartość musi być poprawnym adresem URL.
  - Sprawdzenie odbywa się po stronie klienta w momencie próby wysłania formularza, aby uniknąć zbędnych zapytań API. Błąd walidacji uniemożliwia wysłanie i wyświetla komunikat.

## 10. Obsługa błędów
- **Błędy generowania quizu:**
  - Na podstawie kodu statusu odpowiedzi API (`400`, `403`, `404`, `422`, `500`), hook `useDashboard` ustawi stan błędu `generationError` z przyjaznym dla użytkownika komunikatem, który zostanie wyświetlony w komponencie `QuizGenerationForm`.
- **Błędy usuwania quizu:**
  - W przypadku błędu (np. `404`, `500`), operacja usunięcia zostanie cofnięta (jeśli zastosowano optimistic update), a użytkownik zobaczy powiadomienie typu "toast" z informacją o niepowodzeniu.
- **Brak quizów:**
  - Komponent `QuizList` wyświetli specjalny komunikat, jeśli przekazana do niego tablica quizów będzie pusta.

## 11. Kroki implementacji
1. **Utworzenie plików komponentów:** Stworzenie pustych plików `.tsx` dla `Dashboard`, `QuizGenerationForm`, `QuizList`, `QuizCard` w `src/components/` oraz `ConfirmationDialog` w `src/components/ui/`.
2. **Implementacja `QuizCard`:** Zakodowanie statycznej wersji karty z propsami `quiz` i `onDelete`. Użycie komponentów `Card` i `Button` z Shadcn.
3. **Implementacja `QuizList`:** Implementacja logiki wyświetlania listy `QuizCard` oraz komunikatu dla pustego stanu.
4. **Implementacja `QuizGenerationForm`:** Stworzenie formularza z `Input` i `Button` z Shadcn, obsługa stanu ładowania i wyświetlanie błędu na podstawie propsów.
5. **Implementacja `ConfirmationDialog`:** Stworzenie generycznego modalu z użyciem `AlertDialog` z Shadcn.
6. **Stworzenie hooka `useDashboard`:** Zaimplementowanie całej logiki zarządzania stanem, w tym funkcji do obsługi API (`fetch`).
7. **Implementacja `Dashboard.tsx`:** Połączenie wszystkich komponentów w całość. Wykorzystanie hooka `useDashboard` do zarządzania stanem i przekazanie odpowiednich propsów do komponentów-dzieci.
8. **Modyfikacja `index.astro`:** Zastąpienie statycznej zawartości komponentem `Dashboard`, przekazując mu początkową listę quizów pobraną po stronie serwera.
9. **Stylowanie:** Dopracowanie wyglądu za pomocą klas Tailwind CSS, aby zapewnić spójność z resztą aplikacji.
10. **Testowanie:** Ręczne przetestowanie wszystkich interakcji użytkownika, w tym przypadków błędów.
