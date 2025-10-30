# API Endpoint Implementation Plan: Update Quiz

## 1. Przegląd punktu końcowego
Endpoint ma za zadanie aktualizację właściwości istniejącego quizu. W obecnej wersji pozwala wyłącznie na zmianę tytułu (`title`) quizu. Operacja jest ograniczona do właściciela danego quizu.

## 2. Szczegóły żądania
- **Metoda HTTP:** `PATCH`
- **Ścieżka URL:** `/api/quizzes/:id`
- **Parametry:**
  - **Wymagane w ścieżce:**
    - `id`: UUID quizu, który ma zostać zaktualizowany.
  - **Wymagane w ciele żądania:**
    - `title`: Nowy tytuł quizu (string, max 255 znaków).
- **Ciało żądania (Request Body):**
  ```json
  {
    "title": "Updated Quiz Title"
  }
  ```

## 3. Wykorzystywane typy
- **DTO zdefiniowane w `src/types.ts`:**
  - `UpdateQuizCommand`: Model polecenia używany do walidacji danych wejściowych z ciała żądania.
  - `QuizSummaryDTO`: Struktura danych zwracana w odpowiedzi po pomyślnej aktualizacji quizu.

## 4. Szczegóły odpowiedzi
- **Sukces (200 OK):**
  - Zwraca obiekt `QuizSummaryDTO` zawierający zaktualizowane dane quizu. Pole `updated_at` zostanie automatycznie zaktualizowane.
  ```json
  {
    "id": "uuid",
    "title": "Updated Quiz Title",
    "status": "published",
    "source_url": "https://quizlet.com/...",
    "quizlet_set_id": "12345",
    "question_count": 25,
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T11:30:00Z"
  }
  ```
- **Kody statusu błędów:**
  - `400 Bad Request`: Niepoprawny format UUID, błędy walidacji ciała żądania (np. brak `title`, za długi `title`).
  - `401 Unauthorized`: (Docelowo) Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Quiz o podanym `id` nie istnieje lub użytkownik nie ma do niego uprawnień.
  - `500 Internal Server Error`: Błędy serwera, np. problem z połączeniem do bazy danych.

## 5. Przepływ danych
1. Handler endpointu otrzymuje żądanie `PATCH` z `id` w URL i `title` w ciele.
2. Walidacja parametru `id` w celu upewnienia się, że jest to poprawny UUID.
3. Walidacja ciała żądania przy użyciu schemy Zod dla `UpdateQuizCommand`.
4. Pobranie `user_id` (dla MVP będzie to stała `SUPABASE_DEFAULT_USER_ID`, docelowo z kontekstu `Astro.locals`).
5. Wywołanie metody `quizService.updateQuiz(id, userId, validatedData)`.
6. Wewnątrz serwisu, wykonanie zapytania `UPDATE` do tabeli `quizzes`, aktualizując `title` i `updated_at` dla rekordu pasującego do `id` i `user_id`.
7. Jeśli `UPDATE` nie zmodyfikował żadnego wiersza, oznacza to, że quiz nie istnieje lub użytkownik nie ma uprawnień - serwis rzuca błąd `NotFoundError`.
8. Po pomyślnej aktualizacji, serwis pobiera zaktualizowane dane quizu wraz z liczbą pytań (`question_count`).
9. Serwis zwraca zmapowane dane w formacie `QuizSummaryDTO`.
10. Handler endpointu serializuje DTO do formatu JSON i zwraca odpowiedź z kodem statusu 200 OK.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Dostęp do endpointu docelowo będzie wymagał uwierzytelnienia przez Supabase Auth. Na etapie MVP operacje będą wykonywane w kontekście stałego `user_id` (`SUPABASE_DEFAULT_USER_ID`).
- **Zapobieganie IDOR:** Kluczowe jest, aby operacja `UPDATE` w bazie danych zawsze zawierała warunek `WHERE user_id = :userId`, co gwarantuje, że użytkownicy mogą modyfikować tylko własne zasoby.
- **Walidacja wejścia:** Rygorystyczna walidacja `id` (format UUID) i `title` (typ, długość) za pomocą Zod chroni przed niepoprawnymi danymi i potencjalnymi atakami.

## 7. Obsługa błędów
- **Błędy walidacji (400):** Zostaną przechwycone i obsłużone przez middleware lub bezpośrednio w handlerze, zwracając szczegółowe komunikaty o błędach.
- **Brak zasobu (404):** Jeśli `quizService` nie znajdzie odpowiedniego quizu do aktualizacji, rzuci błąd `NotFoundError`, który zostanie zmapowany na odpowiedź 404.
- **Błąd serwera (500):** Wszelkie nieoczekiwane błędy (np. błędy bazy danych) zostaną przechwycone, zalogowane przez `LoggerService` i zmapowane na standardową odpowiedź 500.

## 8. Rozważania dotyczące wydajności
- Operacja `UPDATE` na pojedynczym wierszu jest wysoce wydajna, zwłaszcza przy użyciu indeksu na kluczu głównym (`id`).
- Należy upewnić się, że kolumna `user_id` w tabeli `quizzes` jest zaindeksowana, aby przyspieszyć wyszukiwanie quizów dla konkretnego użytkownika.
- Zapytanie pobierające zaktualizowane dane powinno być zoptymalizowane, aby efektywnie zliczać pytania.

## 9. Etapy wdrożenia
1. **Rozszerzenie walidatora:**
   - W pliku `src/lib/validators/quiz.validator.ts` dodać nowy schemat Zod (`updateQuizSchema`) do walidacji danych wejściowych dla operacji `PATCH`. Schemat powinien obejmować walidację `title`.

2. **Implementacja w Quiz Service:**
   - W pliku `src/lib/services/quiz.service.ts` utworzyć nową metodę `updateQuiz(id, userId, data)`.
   - Metoda ta będzie zawierać logikę aktualizacji quizu w bazie danych Supabase, upewniając się, że warunek `user_id` jest spełniony.
   - Po aktualizacji, metoda pobierze i zwróci zaktualizowany quiz jako `QuizSummaryDTO`.

3. **Implementacja endpointu API:**
   - W pliku `src/pages/api/quizzes/[id].ts` dodać handler dla metody `PATCH`.
   - Handler będzie odpowiedzialny za:
     - Parsowanie `id` z `Astro.params`.
     - Parsowanie ciała żądania.
     - Wywołanie walidatora.
     - Wywołanie metody `quizService.updateQuiz`.
     - Zwrócenie poprawnej odpowiedzi (200 OK) lub błędu.

4. **Testowanie:**
   - (Opcjonalnie) Dodać testy jednostkowe dla nowej logiki w `quiz.validator.ts` i `quiz.service.ts`.
   - Przeprowadzić testy integracyjne endpointu `PATCH /api/quizzes/:id` przy użyciu narzędzia do testowania API (np. Postman), sprawdzając scenariusze sukcesu i błędów.
