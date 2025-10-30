# API Endpoint Implementation Plan: Regenerate Question Answers

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia regenerację niepoprawnych odpowiedzi dla określonego pytania przy użyciu sztucznej inteligencji. Istniejący tekst pytania oraz poprawna odpowiedź pozostają niezmienione. Operacja ta aktualizuje pytanie o nowy zestaw wygenerowanych odpowiedzi i zwraca zaktualizowany obiekt pytania.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/questions/:id/regenerate`
- **Parametry:**
  - **Wymagane (w ścieżce):**
    - `id` (string, UUID): Unikalny identyfikator pytania.
  - **Opcjonalne (w ciele żądania):**
    - `temperature` (number): Wartość od 0 do 1 kontrolująca kreatywność modelu AI. Domyślnie `0.7`.
    - `seed` (number): Ziarno losowości dla zapewnienia powtarzalności wyników generowania.
- **Request Body:**
  ```json
  {
    "temperature": 0.7,
    "seed": 12345
  }
  ```

## 3. Wykorzystywane typy
- **Command Model:** `RegenerateAnswersCommand` (`src/types.ts`) - Definiuje strukturę opcjonalnych parametrów w ciele żądania.
- **DTO:** `QuestionDetailDTO` (`src/types.ts`) - Definiuje strukturę danych zwracanych w odpowiedzi po pomyślnej regeneracji odpowiedzi.

## 4. Szczegóły odpowiedzi
- **Pomyślna odpowiedź (200 OK):** Zwraca obiekt `QuestionDetailDTO` zawierający zaktualizowane dane pytania wraz z nowym zestawem odpowiedzi.
- **Odpowiedzi błędów:**
  - `400 Bad Request`: Nieprawidłowe dane wejściowe (np. błędny format UUID, nieprawidłowe wartości w ciele żądania).
  - `401 Unauthorized`: Brak uwierzytelnienia.
  - `403 Forbidden`: Użytkownik nie ma uprawnień do modyfikacji tego pytania.
  - `404 Not Found`: Pytanie o podanym `id` nie zostało znalezione.
  - `500 Internal Server Error`: Błąd po stronie serwera (np. błąd generowania AI, błąd bazy danych).

## 5. Przepływ danych
1.  Żądanie `POST` trafia do endpointu `src/pages/api/questions/[id]/regenerate.ts`.
2.  Middleware weryfikuje sesję użytkownika (uwierzytelnienie) i ewentualnie stosuje rate limiting.
3.  Handler API waliduje parametr `id` ze ścieżki (musi być poprawnym UUID) oraz ciało żądania przy użyciu schemy Zod dla `RegenerateAnswersCommand`.
4.  Wywoływana jest metoda `regenerateIncorrectAnswers(id, command, userId)` z serwisu `quiz.service.ts`.
5.  **Logika w `quiz.service.ts`:**
    a. Rozpoczyna transakcję bazodanową.
    b. Pobiera z bazy danych pytanie wraz z jego poprawną odpowiedzią oraz quizem nadrzędnym.
    c. Weryfikuje, czy `userId` zalogowanego użytkownika zgadza się z `user_id` przypisanym do quizu (autoryzacja). Jeśli nie, rzuca błąd `FORBIDDEN`.
    d. Wywołuje metodę w `ai.service.ts` w celu wygenerowania 3 nowych, niepoprawnych odpowiedzi na podstawie tekstu pytania i poprawnej odpowiedzi.
    e. Usuwa z bazy danych wszystkie istniejące niepoprawne odpowiedzi (`is_correct = false`) powiązane z danym pytaniem.
    f. Zapisuje w bazie danych nowo wygenerowane niepoprawne odpowiedzi, oznaczając ich źródło jako `'ai'`.
    g. Aktualizuje pole `metadata` oraz `updated_at` w tabeli `quiz_questions`, zapisując parametry użyte do generowania.
    h. Zatwierdza transakcję.
6.  Serwis zwraca zaktualizowany obiekt pytania w formacie `QuestionDetailDTO`.
7.  Handler API serializuje DTO i wysyła odpowiedź `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Dostęp do punktu końcowego jest ograniczony do uwierzytelnionych użytkowników. Middleware `Astro.locals.user` jest używane do weryfikacji sesji.
- **Autoryzacja:** Logika serwisu musi bezwzględnie sprawdzać, czy uwierzytelniony użytkownik jest właścicielem quizu, do którego należy modyfikowane pytanie.
- **Walidacja danych:** Wszystkie dane wejściowe (parametr `id` i ciało żądania) muszą być rygorystycznie walidowane przy użyciu Zod, aby zapobiec błędom i atakom typu injection.
- **Rate Limiting:** Należy zaimplementować w middleware mechanizm ograniczający liczbę żądań do tego endpointu, aby chronić zasoby AI przed nadużyciem i atakami DoS.

## 7. Obsługa błędów
Wszystkie błędy będą zwracane w standardowym formacie `ErrorResponse`.
- `400 VALIDATION_ERROR`: Jeśli walidacja `id` lub ciała żądania nie powiodła się.
- `401 UNAUTHORIZED`: Jeśli użytkownik nie jest zalogowany.
- `403 FORBIDDEN`: Jeśli użytkownik próbuje uzyskać dostęp do zasobu, do którego nie ma uprawnień.
- `404 NOT_FOUND`: Jeśli pytanie o podanym `id` nie istnieje.
- `500 AI_GENERATION_FAILED`: Jeśli serwis AI zwróci błąd lub nie wygeneruje poprawnych danych.
- `500 DATABASE_ERROR`: Jeśli transakcja bazodanowa się nie powiedzie.
- `500 INTERNAL_ERROR`: W przypadku innych, nieprzewidzianych błędów serwera.

## 8. Rozważania dotyczące wydajności
- **Czas odpowiedzi AI:** Główne opóźnienie będzie pochodzić z wywołania zewnętrznego serwisu AI. Operacja ta ma charakter asynchroniczny. Należy zapewnić odpowiedni timeout i obsługę błędów.
- **Transakcje bazodanowe:** Operacje na bazie danych (usunięcie starych i dodanie nowych odpowiedzi) powinny być wykonane w ramach jednej transakcji, aby zapewnić spójność danych i zminimalizować liczbę zapytań.

## 9. Etapy wdrożenia
1.  **Walidacja:** W pliku `src/lib/validators/quiz.validator.ts` zdefiniować schemę Zod dla `RegenerateAnswersCommand`.
2.  **Serwis AI:** Upewnić się, że w `src/lib/services/ai.service.ts` istnieje metoda do generowania niepoprawnych odpowiedzi, przyjmująca tekst pytania, poprawną odpowiedź i opcjonalne parametry (temperature, seed).
3.  **Serwis Quizu:** W pliku `src/lib/services/quiz.service.ts` zaimplementować nową metodę `regenerateIncorrectAnswers`, która będzie zawierać główną logikę biznesową, w tym autoryzację, transakcje bazodanowe i komunikację z serwisem AI.
4.  **Endpoint API:** Utworzyć plik `src/pages/api/questions/[id]/regenerate.ts`.
5.  **Implementacja Handlera:** W nowym pliku zaimplementować handler `POST`, który będzie:
    - Przetwarzał żądanie i pobierał dane (parametry, ciało).
    - Walidował dane wejściowe przy użyciu Zod.
    - Wywoływał metodę z `quiz.service.ts`.
    - Obsługiwał pomyślną odpowiedź oraz potencjalne błędy, zwracając odpowiednie kody statusu i komunikaty.
6.  **Rate Limiting:** Zaktualizować middleware w `src/middleware/index.ts`, aby dodać ograniczenie liczby żądań dla tego endpointu.
7.  **Testy:** Dodać testy integracyjne weryfikujące poprawność działania endpointu, w tym obsługę przypadków brzegowych i błędów.
